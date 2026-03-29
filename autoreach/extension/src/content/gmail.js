/**
 * Gmail Content Script
 * - Compose window: "✨ Reach.io" button → AI email generation
 * - Inbox: score badge overlay on emails from known prospects
 * - Email open tracking via pixel
 */

(function () {
  'use strict';

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    injectStyles();
    observeComposeWindows();
    observeInbox();
  }

  // ─── Compose Window ───────────────────────────────────────────────────────────

  function observeComposeWindows() {
    new MutationObserver(() => {
      document.querySelectorAll('.aDh:not([data-reach-injected])').forEach((toolbar) => {
        toolbar.dataset.reachInjected = 'true';
        injectComposeButton(toolbar);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function injectComposeButton(toolbar) {
    const btn = document.createElement('button');
    btn.className = 'reach-gmail-btn';
    btn.innerHTML = '✨ Reach.io';
    btn.title = 'Generate AI email with Reach.io';
    btn.addEventListener('click', () => handleComposeClick(btn));
    toolbar.appendChild(btn);
  }

  async function handleComposeClick(btn) {
    const composeWindow = btn.closest('.M9, .nH, [role="dialog"]');
    if (!composeWindow) return;

    const toInput = composeWindow.querySelector('[name="to"], .vO span[email], [data-hm="to"] span[email]');
    const recipientEmail = toInput?.getAttribute('email') || toInput?.textContent?.trim() || '';

    btn.textContent = '...';
    btn.disabled = true;

    try {
      const settings = await sendMessage({ type: 'GET_SETTINGS' });

      // Try to find prospect by email
      let prospect = null;
      if (recipientEmail) {
        try {
          const result = await sendMessage({ type: 'GET_PROSPECTS', payload: { email: recipientEmail } });
          prospect = result.prospects?.[0] || null;
        } catch {}
      }

      const prospectData = prospect || { email: recipientEmail };

      const response = await sendMessage({
        type: 'GENERATE_EMAIL',
        payload: { prospectData, icpContext: settings.icpContext },
      });

      // Insert into compose
      const subjectField = composeWindow.querySelector('[name="subjectbox"], input[placeholder*="Subject"]');
      if (subjectField && response.subject) {
        subjectField.value = response.subject;
        subjectField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const bodyField = composeWindow.querySelector('[role="textbox"][aria-label*="Message Body"], .Am.Al.editable');
      if (bodyField) {
        bodyField.innerHTML = response.body.replace(/\n/g, '<br>');
        bodyField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      btn.textContent = '✓ Done';
      setTimeout(() => {
        btn.textContent = '✨ Reach.io';
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      btn.textContent = '✨ Reach.io';
      btn.disabled = false;
      showToast(`AI error: ${err.message}`, 'error');
    }
  }

  // ─── Inbox Overlay ─────────────────────────────────────────────────────────────

  function observeInbox() {
    // Debounced scan of visible email rows
    let scanTimer;
    new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scanInboxRows, 800);
    }).observe(document.body, { childList: true, subtree: true });
  }

  async function scanInboxRows() {
    const rows = document.querySelectorAll('[role="row"]:not([data-reach-scanned])');
    if (!rows.length) return;

    // Get cached prospect emails
    const result = await sendMessage({ type: 'GET_PROSPECTS', payload: { limit: 200 } });
    const prospects = result.prospects || result.cachedProspects || [];
    const emailMap = {};
    prospects.forEach((p) => { if (p.email) emailMap[p.email.toLowerCase()] = p; });

    rows.forEach((row) => {
      row.dataset.reachScanned = 'true';
      const senderEl = row.querySelector('[email], .yX, .zF');
      const senderEmail = (senderEl?.getAttribute('email') || '').toLowerCase();
      const prospect = emailMap[senderEmail];

      if (prospect) {
        injectRowBadge(row, prospect);
      }
    });
  }

  function injectRowBadge(row, prospect) {
    if (row.querySelector('.reach-inbox-badge')) return;

    const badge = document.createElement('span');
    badge.className = `reach-inbox-badge reach-score-${getScoreLevel(prospect.lead_score)}`;
    badge.textContent = prospect.lead_score ? `${prospect.lead_score}` : prospect.status || 'tracked';
    badge.title = `Reach.io: ${prospect.full_name || 'Prospect'} — ${prospect.status || 'new'}`;

    const statusCell = row.querySelector('.xW, .yf, [role="gridcell"]:last-child');
    if (statusCell) statusCell.prepend(badge);
  }

  function getScoreLevel(score) {
    if (!score) return 'default';
    if (score >= 80) return 'hot';
    if (score >= 50) return 'warm';
    return 'cold';
  }

  // ─── Styles ────────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('reach-gmail-styles')) return;
    const style = document.createElement('style');
    style.id = 'reach-gmail-styles';
    style.textContent = `
      .reach-gmail-btn {
        margin-left: 6px; padding: 5px 12px; border-radius: 16px;
        background: #0ea5e9; color: white; border: none; cursor: pointer;
        font-size: 12px; font-weight: 500; transition: opacity 0.2s;
      }
      .reach-gmail-btn:hover { opacity: 0.85; }
      .reach-gmail-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .reach-inbox-badge {
        display: inline-block; padding: 2px 6px; border-radius: 10px;
        font-size: 10px; font-weight: 600; margin-right: 4px; vertical-align: middle;
      }
      .reach-score-hot { background: #fef2f2; color: #dc2626; }
      .reach-score-warm { background: #fff7ed; color: #d97706; }
      .reach-score-cold { background: #f0f9ff; color: #0284c7; }
      .reach-score-default { background: #f1f5f9; color: #64748b; }

      .reach-gmail-toast {
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        padding: 10px 16px; border-radius: 8px; font-size: 13px;
        font-family: -apple-system, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .reach-gmail-toast.error { background: #ef4444; color: white; }
      .reach-gmail-toast.success { background: #10b981; color: white; }
    `;
    document.head.appendChild(style);
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────────

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response || {});
      });
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `reach-gmail-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─── Start ─────────────────────────────────────────────────────────────────────

  // Gmail loads dynamically — wait a bit
  setTimeout(init, 2000);
})();
