// Shared render shell for the SEO silo. Owned by the orchestrator.
// Agents write DECLARATIVE content (page objects) — never HTML. renderPage() turns a page
// object into a complete, crawlable static HTML document with correct meta, JSON-LD, breadcrumbs,
// CTA and silo interlinking. Visual base reuses /compare/styles.css; new components live in
// /seo/styles.css (SEO_STYLES below).
//
// ---- PAGE OBJECT CONTRACT ----
// {
//   key,            // NAV key (registry) — drives canonical, related, breadcrumb tail when path omitted
//   path,           // explicit URL path (trailing slash) — required for integration spokes
//   title,          // <title> + og:title + twitter:title  (UNIQUE per page)
//   description,    // meta description + og/twitter description (UNIQUE per page)
//   eyebrow,        // small label above H1
//   h1,
//   tldr,           // short-answer box text (string) — AI-answer optimized
//   bylineUpdated,  // bool, show "Updated <date>" byline
//   breadcrumbs,    // [{name,url}] full trail INCLUDING Home and self
//   sections,       // [Section] (see renderSection)
//   faq,            // [[q,a], ...]
//   faqHeading,     // optional override
//   cta,            // {heading, sub}
//   related,        // [{href,text}] (defaults to relatedFor(key))
//   schema,         // {software?:desc, itemList?:[{name,url}]} (software is held until verified reviews exist)
//   ogType,         // default 'website'
// }
//
// ---- SECTION TYPES ----
//  {type:'prose', paras:[...]}                         paragraphs
//  {type:'qa', q, a}                                   question H2 + answer (a: string | string[])
//  {type:'bullets', h2, intro?, items:[...], variant?} bulleted list ('win' variant = highlighted)
//  {type:'features', h2, intro?, cards:[{title,body}]} feature card grid
//  {type:'steps', h2, intro?, steps:[{title,body}]}    numbered process
//  {type:'table', h2, intro?, head:[...], rows:[[...]], note?, alCol?:idx} comparison/pricing table
//  {type:'callout', title?, body}                      highlighted note box
//  {type:'figure', before, after, caption}             before/after studio images
//  {type:'twocol', left:{h2,items}, right:{h2,items}}  do/don't or wins/strengths
//  {type:'html', html}                                 trusted prebuilt HTML (orchestrator only)

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, NAV, relatedFor, pillarFor, SECTION_LABEL } from './registry.mjs';
import { AI_VISIBILITY_NAV_LABEL } from '../../shared/ai-visibility-route.js';
import { PAID_ADS_NAV_LABEL } from '../../shared/paid-ads-route.js';
import { WEBSITE_NAV_LABEL } from '../../shared/dealer-websites-route.js';

export { SITE, NAV };

// ---------- per-page OG cards ----------
// build-og-cards.mjs writes public/og/manifest.json mapping url path -> card. Read it once at
// module load: a page with a card points og:image at it, everything else falls back to the shared
// image. The fallback is what makes the card generator optional — the site can never reference a
// card that was never rendered.
const OG_MANIFEST_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'og', 'manifest.json',
);
let OG_MANIFEST = {};
try {
  if (existsSync(OG_MANIFEST_PATH)) OG_MANIFEST = JSON.parse(readFileSync(OG_MANIFEST_PATH, 'utf8'));
} catch (err) {
  console.warn('!! could not read og/manifest.json, falling back to /og-image.jpg —', err.message);
}
// `fallback` lets a silo without per-page cards use its own shared card (aeoGeo: the AEO card)
// instead of the Marketplace /og-image.jpg. Omitted, the behaviour is unchanged.
export const ogImageFor = (urlPath, fallback) =>
  SITE.origin + (OG_MANIFEST[urlPath] || fallback || '/og-image.jpg');

export const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export const jsonld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replaceAll('<', '\\u003c')}</script>`;

// fmt = esc THEN linkify a safe markdown subset for inline contextual links in body text:
//   [anchor text](/internal/path/) or [anchor](https://external). esc runs first so any real
//   <,>,",' in the text are already neutralized; we only emit anchors whose href is a controlled
//   internal path or an https URL (never javascript:). Use fmt for human-readable body copy only,
//   never for attributes (alt/title/meta) — those stay esc().
const linkify = (escaped) => escaped.replace(
  /\[([^\]]+)\]\((\/[A-Za-z0-9\-/#?=&.]*|https:\/\/[^\s)]+)\)/g,
  '<a href="$2">$1</a>',
);
export const fmt = (s) => linkify(esc(s));
// stripmd = plain-text form of our markdown-link subset (keeps anchor text, drops the URL).
// Used for JSON-LD text (FAQ answers etc.) so structured data stays clean prose, never markdown.
export const stripmd = (s) => String(s).replace(/\[([^\]]+)\]\((?:\/[^)]*|https:\/\/[^)\s]+)\)/g, '$1');
// mdfmt = the Markdown-twin form of the same subset: KEEPS every link (internal paths made absolute), so an
// answer engine reading the .md twin can follow the internal links and verify the cited sources. Links are
// publish-gated before the twin is built, so nothing here can point at a draft.
export const mdfmt = (s) => String(s).replace(
  /\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g,
  (_, text, href) => `[${text}](${href.startsWith('/') ? SITE.origin + href : href})`,
);

const updatedHuman = () => SITE.updatedHuman || SITE.updated;

// Per-page date formatting (drip articles carry their own publish/update date; evergreen
// pages keep the site-wide stamp). UTC-pinned so 'YYYY-MM-DD' never renders off-by-one.
export const humanDate = (iso) => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });

// ---------- schema.org builders ----------
// PROFILES is the sameAs array: the off-site profiles that let an answer engine resolve
// "AutoLander" to ONE real company instead of treating every mention as an unrelated string.
// This is the single place to add them. ONLY add a URL after the profile is claimed, live and
// public — a sameAs pointing at a 404 is worse than no sameAs at all.
//
// Verified live 2026-09-04 (each opened and read in a real browser session before being added):
//   LinkedIn  — public vanity URL, Tampa, 2–10 employees (NOT the /admin/dashboard/ URL Crunchbase exposes)
//   Facebook  — the company Page, 388 followers, "Software Company"
//   G2        — claimed product listing in Car Dealer Software (0 reviews yet — drive them; see #28)
//   Crunchbase — organization profile, links back to autolander.ai
// Verified live + claimed 2026-10-10 (review profiles; ratings at that date):
//   Trustpilot   — claimed July 2026, 4.6 from 20 reviews (fix its category: it says "Marketing Agency")
//   Product Hunt — product page, 5.0 from 16 reviews, maker Clay Newsome
//   PeerPush     — product page, 5.0 from 5 reviews (listed 2026-08-22)
//   SaaSHub      — verified listing (Clay, 2026-07-14)
//   AlternativeTo — live listing (Clay, 2026-07-14)
// PENDING (add here the moment each is claimed and live):
//   SourceForge/Slashdot (live but UNCLAIMED: claim first) · GetApp · Software Advice · YouTube channel · X
// index.html carries a static copy of this list for the homepage; test/sameas-profiles.test.js keeps them equal.
export const PROFILES = [
  'https://www.linkedin.com/company/autolander/',
  'https://www.facebook.com/autolander',
  'https://www.g2.com/products/autolander/reviews',
  'https://www.crunchbase.com/organization/autolander',
  // Capterra — provider-verified listing (Gartner Digital Markets), read live 2026-09-04. GetApp and
  // Software Advice had not syndicated it yet that day; add them here once their pages exist.
  'https://www.capterra.com/p/10048212/AutoLander/',
  'https://github.com/mgarbs/autolander-releases',
  // Wikidata entity created 2026-09-04 (Q141277412): the authoritative record that disambiguates
  // "AutoLander" from Autoland (aviation) and mozilla/autolander for every downstream knowledge graph.
  'https://www.wikidata.org/wiki/Q141277412',
  'https://www.trustpilot.com/review/autolander.ai',
  'https://www.producthunt.com/products/autolander',
  'https://peerpush.com/p/autolander',
  'https://www.saashub.com/autolander-ai',
  'https://alternativeto.net/software/autolander-ai/about/',
];

// ---------- Cloudflare email-obfuscation opt-out ----------
// autolander.ai is proxied by Cloudflare with Scrape Shield's Email Obfuscation on, which rewrites
// every mailto: and every bare address in an HTML response into
// `<a class="__cf_email__" data-cfemail="…">[email&#160;protected]</a>` plus a decoder script.
// That is fine against spam harvesters and terrible for us: an AI agent checking whether this is a
// real business reads /contact/ and finds "[email protected]" fifteen times instead of a contact
// address. (Measured live: 15 rewrites on /contact/, 3 on /about/.)
//
// `<!--email_off-->…<!--/email_off-->` is Cloudflare's documented per-section opt-out, so we keep
// the feature on everywhere else and exempt only the addresses we actively want machines to read.
// This is not a new exposure: the same addresses are already in plain text in the .md twins,
// llms.txt and the JSON-LD, none of which Cloudflare touches.
//
// NEVER run this over a <script> block — wrapping an address inside application/ld+json would
// inject an HTML comment into JSON and break the structured data. renderPage applies it to the
// document BODY only.
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@autolander\.ai\b/g;
export const emailSafe = (html) =>
  String(html).replace(EMAIL_RE, (addr) => `<!--email_off-->${addr}<!--/email_off-->`);

export const ORG_ID = SITE.origin + '/#organization';
export const PERSON_ID = SITE.origin + '/about/#michael-garber';

export const orgLd = {
  '@context': 'https://schema.org', '@type': 'Organization',
  '@id': ORG_ID,
  name: 'AutoLander',
  legalName: 'AutoLander LLC',
  url: SITE.origin + '/',
  logo: SITE.origin + '/autolander-logo.png',
  image: SITE.origin + '/og-image.jpg',
  email: 'sales@autolander.ai',
  telephone: '+1-919-280-0967',
  description: 'Facebook Marketplace software for car dealerships. AutoLander syncs dealer '
    + 'inventory feeds, posts vehicles to Facebook Marketplace, keeps prices current, removes '
    + 'sold units and runs AI photo editing on listing images.',
  // Postal address. An Organization node without one reads as an unverifiable brand name:
  // contactPoint alone tells an answer engine how to reach us, not that we exist somewhere.
  // Keep in step with /contact/ — the page and the schema must never disagree.
  address: {
    '@type': 'PostalAddress',
    streetAddress: '5830 Memorial Hwy, Apt 1322',
    addressLocality: 'Tampa',
    addressRegion: 'FL',
    postalCode: '33615',
    addressCountry: 'US',
  },
  // Markets served (Michael, 2026-09-04): the U.S., Canada, and Spanish-speaking Latin America. The
  // product runs in en / es (es_LA) / fr (fr_CA) with miles or kilometres per dealership (v3.79.0).
  areaServed: [
    { '@type': 'Country', name: 'United States' },
    { '@type': 'Country', name: 'Canada' },
    { '@type': 'Place', name: 'Latin America (Spanish-speaking)' },
  ],
  knowsLanguage: ['en', 'es', 'fr'],
  knowsAbout: [
    'Facebook Marketplace',
    'Automotive retail',
    'Car dealership marketing',
    'Vehicle inventory feeds',
    'Dealer management systems',
    'Used car pricing',
    'Answer engine optimization (AEO) for car dealers',
    'Generative engine optimization (GEO) for car dealers',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'sales@autolander.ai',
      telephone: '+1-919-280-0967',
      areaServed: ['US', 'CA', 'Latin America'],
      availableLanguage: ['English', 'Spanish', 'French'],
      url: SITE.origin + '/contact/',
    },
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@autolander.ai',
      telephone: '+1-919-280-0967',
      areaServed: ['US', 'CA', 'Latin America'],
      availableLanguage: ['English', 'Spanish', 'French'],
      url: SITE.origin + '/contact/',
    },
    {
      '@type': 'ContactPoint',
      contactType: 'media',
      email: 'sales@autolander.ai',
      areaServed: ['US', 'CA', 'Latin America'],
      availableLanguage: ['English', 'Spanish', 'French'],
      url: SITE.origin + '/contact/',
    },
  ],
  ...(PROFILES.length ? { sameAs: PROFILES } : {}),
};

// Named author for original research and guides. An anonymous corporate byline is the weakest
// possible E-E-A-T signal on a page whose whole value is credibility — answer engines and
// journalists both weight named, credentialed attribution.
export const AUTHOR = {
  name: 'Michael Garber',
  jobTitle: 'Co-founder',
  url: SITE.origin + '/about/',
  email: 'michael@autolander.ai',
};

export const personLd = {
  '@context': 'https://schema.org', '@type': 'Person',
  '@id': PERSON_ID,
  name: AUTHOR.name,
  jobTitle: AUTHOR.jobTitle,
  url: AUTHOR.url,
  email: AUTHOR.email,
  worksFor: { '@id': ORG_ID },
  knowsAbout: [
    'Facebook Marketplace for car dealers',
    'Automotive inventory syndication',
    'Dealer management system feeds',
    'Used vehicle merchandising',
  ],
};

// Article node — makes a page read as dated, attributed research rather than marketing copy.
//
// `pillar` (from PILLAR_OF in registry.mjs) emits isPartOf → the parent pillar's WebPage @id. That
// is the machine-readable half of the silo: the internal links say a cluster page belongs to a
// pillar, and this says the same thing in a form a retrieval system can traverse without
// inferring topology from anchor text. A page that IS its own pillar gets no isPartOf — a node
// declaring itself part of itself is noise.
export const articleLd = ({
  title, canonical, description, datePublished, dateModified, image, pillar,
  type = 'Article', isPartOf, about, keywords, citation,
}) => ({
  '@context': 'https://schema.org', '@type': type,
  '@id': canonical + '#article',
  headline: title,
  description,
  url: canonical,
  mainEntityOfPage: canonical,
  author: { '@id': PERSON_ID },
  creator: { '@id': PERSON_ID },
  publisher: { '@id': ORG_ID },
  ...(isPartOf ? {
    isPartOf: { '@type': 'Blog', '@id': isPartOf },
  } : pillar && pillar.url !== canonical ? {
    isPartOf: {
      '@type': 'WebPage',
      '@id': pillar.url + '#webpage',
      name: pillar.name,
      url: pillar.url,
    },
  } : {}),
  datePublished: datePublished || SITE.updated,
  // Never let a page claim it was modified before it was published: an explicit
  // dateModified wins; otherwise the site stamp, floored to datePublished.
  dateModified: dateModified
    || ((datePublished && SITE.updated < datePublished) ? datePublished : SITE.updated),
  image: image || SITE.origin + '/og-image.jpg',
  inLanguage: 'en-US',
  isAccessibleForFree: true,
  // What the article is about, by @id (aeoGeo: the money page's AEO and GEO DefinedTerm nodes).
  ...(about && about.length ? { about } : {}),
  // What it covers and what it cites (aeoGeo: the target keywords and the Sources list), so an answer
  // engine can match the topic and check every claim against its primary source without parsing HTML.
  ...(keywords && keywords.length ? { keywords: keywords.join(', ') } : {}),
  ...(citation && citation.length ? {
    citation: citation.map((c) => ({ '@type': 'CreativeWork', name: c.name, url: c.url })),
  } : {}),
});

// Dataset node — the strongest available signal that a page carries original measured data.
// `distribution` points at the machine-readable copies so an analyst or a model can take the
// numbers without scraping the table.
export const datasetLd = ({
  name, canonical, description, variableMeasured, temporalCoverage,
  datePublished, distribution = [], license, measurementTechnique, size,
}) => ({
  '@context': 'https://schema.org', '@type': 'Dataset',
  '@id': canonical + '#dataset',
  name,
  description,
  url: canonical,
  identifier: canonical,
  creator: { '@id': ORG_ID },
  publisher: { '@id': ORG_ID },
  author: { '@id': PERSON_ID },
  datePublished: datePublished || SITE.updated,
  dateModified: SITE.updated,
  inLanguage: 'en-US',
  isAccessibleForFree: true,
  spatialCoverage: { '@type': 'Place', name: 'United States' },
  ...(license ? { license } : {}),
  ...(measurementTechnique ? { measurementTechnique } : {}),
  ...(temporalCoverage ? { temporalCoverage } : {}),
  ...(size ? { size } : {}),
  ...(variableMeasured ? {
    variableMeasured: variableMeasured.map((v) => (typeof v === 'string' ? v : {
      '@type': 'PropertyValue',
      name: v.name,
      ...(v.value !== undefined ? { value: v.value } : {}),
      ...(v.unitText ? { unitText: v.unitText } : {}),
      ...(v.description ? { description: v.description } : {}),
    })),
  } : {}),
  ...(distribution.length ? {
    distribution: distribution.map((d) => ({
      '@type': 'DataDownload',
      encodingFormat: d.format,
      contentUrl: d.url,
      ...(d.name ? { name: d.name } : {}),
    })),
  } : {}),
});

// HowTo node — for pages that are literally a step-by-step procedure. Built from the same
// {type:'steps'} section the page already renders, so the markup can never drift from the copy.
export const howToLd = ({ name, canonical, description, steps, totalTime }) => ({
  '@context': 'https://schema.org', '@type': 'HowTo',
  '@id': canonical + '#howto',
  name,
  description,
  ...(totalTime ? { totalTime } : {}),
  step: steps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: stripmd(s.body),
    url: `${canonical}#step-${i + 1}`,
  })),
});
export const faqLd = (faq) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({
    '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: stripmd(a) },
  })),
});
export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
  })),
});
export const itemListLd = (items) => ({
  '@context': 'https://schema.org', '@type': 'ItemList',
  itemListElement: items.map((t, i) => ({
    '@type': 'ListItem', position: i + 1, name: t.name, url: t.url,
  })),
});
// WebPage node. Carries a stable @id (`<canonical>#webpage`) so other nodes — notably a cluster
// page's Article.isPartOf — can reference THIS page by @id instead of duplicating its properties.
//
// `speakable` marks the two regions that are genuinely answer-shaped: the "Short answer" TLDR and
// the FAQ answer bodies. Both are already written as self-contained sentences (they have to be —
// they are what the .md twin and the FAQPage node expose), which is the contract
// SpeakableSpecification asks for. Emitted only when the page actually renders one of them, so a
// page with neither never claims a speakable region that does not exist.
export const webPageLd = (title, canonical, desc, image, updated, opts = {}) => {
  const speakable = [
    ...(opts.hasTldr ? ['.tldr'] : []),
    ...(opts.hasFaq ? ['.faq-a'] : []),
  ];
  return {
    '@context': 'https://schema.org', '@type': 'WebPage',
    '@id': canonical + '#webpage',
    name: title, url: canonical, description: desc,
    isPartOf: { '@type': 'WebSite', '@id': SITE.origin + '/#website', name: 'AutoLander', url: SITE.origin + '/' },
    publisher: { '@id': ORG_ID },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: image || SITE.origin + '/og-image.jpg',
      width: 1200,
      height: 630,
    },
    ...(speakable.length ? {
      speakable: { '@type': 'SpeakableSpecification', cssSelector: speakable },
    } : {}),
    dateModified: updated || SITE.updated,
  };
};

// ---------- helpers ----------
const liList = (arr) => arr.map((x) => `<li>${fmt(x)}</li>`).join('\n        ');
const paras = (a) => (Array.isArray(a) ? a : [a]).map((p) => `<p>${fmt(p)}</p>`).join('\n      ');

// ---------- document head ----------
export function head({
  title, description, canonical, jsonLdBlocks, ogType = 'website', ogImage, articleMeta,
}) {
  const cardUrl = ogImage || SITE.origin + '/og-image.jpg';
  // og:image:type must describe the file og:image actually points at. The OG cards are .png and
  // the shared fallback is .jpg, so derive it rather than hard-coding one and lying about the other.
  const cardType = /\.png($|\?)/i.test(cardUrl) ? 'image/png' : 'image/jpeg';
  // article:* is only valid on og:type=article. Facebook, LinkedIn and several answer engines read
  // published/modified time from here rather than from JSON-LD, so an Article page that omits them
  // is dateless to those consumers even though its schema is complete.
  const articleTags = ogType === 'article' && articleMeta ? `
  <meta property="article:author" content="${esc(articleMeta.author)}" />
  <meta property="article:publisher" content="${esc(SITE.origin)}/" />${articleMeta.section ? `
  <meta property="article:section" content="${esc(articleMeta.section)}" />` : ''}${articleMeta.published ? `
  <meta property="article:published_time" content="${esc(articleMeta.published)}" />` : ''}${articleMeta.modified ? `
  <meta property="article:modified_time" content="${esc(articleMeta.modified)}" />` : ''}${(articleMeta.tags || []).map((t) => `
  <meta property="article:tag" content="${esc(t)}" />`).join('')}` : '';
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
  <!-- Markdown twin: answer engines parse it far more reliably than HTML. Generated from the
       same page object as this document by renderMarkdown(), so it can never drift. -->
  <link rel="alternate" type="text/markdown" href="${esc(canonical.replace(/\/$/, '') + '.md')}" title="Markdown version" />
  <link rel="alternate" type="application/rss+xml" title="AutoLander blog" href="${SITE.origin}/blog/feed.xml" />
  <link rel="icon" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:site_name" content="AutoLander" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(cardUrl)}" />
  <meta property="og:image:type" content="${cardType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(title)}" />
  <meta property="og:locale" content="en_US" />${articleTags}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(cardUrl)}" />
  <meta name="twitter:image:alt" content="${esc(title)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/compare/styles.css" />
  <link rel="stylesheet" href="/seo/styles.css" />
  ${jsonLdBlocks.join('\n  ')}
</head>
<body>`;
}

export function siteHeader(breadcrumbs) {
  const crumbs = breadcrumbs.map((c, i) => {
    const last = i === breadcrumbs.length - 1;
    const sep = i > 0 ? '<span>/</span>\n      ' : '';
    return last
      ? `${sep}<span class="crumb-active">${esc(c.name)}</span>`
      : `${sep}<a href="${esc(c.url)}">${esc(c.name)}</a>`;
  }).join('\n      ');
  return `  <header class="topbar">
    <a class="brand" href="${SITE.origin}/">
      <img src="/autolander-logo.png" alt="AutoLander" width="400" height="120" class="brand-logo" />
    </a>
    <nav class="topnav" aria-label="Site"><a href="${NAV.blog.path}">Blog</a><a href="${NAV.blog.path}#guides">Guides</a><a href="/#pricing">Pricing</a><details class="navdrop"><summary>Services</summary><span class="navdrop-menu"><a href="${NAV.aiVisibility.path}">${esc(AI_VISIBILITY_NAV_LABEL)}</a><a href="/team/">Team Plans</a><a href="${NAV.paidAds.path}">${esc(PAID_ADS_NAV_LABEL)}</a><a href="${NAV.dealerWebsites.path}">${esc(WEBSITE_NAV_LABEL)}</a></span></details></nav>
    <nav class="crumbs" aria-label="Breadcrumb">
      ${crumbs}
    </nav>
  </header>
  <script>(()=>{document.addEventListener('click',event=>{document.querySelectorAll('details.navdrop[open]').forEach(menu=>{if(!menu.contains(event.target))menu.removeAttribute('open')})})})()</script>`;
}

// `opts.href` (a silo CTA, e.g. aeoGeo's free scan) swaps the button and the fine print. Without
// it the block is the exact Marketplace CTA every other page has always rendered.
export function ctaBlock(heading, sub, opts = {}) {
  if (opts.href) {
    return `  <section class="cta">
    <h2>${esc(heading)}</h2>
    <p>${esc(sub)}</p>
    <a class="btn" href="${esc(opts.href)}">${esc(opts.button)} &rarr;</a>
    <p class="cta-fine">${esc(opts.fine)}</p>
  </section>`;
  }
  return `  <section class="cta">
    <h2>${esc(heading)}</h2>
    <p>${esc(sub)}</p>
    <a class="btn" href="${SITE.ctaUrl}">See plans &amp; book a demo &rarr;</a>
    <p class="cta-fine">Plans from $39/mo &bull; 5 free posts &bull; no credit card &bull; cancel anytime</p>
  </section>`;
}

// A page that carries its own `footer` ({ columns: [{ heading, links: [{ label, href }] }], line })
// gets an on-topic column footer: the aeoGeo articles, whose footer mirrors the AEO and GEO money
// page's FOOTER_NAV (article-system.mjs siloFooter, publish-aware). Every other page passes nothing
// and renders the site-wide footer below, byte for byte.
export function siteFooter(footer = null) {
  if (footer && Array.isArray(footer.columns) && footer.columns.length) return columnFooter(footer);
  return `  <footer class="foot">
    <a href="${SITE.origin}/" class="foot-brand"><img src="/autolander-logo.png" alt="AutoLander" width="400" height="120" class="brand-logo" /></a>
    <nav class="foot-links">
      <a href="${NAV.category.path}">FB Marketplace auto poster</a>
      <a href="${NAV.listingSw.path}">Listing software</a>
      <a href="${NAV.dealers.path}">For car dealers</a>
      <a href="${NAV.compareHub.path}">Compare tools</a>
      <a href="${NAV.integHub.path}">Integrations</a>
      <a href="${NAV.inventory.path}">Inventory sync</a>
      <a href="${NAV.automation.path}">Automation</a>
      <a href="${NAV.mktgHub.path}">Dealership marketing</a>
      <a href="${NAV.report2026.path}">2026 Marketplace Report</a>
      <a href="${NAV.aiChat.path}">AI chat for dealers</a>
      <a href="${NAV.photoEditor.path}">AI car photo editor</a>
      <a href="${NAV.aiVisibility.path}">AEO and GEO for car dealers</a>
      <a href="${NAV.paidAds.path}">Paid ads and AI commercials for car dealers</a>
      <a href="${NAV.dealerWebsites.path}">Dealership websites</a>
      <a href="${NAV.rvDealers.path}">RV dealer software</a>
      <a href="${NAV.sellGuide.path}">How to sell cars</a>
      <a href="${NAV.guide.path}">Guide</a>
      <a href="${NAV.training.path}">Training</a>
      <a href="${NAV.blog.path}">Blog</a>
      <a href="${SITE.origin}/">AutoLander home</a>
      <a href="${SITE.origin}/#pricing">Pricing</a>
      <a href="${NAV.about.path}">About</a>
      <a href="${NAV.contact.path}">Contact</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
    </nav>
    <p class="disclaimer">
      AutoLander is a native desktop app for car dealers. Third-party product names, DMS and feed
      providers (e.g. CarGurus, Cars.com, vAuto, DealerCenter, Dealer.com, HomeNet, Frazer, CDK, Tekion)
      are trademarks of their respective owners; AutoLander is not affiliated with or endorsed by them.
      Facebook and Facebook Marketplace are trademarks of Meta Platforms, Inc. AutoLander does not
      override Meta eligibility, listing limits or terms &mdash; see our <a href="${NAV.guide.path}">policy and safety guide</a>.
    </p>
    <p class="copyright">&copy; 2026 AutoLander. Last updated ${esc(updatedHuman())}.</p>
  </footer>
</body>
</html>`;
}

function columnFooter({ columns, line }) {
  const column = ({ heading, links }) => `      <nav class="foot-col" aria-label="${esc(heading)}">
        <h2 class="foot-h">${esc(heading)}</h2>
        ${links.map(({ label, href }) => `<a href="${esc(href)}">${esc(label)}</a>`).join('\n        ')}
      </nav>`;
  return `  <footer class="foot">
    <a href="${SITE.origin}/" class="foot-brand"><img src="/autolander-logo.png" alt="AutoLander" width="400" height="120" class="brand-logo" /></a>
    <div class="foot-cols">
${columns.map(column).join('\n')}
    </div>${line ? `\n    <p class="disclaimer">${esc(line)}</p>` : ''}
    <p class="copyright">&copy; 2026 AutoLander. Last updated ${esc(updatedHuman())}.</p>
  </footer>
</body>
</html>`;
}

// ---------- section renderer ----------
export function renderSection(s) {
  switch (s.type) {
    case 'prose':
      return `    <section class="prose-block">\n      ${paras(s.paras)}\n    </section>`;
    case 'qa': {
      const qaId = s.id ? ` id="${esc(s.id)}"` : '';
      return `    <section class="qa"${qaId}>\n      <h2>${esc(s.q)}</h2>\n      ${paras(s.a)}\n    </section>`;
    }
    case 'downloads':
      // Machine-readable copies of the page's data. A downloadable table is what turns a study
      // into a source other people reuse — and reuse is what compounds into citations.
      return `    <section class="downloads"${s.id ? ` id="${esc(s.id)}"` : ''}>
      <h2>${esc(s.h2)}</h2>${s.intro ? `\n      <p class="sec-intro">${fmt(s.intro)}</p>` : ''}
      <ul class="download-list">
        ${s.files.map((f) => `<li><a href="${esc(f.url)}" download><span class="dl-fmt">${esc(f.label)}</span><span class="dl-desc">${esc(f.desc)}</span></a></li>`).join('\n        ')}
      </ul>${s.note ? `\n      <p class="legend">${fmt(s.note)}</p>` : ''}
    </section>`;
    case 'bullets':
      return `    <section class="card${s.variant === 'win' ? ' win' : ''}"${s.id ? ` id="${esc(s.id)}"` : ''}>
      <h2>${esc(s.h2)}</h2>${s.intro ? `\n      <p>${esc(s.intro)}</p>` : ''}
      <ul>
        ${liList(s.items)}
      </ul>
    </section>`;
    case 'features':
      return `    <section class="feature-wrap">
      <h2>${esc(s.h2)}</h2>${s.intro ? `\n      <p class="sec-intro">${esc(s.intro)}</p>` : ''}
      <div class="feature-grid">
        ${s.cards.map((c) => `<div class="feature-card"><h3>${esc(c.title)}</h3><p>${fmt(c.body)}</p></div>`).join('\n        ')}
      </div>
    </section>`;
    case 'steps':
      return `    <section class="steps-wrap">
      <h2>${esc(s.h2)}</h2>${s.intro ? `\n      <p class="sec-intro">${esc(s.intro)}</p>` : ''}
      <ol class="steps">
        ${s.steps.map((st, i) => `<li id="step-${i + 1}"><span class="step-h">${esc(st.title)}</span><span class="step-b">${fmt(st.body)}</span></li>`).join('\n        ')}
      </ol>
    </section>`;
    case 'table': {
      const alCol = s.alCol;
      const thead = s.head.map((h, i) => `<th scope="col"${i === alCol ? ' class="col-al"' : ''}>${esc(h)}</th>`).join('');
      const rows = s.rows.map((r) => `        <tr>${r.map((cellVal, i) => {
        const tag = i === 0 ? 'th scope="row"' : 'td';
        const cls = i === alCol ? ' class="col-al"' : '';
        const close = i === 0 ? 'th' : 'td';
        return `<${tag}${cls}>${esc(cellVal)}</${close}>`;
      }).join('')}</tr>`).join('\n');
      // s.id gives the table a stable deep-link target. An answer engine citing one figure
      // wants to link the claim, not the page — …/#top-models beats …/ every time.
      const secId = s.id ? ` id="${esc(s.id)}"` : '';
      const cap = s.caption ? `\n          <caption>${esc(s.caption)}</caption>` : '';
      return `    <section class="table-section"${secId}>
      <h2>${esc(s.h2)}</h2>${s.intro ? `\n      <p class="sec-intro">${esc(s.intro)}</p>` : ''}
      <div class="table-wrap">
        <table class="cmp">${cap}
          <thead><tr>${thead}</tr></thead>
          <tbody>\n${rows}\n          </tbody>
        </table>
      </div>${s.note ? `\n      <p class="legend">${esc(s.note)}</p>` : ''}
    </section>`;
    }
    case 'callout':
      return `    <aside class="callout">${s.title ? `<h3>${esc(s.title)}</h3>` : ''}<p>${fmt(s.body)}</p></aside>`;
    case 'quotes':
      // Customer testimonials. Deliberately NOT marked up as Review/AggregateRating: Google treats
      // reviews a business collects about itself as self-serving and excludes them from rich
      // results, and these are messages, not star ratings. Visible, attributed, honest — nothing more.
      return `    <section class="quotes"${s.id ? ` id="${esc(s.id)}"` : ''}>
      <h2>${esc(s.h2)}</h2>${s.intro ? `\n      <p class="sec-intro">${esc(s.intro)}</p>` : ''}
      <div class="quote-grid">
        ${s.quotes.map((q) => `<figure class="quote"><blockquote><p>${esc(q.text)}</p></blockquote><figcaption>${esc(q.who)}${q.role ? `<span class="quote-role">${esc(q.role)}</span>` : ''}</figcaption></figure>`).join('\n        ')}
      </div>${s.note ? `\n      <p class="legend">${esc(s.note)}</p>` : ''}
    </section>`;
    case 'twocol':
      return `    <div class="two-col">
      <section class="card win"><h2>${esc(s.left.h2)}</h2><ul>${s.left.items.map((x) => `<li>${fmt(x)}</li>`).join('')}</ul></section>
      <section class="card"><h2>${esc(s.right.h2)}</h2><ul>${s.right.items.map((x) => `<li>${fmt(x)}</li>`).join('')}</ul></section>
    </div>`;
    case 'figure': {
      // Responsive: browser pulls 550w on low-DPR/desktop (display slot ~413px) and 1100w on retina.
      const srcset = (src) => `${esc(src.replace(/\.webp$/, '-550.webp'))} 550w, ${esc(src)} 1100w`;
      const sizes = '(max-width:520px) 92vw, 413px';
      return `    <figure class="shot">
      <div class="shot-imgs">
        <img src="${esc(s.before)}" srcset="${srcset(s.before)}" sizes="${sizes}" width="1100" height="733" loading="lazy" decoding="async" alt="${esc(s.beforeAlt || 'Before')}" />
        <img src="${esc(s.after)}" srcset="${srcset(s.after)}" sizes="${sizes}" width="1100" height="733" loading="lazy" decoding="async" alt="${esc(s.afterAlt || 'After')}" />
      </div>
      <figcaption>${esc(s.caption)}</figcaption>
    </figure>`;
    }
    case 'image': {
      // Single showcase image, same -550.webp srcset convention as 'figure'.
      const srcset1 = `${esc(s.src.replace(/\.webp$/, '-550.webp'))} 550w, ${esc(s.src)} 1100w`;
      return `    <figure class="shot shot-single">
      <div class="shot-imgs">
        <img src="${esc(s.src)}" srcset="${srcset1}" sizes="(max-width:720px) 92vw, 680px" width="1100" height="733" loading="lazy" decoding="async" alt="${esc(s.alt)}" />
      </div>
      <figcaption>${esc(s.caption)}</figcaption>
    </figure>`;
    }
    case 'html':
      return s.html; // trusted (orchestrator-supplied) only
    default:
      return '';
  }
}

export function relatedNav(links, heading = 'Related') {
  return `    <nav class="related" aria-label="Related pages">
      <h2>${esc(heading)}</h2>
      <ul class="related-list">
${links.map((l) => `        <li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`).join('\n')}
      </ul>
    </nav>`;
}

function faqSection(faq, heading = 'Frequently asked questions') {
  const items = faq.map(([q, a]) => `
      <details class="faq-item">
        <summary>${esc(q)}</summary>
        <div class="faq-a"><p>${fmt(a)}</p></div>
      </details>`).join('');
  return `    <section class="faq">
      <h2>${esc(heading)}</h2>${items}
    </section>`;
}

// ---------- full page ----------
export function renderPage(page) {
  const nav = page.key ? NAV[page.key] : null;
  const path = page.path || (nav && nav.path);
  const canonical = SITE.origin + path;
  const ogImage = ogImageFor(path, page.ogFallback);
  const pillar = pillarFor(page);
  const jsonLdBlocks = [];
  jsonLdBlocks.push(jsonld(webPageLd(page.title, canonical, page.description, ogImage, page.updated, {
    hasTldr: Boolean(page.tldr),
    hasFaq: Boolean(page.faq && page.faq.length),
  })));
  // Google requires a genuine aggregateRating or review for SoftwareApplication rich results.
  // AutoLander does not currently publish verified review data, so do not emit that type until it does.
  if (page.schema?.itemList) jsonLdBlocks.push(jsonld(itemListLd(page.schema.itemList)));
  if (page.schema?.blog) jsonLdBlocks.push(jsonld(page.schema.blog));

  // Article: emitted for authored, dated content (research + guides). Carries the named author,
  // which is the E-E-A-T signal answer engines weight most heavily on this kind of page.
  let articleMeta = null;
  if (page.article) {
    const datePublished = page.article.datePublished || SITE.updated;
    const dateModified = page.article.dateModified || page.updated || SITE.updated;
    jsonLdBlocks.push(jsonld(articleLd({
      title: page.article.headline || page.h1 || page.title,
      canonical,
      description: page.description,
      datePublished,
      dateModified,
      image: page.article.image || ogImage,
      pillar,
      type: page.article.type,
      isPartOf: page.article.isPartOf,
      about: page.article.about,
      keywords: page.article.tags,
      citation: page.article.citation,
    })));
    // Mirrored onto the OpenGraph layer (article:*). Same source values as the JSON-LD above so
    // the two can never disagree about when a page was published or who wrote it.
    articleMeta = {
      author: AUTHOR.url,
      section: pillar ? pillar.section : SECTION_LABEL[page.key] || null,
      published: `${datePublished}T00:00:00Z`,
      modified: `${dateModified < datePublished ? datePublished : dateModified}T00:00:00Z`,
      tags: page.article.tags || [],
    };
  }

  // Dataset: emitted only for pages that publish original measured data.
  if (page.dataset) {
    jsonLdBlocks.push(jsonld(datasetLd({ ...page.dataset, canonical })));
  }

  // HowTo: built from the page's own {type:'steps'} section so the markup can never drift
  // from the rendered copy. Point `howTo.fromSection` at the section's h2.
  if (page.howTo) {
    const src = (page.sections || []).find(
      (s) => s.type === 'steps' && (!page.howTo.fromSection || s.h2 === page.howTo.fromSection),
    );
    if (src) {
      jsonLdBlocks.push(jsonld(howToLd({
        name: page.howTo.name || page.h1 || page.title,
        canonical,
        description: page.howTo.description || page.description,
        totalTime: page.howTo.totalTime,
        steps: src.steps,
      })));
    } else {
      console.warn(`!! howTo declared but no matching steps section on ${path}`);
    }
  }

  if (page.faq && page.faq.length) jsonLdBlocks.push(jsonld(faqLd(page.faq)));
  if (page.breadcrumbs) jsonLdBlocks.push(jsonld(breadcrumbLd(page.breadcrumbs)));
  jsonLdBlocks.push(jsonld(orgLd));
  // The Person node is referenced by @id from every Article/Dataset, so it has to be resolvable
  // on any page that emits one.
  if (page.article || page.dataset || page.author) jsonLdBlocks.push(jsonld(personLd));

  const related = page.related || (page.key ? relatedFor(page.key) : []);
  const sectionsHtml = (page.sections || []).map(renderSection).join('\n\n');

  // emailSafe wraps our own addresses so Cloudflare does not rewrite them into "[email protected]"
  // (see the comment on emailSafe). Applied to the document BODY only: head() carries the JSON-LD,
  // and an HTML comment inside application/ld+json would be invalid JSON.
  const body = [
    siteHeader(page.breadcrumbs.map(({ name, url }) => ({ name, url }))),
    `  <main class="wrap">
    <article>
    ${page.eyebrow ? `<p class="eyebrow">${esc(page.eyebrow)}</p>` : ''}
    <h1>${esc(page.h1)}</h1>
    ${page.bylineUpdated ? `<p class="byline">${page.author
      ? `By <a href="${AUTHOR.url}" rel="author">${esc(AUTHOR.name)}</a>, ${esc(AUTHOR.jobTitle)}, <a href="${SITE.origin}/">AutoLander</a>`
      : `By the <a href="${SITE.origin}/">AutoLander</a> team`} &middot; Updated <time datetime="${page.updated || SITE.updated}">${esc(page.updated ? humanDate(page.updated) : updatedHuman())}</time></p>` : ''}
    ${page.tldr ? `<div class="tldr"><p class="tldr-label">Short answer</p><p>${fmt(page.tldr)}</p></div>` : ''}

${sectionsHtml}

${page.faq && page.faq.length ? faqSection(page.faq, page.faqHeading) : ''}
`,
    ctaBlock(page.cta.heading, page.cta.sub, page.cta),
    `${related.length ? relatedNav(related, page.relatedHeading || 'Keep exploring') : ''}
    </article>
  </main>`,
    siteFooter(page.footer),
  ].join('\n');

  return [
    head({
      title: page.title,
      description: page.description,
      canonical,
      jsonLdBlocks,
      // A page that emits an Article node is an article to OpenGraph too; article:* is only
      // valid under og:type=article, so the two must agree.
      ogType: page.article ? 'article' : (page.ogType || 'website'),
      ogImage,
      articleMeta,
    }),
    emailSafe(body),
  ].join('\n');
}

// ---------- Markdown twin ----------
// Renders the SAME page object as clean Markdown. Answer engines parse Markdown far more reliably
// than HTML, and Claude in particular favours it — so every page worth citing gets a .md twin
// linked from llms.txt. Generated from the page object, never hand-maintained, so it cannot drift.
export function renderMarkdown(page) {
  const nav = page.key ? NAV[page.key] : null;
  const path = page.path || (nav && nav.path);
  const canonical = SITE.origin + path;
  const out = [];

  out.push(`# ${page.h1 || page.title}`);
  out.push('');
  out.push(`> ${page.description}`);
  out.push('');
  const by = page.author ? `${AUTHOR.name}, ${AUTHOR.jobTitle}, AutoLander` : 'The AutoLander team';
  out.push(`Source: ${canonical}  `);
  out.push(`Author: ${by}  `);
  if (page.article?.datePublished) out.push(`Published: ${humanDate(page.article.datePublished)}  `);
  out.push(`Updated: ${page.updated ? humanDate(page.updated) : updatedHuman()}`);
  out.push('');
  if (page.tldr) {
    out.push('**Short answer:** ' + mdfmt(page.tldr));
    out.push('');
  }

  for (const s of page.sections || []) {
    switch (s.type) {
      case 'prose':
        (Array.isArray(s.paras) ? s.paras : [s.paras]).forEach((p) => { out.push(mdfmt(p)); out.push(''); });
        break;
      case 'qa':
        out.push(`## ${s.q}`); out.push('');
        (Array.isArray(s.a) ? s.a : [s.a]).forEach((p) => { out.push(mdfmt(p)); out.push(''); });
        break;
      case 'bullets':
        out.push(`## ${s.h2}`); out.push('');
        if (s.intro) { out.push(mdfmt(s.intro)); out.push(''); }
        s.items.forEach((i) => out.push(`- ${mdfmt(i)}`));
        out.push('');
        break;
      case 'features':
        out.push(`## ${s.h2}`); out.push('');
        if (s.intro) { out.push(mdfmt(s.intro)); out.push(''); }
        s.cards.forEach((c) => { out.push(`### ${c.title}`); out.push(''); out.push(mdfmt(c.body)); out.push(''); });
        break;
      case 'steps':
        out.push(`## ${s.h2}`); out.push('');
        if (s.intro) { out.push(mdfmt(s.intro)); out.push(''); }
        s.steps.forEach((st, i) => { out.push(`${i + 1}. **${st.title}** — ${mdfmt(st.body)}`); });
        out.push('');
        break;
      case 'table':
        out.push(`## ${s.h2}`); out.push('');
        if (s.intro) { out.push(mdfmt(s.intro)); out.push(''); }
        out.push(`| ${s.head.join(' | ')} |`);
        out.push(`| ${s.head.map(() => '---').join(' | ')} |`);
        s.rows.forEach((r) => out.push(`| ${r.map((c) => mdfmt(c).replaceAll('|', '\\|')).join(' | ')} |`));
        out.push('');
        if (s.note) { out.push(`_${mdfmt(s.note)}_`); out.push(''); }
        break;
      case 'downloads':
        out.push(`## ${s.h2}`); out.push('');
        if (s.intro) { out.push(mdfmt(s.intro)); out.push(''); }
        s.files.forEach((f) => out.push(`- [${f.label}](${SITE.origin}${f.url}) — ${f.desc}`));
        out.push('');
        if (s.note) { out.push(mdfmt(s.note)); out.push(''); }
        break;
      case 'callout':
        if (s.title) { out.push(`## ${s.title}`); out.push(''); }
        out.push(mdfmt(s.body)); out.push('');
        break;
      case 'quotes':
        out.push(`## ${s.h2}`); out.push('');
        if (s.intro) { out.push(mdfmt(s.intro)); out.push(''); }
        s.quotes.forEach((q) => { out.push(`> "${mdfmt(q.text)}"`); out.push(`> — ${q.who}${q.role ? `, ${q.role}` : ''}`); out.push(''); });
        if (s.note) { out.push(`_${mdfmt(s.note)}_`); out.push(''); }
        break;
      case 'twocol':
        out.push(`## ${s.left.h2}`); out.push('');
        s.left.items.forEach((i) => out.push(`- ${mdfmt(i)}`)); out.push('');
        out.push(`## ${s.right.h2}`); out.push('');
        s.right.items.forEach((i) => out.push(`- ${mdfmt(i)}`)); out.push('');
        break;
      case 'figure':
        out.push(`_${mdfmt(s.caption)}_`); out.push('');
        break;
      case 'image':
        out.push(`_${mdfmt(s.caption)}_`); out.push('');
        break;
      default:
        break;
    }
  }

  if (page.faq && page.faq.length) {
    out.push(`## ${page.faqHeading || 'Frequently asked questions'}`); out.push('');
    page.faq.forEach(([q, a]) => { out.push(`### ${q}`); out.push(''); out.push(mdfmt(a)); out.push(''); });
  }

  // A silo CTA with its own destination (aeoGeo: the free scan) reaches the twin too, since the
  // .md is what answer engines read. Pages without cta.href render exactly as before.
  if (page.cta?.href) {
    out.push(`**${page.cta.button}:** ${page.cta.href}`); out.push('');
  }

  const related = page.related || (page.key ? relatedFor(page.key) : []);
  if (related.length) {
    out.push('## Related'); out.push('');
    related.forEach((l) => out.push(`- [${l.text}](${l.href.startsWith('http') ? l.href : SITE.origin + l.href})`));
    out.push('');
  }

  out.push('---');
  out.push(page.cta?.href
    ? `AutoLander: AEO and GEO for car dealers. ${SITE.origin}${NAV.aiVisibility.path}`
    : `AutoLander — Facebook Marketplace software for car dealers. ${SITE.origin}/`);
  out.push('');
  return out.join('\n');
}

// ---------- supplemental stylesheet (new components; base comes from /compare/styles.css) ----------
export const SEO_STYLES = `/* SEO silo supplemental styles — base in /compare/styles.css */
.topnav{display:flex;align-items:center;gap:14px;white-space:nowrap}
.topnav a{color:var(--text);font-size:13px;font-weight:700}
.navdrop{position:relative;color:var(--text);font-size:13px;font-weight:700}
.navdrop summary{cursor:pointer;list-style:none}.navdrop summary::-webkit-details-marker{display:none}
.navdrop summary::after{content:"+";margin-left:5px;color:var(--blue2)}.navdrop[open] summary::after{content:"\\2212"}
.navdrop-menu{position:absolute;z-index:20;right:0;top:calc(100% + 10px);display:grid;width:200px;gap:2px;padding:7px;border:1px solid var(--line);border-radius:14px;background:rgba(5,5,5,.94);box-shadow:0 18px 45px rgba(0,0,0,.5)}
.navdrop-menu a{display:block;padding:7px 9px;border-radius:9px;color:var(--text);font-size:13px}.navdrop-menu a:hover{background:rgba(255,255,255,.08);text-decoration:none}
.prose-block p{font-size:16px;color:var(--text);margin:0 0 14px}
.qa{margin-top:8px}
.qa h2{margin-bottom:8px}
.qa p{color:var(--text);margin:0 0 12px}
.sec-intro{color:var(--muted);margin:0 0 14px;font-size:15.5px}
.feature-wrap{margin-top:36px}
.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px}
.feature-card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 20px}
.feature-card h3{margin:0 0 6px;font-size:16px}
.feature-card p{margin:0;color:var(--muted);font-size:14.5px}
.steps-wrap{margin-top:36px}
.steps{counter-reset:s;list-style:none;margin:0;padding:0;display:grid;gap:12px}
.steps li{counter-increment:s;position:relative;background:var(--panel);border:1px solid var(--line);
border-radius:14px;padding:16px 18px 16px 56px}
.steps li::before{content:counter(s);position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:8px;
background:rgba(59,130,246,.16);color:var(--blue2);font-weight:900;display:flex;align-items:center;justify-content:center;font-size:14px}
.step-h{display:block;font-weight:700;color:#fff;margin-bottom:3px}
.step-b{display:block;color:var(--muted);font-size:14.5px}
.callout{margin:22px 0;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.28);border-radius:14px;padding:16px 20px}
.callout h3{margin:0 0 6px;font-size:15px;color:var(--blue2)}
.callout p{margin:0;color:#e6eefc;font-size:14.5px}
/* customer quotes (type:'quotes') — plain, attributed, no rating UI on purpose */
.quotes{margin:26px 0}
.quotes h2{margin:0 0 12px}
.quote-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.quote{margin:0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px}
.quote blockquote{margin:0;font-size:15px;line-height:1.55;color:#e6eefc}
.quote blockquote p{margin:0}
.quote blockquote p::before{content:"\\201C"}
.quote blockquote p::after{content:"\\201D"}
.quote figcaption{margin-top:10px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#93a4c3}
.quote-role{display:block;margin-top:2px;font-weight:500;letter-spacing:0;text-transform:none;color:#7f8fab}
.table-section{margin-top:36px}
.feature-card h3,.step-h{letter-spacing:-.01em}
.shot-single .shot-imgs{grid-template-columns:1fr;max-width:680px;margin:0 auto}
.cmp caption{caption-side:top;text-align:left;padding:0 0 10px;color:var(--muted);font-size:13px;font-weight:600;letter-spacing:.01em}
.downloads{margin-top:36px}
.download-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:10px}
.download-list a{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;background:var(--panel);
border:1px solid var(--line);border-radius:14px;padding:14px 18px;text-decoration:none}
.download-list a:hover{border-color:var(--blue2)}
.dl-fmt{font-weight:800;color:var(--blue2);font-size:14.5px}
.dl-desc{color:var(--muted);font-size:14px}
/* column footer (pages with their own footer, e.g. the AEO and GEO articles) */
.foot-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 28px;margin:0 0 20px}
.foot-col{display:flex;flex-direction:column;align-items:flex-start;gap:7px;min-width:0}
.foot-h{margin:0 0 3px;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.foot-col a{font-size:13px;font-weight:700;color:var(--muted)}
@media(max-width:640px){.topnav{gap:10px}.topnav a{font-size:12px}.feature-grid{grid-template-columns:1fr}.foot-cols{grid-template-columns:1fr 1fr}}
`;
