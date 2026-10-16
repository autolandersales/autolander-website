// Head and JSON-LD for /meta-ads-for-car-dealers/ (paid ads + AI commercials for car dealers). The copy lives in
// shared/paid-ads-content.js; this module only shapes it for the <head> and the graph.
import { ADS_IMAGES } from '../../shared/page-images.js';
import { imagePreloadHtml, IMAGE_SIZES } from '../../shared/responsive-images.js';
import { PAID_ADS_PATH } from '../../shared/paid-ads-route.js';
import {
  FAQ,
  HEADLINES,
  META,
  PAID_ADS_PUBLISHED,
  PAID_ADS_UPDATED,
  PLANS,
  SERVICE_SUMMARY,
} from '../../shared/paid-ads-content.js';

export const PAID_ADS_CANONICAL = `https://autolander.ai${PAID_ADS_PATH}`;
export const PAID_ADS_OG_IMAGE = 'https://autolander.ai/og/paid-ads.jpg';
export const PAID_ADS_LASTMOD = PAID_ADS_UPDATED;

const escAttr = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export function paidAdsGraph() {
  const service = `${PAID_ADS_CANONICAL}#service`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${PAID_ADS_CANONICAL}#webpage`,
        url: PAID_ADS_CANONICAL,
        name: META.title,
        description: META.description,
        inLanguage: 'en-US',
        datePublished: PAID_ADS_PUBLISHED,
        dateModified: PAID_ADS_UPDATED,
        isPartOf: { '@id': 'https://autolander.ai/#website' },
        about: { '@id': service },
        publisher: { '@id': 'https://autolander.ai/#organization' },
        primaryImageOfPage: { '@type': 'ImageObject', url: PAID_ADS_OG_IMAGE, width: 1200, height: 630 },
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.al-ads-summary', '.al-faq-a'] },
      },
      {
        '@type': 'Service',
        '@id': service,
        name: 'Paid ads and AI commercials for car dealers',
        serviceType: 'Facebook and Instagram advertising management with AI-produced video commercials',
        description: SERVICE_SUMMARY,
        provider: { '@id': 'https://autolander.ai/#organization' },
        areaServed: { '@type': 'Country', name: 'United States' },
        audience: { '@type': 'BusinessAudience', audienceType: 'Car dealerships' },
        url: PAID_ADS_CANONICAL,
        offers: PLANS.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          url: `${PAID_ADS_CANONICAL}#${plan.anchor}`,
          availability: plan.availability === 'by-application' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
          description: `${plan.summary} Month to month, quoted on the first call. Ad spend is paid to Meta directly. The first commercial is free when the dealer signs on.`,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${PAID_ADS_CANONICAL}#faq`,
        mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${PAID_ADS_CANONICAL}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'AutoLander', item: 'https://autolander.ai/' },
          { '@type': 'ListItem', position: 2, name: META.breadcrumb, item: PAID_ADS_CANONICAL },
        ],
      },
    ],
  };
}

export function paidAdsHead({ preview = false } = {}) {
  const json = JSON.stringify(paidAdsGraph()).replaceAll('<', '\\u003c');
  return `    ${imagePreloadHtml(ADS_IMAGES.poster, IMAGE_SIZES.adsPoster)}
    <meta name="description" content="${escAttr(META.description)}" />
${preview ? '' : '    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />\n'}    <link rel="canonical" href="${PAID_ADS_CANONICAL}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${PAID_ADS_CANONICAL}" />
    <meta property="og:site_name" content="AutoLander" />
    <meta property="og:title" content="${escAttr(META.ogTitle)}" />
    <meta property="og:description" content="${escAttr(META.ogDescription)}" />
    <meta property="og:image" content="${PAID_ADS_OG_IMAGE}" />
    <meta property="og:image:secure_url" content="${PAID_ADS_OG_IMAGE}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escAttr(META.ogImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escAttr(META.ogTitle)}" />
    <meta name="twitter:description" content="${escAttr(META.ogDescription)}" />
    <meta name="twitter:image" content="${PAID_ADS_OG_IMAGE}" />
    <meta name="twitter:image:alt" content="${escAttr(META.ogImageAlt)}" />
    <script type="application/ld+json">${json}</script>`;
}

// The registry page object (scripts/seo/registry.mjs NAV.paidAds is the route; this adds the h1 for build-seo-pages).
export const PAID_ADS_PAGE = {
  key: 'paidAds',
  path: PAID_ADS_PATH,
  spa: true,
  title: META.title,
  description: META.description,
  h1: HEADLINES.a,
  updated: PAID_ADS_UPDATED,
  faq: FAQ.map(({ q, a }) => [q, a]),
};
