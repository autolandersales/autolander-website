import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeFailureScreenshot,
  failureScreenshotErrorText,
  normalizeFailure,
  normalizeFailureResponse,
  normalizeFailureScreenshot,
} from '../src/admin/lib/failure-diagnostics.js';
import { fetchFailureScreenshot } from '../src/admin/lib/analytics.js';

// Train 3814: the admin dash shows what the automation browser looked like when a dealer error
// happened. Error rows carry screenshot METADATA only (the image is fetched lazily, staff only,
// through the Worker's ops-token proxy) and frames are kept 7 days.

const ID = '11111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-10-13T15:00:00.000Z');
const META = {
  id: ID,
  capturedAt: '2026-10-13T14:59:00.000Z',
  expiresAt: '2026-10-19T15:00:00.000Z',
  width: 1280,
  height: 720,
  bytes: 145_000,
  kind: 'listing-action',
  pageUrl: 'https://www.facebook.com/marketplace/you/selling',
  pageTitle: 'Marketplace',
};

test('a failure row keeps the screenshot metadata, and only that', () => {
  const row = normalizeFailure({
    id: 'act-1',
    code: 'SOLD_ACTION_NOT_FOUND',
    message: 'Mark as sold not found',
    screenshot: { ...META, expiresAt: '2099-01-01T00:00:00.000Z', dataUrl: 'data:image/jpeg;base64,AAAA', r2Key: 'failure-shots/x.jpg', extra: 1 },
  });
  assert.equal(row.screenshot.id, ID);
  assert.deepEqual(Object.keys(row.screenshot).sort(), [
    'bytes', 'capturedAt', 'expiresAt', 'height', 'id', 'kind', 'pageTitle', 'pageUrl', 'width',
  ]);
  assert.equal(JSON.stringify(row.screenshot).includes('data:image'), false);
  assert.equal(JSON.stringify(row.screenshot).includes('failure-shots/'), false);
});

test('no, malformed or expired screenshot metadata means no chip', () => {
  assert.equal(normalizeFailure({ id: 'a', code: 'X' }).screenshot, null);
  assert.equal(normalizeFailure({ id: 'a', code: 'X', screenshot: null }).screenshot, null);
  assert.equal(normalizeFailureScreenshot({ ...META, id: 'not-a-uuid' }, NOW), null);
  assert.equal(normalizeFailureScreenshot({ ...META, expiresAt: '2026-10-13T14:00:00.000Z' }, NOW), null);
  assert.equal(normalizeFailureScreenshot({ ...META, expiresAt: 'soon' }, NOW), null);
  assert.equal(normalizeFailureScreenshot([META], NOW), null);
});

test('the page URL is kept as text only for http(s), without a query string', () => {
  assert.equal(normalizeFailureScreenshot({ ...META, pageUrl: 'javascript:alert(1)' }, NOW).pageUrl, '');
  assert.equal(
    normalizeFailureScreenshot({ ...META, pageUrl: 'https://www.facebook.com/marketplace/edit/?listing_id=1#x' }, NOW).pageUrl,
    'https://www.facebook.com/marketplace/edit/',
  );
});

test('list responses carry the metadata on each row', () => {
  const response = normalizeFailureResponse({ rows: [{ id: 'a', code: 'X', screenshot: { ...META, expiresAt: '2099-01-01T00:00:00.000Z' } }, { id: 'b', code: 'Y' }], total: 2 });
  assert.equal(response.rows[0].screenshot.id, ID);
  assert.equal(response.rows[1].screenshot, null);
});

test('the caption names size, weight, expiry and the page', () => {
  const meta = normalizeFailureScreenshot(META, NOW);
  assert.equal(
    describeFailureScreenshot(meta, NOW),
    '1280×720 · 142 KB · expires in 6 d · www.facebook.com/marketplace/you/selling',
  );
  assert.equal(
    describeFailureScreenshot({ ...meta, expiresAt: '2026-10-14T01:00:00.000Z' }, NOW),
    '1280×720 · 142 KB · expires within a day · www.facebook.com/marketplace/you/selling',
  );
  assert.equal(describeFailureScreenshot(null), '');
});

test('the error copy says expired for 404 and storage for 503', () => {
  assert.equal(failureScreenshotErrorText({ status: 404 }), 'Screenshot expired (kept 7 days).');
  assert.equal(failureScreenshotErrorText({ status: 503 }), 'Screenshot storage unavailable.');
  assert.equal(failureScreenshotErrorText(new Error('boom')), 'Could not load the screenshot. Try again in a moment.');
});

test('the image is fetched through the admin analytics proxy, by id', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  let requestSignal;
  globalThis.fetch = async (url, options) => {
    request = new URL(String(url), 'https://admin.example.test');
    requestSignal = options?.signal;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ...META, expiresAt: '2099-01-01T00:00:00.000Z', orgId: 'org-a', dataUrl: 'data:image/jpeg;base64,/9j/AAAA' }),
    };
  };
  try {
    const controller = new AbortController();
    const image = await fetchFailureScreenshot(ID, { signal: controller.signal });
    assert.equal(request.pathname, `/admin-api/analytics/failure-screenshots/${ID}`);
    assert.equal(request.search, '');
    assert.equal(requestSignal, controller.signal);
    assert.equal(image.dataUrl, 'data:image/jpeg;base64,/9j/AAAA');
    assert.equal(image.id, ID);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a non-JPEG data URL or any other URL is never rendered', async () => {
  const originalFetch = globalThis.fetch;
  for (const dataUrl of ['https://pub-example.r2.dev/failure-shots/x.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', '']) {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...META, expiresAt: '2099-01-01T00:00:00.000Z', dataUrl }),
    });
    try {
      await assert.rejects(fetchFailureScreenshot(ID), (error) => error.status === 502);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test('an expired frame surfaces the 404 to the row', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ ok: false, reason: 'not_found', error: 'not_found' }) });
  try {
    await assert.rejects(fetchFailureScreenshot(ID), (error) => error.status === 404 && failureScreenshotErrorText(error).includes('expired'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
