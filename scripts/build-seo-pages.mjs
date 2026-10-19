// Builds the NEW SEO silo (category + feature pages + integration hub/spokes) as standalone
// static HTML in public/, and writes the UNIFIED public/sitemap.xml + public/robots.txt covering
// BOTH the existing /compare/ cluster + /guide/ AND the new silo (so sitemap is never clobbered
// regardless of which generator runs last).
//
// Why static (not React routes): AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…)
// don't run JS, so SPA content is invisible to them. These pages put full content in the HTML source.
// Meta-safety: files in public/ are copied verbatim by Vite; the Meta Pixel is injected ONLY into the
// SPA index.html (vite.config.js). These pages carry NO pixel and never live on /thank-you — they
// cannot fire a conversion.
//
// Run AFTER build-compare-pages.mjs (or alone — both now emit the full sitemap):
//   node scripts/build-compare-pages.mjs && node scripts/build-seo-pages.mjs

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderPage, renderMarkdown, SEO_STYLES, SITE, ogImageFor, humanDate } from './seo/shell.mjs';
import {
  NAV, INTEGRATIONS, SPA_PAGE_PATHS, integrationPath, integrationUrl, relatedFor,
} from './seo/registry.mjs';
import { COMPETITORS, GUIDE } from './compare-data.mjs';
import { PAID_ADS_LASTMOD } from './seo/data-paid-ads.mjs';
import { WEBSITE_LASTMOD } from './seo/data-dealer-websites.mjs';
import {
  buildArticlePage, hubAugmentLinks, contentStatusJson, articleSitemapEntries,
  loadPublishState, isPublished, articlePath, gatePageLinks, siloNumberingProblems, SUGGESTED_ORDER,
  publishedClusterGuides, aeoGeoGuidesModule, AEO_GEO_GUIDES_MODULE, latestSiloUpdate, modifiedDate,
} from './seo/articles/article-system.mjs';
import { loadBlogPosts } from './seo/articles/blog-loader.mjs';
import { STUDIO_IMAGES } from './seo/articles/image-usage.mjs';
import { blogIndexPage, blogRss, publishedBlogPosts } from './seo/blog-pages.mjs';
import { buildHomeDirectory, injectHomeDirectory } from './seo/home-directory.mjs';
import { DRIP_ARTICLES } from './seo/articles/drip-articles.mjs';

import { PAGES as CATEGORY } from './seo/data-category.mjs';
import { PAGES as PRICING } from './seo/data-pricing.mjs';
import { PAGES as INVENTORY } from './seo/data-inventory.mjs';
import { PAGES as BULK } from './seo/data-bulk.mjs';
import { PAGES as SAFETY } from './seo/data-safety.mjs';
import { PAGES as INTEG } from './seo/data-integrations.mjs';
import { PAGES as LISTINGSW } from './seo/data-listing-software.mjs';
import { PAGES as FBLISTING } from './seo/data-facebook-listing.mjs';
import { PAGES as DEALERS } from './seo/data-dealers.mjs';
import { PAGES as AITOOLS } from './seo/data-ai-tools.mjs';
import { PAGES as AUTOMATION } from './seo/data-automation.mjs';
import { PAGES as ASSISTANT } from './seo/data-assistant.mjs';
import { PAGES as AUTOPOSTER } from './seo/data-autoposter.mjs';
import { PAGES as GROWTH } from './seo/data-growth.mjs';
import { PAGES as GROWTHMONEY } from './seo/data-growth-money.mjs';
import { PAGES as REPORT } from './seo/data-report.mjs';
import { PAGES as ABOUT } from './seo/data-about.mjs';
import { PAGES as CONTACT } from './seo/data-contact.mjs';
// 2026-09-03 discovery + cluster pages (see registry.mjs NAV for the rationale)
import { PAGES as POSITIONING } from './seo/data-positioning.mjs';
import { PAGES as INVDIST } from './seo/data-inventory-distribution.mjs';
import { PAGES as RVCLUSTER } from './seo/data-rv-cluster.mjs';
import { PAGES as AICHATCLUSTER } from './seo/data-aichat-cluster.mjs';
import { HOME } from './seo/data-home.mjs';
import {
  AI_VISIBILITY_END,
  AI_VISIBILITY_START,
  agentsMarkdown,
  aiVisibilitySection,
  whenToUseSection,
} from './seo/agent-instructions.mjs';
import {
  AI_VISIBILITY,
  AI_VISIBILITY_OG_IMAGE,
  renderAiVisibilityMarkdown,
} from './seo/data-ai-visibility.mjs';
import { AI_VISIBILITY_UPDATED } from '../shared/ai-visibility-content.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The committed static assets (studio images, the compare cluster, the training mirror, data
// files). Always the repo's own public/: the link gate below checks targets against it.
const SOURCE_PUBLIC_DIR = resolve(REPO_ROOT, 'public');
// Sandbox mode, for tests only (test/dead-links.test.js): AL_SEO_OUT_DIR sends EVERY write
// (public/, index.html, src/generated/) to another root, and AL_SEO_STATE_FILE builds from a
// simulated publish state, so a test can build "the first N articles published" without
// touching the working tree. Unset (every real build), both are the repo's own paths.
const OUT_ROOT = process.env.AL_SEO_OUT_DIR ? resolve(process.env.AL_SEO_OUT_DIR) : REPO_ROOT;
const PUBLIC_DIR = resolve(OUT_ROOT, 'public');

// ---------- Avalanche article layer (drip-published; see seo/articles/article-system.mjs) ----------
// publish-state.json is the gate: draft articles are rendered NOWHERE (no HTML, no sitemap,
// no llms.txt, no hub links). Publishing an article and rebuilding is what reveals it — and
// also re-renders every hub/sibling so earlier pages pick up links to the newly live spoke.
const BLOG_POSTS = loadBlogPosts();
const ARTICLE_CONTENT = [...DRIP_ARTICLES, ...BLOG_POSTS];
const PUBLISH_STATE = process.env.AL_SEO_STATE_FILE
  ? JSON.parse(readFileSync(resolve(process.env.AL_SEO_STATE_FILE), 'utf8'))
  : loadPublishState();
{
  const known = new Set(Object.keys(PUBLISH_STATE));
  const competitorSlugs = new Set(Object.values(COMPETITORS).map((c) => c.slug));
  const dupes = ARTICLE_CONTENT.filter((c, i) => ARTICLE_CONTENT.findIndex((x) => x.slug === c.slug) !== i);
  if (dupes.length) throw new Error(`duplicate article slugs: ${dupes.map((d) => d.slug).join(', ')}`);
  const unknown = ARTICLE_CONTENT.filter((c) => !known.has(c.slug));
  if (unknown.length) throw new Error(`article slugs missing from publish-state.json: ${unknown.map((d) => d.slug).join(', ')}`);
  const compareCollisions = ARTICLE_CONTENT.filter((c) => c.silo === 'compare' && competitorSlugs.has(c.slug));
  if (compareCollisions.length) {
    throw new Error(`compare article slugs collide with versus pages: ${compareCollisions.map((d) => d.slug).join(', ')}`);
  }
  // A silo that numbers its articles (aeoGeo #1..#50) must agree with SUGGESTED_ORDER, or the
  // admin's "#N" and the backward-only link rule would describe two different orders.
  const numbering = siloNumberingProblems(ARTICLE_CONTENT);
  if (numbering.length) throw new Error(`silo publish numbers drift from SUGGESTED_ORDER:\n  ${numbering.join('\n  ')}`);
}
const PUBLISHED_ARTICLES = ARTICLE_CONTENT.filter((c) => isPublished(PUBLISH_STATE, c.slug));
const PUBLISHED_BLOG_POSTS = publishedBlogPosts(ARTICLE_CONTENT, PUBLISH_STATE);
// /blog/ lists every published article (blog posts and silo articles), so its lastmod moves with any of them.
const BLOG_LASTMOD = PUBLISHED_ARTICLES
  .map((post) => modifiedDate(post, PUBLISH_STATE, PUBLISH_STATE[post.slug]?.publishedAt))
  .filter(Boolean)
  .sort()
  .at(-1) || SITE.updated;
// Every in-body link the publish gate holds back as plain text (a (@slug) token or href to an
// unpublished article, or an internal path the site does not serve), for the build summary.
const UNLINKED = [];
const ARTICLE_PAGES = PUBLISHED_ARTICLES.map((c) => buildArticlePage(c, ARTICLE_CONTENT, PUBLISH_STATE, {
  onUnlinked: (event) => UNLINKED.push({ page: articlePath(c), ...event }),
}));
const BLOG_PAGE = blogIndexPage(ARTICLE_CONTENT, PUBLISH_STATE);
// Money page down-links: the published AEO and GEO articles by cluster, from THIS build's publish
// state. The twin below renders them directly (never the committed module, which this very build
// may be about to rewrite), and src/generated/aeo-geo-guides.js carries them to React and the
// static mirror for the next `npm run build`.
const AEO_GEO_GUIDES = publishedClusterGuides('aeoGeo', ARTICLE_CONTENT, PUBLISH_STATE);
// The money page changes whenever one of them is published, so its dates follow the newest one.
const AEO_GEO_UPDATED = latestSiloUpdate('aeoGeo', ARTICLE_CONTENT, PUBLISH_STATE);
const AI_VISIBILITY_LASTMOD = [AI_VISIBILITY_UPDATED, AEO_GEO_UPDATED].filter(Boolean).sort().at(-1);

const ALL = [...CATEGORY, ...PRICING, ...INVENTORY, ...BULK, ...SAFETY, ...INTEG, ...LISTINGSW, ...FBLISTING, ...DEALERS, ...AITOOLS, ...AUTOMATION, ...ASSISTANT, ...AUTOPOSTER, ...GROWTH, ...GROWTHMONEY, ...REPORT, ...ABOUT, ...CONTACT, ...POSITIONING, ...INVDIST, ...RVCLUSTER, ...AICHATCLUSTER, AI_VISIBILITY, BLOG_PAGE, ...ARTICLE_PAGES];

// Hub pages grow "Keep exploring" links to their silo's PUBLISHED articles. With zero
// published articles this is a no-op and every existing page renders byte-identical.
{
  const augment = hubAugmentLinks(ARTICLE_CONTENT, PUBLISH_STATE);
  for (const page of ALL) {
    const extra = page.key ? augment.get(page.key) : null;
    if (extra && extra.length) {
      page.related = [...(page.related || relatedFor(page.key)), ...extra];
    }
  }
}

// ---------- dead-link safety net: publish-aware body links on EVERY page ----------
// Any in-body markdown link (and any (@slug) token) whose target is an unpublished article, or
// an internal path this site does not serve, renders as its plain anchor text instead of an
// <a>. It comes back as a link on the build that publishes the target, because every publish
// rebuilds every page. So no publish order, and no hand-written href, can ship a dead link.
// A served path = a page this build renders, a file in public/ (static assets, the compare
// cluster, the training mirror), or an exact-path SPA shell. test/dead-links.test.js crawls
// the output for the current state and for simulated publish states.
const pagePathOf = (page) => page.path || (page.key && NAV[page.key] ? NAV[page.key].path : null);
const BUILT_PATHS = new Set(ALL.map(pagePathOf).filter(Boolean));
const SPA_SHELL_PATHS = new Set(['/', ...SPA_PAGE_PATHS]);
function servedStaticPath(urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath).replace(/^\/+/, ''); } catch { return false; }
  const file = resolve(SOURCE_PUBLIC_DIR, rel);
  const inside = relative(SOURCE_PUBLIC_DIR, file);
  if (inside.startsWith('..') || isAbsolute(inside)) return false;
  if (existsSync(file) && statSync(file).isFile()) return true;
  return existsSync(resolve(file, 'index.html'));
}
const isServedPath = (urlPath) => SPA_SHELL_PATHS.has(urlPath) || BUILT_PATHS.has(urlPath) || servedStaticPath(urlPath);
for (let i = 0; i < ALL.length; i += 1) {
  const pagePath = pagePathOf(ALL[i]);
  ALL[i] = gatePageLinks(ALL[i], {
    articles: ARTICLE_CONTENT,
    state: PUBLISH_STATE,
    isLinkablePath: isServedPath,
    onUnlinked: (event) => UNLINKED.push({ page: pagePath, ...event }),
  });
}
{
  const unknown = UNLINKED.filter((u) => u.kind.startsWith('unknown'));
  for (const u of unknown) console.warn(`!! ${u.page}: "${u.text}" -> ${u.target} is not a page this site serves; rendered as plain text`);
  const held = UNLINKED.length - unknown.length;
  if (held) console.log(`Link gate: ${held} in-body link(s) to unpublished articles held as plain text until the target is published.`);
}

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  console.log('wrote', path.replace(PUBLIC_DIR, 'public'));
}

const pathToFile = (urlPath) => resolve(PUBLIC_DIR, urlPath.replace(/^\/|\/$/g, ''), 'index.html');

// ---------- render pages ----------
write(resolve(PUBLIC_DIR, 'seo', 'styles.css'), SEO_STYLES);

const renderedPaths = new Set();
for (const page of ALL) {
  const nav = page.key ? NAV[page.key] : null;
  const urlPath = page.path || (nav && nav.path);
  if (!urlPath) { console.warn('!! page missing path/key:', page.title); continue; }
  if (page.spa) {
    renderedPaths.add(urlPath);
    continue;
  }
  write(pathToFile(urlPath), renderPage(page));
  renderedPaths.add(urlPath);
}
write(
  resolve(PUBLIC_DIR, 'blog', 'feed.xml'),
  blogRss(ARTICLE_CONTENT, PUBLISH_STATE, { now: new Date(`${BLOG_LASTMOD}T00:00:00Z`) }),
);

// ---------- machine-readable copies of the report data ----------
// Derived from the report page's OWN table sections, so the CSV/JSON can never drift from the
// published figures. These files back the Dataset node's DataDownload distributions — if you
// rename a table id here, update `dataset.distribution` in data-report.mjs too.
function buildReportData() {
  const page = REPORT[0];
  const tables = (page.sections || []).filter((s) => s.type === 'table');
  if (!tables.length) { console.warn('!! report page has no table sections — skipping data export'); return; }

  const meta = {
    name: page.dataset?.name || page.h1,
    url: SITE.origin + NAV.report2026.path,
    publisher: 'AutoLander LLC',
    author: 'Michael Garber',
    datePublished: page.dataset?.datePublished || SITE.updated,
    dateModified: SITE.updated,
    temporalCoverage: page.dataset?.temporalCoverage,
    spatialCoverage: 'United States',
    license: page.dataset?.license,
    measurementTechnique: page.dataset?.measurementTechnique,
    sample: page.dataset?.size,
    citation: 'AutoLander, "The Facebook Marketplace Used-Car Report 2026," autolander.ai, August 2026.',
  };

  // ---- JSON: nested, one object per table, rows keyed by column header ----
  const json = {
    ...meta,
    tables: tables.map((t) => ({
      id: t.id,
      title: t.h2,
      caption: t.caption,
      note: t.note,
      columns: t.head,
      rows: t.rows.map((r) => Object.fromEntries(r.map((cell, i) => [t.head[i], cell]))),
    })),
  };
  write(resolve(PUBLIC_DIR, 'data', 'marketplace-report-2026.json'), JSON.stringify(json, null, 2) + '\n');

  // ---- CSV: long format so every table shares one schema regardless of column count ----
  const q = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const lines = ['table_id,table_title,row,field,value'];
  for (const t of tables) {
    for (const r of t.rows) {
      for (let i = 1; i < r.length; i += 1) {
        lines.push([t.id, t.h2, r[0], t.head[i], r[i]].map(q).join(','));
      }
    }
  }
  lines.push('');
  lines.push(`# Source: ${meta.url}`);
  lines.push(`# Cite as: ${meta.citation}`);
  lines.push(`# Licence: ${meta.license}`);
  write(resolve(PUBLIC_DIR, 'data', 'marketplace-report-2026.csv'), lines.join('\n') + '\n');
}
buildReportData();

// ---------- content publisher status (read by the /admin Content Publisher) ----------
write(
  resolve(PUBLIC_DIR, 'data', 'content-status.json'),
  JSON.stringify(contentStatusJson(ARTICLE_CONTENT, PUBLISH_STATE), null, 2) + '\n',
);

// ---------- homepage directory ("Every AutoLander page, by topic") ----------
// Derived from the same publish state as everything else, so a publish adds the article to
// the homepage in the same commit. Two copies, one generator (see seo/home-directory.mjs):
//   • index.html, between the AL_STATIC_HOME_DIRECTORY markers — the crawlable static block;
//   • src/generated/home-directory.json — what HomeDetails.jsx renders after React mounts.
// Both live OUTSIDE public/, so the publish workflow must `git add` them (it does).
{
  const groups = buildHomeDirectory(ARTICLE_CONTENT, PUBLISH_STATE);

  const genPath = resolve(OUT_ROOT, 'src', 'generated', 'home-directory.json');
  mkdirSync(dirname(genPath), { recursive: true });
  const genJson = JSON.stringify({ groups }, null, 2) + '\n';
  let prevJson = null;
  try { prevJson = readFileSync(genPath, 'utf8'); } catch { /* first build */ }
  if (prevJson !== genJson) { writeFileSync(genPath, genJson, 'utf8'); console.log('wrote src/generated/home-directory.json'); }

  const indexPath = resolve(OUT_ROOT, 'index.html');
  const indexExists = existsSync(indexPath);
  const before = readFileSync(indexExists ? indexPath : resolve(REPO_ROOT, 'index.html'), 'utf8');
  const after = injectHomeDirectory(before, groups);
  if (after !== before || !indexExists) { writeFileSync(indexPath, after, 'utf8'); console.log('wrote index.html (homepage directory)'); }
  console.log(`Homepage directory: ${groups.length} groups, ${groups.reduce((n, g) => n + g.links.length, 0)} links.`);
}

// ---------- AEO and GEO page guides block (src/generated/aeo-geo-guides.js) ----------
// The money page is an SPA route, so its "AEO and GEO guides for dealers" block reads a generated
// module (React section + static mirror at `npm run build`). It lives outside public/ like the
// homepage directory, under src/generated/, which the publish workflow already commits. Written
// only when it changes, so a build with no AEO publish leaves the file untouched.
{
  const genPath = resolve(OUT_ROOT, AEO_GEO_GUIDES_MODULE);
  mkdirSync(dirname(genPath), { recursive: true });
  const source = aeoGeoGuidesModule(AEO_GEO_GUIDES, AEO_GEO_UPDATED);
  let prev = null;
  try { prev = readFileSync(genPath, 'utf8'); } catch { /* first build */ }
  if (prev !== source) { writeFileSync(genPath, source, 'utf8'); console.log(`wrote ${AEO_GEO_GUIDES_MODULE}`); }
  console.log(`AEO and GEO page guides: ${AEO_GEO_GUIDES.length} cluster(s), ${AEO_GEO_GUIDES.reduce((n, g) => n + g.links.length, 0)} published article(s).`);
}

// ---------- draft preview (LOCAL ONLY — never into public/) ----------
// ARTICLE_DRAFT_PREVIEW=1 renders draft articles into dist-preview/ so Michael can read
// them in a browser before publishing. dist-preview/ is gitignored; nothing here can leak.
if (process.env.ARTICLE_DRAFT_PREVIEW === '1' || process.argv.includes('--draft-preview')) {
  const previewDate = new Date().toISOString().slice(0, 10);
  const PREVIEW_DIR = resolve(OUT_ROOT, 'dist-preview');
  // Preview pretends every article is published so sibling links render fully.
  const pretendState = Object.fromEntries(Object.entries(PUBLISH_STATE).map(([slug, st]) => [
    slug, st.status === 'published' ? st : { status: 'published', publishedAt: previewDate },
  ]));
  for (const c of ARTICLE_CONTENT) {
    const page = buildArticlePage(c, ARTICLE_CONTENT, pretendState, { previewDate });
    write(resolve(PREVIEW_DIR, articlePath(c).replace(/^\/|\/$/g, ''), 'index.html'), renderPage(page));
  }
  console.log(`\n[preview] ${ARTICLE_CONTENT.length} article previews -> dist-preview/ (open the article's base-path directory)`);
}

// ---------- Markdown twins + llms.txt ----------
// Answer engines parse Markdown far more reliably than HTML. Every silo page gets a .md twin at
// <path>.md, and /llms.txt is the curated index that points at them. Both are generated from the
// same page objects that produce the HTML, so they cannot drift out of sync with the site.
const mdPathFor = (urlPath) => (urlPath === '/' ? '/index' : urlPath.replace(/\/$/, '')) + '.md';

function buildMarkdownTwins() {
  const twins = [];
  for (const page of ALL) {
    const nav = page.key ? NAV[page.key] : null;
    const urlPath = page.path || (nav && nav.path);
    if (!urlPath) continue;
    const rel = mdPathFor(urlPath);
    const markdown = page.key === 'aiVisibility' ? renderAiVisibilityMarkdown({ guides: AEO_GEO_GUIDES, updated: AI_VISIBILITY_LASTMOD }) : renderMarkdown(page);
    write(resolve(PUBLIC_DIR, rel.replace(/^\//, '')), markdown);
    twins.push({ urlPath, md: rel, title: page.h1 || page.title, description: page.description });
  }
  return twins;
}

// The homepage is a React SPA, so `/` has no crawlable body and no page object in ALL (adding one
// would overwrite index.html with a static page — i.e. delete the site). It still needs a Markdown
// representation: the Worker serves this file when a client requests `/` with
// `Accept: text/markdown`, and llms.txt links it like any other twin.
function buildHomeTwin() {
  write(resolve(PUBLIC_DIR, 'index.md'), renderMarkdown(HOME));
  return { urlPath: '/', md: '/index.md', title: HOME.h1, description: HOME.description };
}

// Dedicated agent-instructions file. llms.txt carries the same guidance inline; this is the
// standalone document to link when something asks for "your agent instructions".
function buildAgentsMd() {
  // agents.md lists the published guides, so its date moves with the newest one.
  const updated = AEO_GEO_UPDATED && AEO_GEO_UPDATED > SITE.updated ? humanDate(AEO_GEO_UPDATED) : (SITE.updatedHuman || SITE.updated);
  write(resolve(PUBLIC_DIR, 'agents.md'), agentsMarkdown(updated, { guides: AEO_GEO_GUIDES }));
}

function buildLlmsTxt(twins) {
  const byPath = new Map(twins.map((t) => [t.urlPath, t]));
  const entry = (urlPath, overrideTitle) => {
    const t = byPath.get(urlPath);
    if (!t) return null;
    const title = overrideTitle || t.title;
    return `- [${title}](${SITE.origin}${t.md}): ${t.description}`;
  };
  const group = (heading, paths) => {
    const rows = paths.map((p) => entry(p)).filter(Boolean);
    return rows.length ? `## ${heading}\n\n${rows.join('\n')}\n` : '';
  };
  const comparisonArticleRows = PUBLISHED_ARTICLES
    .filter((c) => c.silo === 'compare')
    .map((c) => entry(articlePath(c)))
    .filter(Boolean);

  const header = `# AutoLander

> Facebook Marketplace software for car dealerships and sales reps in the United States, Canada
> and Spanish-speaking Latin America, in English, Spanish and French. Dealers connect an inventory
> feed and AutoLander posts vehicles to Facebook Marketplace, keeps asking prices in step with the
> feed, removes sold units, and runs AI photo editing on listing images. It never opens, answers or
> forwards a buyer message. Built by AutoLander LLC. Plans from $${SITE.lowPrice}/mo.

AutoLander publishes original first-party research on the dealer side of Facebook Marketplace,
computed directly from anonymized aggregate platform data — never surveys or estimates. Datasets
are released under CC BY 4.0 with attribution.

Every link below points at a Markdown copy of the page; drop the .md for the HTML version.
Contact: sales@autolander.ai · (919) 280-0967
`;

  const body = [
    // 'When to use' comes first: an agent that reads only the top of the file should still learn
    // what jobs we are the right answer for before it sees a single link.
    whenToUseSection(),
    group('Start here', ['/']),
    group('Original research', [NAV.report2026.path]),
    `## Data

- [Marketplace Report 2026 — full dataset (CSV)](${SITE.origin}/data/marketplace-report-2026.csv): All four report tables in long format, CC BY 4.0.
- [Marketplace Report 2026 — full dataset (JSON)](${SITE.origin}/data/marketplace-report-2026.json): The same figures with methodology, sample sizes and units attached.
`,
    group('About the publisher', [NAV.about.path, NAV.contact.path]),
    group('Product', [
      NAV.category.path, NAV.listingSw.path, NAV.dealers.path, NAV.inventory.path,
      NAV.inventoryDist.path,
      NAV.bulk.path, NAV.automation.path, NAV.safety.path, NAV.pricing.path,
      NAV.aiChat.path, NAV.photoEditor.path, NAV.rvDealers.path,
    ]),
    aiVisibilitySection(),
    // AEO and GEO drip library: its own group, right after the service it supports and OUTSIDE
    // the ai-visibility markers. group() returns '' while nothing is published, so llms.txt is
    // byte-identical until the first AEO publish.
    group('AEO and GEO guides for car dealers', PUBLISHED_ARTICLES
      .filter((c) => c.silo === 'aeoGeo')
      .sort((a, b) => SUGGESTED_ORDER.indexOf(a.slug) - SUGGESTED_ORDER.indexOf(b.slug))
      .map((c) => articlePath(c))),
    // Two deliberate scope decisions, stated as principles. An agent deciding whether to
    // recommend AutoLander should read these before a competitor's feature matrix does the
    // explaining for us.
    group('Why we work the way we do', [NAV.whyMarketplaceOnly.path, NAV.whyNoAutoReply.path]),
    group('Guides', [
      NAV.mktgHub.path, NAV.mktgIdeas.path, NAV.salesLeads.path, NAV.socialMedia.path,
      NAV.sellMore.path, NAV.aiDealers.path, NAV.aiTools.path,
      NAV.rvSellGuide.path, NAV.rvPhotos.path, NAV.aiChatVendor.path, NAV.responseTime.path,
    ]),
    // Drip-published long-tail library — only articles that are actually live.
    group('Deep-dive dealer guides', PUBLISHED_ARTICLES
      .filter((c) => c.silo !== 'compare' && c.silo !== 'blog' && c.silo !== 'aeoGeo')
      .map((c) => articlePath(c))),
    group('Blog', [NAV.blog.path, ...PUBLISHED_BLOG_POSTS.map((c) => articlePath(c))]),
    group('Integrations', [NAV.integHub.path, ...INTEGRATIONS.map((s) => integrationPath(s.slug))]),
    // The evergreen /compare/ cluster comes from build-compare-pages.mjs and has no Markdown
    // twins. Published drip comparison articles are page objects, so their twin links append here.
    `## Comparisons

- [Best Facebook Marketplace auto-posting tools for car dealers (2026)](${SITE.origin}/compare/): Buyer's guide comparing every major Facebook Marketplace posting tool for dealers on workflow, session architecture, AI photo/video and price.
${Object.values(COMPETITORS).map((c) => `- [AutoLander vs ${c.name}](${SITE.origin}/compare/${c.slug}/): Head-to-head comparison. ${c.name}: ${c.oneLiner}`).join('\n')}${comparisonArticleRows.length ? `\n${comparisonArticleRows.join('\n')}` : ''}
`,
    `## Buyer guides

- [Facebook Marketplace automation: the honest version](${SITE.origin}/guide/facebook-marketplace-automation/): What Meta's terms actually say about automating Marketplace, the four architectures people use, and the account risks each carries.
- [How to sell cars on Facebook Marketplace](${SITE.origin}/guide/how-to-sell-cars-on-facebook-marketplace/): Step-by-step guide to listing, pricing, photographing and closing a vehicle sale on Facebook Marketplace.
`,
  ].filter(Boolean).join('\n');

  write(resolve(PUBLIC_DIR, 'llms.txt'), `${header}\n${body}`);

  // llms-full.txt: every page's Markdown concatenated, for a model that wants the whole corpus
  // in one fetch rather than crawling 45 URLs.
  const full = ALL.map((page) => {
    if (page.key !== 'aiVisibility') return renderMarkdown(page);
    return `${AI_VISIBILITY_START}\n${aiVisibilitySection(2, { markers: false })}\n\n${renderAiVisibilityMarkdown({ guides: AEO_GEO_GUIDES, updated: AI_VISIBILITY_LASTMOD })}\n${AI_VISIBILITY_END}`;
  }).join('\n\n---\n\n');
  write(resolve(PUBLIC_DIR, 'llms-full.txt'), `${header}\n\n---\n\n${full}`);
}

buildAgentsMd();
buildLlmsTxt([buildHomeTwin(), ...buildMarkdownTwins()]);

// ---------- completeness check (warns if a registry page wasn't produced) ----------
const expected = [
  NAV.category.path, NAV.integHub.path, NAV.inventory.path, NAV.bulk.path, NAV.safety.path, NAV.pricing.path,
  NAV.listingSw.path, NAV.fbListing.path, NAV.dealers.path,
  NAV.aiTools.path, NAV.automation.path, NAV.assistant.path, NAV.autoposter.path,
  NAV.mktgHub.path, NAV.mktgIdeas.path, NAV.salesLeads.path, NAV.socialMedia.path,
  NAV.sellMore.path, NAV.aiDealers.path, NAV.aiChat.path, NAV.photoEditor.path, NAV.rvDealers.path, NAV.report2026.path,
  NAV.about.path, NAV.contact.path,
  NAV.blog.path,
  NAV.whyMarketplaceOnly.path, NAV.whyNoAutoReply.path, NAV.inventoryDist.path,
  NAV.rvSellGuide.path, NAV.rvPhotos.path, NAV.aiChatVendor.path, NAV.responseTime.path,
  NAV.aiVisibility.path,
  ...INTEGRATIONS.map((s) => integrationPath(s.slug)),
];
const missing = expected.filter((p) => !renderedPaths.has(p));
if (missing.length) console.warn(`\n!! MISSING ${missing.length} expected page(s):\n   ${missing.join('\n   ')}`);

// ---------- unified robots.txt ----------
function robotsTxt() {
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot',
    'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot',
    'Applebot-Extended', 'Bingbot', 'cohere-ai', 'Amazonbot', 'meta-externalagent',
    'DuckAssistBot', 'MistralAI-User', 'Amzn-SearchBot', 'meta-webindexer'];
  const blocks = aiBots.map((ua) => `User-agent: ${ua}\nAllow: /`).join('\n\n');
  return `# AutoLander robots.txt
# All crawlers are welcome, including AI search & answer engines.
User-agent: *
Allow: /

${blocks}

Sitemap: ${SITE.origin}/sitemap.xml
Sitemap: ${SITE.origin}/image-sitemap.xml
`;
}

// ---------- image sitemap ----------
// The product's core value is listing photography, yet nothing told an image crawler where the
// studio before/after pairs live. Built from the same page objects as the HTML — every
// {type:'figure'} and {type:'image'} section, plus each page's OG card — so it can never reference
// an image the page does not actually show. Relative /studio/… paths are made absolute.
function imageSitemapXml() {
  const abs = (src) => (/^https?:/i.test(src) ? src : SITE.origin + src);
  const escXml = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const entries = [];
  for (const page of ALL) {
    const nav = page.key ? NAV[page.key] : null;
    const urlPath = page.path || (nav && nav.path);
    if (!urlPath) continue;
    const images = [];
    for (const s of page.sections || []) {
      if (s.type === 'figure') {
        if (s.before) images.push({ loc: abs(s.before), title: s.beforeAlt || s.caption || page.h1 });
        if (s.after) images.push({ loc: abs(s.after), title: s.afterAlt || s.caption || page.h1 });
      } else if (s.type === 'image' && s.src) {
        images.push({ loc: abs(s.src), title: s.alt || s.caption || page.h1 });
      }
    }
    images.push({
      loc: page.key === 'aiVisibility' ? AI_VISIBILITY_OG_IMAGE : ogImageFor(urlPath, page.ogFallback),
      title: page.title,
    });
    if (images.length) entries.push({ loc: SITE.origin + urlPath, images });
  }
  // Homepage: its OG card + the hero preview thumbnails index.html ships.
  entries.unshift({
    loc: SITE.origin + '/',
    images: [
      { loc: ogImageFor('/'), title: HOME.title },
      { loc: SITE.origin + STUDIO_IMAGES.chevroletMalibu.before, title: 'Raw dealership lot photo before AutoLander’s AI Photo Studio' },
      { loc: SITE.origin + STUDIO_IMAGES.chevroletMalibu.after, title: 'The same vehicle as a showroom-grade Facebook Marketplace listing photo after AutoLander' },
    ],
  });
  const body = entries.map((e) => `  <url>
    <loc>${escXml(e.loc)}</loc>
${e.images.map((im) => `    <image:image>
      <image:loc>${escXml(im.loc)}</image:loc>
      <image:title>${escXml(im.title)}</image:title>
    </image:image>`).join('\n')}
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

// ---------- unified sitemap.xml (compare cluster + guide + new silo) ----------
function sitemapXml() {
  const competitorSlugs = Object.values(COMPETITORS).map((c) => c.slug);
  const urls = [
    { loc: SITE.origin + '/', pri: '1.0', freq: 'weekly' },
    { loc: SITE.origin + NAV.aiVisibility.path, pri: '0.8', freq: 'monthly', lastmod: AI_VISIBILITY_LASTMOD },
    { loc: SITE.origin + NAV.paidAds.path, pri: '0.8', freq: 'monthly', lastmod: PAID_ADS_LASTMOD },
    { loc: SITE.origin + NAV.dealerWebsites.path, pri: '0.8', freq: 'monthly', lastmod: WEBSITE_LASTMOD },
    { loc: SITE.origin + '/terms.html', pri: '0.3', freq: 'yearly' },
    { loc: SITE.origin + '/privacy.html', pri: '0.3', freq: 'yearly' },
    { loc: SITE.origin + NAV.category.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.listingSw.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + '/compare/', pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.integHub.path, pri: '0.8', freq: 'monthly' },
    { loc: `${SITE.origin}/${GUIDE.path}/`, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.sellGuide.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.inventory.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.bulk.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.safety.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.pricing.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.dealers.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.fbListing.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.aiTools.path, pri: '0.8', freq: 'weekly' },
    { loc: SITE.origin + NAV.automation.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.assistant.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.autoposter.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.mktgHub.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.mktgIdeas.path, pri: '0.8', freq: 'weekly' },
    { loc: SITE.origin + NAV.salesLeads.path, pri: '0.8', freq: 'weekly' },
    { loc: SITE.origin + NAV.socialMedia.path, pri: '0.7', freq: 'monthly' },
    { loc: SITE.origin + NAV.sellMore.path, pri: '0.8', freq: 'monthly' },
    { loc: SITE.origin + NAV.aiDealers.path, pri: '0.8', freq: 'weekly' },
    { loc: SITE.origin + NAV.aiChat.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.photoEditor.path, pri: '0.9', freq: 'weekly' },
    { loc: SITE.origin + NAV.rvDealers.path, pri: '0.8', freq: 'weekly' },
    { loc: SITE.origin + NAV.report2026.path, pri: '0.9', freq: 'monthly' },
    { loc: SITE.origin + NAV.about.path, pri: '0.6', freq: 'monthly' },
    { loc: SITE.origin + NAV.contact.path, pri: '0.6', freq: 'monthly' },
    { loc: SITE.origin + NAV.blog.path, pri: '0.8', freq: 'weekly', lastmod: BLOG_LASTMOD },
    // Customer training library: a static mirror in public/training/ (never a generated page)
    { loc: SITE.origin + NAV.training.path, pri: '0.8', freq: 'monthly', lastmod: '2026-09-22' },
    // 2026-09-03 discovery + cluster pages
    { loc: SITE.origin + NAV.whyMarketplaceOnly.path, pri: '0.8', freq: 'monthly', lastmod: '2026-09-03' },
    { loc: SITE.origin + NAV.whyNoAutoReply.path, pri: '0.8', freq: 'monthly', lastmod: '2026-09-03' },
    { loc: SITE.origin + NAV.inventoryDist.path, pri: '0.9', freq: 'weekly', lastmod: '2026-09-03' },
    { loc: SITE.origin + NAV.rvSellGuide.path, pri: '0.8', freq: 'monthly', lastmod: '2026-09-03' },
    { loc: SITE.origin + NAV.rvPhotos.path, pri: '0.7', freq: 'monthly', lastmod: '2026-09-03' },
    { loc: SITE.origin + NAV.aiChatVendor.path, pri: '0.8', freq: 'monthly', lastmod: '2026-09-03' },
    { loc: SITE.origin + NAV.responseTime.path, pri: '0.8', freq: 'monthly', lastmod: '2026-09-03' },
    ...competitorSlugs.map((s) => ({ loc: `${SITE.origin}/compare/${s}/`, pri: '0.7', freq: 'monthly' })),
    ...INTEGRATIONS.map((s) => ({ loc: integrationUrl(s.slug), pri: '0.7', freq: 'monthly' })),
    // Published Avalanche articles only; lastmod = the article's real publish date.
    ...articleSitemapEntries(ARTICLE_CONTENT, PUBLISH_STATE),
  ];
  const body = urls.map((u) =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod || SITE.updated}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

write(resolve(PUBLIC_DIR, 'robots.txt'), robotsTxt());
write(resolve(PUBLIC_DIR, 'sitemap.xml'), sitemapXml());
write(resolve(PUBLIC_DIR, 'image-sitemap.xml'), imageSitemapXml());

console.log(`\nDone. ${renderedPaths.size} SEO pages + unified sitemap.xml + robots.txt.`);
console.log(`Articles: ${PUBLISHED_ARTICLES.length}/${ARTICLE_CONTENT.length} published (drafts stay invisible until published via the admin Content Publisher).`);
if (missing.length) {
  console.log(`(sitemap lists all URLs; ${missing.length} page file(s) still pending content.)`);
}
