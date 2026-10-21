import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeWebsite, validateWebsiteRequest } from '../src/websites/website-request.js';
import { PROJECT_GOAL_CHOICES, ROLE_CHOICES } from '../shared/dealer-websites-form.js';
import { renderDealerWebsitesMirrorRest } from '../src/websites/static-mirror.js';
import { FORM, HERO, ILLUSTRATIONS } from '../shared/dealer-websites-content.js';

const valid = { dealershipName: 'Example Motors', website: '', location: 'Tampa, FL', projectGoal: PROJECT_GOAL_CHOICES[0], fullName: 'Jamie Dealer', role: ROLE_CHOICES[0], email: 'jamie@example.com', phone: '(212) 555-0123' };
test('a dealer without a current website can request a build', () => {
  assert.equal(validateWebsiteRequest(valid), null);
  assert.equal(normalizeWebsite(''), '');
  assert.equal(normalizeWebsite('example.com'), 'https://example.com/');
  for (const value of ['javascript:alert(1)', 'https://name:pass@example.com/', 'https://localhost', 'https://example.com:8443/', 'bad site']) assert.equal(normalizeWebsite(value), '');
});
test('required fields have actionable validation and known choice values', () => {
  for (const [field, reason] of Object.entries({ dealershipName: 'missing_dealership', location: 'missing_location', projectGoal: 'missing_project_goal', fullName: 'missing_full_name', role: 'missing_role', email: 'invalid_email', phone: 'invalid_phone' })) {
    assert.deepEqual(validateWebsiteRequest({ ...valid, [field]: '' }), [field, reason]);
    assert.ok(FORM.errors[reason]);
  }
  assert.deepEqual(validateWebsiteRequest({ ...valid, website: 'bad site' }), ['website', 'invalid_website']);
  assert.deepEqual(validateWebsiteRequest({ ...valid, projectGoal: 'Invented plan' }), ['projectGoal', 'missing_project_goal']);
});
test('native fallback has optional website, unchecked consent, receipt/error anchors and one clear CTA', () => {
  const html = renderDealerWebsitesMirrorRest();
  assert.match(html, /id="website-request-success"/);
  assert.match(html, /id="website-request-error"/);
  const website = html.match(/<input[^>]+name="website"[^>]*>/)?.[0];
  assert.ok(website); assert.doesNotMatch(website, /required/);
  const consent = html.match(/<input[^>]+name="smsConsent"[^>]*>/)?.[0];
  assert.ok(consent); assert.doesNotMatch(consent, /checked/);
  for (const field of FORM.fields) assert.match(html, new RegExp(`id="website-${field.name}"`));
  assert.equal(HERO.cta, FORM.submit);
  assert.ok(html.includes(ILLUSTRATIONS.caption), 'island illustrations carry the concept caption');
  assert.doesNotMatch(html, /<footer\b/);
});
test('browser emits no service conversion, success depends on HTTP acceptance and failed requests preserve details', () => {
  const request = readFileSync(new URL('../src/websites/website-request.js', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/websites/DealerWebsitesApp.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(request + page, /fbq\s*\(|trackCustom\s*\(|track\(['"]Lead/);
  assert.match(request, /Boolean\(response.ok && data.ok\)/);
  assert.match(page, /if \(result.ok\) showSuccess/);
  assert.doesNotMatch(page, /form\.reset\(/);
  assert.match(page, /if \(busy\) return/);
  assert.match(page, /AbortController/);
});
