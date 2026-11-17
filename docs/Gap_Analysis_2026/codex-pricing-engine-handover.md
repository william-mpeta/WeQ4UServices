# Codex Handover: Pricing Engine and Quote Lifecycle

## Status at handover

The pricing/quote work is in progress. The API tests, full workspace build, and full workspace lint/type-check have now completed successfully. No commit was created.

## What has been covered

### PDF review

- The Quote Lifecycle Engine and Commercial Pricing Model PDFs are image-only; PDF.js alone returned no text.
- Both were rendered and OCR-extracted locally with Node.js using PDF.js, `@napi-rs/canvas`, and Tesseract.js. The temporary packages and extracted text are in the Copilot session folder, not the application dependencies.
- Commercial-model values represented in the existing seed data:
  - Driver's Licence Renewal: R450 Standard
  - PrDP Application: R650 Standard
  - Vehicle Licensing (Annual Disc): R350 Standard
  - Change of Ownership: R500 Standard
  - Traffic Register: R250 Standard
  - Package uplifts: +R150 Priority, +R300 Express, +R500 VIP Concierge
- The OCR output is imperfect, especially in tables. The seed data and [pricing engine workflow documentation](../workflows/pricing-engine.md) already preserve the extracted component-level prices and the services that must remain unpriced.

### Existing lifecycle work carried forward

- Pricing profiles and quote calculations are API-owned, versioned, and stored with the encrypted local request store.
- Customers select a package. A quote is prepared as a draft, approved separately by an authorized approver, and explicitly published.
- Customer quote preview, PDF download, accept/decline, quote-change handling, and quote-version checks already existed.
- The 30% contribution rate is a planning assumption, not audited margin or collected revenue.

### Changes made in this continuation

- Added a protected `POST /api/admin/pricing-preview` endpoint. It uses the API pricing resolver and returns the price breakdown, modeled contribution, and estimated gross margin only when Finance-entered costs are complete.
- Extended the Admin Pricing workspace with Overview, Pricing Matrix, Revenue Breakdown, and Services Simulator tabs. Package prices and contribution values in the matrix are supplied by the API; the simulator does not create a request or quote.
- Added quote conditions and customer-required-document lists to draft creation, with input limits. These values are stored in the quote snapshot and shown in Admin, customer tracking, and the downloadable quote PDF.
- Updated quote PDF generation to paginate longer quote content.
- Quote drafts created through the API now receive sequential `QYYYY-0001`-style numbers under the existing store lock. Superseded drafts are retained internally so their assigned numbers are not reused.
- Replaced the old integration-test path that directly generated a quote with draft → approval → publication.
- Added integration assertions for the pricing simulator, quote terms, PDF content, and sequential numbering.

Files changed for these items:

- [API pricing logic](../../apps/api/src/pricing.js)
- [API routes and quote persistence](../../apps/api/src/index.js)
- [Quote PDF generator](../../apps/api/src/quotePdf.js)
- [API integration tests](../../apps/api/test/requests.test.js)
- [Admin workspace](../../apps/admin/src/App.tsx)
- [Admin styles](../../apps/admin/src/styles.css)
- [Customer tracking page](../../apps/storefront/src/RequestFlow.tsx)

## Important workflow and business guardrails

- The Dashboard TechSpec is a presentation-only guide and says not to alter lifecycle states, transitions, permissions, audit behavior, or reporting definitions.
- The quote PDF asks acceptance to move into “Awaiting Payment,” but payments are not integrated. The current workflow records acceptance as **Quote Accepted** and routes it to **Payment Setup Required**; it does not claim that funds were collected or allow payment-dependent fulfilment. This handover deliberately leaves that behavior unchanged.
- The Admin revenue figures remain quoted amounts and modeled contribution. Collected revenue and reconciliation are unavailable until a payment provider and settlement process are implemented.
- The current quote generator prices the request's primary service only. Multi-service aggregation is not implemented.
- Existing request history records quote-related audit events. A separate QuoteEvent database model was not introduced; current storage is the encrypted local request store, and the Dashboard TechSpec protects existing audit behavior.
- Profile versions are per service; there is no invented global pricing version.

## Validation state

- Before the latest Pricing workspace and quote-field changes, `npm test --workspace apps/api` passed all 17 tests after the legacy integration scenario was corrected.
- After the latest changes, `npm test --workspace apps/api` passed all 17 tests.
- `npm run build` passed for API, Storefront, and Admin.
- `npm run lint` passed API syntax checks and Storefront/Admin TypeScript checks.
- No browser-level manual validation was run after adding the Pricing workspace tabs.

## Recommended next actions for Codex

1. Update [pricing engine workflow documentation](../workflows/pricing-engine.md) to describe the new tabs, API simulator, sequential quote numbering, and quote conditions/documents; it currently describes the older profile-editor preview.
2. Manually check the Admin Pricing workspace and a published customer quote in the browser. The shared Admin page currently shows staff sign-in; use authorized local demo credentials only.
3. Keep payment integration, collections/reconciliation, and any workflow transition to Awaiting Payment blocked pending founder/provider decisions and an approved workflow change.
