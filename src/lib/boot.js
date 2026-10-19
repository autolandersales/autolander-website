import { AI_VISIBILITY_PATH } from '../../shared/ai-visibility-route.js';
import { PAID_ADS_PATH } from '../../shared/paid-ads-route.js';
import { WEBSITE_PATH } from '../../shared/dealer-websites-route.js';

/**
 * Boot selection for the prerendered marketing routes.
 *
 * scripts/spa-fallback.mjs renders the nav and hero of the AEO and GEO, team, paid-ads and dealership-website
 * pages with React at build time
 * and marks the root with data-al-hydrate. Those pages hydrate (the first paint is React's own DOM, so it is
 * never replaced and stays the page's largest paint) instead of creating a fresh root. Every other page, and
 * any path the attribute does not belong to, keeps the client render in Root.jsx.
 */
export function pickBoot(attr, pathname) {
  if (attr === 'ai-visibility' && (pathname === AI_VISIBILITY_PATH || pathname === AI_VISIBILITY_PATH.slice(0, -1))) return 'ai-visibility';
  if (attr === 'team' && /^\/team\/?$/.test(pathname)) return 'team';
  if (attr === 'paid-ads' && (pathname === PAID_ADS_PATH || pathname === PAID_ADS_PATH.slice(0, -1))) return 'paid-ads';
  if (attr === 'dealer-websites' && (pathname === WEBSITE_PATH || pathname === WEBSITE_PATH.slice(0, -1))) return 'dealer-websites';
  return 'spa';
}

// A hydration mismatch is recoverable (React re-renders on the client, as before prerendering existed), but it
// must never be silent: the build tests and the browser QA grep for this prefix.
export const HYDRATE_OPTIONS = {
  onRecoverableError(error) {
    console.warn('[al-hydrate]', error?.message || String(error));
  },
};

// The static island's current markup, read from the live DOM so the client passes exactly what the server sent.
export function islandHtml(container, name) {
  return container?.querySelector(`[data-al-island="${name}"]`)?.innerHTML ?? '';
}
