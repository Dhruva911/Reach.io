/**
 * Background Service Worker
 * Central hub for: message routing, API calls, alarms, notifications, badge updates.
 */

import { api } from '../shared/api.js';
import { saveToken, saveUser, getToken } from '../shared/auth.js';
import { getSettings, addCachedProspect, getUnreadCount } from '../shared/storage.js';

// ─── Installation ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') });
  }
  // Register context menu
  chrome.contextMenus.create({
    id: 'reachFindProspects',
    title: 'Find prospects on this page',
    contexts: ['page'],
  });
  // Schedule follow-up checker (every hour)
  chrome.alarms.create('checkFollowUps', { periodInMinutes: 60 });
});

// ─── Context Menu ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'reachFindProspects') {
    chrome.tabs.sendMessage(tab.id, { type: 'FIND_PROSPECTS_ON_PAGE' });
  }
});

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkFollowUps') {
    await checkScheduledFollowUps();
  }
  if (alarm.name.startsWith('followup_')) {
    const prospectId = alarm.name.replace('followup_', '');
    await notifyFollowUp(prospectId);
  }
});

async function checkScheduledFollowUps() {
  try {
    const token = await getToken();
    if (!token) return;

    // Check backend for due sequence steps
    const settings = await getSettings();
    // This would normally call the backend to get due steps
    // For local-only mode, we check chrome.storage for scheduled follow-ups
  } catch (err) {
    console.error('[Reach.io] Follow-up check failed:', err);
  }
}

async function notifyFollowUp(prospectId) {
  chrome.notifications.create(`followup_${prospectId}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: 'Reach.io — Follow-up reminder',
    message: 'Time to follow up with a prospect!',
    buttons: [{ title: 'View prospect' }, { title: 'Snooze 1 day' }],
  });
}

// ─── Message Handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err.message }));
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  const { type, payload } = message;

  switch (type) {
    case 'LOGIN':
      return handleLogin(payload);

    case 'SAVE_PROSPECT':
      return handleSaveProspect(payload);

    case 'SAVE_PROSPECTS_BULK':
      return handleSaveProspectsBulk(payload);

    case 'GET_PROSPECTS':
      return handleGetProspects(payload);

    case 'UPDATE_PROSPECT_STATUS':
      return handleUpdateProspectStatus(payload);

    case 'GENERATE_EMAIL':
      return handleGenerateEmail(payload);

    case 'GENERATE_LINKEDIN_NOTE':
      return handleGenerateLinkedInNote(payload);

    case 'SCORE_REPLY':
      return handleScoreReply(payload);

    case 'ENROLL_IN_CAMPAIGN':
      return handleEnrollInCampaign(payload);

    case 'GET_CAMPAIGNS':
      return handleGetCampaigns();

    case 'GET_ANALYTICS':
      return handleGetAnalytics();

    case 'SCHEDULE_FOLLOWUP':
      return handleScheduleFollowUp(payload);

    case 'OPEN_SIDEPANEL':
      chrome.sidePanel.open({ tabId: sender.tab?.id });
      return { success: true };

    case 'GET_SETTINGS':
      return getSettings();

    default:
      return { success: false, error: `Unknown message type: ${type}` };
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleLogin({ email, password }) {
  const data = await api.login(email, password);
  await saveToken(data.token);
  await saveUser(data.user);
  await updateBadge();
  return { success: true, user: data.user };
}

async function handleSaveProspect(prospectData) {
  try {
    const result = await api.createProspect(prospectData);
    await addCachedProspect(result.prospect || prospectData);
    await updateBadge();
    return { success: true, prospect: result.prospect };
  } catch (err) {
    // Fallback: cache locally if backend unavailable
    const localProspect = { ...prospectData, id: `local_${Date.now()}`, created_at: new Date().toISOString() };
    await addCachedProspect(localProspect);
    return { success: true, prospect: localProspect, offline: true };
  }
}

async function handleSaveProspectsBulk(prospects) {
  const results = [];
  for (const p of prospects) {
    try {
      const result = await api.createProspect(p);
      results.push({ success: true, prospect: result.prospect });
      await addCachedProspect(result.prospect || p);
    } catch {
      const localProspect = { ...p, id: `local_${Date.now()}_${Math.random()}`, created_at: new Date().toISOString() };
      await addCachedProspect(localProspect);
      results.push({ success: true, prospect: localProspect, offline: true });
    }
  }
  await updateBadge();
  return { success: true, results, count: results.length };
}

async function handleGetProspects(params) {
  try {
    return await api.getProspects(params);
  } catch {
    const { cachedProspects } = await chrome.storage.local.get('cachedProspects');
    return { prospects: cachedProspects || [], cached: true };
  }
}

async function handleUpdateProspectStatus({ id, status }) {
  try {
    return await api.updateProspect(id, { status });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleGenerateEmail({ prospectId, prospectData, icpContext }) {
  // Try backend AI first, fall back to direct Gemini
  try {
    const token = await getToken();
    if (token && prospectId) {
      return await api.generateEmail(prospectId, { icp_context: icpContext });
    }
  } catch {}

  // Direct Gemini fallback
  const { generateEmail } = await import('../shared/ai.js');
  const result = await generateEmail(prospectData || {}, icpContext || '');
  return { success: true, ...result };
}

async function handleGenerateLinkedInNote({ prospectId, prospectData, icpContext }) {
  try {
    const token = await getToken();
    if (token && prospectId) {
      return await api.generateLinkedInNote(prospectId, { icp_context: icpContext });
    }
  } catch {}

  const { generateLinkedInNote } = await import('../shared/ai.js');
  const note = await generateLinkedInNote(prospectData || {}, icpContext || '');
  return { success: true, note };
}

async function handleScoreReply({ messageId, replyText }) {
  try {
    const token = await getToken();
    if (token && messageId) {
      return await api.scoreReply(messageId, replyText);
    }
  } catch {}

  const { scoreReply } = await import('../shared/ai.js');
  return await scoreReply(replyText);
}

async function handleEnrollInCampaign({ campaignId, prospectIds }) {
  return await api.launchCampaign(campaignId, prospectIds);
}

async function handleGetCampaigns() {
  try {
    return await api.getCampaigns();
  } catch {
    return { campaigns: [] };
  }
}

async function handleGetAnalytics() {
  try {
    return await api.getAnalyticsOverview();
  } catch {
    const { localStats } = await chrome.storage.local.get('localStats');
    return { stats: localStats || {} };
  }
}

async function handleScheduleFollowUp({ prospectId, delayDays }) {
  const delayMinutes = delayDays * 24 * 60;
  chrome.alarms.create(`followup_${prospectId}`, { delayInMinutes: delayMinutes });
  return { success: true };
}

// ─── Badge Update ──────────────────────────────────────────────────────────────

async function updateBadge() {
  try {
    const count = await getUnreadCount();
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch {}
}

// ─── Notification Clicks ───────────────────────────────────────────────────────

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  if (notifId.startsWith('followup_')) {
    const prospectId = notifId.replace('followup_', '');
    if (buttonIndex === 0) {
      // Open side panel or prospects page
      chrome.tabs.create({ url: `${chrome.runtime.getURL('sidepanel/index.html')}?prospect=${prospectId}` });
    } else if (buttonIndex === 1) {
      // Snooze 1 day
      chrome.alarms.create(notifId, { delayInMinutes: 24 * 60 });
    }
  }
});

// Initial badge update
updateBadge();
