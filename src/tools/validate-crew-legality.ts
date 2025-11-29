/**
 * MCP Tool: validate-crew-legality
 * Validate if a crew member can legally be assigned to a duty period
 */

import { z } from 'zod';
import { LegalityValidator } from '../engines/legality-validator.js';
import type { MCPToolResponse } from '../types/mcp.js';
import type { DutyAssignment } from '../types/qualifications.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const ValidateCrewLegalitySchema = z.object({
  crew_identifier: z.string().min(1),
  aircraft_type: z.string().min(1),
  duty_start_utc: z.string().datetime(),
  duty_end_utc: z.string().datetime().optional(),
  flight_time_minutes: z.number().int().min(0).optional(),
  number_of_segments: z.number().int().min(1).optional().default(1),
});

// Tool definition
export const validateCrewLegalityTool = {
  name: 'validate-crew-legality',
  description:
    'Validate if a crew member can legally be assigned to a duty period based on FAA Part 117, qualifications, and rest requirements',
  inputSchema: {
    type: 'object',
    properties: {
      crew_identifier: {
        type: 'string',
        description: 'Employee number or crew_id',
      },
      aircraft_type: {
        type: 'string',
        description: 'Aircraft type for the assignment (e.g., B737-800)',
      },
      duty_start_utc: {
        type: 'string',
        format: 'date-time',
        description: 'Proposed duty start time in UTC',
      },
      duty_end_utc: {
        type: 'string',
        format: 'date-time',
        description: 'Proposed duty end time in UTC',
      },
      flight_time_minutes: {
        type: 'integer',
        description: 'Estimated flight time for the duty',
      },
      number_of_segments: {
        type: 'integer',
        description: 'Number of flight segments in duty period',
        default: 1,
      },
    },
    required: ['crew_identifier', 'aircraft_type', 'duty_start_utc'],
  },
};

// Tool handler
export async function handleValidateCrewLegality(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = ValidateCrewLegalitySchema.parse(args);
    logger.info('Validating crew legality', {
      crew_identifier: params.crew_identifier,
      aircraft_type: params.aircraft_type,
    });

    // Build duty assignment
    const dutyAssignment: DutyAssignment = {
      aircraft_type: params.aircraft_type,
      duty_start_utc: new Date(params.duty_start_utc),
      duty_end_utc: params.duty_end_utc ? new Date(params.duty_end_utc) : undefined,
      flight_time_minutes: params.flight_time_minutes || 0,
      number_of_segments: params.number_of_segments,
    };

    // Validate legality
    const validator = new LegalityValidator();
    const result = await validator.validateAssignment(
      params.crew_identifier,
      dutyAssignment
    );

    // Format response
    const response = {
      is_legal: result.is_legal,
      crew_status: result.crew_status,
      validation_timestamp: new Date().toISOString(),
      proposed_duty: {
        aircraft_type: params.aircraft_type,
        duty_start: params.duty_start_utc,
        duty_end: params.duty_end_utc,
        flight_time_minutes: params.flight_time_minutes,
        number_of_segments: params.number_of_segments,
      },
      qualification_issues:
        result.qualification_issues.length > 0
          ? result.qualification_issues.map((issue) => ({
              type: issue.type,
              description: issue.description,
              severity: issue.severity,
              resolution: issue.resolution,
            }))
          : [],
      rest_compliance: {
        is_compliant: result.rest_compliance.is_compliant,
        hours_since_rest: result.rest_compliance.hours_since_rest,
        minimum_rest_required: result.rest_compliance.minimum_rest_required,
        violations: result.rest_compliance.violations,
      },
      duty_limits: {
        rolling_28_day_hours: result.duty_limits.rolling_28_day_hours,
        rolling_28_day_limit: result.duty_limits.rolling_28_day_limit,
        rolling_28_day_remaining:
          result.duty_limits.rolling_28_day_limit -
          result.duty_limits.rolling_28_day_hours,
        rolling_365_day_hours: result.duty_limits.rolling_365_day_hours,
        rolling_365_day_limit: result.duty_limits.rolling_365_day_limit,
        rolling_365_day_remaining:
          result.duty_limits.rolling_365_day_limit -
          result.duty_limits.rolling_365_day_hours,
        consecutive_duty_days: result.duty_limits.consecutive_duty_days,
      },
      recommendations: result.recommendations,
      decision: result.is_legal
        ? 'APPROVED - Crew member is legal and qualified for this assignment'
        : 'DENIED - Crew member cannot be assigned due to violations or restrictions',
    };

    logger.info('Crew legality validation complete', {
      crew_identifier: params.crew_identifier,
      is_legal: result.is_legal,
      issues: result.qualification_issues.length,
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
    logger.error('Error validating crew legality:', error);
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
