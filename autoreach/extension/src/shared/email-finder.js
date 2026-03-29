/**
 * Free email discovery:
 * 1. Generates common email patterns from name + company domain
 * 2. Verifies using free APIs (disify.com — no auth required)
 */

export function extractDomain(companyWebsite) {
  if (!companyWebsite) return null;
  try {
    const url = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

export function guessDomainFromLinkedIn(linkedinCompanyUrl) {
  // LinkedIn company URLs like: linkedin.com/company/acme-corp
  // We can't reliably get the domain from just this, but we store the company name
  return null;
}

export function generateEmailPatterns(firstName, lastName, domain) {
  if (!firstName || !domain) return [];
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName ? lastName.toLowerCase().replace(/[^a-z]/g, '') : '';

  const patterns = [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}.${l[0]}@${domain}`,
    `${l}.${f}@${domain}`,
    `${f[0]}.${l}@${domain}`,
  ];

  // Remove duplicates and patterns with empty parts
  return [...new Set(patterns.filter((p) => !p.includes('@.') && !p.startsWith('.')))];
}

export async function verifyEmail(email) {
  try {
    // disify.com: free email validation, no auth required
    const res = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`);
    if (!res.ok) return { valid: false, confidence: 0 };
    const data = await res.json();
    return {
      valid: data.format && !data.disposable,
      disposable: data.disposable,
      confidence: data.format ? (data.dns ? 70 : 40) : 0,
    };
  } catch {
    return { valid: null, confidence: 0 };
  }
}

export async function findBestEmail(firstName, lastName, domain) {
  if (!firstName || !domain) return null;

  const patterns = generateEmailPatterns(firstName, lastName, domain);

  for (const email of patterns.slice(0, 3)) {
    const result = await verifyEmail(email);
    if (result.valid) {
      return { email, confidence: result.confidence, verified: true };
    }
  }

  // Fallback: return most common pattern unverified
  return {
    email: patterns[0],
    confidence: 20,
    verified: false,
  };
}

export function parseNameParts(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}
