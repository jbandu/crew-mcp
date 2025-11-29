/**
 * MCP Tool: get-crew-qualifications
 * Get complete qualification profile for a crew member
 */

import { z } from 'zod';
import {
  getCrewMember,
  getPilotLicenses,
  getAircraftTypeRatings,
  getMedicalCertificate,
  getTrainingRecords,
} from '../db/queries.js';
import type { MCPToolResponse } from '../types/mcp.js';
import type { CrewQualificationProfile } from '../types/crew.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const GetCrewQualificationsSchema = z.object({
  crew_identifier: z.string().min(1),
  include_expired: z.boolean().optional().default(false),
  qualification_types: z
    .array(z.enum(['licenses', 'type_ratings', 'medical', 'training', 'all']))
    .optional()
    .default(['all']),
});

// Tool definition
export const getCrewQualificationsTool = {
  name: 'get-crew-qualifications',
  description:
    'Get complete qualification profile for a crew member including licenses, ratings, medical, and training status',
  inputSchema: {
    type: 'object',
    properties: {
      crew_identifier: {
        type: 'string',
        description: 'Employee number or crew_id',
      },
      include_expired: {
        type: 'boolean',
        description: 'Include expired qualifications',
        default: false,
      },
      qualification_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['licenses', 'type_ratings', 'medical', 'training', 'all'],
        },
        description: 'Filter by qualification types',
      },
    },
    required: ['crew_identifier'],
  },
};

// Tool handler
export async function handleGetCrewQualifications(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = GetCrewQualificationsSchema.parse(args);
    logger.info('Getting crew qualifications', { crew_identifier: params.crew_identifier });

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

    // Determine which qualifications to fetch
    const types = params.qualification_types.includes('all')
      ? ['licenses', 'type_ratings', 'medical', 'training']
      : params.qualification_types;

    // Build qualification profile
    const profile: CrewQualificationProfile = {
      crew_member: crewMember,
      licenses: [],
      type_ratings: [],
      medical: undefined,
      training: [],
      overall_status: 'QUALIFIED',
    };

    // Fetch licenses
    if (types.includes('licenses') && crewMember.crew_type === 'PILOT') {
      profile.licenses = await getPilotLicenses(crewMember.crew_id);
      if (!params.include_expired) {
        profile.licenses = profile.licenses.filter(
          (l) => !l.expiration_date || l.expiration_date > new Date()
        );
      }
    }

    // Fetch type ratings
    if (types.includes('type_ratings') && crewMember.crew_type === 'PILOT') {
      profile.type_ratings = await getAircraftTypeRatings(crewMember.crew_id);
      if (!params.include_expired) {
        profile.type_ratings = profile.type_ratings.filter(
          (r) => r.currency_status !== 'EXPIRED'
        );
      }
    }

    // Fetch medical
    if (types.includes('medical') && crewMember.crew_type === 'PILOT') {
      const medical = await getMedicalCertificate(crewMember.crew_id);
      if (medical && (params.include_expired || medical.status === 'VALID')) {
        profile.medical = medical;
      }
    }

    // Fetch training
    if (types.includes('training')) {
      profile.training = await getTrainingRecords(crewMember.crew_id);
      if (!params.include_expired) {
        profile.training = profile.training.filter((t) => t.status !== 'OVERDUE');
      }
    }

    // Determine overall status
    const hasCriticalIssues =
      (profile.medical && profile.medical.status !== 'VALID') ||
      profile.type_ratings.some((r) => r.currency_status === 'EXPIRED') ||
      profile.training.some((t) => t.status === 'OVERDUE');

    const hasWarnings =
      (profile.medical && profile.medical.status === 'EXPIRING_SOON') ||
      profile.type_ratings.some((r) => r.currency_status === 'EXPIRING_SOON') ||
      profile.training.some((t) => t.status === 'DUE_SOON');

    if (hasCriticalIssues) {
      profile.overall_status = 'NOT_QUALIFIED';
    } else if (hasWarnings) {
      profile.overall_status = 'RESTRICTIONS';
    }

    // Format response
    const response = {
      crew_member: {
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        position: crewMember.position,
        crew_type: crewMember.crew_type,
        base: crewMember.base_airport,
        status: crewMember.status,
      },
      qualifications: {
        licenses: profile.licenses.map((l) => ({
          type: l.license_type,
          number: l.license_number,
          issue_date: l.issue_date,
          expiration_date: l.expiration_date,
        })),
        type_ratings: profile.type_ratings.map((r) => ({
          aircraft_type: r.aircraft_type,
          rating_type: r.rating_type,
          currency_status: r.currency_status,
          last_check: r.last_check_date,
          next_check_due: r.next_check_due,
          landings_90_day: r.landings_90_day,
          approaches_90_day: r.approaches_90_day,
        })),
        medical: profile.medical
          ? {
              class: profile.medical.class,
              issue_date: profile.medical.issue_date,
              expiration_date: profile.medical.expiration_date,
              status: profile.medical.status,
              limitations: profile.medical.limitations,
            }
          : null,
        training: profile.training.map((t) => ({
          type: t.training_type,
          aircraft_type: t.aircraft_type,
          completion_date: t.completion_date,
          next_due_date: t.next_due_date,
          status: t.status,
        })),
      },
      overall_status: profile.overall_status,
      summary: {
        total_licenses: profile.licenses.length,
        total_type_ratings: profile.type_ratings.length,
        current_type_ratings: profile.type_ratings.filter(
          (r) => r.currency_status === 'CURRENT'
        ).length,
        medical_valid: profile.medical?.status === 'VALID',
        training_current: profile.training.filter((t) => t.status === 'CURRENT')
          .length,
        training_total: profile.training.length,
      },
    };

    logger.info('Crew qualifications retrieved successfully', {
      crew_id: crewMember.crew_id,
      overall_status: profile.overall_status,
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
    logger.error('Error getting crew qualifications:', error);
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
