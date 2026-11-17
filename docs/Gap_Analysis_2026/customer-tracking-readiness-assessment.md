# Customer Tracking Readiness Assessment

**Assessment type:** Readiness and gap analysis only — no application code changes  
**Project:** WeQ4UServices  
**Reference UI:** `Customer-Tracking.PNG` and `Customer-Tracking2.PNG` supplied by the owner  
**Audience:** Founder, GitHub Copilot and Cursor Agent (Grok 4.7)

## Executive summary

The core customer tracking experience already exists. It is not a blank-page build: the codebase has reference lookup, a five-step journey, a quote centre, customer tasks, document uploads, and a customer-visible timeline. Quote accept/decline/change and PDF download have API-backed behavior.

**Readiness estimate (code inspection only):**

- **Core capability coverage: approximately 80%.** Most major screenshot sections have an implementation and API data source.
- **Visual match and production readiness: not scored.** The current local page was not visually exercised in an authorized customer session during this assessment; component existence does not establish screenshot fidelity, accessibility, or end-to-end reliability.

The main gaps are not “build tracking from scratch.” They are comparison and polish, ensuring all status and event data is represented clearly, verifying privacy/access behavior and edge cases, and clarifying notification scope. No SMS/WhatsApp notification or general status-change notification pipeline was found. Payment is also not integrated.

## Screenshot targets

The references show:

1. A prominent reference lookup form with Track action.
2. A request summary with service, submission date, current status, next step and last update.
3. A compact five-stage progress indicator.
4. A quote card with quote reference, price, selected package, expiry, preview/download and accept/decline/change controls.
5. On the second image, customer actions/questions, a “Documents sent” list and a request timeline.

The storefront already renders corresponding sections. Compare the actual page at `localhost:3000` (not only the staff Admin at `localhost:3001`) with these images.

## Component reuse matrix

| Capability | Existing implementation | API/data behavior | Readiness |
|---|---|---|---|
| Reference lookup | [RequestFlow.tsx](../../apps/storefront/src/RequestFlow.tsx) — `lookup`, reference input, loading/error/notice UI | `GET /api/requests/:ref`; returns a minimal public status without private access | **Implemented**; verify invalid/unknown/slow response presentation and narrow screens |
| Customer access | Same tracking form and stored browser session value | Request creation uses an opaque reference access mode; private data and actions depend on `publicRequest` authorization | **Implemented; verify the intended security policy.** Confirm the high-entropy reference is intentionally treated as a bearer credential and customers are told to keep it private |
| Current status and next step | Summary fields and `requestJourney` / `journeyStageIndex` in [RequestFlow.tsx](../../apps/storefront/src/RequestFlow.tsx) | [workflow.js](../../apps/api/src/workflow.js) maps backend workflow states to customer-safe stage, label and message | **Implemented**; five customer stages intentionally summarize the richer staff workflow |
| Quote display and actions | Quote card in [RequestFlow.tsx](../../apps/storefront/src/RequestFlow.tsx) | Quote snapshot is returned only in eligible published/decision states; PDF, decision and change endpoints enforce quote identity/version | **Implemented**; visually compare card hierarchy, confirmation, expired/accepted states and long quote terms |
| Customer action centre | Task cards, response input and send action in [RequestFlow.tsx](../../apps/storefront/src/RequestFlow.tsx) | `customerTasks` saved on the request; response changes the task state and adds customer-visible history | **Implemented** for information/appointment/delivery actions; “review feedback” is not a separate feature/model |
| Requested/supporting document upload | Upload forms and received-document list in [RequestFlow.tsx](../../apps/storefront/src/RequestFlow.tsx) | Authorized by the request access credential (opaque reference for this request mode); allows PDF/JPG/PNG with size/count limits; stored encrypted; uploads update history/document-task state | **Implemented**; verify error, oversize, partial requested-upload, closed-request and mobile states |
| Timeline/activity | `timeline` display in [RequestFlow.tsx](../../apps/storefront/src/RequestFlow.tsx) | `publicRequest` filters history to customer-visible events; status changes, quote publication, document uploads and customer task responses append history | **Implemented** as a chronological event list; there is no separate typed TimelineEvent model |
| Notifications | API notification helpers in [index.js](../../apps/api/src/index.js) | Initial request email goes to configured staff recipients; task and quote email can go to customer via Resend; notification outcomes are recorded for tasks/quotes | **Partial**; no SMS, WhatsApp, push, live updates, or general customer email for every status change |
| Lifecycle and guardrails | [workflow.js](../../apps/api/src/workflow.js) and API integration tests | Explicit transitions, document/service checks, decision-once/version checks, payment/fulfilment gates, and completion checks | **Implemented**; must not be replaced with screenshot-only statuses |

## Readiness detail and gaps

### 1. Reference search

**Present:** Required reference field, submit button, in-flight state, clearing previous result, API call, role-appropriate public/private response, error alert, successful notice.

**Verify/polish:** Screenshot-level placement and dimensions; normalize harmless whitespace; test malformed and unknown references, retry after failure, duplicate submissions, and keyboard/screen-reader operation. Do not disclose whether a reference belongs to a particular person in error text.

### 2. Workflow and progress indicator

**Present:** Rich backend states map to the simple customer journey: Request received → We check the details → Your quote → We do the work → Ready or complete. Current status and next step are shown separately.

**Gap/decision:** The indicator compresses states by design, so quote decision, accepted/declined/expired, hold, delivery and completion can share a step. Confirm the screenshots are the intended compact abstraction; do not introduce new lifecycle states just to match labels. Check whether closed/cancelled/declined/expired requests need a clearly differentiated terminal message instead of the current progress strip treatment.

### 3. Quote flow

**Present:** Published quote snapshot, itemized total, package, issue/expiry metadata, PDF download, accept, decline with reason, request change, confirmation prompts and stale-version/duplicate-decision handling.

**Gap/decision:** Validate visual placement and all terminal states against screenshots. Quote acceptance is a recorded decision only; no payment is collected. Do not relabel it as payment or start fulfilment without verified payment integration.

### 4. Customer actions and documents

**Present:** Customer can answer open non-document tasks, upload requested documents, send supporting documents, and see uploaded document names/timestamps/review state. Uploads are restricted by file type, 8 MB per file and 10 total documents.

**Gap/decision:** The screenshot calls the section “Actions for you”; current UI is close but confirm copy, task ordering, due-date presentation, completed/answered appearance, upload progress and recovery on failed uploads. No customer-facing feedback/review rating feature was found; do not interpret a task reply as a public review.

### 5. Timeline

**Present:** Timeline reads customer-visible request history, including initial submission, status transitions, quote publication, document uploads and task responses. Internal-only quote views are filtered out.

**Gap/decision:** It is an event list but not an explicitly typed timeline model. Confirm copy/order/time formatting and duplicate status entries. Submission and creation currently share the initial timestamp/event; there is no independent submission event. Ensure errors do not leave a stale tracker result visible as though it were the latest status.

### 6. Notifications

**Present:** Email integrations are optional and depend on Resend configuration. Customer email is attempted for a published quote and for customer actions/tasks; staff recipients are notified of a new request.

**Missing/limited:** No SMS/WhatsApp/push notification system was found. Routine status changes and document-upload acknowledgement are not a general outbound customer-notification service. The UI can update after a customer action or refresh, but no real-time channel was identified. Treat proactive notifications as a separate scoped feature requiring provider, consent, template and delivery-failure decisions.

### 7. Data model

**Present:** Encrypted request records contain workflow state/history, quote and quote history/draft, customer tasks, requested documents, uploaded-document metadata, and customer update text.

**Missing/not currently separate entities:** Customer profile entity, dedicated QuoteEvent model/table, typed TimelineEvent model/table, messaging inbox/thread, and notification-delivery event log are not present as standalone persisted models. Existing embedded request records provide the current functionality; database/schema redesign is not required just to reproduce the screenshot.

## Development estimate

Estimates are for one engineer familiar with the codebase, not contractual delivery dates. They assume the existing API and workflow stay in place and the owner can supply authorized demo access and confirm screenshot priorities.

| Work package | Estimate | Notes |
|---|---:|---|
| Run and compare the tracker at desktop/mobile; record visual gaps | 0.5–1 day | Requires browser access to the actual post-change page and representative demo requests |
| Visual polish and accessibility of existing tracker sections | 0.5–1.5 days | Responsive layout, focus/labels, empty/error/loading/terminal states; no new backend model expected |
| Validate/fix data binding and lifecycle edge cases | 0.5–1.5 days | Only if comparison or tests reveal gaps; tests for stage, decisions, tasks, documents and timeline |
| General customer status notifications (email) | 1–2 days | Scope templates, triggering rules, idempotency, failures and consent before implementation |
| Add SMS/WhatsApp or real-time updates | 2–5+ days | Provider and business decisions, credentials, delivery monitoring and operational testing required |

**Likely near-term effort:** about **1–3 days** for screenshot comparison, targeted UI polish and regression verification if no substantial mismatch is found. Notification expansion is separate and could add several days; do not include it in “screenshot matching” by default.

## Recommended build sequence

1. **Baseline and evidence:** start the apps, sign in through an authorized local demo account, load a request with a published quote and tasks/documents, capture desktop/mobile screenshots, and compare them section by section.
2. **State matrix:** verify Submitted, Under Review, Awaiting Documents, Quote Preparation, quote available, accepted, declined, expired, revision, work, delivery, completed, cancelled and on-hold customer displays. Keep internal routing labels out of the public UI.
3. **Targeted visual polish:** adjust only the mismatched tracker page sections and responsive behavior; retain existing API data shapes unless evidence demonstrates a contract defect.
4. **Customer actions:** test valid/invalid task responses, requested and supporting uploads, errors, count/size boundaries, and resulting customer-visible timeline events.
5. **Quote interactions:** test preview/PDF, accept once, decline reasons, change request and expired/stale versions. Confirm quotes remain private until publication.
6. **Notifications:** document current versus desired delivery first; implement only after channels, consent, message templates and failure handling are agreed.
7. **Regression and handoff:** run API tests, build and lint; manually verify the browser at desktop/mobile and update the implementation summary.

## Validation evidence and limitations

- Code inspection completed for the storefront tracker, API public representation/routes, workflow mappings, notification helpers and integration tests.
- API integration coverage exercises lookup privacy, quote publication and decisions, document uploads, customer tasks and workflow transitions.
- The previous Codex handover records passing `npm test --workspace apps/api`, `npm run build`, and `npm run lint` before this assessment. Those checks were not rerun for this read-only report.
- **No code was changed. No browser interaction or screenshot pixel comparison was performed in this assessment.** Consequently, the 80% figure is a rough feature-coverage estimate, not a measured UI or quality score.

## Useful project references

- [Customer tracking component](../../apps/storefront/src/RequestFlow.tsx)
- [Customer tracking styles](../../apps/storefront/src/styles.css)
- [Workflow mapping and transition rules](../../apps/api/src/workflow.js)
- [API request, quote, task, document and notification routes](../../apps/api/src/index.js)
- [API lifecycle integration tests](../../apps/api/test/requests.test.js)
- [Pricing and quote lifecycle handover](./codex-pricing-engine-handover.md)
- [Cursor Agent pricing workspace handover](./cursor-agent-pricing-workspace-handover.md)
