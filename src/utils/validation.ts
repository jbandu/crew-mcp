/**
 * Validation utilities
 */

import { z } from 'zod';

/**
 * Validate employee number format
 */
export function isValidEmployeeNumber(employeeNumber: string): boolean {
  // Typically alphanumeric, 5-20 characters
  return /^[A-Z0-9]{5,20}$/i.test(employeeNumber);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  return z.string().uuid().safeParse(uuid).success;
}

/**
 * Validate airport code (IATA)
 */
export function isValidAirportCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

/**
 * Validate aircraft type format
 */
export function isValidAircraftType(type: string): boolean {
  // Examples: B737-800, A320neo, E175
  return /^[A-Z0-9]{4,10}(-\d{3}[A-Z]*)?$/i.test(type);
}

/**
 * Validate date string in ISO format
 */
export function isValidISODate(dateString: string): boolean {
  return z.string().datetime().safeParse(dateString).success ||
         z.string().date().safeParse(dateString).success;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate crew identifier (can be employee number or UUID)
 */
export function validateCrewIdentifier(identifier: string): {
  isValid: boolean;
  type: 'employee_number' | 'uuid' | 'unknown';
} {
  if (isValidUUID(identifier)) {
    return { isValid: true, type: 'uuid' };
  } else if (isValidEmployeeNumber(identifier)) {
    return { isValid: true, type: 'employee_number' };
  }
  return { isValid: false, type: 'unknown' };
}

/**
 * Validate pay period dates
 */
export function validatePayPeriod(
  startDate: string,
  endDate: string
): { isValid: boolean; error?: string } {
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return { isValid: false, error: 'Invalid date format' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }

  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 90) {
    return { isValid: false, error: 'Pay period cannot exceed 90 days' };
  }

  return { isValid: true };
}

/**
 * Common Zod schemas for reuse
 */
export const commonSchemas = {
  crewIdentifier: z.string().min(1),
  employeeNumber: z.string().regex(/^[A-Z0-9]{5,20}$/i),
  uuid: z.string().uuid(),
  airportCode: z.string().regex(/^[A-Z]{3}$/),
  aircraftType: z.string().regex(/^[A-Z0-9]{4,10}(-\d{3}[A-Z]*)?$/i),
  isoDate: z.string().date(),
  isoDateTime: z.string().datetime(),
};
