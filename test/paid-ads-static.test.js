import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ADS from '../shared/paid-ads-content.js';
import { FAQ, FORM, HEADLINES, META, PLANS, PROOF, SMS_CONSENT } from '../shared/paid-ads-content.js';
import { AD_BUDGET_CHOICES, ADS_TODAY_CHOICES, ROLE_CHOICES, UNITS_CHOICES } from '../shared/paid-ads-form.js';
import { PAID_ADS_API_PATH, PAID_ADS_DIR, PAID_ADS_FORM_ID, PAID_ADS_PATH } from '../shared/paid-ads-route.js';
import { NAV, SPA_PAGE_PATHS } from '../scripts/seo/registry.mjs';
import { PAID_ADS_CANONICAL, paidAdsGraph, paidAdsHead } from '../scripts/seo/data-paid-ads.mjs';
import { renderPaidAdsMirror, renderPaidAdsMirrorRest } from '../src/ads/static-mirror.js';
import { HTMLParser } from './helpers/html-text.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');
const text = (html) => new HTMLParser().textOf(html);

function collectStrings(value, into = []) {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, into));
  return into;
}

test('the page URL lives in one route module and is registered as an SPA page', () => {
  assert.equal(PAID_ADS_PATH, '/meta-ads-for-car-dealers/');
  assert.equal(PAID_ADS_DIR, 'meta-ads-for-car-dealers');
  assert.equal(PAID_ADS_API_PATH, '/api/ads-apply');
  assert.equal(PAID_ADS_FORM_ID, 'apply-form');
  assert.equal(NAV.paidAds.path, PAID_ADS_PATH);
  assert.ok(SPA_PAGE_PATHS.includes(PAID_ADS_PATH));
  assert.equal(PAID_ADS_CANONICAL, `https://autolander.ai${PAID_ADS_PATH}`);
});

test('content module keeps the public copy rules, the three plans and first-party proof only', () => {
  assert.deepEqual(PLANS.map(({ name, availability }) => ({ name, availability })), [
    { name: 'Launch', availability: 'open' },
    { name: 'Growth', availability: 'open' },
    { name: 'Market Leader', availability: 'by-application' },
  ]);
  const strings = collectStrings(ADS);
  const copy = strings.join('\n');
  const allowedQuestions = new Set(FAQ.filter((item) => item.allow).map((item) => item.q));
  const copyForGuarantee = strings.filter((value) => !allowedQuestions.has(value)).join('\n');
  const guarantee = /\bguarantee/i;
  const banned = [
    /[–—]/u,
    /\bpowered by\b/i,
    /\b#1\b/i,
    guarantee,
    /\bdominate\b/i,
    /\bown your market\b/i,
    /\bban-proof\b|\bno bans?\b/i,
    /\bROAS\b/,
    /\bcredits?\b(?! card)/i,
    /\bShiftly\b|\bDealers United\b|\bHyros\b/i,
    /(?<!co-)\bfounder\b/i,
  ];
  banned.forEach((pattern) => assert.doesNotMatch(pattern === guarantee ? copyForGuarantee : copy, pattern));
  // Denial-then-reveal cadence, checked string by string (a join would pair the end of one string with the next).
  const cadence = /\bnot\b[^.!?]{0,120}[.!?]\s+(?:It|It’s|It's|This|That’s|That's)\b/i;
  strings.forEach((value) => assert.doesNotMatch(value, cadence, value.slice(0, 80)));
  const guaranteeItems = FAQ.filter((item) => /guarantee/i.test(item.q));
  assert.equal(guaranteeItems.length, 1);
  assert.ok(guaranteeItems.every((item) => item.allow && item.a.startsWith('No.')));
  FAQ.forEach((item) => assert.doesNotMatch(item.a, /guarantee/i, item.q));
  // Every "promise" in an answer is a denial or a process promise with a step we control.
  for (const item of FAQ) {
    for (const match of item.a.matchAll(/[^.!?]*\bpromise\b[^.!?]*[.!?]/gi)) {
      assert.match(match[0], /\b(?:no one|nobody|can’t|cannot|never|do not|steps we control|promised number)\b/i, `${item.q}: ${match[0]}`);
    }
  }
  // No fee or plan price on the page (Romeo 10-15): the only dollar figures are the dealer's ad-budget bands and the proof line.
  for (const plan of PLANS) for (const key of ['monthly', 'setup', 'minSpend', 'price']) assert.ok(!(key in plan), `${plan.name}.${key}`);
  const budgetTokens = new Set([...AD_BUDGET_CHOICES.join(' ').matchAll(/\$\d{1,3}(?:,\d{3})*/g)].map((m) => m[0]));
  const dollarTokens = new Set(copy.match(/\$\d{1,3}(?:,\d{3})*/g) || []);
  for (const token of dollarTokens) assert.ok(budgetTokens.has(token) || token === '$22', `${token} must be an ad-budget band or the under-$22 proof line`);
  assert.doesNotMatch(copy, /\b(?:a month plus|one-time setup|per month|\/mo)\b/i);
  // The proof block is dated and disclaimed as our own account, never a forecast.
  assert.match(PROOF.caption, /AutoLander’s own Meta ad account/);
  assert.match(PROOF.caption, /not a forecast or a promise/);
  assert.match(PROOF.window, /September 7 to October 6, 2026/);
  assert.equal(PROOF.stats[0].value, '447');
  assert.equal(PROOF.stats[1].value, '200+');
  assert.equal(PROOF.stats[2].value, '240+');
});

test('title, description and headline fit the page contract', () => {
  assert.ok(META.title.length <= 60, META.title.length);
  assert.doesNotMatch(META.title, /&/);
  assert.ok(META.description.length <= 160, META.description.length);
  assert.ok(HEADLINES.a.length < 110);
  assert.ok(HEADLINES.b.length < 80);
  assert.equal(FAQ.length, 13);
});

test('the form contract matches the Worker: choice lists, consent version, field names, native action and WebMCP', () => {
  const rest = renderPaidAdsMirrorRest({ capiUrl: 'https://autolander.ai' });
  const form = rest.match(/<form id="apply-form"[\s\S]*?<\/form>/)[0];
  assert.match(form, /method="post" action="https:\/\/autolander\.ai\/api\/ads-apply"/);
  assert.ok(form.includes(`toolname="${FORM.webmcp.toolname}"`));
  for (const name of ['dealershipName', 'website', 'location', 'unitsPerMonth', 'adBudget', 'adsToday', 'fullName', 'role', 'email', 'phone']) {
    assert.ok(form.includes(`name="${name}"`), name);
    assert.ok(form.includes(`id="apply-${name}"`), name);
  }
  for (const choice of [...UNITS_CHOICES, ...AD_BUDGET_CHOICES, ...ADS_TODAY_CHOICES, ...ROLE_CHOICES]) {
    assert.ok(form.includes(`<option value="${choice.replaceAll('&', '&amp;')}">`), choice);
  }
  assert.ok(form.includes(`<input type="hidden" name="smsConsentVersion" value="${SMS_CONSENT.version}" />`));
  assert.match(form, /name="smsConsent" type="checkbox" value="true"(?![^>]*checked)/);
  assert.ok(form.includes('name="company"'), 'honeypot');
  assert.doesNotMatch(form, /marketplace-posting-tool/, 'the no-JS form never offers the Marketplace route as a role');
  assert.ok(text(form).includes(SMS_CONSENT.text));
});

test('the mirror and the head agree with the content: one h1, FAQ parity, JSON-LD offers from PLANS, indexable', () => {
  const mirror = renderPaidAdsMirror();
  assert.equal((mirror.match(/<h1\b/g) || []).length, 1);
  assert.ok(text(mirror).includes(HEADLINES.a));
  for (const { q, a } of FAQ) {
    assert.ok(text(mirror).includes(q), q);
    assert.ok(text(mirror).includes(a), q);
  }
  assert.doesNotMatch(mirror, /[–—]/u);
  assert.doesNotMatch(mirror, /[\w.%+-]+@[\w-]+\.[\w.-]+/, 'no raw e-mail address in the no-JS page');
  assert.match(mirror, /<video class="[^"]*" src="\/paid-ads\/slow-day-commercial\.mp4" controls playsinline preload="none"/);
  const graph = paidAdsGraph()['@graph'];
  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map((entry) => [entry.name, entry.acceptedAnswer.text]), FAQ.map(({ q, a }) => [q, a]));
  const service = graph.find((node) => node['@type'] === 'Service');
  assert.deepEqual(service.offers.map((offer) => offer.name), PLANS.map((plan) => plan.name));
  assert.ok(service.offers.every((offer) => !('price' in offer) && !('priceSpecification' in offer)), 'no price in JSON-LD');
  const head = paidAdsHead();
  assert.match(head, /<meta name="robots" content="index, follow/);
  assert.doesNotMatch(paidAdsHead({ preview: true }), /name="robots"/);
  assert.ok(head.includes(`<link rel="canonical" href="${PAID_ADS_CANONICAL}" />`));
  assert.match(head, /og:image" content="https:\/\/autolander\.ai\/og\/paid-ads\.jpg"/);
});

test('the hosted media and image sources the page references exist', () => {
  for (const file of ['public/paid-ads/slow-day-commercial.mp4', 'public/paid-ads/slow-day-loop.mp4', 'public/og/paid-ads.jpg', 'public/paid-ads/commercial-poster-640.avif', 'public/paid-ads/commercial-close-960.webp']) {
    assert.ok(readFileSync(resolve(ROOT, file)).length > 1000, file);
  }
  const sections = read('src/ads/PaidAdsSections.jsx');
  assert.match(sections, /COMMERCIAL_SRC = '\/paid-ads\/slow-day-commercial\.mp4'/);
  assert.match(sections, /LOOP_SRC = '\/paid-ads\/slow-day-loop\.mp4'/);
});

test('React and mirror sources carry no dashes and the form exposes native fallback, WebMCP and consent controls', () => {
  for (const file of ['src/ads/PaidAdsApp.jsx', 'src/ads/PaidAdsSections.jsx', 'src/ads/static-mirror.js', 'shared/paid-ads-content.js']) {
    assert.doesNotMatch(read(file), /[—–]/, file);
  }
  const app = read('src/ads/PaidAdsApp.jsx');
  assert.match(app, /id=\{PAID_ADS_FORM_ID\}[\s\S]*?method="post"[\s\S]*?action=\{APPLY_URL\}/);
  assert.match(app, /toolname=\{FORM\.webmcp\.toolname\}/);
  assert.doesNotMatch(app, /toolautosubmit/i);
  for (const name of ['dealershipName', 'website', 'location', 'fullName', 'role', 'email', 'phone']) {
    assert.ok(app.includes(`htmlFor="apply-${name}"`), name);
    assert.ok(app.includes(`name="${name}"`), name);
  }
  for (const name of ['unitsPerMonth', 'adBudget', 'adsToday']) assert.ok(app.includes(`'${name}'`), name);
  assert.match(app, /name="smsConsent" value="true" type="checkbox"/);
  assert.match(app, /name="smsConsentVersion" value=\{SMS_CONSENT\.version\}/);
  assert.match(app, /name="submittedVia" value="form"/);
  assert.match(app, /event\.nativeEvent\?\.agentInvoked/);
  const request = read('src/ads/apply-request.js');
  assert.match(request, /submittedVia: 'fetch'/);
  assert.match(request, /smsConsentVersion: SMS_CONSENT\.version/);
  assert.doesNotMatch(request, /from '[^']*(?:ai-visibility-content|scan-request)/, 'the ads chunk imports nothing from the AEO page');
});
