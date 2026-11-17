# WeQ4U Service Journey and Manual Test Specification

**Purpose:** Define the expected customer-to-staff-to-customer workflow for every service category and subtype, before starting the next round of functional testing.

**Audience:** Project owner, operations staff, finance/quote approvers, QA, and demonstration team.

**Current local application URLs**

- Customer website: `http://localhost:3000`
- Staff workspace: `http://localhost:3001`
- API health: `http://localhost:4000/api/health`

Use the isolated test environment for QA whenever possible. Do not create test requests in a production store or alter existing customer records.

## 1. What this document does—and does not—claim

This is the **expected workflow and test contract**, not a claim that every service is currently operationally approved or that all stages have passed. The current quote implementation supersedes older case-specific quote guidance in this document:

- Customer quote issuance requires a registry variant explicitly enabled for quotes and a matching active pricing profile. Driver’s Licence renewal is currently the only enabled variant; it remains provisional and requires operational sign-off before commercial use.
- All other variants, including services with missing or unapproved scope, checklists, or pricing, must remain blocked from customer quote issuance and use the internal registry-review output instead. Case-specific pricing is disabled.
- Registry checklists marked draft or provisional are not approved legal requirements. Operations must confirm service scope, documents, fees, and customer wording before launch.
- A customer accepting a quote moves the case to `Quote Accepted`; this is **not** payment confirmation and must not trigger service work.
- Payment-to-fulfilment, service execution, delivery, and closure still require separate evidence.
- The screenshots captured to date are synthetic UI evidence, not proof of real document validation, government processing, or commercial pricing.

The current evidence report is `C:\Users\Admin\OneDrive\Documents\WeQ4UServices\DevOps-Progress2024\Admin-Console-Development2026\Enhancements-Matrix\E2E-Test-Evidence-2026-11-13\E2E-Service-Evidence-Report-2026-11-13.md`. Its location is outside this repository; if it is unavailable on another machine, use the evidence folder under `Enhancements-Matrix`.

## 2. Definition of a passing end-to-end quote journey

Each tested service variant must use its **own customer request reference**. For the decision branch, use two references per variant: one to accept and one to decline. A single quote cannot prove both outcomes because a recorded decision is final for that quote version.

### Customer-to-staff-to-customer journey

1. **Find and choose the service**
   - Customer opens Services or Contact, chooses the exact service category and subtype, and sees the correct service-specific questions.
   - If the customer chooses “Other / not sure,” the request must route to staff clarification, not to an invented checklist or automatic quote.
   - Optional courier collection/delivery may be recorded as an add-on and included only when the team confirms availability and fee. Door-to-door courier is also selectable as a standalone enquiry; it still needs case scope, confirmed fees, and a quote before service is agreed.
2. **Submit the request**
   - Customer enters contact and service-specific details, uploads any files they already have, reviews the summary, gives consent, and submits.
   - The system returns a unique reference. The staff work queue must show the same reference, service, subtype, scope, uploaded file labels, and submission time.
   - Submission means “request received,” not “documents verified,” “eligible,” “booked,” or “quote approved.”
3. **Assess and resolve missing information (staff)**
   - Staff opens the reference in Work Queue, confirms service scope, checks the applicable **business-approved** definition/checklist, and requests missing information through the customer task/document flow.
   - When a definition, approval, or price is missing for the exact subtype, route to clarification and internal registry review. Do not prepare a customer quote or treat unsourced/ad-hoc requirements as approved authority rules.
4. **Verify documents and readiness (staff)**
   - Review each uploaded file against the correct checklist item, set its review outcome, link evidence to the corresponding requirement, and record a case note for exceptions.
   - Mark requirements reviewed, record eligibility, and record government-process readiness only when the authorized staff member has sufficient evidence.
   - Save the assessment. Quote preparation must remain blocked if required items are unresolved, documents are not verified, customer tasks/documents remain outstanding, eligibility is not confirmed, or government readiness is not confirmed.
5. **Prepare the quote (staff)**
   - Move the request through `Submitted` → `Under Review` → (if needed `Awaiting Documents`) → `Quote Preparation`.
   - Confirm the exact service/subtype is explicitly quote-enabled in the registry and has a matching active pricing profile/effective version. Otherwise keep customer quote preparation blocked and generate an internal registry review.
   - Prepare an eligible quote draft with itemized amounts, pricing source, currency, expiry date, inclusions, exclusions, customer-facing notes, and any remaining customer obligations. A provisional quote must retain its provisional status and is not an authority determination.
6. **Independent approval and publication (staff)**
   - A different authorized approver approves the draft; the preparer cannot self-approve.
   - Publish/send the approved fixed quote snapshot. Confirm the request is in `Awaiting Customer Decision` and the customer portal displays that same quote version and amount.
   - Notification delivery is useful but does not replace checking the portal.
7. **Preview, PDF, accept/decline (customer)**
   - Tracking by the private request access/reference displays the service, quote number/version, itemized total, expiry, conditions, and document obligations.
   - `Preview quote` opens a readable quote preview; `Download PDF` returns the same published quote snapshot.
   - **Accept branch:** customer confirms acceptance; the decision and quote version are persisted and staff sees the request in `Quote Accepted` / `Payment Setup Required`.
   - **Decline branch:** customer chooses a reason (and supplies details for “Other”); the decision is persisted and staff sees `Quote Declined`. No payment or service work is started.
8. **Payment, processing, delivery, and closure**
   - For an accepted quote, collect payment through the configured provider and release work only on a verified successful payment callback matching the accepted quote and amount.
   - Staff then moves `Quote Accepted` → `Work in Progress` only after payment state is `paid`.
   - Record the service-specific operational result, checks, customer updates, and fulfilment evidence. Set `Ready for Collection / Delivery` only after quality/handover checks; set `Completed` only after customer handover/closure checks.

### Expected shared backend states and controls

| Stage | Expected request state | Essential persisted evidence / gate |
|---|---|---|
| Customer submission | `Submitted` | Reference, exact service/subtype/details, consent, uploaded document metadata |
| Staff review | `Under Review` | Correct service definition and checklist selected |
| Missing items | `Awaiting Documents` | Explicit outstanding list/customer task; no quote until resolved |
| Assessment saved | `Under Review` | Requirements reviewed; evidence and reviews linked; eligibility and authority readiness recorded |
| Quote preparation | `Quote Preparation` | Readiness passes; exact registry variant is quote-enabled and has an active matching profile; otherwise customer quote preparation remains blocked |
| Quote review | `Quote Preparation` | Independent approver, approval identity/time |
| Quote published | `Awaiting Customer Decision` | Immutable quote snapshot/version and timestamp visible in customer tracking |
| Customer accepts | `Quote Accepted` | Decision, timestamp, quote version; payment remains pending/not-configured until verified |
| Customer declines | `Quote Declined` | Decision, timestamp, version, decline reason; no payment/fulfilment |
| Verified payment | `Work in Progress` | Verified provider notification, matching reference/amount, transaction ID; duplicate notification is idempotent |
| Service ready | `Ready for Collection / Delivery` | Service-specific completion/quality checklist and handover arrangement |
| Closed | `Completed` | Completion confirmed and open customer tasks resolved |

These are the application workflow states in the current implementation. The actual government process, required evidence, legal timeframes, and fees must be confirmed by the business and relevant authority; the application must not invent them.

## 3. Service catalogue scenario definitions

For **every exact subtype below**, test the shared journey above. Customer quote publication is allowed only for a registry variant explicitly enabled for quotes with an active matching price profile. All other cases must remain blocked and use internal registry review. Do not use synthetic amounts as operational/customer offers.

### A. Driver’s Licences

Customer selects **Driver’s Licences**, then one of the displayed subtypes:

1. **Learner licence test**
   - Capture applicant/request details and booking preference.
   - Staff confirms the approved checklist and confirms the test/booking scope.
   - The registry entry is provisional and has no current customer-quote authorization or active matching price profile. Customer quote issuance remains blocked pending approval.
   - The registry checklist is provisional, not an approved operating checklist; reconcile it with operations and authority guidance before launch.
2. **Learner’s Licence Rewrite**
   - Treat as a separate quoteable subtype only after the business approves its eligibility, expiry/rewrite rules, evidence checklist, fees, and completion result.
   - Current definition is draft with no approved requirements or matching price profile. Keep customer quote issuance blocked and route to internal registry review.
3. **New driver licence test**
   - Capture preferred test date/centre and review the learner licence and booking details.
   - Current definition and checklist are not approved for customer quoting. Keep quote issuance blocked pending operations approval and an active matching profile.
   - On completion, record test outcome and any agreed licence processing/handover.
4. **Existing driver / renewal**
   - Confirm renewal service scope and check identity, current licence, and proof-of-residence items against the approved process.
   - Current definition uses a driver-licences price profile and has a checklist for Copy of ID, Current licence, and Proof of residence. Confirm the profile is active/effective for the selected subtype.
   - Completion records submission outcome and licence collection/handover.
5. **Replacement**
   - Establish reason and exact replacement path; collect only requirements the business/authority confirms.
   - Current definition has no approved checklist or quote-enabled pricing profile. Keep customer quote issuance blocked and use internal registry review.
6. **Temporary licence**
   - Confirm reason, applicable temporary-document process, eligibility, and timing with the approved operating process.
   - Current definition has no approved checklist or quote-enabled pricing profile. Keep customer quote issuance blocked and use internal registry review.
7. **Other / not sure**
   - Submit as a clarification/enquiry, create a staff follow-up task, then reclassify only after customer confirmation. Do not issue a quote against an unspecified subtype.

### B. PrDPs (Professional Driving Permits)

Customer selects **PrDPs**:

1. **New PrDP**
   - Capture preferred appointment/test-centre details; staff confirms class, appointment, current medical/eye-test/fingerprint requirements, authority fees, and what WeQ4U will handle.
   - Current definition uses the PrDP pricing profile and lists Copy of ID and Medical certificate. The request-form copy itself says staff will confirm medical, eye-test, fingerprint, and fee requirements; the approved business/authority checklist must control.
   - Quote must separate configured service costs from authority/medical/appointment costs where appropriate and clearly state what is included.
   - Completion records authority outcome and customer handover.
2. **PrDP renewal**
   - Confirm renewal eligibility and current permit details, then use an approved renewal checklist and renewal-specific price.
   - Current definition is `needs-business-confirmation`, has no requirements/pricing, and the New PrDP profile does not cover this subtype. Expected result: explicit blocker until approved.
3. **Other / not sure**
   - Route to staff clarification; no quote until the exact PrDP pathway is known.

### C. Roadworthy Certificates

Customer selects **Roadworthy Certificates**:

1. **Book a roadworthy test**
   - Capture vehicle registration if available, customer location, and appointment preference.
   - Staff confirms the test-centre booking, the vehicle handoff/attendance requirements, all applicable test-centre charges, WeQ4U service scope, and quote validity before publication.
   - Record booking outcome and test result. A test booking is not a certificate pass.
2. **Roadworthy for a sale or transfer**
   - Capture the related sale/transfer reference or context and confirm if a roadworthy certificate is already available.
   - Quote the agreed roadworthy booking/coordination scope and any separately confirmed third-party fee. If linked to ownership/registration, ensure that related service is explicitly included in scope and price; do not assume one quote includes multiple services.
3. **Other / not sure**
   - Clarify vehicle and purpose before quote.

Current code exposes the category and customer guide, but Roadworthy is not quote-enabled and has no active matching profile. Customer quote issuance remains blocked; use internal registry review. Neither a test booking nor a roadworthy certificate is proven by quote UI. Require business/authority scope, provider/fee sources, customer-journey test evidence, and operational sign-off before demonstration claims.

### D. New Vehicle Owner Help

Customer selects **Just bought a vehicle** and supplies:

- Purchase type: dealership, private sale, bank/auction, or unsure.
- Finance stage, selected work items, optional dealership and referral code.
- Selected work: ownership papers, registration, licence disc/licensing, roadworthy help, final document handover, or guidance.

Staff must confirm each requested work item and its document checklist before pricing. Quote must enumerate every included work item and associated known/third-party costs; do not silently bundle or omit a selected item. If the customer selected “not sure,” open a clarification task. Current workflow creates an onboarding request, not separate configured quote definitions for each included service; the latest test found no requirements and an inactive profile. Block quote preparation until scope-to-pricing and per-item completion rules are approved.

### E. Licence Disc Renewals

Customer selects **Licence Disc Renewals**, then own vehicle, business/fleet vehicle, or other/unsure. Capture the information needed to identify the vehicle through approved, privacy-conscious fields and request relevant documentation only after confirmation. Staff checks disc status and confirms fees and service scope. Current customer guidance says existing disc may be attached if available; current configuration in the tested run did not resolve a quote-ready service definition. Approve an exact checklist, business/fleet handling rules, and active profile before quote testing.

### F. Vehicle Registrations

Customer selects **Vehicle Registrations**, then:

- New registration.
- Registration from bank finance.
- Registration from dealership.
- Other/unsure.

Customer form currently displays conditional documentation guidance covering owner identity/address, purchase papers, bank settlement/proxy material, dealership proxy/BRN/NCO material, buyer details, and roadworthy material. These are working-form guides, not authority-approved rules. Staff must select and validate the **correct conditional subset** for the selected case, avoid requesting irrelevant bank/dealer evidence, and resolve exceptions with the customer. Current isolated run found no quote-ready service definition and a draft/inactive pricing profile. No quote until approved conditional requirements and active pricing exist.

### G. Change of Ownership

Customer selects **Change of Ownership**, then bank-financed transfer, dealership sale, private sale, or unsure.

- Use the matching bank/dealer/private-sale checklist, not one universal checklist.
- Current UI guide lists bank settlement/proxy material for bank cases; dealer proxy, BRN and stamped NCO material for dealer cases; buyer identity/address and roadworthy evidence where the approved workflow requires it.
- The form currently returns no service-specific required document list for private sale, so staff must clarify an approved private-sale checklist rather than infer one.
- Quote all defined service and confirmed third-party charges and state whether registration, roadworthy, licence-disc, collection, or courier work is included or separate.

Change of Ownership is not quote-enabled. Customer quote issuance remains blocked; use internal registry review until scope, requirements, and pricing are approved.

### H. Duplicate Documents

Customer selects **Duplicate Documents**, then lost/stolen, damaged, or other/unsure. Capture which vehicle document is missing and, for lost/stolen cases, request the authority-approved affidavit information. Current UI guide asks for certified owner ID and an affidavit on lost/stolen cases; non-lost/stolen guide currently only returns the owner ID item. Business/authority must confirm each branch and required document before this is used operationally. Current tested data did not resolve a quote-ready definition/profile; configure it before quote testing.

### I. Traffic Register

Customer selects **Traffic Register**, then application or other/unsure. Staff confirms why the number is needed, the applicant/vehicle context, the applicable checklist, and authority charges. The service is not quote-enabled; customer quote issuance remains blocked until requirements and pricing are approved. Do not infer identity or authority evidence requirements.

### J. Courier collection and delivery

Courier is available as both an **optional add-on** on another request and a **standalone enquiry**: collect documents from the customer, deliver completed documents, or both.

- Staff confirms address/area, parcel contents, availability, custody/handling, timing, and fee.
- Add the confirmed fee and service conditions to the parent service quote only when the parent service and courier are both operationally supported.
- Test both add-ons independently and together; verify the quote itemization and customer tracking summary.
- The standalone `door-to-door-courier` route must be tested from customer selection through staff assessment and sourced quote to customer preview and decision.

## 4. Current service readiness matrix

This matrix reflects the current registry and quote gates. **API integration tests cover quote blocking for unapproved variants and the eligible Driver’s Licence renewal flow with synthetic data; they do not prove commercial approval, visual customer/staff UI readiness, payment, fulfilment, or completion.**

| Category / subtype | Customer submits? | Definition/pricing known from current evidence | Next test disposition |
|---|---|---|---|
| Learner Licence Test | Yes | Provisional registry entry; not quote-enabled | Customer quote blocked; confirm requirements and activate matching profile before launch |
| Learner’s Licence Rewrite | Yes | Draft; no approved checklist/profile | Customer quote blocked; internal registry review required |
| New Driver’s Licence Test | Yes | Draft; not quote-enabled | Customer quote blocked; internal registry review required |
| Driver’s Licence Renewal | Yes | Provisional variant with active matching profile; only currently quote-enabled variant | Synthetic quote/decision tests pass; obtain operational sign-off before commercial use |
| Driver’s Licence Replacement | Yes | Draft; no approved checklist/profile | Customer quote blocked; internal registry review required |
| Temporary Driver’s Licence | Yes | Draft; no approved checklist/profile | Customer quote blocked; internal registry review required |
| New PrDP | Yes | Draft; not quote-enabled | Customer quote blocked; internal registry review required |
| PrDP Renewal | Yes | Draft; no approved checklist/profile | Customer quote blocked; internal registry review required |
| Roadworthy test booking / sale-transfer | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |
| Licence Disc Renewal | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |
| Vehicle Registration variants | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |
| Change of Ownership variants | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |
| Duplicate Documents variants | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |
| Traffic Register application | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |
| New Vehicle Owner Help | Yes | Not registered as a quoteable service | Customer quote blocked; map scope and use internal review |
| Courier standalone / add-on | Yes | Draft; no active quote profile | Customer quote blocked; internal registry review required |

If service/pricing setup changes, refresh this matrix from the live approved configuration before testing. Do not treat `starting from` display text as an approved fixed quote.

## 5. Manual test procedure and acceptance checks

### Before testing

1. Confirm this is a non-production environment with a separate store.
2. Ensure no real customer names, phone numbers, addresses, identity numbers, or documents are used in synthetic cases.
3. Confirm approved service definition version, document requirements, eligibility criteria, pricing profile/version/effective date, quote expiry policy, and staff roles for each subtype.
4. Prepare two references per subtype where both acceptance and decline will be tested. For the priority four, test every separately selectable subtype—not just each parent category.
5. Record browser, environment URLs, staff role, service definition version, pricing profile version, reference, and timestamp.

### Customer intake and tracking

For each exact subtype:

1. Start on the customer site and navigate via the visible Services/Request UI.
2. Capture screenshots of the selected service/subtype and questions, conditional document list, and final review.
3. Submit the request and record the reference shown by the confirmation.
4. Open Track Request and verify the submitted status, service name, reference, and initial timeline.
5. Upload files only when using approved synthetic fixtures or authorized test documents. Confirm labels appear correctly; do not infer that upload means verified.

**Pass:** expected exact subtype is selectable, questions/document guide match the approved definition, the same request reference is present in staff queue and customer tracking, and the record is not prematurely marked quoted or eligible.

### Staff assessment and quote

For each reference:

1. Sign in to Staff Workspace with a test staff account; do not place staff tokens in reports or screenshots.
2. Locate the exact reference in Work Queue. Confirm customer service details, subtype, uploaded labels, and work scope.
3. Move to `Under Review`; request missing evidence using `Awaiting Documents` and a customer action when applicable.
4. For each file, use the approved checklist; link each requirement to correct evidence; record review outcomes and notes.
5. Save a complete assessment only after requirement review, eligibility, and government readiness have a defensible basis.
6. Verify quote preparation stays unavailable for unresolved evidence, pending customer tasks, incomplete assessments, or variants not explicitly enabled by the registry. For a blocked variant, download the internal registry review rather than drafting a customer offer.
7. For the eligible catalog-priced variant, review the exact profile/version, record the pricing source, include validity/notes/inclusions/exclusions, and require a second authorized reviewer.
8. Save the draft; have a second authorized role approve; publish/send to customer.

**Pass:** failed readiness stays blocked with an actionable explanation. A passing request has persisted assessment and quote records, distinct preparer/approver identities, matching service/subtype, traceable pricing source (or approved profile/version), unique quote number/version, expiry, conditions, and history events.

### Customer quote, preview, decision

1. Open Track Request using the test request's approved private-access method.
2. Verify status is `Your quote is ready` / `Awaiting Customer Decision`; quote details equal the staff-approved fixed snapshot.
3. Open `Preview quote`; inspect readability, service/subtype, itemized amounts, total/currency, expiry, conditions, and remaining obligations.
4. Download the quote PDF; verify the PDF has the same quote number/version/total and is not a draft.
5. In acceptance-reference, accept and confirm. Refresh Tracking and verify acceptance, timestamp/version, and staff queue update to `Quote Accepted` / payment required.
6. In decline-reference, decline with a reason; if “Other,” supply a short reason. Refresh and verify `Quote Declined`, decision details, and no payment option/work start.
7. Re-submit stale or repeated decisions only as negative tests in isolated data; verify the system rejects duplicate/stale actions without changing the saved decision.

**Pass:** both branches are persisted and visible to customer and staff; no staff-only draft is exposed, and the displayed quote/PDF is the exact approved quote.

### Payment and fulfilment

Acceptance is not a pass for the entire operational journey. To claim full end-to-end:

1. Verify sandbox checkout redirects only for an accepted, published quote.
2. Receive and verify a valid sandbox provider callback; verify reference, merchant, amount, signature/provider verification, transaction identifier, and duplicate handling.
3. Confirm payment `paid` is persisted once and only then the request enters `Work in Progress`.
4. Perform the service-specific operation using authorized processes and test data; record appointment/test/authority result and progress.
5. Verify staff cannot set `Ready for Collection / Delivery` without service-specific quality checks.
6. Record delivery/collection and verify customer-visible timeline.
7. Verify staff cannot mark `Completed` without customer handover/closure confirmation and resolved customer tasks.

Do not execute live payment, contact an authority, or represent a synthetic callback as a real sandbox transaction without separate credentials, public callback, and evidence.

## 6. Required visual evidence (“four views”)

For the Ministerial/departmental demonstration pack, capture the same reference at four aligned views. This specification interprets “4D visual proof” as **four distinct evidence views across the journey**, not as a claim of 3D/4D rendering:

1. **Customer intake:** chosen service/subtype, relevant form/document guide, review, and successful submission/reference.
2. **Staff processing:** matching queue record and assessment, including verified requirement-to-evidence links and readiness outcome.
3. **Customer quote:** published quote card and preview, with quote reference/version, itemized amount, expiry, and customer actions.
4. **Outcome/state consistency:** customer acceptance or decline confirmation paired with the staff queue/timeline state. For acceptance, show the payment gate; show fulfilment only after a genuine verified test payment and actual authorized service processing.

For each view, preserve a clear screenshot filename including service slug, reference suffix, and stage, for example `DL-Renewal-WQ1234-03-customer-quote.png`. Capture screenshots from the actual application at the relevant UI state; do not create mockups or alter screenshots to imply a passed workflow.

## 7. Priority demonstration sequence

The priority ask is **Learners, Driver’s Licence, PrDP, Roadworthy**. The first demonstration set should cover:

- Learner Licence Test and (after configuration) Learner Licence Rewrite.
- New Driver’s Licence Test, Driver’s Licence Renewal, Replacement, and Temporary Licence.
- New PrDP and (after configuration) PrDP Renewal.
- Roadworthy test booking and sale/transfer roadworthy.

For each row, do not advance to quote generation until its service-specific checklist and commercial terms are approved. At least one real approved case must complete the quote-preview/accept-or-decline experience in both customer and staff UI. Full operational sign-off additionally requires verified payment and service completion; quote UI screenshots alone cannot prove that.

## 8. Go/no-go criteria

### GO for a limited quote-workflow demonstration only when

- Every demonstrated subtype is correctly selectable and matched to a versioned approved definition.
- The exact registry variant is explicitly quote-enabled and has an active matching profile; provisional status and exclusions are clearly presented.
- All assessments use approved document rules and actual valid test evidence.
- The customer portal preview, PDF, accept and decline paths are verified against persisted backend state.
- Screenshots cover all four views for each demonstrated subtype and reference data is synthetic or explicitly authorized.

### NO-GO for a “full working system” or operational readiness claim when

- A subtype is absent from the UI or routes to a different profile.
- Its checklist/pricing/eligibility/completion procedure is still provisional, missing, or awaiting business confirmation.
- Quote is only a preview/draft and has not been separately approved and published.
- Customer decision is only UI state and has not persisted to backend/staff queue.
- Payment is not genuinely verified, or work begins before verified payment.
- Fulfilment, customer handover, and closure have not been performed and evidenced.

**Current assessment:** the work performed so far is not an all-services pass and does not qualify as Ministerial operational-readiness evidence. Use the next test cycle to close configuration gaps first, then execute this specification and report PASS / FAIL / BLOCKED / NOT TESTED per exact subtype.
