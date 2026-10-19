import assert from 'node:assert/strict';
import test from 'node:test';
import { handleBooking, LEAD_FORM_PROFILES, readWebsiteRequestState } from '../worker/src/booking/router.js';
import { buildWebsiteSlackPayload, websiteSlackWebhook, WEBSITE_OUTBOUND_TIMEOUT_MS, withWebsiteTimeout } from '../worker/src/booking/website-notifications.js';
import { PROJECT_GOAL_CHOICES, ROLE_CHOICES, WEBSITE_SMS_CONSENT, MARKETPLACE_ROUTE, MARKETPLACE_DEMO_URL } from '../shared/dealer-websites-form.js';
import { WEBSITE_API_PATH, WEBSITE_PATH, WEBSITE_SUCCESS_ID, WEBSITE_ERROR_ID } from '../shared/dealer-websites-route.js';
import { sha256Hex } from '../worker/src/capi/hash.js';

const API = `https://autolander.ai${WEBSITE_API_PATH}`;
const PAGE = `https://autolander.ai${WEBSITE_PATH}`;
// Non-working fixture; never an actual credential. Every external fetch is mocked.
const SLACK = 'https://hooks.slack.com/services/TTEST00000/BTEST00000/NotARealWebhook0000000000';
const sid = (n = 1) => `sub_website_request_${String(n).padStart(4, '0')}`;
const key = (n = 1) => `website_request:req:${sid(n)}`;
const checkpoint = (step, phase, n = 1) => `website_request:delivery:${sid(n)}:${step}:${phase}`;
const state = (kv, n = 1) => readWebsiteRequestState({ TRACKING: kv }, sid(n));
class MemoryKv {
  constructor() { this.values = new Map(); this.puts = []; }
  async get(key, type) {
    const value = this.values.get(key);
    return value === undefined ? null : type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value, options = {}) {
    this.values.set(key, String(value)); this.puts.push({ key, value: String(value), options });
  }
}
// Cloudflare Workers KV permits at most one write per second to the same key.
// All calls in this fixture happen in the same logical second; no test sleeps.
class SameKeyThrottledKv extends MemoryKv {
  constructor() { super(); this.rejected = []; }
  async put(key, value, options = {}) {
    if (this.values.has(key)) {
      this.rejected.push(key);
      throw new Error('429 KV same-key write rate exceeded');
    }
    return super.put(key, value, options);
  }
}
const envFor = (kv = new MemoryKv(), overrides = {}) => ({
  TRACKING: kv, DISABLE_RATE_LIMITS: 'true', WEBSITE_REQUEST_PUBLIC_ROUTE: 'on',
  GHL_PRIVATE_INTEGRATION_TOKEN: 'test-token', GHL_LOCATION_ID: 'test-location',
  WEBSITE_REQUEST_SLACK_WEBHOOK_URL: SLACK, SEND_WORKER_WEBSITE_REQUEST_CAPI: 'false', ...overrides,
});
const valid = (overrides = {}) => ({
  dealershipName: 'Example Motors', website: 'example.com', location: 'Tampa, FL',
  projectGoal: PROJECT_GOAL_CHOICES[0], fullName: 'Jamie Dealer', role: ROLE_CHOICES[0],
  email: 'jamie@example.com', phone: '(212) 555-0123', smsConsent: false, submissionId: sid(),
  current_page: PAGE, submittedVia: 'fetch',
  attribution: { vid: 'v_abcdefghijklmnopqrstuv', utms: { utm_source: 'facebook', utm_campaign: 'website-service' } },
  ...overrides,
});
function req(body = valid(), origin = 'https://autolander.ai') {
  return new Request(`${origin}${WEBSITE_API_PATH}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '203.0.113.15' },
    body: JSON.stringify(body) });
}
function form(overrides = {}) {
  const values = valid({ attribution: '', submissionId: '', smsConsent: '', ...overrides });
  return new Request(API, { method: 'POST', headers: {
    'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://autolander.ai',
  }, body: new URLSearchParams(values) });
}
function mocked(t, handler) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const href = String(url);
    const payload = init.body ? JSON.parse(init.body) : null;
    calls.push({ href, method: init.method || 'GET', payload, signal: init.signal, redirect: init.redirect });
    if (handler) {
      const answer = handler(href, init, payload);
      if (answer !== undefined) return answer;
    }
    if (href.includes('/contacts/search/duplicate?')) return Response.json({ contact: null, traceId: 't' });
    if (href.endsWith('/contacts/')) return Response.json({ contact: { id: 'contact-website-1' } });
    if (/\/contacts\/[^/]+\/(tags|notes)$/.test(href)) return Response.json({ ok: true });
    if (href === SLACK) return new Response('ok');
    if (href.startsWith('https://graph.facebook.com/')) return Response.json({ events_received: 1 });
    throw new Error('Unexpected mocked destination');
  });
  return calls;
}

test('website profile and consent are isolated from existing forms', () => {
  const p = LEAD_FORM_PROFILES.websites;
  assert.equal(p.id, 'dealer-websites');
  assert.equal(p.eventName, 'WebsiteRequest');
  assert.equal(p.tag, 'website-request'); assert.equal(p.smsTag, 'website-sms-ok');
  assert.equal(p.crmSource, 'AutoLander website project request');
  assert.equal(p.consent, WEBSITE_SMS_CONSENT);
  assert.deepEqual(p.extra[0].choices, PROJECT_GOAL_CHOICES);
  assert.equal(LEAD_FORM_PROFILES.aiScan.eventName, 'AIScanRequest');
  assert.equal(LEAD_FORM_PROFILES.paidAds.eventName, 'PaidAdsApplication');
  assert.equal(WEBSITE_OUTBOUND_TIMEOUT_MS, 4000);
});

test('route is closed by default and refuses incomplete/unsafe delivery configuration', async (t) => {
  const calls = mocked(t);
  for (const override of [
    { WEBSITE_REQUEST_PUBLIC_ROUTE: undefined }, { WEBSITE_REQUEST_PUBLIC_ROUTE: 'off' },
    { TRACKING: undefined }, { GHL_PRIVATE_INTEGRATION_TOKEN: '' }, { GHL_LOCATION_ID: '' },
    { WEBSITE_REQUEST_SLACK_WEBHOOK_URL: '' },
    { WEBSITE_REQUEST_SLACK_WEBHOOK_URL: 'https://example.com/webhook' },
    { GHL_API_BASE_URL: 'https://example.com' },
    { SEND_WORKER_WEBSITE_REQUEST_CAPI: 'true' },
  ]) {
    const kv = new MemoryKv();
    const response = await handleBooking(req(), envFor(kv, override), {});
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, reason: 'unavailable' });
    assert.equal(kv.puts.length, 0);
  }
  assert.equal(calls.length, 0);
});

test('required fields and optional entered website are validated before any external effect', async (t) => {
  const calls = mocked(t);
  for (const [override, reason] of [
    [{ dealershipName: '' }, 'missing_dealership'], [{ website: 'not a site' }, 'invalid_website'],
    [{ website: { bad: true } }, 'invalid_website'], [{ website: 'https://user:pass@example.com' }, 'invalid_website'],
    [{ website: 'https://example.com:1234' }, 'invalid_website'], [{ location: '' }, 'missing_location'],
    [{ projectGoal: '' }, 'missing_project_goal'], [{ projectGoal: 'get leads guaranteed' }, 'missing_project_goal'],
    [{ fullName: 'Jamie' }, 'missing_full_name'], [{ role: 'Salesperson' }, 'missing_role'],
    [{ email: 'bad' }, 'invalid_email'], [{ phone: '123' }, 'invalid_phone'],
  ]) {
    const response = await handleBooking(req(valid(override)), envFor(), {});
    assert.equal(response.status, 400, reason); assert.equal((await response.json()).reason, reason);
  }
  assert.equal(calls.length, 0);
});

test('new dealer without a website is accepted, stored, tagged and notified; consent stays opt-in', async (t) => {
  const kv = new MemoryKv(); const calls = mocked(t);
  const response = await handleBooking(req(valid({ website: '', projectGoal: PROJECT_GOAL_CHOICES[1] })), envFor(kv), {});
  assert.equal(response.status, 200);
  const eventId = `websiterequest_${(await sha256Hex(`website-request:${sid()}`)).slice(0, 32)}`;
  assert.deepEqual(await response.json(), { ok: true, duplicate: false, submissionId: sid(), eventId });
  const saved = await state(kv);
  assert.equal(saved.website, ''); assert.equal(saved.projectGoal, PROJECT_GOAL_CHOICES[1]);
  assert.equal(saved.crm, 'synced'); assert.equal(saved.delivery.slack.state, 'succeeded');
  assert.equal(saved.delivery.meta.state, 'skipped'); assert.ok(!saved.consent);
  assert.ok(!('websiteProvided' in saved));
  const create = calls.find(c => c.href.endsWith('/contacts/'));
  assert.equal(create.payload.source, 'AutoLander website project request');
  assert.ok(!('website' in create.payload)); assert.ok(!('assignedTo' in create.payload));
  const tags = calls.find(c => c.href.endsWith('/tags'));
  assert.deepEqual(tags.payload.tags, ['website-request']);
  const note = calls.find(c => c.href.endsWith('/notes'));
  assert.match(note.payload.body, /Website project: Build a new dealership website/);
  assert.ok(calls.every(c => !/upsert|workflow|opportunities/.test(c.href)));
  assert.equal(calls.filter(c => c.href === SLACK).length, 1);
  assert.ok(calls.every(c => c.signal instanceof AbortSignal));
  assert.ok(calls.every(c => c.redirect === 'error'));
  assert.ok(kv.puts.filter(p => p.key.startsWith('website_request:')).every(p => p.options.expirationTtl === 90 * 24 * 60 * 60));
});

test('matched contacts are not overwritten; SMS tag requires exact stored-phone match', async (t) => {
  let storedPhone = '+12125550123';
  const calls = mocked(t, href => href.includes('/search/duplicate?')
    ? Response.json({ contact: { id: 'existing', phone: storedPhone }, matchingField: 'email', traceId: 't' }) : undefined);
  const kv = new MemoryKv();
  await handleBooking(req(valid({ smsConsent: true, smsConsentVersion: 'untrusted' })), envFor(kv), {});
  assert.deepEqual(calls.find(c => c.href.endsWith('/tags')).payload.tags, ['website-request', 'website-sms-ok']);
  const saved = await state(kv);
  assert.equal(saved.consent.version, WEBSITE_SMS_CONSENT.version);
  assert.equal(saved.consent.text, WEBSITE_SMS_CONSENT.text);
  storedPhone = '+14155550123';
  const before = calls.length;
  await handleBooking(req(valid({ submissionId: sid(2), smsConsent: true })), envFor(kv), {});
  const second = calls.slice(before);
  assert.deepEqual(second.find(c => c.href.endsWith('/tags')).payload.tags, ['website-request']);
  assert.match(second.find(c => c.href.endsWith('/notes')).payload.body, /matched contact phone did not match/);
  assert.ok(calls.every(c => c.method !== 'PUT' && !c.href.endsWith('/contacts/')));
});

test('unexpected duplicate lookup does not create a contact and sends an actionable review alert', async (t) => {
  const calls = mocked(t, href => href.includes('/search/duplicate?') ? Response.json({ unexpected: [] }) : undefined);
  const kv = new MemoryKv();
  const response = await handleBooking(req(), envFor(kv), {});
  assert.equal(response.status, 200);
  const saved = await state(kv);
  assert.equal(saved.crm, 'needs_review'); assert.equal(saved.delivery.crmContact.state, 'needs_review');
  assert.ok(!calls.some(c => c.href.endsWith('/contacts/')));
  const slack = calls.find(c => c.href === SLACK);
  assert.match(JSON.stringify(slack.payload), /needs_review/);
});

test('durable intake happens before delivery and duplicate browser submissions do not repeat effects', async (t) => {
  const kv = new MemoryKv(); const calls = mocked(t);
  const pending = [];
  const response = await handleBooking(req(), envFor(kv), {}, { waitUntil: p => pending.push(p) });
  assert.equal(response.status, 200); assert.ok(await kv.get(key(), 'json'));
  await Promise.all(pending);
  const before = calls.length;
  const replay = await handleBooking(req(), envFor(kv), {});
  assert.equal((await replay.json()).duplicate, true); assert.equal(calls.length, before);
});

test('one-write-per-second KV accepts every delivery checkpoint without sleeps or envelope rewrites', async (t) => {
  const kv = new SameKeyThrottledKv(); const calls = mocked(t);
  const env = envFor(kv, { SEND_WORKER_WEBSITE_REQUEST_CAPI: 'true',
    META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'test-meta-token' });
  const response = await handleBooking(req(), env, {});
  assert.equal(response.status, 200);
  const saved = await state(kv);
  assert.equal(saved.crm, 'synced');
  for (const step of ['crmContact', 'crmTags', 'crmNote', 'slack', 'meta']) {
    assert.equal(saved.delivery[step].state, 'succeeded', step);
    assert.equal(kv.puts.filter(p => p.key === checkpoint(step, 'started')).length, 1, step);
    assert.equal(kv.puts.filter(p => p.key === checkpoint(step, 'result')).length, 1, step);
  }
  assert.equal(kv.puts.filter(p => p.key === key()).length, 1, 'intake envelope is written once');
  assert.deepEqual((await kv.get(key(), 'json')).delivery, {}, 'envelope remains immutable');
  assert.deepEqual(kv.rejected, [], 'no same-key second write');
  assert.equal(calls.filter(c => c.href === SLACK).length, 1);
  assert.equal(calls.filter(c => c.href.startsWith('https://graph.facebook.com/')).length, 1);
  const before = { calls: calls.length, puts: kv.puts.length };
  const replay = await handleBooking(req(), env, {});
  assert.equal((await replay.json()).duplicate, true);
  assert.equal(calls.length, before.calls); assert.equal(kv.puts.length, before.puts);
});

test('a failed initial storage write returns unavailable with zero provider calls', async (t) => {
  const calls = mocked(t); const kv = new MemoryKv();
  kv.put = async () => { throw new Error('KV write unavailable'); };
  const response = await handleBooking(req(), envFor(kv), {});
  assert.equal(response.status, 503); assert.equal(calls.length, 0);
});

test('a failed checkpoint prevents its external effect; the durable request remains recoverable', async (t) => {
  const calls = mocked(t); const kv = new MemoryKv(); const put = kv.put.bind(kv);
  kv.put = async (k, value, options) => {
    if (k === checkpoint('crmContact', 'started')) throw new Error('checkpoint unavailable');
    return put(k, value, options);
  };
  const response = await handleBooking(req(), envFor(kv), {});
  assert.equal(response.status, 200); assert.equal(calls.length, 0);
  assert.equal((await state(kv)).status, 'received');
});

test('a post-write checkpoint failure leaves started and replay never resends the uncertain effect', async (t) => {
  const calls = mocked(t); const kv = new MemoryKv(); const put = kv.put.bind(kv);
  kv.put = async (k, value, options) => {
    if (k === checkpoint('crmContact', 'result')) throw new Error('checkpoint unavailable');
    return put(k, value, options);
  };
  await handleBooking(req(), envFor(kv), {});
  assert.equal((await state(kv)).delivery.crmContact.state, 'started');
  assert.equal(calls.filter(c => c.href.endsWith('/contacts/')).length, 1);
  const before = calls.length;
  await handleBooking(req(), envFor(kv), {}); assert.equal(calls.length, before);
});

test('Slack failure is retained without losing the request or replaying the CRM', async (t) => {
  const calls = mocked(t, href => href === SLACK ? new Response('invalid_payload', { status: 400 }) : undefined);
  const kv = new MemoryKv();
  const response = await handleBooking(req(), envFor(kv), {});
  assert.equal(response.status, 200);
  const saved = await state(kv);
  assert.equal(saved.crm, 'synced'); assert.equal(saved.delivery.slack.state, 'failed');
  const before = calls.length;
  await handleBooking(req(), envFor(kv), {}); assert.equal(calls.length, before);
});

test('network failures are uncertain, not success, and cannot silently resend', async (t) => {
  const calls = mocked(t, href => {
    if (href === SLACK) throw new Error('network lost after request');
    return undefined;
  });
  const kv = new MemoryKv(); await handleBooking(req(), envFor(kv), {});
  assert.equal((await state(kv)).delivery.slack.state, 'uncertain');
  const before = calls.length;
  await handleBooking(req(), envFor(kv), {}); assert.equal(calls.length, before);
});

test('outbound timeout aborts a stalled operation and reports uncertainty', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = withWebsiteTimeout(signal => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  t.mock.timers.tick(WEBSITE_OUTBOUND_TIMEOUT_MS);
  assert.deepEqual(await pending, { ok: false, status: 0, uncertain: true });
});

test('strict Slack allowlist rejects lookalikes, credentials, query, fragments, other ports and redirect destinations', () => {
  assert.equal(websiteSlackWebhook({ WEBSITE_REQUEST_SLACK_WEBHOOK_URL: SLACK }), SLACK);
  for (const value of [SLACK.replace('hooks.slack.com', 'hooks.slack.com.evil.test'),
    SLACK.replace('https:', 'http:'), SLACK.replace('https://', 'https://user:pass@'),
    `${SLACK}?x=1`, `${SLACK}#x`, SLACK.replace('.com/', '.com:8443/'),
    'https://hooks.slack.com/services/a/b/c', `${SLACK}/extra`]) {
    assert.equal(websiteSlackWebhook({ WEBSITE_REQUEST_SLACK_WEBHOOK_URL: value }), '', value);
  }
});

test('Slack treats submitted content as escaped plain text, never automatic mentions or markdown', () => {
  const payload = buildWebsiteSlackPayload(valid({ dealershipName: '<!channel> & <@U123> *bold*',
    fullName: '<https://evil.example|click>', crm: 'synced', crmContactId: 'c1' }));
  const text = JSON.stringify(payload);
  assert.doesNotMatch(text, /<!channel>|<@U123>|"type":"mrkdwn"/);
  assert.match(text, /&lt;!channel&gt; &amp; &lt;@U123&gt;/);
  assert.equal(payload.parse, 'none'); assert.equal(payload.unfurl_links, false);
  assert.equal(payload.unfurl_media, false);
});

test('WebsiteRequest is server-only and production-only, distinct from Lead and all other services', async (t) => {
  const calls = mocked(t); const kv = new MemoryKv();
  const env = envFor(kv, { SEND_WORKER_WEBSITE_REQUEST_CAPI: 'true',
    META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'test-meta-token' });
  await handleBooking(req(), env, {});
  const meta = calls.filter(c => c.href.startsWith('https://graph.facebook.com/'));
  assert.equal(meta.length, 1);
  const event = meta[0].payload.data[0];
  assert.equal(event.event_name, 'WebsiteRequest'); assert.equal(event.event_source_url, PAGE);
  assert.equal(event.custom_data.content_category, 'dealer_websites');
  assert.equal(event.custom_data.projectGoal, PROJECT_GOAL_CHOICES[0]);
  assert.equal(event.event_id, `websiterequest_${(await sha256Hex(`website-request:${sid()}`)).slice(0, 32)}`);
  assert.ok(!JSON.stringify(event.user_data).includes('jamie@example.com'));
  assert.equal((await state(kv)).delivery.meta.state, 'succeeded');
  const before = calls.length;
  await handleBooking(req(), env, {}); assert.equal(calls.length, before);
  await handleBooking(req(valid({ submissionId: sid(2) }), 'https://preview.autolander.ai'), env, {});
  assert.equal(calls.filter(c => c.href.startsWith('https://graph.facebook.com/')).length, 1);
  assert.equal((await state(kv, 2)).delivery.meta.reason, 'not_production');
});

test('Meta failure is retained and request receipt is not a false Meta delivery confirmation', async (t) => {
  mocked(t, href => href.startsWith('https://graph.facebook.com/') ? Response.json({ error: 'rejected' }, { status: 400 }) : undefined);
  const kv = new MemoryKv();
  const response = await handleBooking(req(), envFor(kv, { SEND_WORKER_WEBSITE_REQUEST_CAPI: 'true',
    META_PIXEL_ID: '2087440198847151', META_CAPI_ACCESS_TOKEN: 'test-meta-token' }), {});
  assert.equal(response.status, 200); assert.equal((await state(kv)).delivery.meta.state, 'failed');
});

test('no-JS success and error redirect to dedicated receipts without PII in URLs', async (t) => {
  mocked(t);
  const response = await handleBooking(form(), envFor(), {});
  assert.equal(response.status, 303); assert.equal(response.headers.get('Location'), `${PAGE}?sent=1#${WEBSITE_SUCCESS_ID}`);
  const invalid = await handleBooking(form({ email: 'private bad address' }), envFor(), {});
  assert.equal(invalid.headers.get('Location'), `${PAGE}?error=invalid_email#${WEBSITE_ERROR_ID}`);
  const disabled = await handleBooking(form(), envFor(new MemoryKv(), { WEBSITE_REQUEST_PUBLIC_ROUTE: 'off' }), {});
  assert.equal(disabled.headers.get('Location'), `${PAGE}?error=unavailable#${WEBSITE_ERROR_ID}`);
});

test('Marketplace off-ramp and honeypot do not reach any downstream provider', async (t) => {
  const calls = mocked(t); const kv = new MemoryKv();
  const offRamp = await handleBooking(req(valid({ role: MARKETPLACE_ROUTE.value })), envFor(kv), {});
  assert.equal((await offRamp.json()).demoUrl, MARKETPLACE_DEMO_URL);
  assert.equal(kv.puts.length, 0);
  const spam = await handleBooking(req(valid({ company: 'bot' })), envFor(kv), {});
  assert.equal(spam.status, 200); assert.equal((await state(kv)).status, 'spam');
  assert.equal(calls.length, 0);
});

test('rate-limit keys are scoped to website requests, not scans or paid ads', async (t) => {
  mocked(t); const limits = new MemoryKv();
  const response = await handleBooking(req(), envFor(new MemoryKv(), { DISABLE_RATE_LIMITS: 'false', CHAT_RATE_LIMITS: limits }), {});
  assert.equal(response.status, 200);
  assert.ok(limits.values.size >= 2);
  assert.ok([...limits.values.keys()].every(k => k.startsWith('website_request:')));
});
