import { StrictMode, useEffect, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import SiteNav from '../components/SiteNav.jsx';
import StaticIsland from '../components/StaticIsland.jsx';
import { HYDRATE_OPTIONS, islandHtml } from '../lib/boot.js';
import { FORM, HERO, META } from '../../shared/dealer-websites-content.js';
import { WEBSITE_FORM_ID, WEBSITE_SUCCESS_ID } from '../../shared/dealer-websites-route.js';
import { renderDealerWebsitesMirrorRest } from './static-mirror.js';
import { newSubmissionId, submitWebsiteRequest, validateWebsiteRequest } from './website-request.js';
import './websites.css';

const EXAMPLE_TABS = ['First impression', 'Vehicle details', 'Next step'];

function WebsiteExample() {
  const [view, setView] = useState(0);
  return (
    <figure className="dw-example">
      <div className="dw-example-tabs" role="tablist" aria-label="Explore the example dealership website">
        {EXAMPLE_TABS.map((label, index) => <button type="button" key={label} id={`dw-tab-${index}`} role="tab" aria-selected={view === index} aria-controls="dw-example-panel" tabIndex={view === index ? 0 : -1} onClick={() => setView(index)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (view + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
          setView(next); document.getElementById(`dw-tab-${next}`)?.focus();
        }}>{label}</button>)}
      </div>
      <div className="dw-browser">
        <div className="dw-browser-chrome"><span aria-hidden="true">● ● ●</span><span>yourdealership.com</span><span aria-hidden="true">↗</span></div>
        <div id="dw-example-panel" role="tabpanel" aria-labelledby={`dw-tab-${view}`} tabIndex={0}>
          <div className="dw-store-nav"><span>NORTHLINE <b>MOTORS</b></span><span>Inventory&nbsp;&nbsp; Our store&nbsp;&nbsp; Contact</span></div>
          <div className="dw-site-example" data-example-view={view}>
            <div className="dw-site-copy"><span className="dw-demo-label">{['YOUR BRAND. YOUR LOCAL MARKET.', 'A CLOSER LOOK. A CLEARER CHOICE.', 'THE VEHICLE. THE QUESTION. YOUR TEAM.'][view]}</span><h2>{['Good cars.\nGood people.', 'The details\nthat matter.', 'Start with\none question.'][view]}</h2><p>{['Find the right fit for your next chapter.', 'Clear vehicle information, right where you need it.', 'A simple path from this vehicle to your team.'][view]}</p><span className="dw-example-button">{['Explore our inventory', 'View vehicle details', 'Ask about this vehicle'][view]} <span aria-hidden="true">↗</span></span></div>
            <div className="dw-example-photo"><picture><img src="/studio/ford-f-150-after-550.webp" width="550" height="367" alt="Truck in an illustrative dealership website layout" decoding="async" fetchPriority="high" /></picture><span>FIND YOUR NEXT CHAPTER</span></div>
          </div>
          <div className="dw-example-bottom">{view === 0 ? <><span><b>Your inventory</b>Easy to explore</span><span><b>Your store</b>A reason to choose</span><span><b>Your buyers</b>A clear next step</span></> : view === 1 ? <><span><b>Photos</b>See the vehicle</span><span><b>Vehicle facts</b>Readable page content</span><span><b>Availability</b>Ask the dealership</span></> : <><span><b>Vehicle interest</b>Attached to the inquiry</span><span><b>Contact details</b>Delivered to your team</span><span><b>Next step</b>A real conversation</span></>}</div>
        </div>
      </div>
      <figcaption><span className="dw-status-dot" /> Illustrative website concept · sample content, not a live dealership</figcaption>
    </figure>
  );
}

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
    <div className="min-h-dvh bg-[#050505] dw-page">
      <a className="dw-skip" href="#main-content">Skip to content</a>
      <SiteNav page="dealer-websites" />
      <main id="main-content">
        <section className="dw-hero"><div className="dw-container dw-hero-grid"><div className="dw-hero-copy"><p className="dw-kicker"><span className="dw-status-dot" />{HERO.eyebrow}</p><h1>{HERO.h1Lead} <em>{HERO.h1Grad}</em></h1><p className="dw-intro">{HERO.sub}</p><a className="dw-button" href={`#${WEBSITE_FORM_ID}`}>{HERO.cta}<span aria-hidden="true">↗</span></a><p className="dw-hero-note">{HERO.note}</p><ul className="dw-chips">{HERO.chips.map((chip) => <li key={chip}><span aria-hidden="true">✓</span>{chip}</li>)}</ul></div><WebsiteExample /></div></section>
        <StaticIsland name="websites-rest" html={restHtml ?? renderDealerWebsitesMirrorRest({ capiUrl: runtime.VITE_CAPI_URL || '' })} />
      </main>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- build-time rendering and browser boot share an exact tree
export const dealerWebsitesElement = (props) => <StrictMode><DealerWebsitesApp {...props} /></StrictMode>;
// eslint-disable-next-line react-refresh/only-export-components
export function bootDealerWebsites(container) {
  return hydrateRoot(container, dealerWebsitesElement({ restHtml: islandHtml(container, 'websites-rest') }), HYDRATE_OPTIONS);
}
