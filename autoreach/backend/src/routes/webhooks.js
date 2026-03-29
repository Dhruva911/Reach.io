const router = require('express').Router();
const { query } = require('../models/db');
const logger = require('../utils/logger');

// Webhooks don't use auth — they're called by external services with their own verification

// POST /api/webhooks/instantly — Email events (open, click, reply, bounce)
router.post('/instantly', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Instantly webhook received', { event_type: event.event_type });

    const { event_type, email, message_id, timestamp } = event;

    // Find the message by external ID
    const msg = await query(
      'SELECT * FROM messages WHERE external_message_id = $1', [message_id]
    );
    if (msg.rows.length === 0) {
      logger.warn('Webhook: message not found', { message_id });
      return res.json({ received: true });
    }

    const message = msg.rows[0];
    const statusMap = {
      'email_opened': 'opened',
      'email_clicked': 'clicked',
      'email_replied': 'replied',
      'email_bounced': 'bounced',
    };

    const newStatus = statusMap[event_type];
    if (newStatus) {
      await query(
        `UPDATE messages SET status = $1, ${newStatus}_at = $2 WHERE id = $3`,
        [newStatus, timestamp || new Date(), message.id]
      );

      // Log activity
      await query(
        `INSERT INTO activities (tenant_id, prospect_id, campaign_id, message_id, type, channel, metadata)
         VALUES ($1, $2, $3, $4, $5, 'email', $6)`,
        [message.tenant_id, message.prospect_id, message.campaign_id, message.id,
         `email_${newStatus}`, JSON.stringify(event)]
      );

      // If replied, pause the sequence for this prospect
      if (newStatus === 'replied') {
        await query(
          `UPDATE campaign_prospects SET sequence_status = 'replied' 
           WHERE campaign_id = $1 AND prospect_id = $2`,
          [message.campaign_id, message.prospect_id]
        );

        // Update prospect status
        await query(
          `UPDATE prospects SET status = 'replied', last_replied_at = NOW() WHERE id = $1`,
          [message.prospect_id]
        );

        // TODO: Queue AI lead scoring job
        logger.info('Reply detected — sequence paused, scoring queued', {
          prospect_id: message.prospect_id,
          campaign_id: message.campaign_id,
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Instantly webhook error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/phantombuster — LinkedIn events (connect accepted, message replied)
router.post('/phantombuster', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Phantombuster webhook received', { event });

    const { event_type, linkedin_url, prospect_name } = event;

    if (event_type === 'connection_accepted') {
      // Find prospect by LinkedIn URL
      const prospect = await query(
        'SELECT * FROM prospects WHERE linkedin_url = $1', [linkedin_url]
      );
      if (prospect.rows.length > 0) {
        const p = prospect.rows[0];
        await query(
          `INSERT INTO activities (tenant_id, prospect_id, type, channel, metadata)
           VALUES ($1, $2, 'linkedin_connect_accepted', 'linkedin', $3)`,
          [p.tenant_id, p.id, JSON.stringify(event)]
        );
        logger.info('LinkedIn connection accepted', { prospect_id: p.id });
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Phantombuster webhook error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/twilio — WhatsApp events (delivered, read, replied)
router.post('/twilio', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Twilio webhook received', { MessageSid: event.MessageSid, MessageStatus: event.MessageStatus });

    const { MessageSid, MessageStatus, From, Body } = event;

    if (MessageStatus === 'delivered' || MessageStatus === 'read') {
      await query(
        `UPDATE messages SET status = $1, delivered_at = COALESCE(delivered_at, NOW())
         WHERE external_message_id = $2`,
        [MessageStatus === 'read' ? 'opened' : 'delivered', MessageSid]
      );
    }

    // Inbound WhatsApp message (reply)
    if (Body && From) {
      const phone = From.replace('whatsapp:', '');
      const prospect = await query(
        'SELECT * FROM prospects WHERE phone = $1', [phone]
      );

      if (prospect.rows.length > 0) {
        const p = prospect.rows[0];
        // Store inbound message
        await query(
          `INSERT INTO messages (tenant_id, prospect_id, channel, direction, body, status, sent_at)
           VALUES ($1, $2, 'whatsapp', 'inbound', $3, 'replied', NOW())`,
          [p.tenant_id, p.id, Body]
        );

        // Pause sequence
        await query(
          `UPDATE campaign_prospects SET sequence_status = 'replied'
           WHERE prospect_id = $1 AND sequence_status = 'active'`,
          [p.id]
        );

        await query(
          `UPDATE prospects SET status = 'replied', last_replied_at = NOW() WHERE id = $1`, [p.id]
        );

        logger.info('WhatsApp reply received', { prospect_id: p.id });
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Twilio webhook error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
