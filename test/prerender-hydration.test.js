import assert from 'node:assert/strict';
import test from 'node:test';
import { HERO, FORM } from '../shared/ai-visibility-content.js';
import { CHIPS, DEMO_LINE, HEADLINES, SUBS } from '../shared/team-content.js';
import { renderAiVisibilityMirrorRest } from '../src/ai/static-mirror.js';
import { renderTeamMirrorRest } from '../src/team/static-mirror.js';
import { renderPaidAdsMirrorRest } from '../src/ads/static-mirror.js';
import { HEADLINES as ADS_HEADLINES, FORM as ADS_FORM } from '../shared/paid-ads-content.js';
import { HERO as WEBSITE_HERO, ILLUSTRATIONS as WEBSITE_ILLUSTRATIONS } from '../shared/dealer-websites-content.js';
import { renderDealerWebsitesMirrorRest } from '../src/websites/static-mirror.js';
import { teamVariantFromSearch } from '../src/team/variant.js';
import { cleanSsr, loadPrerender } from '../scripts/prerender.mjs';
import { HTMLParser } from './helpers/html-text.js';

// The same build-time renderer scripts/spa-fallback.mjs uses (esbuild bundle of src/prerender.jsx).
const P = await loadPrerender({ env: { VITE_CAPI_URL: 'https://autolander.ai' } });
const LOGO_HEAD = '<link rel="preload" as="image" href="/autolander-logo-240.webp" imagesrcset="/autolander-logo-200.webp 200w, /autolander-logo-240.webp 240w, /autolander-logo.png 400w" />';
const text = (html) => new HTMLParser().textOf(html);

const renders = {
  ai: (restHtml = renderAiVisibilityMirrorRest()) => P.renderAiVisibility({ restHtml }),
  team: (restHtml = renderTeamMirrorRest()) => P.renderTeam({ restHtml, variant: 'a' }),
  ads: (restHtml = renderPaidAdsMirrorRest()) => P.renderPaidAds({ restHtml, variant: 'a' }),
  websites: (restHtml = renderDealerWebsitesMirrorRest()) => P.renderDealerWebsites({ restHtml }),
};
const mirrors = { ai: renderAiVisibilityMirrorRest, team: renderTeamMirrorRest, ads: renderPaidAdsMirrorRest, websites: renderDealerWebsitesMirrorRest };
const shape = {
  ai: { island: 'ai-rest', h1Text: `${HERO.h1Lead} ${HERO.h1Grad}` },
  team: { island: 'team-rest', h1Text: HEADLINES.a },
  ads: { island: 'ads-rest', h1Text: ADS_HEADLINES.a },
  websites: { island: 'websites-rest', h1Text: `${WEBSITE_HERO.h1Lead} ${WEBSITE_HERO.h1Grad}` },
};

function withBrowserGlobals(fn) {
  const saved = ['window', 'document', 'navigator', 'location'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const location = new URL('https://autolander.ai/team/?v=b&sent=1&error=invalid_email&preview=proof#scan-form');
  const window = {
    location, scrollY: 999, innerWidth: 390, innerHeight: 844,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {}, sessionStorage: { getItem: () => '1', setItem() {} },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Mozilla/5.0 (iPhone)' } });
  try { return fn(); } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

for (const route of ['ai', 'team', 'ads', 'websites']) {
  test(`${route}: the prerender is deterministic and reads nothing from the browser`, () => {
    const first = renders[route]();
    assert.equal(renders[route](), first, 'two renders differ');
    // The client hydrates with whatever window/navigator hold; the markup must not depend on them.
    assert.equal(withBrowserGlobals(() => renders[route]()), first, 'the render reads window/navigator/location');
  });

  test(`${route}: the island is adopted verbatim, so the client (which passes the live DOM's markup) matches`, () => {
    const sentinel = '<!--AL_SENTINEL--><p>island</p>';
    const withSentinel = renders[route](sentinel);
    const empty = renders[route]('');
    assert.equal(withSentinel.replace(sentinel, ''), empty);
    assert.ok(renders[route]().includes(`<div data-al-island="${shape[route].island}">${mirrors[route]()}</div></main>`));
  });

  test(`${route}: cleanSsr yields #root content hydration can adopt`, () => {
    const root = cleanSsr(renders[route](), { ...shape[route], headHtml: LOGO_HEAD });
    assert.ok(root.startsWith('<div class="min-h-dvh bg-[#050505]'), 'React first element leads, no whitespace, no hoisted link');
    assert.equal((root.match(/<h1\b/g) || []).length, 1);
    assert.equal((root.match(/<main id="main-content">/g) || []).length, 1);
    assert.equal((root.match(/data-al-island="/g) || []).length, 1);
    const react = root.replace(/<div data-al-island="[^"]+">[\s\S]*<\/div><\/main>/, '</main>');
    assert.doesNotMatch(react, /<link\b|<script\b|<!--\$|<!--\/\$/, 'no stray resource tags or Suspense boundaries');
    assert.doesNotMatch(react, /@autolander\.ai/, 'no raw address outside the email_off-protected island');
    assert.doesNotMatch(react, /(?<!Chat)\bGPT\b/, 'say ChatGPT, never the bare model name GPT (Michael, 2026-09-30)');
    assert.doesNotMatch(text(root), /\w\?\w|�/u, 'no broken characters');
    // Only the nav logo may be hoisted, and only because the head already preloads it.
    assert.throws(() => cleanSsr(renders[route](), { ...shape[route], headHtml: '' }), /not already in the head/);
    assert.throws(() => cleanSsr(`\n${renders[route]()}`, { ...shape[route], headHtml: LOGO_HEAD }), /must start/);
    assert.throws(() => cleanSsr(renders[route](), { ...shape[route], h1Text: 'Drifted', headHtml: LOGO_HEAD }), /h1 drifted/);
  });
}

test('websites hero: the service CTA and native form survive before hydration', () => {
  const root = cleanSsr(renders.websites(), { ...shape.websites, headHtml: LOGO_HEAD });
  const hero = root.slice(0, root.indexOf('data-al-island'));
  assert.match(hero, /<nav aria-label="Main navigation"/);
  assert.match(hero, /<a href="#website-request-form"/);
  assert.doesNotMatch(hero, /data-demo-application-trigger|id="website-request-form"/);
  const island = root.slice(root.indexOf('data-al-island'));
  const forms = island.match(/<form\b[^>]*>/g) || [];
  assert.equal(forms.length, 1);
  assert.match(forms[0], /\bid="website-request-form"/);
  assert.match(forms[0], /\bmethod="post"/);
  assert.match(forms[0], /\baction="https:\/\/autolander\.ai\/api\/website-request"/);
});

test('websites hero: one eager illustration with its concept caption; island images are lazy', () => {
  const root = cleanSsr(renders.websites(), { ...shape.websites, headHtml: LOGO_HEAD });
  const hero = root.slice(0, root.indexOf('data-al-island'));
  assert.equal((hero.match(/fetchpriority="high"/gi) || []).length, 1);
  assert.ok(text(hero).includes(WEBSITE_ILLUSTRATIONS.hero.caption));
  // The island's two illustrations, then the shared footer's logo: everything after the hero is lazy.
  const island = root.slice(root.indexOf('data-al-island'), root.indexOf('</main>'));
  assert.equal((island.match(/<img\b[^>]*>/g) || []).length, 2);
  const imgs = root.slice(root.indexOf('data-al-island')).match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.every((tag) => tag.includes('loading="lazy"') && !/fetchpriority/i.test(tag)));
});

test('ai hero: the first screen is React\'s hero with its no-JS anchor and one eager hero image', () => {
  const root = cleanSsr(renders.ai(), { ...shape.ai, headHtml: LOGO_HEAD });
  const hero = root.slice(0, root.indexOf('data-al-island'));
  assert.ok(hero.includes('<nav aria-label="Main navigation"'), 'nav is prerendered');
  assert.match(hero, /<p class="al-ai-summary[^"]*">/, 'the speakable summary selector is on the hero paragraph');
  assert.ok(text(hero).includes(HERO.summary));
  assert.match(hero, /<a href="#scan-form" data-scan-cta=""/, 'the hero CTA is a real in-page link without JS');
  for (const chip of HERO.chips) assert.ok(text(hero).includes(chip), chip);
  assert.ok(text(hero).includes(HERO.trustLine));
  assert.equal((hero.match(/fetchPriority="high"|fetchpriority="high"/gi) || []).length, 1, 'exactly one high-priority image');
  assert.ok(!hero.includes('id="scan-form"'), 'the form lives in the island until the page goes live');
  const island = root.slice(root.indexOf('data-al-island'));
  assert.equal((island.match(/<form id="scan-form" method="post" action="https:\/\/autolander\.ai\/api\/ai-scan"/g) || []).length, 1);
  assert.ok(island.includes(`toolname="${FORM.webmcp.toolname}"`));
});

test('team hero: variant a headline, sub, demo line, chips and the demo trigger contract', () => {
  const root = cleanSsr(renders.team(), { ...shape.team, headHtml: LOGO_HEAD });
  const hero = root.slice(0, root.indexOf('data-al-island'));
  const heroText = text(hero);
  for (const copy of [HEADLINES.a, SUBS.a, DEMO_LINE, ...CHIPS]) assert.ok(heroText.includes(copy), copy);
  assert.match(hero, /data-headline-variant="a"/);
  assert.ok((hero.match(/data-demo-application-trigger="true"/g) || []).length >= 2, 'nav and hero demo buttons');
  assert.doesNotMatch(hero, /\sinert(=|\s|>)/, 'the page is not inert on load');
});

test('team variants: the boot picks the same variant the component would, and b/c/d render their own headline', () => {
  assert.equal(teamVariantFromSearch(''), 'a');
  assert.equal(teamVariantFromSearch('?v=B'), 'b');
  assert.equal(teamVariantFromSearch('?v=c&utm_source=x'), 'c');
  assert.equal(teamVariantFromSearch('?v=d'), 'd');
  assert.equal(teamVariantFromSearch('?v=e'), 'a');
  for (const variant of ['b', 'c', 'd']) {
    const html = P.renderTeam({ restHtml: '', variant });
    assert.ok(text(html).includes(HEADLINES[variant]), variant);
    assert.match(html, new RegExp(`data-headline-variant="${variant}"`));
  }
});

test('ads hero: the first screen is React\'s hero with its no-JS anchor and one eager poster image', () => {
  const root = cleanSsr(renders.ads(), { ...shape.ads, headHtml: LOGO_HEAD });
  const hero = root.slice(0, root.indexOf('data-al-island'));
  assert.ok(hero.includes('<nav aria-label="Main navigation"'), 'nav is prerendered');
  assert.match(hero, /<p class="al-ads-summary[^"]*">/, 'the speakable summary selector is on the hero paragraph');
  assert.match(hero, /<a href="#apply-form" data-apply-cta=""/, 'the hero CTA is a real in-page link without JS');
  assert.match(hero, /data-headline-variant="a"/);
  assert.equal((hero.match(/fetchPriority="high"|fetchpriority="high"/gi) || []).length, 1, 'exactly one high-priority image');
  assert.doesNotMatch(hero, /<video\b/, 'the hero loop video mounts only once the page is live');
  assert.ok(!hero.includes('id="apply-form"'), 'the form lives in the island until the page goes live');
  const island = root.slice(root.indexOf('data-al-island'));
  assert.equal((island.match(/<form id="apply-form" method="post" action="https:\/\/autolander\.ai\/api\/ads-apply"/g) || []).length, 1);
  assert.ok(island.includes(`toolname="${ADS_FORM.webmcp.toolname}"`));
  for (const variant of ['b']) {
    const html = P.renderPaidAds({ restHtml: '', variant });
    assert.ok(text(html).includes(ADS_HEADLINES[variant]), variant);
  }
});
