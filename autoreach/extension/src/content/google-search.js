/**
 * Google Search Content Script
 * Detects LinkedIn profile results and adds "➕ Capture" buttons.
 */

(function () {
  'use strict';

  function init() {
    injectStyles();
    addCaptureButtons();

    // Handle Google's infinite scroll / pagination
    new MutationObserver(addCaptureButtons).observe(document.getElementById('search') || document.body, {
      childList: true,
      subtree: true,
    });
  }

  function addCaptureButtons() {
    // Find all search result links pointing to LinkedIn profiles
    document.querySelectorAll('a[href*="linkedin.com/in/"]:not([data-reach-injected])').forEach((link) => {
      link.dataset.reachInjected = 'true';

      const resultContainer = link.closest('[data-sokoban-container], .g, .MjjYud');
      if (!resultContainer || resultContainer.querySelector('.reach-capture-btn-google')) return;

      const btn = document.createElement('button');
      btn.className = 'reach-capture-btn-google';
      btn.textContent = '➕ Capture';
      btn.title = 'Add this prospect to Reach.io';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        captureFromSearchResult(resultContainer, link.href, btn);
      });

      // Insert after the link
      const titleEl = resultContainer.querySelector('h3');
      if (titleEl) {
        titleEl.style.display = 'flex';
        titleEl.style.alignItems = 'center';
        titleEl.style.gap = '8px';
        titleEl.appendChild(btn);
      } else {
        link.after(btn);
      }
    });
  }

  async function captureFromSearchResult(container, url, btn) {
    // Extract info from Google search snippet
    const prospect = { source: 'google_search', linkedin_url: url.split('?')[0] };

    const titleEl = container.querySelector('h3');
    if (titleEl) {
      const fullTitle = titleEl.textContent.replace('➕ Capture', '').trim();
      // Google search title format: "Name - Title at Company | LinkedIn"
      const parts = fullTitle.split(/\s[-–]\s/);
      if (parts.length >= 1) prospect.full_name = parts[0].trim();
      if (parts.length >= 2) {
        const subtitle = parts[1].replace(/\s*\|.*$/, '').trim();
        // "Senior Engineer at Acme Corp"
        const atMatch = subtitle.match(/^(.+?)\s+at\s+(.+)$/i);
        if (atMatch) {
          prospect.title = atMatch[1].trim();
          prospect.company_name = atMatch[2].trim();
        } else {
          prospect.title = subtitle;
        }
      }
    }

    const snippetEl = container.querySelector('.VwiC3b, .s3v9rd, [data-sncf]');
    if (snippetEl) prospect.about = snippetEl.textContent.trim().slice(0, 300);

    btn.textContent = '...';
    btn.disabled = true;

    try {
      const response = await sendMessage({ type: 'SAVE_PROSPECT', payload: prospect });
      if (response.success) {
        btn.textContent = '✓ Saved';
        btn.style.background = '#10b981';
      } else {
        btn.textContent = '➕ Capture';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = '➕ Capture';
      btn.disabled = false;
    }
  }

  function injectStyles() {
    if (document.getElementById('reach-google-styles')) return;
    const style = document.createElement('style');
    style.id = 'reach-google-styles';
    style.textContent = `
      .reach-capture-btn-google {
        display: inline-flex; align-items: center; padding: 3px 10px;
        background: #0ea5e9; color: white; border: none; border-radius: 12px;
        cursor: pointer; font-size: 11px; font-weight: 500;
        white-space: nowrap; vertical-align: middle; flex-shrink: 0;
        transition: opacity 0.2s;
      }
      .reach-capture-btn-google:hover { opacity: 0.85; }
      .reach-capture-btn-google:disabled { background: #94a3b8; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response || {});
      });
    });
  }

  init();
})();
