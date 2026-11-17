# Service Definition Framework: Proof and Gap Assessment

**Purpose:** Prove what the current fulfilment foundation supports, identify where configuration is still code-bound, and define the reusable service model required before dealership, bank, fleet, or expanded ownership work begins.

**Status:** Architecture assessment and target contract. This is not a claim that every target capability is implemented or that draft service requirements are authority-approved.

**Customer-facing service inventory:** See [Customer Service Journey Inventory](customer-service-journey-inventory.md) for a separate current-state journey and gap record for every primary service currently rendered in the storefront.

## Executive finding

The project has the first slice of a service-definition catalogue in `apps/api/src/serviceDefinitions.js`. It distinguishes several driver-licence and PrDP subtypes, resolves a submitted subtype to a service code, seeds an assessment checklist, carries service identity into quote snapshots, and allows a provisional pricing rule for the pilot learner/new-driver services.

**This is not yet a configuration-only Service Template Engine.** Definitions are JavaScript objects committed in source control; the service team cannot create/version/activate them through an Admin configuration workspace. The main workflow states and transitions remain global in `apps/api/src/workflow.js`. Document verification outcomes and readiness are generic record fields, and the storefront still has category-level fallback service guides in `apps/storefront/src/RequestFlow.tsx`. New services therefore still require code changes, API validation updates, intake work, and tests.

Do not claim that adding a definition alone can yet add an arbitrary new service without workflow redevelopment. The current implementation proves subtype separation for the pilot slice, not broad service configurability.

## Evidence in the current repository

| Capability | Current evidence | Assessment |
|---|---|---|
| Service codes and subtype matching | `serviceDefinitions` and `resolveServiceDefinition` in `apps/api/src/serviceDefinitions.js` | Implemented for selected driver/PrDP subtypes; source-code configuration only |
| Legacy request normalization | `normalizeRequestServiceDefinition` attaches a matching code and assessment checklist to old requests | Implemented; does not mark evidence verified |
| Definition-backed intake identity | Storefront loads `/api/catalogue` definitions and submits `serviceCode` | Implemented for driver/PrDP subtype selection |
| Requirements list | Definition rows seed assessment entries and API rejects removing/relabeling configured rows | Implemented for definitions with rows; remaining service definitions are placeholders |
| Document verification | Uploaded files have generic review states and staff/reviewer metadata | Implemented generically; verification rules are currently descriptive strings, not executable rule handlers |
| Readiness gate | `serviceAssessmentReady` checks assessment, requirement outcomes, document verification, and outstanding document requests | Implemented generically; rule composition is not definition-configurable yet |
| Pricing | Approved price-card profiles plus a definition-backed provisional estimate rule | Implemented for seeded services and pilot subtypes; broader pricing models are not declarative/configurable across all services |
| Quote approval/publication | Draft, separate approver, publication and customer-safe quote visibility are API-enforced | Implemented and API-tested |
| Workflow stages | Global `workflowStatuses`, transition map and route map in `apps/api/src/workflow.js` | Hard-coded shared workflow; per-service stage templates are not executed from definitions |
| Completion rules | Present as descriptive text in some definitions | Not enforced by a generic completion-rule engine |
| Admin service-template management | No template editor/version/activation workflow found | Not implemented |

## Reusable target contract

Each service definition should be a versioned, validated configuration object. It identifies the service independently of its broad customer-facing category and references reusable rule types rather than embedding service-specific branches in route handlers.

```yaml
serviceCode: DL-NEW-TEST
serviceName: New Driver's Licence Test
category: Licensing
version: 1
lifecycleStatus: pilot
intake:
  questions: []
requirements:
  - requirementCode: identity
    label: Copy of ID
    required: true
    acceptedEvidenceTypes: [pdf, jpg, png]
verificationRules:
  - ruleCode: identity-document-review
    requirementCode: identity
    handler: staff-review
readinessRules:
  - ruleCode: all-required-evidence-verified
    handler: all-required-requirements-verified
pricing:
  ruleCode: provisional-service-fee
  minCents: 20000
  maxCents: 35000
  package: standard
  exclusions: [government, test-centre, booking, third-party]
quote:
  type: provisional-estimate
  requiresInternalPreview: true
  requiresIndependentApproval: true
workflow:
  templateCode: service-fulfilment-v1
  stages: []
completionRules:
  - ruleCode: test-outcome-recorded
```

### Configuration versus executable logic

Configuration may select registered rule handlers, workflow templates, and pricing strategies. A service definition must not contain executable JavaScript, arbitrary expressions, or unvalidated code. The engine executes a finite set of tested rule types. Adding a service that uses existing rule types should be a data/configuration operation; adding a genuinely new behavior may require a new, reviewed engine capability and tests.

Required configuration lifecycle:

1. Draft a service definition and checklist version.
2. Validate schema, unique service code, referenced pricing strategy, rule handlers, and transition/template compatibility.
3. Preview intake, checklist, readiness and quote behavior against sample cases.
4. Approve/version the definition with actor and timestamp.
5. Activate it for new requests; retain the exact version on each request and quote.
6. Never silently change active cases when a definition is edited; migrate/reassess them explicitly.

## Master fulfilment workflow

The platform should provide one reusable case lifecycle. Service definitions configure optional steps and completion checks; they do not invent a separate state machine for every product.

```text
Request Submitted
  -> Service Identified
  -> Requirements Assessment
  -> Documents Requested / Received
  -> Documents Verified
  -> Service Eligibility Assessment
  -> Readiness Approved
  -> Quote Draft
  -> Internal Customer-View Preview
  -> Independent Approval
  -> Quote Published
  -> Customer Decision
  -> Payment Required / Verified
  -> Service Processing
  -> Authority / Provider Interaction
  -> Compliance and Quality Checks
  -> Collection / Delivery
  -> Completed and Closed
```

Rules:

- Customer-visible milestones are a projection of internal events, not the internal queue names.
- `Readiness Approved` requires the active definition version, satisfied required requirements, verified evidence, satisfied eligibility rules, and the configured readiness decision.
- Quote creation snapshots service code/version, pricing rule/version, line items, inclusions, exclusions, validity, quote type, and next-step text.
- Draft and approved-but-unpublished quotes are private. Publication is the only event that enables customer quote actions.
- Acceptance is not payment. Processing remains blocked until the configured payment milestone is verified or a service-specific approved exception applies.
- Every material transition records actor/time and emits a customer-safe event when appropriate.
- A workflow template must reject an invalid transition server-side; hiding a UI control is not enforcement.

## Four proof services mapped to the common model

| Proof case | Definition identity | Requirements / verification | Pricing and quote | Workflow/completion | Current proof state |
|---|---|---|---|---|---|
| New Driver Licence Test | `DL-NEW-TEST` | Pilot rows: ID copy, learner's licence, booking confirmation. Staff records evidence review. These rows are provisional pending authority/process confirmation. | Provisional Standard service-fee estimate in the configured R200–R350 band; excludes government, test-centre, booking and third-party charges. No renewal profile reuse. | Shared assessment → verification → readiness → quote/approval/publication → decision/payment gate; test appointment/result/licence-processing are listed as definition stages but the global engine does not yet execute them. | Subtype identity, checklist seeding, quote estimate and publication mechanics are implemented/test-covered. Live end-to-end screenshot walk-through remains to be captured. |
| Driver Licence Renewal | `DL-RENEWAL` | Draft definition rows: ID copy, current licence, proof of residence. Confirm exact requirements and verification standards with the business/authority. | Existing approved price-card profile maps to renewal. Quote snapshots service code/version. | Shared lifecycle; renewal submission/authority/collection stages need per-template execution and approved completion evidence. | Price profile and quote mechanics exist; definition is source code, not editable configuration. |
| Vehicle Change of Ownership | No dedicated subtype code is active yet; current category is `change-of-ownership`. Proposed code: `VOC-OWNERSHIP-TRANSFER`. | Buyer/seller identities, transaction evidence, NATIS/roadworthy items must be established by the applicable case and approved process; no requirements are asserted here as final. | Existing broad category price card exists, but private/dealer/financed variants need separately approved profiles or rules. | Configure private-sale, dealer-sale and financed cases as service definitions sharing the common lifecycle; authority transfer/ownership update completion needs confirmed evidence. | Category-level request and quote only. Not a definition-driven proof case yet. |
| Dealership Vehicle Delivery Concierge | Proposed code: `DCS-DELIVERY-PACK`. | Partner-approved handover checklist, recipient authorization, vehicle/document evidence and consent scope are TBD. | Pricing components and pass-through boundaries are TBD; no partner price is invented. | Shared lifecycle with partner task/hand-off stages selected by configuration; delivery proof and exception closure TBD. | Not implemented by directive. Configuration example only. |
| Bank Vehicle Settlement Concierge | Proposed code: `BCS-SETTLEMENT`. | Lender-specific authorization, settlement statement, identity and release evidence require bank/business approval. | Fee, lender charges, payment handling and refund/exception rules TBD. | Shared lifecycle with secure lender interaction and release confirmation; no bank integration is claimed. | Not implemented by directive. Configuration example only. |

These mappings show how future products should plug into the framework, not that those future services are operational or approved.

## Future-state service catalogue and configuration readiness

Status meanings: **Pilot** = definition exists but still needs pilot/business confirmation; **Profile-backed** = current price profile exists, but does not prove complete requirements/workflow configuration; **Planned** = inventory only, no live service definition.

For every Planned service, the specific requirements, verification checks, pricing, workflow variants, and completion evidence must be supplied and approved before activation. This avoids populating a catalogue with invented government rules or fees.

| Domain | Service code | Service | Requirements/verification | Pricing | Workflow/completion | Status |
|---|---|---|---|---|---|---|
| Licensing | `DL-LEARNER` | Learner's Licence | Pilot ID/booking rows; confirm rewrite distinction and accepted evidence | Provisional band only for pilot; exclusions apply | Common lifecycle; test outcome evidence to approve | Pilot |
| Licensing | `DL-LEARNER-REWRITE` | Learner's Licence Rewrite | TBD with business/authority | Unconfigured | Common template; rewrite-specific completion TBD | Planned |
| Licensing | `DL-NEW-TEST` | New Driver's Licence Test | ID, learner's licence, booking; verify against approved process | Provisional R200–R350 service fee; authority/test-centre charges excluded | Common quote/payment stages; testing/result/processing completion | Pilot |
| Licensing | `DL-RENEWAL` | Driver's Licence Renewal | ID/current licence/address rows require final confirmation | Current renewal profile | Common lifecycle; submission and handover evidence TBD | Profile-backed |
| Licensing | `DL-REPLACEMENT` | Driver's Licence Replacement | Loss/damage and identity evidence TBD | Unconfigured | Common template; replacement receipt/completion TBD | Planned |
| Licensing | `DL-TEMPORARY` | Temporary Licence | Eligibility, reason and supporting evidence TBD | Unconfigured | Common template; validity/collection completion TBD | Planned |
| Licensing | `PRDP-NEW` | PrDP Application | ID and medical certificate are working-note candidates; confirm | Current PrDP profile applies only to New PrDP; validate amounts | Common lifecycle plus approved medical/authority stages TBD | Profile-backed |
| Licensing | `PRDP-RENEWAL` | PrDP Renewal | Renewal-specific requirements TBD | Unconfigured | Common template and completion evidence TBD | Planned |
| Vehicle Services | `VR-LICENCE-DISC` | Licence Disc Renewal | Owner/vehicle details, current disc and arrears rules TBD | Existing annual-disc profile; confirm case applicability | Common lifecycle; authority payment/issued disc evidence TBD | Profile-backed |
| Vehicle Services | `VR-NEW-REGISTRATION` | Vehicle Registration | Transaction-specific buyer/vehicle/dealer/bank evidence TBD | Unconfigured for new registration | Common template; registration evidence TBD | Planned |
| Vehicle Services | `VR-ROADWORTHY` | Roadworthy Assistance | Vehicle identity and booking evidence TBD | Coordination fee and station costs require approval | Common template; inspection/result/retake boundaries TBD | Planned |
| Vehicle Services | `VR-OWNERSHIP-TRANSFER` | Change of Ownership | Buyer/seller, sale, NATIS and roadworthy applicability TBD | Current broad category profile; variants need pricing review | Transfer/ownership update/closure evidence TBD | Profile-backed |
| Vehicle Services | `VR-DUPLICATE-DOCS` | Duplicate Registration Documents | Document type, owner authority and loss/damage evidence TBD | Unconfigured | Common template; replacement-document handover TBD | Planned |
| Ownership Concierge | `VOC-PRIVATE-SALE` | Private Sale Vehicle Purchase | Buyer/seller consent, sale and vehicle evidence TBD | Unconfigured | Shared lifecycle with private-sale steps; transfer proof TBD | Planned |
| Ownership Concierge | `VOC-PRIVATE-TRANSFER` | Private Sale Ownership Transfer | Buyer/seller and authority requirements TBD | Unconfigured | Shared lifecycle; ownership update and handover TBD | Planned |
| Ownership Concierge | `VOC-COMPLIANCE-PACK` | Vehicle Compliance Pack | Selectable compliance tasks and evidence TBD | Unconfigured | Parent case with configured child tasks; closure checks TBD | Planned |
| Ownership Concierge | `VOC-NEW-OWNER` | New Owner Onboarding | Existing intake is an enquiry; definitive checklists TBD | Unconfigured | Parent case/task orchestration not implemented | Planned |
| Dealership Concierge | `DCS-DELIVERY-PACK` | Dealer Delivery Pack | Partner consent, handover/recipient evidence TBD | Unconfigured | Partner hand-off and delivery evidence TBD | Planned |
| Dealership Concierge | `DCS-REGISTRATION` | Dealer Registration Assistance | Branch/dealer authorization and vehicle evidence TBD | Unconfigured | Registration queue and authority evidence TBD | Planned |
| Dealership Concierge | `DCS-TRADE-IN` | Trade-In Transfers | Seller/buyer/vehicle/finance evidence TBD | Unconfigured | Trade-in and transfer milestones TBD | Planned |
| Dealership Concierge | `DCS-BULK-REG` | Bulk Registration Services | Batch schema, per-vehicle evidence, exception rules TBD | Unconfigured | Batch parent/child cases and reconciliation TBD | Planned |
| Banking & Finance | `BCS-SETTLEMENT` | Vehicle Settlement Assistance | Lender authorization and settlement evidence TBD | Unconfigured | Secure lender follow-up and release confirmation TBD | Planned |
| Banking & Finance | `BCS-RELEASE` | Vehicle Release Assistance | Lender release authority/evidence TBD | Unconfigured | Release and custody hand-off evidence TBD | Planned |
| Banking & Finance | `BCS-FINANCE-REG` | Financed Vehicle Registration | Lender/dealer/buyer evidence and consent TBD | Unconfigured | Registration and lender milestone handling TBD | Planned |
| Banking & Finance | `BCS-DOCUMENTS` | Bank Documentation Support | Bank-specific authorization and document set TBD | Unconfigured | Secure document request/review/return TBD | Planned |
| Fleet | `FCS-FLEET-REG` | Fleet Registration | Fleet owner authority and per-vehicle data/evidence TBD | Unconfigured | Batch plus per-vehicle exceptions and completion TBD | Planned |
| Fleet | `FCS-BULK-LICENSING` | Bulk Licensing | Fleet vehicle list and authorization TBD | Unconfigured | Batch renewal runs, exceptions and reconciliation TBD | Planned |
| Fleet | `FCS-COMPLIANCE` | Fleet Compliance | Policy/vehicle evidence and scope TBD | Unconfigured | Recurring review cadence and compliance evidence TBD | Planned |

## What “configuration-only” requires next

The current definition file is a useful prototype, but the following are still required before proving that a new service can be added without workflow code changes:

1. **Schema and validation:** typed definition schema with unique codes, versioning, required fields, known handler IDs and referential validation.
2. **Data-backed definition storage:** definitions stored as versioned data (database or validated configuration bundle), not only exported JavaScript arrays.
3. **Admin template workspace:** create/edit/compare/approve/activate definitions with role permissions and audit events.
4. **Generic rule engine:** registered requirement verification handlers, readiness operators, pricing strategies, quote policies, workflow templates and completion evaluators.
5. **Workflow template interpreter:** transitions, gates, events and customer-safe labels selected by the service definition. Current `workflow.js` is global and hard-coded.
6. **Unified intake renderer:** service questions and required-document labels generated from the same API definition; remove the duplicated `serviceGuides` fallback for configured services.
7. **Migration/version behavior:** each case and quote pins definition/version; definition edits do not silently alter active cases.
8. **Conformance tests:** add a fixture service using only existing rule handlers and prove intake, assessment, readiness, quote, publication and completion without modifying workflow source.

Until these exist, the accurate claim is: **the pilot uses a service-definition-driven subtype slice; the overall system is not yet configuration-only.**

## Current proof status

- API regression tests cover provisional pricing boundaries, definition matching, unverified checklist seeding, quote draft privacy, independent approval, publication, customer tracker data, and PDF disclosure.
- Tests do not substitute for an actual browser demonstration. Capture real screenshots of staff assessment, saved draft preview, approval/publication state, and customer tracking after publication before claiming Task 1 is visually proven.
- The current `DL-NEW-TEST` pilot checklist in code should remain marked provisional until its document and government-process requirements are confirmed by the business and relevant authority.
- Payment collection, payment provider integration, and actual government submission are not live; the existing payment gate is a stop, not proof of those integrations.

### Live request evidence checked 11 November 2026

Request `WQ-2026-0CFF0627125C547A3488` was queried from the running Admin API after restarting the project-managed development processes:

| Check | Live result |
|---|---|
| Resolved service | `DL-NEW-TEST` — New Driver's Licence Test |
| Definition status | `provisional-pilot` |
| Requirements | Copy of ID: received; Learner's licence: missing; Booking confirmation: missing |
| Uploaded evidence | Copy of ID: pending review; Booking fee confirmation: pending review |
| Assessment readiness | Not ready |
| Pricing resolution | Provisional service-fee estimate; R200–R350; authority/third-party charges excluded |
| Customer quote | No published quote. The customer tracker must not show quote decision controls yet. |

This is real API evidence, not a saved screenshot of the rendered Admin assessment or customer quote page. An actual customer quote should not be published for this request until the missing requirement evidence and pending document reviews are resolved. No test shortcut or manual status change should mark them verified.

### End-to-end evidence distinction

| Lifecycle step | Evidence available | Status |
|---|---|---|
| Request submission and uploads | Existing request and encrypted local files; integration tests cover submission/upload | Implemented/tested |
| Definition resolution and requirement seeding | Live Admin API returns `DL-NEW-TEST` and the three configured checklist rows | Live API verified |
| Document verification/readiness | Live record shows pending uploads and two missing requirements | Not passed for this request |
| Draft → independent approval → publish → customer quote controls | API integration test covers the provisional estimate path and customer response payload | Automated integration-tested; not yet captured as a complete browser screenshot walkthrough |
| Payment → processing | Payment integration is not configured; fulfilment is gated on verified payment | Deliberate stop; not an operational payment/processing demonstration |

## Individual-customer demonstration readiness

The immediate product goal is a credible concierge demonstration for individual customers, not enterprise workflow expansion. A service may be shown end-to-end only when its service subtype, checklist, eligibility, price basis, customer wording, and completion evidence have an approved or explicitly pilot-scoped definition.

| Individual service | Current demo readiness | Conditions before an honest complete walk-through |
|---|---|---|
| Driver's Licence Renewal | Candidate, profile-backed | Use an actual renewal request; obtain and verify each configured requirement; resolve the mismatch between the draft definition checklist and intake checklist; test the R450 price-card quote and disclosed inclusions/exclusions. |
| New Driver's Licence Test | Pilot path exists; current sample request is not ready | Obtain learner's licence and booking evidence; staff must verify uploaded documents and assessment; retain pilot fee/exclusion language; do not mark readiness passed while required evidence is missing. |
| Learner's Licence Application | Pilot path exists; not a production-approved tariff/process | Confirm whether the customer request means initial learner application or learner rewrite; validate requirements and appointment steps; quote only the explicitly provisional WeQ4U service fee and keep authority/test-centre charges separate. |
| PrDP Application | Candidate, profile-backed | Confirm current medical/document process, verify the actual evidence, and ensure the new-PrDP profile is used only for the matching subtype. |
| Licence Disc Renewal / Change of Ownership / Traffic Register | Price profiles exist for selected categories | Confirm case applicability, required documents, arrears/pass-throughs and actual customer evidence. A category price profile is not proof every subtype is ready. |
| Replacement, temporary licence, PrDP renewal, new registration, roadworthy coordination | Not ready | Requirements, verification, pricing, process ownership and completion criteria remain to be confirmed and configured. |

### Demo evidence standard

For each service shown to the licensing department, capture a real browser screen at the following checkpoints: customer submission/reference; customer document upload; staff document review with reviewer/time; definition-specific assessment and readiness; draft quote with exact customer view; independent approval; published quote; customer quote actions; and the resulting customer decision. Keep synthetic personal information and test files only.

If a requirement is missing, a document is pending, or a fee is provisional, show that as a visible blocker or disclosure. Do not edit encrypted request data directly, call internal APIs to mark checks complete for the demo, or reuse a request's old draft to imply it passed review. A full workflow can be demonstrated with a dedicated synthetic request once the service's agreed test evidence is available.

For a Minister or Department presentation, position the product as a **human-led request coordination and tracking pilot**. Do not imply government endorsement, direct authority integration, guaranteed appointment availability, accelerated statutory processing, live payment collection, or authority-approved checklist coverage unless those statements are independently evidenced and authorized.
