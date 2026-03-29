/**
 * Reach.io Backend REST Client
 * Communicates with the self-hosted Node.js/Express backend.
 */

const DEFAULT_BASE_URL = 'http://localhost:3001';

async function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendUrl'], (result) => {
      resolve(result.backendUrl || DEFAULT_BASE_URL);
    });
  });
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      resolve(result.authToken || null);
    });
  });
}

async function request(method, path, body = null) {
  const baseUrl = await getBaseUrl();
  const token = await getToken();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  register: (data) => request('POST', '/api/auth/register', data),
  getMe: () => request('GET', '/api/auth/me'),

  // Prospects
  getProspects: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/prospects${qs ? '?' + qs : ''}`);
  },
  getProspect: (id) => request('GET', `/api/prospects/${id}`),
  createProspect: (data) => request('POST', '/api/prospects', data),
  updateProspect: (id, data) => request('PATCH', `/api/prospects/${id}`, data),
  deleteProspect: (id) => request('DELETE', `/api/prospects/${id}`),
  importProspects: (prospects) => request('POST', '/api/prospects/import-csv', { prospects }),

  // Campaigns
  getCampaigns: () => request('GET', '/api/campaigns'),
  getCampaign: (id) => request('GET', `/api/campaigns/${id}`),
  createCampaign: (data) => request('POST', '/api/campaigns', data),
  updateCampaign: (id, data) => request('PATCH', `/api/campaigns/${id}`, data),
  launchCampaign: (id, prospectIds) => request('POST', `/api/campaigns/${id}/launch`, { prospect_ids: prospectIds }),
  getCampaignAnalytics: (id) => request('GET', `/api/campaigns/${id}/analytics`),

  // Sequences
  getSequences: () => request('GET', '/api/sequences'),
  createSequence: (data) => request('POST', '/api/sequences', data),
  updateSequence: (id, data) => request('PATCH', `/api/sequences/${id}`, data),

  // Messages / Inbox
  getInbox: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/messages/inbox${qs ? '?' + qs : ''}`);
  },
  getReviewQueue: () => request('GET', '/api/messages/review-queue'),
  getThread: (prospectId) => request('GET', `/api/messages/thread/${prospectId}`),
  approveMessage: (id) => request('POST', `/api/messages/${id}/approve`),
  editAndSend: (id, content) => request('POST', `/api/messages/${id}/edit-and-send`, { content }),
  rejectMessage: (id) => request('POST', `/api/messages/${id}/reject`),

  // AI
  generateEmail: (prospectId, context = {}) =>
    request('POST', '/api/ai/generate-email', { prospect_id: prospectId, ...context }),
  generateLinkedInNote: (prospectId, context = {}) =>
    request('POST', '/api/ai/generate-linkedin-note', { prospect_id: prospectId, ...context }),
  generateVariants: (prospectId, channel, count = 3) =>
    request('POST', '/api/ai/generate-variants', { prospect_id: prospectId, channel, count }),
  scoreReply: (messageId, replyText) =>
    request('POST', '/api/ai/score-reply', { message_id: messageId, reply_text: replyText }),
  enrichProspect: (prospectId) =>
    request('POST', '/api/ai/enrich-prospect', { prospect_id: prospectId }),

  // Analytics
  getAnalyticsOverview: () => request('GET', '/api/analytics/overview'),
  getAnalyticsChannels: () => request('GET', '/api/analytics/channels'),
};
