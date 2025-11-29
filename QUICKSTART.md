# Quick Start Guide

## 🚀 3 Ways to Run the Crew MCP Server

### 1️⃣ Local (Development) - 2 minutes

```bash
# Start the server
npm run build
npm start

# Server runs on stdio, ready for MCP clients
```

**Test it:**
```bash
npm run inspector
# Opens http://localhost:6274
```

---

### 2️⃣ Docker (Local Container) - 5 minutes

```bash
# Start PostgreSQL + MCP Server
npm run docker:compose

# View logs
npm run docker:compose:logs

# Stop
npm run docker:compose:down
```

---

### 3️⃣ Railway (Production) - 5 minutes

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Deploy
railway up

# Initialize database
railway run psql $DATABASE_URL -f database/schema.sql
railway run psql $DATABASE_URL -f database/seed-data.sql

# View logs
railway logs
```

---

## 🧪 Test the 8 Tools

### Get Crew Qualifications
```json
{
  "crew_identifier": "AVL001",
  "qualification_types": ["all"]
}
```

### Validate Legality
```json
{
  "crew_identifier": "AVL001",
  "aircraft_type": "B737-800",
  "duty_start_utc": "2025-12-01T08:00:00Z",
  "flight_time_minutes": 360
}
```

### Calculate Pay
```json
{
  "crew_identifier": "AVL001",
  "pay_period_start": "2024-12-01",
  "pay_period_end": "2024-12-15"
}
```

---

## 📚 Documentation

- **DEPLOYMENT.md** - Full deployment guide
- **RAILWAY.md** - Railway-specific instructions
- **DEPLOYMENT_SUMMARY.md** - What was built and tested
- **README.md** - Complete project documentation

---

## ✅ Current Status

- ✅ Server tested and working locally
- ✅ MCP Inspector tested (http://localhost:6274)
- ✅ All 8 tools passing integration tests
- ✅ Docker configuration ready
- ✅ Railway configuration ready
- ✅ Database schema initialized (10 tables, 50 crew)
- ✅ Production ready

---

## 🎯 Next Step: Deploy to Railway

```bash
railway login
railway init
railway add --plugin postgresql
railway up
railway run psql $DATABASE_URL -f database/schema.sql
railway run psql $DATABASE_URL -f database/seed-data.sql
```

**Done! 🎉**

Your MCP server is now running in production at Railway.
