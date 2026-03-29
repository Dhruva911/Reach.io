const axios = require('axios');
const config = require('../config');
const { query } = require('../models/db');
const logger = require('../utils/logger');

class DeliveryService {

  // ============================================
  // SEND EMAIL (via Instantly or SendGrid)
  // ============================================
  async sendEmail(data) {
    const { message_id, tenant_id, prospect_email, subject, body } = data;

    // Get an available email account
    const account = await query(
      `SELECT * FROM email_accounts 
       WHERE tenant_id = $1 AND is_active = true AND sent_today < daily_send_limit
       ORDER BY sent_today ASC LIMIT 1`,
      [tenant_id]
    );

    if (account.rows.length === 0) {
      logger.warn('No email accounts available (all at daily limit)');
      await this._updateMessageStatus(message_id, 'failed', { reason: 'no_accounts_available' });
      return { status: 'failed', reason: 'no_accounts_available' };
    }

    const emailAccount = account.rows[0];

    try {
      if (config.instantly.apiKey) {
        // Real Instantly API call
        const response = await axios.post(`${config.instantly.baseUrl}/email/send`, {
          from_email: emailAccount.email_address,
          from_name: emailAccount.display_name,
          to: prospect_email,
          subject,
          body,
          reply_to: emailAccount.email_address,
        }, {
          headers: { 'Authorization': `Bearer ${config.instantly.apiKey}` },
          timeout: 15000,
        });

        await this._updateMessageStatus(message_id, 'sent', {
          external_id: response.data?.id,
          sent_at: new Date(),
        });

        logger.info('Email sent via Instantly', { to: prospect_email, from: emailAccount.email_address });
      } else {
        // Mock mode
        logger.info('[MOCK] Email would be sent', { to: prospect_email, from: emailAccount.email_address, subject });
        await this._updateMessageStatus(message_id, 'sent', { mock: true, sent_at: new Date() });
      }

      // Increment daily counter
      await query(
        'UPDATE email_accounts SET sent_today = sent_today + 1, last_sent_at = NOW() WHERE id = $1',
        [emailAccount.id]
      );

      return { status: 'sent', from: emailAccount.email_address };

    } catch (err) {
      logger.error('Email send failed', { error: err.message, to: prospect_email });
      await this._updateMessageStatus(message_id, 'failed', { error: err.message });
      throw err;
    }
  }

  // ============================================
  // SEND LINKEDIN (via Phantombuster)
  // ============================================
  async sendLinkedIn(data) {
    const { message_id, tenant_id, prospect_linkedin, body, channel } = data;

    // Get an available LinkedIn account
    const account = await query(
      `SELECT * FROM linkedin_accounts 
       WHERE tenant_id = $1 AND is_active = true AND status = 'active'
         AND connects_sent_today < daily_connect_limit
       ORDER BY connects_sent_today ASC LIMIT 1`,
      [tenant_id]
    );

    if (account.rows.length === 0) {
      logger.warn('No LinkedIn accounts available');
      await this._updateMessageStatus(message_id, 'failed', { reason: 'no_linkedin_accounts' });
      return { status: 'failed', reason: 'no_linkedin_accounts' };
    }

    const linkedinAccount = account.rows[0];

    try {
      if (config.phantombuster.apiKey && linkedinAccount.phantombuster_agent_id) {
        // Real Phantombuster API call
        const agentAction = channel === 'linkedin_connect' ? 'LinkedIn Auto Connect' : 'LinkedIn Message Sender';
        
        const response = await axios.post(`${config.phantombuster.baseUrl}/agents/launch`, {
          id: linkedinAccount.phantombuster_agent_id,
          argument: JSON.stringify({
            sessionCookie: linkedinAccount.session_cookie,
            profileUrl: prospect_linkedin,
            message: body,
            action: channel === 'linkedin_connect' ? 'connect' : 'message',
          }),
        }, {
          headers: { 'X-Phantombuster-Key': config.phantombuster.apiKey },
          timeout: 30000,
        });

        logger.info(`LinkedIn ${channel} sent via Phantombuster`, { to: prospect_linkedin });
      } else {
        // Mock mode
        logger.info(`[MOCK] LinkedIn ${channel} would be sent`, {
          to: prospect_linkedin,
          from: linkedinAccount.display_name,
          body: body?.substring(0, 100),
        });
      }

      await this._updateMessageStatus(message_id, 'sent', { mock: !config.phantombuster.apiKey, sent_at: new Date() });

      // Increment daily counter
      if (channel === 'linkedin_connect') {
        await query('UPDATE linkedin_accounts SET connects_sent_today = connects_sent_today + 1, last_used_at = NOW() WHERE id = $1', [linkedinAccount.id]);
      } else {
        await query('UPDATE linkedin_accounts SET dms_sent_today = dms_sent_today + 1, last_used_at = NOW() WHERE id = $1', [linkedinAccount.id]);
      }

      return { status: 'sent', from: linkedinAccount.display_name };

    } catch (err) {
      logger.error(`LinkedIn ${channel} failed`, { error: err.message });
      await this._updateMessageStatus(message_id, 'failed', { error: err.message });

      // Check if account got restricted
      if (err.message?.includes('restricted') || err.message?.includes('blocked')) {
        await query("UPDATE linkedin_accounts SET status = 'restricted' WHERE id = $1", [linkedinAccount.id]);
        logger.warn('LinkedIn account restricted!', { account: linkedinAccount.display_name });
      }

      throw err;
    }
  }

  // ============================================
  // SEND WHATSAPP (via Twilio)
  // ============================================
  async sendWhatsApp(data) {
    const { message_id, tenant_id, prospect_phone, body } = data;

    if (!prospect_phone) {
      await this._updateMessageStatus(message_id, 'failed', { reason: 'no_phone_number' });
      return { status: 'skipped', reason: 'no_phone_number' };
    }

    // Get WhatsApp config
    const waConfig = await query(
      'SELECT * FROM whatsapp_configs WHERE tenant_id = $1 AND is_active = true LIMIT 1', [tenant_id]
    );

    try {
      if (config.twilio.accountSid && config.twilio.authToken) {
        // Real Twilio API call
        const twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
        const msg = await twilio.messages.create({
          from: config.twilio.whatsappFrom,
          to: `whatsapp:${prospect_phone}`,
          body,
        });

        await this._updateMessageStatus(message_id, 'sent', {
          external_id: msg.sid,
          sent_at: new Date(),
        });

        logger.info('WhatsApp sent via Twilio', { to: prospect_phone, sid: msg.sid });
      } else {
        // Mock mode
        logger.info('[MOCK] WhatsApp would be sent', {
          to: prospect_phone,
          body: body?.substring(0, 80),
        });
        await this._updateMessageStatus(message_id, 'sent', { mock: true, sent_at: new Date() });
      }

      // Increment counter
      if (waConfig.rows.length > 0) {
        await query('UPDATE whatsapp_configs SET sent_today = sent_today + 1 WHERE id = $1', [waConfig.rows[0].id]);
      }

      return { status: 'sent' };

    } catch (err) {
      logger.error('WhatsApp send failed', { error: err.message, to: prospect_phone });
      await this._updateMessageStatus(message_id, 'failed', { error: err.message });
      throw err;
    }
  }

  // ============================================
  // HELPER: Update message status
  // ============================================
  async _updateMessageStatus(messageId, status, metadata = {}) {
    const timeField = status === 'sent' ? 'sent_at' : status === 'delivered' ? 'delivered_at' : null;
    
    if (metadata.external_id) {
      await query(
        `UPDATE messages SET status = $1, external_message_id = $2 ${timeField ? `, ${timeField} = NOW()` : ''} WHERE id = $3`,
        [status, metadata.external_id, messageId]
      );
    } else {
      await query(
        `UPDATE messages SET status = $1 ${timeField ? `, ${timeField} = NOW()` : ''} WHERE id = $2`,
        [status, messageId]
      );
    }
  }
}

module.exports = new DeliveryService();
