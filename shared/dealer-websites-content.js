// shared/dealer-websites-content.js  (authored by Claude; copy changes go through Claude)
//
// The ONE source of every customer-facing string on /dealership-websites/ (custom dealership websites built
// for SEO and AI search, on the dealer's own domain; the URL lives in ./dealer-websites-route.js).
// Consumers (all must import from here, never restate a string; no fee or price appears anywhere on the page):
//   src/websites/DealerWebsitesApp.jsx, src/websites/website-request.js  (React page)
//   src/websites/static-mirror.js                                      (build-time no-JS HTML)
//   scripts/seo/data-dealer-websites.mjs                               (head, JSON-LD)
//   test/dealer-websites-*.test.js                                     (drift + copy lint)
//
// PUBLIC REPO: customer-facing copy only.
//
// MODULE RULES (tests enforce them):
//   * `export const` data only; no side effects at module scope;
//   * no JSX, no class names, no window / document / import.meta;
//   * copy: no em or en dashes, no "not X. It's Y." cadence, no "X, not Y" contrast lines, no hype words, no
//     competitor names, no result promises, no dollar figures at all (price and timing are quoted in the written
//     scope and never on the page).
//
// PROOF RULE (Michael 2026-10-16, every public service page): no figure from our own website, analytics, CRM or
// speed tests appears on this page: no lead counts, traffic, speed scores or conversion figures. Competitors read
// this page, and a dealer must never read our result as a forecast for theirs. Proof is the dealership count
// (200+ paying accounts) plus qualitative points about our own site.
//
// DEALER RULE (Michael 2026-10-21): no dealership, real or fictional, is named on this page or in its illustrations.
// The illustrations show a neutral "Your Dealership" template with debadged vehicles labeled by body style, so
// nothing implies we built a real store's site. No manufacturer marks or model names, and no price, mileage,
// rating or review count. Every illustration is captioned as a website concept drawn for this page.

import { WEBSITE_FORM_ID, WEBSITE_PATH } from './dealer-websites-route.js';

export const WEBSITE_PUBLISHED = '2026-10-22';
export const WEBSITE_UPDATED = '2026-10-22'; // SET TO THE ACTUAL SHIP DATE
export const WEBSITE_UPDATED_HUMAN = 'October 22, 2026';

export const META = {
  title: 'Dealership Websites for SEO and AI Search | AutoLander',
  description: 'Custom dealership websites on your own domain. Fast vehicle pages a buyer can use and an AI assistant can quote, built like our own site. Apply for a plan.',
  ogTitle: 'A dealership website built to be found.',
  ogDescription: 'Fast vehicle pages on your own domain that buyers, Google and AI assistants can all read. Built the way we built autolander.ai.',
  ogImageAlt: 'Illustration of a dealership website concept on a laptop and a phone',
  breadcrumb: 'Dealership Websites',
};

export const SERVICE_SUMMARY = 'Custom dealership website design and build on the dealer’s own domain: a readable page for every vehicle, mobile-first speed, lead paths into the dealer’s CRM, and the SEO and AI-search foundations AutoLander runs on its own site. Inventory, CRM, migration, hosting and support are confirmed in a written scope before work starts.';

// ---------- hero ----------
export const HERO = {
  eyebrow: 'Dealership websites · SEO and AI search · on your own domain',
  h1Lead: 'A dealership website',
  h1Grad: 'built to be found.',
  sub: 'Fast vehicle pages on your own domain that a buyer can use on a phone and an AI assistant can quote, built the way we built autolander.ai. Apply below and we scope it with you on a 20-minute call.',
  cta: 'Request my website plan',
  note: 'No templates and no multi-year lock-in. Scope, price and timing in writing before any work starts.',
  chips: ['Your own domain', 'Every vehicle its own page', 'Built like our own site', 'You keep everything', 'By application'],
};

// ---------- illustrations (a neutral website concept drawn for this page; see DEALER RULE above) ----------
// image = slug in shared/responsive-image-manifest.json (public/dealership-websites/<slug>-<width>.<avif|webp>).
export const ILLUSTRATIONS = {
  hero: { image: 'website-concept-hero', alt: 'Illustration of a dealership website concept on a laptop and a phone, with a homepage, vehicle cards and a vehicle page with call and text buttons', caption: 'Illustration of a website concept drawn for this page.' },
  vehicle: { image: 'website-vehicle-page', alt: 'Illustration of a phone-first vehicle page concept for a compact SUV, with call and text buttons at the top, vehicle facts and a short inquiry form' },
  readable: { image: 'website-ai-readable', alt: 'Illustration of a midsize sedan vehicle page concept beside a panel of what search engines and AI assistants can read' },
  caption: 'Illustrations of a website concept drawn for this page.',
};

// The shopper journey strip under the hero.
export const JOURNEY = {
  label: 'The three moments we build for',
  steps: ['Find your store', 'Read the vehicle', 'Reach your team'],
};

// ---------- proof (our own site and the dealership count; see PROOF RULE above: no figures of our own) ----------
export const PROOF = {
  eyebrow: 'Our own site is the proof',
  title: 'We built autolander.ai the way we would build yours.',
  lead: 'The search and speed foundations on this page run on our own website first. You are reading it.',
  // The dealership count is the only figure (paying accounts, the same count the paid-ads page shows).
  stats: [
    { value: '200+', label: 'dealerships run AutoLander', detail: 'paying accounts' },
  ],
  points: [
    { title: 'Found where buyers search', body: 'Dealers find us through Google, Bing, ChatGPT and Gemini, on pages built with the foundations on this page.' },
    { title: 'Measured before launch', body: 'We check speed, structure and crawl access on every page type before it goes live, on our own site and on yours.' },
    { title: 'Our own site first', body: 'A method reaches your website only after we have run it on the site that sells our own software.' },
  ],
  caption: 'Everything in this section is about AutoLander’s own website and business. It is not a forecast or a promise of what your store will get.',
};

// ---------- problem ----------
export const PROBLEM = {
  eyebrow: 'Why most dealer sites lose the buyer',
  title: 'Most dealer websites were built for a buyer who no longer exists.',
  body: 'Today the buyer checks you on a phone, in a search box and, more and more, in an AI chat. Most dealer sites were never built for any of the three.',
  items: [
    { title: 'A template with your logo on it.', body: 'Same layout as the lot across town, same stock photos, same widgets. The buyer cannot tell you apart, so price is the only thing left to compare.' },
    { title: 'Vehicle pages that fight the phone.', body: 'Slow to load, a carousel first, the facts somewhere below, the call button three scrolls down. The vehicle page is where the sale happens, and it is the page most providers treat as an afterthought.' },
    { title: 'Invisible to the new search.', body: 'When a buyer asks an AI assistant which dealers nearby have a clean half-ton truck in their budget, the assistant can only quote what it can read. Facts locked in images, scripts and iframes give it nothing.' },
    { title: 'Locked in, and nobody picks up.', body: 'A multi-year contract, a change request that takes weeks, and a site you do not actually own when you leave.' },
  ],
};

// ---------- what we build ----------
export const BUILD = {
  eyebrow: 'What we build',
  title: 'Your store. Your domain. Every vehicle its own page.',
  intro: 'Designed for your store from the first page. Every build includes all six.',
  items: [
    { number: '01', title: 'Built around your brand.', body: 'Designed around your store: your photos, your people, your market and the reasons a buyer should choose you. It looks like your dealership because it is built from it.', detail: 'Design and homepage' },
    { number: '02', title: 'A page for every vehicle.', body: 'Readable facts, clear photos, the price, and the call and text buttons at the top. Pages update from your inventory feed, so a sold car leaves and a new one arrives without anyone touching the site.', detail: 'Inventory and vehicle pages' },
    { number: '03', title: 'Built for the phone first.', body: 'Fast on the connection a buyer actually has on your lot or in a parking lot across town. We measure every page type before launch and show you the numbers.', detail: 'Speed and mobile' },
    { number: '04', title: 'Readable by Google and AI assistants.', body: 'Vehicle facts as page text, structured data for every vehicle and for the store, clean titles, sitemaps and crawl access. The same foundations our own site runs on.', detail: 'SEO and AI search' },
    { number: '05', title: 'Leads that reach your team.', body: 'Call, text and a short form on every page, each delivered to your CRM with the vehicle and the page that produced it. We test the whole path before launch.', detail: 'Lead paths and tracking' },
    { number: '06', title: 'You keep everything.', body: 'Your domain, your content, your data and your analytics. Support is month to month, with no multi-year lock-in. If you leave, the site goes with you.', detail: 'Ownership' },
  ],
  boundary: 'Inventory feeds and CRM connections depend on what your providers allow. We confirm both on the call, before anything is scoped.',
};

// ---------- SEO and AI search ----------
export const SEARCH = {
  eyebrow: 'SEO and AI search, built in',
  title: 'Beautiful for people. Readable for machines.',
  body: 'An AI assistant cannot recommend what it cannot read. Every page we build carries the same four foundations our own site runs on.',
  items: [
    ['Facts as text', 'Year, make, model, trim, mileage, price and features written as page text that an assistant can read and quote.'],
    ['Structured data', 'Vehicle, dealer, FAQ and breadcrumb markup that describes exactly what a shopper sees on the page.'],
    ['A clean structure', 'Descriptive titles, one URL per vehicle, sitemaps, canonical links and crawl access for the search engines and assistants that matter.'],
    ['Speed on a phone', 'Measured page by page before launch and watched after, because a slow page loses the buyer and the crawler alike.'],
  ],
  boundary: 'Search engines and AI assistants decide what they show and whom they cite. We build and test the foundations; no provider can promise rankings, recommendations or sales.',
  linkLabel: 'Read Google’s guidance on AI search',
  linkHref: 'https://developers.google.com/search/docs/appearance/ai-features',
};

// ---------- how it starts (process promises with dates we control) ----------
export const PROCESS = {
  eyebrow: 'How it starts',
  title: 'Know what is changing before anything changes.',
  steps: [
    { when: 'Day 0', title: 'Apply below.', body: 'Tell us about your store, your current site and what you want to change. Two minutes.' },
    { when: 'Within 2 business days', title: 'We call you.', body: 'A 20-minute call. We look at your site, your inventory source and your market, and tell you plainly whether a new site is your next dollar or whether something smaller is.' },
    { when: 'Within 5 business days of the call', title: 'A written scope.', body: 'Pages, design, inventory, CRM, migration, hosting, support, price and timing, in writing. Nothing starts until you approve it.' },
    { when: 'Before any code', title: 'You see the design.', body: 'Homepage and vehicle page designs on your real inventory, reviewed with you on a call.' },
    { when: 'Most builds: 4 to 8 weeks after approval', title: 'Launch with a checklist.', body: 'A redirect for every old URL that mattered, forms and lead delivery tested, tracking proven, speed measured, access and hosting handed to you.' },
  ],
  oem: { title: 'Franchise or OEM website requirements?', body: 'Tell us before the scope. Some programs require a certified provider for the main site and allow a second site on your own domain; some do not. We check your program and tell you on the call. This is not a claim of OEM certification or co-op approval.' },
};

// ---------- fit ----------
export const FIT = {
  eyebrow: 'Is this for your store?',
  title: 'Built for dealers who want a site they own.',
  goodTitle: 'A fit',
  good: [
    'Independent and franchise dealers, single stores and small groups',
    'Owners, GMs and marketing directors who can approve a scope',
    'Stores that want their own domain, content and data',
    'Dealers who can give us inventory-feed and CRM access during the build',
    'Stores paying a provider every month for a template they do not own',
  ],
  badTitle: 'Not a fit',
  bad: [
    'A rental template at the lowest monthly price',
    'A site built in a weekend without a scope',
    'A brand whose OEM program forbids a second site (we tell you on the call)',
    'Anyone who needs a promised ranking, lead count or sales number',
  ],
  line: 'If your store is not a fit, we say so on the call and point you to something that is.',
};

// ---------- promises ----------
export const PROMISES = {
  title: 'What we promise',
  items: [
    'We reply within two business days of your application.',
    'A written scope with price and timing before any work starts.',
    'Design review on your real inventory before any code.',
    'A redirect for every old URL that mattered, listed in the launch checklist.',
    'Every form, call and text path tested into your CRM before launch.',
    'Speed measured on every page type before launch, with the numbers shown to you.',
    'Your domain, content, data and analytics stay yours.',
  ],
};

export const NEVER_PROMISE = {
  title: 'What we never promise',
  items: [
    'A ranking, a position in an AI answer, or that an assistant will recommend you.',
    'A number of visits, leads, appointments or sales.',
    'That what works on our own website will work the same way for your store.',
    'OEM approval, co-op eligibility or affiliation with any manufacturer or platform.',
    'That your inventory provider or CRM will allow a connection before we have checked.',
  ],
};

// ---------- FAQ (the one question that uses the word dealers type is answered "No." and nothing else uses it) ----------
export const FAQ_HEADING = { eyebrow: 'Before you build', lead: 'Good questions.', grad: 'Straight answers.' };

export const FAQ = [
  { q: 'What does a dealership website cost, and how long does it take?', a: 'It depends on the pages, the inventory source, the connections and the migration. You get the price and the timing in writing in the scope, within five business days of our call, and nothing starts until you approve it. Most builds launch four to eight weeks after that approval. Sending the form does not place an order.' },
  { q: 'Do we own the website?', a: 'Yes. The domain stays in your name, the design and the content are yours, and your analytics and lead data are yours. Support is month to month. If you leave, the site goes with you.' },
  { q: 'Can you connect our inventory provider and our CRM?', a: 'Usually, and we confirm it before anything is scoped. We check what your inventory provider and your CRM allow, and any provider fees, on the call. Compatibility is written into the scope.' },
  { q: 'Will a new site hurt the search traffic we already have?', a: 'A move needs a plan: every old URL that matters gets a redirect, the content that earns traffic is carried over, and we watch the numbers after launch. Search traffic can move around during any migration. A planned move keeps that risk small, and you see the plan before you decide.' },
  { q: 'What does AI-search ready actually mean?', a: 'It means an AI assistant can read the page: vehicle facts as text, structured data that matches what the shopper sees, a clean page structure, crawl access and fast pages. That is the same work that makes a site useful for a person. What any assistant then says is its own decision.' },
  { q: 'Can you guarantee rankings, AI recommendations or sales?', allow: true, a: 'No. Search engines and AI assistants decide what they show and whom they cite. We build and test the foundations, show you the measurements, and never promise results.' },
  { q: 'Our brand has OEM website requirements. Can you still help?', a: 'Tell us before the scope. Some programs require a certified provider for the main site and allow a second site on your own domain; some do not. We check your program and tell you on the call. We do not claim OEM certification or co-op approval.' },
  { q: 'Why not just fix our current site?', a: 'Sometimes that is the right answer, and we will tell you if it is. If your provider lets you change the vehicle page, the speed and the structure, a smaller project may be your next dollar. If it does not, that is usually why you are here.' },
  { q: 'How is this different from your AEO and GEO service?', a: 'This service designs and builds the website itself. AEO and GEO works on how your dealership shows up in AI answers, on and off your site. Many stores need the site first. If you already like your site, the visibility work may be the better next step, and the call sorts that out.' },
  { q: 'Who hosts it, and what happens after launch?', a: 'Hosting, domain access, updates and support are written into the scope before work starts, with who is responsible for each part. After launch you get a month-to-month support plan and a person to call.' },
  { q: 'I sell cars at a dealership. Is this page for me?', a: 'This page is for the people who approve a store’s website. If you sell cars and want help posting your inventory on Facebook Marketplace, that is our software. Use the Book a software demo link next to the application form. It takes you straight to the demo.' },
];

// ---------- form ----------
export const FORM = {
  title: 'Apply for your website plan.',
  intro: 'For dealership owners, GMs and marketing directors. Two minutes. We reply within two business days.',
  note: 'No website yet? Leave that field blank. Sending this form does not place an order.',
  submit: 'Request my website plan',
  sending: 'Sending your application…',
  success: 'Your application is in.',
  successBody: 'We review your store and reply within two business days with a call time. Your current website has not been touched.',
  aside: {
    eyebrow: 'Let’s talk about your store',
    title: 'A website you are proud to send a buyer to.',
    intro: 'Start with the dealership you have and the experience you want a buyer to have on their phone.',
    checks: ['Your brand and your local market', 'Your inventory feed and your CRM', 'A written scope before any commitment'],
    aeoPrompt: 'Already like your website?',
    aeoLink: 'Explore AEO & GEO visibility',
    demoPrompt: 'Want help posting inventory on Marketplace instead?',
    demoLink: 'Book a software demo',
  },
  errors: {
    missing_dealership: 'Enter your dealership name.',
    invalid_website: 'Enter a valid website, or leave it blank if you do not have one.',
    missing_location: 'Enter your city and state.',
    missing_project_goal: 'Choose what you want to do.',
    missing_full_name: 'Enter your first and last name.',
    missing_role: 'Choose your role.',
    invalid_email: 'Enter a valid email address.',
    invalid_phone: 'Enter a valid phone number.',
    rate_limited: 'Too many requests were sent. Please try again later.',
    unavailable: 'This form is temporarily unavailable. Please try again later or email sales@autolander.ai.',
    generic: 'We could not confirm your application. Your details are still here. Please try again.',
  },
  fields: [
    { name: 'dealershipName', label: 'Dealership name', autocomplete: 'organization', maxLength: 160 },
    { name: 'website', label: 'Current website', optional: true, autocomplete: 'url', placeholder: 'yourdealership.com', inputMode: 'url', maxLength: 240 },
    { name: 'location', label: 'City and state', autocomplete: 'address-level2', maxLength: 80 },
    { name: 'projectGoal', label: 'What would you like to do?', type: 'select', wide: true },
    { name: 'fullName', label: 'Your first and last name', autocomplete: 'name', maxLength: 160 },
    { name: 'role', label: 'Your role', type: 'select' },
    { name: 'email', label: 'Work email', autocomplete: 'email', type: 'email', maxLength: 160 },
    { name: 'phone', label: 'Mobile', autocomplete: 'tel', type: 'tel', inputMode: 'tel', maxLength: 24 },
  ],
  privacy: 'We use your details to review and reply to your application. See our',
};

// ---------- final CTA + footer ----------
export const FINAL = {
  eyebrow: 'Your store deserves a site buyers remember',
  h2Lead: 'Build the site',
  h2Grad: 'buyers and AI can both read.',
};

export const FOOTER = {
  line: 'Dealership websites are a service of AutoLander LLC and are separate from our Facebook Marketplace software. Not affiliated with Google, Microsoft, OpenAI or any vehicle manufacturer; product and brand names belong to their owners.',
};

// Page footer columns for the shared SiteFooter (columns={FOOTER_NAV}), the same shape as the AEO and paid-ads pages.
// No `mail: true` row: SiteFooter is prerendered on this page and its mail picker needs JavaScript.
export const FOOTER_NAV = [
  {
    heading: 'Dealership websites',
    links: [
      { label: 'Apply for a website plan', href: `${WEBSITE_PATH}#${WEBSITE_FORM_ID}` },
      { label: 'What we build', href: `${WEBSITE_PATH}#the-build` },
      { label: 'SEO and AI search', href: `${WEBSITE_PATH}#search-foundations` },
      { label: 'Website questions', href: `${WEBSITE_PATH}#website-questions` },
    ],
  },
  {
    heading: 'AutoLander',
    links: [
      { label: 'Facebook Marketplace software', href: '/facebook-marketplace-for-car-dealers/' },
      { label: 'AEO and GEO for dealers', href: '/aeo-geo-for-car-dealers/' },
      { label: 'Paid ads and AI commercials', href: '/meta-ads-for-car-dealers/' },
      { label: 'About AutoLander', href: '/about/' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Blog', href: '/blog/' },
      { label: 'Contact', href: '/contact/' },
      { label: 'Privacy', href: '/privacy.html' },
      { label: 'Terms', href: '/terms.html' },
    ],
  },
];
