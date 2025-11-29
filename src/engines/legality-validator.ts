/**
 * FAA Part 117 Legality Validator
 * Validates crew assignments against FAA Part 117 regulations
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import { differenceInHours } from 'date-fns';
import {
  getCrewMember,
  getDutyTimeRecords,
  calculateRollingHours,
  getAircraftTypeRatings,
  getMedicalCertificate,
  getTrainingRecords,
} from '../db/queries.js';
import type {
  LegalityResult,
  QualificationIssue,
  RestCompliance,
  DutyLimits,
  DutyAssignment,
} from '../types/qualifications.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FAARule {
  flight_time_limits: any;
  fdp_limits: any;
  rest_requirements: any;
  wocl: any;
  consecutive_nighttime_operations: any;
}

/**
 * Load FAA Part 117 rules
 */
function loadFAARules(): FAARule {
  try {
    const rulesPath = join(__dirname, '../rules/faa-part117-rules.json');
    const rulesContent = readFileSync(rulesPath, 'utf-8');
    return JSON.parse(rulesContent);
  } catch (error) {
    logger.error('Failed to load FAA Part 117 rules:', error);
    throw new Error('Could not load FAA Part 117 regulations');
  }
}

export class LegalityValidator {
  private faaRules: FAARule;

  constructor() {
    this.faaRules = loadFAARules();
  }

  /**
   * Validate if a crew member can legally be assigned to a duty
   */
  async validateAssignment(
    crewId: string,
    proposedDuty: DutyAssignment
  ): Promise<LegalityResult> {
    logger.info('Validating crew assignment legality', { crewId, proposedDuty });

    // 1. Get crew member details
    const crewMember = await getCrewMember(crewId);
    if (!crewMember) {
      throw new Error(`Crew member not found: ${crewId}`);
    }

    // Use the UUID crew_id from the crew member object for all subsequent queries
    const uuid = crewMember.crew_id;

    // 2. Check qualifications for aircraft type
    const qualificationIssues = await this.checkQualifications(
      uuid,
      proposedDuty.aircraft_type
    );

    // 3. Get duty history for compliance checks
    const lookbackDate = new Date(proposedDuty.duty_start_utc);
    lookbackDate.setDate(lookbackDate.getDate() - 365);
    const dutyHistory = await getDutyTimeRecords(
      uuid,
      lookbackDate,
      new Date(proposedDuty.duty_start_utc)
    );

    // 4. Check rest compliance
    const restCompliance = this.checkRestCompliance(
      dutyHistory,
      proposedDuty,
      crewMember.base_airport
    );

    // 5. Check FDP limits
    const fdpCompliance = this.checkFDPLimits(proposedDuty);

    // 6. Check rolling flight time limits
    const dutyLimits = await this.checkFlightTimeLimits(
      uuid,
      proposedDuty,
      dutyHistory
    );

    // 7. Determine overall legality
    const is_legal =
      qualificationIssues.length === 0 &&
      restCompliance.is_compliant &&
      fdpCompliance.is_compliant &&
      dutyLimits.rolling_28_day_hours <= dutyLimits.rolling_28_day_limit &&
      dutyLimits.rolling_365_day_hours <= dutyLimits.rolling_365_day_limit;

    // 8. Generate recommendations
    const recommendations = this.generateRecommendations(
      qualificationIssues,
      restCompliance,
      fdpCompliance,
      dutyLimits
    );

    const result: LegalityResult = {
      is_legal,
      crew_status: qualificationIssues.length === 0 ? 'QUALIFIED' : 'NOT_QUALIFIED',
      qualification_issues: qualificationIssues,
      rest_compliance: restCompliance,
      duty_limits: dutyLimits,
      recommendations,
    };

    logger.info('Legality validation complete', {
      crewId,
      is_legal,
      issues: qualificationIssues.length,
    });

    return result;
  }

  /**
   * Check crew qualifications for aircraft type
   */
  private async checkQualifications(
    crewId: string,
    aircraftType: string
  ): Promise<QualificationIssue[]> {
    const issues: QualificationIssue[] = [];

    // Check aircraft type rating
    const typeRatings = await getAircraftTypeRatings(crewId);
    const hasRating = typeRatings.some(
      (r) => r.aircraft_type === aircraftType && r.currency_status === 'CURRENT'
    );

    if (!hasRating) {
      issues.push({
        type: 'AIRCRAFT_TYPE_RATING',
        description: `No current type rating for ${aircraftType}`,
        severity: 'CRITICAL',
        resolution: 'Complete type rating training and check',
      });
    }

    // Check medical certificate
    const medical = await getMedicalCertificate(crewId);
    if (!medical || medical.status !== 'VALID') {
      issues.push({
        type: 'MEDICAL_CERTIFICATE',
        description: medical
          ? `Medical certificate ${medical.status.toLowerCase()}`
          : 'No medical certificate on file',
        severity: 'CRITICAL',
        resolution: 'Obtain or renew medical certificate',
      });
    }

    // Check recurrent training
    const training = await getTrainingRecords(crewId);
    const overdueTraining = training.filter((t) => t.status === 'OVERDUE');
    if (overdueTraining.length > 0) {
      issues.push({
        type: 'TRAINING',
        description: `${overdueTraining.length} overdue training item(s)`,
        severity: 'HIGH',
        resolution: 'Complete overdue training',
      });
    }

    return issues;
  }

  /**
   * Check rest compliance (30-hour lookback)
   */
  private checkRestCompliance(
    dutyHistory: any[],
    proposedDuty: DutyAssignment,
    _baseAirport: string
  ): RestCompliance {
    const violations: string[] = [];

    // Find most recent duty before proposed duty
    const sortedHistory = [...dutyHistory].sort(
      (a, b) => b.duty_end_utc.getTime() - a.duty_end_utc.getTime()
    );

    if (sortedHistory.length === 0) {
      // No previous duty, no rest requirement
      return {
        is_compliant: true,
        hours_since_rest: Infinity,
        minimum_rest_required: 0,
        violations: [],
      };
    }

    const lastDuty = sortedHistory[0];
    if (!lastDuty.duty_end_utc) {
      violations.push('Previous duty has no end time recorded');
      return {
        is_compliant: false,
        hours_since_rest: 0,
        minimum_rest_required: 10,
        violations,
      };
    }

    // Calculate hours since last rest
    const hoursSinceRest = differenceInHours(
      new Date(proposedDuty.duty_start_utc),
      lastDuty.duty_end_utc
    );

    // Determine minimum rest required based on previous FDP length
    const previousFDPHours = lastDuty.duty_time_minutes / 60;
    let minimumRestRequired = 10; // Default

    if (previousFDPHours <= 9) {
      minimumRestRequired = 10;
    } else if (previousFDPHours <= 13) {
      minimumRestRequired = 11;
    } else {
      minimumRestRequired = 12;
    }

    // Check compliance
    const is_compliant = hoursSinceRest >= minimumRestRequired;

    if (!is_compliant) {
      violations.push(
        `Only ${hoursSinceRest.toFixed(1)} hours rest since last duty (requires ${minimumRestRequired} hours)`
      );
    }

    // Check for 30-hour rest in last 168 hours
    // TODO: Implement 30-hour rest check logic
    // This requires tracking actual rest periods between duties
    // const sevenDaysAgo = new Date(proposedDuty.duty_start_utc);
    // sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Would need to verify 30 consecutive hours of rest in previous 7 days

    return {
      is_compliant,
      hours_since_rest: hoursSinceRest,
      minimum_rest_required: minimumRestRequired,
      violations,
    };
  }

  /**
   * Check FDP limits based on report time and number of segments
   */
  private checkFDPLimits(proposedDuty: DutyAssignment): {
    is_compliant: boolean;
    max_fdp_hours: number;
    proposed_fdp_hours: number;
    violations: string[];
  } {
    const violations: string[] = [];

    // Calculate proposed FDP length
    const dutyStart = DateTime.fromJSDate(new Date(proposedDuty.duty_start_utc));
    const dutyEnd = proposedDuty.duty_end_utc
      ? DateTime.fromJSDate(new Date(proposedDuty.duty_end_utc))
      : dutyStart.plus({ minutes: proposedDuty.flight_time_minutes || 360 });

    const proposedFDPHours = dutyEnd.diff(dutyStart, 'hours').hours;

    // Get report time in home base local time (simplified - using UTC hour)
    const reportHour = dutyStart.hour;

    // Determine segment bucket
    const segments = proposedDuty.number_of_segments || 1;
    let segmentBucket: string;
    if (segments <= 2) segmentBucket = '2_segments';
    else if (segments === 3) segmentBucket = '3_segments';
    else if (segments === 4) segmentBucket = '4_segments';
    else if (segments === 5) segmentBucket = '5_segments';
    else if (segments === 6) segmentBucket = '6_segments';
    else segmentBucket = '7_plus_segments';

    // Get time bucket
    let timeBucket: string;
    if (reportHour >= 0 && reportHour <= 4) timeBucket = '0000-0459';
    else if (reportHour === 5) timeBucket = '0500-0559';
    else if (reportHour === 6) timeBucket = '0600-0659';
    else if (reportHour >= 7 && reportHour <= 12) timeBucket = '0700-1259';
    else if (reportHour >= 13 && reportHour <= 16) timeBucket = '1300-1659';
    else if (reportHour >= 17 && reportHour <= 21) timeBucket = '1700-2159';
    else if (reportHour === 22) timeBucket = '2200-2259';
    else timeBucket = '2300-2359';

    // Get max FDP from rules
    const maxFDPHours =
      this.faaRules.fdp_limits.unaugmented.limits_by_segments_and_start_time[
        segmentBucket
      ]?.[timeBucket] || 9.0;

    const is_compliant = proposedFDPHours <= maxFDPHours;

    if (!is_compliant) {
      violations.push(
        `Proposed FDP (${proposedFDPHours.toFixed(1)} hours) exceeds limit (${maxFDPHours} hours) for ${segments} segments starting at ${reportHour}:00`
      );
    }

    return {
      is_compliant,
      max_fdp_hours: maxFDPHours,
      proposed_fdp_hours: proposedFDPHours,
      violations,
    };
  }

  /**
   * Check rolling flight time limits (100/1000 hours)
   */
  private async checkFlightTimeLimits(
    crewId: string,
    proposedDuty: DutyAssignment,
    dutyHistory: any[]
  ): Promise<DutyLimits> {
    const dutyDate = new Date(proposedDuty.duty_start_utc);

    // Calculate rolling hours
    const rolling = await calculateRollingHours(crewId, dutyDate);

    // Add proposed flight time
    const proposedFlightHours = (proposedDuty.flight_time_minutes || 0) / 60;
    const projected28Day = rolling.rolling_28_day + proposedFlightHours;
    const projected365Day = rolling.rolling_365_day + proposedFlightHours;

    // Get limits from rules
    const limit28Day = this.faaRules.flight_time_limits.rolling_28_day.limit_hours;
    const limit365Day = this.faaRules.flight_time_limits.rolling_365_day.limit_hours;

    // Count consecutive duty days
    const consecutiveDays = this.countConsecutiveDutyDays(dutyHistory, dutyDate);

    return {
      rolling_28_day_hours: projected28Day,
      rolling_28_day_limit: limit28Day,
      rolling_365_day_hours: projected365Day,
      rolling_365_day_limit: limit365Day,
      consecutive_duty_days: consecutiveDays,
    };
  }

  /**
   * Count consecutive duty days
   */
  private countConsecutiveDutyDays(dutyHistory: any[], asOfDate: Date): number {
    const sortedHistory = [...dutyHistory]
      .filter((d) => d.duty_date < asOfDate)
      .sort((a, b) => b.duty_date.getTime() - a.duty_date.getTime());

    if (sortedHistory.length === 0) return 0;

    let consecutive = 1;
    let currentDate = sortedHistory[0].duty_date;

    for (let i = 1; i < sortedHistory.length; i++) {
      const prevDate = sortedHistory[i].duty_date;
      const daysDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        consecutive++;
        currentDate = prevDate;
      } else {
        break;
      }
    }

    return consecutive;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    qualificationIssues: QualificationIssue[],
    restCompliance: RestCompliance,
    fdpCompliance: any,
    dutyLimits: DutyLimits
  ): string[] {
    const recommendations: string[] = [];

    // Qualification recommendations
    if (qualificationIssues.length > 0) {
      recommendations.push(
        `Address ${qualificationIssues.length} qualification issue(s) before assignment`
      );
    }

    // Rest recommendations
    if (!restCompliance.is_compliant) {
      const additionalRestNeeded =
        restCompliance.minimum_rest_required - restCompliance.hours_since_rest;
      recommendations.push(
        `Crew needs ${additionalRestNeeded.toFixed(1)} more hours of rest before assignment`
      );
    }

    // FDP recommendations
    if (!fdpCompliance.is_compliant) {
      const excessHours = fdpCompliance.proposed_fdp_hours - fdpCompliance.max_fdp_hours;
      recommendations.push(
        `Reduce FDP by ${excessHours.toFixed(1)} hours or adjust start time`
      );
    }

    // Flight time limit warnings
    if (dutyLimits.rolling_28_day_hours > dutyLimits.rolling_28_day_limit * 0.9) {
      recommendations.push(
        `Approaching 28-day limit (${dutyLimits.rolling_28_day_hours.toFixed(1)}/${dutyLimits.rolling_28_day_limit} hours)`
      );
    }

    if (dutyLimits.rolling_365_day_hours > dutyLimits.rolling_365_day_limit * 0.9) {
      recommendations.push(
        `Approaching 365-day limit (${dutyLimits.rolling_365_day_hours.toFixed(1)}/${dutyLimits.rolling_365_day_limit} hours)`
      );
    }

    // Consecutive duty warnings
    if (dutyLimits.consecutive_duty_days >= 6) {
      recommendations.push(
        `${dutyLimits.consecutive_duty_days} consecutive duty days - schedule rest day soon`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Crew member is legal and qualified for this assignment');
    }

    return recommendations;
  }

  /**
   * Validate multiple crew members for an assignment (bulk validation)
   */
  async validateCrewPool(
    crewIds: string[],
    proposedDuty: DutyAssignment
  ): Promise<Map<string, LegalityResult>> {
    logger.info(`Validating ${crewIds.length} crew members for assignment`);

    const results = new Map<string, LegalityResult>();

    for (const crewId of crewIds) {
      try {
        const result = await this.validateAssignment(crewId, proposedDuty);
        results.set(crewId, result);
      } catch (error) {
        logger.error(`Failed to validate crew ${crewId}:`, error);
      }
    }

    return results;
  }
}
