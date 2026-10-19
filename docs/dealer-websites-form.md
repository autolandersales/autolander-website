# Dealership website request: implementation and deployment gate

PR implementation only. No deployment, live lead, CRM write, Slack message or Meta event was sent while building this change. Local tests replace every outbound `fetch` with a mock. Existing demo, AI visibility scan and paid-ads paths are not migrated or reconfigured.

## Public contract

| Item | Value |
| --- | --- |
| Service page | `/dealership-websites/` |
| Navigation label | Dealership Websites |
| Form | `website-request-form` |
| Endpoint | `POST /api/website-request` |
| Encodings | `application/json`, `application/x-www-form-urlencoded` |
| No-JS success | `/dealership-websites/?sent=1#website-request-success` |
| No-JS failure | `/dealership-websites/?error=<reason>#website-request-error` |
| Request envelope | `TRACKING` KV, `website_request:req:<submissionId>`, one write, 90-day TTL |
| Delivery receipts | `website_request:delivery:<submissionId>:<step>:started` and `:result`, distinct one-write keys, 90-day TTL |
| Daily lookup index | `website_request:index:YYYY-MM-DD` (best effort, not authoritative) |
| Server conversion | `WebsiteRequest`, deterministic `websiterequest_<hash>` ID |

Shared values live in `shared/dealer-websites-route.js` and `shared/dealer-websites-form.js`. Worker and frontend must ship the same contract. The JSON receipt is `{ ok: true, duplicate, submissionId, eventId }`: it means the valid request has been durably received, **not** that every downstream system has already completed delivery.

The native form gets a server-generated submission ID if its hidden ID is empty. Native-form resubmission without a retained ID is a new submission; do not describe this as exact-once delivery.

## Captured fields

| Field | Validation / use |
| --- | --- |
| `dealershipName` | Required; trimmed, max 160 characters |
| `website` | Optional, including for a new dealership; if entered, must normalize to a valid website. Credential-bearing URLs and nonstandard ports are rejected. Never fetched by the Worker. |
| `location` | Required city / ZIP, max 80 characters |
| `projectGoal` | One of: Replace our current website; Build a new dealership website; Help me choose the right next step |
| `fullName` | Required first and last name |
| `role` | Existing decision-maker role list shared with the AI visibility form |
| `email` / `phone` | Existing email and phone validators; normalized phone |
| `smsConsent` | Optional, initially unchecked; only boolean `true` in JSON or `on` / `true` in a native form count |
| Attribution | Existing first-touch, organic, UTM, click and visitor attribution path; stored with request and in the CRM request note |
| Honeypot | Existing `company` / `al_hp_q` / `al_hp_x7` handling; spam receipt is stored without provider calls |

Marketplace-software salespeople retain the existing product-demo off-ramp; that choice never becomes a website service request.

SMS consent uses `website-sms-consent-v1-2026-10-19`, purpose-limited to the website request / project discussion, up to four messages per request. The Worker owns the disclosure/version; client-supplied consent wording is ignored. This PR does not send SMS or enroll anyone in an SMS workflow.

## Delivery flow and safety

1. Check readiness; validate the request; apply website-only rate limits.
2. Persist the complete request in KV before any provider call.
3. Run GHL contact matching / create-if-absent, additive service tags and a request note.
4. Send one website-specific Slack alert, including CRM delivery status so a CRM problem remains visible.
5. If explicitly enabled and the HTTP request is production-origin, send `WebsiteRequest` to the existing Meta dataset configuration.

Each external effect has an independent durable checkpoint: `crmContact`, `crmTags`, `crmNote`, `slack`, `meta`. A `:started` receipt is written **before** the effect; a separate `:result` key carries `succeeded`, `failed`, `uncertain`, `needs_review` or `skipped` afterward. Each key is written once; the original request envelope is never overwritten by delivery updates. This avoids [Cloudflare KV's one-write-per-second limit on a single key](https://developers.cloudflare.com/kv/platform/limits/) without adding sleeps. If a pre-effect checkpoint cannot be written, that effect does not run. If a post-effect checkpoint fails, the started receipt remains without a result and must be treated as ambiguous until provider readback.

`readWebsiteRequestState(env, submissionId)` is a server-side **read-only** helper that joins the immutable envelope and the deterministic per-effect receipt keys into a delivery summary. It neither retries work nor exposes a public endpoint. The raw envelope's initial `crm: pending` / empty `delivery` is not the current delivery status; inspect the joined view or individual receipt keys. KV visibility can lag, so a newly missing receipt is not proof of failure.

Each external call has a four-second AbortController timeout and rejects redirects. No provider response body or secret is logged. Up to four GHL calls, one Slack call and one Meta call run in the Worker's `waitUntil` window, after durable receipt. No automatic retry job or unprotected replay endpoint is added.

**Duplicate browser POSTs with the same submission ID return the original saved receipt without repeating any downstream effect**, including failed or ambiguous effects. Do not tell a dealer to resubmit to fix a downstream delivery problem. Retain the request and recover only the missing effect after authorized review.

KV is eventually consistent: read/write is **not** an atomic claim. Two simultaneous requests handled by different isolates may both see an absent ID. The deterministic Meta event ID supplies Meta's deduplication boundary; Slack/contact-note creation has no equivalent exactly-once guarantee. Before heavy traffic or if strict cross-isolate exactly-once behavior is required, use an atomic durable queue/claim (e.g. a Durable Object) as a separately reviewed change. The daily KV array index is best effort; use the request-key prefix as the authoritative recovery inventory.

### GHL

- Reuses the established `GHL_PRIVATE_INTEGRATION_TOKEN` (or existing supported alias), `GHL_LOCATION_ID`, version and custom-field map.
- Only duplicate-contact GET, new contact POST, additive tags POST and note POST are allowed.
- Unexpected duplicate-response shapes stop CRM writes and record `needs_review`.
- A matched contact is **not** updated: no field/source/owner overwrite, upsert, assignment, opportunity, lifecycle stage or workflow enrollment.
- A new contact uses source `AutoLander website project request`; attribution-only custom fields reuse the existing IDs. Project details and consent are kept in the request note rather than inventing field IDs.
- Tag: `website-request`.
- Additional `website-sms-ok` only when explicit consent was given and the contact was created for this request **or** its stored phone exactly matches the submitted phone.
- New contacts are not assigned by this route. Existing assignments remain untouched.
- Tag failures do not erase a successful contact creation or prevent the separately checkpointed request note.

### Slack: one writer

`WEBSITE_REQUEST_SLACK_WEBHOOK_URL` is a **Worker secret**, configured for the intended `#sales-floor` channel. It must never be in Vite variables, a public bundle, a committed `.env`, a PR body, screenshots or logs.

The allowlist accepts only an HTTPS `hooks.slack.com/services/T…/B…/<token>` incoming webhook, with no credentials, port, query, fragment or extra path segment. Redirects are rejected. All submitted values are escaped and rendered as `plain_text`, with automatic parsing and unfurls disabled. No channel/user mention is generated. The incoming webhook's installed channel is the destination; browser data cannot choose a channel or endpoint.

**Do not also add a GHL workflow Slack alert for `website-request`.** That would create a second writer and duplicate notifications. GHL remains the lead store; this Worker is the website-request Slack writer.

Reference checked during implementation: [Slack incoming webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) and [Slack text objects](https://docs.slack.dev/reference/block-kit/composition-objects/text-object/).

### Meta

- Event: `WebsiteRequest` only; never `Lead`, `AIScanRequest` or `PaidAdsApplication`.
- Uses existing `META_PIXEL_ID` / `META_CAPI_ACCESS_TOKEN`. Deployment review must confirm the intended existing dataset `2087440198847151`; do not create or substitute another dataset.
- Server-only conversion. No corresponding browser `trackCustom` event is added; a thank-you query/hash does not fire a conversion.
- Sends only for production origin on `autolander.ai` / `www.autolander.ai`, with `SEND_WORKER_WEBSITE_REQUEST_CAPI="true"`. Preview never emits the conversion.
- Original receipt time and deterministic submission-based event ID are retained. Event source URL is the clean canonical service page, without submitted query data.
- Contact matching values are hashed through the established helper; project goal / decision-maker role and sanitized attribution accompany the event. No commercial outcome is claimed by this request event.
- `META_TEST_EVENT_CODE` follows the established environment behavior; remove it after an authorized deployment test.

## Mike's deployment checklist — Worker first, page second

This PR does not execute these production steps.

1. Review and approve the page, form contract, privacy/consent wording, Worker changes and intended lead owner response process.
2. Inspect existing GHL Contact Created / tag / generic demo-onboarding triggers before enablement. Ensure website service contacts are excluded from software-demo onboarding and unrelated nurture. Account for the gap before the service tag is added: a contact-created trigger must also recognize/exclude the new service source or otherwise avoid immediate wrong-lane enrollment. This inspection is a release prerequisite, **not something established by local tests**.
3. Confirm existing `TRACKING` and `CHAT_RATE_LIMITS` bindings and GHL credentials/location. Keep production tokens out of previews and local test runs.
4. Install the server-only Slack secret using the approved incoming webhook tied to `#sales-floor`. Confirm that no GHL website Slack workflow is also enabled.
5. Confirm the existing Meta dataset and token. Decide with the owner when to enable `SEND_WORKER_WEBSITE_REQUEST_CAPI="true"`; it is disabled unless explicitly true.
6. Deploy the Worker while the route remains closed. `WEBSITE_REQUEST_PUBLIC_ROUTE` must be exactly `"on"` to accept requests; unset / off / any other value returns an unavailable error, without accepting a lead. The route additionally refuses missing KV, GHL or Slack configuration, and missing Meta credentials if CAPI is enabled.
7. After configuration / trigger review and explicit deployment approval, enable the website route. Run one owner-authorized labeled end-to-end test and independently read back: durable request, correct existing/new CRM behavior, correct tags/consent, one Slack message in the correct channel and one `WebsiteRequest` in the intended dataset when enabled. Do not use a real dealer as a test fixture.
8. Only after Worker readiness and test receipts, publish the frontend page/navigation. Check native POST and JS form, mobile errors, preserved attribution and opt-in box state.
9. Monitor stored delivery checkpoints during launch. Do not equate a 200/303 form receipt with CRM/Slack/Meta delivery completion.

Rollback: set `WEBSITE_REQUEST_PUBLIC_ROUTE="off"` first. Existing website request records remain available for review and no other service route is disabled. Hide/revert the new Services entry if the page should not be public. Never delete or resubmit received requests as a rollback action.

## Recovery and verification limits

Inspect the exact `website_request:req:<submissionId>` envelope together with its `website_request:delivery:<submissionId>:*` receipts (or use the read-only joined helper), provider readbacks and each delivery state before any recovery. `started` without a result / `uncertain` is **not** proof that an effect failed; look for the exact contact, note, request ID in Slack or deterministic Meta event before repeating it. A succeeded effect is never replayed. Manually repair only an authorized, verified missing effect and preserve the original request/event identity with a new recovery receipt; do not rewrite an original receipt. No automatic recovery command is shipped in this PR.

Focused local suite: `node --test test/dealer-websites-request.test.js test/paid-ads-request.test.js test/ai-scan-request.test.js`. It covers mocked intake, optional website validation, decision-maker routing, consent, CRM matching/no overwrite, provider failure and uncertain response states, immutable stage/result checkpoints under a same-key write-throttling KV fixture, replay suppression, no-JS receipts, rate-limit isolation, strict Slack targeting and server-only production conversion behavior. These checks are local evidence only, not proof of configured secrets, GHL workflow exclusions, Slack channel, live Meta delivery or deployment.

## PR verification receipt — 2026-10-19

- Production build passed. Scoped ESLint and `git diff --check` passed.
- 136 focused tests passed across the new service, existing AI/paid-ads forms, navigation, SEO metadata, route loading, prerender/hydration, CSS coverage and Worker response handling.
- Browser checked at 320, 390, 768 and 1440 pixel viewport widths: no horizontal overflow; mobile menu, keyboard example tabs, form validation, mocked failure/receipt, retained retry ID and no-JavaScript content/form action verified. The browser's form responses were mocked; no production submission was made.
- Full `npm test` is not green on the baseline checkout: three unrelated failures reproduce in the unchanged AEO guide/source-regex and blog-race fixtures. The AEO regex assumes LF on a CRLF Windows checkout. The blog-race targets are already published in base commit `9775e856896d696f78fd95bbb40b2308f9e94b14`, so their expected racing commits no longer occur. Those publishing fixtures/implementations were not changed for this service page.
- Dependency lockfile was not changed. No production secrets, GHL workflows, Slack configuration, Meta dataset configuration or deployment were modified.
