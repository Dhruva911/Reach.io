const router = require('express').Router();
const { query, withTransaction } = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/campaigns — List all campaigns
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['c.tenant_id = $1'];
    const params = [req.tenantId];
    let idx = 2;

    if (status) { conditions.push(`c.status = $${idx++}`); params.push(status); }

    params.push(limit, offset);
    const result = await query(
      `SELECT c.*, s.name as sequence_name, s.total_steps, s.channels_used,
              u.first_name as creator_first_name, u.last_name as creator_last_name,
              i.name as icp_name
       FROM campaigns c
       LEFT JOIN sequences s ON c.sequence_id = s.id
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN icp_templates i ON c.icp_template_id = i.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM campaigns c WHERE ${conditions.slice(0, -0).join(' AND ')}`,
      params.slice(0, conditions.length)
    );

    res.json({ campaigns: result.rows, total: parseInt(countResult.rows[0]?.count || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns — Create new campaign
router.post('/', async (req, res) => {
  try {
    const { name, description, icp_template_id, sequence_id, settings } = req.body;
    const result = await query(
      `INSERT INTO campaigns (tenant_id, name, description, icp_template_id, sequence_id, settings, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.tenantId, name, description, icp_template_id, sequence_id, JSON.stringify(settings || {}), req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/launch — Start a campaign (enroll prospects + schedule first step)
router.post('/:id/launch', async (req, res) => {
  try {
    const { prospect_ids } = req.body; // Array of prospect IDs to enroll

    const campaign = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]
    );
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.rows[0].status === 'active') return res.status(400).json({ error: 'Campaign already active' });

    const sequence = await query('SELECT * FROM sequences WHERE id = $1', [campaign.rows[0].sequence_id]);
    if (sequence.rows.length === 0) return res.status(400).json({ error: 'No sequence assigned' });

    const steps = sequence.rows[0].steps;
    const firstStepDelay = steps[0]?.day || 1;

    let enrolled = 0;
    await withTransaction(async (client) => {
      for (const prospectId of prospect_ids) {
        // Check suppression list
        const suppressed = await client.query(
          `SELECT id FROM suppression_list sl 
           JOIN prospects p ON (p.email = sl.email OR p.phone = sl.phone)
           WHERE sl.tenant_id = $1 AND p.id = $2`,
          [req.tenantId, prospectId]
        );
        if (suppressed.rows.length > 0) continue;

        // Enroll prospect
        const nextStepAt = new Date();
        nextStepAt.setDate(nextStepAt.getDate() + firstStepDelay);
        // Set to 9 AM in configured timezone
        nextStepAt.setHours(9, 0, 0, 0);

        await client.query(
          `INSERT INTO campaign_prospects (campaign_id, prospect_id, current_step, sequence_status, next_step_at)
           VALUES ($1, $2, 1, 'active', $3)
           ON CONFLICT (campaign_id, prospect_id) DO NOTHING`,
          [req.params.id, prospectId, nextStepAt]
        );

        // Update prospect status
        await client.query(
          `UPDATE prospects SET status = 'contacted', last_contacted_at = NOW() WHERE id = $1`,
          [prospectId]
        );

        enrolled++;
      }

      // Update campaign status
      await client.query(
        `UPDATE campaigns SET status = 'active', started_at = NOW(), total_prospects = $1 WHERE id = $2`,
        [enrolled, req.params.id]
      );
    });

    res.json({
      status: 'launched',
      campaign_id: req.params.id,
      prospects_enrolled: enrolled,
      first_step_scheduled: `Day ${firstStepDelay}`,
      sequence_steps: steps.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/campaigns/:id — Update / pause / resume
router.patch('/:id', async (req, res) => {
  try {
    const { status, name, description, settings } = req.body;
    const setClauses = [];
    const params = [req.params.id, req.tenantId];
    let idx = 3;

    if (status) { setClauses.push(`status = $${idx++}`); params.push(status); }
    if (name) { setClauses.push(`name = $${idx++}`); params.push(name); }
    if (description) { setClauses.push(`description = $${idx++}`); params.push(description); }
    if (settings) { setClauses.push(`settings = $${idx++}`); params.push(JSON.stringify(settings)); }

    if (setClauses.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const result = await query(
      `UPDATE campaigns SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const campaign = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]
    );
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

    // Message stats by channel
    const channelStats = await query(
      `SELECT channel, 
              COUNT(*) FILTER (WHERE direction = 'outbound') as sent,
              COUNT(*) FILTER (WHERE status = 'opened') as opened,
              COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
              COUNT(*) FILTER (WHERE status = 'replied' OR direction = 'inbound') as replied,
              COUNT(*) FILTER (WHERE status = 'bounced') as bounced
       FROM messages WHERE campaign_id = $1 GROUP BY channel`,
      [req.params.id]
    );

    // Sequence step performance
    const stepStats = await query(
      `SELECT sequence_step, channel, COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'sent' OR status = 'delivered') as delivered,
              COUNT(*) FILTER (WHERE status = 'replied') as replied
       FROM messages WHERE campaign_id = $1 AND direction = 'outbound'
       GROUP BY sequence_step, channel ORDER BY sequence_step`,
      [req.params.id]
    );

    // Prospect status breakdown
    const prospectStats = await query(
      `SELECT cp.sequence_status, COUNT(*) 
       FROM campaign_prospects cp WHERE cp.campaign_id = $1 GROUP BY cp.sequence_status`,
      [req.params.id]
    );

    res.json({
      campaign: campaign.rows[0],
      channel_stats: channelStats.rows,
      step_performance: stepStats.rows,
      prospect_breakdown: prospectStats.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
