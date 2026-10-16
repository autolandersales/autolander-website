import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import {
  AD_BUDGET_CHOICES,
  ADS_TODAY_CHOICES,
  FOOTER,
  FOOTER_NAV,
  FORM,
  HEADLINE_SEGMENTS,
  HERO,
  MARKETPLACE_DEMO_PATH,
  MARKETPLACE_ROUTE,
  META,
  PAID_ADS_FORM_ID,
  ROLE_CHOICES,
  SMS_CONSENT,
  SUBS,
  SUCCESS,
  UNITS_CHOICES,
} from '../../shared/paid-ads-content.js';
import SiteFooter from '../components/SiteFooter.jsx';
import SiteNav from '../components/SiteNav.jsx';
import StaticIsland from '../components/StaticIsland.jsx';
import { HYDRATE_OPTIONS, islandHtml } from '../lib/boot.js';
import { carryValues, useLive } from '../lib/use-live.js';
import {
  AdsFaq,
  AdsFinalCta,
  AdsHero,
  AdsMobileCtaBar,
  Beam,
  CommercialSection,
  DifferenceSection,
  FitSection,
  Grad,
  HowItStarts,
  MethodSection,
  PlansSection,
  ProblemSection,
  ProofSection,
} from './PaidAdsSections.jsx';
import {
  APPLY_URL,
  formatPhoneInput,
  hasFirstAndLastName,
  isValidEmail,
  isValidPhone,
  newSubmissionId,
  normalizeWebsite,
  submitApplication,
} from './apply-request.js';
import { scrollBehavior } from './scroll.js';
import { paidAdsVariantFromSearch } from './variant.js';
import './ads.css';

/**
 * /meta-ads-for-car-dealers/: paid ads + AI commercials for dealer owners, GMs and marketing directors with a real
 * ad budget. Indexable (the Services entry beside AEO & GEO and Team Plans). Same tracking contract as the AEO page:
 * PageView from main.jsx, then the one server event the Worker sends for the application (PaidAdsApplication).
 *
 * Headline variants, one per ad angle (message match): ?v=a default = the free commercial, ?v=b = the free ad review.
 */

const initialForm = {
  dealershipName: '',
  website: '',
  location: '',
  unitsPerMonth: '',
  adBudget: '',
  adsToday: '',
  fullName: '',
  role: '',
  email: '',
  phone: '',
  smsConsent: false,
  company: '',
};

const FIELD = 'mt-2 h-12 w-full rounded-xl border bg-black/40 px-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/30';
const fieldClass = (bad) => `${FIELD} ${bad ? 'border-red-500/70 focus:border-red-500/70' : 'border-white/10 focus:border-blue-500/60'}`;
const REASON_FIELD = {
  missing_dealership: 'dealershipName',
  invalid_website: 'website',
  missing_location: 'location',
  missing_units: 'unitsPerMonth',
  missing_ad_budget: 'adBudget',
  missing_ads_today: 'adsToday',
  missing_full_name: 'fullName',
  missing_role: 'role',
  invalid_email: 'email',
  invalid_phone: 'phone',
};

function validate(form) {
  const errors = {};
  if (!form.dealershipName.trim()) errors.dealershipName = 'missing_dealership';
  if (!normalizeWebsite(form.website)) errors.website = 'invalid_website';
  if (!form.location.trim()) errors.location = 'missing_location';
  if (!UNITS_CHOICES.includes(form.unitsPerMonth)) errors.unitsPerMonth = 'missing_units';
  if (!AD_BUDGET_CHOICES.includes(form.adBudget)) errors.adBudget = 'missing_ad_budget';
  if (!ADS_TODAY_CHOICES.includes(form.adsToday)) errors.adsToday = 'missing_ads_today';
  if (!hasFirstAndLastName(form.fullName)) errors.fullName = 'missing_full_name';
  if (!ROLE_CHOICES.includes(form.role)) errors.role = 'missing_role';
  if (!isValidEmail(form.email)) errors.email = 'invalid_email';
  if (!isValidPhone(form.phone)) errors.phone = 'invalid_phone';
  return errors;
}

function returnedState() {
  if (typeof window === 'undefined') return { sent: false, reason: '' };
  const query = new URLSearchParams(window.location.search);
  return { sent: query.get('sent') === '1', reason: query.get('error') || '' };
}

function headlineVariant() {
  if (typeof window === 'undefined') return 'a';
  return paidAdsVariantFromSearch(window.location.search);
}

const renderHeadline = (variant) => HEADLINE_SEGMENTS[variant].map((part, index) => (
  part.accent ? <Grad key={`${variant}-${index}`}>{part.text}</Grad> : <span key={`${variant}-${index}`}>{part.text}</span>
));

const Hint = ({ id, children }) => children ? <span id={id} className="mt-1 block text-xs leading-relaxed text-slate-400">{children}</span> : null;
const InlineError = ({ id, reason }) => reason ? <span id={id} className="mt-1 block text-xs leading-relaxed text-red-300">{FORM.errors[reason]}</span> : null;
const GroupLabel = ({ children }) => <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/90 sm:col-span-2">{children}</p>;

// Starts from what a visitor typed into the static island's copy of this form before the page went live.
function carriedForm(values) {
  const form = carryValues(initialForm, values);
  return form.phone ? { ...form, phone: formatPhoneInput(form.phone) } : form;
}

function ApplyForm({ initialValues = null, variant = 'a' }) {
  const returned = useMemo(() => returnedState(), []);
  const [form, setForm] = useState(() => carriedForm(initialValues));
  const [phase, setPhase] = useState(returned.sent ? 'success' : 'capture');
  const [fieldErrors, setFieldErrors] = useState(() => {
    const field = REASON_FIELD[returned.reason];
    return field ? { [field]: returned.reason } : {};
  });
  const [error, setError] = useState(() => returned.reason ? (FORM.errors[returned.reason] || FORM.errors.noJsError) : '');
  const [agentAssisted, setAgentAssisted] = useState(false);
  const [reference, setReference] = useState('');
  const submissionId = useMemo(() => newSubmissionId(), []);
  const statusRef = useRef(null);
  const formRef = useRef(null);
  const doneRef = useRef(null);

  useEffect(() => {
    if (phase !== 'success' || !doneRef.current) return;
    doneRef.current.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    doneRef.current.focus({ preventScroll: true });
  }, [phase]);

  const markAgentAssisted = useCallback(() => {
    setAgentAssisted(true);
    setForm((current) => ({ ...current, smsConsent: false }));
  }, []);

  useEffect(() => {
    const node = formRef.current;
    const targets = [
      node,
      typeof window !== 'undefined' ? window : null,
      typeof document !== 'undefined' ? document.modelContext : null,
      typeof navigator !== 'undefined' ? navigator.modelContext : null,
    ].filter((target, index, all) => target?.addEventListener && all.indexOf(target) === index);
    targets.forEach((target) => target.addEventListener('toolactivated', markAgentAssisted));
    return () => targets.forEach((target) => target.removeEventListener('toolactivated', markAgentAssisted));
  }, [markAgentAssisted]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusTarget = (field) => {
    window.setTimeout(() => {
      const target = field ? formRef.current?.querySelector(`[name="${field}"]`) : statusRef.current;
      target?.focus();
    }, 0);
  };

  const fail = (reason) => {
    const field = REASON_FIELD[reason];
    if (field) setFieldErrors({ [field]: reason });
    setError(FORM.errors[reason] || FORM.errors.generic);
    focusTarget(field);
  };

  const submit = async (event) => {
    event.preventDefault();
    // A salesperson after the Marketplace posting tool goes to the product demo, never into the applications.
    if (form.role === MARKETPLACE_ROUTE.value) {
      window.location.assign(MARKETPLACE_DEMO_PATH);
      return;
    }
    if (event.nativeEvent?.agentInvoked) {
      markAgentAssisted();
      return;
    }
    const errors = validate(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(FORM.errorSummaryTitle);
      focusTarget(Object.keys(errors)[0]);
      return;
    }
    setPhase('submitting');
    setError('');
    setFieldErrors({});
    try {
      const res = await submitApplication({
        ...form,
        website: normalizeWebsite(form.website),
        location: form.location.trim(),
        consentTimestamp: new Date().toISOString(),
        submissionId,
      });
      if (res.ok) {
        setReference(res.reference || res.id || '');
        setPhase('success');
        return;
      }
      setPhase('capture');
      fail(res.reason);
    } catch {
      setPhase('capture');
      fail('generic');
    }
  };

  if (phase === 'success') {
    return (
      <div id={PAID_ADS_FORM_ID} ref={doneRef} tabIndex={-1} className="scroll-mt-24 rounded-[2rem] border border-emerald-400/25 bg-[#0b0d12] p-6 outline-none sm:p-8" role="status">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">{SUCCESS.eyebrow}</p>
        <p className="mt-3 font-display text-2xl font-extrabold uppercase italic text-white">{SUCCESS.heading}</p>
        <p className="mt-4 leading-relaxed text-slate-300">
          {returned.sent ? SUCCESS.noJsBody : SUCCESS.body(form.dealershipName.trim(), form.email.trim())}
        </p>
        {reference && <p className="mt-4 font-mono text-xs uppercase tracking-wider text-slate-300">{SUCCESS.referenceLabel}: {reference}</p>}
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{SUCCESS.footnote}</p>
      </div>
    );
  }

  const busy = phase === 'submitting';
  const wantsMarketplace = form.role === MARKETPLACE_ROUTE.value;
  const describedBy = (key, hasHint = false) => [hasHint ? `apply-${key}-hint` : '', fieldErrors[key] ? `apply-${key}-error` : ''].filter(Boolean).join(' ') || undefined;
  const select = (key, choices, span = false) => (
    <label htmlFor={`apply-${key}`} className={`block ${span ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-bold text-slate-200">{FORM.fields[key].label}</span>
      <select id={`apply-${key}`} name={key} required toolparamdescription={FORM.fields[key].agentHint} aria-describedby={describedBy(key)} autoComplete={FORM.fields[key].autocomplete} value={form[key]} onChange={(e) => update(key, e.target.value)} aria-invalid={Boolean(fieldErrors[key])} className={fieldClass(fieldErrors[key])}>
        <option value="">{FORM.fields[key].placeholder}</option>
        {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      </select>
      <InlineError id={`apply-${key}-error`} reason={fieldErrors[key]} />
    </label>
  );
  return (
    <form
      id={PAID_ADS_FORM_ID}
      ref={formRef}
      method="post"
      action={APPLY_URL}
      onSubmit={submit}
      noValidate
      aria-labelledby="apply-form-title"
      toolname={FORM.webmcp.toolname}
      tooldescription={FORM.webmcp.tooldescription}
      className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-[#0b0d12] p-6 sm:p-8"
    >
      <p id="apply-form-title" className="font-display text-2xl font-extrabold uppercase italic text-white">{variant === 'b' ? FORM.titleB : FORM.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{FORM.intro}</p>
      <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-slate-300" data-marketplace-note="">
        {FORM.marketplace.note}{' '}
        <a href={MARKETPLACE_DEMO_PATH} className="font-bold text-blue-300 underline underline-offset-2 hover:text-blue-200">{FORM.marketplace.noteCta}</a>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{FORM.requiredNote}</p>
      {agentAssisted && <p className="mt-4 rounded-xl border border-blue-400/25 bg-blue-500/[0.07] p-3 text-sm leading-relaxed text-blue-100">{FORM.agentBanner}</p>}
      <input id="apply-submissionId" type="hidden" name="submissionId" value={submissionId} />
      <input id="apply-submittedVia" type="hidden" name="submittedVia" value="form" />
      <input id="apply-smsConsentVersion" type="hidden" name="smsConsentVersion" value={SMS_CONSENT.version} />
      <div className="grid gap-4 sm:grid-cols-2">
        <GroupLabel>{FORM.groups.store}</GroupLabel>
        <label htmlFor="apply-dealershipName" className="block sm:col-span-2">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.dealershipName.label}</span>
          <input id="apply-dealershipName" name="dealershipName" required toolparamdescription={FORM.fields.dealershipName.agentHint} aria-describedby={describedBy('dealershipName')} autoComplete={FORM.fields.dealershipName.autocomplete} value={form.dealershipName} onChange={(e) => update('dealershipName', e.target.value)} aria-invalid={Boolean(fieldErrors.dealershipName)} className={fieldClass(fieldErrors.dealershipName)} />
          <InlineError id="apply-dealershipName-error" reason={fieldErrors.dealershipName} />
        </label>
        <label htmlFor="apply-website" className="block">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.website.label}</span>
          <input id="apply-website" name="website" required toolparamdescription={FORM.fields.website.agentHint} aria-describedby={describedBy('website', true)} inputMode="url" autoComplete={FORM.fields.website.autocomplete} autoCapitalize="none" spellCheck={false} placeholder={FORM.fields.website.hint} value={form.website} onChange={(e) => update('website', e.target.value)} aria-invalid={Boolean(fieldErrors.website)} className={fieldClass(fieldErrors.website)} />
          <Hint id="apply-website-hint">{FORM.fields.website.hint}</Hint>
          <InlineError id="apply-website-error" reason={fieldErrors.website} />
        </label>
        <label htmlFor="apply-location" className="block">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.location.label}</span>
          <input id="apply-location" name="location" required toolparamdescription={FORM.fields.location.agentHint} aria-describedby={describedBy('location', true)} autoComplete={FORM.fields.location.autocomplete} maxLength={80} value={form.location} onChange={(e) => update('location', e.target.value)} aria-invalid={Boolean(fieldErrors.location)} className={fieldClass(fieldErrors.location)} />
          <Hint id="apply-location-hint">{FORM.fields.location.hint}</Hint>
          <InlineError id="apply-location-error" reason={fieldErrors.location} />
        </label>
        <GroupLabel>{FORM.groups.ads}</GroupLabel>
        {select('unitsPerMonth', UNITS_CHOICES)}
        {select('adBudget', AD_BUDGET_CHOICES)}
        {select('adsToday', ADS_TODAY_CHOICES, true)}
        <GroupLabel>{FORM.groups.you}</GroupLabel>
        <label htmlFor="apply-fullName" className="block">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.fullName.label}</span>
          <input id="apply-fullName" name="fullName" required toolparamdescription={FORM.fields.fullName.agentHint} aria-describedby={describedBy('fullName', true)} autoComplete={FORM.fields.fullName.autocomplete} placeholder={FORM.fields.fullName.hint} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} aria-invalid={Boolean(fieldErrors.fullName)} className={fieldClass(fieldErrors.fullName)} />
          <Hint id="apply-fullName-hint">{FORM.fields.fullName.hint}</Hint>
          <InlineError id="apply-fullName-error" reason={fieldErrors.fullName} />
        </label>
        <label htmlFor="apply-role" className="block">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.role.label}</span>
          <select id="apply-role" name="role" required toolparamdescription={FORM.fields.role.agentHint} aria-describedby={describedBy('role')} autoComplete={FORM.fields.role.autocomplete} value={form.role} onChange={(e) => update('role', e.target.value)} aria-invalid={Boolean(fieldErrors.role)} className={fieldClass(fieldErrors.role)}>
            <option value="">{FORM.fields.role.placeholder}</option>
            {ROLE_CHOICES.map((role) => <option key={role} value={role}>{role}</option>)}
            <option value={MARKETPLACE_ROUTE.value}>{MARKETPLACE_ROUTE.label}</option>
          </select>
          <span className="mt-1 block text-xs leading-relaxed text-slate-400" data-marketplace-role-hint="">{FORM.marketplace.roleHint} <a className="font-bold text-blue-300 underline" href={MARKETPLACE_DEMO_PATH}>{FORM.marketplace.noteCta}</a></span>
          <InlineError id="apply-role-error" reason={fieldErrors.role} />
        </label>
        <label htmlFor="apply-email" className="block">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.email.label} <span className="font-normal text-slate-400">({FORM.fields.email.note})</span></span>
          <input id="apply-email" name="email" required toolparamdescription={FORM.fields.email.agentHint} aria-describedby={describedBy('email', true)} type="email" inputMode="email" autoComplete={FORM.fields.email.autocomplete} autoCapitalize="none" spellCheck={false} value={form.email} onChange={(e) => update('email', e.target.value)} aria-invalid={Boolean(fieldErrors.email)} className={fieldClass(fieldErrors.email)} />
          <Hint id="apply-email-hint">{FORM.fields.email.note}</Hint>
          <InlineError id="apply-email-error" reason={fieldErrors.email} />
        </label>
        <label htmlFor="apply-phone" className="block">
          <span className="text-sm font-bold text-slate-200">{FORM.fields.phone.label} <span className="font-normal text-slate-400">({FORM.fields.phone.note})</span></span>
          <input id="apply-phone" name="phone" required toolparamdescription={FORM.fields.phone.agentHint} aria-describedby={describedBy('phone', true)} type="tel" inputMode="tel" autoComplete={FORM.fields.phone.autocomplete} placeholder={FORM.fields.phone.hint} value={form.phone} onChange={(e) => update('phone', formatPhoneInput(e.target.value))} aria-invalid={Boolean(fieldErrors.phone)} className={fieldClass(fieldErrors.phone)} />
          <Hint id="apply-phone-hint">{FORM.fields.phone.hint}</Hint>
          <InlineError id="apply-phone-error" reason={fieldErrors.phone} />
        </label>
      </div>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="apply-company">
          <span>{FORM.fields.dealershipName.label}</span>
          <input id="apply-company" name="company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => update('company', e.target.value)} />
        </label>
      </div>
      {wantsMarketplace ? (
        <div className="mt-5 rounded-2xl border border-blue-400/30 bg-blue-500/[0.08] p-4" role="status" data-marketplace-route="">
          <p className="text-sm leading-relaxed text-slate-200">{FORM.marketplace.routeBody}</p>
          <a href={MARKETPLACE_DEMO_PATH} className="mt-4 flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-blue-600 px-6 py-5 font-display text-base font-extrabold uppercase italic tracking-tight text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 sm:text-lg">
            {FORM.marketplace.routeCta}
          </a>
        </div>
      ) : (<>
        {/* The consent box stays UNCHECKED: a pre-checked box is not the affirmative opt-in the TCPA and carrier
            10DLC rules require (same ruling as the AEO page, 2026-10-01). */}
        <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-3">
          <p className="text-sm font-bold text-white" data-sms-lead="">{FORM.smsLead}</p>
          <label htmlFor="apply-smsConsent" className="mt-2 flex items-start gap-3 text-sm leading-relaxed text-slate-300">
            <input id="apply-smsConsent" name="smsConsent" value="true" type="checkbox" aria-describedby="apply-sms-consent-hint" checked={form.smsConsent} onChange={(e) => update('smsConsent', e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
            <span id="apply-sms-consent-hint">
              {SMS_CONSENT.text}{' '}
              {SMS_CONSENT.links.map((link, index) => <span key={link.href}>{index ? ' · ' : ''}<a className="text-blue-300 underline underline-offset-2 hover:text-blue-200" href={link.href}>{link.label}</a></span>)}
            </span>
          </label>
        </div>
        <button type="submit" data-apply-cta="" disabled={busy} className="mt-5 flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-blue-600 px-6 py-5 font-display text-base font-extrabold uppercase italic tracking-tight text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 sm:text-lg">
          {busy ? FORM.submitting : FORM.submit}
        </button>
      </>)}
      <p id="apply-status" ref={statusRef} tabIndex={-1} className={`mt-3 text-sm outline-none ${error ? 'text-red-300' : 'text-slate-400'}`} aria-live="polite">{error}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{FORM.useNote}</p>
    </form>
  );
}

/**
 * `prerendered` is the build-time/hydration mode (scripts/prerender.mjs, main.jsx): the nav and hero are React's,
 * everything below the hero is the static mirror (`restHtml`) until the page goes live after hydration. `variant`
 * pins the headline (the build renders 'a'); with no props (dev, Root's lazy route) it reads ?v= as before.
 */
export default function PaidAdsApp({ prerendered = false, restHtml = '', variant: pinnedVariant } = {}) {
  const [variant] = useState(() => pinnedVariant ?? headlineVariant());
  const formSectionRef = useRef(null);
  const [live, ensureLive, carried] = useLive(prerendered);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    document.title = META.title;
  }, []);

  const goToForm = useCallback((event) => {
    event?.preventDefault?.();
    ensureLive();
    const form = document.getElementById(PAID_ADS_FORM_ID);
    if (!form) return;
    form.querySelector('input[name="dealershipName"]')?.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }, [ensureLive]);

  const watchCommercial = useCallback((event) => {
    event?.preventDefault?.();
    ensureLive();
    document.getElementById('commercial')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    window.setTimeout(() => setPlaying(true), 450);
  }, [ensureLive]);

  return (
    <div className="min-h-dvh bg-[#050505] font-sans text-slate-50 selection:bg-blue-500/30 selection:text-blue-200" data-headline-variant={variant}>
      <SiteNav page="paid-ads" isMobileNavVisible onPrimaryAction={goToForm} />
      <main id="main-content">
        <AdsHero headline={renderHeadline(variant)} sub={SUBS[variant]} cta={variant === 'b' ? HERO.ctaB : HERO.cta} onGo={goToForm} onWatch={watchCommercial} live={live} />
        {live ? (
          <>
            <ProofSection />
            <ProblemSection />
            <Beam />
            <MethodSection />
            <CommercialSection playing={playing} onPlay={() => setPlaying(true)} />
            <DifferenceSection />
            <FitSection />
            <section ref={formSectionRef} className="scroll-mt-4 border-y border-white/5 bg-[#080808] py-20 lg:py-28">
              <div className="mx-auto grid max-w-7xl items-start gap-10 px-6 lg:grid-cols-2">
                <div className="order-2 lg:order-1"><HowItStarts /></div>
                <div className="order-1 lg:order-2"><ApplyForm initialValues={carried} variant={variant} /></div>
              </div>
            </section>
            <PlansSection onGo={goToForm} />
            <AdsFaq />
            <AdsFinalCta onGo={goToForm} />
          </>
        ) : <StaticIsland name="ads-rest" html={restHtml} />}
      </main>
      {live && <SiteFooter extraLine={FOOTER.line} mobileCtaPadding columns={FOOTER_NAV} />}
      {live && <AdsMobileCtaBar onGo={goToForm} formRef={formSectionRef} />}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- boot helpers live with the page they boot
export const paidAdsElement = (props) => (
  <StrictMode>
    <PaidAdsApp {...props} />
  </StrictMode>
);

// main.jsx: variant a (the default and the one the build prerenders) adopts the prerendered nav + hero and the
// static island. The ad variant b renders on the client, so its headline is its own.
// eslint-disable-next-line react-refresh/only-export-components
export function bootPaidAds(container) {
  const variant = paidAdsVariantFromSearch(window.location.search);
  if (variant === 'a') {
    return hydrateRoot(container, paidAdsElement({ prerendered: true, variant, restHtml: islandHtml(container, 'ads-rest') }), HYDRATE_OPTIONS);
  }
  const root = createRoot(container);
  root.render(paidAdsElement({ variant }));
  return root;
}
