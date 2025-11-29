/**
 * MCP Tool: calculate-crew-pay
 * Calculate crew member pay for a given period
 */

import { z } from 'zod';
import { PayCalculator } from '../engines/pay-calculator.js';
import { getCrewMember, insertPayRecord } from '../db/queries.js';
import type { MCPToolResponse } from '../types/mcp.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const CalculateCrewPaySchema = z.object({
  crew_identifier: z.string().min(1),
  pay_period_start: z.string().date(),
  pay_period_end: z.string().date(),
  include_breakdown: z.boolean().optional().default(true),
});

// Tool definition
export const calculateCrewPayTool = {
  name: 'calculate-crew-pay',
  description:
    'Calculate crew member pay for a given period using automated rules engine with union contract compliance',
  inputSchema: {
    type: 'object',
    properties: {
      crew_identifier: {
        type: 'string',
        description: 'Employee number or crew_id',
      },
      pay_period_start: {
        type: 'string',
        format: 'date',
        description: 'Pay period start date',
      },
      pay_period_end: {
        type: 'string',
        format: 'date',
        description: 'Pay period end date',
      },
      include_breakdown: {
        type: 'boolean',
        description: 'Include detailed calculation breakdown',
        default: true,
      },
    },
    required: ['crew_identifier', 'pay_period_start', 'pay_period_end'],
  },
};

// Tool handler
export async function handleCalculateCrewPay(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = CalculateCrewPaySchema.parse(args);
    logger.info('Calculating crew pay', {
      crew_identifier: params.crew_identifier,
      period: `${params.pay_period_start} to ${params.pay_period_end}`,
    });

    // Get crew member
    const crewMember = await getCrewMember(params.crew_identifier);
    if (!crewMember) {
      return {
        content: [
          {
            type: 'text',
            text: `Crew member not found: ${params.crew_identifier}`,
          },
        ],
        isError: true,
      };
    }

    // Calculate pay
    const calculator = new PayCalculator();
    const calculation = await calculator.calculatePay(
      crewMember.crew_id,
      new Date(params.pay_period_start),
      new Date(params.pay_period_end)
    );

    // Save pay record to database
    try {
      await insertPayRecord({
        crew_id: crewMember.crew_id,
        pay_period_start: new Date(params.pay_period_start),
        pay_period_end: new Date(params.pay_period_end),
        flight_hours: calculation.summary.total_flight_hours,
        duty_hours: calculation.summary.total_duty_hours,
        base_pay: calculation.breakdown.base_pay.amount,
        per_diem: calculation.breakdown.per_diem.amount,
        premium_pay: calculation.breakdown.premium_pay.reduce(
          (sum, p) => sum + p.amount,
          0
        ),
        overtime_pay: calculation.breakdown.overtime_pay.amount,
        guarantee_pay: calculation.breakdown.guarantee_pay.amount,
        total_compensation: calculation.summary.total_compensation,
        calculation_method: 'AUTOMATED',
        verified: false,
        notes: `Calculated via MCP tool at ${new Date().toISOString()}`,
      });
      logger.info('Pay record saved to database');
    } catch (error) {
      logger.warn('Failed to save pay record to database:', error);
      // Continue - calculation is still valid even if save fails
    }

    // Format response
    let response: any = {
      crew_member: calculation.crew_member,
      pay_period: {
        start: params.pay_period_start,
        end: params.pay_period_end,
      },
      summary: {
        total_flight_hours: calculation.summary.total_flight_hours.toFixed(2),
        total_duty_hours: calculation.summary.total_duty_hours.toFixed(2),
        total_compensation: `$${calculation.summary.total_compensation.toFixed(2)}`,
      },
      calculation_timestamp: calculation.calculation_timestamp,
    };

    if (params.include_breakdown) {
      response.breakdown = {
        base_pay: {
          amount: `$${calculation.breakdown.base_pay.amount.toFixed(2)}`,
          hours: calculation.breakdown.base_pay.hours?.toFixed(2),
          rate: `$${calculation.breakdown.base_pay.rate.toFixed(2)}/hr`,
          description: calculation.breakdown.base_pay.description,
        },
        per_diem: {
          amount: `$${calculation.breakdown.per_diem.amount.toFixed(2)}`,
          hours: calculation.breakdown.per_diem.hours?.toFixed(2),
          rate: `$${calculation.breakdown.per_diem.rate.toFixed(2)}/hr`,
          description: calculation.breakdown.per_diem.description,
        },
        premium_pay: calculation.breakdown.premium_pay.map((p) => ({
          type: p.type,
          amount: `$${p.amount.toFixed(2)}`,
          description: p.description,
        })),
        overtime_pay: {
          amount: `$${calculation.breakdown.overtime_pay.amount.toFixed(2)}`,
          description: calculation.breakdown.overtime_pay.description,
        },
        guarantee_pay: {
          amount: `$${calculation.breakdown.guarantee_pay.amount.toFixed(2)}`,
          description: calculation.breakdown.guarantee_pay.description,
        },
      };

      response.applied_rules = calculation.applied_rules.map((rule) => ({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        amount: `$${rule.amount.toFixed(2)}`,
      }));

      response.duty_records_count = calculation.duty_records.length;
    }

    logger.info('Crew pay calculation complete', {
      crew_id: crewMember.crew_id,
      total_compensation: calculation.summary.total_compensation,
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
    logger.error('Error calculating crew pay:', error);
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
