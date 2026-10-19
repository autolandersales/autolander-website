// Generates the AI-SEO comparison page cluster as STANDALONE STATIC HTML in public/compare/,
// plus public/robots.txt and public/sitemap.xml.
//
// Why static (not React routes): most AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot,
// PerplexityBot, Google-Extended) do not run JavaScript, so the SPA's content is invisible
// to them. These pages put the full content in the HTML source.
//
// Meta-ads safety: files in public/ are copied verbatim by Vite. The Meta Pixel is injected
// ONLY into the SPA index.html (vite.config.js). So these pages carry NO pixel and live under
// /compare/* (never /thank-you or a booking URL) — they cannot fire any conversion.
//
// This script is NOT wired into `npm run build`. Run it manually to (re)generate:
//   node scripts/build-compare-pages.mjs
// then commit the output. The build that injects the Pixel is left untouched.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { orgLd, ORG_ID, ogImageFor } from './seo/shell.mjs';
import { NAV } from './seo/registry.mjs';
import { AI_VISIBILITY_NAV_LABEL } from '../shared/ai-visibility-route.js';
import { PAID_ADS_NAV_LABEL } from '../shared/paid-ads-route.js';
import { WEBSITE_NAV_LABEL } from '../shared/dealer-websites-route.js';
import {
  compareHubLinks, versusPageLinks, loadPublishState,
} from './seo/articles/article-system.mjs';
import { DRIP_ARTICLES } from './seo/articles/drip-articles.mjs';
import { loadBlogPosts } from './seo/articles/blog-loader.mjs';
import {
  SITE, DIMENSIONS, AUTOLANDER, AUTOLANDER_WINS_GLOBAL, SESSION_FAQ,
  COMPETITORS, HUB, HUB_ORDER, INSIGHTS, EXTRA_FAQ, GUIDE, OTHER_TOOLS,
} from './compare-data.mjs';

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const COMPARE_DIR = resolve(PUBLIC_DIR, 'compare');
const ARTICLE_CONTENT = [...DRIP_ARTICLES, ...loadBlogPosts()];
const PUBLISH_STATE = loadPublishState();
const VERSUS_ARTICLE_LINKS = versusPageLinks(ARTICLE_CONTENT, PUBLISH_STATE);

// ---------- helpers ----------
const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const jsonld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replaceAll('<', '\\u003c')}</script>`;

const ICONS = {
  yes: '<span class="ic ic-yes" aria-label="yes">&#10003;</span>',
  no: '<span class="ic ic-no" aria-label="no">&ndash;</span>',
  mid: '<span class="ic ic-mid" aria-label="partial">&bull;</span>',
};
const cell = ([sentiment, text]) => `${ICONS[sentiment] || ''} <span>${esc(text)}</span>`;

const sessionKind = (c) => /extension/i.test(c.cells.method[1]) ? 'extension' : 'cloud';

const questionsToAsk = (c) => {
  const base = ['Where is my Facebook session stored, and which IP addresses log in to my account?'];
  if (sessionKind(c) === 'extension') {
    base.push('What browser permissions does the extension require, and does automating Facebook through a browser extension comply with Facebook’s Terms?');
  } else {
    base.push('Is posting done through an official Meta API or unofficial automation — and what happens to my account if the vendor’s servers get flagged?');
  }
  base.push('If I stop paying, do my listings and access stay, or does everything end with the subscription?');
  return base;
};

// The Organization + Person nodes are shared with the SEO silo (scripts/seo/shell.mjs) so every
// page on the site resolves AutoLander to ONE @id — that single entity is what an answer engine
// attaches reputation to. Never re-declare a local stub here.
// (imported at the top of the file)

// SoftwareApplication for the products being compared. NOTE: Google requires a genuine
// aggregateRating/review for the SoftwareApplication *rich result* — which is why none is emitted
// below and never should be until verified review data exists. The node itself is still worth
// emitting without one: it tells an answer engine these are software products in a named category
// at a stated price, which is exactly what a "X vs Y" prompt needs. Rich-result eligibility and
// entity understanding are different things.
const osForMethod = (methodText = '') => {
  const t = String(methodText).toLowerCase();
  if (t.includes('extension')) return 'Chrome';
  if (t.includes('cloud') || t.includes('web') || t.includes('saas')) return 'Web browser';
  if (t.includes('desktop')) return 'Windows, macOS, Linux';
  return null;
};

const softwareAppLd = ({ name, url, description, operatingSystem, price, inLanguage }) => ({
  '@context': 'https://schema.org', '@type': 'SoftwareApplication',
  '@id': url + '#software',
  name,
  url,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Facebook Marketplace listing software for car dealers',
  ...(operatingSystem ? { operatingSystem } : {}),
  ...(inLanguage ? { inLanguage } : {}),
  ...(description ? { description } : {}),
  ...(price ? {
    offers: {
      '@type': 'Offer', price: String(price), priceCurrency: 'USD',
      availability: 'https://schema.org/InStock', url: SITE.origin + '/#pricing',
    },
  } : {}),
});

const autolanderAppLd = () => softwareAppLd({
  name: 'AutoLander',
  url: SITE.origin + '/',
  description: 'Native desktop app that posts dealer vehicle inventory to Facebook Marketplace, '
    + 'syncs prices from the inventory feed, removes sold units and runs AI photo editing.',
  operatingSystem: 'Windows, macOS, Linux',
  inLanguage: ['en', 'es', 'fr'],
  price: SITE.lowPrice,
});

const competitorAppLd = (c) => softwareAppLd({
  name: c.name,
  url: c.url,
  // Pricing stays as the competitor's own prose — we do not convert it into a numeric Offer,
  // because a made-up price on a competitor's entity is a factual claim we cannot stand behind.
  description: `${c.oneLiner} Pricing: ${c.pricingShort}.`,
  operatingSystem: osForMethod(c.cells?.method?.[1]),
});

// What the comparison actually covers — gives a model the axes, not just the prose.
const comparisonItemListLd = (c, canonical) => ({
  '@context': 'https://schema.org', '@type': 'ItemList',
  '@id': canonical + '#comparison',
  name: `AutoLander vs ${c.name} — comparison criteria`,
  itemListElement: DIMENSIONS.map(([key, label], i) => ({
    '@type': 'ListItem', position: i + 1, name: label,
  })),
});
// author/publisher reference the shared entity by @id rather than repeating inline stubs —
// three disconnected Organization nodes on one page give an answer engine three weak signals
// instead of one strong one.
// `pillar` = {url, name} of the page this one belongs to (a head-to-head page → the /compare/ hub;
// the guide → the auto-poster category page). Emits Article.isPartOf so the silo is stated in
// schema, not just implied by breadcrumbs. The hub itself passes none — it is its own pillar.
const COMPARE_HUB_PILLAR = { url: `${SITE.origin}/compare/`, name: 'Best Facebook Marketplace auto-posting tools (2026 comparison)' };
const CATEGORY_PILLAR = { url: `${SITE.origin}/facebook-marketplace-auto-poster/`, name: 'Facebook Marketplace auto poster for car dealers' };
const articleLd = (title, canonical, pillar) => ({
  '@context': 'https://schema.org', '@type': 'Article',
  '@id': canonical + '#article',
  headline: title,
  datePublished: SITE.updated, dateModified: SITE.updated,
  author: { '@id': ORG_ID },
  publisher: { '@id': ORG_ID },
  mainEntityOfPage: canonical,
  ...(pillar && pillar.url !== canonical ? {
    isPartOf: { '@type': 'WebPage', '@id': pillar.url + '#webpage', name: pillar.name, url: pillar.url },
  } : {}),
  image: ogImageFor(new URL(canonical).pathname),
  inLanguage: 'en-US',
});
// Every compare-cluster page renders a "Short answer" box (.tldr) and a FAQ (.faq-a); both are
// self-contained answer text, which is exactly what SpeakableSpecification is for.
const webPageLd = (title, canonical, description) => ({
  '@context': 'https://schema.org', '@type': 'WebPage',
  '@id': canonical + '#webpage',
  name: title, url: canonical, description,
  isPartOf: { '@type': 'WebSite', '@id': SITE.origin + '/#website', name: 'AutoLander', url: SITE.origin + '/' },
  publisher: { '@id': ORG_ID },
  primaryImageOfPage: { '@type': 'ImageObject', url: ogImageFor(new URL(canonical).pathname), width: 1200, height: 630 },
  speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.tldr', '.faq-a'] },
  dateModified: SITE.updated,
});
const faqLd = (faq) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({
    '@type': 'Question', name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});
const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
  })),
});

const definedTermSetLd = () => ({
  '@context': 'https://schema.org', '@type': 'DefinedTermSet',
  name: 'Facebook Marketplace auto-posting tools — key terms',
  hasDefinedTerm: HUB.glossary.map(([term, def]) => ({
    '@type': 'DefinedTerm', name: term, description: def,
  })),
});

const liList = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join('\n        ');

// ---------- shared shell ----------
// ogTitle/ogDescription let a page enrich its <title>/<meta description> for SEO while keeping the
// social share preview (og:/twitter:) byte-identical. Default to title/description when not given.
function head({ title, description, canonical, jsonLdBlocks, ogTitle, ogDescription, articleMeta }) {
  const ogT = ogTitle ?? title;
  const ogD = ogDescription ?? description;
  const cardUrl = ogImageFor(new URL(canonical).pathname);
  const cardType = /\.png($|\?)/i.test(cardUrl) ? 'image/png' : 'image/jpeg';
  // Every page in this cluster is og:type=article, so article:* is always valid here. Mirrors the
  // Article node's dates and the Organization author (these pages are team-authored, not bylined).
  const m = articleMeta || {};
  const articleTags = `
  <meta property="article:author" content="${esc(SITE.origin)}/about/" />
  <meta property="article:publisher" content="${esc(SITE.origin)}/" />${m.section ? `
  <meta property="article:section" content="${esc(m.section)}" />` : ''}
  <meta property="article:published_time" content="${esc(m.published || SITE.updated)}T00:00:00Z" />
  <meta property="article:modified_time" content="${esc(m.modified || SITE.updated)}T00:00:00Z" />${(m.tags || []).map((t) => `
  <meta property="article:tag" content="${esc(t)}" />`).join('')}`;
  return `<!doctype html>
<html lang="en">
<head>
  <script defer src="/al-attribution-v1.js"></script>
  <script defer src="/al-tags-v1.js"></script>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#050505" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="alternate" type="application/rss+xml" title="AutoLander blog" href="${SITE.origin}${NAV.blog.path}feed.xml" />
  <link rel="icon" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="AutoLander" />
  <meta property="og:title" content="${esc(ogT)}" />
  <meta property="og:description" content="${esc(ogD)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(cardUrl)}" />
  <meta property="og:image:type" content="${cardType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(ogT)}" />
  <meta property="og:locale" content="en_US" />${articleTags}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(ogT)}" />
  <meta name="twitter:description" content="${esc(ogD)}" />
  <meta name="twitter:image" content="${esc(cardUrl)}" />
  <meta name="twitter:image:alt" content="${esc(ogT)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/compare/styles.css" />
  ${jsonLdBlocks.join('\n  ')}
</head>
<body>`;
}

function siteHeader(crumbActive) {
  return `  <header class="topbar">
    <a class="brand" href="${SITE.origin}/">
      <img src="/autolander-logo.png" alt="AutoLander" width="400" height="120" class="brand-logo" />
    </a>
    <nav class="topnav" aria-label="Site"><a href="${NAV.blog.path}">Blog</a><a href="${NAV.blog.path}#guides">Guides</a><a href="/#pricing">Pricing</a><details class="navdrop"><summary>Services</summary><span class="navdrop-menu"><a href="${NAV.aiVisibility.path}">${esc(AI_VISIBILITY_NAV_LABEL)}</a><a href="/team/">Team Plans</a><a href="${NAV.paidAds.path}">${esc(PAID_ADS_NAV_LABEL)}</a><a href="${NAV.dealerWebsites.path}">${esc(WEBSITE_NAV_LABEL)}</a></span></details></nav>
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="${SITE.origin}/">Home</a>
      <span>/</span>
      <a href="/compare/">Compare</a>
      <span>/</span>
      <span class="crumb-active">${esc(crumbActive)}</span>
    </nav>
  </header>
  <script>(()=>{document.addEventListener('click',event=>{document.querySelectorAll('details.navdrop[open]').forEach(menu=>{if(!menu.contains(event.target))menu.removeAttribute('open')})})})()</script>`;
}

function ctaBlock(heading, sub) {
  return `  <section class="cta">
    <h2>${esc(heading)}</h2>
    <p>${esc(sub)}</p>
    <a class="btn" href="${SITE.ctaUrl}">See plans &amp; book a demo &rarr;</a>
    <p class="cta-fine">Plans from $39/mo &bull; 5 free posts &bull; no credit card &bull; cancel anytime</p>
  </section>`;
}

function siteFooter() {
  return `  <footer class="foot">
    <a href="${SITE.origin}/" class="foot-brand"><img src="/autolander-logo.png" alt="AutoLander" width="400" height="120" class="brand-logo" /></a>
    <nav class="foot-links">
      <a href="${NAV.blog.path}">Blog</a>
      <a href="/compare/">All comparisons</a>
      <a href="/facebook-marketplace-auto-poster/">Auto poster</a>
      <a href="/facebook-marketplace-automation/">Automation</a>
      <a href="/facebook-marketplace-listing-software/">Listing software</a>
      <a href="/facebook-marketplace-for-car-dealers/">For car dealers</a>
      <a href="/guide/how-to-sell-cars-on-facebook-marketplace/">How to sell cars</a>
      <a href="${SITE.origin}/">AutoLander home</a>
      <a href="${SITE.origin}/#pricing">Pricing</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
    </nav>
    <p class="disclaimer">
      Comparison based on each provider&#39;s publicly available information as of ${esc(SITE.updatedHumanOr())}.
      Features and pricing change &mdash; verify current details on each provider&#39;s official site.
      AutoLander is not affiliated with and does not endorse these companies; all product names and
      trademarks belong to their respective owners. Figures attributed to third parties are reported
      as published and may not reflect current offerings.
    </p>
    <p class="copyright">&copy; 2026 AutoLander. Last updated ${esc(SITE.updatedHumanOr())}.</p>
  </footer>
</body>
</html>`;
}
// small convenience so the template can call a function (kept defensive)
SITE.updatedHumanOr = () => SITE.updatedHuman || SITE.updated;

// ---------- comparison table ----------
function comparisonTable(competitor) {
  const rows = DIMENSIONS.map(([key, label]) => `
        <tr>
          <th scope="row">${esc(label)}</th>
          <td class="col-al">${cell(AUTOLANDER[key])}</td>
          <td>${cell(competitor.cells[key])}</td>
        </tr>`).join('');
  return `    <div class="table-wrap">
      <table class="cmp">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col" class="col-al">AutoLander</th>
            <th scope="col">${esc(competitor.name)}</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>`;
}

// ---------- session-safety section ----------
function sessionSection(competitor) {
  const kind = sessionKind(competitor);
  const kindLabel = kind === 'extension'
    ? `${esc(competitor.name)} runs as a browser extension (it posts from your browser using your Facebook session and needs sensitive browser permissions).`
    : `${esc(competitor.name)} runs in the cloud (it operates your Facebook account from its own servers).`;
  return `    <section class="session">
      <h2>Where does your Facebook session live?</h2>
      <p>
        One of the biggest differences between these tools is <strong>where your Facebook login
        actually runs</strong>. That changes credential storage, permissions, uptime and revocation,
        but it does not determine whether Meta has approved a workflow or guarantee account safety.
      </p>
      <div class="session-grid">
        <div class="session-card session-card--al">
          <h3>AutoLander</h3>
          <p><strong>Native desktop app.</strong> Posts from your own computer through your normal
          Facebook session. Your login is never stored or operated on a shared server, and there is
          no browser extension to grant sensitive permissions to.</p>
        </div>
        <div class="session-card">
          <h3>${esc(competitor.name)}</h3>
          <p>${kindLabel}</p>
        </div>
      </div>
      <h3 class="q-title">Questions worth asking any Marketplace vendor</h3>
      <ul class="q-list">
        ${liList(questionsToAsk(competitor))}
      </ul>
      <p class="session-note">We list delivery models as published facts and do not claim that any
      architecture is automatically approved or safe. Ask for evidence of Meta permission for the
      exact workflow before connecting an account.</p>
    </section>`;
}

// ---------- head-to-head page ----------
function renderVersus(competitor) {
  const c = competitor;
  // Enriched <title>/<meta description> capture "{name} alternative / pricing / reviews" intent.
  // og*/twitter* are pinned to the ORIGINAL strings so the share preview is byte-identical.
  const ogTitle = `AutoLander vs ${c.name}: Which Is Better for Car Dealers? (2026)`;
  const ogDescription = `AutoLander vs ${c.name} for car dealers — compare Marketplace workflows, AI photos, session architecture and pricing. ${c.name}: ${c.pricingShort}. AutoLander: from $39/mo.`;
  const title = `${c.name} Alternative for Dealers (2026) | AutoLander`;
  const description = `${c.name} alternative for dealers: compare Facebook automation, AI photos, account safety `
    + 'and pricing with AutoLander. From $39/mo.';
  const canonical = `${SITE.origin}/compare/${c.slug}/`;
  // Honest "{name} reviews" FAQ — points to the comparison + third-party sources, no fabricated ratings.
  const reviewsFaq = [
    `Where can I find honest ${c.name} reviews and comparisons?`,
    `Rather than rely on a single review, compare ${c.name} against AutoLander and the other major Facebook Marketplace auto-posting tools for car dealers — on workflow depth, AI photos and video, session architecture and price — in our 2026 buyer's guide, and cross-check third-party reviews on G2, Capterra and the Chrome Web Store. ${c.name}: ${c.pricingShort}. AutoLander: from $39/mo, month-to-month, with 5 free posts.`,
  ];
  const faq = [...c.faq, EXTRA_FAQ[c.slug], reviewsFaq, SESSION_FAQ].filter(Boolean);
  const jsonLdBlocks = [
    jsonld(webPageLd(title, canonical, description)),
    jsonld(articleLd(title, canonical, COMPARE_HUB_PILLAR)),
    jsonld(autolanderAppLd()),
    jsonld(competitorAppLd(c)),
    jsonld(comparisonItemListLd(c, canonical)),
    jsonld(faqLd(faq)),
    jsonld(breadcrumbLd([
      { name: 'Home', url: SITE.origin + '/' },
      { name: 'Compare', url: SITE.origin + '/compare/' },
      { name: `AutoLander vs ${c.name}`, url: canonical },
    ])),
    jsonld(orgLd),
  ];

  const faqHtml = faq.map(([q, a]) => `
      <details class="faq-item">
        <summary>${esc(q)}</summary>
        <div class="faq-a"><p>${esc(a)}</p></div>
      </details>`).join('');

  // Full sibling mesh: every head-to-head links to every other one + the hub.
  // Strengthens the silo (crawl paths + internal authority distribution).
  const siblingLinks = Object.values(COMPETITORS)
    .filter((x) => x.slug !== c.slug)
    .map((s) => `        <li><a href="/compare/${s.slug}/">AutoLander vs ${esc(s.name)}</a></li>`)
    .join('\n');
  const articleLinks = (VERSUS_ARTICLE_LINKS.get(c.slug) || [])
    .map((link) => `        <li><a href="${esc(link.href)}">${esc(link.text)}</a></li>`)
    .join('\n');
  const appendedArticleLinks = articleLinks ? `\n${articleLinks}` : '';
  const relatedHtml = `    <nav class="related" aria-label="Related comparisons">
      <h2>Related comparisons</h2>
      <ul class="related-list">
${siblingLinks}
        <li><a href="/compare/"><strong>All Facebook Marketplace tools for dealers &rarr;</strong></a></li>
        <li><a href="/facebook-marketplace-auto-poster/">Facebook Marketplace auto poster for car dealers</a></li>
        <li><a href="/facebook-marketplace-automation/">Facebook Marketplace automation software</a></li>
        <li><a href="/guide/facebook-marketplace-automation/">Guide: the dos &amp; don&#39;ts of Marketplace automation</a></li>
        <li><a href="/guide/how-to-sell-cars-on-facebook-marketplace/">How to sell cars on Facebook Marketplace</a></li>${appendedArticleLinks}
      </ul>
    </nav>`;

  return [
    head({
      title, description, canonical, jsonLdBlocks, ogTitle, ogDescription,
      articleMeta: { section: 'Comparisons', tags: [c.name, 'Facebook Marketplace', 'car dealer software'] },
    }),
    siteHeader(`AutoLander vs ${c.name}`),
    `  <main class="wrap">
    <article>
    <p class="eyebrow">Facebook Marketplace tools for car dealers</p>
    <h1>AutoLander vs ${esc(c.name)}: which is better for car dealers?</h1>
    <p class="byline">By the <a href="${SITE.origin}/">AutoLander</a> team &middot; Updated <time datetime="${SITE.updated}">${esc(SITE.updatedHumanOr())}</time></p>
    <div class="tldr">
      <p class="tldr-label">Short answer</p>
      <p>${esc(c.verdict)}</p>
    </div>

    <p class="lede">${esc(c.name)} &mdash; ${esc(c.oneLiner)} <span class="muted">Best for: ${esc(c.bestFor)}</span></p>

    <h2>AutoLander vs ${esc(c.name)} at a glance</h2>
${comparisonTable(c)}
    <p class="legend"><span class="ic ic-yes">&#10003;</span> has it / advantage &nbsp;
      <span class="ic ic-mid">&bull;</span> partial or neutral fact &nbsp;
      <span class="ic ic-no">&ndash;</span> not advertised</p>

    <div class="two-col">
      <section class="card win">
        <h2>Where AutoLander comes out ahead</h2>
        <ul>
        ${liList(c.wins)}
        </ul>
      </section>
      <section class="card strong">
        <h2>Where ${esc(c.name)} is strong</h2>
        <ul>
        ${liList(c.strengths)}
        </ul>
      </section>
    </div>

${sessionSection(c)}

    <section class="alternative">
      <h2>Looking for a ${esc(c.name)} alternative?</h2>
      <p>If you arrived here searching for a ${esc(c.name)} alternative, here is plainly what one has to do.
      A dealer leaving ${esc(c.name)} is usually looking for one of three things: a different <strong>session architecture</strong>
      (${esc(sessionKind(c) === 'extension' ? 'a native app instead of a browser extension that needs sensitive permissions' : 'a session that stays on your own machine instead of a vendor-operated cloud login')}),
      <strong>automatic upkeep</strong> (price sync and sold-unit removal driven by the inventory feed, not
      a person), or <strong>published pricing</strong> (${esc(c.pricingShort)} versus self-serve plans from
      $${SITE.lowPrice}/mo). AutoLander is built around all three. It is <em>not</em> the right alternative if you
      need multi-platform syndication or an inbox auto-reply &mdash; we do neither, on purpose:
      <a href="/why-facebook-marketplace-only/">why Marketplace only</a> &middot;
      <a href="/why-we-dont-answer-your-buyers/">why we don&#39;t answer your buyers</a>.
      The full field is on the <a href="/compare/">best Marketplace posting tools</a> page.</p>
    </section>

    <section class="take">
      <h2>Our take</h2>
      <p>${esc(INSIGHTS[c.slug] || '')}</p>
    </section>

    <section class="verdict">
      <h2>The verdict</h2>
      <p>${esc(c.verdict)}</p>
    </section>

    <section class="faq">
      <h2>AutoLander vs ${esc(c.name)} &mdash; FAQ</h2>${faqHtml}
    </section>
`,
    ctaBlock('Ready to own Facebook Marketplace?', `See how AutoLander compares to ${c.name} on your own inventory.`),
    `${relatedHtml}
    </article>
  </main>`,
    siteFooter(),
  ].join('\n');
}

// ---------- hub page ----------
function renderHub() {
  const title = HUB.title;
  const canonical = `${SITE.origin}/compare/`;
  // "auto poster reviews" intent — disclosed-bias buyer's guide framing, points to third-party reviews.
  const reviewsFaq = [
    'Are these Facebook Marketplace auto poster reviews independent?',
    "This is a vendor comparison published by AutoLander, so we have a point of view — but every competitor fact is taken from that provider's public information and each tool's genuine strengths are listed. Use it alongside third-party reviews on G2, Capterra and the Chrome Web Store to form your own view.",
  ];
  const faq = [...HUB.faq, reviewsFaq, SESSION_FAQ];
  const ranked = [
    { name: 'AutoLander', slug: '', url: SITE.origin + '/', isAL: true,
      oneLiner: 'Native desktop workflow with inventory sync, AI Photo Studio, walkaround video, sold-unit reconciliation and post-to-sale attribution, from $39/mo.',
      bestFor: 'Dealers and reps comparing feed sync, AI creative, attribution, a native desktop architecture and published self-serve pricing.',
      pricingShort: 'From $39/mo' },
    ...HUB_ORDER.map((slug) => COMPETITORS[slug]),
  ];

  // The ItemList is the complete field: the ranked tools (with URLs) followed by the
  // not-yet-reviewed ones (name only — no URL, because none has been verified).
  const itemListLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: HUB.title,
    numberOfItems: ranked.length + OTHER_TOOLS.length,
    itemListElement: [
      ...ranked.map((t, i) => ({
        '@type': 'ListItem', position: i + 1, name: t.name,
        url: t.isAL ? SITE.origin + '/' : `${SITE.origin}/compare/${t.slug}/`,
      })),
      ...OTHER_TOOLS.map((t, i) => ({
        '@type': 'ListItem', position: ranked.length + i + 1, name: t.name,
      })),
    ],
  };
  const jsonLdBlocks = [
    jsonld(webPageLd(HUB.title, canonical, HUB.metaDescription)),
    jsonld(articleLd(HUB.title, canonical)),
    jsonld(itemListLd),
    jsonld(definedTermSetLd()),
    // SoftwareApplication is intentionally omitted until genuine review or aggregate-rating data exists.
    jsonld(faqLd(faq)),
    jsonld(breadcrumbLd([
      { name: 'Home', url: SITE.origin + '/' },
      { name: 'Compare', url: canonical },
    ])),
    jsonld(orgLd),
  ];

  const cards = ranked.map((t, i) => {
    const rank = i + 1;
    const link = t.isAL ? `${SITE.origin}/` : `/compare/${t.slug}/`;
    const cta = t.isAL
      ? `<a class="card-cta" href="${SITE.ctaUrl}">See AutoLander plans &rarr;</a>`
      : `<a class="card-cta" href="/compare/${t.slug}/">AutoLander vs ${esc(t.name)} &rarr;</a>`;
    return `      <article class="rank-card${t.isAL ? ' rank-card--al' : ''}">
        <div class="rank-no">#${rank}${t.isAL ? ' <span class="rank-best">Best overall</span>' : ''}</div>
        <h3>${t.isAL ? '' : `<a href="${esc(link)}">`}${esc(t.name)}${t.isAL ? '' : '</a>'}</h3>
        <p class="rank-one">${esc(t.oneLiner)}</p>
        <p class="rank-meta"><strong>Best for:</strong> ${esc(t.bestFor)}</p>
        <p class="rank-meta"><strong>Pricing:</strong> ${esc(t.pricingShort)}</p>
        ${cta}
      </article>`;
  }).join('\n');

  // at-a-glance matrix: key rows × all tools
  const glanceKeys = ['method', 'session', 'photoStudio', 'video', 'soldRemoval', 'attribution', 'entry'];
  const glanceHead = ['', 'AutoLander', ...HUB_ORDER.map((s) => COMPETITORS[s].name)]
    .map((n, i) => `<th scope="col"${i === 1 ? ' class="col-al"' : ''}>${esc(n)}</th>`).join('');
  const glanceRows = glanceKeys.map((key) => {
    const label = DIMENSIONS.find(([k]) => k === key)[1];
    const cells = [`<th scope="row">${esc(label)}</th>`,
      `<td class="col-al">${cell(AUTOLANDER[key])}</td>`,
      ...HUB_ORDER.map((s) => `<td>${cell(COMPETITORS[s].cells[key])}</td>`)];
    return `        <tr>${cells.join('')}</tr>`;
  }).join('\n');

  const faqHtml = faq.map(([q, a]) => `
      <details class="faq-item">
        <summary>${esc(q)}</summary>
        <div class="faq-a"><p>${esc(a)}</p></div>
      </details>`).join('');

  const deeperLinks = compareHubLinks(ARTICLE_CONTENT, PUBLISH_STATE);
  const deeperComparisonsHtml = deeperLinks.length ? `

    <section class="card">
      <h2>AI agents and alternatives: the deeper comparisons</h2>
      <p>Head-to-head guides on Meta Muse, Marketplace auto-reply and the other tools dealers are weighing this year.</p>
      <ul>
${deeperLinks.map((link) => `        <li><a href="${esc(link.href)}">${esc(link.text)}</a><br />${esc(link.description)}</li>`).join('\n')}
      </ul>
    </section>` : '';

  return [
    head({
      title, description: HUB.metaDescription, canonical, jsonLdBlocks,
      articleMeta: { section: 'Comparisons', tags: ['Facebook Marketplace', 'auto poster', 'car dealer software', 'buyer’s guide'] },
    }),
    siteHeader('Best Marketplace tools'),
    `  <main class="wrap">
    <article>
    <p class="eyebrow">2026 buyer&#39;s guide</p>
    <h1>${esc(HUB.title)}</h1>
    <p class="byline">By the <a href="${SITE.origin}/">AutoLander</a> team &middot; Updated <time datetime="${SITE.updated}">${esc(SITE.updatedHumanOr())}</time></p>
    <div class="tldr">
      <p class="tldr-label">Short answer</p>
      <p>${esc(HUB.tldr)}</p>
    </div>

    <section class="take">
      <h2>Our take</h2>
      <p>${esc(INSIGHTS.hub)}</p>
    </section>

    <section class="context">
      <h2>What a Facebook Marketplace auto-posting tool does</h2>
      ${HUB.context.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
    </section>

    <section class="context">
      <h2>Car dealership marketing software vs. Marketplace posting tools</h2>
      <p>Car dealership marketing software is a broad category: CRM follow-up, paid media, website conversion, inventory merchandising and attribution may all be included. A Facebook Marketplace posting tool is narrower. It prepares vehicle listings, keeps inventory accurate and helps the sales team turn local Marketplace conversations into appointments.</p>
      <p>Used-car dealership marketing software often prioritizes inventory turn and aged-unit visibility, while new-car dealership marketing software may emphasize OEM programs, co-op rules and campaign management. AutoLander is not a replacement for a full CRM or ad platform; it is the Marketplace execution layer. See the <a href="/facebook-marketplace-for-car-dealers/">dealer workflow</a> and <a href="/facebook-marketplace-auto-poster/">auto-poster overview</a> before comparing vendors.</p>
    </section>

    <section class="context" id="extension-vs-desktop">
      <h2>Chrome extension or desktop app: the question under the question</h2>
      <p>"Where does the session run" is the right first question, and it rules out the cloud category for most dealers. But two tools can both run on your computer, in your own Facebook session, on your own IP address, and still behave completely differently. The second question is how the tool drives that session.</p>
      <p><strong>A Chrome extension</strong> lives inside the browser you already use. Its content script fills the listing form by writing into the page and firing synthetic events. Every one of those events reaches Facebook with <code>isTrusted: false</code>, because only the browser's own input pipeline can produce a trusted event, and an extension has no route to that pipeline short of the debugger API, which puts an automation banner on the window. So the page can tell an extension-driven form from a typed one on every keystroke. The extension also lives under Manifest V3 rules: its background worker is suspended after about thirty seconds idle, and Chrome throttles timers in any tab that is not in front, so pacing a lot of cars across an afternoon means leaving that tab open and untouched. It shares one browser profile with every other extension and cookie on that machine, and when Facebook changes the form, the fix waits on Chrome Web Store review.</p>
      <p><strong>A purpose-built desktop app</strong> can do the opposite, and AutoLander does. It launches its own dedicated browser profile, separate from the rep's everyday browsing, and drives it through the same input pipeline the operating system uses, so what Facebook receives are trusted keystrokes and clicks with a humanized cadence: variable typing speed, wheel scrolls, pauses, and a cooldown after each publish. The app owns the process, so pacing is real whether or not anyone is looking at the window. The profile persists, which is why an antibot challenge is solved once and stays solved. And when Facebook moves a field, every dropdown selection is read back and verified against its label before the post continues, and the fix ships from us within hours, with no store review in the loop.</p>
      <p>None of this is Meta permission, and no architecture cancels out bad pacing on a fresh account. But when a vendor says its tool posts "the same way a rep would," the technical questions are short: are the input events trusted, does the tool own its own browser profile, and who controls the update cadence? A desktop app that is really the extension in a wrapper inherits every constraint above. Ask, and ask them to show you.</p>
    </section>

    <p class="guidelink">New to Marketplace? Start with <a href="/guide/how-to-sell-cars-on-facebook-marketplace/">the practical dealer selling guide</a>, then read the <a href="/guide/facebook-marketplace-automation/">automation policy and safety guide &rarr;</a></p>

    <h2>The ranking</h2>
    <div class="ranks">
${cards}
    </div>

    <h2>At a glance</h2>
    <div class="table-wrap">
      <table class="cmp glance">
        <thead><tr>${glanceHead}</tr></thead>
        <tbody>
${glanceRows}
        </tbody>
      </table>
    </div>
    <p class="legend"><span class="ic ic-yes">&#10003;</span> has it / advantage &nbsp;
      <span class="ic ic-mid">&bull;</span> partial or neutral fact &nbsp;
      <span class="ic ic-no">&ndash;</span> not advertised</p>${deeperComparisonsHtml}

    <section class="card others">
      <h2>Other tools dealers ask about</h2>
      <p>These names come up in category searches and AI answers for Marketplace posting tools but have not
      been reviewed head-to-head above. They are listed so this page is the complete field, not a curated
      subset; nothing about their features or pricing is asserted here &mdash; verify each directly. A tool
      moves into the ranking once it has been evaluated on the same criteria.</p>
      <ul>
${OTHER_TOOLS.map((t) => `        <li><strong>${esc(t.name)}</strong> &mdash; ${esc(t.note)}</li>`).join('\n')}
      </ul>
    </section>

    <figure class="shot">
      <div class="shot-imgs">
        <img src="/preview/studio-before.webp" width="1100" height="733" loading="lazy" decoding="async"
          alt="Raw dealer lot photo of a vehicle before AutoLander AI Photo Studio replaces the background" />
        <img src="/preview/studio-after.webp" width="1100" height="733" loading="lazy" decoding="async"
          alt="The same vehicle after AutoLander AI Photo Studio replaced the lot background with a showroom backdrop" />
      </div>
      <figcaption>AutoLander&#39;s AI Photo Studio: a raw lot photo (left) versus the same car on a showroom backdrop (right) — one of the clearest differences versus extension and cloud posters.</figcaption>
    </figure>

    <section class="card">
      <h2>How we evaluated</h2>
      <ul>
        ${liList(HUB.criteria)}
      </ul>
    </section>

    <section class="session">
      <h2>Where does your Facebook session live?</h2>
      <p>Architecture affects <strong>credential handling, permissions, uptime and control</strong>, but it does
      not decide whether a workflow is approved. Ask what accesses the account, where the session is stored,
      how access is revoked and which Meta permission the vendor relies on.</p>
      <div class="session-grid session-grid--3">
        <div class="session-card session-card--al"><h3>Native app</h3><p><strong>AutoLander.</strong>
          Runs from your own computer through your normal session; the computer must stay on.</p></div>
        <div class="session-card"><h3>Browser extension</h3><p>AutoBook.io, Shiftly, CARVID. Runs in your
          browser with sensitive permissions.</p></div>
        <div class="session-card"><h3>Cloud-operated</h3><p>Sell With Drift, RelayAuto,
          Glo3D. Run account workflows from vendor-operated servers; any published safety rate is a vendor claim, not Meta approval.</p></div>
      </div>
      <p class="session-note">We list delivery models as published facts, not accusations. Ask any
      vendor where your session is stored and how it logs in.</p>
    </section>

    <section class="glossary">
      <h2>Key terms, explained</h2>
      <dl>
        ${HUB.glossary.map(([t, d]) => `<dt>${esc(t)}</dt>\n        <dd>${esc(d)}</dd>`).join('\n        ')}
      </dl>
    </section>

    <section class="faq">
      <h2>Frequently asked questions</h2>${faqHtml}
    </section>
`,
    ctaBlock('Compare AutoLander on your own inventory', 'Automatic posting, studio-grade photos and published pricing from $39/mo.'),
    `    </article>
  </main>`,
    siteFooter(),
  ].join('\n');
}

// ---------- guide (educational pillar) ----------
// Original, on-brand SVG diagram (neutral palette — the text carries the trade-offs, not
// color-coding, to keep it fair). Inline so the <text> is crawlable.
const SESSION_DIAGRAM = `<svg viewBox="0 0 960 400" role="img" aria-labelledby="ddt ddd" xmlns="http://www.w3.org/2000/svg" class="diagram-svg">
  <title id="ddt">Where your Facebook session runs: browser extension vs cloud tool vs native desktop app</title>
  <desc id="ddd">A browser extension runs in your own browser on your own IP. A cloud tool runs on the vendor's servers and logs in from datacenter IPs. A native desktop app runs on your own computer and your own IP.</desc>
  <rect x="350" y="14" width="260" height="50" rx="12" fill="#0e1117" stroke="#3b82f6" stroke-opacity="0.55"/>
  <text x="480" y="45" text-anchor="middle" fill="#e2e8f0" font-family="Inter,sans-serif" font-size="16" font-weight="700">Your Facebook account</text>
  <path d="M480 64 L480 86 M150 86 L810 86 M150 86 L150 110 M480 86 L480 110 M810 86 L810 110" stroke="#ffffff" stroke-opacity="0.18" fill="none"/>
  ${[
    { cx: 150, t: 'Browser extension', run: 'Your browser', ip: 'Your IP', w: ['Broad browser permissions;', 'UI changes can break workflows'] },
    { cx: 480, t: 'Cloud tool', run: "The vendor's servers", ip: 'Vendor infrastructure', w: ['Session lives on their infra;', 'third-party access dependency'] },
    { cx: 810, t: 'Native desktop app', run: 'Your computer', ip: 'Your IP', w: ['Your PC must stay on;', 'still automation, not approval'] },
  ].map((c) => {
    const x = c.cx - 140; const tx = x + 22;
    return `<g>
    <rect x="${x}" y="110" width="280" height="262" rx="14" fill="#0d0f14" stroke="#ffffff" stroke-opacity="0.10"/>
    <text x="${tx}" y="146" fill="#ffffff" font-family="Inter,sans-serif" font-size="17" font-weight="800">${c.t}</text>
    <line x1="${tx}" y1="160" x2="${x + 258}" y2="160" stroke="#ffffff" stroke-opacity="0.08"/>
    <text x="${tx}" y="192" fill="#60a5fa" font-family="Inter,sans-serif" font-size="11" font-weight="700" letter-spacing="1">RUNS IN</text>
    <text x="${tx}" y="214" fill="#e2e8f0" font-family="Inter,sans-serif" font-size="15">${c.run}</text>
    <text x="${tx}" y="250" fill="#60a5fa" font-family="Inter,sans-serif" font-size="11" font-weight="700" letter-spacing="1">LOGS IN FROM</text>
    <text x="${tx}" y="272" fill="#e2e8f0" font-family="Inter,sans-serif" font-size="15">${c.ip}</text>
    <text x="${tx}" y="308" fill="#60a5fa" font-family="Inter,sans-serif" font-size="11" font-weight="700" letter-spacing="1">WATCH-OUTS</text>
    <text x="${tx}" y="330" fill="#94a3b8" font-family="Inter,sans-serif" font-size="13">${c.w[0]}</text>
    <text x="${tx}" y="349" fill="#94a3b8" font-family="Inter,sans-serif" font-size="13">${c.w[1]}</text>
  </g>`;
  }).join('\n  ')}
</svg>`;

function compareClusterLinks() {
  const spokes = Object.values(COMPETITORS)
    .map((s) => `        <li><a href="/compare/${s.slug}/">AutoLander vs ${esc(s.name)}</a></li>`)
    .join('\n');
  return `      <ul class="related-list">
        <li><a href="/compare/"><strong>Best Facebook Marketplace tools for dealers (the full comparison) &rarr;</strong></a></li>
        <li><a href="/guide/how-to-sell-cars-on-facebook-marketplace/">How to sell cars on Facebook Marketplace</a></li>
        <li><a href="/facebook-marketplace-auto-poster/">Facebook Marketplace auto poster for car dealers</a></li>
        <li><a href="/facebook-marketplace-automation/">Facebook Marketplace automation software</a></li>
${spokes}
      </ul>`;
}

function renderGuide() {
  const canonical = `${SITE.origin}/${GUIDE.path}/`;
  const faq = [...GUIDE.faq, SESSION_FAQ];
  const jsonLdBlocks = [
    jsonld(webPageLd(GUIDE.title, canonical, GUIDE.metaDescription)),
    jsonld(articleLd(GUIDE.title, canonical, CATEGORY_PILLAR)),
    jsonld(faqLd(faq)),
    jsonld(breadcrumbLd([
      { name: 'Home', url: SITE.origin + '/' },
      { name: 'Facebook Marketplace automation guide', url: canonical },
    ])),
    jsonld(orgLd),
    // SoftwareApplication is intentionally omitted until genuine review or aggregate-rating data exists.
  ];

  const faqHtml = faq.map(([q, a]) => `
      <details class="faq-item">
        <summary>${esc(q)}</summary>
        <div class="faq-a"><p>${esc(a)}</p></div>
      </details>`).join('');

  return [
    head({
      title: GUIDE.title, description: GUIDE.metaDescription, canonical, jsonLdBlocks,
      articleMeta: { section: 'Facebook Marketplace auto posting', tags: ['Facebook Marketplace', 'automation', 'Meta policy', 'account safety'] },
    }),
    `  <header class="topbar">
    <a class="brand" href="${SITE.origin}/"><img src="/autolander-logo.png" alt="AutoLander" width="400" height="120" class="brand-logo" /></a>
    <nav class="topnav" aria-label="Site"><a href="${NAV.blog.path}">Blog</a><a href="${NAV.blog.path}#guides">Guides</a><a href="/#pricing">Pricing</a><details class="navdrop"><summary>Services</summary><span class="navdrop-menu"><a href="${NAV.aiVisibility.path}">${esc(AI_VISIBILITY_NAV_LABEL)}</a><a href="/team/">Team Plans</a><a href="${NAV.paidAds.path}">${esc(PAID_ADS_NAV_LABEL)}</a><a href="${NAV.dealerWebsites.path}">${esc(WEBSITE_NAV_LABEL)}</a></span></details></nav>
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="${SITE.origin}/">Home</a><span>/</span><span>Guide</span><span>/</span>
      <span class="crumb-active">Facebook Marketplace automation</span>
    </nav>
  </header>
  <script>(()=>{document.addEventListener('click',event=>{document.querySelectorAll('details.navdrop[open]').forEach(menu=>{if(!menu.contains(event.target))menu.removeAttribute('open')})})})()</script>`,
    `  <main class="wrap">
    <article>
    <p class="eyebrow">Dealer guide</p>
    <h1>Facebook Marketplace automation policy and safety guide for car dealers</h1>
    <p class="byline">By the <a href="${SITE.origin}/">AutoLander</a> team &middot; Updated <time datetime="${SITE.updated}">${esc(SITE.updatedHumanOr())}</time></p>
    <div class="tldr"><p class="tldr-label">In short</p><p>${esc(GUIDE.summary)}</p></div>

    <p class="prose">Facebook Marketplace can put dealership inventory in front of local shoppers, which is why posting tools are attractive. The first comparison should not be a feature grid, though. It should be policy, permission, credential handling and what happens if Marketplace access changes.</p>

    <h2>Facebook Marketplace automation policy: what Meta says</h2>
    <p class="prose">Meta&rsquo;s current <a href="https://www.facebook.com/legal/terms">Terms of Service</a> prohibit accessing or collecting data through automated means without prior permission. Marketplace also has account and category rules: Meta&rsquo;s Help Center currently documents <a href="https://www.facebook.com/help/811082570742714">monthly listing limits</a>, including five new listings in Vehicles and 20 total new Marketplace listings.</p>
    <p class="prose">Business options are not static either. Meta says <a href="https://www.facebook.com/help/1968285150185577">Marketplace is intended for consumers and businesses that list may be blocked or have listings removed</a>. It also <a href="https://www.facebook.com/help/326913291370580">discontinued vehicle listings from business Pages</a> in major markets in 2023. A dealer should verify permission, current products and account eligibility instead of relying on an old workflow or a vendor&rsquo;s broad &ldquo;Meta-approved&rdquo; claim.</p>

    <h2>Facebook Marketplace API, bot and n8n reality</h2>
    <p class="prose">Do not assume there is a general public Facebook Marketplace API that permits bulk vehicle posting through a personal profile. A vendor claiming an official API should be able to name the exact Meta product, permission and eligible account type. &ldquo;API integration&rdquo; can also describe the inventory-feed side of a product, not permission to automate Marketplace itself.</p>
    <p class="prose">Workflow tools such as n8n can coordinate approved work around inventory, CRM records or lead notifications, but they do not create permission to automate Marketplace, bypass a listing limit or operate a personal profile. The same applies to a bot, browser extension, cloud service or desktop app: architecture changes where the work runs; it does not rewrite Meta&rsquo;s rules. See the practical <a href="/guide/how-to-sell-cars-on-facebook-marketplace/">guide to selling cars on Facebook Marketplace</a> for the manual listing and follow-up workflow.</p>

    <h2>The four ways people do it (and the honest trade-offs)</h2>
    <ol class="prose ways">
      <li><strong>Manual posting.</strong> No posting software touches the account, so it has the lowest automation risk. It still requires accurate listings, current eligibility and compliance with the limits shown for the account, and it becomes labor-intensive as inventory grows.</li>
      <li><strong>Browser extensions</strong> (e.g. tools like <a href="/compare/autobook/">AutoBook</a>, <a href="/compare/shiftly/">Shiftly&rsquo;s Auto Lister</a>, <a href="/compare/autolisterpro/">AutoLister Pro</a>). They operate inside the logged-in browser. <em>Trade-off:</em> quick setup and a local session, but broad browser permissions, dependence on Facebook&rsquo;s interface and automation that still needs a policy basis.</li>
      <li><strong>Cloud / SaaS tools</strong> (e.g. tools like <a href="/compare/drift/">Sell With Drift</a>, <a href="/compare/relayauto/">RelayAuto</a>, <a href="/compare/carvid/">CARVID</a>). Vendor infrastructure performs the work without the dealer computer staying on. <em>Trade-off:</em> convenient dashboards and continuous operation, but the vendor controls session storage, access security and availability.</li>
      <li><strong>Native desktop apps.</strong> They operate from the dealer&rsquo;s own machine and session. <em>Trade-off:</em> the session stays local, but the computer must remain on and the workflow is still automation. A local session is an architectural choice, not Meta approval.</li>
    </ol>

    <figure class="diagram">
      ${SESSION_DIAGRAM}
      <figcaption>The real dividing line between these tools is <strong>where your Facebook session runs</strong> &mdash; and which IP addresses log in to your account.</figcaption>
    </figure>

    <h2>What can put a Marketplace account at risk</h2>
    <p class="prose">Meta does not publish a complete enforcement formula. Practical risks include:</p>
    <ul class="prose">
      <li>Unauthorized automated access or a workflow without the required permission</li>
      <li>Exceeding the listing limits or eligibility shown for the account</li>
      <li>Duplicate, misleading, prohibited or spam-like listings</li>
      <li>Unusual security events, shared credentials or insecure session storage</li>
    </ul>
    <p class="prose">And the risk people underestimate most: <strong>the profile that runs your Marketplace automation is often the same personal profile that admins your Business Manager and ad accounts.</strong> If that profile gets restricted, you can lose Marketplace and jeopardize your paid ads at the same time. That cascade is the real worst case &mdash; protect that profile accordingly.</p>

    <div class="dodont">
      <section class="card win">
        <h2>The DOs</h2>
        <ul>
          <li><strong>Know the rules first.</strong> Read Meta&rsquo;s Terms, Commerce Policies and the current Marketplace help shown for the account.</li>
          <li><strong>Confirm eligibility and limits.</strong> Software cannot create a vehicle category or posting permission the account does not have.</li>
          <li><strong>Protect credentials.</strong> Ask who can access the session, where it is stored and how access is revoked.</li>
          <li><strong>Stay accurate.</strong> Real descriptions, correct prices, and remove sold units promptly.</li>
          <li><strong>Interrogate the vendor</strong> (see the questions below).</li>
          <li><strong>Diversify.</strong> Don&rsquo;t bet your whole lead flow on one channel you don&rsquo;t control.</li>
        </ul>
      </section>
      <section class="card dont">
        <h2>The DON&rsquo;Ts</h2>
        <ul>
          <li><strong>Don&rsquo;t pick on price alone.</strong> Compare permissions, data handling, support and the actual inventory workflow.</li>
          <li><strong>Don&rsquo;t assume &ldquo;cloud = safer&rdquo; or &ldquo;extension = safer.&rdquo;</strong> It depends on the architecture.</li>
          <li><strong>Don&rsquo;t hand your main credentials to a black box.</strong> No straight answer on where your login is stored? That&rsquo;s your answer.</li>
          <li><strong>Don&rsquo;t treat pacing as permission.</strong> Slower automation is still automation and remains subject to Meta&rsquo;s terms.</li>
          <li><strong>Don&rsquo;t spam.</strong> Duplicate listings, rapid re-posts and bot-sounding copy are what Meta&rsquo;s systems are built to catch.</li>
        </ul>
      </section>
    </div>

    <figure class="shot">
      <div class="shot-imgs">
        <img src="/preview/studio-before.webp" width="1100" height="733" loading="lazy" decoding="async"
          alt="A raw, cluttered dealer lot photo of a vehicle before cleanup" />
        <img src="/preview/studio-after.webp" width="1100" height="733" loading="lazy" decoding="async"
          alt="The same vehicle on a clean showroom backdrop — the kind of accurate, professional listing that performs and stays compliant" />
      </div>
      <figcaption>&ldquo;Stay accurate&rdquo; in practice: clean, honest, professional listings (right) age better with buyers and Meta than messy or misleading ones.</figcaption>
    </figure>

    <section class="qbox">
      <h2>Five questions to ask any vendor before you connect your inventory</h2>
      <ol>
        <li>Where is my Facebook session stored, and what IP addresses log into my account?</li>
        <li>Is posting done through an official Meta API, or unofficial automation of a profile?</li>
        <li>What happens to my account if your servers get flagged?</li>
        <li>Do you store my password, and how?</li>
        <li>If I cancel, do my listings and access stay, or vanish?</li>
      </ol>
      <p class="qnote">A vendor that answers these plainly is one you can trust. A vendor that gets cagey just told you everything you need to know.</p>
    </section>

    <h2>The fair bottom line</h2>
    <p class="prose">There is no risk-free way to automate a personal Facebook profile. Start with the current Meta rules and products available to the account, then compare each tool&rsquo;s permissions, credential handling, session location, controls and support. Pick based on <strong>what the workflow is authorized to do and how much you trust the vendor with the account</strong>, not the feature grid alone.</p>

    <section class="take">
      <h2>Where we land (full disclosure)</h2>
      <p>We build AutoLander, which is a native desktop app &mdash; so we have a point of view, and you should weigh it accordingly. We chose the native-app route specifically so a dealer&rsquo;s Facebook session stays on their own machine instead of a shared cloud server. But we tried to keep this guide fair, and we put a side-by-side comparison of every option &mdash; including the cloud and extension tools, with each one&rsquo;s real strengths &mdash; together so you can judge for yourself: <a href="/compare/">the full Facebook Marketplace tools comparison &rarr;</a></p>
    </section>

    <section class="faq">
      <h2>Frequently asked questions</h2>${faqHtml}
    </section>
`,
    ctaBlock('Want the native-app approach?', 'See how AutoLander keeps your Facebook session on your own machine — with studio-grade photos and post-to-sale attribution.'),
    `    <nav class="related" aria-label="Related reading">
      <h2>Keep reading</h2>
${compareClusterLinks()}
    </nav>
    </article>
  </main>`,
    siteFooter(),
  ].join('\n');
}

// ---------- stylesheet ----------
const STYLES = `:root{color-scheme:dark;--bg:#050505;--panel:rgba(255,255,255,.03);--panel2:rgba(255,255,255,.05);
--line:rgba(255,255,255,.08);--text:#e2e8f0;--muted:#94a3b8;--dim:#64748b;--blue:#3b82f6;--blue2:#60a5fa;--ink:#fff}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);
font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--blue2);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:880px;margin:0 auto;padding:24px 22px 72px}
h1{font-size:clamp(30px,5vw,46px);line-height:1.08;letter-spacing:-.03em;margin:18px 0 18px;color:var(--ink);font-weight:900}
h2{font-size:clamp(21px,3.2vw,28px);margin:42px 0 14px;color:var(--ink);font-weight:800;letter-spacing:-.02em}
h3{font-size:17px;margin:0 0 8px;color:var(--ink);font-weight:700}
p{color:var(--text)}.muted{color:var(--muted)}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--blue2);margin:0}
.topbar{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:12px 20px;
max-width:880px;margin:0 auto;padding:18px 22px;border-bottom:1px solid var(--line)}
.brand{display:inline-flex;align-items:center}
.brand:hover{text-decoration:none}
.brand-logo{height:30px;width:auto;display:block}
.topnav{display:flex;align-items:center;gap:14px;white-space:nowrap}
.topnav a{color:var(--text);font-size:13px;font-weight:700}
.navdrop{position:relative;color:var(--text);font-size:13px;font-weight:700}
.navdrop summary{cursor:pointer;list-style:none}.navdrop summary::-webkit-details-marker{display:none}
.navdrop summary::after{content:"+";margin-left:5px;color:var(--blue2)}.navdrop[open] summary::after{content:"\\2212"}
.navdrop-menu{position:absolute;z-index:20;right:0;top:calc(100% + 10px);display:grid;width:150px;gap:2px;padding:7px;border:1px solid var(--line);border-radius:14px;background:rgba(5,5,5,.94);box-shadow:0 18px 45px rgba(0,0,0,.5)}
.navdrop-menu a{display:block;padding:7px 9px;border-radius:9px;color:var(--text);font-size:13px}.navdrop-menu a:hover{background:rgba(255,255,255,.08);text-decoration:none}
.foot-brand{display:inline-block;margin-bottom:16px}
.foot-brand .brand-logo{height:34px}
.crumbs{min-width:0;justify-self:end;font-size:13px;color:var(--dim);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.crumbs a{color:var(--muted)}.crumb-active{color:var(--text)}
.lede{font-size:16px;color:var(--muted);margin:6px 0 8px}
.tldr{background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(79,70,229,.06));
border:1px solid rgba(59,130,246,.28);border-radius:18px;padding:20px 22px;margin:8px 0 8px}
.tldr-label{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue2);margin:0 0 6px}
.tldr p:last-child{margin:0;font-size:17px;color:#f1f5f9}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:16px;margin:8px 0}
table.cmp{border-collapse:collapse;width:100%;min-width:520px;font-size:14.5px}
table.cmp th,table.cmp td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
table.cmp thead th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800;background:rgba(255,255,255,.02)}
table.cmp tbody th{color:#fff;font-weight:600;width:34%}
table.cmp .col-al{background:rgba(59,130,246,.07)}
table.cmp thead .col-al{color:var(--blue2)}
table.glance{min-width:760px;font-size:13.5px}
table.glance tbody th{width:auto}
.ic{display:inline-block;width:18px;text-align:center;font-weight:900}
.ic-yes{color:var(--blue)}.ic-no{color:var(--dim)}.ic-mid{color:#f59e0b}
.legend{font-size:12.5px;color:var(--dim);margin:8px 2px 0}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px}
.card h2{margin-top:0;font-size:19px}
.card ul{margin:0;padding-left:18px}.card li{margin:0 0 9px}
.win{border-color:rgba(59,130,246,.3);background:rgba(59,130,246,.06)}
.session{margin-top:34px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}
.session>p{color:var(--muted)}
.session-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
.session-grid--3{grid-template-columns:1fr 1fr 1fr}
.session-card{background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:14px;padding:16px}
.session-card p{margin:0;font-size:14px;color:var(--muted)}
.session-card--al{border-color:rgba(59,130,246,.4);background:rgba(59,130,246,.08)}
.session-card--al p{color:#e6eefc}
.q-title{margin-top:14px}
.q-list{margin:6px 0 0;padding-left:18px;color:var(--text)}.q-list li{margin:0 0 8px}
.session-note{font-size:13px;color:var(--dim);margin:14px 0 0;font-style:italic}
.verdict{margin-top:30px;border-left:3px solid var(--blue);padding:4px 0 4px 18px}
.verdict h2{margin-top:0}
.byline{font-size:13px;color:var(--dim);margin:0 0 16px}
.byline a{color:var(--muted)}
.take{margin-top:30px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25);border-radius:16px;padding:18px 22px}
.take h2{margin-top:0;font-size:19px}
.take p{margin:0;color:#eef2f8}
.shot{margin:18px 0 8px}
.shot-imgs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.shot-imgs img{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);display:block}
.shot figcaption{font-size:12.5px;color:var(--dim);margin-top:8px;text-align:center}
@media(max-width:520px){.shot-imgs{grid-template-columns:1fr}}
.faq{margin-top:14px}
.faq-item{border:1px solid var(--line);border-radius:14px;padding:4px 18px;margin:10px 0;background:var(--panel)}
.faq-item summary{cursor:pointer;font-weight:700;color:#fff;padding:12px 0;list-style:none}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::before{content:"+";color:var(--blue2);font-weight:900;margin-right:10px}
.faq-item[open] summary::before{content:"\\2212"}
.faq-a{padding:0 0 12px}.faq-a p{margin:0;color:var(--muted);font-size:14.5px}
.ranks{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.rank-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column}
.rank-card--al{border-color:rgba(59,130,246,.45);background:rgba(59,130,246,.08);grid-column:1/-1}
.rank-no{font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--dim);text-transform:uppercase}
.rank-best{color:#fff;background:var(--blue);border-radius:999px;padding:2px 9px;margin-left:6px;font-size:10px}
.rank-card h3{font-size:20px;margin:6px 0 8px}
.rank-one{margin:0 0 8px;font-size:14.5px;color:var(--text)}
.rank-meta{margin:0 0 4px;font-size:13px;color:var(--muted)}
.rank-card .card-cta{margin-top:auto;padding-top:10px;font-weight:700;font-size:14px}
.cta{max-width:880px;margin:40px auto 0;padding:30px 22px;text-align:center;
background:linear-gradient(135deg,rgba(59,130,246,.14),rgba(79,70,229,.06));
border:1px solid rgba(59,130,246,.28);border-radius:22px}
.cta h2{margin:0 0 8px}.cta p{color:var(--muted);margin:0 auto 16px;max-width:560px}
.btn{display:inline-block;background:var(--blue);color:#fff;font-weight:800;padding:13px 26px;border-radius:14px;font-size:15px}
.btn:hover{background:#2563eb;text-decoration:none}
.cta-fine{font-size:12px;color:var(--dim);margin-top:14px}
.related{margin-top:34px;border-top:1px solid var(--line);padding-top:18px}
.related h2{margin:0 0 12px;font-size:17px}
.related-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 18px}
.related-list a{font-size:14px;font-weight:600}
@media(max-width:520px){.related-list{grid-template-columns:1fr}}
.context p{color:var(--muted);margin:0 0 12px}
.glossary dl{margin:0;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.glossary dt{font-weight:800;color:#fff;padding:14px 18px 2px;background:rgba(255,255,255,.02)}
.glossary dd{margin:0;padding:2px 18px 14px;color:var(--muted);font-size:14.5px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--line)}
.glossary dd:last-child{border-bottom:0}
.prose{font-size:16px;color:var(--text)}
.prose em{color:var(--muted);font-style:italic}
.ways{padding-left:20px}.ways li{margin:0 0 14px}
.diagram{margin:22px 0 8px}
.diagram-svg{width:100%;height:auto;display:block;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:16px;padding:8px}
.diagram figcaption{font-size:13px;color:var(--dim);margin-top:10px;text-align:center}
.dodont{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
.dodont .card h2{font-size:19px}
.dont{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.05)}
.qbox{margin-top:34px;background:var(--panel);border:1px solid rgba(59,130,246,.3);border-radius:18px;padding:20px 24px}
.qbox h2{margin-top:0;font-size:19px}
.qbox ol{margin:0;padding-left:22px}.qbox li{margin:0 0 10px;font-weight:600;color:#fff}
.qnote{margin:14px 0 0;color:var(--muted);font-size:14px;font-style:italic}
@media(max-width:640px){.dodont{grid-template-columns:1fr}}
.guidelink{margin:18px 0 0;padding:14px 18px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:12px;font-size:14.5px;font-weight:600}
.foot{max-width:880px;margin:48px auto 0;padding:24px 22px 40px;border-top:1px solid var(--line)}
.foot-links{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:16px}
.foot-links a{font-size:13px;font-weight:700;color:var(--muted)}
.disclaimer{font-size:12px;color:var(--dim);line-height:1.6;margin:0 0 10px}
.copyright{font-size:12px;color:var(--dim);margin:0}
@media(max-width:760px){.topbar{grid-template-columns:auto minmax(0,1fr)}
.topnav{justify-self:end}.crumbs{grid-column:1/-1;justify-self:start;width:100%}}
@media(max-width:420px){.topbar{grid-template-columns:1fr}.topnav{justify-self:start;width:100%}
.crumbs{grid-column:1}}
@media(max-width:640px){.two-col,.ranks,.session-grid,.session-grid--3{grid-template-columns:1fr}
.rank-card--al{grid-column:auto}}
`;

// NOTE: sitemap.xml + robots.txt are written by scripts/build-seo-pages.mjs (the single source of
// truth for the UNIFIED sitemap covering this compare cluster + the new SEO silo). This script no
// longer writes them, so the two generators can never drift or clobber each other's sitemap.

// ---------- write everything ----------
function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  console.log('wrote', path.replace(PUBLIC_DIR, 'public'));
}

const slugs = Object.values(COMPETITORS).map((c) => c.slug);

write(resolve(COMPARE_DIR, 'styles.css'), STYLES);
write(resolve(COMPARE_DIR, 'index.html'), renderHub());
for (const c of Object.values(COMPETITORS)) {
  write(resolve(COMPARE_DIR, c.slug, 'index.html'), renderVersus(c));
}
write(resolve(PUBLIC_DIR, GUIDE.path, 'index.html'), renderGuide());

console.log(`\nDone. ${slugs.length} head-to-head pages + hub + guide.`);
console.log('Run `node scripts/build-seo-pages.mjs` to (re)build the silo + the unified sitemap.xml/robots.txt.');
