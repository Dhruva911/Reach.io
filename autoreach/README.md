# AutoReach — AI-Powered Multi-Channel Outreach Platform

An automated B2B outreach platform that discovers prospects, generates personalized messages via AI, and delivers them across Email, LinkedIn, and WhatsApp.

## Architecture

```
autoreach/
├── frontend/          # React dashboard (Next.js-style single page app)
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── routes/    # REST API endpoints
│   │   ├── services/  # Business logic
│   │   ├── models/    # Database models
│   │   ├── jobs/      # BullMQ job processors
│   │   ├── middleware/ # Auth, rate limiting
│   │   ├── utils/     # Helpers
│   │   └── config/    # Environment config
│   ├── migrations/    # PostgreSQL schema migrations
│   └── seeds/         # Seed data (Auriga-specific prospects)
├── scripts/           # Setup & deployment scripts
└── docs/              # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Setup

```bash
# 1. Clone and install
cd autoreach/backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run database migrations
npm run migrate

# 4. Seed sample data
npm run seed

# 5. Start the server
npm run dev
```

### Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/autoreach
REDIS_URL=redis://localhost:6379
CLAUDE_API_KEY=your-key-here
APOLLO_API_KEY=your-key-here
INSTANTLY_API_KEY=your-key-here
PHANTOMBUSTER_API_KEY=your-key-here
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
JWT_SECRET=your-secret
```

## API Endpoints

See `docs/api-reference.md` for full documentation.

## License

Proprietary — Auriga Research Private Limited
