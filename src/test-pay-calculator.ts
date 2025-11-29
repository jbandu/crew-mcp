#!/usr/bin/env node

/**
 * Test script for pay calculator
 */

import { initializeDatabase, closeDatabase } from './db/connection.js';
import { PayCalculator } from './engines/pay-calculator.js';
import { getCrewMember } from './db/queries.js';
import { logger } from './utils/logger.js';

async function testPayCalculator() {
  try {
    logger.info('Starting pay calculator test...');

    // Initialize database
    await initializeDatabase();

    // Get a test crew member (AVL001 - Captain Mitchell)
    const crew = await getCrewMember('AVL001');
    if (!crew) {
      throw new Error('Test crew member not found');
    }

    logger.info('Testing pay calculation for:', {
      employee: crew.employee_number,
      name: `${crew.first_name} ${crew.last_name}`,
      position: crew.position,
    });

    // Calculate pay for last month
    const calculator = new PayCalculator();
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 1);

    const calculation = await calculator.calculatePay(
      crew.crew_id,
      periodStart,
      periodEnd
    );

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('PAY CALCULATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Crew Member: ${calculation.crew_member.name}`);
    console.log(`Position: ${calculation.crew_member.position}`);
    console.log(`Employee #: ${calculation.crew_member.employee_number}`);
    console.log(`Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`);
    console.log('-'.repeat(60));

    console.log('\nSUMMARY:');
    console.log(`  Flight Hours: ${calculation.summary.total_flight_hours.toFixed(2)}`);
    console.log(`  Duty Hours: ${calculation.summary.total_duty_hours.toFixed(2)}`);
    console.log(`  Total Compensation: $${calculation.summary.total_compensation.toFixed(2)}`);

    console.log('\nBREAKDOWN:');
    console.log(`  Base Pay: $${calculation.breakdown.base_pay.amount.toFixed(2)}`);
    console.log(`    (${calculation.breakdown.base_pay.hours?.toFixed(2) || 0} hrs × $${calculation.breakdown.base_pay.rate.toFixed(2)}/hr)`);
    console.log(`  Per Diem: $${calculation.breakdown.per_diem.amount.toFixed(2)}`);
    console.log(`    (${calculation.breakdown.per_diem.hours?.toFixed(2) || 0} hrs × $${calculation.breakdown.per_diem.rate.toFixed(2)}/hr)`);

    if (calculation.breakdown.premium_pay.length > 0) {
      console.log('  Premium Pay:');
      calculation.breakdown.premium_pay.forEach(premium => {
        console.log(`    ${premium.type}: $${premium.amount.toFixed(2)}`);
      });
    }

    console.log(`  Overtime: $${calculation.breakdown.overtime_pay.amount.toFixed(2)}`);
    console.log(`  Guarantee: $${calculation.breakdown.guarantee_pay.amount.toFixed(2)}`);

    console.log('\nAPPLIED RULES:');
    calculation.applied_rules.forEach(rule => {
      console.log(`  - ${rule.rule_name} (${rule.rule_type}): $${rule.amount.toFixed(2)}`);
    });

    console.log('\nDUTY RECORDS: ' + calculation.duty_records.length + ' records');
    if (calculation.duty_records.length > 0) {
      console.log('  First 3 duty records:');
      calculation.duty_records.slice(0, 3).forEach(dr => {
        console.log(`    ${new Date(dr.date).toLocaleDateString()}: ${dr.flight_time.toFixed(2)} flight hrs, ${dr.duty_time.toFixed(2)} duty hrs`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Pay calculator test completed successfully!');
    console.log('='.repeat(60) + '\n');

    // Close database
    await closeDatabase();

    process.exit(0);
  } catch (error) {
    logger.error('Pay calculator test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run test
testPayCalculator();
