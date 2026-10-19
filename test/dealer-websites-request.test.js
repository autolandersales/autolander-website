import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256Hex } from '../worker/src/capi/hash.js';
import { handleBooking, LEAD_FORM_PROFILES } from '../worker/src/booking/router.js';
import {
  PROJECT_GOAL_CHOICES,
  ROLE_CHOICES,
  MARKETPLACE_ROUTE,
  MARKETPLACE_DEMO_URL,
  WEBSITE_SMS_CONSENT,
} from '../shared/dealer-websites-form.js';
import { WEBSITE_API_PATH, WEBSITE_ERROR_ID, WEBSITE_PATH, WEBSITE_SUCCESS_ID } from '../shared/dealer-websites-route.js';

// POST /api/website-request = the dealership websites page's application, on the ai-scan pipeline under its own
// profile (exactly the paid-ads shape: KV prefix, rate keys, tags, note, Meta event, kill switch, CAPI switch).
const TTL = 90 * 24 * 60 * 60;
const PREVIEW_URL = `https://preview.autolander.ai${WEBSITE_API_PATH}`;
const PRODUCTION_URL = `https://autolander.ai${WEBSITE_API_PATH}`;
const FORM_SUCCESS = `https://autolander.ai${WEBSITE_PATH}?sent=1#${WEBSITE_SUCCESS_ID}`;
const FORM_ERROR = `https://autolander.ai${WEBSITE_PATH}?error=`;

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

const submissionId = (n) => `sub_website_request_${String(n).padStart(4, '0')}`;

function validBody(overrides = {}) {
  return {
    dealershipName: 'Example Motors',
    website: 'example.com',
    location: 'Tampa, FL',
    projectGoal: PROJECT_GOAL_CHOICES[0],
    fullName: 'Jamie Dealer',
    role: ROLE_CHOICES[0],
    email: 'jamie@example.com',
    phone: '(212) 555-0123',
    smsConsent: true,
    consentTimestamp: '2026-10-19T14:15:16.000Z',
    smsConsentVersion: 'untrusted-client-version',
    submissionId: submissionId(1),
    company: '',
    userAgent: 'Mozilla/5.0 AutoLander website request test browser',
    attribution: {
      vid: 'v_abcdefghijklmnopqrstuv',
      fbp: 'fb.1.1700000000000.123456789',
      utms: { utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'dealer_websites', campaign_id: 'campaign-1', adset_id: 'adset-1', ad_id: 'ad-1' },
      page: { landing_page: `https://autolander.ai${WEBSITE_PATH}?utm_source=facebook`, current_page: `https://autolander.ai${WEBSITE_PATH}`, referrer: 'https://facebook.com/' },
    },
    landing_page: `https://autolander.ai${WEBSITE_PATH}`,
    current_page: `https://autolander.ai${WEBSITE_PATH}`,
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

const baseEnv = (tracking = new MemoryKv(), overrides = {}) => ({ DISABLE_RATE_LIMITS: 'true', SEND_WORKER_WEBSITE_REQUEST_CAPI: 'false', TRACKING: tracking, ...overrides });
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
const crmMock = (contactId = 'contact-9') => (url) => (url.includes('/contacts/search/duplicate') ? jsonResponse({ contact: null, traceId: 't' }) : url.endsWith('/contacts/') ? jsonResponse({ contact: { id: contactId } }) : jsonResponse({ ok: true }));

test('the profile pins the contract the page and the Worker share', () => {
  const profile = LEAD_FORM_PROFILES.websites;
  assert.equal(profile.kv, 'website_request');
  assert.equal(profile.eventName, 'WebsiteRequest');
  assert.equal(profile.tag, 'website-request');
  assert.equal(profile.smsTag, 'website-sms-ok');
  assert.equal(profile.crmSource, 'AutoLander website project request');
  assert.equal(profile.noteTitle, 'AutoLander dealership website project request');
  assert.equal(profile.consent.version, WEBSITE_SMS_CONSENT.version);
  assert.equal(profile.websiteOptional, true);
  assert.deepEqual(profile.extra.map((f) => f.key), ['projectGoal']);
  assert.equal(profile.successUrl, FORM_SUCCESS);
  assert.equal(profile.anchor, `#${WEBSITE_ERROR_ID}`);
  // The scan and paid-ads profiles are untouched by the fourth form.
  assert.equal(LEAD_FORM_PROFILES.aiScan.eventName, 'AIScanRequest');
  assert.equal(LEAD_FORM_PROFILES.paidAds.eventName, 'PaidAdsApplication');
  assert.ok(!LEAD_FORM_PROFILES.aiScan.websiteOptional && !LEAD_FORM_PROFILES.paidAds.websiteOptional);
});

test('the route is open unless its own kill switch says off, and the other switches do not close it', async (t) => {
  const calls = mockFetch(t, () => { throw new Error('no network'); });
  const closed = await handleBooking(jsonRequest(validBody()), baseEnv(new MemoryKv(), { WEBSITE_REQUEST_PUBLIC_ROUTE: 'off' }), cors, ctx);
  assert.equal(closed.status, 503);
  assert.deepEqual(await closed.json(), { ok: false, reason: 'unavailable' });
  assert.equal(calls.length, 0);
  const open = await handleBooking(jsonRequest(validBody()), baseEnv(new MemoryKv(), { AI_SCAN_PUBLIC_ROUTE: 'off', PAID_ADS_PUBLIC_ROUTE: 'off' }), cors, ctx);
  assert.equal(open.status, 200);
  // Absent = on (the paid-ads and scan default); 'on' is accepted too.
  const explicit = await handleBooking(jsonRequest(validBody({ submissionId: submissionId(5) })), baseEnv(new MemoryKv(), { WEBSITE_REQUEST_PUBLIC_ROUTE: 'on' }), cors, ctx);
  assert.equal(explicit.status, 200);
});

test('validation reasons come back in the page order, with the website optional', async () => {
  const cases = [
    [{ dealershipName: '' }, 'missing_dealership'],
    [{ website: 'not a site' }, 'invalid_website'],
    [{ website: 'https://user:pass@example.com/' }, 'invalid_website'],
    [{ location: '' }, 'missing_location'],
    [{ projectGoal: 'Invented plan' }, 'missing_project_goal'],
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
  for (const website of ['', undefined]) {
    const res = await handleBooking(jsonRequest(validBody({ submissionId: submissionId(Math.random() * 1e6 | 0), website })), baseEnv(), cors, ctx);
    assert.equal(res.status, 200, 'a dealer without a website can apply');
  }
});

test('a valid application is stored under website_request for 90 days with the website consent and the project goal', async () => {
  const tracking = new MemoryKv();
  const res = await handleBooking(jsonRequest(validBody()), baseEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const payload = await res.json();
  const eventId = `websiterequest_${(await sha256Hex(`website-request:${submissionId(1)}`)).slice(0, 32)}`;
  assert.deepEqual(payload, { ok: true, duplicate: false, submissionId: submissionId(1), eventId });
  const stored = await tracking.get(`website_request:req:${submissionId(1)}`, 'json');
  assert.equal(stored.status, 'received');
  assert.equal(stored.crm, 'skipped');
  assert.equal(stored.projectGoal, PROJECT_GOAL_CHOICES[0]);
  assert.equal(stored.website, 'https://example.com/');
  assert.ok(!('websiteProvided' in stored));
  assert.equal(stored.consent.version, WEBSITE_SMS_CONSENT.version);
  assert.equal(stored.consent.text, WEBSITE_SMS_CONSENT.text);
  assert.ok(!tracking.values.has(`ai_scan:req:${submissionId(1)}`) && !tracking.values.has(`ads_apply:req:${submissionId(1)}`), 'never under another prefix');
  const index = await tracking.get(`website_request:index:${stored.receivedAt.slice(0, 10)}`, 'json');
  assert.deepEqual(index, [submissionId(1)]);
  for (const put of tracking.puts) assert.equal(put.options.expirationTtl, TTL);
});

test('a replay returns the saved answer and does no second CRM or Meta work', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, crmMock('c-1'));
  const first = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(first.status, 200);
  const before = calls.length;
  const second = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).duplicate, true);
  assert.equal(calls.length, before);
});

test('the CRM gets a new contact with the website source, the tags and a note whose first line is the parser key', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, crmMock());
  const res = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const create = calls.find((c) => c.method === 'POST' && c.href.endsWith('/contacts/'));
  assert.equal(create.body.source, 'AutoLander website project request');
  assert.equal(create.body.companyName, 'Example Motors');
  assert.equal(create.body.website, 'https://example.com/');
  const tags = calls.find((c) => c.href.endsWith('/contacts/contact-9/tags'));
  assert.deepEqual(tags.body.tags, ['website-request', 'website-sms-ok']);
  const note = calls.find((c) => c.href.endsWith('/contacts/contact-9/notes'));
  assert.match(note.body.body, /^AutoLander dealership website project request\n/);
  assert.match(note.body.body, new RegExp(`Website project: ${PROJECT_GOAL_CHOICES[0]}`));
  assert.match(note.body.body, /Website: https:\/\/example\.com\//);
  assert.match(note.body.body, new RegExp(`Consent text version: ${WEBSITE_SMS_CONSENT.version}`));
  assert.doesNotMatch(note.body.body, /ai-scan|AI Visibility|paid ads/i);
  const stored = await tracking.get(`website_request:req:${submissionId(1)}`, 'json');
  assert.equal(stored.crm, 'synced');
  assert.equal(stored.crmContactId, 'contact-9');
  // Never an upsert, never a workflow enrolment, never a Slack call from this route (the alert is the GHL tag's job).
  assert.ok(calls.every((c) => !/upsert|workflow|hooks\.slack\.com/.test(c.href)));
});

test('a dealer with no website yet is created without a website field and the note says so', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, crmMock('contact-2'));
  const res = await handleBooking(jsonRequest(validBody({ submissionId: submissionId(2), website: '' })), crmEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const create = calls.find((c) => c.method === 'POST' && c.href.endsWith('/contacts/'));
  assert.ok(!('website' in create.body), 'no empty website on the contact');
  const note = calls.find((c) => c.href.endsWith('/contacts/contact-2/notes'));
  assert.match(note.body.body, /Website: Not provided/);
  const stored = await tracking.get(`website_request:req:${submissionId(2)}`, 'json');
  assert.equal(stored.website, '');
});

test('a matched contact is not rewritten: tags and the note are added, the sms tag only when the stored phone matches', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, (url) => (url.includes('/contacts/search/duplicate') ? jsonResponse({ contact: { id: 'existing-1', phone: '+15555550199' }, traceId: 't' }) : jsonResponse({ ok: true })));
  const res = await handleBooking(jsonRequest(validBody()), crmEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  assert.ok(!calls.some((c) => c.method === 'POST' && c.href.endsWith('/contacts/')), 'no create');
  assert.ok(!calls.some((c) => c.method === 'PUT'), 'no update');
  const tags = calls.find((c) => c.href.endsWith('/contacts/existing-1/tags'));
  assert.deepEqual(tags.body.tags, ['website-request']);
  const note = calls.find((c) => c.href.endsWith('/contacts/existing-1/notes'));
  assert.match(note.body.body, /Matched; contact fields were not changed/);
});

test('Meta gets WebsiteRequest with the deterministic id, only for production requests, on by default', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, (url) => (url.includes('graph.facebook.com') ? jsonResponse({ events_received: 1 }) : jsonResponse({ contact: null, traceId: 't' })));
  const env = baseEnv(tracking, { SEND_WORKER_WEBSITE_REQUEST_CAPI: undefined, META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'token' });
  delete env.SEND_WORKER_WEBSITE_REQUEST_CAPI;
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
  assert.equal(event.event_name, 'WebsiteRequest');
  assert.equal(event.event_id, `websiterequest_${(await sha256Hex(`website-request:${submissionId(3)}`)).slice(0, 32)}`);
  assert.equal(event.custom_data.content_category, 'dealer_websites');
  assert.equal(event.custom_data.projectGoal, PROJECT_GOAL_CHOICES[0]);
  assert.equal(event.custom_data.role, ROLE_CHOICES[0]);
  assert.ok(!('email' in event.user_data), 'user data is hashed, never raw');
  assert.ok(!JSON.stringify(event.user_data).includes('jamie@example.com'));
  // Its own switch turns it off; the scan's and the paid-ads switches do not govern this route.
  const off = baseEnv(new MemoryKv(), { SEND_WORKER_WEBSITE_REQUEST_CAPI: 'false', SEND_WORKER_AI_SCAN_CAPI: 'true', SEND_WORKER_PAID_ADS_CAPI: 'true', META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'token' });
  await handleBooking(jsonRequest(validBody({ submissionId: submissionId(4) }), { url: PRODUCTION_URL }), off, cors, ctx);
  assert.equal(calls.filter((c) => c.href.includes('graph.facebook.com')).length, 1, 'no new Meta call');
});

test('the no-JS form lands on the page in one hop, success and error, without PII in the URL', async () => {
  const ok = await handleBooking(formRequest(), baseEnv(), cors, ctx);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('Location'), FORM_SUCCESS);
  const bad = await handleBooking(formRequest({ projectGoal: '' }), baseEnv(), cors, ctx);
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('Location'), `${FORM_ERROR}missing_project_goal#${WEBSITE_ERROR_ID}`);
  const noSite = await handleBooking(formRequest({ website: '' }), baseEnv(), cors, ctx);
  assert.equal(noSite.status, 303);
  assert.equal(noSite.headers.get('Location'), FORM_SUCCESS);
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

test('honeypots get a success-shaped answer and are stored as spam under the website prefix', async (t) => {
  const tracking = new MemoryKv();
  const calls = mockFetch(t, () => { throw new Error('no network'); });
  const res = await handleBooking(jsonRequest(validBody({ company: 'spam bot' })), crmEnv(tracking), cors, ctx);
  assert.equal(res.status, 200);
  const stored = await tracking.get(`website_request:req:${submissionId(1)}`, 'json');
  assert.equal(stored.status, 'spam');
  assert.equal(calls.length, 0);
});

test('rate limits count under the website prefix, apart from the scan and ads counters', async () => {
  const limits = new MemoryKv();
  const env = baseEnv(new MemoryKv(), { DISABLE_RATE_LIMITS: 'false', CHAT_RATE_LIMITS: limits });
  const res = await handleBooking(jsonRequest(validBody()), env, cors, ctx);
  assert.equal(res.status, 200);
  const keys = [...limits.values.keys()];
  assert.ok(keys.length >= 2);
  assert.ok(keys.every((key) => key.startsWith('website_request:')), keys.join(','));
});
