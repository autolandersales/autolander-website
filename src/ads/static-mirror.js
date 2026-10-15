import { ADS_IMAGES } from '../../shared/page-images.js';
import { responsiveImageHtml, IMAGE_SIZES } from '../../shared/responsive-images.js';
import { PAID_ADS_API_PATH } from '../../shared/paid-ads-route.js';
import {
  AD_BUDGET_CHOICES,
  ADS_TODAY_CHOICES,
  COMMERCIAL,
  DIFFERENCE,
  EVERY_PLAN_INCLUDES,
  EYEBROW,
  FAQ,
  FAQ_HEADING,
  FINAL_CTA,
  FINE_PRINT,
  FIT,
  FOOTER,
  FOOTER_NAV,
  FORM,
  FORM_ANCHOR,
  HEADLINES,
  HERO,
  HOW_IT_STARTS,
  MARKETPLACE_DEMO_PATH,
  METHOD,
  NEVER_PROMISE,
  NOT_INCLUDED,
  PAID_ADS_FORM_ID,
  PAID_ADS_UPDATED,
  PAID_ADS_UPDATED_HUMAN,
  PLANS,
  PLANS_SECTION,
  PROBLEM,
  PROMISES,
  PROOF,
  ROLE_CHOICES,
  SMS_CONSENT,
  SUBS,
  UNITS_CHOICES,
  comparisonRows,
} from '../../shared/paid-ads-content.js';

// The hosted commercial (public/paid-ads/), the same file the React section plays, and its poster (the largest
// width the image build produced; the manifest's `src` names a 1600 that a 1080-wide source never gets).
const COMMERCIAL_SRC = '/paid-ads/slow-day-commercial.mp4';
const POSTER_SRC = `${ADS_IMAGES.poster.base}-${Math.max(...ADS_IMAGES.poster.widths)}.webp`;

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const copy = esc;
const eyebrow = (text) => `<p class="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-300">${copy(text)}</p>`;
const heading = (lead, grad) => `<h2 class="mt-5 font-display text-4xl font-extrabold uppercase italic leading-[0.92] text-white sm:text-5xl">${copy(lead)} <span class="text-blue-400">${copy(grad)}</span></h2>`;
const list = (items, className = 'mt-5 space-y-2 text-sm leading-relaxed text-slate-300') => `<ul class="${className}">${items.map((item) => `<li>${copy(item)}</li>`).join('')}</ul>`;
const cards = (items) => `<div class="mt-10 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">${items.map(({ title, body }) => `<article class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><h3 class="font-display text-xl font-extrabold uppercase italic text-white">${copy(title)}</h3><p class="mt-3 text-sm leading-relaxed text-slate-400">${copy(body)}</p></article>`).join('')}</div>`;

export function renderPaidAdsMirror({ capiUrl = 'https://autolander.ai' } = {}) {
  return `<!--AL_STATIC_PAGE_START--><div id="al-static-page" class="min-h-dvh bg-[#050505] font-sans text-slate-50">
    <main id="main-content">
      ${heroSection()}

      ${renderPaidAdsMirrorRest({ capiUrl })}
    </main>
  </div><!--AL_STATIC_PAGE_END-->`;
}

function heroSection() {
  return `<section class="relative overflow-hidden pb-16 pt-12 lg:pb-24 lg:pt-20">
        <div class="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>${eyebrow(EYEBROW)}<h1 class="mt-5 font-display text-4xl font-extrabold uppercase italic leading-[0.92] text-white sm:text-6xl">${copy(HEADLINES.a)}</h1><p class="al-ads-summary mt-5 text-lg leading-relaxed text-slate-300">${copy(SUBS.a)}</p><a href="${FORM_ANCHOR}" class="mt-7 inline-flex rounded-2xl bg-blue-600 px-7 py-4 font-display text-base font-extrabold uppercase italic text-white shadow-lg shadow-blue-600/30">${copy(HERO.cta)}</a><p class="mt-3 text-xs text-slate-400">${copy(HERO.formNote)}</p><ul class="mt-5 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wider text-slate-400">${HERO.chips.map((chip) => `<li>${copy(chip)}</li>`).join('')}</ul></div>
          <div class="mx-auto w-full max-w-[340px]"><a href="#${COMMERCIAL.anchor}" class="block overflow-hidden rounded-[2.25rem] border border-white/15 bg-black">${responsiveImageHtml(ADS_IMAGES.poster, { sizes: IMAGE_SIZES.adsPoster, eager: true, className: 'block h-auto w-full' })}</a><p class="mt-3 text-xs leading-relaxed text-slate-400">${copy(HERO.phoneCaption)}</p></div>
        </div>
      </section>`;
}

function inputField(name, field, { span = false, type = 'text', hint = field.hint, extra = '' } = {}) {
  const id = `apply-${name}`;
  return `<label for="${id}" class="block${span ? ' sm:col-span-2' : ''}"><span class="text-sm font-bold text-slate-200">${copy(field.label)}${field.note ? ` <span class="font-normal text-slate-400">(${copy(field.note)})</span>` : ''}</span><input id="${id}" name="${name}" type="${type}" required toolparamdescription="${esc(field.agentHint)}" autocomplete="${esc(field.autocomplete)}"${hint ? ` placeholder="${esc(hint)}" aria-describedby="${id}-hint"` : ''}${extra} class="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-white" />${hint ? `<span id="${id}-hint" class="mt-1 block text-xs leading-relaxed text-slate-400">${copy(hint)}</span>` : ''}</label>`;
}

function selectField(name, field, choices, { span = false, trailing = '' } = {}) {
  const id = `apply-${name}`;
  return `<label for="${id}" class="block${span ? ' sm:col-span-2' : ''}"><span class="text-sm font-bold text-slate-200">${copy(field.label)}</span><select id="${id}" name="${name}" required toolparamdescription="${esc(field.agentHint)}" autocomplete="${esc(field.autocomplete)}" class="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-white"><option value="">${copy(field.placeholder)}</option>${choices.map((choice) => `<option value="${esc(choice)}">${copy(choice)}</option>`).join('')}</select>${trailing}</label>`;
}

function formSection(action) {
  const fields = FORM.fields;
  const group = (label) => `<p class="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300 sm:col-span-2">${copy(label)}</p>`;
  return `<section class="border-y border-white/5 bg-[#080808] py-20 lg:py-28">
    <div class="mx-auto grid max-w-7xl items-start gap-10 px-6 lg:grid-cols-2">
      <div class="order-2 lg:order-1">
        <h2 class="font-display text-3xl font-extrabold uppercase italic text-white">How it starts</h2>
        <ol class="mt-8 space-y-4">${HOW_IT_STARTS.map((step, index) => `<li class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p class="font-display text-2xl font-extrabold italic text-blue-400">${index + 1}</p><h3 class="mt-2 font-bold text-white">${copy(step.title)}</h3><p class="mt-1 text-sm leading-relaxed text-slate-400">${copy(step.body)}</p></li>`).join('')}</ol>
        <div class="mx-auto mt-6 max-w-[360px] rounded-2xl border border-white/10 bg-[#0b0d12] p-4 lg:mx-0 lg:max-w-[420px]">${responsiveImageHtml(ADS_IMAGES.close, { sizes: IMAGE_SIZES.adsClose, className: 'block h-auto w-full rounded-2xl' })}</div>
      </div>
      <form id="${PAID_ADS_FORM_ID}" method="post" action="${esc(action)}" aria-labelledby="apply-form-title" toolname="${esc(FORM.webmcp.toolname)}" tooldescription="${esc(FORM.webmcp.tooldescription)}" class="order-1 rounded-[2rem] border border-white/10 bg-[#0b0d12] p-6 shadow-2xl shadow-blue-950/30 sm:p-8 lg:order-2">
        <h2 id="apply-form-title" class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(FORM.title)}</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">${copy(FORM.intro)}</p>
        <p class="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-slate-300" data-marketplace-note="">${copy(FORM.marketplace.note)} <a class="font-bold text-blue-300 underline" href="${esc(MARKETPLACE_DEMO_PATH)}">${copy(FORM.marketplace.noteCta)}</a></p>
        <p class="mt-2 text-xs leading-relaxed text-slate-400">${copy(FORM.requiredNote)}</p>
        <div class="grid gap-4 sm:grid-cols-2">
          ${group(FORM.groups.store)}
          ${inputField('dealershipName', fields.dealershipName, { span: true })}
          ${inputField('website', fields.website, { extra: ' inputmode="url" autocapitalize="none" spellcheck="false"' })}
          ${inputField('location', fields.location, { extra: ' maxlength="80"' })}
          ${group(FORM.groups.ads)}
          ${selectField('unitsPerMonth', fields.unitsPerMonth, UNITS_CHOICES)}
          ${selectField('adBudget', fields.adBudget, AD_BUDGET_CHOICES)}
          ${selectField('adsToday', fields.adsToday, ADS_TODAY_CHOICES, { span: true })}
          ${group(FORM.groups.you)}
          ${inputField('fullName', fields.fullName)}
          ${selectField('role', fields.role, ROLE_CHOICES, { trailing: `<span class="mt-1 block text-xs leading-relaxed text-slate-400" data-marketplace-role-hint="">${copy(FORM.marketplace.roleHint)} <a class="font-bold text-blue-300 underline" href="${esc(MARKETPLACE_DEMO_PATH)}">${copy(FORM.marketplace.noteCta)}</a></span>` })}
          ${inputField('email', fields.email, { type: 'email', hint: '', extra: ' inputmode="email" autocapitalize="none" spellcheck="false"' })}
          ${inputField('phone', fields.phone, { type: 'tel', extra: ' inputmode="tel"' })}
        </div>
        <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label for="apply-company">Leave this field empty</label>
          <input id="apply-company" name="company" autocomplete="off" tabindex="-1" />
        </div>
        <input type="hidden" name="submissionId" value="" />
        <input type="hidden" name="smsConsentVersion" value="${esc(SMS_CONSENT.version)}" />
        <input type="hidden" name="submittedVia" value="form" />
        <div class="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-3">
          <p class="text-sm font-bold text-white" data-sms-lead="">${copy(FORM.smsLead)}</p>
          <label class="mt-2 flex items-start gap-3 text-sm leading-relaxed text-slate-300">
            <input id="apply-sms-consent" name="smsConsent" type="checkbox" value="true" aria-describedby="apply-sms-consent-hint" class="mt-1 h-5 w-5 shrink-0" />
            <span id="apply-sms-consent-hint">${copy(SMS_CONSENT.text)} ${SMS_CONSENT.links.map((link) => `<a class="text-blue-300 underline" href="${esc(link.href)}">${copy(link.label)}</a>`).join(' ')}</span>
          </label>
        </div>
        <p id="apply-status" tabindex="-1" aria-live="polite" class="mt-4 text-sm text-slate-400"></p>
        <button type="submit" class="mt-4 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-5 font-display text-base font-extrabold uppercase italic text-white shadow-lg shadow-blue-600/30">${copy(FORM.submit)}</button>
        <p class="mt-3 text-xs leading-relaxed text-slate-400">${copy(FORM.useNote)}</p>
      </form>
    </div>
  </section>`;
}

function plansSection() {
  const rows = comparisonRows();
  return `<section id="${PLANS_SECTION.anchor}" class="border-y border-white/5 bg-[#080808] py-20 lg:py-28">
    <div class="mx-auto max-w-7xl px-6">
      ${eyebrow(PLANS_SECTION.eyebrow)}${heading(PLANS_SECTION.h2Lead, PLANS_SECTION.h2Grad)}
      <p class="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">${copy(PLANS_SECTION.lead)}</p>
      <div class="mt-10 grid items-start gap-5 lg:grid-cols-3">${PLANS.map((plan) => `<article id="${plan.anchor}" class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6">
        <h3 class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(plan.name)}</h3>${plan.availability === 'by-application' ? `<p class="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-blue-300">${copy(PLANS_SECTION.byApplication)}</p>` : ''}
        <p class="mt-4 font-display text-2xl font-extrabold italic text-blue-300">${copy(PLANS_SECTION.priceNote)}</p>
        <p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">${copy(PLANS_SECTION.firstCommercialNote)}</p>
        <p class="mt-4 text-sm font-bold text-slate-200">${copy(plan.builtFor)}</p>
        <p class="mt-3 text-sm leading-relaxed text-slate-300">${copy(plan.summary)}</p>
        ${list(plan.includes)}
        <a href="${FORM_ANCHOR}" class="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-display text-sm font-extrabold uppercase italic text-white">${copy(PLANS_SECTION.cardCta)}</a>
      </article>`).join('')}</div>
      <p class="mt-6 text-center font-bold text-blue-200">${copy(PLANS_SECTION.customerLine)}</p>
      <div class="mt-10 overflow-x-auto rounded-3xl border border-white/10 bg-[#0b0d12]">
        <table class="min-w-[900px] w-full border-collapse text-left text-sm text-slate-300">
          <caption class="p-5 text-left font-bold text-white">${copy(PLANS_SECTION.tableCaption)}</caption>
          <thead><tr><th scope="col" class="border-t border-white/10 p-4"></th>${PLANS.map((plan) => `<th scope="col" class="border-t border-white/10 p-4 text-white">${copy(plan.name)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(([label, ...cells]) => `<tr class="border-t border-white/10"><th scope="row" class="p-4 font-semibold text-white">${copy(label)}</th>${cells.map((cell) => `<td class="p-4">${copy(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="mt-12 rounded-3xl border border-white/10 bg-[#0b0d12] p-6 sm:p-8"><h3 class="font-display text-3xl font-extrabold uppercase italic text-white">${copy(PLANS_SECTION.everyPlanHeading)}</h3>${list(EVERY_PLAN_INCLUDES, 'mt-6 grid gap-3 text-sm leading-relaxed text-slate-300 lg:grid-cols-2 lg:gap-x-8')}</div>
      <div class="mt-16">
        <h3 class="font-display text-3xl font-extrabold uppercase italic text-white">${copy(PLANS_SECTION.promisesHeading)}</h3>
        <p class="mt-3 text-slate-300">${copy(PLANS_SECTION.promisesIntro)}</p>
        <div class="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-[#0b0d12]"><table class="min-w-[720px] w-full border-collapse text-left text-sm"><tbody>${PROMISES.map(({ promise, step }) => `<tr class="border-t border-white/10 first:border-t-0"><th scope="row" class="w-1/2 p-4 align-top font-semibold text-white">${copy(promise)}</th><td class="p-4 align-top leading-relaxed text-slate-300">${copy(step)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="mt-10 grid items-start gap-5 lg:grid-cols-2">
        <article class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><h3 class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(PLANS_SECTION.neverHeading)}</h3>${list(NEVER_PROMISE)}</article>
        <article class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><h3 class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(PLANS_SECTION.notIncludedHeading)}</h3>${list(NOT_INCLUDED)}</article>
      </div>
      <article class="mt-10 rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><h3 class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(PLANS_SECTION.finePrintHeading)}</h3>${list(FINE_PRINT, 'mt-5 space-y-2 text-sm leading-relaxed text-slate-400')}</article>
      <p class="mt-8 font-mono text-xs uppercase tracking-wider text-slate-400">Plans updated <time datetime="${esc(PAID_ADS_UPDATED)}">${copy(PAID_ADS_UPDATED_HUMAN)}</time></p>
    </div>
  </section>`;
}

function footerSection() {
  return `<footer class="border-t border-white/5 py-14"><div class="mx-auto max-w-7xl px-6"><div class="grid gap-8 sm:grid-cols-3">${FOOTER_NAV.map((column) => `<div><p class="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">${copy(column.heading)}</p><ul class="mt-3 space-y-1">${column.links.map((link) => `<li><a class="text-sm text-slate-300 hover:text-white" href="${esc(link.href)}">${copy(link.label)}</a></li>`).join('')}</ul></div>`).join('')}</div><p class="mt-10 text-xs leading-relaxed text-slate-500">${copy(FOOTER.line)}</p></div></footer>`;
}

/**
 * Everything the static mirror carries below its hero: the crawlable no-JS body (proof, problem, method, the
 * commercial as a native video element, the application form with its native POST action and WebMCP attributes,
 * plans, FAQ, closing sections). The production shell ships it inside React's prerendered page as an inert island
 * right after the hydrated hero (src/components/StaticIsland.jsx); React swaps in the live sections after the first
 * paint.
 */
export function renderPaidAdsMirrorRest({ capiUrl = 'https://autolander.ai' } = {}) {
  const action = `${String(capiUrl).replace(/\/+$/, '')}${PAID_ADS_API_PATH}`;
  return `<section id="proof" class="border-y border-white/5 bg-[#080808] py-20"><div class="mx-auto max-w-7xl px-6">${eyebrow(PROOF.eyebrow)}${heading(PROOF.h2Lead, PROOF.h2Grad)}<p class="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">${copy(PROOF.lead)}</p><dl class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">${PROOF.stats.map((stat) => `<div class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><dd class="font-display text-5xl font-extrabold italic text-white">${copy(stat.value)}</dd><dt class="mt-3 text-sm font-bold text-slate-200">${copy(stat.label)}</dt><p class="mt-2 font-mono text-[10px] uppercase tracking-wider text-blue-300">${copy(stat.detail)}</p></div>`).join('')}</dl><p class="mt-6 max-w-4xl text-sm leading-relaxed text-slate-400">${copy(PROOF.caption)}</p></div></section>

      <section class="py-20"><div class="mx-auto max-w-7xl px-6">${eyebrow(PROBLEM.eyebrow)}${heading(PROBLEM.h2Lead, PROBLEM.h2Grad)}<p class="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">${copy(PROBLEM.lead)}</p>${cards(PROBLEM.items)}</div></section>

      <section id="method" class="border-y border-white/5 bg-[#080808] py-20"><div class="mx-auto max-w-7xl px-6">${eyebrow(METHOD.eyebrow)}${heading(METHOD.h2Lead, METHOD.h2Grad)}<p class="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">${copy(METHOD.lead)}</p><ol class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${METHOD.steps.map((step, index) => `<li class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><p class="font-display text-3xl font-extrabold italic text-blue-400">${String(index + 1).padStart(2, '0')}</p><h3 class="mt-2 font-display text-xl font-extrabold uppercase italic text-white">${copy(step.title)}</h3><p class="mt-3 text-sm leading-relaxed text-slate-400">${copy(step.body)}</p></li>`).join('')}</ol></div></section>

      <section id="${COMMERCIAL.anchor}" class="py-20"><div class="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]"><div class="mx-auto w-full max-w-[380px]"><video class="block h-auto w-full rounded-[2.25rem] border border-white/15 bg-black" src="${esc(COMMERCIAL_SRC)}" controls playsinline preload="none" poster="${esc(POSTER_SRC)}"></video><p class="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-400">${copy(COMMERCIAL.play)} · ${copy(COMMERCIAL.duration)}</p></div><div>${eyebrow(COMMERCIAL.eyebrow)}${heading(COMMERCIAL.h2Lead, COMMERCIAL.h2Grad)}<p class="mt-6 text-lg leading-relaxed text-slate-300">${copy(COMMERCIAL.body)}</p><ul class="mt-6 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-300">${COMMERCIAL.specs.map((spec) => `<li class="rounded-full border border-white/10 px-3 py-1.5">${copy(spec)}</li>`).join('')}</ul><p class="mt-6 text-xs leading-relaxed text-slate-400">${copy(COMMERCIAL.disclosure)}</p></div></div></section>

      <section class="border-y border-white/5 bg-[#080808] py-20"><div class="mx-auto max-w-7xl px-6">${eyebrow(DIFFERENCE.eyebrow)}${heading(DIFFERENCE.h2Lead, DIFFERENCE.h2Grad)}${cards(DIFFERENCE.items)}</div></section>

      <section class="py-20"><div class="mx-auto max-w-7xl px-6">${eyebrow(FIT.eyebrow)}${heading(FIT.h2Lead, FIT.h2Grad)}<div class="mt-10 grid items-start gap-5 lg:grid-cols-2"><article class="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.04] p-6"><h3 class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(FIT.forHeading)}</h3>${list(FIT.forItems)}</article><article class="rounded-3xl border border-white/10 bg-[#0b0d12] p-6"><h3 class="font-display text-2xl font-extrabold uppercase italic text-white">${copy(FIT.notHeading)}</h3>${list(FIT.notItems)}</article></div></div></section>

      ${formSection(action)}

      ${plansSection()}

      <section id="${FAQ_HEADING.anchor}" class="py-20"><div class="mx-auto max-w-4xl px-6">${eyebrow(FAQ_HEADING.eyebrow)}${heading(FAQ_HEADING.h2Lead, FAQ_HEADING.h2Grad)}<div class="mt-8 space-y-3">${FAQ.map(({ q, a, allow }) => `<details class="rounded-2xl border border-white/10 bg-[#0b0d12] p-5"${allow ? ' data-claims-allow=""' : ''}><summary class="cursor-pointer font-bold text-white">${copy(q)}</summary><p class="al-faq-a mt-3 text-sm leading-relaxed text-slate-300">${copy(a)}</p></details>`).join('')}</div></div></section>

      <section class="border-t border-white/5 bg-[#080808] py-20 text-center"><div class="mx-auto max-w-4xl px-6">${heading(FINAL_CTA.h2Lead, FINAL_CTA.h2Grad)}<p class="mt-6 text-lg leading-relaxed text-slate-300">${copy(FINAL_CTA.body)}</p><a href="${FORM_ANCHOR}" class="mt-8 inline-flex rounded-2xl bg-blue-600 px-8 py-5 font-display text-lg font-extrabold uppercase italic text-white shadow-lg shadow-blue-600/30">${copy(FINAL_CTA.cta)}</a><p class="mt-4 font-mono text-xs uppercase tracking-wider text-slate-400">${copy(FINAL_CTA.note)}</p></div></section>

      ${footerSection()}`;
}
