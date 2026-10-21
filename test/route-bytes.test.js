import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseAst } from 'rollup/parseAst';
import test from 'node:test';
import { AI_VISIBILITY_IMAGES } from '../shared/ai-images.js';
import { FORM, FOOTER, WHERE_BUYERS_ASK } from '../shared/ai-visibility-content.js';
import { AI_VISIBILITY_DIR } from '../shared/ai-visibility-route.js';
import { PAID_ADS_DIR } from '../shared/paid-ads-route.js';
import { WEBSITE_DIR } from '../shared/dealer-websites-route.js';
import { assertClassCoverage } from '../scripts/route-css.mjs';
import { renderAiVisibility, renderTeam, renderPaidAds, renderDealerWebsites } from './helpers/route-render.js';
import { HTMLParser } from './helpers/html-text.js';

const read = (path) => readFileSync(path, 'utf8');
const hasDist = existsSync('dist/team/index.html');
const allowlist = JSON.parse(read('scripts/route-css-allowlist.json'));

test('route shells carry covered inline CSS and preserve full CSS on the shared shells', { skip: !hasDist }, () => {
  // [dist dir, hydrate id]: the AEO and GEO page lives at AI_VISIBILITY_DIR but keeps its internal id.
  const liveRender = { team: renderTeam, 'ai-visibility': renderAiVisibility, 'paid-ads': renderPaidAds, 'dealer-websites': renderDealerWebsites };
  const entryName = { team: 'TeamApp', 'ai-visibility': 'AiVisibilityApp', 'paid-ads': 'PaidAdsApp', 'dealer-websites': 'DealerWebsitesApp' };
  for (const [dir, route] of [['team', 'team'], [AI_VISIBILITY_DIR, 'ai-visibility'], [PAID_ADS_DIR, 'paid-ads'], [WEBSITE_DIR, 'dealer-websites']]) {
    const html = read(`dist/${dir}/index.html`);
    const styles = [...html.matchAll(/<style data-inline-route-css>([\s\S]*?)<\/style>/g)];
    assert.equal(styles.length, 1, route);
    // No stylesheet is fetched: the only /assets/ stylesheet link is the disabled placeholder that stops
    // Vite's preload helper from re-downloading the inlined route CSS.
    const cssLinks = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
    assert.equal(cssLinks.length, 1, `${route}: one route CSS placeholder`);
    assert.match(cssLinks[0], new RegExp(`href="/assets/${entryName[route]}-[\\w-]+\\.css" disabled data-al-inlined-css`));
    // Nothing is preloaded at parse time: the post-paint loader requests the route chunk and its static imports.
    assert.doesNotMatch(html, /<link rel="modulepreload"/, `${route}: no parse-time modulepreload`);
    const preloads = (html.match(/<script data-al-boot[^>]*data-al-preload="([^"]+)"/)?.[1] || '').split(' ');
    assert.match(preloads[0], new RegExp(`^/assets/${entryName[route]}-[\\w-]+\\.js$`));
    assert.ok(preloads.some((href) => /\/assets\/SiteFooter-/.test(href)), `${route}: SiteFooter chunk preloaded`);
    assert.ok(!preloads.some((href) => /\/assets\/index-/.test(href)), `${route}: entry chunk is not preloaded twice`);
    for (const href of preloads) assert.ok(existsSync(`dist${href}`), `${route}: ${href} exists`);
    const root = html.match(/<!--AL_STATIC_PAGE_START-->([\s\S]*?)<!--AL_STATIC_PAGE_END-->/)[1];
    assertClassCoverage(root, styles[0][1], allowlist);
    assertClassCoverage(liveRender[route](), styles[0][1], allowlist);
  }
  assert.equal(existsSync('dist/.vite'), false);
  for (const route of ['index.html', '404.html', 'admin/index.html', 'pay/index.html']) {
    const html = read(`dist/${route}`);
    assert.equal((html.match(/<style data-inline-app-css>/g) || []).length, 1, route);
    assert.doesNotMatch(html, /data-inline-route-css/);
  }
});

test('team static JS import closure contains no AI page copy or AI image descriptions', { skip: !hasDist }, () => {
  const shell = read('dist/team/index.html');
  const entry = shell.match(/<script data-al-boot[^>]*data-al-route-entry="([^"]+)"/)?.[1];
  assert.ok(entry, 'the manifest-selected route entry is named by the boot loader');
  const files = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const node of parseAst(read(file)).body) {
      if (!['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)) continue;
      const target = node.source?.value;
      if (target?.startsWith('.') && target.endsWith('.js')) visit(resolve(dirname(file), target));
    }
  };
  visit(resolve('dist', entry.slice(1)));
  assert.ok(files.size > 1, 'the assertion includes shared chunks too');
  const forbidden = [WHERE_BUYERS_ASK.h2Grad, ...AI_VISIBILITY_IMAGES.map(({ alt }) => alt)];
  for (const file of files) for (const phrase of forbidden) assert.ok(!read(file).includes(phrase), `${file}: AI copy leaked into team closure`);
});

test('prerendered routes ship React markup in #root, the mirror as one island, and boot after the first paint', { skip: !hasDist }, () => {
  for (const [dir, route, island] of [['team', 'team', 'team-rest'], [AI_VISIBILITY_DIR, 'ai-visibility', 'ai-rest'], [PAID_ADS_DIR, 'paid-ads', 'ads-rest'], [WEBSITE_DIR, 'dealer-websites', 'websites-rest']]) {
    const html = read(`dist/${dir}/index.html`);
    // Hydration adopts #root's children, so React's first element must be #root's first child (no whitespace).
    assert.match(html, new RegExp(`<!--AL_STATIC_PAGE_START--><div id="root" data-al-hydrate="${route}"><div class="min-h-dvh`));
    assert.match(html, /<\/div><\/div><!--AL_STATIC_PAGE_END-->/);
    assert.equal((html.match(/data-al-island="/g) || []).length, 1, route);
    assert.equal((html.match(new RegExp(`data-al-island="${island}"`, 'g')) || []).length, 1, route);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, route);
    // No entry module in <head>: one post-paint loader at the end of <body> names the entry chunk.
    assert.doesNotMatch(html, /<script type="module"/, route);
    assert.equal((html.match(/<script data-al-boot data-al-entry="\/assets\/index-[\w-]+\.js"/g) || []).length, 1, route);
    assert.ok(html.indexOf('data-al-boot') > html.indexOf('<!--AL_STATIC_PAGE_END-->'), `${route}: loader after the page`);
    assert.doesNotMatch(html, /data-al-route-pageview|data-al-layout-fence|rel="preload" href="\/fonts\//);
  }
  const home = read('dist/index.html');
  assert.doesNotMatch(home, /<script type="module"/);
  assert.equal((home.match(/<script data-al-boot data-al-entry="\/assets\/index-[\w-]+\.js">/g) || []).length, 1);
  assert.doesNotMatch(home, /data-al-hydrate/);
  // App shells with nothing static to show keep Vite's head entry and never hydrate.
  for (const route of ['404.html', 'admin/index.html', 'pay/index.html']) {
    const html = read(`dist/${route}`);
    assert.equal((html.match(/<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js"><\/script>/g) || []).length, 1, route);
    assert.doesNotMatch(html, /data-al-hydrate|data-al-boot/, route);
  }
});

test('required-note and both footer lines use the accessible contrast color', () => {
  const text = (html) => new HTMLParser().textOf(html);
  for (const html of [renderAiVisibility(), renderTeam()]) {
    const paragraphs = [...html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)];
    for (const copy of [FORM.requiredNote, FOOTER.line, '\u00a9 2026 AutoLander. All rights reserved.']) {
      const node = paragraphs.find((m) => text(m[2]) === copy);
      if (copy === FORM.requiredNote || copy === FOOTER.line) {
        if (html.includes('data-headline-variant')) continue;
      }
      assert.ok(node?.[1].includes('text-slate-400'), copy);
    }
  }
});

test('team keeps its approved FAQ heading and both pricing fragment targets', () => {
  const html = renderTeam();
  assert.match(html, /<h2\b[^>]*>FAQ<\/h2>/);
  assert.match(html, /<section id="team-pricing"/);
  assert.match(html, /id="pricing"/);
});
