/**
 * Generic Website Content Script
 * Extracts emails and company info from any page when user triggers via context menu.
 */

(function () {
  'use strict';

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FIND_PROSPECTS_ON_PAGE') {
      findAndShowProspects();
      sendResponse({ success: true });
    }
  });

  async function findAndShowProspects() {
    injectStyles();

    const emails = extractEmailsFromPage();
    const company = extractCompanyFromPage();

    if (!emails.length && !company.name) {
      showPanel({ message: 'No contact information found on this page.' });
      return;
    }

    showPanel({ emails, company });
  }

  function extractEmailsFromPage() {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = document.body.innerText;
    const all = text.match(emailRegex) || [];
    return [...new Set(all.filter((e) =>
      !e.match(/\.(png|jpg|jpeg|gif|css|js|svg|woff)$/i) &&
      !e.includes('example.com') &&
      !e.includes('sentry.io') &&
      !e.includes('noreply') &&
      !e.includes('w3.org') &&
      !e.includes('@2x')
    ))];
  }

  function extractCompanyFromPage() {
    const company = {};
    try {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        const data = JSON.parse(jsonLd.textContent);
        if (data.name) company.name = data.name;
        if (data.description) company.description = data.description;
      }
    } catch {}
    if (!company.name) {
      const og = document.querySelector('meta[property="og:site_name"]');
      if (og) company.name = og.getAttribute('content');
    }
    if (!company.name) {
      company.name = document.title?.split(/[-|–]/)[0]?.trim();
    }
    company.website = window.location.hostname.replace('www.', '');
    company.description = company.description ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    return company;
  }

  function showPanel({ emails = [], company = {}, message }) {
    const existing = document.getElementById('reach-website-panel');
    if (existing) { existing.remove(); return; }

    const panel = document.createElement('div');
    panel.id = 'reach-website-panel';
    panel.className = 'reach-website-panel';

    if (message) {
      panel.innerHTML = `
        <div class="reach-panel-header">
          <span>⚡ Reach.io</span>
          <button class="reach-panel-close">✕</button>
        </div>
        <p class="reach-panel-empty">${message}</p>
      `;
    } else {
      const emailItems = emails.map((email) => `
        <div class="reach-email-item">
          <span class="reach-email-addr">${email}</span>
          <button class="reach-save-email" data-email="${email}">➕ Save</button>
        </div>
      `).join('');

      panel.innerHTML = `
        <div class="reach-panel-header">
          <span>⚡ Reach.io — Found on page</span>
          <button class="reach-panel-close">✕</button>
        </div>
        ${company.name ? `<div class="reach-panel-company">🏢 ${company.name}${company.website ? ` (${company.website})` : ''}</div>` : ''}
        <div class="reach-panel-emails">
          <div class="reach-panel-label">Emails found (${emails.length})</div>
          ${emailItems || '<div class="reach-panel-empty">No emails found</div>'}
        </div>
      `;
    }

    document.body.appendChild(panel);

    panel.querySelector('.reach-panel-close').addEventListener('click', () => panel.remove());

    panel.querySelectorAll('.reach-save-email').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        btn.textContent = '...';
        const prospect = { email, company_name: company.name, company_website: company.website, source: 'website' };
        try {
          const res = await sendMessage({ type: 'SAVE_PROSPECT', payload: prospect });
          if (res.success) { btn.textContent = '✓'; btn.style.background = '#10b981'; }
          else btn.textContent = '➕ Save';
        } catch { btn.textContent = '➕ Save'; }
      });
    });
  }

  function injectStyles() {
    if (document.getElementById('reach-website-styles')) return;
    const style = document.createElement('style');
    style.id = 'reach-website-styles';
    style.textContent = `
      .reach-website-panel {
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        width: 320px; background: white; border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2); overflow: hidden;
        font-family: -apple-system, sans-serif; font-size: 13px;
      }
      .reach-panel-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; background: #0ea5e9; color: white;
        font-weight: 600; font-size: 13px;
      }
      .reach-panel-close { background: none; border: none; color: white; cursor: pointer; font-size: 16px; }
      .reach-panel-company {
        padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        font-size: 12px; color: #475569;
      }
      .reach-panel-label { padding: 8px 16px 4px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
      .reach-panel-emails { max-height: 200px; overflow-y: auto; }
      .reach-email-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 16px; border-bottom: 1px solid #f1f5f9;
      }
      .reach-email-addr { color: #334155; font-size: 12px; }
      .reach-save-email {
        padding: 3px 8px; background: #0ea5e9; color: white;
        border: none; border-radius: 8px; cursor: pointer; font-size: 11px; flex-shrink: 0;
      }
      .reach-panel-empty { padding: 16px; color: #94a3b8; text-align: center; }
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
})();
