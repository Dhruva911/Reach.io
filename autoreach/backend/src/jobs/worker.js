/**
 * AutoReach Sequence Worker
 * 
 * This is the core automation engine. It runs as a separate process
 * and processes scheduled outreach steps from the job queue.
 * 
 * Start with: npm run worker
 * 
 * Jobs processed:
 * - sequence.execute-step  — Send a message for a specific prospect/campaign/step
 * - sequence.schedule-next — Schedule the next step in a sequence
 * - discovery.find-prospects — Run prospect discovery via Apollo
 * - enrichment.enrich-prospect — Enrich a prospect via Clay/Clearbit
 * - scoring.score-reply — AI-score an inbound reply
 * - delivery.send-email — Send via Instantly/SendGrid
 * - delivery.send-linkedin — Execute via Phantombuster
 * - delivery.send-whatsapp — Send via Twilio
 */

const { Worker, Queue, QueueScheduler } = require('bullmq');
const config = require('../config');
const { query } = require('../models/db');
const aiService = require('../services/ai-personalization');
const deliveryService = require('../services/delivery');
const logger = require('../utils/logger');

const connection = { url: config.redis.url };

// ============================================
// QUEUES
// ============================================
const sequenceQueue = new Queue('sequence', { connection });
const deliveryQueue = new Queue('delivery', { connection });
const enrichmentQueue = new Queue('enrichment', { connection });
const scoringQueue = new Queue('scoring', { connection });

// ============================================
// SEQUENCE WORKER — Main automation loop
// ============================================
const sequenceWorker = new Worker('sequence', async (job) => {
  const { type } = job.data;
  logger.info(`Processing sequence job: ${type}`, { jobId: job.id });

  switch (type) {
    case 'execute-step':
      return await executeStep(job.data);
    case 'schedule-next':
      return await scheduleNextStep(job.data);
    case 'process-due-steps':
      return await processDueSteps();
    default:
      logger.warn(`Unknown sequence job type: ${type}`);
  }
}, {
  connection,
  concurrency: 5,
  limiter: { max: 10, duration: 60000 }, // Max 10 jobs per minute
});

// ============================================
// DELIVERY WORKER — Sends messages via channels
// ============================================
const deliveryWorker = new Worker('delivery', async (job) => {
  const { channel } = job.data;
  logger.info(`Processing delivery job: ${channel}`, { jobId: job.id });

  switch (channel) {
    case 'email':
      return await deliveryService.sendEmail(job.data);
    case 'linkedin':
    case 'linkedin_connect':
    case 'linkedin_dm':
      return await deliveryService.sendLinkedIn(job.data);
    case 'whatsapp':
      return await deliveryService.sendWhatsApp(job.data);
    default:
      logger.warn(`Unknown delivery channel: ${channel}`);
  }
}, {
  connection,
  concurrency: 3,
  limiter: { max: 5, duration: 60000 }, // Max 5 deliveries per minute
});

// ============================================
// SCORING WORKER — AI lead scoring
// ============================================
const scoringWorker = new Worker('scoring', async (job) => {
  const { prospect_id, message_id, reply_text, tenant_id } = job.data;
  logger.info('Scoring reply', { prospect_id });

  const prospect = await query('SELECT * FROM prospects WHERE id = $1', [prospect_id]);
  if (prospect.rows.length === 0) return;

  let originalBody = '';
  if (message_id) {
    const msg = await query('SELECT body FROM messages WHERE id = $1', [message_id]);
    originalBody = msg.rows[0]?.body || '';
  }

  const score = await aiService.scoreReply(prospect.rows[0], originalBody, reply_text);

  // Save score
  await query(
    `INSERT INTO ai_scores (tenant_id, prospect_id, message_id, score, sentiment, intent, urgency, recommended_action, reasoning, ai_model)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [tenant_id, prospect_id, message_id, score.score, score.sentiment, score.intent,
     score.urgency, score.recommended_action, score.reasoning, aiService.useMock ? 'mock' : aiService.model]
  );

  // Update prospect
  await query('UPDATE prospects SET lead_score = $1 WHERE id = $2', [score.score, prospect_id]);

  logger.info('Reply scored', { prospect_id, score: score.score, intent: score.intent });
  return score;
}, { connection, concurrency: 2 });

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Process all due steps — called by cron every minute
 */
async function processDueSteps() {
  const dueSteps = await query(
    `SELECT cp.*, c.tenant_id, c.sequence_id, c.settings as campaign_settings,
            p.first_name, p.last_name, p.email, p.phone, p.linkedin_url,
            p.company_name, p.enrichment_data, p.do_not_contact
     FROM campaign_prospects cp
     JOIN campaigns c ON cp.campaign_id = c.id
     JOIN prospects p ON cp.prospect_id = p.id
     WHERE cp.sequence_status = 'active'
       AND cp.next_step_at <= NOW()
       AND c.status = 'active'
       AND p.do_not_contact = false
     ORDER BY cp.next_step_at ASC
     LIMIT 100`
  );

  logger.info(`Found ${dueSteps.rows.length} due steps to process`);

  for (const step of dueSteps.rows) {
    await sequenceQueue.add('execute-step', {
      type: 'execute-step',
      campaign_prospect_id: step.id,
      campaign_id: step.campaign_id,
      prospect_id: step.prospect_id,
      tenant_id: step.tenant_id,
      sequence_id: step.sequence_id,
      current_step: step.current_step,
      prospect: {
        first_name: step.first_name,
        last_name: step.last_name,
        email: step.email,
        phone: step.phone,
        linkedin_url: step.linkedin_url,
        company_name: step.company_name,
        enrichment_data: step.enrichment_data,
      },
      campaign_settings: step.campaign_settings,
    }, {
      delay: Math.random() * 120000, // Random 0-2 min delay (human-like)
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    });
  }

  return { processed: dueSteps.rows.length };
}

/**
 * Execute a single sequence step for a prospect
 */
async function executeStep(data) {
  const { campaign_prospect_id, campaign_id, prospect_id, tenant_id, sequence_id, current_step, prospect, campaign_settings } = data;

  // Get sequence and current step definition
  const seqResult = await query('SELECT * FROM sequences WHERE id = $1', [sequence_id]);
  if (seqResult.rows.length === 0) throw new Error('Sequence not found');

  const sequence = seqResult.rows[0];
  const steps = sequence.steps;
  const stepDef = steps[current_step - 1];

  if (!stepDef) {
    // No more steps — mark as completed
    await query(
      `UPDATE campaign_prospects SET sequence_status = 'completed', completed_at = NOW() WHERE id = $1`,
      [campaign_prospect_id]
    );
    logger.info('Sequence completed', { prospect_id, campaign_id });
    return { status: 'completed' };
  }

  // Check conditions
  if (stepDef.conditions?.skip_if_replied) {
    const hasReply = await query(
      `SELECT id FROM messages WHERE prospect_id = $1 AND campaign_id = $2 AND direction = 'inbound' LIMIT 1`,
      [prospect_id, campaign_id]
    );
    if (hasReply.rows.length > 0) {
      logger.info('Skipping step — prospect already replied', { prospect_id, step: current_step });
      await scheduleNextStep({ ...data, current_step: current_step + 1 });
      return { status: 'skipped_replied' };
    }
  }

  // Check rate limits
  const settings = campaign_settings || {};
  const channel = stepDef.channel;

  // Get sender info
  const senderResult = await query(
    `SELECT * FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`, [tenant_id]
  );
  const sender = senderResult.rows[0] || { first_name: 'Saurabh', last_name: 'Arora', title: 'Managing Director' };

  // Get full prospect data
  const prospectResult = await query('SELECT * FROM prospects WHERE id = $1', [prospect_id]);
  const fullProspect = prospectResult.rows[0];

  // Generate AI message
  let messageContent;
  if (channel === 'email') {
    messageContent = await aiService.generateEmail(fullProspect, { sequence_steps: steps.length }, stepDef, sender);
  } else if (channel === 'linkedin_connect' || channel === 'linkedin') {
    messageContent = await aiService.generateLinkedInNote(fullProspect, sender);
    messageContent = { subject: null, body: typeof messageContent === 'string' ? messageContent : messageContent.body };
  } else if (channel === 'linkedin_dm') {
    messageContent = { subject: null, body: `Hi ${fullProspect.first_name}, thanks for connecting! I wanted to share how Auriga Research could help ${fullProspect.company_name} with your product development needs. Would you be open to a quick chat?` };
  } else if (channel === 'whatsapp') {
    const waMsg = await aiService.generateWhatsApp(fullProspect, sender);
    messageContent = { subject: null, body: waMsg };
  }

  // Determine if human review is needed
  const warmThreshold = settings.warm_threshold || config.sequence.warmLeadThreshold;
  const hotThreshold = settings.hot_threshold || config.sequence.hotLeadThreshold;
  const needsReview = fullProspect.lead_score >= warmThreshold;
  const status = needsReview ? 'pending_review' : 'queued';

  // Save message to database
  const msgResult = await query(
    `INSERT INTO messages (tenant_id, prospect_id, campaign_id, campaign_prospect_id, channel, direction,
      subject, body, ai_generated, ai_model, status, sequence_step)
     VALUES ($1,$2,$3,$4,$5,'outbound',$6,$7,true,$8,$9,$10) RETURNING *`,
    [tenant_id, prospect_id, campaign_id, campaign_prospect_id, channel,
     messageContent.subject, messageContent.body || messageContent,
     aiService.useMock ? 'mock' : aiService.model, status, current_step]
  );

  const message = msgResult.rows[0];

  // If auto-send (not pending review), queue delivery
  if (status === 'queued') {
    await deliveryQueue.add(`send-${channel}`, {
      channel,
      message_id: message.id,
      tenant_id,
      prospect_id,
      prospect_email: fullProspect.email,
      prospect_phone: fullProspect.phone,
      prospect_linkedin: fullProspect.linkedin_url,
      subject: messageContent.subject,
      body: messageContent.body || messageContent,
    }, {
      delay: Math.random() * 300000, // Random 0-5 min delay
      attempts: 3,
    });
  }

  // Log activity
  await query(
    `INSERT INTO activities (tenant_id, prospect_id, campaign_id, message_id, user_id, type, channel, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [tenant_id, prospect_id, campaign_id, message.id, null,
     needsReview ? 'message_queued_for_review' : `${channel}_queued`,
     channel, JSON.stringify({ step: current_step, ai_generated: true })]
  );

  // Schedule next step
  await scheduleNextStep({ ...data, current_step });

  logger.info(`Step ${current_step} executed`, {
    prospect_id, campaign_id, channel, status,
    needs_review: needsReview,
  });

  return { status, message_id: message.id, channel };
}

/**
 * Schedule the next step in the sequence
 */
async function scheduleNextStep(data) {
  const { campaign_prospect_id, sequence_id, current_step } = data;

  const seqResult = await query('SELECT steps FROM sequences WHERE id = $1', [sequence_id]);
  const steps = seqResult.rows[0]?.steps || [];
  const nextStepIdx = current_step; // steps is 0-indexed, current_step is 1-indexed
  const nextStep = steps[nextStepIdx];

  if (!nextStep) {
    // Sequence complete
    await query(
      `UPDATE campaign_prospects SET sequence_status = 'completed', completed_at = NOW(), current_step = $1 WHERE id = $2`,
      [current_step, campaign_prospect_id]
    );
    return;
  }

  // Calculate next step time
  const currentStepDef = steps[current_step - 1];
  const dayDiff = nextStep.day - (currentStepDef?.day || 0);
  const nextStepAt = new Date();
  nextStepAt.setDate(nextStepAt.getDate() + Math.max(dayDiff, 1));
  nextStepAt.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0); // 9AM-5PM random

  await query(
    `UPDATE campaign_prospects SET current_step = $1, next_step_at = $2 WHERE id = $3`,
    [current_step + 1, nextStepAt, campaign_prospect_id]
  );
}

// ============================================
// CRON — Check for due steps every minute
// ============================================
const cron = require('node-cron');

cron.schedule('* * * * *', async () => {
  try {
    await sequenceQueue.add('process-due', { type: 'process-due-steps' }, { removeOnComplete: true });
  } catch (err) {
    logger.error('Cron error', { error: err.message });
  }
});

// ============================================
// ERROR HANDLERS
// ============================================
sequenceWorker.on('failed', (job, err) => {
  logger.error(`Sequence job failed: ${job.id}`, { error: err.message, data: job.data });
});

deliveryWorker.on('failed', (job, err) => {
  logger.error(`Delivery job failed: ${job.id}`, { error: err.message, data: job.data });
});

scoringWorker.on('failed', (job, err) => {
  logger.error(`Scoring job failed: ${job.id}`, { error: err.message, data: job.data });
});

logger.info('AutoReach workers started — sequence, delivery, scoring');
logger.info('Cron scheduled: checking for due steps every minute');

// Export for testing
module.exports = { sequenceQueue, deliveryQueue, enrichmentQueue, scoringQueue };
