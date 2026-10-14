import { useState } from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import { FailureScreenshot } from './FailureScreenshot.jsx';
import { formatDate, formatRelative } from './lib/analytics-format.js';
import { humanizeFailureValue } from './lib/failure-diagnostics.js';

export function FailureEventRow({ failure }) {
  const [open, setOpen] = useState(false);
  const occurredAt = failure?.occurredAt;
  const screenshot = failure?.screenshot || null;
  const entityContext = [failure?.vehicle?.label, failure?.user?.label].filter(Boolean).join(' / ');
  const feedUrl = canonicalUrl(
    failure?.feedUrl,
    failure?.feed?.url,
    failure?.diagnostics?.feedUrl,
  );
  const vehicleUrl = canonicalUrl(
    failure?.vehicleUrl,
    failure?.itemUrl,
    failure?.vehicle?.url,
    failure?.item?.url,
    failure?.listing?.url,
    failure?.diagnostics?.vehicleUrl,
    failure?.diagnostics?.itemUrl,
  );

  return (
    <details
      className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/35"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-w-0 cursor-pointer px-3 py-3 marker:text-slate-600 sm:px-4">
        <div className="ml-1 min-w-0 sm:ml-2">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <code className="max-w-full break-all rounded-md border border-red-400/20 bg-red-400/10 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                  {failure?.code || 'unknown_error'}
                </code>
                {failure?.area && <FailureChip>{humanizeFailureValue(failure.area)}</FailureChip>}
                {failure?.stage && <FailureChip>{humanizeFailureValue(failure.stage)}</FailureChip>}
                <Recoverability value={failure?.recoverable} />
                {screenshot && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-200">
                    <Camera size={10} aria-hidden="true" /> Browser view
                  </span>
                )}
                {failure?.recentFailures !== null && failure?.recentFailures !== undefined && (
                  <FailureChip>{finite(failure.recentFailures, 0).toLocaleString()} recent</FailureChip>
                )}
              </div>
              <p className="mt-2 break-words text-xs font-semibold leading-relaxed text-slate-200">
                {failure?.message || 'No failure message was returned.'}
              </p>
              {entityContext && <p className="mt-1 break-words text-[10px] text-slate-500">{entityContext}</p>}
            </div>
            <time
              className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-600"
              dateTime={occurredAt || undefined}
              title={formatDate(occurredAt, true)}
            >
              {occurredAt ? formatRelative(occurredAt) : 'Time unknown'}
            </time>
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-500">
            {failure?.source && <span>Source <strong className="text-slate-400">{failure.source}</strong></span>}
            {failure?.appVersion && <span>App <strong className="text-slate-400">{failure.appVersion}</strong></span>}
            {failure?.platform && <span>Platform <strong className="text-slate-400">{failure.platform}</strong></span>}
            {feedUrl && <span className="font-bold text-cyan-300">Feed URL available</span>}
            {vehicleUrl && <span className="font-bold text-cyan-300">Vehicle URL available</span>}
            <span className="font-bold text-blue-300">Expand technical details</span>
          </div>
        </div>
      </summary>

      <div className="min-w-0 space-y-3 border-t border-white/10 bg-black/25 px-3 py-3 sm:px-4">
        {screenshot && <FailureScreenshot key={screenshot.id} meta={screenshot} active={open} />}
        <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
          <TechnicalFact label="Event ID" value={failure?.id} />
          <TechnicalFact label="Occurred" value={occurredAt ? formatDate(occurredAt, true) : ''} />
          <TechnicalFact label="Fingerprint" value={failure?.fingerprint} mono />
          <TechnicalFact label="Source" value={failure?.source} />
          <TechnicalFact label="Stage" value={failure?.stage} />
          <TechnicalFact label="Area" value={failure?.area} />
          <TechnicalFact label="Vehicle" value={failure?.vehicle?.label} />
          <TechnicalFact
            label="VIN / stock"
            value={[failure?.vehicle?.vin, failure?.vehicle?.stockNumber].filter(Boolean).join(' / ')}
            mono
          />
          <TechnicalFact label="User" value={failure?.user?.label} />
          <TechnicalFact label="User email" value={failure?.user?.email} />
          <TechnicalFact label="User phone" value={failure?.user?.phone} />
          <TechnicalFact label="App / platform" value={[failure?.appVersion, failure?.platform].filter(Boolean).join(' / ')} />
        </dl>

        {(feedUrl || vehicleUrl) && (
          <div className="grid min-w-0 gap-2 lg:grid-cols-2">
            <DiagnosticLink label="Inventory feed URL" url={feedUrl} />
            <DiagnosticLink label="Vehicle / item URL" url={vehicleUrl} />
          </div>
        )}

        {Object.keys(failure?.diagnostics || {}).length > 0 && (
          <JsonBlock label="Diagnostics" value={failure.diagnostics} />
        )}
        <JsonBlock label="Raw event" value={failure?.raw || failure} />
      </div>
    </details>
  );
}

export default FailureEventRow;

function DiagnosticLink({ label, url }) {
  if (!url) return null;
  return (
    <div className="min-w-0 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-2.5">
      <p className="text-[8px] font-black uppercase tracking-widest text-cyan-300/70">{label}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 flex min-w-0 items-start gap-2 break-all font-mono text-[10px] leading-relaxed text-cyan-200 underline decoration-cyan-300/30 underline-offset-2 hover:text-white"
      >
        <span className="min-w-0 flex-1">{url}</span>
        <ExternalLink size={11} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

function FailureChip({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-400">
      {children}
    </span>
  );
}

function Recoverability({ value }) {
  if (value === true) {
    return <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-200">Recoverable</span>;
  }
  if (value === false) {
    return <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-red-200">Non-recoverable</span>;
  }
  return <span className="rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-500">Recovery unknown</span>;
}

function TechnicalFact({ label, value, mono = false }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-2">
      <dt className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</dt>
      <dd className={`mt-1 break-all text-[10px] text-slate-300 ${mono ? 'font-mono' : ''}`}>{String(value)}</dd>
    </div>
  );
}

function JsonBlock({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p>
      <pre className="max-h-72 min-w-0 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-[9px] leading-relaxed text-slate-400">
        {prettyJson(value)}
      </pre>
    </div>
  );
}

function canonicalUrl(...values) {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {
      // Ignore malformed or non-absolute URLs. Diagnostics links must be safe to open.
    }
  }
  return '';
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function finite(value, fallback) {
  const number = Number(value);
  return value !== undefined && value !== null && value !== '' && Number.isFinite(number) ? number : fallback;
}
