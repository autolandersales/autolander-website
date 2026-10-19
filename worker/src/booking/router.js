// Demo application backend:
//   POST /api/apply -> validate lead, upsert contact in GHL, add to workflow,
//                      send the verified server Lead event, mint thank-you token.
//   POST /api/ai-scan -> store a scan request, then best-effort CRM + AIScanRequest.
//   POST /api/ads-apply -> the paid ads page's application: the same pipeline (store, CRM, Meta) under its own
//                         profile (PAID_ADS_PROFILE): KV prefix ads_apply, tag paid-ads-request, PaidAdsApplication.
//
// The browser never sees the GHL token. Lead is sent only by this backend;
// legacy confirmation tokens remain available for cached clients.

import { ACTION_SOURCE, buildEvent, sendEvents } from '../capi/meta-client.js';
import { hashEmail, hashLowercase, hashName, hashPhone, sha256Hex } from '../capi/hash.js';
import {
  bumpCounter,
  lookupVisitor,
  markEventSeen,
  pushRecentEvent,
  rememberConversionToken,
  rememberVisitor,
  wasEventSeen,
} from '../capi/storage.js';
import { looksLikeBot } from '../security/bot-filter.js';
import { AI_VISIBILITY_PATH } from '../../../shared/ai-visibility-route.js';
import {
  buildFbc,
  cleanFbclid,
  isValidFbc,
  normalizeCityForMeta,
  normalizePostalCode,
  normalizeStateForMeta,
  sanitizeAdvancedMatching,
} from '../capi/validators.js';
import { getPaySummary, openPaySession, openSelfServeSession } from './pay-proxy.js';
import { issueAttributionToken } from '../attribution/router.js';
import {
  canonicalMetaExternalId,
  isProductionMetaRequest,
} from '../../../shared/meta-signal.js';
import {
  ROLE_CHOICES as AI_SCAN_ROLE_CHOICES,
  MARKETPLACE_DEMO_URL,
  MARKETPLACE_ROUTE,
  SMS_CONSENT,
} from '../../../shared/ai-scan-form.js';
import {
  AD_BUDGET_CHOICES,
  ADS_TODAY_CHOICES,
  PAID_ADS_SMS_CONSENT,
  UNITS_CHOICES,
} from '../../../shared/paid-ads-form.js';
import { PAID_ADS_API_PATH, PAID_ADS_FORM_ID, PAID_ADS_PATH } from '../../../shared/paid-ads-route.js';
import { PROJECT_GOAL_CHOICES, WEBSITE_SMS_CONSENT } from '../../../shared/dealer-websites-form.js';
import { WEBSITE_API_PATH, WEBSITE_ERROR_ID, WEBSITE_PATH, WEBSITE_SUCCESS_ID } from '../../../shared/dealer-websites-route.js';

const ROLE_CHOICES = ['Owner', 'Manager', 'Sales Rep'];
const VEHICLE_COUNT_CHOICES = ['1-50', '51-150', '151+'];
const APPLY_IP_HOURLY = 12;
const APPLY_IP_DAILY = 30;
const APPLY_SUBMISSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const AI_SCAN_IP_HOURLY = 12;
const AI_SCAN_IP_DAILY = 30;
const AI_SCAN_EMAIL_DAILY = 3;
const AI_SCAN_TTL_SECONDS = 90 * 24 * 60 * 60;
const AI_SCAN_SUBMISSION_PATTERN = /^sub_[a-z0-9_-]{12,80}$/i;
// The no-JS form's 303 targets: the page's current URL, so a native POST lands in one hop.
const AI_SCAN_FORM_SUCCESS_URL = `https://autolander.ai${AI_VISIBILITY_PATH}?sent=1#scan-form`;
const AI_SCAN_FORM_ERROR_URL = `https://autolander.ai${AI_VISIBILITY_PATH}?error=`;

// One pipeline, two forms. The AEO page's free scan (/api/ai-scan) and the paid ads page's application
// (/api/ads-apply) share the store -> CRM -> Meta flow in handleAiScan; a profile carries everything that differs
// (storage and rate-limit key prefixes, the no-JS redirects, the role and choice lists, the consent text, the CRM
// source, tags and note title, and the Meta event). AI_SCAN_PROFILE is the default everywhere, so the scan route
// behaves exactly as before.
const AI_SCAN_PROFILE = {
  id: 'ai-scan',
  log: '[api/ai-scan]',
  kv: 'ai_scan',
  rate: 'ai_scan',
  eventIdPrefix: 'aiscan',
  eventIdSalt: 'ai-scan',
  successUrl: AI_SCAN_FORM_SUCCESS_URL,
  errorUrl: AI_SCAN_FORM_ERROR_URL,
  anchor: '#scan-form',
  killSwitch: 'AI_SCAN_PUBLIC_ROUTE',
  capiSwitch: 'SEND_WORKER_AI_SCAN_CAPI',
  roles: AI_SCAN_ROLE_CHOICES,
  consent: SMS_CONSENT,
  extra: [],
  crmSource: 'AutoLander AI Visibility scan',
  tag: 'ai-scan-request',
  smsTag: 'ai-scan-sms-ok',
  noteTitle: 'AutoLander AI Visibility scan request',
  eventName: 'AIScanRequest',
  eventSource: 'ai_visibility_scan',
  customData: { content_name: 'ai_visibility_scan_requested', content_category: 'ai_visibility' },
};
// Extra required choice fields are validated in this order (after the store fields, before the person's).
const PAID_ADS_PROFILE = {
  id: 'paid-ads',
  log: '[api/ads-apply]',
  kv: 'ads_apply',
  rate: 'ads_apply',
  eventIdPrefix: 'adsapply',
  eventIdSalt: 'ads-apply',
  successUrl: `https://autolander.ai${PAID_ADS_PATH}?sent=1#${PAID_ADS_FORM_ID}`,
  errorUrl: `https://autolander.ai${PAID_ADS_PATH}?error=`,
  anchor: `#${PAID_ADS_FORM_ID}`,
  killSwitch: 'PAID_ADS_PUBLIC_ROUTE',
  capiSwitch: 'SEND_WORKER_PAID_ADS_CAPI',
  roles: AI_SCAN_ROLE_CHOICES,
  consent: PAID_ADS_SMS_CONSENT,
  extra: [
    { key: 'unitsPerMonth', label: 'Units sold a month', choices: UNITS_CHOICES, reason: 'missing_units' },
    { key: 'adBudget', label: 'Monthly ad budget', choices: AD_BUDGET_CHOICES, reason: 'missing_ad_budget' },
    { key: 'adsToday', label: 'Ads today', choices: ADS_TODAY_CHOICES, reason: 'missing_ads_today' },
  ],
  crmSource: 'AutoLander Paid Ads application',
  tag: 'paid-ads-request',
  smsTag: 'paid-ads-sms-ok',
  noteTitle: 'AutoLander paid ads application (free commercial or ad review)',
  eventName: 'PaidAdsApplication',
  eventSource: 'paid_ads_application',
  customData: { content_name: 'paid_ads_application_requested', content_category: 'paid_ads' },
};
// Dealership websites (/dealership-websites/): the same pipeline as the scan and the paid-ads application, under its
// own KV / rate / event / tag names. The website field is optional (a dealer may have none yet).
const WEBSITE_PROFILE = {
  id: 'dealer-websites',
  log: '[api/website-request]',
  kv: 'website_request',
  rate: 'website_request',
  eventIdPrefix: 'websiterequest',
  eventIdSalt: 'website-request',
  successUrl: `https://autolander.ai${WEBSITE_PATH}?sent=1#${WEBSITE_SUCCESS_ID}`,
  errorUrl: `https://autolander.ai${WEBSITE_PATH}?error=`,
  anchor: `#${WEBSITE_ERROR_ID}`,
  killSwitch: 'WEBSITE_REQUEST_PUBLIC_ROUTE',
  capiSwitch: 'SEND_WORKER_WEBSITE_REQUEST_CAPI',
  roles: AI_SCAN_ROLE_CHOICES,
  consent: WEBSITE_SMS_CONSENT,
  websiteOptional: true,
  extra: [{ key: 'projectGoal', label: 'Website project', choices: PROJECT_GOAL_CHOICES, reason: 'missing_project_goal' }],
  crmSource: 'AutoLander website project request',
  tag: 'website-request',
  smsTag: 'website-sms-ok',
  noteTitle: 'AutoLander dealership website project request',
  eventName: 'WebsiteRequest',
  eventSource: 'website_request',
  customData: { content_name: 'dealership_website_requested', content_category: 'dealer_websites' },
};
export const LEAD_FORM_PROFILES = { aiScan: AI_SCAN_PROFILE, paidAds: PAID_ADS_PROFILE, websites: WEBSITE_PROFILE };
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

const ATTR_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'campaign_id',
  'adset_id',
  'ad_id',
  'campaign_name',
  'adset_name',
  'ad_name',
  'placement',
  'site_source_name',
];

const CUSTOM_FIELD_KEYS = [
  'fullName',
  'dealershipName',
  'role',
  'inventoryUrl',
  'vehicleCount',
  'smsConsent',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'campaign_id',
  'adset_id',
  'ad_id',
  'placement',
  'site_source_name',
  'fbclid',
  'fbc',
  'fbp',
  'landingPageUrl',
  'landing_page',
  'consentSourceUrl',
  'referrer',
  'referrer_url',
  'clientIpAddress',
  'userAgent',
  'consentTimestamp',
  'consentTextVersion',
  'submissionTimestamp',
  'metaEventId',
  'visitorId',
  'submissionId',
];

const AI_SCAN_CUSTOM_FIELD_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'campaign_id',
  'adset_id',
  'ad_id',
  'placement',
  'site_source_name',
  'fbclid',
  'fbc',
  'fbp',
  'landingPageUrl',
  'landing_page',
  'referrer',
  'referrer_url',
  'clientIpAddress',
  'userAgent',
  'submissionTimestamp',
  'visitorId',
];

const CONSENT_TEXT_VERSION = 'demo-sms-consent-v1-2026-06-29';

const DEFAULT_CUSTOM_FIELD_KEY_MAP = {
  role: 'contact.role',
  inventoryUrl: 'contact.dealership_website',
  vehicleCount: 'contact.inventory_size',
  smsConsent: 'contact.text_reminders_optin',
  utm_source: 'contact.utm_source',
  utm_medium: 'contact.utm_medium',
  utm_campaign: 'contact.utm_campaign',
  utm_content: 'contact.utm_content',
  utm_term: 'contact.utm_term',
  campaign_id: 'contact.campaign_id',
  adset_id: 'contact.adset_id',
  ad_id: 'contact.ad_id',
  placement: 'contact.placement',
  site_source_name: 'contact.site_source_name',
  fbclid: 'contact.facebook_click_id',
  fbc: 'contact.fbc',
  fbp: 'contact.fbp',
  landingPageUrl: 'contact.event_source_url',
  consentSourceUrl: 'contact.consent_source_url',
  clientIpAddress: 'contact.client_ip_address',
  userAgent: 'contact.client_user_agent',
  consentTimestamp: 'contact.consent_timestamp',
  consentTextVersion: 'contact.consent_text_version',
  submissionTimestamp: 'contact.submission_timestamp',
  submissionId: 'contact.external_id',
};

export async function handleBooking(request, env, corsHeaders, ctx) {
  const url = new URL(request.url);

  if (url.pathname === '/api/apply' && request.method === 'POST') {
    return handleApply(request, env, corsHeaders, ctx);
  }

  if (url.pathname === '/api/ai-scan' && request.method === 'POST') {
    return handleAiScan(request, env, corsHeaders, ctx, AI_SCAN_PROFILE);
  }

  if (url.pathname === PAID_ADS_API_PATH && request.method === 'POST') {
    return handleAiScan(request, env, corsHeaders, ctx, PAID_ADS_PROFILE);
  }

  if (url.pathname === WEBSITE_API_PATH && request.method === 'POST') {
    return handleAiScan(request, env, corsHeaders, ctx, WEBSITE_PROFILE);
  }

  if (url.pathname === '/api/availability' || url.pathname === '/api/book') {
    return json(
      { ok: false, reason: 'calendar_disabled', message: 'Demo applications now use /api/apply.' },
      410,
      corsHeaders,
    );
  }

  // Centralized billing-link pay pages — public, proxied straight to the
  // cloud (packages/cloud owns the CheckoutRequest record + Stripe calls).
  // Order matters: /api/pay/self-serve must be checked before the generic
  // /api/pay/:token pattern so the literal path never gets treated as a token.
  if (url.pathname === '/api/pay/self-serve' && request.method === 'POST') {
    const result = await openSelfServeSession(env, request);
    return json(result.body, result.status, corsHeaders);
  }

  const payTokenMatch = url.pathname.match(/^\/api\/pay\/([^/]+)$/);
  if (payTokenMatch && request.method === 'GET') {
    const result = await getPaySummary(env, decodeURIComponent(payTokenMatch[1]), {
      sessionId: url.searchParams.get('session_id') || '',
    });
    return json(result.body, result.status, corsHeaders);
  }

  const paySessionMatch = url.pathname.match(/^\/api\/pay\/([^/]+)\/session$/);
  if (paySessionMatch && request.method === 'POST') {
    const result = await openPaySession(env, request, decodeURIComponent(paySessionMatch[1]));
    return json(result.body, result.status, corsHeaders);
  }

  return json({ ok: false, reason: 'not_found' }, 404, corsHeaders);
}

// Kept for the Worker scheduled handler during deployments where the cron is
// still configured. No calendar cache is needed for the application flow.
export async function syncAvailability() {
  return { ok: true, disabled: true };
}

async function handleAiScan(request, env, corsHeaders, ctx, profile = AI_SCAN_PROFILE) {
  const formMode = isAiScanFormRequest(request);
  if (env[profile.killSwitch] === 'off') {
    return aiScanFailure('unavailable', 503, corsHeaders, formMode, profile);
  }

  const body = await parseAiScanBody(request, formMode);
  let submissionId = clean(body.submissionId, 96);
  if (formMode && !AI_SCAN_SUBMISSION_PATTERN.test(submissionId)) {
    submissionId = newAiScanSubmissionId();
  }

  const honeypot = clean(body.company, 200)
    || clean(body.al_hp_q, 200)
    || clean(body.al_hp_x7, 200);
  if (honeypot) {
    if (!AI_SCAN_SUBMISSION_PATTERN.test(submissionId)) {
      submissionId = newAiScanSubmissionId();
    }
    let replay;
    try {
      replay = await readAiScanRequest(env, submissionId, profile);
    } catch {
      return aiScanFailure('unavailable', 503, corsHeaders, formMode, profile);
    }
    const saved = savedAiScanResponse(replay);
    if (saved) return aiScanSuccess(saved, true, corsHeaders, formMode, profile);

    const receivedAt = new Date().toISOString();
    const eventId = await aiScanEventId(submissionId, profile);
    const fields = await collectAiScanFields(body, request, env, formMode, receivedAt, profile);
    const response = { ok: true, duplicate: false, submissionId, eventId };
    const record = buildAiScanRecord({
      fields,
      submissionId,
      eventId,
      receivedAt,
      status: 'spam',
      crm: 'skipped',
      response,
    });
    const committed = await commitAiScanRequest(env, record, profile);
    if (!committed) return aiScanFailure('unavailable', 503, corsHeaders, formMode, profile);
    return aiScanSuccess(response, false, corsHeaders, formMode, profile);
  }

  // A salesperson after AutoLander's Facebook Marketplace posting software is not a scan lead (Michael,
  // 2026-10-01): the no-JS form lands on the product demo; the JSON caller gets a reason it can show.
  // Nothing is stored and nothing reaches the CRM.
  if (clean(body.role, 120) === MARKETPLACE_ROUTE.value) {
    if (formMode) return aiScanRedirect(MARKETPLACE_DEMO_URL, corsHeaders);
    return json({ ok: false, reason: 'marketplace_demo', demoUrl: MARKETPLACE_DEMO_URL }, 400, corsHeaders);
  }

  if (!AI_SCAN_SUBMISSION_PATTERN.test(submissionId)) {
    return aiScanFailure('invalid_submission', 400, corsHeaders, formMode, profile);
  }

  let replay;
  try {
    replay = await readAiScanRequest(env, submissionId, profile);
  } catch {
    return aiScanFailure('unavailable', 503, corsHeaders, formMode, profile);
  }
  const saved = savedAiScanResponse(replay);
  if (saved) return aiScanSuccess(saved, true, corsHeaders, formMode, profile);

  const limited = await enforceApplyRateLimit(request, env, {
    aiScanEmail: clean(body.email, 160),
    rateKeyPrefix: profile.rate,
  });
  if (!limited.ok) return aiScanFailure('rate_limited', 429, corsHeaders, formMode, profile);

  const receivedAt = new Date().toISOString();
  const fields = await collectAiScanFields(body, request, env, formMode, receivedAt, profile);
  const invalidReason = validateAiScanFields(fields, profile);
  if (invalidReason) return aiScanFailure(invalidReason, 400, corsHeaders, formMode, profile);

  const eventId = await aiScanEventId(submissionId, profile);
  const response = { ok: true, duplicate: false, submissionId, eventId };
  let record = buildAiScanRecord({
    fields,
    submissionId,
    eventId,
    receivedAt,
    status: 'received',
    crm: 'pending',
    response,
  });
  const committed = await commitAiScanRequest(env, record, profile);
  if (!committed) return aiScanFailure('unavailable', 503, corsHeaders, formMode, profile);

  try {
    record = await syncAiScanRequestToCrm(env, record, profile);
  } catch {
    record = { ...record, crm: 'failed' };
  }
  await writeAiScanRequest(env, record, profile).catch(() => {});

  await recordAiScanEvent({ request, env, ctx, record, profile }).catch((err) => {
    console.error(`${profile.log} Meta event failed`, String(err?.message || err).slice(0, 120));
  });

  return aiScanSuccess(response, false, corsHeaders, formMode, profile);
}

function isAiScanFormRequest(request) {
  return /^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(
    request.headers.get('Content-Type') || '',
  );
}

async function parseAiScanBody(request, formMode) {
  if (formMode) {
    try {
      return Object.fromEntries(await request.formData());
    } catch {
      return {};
    }
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return {};
  }
  const parsed = await safeJson(request);
  return isPlainObject(parsed) ? parsed : {};
}

function parseAiScanFormObject(value) {
  if (isPlainObject(value)) return value;
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function aiScanSuccess(saved, duplicate, headers, formMode, profile = AI_SCAN_PROFILE) {
  if (formMode) return aiScanRedirect(profile.successUrl, headers);
  return json({ ...saved, duplicate }, 200, headers);
}

function aiScanFailure(reason, status, headers, formMode, profile = AI_SCAN_PROFILE) {
  if (formMode) {
    const location = `${profile.errorUrl}${encodeURIComponent(reason)}${profile.anchor}`;
    return aiScanRedirect(location, headers);
  }
  return json({ ok: false, reason }, status, headers);
}

function aiScanRedirect(location, headers) {
  return new Response(null, {
    status: 303,
    headers: { ...headers, Location: location, 'Cache-Control': 'no-store' },
  });
}

function newAiScanSubmissionId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (const byte of bytes) suffix += alphabet[byte & 31];
  return `sub_${suffix}`;
}

async function aiScanEventId(submissionId, profile = AI_SCAN_PROFILE) {
  return `${profile.eventIdPrefix}_${(await sha256Hex(`${profile.eventIdSalt}:${submissionId}`)).slice(0, 32)}`;
}

async function collectAiScanFields(body, request, env, formMode, receivedAt, profile = AI_SCAN_PROFILE) {
  const parsedName = splitFullName({ fullName: body.fullName });
  const phoneInput = clean(body.phone, 40);
  const phoneNorm = normalizePhone(phoneInput);
  const attributionInput = formMode ? parseAiScanFormObject(body.attribution) : body.attribution;
  const organicInput = formMode
    ? parseAiScanFormObject(body.organic_attribution)
    : body.organic_attribution;
  const attribution = sanitizeAttribution(attributionInput);
  const organicUtms = cleanUtms(organicInput);
  const visitor = attribution.vid
    ? await lookupVisitor(env, attribution.vid).catch(() => null)
    : null;
  const mergedUtms = mergeUtms(visitor?.utms, attribution.utms);
  const ghlUtms = mergeUtms(organicUtms, mergeUtms(attribution.firstTouch, mergedUtms));
  ghlUtms.utm_source ||= 'direct';
  ghlUtms.utm_medium ||= 'none';
  const page = { ...(visitor?.page || {}), ...(attribution.page || {}) };
  const fbp = attribution.fbp || visitor?.fbp || '';
  const fbclid = cleanFbclid(attribution.fbclid || visitor?.fbclid);
  const clickTimestamp = attributionTimestampSeconds(
    attribution.ts || visitor?.firstTouch?.ts || visitor?.ts,
  );
  const visitorFbc = isValidFbc(visitor?.fbc) ? visitor.fbc : '';
  const fbc = attribution.fbc || visitorFbc || buildFbc(fbclid, clickTimestamp);
  const currentPage = clean(body.current_page, 500)
    || clean(page.current_page, 500)
    || clean(request.headers.get('Referer'), 500);
  const landingPageUrl = clean(page.landing_page, 500) || currentPage;
  const referrer = clean(page.referrer, 240);
  const landingPage = clean(body.landing_page, 500)
    || clean(organicInput?.landing_page, 500)
    || clean(attribution.firstTouch?.landing_page, 500)
    || landingPageUrl;
  const referrerUrl = clean(body.referrer_url, 1200)
    || clean(organicInput?.referrer_url, 1200)
    || clean(attribution.firstTouch?.referrer, 1200)
    || referrer
    || clean(body.current_referrer, 1200)
    || clean(request.headers.get('Referer'), 1200);
  const smsConsent = formMode
    ? body.smsConsent === 'on' || body.smsConsent === 'true'
    : body.smsConsent === true;
  const country = clean(request.cf?.country, 4).toLowerCase();
  const region = clean(request.cf?.region, 48).toLowerCase();
  const regionCode = clean(request.cf?.regionCode, 8);
  const city = clean(request.cf?.city, 48).toLowerCase();
  const postalCode = normalizePostalCode(request.cf?.postalCode, country)
    || normalizePostalCode(visitor?.postalCode, visitor?.country);

  return {
    dealershipName: clean(body.dealershipName, 160),
    website: normalizeWebsite(body.website),
    ...(profile.websiteOptional ? { websiteProvided: typeof body.website === 'string'
      ? Boolean(clean(body.website, 240)) : body.website !== undefined && body.website !== null } : {}),
    location: clean(body.location, 80),
    fullName: parsedName.fullName,
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    role: clean(body.role, 80),
    email: clean(body.email, 160),
    phone: phoneNorm.ok ? phoneNorm.e164 : phoneInput,
    phonePretty: phoneNorm.pretty,
    phoneValid: phoneNorm.ok,
    smsConsent,
    ...(smsConsent ? {
      consent: {
        text: profile.consent.text,
        version: profile.consent.version,
        timestamp: normalizeIso(body.consentTimestamp) || receivedAt,
      },
    } : {}),
    ...Object.fromEntries(profile.extra.map((field) => [field.key, clean(body[field.key], 80)])),
    userAgent: clean(body.userAgent, 500) || clean(request.headers.get('User-Agent'), 500),
    submittedVia: clean(body.submittedVia, 80),
    attribution: {
      ...attribution,
      utms: mergedUtms,
      page,
      fbp,
      fbc,
      fbclid,
      ts: clickTimestamp,
    },
    vid: attribution.vid,
    organic_attribution: {
      ...organicUtms,
      landing_page: clean(organicInput?.landing_page, 500),
      referrer_url: clean(organicInput?.referrer_url, 1200),
    },
    utms: mergedUtms,
    ghlUtms,
    fbp,
    fbc,
    fbclid,
    landingPageUrl,
    landing_page: landingPage,
    referrer,
    referrer_url: referrerUrl,
    current_page: currentPage,
    current_referrer: clean(body.current_referrer, 1200),
    clientIpAddress: clean(request.headers.get('CF-Connecting-IP'), 80),
    receivedAt,
    submissionTimestamp: receivedAt,
    country,
    region,
    regionCode,
    city,
    postalCode,
  };
}

function validateAiScanFields(fields, profile = AI_SCAN_PROFILE) {
  if (!fields.dealershipName) return 'missing_dealership';
  if (!fields.website && (!profile.websiteOptional || fields.websiteProvided)) return 'invalid_website';
  if (profile.websiteOptional && fields.website) {
    const website = new URL(fields.website);
    if (website.username || website.password || website.port) return 'invalid_website';
  }
  if (!fields.location) return 'missing_location';
  for (const field of profile.extra) {
    if (!field.choices.includes(fields[field.key])) return field.reason;
  }
  if (!fields.fullName || !fields.firstName || !fields.lastName) return 'missing_full_name';
  if (!profile.roles.includes(fields.role)) return 'missing_role';
  if (!isEmail(fields.email)) return 'invalid_email';
  if (!fields.phoneValid) return 'invalid_phone';
  return '';
}

function buildAiScanRecord({ fields, submissionId, eventId, receivedAt, status, crm, response }) {
  const storedFields = { ...fields };
  delete storedFields.phoneValid;
  delete storedFields.websiteProvided;
  return {
    ...storedFields,
    submissionId,
    status,
    crm,
    eventId,
    receivedAt,
    response,
  };
}

function savedAiScanResponse(record) {
  if (!isPlainObject(record) || !isPlainObject(record.response) || !record.response.ok) return null;
  return {
    ok: true,
    duplicate: false,
    submissionId: clean(record.response.submissionId, 96),
    eventId: clean(record.response.eventId, 80),
  };
}

async function readAiScanRequest(env, submissionId, profile = AI_SCAN_PROFILE) {
  if (!env.TRACKING) throw new Error('TRACKING KV binding is missing');
  if (!submissionId) return null;
  return env.TRACKING.get(`${profile.kv}:req:${submissionId}`, 'json');
}

async function commitAiScanRequest(env, record, profile = AI_SCAN_PROFILE) {
  if (!env.TRACKING) return false;
  try {
    await writeAiScanRequest(env, record, profile);
  } catch {
    return false;
  }

  try {
    const day = isoDay(new Date(record.receivedAt));
    const key = `${profile.kv}:index:${day}`;
    const current = await env.TRACKING.get(key, 'json');
    const submissionIds = Array.isArray(current) ? current.filter((value) => typeof value === 'string') : [];
    if (!submissionIds.includes(record.submissionId)) submissionIds.push(record.submissionId);
    await env.TRACKING.put(key, JSON.stringify(submissionIds), {
      expirationTtl: AI_SCAN_TTL_SECONDS,
    });
  } catch {
    console.error(`${profile.log} daily index write failed`);
  }
  return true;
}

async function writeAiScanRequest(env, record, profile = AI_SCAN_PROFILE) {
  if (!env.TRACKING) throw new Error('TRACKING KV binding is missing');
  await env.TRACKING.put(`${profile.kv}:req:${record.submissionId}`, JSON.stringify(record), {
    expirationTtl: AI_SCAN_TTL_SECONDS,
  });
}

async function aiScanRateHash(env, label, value) {
  const secret = typeof env.AI_SCAN_HASH_KEY === 'string' ? env.AI_SCAN_HASH_KEY : '';
  if (!secret) return sha256Hex(`ai-scan-rate-fallback:${label}:${value}`);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${label}:${value}`));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function handleApply(request, env, corsHeaders, ctx) {
  if (looksLikeBot(request).bot) {
    return json({ ok: false, reason: 'blocked' }, 403, corsHeaders);
  }

  const body = await safeJson(request);
  const honeypot = clean(body.company, 200);
  if (honeypot) return json({ ok: false, reason: 'blocked' }, 403, corsHeaders);
  const submissionId = clean(body.submissionId, 96);

  if (!/^sub_[a-z0-9_-]{12,80}$/i.test(submissionId)) {
    return json({ ok: false, reason: 'invalid_submission' }, 400, corsHeaders);
  }

  let applyState = await readApplySubmission(env, submissionId);
  if (applyState?.ok) {
    return json({ ...applyState, duplicate: true }, 200, corsHeaders);
  }

  if (!applyState) {
    const limited = await enforceApplyRateLimit(request, env);
    if (!limited.ok) {
      return json({ ok: false, reason: 'rate_limited' }, 429, corsHeaders);
    }
  }

  const config = ghlConfig(env);
  if (!config.ok) {
    return json({ ok: false, reason: 'ghl_not_configured', missing: config.missing }, 503, corsHeaders);
  }

  const parsedName = splitFullName({
    fullName: body.fullName,
    firstName: body.firstName,
    lastName: body.lastName,
  });
  const { fullName, firstName, lastName } = parsedName;
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const phoneNorm = normalizePhone(phone);
  const dealershipName = clean(body.dealershipName, 160);
  const role = clean(body.role, 40);
  const inventoryUrl = normalizeWebsite(body.inventoryUrl);
  const vehicleCount = clean(body.vehicleCount, 24);
  const smsConsent = body.smsConsent === true;
  const consentTimestamp = normalizeIso(body.consentTimestamp);
  const submissionTimestamp = new Date().toISOString();
  const userAgent = clean(body.userAgent, 500) || clean(request.headers.get('User-Agent'), 500);
  const organicLandingPage = clean(body.organic_attribution?.landing_page, 500)
    || clean(body.landing_page, 500);
  const organicReferrerUrl = clean(body.organic_attribution?.referrer_url, 1200)
    || clean(body.referrer_url, 1200);
  const metaTestEventCode = qaTestEventCode(new URL(request.url), body, env);

  if (!fullName) return json({ ok: false, reason: 'missing_full_name' }, 400, corsHeaders);
  if (!isEmail(email)) return json({ ok: false, reason: 'invalid_email' }, 400, corsHeaders);
  if (!phoneNorm.ok) return json({ ok: false, reason: 'invalid_phone' }, 400, corsHeaders);
  if (!ROLE_CHOICES.includes(role)) return json({ ok: false, reason: 'missing_role' }, 400, corsHeaders);
  if (!inventoryUrl) return json({ ok: false, reason: 'invalid_inventory_url' }, 400, corsHeaders);
  if (!vehicleCount) {
    return json({ ok: false, reason: 'missing_vehicle_count' }, 400, corsHeaders);
  }
  if (!VEHICLE_COUNT_CHOICES.includes(vehicleCount)) {
    return json({ ok: false, reason: 'invalid_vehicle_count' }, 400, corsHeaders);
  }
  if (!consentTimestamp) {
    return json({ ok: false, reason: 'missing_consent_timestamp' }, 400, corsHeaders);
  }

  const attribution = sanitizeAttribution(body.attribution);
  const organicUtms = cleanUtms(body.organic_attribution);
  const visitor = attribution.vid ? await lookupVisitor(env, attribution.vid).catch(() => null) : null;
  const country = clean(request.cf?.country, 4).toLowerCase();
  const region = clean(request.cf?.region, 48).toLowerCase();
  const regionCode = clean(request.cf?.regionCode, 8);
  const city = clean(request.cf?.city, 48).toLowerCase();
  const postalCode = normalizePostalCode(request.cf?.postalCode, country)
    || normalizePostalCode(visitor?.postalCode, visitor?.country);
  const mergedUtms = mergeUtms(visitor?.utms, attribution.utms);
  // Keep the established attribution/CAPI payload untouched. Organic inference is
  // a GHL-only fallback, and the existing URL/cookie values always win per field.
  const ghlUtms = mergeUtms(organicUtms, mergeUtms(attribution.firstTouch, mergedUtms));
  ghlUtms.utm_source ||= 'direct';
  ghlUtms.utm_medium ||= 'none';
  const page = { ...(visitor?.page || {}), ...(attribution.page || {}) };
  const fbp = attribution.fbp || visitor?.fbp || '';
  const fbclid = cleanFbclid(attribution.fbclid || visitor?.fbclid);
  const clickTimestamp = attributionTimestampSeconds(
    attribution.ts || visitor?.firstTouch?.ts || visitor?.ts,
  );
  const visitorFbc = isValidFbc(visitor?.fbc) ? visitor.fbc : '';
  const fbc = attribution.fbc || visitorFbc || buildFbc(fbclid, clickTimestamp);
  const eventId = `lead_${(await sha256Hex(`lead:${submissionId}`)).slice(0, 32)}`;
  const metaExternalId = canonicalMetaExternalId(env.META_PIXEL_ID, attribution.vid);
  const sourceUrl = clean(body.current_page, 500) || clean(page.current_page, 500)
    || clean(request.headers.get('Referer'), 500);
  const landingPageUrl = clean(page.landing_page, 500) || sourceUrl;
  const referrer = clean(page.referrer, 240);
  const firstLandingPage = organicLandingPage || clean(attribution.firstTouch?.landing_page, 500)
    || landingPageUrl;
  const firstReferrerUrl = organicReferrerUrl || clean(attribution.firstTouch?.referrer, 1200)
    || referrer || clean(body.current_referrer, 1200) || clean(request.headers.get('Referer'), 1200);
  const clientIpAddress = clean(request.headers.get('CF-Connecting-IP'), 80);

  const lead = {
    fullName,
    firstName,
    lastName,
    email,
    phone: phoneNorm.e164,
    phonePretty: phoneNorm.pretty,
    dealershipName,
    role,
    inventoryUrl,
    vehicleCount,
    smsConsent,
    consentTimestamp,
    submissionTimestamp,
    submissionId,
    userAgent,
    vid: attribution.vid,
    fbp,
    fbc,
    fbclid,
    landingPageUrl,
    landing_page: firstLandingPage,
    referrer,
    referrer_url: firstReferrerUrl,
    clientIpAddress,
    eventId,
    utms: mergedUtms,
    ghlUtms,
  };

  let contactId = clean(applyState?.contactId, 120);
  if (!contactId) {
    const upsert = await upsertGhlContact(env, config, lead);
    if (!upsert.ok) {
      console.error('[api/apply] GHL upsert failed', upsert.status, upsert.detail);
      return json({ ok: false, reason: 'ghl_upsert_failed' }, 502, corsHeaders);
    }

    contactId = extractContactId(upsert.body);
  }
  if (!contactId) {
    console.error('[api/apply] GHL upsert returned no contact id');
    return json({ ok: false, reason: 'ghl_contact_id_missing' }, 502, corsHeaders);
  }
  lead.externalId = contactId;
  applyState = await rememberApplySubmissionProgress(env, submissionId, {
    status: 'contact_upserted',
    submissionId,
    eventId,
    contactId,
  }, applyState);

  if (!applyState?.customFieldsUpdated) {
    const customFields = await updateGhlContactCustomFields(env, config, contactId, lead);
    if (!customFields.ok) {
      console.error('[api/apply] GHL custom fields update failed', customFields.status, customFields.detail);
      if (env.REQUIRE_GHL_CUSTOM_FIELDS === 'true') {
        return json({ ok: false, reason: 'ghl_custom_fields_failed' }, 502, corsHeaders);
      }
    } else {
      applyState = await rememberApplySubmissionProgress(env, submissionId, {
        status: 'custom_fields_updated',
        customFieldsUpdated: true,
      }, applyState);
    }
  }

  const alreadyRecorded = await wasEventSeen(env, eventId).catch(() => false);
  let noteId = clean(applyState?.noteId, 120);
  if (!alreadyRecorded && !applyState?.applicationNoteWritten) {
    const note = await createGhlApplicationNote(env, config, contactId, lead);
    if (!note.ok) {
      console.error('[api/apply] GHL application note failed', note.status, note.detail);
      if (env.REQUIRE_GHL_APPLICATION_NOTE === 'true') {
        return json({ ok: false, reason: 'ghl_note_failed' }, 502, corsHeaders);
      }
    } else {
      noteId = extractNoteId(note.body);
      applyState = await rememberApplySubmissionProgress(env, submissionId, {
        status: 'application_note_written',
        applicationNoteWritten: true,
        ...(noteId ? { noteId } : {}),
      }, applyState);
    }
  }

  if (!applyState?.workflowEnrolled) {
    const workflow = await addContactToWorkflow(env, config, contactId);
    if (!workflow.ok && !isAlreadyInWorkflow(workflow.detail)) {
      console.error('[api/apply] GHL workflow add failed', workflow.status, workflow.detail);
      return json({ ok: false, reason: 'ghl_workflow_failed' }, 502, corsHeaders);
    }
    applyState = await rememberApplySubmissionProgress(env, submissionId, {
      status: 'workflow_enrolled',
      workflowEnrolled: true,
    }, applyState);
  }

  const leadAttribution = {
    ...attribution,
    utms: mergedUtms,
    page,
    fbp,
    fbc,
    fbclid,
    ts: clickTimestamp,
    ip: request.headers.get('CF-Connecting-IP') || '',
    country,
    region,
    regionCode,
    city,
    postalCode,
  };
  const userData = await buildUserData({
    email: lead.email,
    phone: lead.phone,
    firstName: lead.firstName,
    lastName: lead.lastName,
    fbp: leadAttribution.fbp,
    fbc: leadAttribution.fbc,
    fbclid: leadAttribution.fbclid,
    clickTimestamp: leadAttribution.ts || leadAttribution.firstTouch?.ts,
    ip: leadAttribution.ip || request.headers.get('CF-Connecting-IP') || '',
    ua: lead.userAgent || request.headers.get('User-Agent') || '',
    country: leadAttribution.country,
    region: leadAttribution.region,
    regionCode: leadAttribution.regionCode || visitor?.regionCode,
    city: leadAttribution.city,
    postalCode: leadAttribution.postalCode,
    externalId: metaExternalId,
  });
  const am = pickAdvancedMatching(userData);

  await recordLeadEvent({
    request,
    env,
    ctx,
    lead,
    eventId,
    sourceUrl,
    contactId,
    userData,
    metaTestEventCode,
  });

  const productionMetaRequest = isProductionMetaRequest(request);
  const conversionToken = productionMetaRequest && metaExternalId ? newConversionToken() : '';
  if (conversionToken) {
    await rememberConversionToken(env, conversionToken, {
      eventId,
      eventName: 'Lead',
      externalId: metaExternalId,
      am,
    }).catch(() => {});
  }

  const responsePayload = {
    ok: true,
    duplicate: false,
    submissionId,
    redirectPath: '/thank-you',
    bt: conversionToken,
    contactId,
    eventId,
    noteId,
  };
  const signupAttribution = await issueAttributionToken(env, request, {
    attribution: {
      ...leadAttribution,
      page: { ...leadAttribution.page, landing_page: firstLandingPage, current_page: sourceUrl },
    },
    organic_attribution: body.organic_attribution,
  }, {
    ghl_contact_id: contactId,
    ghl_email_sha256: await sha256Hex(lead.email.toLowerCase()),
    ghl_phone_sha256: await sha256Hex(lead.phone.replace(/\D/g, '')),
  }).catch(() => null);
  if (signupAttribution?.token) responsePayload.attribution_token = signupAttribution.token;
  await rememberApplySubmission(env, submissionId, responsePayload).catch(() => {});

  return json(responsePayload, 200, corsHeaders);
}

async function syncAiScanRequestToCrm(env, record, profile = AI_SCAN_PROFILE) {
  const config = ghlConfig(env, { requireWorkflow: false });
  if (!config.ok) return { ...record, crm: 'skipped' };

  try {
    const query = new URLSearchParams({
      locationId: config.locationId,
      email: record.email,
      number: record.phone,
    });
    const duplicate = await aiScanGhlRequest(
      env,
      config,
      `/contacts/search/duplicate?${query.toString()}`,
      { method: 'GET' },
    );
    if (!duplicate.ok) return aiScanCrmFailed(record, 'duplicate_search', duplicate, profile);

    const classified = classifyAiScanDuplicateSearch(duplicate.body);
    if (classified.kind === 'unexpected') {
      console.error(`${profile.log} unexpected GHL duplicate response`, {
        status: duplicate.status,
        keys: classified.keys,
      });
      return { ...record, crm: 'needs_review' };
    }

    let contactId = '';
    let contactWasCreated = false;
    let storedPhoneMatches = false;
    if (classified.kind === 'match') {
      contactId = classified.contactId;
      if (classified.hasPhone) {
        const storedPhone = normalizePhone(classified.phone);
        storedPhoneMatches = storedPhone.ok && storedPhone.e164 === record.phone;
      }
    } else {
      const payload = {
        locationId: config.locationId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        ...(record.website ? { website: record.website } : {}),
        companyName: record.dealershipName,
        source: profile.crmSource,
      };
      const customFields = buildCustomFields(env, record, AI_SCAN_CUSTOM_FIELD_KEYS);
      if (customFields.length) payload.customFields = customFields;
      const created = await aiScanGhlRequest(env, config, '/contacts/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!created.ok) return aiScanCrmFailed(record, 'create_contact', created, profile);
      contactId = extractContactId(created.body);
      if (!contactId) return aiScanCrmFailed(record, 'create_contact_no_id', created, profile);
      contactWasCreated = true;
    }

    const next = { ...record, crmContactId: contactId };
    const tags = [profile.tag];
    if (record.smsConsent && (contactWasCreated || storedPhoneMatches)) {
      tags.push(profile.smsTag);
    }
    const tagged = await aiScanGhlRequest(
      env,
      config,
      `/contacts/${encodeURIComponent(contactId)}/tags`,
      { method: 'POST', body: JSON.stringify({ tags }) },
    );
    if (!tagged.ok) return aiScanCrmFailed(next, 'add_tags', tagged, profile);

    const noted = await aiScanGhlRequest(
      env,
      config,
      `/contacts/${encodeURIComponent(contactId)}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({
          body: buildAiScanNoteBody(record, { contactWasCreated, storedPhoneMatches }, profile),
        }),
      },
    );
    if (!noted.ok) return aiScanCrmFailed(next, 'add_note', noted, profile);
    return { ...next, crm: 'synced' };
  } catch (error) {
    console.error(`${profile.log} CRM sync error`, { step: 'exception', name: error?.name || 'Error' });
    return { ...record, crm: 'failed' };
  }
}

// Logs only the step and the HTTP status: never a response body, which can carry personal data.
function aiScanCrmFailed(record, step, result, profile = AI_SCAN_PROFILE) {
  console.error(`${profile.log} CRM sync failed`, { step, status: result?.status ?? 0 });
  return { ...record, crm: 'failed', crmFailedStep: step };
}

function classifyAiScanDuplicateSearch(body) {
  if (!isPlainObject(body)) {
    const keys = body && typeof body === 'object' ? Object.keys(body) : [];
    return { kind: 'unexpected', keys };
  }
  const keys = Object.keys(body);
  if (keys.length === 0) return { kind: 'none' };
  // The CRM answers { contact, traceId }, plus matchingField ("email" or "phone") when a contact matched.
  // traceId and matchingField are metadata; any other key is unexpected.
  const knownKeys = new Set(['contact', 'traceId', 'matchingField']);
  if (!keys.includes('contact') || keys.some((key) => !knownKeys.has(key))) {
    return { kind: 'unexpected', keys };
  }
  if (body.contact === null) return { kind: 'none' };
  if (!isPlainObject(body.contact)) return { kind: 'unexpected', keys };
  const contactId = clean(body.contact.id, 120);
  if (!contactId) return { kind: 'unexpected', keys };
  const hasPhone = Object.prototype.hasOwnProperty.call(body.contact, 'phone');
  return {
    kind: 'match',
    contactId,
    hasPhone,
    phone: hasPhone && typeof body.contact.phone === 'string' ? body.contact.phone : '',
  };
}

export async function aiScanGhlRequest(env, config, path, init = {}) {
  const method = String(init.method || 'GET').toUpperCase();
  const allowed = (
    (method === 'GET' && /^\/contacts\/search\/duplicate\?[^#]+$/.test(path))
    || (method === 'POST' && path === '/contacts/')
    || (method === 'POST' && /^\/contacts\/[^/?#]+\/(?:tags|notes)$/.test(path))
  );
  if (!allowed) throw new Error('ai_scan_route_forbidden');
  return ghlRequest(env, config, path, { ...init, method });
}

function buildAiScanNoteBody(record, { contactWasCreated, storedPhoneMatches }, profile = AI_SCAN_PROFILE) {
  const utms = record.ghlUtms || record.utms || {};
  const consent = record.consent;
  const lines = [
    profile.noteTitle,
    noteLine('CRM contact', contactWasCreated ? 'Created for this request' : 'Matched; contact fields were not changed'),
    '',
    'Request',
    noteLine('Dealership', record.dealershipName),
    noteLine('Website', record.website),
    noteLine('City / ZIP', record.location),
    noteLine('Full name', record.fullName),
    noteLine('Role', record.role),
    ...profile.extra.map((field) => noteLine(field.label, record[field.key])),
    noteLine('Email', record.email),
    noteLine('Phone', record.phone),
    noteLine('Submitted via', record.submittedVia),
    '',
    'SMS consent',
    noteLine('Consent given', record.smsConsent ? 'yes' : 'no'),
    noteLine('Consent timestamp', consent?.timestamp),
    noteLine('Consent text version', consent?.version),
    noteLine('Consent text', consent?.text),
    ...(record.smsConsent && !contactWasCreated && !storedPhoneMatches
      ? ['SMS consent was not tagged because the matched contact phone did not match the submitted phone.']
      : []),
    '',
    'Tracking',
    noteLine('Submission ID', record.submissionId),
    noteLine('Landing page', record.landing_page || record.landingPageUrl),
    noteLine('Current page', record.current_page),
    noteLine('Referrer URL', record.referrer_url),
    noteLine('Current referrer', record.current_referrer),
    noteLine('User agent', record.userAgent),
    noteLine('utm_source', utms.utm_source),
    noteLine('utm_medium', utms.utm_medium),
    noteLine('utm_campaign', utms.utm_campaign),
    noteLine('utm_content', utms.utm_content),
    noteLine('utm_term', utms.utm_term),
    noteLine('campaign_id', utms.campaign_id || utms.utm_id),
    noteLine('adset_id', utms.adset_id),
    noteLine('ad_id', utms.ad_id),
    noteLine('campaign_name', utms.campaign_name),
    noteLine('adset_name', utms.adset_name),
    noteLine('ad_name', utms.ad_name),
    noteLine('placement', utms.placement),
    noteLine('site_source_name', utms.site_source_name),
  ];
  return lines.join('\n').slice(0, 8000);
}

async function recordAiScanEvent({ request, env, ctx, record, profile = AI_SCAN_PROFILE }) {
  if (!isProductionMetaRequest(request)) return;
  const alreadySeen = await wasEventSeen(env, record.eventId).catch(() => false);
  if (alreadySeen) return;
  await markEventSeen(env, record.eventId).catch(() => {});

  const today = isoDay(new Date());
  await Promise.all([
    bumpCounter(env, today, 'event', profile.eventName),
    bumpCounter(env, today, 'event', `${profile.eventName}:server`),
    pushRecentEvent(env, {
      at: new Date().toISOString(),
      event: profile.eventName,
      source: profile.eventSource,
      vid: record.attribution?.vid || '',
      eventId: record.eventId,
    }),
  ]).catch((err) => {
    console.error(`${profile.log} analytics write failed`, String(err).slice(0, 120));
  });

  if (env[profile.capiSwitch] === 'false') return;
  const metaExternalId = canonicalMetaExternalId(env.META_PIXEL_ID, record.attribution?.vid);
  const userData = await buildUserData({
    email: record.email,
    phone: record.phone,
    firstName: record.firstName,
    lastName: record.lastName,
    fbp: record.fbp,
    fbc: record.fbc,
    fbclid: record.fbclid,
    clickTimestamp: record.attribution?.ts,
    ip: record.clientIpAddress,
    ua: record.userAgent,
    country: record.country,
    region: record.region,
    regionCode: record.regionCode,
    city: record.city,
    postalCode: record.postalCode,
    externalId: metaExternalId,
  });
  const event = buildEvent({
    name: profile.eventName,
    eventId: record.eventId,
    eventTime: Math.floor(Date.now() / 1000),
    sourceUrl: record.current_page,
    actionSource: ACTION_SOURCE.website,
    userData,
    customData: {
      ...profile.customData,
      role: record.role,
      ...Object.fromEntries(profile.extra.map((field) => [field.key, record[field.key]])),
      ...(record.utms || {}),
    },
  });
  const sendPromise = (async () => {
    const result = await sendEvents(env, [event]);
    await bumpCounter(env, today, 'meta', result.ok ? 'capi_ok' : 'capi_failed').catch(() => {});
  })();
  if (ctx?.waitUntil) ctx.waitUntil(sendPromise);
  else await sendPromise;
}

async function upsertGhlContact(env, config, lead) {
  const payload = {
    locationId: config.locationId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: lead.fullName || `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    website: lead.inventoryUrl,
    source: 'AutoLander website application',
  };
  if (lead.dealershipName) payload.companyName = lead.dealershipName;

  return ghlRequest(env, config, '/contacts/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateGhlContactCustomFields(env, config, contactId, lead) {
  const customFields = buildCustomFields(env, lead);
  if (!customFields.length) return { ok: true, status: 204, body: {}, detail: '' };

  return ghlRequest(env, config, `/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PUT',
    body: JSON.stringify({ customFields }),
  });
}

async function addContactToWorkflow(env, config, contactId) {
  return ghlRequest(env, config, `/contacts/${encodeURIComponent(contactId)}/workflow/${encodeURIComponent(config.workflowId)}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

async function createGhlApplicationNote(env, config, contactId, lead) {
  return ghlRequest(env, config, `/contacts/${encodeURIComponent(contactId)}/notes`, {
    method: 'POST',
    body: JSON.stringify({
      body: buildApplicationNoteBody(lead),
    }),
  });
}

async function ghlRequest(env, config, path, init) {
  const baseUrl = (env.GHL_API_BASE_URL || GHL_BASE_URL).replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Version: env.GHL_API_VERSION || GHL_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  }).catch((err) => ({ ok: false, status: 0, text: async () => String(err?.message || err) }));

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = null;
  }

  return {
    ok: Boolean(response.ok),
    status: response.status,
    body,
    detail: text.slice(0, 600),
  };
}

async function recordLeadEvent({
  request,
  env,
  ctx,
  lead,
  eventId,
  sourceUrl,
  contactId,
  userData,
  metaTestEventCode,
}) {
  if (!isProductionMetaRequest(request)) return;
  const today = isoDay(new Date());
  const alreadySeen = await wasEventSeen(env, eventId).catch(() => false);
  if (alreadySeen) return;

  await markEventSeen(env, eventId).catch(() => {});
  const keys = attributionKeys(lead.utms);
  const hour = new Date().getUTCHours().toString().padStart(2, '0');
  await Promise.all([
    bumpCounter(env, today, 'event', 'Lead'),
    bumpCounter(env, today, 'event', 'Lead:server'),
    bumpCounter(env, today, 'hour_lead', hour),
    keys.siteSource ? bumpCounter(env, today, 'site_source', keys.siteSource) : null,
    keys.placement ? bumpCounter(env, today, 'placement', keys.placement) : null,
    keys.campaignName ? bumpCounter(env, today, 'campaign_lead', keys.campaignName) : null,
    keys.campaignId ? bumpCounter(env, today, 'campaign_id_lead', keys.campaignId) : null,
    keys.adName ? bumpCounter(env, today, 'ad_lead', keys.adName) : null,
    keys.adId ? bumpCounter(env, today, 'ad_id_lead', keys.adId) : null,
    pushRecentEvent(env, {
      at: new Date().toISOString(),
      event: 'Lead',
      source: 'website_application',
      vid: lead.vid,
      campaign_id: keys.campaignId,
      adset_id: keys.adsetId,
      ad_id: keys.adId,
      utm_campaign: keys.campaignName,
      utm_content: keys.adName,
      utm_source: lead.utms.utm_source || '',
      placement: keys.placement,
      site_source_name: keys.siteSource,
      fbclid: Boolean(lead.fbclid),
      eventId,
      contactId,
    }),
  ].filter(Boolean)).catch((err) => {
    console.error('[api/apply] lead analytics write failed', String(err).slice(0, 200));
  });

  if (env.SEND_WORKER_LEAD_CAPI === 'false') return;

  const capiEvent = buildEvent({
    name: 'Lead',
    eventId,
    eventTime: Math.floor(Date.now() / 1000),
    sourceUrl,
    actionSource: ACTION_SOURCE.website,
    userData,
    customData: {
      content_name: 'demo_application_submitted',
      content_category: 'demo',
      lead_type: 'website_application',
      dealership_name: lead.dealershipName,
      role: lead.role,
      vehicle_count: lead.vehicleCount,
      ...lead.utms,
    },
  });

  const sendPromise = (async () => {
    const result = await sendEvents(env, [capiEvent], { testEventCode: metaTestEventCode });
    if (result.ok && env.ENRICH_KNOWN_VISITOR_MATCHING === 'true' && lead.vid) {
      const existing = await lookupVisitor(env, lead.vid).catch(() => null);
      await rememberVisitor(env, lead.vid, {
        am: { ...sanitizeAdvancedMatching(existing?.am), ...sanitizeAdvancedMatching(userData) },
      }).catch(() => {});
    }
    await bumpCounter(env, today, 'meta', result.ok ? 'capi_ok' : 'capi_failed').catch(() => {});
  })();

  if (ctx?.waitUntil) ctx.waitUntil(sendPromise);
  else await sendPromise;
}

async function buildUserData({
  email,
  phone,
  firstName,
  lastName,
  fbp,
  fbc,
  fbclid,
  clickTimestamp,
  ip,
  ua,
  country,
  region,
  regionCode,
  city,
  postalCode,
  externalId,
}) {
  const userData = {};
  const emHash = await hashEmail(email);
  if (emHash) userData.em = emHash;
  const phHash = await hashPhone(phone);
  if (phHash) userData.ph = phHash;
  const fnHash = await hashName(firstName);
  if (fnHash) userData.fn = fnHash;
  const lnHash = await hashName(lastName);
  if (lnHash) userData.ln = lnHash;
  if (country) userData.country = await hashLowercase(country);
  const normalizedState = normalizeStateForMeta({ region, regionCode, country });
  if (normalizedState) userData.st = await hashLowercase(normalizedState);
  const normalizedCity = normalizeCityForMeta(city);
  if (normalizedCity) userData.ct = await hashLowercase(normalizedCity);
  if (postalCode) userData.zp = await hashLowercase(postalCode);
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  else if (fbclid) userData.fbc = buildFbc(fbclid, clickTimestamp);
  if (externalId) userData.external_id = await hashLowercase(externalId);
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua;
  return userData;
}

function pickAdvancedMatching(userData) {
  return sanitizeAdvancedMatching(userData);
}

function buildCustomFields(env, lead, keys = CUSTOM_FIELD_KEYS) {
  const values = {
    fullName: lead.fullName,
    dealershipName: lead.dealershipName,
    role: lead.role,
    inventoryUrl: lead.inventoryUrl,
    vehicleCount: lead.vehicleCount,
    smsConsent: lead.smsConsent ? 'true' : 'false',
    ...lead.ghlUtms,
    fbclid: lead.fbclid,
    fbc: lead.fbc,
    fbp: lead.fbp,
    landingPageUrl: lead.landingPageUrl,
    landing_page: lead.landing_page,
    consentSourceUrl: lead.landingPageUrl,
    referrer: lead.referrer,
    referrer_url: lead.referrer_url,
    clientIpAddress: lead.clientIpAddress,
    userAgent: lead.userAgent,
    consentTimestamp: lead.consentTimestamp,
    consentTextVersion: CONSENT_TEXT_VERSION,
    submissionTimestamp: lead.submissionTimestamp,
    metaEventId: lead.eventId,
    visitorId: lead.vid,
    submissionId: lead.externalId || lead.submissionId,
  };
  const map = customFieldMap(env);
  const fields = [];
  for (const key of keys) {
    const target = fieldTargetFor(env, map, key);
    const value = values[key];
    if (!target || value === undefined || value === null || value === '') continue;
    const field = { field_value: String(value).slice(0, 1200) };
    if (target.id) field.id = target.id;
    if (target.key) field.key = target.key;
    fields.push(field);
  }
  return fields;
}

async function readApplySubmission(env, submissionId) {
  if (!env.TRACKING || !submissionId) return null;
  try {
    return await env.TRACKING.get(`apply:submission:${submissionId}`, 'json');
  } catch {
    return null;
  }
}

async function rememberApplySubmission(env, submissionId, payload) {
  if (!env.TRACKING || !submissionId || !payload?.ok) return;
  await env.TRACKING.put(`apply:submission:${submissionId}`, JSON.stringify(payload), {
    expirationTtl: APPLY_SUBMISSION_TTL_SECONDS,
  });
}

async function rememberApplySubmissionProgress(env, submissionId, patch, current = null) {
  const fallback = {
    ...(current && typeof current === 'object' ? current : {}),
    ...(patch && typeof patch === 'object' ? patch : {}),
    submissionId,
  };
  if (!env.TRACKING || !submissionId) return fallback;
  try {
    const existing = current || await readApplySubmission(env, submissionId);
    const next = {
      ...(existing && typeof existing === 'object' ? existing : {}),
      ...(patch && typeof patch === 'object' ? patch : {}),
      submissionId,
    };
    await env.TRACKING.put(`apply:submission:${submissionId}`, JSON.stringify(next), {
      expirationTtl: APPLY_SUBMISSION_TTL_SECONDS,
    });
    return next;
  } catch {
    return fallback;
  }
}

function buildApplicationNoteBody(lead) {
  const utms = lead.ghlUtms || lead.utms || {};
  const lines = [
    'AutoLander demo application received',
    '',
    'Applicant',
    noteLine('Full name', lead.fullName),
    noteLine('Email', lead.email),
    noteLine('Phone', lead.phonePretty || lead.phone),
    '',
    'Dealership profile',
    noteLine('Dealership name', lead.dealershipName || 'Not collected on current modal'),
    noteLine('Role', lead.role),
    noteLine('Vehicles in inventory', lead.vehicleCount || 'Not selected'),
    noteLine('Website / inventory link', lead.inventoryUrl),
    '',
    'Consent',
    noteLine('SMS consent', lead.smsConsent ? 'true' : 'false'),
    noteLine('Consent timestamp', lead.consentTimestamp),
    noteLine('Consent text version', CONSENT_TEXT_VERSION),
    noteLine('Consent source URL', lead.landingPageUrl),
    '',
    'Tracking',
    noteLine('Submission ID', lead.submissionId),
    noteLine('Meta event ID', lead.eventId),
    noteLine('Visitor ID', lead.vid),
    noteLine('Landing page', lead.landingPageUrl),
    noteLine('Referrer', lead.referrer),
    noteLine('First-touch landing page', lead.landing_page),
    noteLine('First-touch referrer URL', lead.referrer_url),
    noteLine('Submission timestamp', lead.submissionTimestamp),
    '',
    'Attribution',
    noteLine('utm_source', utms.utm_source),
    noteLine('utm_medium', utms.utm_medium),
    noteLine('utm_campaign', utms.utm_campaign),
    noteLine('utm_content', utms.utm_content),
    noteLine('utm_term', utms.utm_term),
    noteLine('campaign_id', utms.campaign_id || utms.utm_id),
    noteLine('adset_id', utms.adset_id),
    noteLine('ad_id', utms.ad_id),
    noteLine('placement', utms.placement),
    noteLine('site_source_name', utms.site_source_name),
    noteLine('fbclid', lead.fbclid),
    noteLine('fbc', lead.fbc),
    noteLine('fbp', lead.fbp),
    '',
    'Client',
    noteLine('User agent', lead.userAgent),
  ];
  return lines.filter(Boolean).join('\n').slice(0, 8000);
}

function noteLine(label, value) {
  const text = clean(String(value || ''), 1200);
  return `${label}: ${text || 'Not provided'}`;
}

function customFieldMap(env) {
  if (!env.GHL_CUSTOM_FIELD_MAP) return {};
  try {
    const parsed = JSON.parse(env.GHL_CUSTOM_FIELD_MAP);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function fieldTargetFor(env, map, key) {
  const configured = clean(map[key], 120) || clean(env[`GHL_FIELD_${toEnvKey(key)}`], 120);
  const fallback = DEFAULT_CUSTOM_FIELD_KEY_MAP[key] || '';
  if (configured && configured.startsWith('contact.')) return { key: configured };
  if (configured) return { id: configured, key: fallback || '' };
  if (fallback) return { key: fallback };
  return null;
}

function toEnvKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase();
}

function extractContactId(body) {
  return clean(
    body?.contact?.id
      || body?.contactId
      || body?.id
      || body?.data?.contact?.id
      || body?.data?.id,
    120,
  );
}

function extractNoteId(body) {
  return clean(
    body?.note?.id
      || body?.noteId
      || body?.id
      || body?.data?.note?.id
      || body?.data?.id,
    120,
  );
}

function isAlreadyInWorkflow(detail = '') {
  return /already|duplicate|currently.*workflow|previously.*workflow/i.test(detail);
}

function ghlConfig(env, { requireWorkflow = true } = {}) {
  const token = clean(env.GHL_PRIVATE_INTEGRATION_TOKEN || env.GHL_API_TOKEN || env.HIGHLEVEL_API_TOKEN, 800);
  const locationId = clean(env.GHL_LOCATION_ID, 120);
  const workflowId = requireWorkflow ? clean(env.GHL_WORKFLOW_ID, 120) : '';
  const missing = [];
  if (!token) missing.push('GHL_PRIVATE_INTEGRATION_TOKEN');
  if (!locationId) missing.push('GHL_LOCATION_ID');
  if (requireWorkflow && !workflowId) missing.push('GHL_WORKFLOW_ID');
  return { ok: missing.length === 0, missing, token, locationId, workflowId };
}

function qaTestEventCode(url, body, env) {
  if (env.ALLOW_QA_TEST_EVENT_CODE !== 'true') return '';
  return clean(body.test_event_code || url.searchParams.get('test_event_code'), 80);
}

function sanitizeAttribution(raw) {
  const attr = raw && typeof raw === 'object' ? raw : {};
  const firstTouch = cleanUtms(attr.firstTouch);
  firstTouch.landing_page = clean(attr.firstTouch?.landing_page, 500);
  firstTouch.referrer = clean(attr.firstTouch?.referrer, 1200);
  const ts = attributionTimestampSeconds(attr.firstTouch?.ts ?? attr.ts);
  if (ts) firstTouch.ts = ts;
  return {
    vid: /^v_[a-z0-9]{12,40}$/i.test(attr.vid || '') ? attr.vid : '',
    sid: clean(attr.sid, 64),
    fbp: /^fb\.\d+\.\d+\.\d+$/.test(attr.fbp || '') ? attr.fbp : '',
    fbc: isValidFbc(attr.fbc) ? attr.fbc : '',
    fbclid: cleanFbclid(attr.fbclid),
    ts,
    utms: cleanUtms(attr.utms),
    firstTouch,
    page: sanitizePage(attr.page),
    device: attr.device && typeof attr.device === 'object' ? attr.device : {},
  };
}

function sanitizePage(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return {
    landing_page: clean(raw.landing_page, 500),
    landing_path: clean(raw.landing_path, 160),
    current_page: clean(raw.current_page, 500),
    current_path: clean(raw.current_path, 160),
    referrer: clean(raw.referrer, 240),
    referrer_domain: clean(raw.referrer_domain, 120).toLowerCase(),
    title: clean(raw.title, 160),
  };
}

function cleanUtms(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const key of ATTR_KEYS) {
    const value = clean(raw[key], 180);
    if (value) out[key] = value;
  }
  if (!out.campaign_id && out.utm_id) out.campaign_id = out.utm_id;
  if (!out.campaign_name && out.utm_campaign) out.campaign_name = out.utm_campaign;
  if (!out.ad_name && out.utm_content) out.ad_name = out.utm_content;
  if (!out.adset_name && out.utm_term) out.adset_name = out.utm_term;
  return out;
}

function mergeUtms(first, last) {
  const out = {};
  for (const key of ATTR_KEYS) {
    const value = clean(last?.[key], 180) || clean(first?.[key], 180);
    if (value) out[key] = value;
  }
  return out;
}

function attributionKeys(utms) {
  return {
    campaignId: utms.campaign_id || utms.utm_id || '',
    campaignName: utms.campaign_name || utms.utm_campaign || '',
    adsetId: utms.adset_id || '',
    adsetName: utms.adset_name || utms.utm_term || '',
    adId: utms.ad_id || '',
    adName: utms.ad_name || utms.utm_content || '',
    placement: utms.placement || '',
    siteSource: utms.site_source_name || utms.utm_source || '',
  };
}

async function enforceApplyRateLimit(request, env, { aiScanEmail = null, rateKeyPrefix = 'ai_scan' } = {}) {
  if (env.DISABLE_RATE_LIMITS === 'true' || !env.CHAT_RATE_LIMITS) return { ok: true };
  const now = new Date();
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  if (aiScanEmail !== null) {
    const ipHash = await aiScanRateHash(env, 'ip', ip);
    const limits = [
      {
        key: `${rateKeyPrefix}:ip:${ipHash}:${day}`,
        limit: AI_SCAN_IP_DAILY,
        ttl: secondsUntilTomorrow(now),
      },
      {
        key: `${rateKeyPrefix}:ip:${ipHash}:${hour}`,
        limit: AI_SCAN_IP_HOURLY,
        ttl: 60 * 60 + 120,
      },
    ];
    const normalizedEmail = clean(aiScanEmail, 160).toLowerCase();
    if (normalizedEmail) {
      const emailHash = await aiScanRateHash(env, 'email', normalizedEmail);
      limits.push({
        key: `${rateKeyPrefix}:email:${emailHash}:${day}`,
        limit: AI_SCAN_EMAIL_DAILY,
        ttl: secondsUntilTomorrow(now),
      });
    }
    return enforceKvRateLimits(env.CHAT_RATE_LIMITS, limits);
  }
  const fp = await sha256Hex(`apply:${ip}`);
  const limits = [
    { key: `apply:ip:${fp}:${day}`, limit: Number(env.APPLY_IP_DAILY_LIMIT || APPLY_IP_DAILY), ttl: secondsUntilTomorrow(now) },
    { key: `apply:ip:${fp}:${hour}`, limit: Number(env.APPLY_IP_HOURLY_LIMIT || APPLY_IP_HOURLY), ttl: 60 * 60 + 120 },
  ];
  return enforceKvRateLimits(env.CHAT_RATE_LIMITS, limits);
}

async function enforceKvRateLimits(kv, limits) {
  const counts = await Promise.all(limits.map((limit) => kv.get(limit.key)));
  if (limits.some((limit, index) => Number(counts[index] || 0) >= limit.limit)) {
    return { ok: false };
  }
  await Promise.all(
    limits.map((limit, index) => kv.put(
      limit.key,
      String(Number(counts[index] || 0) + 1),
      { expirationTtl: limit.ttl },
    )),
  );
  return { ok: true };
}

function newConversionToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function splitFullName({ fullName, firstName, lastName }) {
  const first = clean(firstName, 80);
  const last = clean(lastName, 80);
  const raw = clean(fullName, 160) || clean(`${first} ${last}`, 160);
  if (!raw) return { fullName: '', firstName: '', lastName: '' };

  if (first || last) {
    const joined = clean(`${first} ${last}`.trim() || raw, 160);
    return { fullName: joined, firstName: first || raw.split(' ')[0] || '', lastName: last };
  }

  const parts = raw.split(' ').filter(Boolean);
  const parsedFirst = clean(parts.shift() || '', 80);
  const parsedLast = clean(parts.join(' '), 80);
  return { fullName: raw, firstName: parsedFirst, lastName: parsedLast };
}

function normalizeWebsite(value) {
  const raw = clean(value, 240);
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, '');
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(host)) return '';
    return url.toString().slice(0, 240);
  } catch {
    return '';
  }
}

function normalizeIso(value) {
  if (typeof value !== 'string') return '';
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toISOString();
}

function isEmail(value) {
  return /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(value);
}

function normalizePhone(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const hasPlus = s.startsWith('+');
  const digits = s.replace(/\D/g, '');
  let nat = digits;
  if (nat.length === 11 && nat.startsWith('1')) nat = nat.slice(1);
  if (/^[2-9]\d{2}[2-9]\d{6}$/.test(nat)) {
    return {
      ok: true,
      e164: `+1${nat}`,
      pretty: `(${nat.slice(0, 3)}) ${nat.slice(3, 6)}-${nat.slice(6)}`,
    };
  }
  if (hasPlus && !digits.startsWith('1') && /^[1-9]\d{7,14}$/.test(digits)) {
    const e164 = `+${digits}`;
    return { ok: true, e164, pretty: e164 };
  }
  return { ok: false, e164: '', pretty: '' };
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function attributionTimestampSeconds(value) {
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : 0;
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function secondsUntilTomorrow(date) {
  const tomorrow = new Date(date);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.max(60, Math.ceil((tomorrow.getTime() - date.getTime()) / 1000));
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
