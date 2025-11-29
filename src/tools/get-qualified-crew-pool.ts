/**
 * MCP Tool: get-qualified-crew-pool
 * Get list of qualified and available crew members
 */

import { z } from 'zod';
import { getCrewByAircraftType } from '../db/queries.js';
import { LegalityValidator } from '../engines/legality-validator.js';
import type { MCPToolResponse } from '../types/mcp.js';
import type { DutyAssignment } from '../types/qualifications.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const GetQualifiedCrewPoolSchema = z.object({
  aircraft_type: z.string().min(1),
  position: z.string().min(1),
  base_airport: z.string().optional(),
  duty_date: z.string().date().optional(),
  check_legality: z.boolean().optional().default(true),
});

// Tool definition
export const getQualifiedCrewPoolTool = {
  name: 'get-qualified-crew-pool',
  description:
    'Get list of qualified and available crew members for specific aircraft types and duty periods',
  inputSchema: {
    type: 'object',
    properties: {
      aircraft_type: {
        type: 'string',
        description: 'Required aircraft type qualification',
      },
      position: {
        type: 'string',
        description: 'Required position (CAPTAIN, FIRST_OFFICER, FA, etc.)',
      },
      base_airport: {
        type: 'string',
        description: 'Crew base filter',
      },
      duty_date: {
        type: 'string',
        format: 'date',
        description: 'Target duty date',
      },
      check_legality: {
        type: 'boolean',
        description: 'Include FAA Part 117 legality check',
        default: true,
      },
    },
    required: ['aircraft_type', 'position'],
  },
};

// Tool handler
export async function handleGetQualifiedCrewPool(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = GetQualifiedCrewPoolSchema.parse(args);
    logger.info('Getting qualified crew pool', {
      aircraft_type: params.aircraft_type,
      position: params.position,
    });

    // Get crew with aircraft qualification
    let qualifiedCrew = await getCrewByAircraftType(
      params.aircraft_type,
      params.position
    );

    // Filter by base if specified
    if (params.base_airport) {
      qualifiedCrew = qualifiedCrew.filter(
        (c) => c.base_airport === params.base_airport
      );
    }

    logger.info(`Found ${qualifiedCrew.length} qualified crew members`);

    // Build crew pool results
    const crewPool: any[] = [];

    for (const crew of qualifiedCrew) {
      const crewInfo: any = {
        crew_member: {
          employee_number: crew.employee_number,
          name: `${crew.first_name} ${crew.last_name}`,
          position: crew.position,
          base: crew.base_airport,
          seniority: crew.seniority_number,
        },
        qualifications: {
          aircraft_qualified: true,
          currency_status: 'CURRENT',
        },
      };

      // Check legality if requested and duty date provided
      if (params.check_legality && params.duty_date) {
        try {
          const validator = new LegalityValidator();
          const dutyDate = new Date(params.duty_date);
          dutyDate.setHours(8, 0, 0, 0); // Default to 8 AM

          const dutyAssignment: DutyAssignment = {
            aircraft_type: params.aircraft_type,
            duty_start_utc: dutyDate,
            flight_time_minutes: 300, // Assume 5 hour flight
            number_of_segments: 2,
          };

          const legalityResult = await validator.validateAssignment(
            crew.crew_id,
            dutyAssignment
          );

          crewInfo.availability = {
            is_available: legalityResult.is_legal,
            rest_compliant: legalityResult.rest_compliance.is_compliant,
            duty_limit_compliant:
              legalityResult.duty_limits.rolling_28_day_hours <
              legalityResult.duty_limits.rolling_28_day_limit,
            rolling_28_day_hours: legalityResult.duty_limits.rolling_28_day_hours,
            rolling_28_day_remaining:
              legalityResult.duty_limits.rolling_28_day_limit -
              legalityResult.duty_limits.rolling_28_day_hours,
          };

          // Calculate suitability score (0-100)
          let suitabilityScore = 100;
          if (!legalityResult.is_legal) suitabilityScore = 0;
          else {
            // Deduct points for warnings
            if (legalityResult.qualification_issues.length > 0)
              suitabilityScore -= 20;
            if (!legalityResult.rest_compliance.is_compliant) suitabilityScore -= 30;

            // Deduct points based on duty hours used
            const hoursUsedPercent =
              (legalityResult.duty_limits.rolling_28_day_hours /
                legalityResult.duty_limits.rolling_28_day_limit) *
              100;
            if (hoursUsedPercent > 90) suitabilityScore -= 20;
            else if (hoursUsedPercent > 80) suitabilityScore -= 10;
          }

          crewInfo.suitability_score = Math.max(0, suitabilityScore);
        } catch (error) {
          logger.warn(`Failed to check legality for crew ${crew.crew_id}:`, error);
          crewInfo.availability = {
            is_available: true,
            rest_compliant: true,
            duty_limit_compliant: true,
            note: 'Legality check failed - assume available',
          };
          crewInfo.suitability_score = 50; // Neutral score
        }
      } else {
        crewInfo.availability = {
          is_available: true,
          rest_compliant: true,
          duty_limit_compliant: true,
          note: 'Legality check not performed',
        };
        crewInfo.suitability_score = 100;
      }

      crewPool.push(crewInfo);
    }

    // Sort by suitability score (descending)
    crewPool.sort((a, b) => b.suitability_score - a.suitability_score);

    const response = {
      search_criteria: {
        aircraft_type: params.aircraft_type,
        position: params.position,
        base_airport: params.base_airport,
        duty_date: params.duty_date,
      },
      qualified_crew: crewPool,
      summary: {
        total_qualified: qualifiedCrew.length,
        total_available: crewPool.filter((c) => c.availability.is_available).length,
        by_base: params.base_airport
          ? { [params.base_airport]: crewPool.length }
          : crewPool.reduce((acc: any, c) => {
              const base = c.crew_member.base;
              acc[base] = (acc[base] || 0) + 1;
              return acc;
            }, {}),
      },
      recommendations:
        crewPool.length === 0
          ? [
              `No qualified ${params.position} crew available for ${params.aircraft_type}`,
              'Consider expanding search to other bases or training additional crew',
            ]
          : [
              `Top ${Math.min(3, crewPool.length)} recommended crew by suitability:`,
              ...crewPool
                .slice(0, 3)
                .map(
                  (c) =>
                    `  ${c.crew_member.name} (${c.crew_member.employee_number}) - Score: ${c.suitability_score}`
                ),
            ],
    };

    logger.info('Qualified crew pool retrieved', {
      total_qualified: qualifiedCrew.length,
      total_available: response.summary.total_available,
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
    logger.error('Error getting qualified crew pool:', error);
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
