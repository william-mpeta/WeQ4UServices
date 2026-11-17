# WeQ4U Critical Review and Operational Readiness Assessment

## Executive conclusion

**WeQ4U is a functioning local prototype with tested request, assessment, quote, customer-decision, and simulated payment components. It is not yet a proven operational service platform and is not ready to be represented as production-ready to a transport authority.**

The strongest evidence is mixed:

- The current API suite passes **26/26 tests**, and API, storefront, and admin production builds pass.
- The automated API scenario creates a driver's-licence renewal request, prepares and publishes a quote, produces a PDF, records a customer decision, and uses a synthetic PayFast ITN to release the request to Work in Progress.
- A second synthetic new-driver-test scenario also reaches quote publication and a customer decision.
- **No tested scenario reaches service-specific completion and closure.** No real PayFast sandbox transaction, live authority submission, or repeatable browser-driven customer-to-staff journey has been demonstrated.
- The supplied live reference, `WQ-2026-0CFF0627125C547A3488`, has no published quote. Its assessment is not ready, and the request is correctly still in Quote Preparation.

The right description today is **“local functional prototype with selected API lifecycle coverage”**, not “fully working product” or “operationally validated service.”

## Scope and evidence

This review uses the current source, automated tests, the local running API, and a read-only check of the supplied reference. No customer record was changed and no new test request was created.

| Evidence | Result | What it establishes |
|---|---|---|
| `npm run test --workspace apps/api` | **PASS — 26/26** | Unit and isolated API behavior for pricing, workflow, request lifecycle, and PayFast validation. |
| `npm run build` | **PASS** | API syntax check and storefront/admin TypeScript + production builds. |
| Storefront browser check | **PARTIAL PASS** | Home and Track Request pages load; the supplied reference was looked up and rendered. |
| Staff browser check | **PARTIAL PASS** | Staff sign-in page loads. No authenticated staff UI journey was performed in the browser. |
| Live reference read | **FAIL at assessment readiness / BLOCKED at quote** | Current request state and exact quote blocker are described below. |
| Real PayFast transaction | **NOT TESTED** | Existing tests use a local validation stub and synthetic notifications, not PayFast sandbox servers. |
| Authority / dealership transaction | **NOT TESTED** | No live authority connection, submission, or partner/bulk transaction was exercised. |

`PASS` below means only that the named behavior was directly observed in source-backed tests or the local application. `PASS*` is an isolated API test using synthetic data; it is not proof of correct real-world documents or operational readiness. `BLOCKED` means a known prerequisite or missing configuration prevents the stage. `FAIL` is an observed mismatch or defect. `NOT TESTED` means this review did not execute that service-stage behavior. The older `Functional-Validation-Report.txt` records a 20-test run; it is historical evidence and should not be used as the current test count.

## Live quote investigation — reference WQ-2026-0CFF0627125C547A3488

### Observed state

| Check | Current observation |
|---|---|
| Service | New Driver’s Licence Test (`DL-NEW-TEST`) |
| Internal workflow | Quote Preparation |
| Customer tracking | “We’re reviewing your information”; the page shows the generic journey milestones but no quote card |
| Uploaded files | Copy of ID and Booking fee confirmation; both files have document review state Verified |
| Outstanding document requests | None |
| Assessment checklist | `id-copy=received`; `learner-licence=verified`; `booking-confirmation=verified` |
| Evidence associations | `id-copy` points to Copy of ID; `learner-licence` also points to Copy of ID; `booking-confirmation` points to Booking fee confirmation |
| Assessment readiness | `serviceAssessmentReady=false` |
| Quote readiness summary | `quoteReadiness.ready=true` |
| Draft / published quote | Draft is `editing`; no published quote exists |

### Root cause

The immediate blocker is **assessment readiness**, not a missing customer-tracking fetch:

1. The service definition requires separate ID, learner-licence, and booking-confirmation checklist items.
2. The current record has no uploaded learner-licence document. The learner-licence checklist entry is nevertheless marked verified using the Copy of ID file, while the ID checklist itself remains only received.
3. `serviceAssessmentReady()` requires every required checklist item to be verified (or a permitted, documented not-applicable state), all uploaded documents verified, requirements reviewed, eligibility confirmed, and government readiness confirmed.
4. Requirements-reviewed, eligibility, government-readiness, document-review, and outstanding-document checks currently pass. The `id-copy=received` checklist state is the remaining readiness blocker, so the assessment evaluates false. By the current endpoint guard, quote-draft preparation will return HTTP 409 until readiness passes; this review did not submit a quote-draft request against the customer record.
5. There is no published quote to display. The public response exposes quotes only after publication and a move to a quote-visible state. The tracking page is therefore not hiding an existing published quote in this case.

The current UI also uses a generic progress bar that includes “Your quote” before a quote exists. That visual milestone is not proof that a quote was generated; the detailed status and quote card are the authoritative indicators.

### Readiness indicator and evidence defects

- `quoteReadiness.ready` is **not** assessment readiness. For a provisional new-driver estimate it can be true when the service is allowed to use the provisional price path, even while `serviceAssessmentReady` is false. Presenting the former as an overall “ready to quote” signal is misleading.
- The API verifies that a linked evidence ID belongs to the request and is verified, but does not check that its label/type matches the requirement. It also permits a requirement to be marked verified without an evidence ID. This is evidenced by the current record and the synthetic test path that marks the learner-licence requirement verified without supplying learner-licence evidence.
- The intake label “Booking fee confirmation” and the definition label “Booking confirmation” are not demonstrably equivalent. The service owner should confirm whether proof of payment is sufficient or whether appointment confirmation is required.

These are material control issues: the present gate blocks this request because one checklist item remains received, but a staff member can potentially make the same assessment appear ready while the required proof is absent or misclassified.

### Reproduction and impact

1. Open the request in Staff Workspace and inspect the assessment checklist and linked evidence.
2. Observe that the learner-licence item is associated with Copy of ID, not a learner-licence file.
3. Refresh the assessment and confirm the server-side readiness remains false; this review did not save changes to the record.
4. The quote-draft API guard will reject preparation with HTTP 409 until the required assessment checks pass.
5. Track the reference as the customer; the tracker shows review status and no quote card.

**Impact:** the request cannot reach customer decision, payment, or fulfilment. Do not mark the case “quote generated” or use this reference as a successful demo. Obtain and verify the actual learner-licence evidence, correct the checklist association, and re-assess before attempting quote preparation. Do not weaken the gate to make the screen turn green.

## Deliverable 1 — service validation matrix

This matrix covers the requested service variants plus roadworthy assistance and the live reference. The categories are not equally implemented. An API test for a generic quote is not evidence that the underlying authority rules, documents, or service completion are correct.

| Service / scenario | Intake | Assessment | Evidence review | Quote draft / publish | Customer decision | Payment → work | Fulfilment | Completion / closure |
|---|---|---|---|---|---|---|---|---|
| Driver’s Licence Renewal | PASS* | PASS* | FAIL* | PASS* | PASS* | PASS* | NOT TESTED | NOT TESTED |
| Learner’s Licence Booking / Application | PASS* | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| New Driver’s Licence Test (synthetic API path) | PASS* | PASS* | FAIL* | PASS* | PASS* | NOT TESTED | BLOCKED | NOT TESTED |
| New Driver’s Licence Test (live reference above) | PASS | FAIL | FAIL | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Learner’s Licence Rewrite | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Driver’s Licence Replacement | PASS* | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Temporary Driver’s Licence | PASS* | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| PrDP Application | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| PrDP Renewal | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Card Collection Service | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Vehicle Registration | NOT TESTED | BLOCKED | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Change of Ownership | NOT TESTED | BLOCKED | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Duplicate Documents | NOT TESTED | BLOCKED | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Number Plate Services | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Traffic Register Number | NOT TESTED | BLOCKED | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Licence Disc Renewal / Vehicle Licensing Administration | NOT TESTED | BLOCKED | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Roadworthy Certificate Assistance | NOT TESTED | BLOCKED | NOT TESTED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

**Why some rows are PASS\*:** the isolated request-lifecycle test uses synthetic requests and documents. It exercises renewal quote generation, approval, publication, customer decisions, quote PDF output, and a stubbed payment callback. It also exercises new-driver-test intake, an estimate quote and a decline path. These tests establish that generic application code can execute those steps under test conditions; they do not prove the documents are substantively correct, that customers can complete the entire UI journey, or that a licensing authority accepts the result.

**Specific configuration findings:** eight service definitions currently exist. Learner application and new-driver test are provisional pilots; driver renewal and PrDP application use price-card profiles; learner rewrite, replacement, temporary licence, and PrDP renewal require business confirmation. The service-definition list has no dedicated definitions for the six vehicle offerings named in the project directive. Pricing seed rows exist for driver licences, PrDPs, licence discs, change of ownership, and traffic register, but a price row alone does not provide a service checklist or make the service quoteable. Card collection and number-plate services are not configured as distinct service definitions. Courier/delivery options are not equivalent to a card-collection service.

**Dealer / fleet / corporate journeys:** **NOT TESTED.** The current evidence does not establish a bulk intake API, fleet workflow, partner permissions, or a completed dealership transaction.

## Deliverable 2 — workflow state catalogue

The global workflow is implemented in [workflow.js](../../apps/api/src/workflow.js). These are generic request states; service-specific steps described in definitions are not currently the same thing as executable global workflow states.

| State | Expected next step / allowed progression | Gate or limitation |
|---|---|---|
| Submitted | Under Review, Awaiting Documents, On Hold, Cancelled | Awaiting Documents requires an explicit document request. |
| Under Review | Awaiting Documents, Quote Preparation, On Hold, Cancelled | Quote Preparation is offered only when the assessment is ready and no document requests remain. |
| Awaiting Documents | Under Review, On Hold, Cancelled | Return to review only after outstanding document requests are resolved. |
| Quote Preparation | Awaiting Customer Decision, On Hold, Cancelled | Quote is prepared as a draft, independently approved, then published. Publication routes the record to customer decision. |
| Quote Revision Required | Quote Preparation, On Hold, Cancelled | A revised quote must be prepared and approved; the previous quote is hidden during revision. |
| Awaiting Customer Decision | Quote Revision Required, On Hold, Cancelled; customer may accept, decline, or let the quote expire | Acceptance/decline is handled by the customer decision endpoint; expiry is detected when a customer acts on an expired quote. |
| Quote Accepted | Work in Progress, On Hold, Cancelled | Work in Progress is blocked until verified payment sets `paymentStatus=paid`. |
| Quote Declined | Terminal | The generic transition map provides no further transition. |
| Quote Expired | Under Review, Cancelled | Refresh/review is possible; no scheduled expiry job was observed. Expiry is detected on the customer decision request. |
| Work in Progress | Ready for Collection / Delivery, On Hold, Cancelled | Requires `fulfilmentValidated=true`. |
| Ready for Collection / Delivery | Completed, On Hold | Requires `completionConfirmed=true`. |
| Completed | Terminal | Closure is generic; no service-specific handover evidence is required by the global state alone. |
| On Hold | Previous state or Cancelled | Resume target comes from `previousStatus`. |
| Cancelled | Terminal | No further transitions. |

Legacy labels are mapped into the current set during normalization. No separate executable states were found for “appointment booked”, “test result recorded”, “authority submission”, “licence processing”, or “card collection”. Those strings can appear in a service definition’s workflow metadata, but the generic workflow engine cannot transition through them as separate states. This leaves an important gap between the service-specific process descriptions and the operational state machine.

The PayFast implementation has a verified-payment route in tests, but some staff/email copy still says payment is not available or not connected. That copy conflicts with the current sandbox integration and should be corrected before customer or staff demonstrations.

## Deliverable 3 — quote-generation investigation

### What works in the code and isolated tests

The quote lifecycle has distinct steps and guards:

1. Assessment must meet `serviceAssessmentReady()` and the service definition must be quoteable.
2. The quote-draft endpoint creates a numbered draft with pricing snapshot and expiry.
3. A different authorized reviewer must approve the draft.
4. Publication stores the quote, updates the request to Awaiting Customer Decision, and exposes the quote details/PDF to the customer.
5. The customer can accept or decline; a verified PayFast callback can mark the quote paid and release Work in Progress.

The API tests cover this path for selected synthetic driver-licence scenarios. The PDF endpoint is exercised in the API test. The payment test uses a local validation stub and a fabricated ITN, so it is a simulation, not external provider verification.

### Why the supplied request has no quote

The current reference is before draft creation: assessment readiness is false, quote draft state is only `editing`, and no published quote exists. The correct server-side behavior is to refuse quote preparation; the customer portal has no published snapshot to show. The `quoteReadiness.ready` value is not a substitute for the assessment gate.

### Impact

- The customer cannot view, accept, decline, download, or pay for a quote that does not exist.
- The request cannot progress through the quote/customer-decision/payment gates.
- A status message saying “saved” confirms a save operation, not that required evidence is correct or a quote was created.
- Because the API does not bind a verified checklist item to matching evidence, test success can be achieved with an invalid evidence association. This is a more serious control gap than quote rendering.

### Recommended remediation

1. **Fix evidence binding first.** For every required item marked verified, require an evidence ID; enforce approved document-type/label matching; prevent one unrelated file from satisfying a different requirement. Record reviewer and outcome in the audit history. Add tests for a missing learner licence, wrong evidence type, duplicate evidence use, and a valid matching upload.
2. **Use one source of truth for readiness messaging.** The admin UI should show assessment readiness separately from pricing/profile eligibility and must not label a request quote-ready until every server-side prerequisite passes.
3. **Prove one golden path with new synthetic data.** Use an actual driver-renewal scenario with correctly labelled documents; record request, assessment, quote snapshot, PDF, publication, customer decision, payment, work release, fulfilment validation, and completion. Capture each state and response without editing the supplied customer request.
4. **Only then expand service definitions.** Complete requirements, service rules, quote eligibility, and completion criteria before claiming vehicle or PrDP variants are operational.
5. **Verify PayFast externally.** Configure sandbox credentials and a publicly reachable callback, execute a real sandbox payment, and retain redacted evidence of the callback and resulting status. Do not treat the current ITN stub test as sandbox verification.

## Technical audit summary

| Area | Finding |
|---|---|
| Persistence / data layer | The API uses an encrypted local file store (`requests.enc`) and encrypted document files; integration tests verify plaintext is not present in the test files. This is evidence of local at-rest encryption, not a managed database, multi-instance deployment, backup/restore, or production data-integrity validation. |
| APIs | The quote, assessment, payment, and transition endpoints have explicit validation and tested HTTP errors. The evidence-association rules are incomplete: a verified requirement can have no evidence ID, and a linked verified file need not match the requirement type. |
| Workflow | Generic transition guards and history updates are tested. Service-specific workflow strings are not integrated into the global state machine. Completion is represented by staff-set boolean flags, not service-specific proof of authority outcome or handover. |
| Pricing | Current test suite validates active/draft profiles, required base components, quote snapshots, effective dates, and provisional estimate ranges. Several categories have no service definition; seeded pricing does not make them quoteable. |
| Quote output | Synthetic API tests prove a draft can be approved/published and a PDF returned. The supplied live request has no quote snapshot, and no quote PDF is available for it. |
| Customer portal | Home and Track Request pages load. The supplied reference shows an accurate review status and no quote card. The generic progress bar can imply a quote milestone before one is available. Full customer upload, decision, and payment UI actions were not browser-tested in this review. |
| Staff workspace | Sign-in page loads. The request’s admin state was read through the authorized local API, but the authenticated staff UI assessment/quote actions were not browser-tested. |
| External services | PayFast code and tests exist, but no real sandbox transaction was run. No transport authority, testing-centre, dealership, or fleet system integration was demonstrated. |

## Deliverable 4 — operational readiness scores

Scores are **indicative risk-weighted assessments**, not test coverage or certification. A high score would require repeated, independently observable operational journeys in a production-like environment.

| Category | Score | Evidence and rationale |
|---|---:|---|
| Functional readiness | **30%** | Request tracking and selected quote/customer-decision/payment paths work in isolated tests, but no service has been demonstrated through service-specific completion and closure; the live reference is blocked before quote creation. |
| Technical stability | **70%** | Current API tests and all workspace builds pass. Confidence is limited to the local setup; deployment, restore, production monitoring, concurrency, and live payment callback behavior were not validated. |
| Data integrity | **40%** | Local request/document encryption and history are tested, but the live request demonstrates an incorrect evidence-to-requirement association and the API permits verified requirements without linked evidence. |
| Customer experience | **45%** | Storefront and tracking pages render and the tracker correctly withholds an unpublished quote. The generic progress bar is ambiguous, and no complete authenticated staff/customer UI journey was tested. |
| Transport authority readiness | **10%** | No authority integration, accepted submission, compliance sign-off, service-specific rules across the requested catalogue, live operational pilot, or independently evidenced completed case. |

**Strict success criterion:** **0 of 16 distinct service variants** in the matrix has been proven in this review from customer submission through service-specific completion and closure without manual workaround or external assumptions. The API tests are valuable evidence of component behavior, but they do not meet that criterion.

## Recommended decision and sequence

**Do not present the platform as ready for live licensing-authority operations or claim that all services work.** A carefully labelled prototype demonstration is reasonable if it clearly distinguishes tested synthetic API behavior from live integrations and service readiness.

Recommended order:

1. Correct the evidence-to-requirement controls and misleading readiness indicator.
2. Re-assess the supplied request using the actual learner-licence evidence and a confirmed booking document; then verify whether a valid quote can be drafted. Preserve the existing request history.
3. Run a new, privacy-safe golden-path test through quote PDF, publication, customer decision, real sandbox payment, fulfilment, and closure.
4. Capture browser evidence from both customer and authenticated staff journeys and add regression coverage for every observed failure.
5. Add and approve missing definitions/rules for each vehicle and PrDP service before enabling quotes.
6. Separately validate deployment, backups, audit requirements, consent/privacy, partner controls, and authority acceptance before any ministerial or operational readiness claim.

## Source references

- [Service definitions](../../apps/api/src/serviceDefinitions.js)
- [Workflow states and readiness gates](../../apps/api/src/workflow.js)
- [Request, assessment, quote, and payment API](../../apps/api/src/index.js)
- [Pricing rules](../../apps/api/src/pricing.js)
- [Seed pricing profiles](../../apps/api/src/pricingSeedData.js)
- [Customer request and tracking UI](../../apps/storefront/src/RequestFlow.tsx)
- [API lifecycle regression tests](../../apps/api/test/requests.test.js)
- [Pricing tests](../../apps/api/test/pricing.test.js)
- [Workflow tests](../../apps/api/test/workflow.test.js)
- [PayFast validation tests](../../apps/api/test/payfast.test.js)
- [Prior functional validation report](<C:/Users/Admin/OneDrive/Documents/WeQ4UServices/DevOps-Progress2024/Admin-Console-Development2026/Functional-Validation-Report.txt>)
