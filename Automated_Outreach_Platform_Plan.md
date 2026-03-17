# Automated Outreach Platform — Full Detailed Plan

**Project Name:** AutoReach (working title)
**Version:** 1.0
**Date:** March 17, 2026
**Author:** Auriga Research / Product Team
**Status:** Planning Phase

---

## 1. Executive Summary

AutoReach is an AI-powered, multi-channel B2B outreach platform that automates the entire sales prospecting pipeline — from target definition to prospect discovery, personalized message generation, multi-channel delivery (Email, LinkedIn, WhatsApp), and response tracking with intelligent lead scoring.

The platform will be built internal-first for the Auriga Research sales team (targeting cosmetic brands, nutraceutical companies, startups, and health & wellness brands), then evolved into a SaaS product for external customers.

**Core value proposition:** Input your ideal customer profile → the system finds prospects, writes hyper-personalized messages, delivers them across channels on autopilot, and surfaces warm leads for human follow-up.

---

## 2. Problem Statement

Current B2B outreach suffers from three critical bottlenecks:

1. **Manual prospect research is slow.** Sales reps spend 40–60% of their time finding and qualifying leads instead of selling.
2. **Generic outreach gets ignored.** Template-based cold emails see 1–3% reply rates. Personalization at scale requires AI.
3. **Multi-channel coordination is fragmented.** Teams use separate tools for email, LinkedIn, and WhatsApp with no unified sequence logic, leading to duplicate outreach, missed follow-ups, and lost context.

AutoReach solves all three by unifying discovery, personalization, delivery, and tracking into a single automated workflow.

---

## 3. Target Users

### 3.1 Internal (Phase 1)
- Auriga Research's B2B sales team targeting cosmetic brands, nutraceutical companies, startups, and established brands for CDMO/testing services
- Target personas: VP of R&D, Head of Product Development, Quality Managers, Founders of D2C beauty/wellness brands

### 3.2 External SaaS (Phase 2)
- B2B sales teams (10–200 person companies)
- Growth agencies and consultancies running outreach for clients
- Recruiters doing candidate outreach
- Founders doing their own BD/sales

---

## 4. Feature Specification

### 4.1 Target Definition Module

**What it does:** Lets users define their Ideal Customer Profile (ICP) through a structured form that feeds into the prospect discovery engine.

**ICP parameters:**
- Industry vertical (cosmetics, nutraceuticals, food & beverage, health & wellness, etc.)
- Company size (employee count range, revenue range)
- Geography (country, state, city, radius)
- Job titles / seniority levels (C-suite, VP, Director, Manager)
- Technology stack (optional — for tech-focused outreach)
- Company signals (recently funded, hiring, new product launch, expansion)
- Exclusion filters (competitors, existing customers, do-not-contact list)

**Saved ICP templates:** Users can save and reuse ICPs across campaigns. The system also suggests ICPs based on past successful campaigns (lookalike targeting).

**Input methods:**
- Manual form entry with auto-suggestions
- CSV upload for pre-built prospect lists
- CRM sync (import existing leads from HubSpot/Salesforce)
- LinkedIn Sales Navigator URL import (parse search filters)

---

### 4.2 Prospect Discovery & Enrichment Engine

**What it does:** Takes the ICP definition and automatically finds matching prospects across multiple data sources, then enriches each prospect with contextual data for personalization.

**Data sources (layered approach):**

| Source | Purpose | Data Points |
|--------|---------|-------------|
| Apollo.io | Primary contact database | Name, email, phone, title, company, LinkedIn URL |
| Clay | Enrichment orchestration | Chains multiple enrichment steps in sequence |
| Clearbit | Firmographics | Company revenue, size, tech stack, funding |
| LinkedIn (via Phantombuster) | Social signals | Recent posts, engagement, connections, activity |
| Company websites (via scraper) | Company context | About page, recent news, product launches |
| Crunchbase / PitchBook | Funding signals | Recent funding rounds, investors, growth stage |
| Google News API | Trigger events | Press mentions, product launches, expansions |

**Enrichment pipeline (orchestrated via Clay):**

```
Step 1: Apollo search → base contacts matching ICP
Step 2: Clearbit enrich → add firmographic data
Step 3: LinkedIn scrape → recent posts, activity score
Step 4: News search → company mentions in last 90 days
Step 5: AI summary → Claude generates a 3-line "prospect brief"
Step 6: Scoring → assign lead score (0–100) based on ICP fit + signals
Step 7: Dedup → merge duplicates by email + LinkedIn URL
```

**Output per prospect:**
- Full contact info (name, email, phone, LinkedIn, company)
- Company firmographics (size, revenue, industry, location)
- Enrichment context (recent posts, news mentions, funding events)
- AI-generated "prospect brief" (3 lines summarizing why this person is a fit)
- Lead score (0–100)

**Volume targets:**
- Internal use: 500–2,000 new prospects per month
- SaaS: support up to 50,000 prospects per month per tenant

---

### 4.3 AI Personalization Engine

**What it does:** Takes each prospect's enrichment data and generates hyper-personalized messages for each outreach channel, adapting tone, length, and style per channel.

**AI model:** Claude API (Sonnet for speed, Opus for high-value accounts)

**Context assembly (per prospect):**

```
{
  "prospect": {
    "name": "Priya Sharma",
    "title": "VP of Product Development",
    "company": "GlowNaturals",
    "industry": "D2C Skincare",
    "company_size": "50-100 employees",
    "recent_funding": "Series A, $5M, Jan 2026",
    "recent_linkedin_post": "Excited about our new vitamin C serum launch...",
    "company_news": "GlowNaturals expanding into Middle East market",
    "mutual_connections": ["Rahul Mehta", "Dr. Ankit Verma"]
  },
  "sender": {
    "name": "Dr. Saurabh Arora",
    "title": "Managing Director, Auriga Research",
    "company_usp": "40+ years CDMO expertise, 5 labs, WHO-GMP certified"
  },
  "campaign": {
    "goal": "Book a discovery call for contract manufacturing",
    "tone": "Professional but warm, peer-to-peer",
    "value_prop": "End-to-end formulation to commercialization"
  }
}
```

**Channel-specific generation:**

| Channel | Max Length | Tone | Format |
|---------|-----------|------|--------|
| Email | 150–200 words | Professional, value-led | Subject + body + CTA |
| LinkedIn connection note | 300 characters | Casual, reference-based | Short personal note |
| LinkedIn DM (post-connect) | 500 characters | Conversational | Follow-up message |
| WhatsApp | 160 characters | Brief, direct | One-liner + link |

**Personalization triggers (what the AI looks for):**
- Recent LinkedIn post → reference it specifically
- Company news / funding → congratulate and tie to your offering
- Mutual connections → name-drop with permission
- Industry pain point → address it directly
- Job change / promotion → use as an opener

**Human review flow:**
- Cold prospects (score < 50): AI auto-sends, no review needed
- Warm prospects (score 50–80): AI drafts, flagged for optional review
- Hot prospects (score > 80): AI drafts, mandatory human approval before send
- Review interface: side-by-side view of prospect context + AI draft + edit capability

**Quality controls:**
- Tone consistency checker (rejects overly salesy or generic output)
- Spam word filter (avoids trigger words that hurt deliverability)
- Duplicate message detector (ensures no two prospects get the same message)
- A/B variant generator (creates 2–3 variants per message for testing)

---

### 4.4 Multi-Channel Sequence Engine

**What it does:** Orchestrates automated outreach sequences across Email, LinkedIn, and WhatsApp with configurable timing, branching logic, and response-aware behavior.

**Sequence builder (visual drag-and-drop UI):**

Users can build custom sequences or choose from templates:

**Template: Standard B2B Cold Outreach (10-day)**

```
Day 1  → Email: Personalized cold email
Day 2  → LinkedIn: View prospect's profile (warm-up)
Day 3  → LinkedIn: Send connection request + note
Day 5  → WhatsApp: Short message (if phone available)
Day 7  → Email: Follow-up #1 (new angle / value add)
Day 10 → LinkedIn: DM (if connected) OR Email: Follow-up #2
Day 14 → Email: Break-up email ("Last attempt to reach you")
```

**Template: Warm Referral Outreach (7-day)**

```
Day 1  → LinkedIn: Connection request mentioning mutual connection
Day 2  → Email: Warm intro referencing the connection
Day 4  → WhatsApp: Casual follow-up
Day 7  → Email: Follow-up with case study / social proof
```

**Template: Event-Based Outreach (5-day)**

```
Day 0  → Trigger: Funding announcement / product launch detected
Day 0  → Email: Congratulations + relevance pitch
Day 2  → LinkedIn: Connection request + event reference
Day 4  → Email: Follow-up with specific value proposition
Day 5  → WhatsApp: Quick check-in
```

**Sequence logic engine:**

```
FOR each prospect in campaign:
  FOR each step in sequence:
    1. CHECK: Has prospect replied on ANY channel?
       → YES: Pause sequence → route to AI lead scoring → route to inbox
       → NO: Continue to step 2
    
    2. CHECK: Has prospect engaged (opened, clicked, profile viewed)?
       → YES: Optionally accelerate next step by 1 day
       → NO: Continue normally
    
    3. CHECK: Rate limit for this channel
       → EXCEEDED: Queue for next available slot
       → OK: Continue to step 4
    
    4. CHECK: Is this a warm lead requiring human review?
       → YES: Route draft to review queue → wait for approval
       → NO: Auto-send
    
    5. EXECUTE: Send message via channel API
    
    6. LOG: Record send time, channel, message content, prospect ID
    
    7. SCHEDULE: Queue next step with configured delay
```

**Branching conditions (configurable per step):**
- If email opened but no reply → send LinkedIn DM instead of another email
- If LinkedIn connection accepted → skip WhatsApp, send DM directly
- If WhatsApp delivered but not read after 48h → fall back to email
- If out-of-office reply detected → pause sequence, resume in X days
- If negative reply ("not interested") → mark as closed, stop sequence
- If positive reply → alert sales rep immediately (Slack/email notification)

---

### 4.5 Channel-Specific Delivery

#### 4.5.1 Email Delivery

**Primary tool:** Instantly.ai (for cold email with built-in warmup)
**Backup / transactional:** SendGrid

**Email infrastructure:**
- Multiple sending domains (rotate to protect deliverability)
- Automatic domain warmup via Instantly (2–4 weeks per new domain)
- SPF, DKIM, DMARC configuration for all domains
- Custom tracking domain for open/click tracking
- Sending limits: 50 emails/day per mailbox during warmup → 200/day at maturity
- Multiple mailbox rotation (5–10 mailboxes per campaign)

**Email features:**
- Plain-text emails (no HTML templates — better deliverability for cold outreach)
- Personalized subject lines (AI-generated, A/B tested)
- Smart send-time optimization (send when prospect is most likely to read)
- Automatic bounce handling (remove hard bounces, retry soft bounces)
- Unsubscribe link (CAN-SPAM / GDPR compliance)
- Reply detection via webhook (Instantly webhook or IMAP polling)

**Tracking:**
- Open tracking (via invisible pixel — optional, can hurt deliverability)
- Click tracking (via redirect links)
- Reply detection (webhook or IMAP)
- Bounce classification (hard vs soft)

#### 4.5.2 LinkedIn Delivery

**Primary tool:** Phantombuster
**Alternative:** Linked Helper, Dripify, or custom browser automation

**LinkedIn automation flow:**

```
Step 1: Session warmup
  - Log into LinkedIn via Phantombuster's browser session
  - Perform organic browsing (scroll feed, view 3-5 random profiles)
  - Wait 5-15 minutes

Step 2: Profile visit
  - Visit target prospect's profile
  - Scroll through their profile (simulates reading)
  - This triggers "Someone viewed your profile" notification

Step 3: Wait 5-30 minutes (random delay)

Step 4: Send connection request
  - Include personalized note (300 char max)
  - AI-generated based on prospect context

Step 5: Post-connection
  - If accepted: Queue a DM for Day X
  - If pending after 7 days: No action (avoid spam)
  - If accepted + reply: Route to inbox
```

**Safety measures (anti-ban protection):**
- Maximum 20–30 connection requests per day
- Maximum 50 profile views per day
- Maximum 100 DMs per day (to existing connections)
- Random delays between actions (2–8 minutes)
- Human-like working hours only (9 AM – 6 PM prospect's timezone)
- IP rotation via residential proxies
- Session cookie management (refresh every 24–48 hours)
- Account warmup for new LinkedIn accounts (start with 5/day, increase gradually)
- Weekend activity: reduced by 70%

**Multiple account support:**
- Round-robin across 3–5 LinkedIn accounts for high-volume campaigns
- Each account has its own Phantombuster session and rate limits
- Automatic failover if one account gets restricted

#### 4.5.3 WhatsApp Delivery

**Primary tool:** Twilio WhatsApp Business API (WABA)
**Alternative:** Gupshup, Wati

**WhatsApp compliance requirements:**
- Must use pre-approved message templates for first contact
- Prospect must have opted in (or message must be transactional/relevant)
- 24-hour response window for free-form replies
- Business profile verification required

**WhatsApp message types:**
- Template message (first contact): Pre-approved, personalized with variables
- Session message (within 24h of reply): Free-form, conversational
- Rich media: Can include PDFs (company brochure), images, links

**Example template:**
```
Hi {{1}}, I'm {{2}} from Auriga Research. We help brands like 
{{3}} with end-to-end product development — from formulation 
to manufacturing. Would love to share how we helped a similar 
{{4}} brand. Open to a quick chat this week?
```

**Delivery logic:**
- Only send WhatsApp if phone number is available and verified
- Respect DND (Do Not Disturb) registries (mandatory in India)
- Send during business hours only (prospect's timezone)
- If WhatsApp not available, fall back to SMS via Twilio (optional)

---

### 4.6 Response Tracking & AI Lead Scoring

**Unified inbox:**
All responses from all channels flow into a single inbox with full context:
- Email replies (via webhook/IMAP)
- LinkedIn messages (via Phantombuster webhook or polling)
- WhatsApp replies (via Twilio webhook)

**AI lead scoring (on every reply):**

```
Input to Claude API:
{
  "original_message": "...",
  "prospect_reply": "...",
  "prospect_context": { ... },
  "scoring_criteria": {
    "sentiment": "positive / neutral / negative",
    "intent": "interested / curious / not_interested / out_of_office / referral",
    "urgency": "high / medium / low",
    "next_action": "book_call / send_info / follow_up_later / close"
  }
}
```

**Score classification:**
- 80–100 (Hot): Immediate Slack alert to sales rep, schedule call
- 50–79 (Warm): Queue for human review, AI suggests response
- 20–49 (Cool): Auto-nurture with value content
- 0–19 (Cold/Negative): Mark as closed, stop sequence

**Auto-response for low-priority replies:**
- Out-of-office: Detect, pause sequence, reschedule
- "Send me info": Auto-reply with relevant case study / brochure
- "Not the right person": Ask for referral, update CRM
- "Not interested": Polite close, tag for re-engagement in 6 months

---

### 4.7 Analytics Dashboard

**Campaign-level metrics:**
- Total prospects contacted
- Messages sent per channel (email / LinkedIn / WhatsApp)
- Open rate, click rate, reply rate (per channel)
- Positive reply rate
- Meetings booked
- Pipeline generated ($)
- Cost per lead / cost per meeting

**Sequence performance:**
- Step-by-step drop-off analysis (which step loses the most prospects?)
- Channel effectiveness comparison
- Best performing message variants (A/B test results)
- Optimal send time heatmap

**Prospect-level activity timeline:**
- Full history of every touchpoint across all channels
- AI-generated summary of each prospect's engagement

**Team performance (SaaS):**
- Per-rep activity and results
- Leaderboard
- Quota tracking

---

### 4.8 CRM Integration & Writeback

**Supported CRMs:**
- HubSpot (primary, via API)
- Salesforce (via API)
- Pipedrive (via API)
- Zoho CRM (via API)

**Sync logic:**
- New prospect discovered → create Contact + Company in CRM
- Message sent → log Activity on the Contact
- Reply received → update Contact status + create Task for sales rep
- Meeting booked → create Deal/Opportunity in CRM
- Prospect unsubscribed → update Contact as Do-Not-Contact

**Two-way sync:**
- CRM → AutoReach: Import existing leads, honor do-not-contact lists
- AutoReach → CRM: Writeback all activity, scores, and status changes

---

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui | Modern React framework with SSR, excellent DX |
| API | Node.js (Express) or FastAPI (Python) | Node for real-time; Python if ML-heavy |
| Job Queue | BullMQ (Redis-backed) | Reliable delayed jobs, retries, rate limiting |
| Database | PostgreSQL (via Supabase or RDS) | Relational data, row-level security for multi-tenancy |
| Cache | Redis | Session cache, rate limiting, real-time data |
| Vector DB | Pinecone or pgvector | Semantic search on prospect data for AI context |
| AI | Claude API (Anthropic) | Message generation, lead scoring, summarization |
| Email | Instantly API + SendGrid | Cold email with warmup + transactional |
| LinkedIn | Phantombuster API | LinkedIn automation with safety controls |
| WhatsApp | Twilio WhatsApp Business API | Compliant WhatsApp messaging |
| Auth | Clerk or Auth0 | Multi-tenant auth, SSO, team management |
| Payments | Stripe | SaaS billing, usage-based pricing |
| Monitoring | Sentry + PostHog + CloudWatch | Error tracking, product analytics, infra monitoring |
| Hosting | AWS (ECS + RDS + ElastiCache) | Scalable, production-grade infrastructure |
| Frontend hosting | Vercel | Optimized for Next.js, edge deployment |
| File storage | AWS S3 | Prospect CSVs, email attachments, reports |

### 5.2 Database Schema (Core Tables)

```
── tenants
   ├── id (uuid, PK)
   ├── name
   ├── plan (free / starter / pro / enterprise)
   ├── created_at
   └── settings (jsonb)

── users
   ├── id (uuid, PK)
   ├── tenant_id (FK → tenants)
   ├── email
   ├── role (admin / manager / rep)
   └── auth_provider_id

── prospects
   ├── id (uuid, PK)
   ├── tenant_id (FK → tenants)
   ├── first_name, last_name
   ├── email, phone, linkedin_url
   ├── company_name, company_domain
   ├── title, seniority
   ├── industry, company_size, location
   ├── enrichment_data (jsonb)
   ├── lead_score (int, 0–100)
   ├── status (new / contacted / replied / qualified / closed)
   ├── source (apollo / csv / crm / manual)
   └── created_at, updated_at

── campaigns
   ├── id (uuid, PK)
   ├── tenant_id (FK → tenants)
   ├── name
   ├── icp_filters (jsonb)
   ├── sequence_id (FK → sequences)
   ├── status (draft / active / paused / completed)
   ├── created_by (FK → users)
   └── created_at, started_at, completed_at

── sequences
   ├── id (uuid, PK)
   ├── tenant_id (FK → tenants)
   ├── name
   ├── steps (jsonb array)
   │   └── [{ day: 1, channel: "email", template_id: "...", delay_hours: 0 }, ...]
   └── created_at

── messages
   ├── id (uuid, PK)
   ├── prospect_id (FK → prospects)
   ├── campaign_id (FK → campaigns)
   ├── channel (email / linkedin / whatsapp)
   ├── direction (outbound / inbound)
   ├── subject (nullable)
   ├── body
   ├── status (drafted / pending_review / sent / delivered / opened / clicked / replied / bounced)
   ├── sent_at
   ├── opened_at, clicked_at, replied_at
   ├── ai_model_used
   └── created_at

── activities
   ├── id (uuid, PK)
   ├── prospect_id (FK → prospects)
   ├── campaign_id (FK → campaigns)
   ├── type (email_sent / email_opened / email_replied / linkedin_view / linkedin_connect / linkedin_accept / linkedin_dm / whatsapp_sent / whatsapp_read / whatsapp_replied / meeting_booked)
   ├── metadata (jsonb)
   └── created_at

── ai_scores
   ├── id (uuid, PK)
   ├── message_id (FK → messages)
   ├── prospect_id (FK → prospects)
   ├── sentiment (positive / neutral / negative)
   ├── intent (interested / curious / not_interested / ooo / referral)
   ├── urgency (high / medium / low)
   ├── recommended_action
   ├── score (int, 0–100)
   └── created_at
```

### 5.3 API Architecture

**REST API endpoints (key routes):**

```
── Auth
   POST   /api/auth/login
   POST   /api/auth/register
   POST   /api/auth/invite-team-member

── Prospects
   GET    /api/prospects                    (list + filter + search)
   POST   /api/prospects                    (create manually)
   POST   /api/prospects/import-csv         (bulk import)
   POST   /api/prospects/discover           (trigger AI discovery)
   GET    /api/prospects/:id                (detail + activity timeline)
   PATCH  /api/prospects/:id                (update)
   DELETE /api/prospects/:id

── Campaigns
   GET    /api/campaigns
   POST   /api/campaigns                    (create new)
   PATCH  /api/campaigns/:id                (update / pause / resume)
   POST   /api/campaigns/:id/launch         (start sequence)
   GET    /api/campaigns/:id/analytics      (performance stats)

── Sequences
   GET    /api/sequences
   POST   /api/sequences                    (create / clone template)
   PATCH  /api/sequences/:id

── Messages
   GET    /api/messages/inbox               (unified inbox, all channels)
   GET    /api/messages/review-queue         (pending human approval)
   POST   /api/messages/:id/approve         (approve AI draft)
   POST   /api/messages/:id/edit-and-send   (edit then send)
   POST   /api/messages/:id/reject          (reject, regenerate)

── Analytics
   GET    /api/analytics/overview           (dashboard KPIs)
   GET    /api/analytics/campaigns/:id      (campaign breakdown)
   GET    /api/analytics/channels           (channel comparison)
   GET    /api/analytics/team               (team performance)

── Webhooks (inbound)
   POST   /api/webhooks/instantly           (email events)
   POST   /api/webhooks/phantombuster       (LinkedIn events)
   POST   /api/webhooks/twilio              (WhatsApp events)

── Integrations
   POST   /api/integrations/crm/connect     (OAuth flow)
   POST   /api/integrations/crm/sync        (trigger manual sync)
   GET    /api/integrations/crm/status       (sync health)
```

### 5.4 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│                   (Next.js Frontend)                    │
│          Dashboard · Campaign Builder · Inbox           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                  AWS ECS / App Runner                    │
│                    (API Server)                          │
│        Express/FastAPI · REST API · Webhook handlers    │
├─────────┬──────────┬──────────┬──────────┬──────────────┤
│         │          │          │          │              │
│    ┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐       │
│    │ BullMQ │ │ Claude │ │ Apollo │ │ Redis  │       │
│    │ Workers│ │  API   │ │ + Clay │ │ Cache  │       │
│    └────┬───┘ └────────┘ └────────┘ └────────┘       │
│         │                                              │
│    ┌────▼────────────────────────────────┐             │
│    │        PostgreSQL (RDS)              │             │
│    │  Prospects · Campaigns · Messages   │             │
│    └─────────────────────────────────────┘             │
│                                                        │
│    ┌──────────────────────────────────────┐            │
│    │      External Delivery APIs          │            │
│    │  Instantly · Phantombuster · Twilio  │            │
│    └──────────────────────────────────────┘            │
└────────────────────────────────────────────────────────┘
```

---

## 6. Security & Compliance

### 6.1 Data Protection
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- PII stored in PostgreSQL with row-level security (tenant isolation)
- API keys and credentials stored in AWS Secrets Manager
- No prospect data shared between tenants (SaaS)

### 6.2 Email Compliance
- CAN-SPAM compliant (unsubscribe in every email, physical address)
- GDPR compliant (consent tracking, right to be forgotten, data export)
- DPDP Act compliant (India — consent-based data processing)
- Automatic unsubscribe handling (honor within 24 hours)
- Global suppression list (shared across campaigns)

### 6.3 LinkedIn Compliance
- Respect LinkedIn's rate limits (conservative settings by default)
- No scraping of data beyond what's publicly visible
- Automatic pause if account gets restricted
- Clear disclosure in messages (not pretending to be personal)

### 6.4 WhatsApp Compliance
- Only contact verified phone numbers
- Use approved message templates for first contact
- Respect DND registry (India)
- 24-hour session window for conversational replies
- Opt-out handling (stop sequence if prospect says "stop")

### 6.5 Platform Security
- Multi-factor authentication (via Clerk/Auth0)
- Role-based access control (Admin, Manager, Rep)
- Audit log for all actions (who sent what, when, to whom)
- SOC 2 Type II compliance roadmap (for SaaS launch)

---

## 7. Development Roadmap

### Phase 1: Internal MVP (Weeks 1–8)

| Week | Deliverable |
|------|-------------|
| 1–2 | Project setup: Next.js frontend, API server, PostgreSQL, Redis, CI/CD pipeline |
| 2–3 | Target definition module + prospect import (CSV + manual) |
| 3–4 | Apollo integration for prospect discovery + basic enrichment |
| 4–5 | AI personalization engine (Claude API) + email generation |
| 5–6 | Email delivery via Instantly + reply tracking webhooks |
| 6–7 | Basic sequence engine (email-only, linear sequences) |
| 7–8 | Dashboard v1 (campaign list, basic analytics, prospect list) |

**MVP milestone:** Auriga team can define targets, discover prospects via Apollo, generate personalized emails via Claude, send automated email sequences, and track replies.

### Phase 2: Multi-Channel (Weeks 9–14)

| Week | Deliverable |
|------|-------------|
| 9–10 | LinkedIn integration (Phantombuster) — profile visit + connection request |
| 10–11 | WhatsApp integration (Twilio WABA) — template messages + replies |
| 11–12 | Multi-channel sequence builder (visual drag-and-drop) |
| 12–13 | Unified inbox (all channels in one view) |
| 13–14 | AI lead scoring on replies + human review queue |

**Multi-channel milestone:** Full Email + LinkedIn + WhatsApp sequences with intelligent branching and response-aware behavior.

### Phase 3: Intelligence & Polish (Weeks 15–20)

| Week | Deliverable |
|------|-------------|
| 15–16 | Advanced enrichment (Clay orchestration, news triggers, funding alerts) |
| 16–17 | A/B testing engine (message variants, subject lines, send times) |
| 17–18 | CRM integration (HubSpot writeback, two-way sync) |
| 18–19 | Advanced analytics (channel comparison, sequence optimization, heatmaps) |
| 19–20 | Performance optimization, bug fixes, internal team feedback |

**Intelligence milestone:** Full platform with enrichment, AI scoring, CRM sync, analytics, and battle-tested by internal team.

### Phase 4: SaaS Launch (Weeks 21–28)

| Week | Deliverable |
|------|-------------|
| 21–22 | Multi-tenancy (row-level security, tenant isolation, onboarding flow) |
| 22–23 | Auth & team management (Clerk/Auth0, invites, roles) |
| 23–24 | Billing (Stripe, usage-based pricing, plan limits) |
| 24–25 | Marketing site + documentation + onboarding wizard |
| 25–26 | Beta launch (10–20 pilot customers) |
| 26–28 | Iterate on feedback, stability, and scale testing |

**SaaS milestone:** Public launch with self-serve signup, billing, multi-tenant isolation, and onboarding.

---

## 8. Pricing Model (SaaS)

| Plan | Price | Prospects/mo | Channels | Sequences | AI Messages | Users |
|------|-------|-------------|----------|-----------|-------------|-------|
| Starter | $99/mo | 1,000 | Email only | 3 active | 2,000 | 1 |
| Growth | $299/mo | 5,000 | Email + LinkedIn | 10 active | 10,000 | 3 |
| Pro | $599/mo | 15,000 | All channels | Unlimited | 30,000 | 10 |
| Enterprise | Custom | Unlimited | All + custom | Unlimited | Unlimited | Unlimited |

**Add-ons:**
- Extra AI credits: $20 per 1,000 messages
- Dedicated LinkedIn accounts: $50/mo per account
- Priority support: $100/mo
- CRM integration: included in Pro and above

---

## 9. Key Metrics & Success Criteria

### Platform Health Metrics
- System uptime: > 99.9%
- Email deliverability rate: > 95%
- API response time: < 200ms (p95)
- Job queue processing lag: < 30 seconds

### Business Metrics (Internal)
- Prospects discovered per month: target 2,000+
- Reply rate across channels: target 8–15%
- Positive reply rate: target 3–5%
- Meetings booked per month: target 40+
- Pipeline generated: target ₹50L+ per quarter
- Time saved per sales rep: target 15+ hours/week

### Business Metrics (SaaS)
- MRR growth: 20% month-over-month
- Customer churn: < 5% monthly
- Net Promoter Score: > 50
- Activation rate (first campaign sent within 7 days): > 60%

---

## 10. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LinkedIn account bans | High | Conservative rate limits, multiple accounts, instant pause on restriction detection |
| Low email deliverability | High | Domain warmup, SPF/DKIM/DMARC, inbox rotation, spam score testing |
| AI generating poor messages | Medium | Quality scoring layer, human review for warm leads, feedback loop to improve prompts |
| Data privacy violations | High | GDPR/DPDP compliance from day 1, consent tracking, data encryption, DPO appointment |
| Apollo/Clay API downtime | Medium | Fallback enrichment sources, local caching of enrichment data, retry logic |
| Twilio WhatsApp template rejection | Medium | Pre-test templates, maintain 5+ approved templates, use conversational fallback |
| Scaling beyond 10K prospects/mo | Medium | Horizontal scaling via ECS, read replicas for PostgreSQL, Redis cluster |
| Claude API rate limits / costs | Medium | Caching frequent prompt patterns, using Sonnet for bulk, Opus only for high-value |

---

## 11. Team Requirements

### Phase 1–3 (Internal Build): 4–5 people

| Role | Count | Responsibility |
|------|-------|----------------|
| Full-stack developer | 2 | Frontend (Next.js), API, integrations |
| Backend / infra engineer | 1 | Database, queues, DevOps, scaling |
| AI / prompt engineer | 1 | Claude API integration, prompt design, quality tuning |
| Product manager | 0.5 | Requirements, prioritization, internal feedback |

### Phase 4 (SaaS): add 3–4 people

| Role | Count | Responsibility |
|------|-------|----------------|
| Frontend developer | 1 | Marketing site, onboarding, billing UI |
| DevOps / SRE | 1 | Multi-tenancy, security, monitoring, SOC 2 |
| Customer success | 1 | Onboarding, support, feedback collection |
| Growth marketer | 1 | Launch, content, product-led growth |

---

## 12. Budget Estimate (Phase 1–3, 5 months)

| Category | Monthly Cost | 5-Month Total |
|----------|-------------|---------------|
| Cloud infra (AWS + Vercel) | $500 | $2,500 |
| Apollo.io (Professional) | $99 | $495 |
| Clay (Explorer) | $149 | $745 |
| Instantly (Growth) | $97 | $485 |
| Phantombuster (Pro) | $69 | $345 |
| Twilio WhatsApp | $200 (est.) | $1,000 |
| Claude API (Anthropic) | $300 (est.) | $1,500 |
| Clerk / Auth0 | $25 | $125 |
| Sentry + PostHog | $50 | $250 |
| Residential proxies | $100 | $500 |
| **Total tools/infra** | **$1,589/mo** | **$7,945** |
| Team (4.5 people, India) | $15,000 (est.) | $75,000 |
| **Grand total** | **$16,589/mo** | **$82,945** |

---

## 13. Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| ICP | Ideal Customer Profile — the description of your perfect target company/contact |
| WABA | WhatsApp Business API — Twilio's integration for programmatic WhatsApp messaging |
| BullMQ | Redis-based job queue for Node.js — handles delayed jobs, retries, rate limiting |
| Phantombuster | LinkedIn automation platform providing browser-based actions via API |
| Enrichment | The process of adding data points (firmographics, social signals, news) to a base contact record |
| Sequence | An ordered series of outreach steps across multiple channels with timing and branching logic |
| Lead scoring | AI-based numerical score (0–100) indicating a prospect's likelihood to convert |
| Warmup | Gradually increasing email sending volume on a new domain to build sender reputation |
| Multi-tenancy | Architecture allowing multiple SaaS customers to share infrastructure while keeping data isolated |

### B. Reference Links

- Apollo.io API: https://apolloio.github.io/apollo-api-docs/
- Clay API: https://docs.clay.com/
- Instantly API: https://developer.instantly.ai/
- Phantombuster API: https://hub.phantombuster.com/
- Twilio WhatsApp API: https://www.twilio.com/docs/whatsapp
- Claude API: https://docs.anthropic.com/
- BullMQ: https://docs.bullmq.io/
- Next.js: https://nextjs.org/docs

---

*This document is a living plan and will be updated as the project progresses through each phase.*
