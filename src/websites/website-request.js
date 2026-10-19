import { getAttributionPayload } from '../lib/identity.js';
import { readOrganicAttribution } from '../lib/organic-attribution.js';
import { WEBSITE_API_PATH } from '../../shared/dealer-websites-route.js';
import { WEBSITE_SMS_CONSENT, ROLE_CHOICES, PROJECT_GOAL_CHOICES } from '../../shared/dealer-websites-form.js';

const runtime = import.meta.env || {};
export const WEBSITE_REQUEST_URL = `${(runtime.VITE_CAPI_URL || runtime.VITE_CHAT_API_URL || '').replace(/\/+$/, '')}${WEBSITE_API_PATH}`;
export function newSubmissionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `sub_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
export function normalizeWebsite(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname)) return '';
    return url.toString();
  } catch { return ''; }
}
export function validateWebsiteRequest(form) {
  if (!String(form.dealershipName || '').trim()) return ['dealershipName', 'missing_dealership'];
  if (String(form.website || '').trim() && !normalizeWebsite(form.website)) return ['website', 'invalid_website'];
  if (!String(form.location || '').trim()) return ['location', 'missing_location'];
  if (!PROJECT_GOAL_CHOICES.includes(form.projectGoal)) return ['projectGoal', 'missing_project_goal'];
  if (String(form.fullName || '').trim().split(/\s+/).length < 2) return ['fullName', 'missing_full_name'];
  if (!ROLE_CHOICES.includes(form.role)) return ['role', 'missing_role'];
  if (!/^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(String(form.email || '').trim())) return ['email', 'invalid_email'];
  const rawPhone = String(form.phone || '').trim();
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits) && !(rawPhone.startsWith('+') && !digits.startsWith('1') && /^[1-9]\d{7,14}$/.test(digits))) return ['phone', 'invalid_phone'];
  return null;
}

// A server-only WebsiteRequest follows durable acceptance. This browser never emits a Lead or duplicate pixel.
export async function submitWebsiteRequest(fields, { signal } = {}) {
  const attribution = getAttributionPayload();
  const organic = readOrganicAttribution();
  const current = window.location.href;
  const response = await fetch(WEBSITE_REQUEST_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', mode: 'cors', signal,
    body: JSON.stringify({
      ...fields, website: normalizeWebsite(fields.website), smsConsentVersion: WEBSITE_SMS_CONSENT.version,
      consentTimestamp: new Date().toISOString(), userAgent: navigator.userAgent || '',
      attribution, organic_attribution: organic || {},
      landing_page: organic?.landing_page || attribution.firstTouch?.landing_page || current,
      current_page: current, current_referrer: document.referrer || '',
      referrer_url: organic?.referrer_url || attribution.firstTouch?.referrer || document.referrer || '',
      submittedVia: 'fetch',
    }),
  });
  const data = await response.json().catch(() => ({ ok: false, reason: 'bad_response' }));
  return { ...data, ok: Boolean(response.ok && data.ok), status: response.status };
}
