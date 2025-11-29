# Crew Qualifications & Certifications MCP Server

**Production-ready MCP server for airline crew data, qualifications, certifications, and automated pay calculations.**

Part of the Number Labs Airline Agentic Operating System - Avelo Airlines Design Partnership

## Overview

The Crew Qualifications MCP Server serves as the canonical source of truth for airline crew operations, enabling:

- ✅ **Automated Pay Calculations** - Reduce crew pay claims by 80% through accurate, automated calculations
- ✅ **FAA Part 117 Compliance** - Real-time duty time validation and legality checking
- ✅ **Qualification Tracking** - Comprehensive crew qualification and certification management
- ✅ **Proactive Alerts** - Automatic notifications for expiring licenses, medicals, and training
- ✅ **Multi-App Integration** - Powers crew scheduling, pay processing, and training management systems

## Business Impact

**Current State:** Daily crew pay claims due to manual calculation errors
**Target State:** 80% reduction in claims through automated validation
**ROI:** Reduced administrative overhead + improved crew satisfaction

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              CREW QUALIFICATIONS & CERTIFICATIONS           │
│                       MCP SERVER                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Crew HR    │  │  PostgreSQL  │  │    Rules     │     │
│  │   Import     │→ │   Database   │→ │   Engine     │     │
│  │   Agents     │  │              │  │ (FAA/Union)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                           ↓                ↓                 │
│                    ┌─────────────┐  ┌─────────────┐        │
│                    │ Pay Calc    │  │ Legality    │        │
│                    │ Engine      │  │ Validator   │        │
│                    └─────────────┘  └─────────────┘        │
│                           ↓                                  │
│                    ┌─────────────┐                          │
│                    │ MCP Server  │                          │
│                    │  Protocol   │                          │
│                    └─────────────┘                          │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Tools
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Crew Pay     │ │    Crew      │ │   Training   │
│Intelligence  │ │  Scheduling  │ │  Management  │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Tech Stack

- **Backend:** Node.js 20+ with TypeScript
- **Database:** PostgreSQL (Neon for dev, Railway for prod)
- **MCP Protocol:** @modelcontextprotocol/sdk
- **Rules Engine:** Custom TypeScript + JSON configurations
- **Pay Calculator:** Custom engine with FAA Part 117 compliance
- **Testing:** Jest + Supertest
- **Deployment:** Railway / Vercel

## Quick Start

### Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd crew-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Set up database
npm run db:reset

# Build the project
npm run build

# Start the MCP server
npm start
```

### Development

```bash
# Run in watch mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Check code coverage
npm test:coverage
```

## MCP Tools

The server provides 8 powerful tools:

### 1. `get-crew-qualifications`
Get comprehensive qualification profile for a crew member including licenses, ratings, medical, and training status.

### 2. `validate-crew-legality`
Validate if a crew member can legally be assigned to a duty period based on FAA Part 117, qualifications, and rest requirements.

### 3. `calculate-crew-pay`
Calculate crew member pay for a given period using automated rules engine with union contract compliance.

### 4. `flag-pay-discrepancies`
Analyze pay records to identify potential discrepancies and prevent crew claims.

### 5. `get-training-requirements`
Get training requirements and currency status for crew members.

### 6. `check-certification-expiry`
Monitor and alert on expiring certifications (licenses, medicals, type ratings).

### 7. `get-qualified-crew-pool`
Get list of qualified and available crew members for specific aircraft types and duty periods.

### 8. `update-duty-time`
Record duty time, flight time, and rest periods for crew members.

## Database Schema

The system uses 10 core tables:

- `crew_members` - Core crew member information
- `pilot_qualifications` - Pilot licenses and qualifications
- `aircraft_type_ratings` - Aircraft type rating certifications
- `medical_certificates` - Medical certificate tracking
- `recurrent_training` - Training and recurrency records
- `duty_time_records` - Flight and duty time tracking
- `crew_pay_records` - Pay calculation records
- `pay_calculation_rules` - Configurable pay rules
- `crew_claims` - Pay claim tracking
- `faa_part117_compliance` - FAA compliance monitoring

See `database/schema.sql` for complete schema definition.

## Configuration

Key environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# MCP Server
MCP_SERVER_NAME=crew-qualifications-mcp
NODE_ENV=development

# Features
FAA_PART117_ENABLED=true
ALERT_DAYS_BEFORE_EXPIRY=60
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/engines/pay-calculator.test.ts

# Run with coverage
npm test:coverage
```

## Deployment

### Railway

```bash
# Deploy to Railway
railway up
```

### Docker

```bash
# Build image
docker build -t crew-mcp .

# Run container
docker run -e DATABASE_URL=$DATABASE_URL crew-mcp
```

## Integration

### With Aircraft MCP

The Crew MCP integrates with the Aircraft MCP for:
- Validating aircraft type qualifications
- Cross-referencing crew ratings with fleet types
- Ensuring crew coverage for entire fleet

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "crew-qualifications": {
      "command": "node",
      "args": ["/path/to/crew-mcp/build/index.js"]
    }
  }
}
```

## Documentation

- [API Documentation](docs/API.md)
- [Pay Calculation Guide](docs/PAY_CALCULATION.md)
- [FAA Compliance](docs/FAA_COMPLIANCE.md)
- [Examples](examples/)

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact Number Labs.

---

**Built by Number Labs for Avelo Airlines**
*Part of the Airline Agentic Operating System*
