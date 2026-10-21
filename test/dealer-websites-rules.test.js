import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as WEB from '../shared/dealer-websites-content.js';
import { FOOTER, FOOTER_NAV, HERO, ILLUSTRATIONS, META, PROOF } from '../shared/dealer-websites-content.js';
import { WEBSITE_IMAGES } from '../shared/dealer-websites-images.js';
import { IMAGE_SIZES, imageSrcSet } from '../shared/responsive-images.js';
import { dealerWebsitesHead } from '../scripts/seo/data-dealer-websites.mjs';
import { renderDealerWebsitesMirrorRest } from '../src/websites/static-mirror.js';
import { HTMLParser } from './helpers/html-text.js';
import { renderDealerWebsites } from './helpers/route-render.js';

// Michael's public-page rules: no figures of our own (2026-10-16); house type, house images and the shared footer
// (2026-09-29); no dealership named on the page or in its illustrations, real or fictional, and the blue house CTA
// of the sibling Services pages (2026-10-21). Checked on everything a visitor can read, including strings
// hard-coded in templates and every alt text.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const text = (html) => new HTMLParser().textOf(html);
const unquote = (value) => value.replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const straight = (value) => value.replaceAll('’', "'");
function collectStrings(value, into = []) {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, into));
  return into;
}
const PAGE_HTML = renderDealerWebsites();
const ALTS = [...PAGE_HTML.matchAll(/\balt="([^"]*)"/g)].map(([, alt]) => unquote(alt));
const STRINGS = [...collectStrings(WEB).filter((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value)), text(PAGE_HTML), ...ALTS];
const PAGE = STRINGS.join('\n');
const DATE = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:, \d{4})?/g;
// Anything shaped like a dealership name: up to three capitalised words before a dealer or manufacturer word.
const DEALER_NAME = /\b(?:[A-Z][A-Za-z']+[ \u00a0]+){1,3}(?:Motors|MOTORS|Auto Sales|Autos|Auto Group|Automotive|Subaru|Chevrolet|Chrysler Jeep Dodge Ram|CDJR|Ford|Toyota|Honda|Nissan|Hyundai|Kia|Jeep|Dodge|GMC|Buick|Lexus|Mazda)\b/g;
// Manufacturer and model names: the illustrations show debadged vehicles labelled by body style.
const OEM = /\b(?:Subaru|Chevrolet|Chevy|Ford|Toyota|Honda|Nissan|Hyundai|Kia|Jeep|Dodge|Chrysler|GMC|Buick|Cadillac|Lexus|BMW|Mercedes|Audi|Volkswagen|Mazda|Tesla|Outback|Forester|Crosstrek|Silverado|Tacoma|Camry|Civic|F-150)\b/;
const CAPTION = /^Illustrations? of a website concept drawn for this page\.$/;

test('no business figures of our own: the dealership count is the only figure, the rest are process timings', () => {
  assert.doesNotMatch(PAGE, /\d\s?%/, 'no percentages');
  assert.doesNotMatch(PAGE, /\bLighthouse\b|\bPageSpeed\b|\bour own CRM\b|\bLead Log\b/i);
  const stripped = PAGE.replace(DATE, '').replace(/©\s?\d{4}/g, '').replace(/\b0[1-9]\b/g, '').replace(/\baddress-level2\b/g, '');
  assert.deepEqual(stripped.match(/\b\d[\d,]*\+?[ \u00a0]+(?:leads?|visits?|sessions?|clicks?|impressions?|calls?|appointments?|sales|cars|vehicles)\b/gi) || [], []);
  // 200+ dealerships; Day 0; 2 and 5 business days; the 20-minute call; 4 to 8 build weeks; the SMS cap of 4.
  const allowed = new Set(['200+', '0', '2', '4', '5', '8', '20']);
  for (const [token] of stripped.matchAll(/\d[\d,.]*\+?/g)) {
    const value = token.replace(/[.,]+$/, '');
    assert.ok(allowed.has(value), `${value}: only the dealership count and process timings may be figures`);
  }
  assert.deepEqual(collectStrings(PROOF).join('\n').replace(DATE, '').match(/\d[\d,]*\+?/g), ['200+']);
  assert.match(PROOF.caption, /not a forecast or a promise/);
});

test('no "X, not Y" contrast lines and no dashes anywhere on the page', () => {
  for (const sentence of STRINGS.flatMap((value) => value.split(/(?<=[.!?])\s+|\n/))) {
    assert.doesNotMatch(sentence, /,\s+(?:not|never)\s|\brather than\b/i, sentence.slice(0, 90));
  }
  assert.doesNotMatch(PAGE, /[\u2013\u2014]/u);
});

test('no dealership is named on the page, real or fictional; the illustrations are captioned as a concept', () => {
  assert.doesNotMatch(PAGE, /\bNorthline\b|\bExample Motors\b|\bF-150\b|\bSuperCrew\b/i);
  // Case-sensitive: the role select reads "Choose one" then "Owner / dealer principal".
  assert.doesNotMatch(PAGE, /\bone owner\b/, 'no invented listing');
  assert.doesNotMatch(PAGE_HTML, /\/studio\//, 'no stock vehicle photo stands in for an illustration');
  assert.doesNotMatch(straight(PAGE), /Frank's|\bIrvine\b|Lake Forest|Pine Belt|Westgate/i, 'no customer is featured on a website concept');
  assert.deepEqual(straight(PAGE).match(DEALER_NAME) || [], [], 'no dealership name of any kind');
  assert.doesNotMatch(PAGE, OEM, 'no manufacturer or model names');
  const figures = [...PAGE_HTML.matchAll(/<figure\b[\s\S]*?<\/figure>/g)].map(([figure]) => figure);
  assert.equal(figures.length, Object.keys(WEBSITE_IMAGES).length, 'one figure per illustration');
  for (const figure of figures) {
    assert.match(figure, /<picture><source type="image\/avif"/);
    assert.doesNotMatch(figure, /<h[1-6]\b/, 'an illustration carries no headings');
    assert.match(text(figure).trim(), CAPTION);
  }
  assert.equal(text(figures[0]).trim(), ILLUSTRATIONS.hero.caption, 'the hero figure is the one illustration');
  for (const figure of figures.slice(1)) assert.equal(text(figure).trim(), ILLUSTRATIONS.caption);
  for (const image of Object.values(WEBSITE_IMAGES)) {
    assert.match(image.alt, /^Illustration of /);
    assert.doesNotMatch(image.alt, /\bGPT\b/);
    assert.deepEqual(straight(image.alt).match(DEALER_NAME) || [], [], image.alt);
    assert.doesNotMatch(image.alt, OEM, image.alt);
  }
  assert.match(META.ogImageAlt, /^Illustration of /);
  assert.equal(META.ogTitle, `${HERO.h1Lead} ${HERO.h1Grad}`);
});

test('heading outline: one h1 in the hero, the designed section h2s in the island', () => {
  const island = PAGE_HTML.indexOf('data-al-island');
  const footer = PAGE_HTML.indexOf('<footer');
  assert.equal((PAGE_HTML.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(PAGE_HTML.slice(0, island).replace(/<h1\b[\s\S]*?<\/h1>/, ''), /<h[1-6]\b/, 'the hero carries only the h1');
  const squash = (value) => value.replace(/\s+/g, '');
  const h2s = [...PAGE_HTML.slice(island, footer).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(([, inner]) => squash(text(inner)));
  assert.deepEqual(h2s, [PROOF.title, WEB.PROBLEM.title, WEB.BUILD.title, WEB.SEARCH.title, WEB.PROCESS.title, WEB.FIT.title,
    WEB.FORM.aside.title, WEB.FAQ_HEADING.lead + WEB.FAQ_HEADING.grad, WEB.FINAL.h2Lead + WEB.FINAL.h2Grad].map(squash));
});

test('the page uses the shared SiteFooter with page columns, and the mirror builds no footer of its own', () => {
  const app = read('src/websites/DealerWebsitesApp.jsx');
  assert.match(app, /import SiteFooter from '\.\.\/components\/SiteFooter\.jsx';/);
  assert.match(app, /<SiteFooter extraLine=\{FOOTER\.line\} columns=\{FOOTER_NAV\} \/>/);
  assert.doesNotMatch(renderDealerWebsitesMirrorRest(), /<footer\b|dw-footer/);
  assert.equal((PAGE_HTML.match(/<footer\b/g) || []).length, 1);
  const footer = PAGE_HTML.slice(PAGE_HTML.indexOf('<footer'));
  for (const link of FOOTER_NAV.flatMap((column) => column.links)) assert.ok(footer.includes(`href="${link.href}"`), link.href);
  assert.ok(text(footer).includes(FOOTER.line));
});

test('three illustrations: one eager hero with a matching head preload, lazy siblings, reserved space', () => {
  const head = dealerWebsitesHead();
  const images = Object.values(WEBSITE_IMAGES);
  const tags = [...PAGE_HTML.matchAll(/<img\b[^>]+>/g)].map(([tag]) => tag).filter((tag) => tag.includes('/dealership-websites/'));
  assert.equal(tags.length, 3);
  for (const item of images) {
    assert.deepEqual(item.widths, [640, 960, 1280, 1600]);
    const tag = tags.find((candidate) => candidate.includes(`${item.base}-960.webp`));
    assert.ok(tag, item.base);
    assert.ok(tag.includes(`width="${item.width}"`) && tag.includes(`height="${item.height}"`) && tag.includes('decoding="async"'), item.base);
    assert.equal(/loading="eager"/.test(tag), item === WEBSITE_IMAGES.hero, item.base);
    assert.equal(/fetchpriority="high"/i.test(tag), item === WEBSITE_IMAGES.hero, item.base);
    assert.ok(PAGE_HTML.includes(imageSrcSet(item, 'avif')) && PAGE_HTML.includes(imageSrcSet(item, 'webp')), item.base);
  }
  assert.equal((head.match(/rel="preload" as="image"/g) || []).length, 1);
  assert.ok(head.includes(`imagesrcset="${imageSrcSet(WEBSITE_IMAGES.hero, 'avif')}"`));
  assert.ok(head.includes(`imagesizes="${IMAGE_SIZES.websitesHero}"`));
});

test('house type and CTA: Archivo 800 italic uppercase headings, the blue house CTA, page rules never reach SiteFooter', () => {
  const css = read('src/websites/websites.css');
  const rule = (selector) => { const at = css.indexOf(`${selector} {`); assert.ok(at >= 0, selector); return css.slice(at, css.indexOf('}', at)); };
  const headings = rule(':where(.dw-page main) :is(h1, h2, h3)');
  for (const decl of [/font-family:\s*var\(--font-display\)/, /font-weight:\s*800/, /font-style:\s*italic/, /text-transform:\s*uppercase/]) assert.match(headings, decl);
  // The sibling Services pages' in-body CTA (src/ads/PaidAdsApp.jsx): rounded-2xl bg-blue-600, hover bg-blue-500,
  // Archivo extrabold uppercase italic, tracking-tight, white text, px-6 py-5, text-base and sm:text-lg.
  const button = rule('.dw-button');
  // Tailwind 4 colors come from the theme variables, so the page renders the same blue as the siblings.
  for (const decl of [/border-radius:\s*16px/, /background:\s*var\(--color-blue-600\)/, /[;{]\s*color:\s*#fff\b/i, /font-family:\s*var\(--font-display\)/,
    /font-weight:\s*800/, /font-style:\s*italic/, /text-transform:\s*uppercase/, /letter-spacing:\s*-\.025em/, /padding:\s*20px 24px/, /font-size:\s*16px/,
    /box-shadow:[^;]*color-mix\(in oklab, var\(--color-blue-600\) 30%, transparent\)/]) {
    assert.match(button, decl, String(decl));
  }
  assert.match(rule('.dw-button:hover'), /background:\s*var\(--color-blue-500\)/);
  assert.match(css, /@media \(min-width: 640px\) \{ \.dw-button \{ font-size: 18px;/);
  // Same size at every width: only the base rule and the 640px step set font-size or padding on the button.
  const sizing = [...css.matchAll(/\.dw-button\s*\{([^}]*)\}/g)].filter(([, body]) => /font-size|padding/.test(body));
  assert.equal(sizing.length, 2, 'no other .dw-button rule sets font-size or padding');
  assert.doesNotMatch(css, /\.dw-button:active/);
  assert.doesNotMatch(css, /font-weight:\s*900/);
  assert.match(css, /--font-display: 'Archivo', 'Archivo Fallback', 'Archivo Fallback Roboto'/);
  assert.doesNotMatch(css, /(^|[\s,{}])\.dw-page (?:h[1-6]|p)\b/m);
});
