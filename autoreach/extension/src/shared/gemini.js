/**
 * Google Gemini 2.0 Flash API client.
 * Free tier: 1,500 requests/day, 1M tokens/day.
 * Get a free API key at: https://aistudio.google.com/app/apikey
 */

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function callGemini(prompt, apiKey) {
  if (!apiKey) throw new Error('Gemini API key not set. Go to Options to add your free key.');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function getGeminiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (r) => resolve(r.geminiApiKey || null));
  });
}
