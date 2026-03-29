-- AutoReach Database Schema
-- Migration: 001_initial_schema.sql
-- Run: psql -d autoreach -f migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TENANTS (Multi-tenancy for SaaS)
-- ============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('free', 'starter', 'growth', 'pro', 'enterprise')),
    settings JSONB DEFAULT '{}',
    max_prospects_per_month INT DEFAULT 1000,
    max_campaigns INT DEFAULT 3,
    max_users INT DEFAULT 1,
    channels_enabled TEXT[] DEFAULT ARRAY['email'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'rep' CHECK (role IN ('admin', 'manager', 'rep')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ============================================
-- ICP TEMPLATES (Ideal Customer Profiles)
-- ============================================
CREATE TABLE icp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    -- filters structure:
    -- {
    --   "industries": ["cosmetics", "nutraceuticals"],
    --   "company_size_min": 10,
    --   "company_size_max": 500,
    --   "revenue_min": 100000,
    --   "revenue_max": 50000000,
    --   "job_titles": ["VP of R&D", "Head of Product"],
    --   "seniority": ["vp", "director", "c_suite"],
    --   "geographies": ["India", "UAE", "USA"],
    --   "signals": ["recently_funded", "hiring", "new_product"],
    --   "exclusions": { "domains": [], "companies": [] }
    -- }
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROSPECTS
-- ============================================
CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Contact info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    
    -- Company info
    company_name VARCHAR(255),
    company_domain VARCHAR(255),
    company_linkedin_url TEXT,
    
    -- Role info
    title VARCHAR(255),
    seniority VARCHAR(50) CHECK (seniority IN ('c_suite', 'vp', 'director', 'manager', 'individual_contributor', 'other')),
    department VARCHAR(100),
    
    -- Company details
    industry VARCHAR(255),
    company_size VARCHAR(50),
    company_revenue VARCHAR(100),
    company_location VARCHAR(255),
    company_founded_year INT,
    
    -- Enrichment
    enrichment_data JSONB DEFAULT '{}',
    -- {
    --   "recent_linkedin_posts": [...],
    --   "company_news": [...],
    --   "funding_info": {...},
    --   "tech_stack": [...],
    --   "mutual_connections": [...],
    --   "prospect_brief": "AI-generated 3-line summary"
    -- }
    
    -- Scoring & Status
    lead_score INT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'enriched', 'contacted', 'replied', 'interested', 'qualified', 'meeting_booked', 'closed_won', 'closed_lost', 'do_not_contact')),
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('apollo', 'clay', 'csv', 'crm', 'linkedin', 'manual', 'referral')),
    source_id VARCHAR(255),
    
    -- Tags
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Metadata
    last_contacted_at TIMESTAMPTZ,
    last_replied_at TIMESTAMPTZ,
    total_touchpoints INT DEFAULT 0,
    do_not_contact BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prospects_tenant ON prospects(tenant_id);
CREATE INDEX idx_prospects_email ON prospects(tenant_id, email);
CREATE INDEX idx_prospects_status ON prospects(tenant_id, status);
CREATE INDEX idx_prospects_lead_score ON prospects(tenant_id, lead_score DESC);
CREATE INDEX idx_prospects_industry ON prospects(tenant_id, industry);
CREATE INDEX idx_prospects_company ON prospects(tenant_id, company_name);

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- ICP & targeting
    icp_template_id UUID REFERENCES icp_templates(id),
    prospect_filters JSONB DEFAULT '{}',
    
    -- Sequence
    sequence_id UUID, -- FK added after sequences table
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    
    -- Settings
    settings JSONB DEFAULT '{}',
    -- {
    --   "send_timezone": "Asia/Kolkata",
    --   "send_hours_start": 9,
    --   "send_hours_end": 18,
    --   "skip_weekends": true,
    --   "daily_email_limit": 100,
    --   "daily_linkedin_limit": 25,
    --   "auto_send_cold": true,
    --   "review_warm_leads": true,
    --   "warm_threshold": 50,
    --   "hot_threshold": 80
    -- }
    
    -- Stats (denormalized for fast reads)
    total_prospects INT DEFAULT 0,
    total_sent INT DEFAULT 0,
    total_opened INT DEFAULT 0,
    total_replied INT DEFAULT 0,
    total_positive_replies INT DEFAULT 0,
    total_meetings_booked INT DEFAULT 0,
    
    -- Ownership
    created_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEQUENCES (Outreach step definitions)
-- ============================================
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_template BOOLEAN DEFAULT false,
    
    -- Steps are stored as JSONB array
    steps JSONB NOT NULL DEFAULT '[]',
    -- [
    --   {
    --     "step_number": 1,
    --     "day": 1,
    --     "channel": "email",
    --     "action": "send_email",
    --     "delay_hours": 0,
    --     "template": {
    --       "subject_template": "{{first_name}}, quick question about {{company_name}}",
    --       "body_template": "...",
    --       "ai_personalize": true
    --     },
    --     "conditions": {
    --       "skip_if_replied": true,
    --       "skip_if_opened": false,
    --       "fallback_channel": null
    --     }
    --   },
    --   ...
    -- ]
    
    total_steps INT DEFAULT 0,
    channels_used TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from campaigns to sequences
ALTER TABLE campaigns ADD CONSTRAINT fk_campaign_sequence FOREIGN KEY (sequence_id) REFERENCES sequences(id);

-- ============================================
-- CAMPAIGN PROSPECTS (junction table)
-- ============================================
CREATE TABLE campaign_prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    
    -- Per-prospect sequence state
    current_step INT DEFAULT 0,
    sequence_status VARCHAR(50) DEFAULT 'pending' CHECK (sequence_status IN ('pending', 'active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'error')),
    next_step_at TIMESTAMPTZ,
    
    -- Engagement tracking
    emails_sent INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    linkedin_sent INT DEFAULT 0,
    whatsapp_sent INT DEFAULT 0,
    total_replies INT DEFAULT 0,
    
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    UNIQUE(campaign_id, prospect_id)
);

CREATE INDEX idx_campaign_prospects_next ON campaign_prospects(next_step_at) WHERE sequence_status = 'active';
CREATE INDEX idx_campaign_prospects_status ON campaign_prospects(campaign_id, sequence_status);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    campaign_prospect_id UUID REFERENCES campaign_prospects(id),
    
    -- Message details
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'linkedin', 'linkedin_connect', 'linkedin_dm', 'whatsapp', 'sms')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    
    -- Content
    subject VARCHAR(500),
    body TEXT NOT NULL,
    
    -- AI generation info
    ai_generated BOOLEAN DEFAULT false,
    ai_model VARCHAR(100),
    ai_prompt_context JSONB,
    ai_variants JSONB, -- [{ variant: "A", body: "..." }, ...]
    selected_variant VARCHAR(10),
    
    -- Status
    status VARCHAR(50) DEFAULT 'drafted' CHECK (status IN (
        'drafted', 'pending_review', 'approved', 'rejected',
        'queued', 'sending', 'sent', 'delivered',
        'opened', 'clicked', 'replied', 'bounced',
        'failed', 'cancelled'
    )),
    
    -- Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    
    -- External IDs
    external_message_id VARCHAR(255),
    external_thread_id VARCHAR(255),
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Sequence step reference
    sequence_step INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_prospect ON messages(prospect_id);
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_status ON messages(tenant_id, status);
CREATE INDEX idx_messages_inbox ON messages(tenant_id, direction, created_at DESC) WHERE direction = 'inbound';
CREATE INDEX idx_messages_review ON messages(tenant_id, status) WHERE status = 'pending_review';

-- ============================================
-- ACTIVITIES (Event log)
-- ============================================
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    message_id UUID REFERENCES messages(id),
    user_id UUID REFERENCES users(id),
    
    -- Activity type
    type VARCHAR(100) NOT NULL,
    -- Types: prospect_created, prospect_enriched, email_sent, email_opened,
    -- email_clicked, email_replied, email_bounced, linkedin_profile_viewed,
    -- linkedin_connect_sent, linkedin_connect_accepted, linkedin_dm_sent,
    -- linkedin_dm_replied, whatsapp_sent, whatsapp_delivered, whatsapp_read,
    -- whatsapp_replied, lead_scored, status_changed, meeting_booked,
    -- note_added, crm_synced
    
    -- Event data
    metadata JSONB DEFAULT '{}',
    channel VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_prospect ON activities(prospect_id, created_at DESC);
CREATE INDEX idx_activities_campaign ON activities(campaign_id, created_at DESC);
CREATE INDEX idx_activities_type ON activities(tenant_id, type, created_at DESC);

-- ============================================
-- AI SCORES (Lead scoring results)
-- ============================================
CREATE TABLE ai_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id),
    
    -- Scoring
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    intent VARCHAR(50) CHECK (intent IN ('interested', 'curious', 'not_interested', 'out_of_office', 'referral', 'unsubscribe', 'other')),
    urgency VARCHAR(20) CHECK (urgency IN ('high', 'medium', 'low')),
    
    -- AI reasoning
    recommended_action VARCHAR(255),
    reasoning TEXT,
    ai_model VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_scores_prospect ON ai_scores(prospect_id, created_at DESC);

-- ============================================
-- EMAIL ACCOUNTS (for sending)
-- ============================================
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    provider VARCHAR(50) CHECK (provider IN ('instantly', 'sendgrid', 'smtp', 'gmail', 'outlook')),
    
    -- Provider config
    provider_config JSONB DEFAULT '{}',
    
    -- Warmup status
    warmup_status VARCHAR(50) DEFAULT 'not_started' CHECK (warmup_status IN ('not_started', 'warming', 'warmed', 'paused')),
    daily_send_limit INT DEFAULT 50,
    sent_today INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LINKEDIN ACCOUNTS (for automation)
-- ============================================
CREATE TABLE linkedin_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    linkedin_email VARCHAR(255) NOT NULL,
    profile_url TEXT,
    display_name VARCHAR(255),
    
    -- Phantombuster config
    phantombuster_agent_id VARCHAR(255),
    session_cookie TEXT, -- encrypted
    
    -- Rate limits
    daily_connect_limit INT DEFAULT 25,
    daily_view_limit INT DEFAULT 50,
    daily_dm_limit INT DEFAULT 100,
    connects_sent_today INT DEFAULT 0,
    views_today INT DEFAULT 0,
    dms_sent_today INT DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'warming', 'restricted', 'banned', 'inactive')),
    
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WHATSAPP CONFIG
-- ============================================
CREATE TABLE whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) DEFAULT 'twilio' CHECK (provider IN ('twilio', 'gupshup', 'wati')),
    from_number VARCHAR(50),
    provider_config JSONB DEFAULT '{}',
    
    -- Templates
    approved_templates JSONB DEFAULT '[]',
    -- [{ "name": "intro_message", "template": "Hi {{1}}, ...", "status": "approved" }]
    
    daily_send_limit INT DEFAULT 100,
    sent_today INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CRM INTEGRATIONS
-- ============================================
CREATE TABLE crm_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('hubspot', 'salesforce', 'pipedrive', 'zoho')),
    
    -- OAuth tokens (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Sync config
    sync_config JSONB DEFAULT '{}',
    -- {
    --   "sync_new_prospects": true,
    --   "writeback_activities": true,
    --   "writeback_scores": true,
    --   "create_deals": true,
    --   "field_mapping": { "email": "email", "company": "company_name" }
    -- }
    
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'idle',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPRESSION LIST (Do Not Contact)
-- ============================================
CREATE TABLE suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    domain VARCHAR(255),
    
    reason VARCHAR(100) CHECK (reason IN ('unsubscribed', 'bounced', 'complained', 'manual', 'competitor', 'customer')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppression_email ON suppression_list(tenant_id, email);
CREATE INDEX idx_suppression_domain ON suppression_list(tenant_id, domain);

-- ============================================
-- JOB LOGS (BullMQ job tracking)
-- ============================================
CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    job_type VARCHAR(100) NOT NULL,
    job_id VARCHAR(255),
    queue_name VARCHAR(100),
    
    status VARCHAR(50) CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
    
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (Multi-tenancy)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_prospects_updated_at BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sequences_updated_at BEFORE UPDATE ON sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Done!
-- Run seeds next: psql -d autoreach -f seeds/001_auriga_seed.sql
