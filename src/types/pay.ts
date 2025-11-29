/**
 * Pay calculation types and interfaces
 */

export type PayRuleType = 'BASE_PAY' | 'PER_DIEM' | 'PREMIUM' | 'OVERTIME' | 'GUARANTEE';
export type CalculationMethod = 'AUTOMATED' | 'MANUAL' | 'ADJUSTED';

export interface PayCalculationRule {
  rule_id: string;
  rule_name: string;
  rule_type: PayRuleType;
  crew_type: string;
  position?: string;
  effective_date: Date;
  expiration_date?: Date;
  rule_config: Record<string, any>;
  union_code?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PayBreakdownItem {
  type: string;
  hours?: number;
  days?: number;
  rate: number;
  amount: number;
  description?: string;
}

export interface PayCalculation {
  crew_member: {
    employee_number: string;
    name: string;
    position: string;
  };
  pay_period: {
    start: Date;
    end: Date;
  };
  summary: {
    total_flight_hours: number;
    total_duty_hours: number;
    total_compensation: number;
  };
  breakdown: {
    base_pay: PayBreakdownItem;
    per_diem: PayBreakdownItem;
    premium_pay: PayBreakdownItem[];
    overtime_pay: PayBreakdownItem;
    guarantee_pay: PayBreakdownItem;
  };
  duty_records: Array<{
    date: Date;
    flight_time: number;
    duty_time: number;
    block_time: number;
  }>;
  applied_rules: Array<{
    rule_name: string;
    rule_type: PayRuleType;
    amount: number;
  }>;
  calculation_timestamp: Date;
}

export interface CrewPayRecord {
  pay_id: string;
  crew_id: string;
  pay_period_start: Date;
  pay_period_end: Date;
  flight_hours: number;
  duty_hours: number;
  base_pay: number;
  per_diem: number;
  premium_pay: number;
  overtime_pay: number;
  guarantee_pay: number;
  total_compensation: number;
  calculation_method: CalculationMethod;
  verified: boolean;
  verified_by?: string;
  verified_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type ClaimType = 'MISSING_PAY' | 'INCORRECT_CALCULATION' | 'MISSING_PREMIUM' | 'PER_DIEM_ERROR';
export type ClaimStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED' | 'RESOLVED';

export interface CrewClaim {
  claim_id: string;
  crew_id: string;
  pay_id?: string;
  claim_date: Date;
  claim_type: ClaimType;
  claimed_amount?: number;
  actual_amount?: number;
  difference?: number;
  status: ClaimStatus;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PayDiscrepancy {
  crew_member: {
    employee_number: string;
    name: string;
  };
  discrepancy_type: string;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_action: string;
  supporting_evidence: Record<string, any>;
}
