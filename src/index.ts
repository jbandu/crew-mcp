#!/usr/bin/env node

/**
 * Crew Qualifications & Certifications MCP Server
 * Main entry point for the MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import config from './config/index.js';
import { logger } from './utils/logger.js';
import { initializeDatabase, closeDatabase } from './db/connection.js';

// Import all tool handlers
import { getCrewQualificationsTool, handleGetCrewQualifications } from './tools/get-crew-qualifications.js';
import { validateCrewLegalityTool, handleValidateCrewLegality } from './tools/validate-crew-legality.js';
import { calculateCrewPayTool, handleCalculateCrewPay } from './tools/calculate-crew-pay.js';
import { flagPayDiscrepanciesTool, handleFlagPayDiscrepancies } from './tools/flag-pay-discrepancies.js';
import { getTrainingRequirementsTool, handleGetTrainingRequirements } from './tools/get-training-requirements.js';
import { checkCertificationExpiryTool, handleCheckCertificationExpiry } from './tools/check-certification-expiry.js';
import { getQualifiedCrewPoolTool, handleGetQualifiedCrewPool } from './tools/get-qualified-crew-pool.js';
import { updateDutyTimeTool, handleUpdateDutyTime } from './tools/update-duty-time.js';

/**
 * Define all available MCP tools
 */
const TOOLS = [
  getCrewQualificationsTool,
  validateCrewLegalityTool,
  calculateCrewPayTool,
  flagPayDiscrepanciesTool,
  getTrainingRequirementsTool,
  checkCertificationExpiryTool,
  getQualifiedCrewPoolTool,
  updateDutyTimeTool,
];

/**
 * Tool handler map
 */
const TOOL_HANDLERS: Record<string, (args: unknown) => Promise<any>> = {
  'get-crew-qualifications': handleGetCrewQualifications,
  'validate-crew-legality': handleValidateCrewLegality,
  'calculate-crew-pay': handleCalculateCrewPay,
  'flag-pay-discrepancies': handleFlagPayDiscrepancies,
  'get-training-requirements': handleGetTrainingRequirements,
  'check-certification-expiry': handleCheckCertificationExpiry,
  'get-qualified-crew-pool': handleGetQualifiedCrewPool,
  'update-duty-time': handleUpdateDutyTime,
};

/**
 * Main server initialization
 */
async function main() {
  try {
    logger.info('Starting Crew Qualifications MCP Server...');

    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connected and verified');

    // Create MCP server
    const server = new Server(
      {
        name: config.mcp.name,
        version: config.mcp.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // List tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools');
      return { tools: TOOLS };
    });

    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`Tool called: ${name}`, { args });

      const handler = TOOL_HANDLERS[name];
      if (!handler) {
        logger.error(`Unknown tool: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await handler(args);
        logger.debug(`Tool ${name} completed successfully`);
        return result;
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        throw error;
      }
    });

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info(`${config.mcp.name} v${config.mcp.version} running on stdio`);
    logger.info(`Environment: ${config.environment}`);
    logger.info(`FAA Part 117 Compliance: ${config.compliance.faaPart117Enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start the server
main();
