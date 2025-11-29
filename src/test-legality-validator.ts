#!/usr/bin/env node

/**
 * Test script for FAA Part 117 legality validator
 */

import { initializeDatabase, closeDatabase } from './db/connection.js';
import { LegalityValidator } from './engines/legality-validator.js';
import { ComplianceChecker } from './engines/compliance-checker.js';
import { getCrewMember } from './db/queries.js';
import type { DutyAssignment } from './types/qualifications.js';
import { logger } from './utils/logger.js';

async function testLegalityValidator() {
  try {
    logger.info('Starting FAA Part 117 legality validator test...');

    // Initialize database
    await initializeDatabase();

    // Get a test crew member (AVL001 - Captain Mitchell)
    const crew = await getCrewMember('AVL001');
    if (!crew) {
      throw new Error('Test crew member not found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('FAA PART 117 LEGALITY VALIDATION TEST');
    console.log('='.repeat(60));
    console.log(`Crew Member: ${crew.first_name} ${crew.last_name}`);
    console.log(`Position: ${crew.position}`);
    console.log(`Employee #: ${crew.employee_number}`);
    console.log('-'.repeat(60));

    // Test 1: Valid assignment
    console.log('\n📋 TEST 1: Valid Assignment');
    console.log('-'.repeat(60));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const dutyEnd = new Date(tomorrow);
    dutyEnd.setHours(14, 0, 0, 0);

    const validDuty: DutyAssignment = {
      aircraft_type: 'B737-800',
      duty_start_utc: tomorrow,
      duty_end_utc: dutyEnd,
      flight_time_minutes: 240, // 4 hours
      number_of_segments: 2,
    };

    const validator = new LegalityValidator();
    const result1 = await validator.validateAssignment(crew.crew_id, validDuty);

    console.log(`Legal: ${result1.is_legal ? '✅ YES' : '❌ NO'}`);
    console.log(`Crew Status: ${result1.crew_status}`);
    console.log(`\nRest Compliance:`);
    console.log(`  Hours since rest: ${result1.rest_compliance.hours_since_rest.toFixed(1)}`);
    console.log(`  Minimum required: ${result1.rest_compliance.minimum_rest_required}`);
    console.log(`  Compliant: ${result1.rest_compliance.is_compliant ? '✅' : '❌'}`);

    console.log(`\nFlight Time Limits:`);
    console.log(`  28-day rolling: ${result1.duty_limits.rolling_28_day_hours.toFixed(1)}/${result1.duty_limits.rolling_28_day_limit} hours`);
    console.log(`  365-day rolling: ${result1.duty_limits.rolling_365_day_hours.toFixed(1)}/${result1.duty_limits.rolling_365_day_limit} hours`);

    if (result1.qualification_issues.length > 0) {
      console.log(`\n⚠️  Qualification Issues (${result1.qualification_issues.length}):`);
      result1.qualification_issues.forEach((issue) => {
        console.log(`  - [${issue.severity}] ${issue.description}`);
      });
    } else {
      console.log(`\n✅ No qualification issues`);
    }

    if (result1.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      result1.recommendations.forEach((rec) => {
        console.log(`  - ${rec}`);
      });
    }

    // Test 2: Assignment with no rest (should fail)
    console.log('\n\n📋 TEST 2: Assignment Without Adequate Rest (Should Fail)');
    console.log('-'.repeat(60));

    const nowStart = new Date();
    const nowEnd = new Date();
    nowEnd.setHours(nowEnd.getHours() + 6);

    const invalidDuty: DutyAssignment = {
      aircraft_type: 'B737-800',
      duty_start_utc: nowStart,
      duty_end_utc: nowEnd,
      flight_time_minutes: 300, // 5 hours
      number_of_segments: 3,
    };

    const result2 = await validator.validateAssignment(crew.crew_id, invalidDuty);

    console.log(`Legal: ${result2.is_legal ? '✅ YES' : '❌ NO'}`);
    console.log(`\nRest Compliance:`);
    console.log(`  Hours since rest: ${result2.rest_compliance.hours_since_rest.toFixed(1)}`);
    console.log(`  Minimum required: ${result2.rest_compliance.minimum_rest_required}`);
    console.log(`  Compliant: ${result2.rest_compliance.is_compliant ? '✅' : '❌'}`);

    if (result2.rest_compliance.violations.length > 0) {
      console.log(`\n❌ Rest Violations:`);
      result2.rest_compliance.violations.forEach((v) => {
        console.log(`  - ${v}`);
      });
    }

    // Test 3: Compliance Checker
    console.log('\n\n📋 TEST 3: Compliance Check for All Crew');
    console.log('-'.repeat(60));

    const checker = new ComplianceChecker();
    const alerts = await checker.checkAllCrew();

    console.log(`Total alerts: ${alerts.length}`);

    if (alerts.length > 0) {
      console.log(`\nAlerts by Severity:`);
      const bySeverity = alerts.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(bySeverity).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });

      console.log(`\nFirst 3 Alerts:`);
      alerts.slice(0, 3).forEach((alert) => {
        console.log(`  [${alert.severity}] ${alert.name} (${alert.employee_number})`);
        console.log(`    ${alert.message}`);
        console.log(`    ${alert.current_value.toFixed(1)}/${alert.limit_value} hours`);
      });
    } else {
      console.log('✅ No compliance alerts - all crew within limits');
    }

    // Test 4: Quick assignment check
    console.log('\n\n📋 TEST 4: Quick Assignment Clearance Check');
    console.log('-'.repeat(60));

    const clearanceCheck = await checker.isClearForAssignment(crew.crew_id, 8);
    console.log(`Clear for 8-hour assignment: ${clearanceCheck.is_clear ? '✅ YES' : '❌ NO'}`);
    if (!clearanceCheck.is_clear) {
      console.log(`Reason: ${clearanceCheck.reason}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All legality validator tests completed successfully!');
    console.log('='.repeat(60) + '\n');

    // Close database
    await closeDatabase();

    process.exit(0);
  } catch (error) {
    logger.error('Legality validator test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run test
testLegalityValidator();
