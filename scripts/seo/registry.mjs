// Central link-graph + sitemap registry for the SEO silo. SINGLE SOURCE OF TRUTH.
// Owned by the orchestrator — content data modules never edit this. Drives:
//   • the unified sitemap.xml,
//   • relatedLinks() interlinking on every page,
//   • breadcrumbs.
// Anchors are descriptive + keyword-rich (used as visible anchor text in the silo).

import { SITE } from '../compare-data.mjs';
import { AI_VISIBILITY_PATH } from '../../shared/ai-visibility-route.js';
import { PAID_ADS_PATH } from '../../shared/paid-ads-route.js';
import { WEBSITE_PATH } from '../../shared/dealer-websites-route.js';

export { SITE };

// Money + hub destinations (existing + new). `path` is the live URL (trailing slash).
export const NAV = {
  home:       { key: 'home',      path: '/',                                          anchor: 'AutoLander — Facebook Marketplace auto poster for car dealers' },
  category:   { key: 'category',  path: '/facebook-marketplace-auto-poster/',         anchor: 'Facebook Marketplace auto poster for car dealers' },
  compareHub: { key: 'compareHub',path: '/compare/',                                  anchor: 'Best Facebook Marketplace auto-posting tools (2026 comparison)' },
  integHub:   { key: 'integHub',  path: '/integrations/',                             anchor: 'Facebook Marketplace integrations & DMS feeds' },
  guide:      { key: 'guide',     path: '/guide/facebook-marketplace-automation/',    anchor: 'Guide: Facebook Marketplace automation (the honest version)' },
  sellGuide:  { key: 'sellGuide', path: '/guide/how-to-sell-cars-on-facebook-marketplace/', anchor: 'How to sell cars on Facebook Marketplace' },
  inventory:  { key: 'inventory', path: '/facebook-marketplace-inventory-sync/',      anchor: 'Facebook Marketplace inventory sync & feed' },
  bulk:       { key: 'bulk',      path: '/bulk-post-cars-to-facebook-marketplace/',   anchor: 'Bulk post cars to Facebook Marketplace' },
  safety:     { key: 'safety',    path: '/safest-facebook-marketplace-auto-poster/',  anchor: 'Safest Facebook Marketplace auto poster' },
  pricing:    { key: 'pricing',   path: '/facebook-marketplace-auto-poster-pricing/', anchor: 'Facebook Marketplace auto poster pricing' },
  listingSw:  { key: 'listingSw', path: '/facebook-marketplace-listing-software/',    anchor: 'Facebook Marketplace listing software & tools' },
  fbListing:  { key: 'fbListing', path: '/facebook-listing-software/',                anchor: 'Facebook listing software & tool' },
  dealers:    { key: 'dealers',   path: '/facebook-marketplace-for-car-dealers/',     anchor: 'Facebook Marketplace for car dealers' },
  aiTools:    { key: 'aiTools',   path: '/facebook-ai-tools/',                         anchor: 'Facebook AI tools for car dealers' },
  automation: { key: 'automation',path: '/facebook-marketplace-automation/',          anchor: 'Facebook Marketplace automation' },
  assistant:  { key: 'assistant', path: '/facebook-marketplace-assistant/',           anchor: 'Facebook Marketplace assistant' },
  autoposter: { key: 'autoposter',path: '/facebook-autoposter/',                       anchor: 'Facebook autoposter' },
  // ---- Dealer-growth silo (2026-08-20): informational hub + spokes that funnel dealer-persona
  // searches (marketing / leads / social / AI) down to the money pages and the homepage. ----
  mktgHub:    { key: 'mktgHub',    path: '/guide/car-dealership-marketing/',           anchor: 'Car dealership marketing: the 2026 playbook' },
  mktgIdeas:  { key: 'mktgIdeas',  path: '/guide/car-dealership-marketing-ideas/',     anchor: 'Car dealership marketing ideas that sell cars' },
  salesLeads: { key: 'salesLeads', path: '/guide/car-sales-leads/',                    anchor: 'How to get more car sales leads' },
  socialMedia:{ key: 'socialMedia',path: '/guide/social-media-for-car-dealers/',       anchor: 'Social media for car dealers' },
  sellMore:   { key: 'sellMore',   path: '/guide/how-to-sell-more-cars/',              anchor: 'How to sell more cars' },
  aiDealers:  { key: 'aiDealers',  path: '/guide/ai-for-car-dealerships/',             anchor: 'AI for car dealerships: what actually works' },
  // The AEO and GEO page (was /ai-visibility/, which now 301s here; the URL lives in shared/ai-visibility-route.js).
  aiVisibility:{ key: 'aiVisibility', path: AI_VISIBILITY_PATH,                          anchor: 'AEO and GEO for car dealers: free AI Visibility Scan and plans', spa: true },
  // Paid ads + AI commercials for car dealers (the third Services entry; the URL lives in shared/paid-ads-route.js).
  paidAds:     { key: 'paidAds',     path: PAID_ADS_PATH,                               anchor: 'Meta ads and AI commercials for car dealers: free commercial, plans', spa: true },
  dealerWebsites: { key: 'dealerWebsites', path: WEBSITE_PATH,                         anchor: 'Dealership websites with SEO and AI-search foundations', spa: true },
  aiChat:     { key: 'aiChat',     path: '/ai-chat-for-car-dealers/',                  anchor: 'AI chat for car dealers — the honest guide' },
  photoEditor:{ key: 'photoEditor',path: '/ai-car-photo-editor/',                      anchor: 'AI car photo editor for dealers' },
  rvDealers:  { key: 'rvDealers',  path: '/rv-dealer-software/',                       anchor: 'RV dealer software for Facebook Marketplace' },
  report2026: { key: 'report2026', path: '/facebook-marketplace-used-car-report-2026/', anchor: 'Facebook Marketplace Used-Car Report 2026 (original data)' },
  // Author + publisher entity page. The Person @id referenced by every Article/Dataset node
  // resolves here, so this page must exist for the attribution graph to hold together.
  about:      { key: 'about',      path: '/about/',                                    anchor: 'About AutoLander — who we are and how our data is produced' },
  // Trust anchor. AI agents check /about, /contact and /privacy before recommending a vendor,
  // and a mailto: in a footer does not read as a real contact channel to a crawler that cannot
  // click it. This page states the legal entity, postal address, phone and email in crawlable
  // text and mirrors the `address` + `contactPoint` on the Organization node.
  contact:    { key: 'contact',    path: '/contact/',                                  anchor: 'Contact AutoLander — sales, support and media' },
  // Customer training library (2026-09-22). A STATIC mirror under public/training/ generated by
  // scripts/training/build-training-mirror.mjs (npm run training:build) - deliberately NOT a PAGES
  // entry, so no generator ever overwrites it; registered here for the footer, sitemap and the
  // link allow-lists (home directory + article tests) that derive from NAV.
  training:   { key: 'training',   path: '/training/',                                 anchor: 'AutoLander training' },
  blog:       { key: 'blog',       path: '/blog/',                                     anchor: 'AutoLander blog: Facebook Marketplace playbooks for car dealers' },
  // ---- Discovery + cluster pages (2026-09-03 SEO diagnostic). ----
  // Two positioning pages turn deliberate scope choices (Marketplace-only, no buyer auto-reply)
  // from feature-matrix absences into stated principles; the inventory page takes the one
  // classical-demand cluster the site can win ("dealer inventory management", KD 3–6) from the
  // merchandising angle, never as a DMS; the four guides give /rv-dealer-software/ and
  // /ai-chat-for-car-dealers/ the cluster support they had none of.
  whyMarketplaceOnly: { key: 'whyMarketplaceOnly', path: '/why-facebook-marketplace-only/',        anchor: 'Why AutoLander posts to Facebook Marketplace only' },
  whyNoAutoReply:     { key: 'whyNoAutoReply',     path: '/why-we-dont-answer-your-buyers/',        anchor: 'Why AutoLander does not answer your buyers for you' },
  inventoryDist:      { key: 'inventoryDist',      path: '/dealer-inventory-management/',           anchor: 'Dealer inventory management: getting cars from the DMS to buyers' },
  rvSellGuide:        { key: 'rvSellGuide',        path: '/guide/how-to-sell-rvs-on-facebook-marketplace/', anchor: 'How to sell RVs on Facebook Marketplace as a dealer' },
  rvPhotos:           { key: 'rvPhotos',           path: '/guide/rv-photos-for-facebook-marketplace/',      anchor: 'RV photos that sell on Facebook Marketplace' },
  aiChatVendor:       { key: 'aiChatVendor',       path: '/guide/questions-to-ask-an-ai-chat-vendor/',      anchor: 'Questions to ask any AI chat vendor before you connect your inbox' },
  responseTime:       { key: 'responseTime',       path: '/guide/marketplace-response-time-for-car-dealers/', anchor: 'Marketplace response time: why the first reply wins the appointment' },
};

// Exact-path SPA marketing pages with dedicated build-time shells. These count as valid internal
// targets, but the standalone SEO page renderer must never overwrite their route directories.
export const SPA_PAGE_PATHS = [
  ...Object.values(NAV).filter((item) => item.spa).map((item) => item.path),
  '/team/',
];

// Integration spokes. `system` = how AutoLander connects (honest):
//   'feed'   -> named, directly supported feed source (CarGurus, Cars.com)
//   'custom' -> ingested via a custom feed / export from that system (DMS / website providers)
export const INTEGRATIONS = [
  { slug: 'cargurus-facebook-marketplace',    name: 'CarGurus',     system: 'feed',   kind: 'Inventory marketplace / feed', anchor: 'CarGurus to Facebook Marketplace' },
  { slug: 'cars-com-facebook-marketplace',    name: 'Cars.com',     system: 'feed',   kind: 'Inventory marketplace / feed', anchor: 'Cars.com to Facebook Marketplace' },
  { slug: 'vauto-facebook-marketplace',       name: 'vAuto',        system: 'custom', kind: 'Inventory management (Cox Automotive)', anchor: 'vAuto to Facebook Marketplace' },
  { slug: 'dealercenter-facebook-marketplace',name: 'DealerCenter', system: 'custom', kind: 'Dealer management system (DMS)', anchor: 'DealerCenter to Facebook Marketplace' },
  { slug: 'dealer-com-facebook-marketplace',  name: 'Dealer.com',   system: 'custom', kind: 'Dealer website platform (Cox Automotive)', anchor: 'Dealer.com to Facebook Marketplace' },
  { slug: 'homenet-facebook-marketplace',     name: 'HomeNet',      system: 'custom', kind: 'Inventory management (Cox Automotive)', anchor: 'HomeNet to Facebook Marketplace' },
  { slug: 'frazer-facebook-marketplace',      name: 'Frazer',       system: 'custom', kind: 'Dealer management system (DMS)', anchor: 'Frazer to Facebook Marketplace' },
  { slug: 'cdk-facebook-marketplace',         name: 'CDK Global',   system: 'custom', kind: 'Dealer management system (DMS)', anchor: 'CDK to Facebook Marketplace' },
  { slug: 'tekion-facebook-marketplace',      name: 'Tekion',       system: 'custom', kind: 'Cloud dealer management system (DMS)', anchor: 'Tekion to Facebook Marketplace' },
];

export const integrationPath = (slug) => `/integrations/${slug}/`;
export const integrationUrl = (slug) => `${SITE.origin}/integrations/${slug}/`;

// ---- relatedLinks: the silo interlinking rules. Returns [{href, text}] for a page key. ----
// Keeps anchors keyword-rich and routes authority toward money + hubs.
const L = (nav) => ({ href: nav.path, text: nav.anchor });

export function relatedFor(pageKey, opts = {}) {
  const N = NAV;
  switch (pageKey) {
    case 'category':
      return [L(N.aiTools), L(N.listingSw), L(N.automation), L(N.assistant), L(N.autoposter), L(N.dealers), L(N.sellGuide), L(N.fbListing), L(N.inventory), L(N.inventoryDist), L(N.bulk), L(N.integHub), L(N.safety), L(N.pricing), L(N.compareHub), L(N.guide), L(N.whyMarketplaceOnly), L(N.mktgHub), L(N.rvDealers), L(N.report2026)];
    case 'inventory':
      return [L(N.inventoryDist), L(N.listingSw), L(N.bulk), L(N.integHub), L(N.category), L(N.compareHub), L(N.pricing), L(N.guide)];
    case 'bulk':
      return [L(N.listingSw), L(N.dealers), L(N.inventory), L(N.integHub), L(N.category), L(N.safety), L(N.compareHub), L(N.pricing)];
    case 'safety':
      return [L(N.guide), L(N.compareHub), L(N.category), L(N.dealers), L(N.inventory), L(N.pricing)];
    case 'pricing':
      return [L(N.compareHub), L(N.category), L(N.listingSw), L(N.bulk), L(N.inventory), L(N.safety)];
    case 'integHub':
      // Hub → every spoke, explicitly. The spokes already link up to the hub (siblingSpokes +
      // relatedFor('integrationSpoke')); without this the nine integration pages sat at 3–4
      // inbound links each and returned nothing on `site:` sampling.
      return [
        ...INTEGRATIONS.map((s) => ({ href: integrationPath(s.slug), text: s.anchor })),
        L(N.inventory), L(N.inventoryDist), L(N.bulk), L(N.listingSw), L(N.dealers), L(N.category), L(N.compareHub), L(N.pricing), L(N.guide),
      ];
    case 'compareHub':
      // Same principle for the comparison cluster: the hub names every head-to-head page.
      return [
        { href: '/compare/carvid/', text: 'AutoLander vs CARVID' },
        { href: '/compare/drift/', text: 'AutoLander vs Sell With Drift' },
        { href: '/compare/relayauto/', text: 'AutoLander vs RelayAuto' },
        { href: '/compare/autolisterpro/', text: 'AutoLander vs AutoLister Pro' },
        { href: '/compare/shiftly/', text: 'AutoLander vs Shiftly' },
        { href: '/compare/autobook/', text: 'AutoLander vs AutoBook.io' },
        { href: '/compare/glo3d/', text: 'AutoLander vs Glo3D' },
        L(N.category), L(N.pricing), L(N.safety), L(N.guide), L(N.whyMarketplaceOnly), L(N.whyNoAutoReply),
      ];
    // ---- new high-value commercial cluster (listing/posting software, fb listing, dealers use-case) ----
    case 'listingSw':
      return [L(N.category), L(N.dealers), L(N.fbListing), L(N.bulk), L(N.inventory), L(N.compareHub), L(N.pricing)];
    case 'fbListing':
      return [L(N.listingSw), L(N.category), L(N.dealers), L(N.inventory), L(N.compareHub), L(N.pricing), L(N.guide)];
    case 'dealers':
      return [L(N.sellGuide), L(N.category), L(N.whyMarketplaceOnly), L(N.whyNoAutoReply), L(N.listingSw), L(N.bulk), L(N.inventory), L(N.inventoryDist), L(N.safety), L(N.compareHub), L(N.pricing), L(N.mktgHub), L(N.aiChat)];
    // ---- educational hub (aiTools) pushes DOWN to every commercial page; commercial pages link up + across ----
    case 'aiTools':
      return [L(N.category), L(N.listingSw), L(N.automation), L(N.assistant), L(N.autoposter), L(N.fbListing), L(N.dealers), L(N.bulk), L(N.inventory), L(N.compareHub), L(N.photoEditor), L(N.aiChat), L(N.aiDealers), L(N.aiVisibility)];
    case 'automation':
      return [L(N.category), L(N.aiTools), L(N.assistant), L(N.autoposter), L(N.bulk), L(N.safety), L(N.guide), L(N.sellGuide), L(N.compareHub), L(N.pricing)];
    case 'assistant':
      return [L(N.category), L(N.aiTools), L(N.listingSw), L(N.automation), L(N.autoposter), L(N.compareHub), L(N.pricing), L(N.aiChat)];
    case 'autoposter':
      return [L(N.category), L(N.listingSw), L(N.automation), L(N.aiTools), L(N.dealers), L(N.compareHub), L(N.pricing)];
    case 'integrationSpoke': {
      // siblings (2-3) + hub + inventory + category + home handled by caller via siblingSpokes()
      return [L(N.integHub), L(N.inventory), L(N.bulk), L(N.category), L(N.compareHub), L(N.pricing)];
    }
    // ---- Dealer-growth silo. Hub <-> spokes are bidirectional; every informational spoke
    // descends to at least one money page; money pages link up, across and to pricing. ----
    case 'mktgHub':
      return [L(N.report2026), L(N.mktgIdeas), L(N.salesLeads), L(N.socialMedia), L(N.sellMore), L(N.aiDealers), L(N.aiVisibility), L(N.aiChat), L(N.photoEditor), L(N.category), L(N.dealers)];
    case 'mktgIdeas':
      return [L(N.mktgHub), L(N.socialMedia), L(N.salesLeads), L(N.sellMore), L(N.photoEditor), L(N.category), L(N.dealers)];
    case 'salesLeads':
      return [L(N.aiChat), L(N.mktgHub), L(N.sellMore), L(N.socialMedia), L(N.category), L(N.assistant), L(N.dealers)];
    case 'socialMedia':
      return [L(N.category), L(N.mktgHub), L(N.mktgIdeas), L(N.bulk), L(N.photoEditor), L(N.aiChat), L(N.sellGuide)];
    case 'sellMore':
      return [L(N.mktgHub), L(N.salesLeads), L(N.aiChat), L(N.photoEditor), L(N.category), L(N.sellGuide), L(N.dealers)];
    case 'aiDealers':
      return [L(N.aiVisibility), L(N.aiChat), L(N.photoEditor), L(N.aiTools), L(N.assistant), L(N.mktgHub), L(N.category), L(N.automation)];
    case 'aiVisibility':
      return [L(N.about), L(N.contact), L(N.aiDealers), L(N.mktgHub)];
    case 'aiChat':
      return [L(N.whyNoAutoReply), L(N.aiChatVendor), L(N.responseTime), L(N.aiDealers), L(N.aiVisibility), L(N.salesLeads), L(N.assistant), L(N.category), L(N.dealers), L(N.pricing), L(N.mktgHub)];
    case 'photoEditor':
      return [L(N.aiDealers), L(N.aiTools), L(N.category), L(N.listingSw), L(N.mktgHub), L(N.bulk), L(N.pricing)];
    case 'rvDealers':
      return [L(N.rvSellGuide), L(N.rvPhotos), L(N.category), L(N.inventory), L(N.bulk), L(N.photoEditor), L(N.dealers), L(N.safety), L(N.pricing), L(N.compareHub)];
    case 'report2026':
      return [L(N.mktgHub), L(N.category), L(N.dealers), L(N.salesLeads), L(N.sellMore), L(N.photoEditor), L(N.inventory)];
    // ---- Positioning pages: each descends to the money page it defends and across to its twin. ----
    case 'whyMarketplaceOnly':
      return [L(N.whyNoAutoReply), L(N.category), L(N.dealers), L(N.bulk), L(N.inventory), L(N.safety), L(N.compareHub), L(N.pricing)];
    case 'whyNoAutoReply':
      return [L(N.aiChat), L(N.whyMarketplaceOnly), L(N.responseTime), L(N.aiChatVendor), L(N.category), L(N.dealers), L(N.safety), L(N.pricing)];
    // ---- Inventory-distribution page: the merchandising wedge; up to category, across to the feed pages. ----
    case 'inventoryDist':
      return [L(N.inventory), L(N.integHub), L(N.category), L(N.bulk), L(N.listingSw), L(N.dealers), L(N.report2026), L(N.pricing)];
    // ---- RV cluster: siblings + pillar + the money pages an RV dealer needs. ----
    case 'rvSellGuide':
      return [L(N.rvDealers), L(N.rvPhotos), L(N.category), L(N.inventory), L(N.safety), L(N.sellGuide), L(N.pricing)];
    case 'rvPhotos':
      return [L(N.rvDealers), L(N.rvSellGuide), L(N.photoEditor), L(N.category), L(N.listingSw), L(N.pricing)];
    // ---- AI-chat cluster: siblings + pillar + the positioning page that states the principle. ----
    case 'aiChatVendor':
      return [L(N.aiChat), L(N.whyNoAutoReply), L(N.responseTime), L(N.aiDealers), L(N.salesLeads), L(N.category), L(N.pricing)];
    case 'responseTime':
      return [L(N.aiChat), L(N.whyNoAutoReply), L(N.aiChatVendor), L(N.salesLeads), L(N.sellMore), L(N.category), L(N.dealers)];
    // ---- The policy guide meshes with its category siblings ("Related guides"). ----
    case 'guide':
      return [L(N.safety), L(N.sellGuide), L(N.whyMarketplaceOnly), L(N.whyNoAutoReply), L(N.category), L(N.automation), L(N.compareHub), L(N.pricing)];
    default:
      return [L(N.category), L(N.compareHub), L(N.integHub), L(N.guide), L(N.sellGuide), L(N.mktgHub)];
  }
}

// Pick up to n sibling integration spokes for a given slug (round-robin neighbours).
export function siblingSpokes(slug, n = 3) {
  const i = INTEGRATIONS.findIndex((x) => x.slug === slug);
  const out = [];
  for (let k = 1; out.length < n && k < INTEGRATIONS.length; k++) {
    const s = INTEGRATIONS[(i + k) % INTEGRATIONS.length];
    if (s.slug !== slug) out.push({ href: integrationPath(s.slug), text: `${s.anchor}` });
  }
  return out;
}

// ---- Pillar topology (2026-09-03). The link graph above already encodes which page belongs to
// which silo, but only implicitly, through anchor placement. PILLAR_OF states it once, explicitly,
// so two machine-readable surfaces can be derived from it without re-deriving the topology:
//   • Article.isPartOf → the parent pillar's WebPage @id (schema/JSON-LD),
//   • article:section on the OpenGraph layer.
// A key absent from this map is its own pillar (category, listingSw, dealers, mktgHub, photoEditor,
// rvDealers, aiChat, compareHub, integHub, report2026, about, contact).
export const PILLAR_OF = {
  // money silo → the auto-poster category page
  bulk: 'category', autoposter: 'category', automation: 'category', safety: 'category',
  pricing: 'category', guide: 'category', aiTools: 'category',
  // listing-software silo
  fbListing: 'listingSw', assistant: 'listingSw', inventory: 'listingSw',
  // dealer use-case silo
  sellGuide: 'dealers',
  // dealer-growth silo
  mktgIdeas: 'mktgHub', salesLeads: 'mktgHub', socialMedia: 'mktgHub', sellMore: 'mktgHub',
  aiDealers: 'mktgHub',
  // 2026-09-03 discovery + cluster pages
  whyMarketplaceOnly: 'dealers', whyNoAutoReply: 'aiChat', inventoryDist: 'category',
  rvSellGuide: 'rvDealers', rvPhotos: 'rvDealers',
  aiChatVendor: 'aiChat', responseTime: 'aiChat',
};

// Short human labels for article:section (the pillar anchors above are full sentences).
export const SECTION_LABEL = {
  category: 'Facebook Marketplace auto posting',
  listingSw: 'Facebook Marketplace listing software',
  dealers: 'Facebook Marketplace for car dealers',
  mktgHub: 'Car dealership marketing',
  photoEditor: 'Car photography & merchandising',
  integHub: 'Integrations',
  compareHub: 'Comparisons',
  rvDealers: 'RV dealer software',
  aiChat: 'AI chat for car dealers',
  aiTools: 'Facebook AI tools',
  aiVisibility: 'AEO and GEO for car dealers',
  report2026: 'Original research',
  home: 'AutoLander',
};

// Resolve a page object to its pillar {key, url, name, section}. Explicit PILLAR_OF wins; otherwise
// the visible breadcrumb parent (every page on the site renders one, and it is exactly the
// "belongs to" relationship a reader sees), unless that parent is Home — a top-level page's
// pillar is itself, and a node declaring itself part of itself is noise, so return null.
export function pillarFor(page) {
  const explicit = page.key && PILLAR_OF[page.key];
  if (explicit && NAV[explicit]) {
    const n = NAV[explicit];
    return { key: explicit, url: SITE.origin + n.path, name: n.anchor, section: SECTION_LABEL[explicit] || n.anchor };
  }
  const bc = page.breadcrumbs || [];
  const parent = bc.length >= 2 ? bc[bc.length - 2] : null;
  if (!parent || !parent.url || parent.url === SITE.origin + '/') return null;
  const navKey = Object.keys(NAV).find((k) => SITE.origin + NAV[k].path === parent.url);
  return {
    key: navKey || null,
    url: parent.url,
    name: parent.name,
    section: (navKey && SECTION_LABEL[navKey]) || parent.name,
  };
}

// Sitemap is assembled in ONE place — scripts/build-seo-pages.mjs (the single sitemap/robots writer).
// build-compare-pages.mjs no longer writes sitemap/robots (avoids two writers drifting/clobbering).
