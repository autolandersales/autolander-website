import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { siteHeader, siteFooter } from '../scripts/seo/shell.mjs';
import { NAV } from '../scripts/seo/registry.mjs';
import { AI_VISIBILITY_NAV_LABEL, AI_VISIBILITY_PATH } from '../shared/ai-visibility-route.js';
import { PAID_ADS_NAV_LABEL, PAID_ADS_PATH } from '../shared/paid-ads-route.js';
import { WEBSITE_NAV_LABEL, WEBSITE_PATH } from '../shared/dealer-websites-route.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8');

test('SiteNav defines the Services disclosure with exactly the four owner-approved links', () => {
  const source = read('src/components/SiteNav.jsx');
  const servicesBlock = source.match(/const SERVICES = \[([\s\S]*?)\];/)?.[1] || '';
  const services = [...servicesBlock.matchAll(/\['([^']+)', '([^']+)'\]/g)]
    .map((match) => ({ href: match[1], label: match[2] }));

  assert.deepEqual(services, [
    { href: AI_VISIBILITY_PATH, label: AI_VISIBILITY_NAV_LABEL },
    { href: '/team/', label: 'Team Plans' },
    { href: PAID_ADS_PATH, label: PAID_ADS_NAV_LABEL },
    { href: WEBSITE_PATH, label: WEBSITE_NAV_LABEL },
  ]);
  assert.equal(PAID_ADS_PATH, '/meta-ads-for-car-dealers/');
  assert.equal(PAID_ADS_NAV_LABEL, 'Paid Ads & AI Commercials');
  assert.equal(NAV.paidAds.path, PAID_ADS_PATH);
  assert.equal(WEBSITE_PATH, '/dealership-websites/');
  assert.equal(WEBSITE_NAV_LABEL, 'Dealership Websites');
  assert.equal(NAV.dealerWebsites.path, WEBSITE_PATH);
  // Literals on purpose (SiteNav never imports the copy module); pinned to the one route module here.
  assert.equal(AI_VISIBILITY_PATH, '/aeo-geo-for-car-dealers/');
  assert.equal(AI_VISIBILITY_NAV_LABEL, 'AEO & GEO');
  assert.equal(NAV.aiVisibility.path, AI_VISIBILITY_PATH);
  assert.doesNotMatch(source, /AI\s+Audit|\/ai-visibility\//);
  assert.match(source, /aria-expanded=\{desktopServicesOpen\}/);
  assert.match(source, /aria-controls=\{desktopServicesId\}/);
  assert.match(source, /event\.key !== 'Escape'/);
  assert.match(source, /contains\(event\.target\)/);
});

test('the homepage uses the shared navigation and footer', () => {
  const app = read('src/App.jsx');
  assert.match(app, /import SiteNav from ['"]\.\/components\/SiteNav\.jsx['"]/);
  assert.match(app, /const SiteFooter = lazy\(\(\) => import\(['"]\.\/components\/SiteFooter\.jsx['"]\)\)/);
  assert.match(app, /<SiteNav[\s\S]*?page="home"[\s\S]*?\/>/);
  assert.match(app, /<SiteFooter \/>/);
});

test('lazy route styles include the shared navigation responsive utilities', () => {
  for (const stylesheet of ['src/ai/ai.css', 'src/team/team.css', 'src/ads/ads.css', 'src/websites/websites.css']) {
    const css = read(stylesheet);
    assert.match(css, /@source "\.\.\/components\/SiteNav\.jsx";/, stylesheet);
    assert.match(css, /@source "\.\.\/components\/SiteFooter\.jsx";/, stylesheet);
  }
});

test('the static homepage mirror exposes all Services destinations without JavaScript', () => {
  const html = read('index.html');
  const start = html.indexOf('<!--AL_STATIC_HOME_START-->');
  const end = html.indexOf('<!--AL_STATIC_HOME_END-->');
  assert.ok(start >= 0 && end > start, 'static homepage markers must exist');
  const mirror = html.slice(start, end);
  assert.ok(mirror.includes('<a href="/aeo-geo-for-car-dealers/">AEO and GEO for car dealers</a>'));
  assert.match(mirror, /<a href="\/team\/">Team Plans<\/a>/);
  assert.ok(mirror.includes('<a href="/meta-ads-for-car-dealers/">Paid ads and AI commercials for car dealers</a>'));
  assert.ok(mirror.includes('<a href="/dealership-websites/">Dealership websites</a>'));
  assert.doesNotMatch(html, /AI\s+Audit|href="\/ai-visibility\/"/);
});

test('the React and SEO-shell footers link the AEO and GEO page', () => {
  assert.ok(read('src/components/SiteFooter.jsx').includes('<a href="/aeo-geo-for-car-dealers/" className="block py-1 transition-colors hover:text-blue-500">AEO & GEO for Dealers</a>'));
  assert.ok(read('src/components/SiteFooter.jsx').includes('<a href="/meta-ads-for-car-dealers/" className="block py-1 transition-colors hover:text-blue-500">Paid Ads & AI Commercials</a>'));
  assert.ok(siteFooter().includes('<a href="/aeo-geo-for-car-dealers/">AEO and GEO for car dealers</a>'));
  assert.ok(siteFooter().includes('<a href="/meta-ads-for-car-dealers/">Paid ads and AI commercials for car dealers</a>'));
  assert.ok(read('src/components/SiteFooter.jsx').includes('<a href="/dealership-websites/" className="block py-1 transition-colors hover:text-blue-500">Dealership Websites</a>'));
  assert.ok(siteFooter().includes('<a href="/dealership-websites/">Dealership websites</a>'));
});

test('the SEO shell topnav has a no-JavaScript Services details menu', () => {
  const html = siteHeader([{ name: 'Example', url: '/example/' }]);
  const menu = html.match(/<details class="navdrop">[\s\S]*?<\/details>/)?.[0] || '';
  assert.match(menu, /<summary>Services<\/summary>/);
  assert.ok(menu.includes('<a href="/aeo-geo-for-car-dealers/">AEO &amp; GEO</a>'));
  assert.match(menu, /<a href="\/team\/">Team Plans<\/a>/);
  assert.ok(menu.includes('<a href="/meta-ads-for-car-dealers/">Paid Ads &amp; AI Commercials</a>'));
  assert.ok(menu.includes('<a href="/dealership-websites/">Dealership Websites</a>'));
  assert.equal((menu.match(/<a /g) || []).length, 4);
});

test('the independent comparison-page header carries the same Services menu', () => {
  const source = read('scripts/build-compare-pages.mjs');
  assert.match(source, /<details class="navdrop"><summary>Services<\/summary>/);
  assert.equal(source.split('<a href="${NAV.aiVisibility.path}">${esc(AI_VISIBILITY_NAV_LABEL)}</a><a href="/team/">Team Plans</a><a href="${NAV.paidAds.path}">${esc(PAID_ADS_NAV_LABEL)}</a><a href="${NAV.dealerWebsites.path}">${esc(WEBSITE_NAV_LABEL)}</a>').length - 1, 2, 'both compare headers');
  assert.doesNotMatch(source, /AI\s+Audit|href="\/ai-visibility\/"/);
  // The rendered compare pages carry the same escaped label.
  const rendered = read('public/compare/carvid/index.html');
  assert.ok(rendered.includes('<a href="/aeo-geo-for-car-dealers/">AEO &amp; GEO</a><a href="/team/">Team Plans</a><a href="/meta-ads-for-car-dealers/">Paid Ads &amp; AI Commercials</a><a href="/dealership-websites/">Dealership Websites</a>'));
});
