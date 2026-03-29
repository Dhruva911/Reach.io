/**
 * LinkedIn Content Script
 * - Profile pages: inject "Add to Reach.io" floating button + AI message button
 * - Search results: inject "Capture All Visible" banner
 * - Message compose: inject "AI Note" button
 */

(function () {
  'use strict';

  let injected = false;

  // ─── Init ────────────────────────────────────────────────────────────────────

  function init() {
    const path = window.location.pathname;

    if (path.match(/^\/in\//)) {
      injectProfileButtons();
    } else if (path.match(/^\/search\/results\//)) {
      injectSearchBanner();
    }

    // Watch for LinkedIn SPA navigation
    let lastPath = window.location.pathname;
    new MutationObserver(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        injected = false;
        setTimeout(init, 1500);
      }
    }).observe(document.body, { childList: true, subtree: true });

    // Watch for LinkedIn message compose boxes
    observeMessageCompose();
  }

  // ─── Profile Page ─────────────────────────────────────────────────────────────

  function injectProfileButtons() {
    if (injected) return;

    // Wait for profile to load
    waitForEl('h1', 3000).then(() => {
      if (injected) return;
      injected = true;

      // Floating action button (bottom-right)
      const fab = createFAB();
      document.body.appendChild(fab);

      // Inject AI message button in LinkedIn's own message/connect area
      injectConnectAreaButton();
    }).catch(() => {});
  }

  function createFAB() {
    const fab = document.createElement('div');
    fab.id = 'reach-io-fab';
    fab.innerHTML = `
      <div class="reach-fab-container">
        <button class="reach-fab-btn" id="reach-fab-main" title="Reach.io">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </button>
        <div class="reach-fab-menu" id="reach-fab-menu" style="display:none">
          <button class="reach-fab-action" id="reach-add-prospect">
            ➕ Add to Reach.io
          </button>
          <button class="reach-fab-action" id="reach-ai-email">
            ✨ Generate Email
          </button>
          <button class="reach-fab-action" id="reach-ai-linkedin">
            💬 AI Connection Note
          </button>
          <button class="reach-fab-action" id="reach-open-panel">
            📋 Open CRM Panel
          </button>
        </div>
      </div>
    `;

    injectStyles();

    // Toggle menu
    fab.querySelector('#reach-fab-main').addEventListener('click', () => {
      const menu = fab.querySelector('#reach-fab-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    // Add prospect
    fab.querySelector('#reach-add-prospect').addEventListener('click', () => {
      addCurrentProfile();
      fab.querySelector('#reach-fab-menu').style.display = 'none';
    });

    // AI email
    fab.querySelector('#reach-ai-email').addEventListener('click', () => {
      generateAndShowEmail();
      fab.querySelector('#reach-fab-menu').style.display = 'none';
    });

    // AI LinkedIn note
    fab.querySelector('#reach-ai-linkedin').addEventListener('click', () => {
      generateAndShowLinkedInNote();
      fab.querySelector('#reach-fab-menu').style.display = 'none';
    });

    // Open side panel
    fab.querySelector('#reach-open-panel').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      fab.querySelector('#reach-fab-menu').style.display = 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!fab.contains(e.target)) {
        fab.querySelector('#reach-fab-menu').style.display = 'none';
      }
    });

    return fab;
  }

  async function addCurrentProfile() {
    const profile = extractProfile();
    showToast('Adding prospect...', 'loading');

    try {
      const response = await sendMessage({ type: 'SAVE_PROSPECT', payload: profile });
      if (response.success) {
        showToast(`✓ ${profile.full_name} added to Reach.io`, 'success');
        // Show existing status on FAB
        updateFABStatus(response.prospect);
      } else {
        showToast('Failed to save prospect', 'error');
      }
    } catch (err) {
      showToast('Connection error — check backend settings', 'error');
    }
  }

  async function generateAndShowEmail() {
    const profile = extractProfile();
    const settings = await sendMessage({ type: 'GET_SETTINGS' });

    showToast('Generating personalized email...', 'loading');

    try {
      const response = await sendMessage({
        type: 'GENERATE_EMAIL',
        payload: { prospectData: profile, icpContext: settings.icpContext },
      });

      showMessageModal({
        title: '✨ AI-Generated Cold Email',
        subject: response.subject,
        body: response.body,
        actions: [
          { label: '📧 Open in Gmail', onClick: () => openGmailCompose(profile.email, response.subject, response.body) },
          { label: '📋 Copy', onClick: () => copyToClipboard(`Subject: ${response.subject}\n\n${response.body}`) },
        ],
      });
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    }
  }

  async function generateAndShowLinkedInNote() {
    const profile = extractProfile();
    const settings = await sendMessage({ type: 'GET_SETTINGS' });

    showToast('Generating LinkedIn note...', 'loading');

    try {
      const response = await sendMessage({
        type: 'GENERATE_LINKEDIN_NOTE',
        payload: { prospectData: profile, icpContext: settings.icpContext },
      });

      const note = response.note || response.message || '';

      showMessageModal({
        title: '💬 AI LinkedIn Connection Note',
        body: note,
        charCount: note.length,
        maxChars: 300,
        actions: [
          { label: '📋 Copy & Close', onClick: () => { copyToClipboard(note); injectNoteIntoLinkedIn(note); } },
        ],
      });
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    }
  }

  function injectConnectAreaButton() {
    waitForEl('.pvs-profile-actions, .pv-top-card__action-buttons, [class*="pvs-profile-actions"]', 3000)
      .then((actionsEl) => {
        if (document.getElementById('reach-connect-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'reach-connect-btn';
        btn.className = 'reach-inline-btn';
        btn.innerHTML = '<span>✨ Reach.io</span>';
        btn.addEventListener('click', () => generateAndShowLinkedInNote());
        actionsEl.appendChild(btn);
      })
      .catch(() => {});
  }

  // ─── Search Results Page ──────────────────────────────────────────────────────

  function injectSearchBanner() {
    if (document.getElementById('reach-search-banner')) return;

    waitForEl('.reusable-search__result-container, [data-chameleon-result-urn]', 4000)
      .then(() => {
        const banner = document.createElement('div');
        banner.id = 'reach-search-banner';
        banner.innerHTML = `
          <div class="reach-search-banner">
            <span class="reach-banner-logo">⚡ Reach.io</span>
            <span id="reach-prospect-count" class="reach-banner-count">
              ${document.querySelectorAll('.reusable-search__result-container, [data-chameleon-result-urn]').length} prospects visible
            </span>
            <button id="reach-capture-all" class="reach-capture-btn">
              Capture All Visible →
            </button>
          </div>
        `;

        injectStyles();

        const searchContainer = document.querySelector('.search-results-container, [class*="search-results"]');
        if (searchContainer) {
          searchContainer.insertBefore(banner, searchContainer.firstChild);
        } else {
          document.body.prepend(banner);
        }

        banner.querySelector('#reach-capture-all').addEventListener('click', captureAllSearchResults);
      })
      .catch(() => {});
  }

  async function captureAllSearchResults() {
    const prospects = extractSearchResults();
    if (!prospects.length) {
      showToast('No prospects found on this page', 'error');
      return;
    }

    const btn = document.getElementById('reach-capture-all');
    btn.textContent = `Capturing ${prospects.length}...`;
    btn.disabled = true;

    try {
      const response = await sendMessage({ type: 'SAVE_PROSPECTS_BULK', payload: prospects });
      showToast(`✓ ${response.count} prospects added to Reach.io`, 'success');
      btn.textContent = `✓ ${response.count} captured`;
    } catch (err) {
      showToast('Failed to capture prospects', 'error');
      btn.textContent = 'Capture All Visible →';
      btn.disabled = false;
    }
  }

  // ─── Message Compose Observer ─────────────────────────────────────────────────

  function observeMessageCompose() {
    new MutationObserver(() => {
      // LinkedIn connection request modal
      const connectModal = document.querySelector('[aria-label="Add a note"]');
      if (connectModal && !connectModal.dataset.reachInjected) {
        connectModal.dataset.reachInjected = 'true';
        injectAIButtonIntoTextArea(connectModal, 'connection-note');
      }

      // LinkedIn messaging
      const messageCompose = document.querySelector('.msg-form__contenteditable:not([data-reach-injected])');
      if (messageCompose) {
        messageCompose.dataset.reachInjected = 'true';
        injectAIButtonIntoTextArea(messageCompose.closest('.msg-form'), 'message');
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function injectAIButtonIntoTextArea(container, type) {
    if (!container) return;
    const btn = document.createElement('button');
    btn.className = 'reach-textarea-ai-btn';
    btn.innerHTML = '✨ AI';
    btn.title = 'Generate AI message';
    btn.addEventListener('click', async () => {
      const profile = extractProfile();
      const settings = await sendMessage({ type: 'GET_SETTINGS' });
      btn.textContent = '...';
      try {
        const response = await sendMessage({
          type: 'GENERATE_LINKEDIN_NOTE',
          payload: { prospectData: profile, icpContext: settings.icpContext },
        });
        const note = response.note || response.message || '';
        const textarea = container.querySelector('textarea, [role="textbox"], [contenteditable]');
        if (textarea) {
          if (textarea.tagName === 'TEXTAREA') {
            textarea.value = note;
          } else {
            textarea.textContent = note;
          }
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        btn.textContent = '✨ AI';
      } catch (err) {
        btn.textContent = '✨ AI';
        showToast(`AI error: ${err.message}`, 'error');
      }
    });
    container.appendChild(btn);
  }

  // ─── Data Extraction ───────────────────────────────────────────────────────────

  function extractProfile() {
    const profile = { source: 'linkedin' };

    // Name
    const nameEl = document.querySelector('h1');
    if (nameEl) profile.full_name = nameEl.textContent.trim();

    // Title
    const titleEl = document.querySelector('.text-body-medium.break-words, [class*="headline"]');
    if (titleEl) profile.title = titleEl.textContent.trim().split('\n')[0];

    // Company — from experience section button or top card
    const companyEls = document.querySelectorAll(
      'button[aria-label*="company"], [class*="primary-subtitle"], .pv-entity__secondary-title'
    );
    for (const el of companyEls) {
      const text = el.textContent.trim();
      if (text && text.length < 80) { profile.company_name = text; break; }
    }

    // Location
    const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words');
    if (locationEl) profile.location = locationEl.textContent.trim();

    // LinkedIn URL
    profile.linkedin_url = window.location.href.split('?')[0];

    // About
    const aboutSections = document.querySelectorAll('#about ~ * span[aria-hidden="true"], [class*="pv-about"] span');
    for (const el of aboutSections) {
      const text = el.textContent.trim();
      if (text.length > 50) { profile.about = text.slice(0, 500); break; }
    }

    // Recent posts
    const posts = [];
    document.querySelectorAll('[data-urn*="activity"] .feed-shared-text span, .feed-shared-update-v2__description span[dir]')
      .forEach((el) => {
        const text = el.textContent.trim();
        if (text.length > 30 && posts.length < 3) posts.push(text.slice(0, 200));
      });
    if (posts.length) profile.recent_posts = posts;

    return profile;
  }

  function extractSearchResults() {
    const results = [];
    const cards = document.querySelectorAll(
      '.reusable-search__result-container, [data-chameleon-result-urn], li[class*="result"]'
    );

    cards.forEach((card) => {
      const profile = { source: 'linkedin' };

      const nameEl = card.querySelector('[aria-hidden="true"], .entity-result__title-text span[aria-hidden]');
      if (nameEl) profile.full_name = nameEl.textContent.trim();

      const titleEl = card.querySelector('.entity-result__primary-subtitle');
      if (titleEl) profile.title = titleEl.textContent.trim();

      const companyEl = card.querySelector('.entity-result__secondary-subtitle');
      if (companyEl) profile.company_name = companyEl.textContent.trim();

      const locationEl = card.querySelector('.entity-result__tertiary-subtitle');
      if (locationEl) profile.location = locationEl.textContent.trim();

      const linkEl = card.querySelector('a[href*="/in/"]');
      if (linkEl) {
        const href = linkEl.getAttribute('href');
        const match = href.match(/\/in\/([^/?]+)/);
        if (match) {
          profile.linkedin_url = `https://www.linkedin.com/in/${match[1]}/`;
        }
      }

      if (profile.full_name) results.push(profile);
    });

    return results;
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────────

  function showToast(message, type = 'info') {
    const existing = document.getElementById('reach-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'reach-toast';
    toast.className = `reach-toast reach-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), type === 'loading' ? 30000 : 3000);
    return toast;
  }

  function showMessageModal({ title, subject, body, charCount, maxChars, actions }) {
    const existing = document.getElementById('reach-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'reach-modal';
    overlay.className = 'reach-modal-overlay';

    const charBar = charCount !== undefined
      ? `<div class="reach-char-count ${charCount > maxChars ? 'reach-char-over' : ''}">${charCount}/${maxChars} chars</div>`
      : '';

    const subjectHtml = subject ? `<div class="reach-modal-subject"><strong>Subject:</strong> ${subject}</div>` : '';

    overlay.innerHTML = `
      <div class="reach-modal">
        <div class="reach-modal-header">
          <h3>${title}</h3>
          <button class="reach-modal-close" id="reach-modal-close">✕</button>
        </div>
        <div class="reach-modal-body">
          ${subjectHtml}
          <textarea class="reach-modal-textarea" id="reach-modal-text">${body}</textarea>
          ${charBar}
        </div>
        <div class="reach-modal-actions">
          ${actions.map((a, i) => `<button class="reach-action-btn" data-action="${i}">${a.label}</button>`).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#reach-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.action);
        // Update body from textarea in case user edited
        const text = overlay.querySelector('#reach-modal-text').value;
        actions[idx].onClick(text);
        overlay.remove();
      });
    });
  }

  function updateFABStatus(prospect) {
    const fab = document.getElementById('reach-io-fab');
    if (!fab) return;
    const statusBadge = document.createElement('span');
    statusBadge.className = 'reach-fab-status';
    statusBadge.textContent = prospect.status || 'saved';
    fab.querySelector('.reach-fab-container').appendChild(statusBadge);
  }

  function openGmailCompose(to, subject, body) {
    const params = new URLSearchParams({ to: to || '', su: subject || '', body: body || '' });
    window.open(`https://mail.google.com/mail/?view=cm&${params.toString()}`, '_blank');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard', 'success'));
  }

  // ─── Styles ────────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('reach-io-styles')) return;
    const style = document.createElement('style');
    style.id = 'reach-io-styles';
    style.textContent = `
      /* FAB */
      #reach-io-fab { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: -apple-system, sans-serif; }
      .reach-fab-container { position: relative; }
      .reach-fab-btn {
        width: 48px; height: 48px; border-radius: 50%; background: #0ea5e9;
        border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(14,165,233,0.4); transition: transform 0.2s;
      }
      .reach-fab-btn:hover { transform: scale(1.08); background: #0284c7; }
      .reach-fab-menu {
        position: absolute; bottom: 56px; right: 0; background: white;
        border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        overflow: hidden; min-width: 200px;
      }
      .reach-fab-action {
        display: block; width: 100%; padding: 10px 16px; text-align: left;
        background: none; border: none; cursor: pointer; font-size: 13px; color: #1e293b;
        transition: background 0.15s;
      }
      .reach-fab-action:hover { background: #f0f9ff; }
      .reach-fab-status {
        position: absolute; top: -4px; right: -4px; background: #10b981;
        color: white; font-size: 9px; padding: 2px 5px; border-radius: 10px;
        text-transform: uppercase; font-weight: 600;
      }

      /* Inline button */
      .reach-inline-btn {
        margin-left: 8px; padding: 6px 14px; border-radius: 16px;
        background: #0ea5e9; color: white; border: none; cursor: pointer;
        font-size: 13px; font-weight: 500;
      }

      /* Search banner */
      .reach-search-banner {
        display: flex; align-items: center; gap: 12px; padding: 10px 16px;
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        color: white; border-radius: 8px; margin: 8px 0;
        font-family: -apple-system, sans-serif;
      }
      .reach-banner-logo { font-weight: 700; font-size: 14px; }
      .reach-banner-count { flex: 1; font-size: 13px; opacity: 0.9; }
      .reach-capture-btn {
        padding: 6px 16px; background: white; color: #0284c7;
        border: none; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 13px;
      }
      .reach-capture-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      /* AI button in textareas */
      .reach-textarea-ai-btn {
        padding: 4px 10px; background: #0ea5e9; color: white;
        border: none; border-radius: 12px; cursor: pointer; font-size: 12px;
        margin: 4px;
      }

      /* Toast */
      .reach-toast {
        position: fixed; bottom: 80px; right: 24px; z-index: 10000;
        padding: 10px 16px; border-radius: 8px; font-size: 13px;
        font-family: -apple-system, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 280px;
      }
      .reach-toast-success { background: #10b981; color: white; }
      .reach-toast-error   { background: #ef4444; color: white; }
      .reach-toast-info    { background: #1e293b; color: white; }
      .reach-toast-loading { background: #0ea5e9; color: white; }

      /* Modal */
      .reach-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        z-index: 10001; display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, sans-serif;
      }
      .reach-modal {
        background: white; border-radius: 16px; width: 480px; max-width: 90vw;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
      }
      .reach-modal-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
      }
      .reach-modal-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; }
      .reach-modal-close { background: none; border: none; cursor: pointer; font-size: 18px; color: #64748b; }
      .reach-modal-body { padding: 16px 20px; }
      .reach-modal-subject { font-size: 13px; margin-bottom: 10px; color: #334155; }
      .reach-modal-textarea {
        width: 100%; height: 180px; border: 1px solid #e2e8f0; border-radius: 8px;
        padding: 10px; font-size: 13px; resize: vertical; line-height: 1.5;
        color: #334155; box-sizing: border-box;
      }
      .reach-char-count { font-size: 11px; color: #64748b; margin-top: 4px; text-align: right; }
      .reach-char-over { color: #ef4444; }
      .reach-modal-actions {
        display: flex; gap: 8px; padding: 12px 20px;
        border-top: 1px solid #e2e8f0; justify-content: flex-end;
      }
      .reach-action-btn {
        padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0;
        cursor: pointer; font-size: 13px; background: white; color: #334155;
        transition: all 0.15s;
      }
      .reach-action-btn:first-child { background: #0ea5e9; color: white; border-color: #0ea5e9; }
      .reach-action-btn:hover { opacity: 0.85; }
    `;
    document.head.appendChild(style);
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────────

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  function waitForEl(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) { observer.disconnect(); resolve(found); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); reject(new Error('Timeout')); }, timeout);
    });
  }

  // ─── Start ────────────────────────────────────────────────────────────────────

  setTimeout(init, 1000);
})();
