import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { FAQ, HERO, META, SERVICE_SUMMARY, WEBSITE_PUBLISHED, WEBSITE_UPDATED } from '../shared/dealer-websites-content.js';
import { WEBSITE_API_PATH, WEBSITE_DIR, WEBSITE_FORM_ID, WEBSITE_PATH } from '../shared/dealer-websites-route.js';
import { NAV, SPA_PAGE_PATHS } from '../scripts/seo/registry.mjs';
import { buildHomeDirectory } from '../scripts/seo/home-directory.mjs';
import {
  DEALER_WEBSITES_PAGE, WEBSITE_CANONICAL, WEBSITE_LASTMOD, WEBSITE_OG_IMAGE,
  dealerWebsitesGraph, dealerWebsitesHead,
} from '../scripts/seo/data-dealer-websites.mjs';
import { renderDealerWebsitesMirrorRest } from '../src/websites/static-mirror.js';
import { HTMLParser } from './helpers/html-text.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const text = (html) => new HTMLParser().textOf(html);

test('the service has one exact route, registry identity and homepage-directory destination', () => {
  assert.equal(WEBSITE_PATH, '/dealership-websites/');
  assert.equal(WEBSITE_DIR, 'dealership-websites');
  assert.equal(WEBSITE_FORM_ID, 'website-request-form');
  assert.equal(WEBSITE_API_PATH, '/api/website-request');
  assert.equal(NAV.dealerWebsites.path, WEBSITE_PATH);
  assert.equal(NAV.dealerWebsites.spa, true);
  assert.equal(SPA_PAGE_PATHS.filter((path) => path === WEBSITE_PATH).length, 1);
  assert.equal(buildHomeDirectory([], {}).flatMap(({ links }) => links).filter(({ href }) => href === WEBSITE_PATH).length, 1);
  assert.equal(DEALER_WEBSITES_PAGE.h1, `${HERO.h1Lead} ${HERO.h1Grad}`);
  assert.equal(DEALER_WEBSITES_PAGE.spa, true);
});

test('metadata and structured data describe the visible service without prices, ratings or results', () => {
  assert.equal(WEBSITE_CANONICAL, `https://autolander.ai${WEBSITE_PATH}`);
  assert.equal(WEBSITE_LASTMOD, WEBSITE_UPDATED);
  assert.ok(META.title.length <= 60, `${META.title.length} character title`);
  assert.ok(META.description.length <= 160, `${META.description.length} character description`);
  const graph = dealerWebsitesGraph()['@graph'];
  assert.deepEqual(graph.map((node) => node['@type']), ['WebPage', 'Service', 'FAQPage', 'BreadcrumbList']);
  const [page, service, faq, breadcrumb] = graph;
  assert.equal(page.name, META.title);
  assert.equal(page.description, META.description);
  assert.equal(page.datePublished, WEBSITE_PUBLISHED);
  assert.equal(page.dateModified, WEBSITE_UPDATED);
  assert.equal(page.about['@id'], service['@id']);
  assert.equal(page.breadcrumb['@id'], breadcrumb['@id']);
  assert.equal(service.description, SERVICE_SUMMARY);
  assert.equal(service.url, WEBSITE_CANONICAL);
  assert.deepEqual(faq.mainEntity.map(({ name, acceptedAnswer }) => [name, acceptedAnswer.text]), FAQ.map(({ q, a }) => [q, a]));
  assert.deepEqual(breadcrumb.itemListElement.map(({ item }) => item), ['https://autolander.ai/', WEBSITE_CANONICAL]);
  assert.doesNotMatch(JSON.stringify(graph), /"(?:aggregateRating|review|price|priceSpecification|offers)"/);
  assert.ok(existsSync(new URL(`../public${new URL(WEBSITE_OG_IMAGE).pathname}`, import.meta.url)), 'dedicated share image exists');
});

test('canonical and social metadata are exact and preview leaves no second robots directive', () => {
  const head = dealerWebsitesHead();
  assert.equal((head.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(head.includes(`<link rel="canonical" href="${WEBSITE_CANONICAL}" />`));
  assert.match(head, /<meta name="robots" content="index, follow/);
  assert.doesNotMatch(dealerWebsitesHead({ preview: true }), /name="robots"/);
  assert.ok(head.includes(`<meta property="og:image" content="${WEBSITE_OG_IMAGE}" />`));
  assert.ok(head.includes(`<meta name="twitter:image" content="${WEBSITE_OG_IMAGE}" />`));
  const ld = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.deepEqual(JSON.parse(ld), dealerWebsitesGraph());
  assert.doesNotMatch(ld, /<[^>]+>/);
});

test('crawlable FAQ matches its schema and the website form has an independent native route', () => {
  const mirror = renderDealerWebsitesMirrorRest({ capiUrl: 'https://autolander.ai' });
  for (const { q, a } of FAQ) {
    assert.ok(text(mirror).includes(q), q);
    assert.ok(text(mirror).includes(a), q);
  }
  assert.equal((mirror.match(/<form\b/g) || []).length, 1);
  const formTag = mirror.match(/<form\b[^>]*>/)?.[0] || '';
  assert.match(formTag, /\bid="website-request-form"/);
  assert.match(formTag, /\bmethod="post"/);
  assert.match(formTag, /\baction="https:\/\/autolander\.ai\/api\/website-request"/);
  assert.doesNotMatch(mirror, /action="[^"]*\/(?:ai-scan|ads-apply|apply)"/);
  assert.doesNotMatch(mirror, /toolautosubmit/i);
  assert.doesNotMatch(mirror, /<h1\b/, 'the hero is the sole H1 outside the island');
});

test('build wiring uses the same route, isolated CSS, static island and last-modified source', () => {
  const builder = read('scripts/spa-fallback.mjs');
  assert.match(builder, /prerenderedRoute\('src\/websites\/DealerWebsitesApp\.jsx'/);
  assert.match(builder, /hydrate: 'dealer-websites',\s+island: 'websites-rest'/);
  assert.match(builder, /renderDealerWebsites\(\{ restHtml: renderDealerWebsitesMirrorRest\(\{ capiUrl \}\)/);
  assert.match(read('src/main.jsx'), /boot === 'dealer-websites'[\s\S]*?m\.bootDealerWebsites\(container\)/);
  assert.match(read('src/index.css'), /@source not "\.\/websites";/);
  assert.match(read('scripts/build-seo-pages.mjs'), /loc: SITE\.origin \+ NAV\.dealerWebsites\.path, pri: '0\.8', freq: 'monthly', lastmod: WEBSITE_LASTMOD/);
  assert.doesNotMatch(read('worker/src/agent/no-transform.js'), /HTML_NO_TRANSFORM\s*===\s*'on'[^\n]*\|\|\s*true/);
});

test('built service shell has its own H1 and metadata, never the Marketplace homepage', { skip: !existsSync(new URL('../dist/index.html', import.meta.url)) }, () => {
  const built = read(`dist/${WEBSITE_DIR}/index.html`);
  assert.match(built, /data-al-hydrate="dealer-websites"/);
  assert.equal((built.match(/<h1\b/g) || []).length, 1);
  assert.ok(text(built).includes(`${HERO.h1Lead} ${HERO.h1Grad}`));
  assert.ok(built.includes(`<link rel="canonical" href="${WEBSITE_CANONICAL}" />`));
  assert.match(built, /data-al-island="websites-rest"/);
  assert.doesNotMatch(built, /AL_STATIC_HOME_START|<script type="module"/);
});
