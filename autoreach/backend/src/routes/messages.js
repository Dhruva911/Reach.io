const router = require('express').Router();
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/messages/inbox — Unified inbox (all inbound messages)
router.get('/inbox', async (req, res) => {
  try {
    const { channel, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['m.tenant_id = $1', "m.direction = 'inbound'"];
    const params = [req.tenantId];
    let idx = 2;

    if (channel) { conditions.push(`m.channel = $${idx++}`); params.push(channel); }

    params.push(limit, offset);
    const result = await query(
      `SELECT m.*, p.first_name, p.last_name, p.email as prospect_email, 
              p.company_name, p.title as prospect_title, p.lead_score,
              c.name as campaign_name
       FROM messages m
       JOIN prospects p ON m.prospect_id = p.id
       LEFT JOIN campaigns c ON m.campaign_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/review-queue — Messages pending human review
router.get('/review-queue', async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, p.first_name, p.last_name, p.email as prospect_email,
              p.company_name, p.lead_score, p.enrichment_data,
              c.name as campaign_name
       FROM messages m
       JOIN prospects p ON m.prospect_id = p.id
       LEFT JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.tenant_id = $1 AND m.status = 'pending_review'
       ORDER BY p.lead_score DESC, m.created_at ASC`,
      [req.tenantId]
    );
    res.json({ messages: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:id/approve — Approve and queue for sending
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await query(
      `UPDATE messages SET status = 'queued', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND status = 'pending_review' RETURNING *`,
      [req.user.id, req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found or already processed' });

    // TODO: Queue actual send job via BullMQ
    res.json({ status: 'approved_and_queued', message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:id/edit-and-send — Edit the AI draft then send
router.post('/:id/edit-and-send', async (req, res) => {
  try {
    const { subject, body } = req.body;
    const result = await query(
      `UPDATE messages SET subject = COALESCE($1, subject), body = COALESCE($2, body),
       status = 'queued', reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4 AND tenant_id = $5 RETURNING *`,
      [subject, body, req.user.id, req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ status: 'edited_and_queued', message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:id/reject — Reject and optionally regenerate
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason, regenerate } = req.body;
    const result = await query(
      `UPDATE messages SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
       WHERE id = $3 AND tenant_id = $4 RETURNING *`,
      [req.user.id, reason, req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

    // TODO: If regenerate=true, call AI service to create new variant
    res.json({ status: 'rejected', regenerate: !!regenerate, message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/thread/:prospect_id — Full conversation thread with a prospect
router.get('/thread/:prospect_id', async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, c.name as campaign_name
       FROM messages m LEFT JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.prospect_id = $1 AND m.tenant_id = $2
       ORDER BY m.created_at ASC`,
      [req.params.prospect_id, req.tenantId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
