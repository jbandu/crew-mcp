/**
 * Date and time utilities
 */

import { DateTime } from 'luxon';
import {
  differenceInDays,
  differenceInHours,
  addDays,
  isWithinInterval,
  parseISO,
  formatISO
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Convert a date to UTC
 */
export function toUTC(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Convert UTC to local timezone
 */
export function fromUTC(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

/**
 * Check if duty period crosses Window of Circadian Low (WOCL)
 * WOCL is typically 2:00 AM to 5:59 AM local time
 */
export function crossesWOCL(
  dutyStart: Date,
  dutyEnd: Date,
  timezone: string
): boolean {
  const start = DateTime.fromJSDate(dutyStart, { zone: timezone });
  const end = DateTime.fromJSDate(dutyEnd, { zone: timezone });

  // Check each hour in the duty period
  let current = start;
  while (current <= end) {
    const hour = current.hour;
    if (hour >= 2 && hour < 6) {
      return true;
    }
    current = current.plus({ hours: 1 });
  }

  return false;
}

/**
 * Calculate rolling hours for a given period
 */
export function calculateRollingHours(
  records: Array<{ duty_date: Date; flight_time_minutes: number }>,
  fromDate: Date,
  days: number
): number {
  const endDate = addDays(fromDate, days);

  return records
    .filter(r =>
      isWithinInterval(r.duty_date, { start: fromDate, end: endDate })
    )
    .reduce((sum, r) => sum + r.flight_time_minutes, 0) / 60; // Convert to hours
}

/**
 * Get days until expiration
 */
export function daysUntilExpiry(expirationDate: Date): number {
  return differenceInDays(expirationDate, new Date());
}

/**
 * Get hours since last rest
 */
export function hoursSinceRest(lastRestEnd: Date): number {
  return differenceInHours(new Date(), lastRestEnd);
}

/**
 * Parse ISO date string safely
 */
export function parseISOSafe(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Format date to ISO string
 */
export function toISOString(date: Date): string {
  return formatISO(date);
}

/**
 * Check if date is within alert window
 */
export function isWithinAlertWindow(
  expirationDate: Date,
  alertDays: number
): boolean {
  const daysRemaining = daysUntilExpiry(expirationDate);
  return daysRemaining >= 0 && daysRemaining <= alertDays;
}

/**
 * Calculate minimum rest required based on FDP length
 */
export function calculateMinimumRest(fdpHours: number): number {
  if (fdpHours < 9) {
    return 10;
  } else if (fdpHours <= 13) {
    return 12;
  } else {
    return 14;
  }
}
