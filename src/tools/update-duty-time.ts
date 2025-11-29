/**
 * MCP Tool: update-duty-time
 * Record duty time, flight time, and rest periods
 */

import { z } from 'zod';
import { getCrewMember, upsertDutyTimeRecord } from '../db/queries.js';
import { ComplianceChecker } from '../engines/compliance-checker.js';
import { crossesWOCL } from '../utils/date-utils.js';
import config from '../config/index.js';
import type { MCPToolResponse } from '../types/mcp.js';
import type { DutyTimeRecord } from '../types/crew.js';
import { logger } from '../utils/logger.js';

// Input validation schema
const UpdateDutyTimeSchema = z.object({
  crew_identifier: z.string().min(1),
  duty_date: z.string().date(),
  duty_start_utc: z.string().datetime(),
  duty_end_utc: z.string().datetime(),
  flight_time_minutes: z.number().int().min(0).optional(),
  duty_time_minutes: z.number().int().min(0).optional(),
  block_time_minutes: z.number().int().min(0).optional(),
  flight_segments: z.number().int().min(0).optional().default(0),
  wocl_crossing: z.boolean().optional(),
});

// Tool definition
export const updateDutyTimeTool = {
  name: 'update-duty-time',
  description:
    'Record duty time, flight time, and rest periods for crew members',
  inputSchema: {
    type: 'object',
    properties: {
      crew_identifier: {
        type: 'string',
        description: 'Employee number or crew_id',
      },
      duty_date: {
        type: 'string',
        format: 'date',
      },
      duty_start_utc: {
        type: 'string',
        format: 'date-time',
      },
      duty_end_utc: {
        type: 'string',
        format: 'date-time',
      },
      flight_time_minutes: {
        type: 'integer',
      },
      duty_time_minutes: {
        type: 'integer',
      },
      block_time_minutes: {
        type: 'integer',
      },
      flight_segments: {
        type: 'integer',
      },
      wocl_crossing: {
        type: 'boolean',
        description: 'Did duty cross Window of Circadian Low',
      },
    },
    required: ['crew_identifier', 'duty_date', 'duty_start_utc', 'duty_end_utc'],
  },
};

// Tool handler
export async function handleUpdateDutyTime(
  args: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input
    const params = UpdateDutyTimeSchema.parse(args);
    logger.info('Updating duty time', {
      crew_identifier: params.crew_identifier,
      duty_date: params.duty_date,
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

    const dutyStart = new Date(params.duty_start_utc);
    const dutyEnd = new Date(params.duty_end_utc);

    // Calculate duty time if not provided
    const dutyTimeMinutes =
      params.duty_time_minutes ||
      Math.round((dutyEnd.getTime() - dutyStart.getTime()) / (1000 * 60));

    // Determine if WOCL crossing occurred (if not explicitly provided)
    const woclCrossing =
      params.wocl_crossing !== undefined
        ? params.wocl_crossing
        : crossesWOCL(dutyStart, dutyEnd, config.timezone);

    // Create duty time record
    const dutyRecord: Partial<DutyTimeRecord> = {
      crew_id: crewMember.crew_id,
      duty_date: new Date(params.duty_date),
      duty_start_utc: dutyStart,
      duty_end_utc: dutyEnd,
      flight_time_minutes: params.flight_time_minutes || 0,
      duty_time_minutes: dutyTimeMinutes,
      block_time_minutes: params.block_time_minutes || params.flight_time_minutes || 0,
      flight_segments: params.flight_segments,
      is_fdp: true, // Assume all duty is FDP unless specified
      wocl_crossing: woclCrossing,
      consecutive_nights: 0, // TODO: Calculate from history
    };

    // Insert/update duty record
    const savedRecord = await upsertDutyTimeRecord(dutyRecord);

    // Run compliance check
    const checker = new ComplianceChecker();
    const complianceCheck = await checker.isClearForAssignment(
      crewMember.crew_id,
      (params.flight_time_minutes || 0) / 60
    );

    // Get updated rolling hours
    const alerts = await checker.getCrewAlerts(crewMember.crew_id);

    const response = {
      duty_record_id: savedRecord.duty_id,
      crew_member: {
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        position: crewMember.position,
      },
      recorded_duty: {
        duty_date: params.duty_date,
        duty_start_utc: params.duty_start_utc,
        duty_end_utc: params.duty_end_utc,
        flight_time_hours: ((params.flight_time_minutes || 0) / 60).toFixed(2),
        duty_time_hours: (dutyTimeMinutes / 60).toFixed(2),
        block_time_hours: ((params.block_time_minutes || params.flight_time_minutes || 0) / 60).toFixed(2),
        flight_segments: params.flight_segments,
        wocl_crossing: woclCrossing,
      },
      compliance_check: {
        is_compliant: complianceCheck.is_clear,
        rolling_limits_updated: true,
        alerts: alerts.map((alert) => ({
          type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          current_value: alert.current_value.toFixed(1),
          limit_value: alert.limit_value,
          recommended_action: alert.recommended_action,
        })),
      },
      recommendations: [
        complianceCheck.is_clear
          ? 'Duty time recorded successfully - crew remains within FAA limits'
          : complianceCheck.reason,
        alerts.length > 0
          ? `${alerts.length} compliance alert(s) generated`
          : 'No compliance issues detected',
        woclCrossing
          ? 'Note: This duty crossed the Window of Circadian Low (WOCL) - monitor for fatigue'
          : null,
      ].filter(Boolean),
    };

    logger.info('Duty time updated successfully', {
      crew_id: crewMember.crew_id,
      duty_id: savedRecord.duty_id,
      alerts: alerts.length,
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
    logger.error('Error updating duty time:', error);
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
