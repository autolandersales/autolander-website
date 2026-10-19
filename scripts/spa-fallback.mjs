import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertNoUnverifiedProof } from './proof-build-guard.mjs';
import { leanBaseCss, assertClassCoverage } from './route-css.mjs';
import { loadEnv } from 'vite';
import { HERO, META } from '../shared/ai-visibility-content.js';
import { AI_VISIBILITY_DIR, AI_VISIBILITY_LEGACY_PATHS, AI_VISIBILITY_PATH } from '../shared/ai-visibility-route.js';
import { HEADLINES, TEAM_META } from '../shared/team-content.js';
import { renderAiVisibilityMirrorRest } from '../src/ai/static-mirror.js';
import { renderTeamMirrorRest } from '../src/team/static-mirror.js';
import { renderPaidAdsMirrorRest } from '../src/ads/static-mirror.js';
import { HEADLINES as PAID_ADS_HEADLINES, META as PAID_ADS_META } from '../shared/paid-ads-content.js';
import { PAID_ADS_DIR } from '../shared/paid-ads-route.js';
import { WEBSITE_DIR } from '../shared/dealer-websites-route.js';
import { HERO as WEBSITE_HERO, META as WEBSITE_META } from '../shared/dealer-websites-content.js';
import { renderDealerWebsitesMirrorRest } from '../src/websites/static-mirror.js';
import { aiVisibilityHead, aiVisibilityLegacyStubHtml } from './seo/data-ai-visibility.mjs';
import { teamHead } from './seo/data-team.mjs';
import { paidAdsHead } from './seo/data-paid-ads.mjs';
import { dealerWebsitesHead } from './seo/data-dealer-websites.mjs';
import { cleanSsr, loadPrerender } from './prerender.mjs';
import {
  appendBeaconLoader,
  buildPageShell,
  deferEntryToPaint,
  isPreviewShell,
} from './spa-shell.mjs';

const distDir = join(process.cwd(), 'dist');
const indexPath = join(distDir, 'index.html');
const fallbackPath = join(distDir, '404.html');
const adminDir = join(distDir, 'admin');
const adminIndexPath = join(adminDir, 'index.html');
const payDir = join(distDir, 'pay');
const payIndexPath = join(payDir, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html was not found. Run this after vite build.');
}

function inlineAppStyles(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8');
  const stylesheetPattern = /(\s*)<link rel="stylesheet"[^>]*href="([^"]*\/assets\/index-[^"]+\.css)"[^>]*>\s*/;
  const match = html.match(stylesheetPattern);

  if (!match) return;

  const cssHref = match[2].replace(/^\//, '');
  const cssPath = join(distDir, cssHref);
  if (!existsSync(cssPath)) return;

  const css = readFileSync(cssPath, 'utf8').replace(/<\/style/gi, '<\\/style');
  const styleTag = `${match[1]}<style data-inline-app-css>\n${css}\n${match[1]}</style>\n`;
  writeFileSync(htmlPath, html.replace(stylesheetPattern, styleTag));
}

inlineAppStyles(indexPath);
const appShell = readFileSync(indexPath, 'utf8');

// index.html carries a static replica of the homepage hero inside #root (see the comment there):
// it gives "/" a crawlable body and paints something other than black while the bundle loads.
// These derived shells are NOT the homepage — 404.html backs /pay/:token and /ref/* deep links,
// and /admin + /pay render their own apps — so a marketing hero would flash on a payment link
// before the real UI mounts. Strip it back to the empty #root those routes expect.
const STATIC_HOME_BLOCK = /<!--AL_STATIC_HOME_START-->[\s\S]*?<!--AL_STATIC_HOME_END-->/;
function stripStaticHome(html) {
  if (!STATIC_HOME_BLOCK.test(html)) {
    throw new Error(
      'spa-fallback: the AL_STATIC_HOME_START/END markers are missing from dist/index.html. If the '
      + 'static home block was renamed or removed, update STATIC_HOME_BLOCK — otherwise '
      + '/pay/:token and /admin would ship with the marketing hero in their shell.',
    );
  }
  return html.replace(STATIC_HOME_BLOCK, '');
}

const noindexShell = stripStaticHome(appShell)
  .replace(/\s*<link rel="canonical" href="https:\/\/autolander\.ai\/" \/>/, '')
  .replace('    <meta name="description"', '    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="description"');

// GitHub Pages serves 404.html for dynamic SPA paths such as /pay/:token and
// referral links. These utility/customer-specific routes must never compete
// with the public marketing pages in search.
writeFileSync(fallbackPath, noindexShell, 'utf8');
mkdirSync(adminDir, { recursive: true });
const alTagsTag = /<script\b[^>]*src="\/al-tags-v1\.js"[^>]*><\/script>/;
if (!alTagsTag.test(noindexShell)) throw new Error('spa-fallback: missing al-tags tag');
const adminShell = noindexShell.replace(alTagsTag, '');
writeFileSync(adminIndexPath, adminShell, 'utf8');
// Same trick for the bare /pay route (self-serve picker). /pay/:token deep
// links still rely on the 404.html SPA-fallback above — GitHub Pages can't
// pre-generate a page per token — but the exact /pay path gets this same
// zero-redirect shell the /admin path already has.
mkdirSync(payDir, { recursive: true });
writeFileSync(payIndexPath, noindexShell, 'utf8');
// Dedicated readable shells for exact-path lazy marketing routes. The utility shells above remain
// empty and noindex; these marketing routes carry their own metadata and crawlable static body.
const preview = isPreviewShell(appShell);
const env = loadEnv(preview ? 'preview' : 'production', process.cwd(), '');
const capiUrl = env.VITE_CAPI_URL || 'https://autolander.ai';
const manifest = JSON.parse(readFileSync(join(distDir, '.vite/manifest.json'), 'utf8'));
const indexCssFiles = new Set(manifest['index.html'].css || []);
const cssAllowlist = JSON.parse(readFileSync(new URL('./route-css-allowlist.json', import.meta.url), 'utf8'));

// Only these marketing routes receive lean CSS; the homepage and utility shells retain the full
// stylesheet. `rootHtml` is the markup the route ships (checked for class coverage against the lean CSS).
function leanRouteShell(moduleId, rootHtml) {
  const entry = manifest[moduleId];
  if (!entry) throw new Error(`Missing route module: ${moduleId}`);
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    if (!manifest[key]) throw new Error(`Missing manifest import: ${key}`);
    for (const child of manifest[key].imports || []) visit(child);
  };
  visit(moduleId);
  const cssFiles = [...new Set([...seen].flatMap((key) => manifest[key].css || []))]
    .filter((file) => !indexCssFiles.has(file));
  const styles = [...appShell.matchAll(/<style data-inline-app-css>([\s\S]*?)<\/style>/g)];
  if (styles.length !== 1 || !cssFiles.length) throw new Error('Expected app CSS and route CSS');
  for (const file of [entry.file, ...cssFiles]) {
    const path = resolve(distDir, file);
    if (!path.startsWith(resolve(distDir, 'assets') + sep) || !existsSync(path)) throw new Error(`Missing route asset: ${file}`);
  }
  const css = leanBaseCss(styles[0][1]) + cssFiles.map((file) => readFileSync(join(distDir, file), 'utf8')).join('\n');
  assertClassCoverage(rootHtml, css, cssAllowlist);
  // The route's static imports other than the entry chunk (e.g. SiteFooter, page-images): preloading them
  // together with the route chunk, instead of when the route module is imported, takes one hop off the boot chain.
  const entryFile = manifest['index.html'].file;
  const modulePreloadHrefs = [...new Set([...seen].filter((key) => key !== moduleId).map((key) => manifest[key].file))]
    .filter((file) => file !== entryFile && file.endsWith('.js'))
    .map((file) => '/' + file);
  const disabledCssHrefs = cssFiles.map((file) => '/' + file);
  assertPreloadHelperDedupe([...modulePreloadHrefs, ...disabledCssHrefs]);
  return {
    shell: appShell.replace(styles[0][0], () => `<style data-inline-route-css>${css.replace(/<\/style/gi, '<\\/style')}</style>`),
    jsHref: '/' + entry.file,
    modulePreloadHrefs,
    disabledCssHrefs,
  };
}

// The route CSS is already inlined above, but Vite's preload helper (in the entry chunk) appends
// <link rel="stylesheet" href="/assets/<Route>-*.css"> when the route chunk is imported and waits for it
// to load before running the route module: a duplicate VeryHigh request on the boot path. The helper
// skips any dependency for which `link[href="<dep>"]` (plus `[rel="stylesheet"]` for CSS) already exists,
// so each route shell carries a *disabled* placeholder (never fetched, never applied), and its boot loader
// modulepreloads every JS dependency. Fail the build if a Vite upgrade changes that contract or the list drifts.
function assertPreloadHelperDedupe(hrefs) {
  const entry = readFileSync(join(distDir, manifest['index.html'].file), 'utf8');
  if (!entry.includes('document.querySelector(`link[href="${') || !entry.includes('[rel="stylesheet"]')) {
    throw new Error('spa-fallback: the Vite preload helper no longer dedupes by link[href]; the inlined route CSS would be fetched twice');
  }
  const deps = entry.match(/m\.f=\[([^\]]*)\]/)?.[1] || '';
  for (const href of hrefs) {
    if (!deps.includes(`"${href.slice(1)}"`)) throw new Error(`spa-fallback: ${href} is not a preload-helper dependency`);
  }
}

// The AEO and GEO page (AI_VISIBILITY_PATH, internal id 'ai-visibility') and /team/ ship React's own nav + hero,
// rendered at build time (scripts/prerender.mjs), followed
// by the static mirror of everything below the hero as an inert island. The client hydrates that markup instead of
// replacing it (src/main.jsx), so the first paint is final and stays the largest one; the app itself loads after
// that paint (deferEntryToPaint). The noscript/agent layer is unchanged: the island is the same mirror as before.
const prerender = await loadPrerender({ mode: preview ? 'preview' : 'production', env: { VITE_CAPI_URL: capiUrl } });
const appShellHead = appShell.match(/<head>([\s\S]*?)<\/head>/)[1];

function prerenderedRoute(moduleId, { dir, title, headHtml, hydrate, island, h1Text, rootHtml }) {
  const root = cleanSsr(rootHtml, { island, h1Text, headHtml: appShellHead });
  const assets = leanRouteShell(moduleId, root);
  const shell = buildPageShell(assets.shell, {
    title, headHtml, hydrate, rootHtml: root, disabledCssHrefs: assets.disabledCssHrefs,
  });
  mkdirSync(join(distDir, dir), { recursive: true });
  writeFileSync(join(distDir, dir, 'index.html'), appendBeaconLoader(deferEntryToPaint(shell, {
    preloadHrefs: [assets.jsHref, ...assets.modulePreloadHrefs],
    routeEntryHref: assets.jsHref,
  })), 'utf8');
}

prerenderedRoute('src/team/TeamApp.jsx', {
  dir: 'team',
  title: TEAM_META.title,
  headHtml: teamHead({ preview }),
  hydrate: 'team',
  island: 'team-rest',
  h1Text: HEADLINES.a,
  rootHtml: prerender.renderTeam({ restHtml: renderTeamMirrorRest(), variant: 'a' }),
});

prerenderedRoute('src/ads/PaidAdsApp.jsx', {
  dir: PAID_ADS_DIR,
  title: PAID_ADS_META.title,
  headHtml: paidAdsHead({ preview }),
  hydrate: 'paid-ads',
  island: 'ads-rest',
  h1Text: PAID_ADS_HEADLINES.a,
  rootHtml: prerender.renderPaidAds({ restHtml: renderPaidAdsMirrorRest({ capiUrl }), variant: 'a' }),
});

prerenderedRoute('src/websites/DealerWebsitesApp.jsx', {
  dir: WEBSITE_DIR,
  title: WEBSITE_META.title,
  headHtml: dealerWebsitesHead({ preview }),
  hydrate: 'dealer-websites',
  island: 'websites-rest',
  h1Text: `${WEBSITE_HERO.h1Lead} ${WEBSITE_HERO.h1Grad}`,
  rootHtml: prerender.renderDealerWebsites({ restHtml: renderDealerWebsitesMirrorRest({ capiUrl }) }),
});

prerenderedRoute('src/ai/AiVisibilityApp.jsx', {
  dir: AI_VISIBILITY_DIR,
  title: META.title,
  headHtml: aiVisibilityHead({ preview }),
  hydrate: 'ai-visibility',
  island: 'ai-rest',
  h1Text: `${HERO.h1Lead} ${HERO.h1Grad}`,
  rootHtml: prerender.renderAiVisibility({ restHtml: renderAiVisibilityMirrorRest({ capiUrl }) }),
});

// The page's retired URLs. The Worker 301s them (worker/src/agent/moved-pages.js); this build-time stub forwards
// visitors when the Worker is not in front (fail-open, switched off, Pages preview). Vite already created the folder
// for the page images that stay there (public/ai-visibility/*.avif|webp), so only index.html is added. Never commit
// the stub to public/: it is generated here, with no tracking and no beacon loader.
for (const legacy of AI_VISIBILITY_LEGACY_PATHS) {
  const legacyDir = legacy.replace(/^\/+|\/+$/g, '');
  if (!legacyDir || legacy === AI_VISIBILITY_PATH || legacyDir === AI_VISIBILITY_DIR) {
    throw new Error(`spa-fallback: legacy path ${legacy} would overwrite the live page`);
  }
  mkdirSync(join(distDir, legacyDir), { recursive: true });
  writeFileSync(join(distDir, legacyDir, 'index.html'), aiVisibilityLegacyStubHtml(), 'utf8');
}

// The homepage's first screen is its static home block (index.html), so its app also loads after the first paint.
// 404.html, /admin and /pay keep the head entry script: they are app pages with nothing static to show first.
// These prerendered pages are also the ones the Worker serves with Cache-Control: no-transform, so they load Cloudflare
// Web Analytics themselves (appendBeaconLoader); worker-no-transform.test.js keeps the two lists identical.
writeFileSync(indexPath, appendBeaconLoader(deferEntryToPaint(appShell)), 'utf8');

// The bundler must never read local proof in production. This separate post-build
// audit reads it only to ensure none of its unverified claims escaped into dist.
const localProof = join(process.cwd(), 'shared/ai-visibility-proof.local.js');
if (!preview && existsSync(localProof)) {
  const { PROOF_ENTRIES } = await import(pathToFileURL(localProof).href);
  assertNoUnverifiedProof(distDir, PROOF_ENTRIES);
}

// Only remove the two known build-owned paths; leave unexpected contents to fail.
unlinkSync(join(distDir, '.vite/manifest.json'));
rmdirSync(join(distDir, '.vite'));
