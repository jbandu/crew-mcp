/**
 * Configuration management
 */

import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  database: {
    url: string;
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  mcp: {
    name: string;
    version: string;
  };
  environment: string;
  logging: {
    level: string;
    format: string;
  };
  integrations: {
    aircraftMcpUrl: string;
  };
  payCalculation: {
    defaultCurrency: string;
    payPeriodLengthDays: number;
  };
  compliance: {
    faaPart117Enabled: boolean;
    alertDaysBeforeExpiry: number;
  };
  timezone: string;
}

const config: Config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/crew_qualifications',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'crew_qualifications',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
  },
  mcp: {
    name: process.env.MCP_SERVER_NAME || 'crew-qualifications-mcp',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  },
  environment: process.env.NODE_ENV || 'development',
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  integrations: {
    aircraftMcpUrl: process.env.AIRCRAFT_MCP_URL || 'http://localhost:3001',
  },
  payCalculation: {
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    payPeriodLengthDays: parseInt(process.env.PAY_PERIOD_LENGTH_DAYS || '14', 10),
  },
  compliance: {
    faaPart117Enabled: process.env.FAA_PART117_ENABLED === 'true',
    alertDaysBeforeExpiry: parseInt(process.env.ALERT_DAYS_BEFORE_EXPIRY || '60', 10),
  },
  timezone: process.env.DEFAULT_TIMEZONE || 'America/Los_Angeles',
};

export default config;
