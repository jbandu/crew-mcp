/**
 * Qualification validation and compliance types
 */

export type QualificationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';

export interface QualificationIssue {
  type: string;
  description: string;
  severity: QualificationSeverity;
  resolution?: string;
}

export interface RestCompliance {
  is_compliant: boolean;
  hours_since_rest: number;
  minimum_rest_required: number;
  violations: string[];
}

export interface DutyLimits {
  rolling_28_day_hours: number;
  rolling_28_day_limit: number;
  rolling_365_day_hours: number;
  rolling_365_day_limit: number;
  consecutive_duty_days: number;
}

export interface LegalityResult {
  is_legal: boolean;
  crew_status: 'QUALIFIED' | 'NOT_QUALIFIED';
  qualification_issues: QualificationIssue[];
  rest_compliance: RestCompliance;
  duty_limits: DutyLimits;
  recommendations: string[];
}

export interface DutyAssignment {
  aircraft_type: string;
  duty_start_utc: Date;
  duty_end_utc?: Date;
  flight_time_minutes: number;
  number_of_segments: number;
}

export interface FAACompliance {
  compliance_id: string;
  crew_id: string;
  check_date: Date;
  rolling_28_day_hours: number;
  rolling_365_day_hours: number;
  consecutive_duty_days: number;
  rest_compliance: boolean;
  fdp_compliance: boolean;
  violations?: Record<string, any>;
  created_at: Date;
}

export interface TrainingRequirement {
  crew_member: {
    employee_number: string;
    name: string;
    position: string;
  };
  training_status: {
    current: Array<{
      type: string;
      completion_date: Date;
      next_due: Date;
    }>;
    due_soon: Array<{
      type: string;
      next_due: Date;
      days_until_due: number;
    }>;
    overdue: Array<{
      type: string;
      due_date: Date;
      days_overdue: number;
    }>;
  };
  recommendations: string[];
}

export interface CertificationAlert {
  crew_member: {
    employee_number: string;
    name: string;
    position: string;
    base: string;
  };
  certification_type: string;
  certification_details: Record<string, any>;
  expiration_date: Date;
  days_until_expiry: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommended_action: string;
}

export interface QualifiedCrewMember {
  crew_member: {
    employee_number: string;
    name: string;
    position: string;
    base: string;
    seniority?: number;
  };
  qualifications: {
    aircraft_qualified: boolean;
    currency_status: string;
    last_check_date?: Date;
  };
  availability: {
    is_available: boolean;
    rest_compliant: boolean;
    duty_limit_compliant: boolean;
  };
  suitability_score: number;
}
