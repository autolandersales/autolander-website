// shared/paid-ads-form.js
// Form constants shared by the paid ads page (/meta-ads-for-car-dealers/) and the Worker's POST /api/ads-apply
// route. Frozen contract: any change ships with a Worker redeploy. A consent-text change ALWAYS bumps
// PAID_ADS_SMS_CONSENT.version; the retired version goes in PAID_ADS_SMS_CONSENT_PREVIOUS as
// { version, text, retiredAt: 'YYYY-MM-DD' } and stays accepted for 30 days.
//
// The role list and the salesperson off-ramp are the AEO page's (shared/ai-scan-form.js): decision-makers only,
// and a salesperson after the Marketplace posting software is sent to the product demo, never stored.

export { ROLE_CHOICES, MARKETPLACE_ROUTE, MARKETPLACE_DEMO_PATH, MARKETPLACE_DEMO_URL } from './ai-scan-form.js';

// Monthly ad budget the store is ready to spend on Meta (paid to Meta directly, never to AutoLander). The Worker
// rejects any value outside this list; the page uses the same strings as <option> values.
export const AD_BUDGET_CHOICES = [
  'Under $2,000 a month',
  '$2,000 to $5,000 a month',
  '$5,000 to $10,000 a month',
  'More than $10,000 a month',
  'Not sure yet',
];

// Units the store sells in a typical month (new and used together).
export const UNITS_CHOICES = [
  'Under 30 a month',
  '30 to 60 a month',
  '61 to 120 a month',
  'More than 120 a month',
];

// Who runs the store's Facebook and Instagram ads today.
export const ADS_TODAY_CHOICES = [
  'An agency runs them',
  'We run them in-house',
  'Marketplace listings only, no ads',
  'No ads right now',
];

// SMS consent (CTIA / 10DLC): brand, purpose, frequency, not a condition of purchase, rates, STOP/HELP, links.
// The box starts UNCHECKED and is optional.
export const PAID_ADS_SMS_CONSENT = {
  version: 'paid-ads-sms-consent-v1-2026-10-15',
  text: 'Text me about my application. I agree to receive text messages from AutoLander at the mobile number above about my paid ads application and strategy call, up to 4 messages per request. Consent is not a condition of any purchase. Message and data rates may apply. Reply STOP to opt out or HELP for help.',
  links: [
    { label: 'Privacy Policy', href: '/privacy.html' },
    { label: 'Terms', href: '/terms.html' },
  ],
};

export const PAID_ADS_SMS_CONSENT_PREVIOUS = null;
