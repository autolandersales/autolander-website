// Keeps Cloudflare's edge from rewriting the HTML of the allowlisted prerendered pages.
//
// WHY
// ---
// The homepage and allowlisted marketing pages below ship a finished
// first screen and load their app after the first paint.
// Cloudflare Web Analytics (RUM) is auto-injected at the edge as a High-priority <script type="module">
// from a third-party origin (static.cloudflareinsights.com) plus a /cdn-cgi/rum call; it lands on the
// critical path of those pages (lab FCP ~1.4 s -> ~2.0 s on the AEO and GEO page and /team/). Cloudflare
// documents exactly one response-level switch that stops the injection: `Cache-Control: no-transform`
// ("the Beacon script will not be automatically injected", developers.cloudflare.com/web-analytics/faq/).
// These pages load the same beacon themselves after the load event instead (scripts/spa-shell.mjs,
// beaconLoaderHtml), so Web Analytics keeps collecting.
//
// WHAT no-transform ALSO TURNS OFF, AND HOW THIS FILE COVERS IT
// -------------------------------------------------------------
// * Edge compression. no-transform stops Cloudflare from encoding the response (and RFC 9110 forbids an
//   intermediary from changing its content-coding), so the Worker encodes it itself, in a coding the CLIENT
//   accepts: br or gzip by the client's q-values (br on a tie), identity when neither is accepted. The runtime
//   compresses the body to match (encodeBody "automatic").
//   The client's value is NOT the Accept-Encoding header the Worker sees: in production Cloudflare rewrites
//   that header (a Worker always gets "gzip, br", workerd#5289) and keeps the client's own value in
//   request.cf.clientAcceptEncoding ("If Cloudflare replaces the value of the Accept-Encoding header, the
//   original value is stored in the clientAcceptEncoding property", Workers Request docs). So whenever a cf
//   object is present only cf.clientAcceptEncoding counts; when it is missing the client's value is unknown and
//   the response is left to the edge (no no-transform: the edge compresses and injects the beacon as before, and
//   the page's own loader stands down). The header itself is read only where there is no cf object (Node tests).
// * Email Address Obfuscation. Every address on these pages is already wrapped in email_off
//   (intentionally readable, identical to what the edge serves today); test/worker-no-transform.test.js
//   fails the build if an unwrapped address appears on them.
// * Nothing else in use: no Rocket Loader, Fonts, Polish or JS detections on these pages. Zaraz is
//   injected by this Worker (zaraz-tag.js), not by the edge, so it is unaffected.
//
// SCOPE, KILL SWITCH AND STAGED ROLLOUT
// -------------------------------------
// Only GET 200 text/html responses on exactly these paths; everything else is returned untouched.
// TRACKING KV `cfg:html_no_transform` ('on' | 'off', 60 s cache) overrides env HTML_NO_TRANSFORM, which ships
// 'off'. Deploy the Worker, then set the KV to 'on' and, within the 60 s cache window, check / and /aeo-geo-for-car-dealers/
// with GETs (never `curl -I`: a HEAD is never given no-transform and gets X-AL-Zaraz skip:method):
//   curl -s -D - -o b.raw -H 'Accept: text/html' -H 'Accept-Encoding:' URL  -> no Content-Encoding, b.raw starts
//        with <!doctype html> (X-AL-Edge no-transform:identity, or skip:client-accept-encoding if the edge gave the
//        Worker no cf.clientAcceptEncoding for an absent header: the edge then encodes, as before)
//   curl -s -D - -o b.gz  -H 'Accept: text/html' -H 'Accept-Encoding: gzip' URL           -> gzip  (gzip -dc b.gz)
//   curl -s -D - -o b.gz  -H 'Accept: text/html' -H 'Accept-Encoding: gzip, deflate' URL  -> gzip
//   curl -s -D - -o b.br  -H 'Accept: text/html' -H 'Accept-Encoding: br' URL             -> br    (brotli -dc b.br)
// each with Cache-Control ... no-transform, X-AL-Edge: no-transform:<coding>, and a decoded body that contains the
// page's <h1>. On any failure set the KV back to 'off' (no deploy needed). A rollback of the site to a build without
// the page beacon loader (data-al-cf-beacon-loader) needs the KV set to 'off' too, or those pages send no Web
// Analytics. Any error in here returns the response unchanged.

import { AI_VISIBILITY_PATH } from '../../../shared/ai-visibility-route.js';
import { PAID_ADS_PATH } from '../../../shared/paid-ads-route.js';
import { WEBSITE_PATH } from '../../../shared/dealer-websites-route.js';

// The retired /ai-visibility/ is not listed: the Worker answers it with a 301 (moved-pages.js) before this runs.
export const NO_TRANSFORM_PATHS = new Set(['/', '/index.html', AI_VISIBILITY_PATH, '/team/', PAID_ADS_PATH, WEBSITE_PATH]);
export const NO_TRANSFORM_KEY = 'cfg:html_no_transform';

export async function readNoTransformMode(env) {
  try {
    const value = await env.TRACKING?.get(NO_TRANSFORM_KEY, { cacheTtl: 60 });
    if (value === 'on' || value === 'off') return value;
  } catch { /* KV failure: fall back to the deployed default. */ }
  return env.HTML_NO_TRANSFORM === 'on' ? 'on' : 'off';
}

/**
 * The Accept-Encoding the client itself sent ('' = none), or undefined when it cannot be known (see above).
 * Read it from the incoming request, before anything re-creates that request.
 */
export function clientAcceptEncoding(request) {
  const cf = request?.cf;
  if (cf && typeof cf === 'object') {
    return typeof cf.clientAcceptEncoding === 'string' ? cf.clientAcceptEncoding : undefined;
  }
  return request?.headers?.get('Accept-Encoding') ?? '';
}

// q-values per coding from an Accept-Encoding header ("br;q=0" means NOT acceptable).
function acceptedCodings(header) {
  const q = new Map();
  for (const part of String(header || '').toLowerCase().split(',')) {
    const [name, ...params] = part.split(';').map((s) => s.trim());
    if (!name) continue;
    let weight = 1;
    for (const param of params) {
      const m = /^q=([0-9.]+)$/.exec(param);
      if (m) weight = Number(m[1]);
    }
    q.set(name, Number.isFinite(weight) ? weight : 0);
  }
  return q;
}

export function pickContentEncoding(acceptEncoding) {
  const q = acceptedCodings(acceptEncoding);
  const weight = (name) => (q.has(name) ? q.get(name) : (q.get('*') || 0));
  const br = weight('br');
  const gzip = weight('gzip');
  if (br > 0 && br >= gzip) return 'br';
  if (gzip > 0) return 'gzip';
  return '';
}

export function isNoTransformPage(request, url, response) {
  return request.method === 'GET'
    && response.status === 200
    && NO_TRANSFORM_PATHS.has(url.pathname)
    && (response.headers.get('Content-Type') || '').toLowerCase().includes('text/html');
}

// options.acceptEncoding: the client's value as clientAcceptEncoding() read it from the incoming request (undefined =
// unknown). When the option is absent it is read from `request` here.
export function withoutEdgeRewrites(request, url, response, options = {}) {
  try {
    const mode = options.mode || 'off';
    if (mode !== 'on' || !isNoTransformPage(request, url, response)) return response;
    const acceptEncoding = 'acceptEncoding' in options ? options.acceptEncoding : clientAcceptEncoding(request);
    const headers = new Headers(response.headers);
    if (typeof acceptEncoding !== 'string') {
      // The client's Accept-Encoding is unknown: leave the coding (and the beacon) to the edge, exactly as before.
      headers.set('X-AL-Edge', 'skip:client-accept-encoding');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    const cacheControl = headers.get('Cache-Control') || '';
    if (!/(^|,)\s*no-transform\s*(,|$)/i.test(cacheControl)) {
      headers.set('Cache-Control', cacheControl ? `${cacheControl}, no-transform` : 'no-transform');
    }
    const encoding = pickContentEncoding(acceptEncoding);
    if (encoding) headers.set('Content-Encoding', encoding);
    else headers.delete('Content-Encoding');
    headers.delete('Content-Length');
    // The bytes now depend on the negotiated coding: a strong validator would be wrong.
    const etag = headers.get('ETag');
    if (etag && !etag.startsWith('W/')) headers.set('ETag', `W/${etag}`);
    const vary = String(headers.get('Vary') || '');
    if (!/(^|,)\s*accept-encoding\s*(,|$)/i.test(vary)) headers.set('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
    headers.set('X-AL-Edge', `no-transform:${encoding || 'identity'}`);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
      encodeBody: 'automatic',
    });
  } catch {
    return response;
  }
}
