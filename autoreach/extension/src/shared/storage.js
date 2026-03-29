/**
 * chrome.storage.local CRUD helpers.
 * Used when backend is unavailable (offline mode) or for local caching.
 */

function get(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function set(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function remove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

// --- Settings ---

export async function getSettings() {
  const result = await get([
    'backendUrl', 'geminiApiKey', 'claudeApiKey', 'openaiApiKey',
    'aiProvider', 'icpContext', 'calendlyUrl', 'linkedinDailyLimit',
    'emailTrackingEnabled', 'autoEnrichEnabled',
  ]);
  return {
    backendUrl: result.backendUrl || 'http://localhost:3001',
    geminiApiKey: result.geminiApiKey || '',
    claudeApiKey: result.claudeApiKey || '',
    openaiApiKey: result.openaiApiKey || '',
    aiProvider: result.aiProvider || 'gemini',
    icpContext: result.icpContext || '',
    calendlyUrl: result.calendlyUrl || '',
    linkedinDailyLimit: result.linkedinDailyLimit || 25,
    emailTrackingEnabled: result.emailTrackingEnabled !== false,
    autoEnrichEnabled: result.autoEnrichEnabled !== false,
  };
}

export async function saveSettings(settings) {
  await set(settings);
}

// --- Local Prospect Cache ---

export async function getCachedProspects() {
  const result = await get(['cachedProspects']);
  return result.cachedProspects || [];
}

export async function cacheProspects(prospects) {
  await set({ cachedProspects: prospects, prospectsLastSync: Date.now() });
}

export async function addCachedProspect(prospect) {
  const existing = await getCachedProspects();
  const deduplicated = existing.filter((p) => p.linkedin_url !== prospect.linkedin_url);
  deduplicated.unshift(prospect);
  await set({ cachedProspects: deduplicated.slice(0, 500) }); // Keep latest 500
}

// --- Local Stats (for offline display) ---

export async function getLocalStats() {
  const result = await get(['localStats']);
  return result.localStats || { prospectsAdded: 0, emailsSent: 0, repliesReceived: 0, meetingsBooked: 0 };
}

export async function incrementStat(key) {
  const stats = await getLocalStats();
  stats[key] = (stats[key] || 0) + 1;
  await set({ localStats: stats });
}

// --- Notification state ---

export async function markNotificationRead(id) {
  const result = await get(['readNotifications']);
  const read = result.readNotifications || [];
  if (!read.includes(id)) read.push(id);
  await set({ readNotifications: read });
}

export async function getUnreadCount() {
  const result = await get(['hotLeadAlerts', 'readNotifications']);
  const alerts = result.hotLeadAlerts || [];
  const read = result.readNotifications || [];
  return alerts.filter((a) => !read.includes(a.id)).length;
}
