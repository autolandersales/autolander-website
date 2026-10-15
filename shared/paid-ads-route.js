// shared/paid-ads-route.js
//
// The one place the paid ads page's URL lives (Meta ads + AI commercials for car dealers, the third Services
// entry beside AEO & GEO and Team Plans). Imported by the Worker (form redirects, no-transform list),
// src/lib/boot.js, src/Root.jsx, the SEO registry, scripts/spa-fallback.mjs and the tests. Plain constants
// only: no side effects, no imports, so every bundler keeps just what a consumer uses.
//
// The internal page id is 'paid-ads' (data-al-hydrate, the ads-rest island, SiteNav page=, the image folder
// public/paid-ads/).

export const PAID_ADS_PATH = '/meta-ads-for-car-dealers/';
export const PAID_ADS_DIR = 'meta-ads-for-car-dealers';
export const PAID_ADS_NAV_LABEL = 'Paid Ads & AI Commercials';
// The application form's id on the page; the Worker's no-JS 303s land on it in one hop.
export const PAID_ADS_FORM_ID = 'apply-form';
export const PAID_ADS_API_PATH = '/api/ads-apply';
