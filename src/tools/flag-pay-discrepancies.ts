/**
 * MCP Tool: flag-pay-discrepancies
 * Analyze pay records to identify potential discrepancies
 */

import { z } from 'zod';
import { PayCalculator } from '../engines/pay-calculator.js';
import { getAllCrewMembers, getPayRecords } from '../db/queries.js';
import type { MCPToolResponse } from '../types/mcp.js';
import type { PayDiscrepancy } from '../types/pay.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const FlagPayDiscrepanciesSchema = z.object({
  pay_period_start: z.string().date(),
  pay_period_end: z.string().date(),
  crew_identifiers: z.array(z.string()).optional(),
  discrepancy_types: z
    .array(
      z.enum([
        'missing_premium',
        'incorrect_per_diem',
        'guarantee_not_applied',
        'overtime_missing',
        'all',
      ])
    )
    .optional()
    .default(['all']),
  threshold_amount: z.number().min(0).optional().default(0),
});

// Tool definition
export const flagPayDiscrepanciesTool = {
  name: 'flag-pay-discrepancies',
  description:
    'Analyze pay records to identify potential discrepancies and prevent crew claims',
  inputSchema: {
    type: 'object',
    properties: {
      pay_period_start: {
        type: 'string',
        format: 'date',
      },
      pay_period_end: {
        type: 'string',
        format: 'date',
      },
      crew_identifiers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of specific crew to check',
      },
      discrepancy_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'missing_premium',
            'incorrect_per_diem',
            'guarantee_not_applied',
            'overtime_missing',
            'all',
          ],
        },
      },
      threshold_amount: {
        type: 'number',
        description: 'Minimum discrepancy amount to flag',
        default: 0,
      },
    },
    required: ['pay_period_start', 'pay_period_end'],
  },
};

// Tool handler
export async function handleFlagPayDiscrepancies(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = FlagPayDiscrepanciesSchema.parse(args);
    logger.info('Flagging pay discrepancies', {
      period: `${params.pay_period_start} to ${params.pay_period_end}`,
    });

    const periodStart = new Date(params.pay_period_start);
    const periodEnd = new Date(params.pay_period_end);

    // Get crew members to check
    let crewToCheck: string[];
    if (params.crew_identifiers && params.crew_identifiers.length > 0) {
      crewToCheck = params.crew_identifiers;
    } else {
      const allCrew = await getAllCrewMembers({ status: 'ACTIVE' });
      crewToCheck = allCrew.map((c) => c.crew_id);
    }

    logger.info(`Checking ${crewToCheck.length} crew members for discrepancies`);

    // Get existing pay records
    const existingRecords = await getPayRecords(periodStart, periodEnd, crewToCheck);
    const recordsMap = new Map(
      existingRecords.map((r) => [r.crew_id, r])
    );

    // Calculate expected pay and compare
    const calculator = new PayCalculator();
    const discrepancies: PayDiscrepancy[] = [];

    for (const crewId of crewToCheck) {
      try {
        // Calculate what pay should be
        const expectedCalculation = await calculator.calculatePay(
          crewId,
          periodStart,
          periodEnd
        );

        const existingRecord = recordsMap.get(crewId);

        if (!existingRecord) {
          // Missing pay record entirely
          if (expectedCalculation.summary.total_compensation > params.threshold_amount) {
            discrepancies.push({
              crew_member: expectedCalculation.crew_member,
              discrepancy_type: 'MISSING_PAY_RECORD',
              expected_amount: expectedCalculation.summary.total_compensation,
              actual_amount: 0,
              difference: expectedCalculation.summary.total_compensation,
              confidence: 'HIGH',
              recommended_action: 'Create pay record for this crew member',
              supporting_evidence: {
                flight_hours: expectedCalculation.summary.total_flight_hours,
                duty_hours: expectedCalculation.summary.total_duty_hours,
              },
            });
          }
          continue;
        }

        // Compare amounts
        const difference = Math.abs(
          expectedCalculation.summary.total_compensation -
            parseFloat(existingRecord.total_compensation.toString())
        );

        if (difference > params.threshold_amount) {
          // Determine discrepancy type
          let discrepancyType = 'CALCULATION_MISMATCH';
          let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

          const baseDiff = Math.abs(
            expectedCalculation.breakdown.base_pay.amount -
              parseFloat(existingRecord.base_pay.toString())
          );
          const perDiemDiff = Math.abs(
            expectedCalculation.breakdown.per_diem.amount -
              parseFloat(existingRecord.per_diem.toString())
          );
          const premiumDiff = Math.abs(
            expectedCalculation.breakdown.premium_pay.reduce((sum, p) => sum + p.amount, 0) -
              parseFloat(existingRecord.premium_pay.toString())
          );

          if (baseDiff > 100) {
            discrepancyType = 'BASE_PAY_MISMATCH';
            confidence = 'HIGH';
          } else if (perDiemDiff > 50) {
            discrepancyType = 'PER_DIEM_MISMATCH';
            confidence = 'HIGH';
          } else if (premiumDiff > 100) {
            discrepancyType = 'MISSING_PREMIUM';
            confidence = 'HIGH';
          }

          discrepancies.push({
            crew_member: expectedCalculation.crew_member,
            discrepancy_type: discrepancyType,
            expected_amount: expectedCalculation.summary.total_compensation,
            actual_amount: parseFloat(existingRecord.total_compensation.toString()),
            difference,
            confidence,
            recommended_action: 'Review and adjust pay record',
            supporting_evidence: {
              base_pay_expected: expectedCalculation.breakdown.base_pay.amount,
              base_pay_actual: parseFloat(existingRecord.base_pay.toString()),
              per_diem_expected: expectedCalculation.breakdown.per_diem.amount,
              per_diem_actual: parseFloat(existingRecord.per_diem.toString()),
            },
          });
        }
      } catch (error) {
        logger.error(`Failed to check crew ${crewId}:`, error);
      }
    }

    // Generate summary
    const summaryByType: Record<string, { count: number; total_amount: number }> = {};
    discrepancies.forEach((d) => {
      if (!summaryByType[d.discrepancy_type]) {
        summaryByType[d.discrepancy_type] = { count: 0, total_amount: 0 };
      }
      summaryByType[d.discrepancy_type].count++;
      summaryByType[d.discrepancy_type].total_amount += d.difference;
    });

    const response = {
      analysis_period: {
        start: params.pay_period_start,
        end: params.pay_period_end,
      },
      total_records_checked: crewToCheck.length,
      discrepancies_found: discrepancies.length,
      total_discrepancy_amount: discrepancies
        .reduce((sum, d) => sum + d.difference, 0)
        .toFixed(2),
      summary_by_type: Object.entries(summaryByType).map(([type, stats]) => ({
        type,
        count: stats.count,
        total_amount: `$${stats.total_amount.toFixed(2)}`,
      })),
      discrepancies: discrepancies.map((d) => ({
        crew_member: d.crew_member,
        discrepancy_type: d.discrepancy_type,
        expected_amount: `$${d.expected_amount.toFixed(2)}`,
        actual_amount: `$${d.actual_amount.toFixed(2)}`,
        difference: `$${d.difference.toFixed(2)}`,
        confidence: d.confidence,
        recommended_action: d.recommended_action,
        supporting_evidence: d.supporting_evidence,
      })),
    };

    logger.info('Pay discrepancy analysis complete', {
      total_checked: crewToCheck.length,
      discrepancies_found: discrepancies.length,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Error flagging pay discrepancies:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
