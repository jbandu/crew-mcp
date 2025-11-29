/**
 * MCP Tool: check-certification-expiry
 * Monitor and alert on expiring certifications
 */

import { z } from 'zod';
import { getExpiringCertifications } from '../db/queries.js';
import type { MCPToolResponse } from '../types/mcp.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const CheckCertificationExpirySchema = z.object({
  days_ahead: z.number().int().min(1).optional().default(60),
  certification_types: z
    .array(z.enum(['license', 'medical', 'type_rating', 'training', 'all']))
    .optional()
    .default(['all']),
  base_airport: z.string().optional(),
});

// Tool definition
export const checkCertificationExpiryTool = {
  name: 'check-certification-expiry',
  description:
    'Monitor and alert on expiring certifications (licenses, medicals, type ratings)',
  inputSchema: {
    type: 'object',
    properties: {
      days_ahead: {
        type: 'integer',
        description: 'Alert window in days',
        default: 60,
      },
      certification_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['license', 'medical', 'type_rating', 'training', 'all'],
        },
      },
      base_airport: {
        type: 'string',
        description: 'Filter by crew base',
      },
    },
  },
};

// Tool handler
export async function handleCheckCertificationExpiry(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = CheckCertificationExpirySchema.parse(args);
    logger.info('Checking certification expiry', {
      days_ahead: params.days_ahead,
      types: params.certification_types,
    });

    // Get certifications
    const types = params.certification_types.includes('all')
      ? undefined
      : params.certification_types;

    const expiringCerts = await getExpiringCertifications(
      params.days_ahead,
      types,
      params.base_airport
    );

    // Categorize by priority
    const critical: any[] = [];
    const high: any[] = [];
    const medium: any[] = [];

    expiringCerts.forEach((cert: any) => {
      const daysUntilExpiry = cert.days_until_expiry;

      const certInfo = {
        crew_member: {
          employee_number: cert.employee_number,
          name: cert.name,
          position: cert.position,
          base: cert.base_airport,
        },
        certification_type: cert.certification_type,
        certification_details: {
          ...(cert.class && { medical_class: cert.class }),
          ...(cert.aircraft_type && { aircraft_type: cert.aircraft_type }),
          ...(cert.training_type && { training_type: cert.training_type }),
        },
        expiration_date: cert.expiration_date,
        days_until_expiry: daysUntilExpiry,
      };

      if (daysUntilExpiry <= 14) {
        critical.push({
          ...certInfo,
          priority: 'CRITICAL',
          recommended_action: `Immediate renewal required - expires in ${daysUntilExpiry} days`,
        });
      } else if (daysUntilExpiry <= 30) {
        high.push({
          ...certInfo,
          priority: 'HIGH',
          recommended_action: `Schedule renewal soon - expires in ${daysUntilExpiry} days`,
        });
      } else {
        medium.push({
          ...certInfo,
          priority: 'MEDIUM',
          recommended_action: `Plan renewal - expires in ${daysUntilExpiry} days`,
        });
      }
    });

    // Generate summary by type
    const byType: Record<string, number> = {};
    expiringCerts.forEach((cert: any) => {
      byType[cert.certification_type] = (byType[cert.certification_type] || 0) + 1;
    });

    // Generate summary by base
    const byBase: Record<string, number> = {};
    expiringCerts.forEach((cert: any) => {
      byBase[cert.base_airport] = (byBase[cert.base_airport] || 0) + 1;
    });

    const response = {
      alert_window_days: params.days_ahead,
      total_expiring: expiringCerts.length,
      expiring_certifications: {
        critical: critical,
        high: high,
        medium: medium,
      },
      summary: {
        by_priority: {
          critical: critical.length,
          high: high.length,
          medium: medium.length,
        },
        by_type: Object.entries(byType).map(([type, count]) => ({
          type,
          count,
        })),
        by_base: Object.entries(byBase).map(([base, count]) => ({
          base,
          count,
        })),
      },
      recommendations: [
        critical.length > 0
          ? `URGENT: ${critical.length} certification(s) expiring within 14 days`
          : null,
        high.length > 0
          ? `${high.length} certification(s) expiring within 30 days - schedule renewals`
          : null,
        medium.length > 0
          ? `${medium.length} certification(s) expiring within ${params.days_ahead} days - plan ahead`
          : null,
        expiringCerts.length === 0
          ? `No certifications expiring within ${params.days_ahead} days`
          : null,
      ].filter(Boolean),
    };

    logger.info('Certification expiry check complete', {
      total_expiring: expiringCerts.length,
      critical: critical.length,
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
    logger.error('Error checking certification expiry:', error);
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
