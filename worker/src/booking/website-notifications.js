import { META_GRAPH_VERSION } from '../capi/meta-client.js';
import { redactTrackingValue } from '../../../shared/tracking-scope.js';

// Six worst-case downstream calls (four CRM, Slack, Meta) fit within the
// Worker's 30-second waitUntil window. Keep failures as data, never log secrets.
export const WEBSITE_OUTBOUND_TIMEOUT_MS = 4000;

export function websiteSlackWebhook(env) {
  const raw = typeof env.WEBSITE_REQUEST_SLACK_WEBHOOK_URL === 'string'
    ? env.WEBSITE_REQUEST_SLACK_WEBHOOK_URL.trim() : '';
  // Exact Slack host + incoming-webhook shape. No credentials, query, fragment,
  // alternate port, redirects or arbitrary user-supplied destination.
  if (!/^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9]{12,}$/.test(raw)) return '';
  return raw;
}

export async function withWebsiteTimeout(operation) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBSITE_OUTBOUND_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } catch {
    return { ok: false, status: 0, uncertain: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function buildWebsiteSlackPayload(record) {
  const field = (label, value) => ({ type: 'plain_text', text: `${label}\n${safeText(value) || 'Not provided'}`, emoji: false });
  return {
    text: 'NEW WEBSITE REQUEST — review the dealership website project request.',
    parse: 'none',
    unfurl_links: false,
    unfurl_media: false,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'NEW WEBSITE REQUEST', emoji: false } },
      { type: 'section', fields: [
        field('Dealership', record.dealershipName), field('City / ZIP', record.location),
        field('Project', record.projectGoal), field('Current website', record.website),
        field('Contact / role', `${record.fullName} — ${record.role}`), field('Email', record.email),
        field('Phone', record.phone), field('CRM delivery', record.crm),
      ] },
      { type: 'context', elements: [{ type: 'plain_text', emoji: false,
        text: `Request: ${safeText(record.submissionId, 96)} | Contact: ${safeText(record.crmContactId, 120) || 'Needs review'} | SMS consent: ${record.smsConsent ? 'given for this request only; check CRM note before texting' : 'not given'}`,
      }] },
    ],
  };
}

export async function sendWebsiteRequestAlert(env, record) {
  const webhook = websiteSlackWebhook(env);
  if (!webhook) return { ok: false, status: 0, reason: 'not_configured' };
  return withWebsiteTimeout(async (signal) => {
    const response = await fetch(webhook, {
      method: 'POST', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWebsiteSlackPayload(record)),
    });
    const accepted = response.ok && (await response.text()).trim() === 'ok';
    return { ok: accepted, status: response.status,
      uncertain: !accepted && (response.ok || response.status >= 500) };
  });
}

export async function sendWebsiteMetaEvent(env, event) {
  if (!/^\d+$/.test(String(env.META_PIXEL_ID || '')) || !env.META_CAPI_ACCESS_TOKEN) {
    return { ok: false, status: 0, reason: 'not_configured' };
  }
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${env.META_PIXEL_ID}/events`);
  url.searchParams.set('access_token', env.META_CAPI_ACCESS_TOKEN);
  return withWebsiteTimeout(async (signal) => {
    const body = { data: [redactTrackingValue(event)] };
    if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;
    const response = await fetch(url, {
      method: 'POST', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    const accepted = response.ok && result?.events_received === 1;
    return { ok: accepted, status: response.status,
      uncertain: !accepted && (response.ok || response.status >= 500) };
  });
}
