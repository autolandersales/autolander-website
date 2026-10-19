// Page + Worker contract. Deploy the Worker before publishing a form change.
export { ROLE_CHOICES, MARKETPLACE_ROUTE, MARKETPLACE_DEMO_PATH, MARKETPLACE_DEMO_URL } from './ai-scan-form.js';

export const PROJECT_GOAL_CHOICES = [
  'Replace our current website',
  'Build a new dealership website',
  'Help me choose the right next step',
];

// Optional, unchecked, website-request-specific consent. Changing this copy
// requires a new version; it must never opt a contact into demo/scan/ads SMS.
export const WEBSITE_SMS_CONSENT = {
  version: 'website-sms-consent-v1-2026-10-19',
  text: 'Text me about my website request. I agree to receive text messages from AutoLander at the mobile number above about my dealership website request and project discussion, up to 4 messages per request. Consent is not a condition of any purchase. Message and data rates may apply. Reply STOP to opt out or HELP for help.',
  links: [
    { label: 'Privacy Policy', href: '/privacy.html' },
    { label: 'Terms', href: '/terms.html' },
  ],
};

export const WEBSITE_SMS_CONSENT_PREVIOUS = null;
