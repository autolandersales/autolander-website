import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import worker from '../worker/src/index.js';
import {
  NO_TRANSFORM_KEY, NO_TRANSFORM_PATHS, clientAcceptEncoding, pickContentEncoding, readNoTransformMode, withoutEdgeRewrites,
} from '../worker/src/agent/no-transform.js';
import { beaconLoaderHtml, CF_WEB_ANALYTICS_TOKEN } from '../scripts/spa-shell.mjs';
import { AI_VISIBILITY_DIR, AI_VISIBILITY_PATH } from '../shared/ai-visibility-route.js';
import { PAID_ADS_DIR, PAID_ADS_PATH } from '../shared/paid-ads-route.js';
import { WEBSITE_DIR, WEBSITE_PATH } from '../shared/dealer-websites-route.js';

const html = '<html><head><script defer src="/al-tags-v1.js"></script></head><body>OK</body></html>';
const page = (headers = {}, status = 200) => new Response(html, { status, headers: {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'max-age=600', 'Content-Encoding': 'gzip',
  'Content-Length': '999', ETag: '"abc"', Vary: 'Accept-Encoding', ...headers,
} });
const get = (path, headers = {}) => new Request(`https://autolander.ai${path}`, { headers: { 'Accept-Encoding': 'gzip, deflate, br, zstd', ...headers } });

test('content coding follows the client: br, then gzip, else identity; q=0 means refused', () => {
  assert.equal(pickContentEncoding('gzip, deflate, br, zstd'), 'br');
  assert.equal(pickContentEncoding('gzip, deflate'), 'gzip');
  assert.equal(pickContentEncoding('br;q=0, gzip;q=0.8'), 'gzip');
  assert.equal(pickContentEncoding('gzip;q=0, br;q=0'), '');
  assert.equal(pickContentEncoding('identity'), '');
  assert.equal(pickContentEncoding(''), '');
  assert.equal(pickContentEncoding(null), '');
  assert.equal(pickContentEncoding('*'), 'br');
  assert.equal(pickContentEncoding('*;q=0, gzip'), 'gzip');
  // The client's order of preference counts; br wins only a tie.
  assert.equal(pickContentEncoding('br;q=0.1, gzip;q=1'), 'gzip');
  assert.equal(pickContentEncoding('gzip;q=0.5, br;q=0.5'), 'br');
  assert.equal(pickContentEncoding('gzip, *;q=0.2'), 'gzip');
});

// A production request: Cloudflare hands the Worker a rewritten header ("gzip, br", workerd#5289) and keeps the
// client's own value in cf.clientAcceptEncoding. Node's Request has no cf, so it is attached here.
const edgeGet = (path, cf, header = 'gzip, br') => {
  const request = new Request(`https://autolander.ai${path}`, { headers: { Accept: 'text/html', 'Accept-Encoding': header } });
  Object.defineProperty(request, 'cf', { value: cf, enumerable: true });
  return request;
};

test('in production the coding follows cf.clientAcceptEncoding, never the rewritten header', async () => {
  assert.equal(clientAcceptEncoding(edgeGet('/', { clientAcceptEncoding: 'gzip, deflate' })), 'gzip, deflate');
  assert.equal(clientAcceptEncoding(edgeGet('/', { clientAcceptEncoding: '' })), '');
  assert.equal(clientAcceptEncoding(edgeGet('/', { country: 'US' })), undefined, 'unknown, not the header');
  assert.equal(clientAcceptEncoding(get('/', { 'Accept-Encoding': 'gzip' })), 'gzip', 'no cf object (Node): the header');
  assert.equal(clientAcceptEncoding(new Request('https://autolander.ai/')), '');

  const url = new URL('https://autolander.ai/aeo-geo-for-car-dealers/');
  const gzip = withoutEdgeRewrites(edgeGet('/aeo-geo-for-car-dealers/', { clientAcceptEncoding: 'gzip, deflate' }), url, page(), { mode: 'on' });
  assert.equal(gzip.headers.get('Content-Encoding'), 'gzip', 'curl --compressed / python-requests without brotli');
  assert.equal(gzip.headers.get('X-AL-Edge'), 'no-transform:gzip');
  const none = withoutEdgeRewrites(edgeGet('/aeo-geo-for-car-dealers/', { clientAcceptEncoding: '' }), url, page(), { mode: 'on' });
  assert.equal(none.headers.get('Content-Encoding'), null, 'plain curl / Go net/http without compression: identity');
  assert.equal(none.headers.get('X-AL-Edge'), 'no-transform:identity');
  assert.equal(await none.text(), html);
  const br = withoutEdgeRewrites(edgeGet('/aeo-geo-for-car-dealers/', { clientAcceptEncoding: 'gzip, deflate, br' }), url, page(), { mode: 'on' });
  assert.equal(br.headers.get('Content-Encoding'), 'br');

  // No cf.clientAcceptEncoding: the client's value is unknown, so the edge keeps encoding (and injecting) as before.
  const unknown = withoutEdgeRewrites(edgeGet('/aeo-geo-for-car-dealers/', { country: 'US' }), url, page(), { mode: 'on' });
  assert.equal(unknown.headers.get('Cache-Control'), 'max-age=600', 'no no-transform');
  assert.equal(unknown.headers.get('Content-Encoding'), 'gzip', 'origin coding untouched');
  assert.equal(unknown.headers.get('ETag'), '"abc"');
  assert.equal(unknown.headers.get('X-AL-Edge'), 'skip:client-accept-encoding');
  assert.equal(await unknown.text(), html);

  // An explicit value (index.js passes the one it read before re-creating the request) wins over the request's.
  const explicit = withoutEdgeRewrites(get('/'), new URL('https://autolander.ai/'), page(), { mode: 'on', acceptEncoding: 'gzip' });
  assert.equal(explicit.headers.get('Content-Encoding'), 'gzip');
});

test('allowlisted prerendered pages get no-transform and a Worker-chosen encoding; headers are otherwise kept', async () => {
  for (const path of NO_TRANSFORM_PATHS) {
    const out = withoutEdgeRewrites(get(path), new URL(`https://autolander.ai${path}`), page({ 'X-AL-Zaraz': 'injected:on' }), { mode: 'on' });
    assert.equal(out.headers.get('Cache-Control'), 'max-age=600, no-transform', path);
    assert.equal(out.headers.get('Content-Encoding'), 'br', path);
    assert.equal(out.headers.get('Content-Length'), null, 'the runtime re-encodes: no stale length');
    assert.equal(out.headers.get('ETag'), 'W/"abc"', 'the validator is weakened, not dropped');
    assert.equal(out.headers.get('Vary'), 'Accept-Encoding');
    assert.equal(out.headers.get('X-AL-Zaraz'), 'injected:on', 'the Zaraz header survives');
    assert.equal(out.headers.get('X-AL-Edge'), 'no-transform:br');
    assert.equal(await out.text(), html, 'the body is unchanged');
  }
  const gzip = withoutEdgeRewrites(get('/team/', { 'Accept-Encoding': 'gzip' }), new URL('https://autolander.ai/team/?v=b'), page(), { mode: 'on' });
  assert.equal(gzip.headers.get('Content-Encoding'), 'gzip');
  const identity = withoutEdgeRewrites(get('/', { 'Accept-Encoding': '' }), new URL('https://autolander.ai/'), page({ 'Cache-Control': '', Vary: 'Accept' }), { mode: 'on' });
  assert.equal(identity.headers.get('Content-Encoding'), null, 'a client that accepts no coding gets identity');
  assert.equal(identity.headers.get('Cache-Control'), 'no-transform');
  assert.equal(identity.headers.get('Vary'), 'Accept, Accept-Encoding');
  const already = withoutEdgeRewrites(get('/'), new URL('https://autolander.ai/'), page({ 'Cache-Control': 'public, no-transform' }), { mode: 'on' });
  assert.equal(already.headers.get('Cache-Control'), 'public, no-transform');
});

test('the no-transform list carries the AEO and GEO page and never its retired URL', () => {
  assert.ok(NO_TRANSFORM_PATHS.has('/aeo-geo-for-car-dealers/'));
  assert.ok(!NO_TRANSFORM_PATHS.has('/ai-visibility/'));
  assert.ok(!NO_TRANSFORM_PATHS.has('/ai-visibility'));
  assert.ok(NO_TRANSFORM_PATHS.has(WEBSITE_PATH));
  assert.ok(!NO_TRANSFORM_PATHS.has(`${WEBSITE_PATH}extra`));
});

test('everything else is returned as the very same response', () => {
  const cases = [
    [get('/contact/'), 'https://autolander.ai/contact/', page()],
    [get('/dealership-websites/extra'), 'https://autolander.ai/dealership-websites/extra', page()],
    [get('/ai-visibility'), 'https://autolander.ai/ai-visibility', page()],
    [get('/team/index.md'), 'https://autolander.ai/team/index.md', page({ 'Content-Type': 'text/markdown' })],
    [get('/'), 'https://autolander.ai/', page({ 'Content-Type': 'text/markdown; charset=utf-8' })],
    [get('/'), 'https://autolander.ai/', page({}, 404)],
    [get('/'), 'https://autolander.ai/', new Response(null, { status: 304, headers: { 'Content-Type': 'text/html' } })],
    [new Request('https://autolander.ai/', { method: 'HEAD' }), 'https://autolander.ai/', page()],
    [get('/pay/abc'), 'https://autolander.ai/pay/abc', page({}, 404)],
  ];
  for (const [request, url, response] of cases) {
    assert.equal(withoutEdgeRewrites(request, new URL(url), response, { mode: 'on' }), response, url);
  }
  const on = page();
  assert.equal(withoutEdgeRewrites(get('/'), new URL('https://autolander.ai/'), on, { mode: 'off' }), on, 'kill switch');
  const broken = { headers: { get() { throw new Error('boom'); } }, status: 200 };
  assert.equal(withoutEdgeRewrites(get('/'), new URL('https://autolander.ai/'), broken, { mode: 'on' }), broken, 'fails open');
});

test('mode: KV overrides the deployed default, failures fall back to it', async () => {
  const kv = (value) => ({ TRACKING: { get: async (key, options) => {
    assert.equal(key, NO_TRANSFORM_KEY); assert.deepEqual(options, { cacheTtl: 60 }); return value;
  } } });
  assert.equal(await readNoTransformMode({ ...kv('off'), HTML_NO_TRANSFORM: 'on' }), 'off');
  assert.equal(await readNoTransformMode({ ...kv('on'), HTML_NO_TRANSFORM: 'off' }), 'on');
  assert.equal(await readNoTransformMode({ ...kv('garbage'), HTML_NO_TRANSFORM: 'on' }), 'on');
  assert.equal(await readNoTransformMode({ TRACKING: { get() { throw new Error('KV down'); } }, HTML_NO_TRANSFORM: 'on' }), 'on');
  assert.equal(await readNoTransformMode({}), 'off');
  const toml = readFileSync('worker/wrangler.toml', 'utf8');
  assert.match(toml, /^HTML_NO_TRANSFORM = "off"$/m, 'ships off: the KV turns it on after the deploy (staged rollout)');
});

test('the Worker applies it end to end on the homepage and nowhere else, keeping the Zaraz injection', async (t) => {
  const origin = '<!doctype html><html><head><script defer src="/al-tags-v1.js"></script></head><body><p>Home</p></body></html>';
  t.mock.method(globalThis, 'fetch', async () => new Response(origin, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'max-age=600' } }));
  const env = { TRACKING: { get: async (key) => ({ 'cfg:zaraz_mode': 'on', [NO_TRANSFORM_KEY]: 'on' })[key] ?? null } };
  const home = await worker.fetch(new Request('https://autolander.ai/', { headers: { Accept: 'text/html', 'Accept-Encoding': 'gzip, br' } }), env, { waitUntil() {} });
  assert.equal(home.status, 200);
  assert.match(home.headers.get('Cache-Control'), /no-transform/);
  assert.equal(home.headers.get('Content-Encoding'), 'br');
  assert.equal(home.headers.get('X-AL-Zaraz'), 'injected:on');
  assert.ok((await home.text()).includes('data-al-zaraz'), 'Zaraz still injected');
  // Production shape: the Worker sees "gzip, br" but the client sent "gzip, deflate". The Zaraz path re-creates the
  // request (dropping cf in Node), so this also proves the client's value is read before that.
  const edgeHome = await worker.fetch(edgeGet('/', { clientAcceptEncoding: 'gzip, deflate' }), env, { waitUntil() {} });
  assert.equal(edgeHome.headers.get('Content-Encoding'), 'gzip');
  assert.equal(edgeHome.headers.get('X-AL-Zaraz'), 'injected:on');
  const edgePlain = await worker.fetch(edgeGet('/team/', { clientAcceptEncoding: '' }), env, { waitUntil() {} });
  assert.equal(edgePlain.headers.get('Content-Encoding'), null);
  assert.match(await edgePlain.text(), /^<!doctype html>/);
  const edgeUnknown = await worker.fetch(edgeGet('/', {}), env, { waitUntil() {} });
  assert.doesNotMatch(edgeUnknown.headers.get('Cache-Control') || '', /no-transform/);
  assert.equal(edgeUnknown.headers.get('X-AL-Edge'), 'skip:client-accept-encoding');
  const head = await worker.fetch(new Request('https://autolander.ai/', { method: 'HEAD', headers: { Accept: 'text/html' } }), env, { waitUntil() {} });
  assert.equal(head.headers.get('X-AL-Edge'), null, 'HEAD is never given no-transform: verify with GET');
  const off = await worker.fetch(edgeGet('/', { clientAcceptEncoding: 'br' }), { TRACKING: { get: async (key) => ({ 'cfg:zaraz_mode': 'on' })[key] ?? null } }, { waitUntil() {} });
  assert.equal(off.headers.get('X-AL-Edge'), null, 'KV unset: the shipped default is off');
  const contact = await worker.fetch(new Request('https://autolander.ai/contact/', { headers: { Accept: 'text/html', 'Accept-Encoding': 'gzip, br' } }), env, { waitUntil() {} });
  assert.doesNotMatch(contact.headers.get('Cache-Control') || '', /no-transform/, 'every other page keeps the edge features');
  assert.equal(contact.headers.get('X-AL-Edge'), null);
});

test('the built no-transform pages are exactly the pages that load Web Analytics themselves', { skip: !existsSync('dist/index.html') }, () => {
  const files = { '/': 'dist/index.html', '/index.html': 'dist/index.html', [AI_VISIBILITY_PATH]: `dist/${AI_VISIBILITY_DIR}/index.html`, '/team/': 'dist/team/index.html', [PAID_ADS_PATH]: `dist/${PAID_ADS_DIR}/index.html`, [WEBSITE_PATH]: `dist/${WEBSITE_DIR}/index.html` };
  assert.deepEqual([...NO_TRANSFORM_PATHS].sort(), Object.keys(files).sort());
  for (const [path, file] of Object.entries(files)) {
    const built = readFileSync(file, 'utf8');
    assert.equal((built.match(/data-al-cf-beacon-loader/g) || []).length, 1, path);
    // no-transform also turns off the edge's Email Address Obfuscation: nothing outside email_off may rely on it.
    const visible = built.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, '');
    assert.doesNotMatch(visible, /[\w.%+-]+@[\w-]+\.[\w.-]+/, `${path}: an address the edge used to obfuscate`);
    assert.doesNotMatch(built, /G-30H80LZMCH|googletagmanager|fbq\(|fbevents|beacon\.min\.js\/v/, path);
  }
  for (const file of ['dist/404.html', 'dist/admin/index.html', 'dist/pay/index.html', 'dist/contact/index.html', 'dist/ai-visibility/index.html']) {
    if (existsSync(file)) assert.doesNotMatch(readFileSync(file, 'utf8'), /data-al-cf-beacon-loader/, file);
  }
});

function runBeaconLoader({ hostname = 'autolander.ai', readyState = 'loading', edgeBeacon = false, idle = true } = {}) {
  const source = beaconLoaderHtml().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  const listeners = [];
  const timers = [];
  const appended = [];
  const window = {
    addEventListener: (type, fn, opts) => listeners.push({ type, fn, opts }),
    removeEventListener: (type, fn) => { const i = listeners.findIndex((l) => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1); },
    requestIdleCallback: idle ? (fn) => fn() : undefined,
  };
  const document = {
    readyState,
    querySelector: (sel) => (edgeBeacon && sel === 'script[data-cf-beacon]' ? {} : null),
    createElement: () => { const attrs = {}; return { attrs, setAttribute: (k, v) => { attrs[k] = v; } }; },
    body: { appendChild: (node) => appended.push(node) },
  };
  vm.runInNewContext(source, { window, document, location: { hostname }, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {} });
  const fire = (type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({}));
  return { listeners, timers, appended, fire };
}

test('the page beacon loads after load (1.5 s or first interaction), once, only on production, never twice', () => {
  const run = runBeaconLoader();
  assert.equal(run.appended.length, 0);
  assert.deepEqual(run.listeners.map((l) => l.type), ['load'], 'nothing before load');
  run.fire('load');
  assert.equal(run.timers.at(-1).ms, 1500);
  run.fire('scroll');
  assert.equal(run.appended.length, 1);
  const s = run.appended[0];
  assert.equal(s.src, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal(s.defer, true);
  // The edge's own settings: `version` makes it report to the zone's same-origin /cdn-cgi/rum.
  assert.deepEqual(JSON.parse(s.attrs['data-cf-beacon']), { version: '2024.11.0', token: CF_WEB_ANALYTICS_TOKEN, r: 1, spa: 2 });
  run.timers.at(-1).fn();
  run.fire('pointerdown');
  assert.equal(run.appended.length, 1, 'once');

  const complete = runBeaconLoader({ readyState: 'complete', idle: false });
  assert.equal(complete.timers[0].ms, 1500, 'armed immediately after load');
  complete.timers[0].fn();
  complete.timers.at(-1).fn();
  assert.equal(complete.appended.length, 1, 'timer path without requestIdleCallback');

  const deduped = runBeaconLoader({ readyState: 'complete', edgeBeacon: true });
  deduped.timers[0].fn();
  assert.equal(deduped.appended.length, 0, 'stands down when the edge injected the beacon (kill switch off)');

  const preview = runBeaconLoader({ hostname: 'autolander-preview.pages.dev', readyState: 'complete' });
  assert.equal(preview.listeners.length + preview.timers.length, 0, 'never off the production host');
});
