// Paid ads page (/meta-ads-for-car-dealers/) form -> POST /api/ads-apply (the Worker route in booking/router.js).
//
// Local copies of the contact rules (lib/contact.js) and the submission id (lib/demo-application.js) on purpose,
// like src/ai/scan-request.js: importing those files from this chunk would split them out of the demo form's chunk
// and change it, and importing the AEO page's module would pull that page's copy into this one. The attribution
// helpers below already live in the main bundle, so importing them adds nothing to any other page.
import { getAttributionPayload } from '../lib/identity.js';
import { readOrganicAttribution } from '../lib/organic-attribution.js';
import { SMS_CONSENT } from '../../shared/paid-ads-content.js';
import { PAID_ADS_API_PATH } from '../../shared/paid-ads-route.js';

const RUNTIME_ENV = import.meta.env || {};
export const CAPI_URL = (RUNTIME_ENV.VITE_CAPI_URL || RUNTIME_ENV.VITE_CHAT_API_URL || '').replace(/\/+$/, '');
export const APPLY_URL = `${CAPI_URL}${PAID_ADS_API_PATH}`;

// Same rules as lib/contact.js (US/Canada numbers, or an explicit +country number).
const NANP_RE = /^[2-9]\d{2}[2-9]\d{6}$/;
const EMAIL_RE = /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export function formatPhoneInput(raw) {
  const s = String(raw ?? '');
  if (s.trim().startsWith('+')) {
    const digits = s.replace(/[^\d]/g, '').slice(0, 15);
    return digits ? `+${digits}` : '+';
  }
  let d = s.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isValidPhone(raw) {
  const s = String(raw ?? '').trim();
  const digits = s.replace(/\D/g, '');
  let nat = digits;
  if (nat.length === 11 && nat.startsWith('1')) nat = nat.slice(1);
  if (NANP_RE.test(nat)) return true;
  return s.startsWith('+') && !digits.startsWith('1') && /^[1-9]\d{7,14}$/.test(digits);
}

export function isValidEmail(raw) {
  return EMAIL_RE.test(String(raw ?? '').trim());
}

export function hasFirstAndLastName(value) {
  return typeof value === 'string' && value.trim().split(/\s+/).length >= 2;
}

// Same rule as DemoApplication.jsx: a bare domain gets https://, the host must look like a domain.
export function normalizeWebsite(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, '');
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(host)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function randomBase32(length) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// Same shape the Worker accepts for /api/apply and /api/ai-scan: sub_ + 24 base32 characters.
export function newSubmissionId() {
  return `sub_${randomBase32(24)}`;
}

// Sends the application with the same attribution payload the demo form sends, so the Worker can attribute it
// to the ad that brought the visitor. Fires no browser pixel of its own: the Worker sends the one server event
// (PaidAdsApplication), never a Lead.
export async function submitApplication({
  dealershipName,
  website,
  location,
  unitsPerMonth,
  adBudget,
  adsToday,
  fullName,
  role,
  email,
  phone,
  smsConsent,
  consentTimestamp,
  submissionId,
  company,
}) {
  const organicAttribution = readOrganicAttribution();
  const attribution = getAttributionPayload();
  const currentPage = window.location.href;
  const currentReferrer = document.referrer || '';
  const landingPage = organicAttribution?.landing_page
    || attribution.firstTouch?.landing_page || currentPage;
  const referrerUrl = organicAttribution?.referrer_url
    || attribution.firstTouch?.referrer || currentReferrer;
  const res = await fetch(APPLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    credentials: 'omit',
    body: JSON.stringify({
      dealershipName,
      website,
      location,
      unitsPerMonth,
      adBudget,
      adsToday,
      fullName,
      role,
      email,
      phone,
      smsConsent,
      smsConsentVersion: SMS_CONSENT.version,
      consentTimestamp,
      submissionId,
      company,
      userAgent: navigator.userAgent || '',
      attribution,
      organic_attribution: organicAttribution || {},
      landing_page: landingPage,
      referrer_url: referrerUrl,
      current_page: currentPage,
      current_referrer: currentReferrer,
      submittedVia: 'fetch',
    }),
  });
  const data = await res.json().catch(() => ({ ok: false, reason: 'bad_response' }));
  return { httpOk: res.ok, status: res.status, ...data, ok: Boolean(res.ok && data.ok) };
}
