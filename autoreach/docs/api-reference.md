# AutoReach API Reference

Base URL: `http://localhost:3001/api`

All endpoints (except auth and webhooks) require `Authorization: Bearer <token>` header.

## Authentication

### POST /auth/register
Create a new tenant and admin user.
```json
{
  "company_name": "Auriga Research",
  "email": "admin@aurigaresearch.com",
  "password": "securepassword",
  "first_name": "Saurabh",
  "last_name": "Arora"
}
```

### POST /auth/login
```json
{ "email": "admin@aurigaresearch.com", "password": "securepassword" }
```
Returns: `{ token, user, tenant }`

### GET /auth/me
Returns current user and tenant info.

### POST /auth/invite
Invite a team member (admin/manager only).
```json
{ "email": "sales@auriga.com", "first_name": "Sales", "last_name": "Rep", "role": "rep" }
```

## Prospects

### GET /prospects
List prospects with filtering and pagination.

Query params: `page`, `limit`, `sort`, `order`, `status`, `industry`, `source`, `min_score`, `max_score`, `search`, `tags`, `company`

### GET /prospects/:id
Prospect detail with activity timeline, messages, and AI scores.

### POST /prospects
Create a single prospect.

### POST /prospects/import-csv
Bulk import from CSV data.
```json
{ "prospects": [{ "first_name": "...", "last_name": "...", "email": "...", ... }] }
```

### POST /prospects/discover
Trigger AI prospect discovery via Apollo.
```json
{ "icp_template_id": "uuid", "limit": 100 }
```

### PATCH /prospects/:id
Update prospect fields.

### DELETE /prospects/:id

## Campaigns

### GET /campaigns
List campaigns. Query: `status`, `page`, `limit`

### POST /campaigns
Create a new campaign.
```json
{
  "name": "D2C Beauty Founders",
  "icp_template_id": "uuid",
  "sequence_id": "uuid",
  "settings": { "daily_email_limit": 50, "auto_send_cold": true }
}
```

### POST /campaigns/:id/launch
Start a campaign by enrolling prospects.
```json
{ "prospect_ids": ["uuid1", "uuid2", "uuid3"] }
```

### PATCH /campaigns/:id
Update, pause, or resume: `{ "status": "paused" }`

### GET /campaigns/:id/analytics
Campaign performance: channel stats, step performance, prospect breakdown.

## Sequences

### GET /sequences
### GET /sequences/:id
### POST /sequences
### PATCH /sequences/:id

## Messages

### GET /messages/inbox
Unified inbox — all inbound replies. Query: `channel`, `page`, `limit`

### GET /messages/review-queue
AI-generated messages pending human approval.

### POST /messages/:id/approve
Approve and queue for sending.

### POST /messages/:id/edit-and-send
Edit the AI draft then send. `{ "subject": "...", "body": "..." }`

### POST /messages/:id/reject
Reject (optionally regenerate). `{ "reason": "...", "regenerate": true }`

### GET /messages/thread/:prospect_id
Full conversation thread with a prospect.

## AI Engine

### POST /ai/generate-email
```json
{ "prospect_id": "uuid", "campaign_id": "uuid", "step_number": 1 }
```

### POST /ai/generate-linkedin-note
```json
{ "prospect_id": "uuid" }
```

### POST /ai/generate-whatsapp
```json
{ "prospect_id": "uuid" }
```

### POST /ai/generate-variants
```json
{ "prospect_id": "uuid", "campaign_id": "uuid", "count": 3 }
```

### POST /ai/score-reply
```json
{ "prospect_id": "uuid", "message_id": "uuid", "reply_text": "..." }
```

### POST /ai/enrich-prospect
```json
{ "prospect_id": "uuid" }
```

## Analytics

### GET /analytics/overview
Dashboard KPIs: total prospects, active campaigns, messages sent, reply rate, meetings, channel breakdown, daily activity, top prospects.

### GET /analytics/channels
Channel comparison: sent, delivered, opened, clicked, replies, reply rate per channel.

## Webhooks (no auth required)

### POST /webhooks/instantly
Email events from Instantly (open, click, reply, bounce).

### POST /webhooks/phantombuster
LinkedIn events (connection accepted, DM replied).

### POST /webhooks/twilio
WhatsApp events (delivered, read, inbound message).
