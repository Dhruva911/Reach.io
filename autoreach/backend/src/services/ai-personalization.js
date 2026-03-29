const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class AIPersonalizationService {
  constructor() {
    this.apiKey = config.claude.apiKey;
    this.model = config.claude.model;
    this.useMock = !this.apiKey;

    if (this.useMock) {
      logger.warn('Claude API key not configured — using mock AI responses. Set CLAUDE_API_KEY in .env for live AI.');
    }
  }

  // ============================================
  // GENERATE PERSONALIZED EMAIL
  // ============================================
  async generateEmail(prospect, campaign, sequenceStep, sender) {
    const prompt = this._buildEmailPrompt(prospect, campaign, sequenceStep, sender);

    if (this.useMock) {
      return this._mockEmailResponse(prospect, sequenceStep);
    }

    return this._callClaude(prompt, 'email');
  }

  // ============================================
  // GENERATE LINKEDIN CONNECTION NOTE
  // ============================================
  async generateLinkedInNote(prospect, sender) {
    const prompt = `You are writing a LinkedIn connection request note. Maximum 300 characters.

SENDER: ${sender.first_name} ${sender.last_name}, ${sender.title || 'Business Development'} at Auriga Research — India's leading CDMO with 40+ years of expertise in formulation, testing, and manufacturing for cosmetics, nutraceuticals, and wellness brands.

PROSPECT:
- Name: ${prospect.first_name} ${prospect.last_name}
- Title: ${prospect.title}
- Company: ${prospect.company_name}
- Industry: ${prospect.industry}
${prospect.enrichment_data?.recent_linkedin_posts?.[0] ? `- Recent post: "${prospect.enrichment_data.recent_linkedin_posts[0]}"` : ''}
${prospect.enrichment_data?.company_news?.[0] ? `- Company news: ${prospect.enrichment_data.company_news[0]}` : ''}
${prospect.enrichment_data?.funding_info ? `- Funding: ${JSON.stringify(prospect.enrichment_data.funding_info)}` : ''}

Write a short, personalized connection note (under 300 characters) that:
1. References something specific about them or their company
2. Briefly states why connecting would be valuable
3. Feels human and genuine, not robotic
4. Does NOT use phrases like "I'd love to add you to my network"

Return ONLY the note text, nothing else.`;

    if (this.useMock) {
      return this._mockLinkedInNote(prospect);
    }

    return this._callClaude(prompt, 'linkedin_note');
  }

  // ============================================
  // GENERATE WHATSAPP MESSAGE
  // ============================================
  async generateWhatsApp(prospect, sender) {
    const prompt = `Write a brief WhatsApp business message (under 160 characters).

From: ${sender.first_name} at Auriga Research (CDMO services)
To: ${prospect.first_name} ${prospect.last_name}, ${prospect.title} at ${prospect.company_name}

The message should be professional but casual (it's WhatsApp), mention one specific thing about their company, and suggest a quick chat. Keep it under 160 characters.

Return ONLY the message text.`;

    if (this.useMock) {
      return `Hi ${prospect.first_name}! ${sender.first_name} from Auriga Research here. We help ${prospect.industry} brands with formulation + manufacturing. Would love to chat about supporting ${prospect.company_name}!`;
    }

    return this._callClaude(prompt, 'whatsapp');
  }

  // ============================================
  // SCORE REPLY (Lead Scoring)
  // ============================================
  async scoreReply(prospect, originalMessage, replyText) {
    const prompt = `You are an AI lead scoring system for a B2B CDMO company (Auriga Research). Analyze this reply and score it.

PROSPECT: ${prospect.first_name} ${prospect.last_name}, ${prospect.title} at ${prospect.company_name} (${prospect.industry})

ORIGINAL OUTREACH MESSAGE:
"${originalMessage}"

PROSPECT'S REPLY:
"${replyText}"

Analyze the reply and return a JSON object with:
{
  "score": <0-100 integer>,
  "sentiment": "<positive|neutral|negative>",
  "intent": "<interested|curious|not_interested|out_of_office|referral|unsubscribe>",
  "urgency": "<high|medium|low>",
  "recommended_action": "<string describing next best action>",
  "reasoning": "<brief explanation of the scoring>"
}

Return ONLY valid JSON, no other text.`;

    if (this.useMock) {
      return this._mockScoreReply(replyText);
    }

    try {
      const response = await this._callClaude(prompt, 'scoring');
      return JSON.parse(response);
    } catch {
      return this._mockScoreReply(replyText);
    }
  }

  // ============================================
  // GENERATE A/B VARIANTS
  // ============================================
  async generateVariants(prospect, campaign, sequenceStep, sender, count = 3) {
    const variants = [];
    for (let i = 0; i < count; i++) {
      const email = await this.generateEmail(prospect, campaign, { ...sequenceStep, variant: i + 1 }, sender);
      variants.push({ variant: String.fromCharCode(65 + i), ...email }); // A, B, C
    }
    return variants;
  }

  // ============================================
  // PRIVATE: Call Claude API
  // ============================================
  async _callClaude(prompt, type) {
    try {
      const response = await axios.post(config.claude.baseUrl, {
        model: this.model,
        max_tokens: config.claude.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      });

      const text = response.data.content?.[0]?.text || '';
      logger.info(`Claude API call successful (${type})`, { chars: text.length, model: this.model });
      return text;
    } catch (err) {
      logger.error(`Claude API error (${type})`, { error: err.message });
      throw new Error(`AI generation failed: ${err.message}`);
    }
  }

  // ============================================
  // PRIVATE: Build email prompt
  // ============================================
  _buildEmailPrompt(prospect, campaign, step, sender) {
    const enrichment = prospect.enrichment_data || {};
    return `You are writing a personalized B2B cold email for Auriga Research.

ABOUT AURIGA RESEARCH:
- India's leading Contract Development & Manufacturing Organization (CDMO)
- 40+ years of expertise, 1700+ professionals
- 5 state-of-the-art NABL-accredited labs across India
- 2 WHO-GMP certified manufacturing facilities
- Services: Formulation, Prototype Development, Testing, Clinical Studies, Claim Substantiation, Contract Manufacturing, Commercialization
- Key differentiators: Low MOQ, fast turnaround, FDA registered, 12,000+ happy customers

SENDER:
- Name: ${sender.first_name} ${sender.last_name}
- Title: ${sender.title || 'Managing Director'}
- Email: ${sender.email || 'auriga@aurigaresearch.com'}

PROSPECT:
- Name: ${prospect.first_name} ${prospect.last_name}
- Title: ${prospect.title}
- Company: ${prospect.company_name}
- Industry: ${prospect.industry}
- Company size: ${prospect.company_size || 'Unknown'}
- Location: ${prospect.company_location || 'Unknown'}
${enrichment.recent_linkedin_posts?.length ? `- Recent LinkedIn activity: "${enrichment.recent_linkedin_posts[0]}"` : ''}
${enrichment.company_news?.length ? `- Recent company news: ${enrichment.company_news[0]}` : ''}
${enrichment.funding_info ? `- Funding: ${enrichment.funding_info.round} - ${enrichment.funding_info.amount}` : ''}
${enrichment.prospect_brief ? `- AI Brief: ${enrichment.prospect_brief}` : ''}

SEQUENCE STEP: ${step.step_number || 1} of ${campaign?.sequence_steps || 7}
${step.step_number > 1 ? 'This is a FOLLOW-UP email. Reference the previous email without repeating it. Add new value.' : 'This is the FIRST email in the sequence.'}

EMAIL TEMPLATE (use as structure, but personalize heavily):
${step.template?.body_template || 'Write a personalized cold outreach email.'}

INSTRUCTIONS:
1. Write a personalized subject line (under 60 characters, no spam words)
2. Write the email body (150-200 words max)
3. Reference something SPECIFIC about the prospect or their company
4. Connect Auriga's capabilities to their likely needs
5. End with a clear, low-friction CTA (15-minute call)
6. Tone: Professional, warm, peer-to-peer. Not salesy.
7. Do NOT use generic phrases like "I hope this email finds you well"

Return in this exact format:
SUBJECT: [subject line]
BODY:
[email body]`;
  }

  // ============================================
  // MOCK RESPONSES (when no API key)
  // ============================================
  _mockEmailResponse(prospect, step) {
    const enrichment = prospect.enrichment_data || {};
    const hooks = [];
    if (enrichment.recent_linkedin_posts?.[0]) hooks.push(`your recent post about "${enrichment.recent_linkedin_posts[0].substring(0, 50)}..."`);
    if (enrichment.company_news?.[0]) hooks.push(enrichment.company_news[0].substring(0, 60));
    if (enrichment.funding_info) hooks.push(`${prospect.company_name}'s recent ${enrichment.funding_info.round} round`);
    const hook = hooks[0] || `${prospect.company_name}'s work in ${prospect.industry}`;

    const isFollowUp = (step.step_number || 1) > 1;

    if (isFollowUp) {
      return {
        subject: `Re: Quick follow-up, ${prospect.first_name}`,
        body: `Hi ${prospect.first_name},

Just wanted to follow up on my earlier email about how Auriga Research could support ${prospect.company_name}'s product development needs.

We recently helped a ${prospect.industry} brand cut their formulation-to-production timeline from 6 months to 8 weeks — with full NABL-accredited testing and WHO-GMP certified manufacturing.

I thought this might be relevant given ${hook}.

Would 15 minutes this week work for a quick chat? Happy to share the case study.

Best,
Dr. Saurabh Arora
Managing Director, Auriga Research
auriga@aurigaresearch.com | +91-11-45854585`,
      };
    }

    return {
      subject: `${prospect.first_name}, a thought on ${prospect.company_name}'s product development`,
      body: `Hi ${prospect.first_name},

I came across ${hook} — impressive growth!

At Auriga Research, we help ${prospect.industry} brands like ${prospect.company_name} go from idea to shelf-ready products with our end-to-end CDMO services:

- Formulation & prototype development
- NABL-accredited testing (safety, stability, efficacy)
- Clinical studies & claim substantiation
- WHO-GMP certified contract manufacturing (low MOQ)

With 40+ years of expertise and 5 labs across India, we have supported 12,000+ brands in building trusted, compliant products.

Would you be open to a 15-minute call this week to explore how we could support ${prospect.company_name}?

Best,
Dr. Saurabh Arora
Managing Director, Auriga Research
auriga@aurigaresearch.com | +91-11-45854585`,
    };
  }

  _mockLinkedInNote(prospect) {
    const enrichment = prospect.enrichment_data || {};
    if (enrichment.funding_info) {
      return `Congrats on ${prospect.company_name}'s ${enrichment.funding_info.round}, ${prospect.first_name}! I lead CDMO partnerships at Auriga Research — we help funded ${prospect.industry} brands scale production. Would love to connect!`;
    }
    if (enrichment.recent_linkedin_posts?.[0]) {
      return `Hi ${prospect.first_name}, loved your recent post on ${enrichment.recent_linkedin_posts[0].substring(0, 40)}. I run BD at Auriga Research — 40-year CDMO helping ${prospect.industry} brands. Let's connect!`;
    }
    return `Hi ${prospect.first_name}, I lead partnerships at Auriga Research — India's leading CDMO for ${prospect.industry} brands. Would love to connect and share how we support companies like ${prospect.company_name}!`;
  }

  _mockScoreReply(replyText) {
    const lower = replyText.toLowerCase();
    if (lower.includes('interested') || lower.includes('let\'s talk') || lower.includes('schedule') || lower.includes('yes')) {
      return { score: 85, sentiment: 'positive', intent: 'interested', urgency: 'high', recommended_action: 'Send calendar link immediately', reasoning: 'Prospect expressed direct interest' };
    }
    if (lower.includes('send me') || lower.includes('more info') || lower.includes('tell me more')) {
      return { score: 65, sentiment: 'positive', intent: 'curious', urgency: 'medium', recommended_action: 'Send case study and company brochure', reasoning: 'Prospect requesting more information — warm but not committed' };
    }
    if (lower.includes('not interested') || lower.includes('no thanks') || lower.includes('unsubscribe') || lower.includes('remove')) {
      return { score: 5, sentiment: 'negative', intent: 'not_interested', urgency: 'low', recommended_action: 'Stop sequence, add to suppression list', reasoning: 'Clear negative response' };
    }
    if (lower.includes('out of office') || lower.includes('ooo') || lower.includes('vacation') || lower.includes('away')) {
      return { score: 30, sentiment: 'neutral', intent: 'out_of_office', urgency: 'low', recommended_action: 'Pause sequence, reschedule in 7 days', reasoning: 'Auto-reply detected' };
    }
    if (lower.includes('wrong person') || lower.includes('not the right') || lower.includes('try contacting')) {
      return { score: 25, sentiment: 'neutral', intent: 'referral', urgency: 'medium', recommended_action: 'Ask for referral to the right person', reasoning: 'Prospect redirecting to someone else' };
    }
    return { score: 45, sentiment: 'neutral', intent: 'curious', urgency: 'medium', recommended_action: 'Follow up with more specific value proposition', reasoning: 'Ambiguous response — needs further qualification' };
  }
}

module.exports = new AIPersonalizationService();
