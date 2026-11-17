# Customer Service Journey Inventory

**Purpose:** Record the customer journey for every primary service currently rendered in the WeQ4U storefront and identify which steps are actually supported, provisional, missing, or awaiting business approval.

**Assessment date:** 11 November 2026  
**Scope:** Current individual-customer storefront choices in `apps/storefront/src/site-data.ts`, their intake/checklist behavior in `apps/storefront/src/RequestFlow.tsx`, current pricing data, service definitions, and the shared request/quote lifecycle. This report does not treat draft website checklists as legal or authority-approved requirements.

## Executive summary

The storefront currently renders **9 primary request choices**. Courier collection and delivery are optional add-ons, not primary service types.

- Request submission, consent, optional document upload, reference creation, customer tracking, staff queues, document review fields, service assessment, readiness gates, quote draft/approval/publication, and customer quote decisions exist in the application.
- The service-definition catalogue currently contains driver-licence and PrDP subtype entries only. Of those, learner/new-driver entries are explicitly provisional pilot configurations; several other subtype entries are placeholders needing business confirmation.
- The remaining storefront categories use hard-coded UI guides and some conditional checklist logic rather than a unified service definition. Their requirements, verification rules, workflow variants, pricing and completion criteria are not all configured centrally.
- A service can be selectable and accept an enquiry without having quote-ready pricing. Missing or unmatched service configuration must remain a staff-visible blocker, not be covered by an assumed price or checklist.
- A request’s actual quote card is only available to the customer after publication. An internal draft or approved-but-unpublished quote is private.

## Common journey for current services

1. Customer chooses one primary service; optional collection/delivery can be selected separately.
2. Customer answers the relevant service question(s) and may attach available files. The storefront permits enquiry submission when required working-checklist files are absent, after a warning/confirmation.
3. API stores the request and private files, creates a reference and shows a customer-safe received/review stage.
4. Staff reviews the request, asks for missing items or clarifications, and reviews each uploaded file. File upload means **received**, not verified.
5. Staff records the applicable service assessment, eligibility and readiness. Quote preparation is blocked until required checks and evidence are resolved and a matching quote basis exists.
6. Staff prepares a quote snapshot; an independent authorized reviewer approves it; staff explicitly publishes it.
7. After publication, the customer tracker shows the quote summary, preview, PDF, accept, decline and request-change actions. Customer acceptance records a decision only.
8. Payment is not integrated. Accepted requests stop at the payment gate; the application must not represent acceptance as payment or start fulfilment.

## Per-service journey inventory

### 1. Just bought a vehicle — `vehicle-ownership-onboarding`

**Customer intake**
- Initial path is a guided “Just bought a vehicle” journey, distinct from the ordinary service selector.
- Customer selects purchase type: dealership, private sale, bank/auction, or unsure.
- Customer selects one or more requested help items: ownership papers, registration, licence disc/licensing, roadworthy help, vehicle-paper handover, or guidance.
- Customer provides finance-stage context and may optionally enter dealership name and referral code.
- The initial ownership path deliberately does not request ID, full VIN, or vehicle papers; documents are confirmed later by staff.

**Requirements and evidence currently collected**
- Work items and purchase/finance context are validated and saved.
- No definition-backed document checklist is configured for this service code. The customer is told staff will confirm applicable documents.

**Pricing/readiness**
- No active quote profile is defined for this service category. It is an enquiry/intake path, not a quoteable ownership package today.
- Do not imply that a dealer is connected, customer information is shared with a dealership, or government work is automated.

**Workflow/completion**
- Uses the common request workflow. A parent case with independently tracked ownership/registration/licensing tasks, partner workflows, authority evidence and service-specific completion rules is not implemented.

**Gap/status:** Intake implemented; service-definition, approved checklist, pricing and detailed fulfilment configuration are pending.

**End-to-end checklist**
- [ ] Customer confirms purchase channel, finance stage, requested help items, service area and consent.
- [ ] WeQ4U confirms the exact child service(s) required; do not treat selected help items as authority-approved work.
- [ ] Staff records approved requirements and requests only the missing evidence that applies to this case.
- [ ] Staff reviews each received file and records reviewer/outcome; upload alone is not verification.
- [ ] Staff confirms eligible scope and quoteability; no ownership package price is configured today.
- [ ] Customer receives a quote only after the itemized scope, exclusions, validity and next step are approved and published.
- [ ] Customer decision is recorded against the published quote; payment remains a separate unavailable gate.
- [ ] Before claiming completion, record the agreed paperwork outcome and customer handover. Parent/child tasks and dealer/bank sharing are not yet implemented.

**Demo readiness:** Intake and tracking can be demonstrated as an enquiry. Do not present it as a completed ownership concierge service or partner integration.

### 2. Driver’s Licences — `drivers-licences`

**Customer intake**
- Customer chooses one subtype: Learner licence test, New driver licence test, Existing driver / renewal, or Other/not sure.
- An optional preferred test date/centre may be entered.
- Storefront loads matching service-definition requirements for configured learner/new-driver/renewal entries. It submits the service code for a recognized subtype.

**Configured subtype journeys**

| Service code | Customer subtype | Current requirement template | Pricing basis/status |
|---|---|---|---|
| `DL-LEARNER-APPLICATION` | Learner licence test | Copy of ID; booking confirmation | Provisional Standard WeQ4U service-fee estimate R200–R350; authority/test-centre/booking/third-party costs excluded. Pilot only. |
| `DL-NEW-TEST` | New driver licence test | Copy of ID; learner’s licence; booking confirmation | Provisional Standard WeQ4U service-fee estimate R200–R350; same exclusions. Pilot only. |
| `DL-RENEWAL` | Existing driver / renewal | Copy of ID; current licence; proof of residence | Existing driver-renewal price-card profile. Requirement and amount applicability still need operational confirmation. |
| No definition | Other/not sure | May fall back to generic category checklist | Not safely quoteable until subtype is identified. |
| Definition placeholder | Replacement / temporary licence | No matching storefront subtype option today | Unconfigured; not an active customer journey. |

**Verification/readiness**
- Staff records each requirement outcome and each uploaded-file review state, reviewer and timestamp.
- The API blocks quote preparation until required definition rows are resolved, uploaded files are verified, eligibility/readiness are positive and outstanding document requests are cleared.
- Learner/new-driver template contents and current authority process remain a **provisional pilot**, not an official licensing checklist.

**Workflow/completion**
- Quote lifecycle works through internal draft, independent approval, publication, customer decision and payment gate.
- Definition stage lists include test appointment/result/licence-processing, but the platform’s global workflow does not yet execute those per-service stages or completion rules.

**Gap/status:** Best-developed subtype slice; not a full licensing fulfilment workflow or configuration-only service template.

**End-to-end checklist**
- [ ] Identify the exact subtype and service code before staff assessment: learner, new-driver test, renewal, or an explicitly unresolved subtype.
- [ ] Load that service definition's checklist; show provisional/template status to staff and do not silently substitute renewal requirements.
- [ ] Customer uploads required evidence or responds to specific staff document requests.
- [ ] Staff reviews each document against its requirement, records a verification outcome, reviewer, timestamp and exception note.
- [ ] Staff confirms eligibility and process readiness. Missing learner licence or booking evidence blocks quote readiness for `DL-NEW-TEST`.
- [ ] For the pilot learner/new-driver services only, staff selects a Standard WeQ4U service-fee estimate in the configured R200–R350 range; government/test-centre/booking/third-party costs are excluded and must be confirmed separately.
- [ ] For renewal, use the renewal profile only when the exact subtype matches and the complete case price basis is confirmed.
- [ ] Staff checks the internal customer-view quote preview; a different authorized reviewer approves it; staff publishes it.
- [ ] Customer Tracking shows Preview Quote, Download PDF, Accept, Decline and Request Change only after publication.
- [ ] Customer acceptance/decline/change is recorded against that quote version. No payment is collected; the payment gate remains explicit.
- [ ] If a paid service is later configured, capture appointment/test/submission outcome and handover evidence before completion. Those service-specific processing stages are not yet executable in the common workflow.

**Demo readiness:** `DL-NEW-TEST` may be demonstrated as an assessment and provisional-estimate pilot only when all required evidence is genuinely supplied and reviewed. Do not call the estimate an all-in price or claim authority endorsement.

### 3. PrDPs — `prdps`

**Customer intake**
- Customer chooses New PrDP, PrDP renewal, or Other/not sure.
- An optional appointment preference/test-centre entry is available.

**Requirements/evidence currently shown**
- `PD-APPLICATION` (New PrDP) definition includes Copy of ID and Medical certificate, with descriptive verification notes.
- The wider storefront fallback guide also mentions booking-fee confirmation. Because the definition-backed path supplies its own rows, verify that the displayed list and current business rules agree before a demo.
- `PD-RENEWAL` has a placeholder definition with no requirements. Other/not-sure has no matching definition.

**Pricing/readiness**
- Seeded PrDP profile is eligible for New PrDP only. It must not be used for PrDP renewal.
- Current profile amount is a price-card reference; confirm the current authority/third-party costs and subtype applicability before quoting customers.

**Workflow/completion**
- Shared quote and payment gates exist. Medical, appointment, fingerprint/authority steps and completion evidence are not driven by an executable PrDP workflow template.

**Gap/status:** New application has a profile-backed definition slice; renewal and uncertain subtypes need configuration and confirmation.

**End-to-end checklist**
- [ ] Customer identifies new PrDP versus renewal; “Other/not sure” requires staff clarification before selecting a profile.
- [ ] Customer provides only the currently approved, case-relevant documents through the secure upload.
- [ ] Staff confirms the current new/renewal process and applicable medical/appointment requirements before quote readiness.
- [ ] Staff verifies each requirement and records exceptions; the pilot definition and fallback guide must be reconciled before public use.
- [ ] Confirm the active price profile is applicable to the exact PrDP subtype and distinguishes WeQ4U fees from authority/medical/third-party charges.
- [ ] Preview, independently approve and publish the exact quote snapshot before customer decisions.
- [ ] Record customer decision; do not treat acceptance as payment.
- [ ] For any later processing demo, record approved appointment/authority outcome and customer handover evidence; these completion rules are not currently encoded.

**Demo readiness:** New PrDP is a candidate only after document checklist and current process are confirmed; PrDP renewal is not quote-ready under the current profile.

### 4. Licence Disc Renewals — `licence-disc-renewals`

**Customer intake**
- Customer chooses personal vehicle, business/fleet vehicle, or Other/not sure.

**Working checklist shown**
- Copy of ID is marked required.
- Existing licence disc is optional if available.

**Pricing/readiness**
- Annual disc-renewal price profile exists. The profile does not by itself resolve vehicle status, arrears, authority fee changes, business/fleet rules, or all-in pricing.
- Service has no dedicated service-definition entry. Quote preparation still needs assessment and evidence verification.

**Workflow/completion**
- Shared quote/approval/publication/payment gate. Current workflow does not capture an authority transaction reference, issued disc evidence, or explicit service-specific closure rule.

**Gap/status:** Intake and a price profile exist; definition-backed checklist, verification semantics, arrears handling and completion evidence remain to configure/approve.

**End-to-end checklist**
- [ ] Identify personal versus business/fleet vehicle and collect the minimum vehicle/account details approved for assessment.
- [ ] Staff checks renewal status, arrears and applicable authority charges; exact case fees are confirmed before quoting.
- [ ] Staff requests and verifies only approved required evidence; “existing disc” is currently optional intake guidance, not a complete approved checklist.
- [ ] Match the request to the active annual-disc pricing profile; clarify pass-through charges and courier separately.
- [ ] Preview, independent approval and publication occur before the customer can decide.
- [ ] After a future payment integration, record the authority transaction result/issued disc and hand it back to the customer before completion.

**Demo readiness:** Pricing preview can be shown, but do not claim a complete licence-office fulfilment journey until checklist, arrears logic, payment and completion evidence are defined.

### 5. Vehicle Registrations — `vehicle-registrations`

**Customer intake**
- Customer chooses new registration, bank-financed registration, dealership registration, or Other/not sure.

**Working checklist shown**
- The source contains a broad list: certified owner ID, proof of residence, purchase documentation, settlement letter, bank proxy ID, dealer proxy ID, dealer BRN, stamped NCO, buyer ID, buyer proof of address and roadworthy certificate.
- The UI filters that list by selected subtype. The current filters should be treated as enquiry aids only; several distinctions and combinations need business/authority validation.
- Other/not-sure can result in no applicable files being displayed.

**Pricing/readiness**
- No approved active price profile for new vehicle registration. The licence-disc profile is not a new-registration price.
- Quote must remain blocked until a matching profile and approved fee basis exist.

**Workflow/completion**
- No definition-backed registration submission, department-review/query, registration-issued or handover workflow.

**Gap/status:** Intake questions and a working checklist exist; definition, approved checklist, pricing and registration workflow are incomplete.

**End-to-end checklist**
- [ ] Distinguish new registration, bank-financed registration, dealership registration, or unresolved case before collecting a definitive checklist.
- [ ] Staff verifies buyer/owner identity, transaction authority and only the applicable lender/dealer/vehicle evidence.
- [ ] Confirm the exact registration transaction and authority cost; new registration has no configured matching price profile today.
- [ ] Do not quote by borrowing annual-disc or change-of-ownership prices.
- [ ] When an approved quote basis exists, use internal preview → independent approval → publication → customer decision.
- [ ] After payment, record submission reference, queries, registration result and customer handover before completion. These steps are not yet implemented.

**Demo readiness:** Enquiry and checklist discussion only. Not quote-ready for new registration.

### 6. Change of Ownership — `change-of-ownership`

**Customer intake**
- Customer chooses bank-financed, dealership sale, private sale, or not sure.

**Working checklist shown**
- Bank-financed branch currently filters to settlement letter, bank proxy ID and roadworthy certificate.
- Dealership branch filters to dealer proxy ID, dealer BRN, stamped NCO, buyer ID, buyer proof of address and roadworthy certificate.
- Private sale and not-sure branches currently return no document rows in the storefront filter.
- The hard-coded working guide and any profile must not be treated as a final NATIS checklist.

**Pricing/readiness**
- A broad change-of-ownership price profile exists; it does not distinguish private sale, dealer sale and financed transfer.
- A single category price must not be presumed valid for all those transaction types without business approval.

**Workflow/completion**
- No dedicated `VOC-PRIVATE-SALE`, dealer-sale, or financed-transfer definition; no executable buyer/seller/NATIS/ownership-update stage template or completion evidence.

**Gap/status:** Category intake and broad price profile only. Private/dealer/finance variants need separate definitions and approved rules.

**End-to-end checklist**
- [ ] Identify private sale, dealership sale, financed transfer, or unresolved case; create a distinct service code/profile for the selected transaction before processing.
- [ ] Confirm buyer/seller roles, authority to act, vehicle/transaction details and required party consents.
- [ ] Staff requests and verifies only approved documents for the selected scenario; private-sale branch currently has no filtered checklist and must not be treated as complete.
- [ ] Confirm NATIS/roadworthy applicability and separate authority, third-party and WeQ4U charges.
- [ ] Use a matching approved price rule; the broad category profile alone is insufficient proof for all variants.
- [ ] Publish only after internal preview and independent approval; record the customer decision and payment state separately.
- [ ] Before completion, retain submission/transfer reference, ownership update evidence, any disc outcome, and documented customer handover.

**Demo readiness:** Current category intake and quote mechanics only. Private/dealer/financed ownership transfer is not ready as a complete customer journey.

### 7. Duplicate Documents — `duplicate-documents`

**Customer intake**
- Customer chooses lost/stolen, damaged, or Other/not sure.

**Working checklist shown**
- Lost/stolen: certified owner ID and affidavit.
- Other selected cases can filter to certified owner ID only; document-type-specific requirements are not modelled.

**Pricing/readiness**
- No active approved profile is configured for duplicate-document requests.

**Workflow/completion**
- No document-type-specific authority replacement flow, fee handling, replacement reference, or handover completion rule.

**Gap/status:** Intake and draft checklist only; pricing and fulfillment not configured.

**End-to-end checklist**
- [ ] Identify which exact document is missing/damaged and the owner/authorized requester.
- [ ] Confirm case-specific affidavit or other evidence rules with approved process guidance; the current lost/stolen checklist is only working guidance.
- [ ] Staff verifies evidence and confirms the authority fee and WeQ4U handling price; no profile exists today.
- [ ] Quote is previewed, approved and published before customer decision; do not invent replacement fees.
- [ ] After a future payment gate, record the replacement document/reference and delivery/collection evidence before closure.

**Demo readiness:** Request intake only. Not quote-ready.

### 8. Roadworthy Certificates — `roadworthy-certificates`

**Customer intake**
- Customer chooses book a test, roadworthy for sale/transfer, or Other/not sure.
- Optional vehicle registration number field is displayed.

**Working checklist shown**
- Owner ID is required; an existing roadworthy certificate is optional.
- This is coordination intake, not an inspection, repair, retest or certificate issuance by WeQ4U.

**Pricing/readiness**
- No active approved quote profile is configured. Inspection-station, repair, retest and courier costs must not be invented or silently included.

**Workflow/completion**
- No station booking, inspection result, failure/repair/retest or certificate evidence workflow is implemented.

**Gap/status:** Enquiry aid only; coordination scope, fee basis, third-party pass-through and closure criteria require approval.

**End-to-end checklist**
- [ ] Clarify whether the customer needs booking coordination, an existing certificate review, or another task; do not imply WeQ4U performs the inspection or repairs.
- [ ] Collect only approved vehicle and owner identifiers; confirm test-centre availability and third-party charges.
- [ ] Staff verifies any supplied evidence and records booking/inspection responsibility and exclusions.
- [ ] Configure and approve a coordination fee before quoting; station, repair, retest and courier costs remain separate.
- [ ] Publish the approved quote, record customer decision and (when enabled) payment.
- [ ] Record appointment confirmation, test result/certificate or failure/retest outcome, and final customer handover before completion.

**Demo readiness:** Coordination enquiry only. No configured quote or station-workflow proof.

### 9. Traffic Register — `traffic-register`

**Customer intake**
- Customer chooses apply for a traffic register number or Other/not sure.
- No document checklist is currently shown in the storefront for this category.

**Pricing/readiness**
- A price-card profile exists, but its process scope, authority charges and applicable document requirements still need confirmation for the specific request.

**Workflow/completion**
- Shared quote and payment gate only; application submission evidence, authority response, number issuance and customer handover are not captured as a service-specific workflow.

**Gap/status:** Price profile and basic intake option exist; requirements and fulfillment definition are incomplete.

**End-to-end checklist**
- [ ] Clarify what traffic-register service/transaction is requested and confirm eligibility with the current process owner.
- [ ] Obtain an approved document checklist; the current UI displays no document rows.
- [ ] Staff records verification and readiness before quote generation; confirm profile applicability and authority-charge treatment.
- [ ] Preview, independently approve and publish the quote before customer decision.
- [ ] After verified payment in a future integration, record application/submission reference, authority response, number issuance and handover evidence.

**Demo readiness:** Price profile and enquiry option exist; not a complete traffic-register fulfilment demonstration.

## Optional courier add-ons

The customer can request document collection and/or delivery while creating another service request. These are currently add-on flags, not independent quoteable service definitions. Availability and charges are confirmed separately. No approved universal courier rate is configured; a selected unpriced route should block a priced quote or be excluded/disclosed explicitly.

## Cross-service acceptance checklist

Use this list when deciding whether an individual service is ready for a customer or licensing-department demo:

- [ ] Customer-selected subtype maps to a unique service code and pinned definition version.
- [ ] Intake questions and document checklist come from the same definition used by Admin/API.
- [ ] Customer is told the checklist is provisional where it has not been approved.
- [ ] Each required item is represented as missing, received, verified, rejected/replacement-required, or explicitly not applicable with a reason.
- [ ] Every file is individually reviewed; upload does not imply verification.
- [ ] Eligibility and government/process readiness are explicit and auditable.
- [ ] Matching pricing strategy and service subtype are validated; no category-profile leakage.
- [ ] Quote includes clear scope, exclusions, validity, next steps and correct quote type.
- [ ] Internal preview matches the customer-rendered quote snapshot.
- [ ] Different authorized person approves the draft before publication.
- [ ] Customer tracker exposes quote actions only after publication.
- [ ] Customer decision is recorded once against the correct quote version.
- [ ] Payment is clearly shown as unavailable/gated until real payment processing exists.
- [ ] Service-specific authority interaction and completion evidence are defined before claiming end-to-end fulfilment.

## Department of Transport demonstration checklist

Use this as the presentation gate for each service selected for the demo. Demonstrate only a service whose business scope, checklist and price basis have been confirmed. Use synthetic customer data and test files.

### Before the meeting

- [ ] Choose one or two individual services with approved or explicitly pilot-scoped rules; do not demo unconfigured ownership/dealership/bank/fleet services as live capability.
- [ ] Prepare one clean synthetic request per selected service with its exact subtype/service code.
- [ ] Confirm each checklist item and fee/exclusion with the business and current authoritative process owner; label any unresolved item as provisional.
- [ ] Prepare safe synthetic files that correspond exactly to the requirement labels.
- [ ] Confirm local API/storefront/Admin are running and staff role/session works.
- [ ] Confirm no real customer names, identity documents, references or bank information are visible in screenshots or screen recordings.

### Live walkthrough

- [ ] Submit the request in the customer portal and show the reference and consented request summary.
- [ ] Upload matching evidence and show the customer-facing “received for review” state.
- [ ] Open the same request in Admin and show service code, definition version, requirements, evidence links and current status.
- [ ] Show an intentionally pending or rejected item blocks readiness; then review the real demo evidence and record reviewer/outcome.
- [ ] Show eligibility and process-readiness assessment with attributable actor/time.
- [ ] Show the pricing rule, package, exclusions and generated customer-view quote preview.
- [ ] Prepare draft, demonstrate that it is private, then approve with a different authorized user.
- [ ] Publish and switch to Customer Tracking; show quote summary, preview, PDF, accept/decline/request-change controls and matching terms.
- [ ] Demonstrate one customer decision and show the staff queue/timeline update.
- [ ] Show the payment gate and state plainly that live payment collection/authority submission is not enabled unless separately integrated and approved.

### Claims to avoid

- [ ] Do not describe a working checklist as a Department-approved statutory checklist unless written confirmation exists.
- [ ] Do not describe a provisional service-fee estimate as an all-inclusive price or government tariff.
- [ ] Do not claim a quote is payment, a customer acceptance starts processing, or a government action is automated.
- [ ] Do not imply Department endorsement, direct Department integration, guaranteed slots, processing speed or outcomes.
- [ ] Do not present future dealership, bank, fleet or settlement definitions in this report as implemented services.
