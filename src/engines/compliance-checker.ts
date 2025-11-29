/**
 * Compliance Checker for FAA Part 117
 * Monitors ongoing compliance and generates alerts
 */

import { getAllCrewMembers, calculateRollingHours, insertComplianceRecord } from '../db/queries.js';
import type { FAACompliance } from '../types/qualifications.js';
import { logger } from '../utils/logger.js';

export interface ComplianceAlert {
  crew_id: string;
  employee_number: string;
  name: string;
  alert_type: 'APPROACHING_LIMIT' | 'LIMIT_EXCEEDED' | 'REST_REQUIRED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  current_value: number;
  limit_value: number;
  recommended_action: string;
}

export class ComplianceChecker {
  /**
   * Run compliance check for all active pilots
   */
  async checkAllCrew(checkDate?: Date): Promise<ComplianceAlert[]> {
    const date = checkDate || new Date();
    logger.info('Running compliance check for all crew', { date });

    const alerts: ComplianceAlert[] = [];

    // Get all active pilots
    const pilots = await getAllCrewMembers({
      crew_type: 'PILOT',
      status: 'ACTIVE',
    });

    logger.info(`Checking ${pilots.length} pilots for compliance`);

    for (const pilot of pilots) {
      try {
        const pilotAlerts = await this.checkCrewCompliance(pilot.crew_id, date);
        alerts.push(...pilotAlerts);

        // Record compliance in database
        await this.recordCompliance(pilot.crew_id, date);
      } catch (error) {
        logger.error(`Failed to check compliance for crew ${pilot.crew_id}:`, error);
      }
    }

    logger.info(`Compliance check complete: ${alerts.length} alerts generated`);
    return alerts;
  }

  /**
   * Check compliance for a single crew member
   */
  async checkCrewCompliance(crewId: string, checkDate: Date): Promise<ComplianceAlert[]> {
    const alerts: ComplianceAlert[] = [];

    // Get crew member details
    const crew = await getAllCrewMembers({ status: 'ACTIVE' });
    const crewMember = crew.find((c) => c.crew_id === crewId);

    if (!crewMember) {
      return alerts;
    }

    // Calculate rolling hours
    const rolling = await calculateRollingHours(crewId, checkDate);

    // Check 28-day limit
    const limit28Day = 100;
    if (rolling.rolling_28_day >= limit28Day) {
      alerts.push({
        crew_id: crewId,
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        alert_type: 'LIMIT_EXCEEDED',
        severity: 'CRITICAL',
        message: '28-day flight time limit exceeded',
        current_value: rolling.rolling_28_day,
        limit_value: limit28Day,
        recommended_action: 'Ground crew immediately - no further assignments until hours reduce below limit',
      });
    } else if (rolling.rolling_28_day >= limit28Day * 0.95) {
      alerts.push({
        crew_id: crewId,
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        alert_type: 'APPROACHING_LIMIT',
        severity: 'HIGH',
        message: 'Approaching 28-day flight time limit (95%)',
        current_value: rolling.rolling_28_day,
        limit_value: limit28Day,
        recommended_action: 'Carefully schedule remaining hours - limit additional flights',
      });
    } else if (rolling.rolling_28_day >= limit28Day * 0.90) {
      alerts.push({
        crew_id: crewId,
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        alert_type: 'APPROACHING_LIMIT',
        severity: 'MEDIUM',
        message: 'Approaching 28-day flight time limit (90%)',
        current_value: rolling.rolling_28_day,
        limit_value: limit28Day,
        recommended_action: 'Monitor closely - plan lighter schedule ahead',
      });
    }

    // Check 365-day limit
    const limit365Day = 1000;
    if (rolling.rolling_365_day >= limit365Day) {
      alerts.push({
        crew_id: crewId,
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        alert_type: 'LIMIT_EXCEEDED',
        severity: 'CRITICAL',
        message: '365-day flight time limit exceeded',
        current_value: rolling.rolling_365_day,
        limit_value: limit365Day,
        recommended_action: 'Ground crew immediately - no further assignments until hours reduce below limit',
      });
    } else if (rolling.rolling_365_day >= limit365Day * 0.95) {
      alerts.push({
        crew_id: crewId,
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        alert_type: 'APPROACHING_LIMIT',
        severity: 'HIGH',
        message: 'Approaching 365-day flight time limit (95%)',
        current_value: rolling.rolling_365_day,
        limit_value: limit365Day,
        recommended_action: 'Review annual schedule - may need extended time off',
      });
    } else if (rolling.rolling_365_day >= limit365Day * 0.90) {
      alerts.push({
        crew_id: crewId,
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        alert_type: 'APPROACHING_LIMIT',
        severity: 'MEDIUM',
        message: 'Approaching 365-day flight time limit (90%)',
        current_value: rolling.rolling_365_day,
        limit_value: limit365Day,
        recommended_action: 'Plan for vacation or lighter schedule later in year',
      });
    }

    return alerts;
  }

  /**
   * Record compliance check in database
   */
  private async recordCompliance(crewId: string, checkDate: Date): Promise<void> {
    try {
      const rolling = await calculateRollingHours(crewId, checkDate);

      const complianceRecord: Omit<FAACompliance, 'compliance_id' | 'created_at'> = {
        crew_id: crewId,
        check_date: checkDate,
        rolling_28_day_hours: rolling.rolling_28_day,
        rolling_365_day_hours: rolling.rolling_365_day,
        consecutive_duty_days: 0, // TODO: Calculate from duty records
        rest_compliance: rolling.rolling_28_day < 100,
        fdp_compliance: rolling.rolling_365_day < 1000,
        violations: undefined,
      };

      await insertComplianceRecord(complianceRecord);
    } catch (error) {
      logger.error('Failed to record compliance:', error);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    total_crew_checked: number;
    compliant_crew: number;
    alerts_by_severity: Record<string, number>;
    alerts: ComplianceAlert[];
  }> {
    logger.info('Generating compliance report', { startDate, endDate });

    // Get all active pilots
    const pilots = await getAllCrewMembers({
      crew_type: 'PILOT',
      status: 'ACTIVE',
    });

    const alerts: ComplianceAlert[] = [];

    // Check each pilot
    for (const pilot of pilots) {
      const pilotAlerts = await this.checkCrewCompliance(pilot.crew_id, endDate);
      alerts.push(...pilotAlerts);
    }

    // Count alerts by severity
    const alertsBySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    alerts.forEach((alert) => {
      alertsBySeverity[alert.severity]++;
    });

    const report = {
      total_crew_checked: pilots.length,
      compliant_crew: pilots.length - new Set(alerts.map((a) => a.crew_id)).size,
      alerts_by_severity: alertsBySeverity,
      alerts,
    };

    logger.info('Compliance report generated', {
      total_crew: report.total_crew_checked,
      compliant: report.compliant_crew,
      total_alerts: alerts.length,
    });

    return report;
  }

  /**
   * Get alerts for a specific crew member
   */
  async getCrewAlerts(crewId: string): Promise<ComplianceAlert[]> {
    return this.checkCrewCompliance(crewId, new Date());
  }

  /**
   * Check if crew member is clear for assignment (quick check)
   */
  async isClearForAssignment(crewId: string, proposedFlightHours: number): Promise<{
    is_clear: boolean;
    reason?: string;
  }> {
    const rolling = await calculateRollingHours(crewId, new Date());

    // Check if proposed assignment would exceed limits
    const projected28Day = rolling.rolling_28_day + proposedFlightHours;
    const projected365Day = rolling.rolling_365_day + proposedFlightHours;

    if (projected28Day > 100) {
      return {
        is_clear: false,
        reason: `Assignment would exceed 28-day limit (${projected28Day.toFixed(1)}/100 hours)`,
      };
    }

    if (projected365Day > 1000) {
      return {
        is_clear: false,
        reason: `Assignment would exceed 365-day limit (${projected365Day.toFixed(1)}/1000 hours)`,
      };
    }

    return {
      is_clear: true,
    };
  }
}
