import { StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import ResponsiveImage from '../components/ResponsiveImage.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import SiteNav from '../components/SiteNav.jsx';
import StaticIsland from '../components/StaticIsland.jsx';
import { HYDRATE_OPTIONS, islandHtml } from '../lib/boot.js';
import { FOOTER, FOOTER_NAV, FORM, HERO, ILLUSTRATIONS, META } from '../../shared/dealer-websites-content.js';
import { WEBSITE_IMAGES } from '../../shared/dealer-websites-images.js';
import { IMAGE_SIZES } from '../../shared/responsive-images.js';
import { WEBSITE_FORM_ID, WEBSITE_SUCCESS_ID } from '../../shared/dealer-websites-route.js';
import { renderDealerWebsitesMirrorRest } from './static-mirror.js';
import { newSubmissionId, submitWebsiteRequest, validateWebsiteRequest } from './website-request.js';
import './websites.css';

function useWebsiteForm() {
  useEffect(() => {
    const form = document.getElementById(WEBSITE_FORM_ID);
    if (!form) return;
    const success = document.getElementById(WEBSITE_SUCCESS_ID);
    const summary = form.querySelector('.dw-form-error');
    const button = form.querySelector('button[type="submit"]');
    let busy = false;
    let abort;
    // Preserve the key through uncertain responses and user retries; do not fabricate a browser conversion.
    const submissionId = newSubmissionId();
    form.elements.namedItem('submissionId').value = submissionId;
    form.noValidate = true;
    const showSuccess = () => {
      form.hidden = true;
      success.classList.add('dw-success-visible');
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    };
    if (new URLSearchParams(window.location.search).get('sent') === '1') showSuccess();
    const clearErrors = () => {
      summary.hidden = true;
      form.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));
      form.querySelectorAll('.dw-field-error').forEach((node) => { node.hidden = true; node.textContent = ''; });
    };
    const fail = (reason, field) => {
      const message = FORM.errors[reason] || FORM.errors.generic;
      summary.textContent = message;
      summary.hidden = false;
      if (field) {
        const input = form.elements.namedItem(field);
        input?.setAttribute('aria-invalid', 'true');
        const hint = document.getElementById(`website-${field}-error`);
        if (hint) { hint.textContent = message; hint.hidden = false; }
        input?.focus();
      } else summary.focus();
    };
    const submit = async (event) => {
      event.preventDefault();
      if (busy) return;
      clearErrors();
      const data = Object.fromEntries(new FormData(form));
      data.smsConsent = form.elements.namedItem('smsConsent').checked;
      data.submissionId = submissionId;
      const invalid = validateWebsiteRequest(data);
      if (invalid) { fail(invalid[1], invalid[0]); return; }
      busy = true; button.disabled = true; button.textContent = FORM.sending;
      abort = new AbortController();
      const timeout = window.setTimeout(() => abort.abort(), 25000);
      try {
        const result = await submitWebsiteRequest(data, { signal: abort.signal });
        if (result.ok) showSuccess();
        else fail(result.reason);
      } catch { fail('generic'); }
      finally {
        window.clearTimeout(timeout); busy = false; button.disabled = false; button.textContent = FORM.submit;
      }
    };
    const returned = new URLSearchParams(window.location.search).get('error');
    if (returned) fail(returned);
    form.addEventListener('submit', submit);
    form.addEventListener('input', clearErrors);
    return () => { form.removeEventListener('submit', submit); form.removeEventListener('input', clearErrors); abort?.abort(); };
  }, []);
}

export default function DealerWebsitesApp({ restHtml } = {}) {
  useEffect(() => { document.title = META.title; }, []);
  useWebsiteForm();
  const runtime = import.meta.env || {};
  return (
    <div className="min-h-dvh bg-[#050505] font-sans text-slate-50 selection:bg-blue-500/30 selection:text-blue-200 dw-page">
      <a className="dw-skip" href="#main-content">Skip to content</a>
      <SiteNav page="dealer-websites" />
      <main id="main-content">
        <section className="dw-hero"><div className="dw-container dw-hero-grid"><div className="dw-hero-copy"><p className="dw-kicker"><span className="dw-status-dot" />{HERO.eyebrow}</p><h1>{HERO.h1Lead} <em>{HERO.h1Grad}</em></h1><p className="dw-intro">{HERO.sub}</p><a className="dw-button" href={`#${WEBSITE_FORM_ID}`}>{HERO.cta}<span aria-hidden="true">↗</span></a><p className="dw-hero-note">{HERO.note}</p><ul className="dw-chips">{HERO.chips.map((chip) => <li key={chip}><span aria-hidden="true">✓</span>{chip}</li>)}</ul></div>
          <figure className="dw-art dw-hero-art">
            <div className="dw-art-glow" aria-hidden="true" />
            <ResponsiveImage image={WEBSITE_IMAGES.hero} sizes={IMAGE_SIZES.websitesHero} eager />
            <figcaption className="dw-art-caption">{ILLUSTRATIONS.hero.caption}</figcaption>
          </figure>
        </div></section>
        <StaticIsland name="websites-rest" html={restHtml ?? renderDealerWebsitesMirrorRest({ capiUrl: runtime.VITE_CAPI_URL || '' })} />
      </main>
      <SiteFooter extraLine={FOOTER.line} columns={FOOTER_NAV} />
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- build-time rendering and browser boot share an exact tree
export const dealerWebsitesElement = (props) => <StrictMode><DealerWebsitesApp {...props} /></StrictMode>;
// eslint-disable-next-line react-refresh/only-export-components
export function bootDealerWebsites(container) {
  return hydrateRoot(container, dealerWebsitesElement({ restHtml: islandHtml(container, 'websites-rest') }), HYDRATE_OPTIONS);
}
