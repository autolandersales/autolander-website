import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { fetchFailureScreenshot } from './lib/analytics.js';
import { formatDate, formatRelative } from './lib/analytics-format.js';
import { describeFailureScreenshot, failureScreenshotErrorText } from './lib/failure-diagnostics.js';

// Train 3814: what the automation browser showed when this failure happened. Staff only (the
// Worker adds the ops token); frames are kept 7 days. The image is fetched the first time the row
// is opened, never with the list, and lives only in this component's state. The parent keys this
// component by the screenshot id, so a different frame always starts from a clean state.
export function FailureScreenshot({ meta, active }) {
  // null until loaded; then { image } or { error }.
  const [result, setResult] = useState(null);
  const [enlarged, setEnlarged] = useState(false);
  const id = meta?.id || '';

  useEffect(() => {
    if (!active || !id || result) return undefined;
    const controller = new AbortController();
    fetchFailureScreenshot(id, { signal: controller.signal })
      .then((image) => setResult({ image }))
      .catch((error) => {
        // Collapsed (or unmounted) before it arrived: nothing to show; the next open loads again.
        if (error?.name === 'AbortError' || controller.signal.aborted) return;
        setResult({ error: failureScreenshotErrorText(error) });
      });
    return () => controller.abort();
  }, [active, id, result]);

  if (!meta) return null;
  const caption = describeFailureScreenshot(meta);

  return (
    <section className="min-w-0 rounded-xl border border-violet-400/15 bg-violet-400/[0.04] px-3 py-2.5" aria-label="Browser view">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-violet-200/80">
          <Camera size={11} aria-hidden="true" /> Browser view at the moment of the error
        </p>
        <span className="text-[9px] text-slate-500" title={formatDate(meta.capturedAt, true)}>
          {meta.capturedAt ? `Captured ${formatRelative(meta.capturedAt)}` : 'Capture time unknown'}
        </span>
      </div>
      {caption && <p className="mt-1 break-all font-mono text-[9px] text-slate-500">{caption}</p>}
      {meta.pageTitle && <p className="mt-0.5 break-words text-[9px] text-slate-500">Page title: {meta.pageTitle}</p>}

      <div className="mt-2 min-w-0">
        {!result && (
          <p className="text-[10px] text-slate-400" role="status">Loading the screenshot…</p>
        )}
        {result?.error && <p className="text-[10px] text-amber-200" role="status">{result.error}</p>}
        {result?.image && (
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="block max-w-full rounded-lg border border-white/10 bg-black/40 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            title="Open full size"
          >
            <img
              src={result.image.dataUrl}
              alt="Browser at the moment of the error"
              loading="lazy"
              className="block h-auto max-h-80 max-w-full rounded-lg object-contain"
            />
          </button>
        )}
      </div>

      {enlarged && result?.image && (
        <ScreenshotOverlay image={result.image} onClose={() => setEnlarged(false)} />
      )}
    </section>
  );
}

function ScreenshotOverlay({ image, onClose }) {
  const closeButton = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Browser screenshot, full size"
      onClick={onClose}
    >
      <button
        ref={closeButton}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/70 p-2 text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        aria-label="Close the screenshot"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <img
        src={image.dataUrl}
        alt="Browser at the moment of the error, full size"
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

export default FailureScreenshot;
