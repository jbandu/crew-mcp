/**
 * MCP Protocol types and tool definitions
 */

export interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface GetCrewQualificationsArgs {
  crew_identifier: string;
  include_expired?: boolean;
  qualification_types?: Array<'licenses' | 'type_ratings' | 'medical' | 'training' | 'all'>;
}

export interface ValidateCrewLegalityArgs {
  crew_identifier: string;
  aircraft_type: string;
  duty_start_utc: string;
  duty_end_utc?: string;
  flight_time_minutes?: number;
  number_of_segments?: number;
}

export interface CalculateCrewPayArgs {
  crew_identifier: string;
  pay_period_start: string;
  pay_period_end: string;
  include_breakdown?: boolean;
}

export interface FlagPayDiscrepanciesArgs {
  pay_period_start: string;
  pay_period_end: string;
  crew_identifiers?: string[];
  discrepancy_types?: Array<'missing_premium' | 'incorrect_per_diem' | 'guarantee_not_applied' | 'overtime_missing' | 'all'>;
  threshold_amount?: number;
}

export interface GetTrainingRequirementsArgs {
  crew_identifier: string;
  training_types?: string[];
  days_ahead?: number;
  status_filter?: Array<'current' | 'due_soon' | 'overdue'>;
}

export interface CheckCertificationExpiryArgs {
  days_ahead?: number;
  certification_types?: Array<'license' | 'medical' | 'type_rating' | 'training' | 'all'>;
  base_airport?: string;
}

export interface GetQualifiedCrewPoolArgs {
  aircraft_type: string;
  position: string;
  base_airport?: string;
  duty_date?: string;
  check_legality?: boolean;
}

export interface UpdateDutyTimeArgs {
  crew_identifier: string;
  duty_date: string;
  duty_start_utc: string;
  duty_end_utc: string;
  flight_time_minutes?: number;
  duty_time_minutes?: number;
  block_time_minutes?: number;
  flight_segments?: number;
  wocl_crossing?: boolean;
}
