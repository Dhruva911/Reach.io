/**
 * AI Router — Gemini (default free), Claude, or OpenAI based on user settings.
 */

import { callGemini, getGeminiKey } from './gemini.js';
import { buildEmailPrompt, buildLinkedInPrompt, buildFollowUpPrompt, buildScorePrompt } from './prompt-builder.js';

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiProvider', 'geminiApiKey', 'claudeApiKey', 'openaiApiKey'], resolve);
  });
}

async function callAI(prompt) {
  const settings = await getSettings();
  const provider = settings.aiProvider || 'gemini';

  if (provider === 'claude' && settings.claudeApiKey) {
    return callClaude(prompt, settings.claudeApiKey);
  }
  if (provider === 'openai' && settings.openaiApiKey) {
    return callOpenAI(prompt, settings.openaiApiKey);
  }
  // Default: Gemini
  const key = settings.geminiApiKey;
  return callGemini(prompt, key);
}

async function callClaude(prompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Claude API error');
  return data?.content?.[0]?.text || '';
}

async function callOpenAI(prompt, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'OpenAI API error');
  return data?.choices?.[0]?.message?.content || '';
}

// --- Public API ---

export async function generateEmail(prospect, icpContext) {
  const prompt = buildEmailPrompt(prospect, icpContext);
  const raw = await callAI(prompt);
  // Parse subject and body from AI response
  const subjectMatch = raw.match(/Subject:\s*(.+)/i);
  const bodyMatch = raw.match(/Body:\s*([\s\S]+)/i);
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : 'Quick intro',
    body: bodyMatch ? bodyMatch[1].trim() : raw.trim(),
  };
}

export async function generateLinkedInNote(prospect, icpContext) {
  const prompt = buildLinkedInPrompt(prospect, icpContext);
  const raw = await callAI(prompt);
  return raw.trim().slice(0, 300);
}

export async function generateFollowUp(prospect, icpContext, previousMessage) {
  const prompt = buildFollowUpPrompt(prospect, icpContext, previousMessage);
  return callAI(prompt);
}

export async function generateVariants(prospect, icpContext, type = 'email', count = 3) {
  const results = [];
  for (let i = 0; i < count; i++) {
    if (type === 'email') {
      results.push(await generateEmail(prospect, icpContext));
    } else {
      results.push(await generateLinkedInNote(prospect, icpContext));
    }
  }
  return results;
}

export async function scoreReply(replyText) {
  const prompt = buildScorePrompt(replyText);
  const raw = await callAI(prompt);
  try {
    const scoreMatch = raw.match(/score[:\s]+(\d+)/i);
    const sentimentMatch = raw.match(/sentiment[:\s]+(\w+)/i);
    const intentMatch = raw.match(/intent[:\s]+(\w+)/i);
    const actionMatch = raw.match(/action[:\s]+(.+)/i);
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
      sentiment: sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral',
      intent: intentMatch ? intentMatch[1].toLowerCase() : 'curious',
      recommended_action: actionMatch ? actionMatch[1].trim() : 'Send a follow-up',
      raw,
    };
  } catch {
    return { score: 50, sentiment: 'neutral', intent: 'curious', recommended_action: 'Review manually', raw };
  }
}
