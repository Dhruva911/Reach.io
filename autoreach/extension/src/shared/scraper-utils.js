/**
 * DOM extraction helpers for LinkedIn, Gmail, and generic websites.
 */

// --- LinkedIn Selectors ---

export function extractLinkedInProfile() {
  const profile = {};

  // Name
  const nameEl = document.querySelector('h1.text-heading-xlarge, h1[class*="inline"]');
  if (nameEl) profile.full_name = nameEl.textContent.trim();

  // Title / Headline
  const titleEl = document.querySelector('.text-body-medium.break-words, [class*="headline"]');
  if (titleEl) profile.title = titleEl.textContent.trim();

  // Location
  const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words');
  if (locationEl) profile.location = locationEl.textContent.trim();

  // Company (from experience section or top card)
  const companyEl = document.querySelector(
    '[class*="pv-text-details__right-panel"] span, .pv-entity__secondary-title, button[aria-label*="Current company"]'
  );
  if (companyEl) profile.company_name = companyEl.textContent.trim();

  // About section
  const aboutEl = document.querySelector('#about ~ div .visually-hidden, [data-generated-suggestion-target="urn:li:fs_aboutPromptContribution"], .pv-shared-text-with-see-more span[aria-hidden]');
  if (aboutEl) profile.about = aboutEl.textContent.trim().slice(0, 500);

  // LinkedIn URL
  profile.linkedin_url = window.location.href.split('?')[0];

  // Profile username/ID from URL
  const urlMatch = profile.linkedin_url.match(/linkedin\.com\/in\/([^/]+)/);
  if (urlMatch) profile.linkedin_id = urlMatch[1];

  // Extract recent posts (if on profile page with activity)
  const posts = [];
  document.querySelectorAll('[data-urn*="activity"] .feed-shared-update-v2__description span[dir]').forEach((el) => {
    const text = el.textContent.trim();
    if (text.length > 20) posts.push(text.slice(0, 200));
  });
  if (posts.length) profile.recent_posts = posts.slice(0, 3);

  // Source
  profile.source = 'linkedin';

  return profile;
}

export function extractLinkedInSearchResults() {
  const results = [];

  // People search results
  const cards = document.querySelectorAll(
    '.reusable-search__result-container, [data-chameleon-result-urn], li.reusable-search__result-container'
  );

  cards.forEach((card) => {
    const profile = {};

    // Name
    const nameEl = card.querySelector('span[aria-hidden="true"], .entity-result__title-text a span[aria-hidden]');
    if (nameEl) profile.full_name = nameEl.textContent.trim();

    // Title
    const titleEl = card.querySelector('.entity-result__primary-subtitle, [class*="primary-subtitle"]');
    if (titleEl) profile.title = titleEl.textContent.trim();

    // Company (secondary subtitle)
    const companyEl = card.querySelector('.entity-result__secondary-subtitle, [class*="secondary-subtitle"]');
    if (companyEl) profile.company_name = companyEl.textContent.trim();

    // Location
    const locationEl = card.querySelector('.entity-result__tertiary-subtitle, [class*="tertiary-subtitle"]');
    if (locationEl) profile.location = locationEl.textContent.trim();

    // Profile URL
    const linkEl = card.querySelector('a[href*="/in/"]');
    if (linkEl) {
      const href = linkEl.getAttribute('href');
      const match = href.match(/\/in\/([^/?]+)/);
      if (match) {
        profile.linkedin_url = `https://www.linkedin.com/in/${match[1]}/`;
        profile.linkedin_id = match[1];
      }
    }

    profile.source = 'linkedin';

    if (profile.full_name) results.push(profile);
  });

  return results;
}

// --- Gmail Selectors ---

export function extractGmailRecipient() {
  // In compose window
  const toField = document.querySelector('[name="to"], [data-hm="to"] [data-name="to"] input, .vO span[email]');
  if (toField) {
    const email = toField.getAttribute('email') || toField.value || toField.textContent;
    return email ? email.trim() : null;
  }
  return null;
}

export function extractGmailSenderEmail(emailThread) {
  // From an open email thread
  const senderEl = emailThread?.querySelector('[email], .gD');
  return senderEl?.getAttribute('email') || null;
}

// --- Generic Website ---

export function extractEmailsFromPage() {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const text = document.body.innerText;
  const matches = text.match(emailRegex) || [];

  // Filter out common non-contact emails
  const filtered = matches.filter(
    (e) => !e.match(/\.(png|jpg|jpeg|gif|css|js)$/i) &&
      !e.includes('example.com') &&
      !e.includes('sentry.io') &&
      !e.includes('w3.org')
  );

  return [...new Set(filtered)];
}

export function extractCompanyFromPage() {
  const company = {};

  // JSON-LD schema
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd.textContent);
      if (data['@type'] === 'Organization' || data.name) {
        company.name = data.name;
        company.description = data.description;
      }
    } catch {}
  }

  // OG tags
  if (!company.name) {
    const ogSite = document.querySelector('meta[property="og:site_name"]');
    if (ogSite) company.name = ogSite.getAttribute('content');
  }

  // Title tag fallback
  if (!company.name) {
    company.name = document.title?.split(/[-|–]/)[0]?.trim();
  }

  company.website = window.location.hostname.replace('www.', '');
  company.description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  return company;
}

// --- Helpers ---

export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
