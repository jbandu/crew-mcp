/**
 * Database connection management with pooling
 */

import pg from 'pg';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database.url,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection not available
    });

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
    });

    // Handle pool connection
    pool.on('connect', () => {
      logger.debug('New database client connected to pool');
    });

    // Handle pool client removal
    pool.on('remove', () => {
      logger.debug('Database client removed from pool');
    });

    logger.info('Database connection pool created');
  }

  return pool;
}

/**
 * Initialize database connection and verify connectivity
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const dbPool = getPool();

    // Test connection
    const client = await dbPool.connect();
    try {
      const result = await client.query('SELECT NOW() as now, version() as version');
      logger.info('Database connection successful', {
        timestamp: result.rows[0].now,
        version: result.rows[0].version,
      });
    } finally {
      client.release();
    }

    // Verify required tables exist
    const tables = await verifyDatabaseSchema();
    logger.info(`Database schema verified: ${tables.length} tables found`);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Verify that all required tables exist
 */
async function verifyDatabaseSchema(): Promise<string[]> {
  const requiredTables = [
    'crew_members',
    'pilot_qualifications',
    'aircraft_type_ratings',
    'medical_certificates',
    'recurrent_training',
    'duty_time_records',
    'crew_pay_records',
    'pay_calculation_rules',
    'crew_claims',
    'faa_part117_compliance',
  ];

  const dbPool = getPool();
  const result = await dbPool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const existingTables = result.rows.map((row) => row.table_name);

  // Check if all required tables exist
  const missingTables = requiredTables.filter(
    (table) => !existingTables.includes(table)
  );

  if (missingTables.length > 0) {
    logger.warn('Missing required database tables:', { missingTables });
  }

  return existingTables;
}

/**
 * Execute a query with automatic error handling and logging
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const dbPool = getPool();
  const start = Date.now();

  try {
    const result = await dbPool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug('Query executed', {
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query failed', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : error,
      query: text.substring(0, 100), // Log first 100 chars of query
    });
    throw error;
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const dbPool = getPool();
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed and rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database health
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await query('SELECT 1');
    const latency = Date.now() - start;

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Close database connection pool gracefully
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    logger.info('Closing database connection pool...');
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

// Export pool getter for direct access when needed
export { pool };
