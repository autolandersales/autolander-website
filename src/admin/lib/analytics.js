import { apiGet, apiPost, apiPut } from './api.js';
import { normalizeFailureResponse, normalizeFailureScreenshot } from './failure-diagnostics.js';
import { normalizePostResponse } from './post-analytics.js';
export { isOpsNotConfigured, OPS_SETUP_NOTE } from './ops.js';

const BASE = '/admin/analytics';
const PAGE_CONCURRENCY = 4;

export async function fetchOverview(params = {}, options = {}) {
  const payload = await apiGet(`${BASE}/overview${queryString(params)}`, options);
  return payload?.overview && typeof payload.overview === 'object' ? payload.overview : payload || {};
}

export async function fetchAnalyticsMeta(options = {}) {
  const payload = await apiGet(`${BASE}/meta`, options);
  return payload?.meta && typeof payload.meta === 'object' ? payload.meta : payload || {};
}

export async function fetchAccounts(params = {}, options = {}) {
  const payload = await apiGet(`${BASE}/accounts${queryString(params)}`, options);
  return {
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
    total: finiteNumber(payload?.total),
    limit: finiteNumber(payload?.limit, finiteNumber(params.limit, 25)),
    offset: finiteNumber(payload?.offset, finiteNumber(params.offset, 0)),
  };
}

export async function fetchAccount(orgId, options = {}) {
  const payload = await apiGet(`${BASE}/accounts/${encodeURIComponent(orgId)}`, options);
  return payload?.account && typeof payload.account === 'object' ? payload.account : payload || {};
}

export async function fetchPostsDaily(orgId, days = 30) {
  const payload = await apiGet(
    `${BASE}/accounts/${encodeURIComponent(orgId)}/posts-daily?days=${encodeURIComponent(days)}`,
  );
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.days)) return payload.days;
  return [];
}

export async function fetchTickets(orgId, options = {}) {
  const payload = await apiGet(`${BASE}/accounts/${encodeURIComponent(orgId)}/tickets?limit=10&offset=0`, options);
  return {
    rows: Array.isArray(payload?.rows) ? payload.rows : Array.isArray(payload?.tickets) ? payload.tickets : [],
    total: finiteNumber(payload?.total),
    limit: finiteNumber(payload?.limit, 10),
    offset: finiteNumber(payload?.offset, 0),
    sheetUrl: text(payload?.sheetUrl),
  };
}

export async function fetchAccountFailures(orgId, params = {}) {
  const request = {
    days: params.days ?? 30,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    ...(params.knownTotal !== undefined ? { knownTotal: params.knownTotal } : {}),
  };
  const payload = await apiGet(
    `${BASE}/accounts/${encodeURIComponent(orgId)}/failures${queryString(request)}`,
    { signal: params.signal },
  );
  return normalizeFailureResponse(payload, request);
}

// Train 3814: the browser frame captured at a failure (staff only; the Worker adds the ops token).
// Returns the frame metadata plus a data:image/jpeg URL; throws the ApiError of the request (404 =
// expired or purged, 503 = storage unavailable) or a 502-shaped error for a malformed reply.
export async function fetchFailureScreenshot(id, { signal } = {}) {
  const payload = await apiGet(`${BASE}/failure-screenshots/${encodeURIComponent(id)}`, { signal });
  const dataUrl = typeof payload?.dataUrl === 'string' && payload.dataUrl.startsWith('data:image/jpeg;base64,')
    ? payload.dataUrl
    : '';
  const meta = normalizeFailureScreenshot(payload);
  if (!dataUrl || !meta) {
    const error = new Error('invalid_screenshot');
    error.status = 502;
    error.reason = 'invalid_screenshot';
    throw error;
  }
  return { ...meta, dataUrl };
}

export async function fetchAccountFeedFailures(orgId, params = {}) {
  const { days = 30, limit = 50, offset = 0, signal } = params;
  return apiGet(
    `${BASE}/accounts/${encodeURIComponent(orgId)}/feed-failures${queryString({
      days,
      limit,
      offset,
    })}`,
    { signal },
  );
}

export async function fetchAllAccountFailures(orgId, params = {}) {
  const days = params.days ?? 30;
  const pageLimit = Math.min(1_000, Math.max(1, finiteNumber(params.limit, 200)));
  const maxRows = Math.min(10_000, Math.max(pageLimit, finiteNumber(params.maxRows, 5_000)));
  const first = await fetchAccountFailures(orgId, {
    days,
    limit: pageLimit,
    offset: 0,
    signal: params.signal,
  });
  const rows = await loadRemainingPages({
    first,
    pageLimit,
    maxRows,
    fetchPage: ({ offset, limit }) => fetchAccountFailures(orgId, {
      days,
      limit,
      offset,
      knownTotal: first.total,
      signal: params.signal,
    }),
  });

  return {
    ...first,
    rows,
    limit: pageLimit,
    offset: 0,
    loaded: rows.length,
    truncated: rows.length < first.total,
  };
}

export async function fetchGlobalFailures(params = {}) {
  const days = params.days ?? 30;
  const pageLimit = Math.min(1_000, Math.max(1, finiteNumber(params.limit, 200)));
  const maxRows = Math.min(10_000, Math.max(pageLimit, finiteNumber(params.maxRows, 5_000)));
  const first = await fetchGlobalFailurePage(
    { days, limit: pageLimit, offset: 0 },
    { signal: params.signal },
  );
  const rows = await loadRemainingPages({
    first,
    pageLimit,
    maxRows,
    fetchPage: ({ offset, limit }) => fetchGlobalFailurePage(
      { days, limit, offset, knownTotal: first.total },
      { signal: params.signal },
    ),
  });
  return {
    ...first,
    rows,
    limit: pageLimit,
    offset: 0,
    loaded: rows.length,
    truncated: rows.length < first.total,
    source: 'global_endpoint',
  };
}

export async function fetchGlobalPosts(params = {}) {
  return fetchPostCollection(`${BASE}/posts`, params, 'global_post_deliveries');
}

export async function fetchAccountPosts(orgId, params = {}) {
  return fetchPostCollection(
    `${BASE}/accounts/${encodeURIComponent(orgId)}/posts`,
    params,
    'account_post_deliveries',
  );
}

async function fetchPostCollection(path, params, source) {
  const days = clampWindowDays(params.days);
  const pageLimit = Math.min(1_000, Math.max(1, finiteNumber(params.limit, 200)));
  const maxRows = Math.min(10_000, Math.max(pageLimit, finiteNumber(params.maxRows, 5_000)));
  const first = await fetchPostPage(
    path,
    { days, limit: pageLimit, offset: 0 },
    { signal: params.signal },
  );
  const rows = await loadRemainingPages({
    first,
    pageLimit,
    maxRows,
    fetchPage: ({ offset, limit }) => fetchPostPage(
      path,
      { days, limit, offset, knownTotal: first.total },
      { signal: params.signal },
    ),
  });
  return {
    ...first,
    rows,
    limit: pageLimit,
    offset: 0,
    loaded: rows.length,
    truncated: rows.length < first.total,
    source,
  };
}

export function saveNote(orgId, note) {
  return apiPost(`${BASE}/accounts/${encodeURIComponent(orgId)}/notes`, note);
}

export function saveCsMeta(orgId, meta) {
  return apiPut(`${BASE}/accounts/${encodeURIComponent(orgId)}/cs`, meta);
}

async function fetchGlobalFailurePage(request, options = {}) {
  const payload = await apiGet(`${BASE}/failures${queryString(request)}`, options);
  return normalizeFailureResponse(payload, request);
}

async function fetchPostPage(path, request, options = {}) {
  const payload = await apiGet(`${path}${queryString(request)}`, options);
  return normalizePostResponse(payload, request);
}

async function loadRemainingPages({ first, pageLimit, maxRows, fetchPage }) {
  const targetRows = Math.min(Math.max(0, finiteNumber(first.total)), maxRows);
  const firstRows = [...first.rows].slice(0, targetRows);
  if (firstRows.length >= targetRows) return firstRows;
  // Honor the server's applied cap so the UI remains compatible while the
  // backend deployment rolls out (and with any future server-side cap change).
  let effectivePageLimit = Math.max(1, finiteNumber(first.limit, pageLimit));
  const chunks = [{ offset: 0, rows: firstRows }];

  const initialPages = [];
  for (let offset = firstRows.length; offset < targetRows; offset += effectivePageLimit) {
    initialPages.push({ offset, limit: Math.min(effectivePageLimit, targetRows - offset) });
  }
  await fetchChunks(initialPages);

  let state = materializeChunks(chunks, targetRows);
  while (state.missing.length > 0) {
    const gapPages = state.missing.map(({ start, end }) => ({
      offset: start,
      limit: Math.min(effectivePageLimit, end - start),
    }));
    const previousFilled = state.filledCount;
    await fetchChunks(gapPages);
    state = materializeChunks(chunks, targetRows);
    if (state.filledCount <= previousFilled) break;
  }
  return state.rows;

  async function fetchChunks(pages) {
    const responses = await mapWithConcurrency(pages, PAGE_CONCURRENCY, async (page) => ({
      ...page,
      response: await fetchPage(page),
    }));
    for (const page of responses) {
      const appliedLimit = Math.max(1, finiteNumber(page.response.limit, page.limit));
      if (appliedLimit < page.limit) {
        effectivePageLimit = Math.min(effectivePageLimit, appliedLimit);
      }
      if (page.response.rows.length > 0) {
        chunks.push({ offset: page.offset, rows: page.response.rows });
      }
    }
  }
}

function materializeChunks(chunks, targetRows) {
  const slots = new Array(targetRows);
  const filled = new Array(targetRows).fill(false);
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.rows.length; index += 1) {
      const position = chunk.offset + index;
      if (position < 0 || position >= targetRows) continue;
      slots[position] = chunk.rows[index];
      filled[position] = true;
    }
  }

  const missing = [];
  for (let index = 0; index < targetRows;) {
    if (filled[index]) {
      index += 1;
      continue;
    }
    const start = index;
    while (index < targetRows && !filled[index]) index += 1;
    missing.push({ start, end: index });
  }
  return {
    rows: slots.filter((_row, index) => filled[index]),
    filledCount: filled.filter(Boolean).length,
    missing,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  if (items.length === 0) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function queryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const value = query.toString();
  return value ? `?${value}` : '';
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampWindowDays(value) {
  return Math.min(90, Math.max(1, finiteNumber(value, 30)));
}

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}
