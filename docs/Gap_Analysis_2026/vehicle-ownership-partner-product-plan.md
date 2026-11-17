# Vehicle ownership partner product plan

**Purpose:** Align the customer and staff applications to serve customers of dealerships across South Africa, beginning with a proposed Johannesburg pilot.

**Status:** Recommendation for founder review. The WeBuyCars proposal is one source of product input and a possible discovery conversation; the service is intended for customers of any dealership and is not limited to WeBuyCars. No partner has approved the pilot or every proposed capability.

## 1. Recommendation

Keep the existing public transport-document service journey. Add a distinct **vehicle ownership after-purchase** journey that can coordinate several work items under one parent case and work with any participating dealership. Start in Johannesburg with one dealership, one defined vehicle transaction type and one measured pilot. Design for expansion to dealerships and customers throughout South Africa. Do not present the proposal as an OEM integration, government integration, AI product, or an already-proven service.

The product should make one operational promise that the pilot can prove: a named WeQ4U case owner coordinates agreed tasks, records progress, and gives the customer and partner a clear next step. Every other promise should be measured or confirmed with the partner first.

## 2. What exists and what is missing

### In the local prototype

- Customer pages describe seven transport-document services.
- A request collects one primary service, service answers and optional documents; optional courier collection/delivery is separate.
- Customers can track a request reference.
- The staff console provides role-token access, request status handling, operational filters, dashboard reporting and CSV export.
- The API uses encrypted local development storage, not PostgreSQL.
- The vehicle-owner request accepts an optional partner referral code, validates it, and shows it only in the review and authorized staff request detail. It is used to identify the referral source; it does not create partner access or share customer information.
- The admin overview shows a live count of recorded referral-code cases for the selected time/department filters, and the work queue can filter to those cases.
- The public partner page describes a dealership-neutral Johannesburg pilot for a service intended to support any dealership; it states that partner connections and case sharing are not live.

### Required for the partner proposal

- A partner referral and consent intake, including partner, retailer branch, sale/handover date and selected service package.
- A parent ownership-onboarding case that groups separate work items such as ownership transfer, registration, licensing, roadworthy coordination and document handover. These are not five unrelated customer requests.
- Partner-specific but versioned checklists and a human-reviewed exception process.
- A customer-visible case timeline and a partner view limited to the partner's authorized cases.
- Named case ownership, task assignment, service milestones, escalation reasons and completion evidence.
- PostgreSQL, private object storage, individual staff identity, scoped access, auditable actions and production backup/retention controls before real partner data is used.
- Pilot measurement for adoption, first-pass document completeness, elapsed time by stage, rework, customer/partner contact volume, completion and unit economics.

## 3. Website changes to plan

Keep the main site simple and let visitors choose between two clear paths:

1. **I need help with a transport document** — the current individual-service intake.
2. **I have just bought a vehicle** — a guided ownership-onboarding enquiry with an optional partner referral code.

The referral code is optional. It helps WeQ4U identify a referring dealership and must not imply that customer data is shared with that dealership. Johannesburg is the first proposed pilot location, not a permanent product limit. Accept enquiries from any South African dealership customer and confirm local serviceability with the customer. Keep this first enquiry short: do not ask for identity documents, full VIN, bank details or account creation at this stage.

The second path should explain the service in customer language, show the included tasks only after the operating scope is approved, explain what is optional, and let the customer see the next action. It should not require an account for the first enquiry. Do not ask for a full VIN or identity document before a clear purpose and secure upload step are shown. If a future approved workflow shares information with a retailer, it must collect separate, explicit consent for that specific recipient and purpose.

Create a separate partner information page for dealerships. It should show the proposed workflow, service boundaries, data-handling approach, pilot measures and a request for a discovery meeting. Avoid using Mercedes-Benz or BMW logos, claims of endorsement, or partner-specific wording until the partner authorizes it.

## 4. Admin console changes to plan

Keep all staff work under `:3001`. Add a **Partner Operations** workspace with:

- Partner and branch directory, onboarding status, agreed service scope and partner contacts.
- Partner referrals with consent evidence and a linked parent ownership case.
- Case stages: referred → consent confirmed → intake/documents → human review → quote/partner approval → authorized processing → authority/third-party wait → handover → closed; add exception and cancelled outcomes.
- Child tasks for transfer, registration, licensing, roadworthy and delivery only when the selected package requires them.
- A named case owner, department queue, next action, customer-visible update and internal-only notes.
- A restricted partner view showing only that partner's permitted cases and minimal progress data.
- Management measures grouped by partner/branch and stage, with recorded-data definitions and clear “not configured” states.

Do not expose ID documents, full VINs, sensitive case notes or other branches' records on partner dashboards. Every document view, consent change, quote decision and status change needs an attributable audit event.

## 5. Database starting model

Design a partner onboarding case as a parent workflow, with service tasks below it:

```text
partner ──< partner_locations
   └──< partner_referrals >── customer_consent
             └── ownership_cases ──< case_service_items
                    ├──< case_documents ──< document_reviews
                    ├──< workflow_tasks ──< task_events
                    ├──< case_events
                    ├──< quotes ──< quote_lines ──< quote_decisions
                    └──< notifications / audit_events / retention_records
```

Initial tables to review with the founder and implement as reviewed PostgreSQL migrations:

- `partners`, `partner_locations`, `partner_service_agreements` (effective-dated scope; no inferred endorsement).
- `partner_referrals`, `consent_events`, `customers`.
- `ownership_cases`, `case_service_items`, `vehicles` or restricted vehicle attributes linked to a case.
- `checklist_versions`, `checklist_items`, `case_documents`, `document_reviews`, `document_access_events`.
- `workflow_versions`, `workflow_instances`, `workflow_tasks`, `task_events`, `case_events`.
- `quotes`, `quote_lines`, `quote_decisions`, with separate WeQ4U, authority, third-party and courier categories.
- `staff_profiles`, `departments`, `roles`, `permissions`, `audit_events`, notification outbox and retention records.

Store structured records and metadata in PostgreSQL. Store document bytes in private object storage. Use public references only for finding a case; require a separate unguessable access token or a verified contact challenge for customer access. Keep the existing individual-service flow as a supported channel rather than forcing every enquiry into a dealer package.

## 6. Pilot approach

### Discovery before a proposal commitment

Interview one retailer's dealer principal/retail operations lead, sales/delivery manager, customer experience lead, and compliance/privacy contact. Map what that retailer already does after sale, what customers ask repeatedly, which tasks can be delegated, what records may be shared, who remains accountable, and what would make a pilot worthwhile. Confirm whether the retailer wants a white-label experience, a referral, or a bundled offer.

### A bounded pilot

Pilot one branch, one vehicle handover flow and a capped number of consenting customers. Establish a baseline first. Track:

- Offer rate and opt-in rate.
- Complete-document rate on first review and number of resubmissions.
- Time in each stage and total elapsed time, without publishing an SLA until targets are agreed.
- Number of customer and branch follow-up contacts per case.
- Completion rate, exception reasons, cancellations and rework.
- Customer and staff feedback.
- Cost to fulfil, partner economics and the source of each charge.
- Privacy/security incidents and consent withdrawal handling.

The six-week pilot in the deck is a proposal to discuss, not a commitment. Set the period and sample size with the retailer after the workflow, local authority steps and operating capacity are known.

## 7. Claims to verify before external use

The proposal reports 126 references across nine themes, describes one-to-three working days saved, promises zero department visits and no extra dealer staff, and positions AI document verification/readiness scoring as a capability. The deck does not show enough sampling/method detail alongside those figures to treat them as verified market facts. Before using them with an OEM or retailer:

- Document source URLs, collection dates, inclusion criteria, deduplication and coding for the 126 references; distinguish review mentions from a representative customer survey.
- Replace market-superlative claims such as “South Africa's first” unless independently verified.
- Label AI verification, readiness scores, live tracking, integrations and automated compliance as future capabilities unless they have been built, tested and governed.
- Present “time saved,” “zero visits,” complaint reduction, attach-rate and revenue as pilot hypotheses to measure, not guaranteed outcomes.
- Confirm each retailer's current process; do not say no one owns post-sale administration across all dealers.
- Do not promise legal compliance as an outcome. Describe only the specific administrative tasks performed and the evidence returned.

## 8. Partner-specific route

### BMW

BMW South Africa's public Customer Support page provides a Purchasing Department contact route for business proposals and service profiles. Prepare a concise service profile and ask for the right sponsor and process for a one-retailer pilot. In parallel, seek an operational sponsor at a retailer; a head-office supplier enquiry is not pilot approval. BMW's official page: [BMW Customer Support — Supplier Partnership Enquiry](https://www.bmw.co.za/en/more-bmw/customer-support.html).

### Mercedes-Benz

Start with a retailer-level customer-experience or sales/retail-operations discovery conversation and ask which group function should sponsor or procure a pilot. Mercedes-Benz Group describes its Supplier Portal as the supplier communication platform and says public applications are available for suppliers in non-production materials. Use the official portal if the service is directed through procurement; do not assume that retailer access means group approval. Official page: [Mercedes-Benz Group — Suppliers](https://group.mercedes-benz.com/company/suppliers/).

### Shared presentation

Create a neutral partner deck from the underlying evidence. The current PDF is explicitly prepared for WeBuyCars and marked confidential; do not forward it to Mercedes-Benz or BMW unchanged. Build separate versions only after discovery, with no partner logos or endorsement implication unless permission is granted.

## 9. Product-quality bar

For this product, “Silicon Valley standards” should mean observable product quality rather than buzzwords:

- One coherent case timeline across customer, partner and staff experiences.
- Clear ownership and next action at every step.
- Fast, accessible, mobile-first intake and upload, with useful failure recovery.
- Privacy by design, least-privilege access, consent records and auditability.
- No invented dashboard figures; data definitions and freshness are visible.
- Measured pilots, weekly feedback, and evidence-based iteration before scaling.
- Reliable migrations, backups, monitoring and operational playbooks before production data.

## 10. Suggested order of work

1. Founder validates one dealer workflow, one pilot package, roles, consent and exception rules.
2. Build the new customer and staff journeys as a clickable prototype, clearly labelled as a proposal.
3. Approve the parent-case model and PostgreSQL schema; write migrations and seed the pilot workflow.
4. Implement partner referrals, case/task timeline, uploads/reviews, role-scoped access and audit.
5. Operate a controlled pilot; measure baseline and outcomes.
6. Only after evidence and partner approval, add integrations, automation or AI assistance.

## Sources

- WeQ4UServices Vehicle Ownership Gap / WeBuyCars proposal, October 2026 (user-supplied confidential PDF; internal planning source).
- [BMW South Africa Customer Support](https://www.bmw.co.za/en/more-bmw/customer-support.html), Supplier Partnership Enquiry section.
- [Mercedes-Benz Group Suppliers](https://group.mercedes-benz.com/company/suppliers/).
