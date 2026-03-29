const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/autoreach',
    max: 20,
    idleTimeoutMillis: 30000,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
    expiresIn: '7d',
  },

  // AI
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: 1000,
    baseUrl: 'https://api.anthropic.com/v1/messages',
  },

  // Prospect Discovery
  apollo: {
    apiKey: process.env.APOLLO_API_KEY || '',
    baseUrl: 'https://api.apollo.io/v1',
  },

  clay: {
    apiKey: process.env.CLAY_API_KEY || '',
    baseUrl: 'https://api.clay.com/v3',
  },

  // Email Delivery
  instantly: {
    apiKey: process.env.INSTANTLY_API_KEY || '',
    baseUrl: 'https://api.instantly.ai/api/v1',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },

  // LinkedIn
  phantombuster: {
    apiKey: process.env.PHANTOMBUSTER_API_KEY || '',
    baseUrl: 'https://api.phantombuster.com/api/v2',
  },

  // WhatsApp
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  },

  // Rate Limits
  rateLimits: {
    email: { perDay: 200, perHour: 50 },
    linkedin: { connectsPerDay: 25, viewsPerDay: 50, dmsPerDay: 100 },
    whatsapp: { perDay: 100 },
  },

  // Sequence defaults
  sequence: {
    defaultTimezone: 'Asia/Kolkata',
    sendHoursStart: 9,
    sendHoursEnd: 18,
    skipWeekends: true,
    warmLeadThreshold: 50,
    hotLeadThreshold: 80,
  },
};
