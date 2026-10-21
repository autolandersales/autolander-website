import assert from 'node:assert/strict';
import test from 'node:test';

import * as WEB from '../shared/dealer-websites-content.js';
import { FAQ, FORM, HERO, META, PROOF } from '../shared/dealer-websites-content.js';
import { MARKETPLACE_DEMO_PATH, MARKETPLACE_ROUTE, ROLE_CHOICES } from '../shared/dealer-websites-form.js';
import { WEBSITE_FORM_ID } from '../shared/dealer-websites-route.js';
import { renderDealerWebsitesMirrorRest } from '../src/websites/static-mirror.js';
import { HTMLParser } from './helpers/html-text.js';

const text = (html) => new HTMLParser().textOf(html);

function collectStrings(value, into = []) {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, into));
  return into;
}

test('copy module keeps the public copy rules: no dashes, hype, competitor names, prices or result promises', () => {
  const strings = collectStrings(WEB);
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
    /\$\d/,
    /\bper month\b|\/mo\b|\bsetup fee\b/i,
    /\bCARVID\b|\bDealer\.com\b|\bDealerOn\b|\bDealer Inspire\b|\bCDK\b|\bShiftly\b/i,
    /\bcertified\b(?! provider)/i,
    /\brank(?:s|ed|ing)? (?:first|#1|on page one)\b/i,
  ];
  banned.forEach((pattern) => assert.doesNotMatch(pattern === guarantee ? copyForGuarantee : copy, pattern, String(pattern)));
  // Denial-then-reveal cadence, checked string by string.
  const cadence = /\bnot\b[^.!?]{0,120}[.!?]\s+(?:It|It’s|It's|This|That’s|That's)\b/i;
  strings.forEach((value) => assert.doesNotMatch(value, cadence, value.slice(0, 80)));
  const guaranteeItems = FAQ.filter((item) => /guarantee/i.test(item.q));
  assert.equal(guaranteeItems.length, 1);
  assert.ok(guaranteeItems.every((item) => item.allow && item.a.startsWith('No.')));
  FAQ.forEach((item) => assert.doesNotMatch(item.a, /guarantee/i, item.q));
  // Every "promise" in an answer or a list is a denial or a process promise with a step we control.
  for (const value of strings) {
    for (const match of value.matchAll(/[^.!?]*\bpromise\b[^.!?]*[.!?]/gi)) {
      assert.match(match[0], /\b(?:never|no provider|do not|cannot|not a promise|not a forecast or a promise|What we promise|What we never promise)\b/i, match[0]);
    }
  }
});

test('proof is the dealership count plus qualitative points, captioned as our own business; the hero CTA is the form CTA', () => {
  assert.deepEqual(PROOF.stats.map((stat) => stat.value), ['200+']);
  assert.ok(PROOF.points.length >= 2 && PROOF.points.every((point) => point.title && point.body && !/\d/.test(`${point.title} ${point.body}`)));
  assert.match(PROOF.caption, /not a forecast or a promise/);
  assert.doesNotMatch(`${PROOF.lead} ${PROOF.caption}`, /Lighthouse|CRM|read on|\d{4}/i);
  assert.equal(HERO.cta, FORM.submit);
  assert.ok(META.title.length <= 60);
  assert.ok(META.description.length <= 160);
});

test('the no-JS mirror renders every section of the copy module in order, with one form and the FAQ verbatim', () => {
  const html = renderDealerWebsitesMirrorRest({ capiUrl: 'https://autolander.ai' });
  const body = text(html);
  for (const needle of [PROOF.title, WEB.PROBLEM.title, WEB.BUILD.title, WEB.SEARCH.title, WEB.PROCESS.title, WEB.FIT.title, WEB.PROMISES.title, WEB.NEVER_PROMISE.title, FORM.title, WEB.FINAL.h2Lead, ...PROOF.points.map((point) => point.title)]) {
    assert.ok(body.includes(needle), needle);
  }
  const order = ['id="proof"', 'id="why-a-new-site"', 'id="the-build"', 'id="search-foundations"', 'id="your-plan"', 'id="fit"', 'id="website-request-form"', 'id="website-questions"'].map((id) => html.indexOf(id));
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sections keep the designed order');
  assert.ok(order.every((index) => index > 0));
  for (const stat of PROOF.stats) assert.ok(body.includes(stat.label), stat.label);
  for (const item of [...WEB.PROMISES.items, ...WEB.NEVER_PROMISE.items, ...WEB.FIT.good, ...WEB.FIT.bad]) assert.ok(body.includes(item), item);
  assert.equal((html.match(/<form\b/g) || []).length, 1);
  assert.doesNotMatch(html, /\$\d/);
  assert.doesNotMatch(html, /<footer\b|dw-footer|dw-mobile-example/);
});

test('the salesperson FAQ points at the demo link the page renders; the website form never claims to reach the demo', () => {
  // The website form has no Marketplace role, so a salesperson who fills it in files a website application.
  assert.ok(!ROLE_CHOICES.includes(MARKETPLACE_ROUTE.value) && !ROLE_CHOICES.includes(MARKETPLACE_ROUTE.label));
  const salesperson = FAQ.filter((item) => /\bsell cars\b/i.test(item.q));
  assert.equal(salesperson.length, 1);
  assert.ok(salesperson[0].a.includes(FORM.aside.demoLink), 'the answer names the demo link by its label');
  for (const value of collectStrings(WEB)) {
    assert.doesNotMatch(value, /\bform below\b|\bform\b[^.!?]{0,40}\b(?:sends|takes|routes) you\b[^.!?]{0,40}\bdemo\b/i, value.slice(0, 90));
  }
  const html = renderDealerWebsitesMirrorRest({ capiUrl: 'https://autolander.ai' });
  const demo = html.indexOf(`href="${MARKETPLACE_DEMO_PATH}"`);
  const form = html.indexOf(`<form id="${WEBSITE_FORM_ID}"`);
  const section = html.lastIndexOf('<section', form);
  assert.ok(demo > section && demo < form, 'the demo link sits in the request section, next to the form');
  assert.ok(text(html.slice(demo, form)).includes(FORM.aside.demoLink));
  assert.ok(html.indexOf('id="website-questions"') > form, 'the FAQ follows the form');
});
