# Pricing engine and service catalogue

## Current behavior

- The API owns the service catalogue and versioned pricing profiles. Profiles are stored with the encrypted request store.
- Profiles are stored with the encrypted local request store. On first startup, if no pricing profile has previously been configured, the API seeds the documented price card once. Existing configured profiles are not overwritten.
- A new non-seeded profile starts as a draft with every amount unset. A blank value is not a zero charge.
- The founder, system administrator and Finance role can read or change pricing profiles; this supports the current two-person operating model while leaving a dedicated Finance role available for later.
- Finance must enter the base component amounts and explicitly confirm formal approval before activating a profile. Zero is accepted only as an explicit amount.
- Moving a request to **Quote Preparation** requires service validation and no outstanding document requests. Staff prepare a draft using the active profile and selected package; the draft snapshots a unique quote number, quote version, profile version, applied component amounts, notes, preparation date and expiry. An authorized approver must approve the draft, and staff must explicitly publish it before it appears in the customer's private tracking portal and the request advances to **Awaiting Customer Decision**. Drafting, approval and publication are distinct actions.
- Customers select Standard, Priority, Express or VIP Concierge during request intake. The API applies the active profile's configured package uplift, stores the package in the request, and includes the selected package and uplift in quote previews and snapshots. An unconfigured uplift blocks quoting.
- Collection and delivery charges apply only when that option was selected and a corresponding amount is configured. An unpriced selected option blocks quote generation.
- The customer sees the itemized component breakdown, total, notes, validity, and Accept / Decline controls in the tracking portal. They can download the published quote as a PDF or request a change; change requests return the case to **Quote Revision Required** for staff follow-up. Decisions require the current quote ID/version; declines also record a reason. Staff can see the component breakdown and decision history. Internal estimated costs are restricted to Finance.
- The Admin request workspace resolves the detected service and intake detail against its profile, and shows the profile ID, name, status, version, effective date, and any active alternatives. Quote Preparation previews the selected line items and total using the same API component selection as quote generation; a missing, inactive, ineligible, incomplete, or future-dated profile stays blocked with an explanation.
- Quote generation currently prices only the request's primary (first) service. For multi-service requests, Admin warns that other selected services are not included; staff should prepare separate quotes rather than assume the preview covers them.
- A generated quote is shown in Admin using the same customer-facing details as the private tracking portal: quote number/version, dates, itemized amounts, total, VAT treatment, notes, and decision state. It is the saved quote snapshot, not a recalculation from current prices.
- If an email address and configured Resend credentials are present, email is attempted as an additional notification. Unavailable or failed email does not block portal publication. Without SMS/email/WhatsApp, staff must separately share the private request reference with the customer; the portal cannot proactively alert them.
- Quote acceptance records the customer's decision only. Payment, gateway fees, settlement, refunds, and collected-revenue reporting are not implemented.
- The Admin pricing workspace shows a pricing master table with Standard/Priority/Express/VIP customer prices and the modeled 30% contribution. Its calculation preview is non-persisting and based on the current profile editor values; it does not create a request quote or override the API quote generator.
- Quote revisions retain previously published quote snapshots internally and advance the quote version. Publishing is blocked if the active profile has changed since approval; staff must prepare and approve a fresh draft.
- Customer quote issuance is additionally gated by the service registry: the exact variant must opt in and have a matching active profile. Driver’s Licence renewal is currently the only enabled variant, and remains provisional pending operational sign-off. Unapproved or unpriced variants are blocked and use the internal registry-review PDF; case-specific pricing is disabled.
- Quote valid-until dates default to 14 days after issue when omitted and must be 1–90 days after the current date. Expired and decided quotes remain downloadable only when their stored quote snapshot passes the registry and pricing-snapshot checks.

## Component and reporting rules

Profiles contain government, processing, platform, convenience, payment, optional courier and package uplift components. Legacy service and administration fields are retained for existing profile data but are not part of the current price card. Values use integer cents in ZAR, avoiding floating-point calculation errors. Each component may also have an optional estimated direct cost. Quote snapshots preserve the profile version, package, VAT treatment, effective-from date, customer amounts, and available cost estimates. New local profiles default to the current local date, and quote generation is blocked until a future effective-from date.

Finance reporting is explicitly limited to engine-generated quoted amounts and the modeled 30% contribution assumption. It does not label quotes as collected revenue. A configured payment fee is included in the quote as a proposed charge, but quote acceptance does not collect or confirm payment; no payment gateway, settlement or reconciliation is connected.

The Commercial Pricing Model PDF is a business reference, not a runtime dependency. `apps/api/src/pricingSeedData.js` holds the extracted values from pages 3 and 12; the seed schema is version 2 and its migration upgrades only known version-1 seed profiles. The extracted standard prices are:

| Service from the price card | Government | Processing | Platform | Convenience | Payment | Standard total |
|---|---:|---:|---:|---:|---:|---:|
| Driver's Licence Renewal | R228 | R110 | R57 | R45 | R10 | R450 |
| PrDP Application | R260 | R200 | R90 | R80 | R20 | R650 |
| Vehicle Licensing (Annual Disc) | R156 | R100 | R50 | R34 | R10 | R350 |
| Change of Ownership | R131 | R190 | R95 | R74 | R10 | R500 |
| Traffic Register | R62 | R95 | R45 | R40 | R8 | R250 |

The PDF also specifies +R150 Priority, +R300 Express and +R500 VIP Concierge. Those configured uplifts are applied when a customer selects the matching package. No standalone courier price is specified, so selected collection/delivery options still block quote generation until configured.

The price card does not provide prices for Learner Licence, a new Driver's Licence, PrDP Renewal, new vehicle registration, duplicate documents or roadworthy booking. Those remain unpriced and are blocked from quoting. Although other seed profiles exist, the registry currently enables customer quotations only for Driver's Licence Renewal. PrDP Application and other seeded profiles are not customer-quote enabled until the registry and operations approvals are completed. Driver's Licence Renewal and PrDP Application seeds are restricted to the matching intake choice; their prices are not applied to new/learner requests or PrDP renewals. Vehicle Licensing (Annual Disc) does not price new vehicle registration. VAT treatment was set to “not applicable” for this local demo based on the founder's prior selection; the PDF itself does not state VAT treatment, so confirm with the accountant before staging.

## Catalogue metadata still requiring approval

Turnaround is unset and document policy is case-specific in the catalogue. Existing intake checklists and service validation remain authoritative; this catalogue does not invent document requirements or service promises. Configure approved service-specific turnaround and document rules before treating the catalogue as the source for those operational decisions.

## API surfaces

- `GET /api/catalogue`: customer-safe service metadata and an approved base starting price, when available.
- `GET /api/admin/pricing-profiles`: authorized pricing-role component configuration and profile versions.
- `GET /api/admin/requests`: authorized request data includes `pricingResolution` and `quoteReadiness` diagnostics for staff quote preparation.
- `PATCH /api/admin/pricing-profiles/:serviceId`: authorized pricing-role profile save/activation.
- `GET /api/admin/finance/summary`: Finance, founder or system administrator quoted totals and estimated margins; payment reconciliation is marked not connected.
- `POST /api/admin/requests/:ref/quote-draft`: prepare a quote draft from the active profile and current package.
- `POST /api/admin/requests/:ref/quote-draft/approve`: approve a prepared draft for publication.
- `POST /api/admin/requests/:ref/quote-draft/publish`: publish an approved draft to the private customer portal.
- `GET /api/requests/:ref/quote.pdf`: download the published quote after private request access is verified.
- `POST /api/requests/:ref/quote-change`: record a customer change request and return the case to staff review.
- `GET /api/admin/requests/:ref/registry-review.pdf`: authorized internal review document for variants that are not enabled for customer quotes.

Manual quote amounts are no longer accepted by the request-update API. Existing saved quote amounts remain readable for historical requests, but historical synthetic/manual quotes do not bypass current customer PDF eligibility checks.
