// Homepage directory ("Every AutoLander page, by topic") — the ONE source of truth.
//
// WHY THIS EXISTS: the homepage's link map used to be hand-copied into two places
// (src/sections/HomeDetails.jsx and the static pre-render block in index.html) and the
// drip-published /guide/ articles never made it into either, so the pages that most needed
// homepage authority got none. Now build-seo-pages.mjs derives the directory from this module
// on every build (which the publish-article workflow runs on every publish), writes it into
//   • index.html between the AL_STATIC_HOME_DIRECTORY markers (what a crawler reads), and
//   • src/generated/home-directory.json (what the React component renders on mount),
// so a newly published article appears in the homepage directory in the same commit that
// publishes it. test/home-directory.test.js fails if either copy drifts from this generator.
//
// SEO stance: every group is a collapsed <details>. The links are in the DOM at load, inside a
// <nav> with a real <ul>, which is what a crawler indexes (Google treats content in closed
// <details> as full-weight under mobile-first indexing). A human sees a short list of topic
// headings and opens one; a crawler sees every link. Same content both ways, so it is a
// pre-render, not cloaking.

import { NAV } from './registry.mjs';
import { AI_VISIBILITY_PATH } from '../../shared/ai-visibility-route.js';
import { PAID_ADS_PATH } from '../../shared/paid-ads-route.js';
import { WEBSITE_PATH } from '../../shared/dealer-websites-route.js';
import {
  SILOS, SUGGESTED_ORDER, isBlog, isPublished, articlePath,
} from './articles/article-system.mjs';

export const HOME_DIRECTORY_START = '<!--AL_STATIC_HOME_DIRECTORY_START-->';
export const HOME_DIRECTORY_END = '<!--AL_STATIC_HOME_DIRECTORY_END-->';

// Evergreen pages, grouped. Labels are the short, human directory labels (not the long
// keyword anchors the silo uses in "Keep exploring"): this list is read by a person deciding
// where to click, and it is scanned, not searched.
const EVERGREEN_GROUPS = [
  ['product', 'Product', [
    ['/facebook-marketplace-auto-poster/', 'Facebook Marketplace auto poster'],
    ['/facebook-marketplace-listing-software/', 'Listing software'],
    ['/facebook-marketplace-automation/', 'Marketplace automation'],
    ['/facebook-marketplace-inventory-sync/', 'Inventory sync'],
    ['/bulk-post-cars-to-facebook-marketplace/', 'Bulk posting'],
    ['/facebook-marketplace-assistant/', 'Marketplace assistant'],
    ['/facebook-autoposter/', 'Autoposter'],
    ['/facebook-listing-software/', 'Facebook listing software'],
    ['/ai-car-photo-editor/', 'AI car photo editor'],
    ['/rv-dealer-software/', 'RV dealer software'],
    ['/safest-facebook-marketplace-auto-poster/', 'Account safety'],
    ['/facebook-marketplace-auto-poster-pricing/', 'Pricing'],
  ]],
  ['integrations', 'Integrations', [
    ['/integrations/', 'All integrations'],
    ['/integrations/cargurus-facebook-marketplace/', 'CarGurus'],
    ['/integrations/cars-com-facebook-marketplace/', 'Cars.com'],
    ['/integrations/vauto-facebook-marketplace/', 'vAuto'],
    ['/integrations/dealercenter-facebook-marketplace/', 'DealerCenter'],
    ['/integrations/dealer-com-facebook-marketplace/', 'Dealer.com'],
    ['/integrations/homenet-facebook-marketplace/', 'HomeNet'],
    ['/integrations/frazer-facebook-marketplace/', 'Frazer'],
    ['/integrations/cdk-facebook-marketplace/', 'CDK'],
    ['/integrations/tekion-facebook-marketplace/', 'Tekion'],
    ['/dealer-inventory-management/', 'Dealer inventory management'],
  ]],
  ['compare', 'Compare', [
    ['/compare/', 'Best Marketplace posting tools (2026)'],
    ['/compare/carvid/', 'vs CARVID'],
    ['/compare/shiftly/', 'vs Shiftly'],
    ['/compare/autolisterpro/', 'vs AutoLister Pro'],
    ['/compare/relayauto/', 'vs RelayAuto'],
    ['/compare/drift/', 'vs Sell With Drift'],
    ['/compare/autobook/', 'vs AutoBook.io'],
    ['/compare/glo3d/', 'vs Glo3D'],
    ['/why-facebook-marketplace-only/', 'Why Marketplace only'],
    ['/why-we-dont-answer-your-buyers/', 'Why we don’t answer your buyers'],
  ]],
  ['guides', 'Guides', [
    ['/guide/how-to-sell-cars-on-facebook-marketplace/', 'How to sell cars on Marketplace'],
    ['/guide/facebook-marketplace-automation/', 'Automation policy & safety'],
    ['/facebook-marketplace-for-car-dealers/', 'Marketplace for car dealers'],
    ['/guide/car-dealership-marketing/', 'Dealership marketing playbook'],
    ['/guide/car-sales-leads/', 'Car sales leads'],
    ['/guide/ai-for-car-dealerships/', 'AI for dealerships'],
    [AI_VISIBILITY_PATH, 'AEO and GEO for car dealers'],
    [PAID_ADS_PATH, 'Paid ads and AI commercials for car dealers'],
    [WEBSITE_PATH, 'Dealership websites with SEO and AI-search foundations'],
    ['/facebook-ai-tools/', 'Facebook AI tools for dealers'],
    ['/ai-chat-for-car-dealers/', 'AI chat for car dealers'],
    ['/guide/how-to-sell-rvs-on-facebook-marketplace/', 'How to sell RVs on Marketplace'],
    ['/facebook-marketplace-used-car-report-2026/', 'Used-Car Report 2026 (original data)'],
    ['/about/', 'About AutoLander'],
    ['/contact/', 'Contact'],
  ]],
];

// Order the article groups appear in, after the evergreen groups. The newest topic goes
// first: it is the one people are searching for this month.
// 2026-09-30: aeoGeo (AEO and GEO for car dealers) is the newest topic. Its box appears only once
// an AEO article is published, and lists the published ones in publish-number order.
export const DIRECTORY_SILO_ORDER = ['aeoGeo', 'compare', 'metaTools', 'marketplace', 'photos', 'growth'];

// Silos whose published articles belong INSIDE an evergreen group instead of a box of their
// own. The /compare/ articles are comparison pages, so they sit in the Compare box right under
// the hub link, beside the versus pages, which is where a visitor looking for a comparison
// looks. A second "comparisons" box below Guides read as a duplicate and got missed (Michael,
// 2026-09-26). Labels there are the short breadcrumb names, matching the box's "vs CARVID" style.
export const DIRECTORY_MERGE_INTO = { compare: 'compare' };

// -> [{ id, label, kind: 'pages' | 'articles', links: [{ href, text }] }]
// Draft articles are invisible here exactly as they are everywhere else; an article silo with
// nothing published yet contributes no group at all.
export function buildHomeDirectory(articles, state) {
  const groups = EVERGREEN_GROUPS.map(([id, label, links]) => ({
    id,
    label,
    kind: 'pages',
    links: links.map(([href, text]) => ({ href, text })),
  }));
  const newestPosts = articles
    .filter((article) => isBlog(article) && isPublished(state, article.slug))
    .sort((a, b) => String(state[b.slug].publishedAt || '').localeCompare(String(state[a.slug].publishedAt || ''))
      || a.slug.localeCompare(b.slug))
    .slice(0, 5);
  groups.push({
    id: 'blog',
    label: 'Blog',
    kind: 'pages',
    links: [
      { href: NAV.blog.path, text: 'The AutoLander blog' },
      ...newestPosts.map((post) => ({ href: articlePath(post), text: post.anchor })),
    ],
  });
  const orderIndex = new Map(SUGGESTED_ORDER.map((s, i) => [s, i]));
  for (const silo of DIRECTORY_SILO_ORDER) {
    if (!SILOS[silo]) throw new Error(`home-directory: unknown silo ${silo}`);
    const published = articles
      .filter((a) => a.silo === silo && isPublished(state, a.slug))
      .sort((a, b) => (orderIndex.get(a.slug) ?? 99) - (orderIndex.get(b.slug) ?? 99));
    if (!published.length) continue;
    const into = DIRECTORY_MERGE_INTO[silo];
    if (into) {
      const group = groups.find((g) => g.id === into);
      if (!group) throw new Error(`home-directory: unknown merge target ${into}`);
      group.links.splice(1, 0, ...published.map((a) => ({ href: articlePath(a), text: a.crumb })));
      continue;
    }
    const links = published.map((a) => ({ href: articlePath(a), text: a.anchor }));
    groups.push({ id: `articles-${silo}`, label: SILOS[silo].label, kind: 'articles', links });
  }
  return groups;
}

const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const countLabel = (g) => {
  const noun = g.kind === 'articles' ? 'guide' : 'page';
  return `${g.links.length} ${noun}${g.links.length === 1 ? '' : 's'}`;
};

// The static twin of what HomeDetails.jsx renders: same nesting, same classes, same text.
// Tailwind scans index.html and the JSX, so every class here is emitted in the bundle.
export function renderHomeDirectoryHtml(groups) {
  const li = (l) => `                      <li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`;
  const block = (g) => `                  <details class="group/dir rounded-xl border border-white/5 bg-white/[0.02] open:bg-white/[0.04]">
                    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-300">${esc(g.label)} <span class="font-medium normal-case tracking-normal text-slate-500">${countLabel(g)}</span></summary>
                    <nav aria-label="${esc(g.label)}" class="px-4 pb-4"><ul class="space-y-1 text-[13px] font-semibold">
${g.links.map(li).join('\n')}
                    </ul></nav>
                  </details>`;
  return `${HOME_DIRECTORY_START}
                <div class="grid gap-3 sm:grid-cols-2 items-start">
${groups.map(block).join('\n')}
                </div>
                ${HOME_DIRECTORY_END}`;
}

// Replace the marked region of index.html with a fresh render. Throws rather than silently
// leaving the homepage stale if the markers are ever removed. The render adopts the file's
// own line endings (a Windows checkout with core.autocrlf holds CRLF; CI and git hold LF), so
// the block never introduces mixed endings; extractHomeDirectory normalises them back out.
export function injectHomeDirectory(indexHtml, groups) {
  const start = indexHtml.indexOf(HOME_DIRECTORY_START);
  const end = indexHtml.indexOf(HOME_DIRECTORY_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('home-directory: AL_STATIC_HOME_DIRECTORY markers missing from index.html');
  }
  const crlf = (indexHtml.match(/\r\n/g) || []).length > (indexHtml.match(/(?<!\r)\n/g) || []).length;
  const block = crlf ? renderHomeDirectoryHtml(groups).replaceAll('\n', '\r\n') : renderHomeDirectoryHtml(groups);
  return indexHtml.slice(0, start) + block + indexHtml.slice(end + HOME_DIRECTORY_END.length);
}

// The slice of index.html between the markers, inclusive, LF-normalised — what the drift test
// compares against renderHomeDirectoryHtml().
export function extractHomeDirectory(indexHtml) {
  const start = indexHtml.indexOf(HOME_DIRECTORY_START);
  const end = indexHtml.indexOf(HOME_DIRECTORY_END);
  if (start === -1 || end === -1) return null;
  return indexHtml.slice(start, end + HOME_DIRECTORY_END.length).replaceAll('\r\n', '\n');
}

// Every href the directory can emit must be a page the site actually builds.
export const ALL_DIRECTORY_HREFS = () => {
  const evergreen = EVERGREEN_GROUPS.flatMap(([, , links]) => links.map(([href]) => href));
  return new Set([...evergreen, ...Object.values(NAV).map((n) => n.path)]);
};
