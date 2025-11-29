/**
 * Rules Engine for Pay Calculation
 * Loads and applies pay calculation rules from database and JSON configurations
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPayCalculationRules } from '../db/queries.js';
import type { PayCalculationRule } from '../types/pay.js';
import type { CrewMember } from '../types/crew.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface PayContext {
  crewMember: CrewMember;
  periodStart: Date;
  periodEnd: Date;
  flightHours: number;
  dutyHours: number;
  dutyDays: number;
  nightHours?: number;
  internationalTrips?: number;
  holidayHours?: number;
  yearsOfService?: number;
}

export interface RuleApplication {
  ruleName: string;
  ruleType: string;
  amount: number;
  description: string;
  calculation: string;
}

/**
 * Load static rules from JSON file
 */
function loadStaticRules(): Record<string, any> {
  try {
    const rulesPath = join(__dirname, '../rules/pay-calculation-rules.json');
    const rulesContent = readFileSync(rulesPath, 'utf-8');
    return JSON.parse(rulesContent);
  } catch (error) {
    logger.error('Failed to load static pay rules:', error);
    return {};
  }
}

export class RulesEngine {
  private staticRules: Record<string, any>;
  private dbRules: PayCalculationRule[] = [];

  constructor() {
    this.staticRules = loadStaticRules();
  }

  /**
   * Load rules from database for specific crew type and position
   */
  async loadDatabaseRules(
    crewType: string,
    position?: string,
    effectiveDate?: Date
  ): Promise<void> {
    try {
      this.dbRules = await getPayCalculationRules(crewType, position, effectiveDate);
      logger.debug(`Loaded ${this.dbRules.length} rules from database`, {
        crewType,
        position,
      });
    } catch (error) {
      logger.error('Failed to load database rules:', error);
      this.dbRules = [];
    }
  }

  /**
   * Calculate base pay
   */
  calculateBasePay(context: PayContext): RuleApplication {
    const { crewMember, flightHours } = context;

    // Get base pay rate from static rules
    const basePayRules = this.staticRules[
      crewMember.crew_type === 'PILOT' ? 'pilot_base_pay' : 'flight_attendant_base_pay'
    ];

    const positionRates = basePayRules?.positions?.[crewMember.position];
    if (!positionRates) {
      logger.warn(`No base pay rate found for ${crewMember.position}`);
      return {
        ruleName: 'Base Pay',
        ruleType: 'BASE_PAY',
        amount: 0,
        description: 'Base hourly pay',
        calculation: 'No rate configured',
      };
    }

    const hourlyRate = positionRates.hourly_rate;
    const amount = flightHours * hourlyRate;

    return {
      ruleName: 'Base Pay',
      ruleType: 'BASE_PAY',
      amount,
      description: `Base pay at $${hourlyRate}/hour`,
      calculation: `${flightHours.toFixed(2)} hours × $${hourlyRate} = $${amount.toFixed(2)}`,
    };
  }

  /**
   * Calculate per diem
   */
  calculatePerDiem(context: PayContext): RuleApplication {
    const { dutyHours } = context;

    const perDiemRules = this.staticRules.per_diem;
    const domesticRate = perDiemRules?.rates?.domestic?.rate_per_hour || 2.5;
    const minimumHours = perDiemRules?.rates?.domestic?.minimum_hours || 4;

    if (dutyHours < minimumHours) {
      return {
        ruleName: 'Per Diem',
        ruleType: 'PER_DIEM',
        amount: 0,
        description: 'Per diem (below minimum)',
        calculation: `${dutyHours.toFixed(2)} hours < ${minimumHours} minimum`,
      };
    }

    const amount = dutyHours * domesticRate;

    return {
      ruleName: 'Per Diem',
      ruleType: 'PER_DIEM',
      amount,
      description: `Per diem at $${domesticRate}/hour`,
      calculation: `${dutyHours.toFixed(2)} hours × $${domesticRate} = $${amount.toFixed(2)}`,
    };
  }

  /**
   * Calculate premium pay (night flying, holidays, international, etc.)
   */
  calculatePremiumPay(context: PayContext): RuleApplication[] {
    const premiums: RuleApplication[] = [];
    const premiumRules = this.staticRules.premium_pay?.premiums;

    if (!premiumRules) {
      return premiums;
    }

    // Night flying premium
    if (context.nightHours && context.nightHours > 0) {
      const nightPremium = premiumRules.night_flying;
      if (nightPremium && this.appliesToCrewType(nightPremium, context.crewMember)) {
        const basePayRate = this.getBasePayRate(context.crewMember);
        const multiplier = nightPremium.rate_multiplier || 1.5;
        const amount = context.nightHours * basePayRate * (multiplier - 1);

        premiums.push({
          ruleName: 'Night Flying Premium',
          ruleType: 'PREMIUM',
          amount,
          description: `Night hours premium at ${multiplier}x`,
          calculation: `${context.nightHours.toFixed(2)} hours × $${basePayRate} × ${multiplier - 1} = $${amount.toFixed(2)}`,
        });
      }
    }

    // Holiday premium
    if (context.holidayHours && context.holidayHours > 0) {
      const holidayPremium = premiumRules.holiday;
      if (holidayPremium) {
        const basePayRate = this.getBasePayRate(context.crewMember);
        const multiplier = holidayPremium.rate_multiplier || 2.0;
        const amount = context.holidayHours * basePayRate * (multiplier - 1);

        premiums.push({
          ruleName: 'Holiday Premium',
          ruleType: 'PREMIUM',
          amount,
          description: `Holiday hours premium at ${multiplier}x`,
          calculation: `${context.holidayHours.toFixed(2)} hours × $${basePayRate} × ${multiplier - 1} = $${amount.toFixed(2)}`,
        });
      }
    }

    // International trips
    if (context.internationalTrips && context.internationalTrips > 0) {
      const intlPremium = premiumRules.international;
      if (intlPremium) {
        const amount = context.internationalTrips * intlPremium.flat_amount;

        premiums.push({
          ruleName: 'International Premium',
          ruleType: 'PREMIUM',
          amount,
          description: 'International flight premium',
          calculation: `${context.internationalTrips} trips × $${intlPremium.flat_amount} = $${amount.toFixed(2)}`,
        });
      }
    }

    // Longevity pay
    if (context.yearsOfService !== undefined) {
      const longevityRules = this.staticRules.longevity_pay;
      if (longevityRules) {
        const tier = this.getLongevityTier(context.yearsOfService, longevityRules.tiers);
        if (tier && tier.percentage_increase > 0) {
          const basePay = this.calculateBasePay(context).amount;
          const amount = basePay * (tier.percentage_increase / 100);

          premiums.push({
            ruleName: 'Longevity Pay',
            ruleType: 'PREMIUM',
            amount,
            description: `${tier.percentage_increase}% longevity increase`,
            calculation: `$${basePay.toFixed(2)} × ${tier.percentage_increase}% = $${amount.toFixed(2)}`,
          });
        }
      }
    }

    return premiums;
  }

  /**
   * Calculate overtime pay
   */
  calculateOvertimePay(context: PayContext): RuleApplication {
    const { flightHours } = context;
    const overtimeRules = this.staticRules.overtime;

    if (!overtimeRules) {
      return {
        ruleName: 'Overtime',
        ruleType: 'OVERTIME',
        amount: 0,
        description: 'No overtime',
        calculation: 'No overtime rules configured',
      };
    }

    const threshold = overtimeRules.thresholds?.monthly?.threshold_hours || 85;
    const multiplier = overtimeRules.thresholds?.monthly?.rate_multiplier || 1.5;

    if (flightHours <= threshold) {
      return {
        ruleName: 'Overtime',
        ruleType: 'OVERTIME',
        amount: 0,
        description: 'No overtime (below threshold)',
        calculation: `${flightHours.toFixed(2)} hours ≤ ${threshold} threshold`,
      };
    }

    const overtimeHours = flightHours - threshold;
    const basePayRate = this.getBasePayRate(context.crewMember);
    const amount = overtimeHours * basePayRate * (multiplier - 1);

    return {
      ruleName: 'Overtime',
      ruleType: 'OVERTIME',
      amount,
      description: `Overtime at ${multiplier}x over ${threshold} hours`,
      calculation: `${overtimeHours.toFixed(2)} hours × $${basePayRate} × ${multiplier - 1} = $${amount.toFixed(2)}`,
    };
  }

  /**
   * Calculate guarantee pay (minimum guarantee)
   */
  calculateGuaranteePay(context: PayContext, calculatedBasePay: number): RuleApplication {
    const { crewMember } = context;
    const guaranteeRules = this.staticRules.guarantee;

    if (!guaranteeRules) {
      return {
        ruleName: 'Guarantee',
        ruleType: 'GUARANTEE',
        amount: 0,
        description: 'No guarantee',
        calculation: 'No guarantee rules configured',
      };
    }

    const positionGuarantee = guaranteeRules.rules?.monthly_guarantee?.positions?.[crewMember.position];
    if (!positionGuarantee) {
      return {
        ruleName: 'Guarantee',
        ruleType: 'GUARANTEE',
        amount: 0,
        description: 'No guarantee for position',
        calculation: 'No guarantee configured for this position',
      };
    }

    const guaranteedAmount = positionGuarantee.guaranteed_amount;
    const guaranteedHours = positionGuarantee.guaranteed_hours;

    // If actual pay is less than guarantee, pay the difference
    if (calculatedBasePay < guaranteedAmount) {
      const amount = guaranteedAmount - calculatedBasePay;
      return {
        ruleName: 'Monthly Guarantee',
        ruleType: 'GUARANTEE',
        amount,
        description: `Guarantee minimum (${guaranteedHours} hours)`,
        calculation: `$${guaranteedAmount} guarantee - $${calculatedBasePay.toFixed(2)} actual = $${amount.toFixed(2)}`,
      };
    }

    return {
      ruleName: 'Guarantee',
      ruleType: 'GUARANTEE',
      amount: 0,
      description: 'Above guarantee minimum',
      calculation: `$${calculatedBasePay.toFixed(2)} ≥ $${guaranteedAmount} guarantee`,
    };
  }

  /**
   * Get base pay rate for a crew member
   */
  private getBasePayRate(crewMember: CrewMember): number {
    const basePayRules = this.staticRules[
      crewMember.crew_type === 'PILOT' ? 'pilot_base_pay' : 'flight_attendant_base_pay'
    ];

    const positionRates = basePayRules?.positions?.[crewMember.position];
    return positionRates?.hourly_rate || 0;
  }

  /**
   * Check if a rule applies to the crew type
   */
  private appliesToCrewType(rule: any, crewMember: CrewMember): boolean {
    if (!rule.applies_to) return true;
    if (rule.applies_to.includes('ALL')) return true;
    return rule.applies_to.includes(crewMember.crew_type);
  }

  /**
   * Get longevity tier based on years of service
   */
  private getLongevityTier(yearsOfService: number, tiers: any[]): any {
    for (const tier of tiers) {
      const minYears = tier.min_years;
      const maxYears = tier.max_years;

      if (maxYears === null && yearsOfService >= minYears) {
        return tier;
      }

      if (yearsOfService >= minYears && yearsOfService <= maxYears) {
        return tier;
      }
    }

    return null;
  }

  /**
   * Apply all rules and return complete breakdown
   */
  async applyAllRules(context: PayContext): Promise<{
    basePay: RuleApplication;
    perDiem: RuleApplication;
    premiumPay: RuleApplication[];
    overtimePay: RuleApplication;
    guaranteePay: RuleApplication;
    totalAmount: number;
  }> {
    // Load database rules
    await this.loadDatabaseRules(
      context.crewMember.crew_type,
      context.crewMember.position,
      context.periodStart
    );

    // Calculate all components
    const basePay = this.calculateBasePay(context);
    const perDiem = this.calculatePerDiem(context);
    const premiumPay = this.calculatePremiumPay(context);
    const overtimePay = this.calculateOvertimePay(context);
    const guaranteePay = this.calculateGuaranteePay(context, basePay.amount);

    // Calculate total
    const totalAmount =
      basePay.amount +
      perDiem.amount +
      premiumPay.reduce((sum, p) => sum + p.amount, 0) +
      overtimePay.amount +
      guaranteePay.amount;

    return {
      basePay,
      perDiem,
      premiumPay,
      overtimePay,
      guaranteePay,
      totalAmount,
    };
  }
}
