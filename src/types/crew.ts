/**
 * Core crew member types and interfaces
 */

export type CrewType = 'PILOT' | 'FLIGHT_ATTENDANT';

export type PilotPosition = 'CAPTAIN' | 'FIRST_OFFICER';
export type FAPosition = 'FA' | 'LEAD_FA';
export type CrewPosition = PilotPosition | FAPosition;

export type CrewStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';

export interface CrewMember {
  crew_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  hire_date: Date;
  crew_type: CrewType;
  position: CrewPosition;
  base_airport: string;
  seniority_number?: number;
  status: CrewStatus;
  union_code?: string;
  email?: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PilotLicense {
  qualification_id: string;
  crew_id: string;
  license_type: 'ATP' | 'COMMERCIAL' | 'PRIVATE';
  license_number: string;
  issue_date: Date;
  expiration_date?: Date;
  issuing_authority?: string;
  created_at: Date;
}

export interface AircraftTypeRating {
  rating_id: string;
  crew_id: string;
  aircraft_type: string;
  rating_type: 'TYPE_RATING' | 'PIC' | 'SIC';
  initial_date: Date;
  last_check_date?: Date;
  next_check_due?: Date;
  currency_status: 'CURRENT' | 'EXPIRING_SOON' | 'EXPIRED';
  landings_90_day: number;
  approaches_90_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface MedicalCertificate {
  certificate_id: string;
  crew_id: string;
  class: 'FIRST_CLASS' | 'SECOND_CLASS' | 'THIRD_CLASS';
  issue_date: Date;
  expiration_date: Date;
  limitations?: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  created_at: Date;
}

export interface RecurrentTraining {
  training_id: string;
  crew_id: string;
  training_type: 'RECURRENT' | 'UPGRADE' | 'DIFFERENCES' | 'EMERGENCY';
  aircraft_type?: string;
  completion_date: Date;
  next_due_date: Date;
  instructor_name?: string;
  training_location?: string;
  status: 'CURRENT' | 'DUE_SOON' | 'OVERDUE';
  created_at: Date;
}

export interface DutyTimeRecord {
  duty_id: string;
  crew_id: string;
  duty_date: Date;
  duty_start_utc: Date;
  duty_end_utc?: Date;
  flight_time_minutes: number;
  duty_time_minutes: number;
  block_time_minutes: number;
  rest_period_start_utc?: Date;
  rest_period_end_utc?: Date;
  is_fdp: boolean;
  wocl_crossing: boolean;
  consecutive_nights: number;
  flight_segments: number;
  created_at: Date;
  updated_at: Date;
}

export interface CrewQualificationProfile {
  crew_member: CrewMember;
  licenses: PilotLicense[];
  type_ratings: AircraftTypeRating[];
  medical?: MedicalCertificate;
  training: RecurrentTraining[];
  overall_status: 'QUALIFIED' | 'RESTRICTIONS' | 'NOT_QUALIFIED';
}
