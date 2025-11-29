/**
 * Pay Calculator Engine
 * Main engine for calculating crew member pay with union rule compliance
 */

import { differenceInYears } from 'date-fns';
import { getCrewMember, getDutyTimeRecords } from '../db/queries.js';
import { RulesEngine, type PayContext } from './rules-engine.js';
import type { PayCalculation, PayBreakdownItem } from '../types/pay.js';
import { logger } from '../utils/logger.js';

export class PayCalculator {
  private rulesEngine: RulesEngine;

  constructor() {
    this.rulesEngine = new RulesEngine();
  }

  /**
   * Calculate pay for a crew member for a given pay period
   */
  async calculatePay(
    crewId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PayCalculation> {
    logger.info('Calculating pay', { crewId, periodStart, periodEnd });

    // 1. Get crew member details
    const crewMember = await getCrewMember(crewId);
    if (!crewMember) {
      throw new Error(`Crew member not found: ${crewId}`);
    }

    // 2. Get all duty records in the period
    const dutyRecords = await getDutyTimeRecords(crewId, periodStart, periodEnd);
    logger.debug(`Found ${dutyRecords.length} duty records`);

    // 3. Calculate totals from duty records
    const totals = this.calculateTotals(dutyRecords);

    // 4. Calculate years of service
    const yearsOfService = differenceInYears(new Date(), crewMember.hire_date);

    // 5. Build context for rules engine
    const context: PayContext = {
      crewMember,
      periodStart,
      periodEnd,
      flightHours: totals.totalFlightHours,
      dutyHours: totals.totalDutyHours,
      dutyDays: totals.dutyDays,
      nightHours: totals.nightHours,
      internationalTrips: totals.internationalTrips,
      holidayHours: totals.holidayHours,
      yearsOfService,
    };

    // 6. Apply all pay rules
    const ruleResults = await this.rulesEngine.applyAllRules(context);

    // 7. Build breakdown
    const breakdown = {
      base_pay: this.convertToBreakdownItem(ruleResults.basePay, totals.totalFlightHours),
      per_diem: this.convertToBreakdownItem(ruleResults.perDiem, totals.totalDutyHours),
      premium_pay: ruleResults.premiumPay.map(p => this.convertToBreakdownItem(p)),
      overtime_pay: this.convertToBreakdownItem(ruleResults.overtimePay),
      guarantee_pay: this.convertToBreakdownItem(ruleResults.guaranteePay),
    };

    // 8. Build applied rules list
    const appliedRules = [
      ruleResults.basePay,
      ruleResults.perDiem,
      ...ruleResults.premiumPay,
      ruleResults.overtimePay,
      ruleResults.guaranteePay,
    ]
      .filter(r => r.amount > 0)
      .map(r => ({
        rule_name: r.ruleName,
        rule_type: r.ruleType as import('../types/pay.js').PayRuleType,
        amount: r.amount,
      }));

    // 9. Build duty records summary
    const dutyRecordsSummary = dutyRecords.map(dr => ({
      date: dr.duty_date,
      flight_time: dr.flight_time_minutes / 60,
      duty_time: dr.duty_time_minutes / 60,
      block_time: dr.block_time_minutes / 60,
    }));

    // 10. Return complete calculation
    const calculation: PayCalculation = {
      crew_member: {
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        position: crewMember.position,
      },
      pay_period: {
        start: periodStart,
        end: periodEnd,
      },
      summary: {
        total_flight_hours: totals.totalFlightHours,
        total_duty_hours: totals.totalDutyHours,
        total_compensation: ruleResults.totalAmount,
      },
      breakdown,
      duty_records: dutyRecordsSummary,
      applied_rules: appliedRules,
      calculation_timestamp: new Date(),
    };

    logger.info('Pay calculation complete', {
      crewId,
      totalCompensation: ruleResults.totalAmount,
      rulesApplied: appliedRules.length,
    });

    return calculation;
  }

  /**
   * Calculate totals from duty records
   */
  private calculateTotals(dutyRecords: any[]): {
    totalFlightHours: number;
    totalDutyHours: number;
    totalBlockHours: number;
    dutyDays: number;
    nightHours: number;
    internationalTrips: number;
    holidayHours: number;
  } {
    let totalFlightMinutes = 0;
    let totalDutyMinutes = 0;
    let totalBlockMinutes = 0;
    let nightMinutes = 0;
    let internationalTrips = 0;
    let holidayMinutes = 0;

    const uniqueDutyDays = new Set<string>();

    for (const record of dutyRecords) {
      totalFlightMinutes += record.flight_time_minutes || 0;
      totalDutyMinutes += record.duty_time_minutes || 0;
      totalBlockMinutes += record.block_time_minutes || 0;

      // Track unique duty days
      uniqueDutyDays.add(record.duty_date.toISOString().split('T')[0]);

      // Estimate night hours (if WOCL crossing flagged)
      if (record.wocl_crossing) {
        nightMinutes += Math.min(record.duty_time_minutes, 240); // Max 4 hours night
      }

      // TODO: Detect international trips from duty records metadata
      // For now, assume no international trips unless flagged

      // TODO: Detect holiday hours from duty dates
      // Would need to check duty_date against holiday calendar
    }

    return {
      totalFlightHours: totalFlightMinutes / 60,
      totalDutyHours: totalDutyMinutes / 60,
      totalBlockHours: totalBlockMinutes / 60,
      dutyDays: uniqueDutyDays.size,
      nightHours: nightMinutes / 60,
      internationalTrips,
      holidayHours: holidayMinutes / 60,
    };
  }

  /**
   * Convert rule application to breakdown item
   */
  private convertToBreakdownItem(
    ruleApp: { ruleName: string; amount: number; description: string },
    hours?: number
  ): PayBreakdownItem {
    return {
      type: ruleApp.ruleName,
      hours,
      rate: hours && hours > 0 ? ruleApp.amount / hours : 0,
      amount: ruleApp.amount,
      description: ruleApp.description,
    };
  }

  /**
   * Calculate pay for multiple crew members in a period
   */
  async calculateBulkPay(
    crewIds: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<PayCalculation[]> {
    logger.info(`Calculating bulk pay for ${crewIds.length} crew members`);

    const calculations: PayCalculation[] = [];

    for (const crewId of crewIds) {
      try {
        const calculation = await this.calculatePay(crewId, periodStart, periodEnd);
        calculations.push(calculation);
      } catch (error) {
        logger.error(`Failed to calculate pay for crew ${crewId}:`, error);
        // Continue with other crew members
      }
    }

    logger.info(`Completed ${calculations.length} pay calculations`);
    return calculations;
  }

  /**
   * Estimate pay for a future period based on average hours
   */
  async estimatePay(
    crewId: string,
    estimatedFlightHours: number,
    estimatedDutyHours: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PayCalculation> {
    logger.info('Estimating pay', { crewId, estimatedFlightHours, estimatedDutyHours });

    // Get crew member details
    const crewMember = await getCrewMember(crewId);
    if (!crewMember) {
      throw new Error(`Crew member not found: ${crewId}`);
    }

    // Calculate years of service
    const yearsOfService = differenceInYears(new Date(), crewMember.hire_date);

    // Build context with estimated hours
    const context: PayContext = {
      crewMember,
      periodStart,
      periodEnd,
      flightHours: estimatedFlightHours,
      dutyHours: estimatedDutyHours,
      dutyDays: Math.ceil(estimatedFlightHours / 5), // Estimate ~5 hours per duty day
      nightHours: 0,
      internationalTrips: 0,
      holidayHours: 0,
      yearsOfService,
    };

    // Apply rules
    const ruleResults = await this.rulesEngine.applyAllRules(context);

    // Build simplified calculation
    const calculation: PayCalculation = {
      crew_member: {
        employee_number: crewMember.employee_number,
        name: `${crewMember.first_name} ${crewMember.last_name}`,
        position: crewMember.position,
      },
      pay_period: {
        start: periodStart,
        end: periodEnd,
      },
      summary: {
        total_flight_hours: estimatedFlightHours,
        total_duty_hours: estimatedDutyHours,
        total_compensation: ruleResults.totalAmount,
      },
      breakdown: {
        base_pay: this.convertToBreakdownItem(ruleResults.basePay, estimatedFlightHours),
        per_diem: this.convertToBreakdownItem(ruleResults.perDiem, estimatedDutyHours),
        premium_pay: ruleResults.premiumPay.map(p => this.convertToBreakdownItem(p)),
        overtime_pay: this.convertToBreakdownItem(ruleResults.overtimePay),
        guarantee_pay: this.convertToBreakdownItem(ruleResults.guaranteePay),
      },
      duty_records: [],
      applied_rules: [
        ruleResults.basePay,
        ruleResults.perDiem,
        ...ruleResults.premiumPay,
        ruleResults.overtimePay,
        ruleResults.guaranteePay,
      ]
        .filter(r => r.amount > 0)
        .map(r => ({
          rule_name: r.ruleName,
          rule_type: r.ruleType as import('../types/pay.js').PayRuleType,
          amount: r.amount,
        })),
      calculation_timestamp: new Date(),
    };

    logger.info('Pay estimation complete', {
      crewId,
      estimatedCompensation: ruleResults.totalAmount,
    });

    return calculation;
  }
}
