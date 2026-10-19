import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { pickBoot } from '../src/lib/boot.js';
import { AI_VISIBILITY_PATH } from '../shared/ai-visibility-route.js';
import { WEBSITE_PATH } from '../shared/dealer-websites-route.js';
import { bootLoaderHtml, deferEntryToPaint } from '../scripts/spa-shell.mjs';

test('pickBoot hydrates only the prerendered page it was built for', () => {
  assert.equal(AI_VISIBILITY_PATH, '/aeo-geo-for-car-dealers/');
  assert.equal(pickBoot('ai-visibility', '/aeo-geo-for-car-dealers/'), 'ai-visibility');
  assert.equal(pickBoot('ai-visibility', '/aeo-geo-for-car-dealers'), 'ai-visibility');
  assert.equal(pickBoot('team', '/team/'), 'team');
  assert.equal(pickBoot('team', '/team'), 'team');
  assert.equal(pickBoot('paid-ads', '/meta-ads-for-car-dealers/'), 'paid-ads');
  assert.equal(pickBoot('paid-ads', '/meta-ads-for-car-dealers'), 'paid-ads');
  assert.equal(pickBoot('paid-ads', '/team/'), 'spa');
  assert.equal(pickBoot('team', '/meta-ads-for-car-dealers/'), 'spa');
  assert.equal(pickBoot(null, '/meta-ads-for-car-dealers/'), 'spa');
  assert.equal(WEBSITE_PATH, '/dealership-websites/');
  assert.equal(pickBoot('dealer-websites', WEBSITE_PATH), 'dealer-websites');
  assert.equal(pickBoot('dealer-websites', '/dealership-websites'), 'dealer-websites');
  assert.equal(pickBoot('dealer-websites', '/dealership-websites/extra'), 'spa');
  assert.equal(pickBoot('dealer-websites', '/dealership-websites-new/'), 'spa');
  assert.equal(pickBoot('dealer-websites', '/team/'), 'spa');
  assert.equal(pickBoot('paid-ads', WEBSITE_PATH), 'spa');
  assert.equal(pickBoot(null, WEBSITE_PATH), 'spa');
  // The retired URL never hydrates (it is a 301 or a redirect stub).
  assert.equal(pickBoot('ai-visibility', '/ai-visibility/'), 'spa');
  assert.equal(pickBoot('ai-visibility', '/ai-visibility'), 'spa');
  assert.equal(pickBoot('ai-visibility', '/aeo-geo-for-car-dealers/extra'), 'spa');
  // The attribute on the wrong path (a shell served for another URL) and every other page: client render.
  assert.equal(pickBoot('team', '/aeo-geo-for-car-dealers/'), 'spa');
  assert.equal(pickBoot('ai-visibility', '/team/'), 'spa');
  assert.equal(pickBoot('team', '/team/extra'), 'spa');
  assert.equal(pickBoot(null, '/'), 'spa');
  assert.equal(pickBoot(null, '/team/'), 'spa');
  assert.equal(pickBoot('home', '/'), 'spa');
  assert.equal(pickBoot(undefined, '/pay/abc'), 'spa');
});

// Runs the inline loader exactly as the shell ships it, against a minimal fake DOM.
function runLoader({ paintSupported = true, bufferedFcp = false } = {}) {
  const html = bootLoaderHtml({ entryHref: '/assets/index-abc.js', preloadHrefs: ['/assets/Route-1.js', '/assets/Dep-2.js'], routeEntryHref: '/assets/Route-1.js' });
  const attrs = Object.fromEntries([...html.matchAll(/ (data-[\w-]+)(?:="([^"]*)")?/g)].map((m) => [m[1], m[2] ?? '']));
  const source = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  const appended = [];
  const timers = [];
  const frames = [];
  const listeners = {};
  let observerCallback = null;
  let disconnected = false;
  const observed = [];
  const document = {
    currentScript: { getAttribute: (name) => (name in attrs ? attrs[name] : null) },
    head: { appendChild: (node) => appended.push(node) },
    createElement: (tag) => ({ tag }),
  };
  const window = {
    addEventListener: (type, fn, capture) => { listeners[type] = { fn, capture }; },
  };
  class PerformanceObserver {
    static supportedEntryTypes = paintSupported ? ['paint', 'largest-contentful-paint'] : ['navigation'];
    constructor(cb) { observerCallback = cb; }
    observe(opts) {
      observed.push(JSON.stringify(opts)); // plain JSON: the object comes from the vm realm
      if (bufferedFcp) observerCallback({ getEntriesByName: (n) => (n === 'first-contentful-paint' ? [{}] : []) }, this);
    }
    disconnect() { disconnected = true; }
  }
  const context = {
    document, window, PerformanceObserver,
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
    requestAnimationFrame: (fn) => frames.push(fn),
  };
  vm.runInNewContext(source, context);
  return { attrs, appended, timers, frames, listeners, observed, fireFcp: () => observerCallback({ getEntriesByName: (n) => (n === 'first-contentful-paint' ? [{}] : []) }, { disconnect() { disconnected = true; } }), window, disconnected: () => disconnected };
}

test('the boot loader requests nothing until the first contentful paint, then the route chunks and the entry once', () => {
  const run = runLoader();
  assert.equal(run.attrs['data-al-entry'], '/assets/index-abc.js');
  assert.equal(run.attrs['data-al-route-entry'], '/assets/Route-1.js');
  assert.deepEqual(run.observed, ['{"type":"paint","buffered":true}']);
  assert.equal(run.frames.length, 0, 'the paint observer is used, not the rAF fallback');
  assert.equal(run.appended.length, 0, 'nothing is fetched before the paint');
  assert.deepEqual(run.timers.map((t) => t.ms), [3000], 'only the 3 s safety net is armed');
  run.fireFcp();
  assert.ok(run.disconnected(), 'the observer stops after the paint');
  const soon = run.timers.find((t) => t.ms === 0);
  assert.ok(soon, 'boot is queued right after the paint');
  soon.fn();
  assert.deepEqual(run.appended.map((n) => [n.tag, n.rel || n.type, n.href || n.src, n.crossOrigin]), [
    ['link', 'modulepreload', '/assets/Route-1.js', ''],
    ['link', 'modulepreload', '/assets/Dep-2.js', ''],
    ['script', 'module', '/assets/index-abc.js', ''],
  ]);
  run.timers.find((t) => t.ms === 3000).fn();
  soon.fn();
  assert.equal(run.appended.length, 3, 'boots exactly once');
});

test('the boot loader handles an already-painted page, no paint timing, and a page that never paints', () => {
  const buffered = runLoader({ bufferedFcp: true });
  assert.ok(buffered.timers.some((t) => t.ms === 0), 'a buffered FCP boots right away');

  const noPaint = runLoader({ paintSupported: false });
  assert.equal(noPaint.frames.length, 1, 'falls back to the next animation frame');
  noPaint.frames[0]();
  noPaint.timers.find((t) => t.ms === 0).fn();
  assert.equal(noPaint.appended.at(-1).src, '/assets/index-abc.js');

  const hidden = runLoader();
  hidden.timers.find((t) => t.ms === 3000).fn();
  assert.equal(hidden.appended.at(-1).src, '/assets/index-abc.js', 'a background tab still boots after 3 s');
});

test('the boot loader remembers a demo tap before the app is up, and only then', () => {
  const run = runLoader();
  const { fn, capture } = run.listeners.click;
  assert.equal(capture, true);
  const trigger = { closest: (sel) => (sel === '[data-demo-application-trigger]' ? {} : null) };
  const other = { closest: () => null };
  fn({ target: other });
  assert.equal(run.window.__alPendingDemo, undefined);
  fn({ target: trigger });
  assert.equal(run.window.__alPendingDemo, true);
  run.window.__alPendingDemo = false;
  run.window.__alHydrated = true;
  fn({ target: trigger });
  assert.equal(run.window.__alPendingDemo, false, 'after mount the app handles its own taps');
});

test('the boot loader notes input since the last fragment navigation (lib/use-live.js reads it)', () => {
  const run = runLoader();
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    assert.equal(JSON.stringify(run.listeners[type].capture), '{"capture":true,"passive":true}', type); // vm-realm object
  }
  assert.equal(run.window.__alInput, undefined);
  run.listeners.touchstart.fn({});
  assert.equal(run.window.__alInput, 1);
  run.listeners.hashchange.fn({});
  assert.equal(run.window.__alInput, 0, 'a followed fragment link is where the visitor wants to be');
  run.listeners.wheel.fn({});
  assert.equal(run.window.__alInput, 1);
});

test('deferEntryToPaint moves the one head entry script to a loader at the end of <body>', () => {
  const shell = '<html><head><script defer src="/al-tags-v1.js"></script>\n    <script type="module" crossorigin src="/assets/index-Ab_1.js"></script>\n</head><body><div id="root"></div>\n  </body></html>';
  const out = deferEntryToPaint(shell, { preloadHrefs: ['/assets/R-1.js'], routeEntryHref: '/assets/R-1.js' });
  assert.doesNotMatch(out, /type="module"/);
  assert.match(out, /<script data-al-boot data-al-entry="\/assets\/index-Ab_1\.js" data-al-route-entry="\/assets\/R-1\.js" data-al-preload="\/assets\/R-1\.js">/);
  assert.ok(out.indexOf('data-al-boot') > out.indexOf('<div id="root">') && out.indexOf('data-al-boot') < out.indexOf('</body>'));
  assert.ok(out.includes('<script defer src="/al-tags-v1.js"></script>'), 'the tag loader contract is untouched');
  assert.doesNotMatch(out, /G-30H80LZMCH|googletagmanager|fbq\(|fbevents/, 'nothing that trips the Worker legacy_gtag skip');
  assert.throws(() => deferEntryToPaint('<head></head><body></body>'), /exactly one entry module script/);
});
