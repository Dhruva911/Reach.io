/**
 * Builds rich, context-aware prompts from prospect data + ICP context.
 */

function prospectContext(prospect) {
  const lines = [];
  if (prospect.full_name) lines.push(`Name: ${prospect.full_name}`);
  if (prospect.title) lines.push(`Title: ${prospect.title}`);
  if (prospect.company_name) lines.push(`Company: ${prospect.company_name}`);
  if (prospect.industry) lines.push(`Industry: ${prospect.industry}`);
  if (prospect.location) lines.push(`Location: ${prospect.location}`);
  if (prospect.about) lines.push(`About: ${prospect.about.slice(0, 300)}`);
  if (prospect.recent_posts?.length) {
    lines.push(`Recent LinkedIn posts:\n${prospect.recent_posts.slice(0, 2).map((p) => `- "${p}"`).join('\n')}`);
  }
  if (prospect.company_description) lines.push(`Company description: ${prospect.company_description.slice(0, 200)}`);
  return lines.join('\n');
}

export function buildEmailPrompt(prospect, icpContext) {
  return `You are an expert B2B sales copywriter. Write a highly personalized cold outreach email.

SENDER CONTEXT:
${icpContext || 'A B2B company reaching out to potential clients.'}

PROSPECT INFORMATION:
${prospectContext(prospect)}

INSTRUCTIONS:
- Write a cold email that feels genuinely personal, not templated
- Reference something specific about the prospect or their company
- Keep body to 120-160 words maximum
- Use a compelling, specific subject line (not generic like "Quick question")
- End with a clear, low-friction CTA (e.g., "Would a 15-min call this week make sense?")
- Tone: professional but conversational, human

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Subject: [subject line here]
Body: [email body here]`;
}

export function buildLinkedInPrompt(prospect, icpContext) {
  return `You are an expert B2B sales professional. Write a LinkedIn connection request note.

SENDER CONTEXT:
${icpContext || 'A B2B company reaching out to potential clients.'}

PROSPECT INFORMATION:
${prospectContext(prospect)}

INSTRUCTIONS:
- Maximum 280 characters (this is a LinkedIn connection note limit)
- Sound genuine, not salesy
- Reference something specific about them or their work
- Do NOT use phrases like "I'd like to add you to my network"
- End with a reason to connect

Write ONLY the connection note, nothing else.`;
}

export function buildFollowUpPrompt(prospect, icpContext, previousMessage) {
  return `You are a B2B sales expert. Write a follow-up message for a prospect who hasn't replied.

SENDER CONTEXT:
${icpContext || 'A B2B company reaching out to potential clients.'}

PROSPECT INFORMATION:
${prospectContext(prospect)}

PREVIOUS MESSAGE SENT:
${previousMessage || 'A cold outreach email was sent previously.'}

INSTRUCTIONS:
- Keep it very short: 2-4 sentences max
- Acknowledge this is a follow-up without being pushy
- Add a new value angle or insight, don't just repeat the previous message
- Include a soft CTA

Write ONLY the follow-up message body, no subject line needed.`;
}

export function buildWhatsAppPrompt(prospect, icpContext) {
  return `Write a WhatsApp outreach message for a B2B prospect.

SENDER CONTEXT:
${icpContext || 'A B2B company.'}

PROSPECT: ${prospect.full_name || 'the prospect'}, ${prospect.title || ''} at ${prospect.company_name || 'their company'}.

INSTRUCTIONS:
- Maximum 160 characters
- Direct, friendly, and action-oriented
- Include first name
- One clear ask

Write ONLY the WhatsApp message.`;
}

export function buildScorePrompt(replyText) {
  return `You are a B2B sales intelligence analyst. Score this prospect reply.

REPLY TEXT:
"${replyText}"

Analyze and provide:
1. score: 0-100 (0=strongly negative/unsubscribe, 50=neutral/curious, 100=very interested/ready to buy)
2. sentiment: positive | neutral | negative
3. intent: interested | curious | not_interested | out_of_office | referral | unsubscribe
4. action: specific recommended next action for the sales rep

FORMAT EXACTLY:
Score: [number]
Sentiment: [word]
Intent: [word]
Action: [1 sentence recommendation]`;
}

export function buildEnrichPrompt(prospect) {
  return `Based on this B2B prospect's information, provide additional insights:

${prospectContext(prospect)}

Provide:
1. Estimated company size (employees)
2. Likely pain points they face
3. Best angle to approach them
4. Ideal outreach timing

Keep each point to 1-2 sentences.`;
}
