#!/usr/bin/env node

/**
 * Database migration runner
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool, initializeDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
  logger.info('Migrations table ready');
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY id'
  );
  return result.rows.map((row) => row.migration_name);
}

/**
 * Load migration files from directory
 */
function loadMigrationFiles(): Migration[] {
  const migrationsDir = join(__dirname, '../../database/migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }

    const [, idStr, name] = match;
    const id = parseInt(idStr, 10);
    const filepath = join(migrationsDir, filename);
    const sql = readFileSync(filepath, 'utf-8');

    return { id, name, filename, sql };
  });
}

/**
 * Apply a migration
 */
async function applyMigration(migration: Migration): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Execute migration SQL
    logger.info(`Applying migration: ${migration.filename}`);
    await client.query(migration.sql);

    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
      [migration.filename]
    );

    await client.query('COMMIT');
    logger.info(`✓ Migration applied: ${migration.filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`✗ Migration failed: ${migration.filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run pending migrations
 */
async function runMigrations(): Promise<void> {
  try {
    await initializeDatabase();
    await createMigrationsTable();

    const appliedMigrations = await getAppliedMigrations();
    const allMigrations = loadMigrationFiles();

    const pendingMigrations = allMigrations.filter(
      (m) => !appliedMigrations.includes(m.filename)
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migration(s)`);

    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }

    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runMigrations };
