# Railway Deployment Guide

## Quick Deploy to Railway

This guide shows how to deploy the Crew MCP Server to Railway in under 5 minutes.

## Prerequisites

1. Railway account (https://railway.app)
2. Railway CLI installed:
   ```bash
   npm install -g @railway/cli
   ```

## Step-by-Step Deployment

### 1. Login to Railway

```bash
railway login
```

This opens your browser to authenticate.

### 2. Create New Project

```bash
cd crew-mcp
railway init
```

Select "Create new project" and give it a name like `crew-mcp-production`.

### 3. Add PostgreSQL Database

```bash
railway add --plugin postgresql
```

This provisions a managed PostgreSQL database. Railway automatically sets the `DATABASE_URL` environment variable.

### 4. Set Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
railway variables set ENABLE_FAA_PART_117=true
railway variables set TIMEZONE="America/Los_Angeles"
railway variables set MCP_SERVER_NAME="crew-qualifications-mcp"
railway variables set MCP_SERVER_VERSION="1.0.0"
```

### 5. Deploy

```bash
railway up
```

Or connect to GitHub for automatic deployments:

```bash
# Push to GitHub first
git remote add origin https://github.com/your-org/crew-mcp.git
git push -u origin main

# In Railway dashboard:
# 1. Go to your project
# 2. Click "New" → "GitHub Repo"
# 3. Select your crew-mcp repository
# 4. Railway will automatically deploy on every push
```

### 6. Initialize Database Schema

After first deployment, initialize the database:

```bash
# Get the database URL
railway variables get DATABASE_URL

# Initialize schema
railway run psql $DATABASE_URL -f database/schema.sql

# Load seed data (optional for production, recommended for testing)
railway run psql $DATABASE_URL -f database/seed-data.sql
```

### 7. Verify Deployment

```bash
# View deployment logs
railway logs

# Check environment variables
railway variables
```

Expected logs:
```
{"level":"info","message":"Starting Crew Qualifications MCP Server..."}
{"level":"info","message":"Database connected and verified"}
{"level":"info","message":"crew-qualifications-mcp v1.0.0 running on stdio"}
{"level":"info","message":"Environment: production"}
{"level":"info","message":"FAA Part 117 Compliance: ENABLED"}
```

## Environment Variables Reference

Railway automatically provides:
- `DATABASE_URL` - PostgreSQL connection string (from plugin)
- `RAILWAY_ENVIRONMENT` - Current environment name
- `RAILWAY_PROJECT_ID` - Project identifier

You should set:
- `NODE_ENV=production` - Run in production mode
- `LOG_LEVEL=info` - Logging verbosity
- `ENABLE_FAA_PART_117=true` - Enable compliance checks
- `TIMEZONE=America/Los_Angeles` - Default timezone

## Railway Dashboard

Access your deployment at: https://railway.app/project/[your-project-id]

From the dashboard you can:
- View real-time logs
- Monitor resource usage (CPU, memory, network)
- Manage environment variables
- View deployment history
- Configure custom domains
- Set up webhooks

## Database Management

### Connect to PostgreSQL

```bash
# Get connection string
railway variables get DATABASE_URL

# Connect with psql
railway connect postgres
```

### Run Queries

```bash
# Check crew count
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM crew_members"

# View recent duty records
railway run psql $DATABASE_URL -c "SELECT * FROM duty_time_records ORDER BY duty_date DESC LIMIT 10"
```

### Backup Database

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
railway run psql $DATABASE_URL < backup-20241128.sql
```

## Monitoring

### View Logs

```bash
# Follow logs in real-time
railway logs --follow

# Filter by level
railway logs | grep error

# View last 100 lines
railway logs --tail 100
```

### Metrics

View in Railway dashboard:
- CPU usage
- Memory usage
- Network traffic
- Database connections
- Query performance

## Rollback

If a deployment fails:

```bash
# List deployments
railway deployments list

# Rollback to previous deployment
railway rollback [deployment-id]
```

## Production Checklist

Before going live:

- [ ] Database schema initialized
- [ ] Environment variables set
- [ ] Seed data loaded (if needed)
- [ ] Logs showing successful startup
- [ ] Database connection working
- [ ] Test tools via MCP client
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Team access configured

## Cost Optimization

Railway pricing is based on resource usage:

**Starter Plan ($5/month):**
- Good for development/testing
- 500 GB-hours execution time
- 100 GB bandwidth

**Pro Plan ($20/month):**
- Recommended for production
- 1000 GB-hours execution time
- 200 GB bandwidth
- Priority support

**Tips to reduce costs:**
- Use appropriate instance size (not oversized)
- Set up auto-sleep for non-production environments
- Monitor and optimize database queries
- Use connection pooling (already configured)

## Troubleshooting

### Deployment fails

1. Check build logs in Railway dashboard
2. Verify all required files are committed:
   - `package.json`
   - `tsconfig.json`
   - `src/` directory
   - `database/` directory
3. Ensure `build` script in package.json is correct

### Database connection errors

1. Verify `DATABASE_URL` is set:
   ```bash
   railway variables get DATABASE_URL
   ```
2. Check PostgreSQL plugin is added
3. Verify schema is initialized

### Server won't start

1. Check logs:
   ```bash
   railway logs --tail 50
   ```
2. Verify Node.js version (>= 20.0.0)
3. Check environment variables are set

### Can't connect from MCP client

1. Verify server is running (check logs)
2. MCP uses stdio transport - ensure client configuration is correct
3. For testing, use MCP Inspector locally first

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**Estimated deployment time:** 5 minutes
**Estimated setup time:** 10 minutes (with database initialization)
**Monthly cost:** $5-20 (depending on usage)
