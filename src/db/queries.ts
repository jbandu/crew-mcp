/**
 * Database query functions for all crew operations
 */

import { query } from './connection.js';
import type {
  CrewMember,
  PilotLicense,
  AircraftTypeRating,
  MedicalCertificate,
  RecurrentTraining,
  DutyTimeRecord,
} from '../types/crew.js';
import type {
  CrewPayRecord,
  PayCalculationRule,
  CrewClaim,
} from '../types/pay.js';
import type { FAACompliance } from '../types/qualifications.js';

// ============================================================================
// CREW MEMBER QUERIES
// ============================================================================

/**
 * Get crew member by employee number or crew_id
 */
export async function getCrewMember(
  identifier: string
): Promise<CrewMember | null> {
  const result = await query<CrewMember>(
    `SELECT * FROM crew_members
     WHERE employee_number = $1 OR crew_id::text = $1`,
    [identifier]
  );

  return result.rows[0] || null;
}

/**
 * Get all crew members with optional filters
 */
export async function getAllCrewMembers(filters?: {
  crew_type?: string;
  position?: string;
  base_airport?: string;
  status?: string;
}): Promise<CrewMember[]> {
  let sql = 'SELECT * FROM crew_members WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.crew_type) {
    sql += ` AND crew_type = $${paramIndex++}`;
    params.push(filters.crew_type);
  }
  if (filters?.position) {
    sql += ` AND position = $${paramIndex++}`;
    params.push(filters.position);
  }
  if (filters?.base_airport) {
    sql += ` AND base_airport = $${paramIndex++}`;
    params.push(filters.base_airport);
  }
  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  sql += ' ORDER BY seniority_number';

  const result = await query<CrewMember>(sql, params);
  return result.rows;
}

// ============================================================================
// QUALIFICATION QUERIES
// ============================================================================

/**
 * Get pilot licenses for a crew member
 */
export async function getPilotLicenses(
  crewId: string
): Promise<PilotLicense[]> {
  const result = await query<PilotLicense>(
    `SELECT * FROM pilot_qualifications WHERE crew_id = $1 ORDER BY issue_date DESC`,
    [crewId]
  );

  return result.rows;
}

/**
 * Get aircraft type ratings for a crew member
 */
export async function getAircraftTypeRatings(
  crewId: string
): Promise<AircraftTypeRating[]> {
  const result = await query<AircraftTypeRating>(
    `SELECT * FROM aircraft_type_ratings WHERE crew_id = $1 ORDER BY initial_date DESC`,
    [crewId]
  );

  return result.rows;
}

/**
 * Get medical certificate for a crew member
 */
export async function getMedicalCertificate(
  crewId: string
): Promise<MedicalCertificate | null> {
  const result = await query<MedicalCertificate>(
    `SELECT * FROM medical_certificates
     WHERE crew_id = $1
     ORDER BY issue_date DESC
     LIMIT 1`,
    [crewId]
  );

  return result.rows[0] || null;
}

/**
 * Get training records for a crew member
 */
export async function getTrainingRecords(
  crewId: string,
  filters?: { status?: string }
): Promise<RecurrentTraining[]> {
  let sql = 'SELECT * FROM recurrent_training WHERE crew_id = $1';
  const params: any[] = [crewId];

  if (filters?.status) {
    sql += ' AND status = $2';
    params.push(filters.status);
  }

  sql += ' ORDER BY next_due_date';

  const result = await query<RecurrentTraining>(sql, params);
  return result.rows;
}

/**
 * Get crew members with specific aircraft qualification
 */
export async function getCrewByAircraftType(
  aircraftType: string,
  position?: string
): Promise<CrewMember[]> {
  let sql = `
    SELECT DISTINCT cm.*
    FROM crew_members cm
    JOIN aircraft_type_ratings atr ON cm.crew_id = atr.crew_id
    WHERE atr.aircraft_type = $1
    AND atr.currency_status = 'CURRENT'
    AND cm.status = 'ACTIVE'
  `;

  const params: any[] = [aircraftType];

  if (position) {
    sql += ' AND cm.position = $2';
    params.push(position);
  }

  sql += ' ORDER BY cm.seniority_number';

  const result = await query<CrewMember>(sql, params);
  return result.rows;
}

// ============================================================================
// CERTIFICATION EXPIRY QUERIES
// ============================================================================

/**
 * Get expiring certifications within specified days
 */
export async function getExpiringCertifications(
  daysAhead: number,
  certificationTypes?: string[],
  baseAirport?: string
): Promise<any[]> {
  const expiringCerts: any[] = [];

  // Get expiring medicals
  if (!certificationTypes || certificationTypes.includes('medical')) {
    const medicals = await query(
      `SELECT
        cm.crew_id,
        cm.employee_number,
        cm.first_name || ' ' || cm.last_name as name,
        cm.position,
        cm.base_airport,
        'MEDICAL' as certification_type,
        mc.class,
        mc.expiration_date,
        EXTRACT(DAY FROM (mc.expiration_date - CURRENT_DATE)) as days_until_expiry
       FROM medical_certificates mc
       JOIN crew_members cm ON mc.crew_id = cm.crew_id
       WHERE mc.expiration_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
       AND mc.expiration_date >= CURRENT_DATE
       ${baseAirport ? 'AND cm.base_airport = $2' : ''}
       ORDER BY mc.expiration_date`,
      baseAirport ? [daysAhead, baseAirport] : [daysAhead]
    );
    expiringCerts.push(...medicals.rows);
  }

  // Get expiring training
  if (!certificationTypes || certificationTypes.includes('training')) {
    const training = await query(
      `SELECT
        cm.crew_id,
        cm.employee_number,
        cm.first_name || ' ' || cm.last_name as name,
        cm.position,
        cm.base_airport,
        'TRAINING' as certification_type,
        rt.training_type,
        rt.next_due_date as expiration_date,
        EXTRACT(DAY FROM (rt.next_due_date - CURRENT_DATE)) as days_until_expiry
       FROM recurrent_training rt
       JOIN crew_members cm ON rt.crew_id = cm.crew_id
       WHERE rt.next_due_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
       AND rt.next_due_date >= CURRENT_DATE
       ${baseAirport ? 'AND cm.base_airport = $2' : ''}
       ORDER BY rt.next_due_date`,
      baseAirport ? [daysAhead, baseAirport] : [daysAhead]
    );
    expiringCerts.push(...training.rows);
  }

  // Get expiring type ratings
  if (!certificationTypes || certificationTypes.includes('type_rating')) {
    const ratings = await query(
      `SELECT
        cm.crew_id,
        cm.employee_number,
        cm.first_name || ' ' || cm.last_name as name,
        cm.position,
        cm.base_airport,
        'TYPE_RATING' as certification_type,
        atr.aircraft_type,
        atr.next_check_due as expiration_date,
        EXTRACT(DAY FROM (atr.next_check_due - CURRENT_DATE)) as days_until_expiry
       FROM aircraft_type_ratings atr
       JOIN crew_members cm ON atr.crew_id = cm.crew_id
       WHERE atr.next_check_due <= CURRENT_DATE + $1 * INTERVAL '1 day'
       AND atr.next_check_due >= CURRENT_DATE
       ${baseAirport ? 'AND cm.base_airport = $2' : ''}
       ORDER BY atr.next_check_due`,
      baseAirport ? [daysAhead, baseAirport] : [daysAhead]
    );
    expiringCerts.push(...ratings.rows);
  }

  return expiringCerts;
}

// ============================================================================
// DUTY TIME QUERIES
// ============================================================================

/**
 * Get duty time records for a crew member within date range
 */
export async function getDutyTimeRecords(
  crewId: string,
  startDate: Date,
  endDate: Date
): Promise<DutyTimeRecord[]> {
  const result = await query<DutyTimeRecord>(
    `SELECT * FROM duty_time_records
     WHERE crew_id = $1
     AND duty_date >= $2
     AND duty_date <= $3
     ORDER BY duty_date`,
    [crewId, startDate, endDate]
  );

  return result.rows;
}

/**
 * Insert or update duty time record
 */
export async function upsertDutyTimeRecord(
  record: Partial<DutyTimeRecord>
): Promise<DutyTimeRecord> {
  const result = await query<DutyTimeRecord>(
    `INSERT INTO duty_time_records (
      crew_id, duty_date, duty_start_utc, duty_end_utc,
      flight_time_minutes, duty_time_minutes, block_time_minutes,
      rest_period_start_utc, rest_period_end_utc,
      is_fdp, wocl_crossing, consecutive_nights, flight_segments
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (duty_id)
    DO UPDATE SET
      duty_end_utc = EXCLUDED.duty_end_utc,
      flight_time_minutes = EXCLUDED.flight_time_minutes,
      duty_time_minutes = EXCLUDED.duty_time_minutes,
      block_time_minutes = EXCLUDED.block_time_minutes,
      updated_at = NOW()
    RETURNING *`,
    [
      record.crew_id,
      record.duty_date,
      record.duty_start_utc,
      record.duty_end_utc,
      record.flight_time_minutes || 0,
      record.duty_time_minutes || 0,
      record.block_time_minutes || 0,
      record.rest_period_start_utc,
      record.rest_period_end_utc,
      record.is_fdp || false,
      record.wocl_crossing || false,
      record.consecutive_nights || 0,
      record.flight_segments || 0,
    ]
  );

  return result.rows[0];
}

/**
 * Calculate rolling hours for FAA Part 117
 */
export async function calculateRollingHours(
  crewId: string,
  asOfDate: Date
): Promise<{ rolling_28_day: number; rolling_365_day: number }> {
  const result = await query<{ rolling_28_day: string; rolling_365_day: string }>(
    `SELECT
      COALESCE(SUM(CASE
        WHEN duty_date >= $2::date - INTERVAL '28 days'
        THEN flight_time_minutes
        ELSE 0
      END) / 60.0, 0) as rolling_28_day,
      COALESCE(SUM(CASE
        WHEN duty_date >= $2::date - INTERVAL '365 days'
        THEN flight_time_minutes
        ELSE 0
      END) / 60.0, 0) as rolling_365_day
     FROM duty_time_records
     WHERE crew_id = $1
     AND duty_date <= $2`,
    [crewId, asOfDate]
  );

  const row = result.rows[0];
  return {
    rolling_28_day: row ? parseFloat(row.rolling_28_day) : 0,
    rolling_365_day: row ? parseFloat(row.rolling_365_day) : 0,
  };
}

// ============================================================================
// PAY QUERIES
// ============================================================================

/**
 * Get pay calculation rules
 */
export async function getPayCalculationRules(
  crewType: string,
  position?: string,
  effectiveDate?: Date
): Promise<PayCalculationRule[]> {
  let sql = `
    SELECT * FROM pay_calculation_rules
    WHERE is_active = true
    AND (crew_type = $1 OR crew_type = 'ALL')
  `;
  const params: any[] = [crewType];
  let paramIndex = 2;

  if (position) {
    sql += ` AND (position = $${paramIndex++} OR position IS NULL)`;
    params.push(position);
  }

  if (effectiveDate) {
    sql += ` AND effective_date <= $${paramIndex++}`;
    sql += ` AND (expiration_date IS NULL OR expiration_date >= $${paramIndex++})`;
    params.push(effectiveDate, effectiveDate);
  }

  sql += ' ORDER BY rule_type, effective_date DESC';

  const result = await query<PayCalculationRule>(sql, params);
  return result.rows;
}

/**
 * Insert pay record
 */
export async function insertPayRecord(
  record: Omit<CrewPayRecord, 'pay_id' | 'created_at' | 'updated_at'>
): Promise<CrewPayRecord> {
  const result = await query<CrewPayRecord>(
    `INSERT INTO crew_pay_records (
      crew_id, pay_period_start, pay_period_end,
      flight_hours, duty_hours, base_pay, per_diem,
      premium_pay, overtime_pay, guarantee_pay, total_compensation,
      calculation_method, verified, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      record.crew_id,
      record.pay_period_start,
      record.pay_period_end,
      record.flight_hours,
      record.duty_hours,
      record.base_pay,
      record.per_diem,
      record.premium_pay,
      record.overtime_pay,
      record.guarantee_pay,
      record.total_compensation,
      record.calculation_method,
      record.verified,
      record.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Get pay records for period
 */
export async function getPayRecords(
  startDate: Date,
  endDate: Date,
  crewIds?: string[]
): Promise<CrewPayRecord[]> {
  let sql = `
    SELECT * FROM crew_pay_records
    WHERE pay_period_start >= $1
    AND pay_period_end <= $2
  `;
  const params: any[] = [startDate, endDate];

  if (crewIds && crewIds.length > 0) {
    sql += ' AND crew_id = ANY($3)';
    params.push(crewIds);
  }

  sql += ' ORDER BY pay_period_start, crew_id';

  const result = await query<CrewPayRecord>(sql, params);
  return result.rows;
}

// ============================================================================
// CLAIMS QUERIES
// ============================================================================

/**
 * Get crew claims
 */
export async function getCrewClaims(filters?: {
  crew_id?: string;
  status?: string;
  start_date?: Date;
  end_date?: Date;
}): Promise<CrewClaim[]> {
  let sql = 'SELECT * FROM crew_claims WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.crew_id) {
    sql += ` AND crew_id = $${paramIndex++}`;
    params.push(filters.crew_id);
  }
  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.start_date) {
    sql += ` AND claim_date >= $${paramIndex++}`;
    params.push(filters.start_date);
  }
  if (filters?.end_date) {
    sql += ` AND claim_date <= $${paramIndex++}`;
    params.push(filters.end_date);
  }

  sql += ' ORDER BY claim_date DESC';

  const result = await query<CrewClaim>(sql, params);
  return result.rows;
}

// ============================================================================
// COMPLIANCE QUERIES
// ============================================================================

/**
 * Insert FAA compliance record
 */
export async function insertComplianceRecord(
  record: Omit<FAACompliance, 'compliance_id' | 'created_at'>
): Promise<FAACompliance> {
  const result = await query<FAACompliance>(
    `INSERT INTO faa_part117_compliance (
      crew_id, check_date, rolling_28_day_hours, rolling_365_day_hours,
      consecutive_duty_days, rest_compliance, fdp_compliance, violations
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      record.crew_id,
      record.check_date,
      record.rolling_28_day_hours,
      record.rolling_365_day_hours,
      record.consecutive_duty_days,
      record.rest_compliance,
      record.fdp_compliance,
      JSON.stringify(record.violations || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Get latest compliance record for crew member
 */
export async function getLatestComplianceRecord(
  crewId: string
): Promise<FAACompliance | null> {
  const result = await query<FAACompliance>(
    `SELECT * FROM faa_part117_compliance
     WHERE crew_id = $1
     ORDER BY check_date DESC
     LIMIT 1`,
    [crewId]
  );

  return result.rows[0] || null;
}
