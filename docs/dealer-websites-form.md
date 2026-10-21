# Dealership websites page: form, Worker route and lead delivery

`/dealership-websites/` is the fourth Services page (beside AEO & GEO, Team Plans and Paid Ads & AI Commercials). It is built like the AEO and paid-ads pages: one copy module, a React page with its own stylesheet, a build-time no-JS mirror as the hydrated page's island, head + JSON-LD, registry / sitemap / home-directory entries and the Services link in every header and footer. It uses the shared `SiteNav` and `SiteFooter` (the footer is prerendered after `</main>` with the page's own columns) and the house responsive-image pipeline: AVIF and WebP derivatives, one eager hero image preloaded in the head and lazy images below it.

The form posts to `POST /api/website-request`, which is the existing `/api/ai-scan` pipeline (`handleAiScan` in `worker/src/booking/router.js`) running under `WEBSITE_PROFILE`, exactly the way `/api/ads-apply` runs under `PAID_ADS_PROFILE`. Nothing in this PR changes the scan or paid-ads behaviour (their test files are unchanged and green).

## Public contract

| Item | Value |
| --- | --- |
| Service page | `/dealership-websites/` |
| Navigation label | Dealership Websites |
| Form | `website-request-form` |
| Endpoint | `POST /api/website-request` (`application/json` or `application/x-www-form-urlencoded`) |
| No-JS success | `/dealership-websites/?sent=1#website-request-success` |
| No-JS failure | `/dealership-websites/?error=<reason>#website-request-error` |
| Storage | `TRACKING` KV, `website_request:req:<submissionId>` (90-day TTL) + `website_request:index:YYYY-MM-DD` |
| Rate limits | `website_request:*` keys in `CHAT_RATE_LIMITS`, apart from the scan and ads counters |
| CRM | GHL duplicate search → create if absent (source `AutoLander website project request`) → tags `website-request` (+ `website-sms-ok` on explicit consent) → note titled `AutoLander dealership website project request`. Never an upsert, never a workflow enrolment, a matched contact is never rewritten. |
| Meta | server event `WebsiteRequest`, event_id `websiterequest_<sha256>`, `content_category: dealer_websites`, production origin only |
| Kill switch | `WEBSITE_REQUEST_PUBLIC_ROUTE=off` (absent = on, like the scan and ads routes) |
| CAPI switch | `SEND_WORKER_WEBSITE_REQUEST_CAPI=false` (absent = on) |

Shared values live in `shared/dealer-websites-route.js` and `shared/dealer-websites-form.js`; the Worker and the page must ship the same contract, so deploy the Worker with or before the Pages build. For a new request the Worker replies only after three steps, in order. First it commits the request to KV with `crm: pending`. Second it runs the GHL sync (duplicate search, create if absent, tags, note) inline and awaits it, then rewrites the stored record with the outcome (`synced`, `skipped`, `needs_review` or `failed`). Third it runs the Meta step: the dedupe check, counters and user-data hashing are awaited, and only the CAPI HTTP send is handed to `ctx.waitUntil`, on production-origin requests only. A CRM or Meta failure never fails the request. A JSON receipt `{ ok: true, duplicate, submissionId, eventId }` means the request is stored and the CRM sync was attempted; the stored record's `crm` field holds the result. A repeated `submissionId` gets the stored receipt back with `duplicate: true` and nothing runs again.

## Illustrations

The page carries three illustrations of a neutral website concept drawn for the page:

| Slug | Where | Loading |
| --- | --- | --- |
| `website-concept-hero` | hero, beside the headline | eager, preloaded in the head |
| `website-vehicle-page` | "What we build" | lazy |
| `website-ai-readable` | "SEO and AI search" | lazy |

The sources are 2048 x 1536 PNGs in `scripts/image-sources/dealership-websites/`, and `prompts.json` in the same folder holds the prompts that made them. A 2048 wide source gives exactly the 640, 960, 1280 and 1600 widths. Rebuild the AVIF and WebP derivatives in `public/dealership-websites/`, the rows in `shared/responsive-image-manifest.json` and the OG card with:

    node scripts/build-responsive-images.mjs scripts/image-sources/dealership-websites website-concept-hero website-vehicle-page website-ai-readable

No dealership, real or fictional, is named on the page or drawn in the illustrations. The concept shows a neutral "Your Dealership" wordmark and debadged vehicles labelled by body style, with no manufacturer marks or model names and no price, mileage, rating or review count. The hero figure is captioned "Illustration of a website concept drawn for this page." and the two lower figures share "Illustrations of a website concept drawn for this page." Every alt text starts with "Illustration of" and names no dealership. The OG card (`public/og/dealership-websites.jpg`, 1200 x 630, under 150 KB) is the hero illustration fitted with contain on #050505, with no text drawn on it. `test/dealer-websites-rules.test.js` enforces the captions, the alt text, the dealer rule and the image loading rules.

## Fields

| Field | Validation |
| --- | --- |
| `dealershipName` | required, max 160 |
| `website` | **optional** (a dealer may have none yet); if given, must normalise to a plain `http(s)` host with no credentials or port; never fetched |
| `location` | required, max 80 |
| `projectGoal` | one of `PROJECT_GOAL_CHOICES` (replace / build new / help me choose) |
| `fullName` | first and last name |
| `role` | the shared decision-maker list; the salesperson choice is sent to the Marketplace demo and nothing is stored |
| `email`, `phone` | the existing validators; phone normalised |
| `smsConsent` | optional, initially unchecked; the Worker owns the consent text and version (`website-sms-consent-v1-2026-10-19`) |
| honeypot | existing `company` / `al_hp_q` / `al_hp_x7` handling; a spam receipt is stored without provider calls |

## Lead alert (the same pattern as the AI-scan and paid-ads pages)

The Worker writes the GHL contact, tags and note only. The Slack alert is the GHL workflow's job: a workflow on the tag `website-request` waits one minute and posts `{contact_id}` to a webhook; a Zapier zap reads the contact, parses the newest note whose first line is `AutoLander dealership website project request`, and posts `NEW WEBSITE LEAD` to #sales-floor (store, website, city/state, project goal, role, the ad / UTM source and the GHL link). The contact stays unassigned; the reps take turns. Those two pieces live outside this repo and are built by the AutoLander team; nothing in the Worker posts to Slack, so there is one Slack writer.

## Deploy

1. Deploy the Worker (route and CAPI are on by default, like the scan and the ads application; set the two switches only to turn them off).
2. Merge / publish the page.
3. One labelled test submission end to end (GHL contact + tags + note, the #sales-floor post, the `WebsiteRequest` event in Events Manager), then delete the test contact.

Rollback: `WEBSITE_REQUEST_PUBLIC_ROUTE=off` closes the route (the no-JS form lands on the page's error state); hide the Services entry if the page should not be public. Stored requests are kept.

Focused suite: `node --test test/dealer-websites-request.test.js test/dealer-websites-copy.test.js test/dealer-websites-seo.test.js test/dealer-websites-client.test.js test/dealer-websites-rules.test.js test/prerender-hydration.test.js test/route-bytes.test.js test/site-nav-services.test.js test/responsive-images-proof.test.js test/paid-ads-request.test.js test/ai-scan-request.test.js` (route-bytes skips its checks until `npm run build` has run).
