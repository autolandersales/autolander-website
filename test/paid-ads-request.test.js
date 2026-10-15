import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256Hex } from '../worker/src/capi/hash.js';
import { handleBooking, LEAD_FORM_PROFILES } from '../worker/src/booking/router.js';
import {
  AD_BUDGET_CHOICES,
  ADS_TODAY_CHOICES,
  PAID_ADS_SMS_CONSENT,
  ROLE_CHOICES,
  MARKETPLACE_ROUTE,
  MARKETPLACE_DEMO_URL,
  UNITS_CHOICES,
} from '../shared/paid-ads-form.js';
import { PAID_ADS_API_PATH, PAID_ADS_FORM_ID, PAID_ADS_PATH } from '../shared/paid-ads-route.js';

// POST /api/ads-apply = the paid ads page's application, on the ai-scan pipeline under its own profile.
const TTL = 90 * 24 * 60 * 60;
const PREVIEW_URL = `https://preview.autolander.ai${PAID_ADS_API_PATH}`;
const PRODUCTION_URL = `https://autolander.ai${PAID_ADS_API_PATH}`;
const FORM_SUCCESS = `https://autolander.ai${PAID_ADS_PATH}?sent=1#${PAID_ADS_FORM_ID}`;
const FORM_ERROR = `https://autolander.ai${PAID_ADS_PATH}?error=`;

class MemoryKv {
  constructor() { this.values = new Map(); this.puts = []; }
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value, options = {}) { this.values.set(key, String(value)); this.puts.push({ key, value: String(value), options }); }
  async delete(key) { this.values.delete(key); }
}

const submissionId = (n) => `sub_paid_ads_request_${String(n).padStart(4, '0')}`;

function validBody(overrides = {}) {
  return {
    dealershipName: 'Example Motors',
    website: 'example.com',
    location: 'Tampa, FL',
    unitsPerMonth: UNITS_CHOICES[2],
    adBudget: AD_BUDGET_CHOICES[2],
    adsToday: ADS_TODAY_CHOICES[0],
    fullName: 'Jamie Dealer',
    role: ROLE_CHOICES[0],
    email: 'jamie@example.com',
    phone: '(212) 555-0123',
    smsConsent: true,
    consentTimestamp: '2026-10-15T14:15:16.000Z',
    smsConsentVersion: 'untrusted-client-version',
    submissionId: submissionId(1),
    company: '',
    userAgent: 'Mozilla/5.0 AutoLander paid ads test browser',
    attribution: {
      vid: 'v_abcdefghijklmnopqrstuv',
      fbp: 'fb.1.1700000000000.123456789',
      utms: { utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'paid_ads', campaign_id: 'campaign-1', adset_id: 'adset-1', ad_id: 'ad-1' },
      page: { landing_page: `https://autolander.ai${PAID_ADS_PATH}?utm_source=facebook`, current_page: `https://autolander.ai${PAID_ADS_PATH}`, referrer: 'https://facebook.com/' },
    },
    landing_page: `https://autolander.ai${PAID_ADS_PATH}`,
    current_page: `https://autolander.ai${PAID_ADS_PATH}`,
    submittedVia: 'fetch',
    ...overrides,
  };
}

function jsonRequest(body, { url = PREVIEW_URL, ip = '203.0.113.10' } = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: new URL(url).origin, 'CF-Connecting-IP': ip, 'User-Agent': 'Mozilla/5.0 request header test browser' },
    body: JSON.stringify(body),
  });
}

function formRequest(overrides = {}) {
  const body = validBody({ smsConsent: 'on', submissionId: '', attribution: undefined, ...overrides });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) if (value !== undefined && value !== null && value !== false) params.set(key, String(value));
  return new Request(PRODUCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://autolander.ai', 'CF-Connecting-IP': '203.0.113.20', 'User-Agent': 'Mozilla/5.0 no-JS form test browser' },
    body: params,
  });
}

const baseEnv = (tracking = new MemoryKv(), overrides = {}) => ({ DISABLE_RATE_LIMITS: 'true', SEND_WORKER_PAID_ADS_CAPI: 'false', TRACKING: tracking, ...overrides });
const crmEnv = (tracking = new MemoryKv(), overrides = {}) => baseEnv(tracking, { GHL_PRIVATE_INTEGRATION_TOKEN: 'test-ghl-token', GHL_LOCATION_ID: 'test-location', ...overrides });
const cors = { 'Access-Control-Allow-Origin': 'https://autolander.ai' };
const ctx = { waitUntil() {} };

function mockFetch(t, handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : null;
    calls.push({ href: String(url), method: String(init.method || 'GET').toUpperCase(), body });
    return handler(String(url), init, body);
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('the profile pins the contract the page and the Worker share', () => {
  const profile = LEAD_FORM_PROFILES.paidAds;
  assert.equal(profile.kv, 'ads_apply');
  assert.equal(profile.eventName, 'PaidAdsApplication');
  assert.equal(profile.tag, 'paid-ads-request');
  assert.equal(profile.smsTag, 'paid-ads-sms-ok');
  assert.equal(profile.consent.version, PAID_ADS_SMS_CONSENT.version);
  assert.deepEqual(profile.extra.map((f) => f.key), ['unitsPerMonth', 'adBudget', 'adsToday']);
  assert.equal(profile.successUrl, FORM_SUCCESS);
  // The scan profile is untouched: same keys, same event, same redirects as before the second form existed.
  const scan = LEAD_FORM_PROFILES.aiScan;
  assert.equal(scan.kv, 'ai_scan');
  assert.equal(scan.eventName, 'AIScanRequest');
  assert.equal(scan.successUrl, 'https://autolander.ai/aeo-geo-for-car-dealers/?sent=1#scan-form');
});

test('kill switch answers unavailable before any work, on its own env flag', async (t) => {
  const calls = mockFetch(t, () => { throw new Error('no network'); });
  const res = await handleBooking(jsonRequest(validBody()), baseEnv(new MemoryKv(), { PAID_ADS_PUBLIC_ROUTE: 'off' }), cors, ctx);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false, reason: 'unavailable' });
  assert.equal(calls.length, 0);
  // The scan's switch does not close the application route.
  const open = await handleBooking(jsonRequest(validBody()), baseEnv(new MemoryKv(), { AI_SCAN_PUBLIC_ROUTE: 'off' }), cors, ctx);
  assert.equal(open.status, 200);
});

test('validation reasons come back in the page order, the three choice fields included', async () => {
  const cases = [
    [{ dealershipName: '' }, 'missing_dealership'],
    [{ website: 'not a site' }, 'invalid_website'],
    [{ location: '' }, 'missing_location'],
    [{ unitsPerMonth: 'lots' }, 'missing_units'],
    [{ adBudget: '' }, 'missing_ad_budget'],
    [{ adsToday: 'Nobody' }, 'missing_ads_today'],
    [{ fullName: 'Jamie' }, 'missing_full_name'],
    [{ role: 'Salesperson' }, 'missing_role'],
    [{ email: 'jamie@' }, 'invalid_email'],
    [{ phone: '123' }, 'invalid_phone'],
  ];
  for (const [overrides, reason] of cases) {
    const res = await handleBooking(jsonRequest(validBody({ submissionId: submissionId(Math.random() * 1e6 | 0), ...overrides })), baseEnv(), cors, ctx);
    assert.equal(res.status, 400, reason);
    assert.deepEqual(await res.json(), { ok: false, reason });
  }
});

test('a valid application is stored under ads_apply for 90 days with the paid-ads consent and the choice fields', async () => {
  const tracking = new MemoryKv();
  const res = await handleBooking(jsonRequest(validBody()), baseEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const payload = await res.json();
  const eventId = `adsapply_${(await sha256Hex(`ads-apply:${submissionId(1)}`)).slice(0, 32)}`;
  assert.deepEqual(payload, { ok: true, duplicate: false, submissionId: submissionId(1), eventId });
  const stored = await tracking.get(`ads_apply:req:${submissionId(1)}`, 'json');
  assert.equal(stored.status, 'received');
  assert.equal(stored.crm, 'skipped');
  assert.equal(stored.unitsPerMonth, UNITS_CHOICES[2]);
  assert.equal(stored.adBudget, AD_BUDGET_CHOICES[2]);
  assert.equal(stored.adsToday, ADS_TODAY_CHOICES[0]);
  assert.equal(stored.consent.version, PAID_ADS_SMS_CONSENT.version);
  assert.equal(stored.consent.text, PAID_ADS_SMS_CONSENT.text);
  assert.ok(!tracking.values.has(`ai_scan:req:${submissionId(1)}`), 'never under the scan prefix');
  const index = await tracking.get(`ads_apply:index:2026-10-15`, 'json') || await tracking.get(`ads_apply:index:${stored.receivedAt.slice(0, 10)}`, 'json');
  assert.deepEqual(index, [submissionId(1)]);
  for (const put of tracking.puts) assert.equal(put.options.expirationTtl, TTL);
});

test('a replay returns the saved answer and does no second CRM or Meta work', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, (url) => (url.includes('/contacts/search/duplicate') ? jsonResponse({ contact: null, traceId: 't' }) : url.endsWith('/contacts/') ? jsonResponse({ contact: { id: 'c-1' } }) : jsonResponse({ ok: true })));
  const first = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(first.status, 200);
  const before = calls.length;
  const second = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).duplicate, true);
  assert.equal(calls.length, before);
});

test('the CRM gets a new contact with the paid ads source, tags, and a note that carries the budget, units and ads-today lines', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, (url) => (url.includes('/contacts/search/duplicate') ? jsonResponse({ contact: null, traceId: 't' }) : url.endsWith('/contacts/') ? jsonResponse({ contact: { id: 'contact-9' } }) : jsonResponse({ ok: true })));
  const res = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const create = calls.find((c) => c.method === 'POST' && c.href.endsWith('/contacts/'));
  assert.equal(create.body.source, 'AutoLander Paid Ads application');
  assert.equal(create.body.companyName, 'Example Motors');
  const tags = calls.find((c) => c.href.endsWith('/contacts/contact-9/tags'));
  assert.deepEqual(tags.body.tags, ['paid-ads-request', 'paid-ads-sms-ok']);
  const note = calls.find((c) => c.href.endsWith('/contacts/contact-9/notes'));
  assert.match(note.body.body, /^AutoLander paid ads application/);
  assert.match(note.body.body, new RegExp(`Units sold a month: ${UNITS_CHOICES[2].replace(/[$]/g, '\\$')}`));
  assert.match(note.body.body, new RegExp(`Monthly ad budget: ${AD_BUDGET_CHOICES[2].replace(/[$]/g, '\\$')}`));
  assert.match(note.body.body, new RegExp(`Ads today: ${ADS_TODAY_CHOICES[0]}`));
  assert.match(note.body.body, new RegExp(`Consent text version: ${PAID_ADS_SMS_CONSENT.version}`));
  assert.doesNotMatch(note.body.body, /ai-scan|AI Visibility/);
  const stored = await tracking.get(`ads_apply:req:${submissionId(1)}`, 'json');
  assert.equal(stored.crm, 'synced');
  assert.equal(stored.crmContactId, 'contact-9');
  // Never an upsert, never a workflow enrolment from this route.
  assert.ok(calls.every((c) => !/upsert|workflow/.test(c.href)));
});

test('Meta gets PaidAdsApplication with the deterministic id, only for production requests', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, (url) => (url.includes('graph.facebook.com') ? jsonResponse({ events_received: 1 }) : jsonResponse({ contact: null, traceId: 't' })));
  const env = baseEnv(tracking, { SEND_WORKER_PAID_ADS_CAPI: 'true', META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'token' });
  const preview = await handleBooking(jsonRequest(validBody({ submissionId: submissionId(2) })), env, cors, ctx);
  assert.equal(preview.status, 200);
  assert.equal(calls.filter((c) => c.href.includes('graph.facebook.com')).length, 0, 'preview sends nothing to Meta');
  const sent = [];
  const prod = await handleBooking(jsonRequest(validBody({ submissionId: submissionId(3) }), { url: PRODUCTION_URL }), env, cors, { waitUntil: (p) => sent.push(p) });
  assert.equal(prod.status, 200);
  await Promise.all(sent);
  const meta = calls.filter((c) => c.href.includes('graph.facebook.com'));
  assert.equal(meta.length, 1);
  const event = meta[0].body.data[0];
  assert.equal(event.event_name, 'PaidAdsApplication');
  assert.equal(event.event_id, `adsapply_${(await sha256Hex(`ads-apply:${submissionId(3)}`)).slice(0, 32)}`);
  assert.equal(event.custom_data.content_category, 'paid_ads');
  assert.equal(event.custom_data.adBudget, AD_BUDGET_CHOICES[2]);
  assert.equal(event.custom_data.unitsPerMonth, UNITS_CHOICES[2]);
  assert.ok(!('email' in event.user_data), 'user data is hashed, never raw');
  assert.match(JSON.stringify(event.user_data.em), /^"?\[?"?[a-f0-9]{64}"?\]?"?$/, 'e-mail is a sha256');
  assert.ok(!JSON.stringify(event.user_data).includes('jamie@example.com'));
  // The scan's CAPI switch does not govern this route.
  const off = baseEnv(new MemoryKv(), { SEND_WORKER_PAID_ADS_CAPI: 'false', SEND_WORKER_AI_SCAN_CAPI: 'true', META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'token' });
  const before = calls.length;
  await handleBooking(jsonRequest(validBody({ submissionId: submissionId(4) }), { url: PRODUCTION_URL }), off, cors, ctx);
  assert.equal(calls.filter((c) => c.href.includes('graph.facebook.com')).length, 1, 'no new Meta call');
  assert.ok(calls.length >= before);
});

test('the no-JS form lands on the page in one hop, success and error, without PII in the URL', async () => {
  const ok = await handleBooking(formRequest(), baseEnv(), cors, ctx);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('Location'), FORM_SUCCESS);
  const bad = await handleBooking(formRequest({ adBudget: '' }), baseEnv(), cors, ctx);
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('Location'), `${FORM_ERROR}missing_ad_budget#${PAID_ADS_FORM_ID}`);
});

test('a salesperson after the Marketplace tool is sent to the demo and nothing is stored', async () => {
  const tracking = new MemoryKv();
  const json = await handleBooking(jsonRequest(validBody({ role: MARKETPLACE_ROUTE.value })), baseEnv(tracking), cors, ctx);
  assert.equal(json.status, 400);
  assert.deepEqual(await json.json(), { ok: false, reason: 'marketplace_demo', demoUrl: MARKETPLACE_DEMO_URL });
  const form = await handleBooking(formRequest({ role: MARKETPLACE_ROUTE.value }), baseEnv(tracking), cors, ctx);
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('Location'), MARKETPLACE_DEMO_URL);
  assert.equal(tracking.puts.length, 0);
});

test('honeypots get a success-shaped answer and are stored as spam under the ads prefix', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, () => { throw new Error('no network'); });
  const res = await handleBooking(jsonRequest(validBody({ company: 'spam bot' })), crmEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const stored = await tracking.get(`ads_apply:req:${submissionId(1)}`, 'json');
  assert.equal(stored.status, 'spam');
  assert.equal(calls.length, 0);
});

test('rate limits count under the ads prefix, apart from the scan counters', async () => {
  const limits = new MemoryKv();
  const env = baseEnv(new MemoryKv(), { DISABLE_RATE_LIMITS: 'false', CHAT_RATE_LIMITS: limits });
  const res = await handleBooking(jsonRequest(validBody()), env, cors, ctx);
  assert.equal(res.status, 200);
  const keys = [...limits.values.keys()];
  assert.ok(keys.length >= 2);
  assert.ok(keys.every((key) => key.startsWith('ads_apply:')), keys.join(','));
});
