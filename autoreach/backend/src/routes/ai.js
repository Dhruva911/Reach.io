const router = require('express').Router();
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/ai-personalization');

router.use(authenticate);

// POST /api/ai/generate-email — Generate personalized email for a prospect
router.post('/generate-email', async (req, res) => {
  try {
    const { prospect_id, campaign_id, step_number = 1 } = req.body;

    const prospect = await query('SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [prospect_id, req.tenantId]);
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    let campaign = null;
    let sequence = null;
    let step = { step_number, template: {} };

    if (campaign_id) {
      const campResult = await query('SELECT * FROM campaigns WHERE id = $1', [campaign_id]);
      campaign = campResult.rows[0];
      if (campaign?.sequence_id) {
        const seqResult = await query('SELECT * FROM sequences WHERE id = $1', [campaign.sequence_id]);
        sequence = seqResult.rows[0];
        step = sequence?.steps?.[step_number - 1] || step;
      }
    }

    const sender = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const email = await aiService.generateEmail(prospect.rows[0], campaign, step, sender.rows[0]);

    res.json({ email, prospect_id, ai_generated: true, model: aiService.useMock ? 'mock' : aiService.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/generate-linkedin-note
router.post('/generate-linkedin-note', async (req, res) => {
  try {
    const { prospect_id } = req.body;
    const prospect = await query('SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [prospect_id, req.tenantId]);
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    const sender = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const note = await aiService.generateLinkedInNote(prospect.rows[0], sender.rows[0]);

    res.json({ note, characters: note.length, prospect_id, ai_generated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/generate-whatsapp
router.post('/generate-whatsapp', async (req, res) => {
  try {
    const { prospect_id } = req.body;
    const prospect = await query('SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [prospect_id, req.tenantId]);
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    const sender = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const message = await aiService.generateWhatsApp(prospect.rows[0], sender.rows[0]);

    res.json({ message, characters: message.length, prospect_id, ai_generated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/generate-variants — A/B variants for a prospect
router.post('/generate-variants', async (req, res) => {
  try {
    const { prospect_id, campaign_id, step_number = 1, count = 3 } = req.body;

    const prospect = await query('SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [prospect_id, req.tenantId]);
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    const sender = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    let step = { step_number, template: {} };

    if (campaign_id) {
      const campResult = await query('SELECT c.*, s.steps FROM campaigns c LEFT JOIN sequences s ON c.sequence_id = s.id WHERE c.id = $1', [campaign_id]);
      if (campResult.rows[0]?.steps) {
        step = campResult.rows[0].steps[step_number - 1] || step;
      }
    }

    const variants = await aiService.generateVariants(prospect.rows[0], null, step, sender.rows[0], Math.min(count, 5));

    res.json({ variants, prospect_id, ai_generated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/score-reply — AI lead scoring on a reply
router.post('/score-reply', async (req, res) => {
  try {
    const { prospect_id, message_id, reply_text } = req.body;

    const prospect = await query('SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [prospect_id, req.tenantId]);
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    let originalMessage = '';
    if (message_id) {
      const msgResult = await query('SELECT body FROM messages WHERE id = $1', [message_id]);
      originalMessage = msgResult.rows[0]?.body || '';
    }

    const score = await aiService.scoreReply(prospect.rows[0], originalMessage, reply_text);

    // Save score to database
    await query(
      `INSERT INTO ai_scores (tenant_id, prospect_id, message_id, score, sentiment, intent, urgency, recommended_action, reasoning, ai_model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [req.tenantId, prospect_id, message_id, score.score, score.sentiment, score.intent,
       score.urgency, score.recommended_action, score.reasoning, aiService.useMock ? 'mock' : aiService.model]
    );

    // Update prospect lead score
    await query('UPDATE prospects SET lead_score = $1 WHERE id = $2', [score.score, prospect_id]);

    res.json({ score, prospect_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/enrich-prospect — Generate AI prospect brief from enrichment data
router.post('/enrich-prospect', async (req, res) => {
  try {
    const { prospect_id } = req.body;
    const prospect = await query('SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [prospect_id, req.tenantId]);
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    const p = prospect.rows[0];
    const enrichment = p.enrichment_data || {};

    // Generate prospect brief
    const brief = `${p.first_name} ${p.last_name} is ${p.title} at ${p.company_name}, a ${p.company_size || ''} ${p.industry || ''} company${p.company_location ? ' based in ' + p.company_location : ''}. ${enrichment.company_news?.[0] || ''} ${enrichment.funding_info ? `Recently raised ${enrichment.funding_info.amount} (${enrichment.funding_info.round}).` : ''} Potential fit for Auriga's ${p.industry?.includes('nutra') ? 'nutraceutical formulation and testing' : 'cosmetic CDMO and testing'} services.`;

    // Update enrichment data with brief
    enrichment.prospect_brief = brief;
    await query(
      `UPDATE prospects SET enrichment_data = $1, status = 'enriched' WHERE id = $2`,
      [JSON.stringify(enrichment), prospect_id]
    );

    res.json({ prospect_id, brief, enrichment_data: enrichment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
