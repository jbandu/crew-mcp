/**
 * MCP Tool: get-training-requirements
 * Get training requirements and currency status
 */

import { z } from 'zod';
import { getCrewMember, getTrainingRecords } from '../db/queries.js';
import { daysUntilExpiry } from '../utils/date-utils.js';
import type { MCPToolResponse } from '../types/mcp.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const GetTrainingRequirementsSchema = z.object({
  crew_identifier: z.string().min(1),
  training_types: z.array(z.string()).optional(),
  days_ahead: z.number().int().min(0).optional().default(90),
  status_filter: z
    .array(z.enum(['current', 'due_soon', 'overdue']))
    .optional(),
});

// Tool definition
export const getTrainingRequirementsTool = {
  name: 'get-training-requirements',
  description: 'Get training requirements and currency status for crew members',
  inputSchema: {
    type: 'object',
    properties: {
      crew_identifier: {
        type: 'string',
        description: 'Employee number, crew_id',
      },
      training_types: {
        type: 'array',
        items: { type: 'string' },
      },
      days_ahead: {
        type: 'integer',
        description: 'Look ahead window in days for upcoming training',
        default: 90,
      },
      status_filter: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['current', 'due_soon', 'overdue'],
        },
      },
    },
  },
};

// Tool handler
export async function handleGetTrainingRequirements(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = GetTrainingRequirementsSchema.parse(args);
    logger.info('Getting training requirements', {
      crew_identifier: params.crew_identifier,
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

    // Get training records
    const allTraining = await getTrainingRecords(crewMember.crew_id);

    // Filter by type if specified
    let training = allTraining;
    if (params.training_types && params.training_types.length > 0) {
      training = training.filter((t) =>
        params.training_types!.includes(t.training_type)
      );
    }

    // Categorize training by status
    const current: any[] = [];
    const dueSoon: any[] = [];
    const overdue: any[] = [];

    training.forEach((t) => {
      const daysUntilDue = daysUntilExpiry(t.next_due_date);

      const trainingInfo = {
        type: t.training_type,
        aircraft_type: t.aircraft_type,
        completion_date: t.completion_date,
        next_due: t.next_due_date,
        days_until_due: daysUntilDue,
        instructor: t.instructor_name,
        location: t.training_location,
      };

      if (t.status === 'OVERDUE' || daysUntilDue < 0) {
        overdue.push(trainingInfo);
      } else if (t.status === 'DUE_SOON' || daysUntilDue <= params.days_ahead) {
        dueSoon.push(trainingInfo);
      } else if (t.status === 'CURRENT') {
        current.push(trainingInfo);
      }
    });

    // Apply status filter if specified
    let filteredResults: any = {
      current,
      due_soon: dueSoon,
      overdue,
    };

    if (params.status_filter && params.status_filter.length > 0) {
      const filtered: any = {};
      if (params.status_filter.includes('current')) {
        filtered.current = current;
      }
      if (params.status_filter.includes('due_soon')) {
        filtered.due_soon = dueSoon;
      }
      if (params.status_filter.includes('overdue')) {
        filtered.overdue = overdue;
      }
      filteredResults = filtered;
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (overdue.length > 0) {
      recommendations.push(
        `URGENT: ${overdue.length} training item(s) overdue - immediate action required`
      );
      overdue.forEach((t) => {
        recommendations.push(
          `  - ${t.type}${t.aircraft_type ? ` (${t.aircraft_type})` : ''} overdue by ${Math.abs(t.days_until_due)} days`
        );
      });
    }

    if (dueSoon.length > 0) {
      recommendations.push(
        `${dueSoon.length} training item(s) due within ${params.days_ahead} days - schedule soon`
      );
    }

    if (overdue.length === 0 && dueSoon.length === 0) {
      recommendations.push('All training current - no immediate action required');
    }

    const response = {
      crew_member: {
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        position: crewMember.position,
        base: crewMember.base_airport,
      },
      training_status: filteredResults,
      summary: {
        total_training_items: training.length,
        current_count: current.length,
        due_soon_count: dueSoon.length,
        overdue_count: overdue.length,
        compliance_status:
          overdue.length > 0
            ? 'NON_COMPLIANT'
            : dueSoon.length > 0
            ? 'WARNING'
            : 'COMPLIANT',
      },
      recommendations,
    };

    logger.info('Training requirements retrieved', {
      crew_id: crewMember.crew_id,
      total_training: training.length,
      overdue: overdue.length,
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
    logger.error('Error getting training requirements:', error);
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
