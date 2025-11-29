# Deployment Guide

## Table of Contents

- [Local Development](#local-development)
- [Testing with MCP Inspector](#testing-with-mcp-inspector)
- [Docker Deployment](#docker-deployment)
- [Railway Deployment](#railway-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)

## Local Development

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up PostgreSQL database:**
   ```bash
   createdb aircraft_db
   psql aircraft_db -f database/schema.sql
   psql aircraft_db -f database/seed-data.sql
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the MCP server:**
   ```bash
   npm start
   ```

The server will run on stdio transport and wait for MCP client connections.

## Testing with MCP Inspector

The MCP Inspector provides a web interface to test your MCP server interactively.

### Start Inspector

```bash
npm run inspector
```

This will:
- Start the MCP server
- Launch the inspector proxy on http://localhost:6274
- Open your browser automatically

### Test Tools

1. Navigate to the inspector URL
2. Click "Connect" to initialize the server
3. View available tools in the sidebar
4. Click any tool to see its schema
5. Fill in parameters and click "Run Tool"
6. View results in the response panel

### Example Test Cases

**Get Crew Qualifications:**
```json
{
  "crew_identifier": "AVL001",
  "qualification_types": ["all"]
}
```

**Validate Crew Legality:**
```json
{
  "crew_identifier": "AVL001",
  "aircraft_type": "B737-800",
  "duty_start_utc": "2025-12-01T08:00:00Z",
  "flight_time_minutes": 360,
  "number_of_segments": 2
}
```

**Calculate Crew Pay:**
```json
{
  "crew_identifier": "AVL001",
  "pay_period_start": "2024-12-01",
  "pay_period_end": "2024-12-15",
  "include_breakdown": true
}
```

## Docker Deployment

### Build Docker Image

```bash
npm run docker:build
```

Or manually:
```bash
docker build -t crew-mcp:latest .
```

### Run with Docker Compose

The easiest way to run locally with PostgreSQL:

```bash
npm run docker:compose
```

This starts:
- PostgreSQL database on port 5432
- Crew MCP Server connected to the database

View logs:
```bash
npm run docker:compose:logs
```

Stop services:
```bash
npm run docker:compose:down
```

### Run Docker Image Directly

```bash
docker run -it \
  --env-file .env \
  -e POSTGRES_URL="postgresql://user:pass@host:5432/db" \
  crew-mcp:latest
```

## Railway Deployment

Railway provides managed PostgreSQL and automatic deployments from Git.

### Prerequisites

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

### Initial Setup

1. **Create new Railway project:**
   ```bash
   railway init
   ```

2. **Add PostgreSQL database:**
   ```bash
   railway add --plugin postgresql
   ```

3. **Link your project:**
   ```bash
   railway link
   ```

### Environment Variables

Set required environment variables in Railway dashboard or via CLI:

```bash
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
railway variables set ENABLE_FAA_PART_117=true
railway variables set TIMEZONE="America/Los_Angeles"
```

The `POSTGRES_URL` is automatically set by Railway when you add the PostgreSQL plugin.

### Deploy

**Deploy from local:**
```bash
npm run railway:deploy
```

Or use Railway's GitHub integration for automatic deployments:
1. Go to Railway dashboard
2. Connect your GitHub repository
3. Select the crew-mcp repo
4. Railway will automatically deploy on every push

### Initialize Database

After first deployment, initialize the database schema:

```bash
# Connect to your Railway project
railway link

# Run migrations
railway run psql $DATABASE_URL -f database/schema.sql
railway run psql $DATABASE_URL -f database/seed-data.sql
```

### View Logs

```bash
npm run railway:logs
```

Or in the Railway dashboard: https://railway.app/

### Verify Deployment

1. Check deployment status in Railway dashboard
2. View logs for startup messages
3. Test with MCP client pointing to Railway URL

## Environment Variables

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | - | `postgresql://user:pass@localhost:5432/aircraft_db` |
| `NODE_ENV` | Environment mode | `development` | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` |
| `MCP_SERVER_NAME` | MCP server name | `crew-qualifications-mcp` |
| `MCP_SERVER_VERSION` | Server version | `1.0.0` |
| `ENABLE_FAA_PART_117` | Enable FAA Part 117 compliance checks | `true` |
| `TIMEZONE` | Default timezone for calculations | `America/Los_Angeles` |
| `ENABLE_NEO4J` | Enable Neo4j integration (future) | `false` |
| `LLM_MODE` | LLM provider for aircraft integration | `ollama` |

## Database Setup

### Schema

The database schema includes 10 tables:
- `crew_members` - Core crew data
- `pilot_qualifications` - Pilot licenses
- `aircraft_type_ratings` - Type ratings per crew
- `medical_certificates` - Medical certifications
- `recurrent_training` - Training records
- `duty_time_records` - Flight and duty time tracking
- `crew_pay_records` - Pay calculation results
- `pay_calculation_rules` - Union contract rules
- `crew_claims` - Crew pay claims tracking
- `faa_part117_compliance` - Compliance tracking

### Migrations

To run migrations:
```bash
npm run db:migrate
```

### Seed Data

The seed data includes:
- 50 crew members (20 pilots, 30 flight attendants)
- Sample type ratings and qualifications
- Historical duty time records
- Pay calculation rules

To seed:
```bash
npm run db:seed
```

### Reset Database

To completely reset (WARNING: destroys all data):
```bash
npm run db:reset
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database schema initialized
- [ ] Seed data loaded (if needed)
- [ ] Connection pooling configured
- [ ] Logging configured
- [ ] Health checks passing
- [ ] MCP tools tested via inspector
- [ ] Backup strategy in place
- [ ] Monitoring configured

## Troubleshooting

### Server won't start

1. Check database connection:
   ```bash
   psql $POSTGRES_URL -c "SELECT 1"
   ```

2. Verify environment variables:
   ```bash
   node -e "console.log(process.env.POSTGRES_URL)"
   ```

3. Check logs:
   ```bash
   tail -f logs/error.log
   ```

### Database errors

1. Verify schema is initialized:
   ```bash
   psql $POSTGRES_URL -c "\dt"
   ```

2. Check for missing tables and reinitialize if needed

### MCP client can't connect

1. Verify server is running:
   ```bash
   ps aux | grep "node build/index.js"
   ```

2. Check stdio communication is working
3. Verify client configuration matches server transport (stdio)

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/crew-mcp/issues
- Documentation: https://github.com/your-org/crew-mcp/wiki
