// shared/paid-ads-content.js  (authored by Claude; copy changes go through Claude)
//
// The ONE source of every customer-facing string, number and plan on /meta-ads-for-car-dealers/ (paid ads +
// AI commercials for car dealers; the URL lives in ./paid-ads-route.js).
// Consumers (all must import from here, never restate a string; no fee or plan price appears anywhere on the page):
//   src/ads/PaidAdsSections.jsx, src/ads/PaidAdsApp.jsx, src/ads/apply-request.js  (React page)
//   src/ads/static-mirror.js                                                  (build-time no-JS HTML)
//   scripts/seo/data-paid-ads.mjs                                             (head, JSON-LD)
//   worker/src/booking/router.js                                              (choice lists + consent, via ./paid-ads-form.js)
//   test/paid-ads-*.test.js                                                   (drift + copy lint)
//
// PUBLIC REPO: customer-facing copy only.
//
// MODULE RULES (tests enforce them):
//   * `export const` data and pure helpers only; no side effects at module scope;
//   * no JSX, no class names, no window / document / import.meta;
//   * copy: no em or en dashes, no "not X. It's Y." cadence, no hype words, no competitor names, no result
//     promises; the only dollar figures are the ad-budget bands (the dealer's spend, never our fee) and the PROOF line.
//
// PROOF RULE: every number on this page is AutoLander's own Meta account (first party), dated, and described as
// what happened for us, never as a forecast for the dealer. Claims registry rows CLM-PROOF-001 (dealerships),
// CLM-ADS-001 (the best commercial), CLM-ADS-002 (ads tested since May).

import { PAID_ADS_PATH, PAID_ADS_FORM_ID } from './paid-ads-route.js';

export { PAID_ADS_PATH, PAID_ADS_DIR, PAID_ADS_FORM_ID } from './paid-ads-route.js';
export {
  ROLE_CHOICES,
  MARKETPLACE_ROUTE,
  MARKETPLACE_DEMO_PATH,
  AD_BUDGET_CHOICES,
  UNITS_CHOICES,
  ADS_TODAY_CHOICES,
  PAID_ADS_SMS_CONSENT as SMS_CONSENT,
  PAID_ADS_SMS_CONSENT_PREVIOUS as SMS_CONSENT_PREVIOUS,
} from './paid-ads-form.js';

export const PAID_ADS_PUBLISHED = '2026-10-15';
export const PAID_ADS_PUBLISHED_HUMAN = 'October 15, 2026';
export const PAID_ADS_UPDATED = '2026-10-15'; // SET TO THE ACTUAL SHIP DATE
export const PAID_ADS_UPDATED_HUMAN = 'October 15, 2026';
export const FORM_ANCHOR = `#${PAID_ADS_FORM_ID}`;

// ---------- formatting (pure) ----------
export function fmtUsd(n) {
  return `$${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// ---------- first-party proof (AutoLander's own ad account; see PROOF RULE above) ----------
export const PROOF = {
  eyebrow: 'Our own numbers',
  h2Lead: 'We run ads this way',
  h2Grad: 'for AutoLander every day.',
  lead: 'Everything on this page is how we grew our own software company on Facebook and Instagram. We do not sell a method we have not paid for ourselves.',
  // Dates and figures: AutoLander's Meta ad account and CRM, read in Ads Manager on 2026-10-06 (the commercial) and
  // 2026-10-15 (the rest). Spend to Meta, applications as counted by Meta, dealerships as paying accounts.
  window: 'September 7 to October 6, 2026',
  stats: [
    { value: '447', label: 'demo applications from one 31-second commercial', detail: 'under $22 each, in 30 days' },
    { value: '200+', label: 'dealerships run AutoLander', detail: 'paying accounts, counted on October 5, 2026' },
    { value: '240+', label: 'ad variations we have tested since May', detail: 'one of them became the winner above' },
    { value: '1', label: 'ad account: our own', detail: 'the same account, data and tracking we would set up for you' },
  ],
  caption: 'Numbers from AutoLander’s own Meta ad account and CRM, September 7 to October 6, 2026, as read in Ads Manager. They are what happened for our software company. They are not a forecast or a promise of what your store will get.',
};

// ---------- hero (two headline variants, one per ad angle: a = free commercial, b = ad review) ----------
export const EYEBROW = 'Paid ads and AI commercials · by the team that grows its own company this way';

export const HEADLINE_SEGMENTS = {
  a: [
    { text: 'A free AI commercial ' },
    { text: 'for your dealership.', accent: true },
  ],
  b: [
    { text: 'Dealer ads that look like a brand ' },
    { text: 'and run like a system.', accent: true },
  ],
};

export const HEADLINES = Object.fromEntries(
  Object.entries(HEADLINE_SEGMENTS).map(([key, parts]) => [key, parts.map((part) => part.text).join('')]),
);

export const SUBS = {
  a: 'Apply below. If your store is a fit, we show you on a 20-minute call exactly how we would run your dealership on Facebook and Instagram. Come on board and your first commercial is on us: written, cast, filmed and cut for your store, yours to keep.',
  b: 'Cinematic AI commercials written for your store, Meta ads run inside your own ad account, and every lead tracked into your CRM with the ad that brought it. Start with a free 20-minute ad review: we read your last 90 days and show you where the money goes.',
};

export const HERO = {
  cta: 'Apply for my free commercial',
  ctaB: 'Apply for my free ad review',
  watch: 'Watch the commercial that did it',
  watchNote: '31 seconds',
  formNote: 'About two minutes. We read every application by hand and reply within 1 business day.',
  chips: [
    'Built on our own ad account first',
    'Commercials, not inventory carousels',
    'You own the ad account and the data',
    'Month to month',
    'By application',
  ],
  // Visible caption under the phone frame; the poster is a frame of the commercial itself.
  phoneCaption: 'Our commercial “Slow Day”, as it runs on Facebook and Instagram Reels. Synthetic actors in a written story, never shown as a customer.',
};

// ---------- the problem (the costly mistake most dealer ads make; non-claims, no competitor names) ----------
export const PROBLEM = {
  eyebrow: 'The real problem',
  h2Lead: 'Most dealer ads look like',
  h2Grad: 'a listing with a logo on it.',
  lead: 'A buyer scrolling at 10 PM has seen a thousand inventory carousels. A price, a stock photo, a “call now.” None of it stops the thumb, so the auction charges you more for every click, and the leads that do come in are tire kickers who clicked by accident.',
  items: [
    { title: 'Templates sold to every store', body: 'When your ad is the same template as the lot across town, the only thing left to compete on is price. That is a race you cannot win with a bigger budget.' },
    { title: 'Nobody makes real creative', body: 'The agency has 40 accounts. Your “creative” is a feed and a font. Meta rewards ads people watch, and nobody watches a feed.' },
    { title: 'The same ad for six months', body: 'Every ad wears out. We watched our own best ad go from a 39% hook rate to 29% in two weeks. Without a fresh commercial on deck, the cost per lead only goes one way.' },
    { title: 'A report nobody can act on', body: 'Clicks, reach and “engagement” do not sell cars. You need the cost of a lead with a name and a phone number, and which ad produced it.' },
  ],
};

// ---------- the mechanism (our specific way; labor illusion: show the work) ----------
export const METHOD = {
  eyebrow: 'Our specific way',
  h2Lead: 'A commercial, a system,',
  h2Grad: 'and a Monday readout.',
  lead: 'This is the exact process behind the numbers above, run for your dealership instead of ours.',
  steps: [
    { title: 'The angle', body: 'We study your store, your market and your buyers: what the lot looks like at 2 PM on a Tuesday, who walks in, who never does. Then we write five hooks for your commercial and keep the one your buyers will feel in the first second.' },
    { title: 'The commercial', body: 'A scripted 30-second story, cast and filmed with AI tools, cut in 9:16 for Reels and 4:5 for the feed, captioned for sound-off viewing. Your real store, cars and people when you have footage, synthetic actors in a written story when you do not. Never a stock-photo carousel.' },
    { title: 'The launch', body: 'One broad ad set in your own Meta ad account, with your dataset, aimed at the one event that matters: a lead with a name and a phone number. Server-side tracking, so Meta learns from real people and not from bots.' },
    { title: 'The read', body: 'Every Monday, a plain-English readout: spend, cost per lead, cost per appointment, which ad is wearing out and what we do about it. No dashboards you have to decode.' },
    { title: 'The refresh', body: 'A new commercial on a fixed cadence, because every ad wears out. We measure the wear (hook rate, first-time reach, cost per lead) and swap in the next one before the cost climbs.' },
    { title: 'The handoff', body: 'Every lead lands in your CRM tagged with the campaign and the ad that brought it, and your team gets the text and the task the moment it comes in. You decide who calls; we make sure nobody is missed.' },
  ],
};

// ---------- what makes it different (value equation: speed, effort, likelihood) ----------
export const DIFFERENCE = {
  eyebrow: 'What you get',
  h2Lead: 'Done for you,',
  h2Grad: 'owned by you.',
  items: [
    { title: 'Your ad account, your data', body: 'We work inside a Meta ad account you own, as a partner you can remove in one click. Every audience, pixel event and result stays yours if we ever part ways.' },
    { title: 'Commercials you keep', body: 'Every commercial we make for your store is yours to run anywhere: your website, your showroom screens, your own social pages.' },
    { title: 'First commercial live fast', body: 'The first commercial is live in your account within 10 business days of kickoff. Most of what we need from you fits in one 30-minute call.' },
    { title: 'Nothing to learn', body: 'You approve scripts and commercials from your phone. We handle the account, the tracking and the readouts.' },
    { title: 'Built by operators, not a sales floor', body: 'The people who write your commercial are the people who wrote ours and read the numbers every morning. No account manager handoff.' },
    { title: 'Month to month', body: 'No annual contract. Cancel before your next billing date and keep every commercial.' },
  ],
};

// ---------- who it is for / not for (qualification; Hormozi: the lure names the right buyer) ----------
export const FIT = {
  eyebrow: 'Who this is for',
  h2Lead: 'Built for stores that',
  h2Grad: 'already spend to grow.',
  forHeading: 'A fit',
  forItems: [
    'Dealerships selling 30 or more units a month with an owner or GM who makes the call.',
    `A monthly ad budget of ${fmtUsd(2000)} or more for Meta, paid directly to Meta.`,
    'A store that wants a brand buyers remember, not the cheapest carousel in the market.',
    'Someone on your floor who will call a lead within minutes, not days.',
  ],
  notHeading: 'Not a fit',
  notItems: [
    'Stores that want a promised number of leads or sales. No honest agency can promise that, and we do not.',
    `Budgets under ${fmtUsd(2000)} a month. Below that, Meta cannot find your buyers fast enough to learn; our Facebook Marketplace software is the better buy.`,
    'A salesperson looking for a posting tool. That is AutoLander’s Marketplace software, and the demo is free.',
  ],
};

// ---------- the commercial showcase ----------
export const COMMERCIAL = {
  anchor: 'commercial',
  eyebrow: 'Watch the work',
  h2Lead: 'The commercial that brought in',
  h2Grad: '447 demo applications.',
  body: 'This is “Slow Day”, written, cast and cut in our studio in one week, run on one broad ad set at a few hundred dollars a day. A dead showroom, one salesperson with a buyer waiting, and a product that did the posting. It stopped the scroll because it is a story, not a sales pitch. We write the same way for your store.',
  play: 'Play the commercial',
  playing: 'Playing',
  duration: '31 sec',
  specs: ['9:16 and 4:5', 'Captioned for sound off', 'Under 31 seconds', 'Synthetic actors, written story'],
  disclosure: 'The people in our commercials are AI-generated actors playing roles in a written script. They are never presented as customers, and they never report results. Any real customer in a commercial we make for you appears with their written consent.',
};

// ---------- plans ----------
export const PLANS = [
  {
    id: 'launch',
    anchor: 'plan-launch',
    name: 'Launch',
    availability: 'open',
    builtFor: 'Single rooftops that want one strong campaign running the right way.',
    summary: 'Two new commercials a month, one broad campaign in your ad account, the Monday readout and every lead tagged into your CRM.',
    counts: { commercialsPerMonth: 2, staticsPerMonth: 0, retargeting: false, landingPage: false, weeklyCall: false, exclusivity: false },
    calls: 'Kickoff, then a 30-minute review every month',
    includes: [
      'Everything every plan includes (listed below).',
      '2 new commercials a month, each with 5 tested hooks.',
      'One broad campaign, one event, one readout every Monday.',
      'A 30-minute review call every month.',
    ],
  },
  {
    id: 'growth',
    anchor: 'plan-growth',
    name: 'Growth',
    availability: 'open',
    builtFor: 'Stores spending real money that want a second campaign working the people who already looked.',
    summary: 'Four commercials and four statics a month, a retargeting campaign, a landing page for your offer and a fortnightly call.',
    counts: { commercialsPerMonth: 4, staticsPerMonth: 4, retargeting: true, landingPage: true, weeklyCall: false, exclusivity: false },
    calls: 'Kickoff, then a 30-minute call every two weeks',
    includes: [
      'Everything in Launch.',
      '4 new commercials and 4 statics a month.',
      'A retargeting campaign for the people who visited and did not act.',
      'A landing page for your offer, built and hosted for you, or installed on your own site.',
      'A 30-minute call every two weeks.',
    ],
  },
  {
    id: 'market-leader',
    anchor: 'plan-market-leader',
    name: 'Market Leader',
    availability: 'by-application',
    builtFor: 'High-volume stores and groups that want the brand in their market and a weekly seat at the table.',
    summary: 'Eight commercials a month, every campaign type, a weekly call and brand exclusivity in your market. By application.',
    counts: { commercialsPerMonth: 8, staticsPerMonth: 8, retargeting: true, landingPage: true, weeklyCall: true, exclusivity: true },
    calls: 'Kickoff, a weekly call and a quarterly planning meeting',
    includes: [
      'Everything in Growth.',
      '8 new commercials and 8 statics a month, across as many campaigns as your market needs.',
      'A weekly 30-minute call and a quarterly planning meeting.',
      'Brand exclusivity, by application. While you are subscribed, we run paid ads for no other dealer of your brand within 25 miles of your rooftop, confirmed in writing before you sign.',
    ],
  },
];
const [L, G, M] = PLANS;

export const META = {
  title: 'Meta Ads and AI Commercials for Car Dealers | AutoLander', // <= 60 chars, no '&'
  description: 'Done-for-you Facebook and Instagram ads for car dealers: AI commercials, ads in your own account, every lead tracked. First commercial free when you sign on.',
  ogTitle: 'Dealer ads that look like a brand. Meta ads and AI commercials for car dealers',
  ogDescription: 'We make the commercial, run the ads in your own account and track every lead into your CRM. Built on our own ad account first. Start with a free commercial or a free ad review.',
  ogImageAlt: 'AutoLander paid ads and AI commercials for car dealers: a frame of the Slow Day commercial',
  ogCardEyebrow: 'For car dealers',
  ogCardTitle: 'Dealer ads that look like a brand',
  breadcrumb: 'Meta ads and AI commercials for car dealers',
};

export function comparisonRows(plans = PLANS) {
  const n = (v) => (v ? `${v} a month` : 'None');
  const yes = (v) => (v ? 'Yes' : 'No');
  return [
    ['Built for', ...plans.map((p) => p.builtFor)],
    ['Pricing', ...plans.map(() => 'Quoted on your call')],
    ['Setup fee for AutoLander customers', ...plans.map(() => 'None')],
    ['Ad spend', ...plans.map(() => 'Paid to Meta directly, never part of our fee')],
    ['Your first commercial', ...plans.map(() => 'Free when you sign on')],
    ['New commercials', ...plans.map((p) => n(p.counts.commercialsPerMonth))],
    ['Statics (image ads)', ...plans.map((p) => n(p.counts.staticsPerMonth))],
    ['Broad campaign, one lead event', ...plans.map(() => 'Yes')],
    ['Retargeting campaign', ...plans.map((p) => yes(p.counts.retargeting))],
    ['Landing page for your offer', ...plans.map((p) => yes(p.counts.landingPage))],
    ['Server-side tracking and CRM tagging', ...plans.map(() => 'Yes')],
    ['Monday readout', ...plans.map(() => 'Yes')],
    ['Review calls', ...plans.map((p) => p.calls)],
    ['Brand exclusivity in your market', ...plans.map((p) => yes(p.counts.exclusivity))],
    ['How it starts', ...plans.map((p) => (p.availability === 'by-application' ? 'Application, answered within 1 business day' : 'Written agreement after your call'))],
  ];
}

export const PLANS_SECTION = {
  anchor: 'plans',
  eyebrow: 'Plans',
  h2Lead: 'Three ways to have',
  h2Grad: 'your ads run this way.',
  lead: 'Three plans, month to month, sized to your store and quoted on your 20-minute call. Your ad spend is separate and goes to Meta directly, from your own card, so you always see exactly what the ads cost. Every plan starts with that call, and your first commercial is free when you sign on.',
  customerLine: 'AutoLander customers pay no setup fee.',
  cardCta: 'Apply',
  byApplication: 'By application',
  priceNote: 'Quoted on your call',
  firstCommercialNote: 'First commercial free when you sign on',
  tableCaption: 'Paid ads plans compared. Month to month. Ad spend is paid to Meta and is not part of the fee.',
  everyPlanHeading: 'Every plan includes',
  promisesHeading: 'What we promise',
  promisesIntro: 'Each promise is a step we control, with a date you can check in your Monday readout.',
  neverHeading: 'What we never promise',
  notIncludedHeading: 'Not included in any plan',
  finePrintHeading: 'The fine print',
};

export const EVERY_PLAN_INCLUDES = [
  'A kickoff call where we learn your store, your buyers, your inventory and your offer, and agree the one lead event your ads aim at.',
  'Commercials written, cast, filmed with AI tools and cut by our team, in 9:16 and 4:5, captioned, with 5 tested hooks each. Your real footage and photos when you have them. Scripts and commercials go live only after you approve them.',
  'Your ads run inside a Meta ad account you own. We join as a partner you can remove at any time, and we never ask for your passwords.',
  'Your Meta dataset set up right: server-side tracking of the lead event, with the ad, ad set and campaign carried through to your CRM on every lead.',
  'Every lead delivered into your CRM (or ours, if you have none) with a text and a task to your team the moment it arrives.',
  'A Monday readout in plain English: spend, leads, cost per lead, cost per appointment, which ad is wearing out and what we are changing this week.',
  'A new commercial on your plan’s cadence, so the account never runs on a worn-out ad.',
  'Month to month. Cancel any time before your next billing date and keep every commercial.',
];

export const PROMISES = [
  { promise: 'Kickoff call within 5 business days of your signed agreement.', step: 'We book it with you as soon as your agreement is signed.' },
  { promise: 'First scripts reach you within 5 business days of kickoff.', step: 'Five hooks, one story, written for your store. You approve from your phone.' },
  { promise: 'Your first commercial is live in your ad account within 10 business days of kickoff.', step: 'If your ad account, page or payment method is not ready, the clock starts the day they are, and we tell you what is missing on day one.' },
  { promise: 'Tracking is proven before the first dollar is spent.', step: 'We send a test lead through your dataset and your CRM and show you the event in Meta Events Manager on the kickoff call or the one after it.' },
  { promise: 'Your Monday readout arrives by 11 AM Eastern every Monday.', step: 'Spend, leads, cost per lead, cost per appointment, ad by ad, with the one change we are making this week.' },
  { promise: 'New commercials land on your plan’s cadence.', step: `${L.counts.commercialsPerMonth} a month on Launch, ${G.counts.commercialsPerMonth} on Growth, ${M.counts.commercialsPerMonth} on Market Leader, each with 5 hooks, each approved by you before it runs.` },
  { promise: 'Nothing goes live without your approval.', step: 'Scripts, commercials, statics, landing pages and budgets. You see each one first.' },
  { promise: 'If you leave, you keep everything.', step: 'Every commercial, static and landing page is yours. We remove our access within 5 business days and confirm it in writing.' },
];

export const NEVER_PROMISE = [
  'A number of leads, appointments, showroom visits or sales, or a cost per lead.',
  'A return on ad spend, or any percentage lift.',
  'That Meta will approve any ad, campaign or audience, or that your ad account will never be restricted.',
  'That any result we got for AutoLander will repeat for your store. Markets, offers, inventory and budgets differ.',
  'Any affiliation with, or approval from, Meta, Facebook or Instagram.',
  'Manufacturer co-op approval. We are not on any manufacturer’s approved-vendor list, and we tell you so before you sign.',
];

export const NOT_INCLUDED = [
  'Ad spend. It is paid to Meta from your own payment method, and we never mark it up.',
  'Google, YouTube, TikTok, TV or radio advertising.',
  'Answering your buyers. Your team reads and answers every lead; we make sure every lead reaches them with the ad that brought it.',
  'Website builds or redesigns beyond the landing page in your plan.',
  'Photo or video shoots at your store. We work from the footage and photos you already have, and from our studio.',
  'Manufacturer compliance review of your ads. We write to your brand rules when you give them to us; approval stays with you.',
];

export const HOW_IT_STARTS = [
  { title: 'Apply', body: 'Two minutes: your store, your website, your budget and who makes the call. We read every application by hand and reply within 1 business day.' },
  { title: 'A 20-minute call', body: 'We look at your market and your current ads together, and tell you honestly whether paid ads are the next dollar you should spend. Many stores should fix their Marketplace listings first, and we will say so.' },
  { title: 'Your plan, on the call', body: 'A fit? We walk you through the plan we would run for your store and what it costs, straight, on the same call. Ask for the ad review and we read your last 90 days of ads first.' },
  { title: 'Agreement, kickoff and your free commercial', body: 'Launch and Growth start with a written agreement, month to month. Market Leader starts with an application, answered within 1 business day. Kickoff is booked within 5 business days, and your first commercial is on us.' },
  { title: 'Live within 10 business days', body: 'Your first commercial runs in your own ad account, tracking proven, with your first Monday readout the following week.' },
];

export const FINE_PRINT = [
  'Plans are available to US dealerships and are quoted on your call, in US dollars plus tax where applicable.',
  'Ad spend is paid by you to Meta directly and is never part of our fee. The ad budget we agree on the call is what the plan is designed for, not a charge from us.',
  'Month to month: cancel any time before your next billing date. The current month is not refunded, and you keep every commercial, static and landing page.',
  'AutoLander customers pay no setup fee on any plan once their AutoLander subscription at that rooftop has been active and paid for the prior 60 days.',
  'Dealer groups are quoted per rooftop, and each rooftop can be on a different plan.',
  'The free commercial comes with your plan: when a store we accept after the first call signs on, its first commercial is written, cast and cut at no charge, in 9:16 and 4:5, from our studio and any footage you give us, and it is yours to keep.',
  'AutoLander is not affiliated with or endorsed by Meta. Facebook, Instagram and Meta are trademarks of Meta Platforms, Inc.',
];

// ---------- FAQ: answers are the exact visible text AND the FAQPage JSON-LD ----------
export const FAQ_HEADING = { anchor: 'faq', eyebrow: 'FAQ', h2Lead: 'Questions dealers ask', h2Grad: 'before they apply.' };

// `allow: true` marks the one question that may contain the word dealers type ("guarantee"); its answer starts with "No.".
export const FAQ = [
  { q: 'Can you guarantee leads or sales?', a: 'No. Nobody can honestly promise what an ad auction will do for a store, and we do not. We promise the steps we control, with dates: the commercial, the launch, the tracking, the readout and the refresh. Then we show you the real numbers every Monday and change course when they say so.', allow: true },
  { q: 'What is an AI commercial, and will buyers know?', a: 'A scripted 30-second story written for your store, cast and filmed with AI tools and cut by our team. The actors are AI-generated and play roles in a script; they are never shown as your customers and never report results. When you have real footage of your store, cars and people, we use it. Buyers see a commercial, not a listing, and that is what stops the scroll.' },
  { q: 'How much should my ad budget be?', a: `At least ${fmtUsd(2000)} a month for Meta, and we size the plan to the budget you tell us on the call. Below ${fmtUsd(2000)} a month, Meta cannot find enough of your buyers fast enough to learn, and your money is better spent on our Facebook Marketplace software. Ad spend goes to Meta from your own card; our fee is separate and quoted on the call.` },
  { q: 'Who owns the ad account, the pixel and the data?', a: 'You do. We work inside a Meta ad account and dataset you own, as a partner you can remove at any time. If we part ways, every audience, event, campaign and commercial stays with you.' },
  { q: 'How fast is the first commercial live?', a: 'Within 10 business days of kickoff, in your own ad account, with tracking proven before the first dollar is spent. First scripts reach you within 5 business days of kickoff, and you approve from your phone.' },
  { q: 'We already have an agency. Why switch?', a: 'Ask them three questions: what did last month’s best ad cost per lead, when was the last new creative, and which ad brought the lead you sold yesterday? If those answers take more than a day, that is the difference. We make the creative, run one campaign well, and send you the numbers every Monday.' },
  { q: 'Do I need AutoLander’s Marketplace software to do this?', a: 'No. The ads service is separate from our Facebook Marketplace software. AutoLander customers pay no setup fee, and their inventory feed is already connected, which makes kickoff faster.' },
  { q: 'Do you answer my buyers?', a: 'No. Your team reads and answers every lead, because that is the part that sells cars. We make sure every lead reaches your CRM with the ad that brought it, and that your team gets a text and a task the moment it arrives.' },
  { q: 'What do you need from me?', a: 'Partner access to your Meta ad account and page, your inventory feed or website, your brand rules if you have them, and about 30 minutes at kickoff. After that, approving scripts and commercials from your phone and the review calls in your plan.' },
  { q: 'What is the free commercial, and what is the catch?', a: 'Your first commercial, on us, when you sign on: one 30-second commercial for your dealership, cut in 9:16 and 4:5, written and produced before the first dollar of ad spend. There is no catch beyond that. It comes with the plan, and it is yours to keep even if you leave.' },
  { q: 'Is there a contract?', a: 'Month to month. Cancel any time before your next billing date, and you keep every commercial, static and landing page we made.' },
  { q: 'Which stores do you turn down?', a: `Stores that want a promised number of leads or sales, ad budgets under ${fmtUsd(2000)} a month, and salespeople looking for a posting tool. The last group gets a free demo of our Marketplace software instead.` },
  { q: 'Can an AI assistant fill in the application for me?', a: 'An assistant can bring you to this page and fill in your store’s details. You review the form and press the button yourself, and only you can tick the text-message box.' },
];

// ---------- the form ----------
export const FORM = {
  title: 'Apply for your free commercial',
  titleB: 'Apply for your free ad review',
  intro: 'About two minutes. We read every application by hand and reply within 1 business day.',
  requiredNote: 'Every field is required except the text-message box.',
  marketplace: {
    note: 'For dealership owners and managers with an ad budget. Looking for AutoLander to post and update your cars on Facebook Marketplace? That is our posting software, and the demo is free.',
    noteCta: 'Book a Marketplace demo',
    routeBody: 'This application is for dealership owners and managers running paid ads. AutoLander’s Facebook Marketplace software posts your cars and keeps prices, photos and sold units up to date. Book a short demo and we will set it up with you.',
    routeCta: 'Book a Marketplace demo',
    roleHint: 'Salesperson looking for the Marketplace posting tool?',
  },
  smsLead: 'Get updates about your application and your call by text (optional)',
  groups: { store: 'Your store', ads: 'Your ads', you: 'You' },
  fields: {
    dealershipName: { label: 'Dealership', autocomplete: 'organization', agentHint: 'The dealership’s trading name.' },
    website: { label: 'Website', hint: 'Example: yourstore.com', autocomplete: 'url', agentHint: 'The dealership’s own website address.' },
    location: { label: 'City and state', hint: 'Where the store is', autocomplete: 'off', agentHint: 'City and state of the store, not of the person filling in the form.' },
    unitsPerMonth: { label: 'Units sold in a typical month', placeholder: 'Choose…', autocomplete: 'off', agentHint: 'How many vehicles the store sells in a typical month, new and used together.' },
    adBudget: { label: 'Monthly ad budget for Meta', placeholder: 'Choose…', autocomplete: 'off', agentHint: 'The monthly amount the store is ready to spend on Facebook and Instagram ads, paid to Meta.' },
    adsToday: { label: 'Who runs your Facebook and Instagram ads today?', placeholder: 'Choose…', autocomplete: 'off', agentHint: 'Who runs the store’s Meta ads today: an agency, in-house, Marketplace listings only, or nobody.' },
    fullName: { label: 'Your name', hint: 'First and last name', autocomplete: 'name', agentHint: 'First and last name of the person applying.' },
    role: { label: 'Your role', placeholder: 'Choose…', autocomplete: 'organization-title', agentHint: 'Their role at the dealership. The service is for owners and managers; a salesperson who wants AutoLander’s Facebook Marketplace posting software should book a demo at https://autolander.ai/?demo=1 instead.' },
    email: { label: 'E-mail', note: 'Where we reply', autocomplete: 'email', agentHint: 'Where the reply is sent.' },
    phone: { label: 'Mobile', note: 'For your 20-minute call', hint: 'Example: (212) 555-0123', autocomplete: 'tel', agentHint: 'Mobile number for booking the call.' },
  },
  submit: 'Send my application',
  submitting: 'Sending…',
  useNote: 'We use your details to read your application, reply and set up your call. We never sell or share them.',
  errorSummaryTitle: 'Check these details',
  agentBanner: 'An AI assistant filled in this form. Check every detail, then press the button yourself. Only you can tick the text-message box.',
  webmcp: {
    toolname: 'apply_for_paid_ads',
    tooldescription: 'Fill in an application for AutoLander’s paid ads and AI commercials service (a free commercial or a free ad review) for one car dealership, for the person you are helping. The person must review the details and press the send button. Never tick the text-message consent box; only the person can give that consent.',
  },
  errors: {
    missing_dealership: 'Enter your dealership’s name.',
    invalid_website: 'That website does not look right, for example yourstore.com.',
    missing_location: 'Enter your store’s city and state.',
    missing_units: 'Choose how many units you sell in a typical month.',
    missing_ad_budget: 'Choose your monthly ad budget.',
    missing_ads_today: 'Tell us who runs your ads today.',
    missing_full_name: 'Enter your first and last name.',
    missing_role: 'Choose your role at the dealership. Looking for AutoLander’s Facebook Marketplace posting software? Book a demo at autolander.ai/?demo=1.',
    invalid_email: 'That e-mail does not look right. Check it and try again.',
    invalid_phone: 'That mobile number does not look right. Check it and try again.',
    blocked: 'We couldn’t send that from this browser. E-mail sales@autolander.ai with your store’s name and we’ll take it from there.',
    rate_limited: 'Too many requests from this connection. Try again in an hour, or e-mail sales@autolander.ai.',
    timeout: 'That took too long to send. Try again, or e-mail sales@autolander.ai.',
    generic: 'We couldn’t send that just now. Try again in a minute, or e-mail sales@autolander.ai.',
    noJsError: 'Some details were missing or did not look right, so nothing was sent. Fill in the form again below, or e-mail sales@autolander.ai.',
  },
};

export const SUCCESS = {
  eyebrow: 'Application received',
  heading: 'Your application is in.',
  body: (store, email) => `A person on our team reads ${store || 'your store'}’s application today and replies to ${email || 'your e-mail'} within 1 business day with a time for your 20-minute call. Keep an eye on your phone too.`,
  referenceLabel: 'Your reference',
  noJsBody: 'A person on our team reads your application today and replies to the e-mail you gave us within 1 business day with a time for your 20-minute call.',
  footnote: 'Nothing else to do for now. No logins, nothing to install.',
};

export const FINAL_CTA = {
  h2Lead: 'Your buyers will scroll tonight.',
  h2Grad: 'Give them something worth stopping for.',
  body: 'Apply in two minutes. You will know on the first call whether paid ads are the next dollar you should spend, and your first commercial is on us when you sign on.',
  cta: 'Apply now',
  note: 'By application · Reply within 1 business day · Month to month',
};

export const MOBILE_BAR = { cta: 'Apply now', note: 'Free commercial or ad review, by application' };

export const FOOTER = {
  line: 'Paid ads and AI commercials for car dealers is a service of AutoLander LLC and is separate from our Facebook Marketplace software. Not affiliated with or endorsed by Meta; Facebook, Instagram and Meta are trademarks of Meta Platforms, Inc.',
};

export const FOOTER_NAV = [
  {
    heading: 'Paid ads',
    links: [
      { label: 'Apply for a free commercial', href: `${PAID_ADS_PATH}${FORM_ANCHOR}` },
      { label: 'Watch the commercial', href: `${PAID_ADS_PATH}#commercial` },
      { label: 'Plans', href: `${PAID_ADS_PATH}#plans` },
      { label: 'Questions dealers ask', href: `${PAID_ADS_PATH}#faq` },
    ],
  },
  {
    heading: 'AutoLander',
    links: [
      { label: 'Facebook Marketplace software', href: '/facebook-marketplace-for-car-dealers/' },
      { label: 'AEO and GEO for dealers', href: '/aeo-geo-for-car-dealers/' },
      { label: 'Team plans', href: '/team/' },
      { label: 'About AutoLander', href: '/about/' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Blog', href: '/blog/' },
      { label: 'Contact', href: '/contact/' },
      { label: 'Support', href: '/contact/', mail: true },
      { label: 'Privacy', href: '/privacy.html' },
      { label: 'Terms', href: '/terms.html' },
    ],
  },
];

// One-paragraph service description (Service.description in JSON-LD).
export const SERVICE_SUMMARY = `AutoLander LLC's paid ads service for US car dealerships: cinematic AI commercials written and produced for the store, Facebook and Instagram ads run inside the dealer's own Meta ad account, server-side tracking and every lead tagged into the dealer's CRM with the ad that brought it, and a plain-English readout every Monday. It starts with a 20-minute call, by application; the first commercial is free when a dealer signs on, and a free ad review is offered on request. Plans are month to month, quoted on that call, with ad spend paid to Meta directly. It is separate from AutoLander's Facebook Marketplace software.`;
