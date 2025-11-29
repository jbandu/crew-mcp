-- Seed Data for Crew Qualifications MCP Server
-- Sample Avelo Airlines crew data for development and testing

-- Insert Pilots (10 Captains, 10 First Officers)
INSERT INTO crew_members (employee_number, first_name, last_name, date_of_birth, hire_date, crew_type, position, base_airport, seniority_number, status, union_code, email) VALUES
-- Captains
('AVL001', 'James', 'Mitchell', '1978-03-15', '2019-05-01', 'PILOT', 'CAPTAIN', 'BUR', 1, 'ACTIVE', 'ALPA', 'j.mitchell@avelo.com'),
('AVL002', 'Sarah', 'Johnson', '1980-07-22', '2019-06-15', 'PILOT', 'CAPTAIN', 'BUR', 2, 'ACTIVE', 'ALPA', 's.johnson@avelo.com'),
('AVL003', 'Michael', 'Chen', '1975-11-08', '2019-08-01', 'PILOT', 'CAPTAIN', 'BUR', 3, 'ACTIVE', 'ALPA', 'm.chen@avelo.com'),
('AVL004', 'Emily', 'Rodriguez', '1982-01-30', '2019-09-10', 'PILOT', 'CAPTAIN', 'HVN', 4, 'ACTIVE', 'ALPA', 'e.rodriguez@avelo.com'),
('AVL005', 'David', 'Thompson', '1979-05-18', '2020-01-05', 'PILOT', 'CAPTAIN', 'HVN', 5, 'ACTIVE', 'ALPA', 'd.thompson@avelo.com'),
('AVL006', 'Jennifer', 'Martinez', '1981-09-25', '2020-02-20', 'PILOT', 'CAPTAIN', 'BUR', 6, 'ACTIVE', 'ALPA', 'j.martinez@avelo.com'),
('AVL007', 'Robert', 'Anderson', '1977-12-12', '2020-04-01', 'PILOT', 'CAPTAIN', 'HVN', 7, 'ACTIVE', 'ALPA', 'r.anderson@avelo.com'),
('AVL008', 'Lisa', 'Taylor', '1983-06-07', '2020-05-15', 'PILOT', 'CAPTAIN', 'BUR', 8, 'ACTIVE', 'ALPA', 'l.taylor@avelo.com'),
('AVL009', 'Christopher', 'Davis', '1976-02-28', '2020-07-01', 'PILOT', 'CAPTAIN', 'HVN', 9, 'ACTIVE', 'ALPA', 'c.davis@avelo.com'),
('AVL010', 'Amanda', 'Wilson', '1984-10-14', '2020-08-10', 'PILOT', 'CAPTAIN', 'BUR', 10, 'ACTIVE', 'ALPA', 'a.wilson@avelo.com'),

-- First Officers
('AVL011', 'Daniel', 'Brown', '1990-04-20', '2020-09-01', 'PILOT', 'FIRST_OFFICER', 'BUR', 11, 'ACTIVE', 'ALPA', 'd.brown@avelo.com'),
('AVL012', 'Jessica', 'Garcia', '1992-08-15', '2020-10-15', 'PILOT', 'FIRST_OFFICER', 'BUR', 12, 'ACTIVE', 'ALPA', 'j.garcia@avelo.com'),
('AVL013', 'Matthew', 'Lee', '1989-11-03', '2021-01-10', 'PILOT', 'FIRST_OFFICER', 'HVN', 13, 'ACTIVE', 'ALPA', 'm.lee@avelo.com'),
('AVL014', 'Nicole', 'White', '1991-03-27', '2021-02-20', 'PILOT', 'FIRST_OFFICER', 'BUR', 14, 'ACTIVE', 'ALPA', 'n.white@avelo.com'),
('AVL015', 'Kevin', 'Harris', '1988-07-09', '2021-04-01', 'PILOT', 'FIRST_OFFICER', 'HVN', 15, 'ACTIVE', 'ALPA', 'k.harris@avelo.com'),
('AVL016', 'Rachel', 'Clark', '1993-12-18', '2021-05-15', 'PILOT', 'FIRST_OFFICER', 'BUR', 16, 'ACTIVE', 'ALPA', 'r.clark@avelo.com'),
('AVL017', 'Brandon', 'Lewis', '1990-09-05', '2021-07-01', 'PILOT', 'FIRST_OFFICER', 'HVN', 17, 'ACTIVE', 'ALPA', 'b.lewis@avelo.com'),
('AVL018', 'Stephanie', 'Walker', '1994-02-14', '2021-08-10', 'PILOT', 'FIRST_OFFICER', 'BUR', 18, 'ACTIVE', 'ALPA', 's.walker@avelo.com'),
('AVL019', 'Jason', 'Hall', '1991-05-30', '2021-09-20', 'PILOT', 'FIRST_OFFICER', 'HVN', 19, 'ACTIVE', 'ALPA', 'j.hall@avelo.com'),
('AVL020', 'Michelle', 'Young', '1992-01-22', '2021-11-01', 'PILOT', 'FIRST_OFFICER', 'BUR', 20, 'ACTIVE', 'ALPA', 'm.young@avelo.com');

-- Insert Flight Attendants (30 total)
INSERT INTO crew_members (employee_number, first_name, last_name, date_of_birth, hire_date, crew_type, position, base_airport, seniority_number, status, union_code, email) VALUES
-- Lead Flight Attendants
('AVL101', 'Maria', 'Gonzalez', '1985-06-12', '2019-05-01', 'FLIGHT_ATTENDANT', 'LEAD_FA', 'BUR', 101, 'ACTIVE', 'AFA', 'm.gonzalez@avelo.com'),
('AVL102', 'Thomas', 'King', '1987-09-28', '2019-06-15', 'FLIGHT_ATTENDANT', 'LEAD_FA', 'HVN', 102, 'ACTIVE', 'AFA', 't.king@avelo.com'),
('AVL103', 'Patricia', 'Scott', '1986-03-05', '2019-08-01', 'FLIGHT_ATTENDANT', 'LEAD_FA', 'BUR', 103, 'ACTIVE', 'AFA', 'p.scott@avelo.com'),
('AVL104', 'Carlos', 'Adams', '1988-11-17', '2019-09-10', 'FLIGHT_ATTENDANT', 'LEAD_FA', 'HVN', 104, 'ACTIVE', 'AFA', 'c.adams@avelo.com'),
('AVL105', 'Sandra', 'Baker', '1984-07-23', '2020-01-05', 'FLIGHT_ATTENDANT', 'LEAD_FA', 'BUR', 105, 'ACTIVE', 'AFA', 's.baker@avelo.com'),

-- Flight Attendants
('AVL106', 'Angela', 'Nelson', '1995-04-08', '2020-02-20', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 106, 'ACTIVE', 'AFA', 'a.nelson@avelo.com'),
('AVL107', 'Eric', 'Carter', '1996-08-19', '2020-04-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 107, 'ACTIVE', 'AFA', 'e.carter@avelo.com'),
('AVL108', 'Laura', 'Mitchell', '1994-12-30', '2020-05-15', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 108, 'ACTIVE', 'AFA', 'l.mitchell@avelo.com'),
('AVL109', 'Ryan', 'Perez', '1997-02-11', '2020-07-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 109, 'ACTIVE', 'AFA', 'r.perez@avelo.com'),
('AVL110', 'Melissa', 'Roberts', '1993-06-25', '2020-08-10', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 110, 'ACTIVE', 'AFA', 'm.roberts@avelo.com'),
('AVL111', 'Steven', 'Turner', '1995-10-03', '2020-09-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 111, 'ACTIVE', 'AFA', 's.turner@avelo.com'),
('AVL112', 'Christine', 'Phillips', '1996-01-16', '2020-10-15', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 112, 'ACTIVE', 'AFA', 'c.phillips@avelo.com'),
('AVL113', 'Brian', 'Campbell', '1994-05-07', '2021-01-10', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 113, 'ACTIVE', 'AFA', 'b.campbell@avelo.com'),
('AVL114', 'Diana', 'Parker', '1997-09-22', '2021-02-20', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 114, 'ACTIVE', 'AFA', 'd.parker@avelo.com'),
('AVL115', 'Justin', 'Evans', '1995-03-14', '2021-04-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 115, 'ACTIVE', 'AFA', 'j.evans@avelo.com'),
('AVL116', 'Vanessa', 'Edwards', '1996-07-28', '2021-05-15', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 116, 'ACTIVE', 'AFA', 'v.edwards@avelo.com'),
('AVL117', 'Gregory', 'Collins', '1994-11-09', '2021-07-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 117, 'ACTIVE', 'AFA', 'g.collins@avelo.com'),
('AVL118', 'Brittany', 'Stewart', '1998-02-20', '2021-08-10', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 118, 'ACTIVE', 'AFA', 'b.stewart@avelo.com'),
('AVL119', 'Tyler', 'Sanchez', '1996-06-04', '2021-09-20', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 119, 'ACTIVE', 'AFA', 't.sanchez@avelo.com'),
('AVL120', 'Kimberly', 'Morris', '1995-10-17', '2021-11-01', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 120, 'ACTIVE', 'AFA', 'k.morris@avelo.com'),
('AVL121', 'Andrew', 'Rogers', '1997-01-29', '2022-01-10', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 121, 'ACTIVE', 'AFA', 'a.rogers@avelo.com'),
('AVL122', 'Samantha', 'Reed', '1994-05-12', '2022-02-20', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 122, 'ACTIVE', 'AFA', 's.reed@avelo.com'),
('AVL123', 'Nicholas', 'Cook', '1996-09-26', '2022-04-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 123, 'ACTIVE', 'AFA', 'n.cook@avelo.com'),
('AVL124', 'Katherine', 'Morgan', '1995-12-08', '2022-05-15', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 124, 'ACTIVE', 'AFA', 'k.morgan@avelo.com'),
('AVL125', 'Jonathan', 'Bell', '1998-03-21', '2022-07-01', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 125, 'ACTIVE', 'AFA', 'j.bell@avelo.com'),
('AVL126', 'Rebecca', 'Murphy', '1996-07-05', '2022-08-10', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 126, 'ACTIVE', 'AFA', 'r.murphy@avelo.com'),
('AVL127', 'Austin', 'Bailey', '1997-11-19', '2022-09-20', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 127, 'ACTIVE', 'AFA', 'a.bailey@avelo.com'),
('AVL128', 'Hannah', 'Rivera', '1995-02-02', '2022-11-01', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 128, 'ACTIVE', 'AFA', 'h.rivera@avelo.com'),
('AVL129', 'Zachary', 'Cooper', '1998-06-16', '2023-01-10', 'FLIGHT_ATTENDANT', 'FA', 'HVN', 129, 'ACTIVE', 'AFA', 'z.cooper@avelo.com'),
('AVL130', 'Olivia', 'Richardson', '1996-10-30', '2023-02-20', 'FLIGHT_ATTENDANT', 'FA', 'BUR', 130, 'ACTIVE', 'AFA', 'o.richardson@avelo.com');

-- Insert Pilot Qualifications (ATP licenses for all pilots)
INSERT INTO pilot_qualifications (crew_id, license_type, license_number, issue_date, expiration_date, issuing_authority)
SELECT crew_id, 'ATP', 'ATP-' || employee_number, hire_date, NULL, 'FAA'
FROM crew_members WHERE crew_type = 'PILOT';

-- Insert Aircraft Type Ratings (B737-800 for all pilots - Avelo's aircraft)
INSERT INTO aircraft_type_ratings (crew_id, aircraft_type, rating_type, initial_date, last_check_date, next_check_due, currency_status, landings_90_day, approaches_90_day)
SELECT
  crew_id,
  'B737-800',
  CASE WHEN position = 'CAPTAIN' THEN 'PIC' ELSE 'SIC' END,
  hire_date,
  CURRENT_DATE - INTERVAL '45 days',
  CURRENT_DATE + INTERVAL '320 days',
  'CURRENT',
  12,
  15
FROM crew_members WHERE crew_type = 'PILOT';

-- Insert Medical Certificates (First Class for all pilots)
INSERT INTO medical_certificates (crew_id, class, issue_date, expiration_date, status)
SELECT
  crew_id,
  'FIRST_CLASS',
  CURRENT_DATE - INTERVAL '3 months',
  CURRENT_DATE + INTERVAL '9 months',
  CASE
    WHEN CURRENT_DATE + INTERVAL '9 months' - CURRENT_DATE < INTERVAL '60 days' THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END
FROM crew_members WHERE crew_type = 'PILOT';

-- Insert some expiring medicals for testing
UPDATE medical_certificates
SET expiration_date = CURRENT_DATE + INTERVAL '30 days', status = 'EXPIRING_SOON'
WHERE crew_id IN (SELECT crew_id FROM crew_members WHERE employee_number IN ('AVL005', 'AVL015'));

-- Insert Recurrent Training records
INSERT INTO recurrent_training (crew_id, training_type, aircraft_type, completion_date, next_due_date, instructor_name, training_location, status)
SELECT
  crew_id,
  'RECURRENT',
  'B737-800',
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE + INTERVAL '6 months',
  'John Instructor',
  'Flight Safety International',
  'CURRENT'
FROM crew_members WHERE crew_type = 'PILOT';

-- Some training due soon
UPDATE recurrent_training
SET next_due_date = CURRENT_DATE + INTERVAL '45 days', status = 'DUE_SOON'
WHERE crew_id IN (SELECT crew_id FROM crew_members WHERE employee_number IN ('AVL001', 'AVL011'));

-- Flight Attendant training
INSERT INTO recurrent_training (crew_id, training_type, completion_date, next_due_date, instructor_name, training_location, status)
SELECT
  crew_id,
  'RECURRENT',
  CURRENT_DATE - INTERVAL '8 months',
  CURRENT_DATE + INTERVAL '4 months',
  'Safety Training Team',
  'Avelo Training Center',
  'CURRENT'
FROM crew_members WHERE crew_type = 'FLIGHT_ATTENDANT';

-- Insert sample duty time records (last 30 days)
INSERT INTO duty_time_records (crew_id, duty_date, duty_start_utc, duty_end_utc, flight_time_minutes, duty_time_minutes, block_time_minutes, is_fdp, wocl_crossing, flight_segments)
SELECT
  cm.crew_id,
  (CURRENT_DATE - (s.day_offset * INTERVAL '2 days'))::DATE,
  (CURRENT_DATE - (s.day_offset * INTERVAL '2 days') + INTERVAL '8 hours')::TIMESTAMP,
  (CURRENT_DATE - (s.day_offset * INTERVAL '2 days') + INTERVAL '14 hours')::TIMESTAMP,
  240 + (RANDOM() * 120)::INTEGER,
  360,
  260 + (RANDOM() * 100)::INTEGER,
  true,
  false,
  3
FROM crew_members cm
CROSS JOIN (SELECT generate_series(1, 15) AS day_offset) s
WHERE cm.crew_type = 'PILOT' AND cm.employee_number IN ('AVL001', 'AVL002', 'AVL011', 'AVL012');

-- Insert Pay Calculation Rules
INSERT INTO pay_calculation_rules (rule_name, rule_type, crew_type, position, effective_date, rule_config, union_code, is_active) VALUES
('Captain Base Pay', 'BASE_PAY', 'PILOT', 'CAPTAIN', '2024-01-01',
  '{"hourly_rate": 250, "guarantee_hours": 75}'::jsonb, 'ALPA', true),
('First Officer Base Pay', 'BASE_PAY', 'PILOT', 'FIRST_OFFICER', '2024-01-01',
  '{"hourly_rate": 180, "guarantee_hours": 75}'::jsonb, 'ALPA', true),
('Flight Attendant Base Pay', 'BASE_PAY', 'FLIGHT_ATTENDANT', 'FA', '2024-01-01',
  '{"hourly_rate": 45, "guarantee_hours": 75}'::jsonb, 'AFA', true),
('Lead FA Base Pay', 'BASE_PAY', 'FLIGHT_ATTENDANT', 'LEAD_FA', '2024-01-01',
  '{"hourly_rate": 52, "guarantee_hours": 75}'::jsonb, 'AFA', true),
('Domestic Per Diem', 'PER_DIEM', 'ALL', NULL, '2024-01-01',
  '{"rate_per_hour": 2.50}'::jsonb, NULL, true),
('Night Flying Premium', 'PREMIUM', 'PILOT', NULL, '2024-01-01',
  '{"rate_multiplier": 1.5, "hours": "22:00-06:00"}'::jsonb, 'ALPA', true),
('Holiday Premium', 'PREMIUM', 'ALL', NULL, '2024-01-01',
  '{"rate_multiplier": 2.0}'::jsonb, NULL, true),
('Overtime Rate', 'OVERTIME', 'ALL', NULL, '2024-01-01',
  '{"threshold_hours": 85, "rate_multiplier": 1.5}'::jsonb, NULL, true);

-- Insert sample pay records
INSERT INTO crew_pay_records (crew_id, pay_period_start, pay_period_end, flight_hours, duty_hours, base_pay, per_diem, premium_pay, overtime_pay, guarantee_pay, total_compensation, calculation_method, verified)
SELECT
  crew_id,
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
  (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE,
  65.5,
  95.0,
  16375.00,
  237.50,
  450.00,
  0.00,
  0.00,
  17062.50,
  'AUTOMATED',
  true
FROM crew_members WHERE employee_number = 'AVL001';

-- Insert sample claims (testing discrepancy detection)
INSERT INTO crew_claims (crew_id, claim_date, claim_type, claimed_amount, actual_amount, difference, status)
VALUES
((SELECT crew_id FROM crew_members WHERE employee_number = 'AVL011'),
 CURRENT_DATE - INTERVAL '10 days', 'MISSING_PREMIUM', 450.00, 0.00, 450.00, 'UNDER_REVIEW'),
((SELECT crew_id FROM crew_members WHERE employee_number = 'AVL012'),
 CURRENT_DATE - INTERVAL '15 days', 'INCORRECT_CALCULATION', 12500.00, 11800.00, 700.00, 'SUBMITTED');

-- Insert FAA Part 117 compliance records
INSERT INTO faa_part117_compliance (crew_id, check_date, rolling_28_day_hours, rolling_365_day_hours, consecutive_duty_days, rest_compliance, fdp_compliance)
SELECT
  crew_id,
  CURRENT_DATE,
  85.5,
  950.0,
  5,
  true,
  true
FROM crew_members WHERE crew_type = 'PILOT' LIMIT 5;
