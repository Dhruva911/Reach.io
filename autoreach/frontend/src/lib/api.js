/**
 * Frontend API client — proxied through Next.js to the backend.
 */

const BASE = '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('reach_token');
}

async function request(method, path, body = null) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 401) {
    localStorage.removeItem('reach_token');
    window.location.href = '/login';
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (data) => request('POST', '/auth/register', data),
  getMe: () => request('GET', '/auth/me'),

  // Prospects
  getProspects: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/prospects${qs ? '?' + qs : ''}`);
  },
  getProspect: (id) => request('GET', `/prospects/${id}`),
  createProspect: (data) => request('POST', '/prospects', data),
  updateProspect: (id, data) => request('PATCH', `/prospects/${id}`, data),
  deleteProspect: (id) => request('DELETE', `/prospects/${id}`),
  importProspects: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    return fetch(`${BASE}/prospects/import-csv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((r) => r.json());
  },

  // Campaigns
  getCampaigns: () => request('GET', '/campaigns'),
  getCampaign: (id) => request('GET', `/campaigns/${id}`),
  createCampaign: (data) => request('POST', '/campaigns', data),
  updateCampaign: (id, data) => request('PATCH', `/campaigns/${id}`, data),
  launchCampaign: (id, prospectIds) => request('POST', `/campaigns/${id}/launch`, { prospect_ids: prospectIds }),
  getCampaignAnalytics: (id) => request('GET', `/campaigns/${id}/analytics`),

  // Sequences
  getSequences: () => request('GET', '/sequences'),
  createSequence: (data) => request('POST', '/sequences', data),
  updateSequence: (id, data) => request('PATCH', `/sequences/${id}`, data),

  // Messages
  getInbox: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/messages/inbox${qs ? '?' + qs : ''}`);
  },
  getReviewQueue: () => request('GET', '/messages/review-queue'),
  getThread: (prospectId) => request('GET', `/messages/thread/${prospectId}`),
  approveMessage: (id) => request('POST', `/messages/${id}/approve`),
  editAndSend: (id, content) => request('POST', `/messages/${id}/edit-and-send`, { content }),
  rejectMessage: (id) => request('POST', `/messages/${id}/reject`),

  // AI
  generateEmail: (prospectId, ctx = {}) => request('POST', '/ai/generate-email', { prospect_id: prospectId, ...ctx }),
  generateLinkedInNote: (prospectId, ctx = {}) => request('POST', '/ai/generate-linkedin-note', { prospect_id: prospectId, ...ctx }),
  generateVariants: (prospectId, channel, count = 3) => request('POST', '/ai/generate-variants', { prospect_id: prospectId, channel, count }),
  scoreReply: (messageId, replyText) => request('POST', '/ai/score-reply', { message_id: messageId, reply_text: replyText }),

  // Analytics
  getOverview: () => request('GET', '/analytics/overview'),
  getChannels: () => request('GET', '/analytics/channels'),
};
