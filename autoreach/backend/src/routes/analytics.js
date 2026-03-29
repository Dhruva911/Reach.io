const router = require('express').Router();
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/analytics/overview — Dashboard KPIs
router.get('/overview', async (req, res) => {
  try {
    const tid = req.tenantId;

    const [prospects, campaigns, messages, replies, meetings] = await Promise.all([
      query('SELECT COUNT(*) FROM prospects WHERE tenant_id = $1', [tid]),
      query("SELECT COUNT(*) FROM campaigns WHERE tenant_id = $1 AND status = 'active'", [tid]),
      query("SELECT COUNT(*) FROM messages WHERE tenant_id = $1 AND direction = 'outbound' AND status IN ('sent','delivered','opened','clicked','replied')", [tid]),
      query("SELECT COUNT(*) FROM messages WHERE tenant_id = $1 AND direction = 'inbound'", [tid]),
      query("SELECT COUNT(*) FROM activities WHERE tenant_id = $1 AND type = 'meeting_booked'", [tid]),
    ]);

    const totalSent = parseInt(messages.rows[0].count);
    const totalReplies = parseInt(replies.rows[0].count);

    // Channel breakdown
    const channelBreakdown = await query(
      `SELECT channel, 
              COUNT(*) FILTER (WHERE direction = 'outbound') as sent,
              COUNT(*) FILTER (WHERE status = 'opened') as opened,
              COUNT(*) FILTER (WHERE direction = 'inbound' OR status = 'replied') as replied
       FROM messages WHERE tenant_id = $1 GROUP BY channel`,
      [tid]
    );

    // Activity over last 30 days
    const dailyActivity = await query(
      `SELECT DATE(created_at) as date, 
              COUNT(*) FILTER (WHERE type LIKE '%_sent') as sent,
              COUNT(*) FILTER (WHERE type LIKE '%_replied') as replied
       FROM activities WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY date`,
      [tid]
    );

    // Top performing prospects
    const topProspects = await query(
      `SELECT p.first_name, p.last_name, p.company_name, p.lead_score, p.status,
              COUNT(m.id) FILTER (WHERE m.direction = 'inbound') as replies
       FROM prospects p LEFT JOIN messages m ON p.id = m.prospect_id
       WHERE p.tenant_id = $1 AND p.lead_score > 50
       GROUP BY p.id ORDER BY p.lead_score DESC LIMIT 10`,
      [tid]
    );

    res.json({
      kpis: {
        total_prospects: parseInt(prospects.rows[0].count),
        active_campaigns: parseInt(campaigns.rows[0].count),
        messages_sent: totalSent,
        total_replies: totalReplies,
        reply_rate: totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : 0,
        meetings_booked: parseInt(meetings.rows[0].count),
      },
      channel_breakdown: channelBreakdown.rows,
      daily_activity: dailyActivity.rows,
      top_prospects: topProspects.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/channels — Channel comparison
router.get('/channels', async (req, res) => {
  try {
    const result = await query(
      `SELECT channel,
              COUNT(*) as total_messages,
              COUNT(*) FILTER (WHERE direction = 'outbound') as sent,
              COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
              COUNT(*) FILTER (WHERE status = 'opened') as opened,
              COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
              COUNT(*) FILTER (WHERE direction = 'inbound') as replies,
              ROUND(AVG(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END)::numeric * 100, 1) as reply_rate
       FROM messages WHERE tenant_id = $1 GROUP BY channel`,
      [req.tenantId]
    );
    res.json({ channels: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
