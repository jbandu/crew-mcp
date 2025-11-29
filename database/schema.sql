-- Crew Qualifications & Certifications Database Schema
-- Production-ready schema for airline crew management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean resets)
DROP TABLE IF EXISTS faa_part117_compliance CASCADE;
DROP TABLE IF EXISTS crew_claims CASCADE;
DROP TABLE IF EXISTS pay_calculation_rules CASCADE;
DROP TABLE IF EXISTS crew_pay_records CASCADE;
DROP TABLE IF EXISTS duty_time_records CASCADE;
DROP TABLE IF EXISTS recurrent_training CASCADE;
DROP TABLE IF EXISTS medical_certificates CASCADE;
DROP TABLE IF EXISTS aircraft_type_ratings CASCADE;
DROP TABLE IF EXISTS pilot_qualifications CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;

-- Table 1: crew_members
-- Core crew member information
CREATE TABLE crew_members (
  crew_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  hire_date DATE NOT NULL,
  crew_type VARCHAR(20) NOT NULL CHECK (crew_type IN ('PILOT', 'FLIGHT_ATTENDANT')),
  position VARCHAR(50) NOT NULL,
  base_airport VARCHAR(3) NOT NULL,
  seniority_number INTEGER,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'INACTIVE')),
  union_code VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crew_employee_number ON crew_members(employee_number);
CREATE INDEX idx_crew_type_base ON crew_members(crew_type, base_airport);
CREATE INDEX idx_crew_status ON crew_members(status);

-- Table 2: pilot_qualifications
-- Pilot licenses and certifications
CREATE TABLE pilot_qualifications (
  qualification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('ATP', 'COMMERCIAL', 'PRIVATE')),
  license_number VARCHAR(50) NOT NULL,
  issue_date DATE NOT NULL,
  expiration_date DATE,
  issuing_authority VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pilot_qual_crew ON pilot_qualifications(crew_id);
CREATE INDEX idx_pilot_qual_expiry ON pilot_qualifications(expiration_date);

-- Table 3: aircraft_type_ratings
-- Aircraft type rating certifications
CREATE TABLE aircraft_type_ratings (
  rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  aircraft_type VARCHAR(50) NOT NULL,
  rating_type VARCHAR(50) NOT NULL CHECK (rating_type IN ('TYPE_RATING', 'PIC', 'SIC')),
  initial_date DATE NOT NULL,
  last_check_date DATE,
  next_check_due DATE,
  currency_status VARCHAR(20) DEFAULT 'CURRENT' CHECK (currency_status IN ('CURRENT', 'EXPIRING_SOON', 'EXPIRED')),
  landings_90_day INTEGER DEFAULT 0,
  approaches_90_day INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_type_rating_crew ON aircraft_type_ratings(crew_id);
CREATE INDEX idx_type_rating_aircraft ON aircraft_type_ratings(aircraft_type);
CREATE INDEX idx_type_rating_currency ON aircraft_type_ratings(currency_status);

-- Table 4: medical_certificates
-- Medical certificate tracking
CREATE TABLE medical_certificates (
  certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  class VARCHAR(20) NOT NULL CHECK (class IN ('FIRST_CLASS', 'SECOND_CLASS', 'THIRD_CLASS')),
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  limitations TEXT,
  status VARCHAR(20) DEFAULT 'VALID' CHECK (status IN ('VALID', 'EXPIRING_SOON', 'EXPIRED')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_medical_crew ON medical_certificates(crew_id);
CREATE INDEX idx_medical_expiry ON medical_certificates(expiration_date);

-- Table 5: recurrent_training
-- Training and recurrency records
CREATE TABLE recurrent_training (
  training_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  training_type VARCHAR(100) NOT NULL CHECK (training_type IN ('RECURRENT', 'UPGRADE', 'DIFFERENCES', 'EMERGENCY')),
  aircraft_type VARCHAR(50),
  completion_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  instructor_name VARCHAR(200),
  training_location VARCHAR(100),
  status VARCHAR(20) DEFAULT 'CURRENT' CHECK (status IN ('CURRENT', 'DUE_SOON', 'OVERDUE')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_crew ON recurrent_training(crew_id);
CREATE INDEX idx_training_due ON recurrent_training(next_due_date);
CREATE INDEX idx_training_status ON recurrent_training(status);

-- Table 6: duty_time_records
-- Flight and duty time tracking
CREATE TABLE duty_time_records (
  duty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  duty_date DATE NOT NULL,
  duty_start_utc TIMESTAMP NOT NULL,
  duty_end_utc TIMESTAMP,
  flight_time_minutes INTEGER DEFAULT 0,
  duty_time_minutes INTEGER DEFAULT 0,
  block_time_minutes INTEGER DEFAULT 0,
  rest_period_start_utc TIMESTAMP,
  rest_period_end_utc TIMESTAMP,
  is_fdp BOOLEAN DEFAULT false,
  wocl_crossing BOOLEAN DEFAULT false,
  consecutive_nights INTEGER DEFAULT 0,
  flight_segments INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_duty_crew_date ON duty_time_records(crew_id, duty_date);
CREATE INDEX idx_duty_date ON duty_time_records(duty_date);

-- Table 7: crew_pay_records
-- Pay calculation records
CREATE TABLE crew_pay_records (
  pay_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  flight_hours DECIMAL(10,2) DEFAULT 0,
  duty_hours DECIMAL(10,2) DEFAULT 0,
  base_pay DECIMAL(10,2) DEFAULT 0,
  per_diem DECIMAL(10,2) DEFAULT 0,
  premium_pay DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  guarantee_pay DECIMAL(10,2) DEFAULT 0,
  total_compensation DECIMAL(10,2) DEFAULT 0,
  calculation_method VARCHAR(50) DEFAULT 'AUTOMATED' CHECK (calculation_method IN ('AUTOMATED', 'MANUAL', 'ADJUSTED')),
  verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pay_crew_period ON crew_pay_records(crew_id, pay_period_start);
CREATE INDEX idx_pay_verified ON crew_pay_records(verified);

-- Table 8: pay_calculation_rules
-- Configurable pay rules
CREATE TABLE pay_calculation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('BASE_PAY', 'PER_DIEM', 'PREMIUM', 'OVERTIME', 'GUARANTEE')),
  crew_type VARCHAR(20) NOT NULL,
  position VARCHAR(50),
  effective_date DATE NOT NULL,
  expiration_date DATE,
  rule_config JSONB NOT NULL,
  union_code VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rules_type_crew ON pay_calculation_rules(rule_type, crew_type);
CREATE INDEX idx_rules_active ON pay_calculation_rules(is_active);
CREATE INDEX idx_rules_effective ON pay_calculation_rules(effective_date);

-- Table 9: crew_claims
-- Pay claim tracking
CREATE TABLE crew_claims (
  claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  pay_id UUID REFERENCES crew_pay_records(pay_id),
  claim_date DATE NOT NULL,
  claim_type VARCHAR(50) NOT NULL CHECK (claim_type IN ('MISSING_PAY', 'INCORRECT_CALCULATION', 'MISSING_PREMIUM', 'PER_DIEM_ERROR')),
  claimed_amount DECIMAL(10,2),
  actual_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'RESOLVED')),
  resolution_notes TEXT,
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_claims_crew ON crew_claims(crew_id);
CREATE INDEX idx_claims_status ON crew_claims(status);
CREATE INDEX idx_claims_date ON crew_claims(claim_date);

-- Table 10: faa_part117_compliance
-- FAA compliance monitoring
CREATE TABLE faa_part117_compliance (
  compliance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crew_members(crew_id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  rolling_28_day_hours DECIMAL(10,2),
  rolling_365_day_hours DECIMAL(10,2),
  consecutive_duty_days INTEGER,
  rest_compliance BOOLEAN DEFAULT true,
  fdp_compliance BOOLEAN DEFAULT true,
  violations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_crew_date ON faa_part117_compliance(crew_id, check_date);

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crew_members_updated_at BEFORE UPDATE ON crew_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aircraft_type_ratings_updated_at BEFORE UPDATE ON aircraft_type_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_duty_time_records_updated_at BEFORE UPDATE ON duty_time_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crew_pay_records_updated_at BEFORE UPDATE ON crew_pay_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pay_calculation_rules_updated_at BEFORE UPDATE ON pay_calculation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crew_claims_updated_at BEFORE UPDATE ON crew_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
