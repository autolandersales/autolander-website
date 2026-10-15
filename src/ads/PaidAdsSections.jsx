import { useEffect, useRef, useState } from 'react';
import ResponsiveImage from '../components/ResponsiveImage.jsx';
import { ADS_IMAGES } from '../../shared/page-images.js';
import { IMAGE_SIZES } from '../../shared/responsive-images.js';
import {
  COMMERCIAL,
  DIFFERENCE,
  EVERY_PLAN_INCLUDES,
  EYEBROW,
  FAQ,
  FAQ_HEADING,
  FINAL_CTA,
  FINE_PRINT,
  FIT,
  FORM_ANCHOR,
  HERO,
  HOW_IT_STARTS,
  METHOD,
  MOBILE_BAR,
  NEVER_PROMISE,
  NOT_INCLUDED,
  PAID_ADS_UPDATED,
  PAID_ADS_UPDATED_HUMAN,
  PLANS,
  PLANS_SECTION,
  PROBLEM,
  PROMISES,
  PROOF,
  comparisonRows,
} from '../../shared/paid-ads-content.js';

/**
 * Presentational sections for /meta-ads-for-car-dealers/ (paid ads + AI commercials for dealer owners and GMs).
 * Logic-free apart from the commercial player; the application form, tracking and routing live in PaidAdsApp.jsx.
 * Every number here comes from shared/paid-ads-content.js PROOF / PLANS (AutoLander's own account, dated).
 */

// Hosted media (public/paid-ads/): the 31-second commercial and a muted 6-second loop for the hero phone.
export const COMMERCIAL_SRC = '/paid-ads/slow-day-commercial.mp4';
export const LOOP_SRC = '/paid-ads/slow-day-loop.mp4';
// The largest poster width the image build produced (the manifest's `src` names a 1600 the 1080-wide source never gets).
export const POSTER_SRC = `${ADS_IMAGES.poster.base}-${Math.max(...ADS_IMAGES.poster.widths)}.webp`;

// Inline icons (no icon-library import), so this lazy chunk shares nothing new with the homepage chunks.
const ArrowRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);
const Play = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const Check = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
);
const Cross = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const Grad = ({ children }) => (
  <span className="inline box-decoration-clone bg-gradient-to-b from-blue-300 to-blue-600 bg-clip-text pr-[0.14em] text-transparent">
    {children}
  </span>
);

export const Eyebrow = ({ children, tone = 'blue' }) => (
  <span className={`flex max-w-full items-start gap-2.5 font-mono text-[11px] font-semibold uppercase leading-relaxed tracking-[0.28em] ${tone === 'green' ? 'text-emerald-300/90' : 'text-blue-300/90'}`}>
    <span className={`mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-[2px] ${tone === 'green' ? 'bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.6)]' : 'bg-blue-400 shadow-[0_0_12px_2px_rgba(96,165,250,0.65)]'}`} />
    <span className="min-w-0">{children}</span>
  </span>
);

export const SectionHeading = ({ children, className = '' }) => (
  <h2 className={`font-display text-[clamp(2rem,9vw,2.25rem)] font-extrabold uppercase italic leading-[0.92] tracking-[-0.01em] text-white sm:text-5xl lg:text-6xl ${className}`}>
    {children}
  </h2>
);

export const ApplyLink = ({ onGo, className, children }) => (
  <a href={FORM_ANCHOR} data-apply-cta="" onClick={onGo} className={className}>
    {children}
  </a>
);

const PRIMARY_CTA = 'group flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-blue-600 px-6 py-5 font-display text-base font-extrabold uppercase italic tracking-tight text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 active:scale-95 sm:w-auto sm:px-8 sm:text-lg';

export const Beam = () => <div className="ads-beam" aria-hidden="true" />;

/**
 * The hero phone: the commercial's poster frame (eager, the page's largest paint) inside a phone frame. Once the page
 * is live the muted loop plays over it; the whole frame links to the commercial section.
 */
function PhoneFrame({ live, onWatch }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px] lg:mx-0 lg:ml-auto">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-blue-600/20 blur-[70px]" aria-hidden="true" />
      <a href={`#${COMMERCIAL.anchor}`} onClick={onWatch} className="group relative block overflow-hidden rounded-[2.25rem] border border-white/15 bg-black shadow-2xl shadow-black/60" aria-label={HERO.watch}>
        <ResponsiveImage image={ADS_IMAGES.poster} sizes={IMAGE_SIZES.adsPoster} eager className="block h-auto w-full" />
        {live && (
          <video className="absolute inset-0 h-full w-full object-cover" src={LOOP_SRC} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform group-hover:scale-105"><Play className="ml-0.5 h-5 w-5" /></span>
          <span className="text-sm font-bold leading-tight text-white">{HERO.watch} <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300">({HERO.watchNote})</span></span>
        </span>
      </a>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{HERO.phoneCaption}</p>
    </div>
  );
}

export function AdsHero({ headline, sub, cta, onGo, onWatch, live }) {
  return (
    <section className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-24 lg:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[120px] md:block" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="min-w-0 max-w-2xl">
          <Eyebrow>{EYEBROW}</Eyebrow>
          <h1 className="mt-5 font-display text-[clamp(2rem,8.6vw,2.6rem)] font-extrabold uppercase italic leading-[0.92] tracking-[-0.01em] text-white sm:text-6xl lg:text-[3.5rem]">
            {headline}
          </h1>
          <p className="al-ads-summary mt-5 max-w-xl text-lg font-medium leading-relaxed text-slate-300 lg:text-xl">{sub}</p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:items-start">
            <ApplyLink onGo={onGo} className={PRIMARY_CTA}>
              {cta}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </ApplyLink>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">{HERO.formNote}</p>
          <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
            {HERO.chips.map((chip, index) => (
              <li key={chip} className={`flex items-center gap-1.5 ${index === 0 ? 'text-slate-200' : ''} ${index === HERO.chips.length - 1 ? 'text-emerald-400' : ''}`}>
                <Check className="h-3.5 w-3.5 shrink-0 text-blue-400" />{chip}
              </li>
            ))}
          </ul>
        </div>
        <PhoneFrame live={live} onWatch={onWatch} />
      </div>
    </section>
  );
}

export function ProofSection() {
  return (
    <section id="proof" className="border-y border-white/5 bg-[#080808] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>{PROOF.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{PROOF.h2Lead} <Grad>{PROOF.h2Grad}</Grad></SectionHeading>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">{PROOF.lead}</p>
        <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROOF.stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
              <dd className="font-display text-5xl font-extrabold italic text-white sm:text-6xl">{stat.value}</dd>
              <dt className="mt-3 text-sm font-bold leading-snug text-slate-200">{stat.label}</dt>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-blue-300/90">{stat.detail}</p>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-4xl text-sm leading-relaxed text-slate-400">{PROOF.caption}</p>
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{PROBLEM.h2Lead} <Grad>{PROBLEM.h2Grad}</Grad></SectionHeading>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">{PROBLEM.lead}</p>
        <div className="mt-10 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM.items.map(({ title, body }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
              <h3 className="font-display text-xl font-extrabold uppercase italic text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MethodSection() {
  return (
    <section id="method" className="border-y border-white/5 bg-[#080808] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>{METHOD.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{METHOD.h2Lead} <Grad>{METHOD.h2Grad}</Grad></SectionHeading>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">{METHOD.lead}</p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METHOD.steps.map((step, index) => (
            <li key={step.title} className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
              <p className="font-display text-3xl font-extrabold italic text-blue-400">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 font-display text-xl font-extrabold uppercase italic text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The commercial itself: poster + play; the video element mounts on the first play (nothing downloads before). */
export function CommercialSection({ playing, onPlay }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (playing) videoRef.current?.play?.().catch(() => {});
  }, [playing]);
  return (
    <section id={COMMERCIAL.anchor} className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="mx-auto w-full max-w-[380px] lg:mx-0">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-black shadow-2xl shadow-blue-950/50">
            {playing ? (
              <video ref={videoRef} className="block h-auto w-full" src={COMMERCIAL_SRC} controls playsInline preload="auto" poster={POSTER_SRC} />
            ) : (
              <button type="button" onClick={onPlay} className="group relative block w-full text-left" aria-label={COMMERCIAL.play}>
                <ResponsiveImage image={ADS_IMAGES.poster} sizes={IMAGE_SIZES.adsPoster} className="block h-auto w-full" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-black shadow-2xl transition-transform group-hover:scale-105"><Play className="ml-1 h-9 w-9" /></span>
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-5 pt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-200">{COMMERCIAL.play} · {COMMERCIAL.duration}</span>
              </button>
            )}
          </div>
        </div>
        <div>
          <Eyebrow>{COMMERCIAL.eyebrow}</Eyebrow>
          <SectionHeading className="mt-5">{COMMERCIAL.h2Lead} <Grad>{COMMERCIAL.h2Grad}</Grad></SectionHeading>
          <p className="mt-6 text-lg leading-relaxed text-slate-300">{COMMERCIAL.body}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {COMMERCIAL.specs.map((spec) => <li key={spec} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300">{spec}</li>)}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-slate-400">{COMMERCIAL.disclosure}</p>
        </div>
      </div>
    </section>
  );
}

export function DifferenceSection() {
  return (
    <section className="border-y border-white/5 bg-[#080808] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>{DIFFERENCE.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{DIFFERENCE.h2Lead} <Grad>{DIFFERENCE.h2Grad}</Grad></SectionHeading>
        <div className="mt-10 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENCE.items.map(({ title, body }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
              <Check className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-4 font-display text-xl font-extrabold uppercase italic text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FitSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>{FIT.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{FIT.h2Lead} <Grad>{FIT.h2Grad}</Grad></SectionHeading>
        <div className="mt-10 grid items-start gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.04] p-6 sm:p-8">
            <h3 className="font-display text-2xl font-extrabold uppercase italic text-white">{FIT.forHeading}</h3>
            <ul className="mt-5 space-y-3">
              {FIT.forItems.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-300"><Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />{item}</li>)}
            </ul>
          </article>
          <article className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6 sm:p-8">
            <h3 className="font-display text-2xl font-extrabold uppercase italic text-white">{FIT.notHeading}</h3>
            <ul className="mt-5 space-y-3">
              {FIT.notItems.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-300"><Cross className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />{item}</li>)}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

export function HowItStarts() {
  return (
    <div>
      <h3 className="font-display text-2xl font-extrabold uppercase italic text-white sm:text-3xl">How it starts</h3>
      <ol className="mt-6 space-y-4">
        {HOW_IT_STARTS.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="font-display text-2xl font-extrabold italic text-blue-400">{index + 1}</p>
            <h4 className="mt-2 font-bold text-white">{step.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mx-auto mt-6 max-w-[360px] rounded-2xl border border-white/10 bg-[#0b0d12] p-4 lg:mx-0 lg:max-w-[420px]">
        <ResponsiveImage image={ADS_IMAGES.close} sizes={IMAGE_SIZES.adsClose} className="block h-auto w-full rounded-2xl" />
      </div>
    </div>
  );
}

function PlanCard({ plan, onGo }) {
  return (
    <article id={plan.anchor} className={`scroll-mt-24 rounded-3xl border p-6 ${plan.availability === 'by-application' ? 'border-blue-400/25 bg-blue-500/[0.05]' : 'border-white/10 bg-[#0b0d12]'}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl font-extrabold uppercase italic text-white">{plan.name}</h3>
        {plan.availability === 'by-application' && <span className="rounded-full bg-blue-500/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-blue-300">{PLANS_SECTION.byApplication}</span>}
      </div>
      <p className="mt-4 font-display text-2xl font-extrabold italic text-blue-300">{PLANS_SECTION.priceNote}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">{PLANS_SECTION.firstCommercialNote}</p>
      <p className="mt-4 text-sm font-bold text-slate-200">{plan.builtFor}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{plan.summary}</p>
      <ul className="mt-5 space-y-2">
        {plan.includes.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />{item}</li>)}
      </ul>
      <ApplyLink onGo={onGo} className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-display text-sm font-extrabold uppercase italic text-white transition-colors hover:bg-blue-500">{PLANS_SECTION.cardCta}</ApplyLink>
    </article>
  );
}

export function PlansSection({ onGo }) {
  const rows = comparisonRows();
  return (
    <section id={PLANS_SECTION.anchor} className="scroll-mt-24 border-y border-white/5 bg-[#080808] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>{PLANS_SECTION.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{PLANS_SECTION.h2Lead} <Grad>{PLANS_SECTION.h2Grad}</Grad></SectionHeading>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">{PLANS_SECTION.lead}</p>
        <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} onGo={onGo} />)}
        </div>
        <p className="mt-6 text-center font-bold text-blue-200">{PLANS_SECTION.customerLine}</p>
        <div className="mt-10 overflow-x-auto rounded-3xl border border-white/10 bg-[#0b0d12]">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm text-slate-300">
            <caption className="p-5 text-left font-bold text-white">{PLANS_SECTION.tableCaption}</caption>
            <thead><tr><th scope="col" className="border-t border-white/10 p-4" /> {PLANS.map((plan) => <th key={plan.id} scope="col" className="border-t border-white/10 p-4 text-white">{plan.name}</th>)}</tr></thead>
            <tbody>{rows.map(([label, ...cells]) => <tr key={label} className="border-t border-white/10"><th scope="row" className="p-4 font-semibold text-white">{label}</th>{cells.map((cell, index) => <td key={`${label}-${PLANS[index].id}`} className="p-4">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-12 rounded-3xl border border-white/10 bg-[#0b0d12] p-6 sm:p-8">
          <h3 className="font-display text-3xl font-extrabold uppercase italic text-white">{PLANS_SECTION.everyPlanHeading}</h3>
          <ul className="mt-6 grid gap-3 text-sm leading-relaxed text-slate-300 lg:grid-cols-2 lg:gap-x-8">
            {EVERY_PLAN_INCLUDES.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />{item}</li>)}
          </ul>
        </div>
        <div className="mt-16">
          <h3 className="font-display text-3xl font-extrabold uppercase italic text-white">{PLANS_SECTION.promisesHeading}</h3>
          <p className="mt-3 text-slate-300">{PLANS_SECTION.promisesIntro}</p>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-[#0b0d12]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <tbody>{PROMISES.map(({ promise, step }) => <tr key={promise} className="border-t border-white/10 first:border-t-0"><th scope="row" className="w-1/2 p-4 align-top font-semibold text-white">{promise}</th><td className="p-4 align-top leading-relaxed text-slate-300">{step}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="mt-10 grid items-start gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
            <h3 className="font-display text-2xl font-extrabold uppercase italic text-white">{PLANS_SECTION.neverHeading}</h3>
            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-slate-300">{NEVER_PROMISE.map((item) => <li key={item} className="flex gap-2"><Cross className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />{item}</li>)}</ul>
          </article>
          <article className="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
            <h3 className="font-display text-2xl font-extrabold uppercase italic text-white">{PLANS_SECTION.notIncludedHeading}</h3>
            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-slate-300">{NOT_INCLUDED.map((item) => <li key={item} className="flex gap-2"><Cross className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />{item}</li>)}</ul>
          </article>
        </div>
        <article className="mt-10 rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
          <h3 className="font-display text-2xl font-extrabold uppercase italic text-white">{PLANS_SECTION.finePrintHeading}</h3>
          <ul className="mt-5 space-y-2 text-sm leading-relaxed text-slate-400">{FINE_PRINT.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <p className="mt-8 font-mono text-xs uppercase tracking-wider text-slate-400">Plans updated <time dateTime={PAID_ADS_UPDATED}>{PAID_ADS_UPDATED_HUMAN}</time></p>
      </div>
    </section>
  );
}

export function AdsFaq() {
  return (
    <section id={FAQ_HEADING.anchor} className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow>{FAQ_HEADING.eyebrow}</Eyebrow>
        <SectionHeading className="mt-5">{FAQ_HEADING.h2Lead} <Grad>{FAQ_HEADING.h2Grad}</Grad></SectionHeading>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ q, a, allow }) => (
            <details key={q} className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5" {...(allow ? { 'data-claims-allow': '' } : {})}>
              <summary className="cursor-pointer font-bold text-white">{q}</summary>
              <p className="al-faq-a mt-3 text-sm leading-relaxed text-slate-300">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdsFinalCta({ onGo }) {
  return (
    <section className="border-t border-white/5 bg-[#080808] py-20 text-center lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading>{FINAL_CTA.h2Lead} <Grad>{FINAL_CTA.h2Grad}</Grad></SectionHeading>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">{FINAL_CTA.body}</p>
        <div className="mt-8 flex justify-center">
          <ApplyLink onGo={onGo} className={PRIMARY_CTA}>{FINAL_CTA.cta}<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></ApplyLink>
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-slate-400">{FINAL_CTA.note}</p>
      </div>
    </section>
  );
}

export function AdsMobileCtaBar({ onGo, formRef }) {
  const [show, setShow] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form || typeof IntersectionObserver === 'undefined') {
      const onScroll = () => setShow(window.scrollY > 560);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      setShow(window.scrollY > 560 && !entry.isIntersecting);
    });
    observer.observe(form);
    const onScroll = () => setShow(window.scrollY > 560 && !visibleRef.current);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [formRef]);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black px-4 pt-3 transition-transform duration-300 md:hidden ${show ? 'translate-y-0' : 'translate-y-full'}`} style={{ paddingBottom: 'max(0.7rem, env(safe-area-inset-bottom))' }} inert={!show}>
      <ApplyLink onGo={onGo} className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 font-display text-base font-extrabold uppercase italic text-white shadow-lg shadow-blue-600/30">{MOBILE_BAR.cta}</ApplyLink>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{MOBILE_BAR.note}</p>
    </div>
  );
}
