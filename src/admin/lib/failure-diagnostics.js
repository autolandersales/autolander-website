const DEFAULT_LIMIT = 50;
const DEFAULT_TOP_TYPES = 5;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const REDACTED = '[REDACTED]';
const AUTH_HEADER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9+/_=.:-]{8,}/gi;
const OPENAI_KEY_RE = /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{8,}\b/g;
const GITHUB_TOKEN_RE = /\b(?:gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,})\b/g;
const AWS_ACCESS_KEY_RE = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;
const CREDENTIAL_ASSIGNMENT_RE = /(\b(?:password|passwd|pwd|secret|token|authorization|auth|api[_-]?key|access[_-]?key|key|signature|sig|session|passcode|pin)\b\s*[:=]\s*["']?)[^"'\s,;&}\]]+/gi;

const FEED_URL_KEYS = new Set([
  'feedurl',
  'feeduri',
  'feedsourceurl',
  'inventoryurl',
  'inventoryfeedurl',
  'inventoryfeeduri',
  'sourcefeedurl',
  'csvfeedurl',
  'xmlfeedurl',
]);

const VEHICLE_URL_KEYS = new Set([
  'vehicleurl',
  'vehicledetailurl',
  'itemurl',
  'itemdetailurl',
  'sourceitemurl',
  'listingurl',
  'listingdetailurl',
  'detailurl',
  'detailsurl',
  'marketplaceurl',
]);

const GENERIC_URL_KEYS = new Set(['url', 'uri', 'href', 'link', 'sourceurl']);
const FEED_CONTEXT_KEYS = ['feed', 'inventory', 'import'];
const VEHICLE_CONTEXT_KEYS = ['vehicle', 'item', 'listing', 'car'];

export function normalizeFailureResponse(payload, defaults = {}) {
  const body = object(payload);
  const nestedBody = object(body.failures ?? body.events);
  const rawRows = Array.isArray(payload)
    ? payload
    : firstArray(body.rows, body.failures, body.events, body.failures?.rows, body.events?.rows);
  const rows = rawRows
    .map((row, index) => normalizeFailure(row, index))
    .filter(Boolean);
  const total = finiteNumber(body.total ?? body.count, rows.length);
  const limit = positiveNumber(body.limit, positiveNumber(defaults.limit, DEFAULT_LIMIT));
  const offset = nonNegativeNumber(body.offset, nonNegativeNumber(defaults.offset, 0));

  return {
    rows,
    total,
    limit,
    offset,
    // This normalizer is called after a successful endpoint response. Keeping
    // availability separate from row count lets the UI distinguish a valid
    // zero-failure result from an unavailable diagnostics endpoint.
    available: booleanOrDefault(body.available ?? nestedBody.available ?? defaults.available, true),
    summary: normalizeFailureSummary(body.summary, rows, total, defaults.days),
  };
}

export function normalizeFailure(row, index = 0) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;

  const error = object(row.error);
  const diagnostics = diagnosticObject(
    row.diagnostics ?? row.context ?? row.metadata ?? row.meta ?? row.details,
  );
  const code = firstText(
    row.code,
    row.errorCode,
    error.code,
    row.reason,
    row.type,
    diagnostics.code,
  ) || 'unknown_error';
  const message = firstText(
    row.message,
    row.errorMessage,
    error.message,
    typeof row.error === 'string' ? row.error : '',
    row.detail,
    diagnostics.message,
  ) || humanizeFailureValue(code, 'Unknown failure');
  const fingerprint = firstText(
    row.fingerprint,
    row.signature,
    row.groupKey,
    row.errorHash,
    diagnostics.fingerprint,
  );
  const feedUrl = extractCanonicalUrl(row, 'feed');
  const vehicleUrl = extractCanonicalUrl(row, 'vehicle');

  return {
    id: firstText(row.id, row.eventId, row.failureId, row.requestId)
      || `${fingerprint || code}-${index}`,
    occurredAt: firstText(
      row.occurredAt,
      row.createdAt,
      row.timestamp,
      row.date,
      row.lastSeenAt,
    ),
    code,
    message,
    source: firstText(row.source, row.origin, row.provider, row.component, diagnostics.source),
    stage: firstText(row.stage, row.operation, row.action, row.step, diagnostics.stage),
    area: firstText(row.area, row.category, row.domain, diagnostics.area),
    recoverable: normalizeBoolean(row.recoverable ?? row.retryable ?? diagnostics.recoverable),
    appVersion: firstText(
      row.appVersion,
      row.version,
      row.clientVersion,
      diagnostics.appVersion,
    ),
    platform: firstText(row.platform, row.os, diagnostics.platform, diagnostics.os),
    fingerprint,
    vehicle: normalizeEntity(row.vehicle ?? row.item ?? row.listing, {
      id: row.vehicleId ?? row.listingId,
      label: row.vehicleName ?? row.vehicleTitle,
      vin: row.vin,
      stockNumber: row.stockNumber ?? row.stock,
      url: vehicleUrl,
    }),
    vehicleUrl,
    feedUrl,
    user: normalizeEntity(row.user ?? row.actor, {
      id: row.userId,
      label: row.userName ?? row.username ?? row.userEmail,
      email: row.userEmail,
      username: row.username,
      phone: firstText(
        row.userPhone,
        row.userPhoneNumber,
        row.userMobile,
        row.userMobilePhone,
      ),
    }),
    account: normalizeAccount(row),
    diagnostics,
    recentFailures: normalizeRecentFailures(
      row.recentFailures ?? row.occurrences ?? row.recentCount ?? row.failureCount,
    ),
    legacy: Boolean(row.legacy),
    // Train 3814: the browser frame the desktop captured at this failure (metadata only; the image
    // itself is fetched lazily by FailureScreenshot.jsx and never kept on the row).
    screenshot: normalizeFailureScreenshot(row.screenshot),
    raw: row.raw && typeof row.raw === 'object' ? row.raw : row,
  };
}

const SCREENSHOT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function screenshotDate(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function screenshotCount(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function screenshotText(value, max) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : '';
}

// The page the frame shows, as TEXT only (http/https, origin + path); never rendered as a link.
function screenshotPageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return '';
  }
}

// Failure-screenshot metadata from an ops failure row: null when absent, malformed or expired
// (frames are kept 7 days). Keeps only the listed fields; never an image or a storage URL.
export function normalizeFailureScreenshot(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!SCREENSHOT_ID_RE.test(id)) return null;
  const expiresAt = screenshotDate(value.expiresAt);
  if (!expiresAt || Date.parse(expiresAt) <= now) return null;
  return {
    id,
    capturedAt: screenshotDate(value.capturedAt),
    expiresAt,
    width: screenshotCount(value.width),
    height: screenshotCount(value.height),
    bytes: screenshotCount(value.bytes),
    kind: screenshotText(value.kind, 40),
    pageUrl: screenshotPageUrl(value.pageUrl),
    pageTitle: screenshotText(value.pageTitle, 200),
  };
}

// "1280×720 · 142 KB · expires in 6 d · /marketplace/you/selling" (the capture time is shown
// separately, relative). Pure, for the row caption.
export function describeFailureScreenshot(meta, now = Date.now()) {
  if (!meta) return '';
  const parts = [];
  if (meta.width && meta.height) parts.push(`${meta.width}×${meta.height}`);
  if (meta.bytes) parts.push(`${Math.max(1, Math.round(meta.bytes / 1024))} KB`);
  const expiresMs = Date.parse(meta.expiresAt);
  if (Number.isFinite(expiresMs)) {
    const days = Math.max(0, Math.ceil((expiresMs - now) / DAY_MS));
    parts.push(days <= 1 ? 'expires within a day' : `expires in ${days} d`);
  }
  if (meta.pageUrl) {
    try {
      const url = new URL(meta.pageUrl);
      parts.push(`${url.hostname}${url.pathname}`);
    } catch {
      // pageUrl is already validated; nothing to add when it is not.
    }
  }
  return parts.join(' · ');
}

// The row's message when the frame cannot be shown.
export function failureScreenshotErrorText(error) {
  const status = Number(error?.status) || 0;
  if (status === 404) return 'Screenshot expired (kept 7 days).';
  if (status === 503) return 'Screenshot storage unavailable.';
  return 'Could not load the screenshot. Try again in a moment.';
}

export function buildLegacyFeedFailures(feeds) {
  if (!Array.isArray(feeds)) return [];

  return feeds
    .map((feed, index) => {
      if (!feed || typeof feed !== 'object') return null;
      const message = firstText(feed.lastSyncError, feed.syncError, feed.errorMessage);
      if (!message) return null;
      const feedId = firstText(feed.id, feed.feedId);
      const feedName = firstText(feed.name, feed.label) || `Feed ${index + 1}`;
      const feedUrl = firstText(
        feed.feedUrl,
        feed.inventoryUrl,
        feed.sourceFeedUrl,
        feed.inventoryFeedUrl,
        feed.url,
        extractCanonicalUrl(feed, 'feed', 'feed'),
      );
      return normalizeFailure({
        id: `legacy-feed-${feedId || index}`,
        occurredAt: feed.lastSyncAt ?? feed.updatedAt,
        code: feed.lastSyncErrorCode ?? feed.errorCode ?? 'feed_sync_error',
        message,
        source: feed.source ?? feed.type ?? feedName,
        stage: 'feed_sync',
        area: 'inventory_feed',
        recoverable: feed.recoverable,
        appVersion: feed.appVersion,
        platform: feed.platform,
        fingerprint: feed.fingerprint,
        feedUrl,
        diagnostics: {
          feedId: feedId || null,
          feedName,
          feedUrl: feedUrl || null,
          healthState: feed.healthState ?? feed.health ?? null,
          lastSyncAt: feed.lastSyncAt ?? null,
        },
        legacy: true,
        raw: feed,
      }, index);
    })
    .filter(Boolean);
}

/**
 * Convert normalized failures into chart-ready UTC buckets.
 *
 * One-day windows contain 24 hourly buckets. Longer windows contain one daily
 * bucket per day. Each bucket exposes both a `counts` map and dynamic series
 * keys so it can be consumed directly by Recharts.
 */
export function buildFailureTimeline(rows, options = {}) {
  const failures = Array.isArray(rows) ? rows : [];
  const days = positiveNumber(options.days, 30);
  const maxTypes = positiveNumber(options.topTypes, DEFAULT_TOP_TYPES);
  const nowMs = validDateMs(options.now, Date.now());
  const hourly = days <= 1;
  const bucketCount = hourly ? 24 : Math.max(1, Math.ceil(days));
  const bucketMs = hourly ? HOUR_MS : DAY_MS;
  const endMs = hourly ? startOfUtcHour(nowMs) + HOUR_MS : startOfUtcDay(nowMs) + DAY_MS;
  const startMs = endMs - bucketCount * bucketMs;

  const windowRows = failures.filter((failure) => {
    const occurredAt = failureDateMs(failure);
    return occurredAt !== null && occurredAt >= startMs && occurredAt < endMs;
  });
  const countsByType = new Map();
  for (const failure of windowRows) {
    const type = failureType(failure);
    countsByType.set(type, (countsByType.get(type) || 0) + 1);
  }

  const rankedTypes = [...countsByType.entries()]
    .sort(([leftType, leftCount], [rightType, rightCount]) => (
      rightCount - leftCount || leftType.localeCompare(rightType)
    ));
  const topTypeNames = rankedTypes.slice(0, maxTypes).map(([type]) => type);
  const topTypeSet = new Set(topTypeNames);
  const types = rankedTypes.slice(0, maxTypes).map(([type, count]) => ({
    key: typeSeriesKey(type),
    type,
    label: humanizeFailureValue(type),
    count,
    isOther: false,
  }));
  const otherCount = rankedTypes
    .slice(maxTypes)
    .reduce((sum, [, count]) => sum + count, 0);
  if (otherCount > 0) {
    types.push({
      key: otherSeriesKey(topTypeNames),
      type: 'other',
      label: 'Other',
      count: otherCount,
      isOther: true,
    });
  }

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = startMs + index * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const start = new Date(bucketStart).toISOString();
    const end = new Date(bucketEnd).toISOString();
    return {
      key: bucketKey(start, end),
      start,
      end,
      label: hourly ? utcHourLabel(bucketStart) : utcDayLabel(bucketStart),
      total: 0,
      counts: {},
    };
  });

  for (const failure of windowRows) {
    const occurredAt = failureDateMs(failure);
    const bucketIndex = Math.floor((occurredAt - startMs) / bucketMs);
    const bucket = buckets[bucketIndex];
    if (!bucket) continue;
    const rawType = failureType(failure);
    const series = topTypeSet.has(rawType)
      ? types.find((candidate) => candidate.type === rawType)
      : types.find((candidate) => candidate.isOther);
    if (!series) continue;
    bucket.total += 1;
    bucket[series.key] = (bucket[series.key] || 0) + 1;
    bucket.counts[series.key] = (bucket.counts[series.key] || 0) + 1;
  }

  for (const bucket of buckets) {
    for (const type of types) {
      if (bucket[type.key] === undefined) bucket[type.key] = 0;
      if (bucket.counts[type.key] === undefined) bucket.counts[type.key] = 0;
    }
  }

  return {
    buckets,
    types,
    days,
    bucketUnit: hourly ? 'hour' : 'day',
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    total: windowRows.length,
  };
}

/**
 * Filter failures for a selected chart bucket/type and optional user/account.
 * `type` is normally the `type.key` returned by buildFailureTimeline.
 */
export function filterFailures(rows, options = {}) {
  const failures = Array.isArray(rows) ? rows : [];
  const range = parseBucketKey(options.bucketKey);
  const typeFilter = parseTypeFilter(options.type);
  const userId = firstText(options.userId);
  const accountId = firstText(options.accountId, options.orgId);

  return failures.filter((failure) => {
    if (range) {
      const occurredAt = failureDateMs(failure);
      if (occurredAt === null || occurredAt < range.start || occurredAt >= range.end) return false;
    }

    const type = failureType(failure);
    if (typeFilter?.isOther && typeFilter.topTypes.has(type)) return false;
    if (typeFilter && !typeFilter.isOther && type !== typeFilter.type) return false;
    if (userId && !entityMatches(failure?.user, userId)) return false;
    if (accountId && !entityMatches(failure?.account, accountId)) return false;
    return true;
  });
}

/**
 * Build a serializable, AI-agent-ready diagnostic report. Sensitive credential
 * fields and URL query credentials are deeply redacted while diagnostic URLs,
 * customer contact data, and raw event structure remain available.
 */
export function buildFailureReport({
  failures,
  account,
  user,
  windowDays,
  total,
  loaded,
  legacyFeeds,
  generatedAt,
  accountLoaded,
  accountTotal,
  source,
  truncated,
} = {}) {
  const rows = Array.isArray(failures) ? failures : [];
  const feeds = Array.isArray(legacyFeeds) ? legacyFeeds : [];
  const loadedCount = nonNegativeNumber(accountLoaded, nonNegativeNumber(loaded, rows.length));
  const totalCount = nonNegativeNumber(accountTotal, nonNegativeNumber(total, loadedCount));
  const feedUrls = uniqueTexts([
    ...rows.map((failure) => firstText(
      failure?.feedUrl,
      extractCanonicalUrl(failure?.raw, 'feed'),
    )),
    ...feeds.map((feed) => firstText(
      feed?.feedUrl,
      feed?.inventoryUrl,
      feed?.sourceFeedUrl,
      feed?.inventoryFeedUrl,
      feed?.url,
      extractCanonicalUrl(feed, 'feed', 'feed'),
    )),
  ]);
  const vehicleUrls = uniqueTexts(rows.map((failure) => firstText(
    failure?.vehicleUrl,
    failure?.vehicle?.url,
    extractCanonicalUrl(failure?.raw, 'vehicle'),
  )));

  return deepRedactSecrets({
    schemaVersion: 'autolander.failure-diagnostics.v1',
    generatedAt: validIsoDate(generatedAt),
    source: firstText(source, 'failure_events'),
    account: account ?? null,
    user: user ?? null,
    window: {
      days: positiveNumber(windowDays, 30),
      total: totalCount,
      loaded: loadedCount,
      included: rows.length,
      truncated: Boolean(truncated) || totalCount > loadedCount,
    },
    urls: {
      feeds: feedUrls,
      vehicles: vehicleUrls,
    },
    failures: rows,
    feedSnapshot: feeds,
  });
}

export function deepRedactSecrets(value) {
  return redactValue(value, new WeakSet());
}

export function humanizeFailureValue(value, fallback = 'Unknown') {
  const text = firstText(value);
  if (!text) return fallback;
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function normalizeFailureSummary(value, rows, total, days) {
  const summary = object(value);
  const recoverableFallback = rows.filter((row) => row.recoverable === true).length;
  const nonRecoverableFallback = rows.filter((row) => row.recoverable === false).length;
  const unknownFallback = rows.length - recoverableFallback - nonRecoverableFallback;
  const fingerprints = new Set(rows.map(failureSignature).filter(Boolean));

  return {
    ...summary,
    total: finiteNumber(summary.total ?? summary.failureCount, total),
    recoverable: finiteNumber(
      summary.recoverable ?? summary.recoverableCount ?? summary.retryable,
      recoverableFallback,
    ),
    nonRecoverable: finiteNumber(
      summary.nonRecoverable
        ?? summary.nonRecoverableCount
        ?? summary.unrecoverable
        ?? summary.fatal,
      nonRecoverableFallback,
    ),
    unknown: finiteNumber(summary.unknown ?? summary.unknownCount, unknownFallback),
    uniqueFingerprints: finiteNumber(
      summary.uniqueFingerprints ?? summary.uniqueSignatures ?? summary.groups,
      fingerprints.size,
    ),
    windowDays: positiveNumber(summary.windowDays ?? summary.days, positiveNumber(days, 30)),
  };
}

function failureSignature(row) {
  return row.fingerprint || [row.code, row.stage, row.message].filter(Boolean).join('|');
}

function normalizeEntity(value, fallback) {
  const entity = object(value);
  const base = object(fallback);
  const id = firstText(entity.id, entity.vehicleId, entity.userId, base.id);
  const vin = firstText(entity.vin, base.vin);
  const stockNumber = firstText(entity.stockNumber, entity.stock, base.stockNumber);
  const email = firstText(entity.email, base.email);
  const username = firstText(entity.username, base.username);
  const phone = firstText(
    entity.phone,
    entity.phoneNumber,
    entity.phone_number,
    entity.mobile,
    entity.mobilePhone,
    entity.mobile_number,
    base.phone,
  );
  const url = firstText(
    entity.url,
    entity.vehicleUrl,
    entity.itemUrl,
    entity.listingUrl,
    entity.detailUrl,
    entity.detailsUrl,
    entity.href,
    entity.link,
    base.url,
  );
  const label = firstText(
    typeof value === 'string' ? value : '',
    entity.label,
    entity.name,
    entity.title,
    entity.displayName,
    username,
    email,
    stockNumber,
    vin,
    id,
    base.label,
  );

  if (!id && !label && !vin && !stockNumber && !email && !username && !phone && !url) return null;
  return { ...entity, id, label, vin, stockNumber, email, username, phone, url };
}

function normalizeAccount(row) {
  const accountValue = row.account ?? row.organization ?? row.org;
  const account = object(accountValue);
  const accountText = firstText(accountValue);
  const id = firstText(
    account.orgId,
    account.organizationId,
    account.id,
    row.orgId,
    row.organizationId,
    row.accountId,
  );
  const name = firstText(
    account.name,
    account.orgName,
    account.organizationName,
    account.label,
    row.orgName,
    row.organizationName,
    row.accountName,
  );
  const label = firstText(account.label, name, accountText, account.slug, row.slug, id);
  const slug = firstText(account.slug, row.slug, row.orgSlug, row.accountSlug);
  const phone = firstText(
    account.phone,
    account.phoneNumber,
    account.phone_number,
    account.mobile,
    account.mobilePhone,
    row.accountPhone,
    row.orgPhone,
    row.customerPhone,
  );

  if (!id && !name && !label && !slug && !phone) return null;
  return {
    ...account,
    id,
    orgId: id,
    label,
    name,
    slug,
    phone,
  };
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return Boolean(value);
  const text = firstText(value).toLowerCase();
  if (['true', 'yes', 'retryable', 'recoverable'].includes(text)) return true;
  if (['false', 'no', 'fatal', 'unrecoverable', 'non_recoverable'].includes(text)) return false;
  return null;
}

function normalizeRecentFailures(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    return finiteNumber(value.count ?? value.total, null);
  }
  return finiteNumber(value, null);
}

function extractCanonicalUrl(value, kind, rootContext = '') {
  const aliases = kind === 'feed' ? FEED_URL_KEYS : VEHICLE_URL_KEYS;
  const contextKeys = kind === 'feed' ? FEED_CONTEXT_KEYS : VEHICLE_CONTEXT_KEYS;
  const visited = new WeakSet();

  function visit(current, path, depth) {
    if (!current || typeof current !== 'object' || depth > 7 || visited.has(current)) return '';
    visited.add(current);
    const entries = Object.entries(current);

    for (const [key, candidate] of entries) {
      if (!aliases.has(normalizeKey(key))) continue;
      const url = urlText(candidate);
      if (url) return url;
    }

    const contextMatches = contextKeys.some((marker) => path.includes(marker));
    if (contextMatches) {
      for (const [key, candidate] of entries) {
        if (!GENERIC_URL_KEYS.has(normalizeKey(key))) continue;
        const url = urlText(candidate);
        if (url) return url;
      }
    }

    for (const [key, candidate] of entries) {
      if (!candidate || typeof candidate !== 'object') continue;
      const found = visit(candidate, `${path}.${normalizeKey(key)}`, depth + 1);
      if (found) return found;
    }
    return '';
  }

  return visit(value, normalizeKey(rootContext), 0);
}

function failureType(failure) {
  return firstText(
    failure?.code,
    failure?.errorCode,
    failure?.type,
    failure?.fingerprint,
    failure?.area,
    'unknown_error',
  );
}

function failureDateMs(failure) {
  const value = firstText(
    failure?.occurredAt,
    failure?.createdAt,
    failure?.timestamp,
    failure?.date,
    failure?.lastSeenAt,
  );
  if (!value) return null;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : null;
}

function typeSeriesKey(type) {
  return `type:${encodeURIComponent(type)}`;
}

function otherSeriesKey(topTypes) {
  return `type:__other__:${encodeURIComponent(JSON.stringify(topTypes))}`;
}

function bucketKey(start, end) {
  return `${start}/${end}`;
}

function parseBucketKey(value) {
  const text = firstText(value);
  const separator = text.indexOf('/');
  if (separator < 0) return null;
  const start = Date.parse(text.slice(0, separator));
  const end = Date.parse(text.slice(separator + 1));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;
  return { start, end };
}

function parseTypeFilter(value) {
  const candidate = value && typeof value === 'object' ? value.key ?? value.type : value;
  const text = firstText(candidate);
  if (!text) return null;
  if (text.startsWith('type:__other__:')) {
    const encodedTypes = text.slice('type:__other__:'.length);
    try {
      const values = JSON.parse(decodeURIComponent(encodedTypes));
      return {
        isOther: true,
        topTypes: new Set(Array.isArray(values) ? values.map(String) : []),
      };
    } catch {
      return { isOther: true, topTypes: new Set() };
    }
  }
  if (text.startsWith('type:')) {
    try {
      return { isOther: false, type: decodeURIComponent(text.slice('type:'.length)) };
    } catch {
      return { isOther: false, type: text.slice('type:'.length) };
    }
  }
  return { isOther: false, type: text };
}

function entityMatches(entityValue, query) {
  const entity = object(entityValue);
  const expected = firstText(query).toLowerCase();
  return [
    entity.id,
    entity.orgId,
    entity.userId,
    entity.username,
    entity.email,
    entity.label,
    entity.name,
    entity.slug,
  ].some((value) => firstText(value).toLowerCase() === expected);
}

function redactValue(value, seen) {
  if (typeof value === 'string') return redactUrlSecrets(redactCredentialText(value));
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    const result = value.map((entry) => redactValue(entry, seen));
    seen.delete(value);
    return result;
  }

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = isSecretKey(key) ? REDACTED : redactValue(entry, seen);
  }
  seen.delete(value);
  return result;
}

function isSecretKey(value) {
  const key = normalizeKey(value);
  return [
    'authorization',
    'proxyauthorization',
    'cookie',
    'cookies',
    'setcookie',
    'password',
    'passwd',
    'pwd',
    'secret',
    'secretkey',
    'clientsecret',
    'privatekey',
    'apikey',
    'accesskey',
    'key',
    'auth',
    'authentication',
    'signature',
    'sig',
    'credentials',
    'credential',
    'session',
    'passcode',
    'pin',
  ].includes(key)
    || (key.includes('authorization') && !key.endsWith('url'))
    || key.endsWith('password')
    || key.endsWith('token')
    || key.endsWith('apikey')
    || key.endsWith('signature')
    || key.endsWith('credentials')
    || key.endsWith('credential')
    || key.endsWith('passcode')
    || key.endsWith('session')
    || key.endsWith('cookie')
    || key.endsWith('cookies')
    || key.endsWith('secret');
}

function redactCredentialText(value) {
  return value
    .replace(AUTH_HEADER_RE, '$1 [REDACTED]')
    .replace(OPENAI_KEY_RE, REDACTED)
    .replace(GITHUB_TOKEN_RE, REDACTED)
    .replace(AWS_ACCESS_KEY_RE, REDACTED)
    .replace(CREDENTIAL_ASSIGNMENT_RE, '$1[REDACTED]');
}

function redactUrlSecrets(value) {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    if (parsed.username) parsed.username = REDACTED;
    if (parsed.password) parsed.password = REDACTED;
    const secretParams = [];
    for (const key of parsed.searchParams.keys()) {
      if (isSecretKey(key)) secretParams.push(key);
    }
    for (const key of secretParams) parsed.searchParams.set(key, REDACTED);
    return parsed.toString();
  } catch {
    return value;
  }
}

function uniqueTexts(values) {
  return [...new Set(values.map((value) => firstText(value)).filter(Boolean))];
}

function normalizeKey(value) {
  return firstText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function urlText(value) {
  return ['string', 'number'].includes(typeof value) ? firstText(value) : '';
}

function validDateMs(value, fallback) {
  if (value instanceof Date) {
    const date = value.getTime();
    return Number.isFinite(date) ? date : fallback;
  }
  const date = value === undefined || value === null ? NaN : Date.parse(value);
  return Number.isFinite(date) ? date : fallback;
}

function validIsoDate(value) {
  return new Date(validDateMs(value, Date.now())).toISOString();
}

function startOfUtcHour(value) {
  return Math.floor(value / HOUR_MS) * HOUR_MS;
}

function startOfUtcDay(value) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcHourLabel(value) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, '0')}:00`;
}

function utcDayLabel(value) {
  return new Date(value).toISOString().slice(5, 10);
}

function diagnosticObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = firstText(value);
  return text ? { detail: text } : {};
}

function firstArray(...values) {
  return values.find(Array.isArray) || [];
}

function firstText(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (!['string', 'number', 'boolean'].includes(typeof value)) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function finiteNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = finiteNumber(value, fallback);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = finiteNumber(value, fallback);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function booleanOrDefault(value, fallback) {
  if (value === true || value === false) return value;
  return fallback;
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
