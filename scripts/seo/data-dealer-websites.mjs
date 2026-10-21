// Metadata follows the visible service page, not a claimed ranking or a fabricated review.
// The dedicated route shell is built by spa-fallback.mjs, never by the static silo renderer.
import { WEBSITE_PATH } from '../../shared/dealer-websites-route.js';
import { WEBSITE_IMAGES } from '../../shared/dealer-websites-images.js';
import { IMAGE_SIZES, imagePreloadHtml } from '../../shared/responsive-images.js';
import {
  FAQ,
  HERO,
  META,
  SERVICE_SUMMARY,
  WEBSITE_PUBLISHED,
  WEBSITE_UPDATED,
} from '../../shared/dealer-websites-content.js';

export const WEBSITE_CANONICAL = `https://autolander.ai${WEBSITE_PATH}`;
export const WEBSITE_OG_IMAGE = 'https://autolander.ai/og/dealership-websites.jpg';
export const WEBSITE_LASTMOD = WEBSITE_UPDATED;

const escAttr = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export function dealerWebsitesGraph() {
  const serviceId = `${WEBSITE_CANONICAL}#service`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${WEBSITE_CANONICAL}#webpage`,
        url: WEBSITE_CANONICAL,
        name: META.title,
        description: META.description,
        inLanguage: 'en-US',
        datePublished: WEBSITE_PUBLISHED,
        dateModified: WEBSITE_UPDATED,
        isPartOf: { '@id': 'https://autolander.ai/#website' },
        about: { '@id': serviceId },
        publisher: { '@id': 'https://autolander.ai/#organization' },
        breadcrumb: { '@id': `${WEBSITE_CANONICAL}#breadcrumb` },
        primaryImageOfPage: { '@type': 'ImageObject', url: WEBSITE_OG_IMAGE, width: 1200, height: 630 },
      },
      {
        '@type': 'Service',
        '@id': serviceId,
        name: 'Dealership website design and development',
        serviceType: 'Dealership website creation with SEO and AI-search foundations',
        description: SERVICE_SUMMARY,
        provider: { '@id': 'https://autolander.ai/#organization' },
        areaServed: { '@type': 'Country', name: 'United States' },
        audience: { '@type': 'BusinessAudience', audienceType: 'Car dealership owners, general managers and marketing teams' },
        url: WEBSITE_CANONICAL,
      },
      {
        '@type': 'FAQPage',
        '@id': `${WEBSITE_CANONICAL}#faq`,
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question', name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${WEBSITE_CANONICAL}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'AutoLander', item: 'https://autolander.ai/' },
          { '@type': 'ListItem', position: 2, name: META.breadcrumb, item: WEBSITE_CANONICAL },
        ],
      },
    ],
  };
}

export function dealerWebsitesHead({ preview = false } = {}) {
  const json = JSON.stringify(dealerWebsitesGraph()).replaceAll('<', '\\u003c');
  return `    ${imagePreloadHtml(WEBSITE_IMAGES.hero, IMAGE_SIZES.websitesHero)}
    <meta name="description" content="${escAttr(META.description)}" />
${preview ? '' : '    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />\n'}    <link rel="canonical" href="${WEBSITE_CANONICAL}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${WEBSITE_CANONICAL}" />
    <meta property="og:site_name" content="AutoLander" />
    <meta property="og:title" content="${escAttr(META.ogTitle)}" />
    <meta property="og:description" content="${escAttr(META.ogDescription)}" />
    <meta property="og:image" content="${WEBSITE_OG_IMAGE}" />
    <meta property="og:image:secure_url" content="${WEBSITE_OG_IMAGE}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escAttr(META.ogImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escAttr(META.ogTitle)}" />
    <meta name="twitter:description" content="${escAttr(META.ogDescription)}" />
    <meta name="twitter:image" content="${WEBSITE_OG_IMAGE}" />
    <meta name="twitter:image:alt" content="${escAttr(META.ogImageAlt)}" />
    <script type="application/ld+json">${json}</script>`;
}

export const DEALER_WEBSITES_PAGE = {
  key: 'dealerWebsites',
  path: WEBSITE_PATH,
  spa: true,
  title: META.title,
  description: META.description,
  h1: `${HERO.h1Lead} ${HERO.h1Grad}`,
  updated: WEBSITE_UPDATED,
  faq: FAQ.map(({ q, a }) => [q, a]),
};
