# Cursor Agent Handover: WeQ4U Pricing Workspace

**Recipient:** Cursor Agent (Grok 4.7)  
**Project:** `C:\Users\Admin\OneDrive\Desktop\DevOPS_Projects2026\WeQ4UServices`  
**Primary UI:** `http://localhost:3001`  
**Purpose:** Continue visual/UX comparison and implementation from the supplied enhancement references. This is a handover, not permission to change protected business rules.

## Instruction for GitHub Copilot

> Create and maintain this Markdown handover for Cursor Agent (Grok 4.7). First read the existing pricing engine documentation, current code and tests, then inspect every image in `C:\Users\Admin\OneDrive\Documents\WeQ4UServices\DevOps-Progress2024\Admin-Console-Development2026\Enhancements-Matrix` and the screenshots attached to the chat. Describe what exists, the visible design gaps, relevant components/API, business-rule and permission boundaries, validation results, and remaining work. Separate observed facts from recommendations and assumptions. Do not implement application changes as part of writing or revising the report; do not invent prices, margins, VAT rules, statuses, permissions or payment capabilities. Use this file as the transfer brief for Cursor and update it only when verified facts change.

## Owner's goal

Make the Finance Pricing Workspace understandable to Founder, Finance and Operations staff, and bring `localhost:3001` into alignment with the supplied pricing and customer-tracking reference screenshots. Preserve the existing quote engine, customer journey, access controls and audit behavior unless an explicitly approved requirement calls for a tested change.

## Reference screenshots

The inspected screenshot directory currently contains:

`C:\Users\Admin\OneDrive\Documents\WeQ4UServices\DevOps-Progress2024\Admin-Console-Development2026\Enhancements-Matrix`

- `Pricing-profiles.PNG`
- `PrDp-Pricing.PNG`
- `Change_of_Ownership.PNG`
- `Vehicle-Licensing.PNG`
- `Traffic Register.PNG`
- `Customer-Tracking.PNG`
- `Customer-Tracking2.PNG`

The attached screenshots show a dark-green pricing navigation, package columns with total and modeled contribution, expandable per-service calculations with fee lines and package selection, and a customer tracker with a simple progress strip, quote summary/actions, customer action items, supplied documents and timeline. Treat these as visual/product references, not authority to replace validated workflow rules.

## Current implementation to inspect

- [Admin Pricing workspace](../../apps/admin/src/App.tsx): Overview, Pricing Matrix, Revenue Breakdown and Services Simulator were added; profile editing remains in the pricing workspace.
- [API pricing engine](../../apps/api/src/pricing.js) and [API routes](../../apps/api/src/index.js): central profile resolution and amount calculations; protected profile and preview APIs; quote draft/approval/publication lifecycle.
- [Storefront tracker](../../apps/storefront/src/RequestFlow.tsx): simplified five-step progress, private tracking, quote display, PDF download, accept/decline/change actions, document and customer-task sections.
- [Quote PDF generator](../../apps/api/src/quotePdf.js): published quote snapshot PDF, including line items and optional terms/documents.
- [Pricing rules and seed values](../workflows/pricing-engine.md).
- [Prior Codex implementation/validation handover](./codex-pricing-engine-handover.md).
- [Founder explanation of price components](./pricing-profile-founder-guide.md).
- [Customer Tracking readiness assessment](./customer-tracking-readiness-assessment.md): read-only inventory of existing tracking features, screenshot gaps, estimates and recommended sequence.

Do not assume the browser currently displays the post-change Admin page; the shared browser previously showed staff sign-in. Use authorized local demo credentials only.

## Actual pricing terms to preserve

- Current seeded Standard price-card components sum to: Driver's Licence Renewal R450; PrDP Application R650; Vehicle Licensing (Annual Disc) R350; Change of Ownership R500; Traffic Register R250.
- The package amounts are additive uplifts: Priority +R150, Express +R300, VIP Concierge +R500. Standard has no uplift.
- The known component breakdowns are in `docs/workflows/pricing-engine.md`; never substitute illustrative numbers from a mockup or the pasted example.
- Government fees are pass-through amounts in the commercial model, not WeQ4U revenue. Other listed components are price-card lines; their labels do not prove measured labour cost or processor fees.
- “Contribution” is currently modeled as 30% of quote total, a planning assumption, **not audited margin or profit**. Show estimated gross margin only when Finance-entered direct costs support it, and label that estimate.
- Payment-fee amounts are proposed quote lines. There is no live gateway, payment confirmation, settlement or reconciliation.
- No approved price is present for every service/variant. Keep unpriced profiles blocked; do not infer a rate or treat blank as zero. Collection/delivery options require an explicitly configured price.
- VAT treatment in the local demo is “not applicable”; the commercial PDF does not approve this tax treatment. Confirm with the accountant before staging.

See the founder-facing [pricing profile guide](./pricing-profile-founder-guide.md) for precise explanations of Government, Processing, Platform, Convenience, Payment and package components.

## Quote and workflow guardrails

- API remains the single source of quote prices. Do not duplicate price calculations in React.
- Quote lifecycle is **draft → separate authorized approval → explicit publication**. The customer can only decide on a published quote; decline requires a reason; change requests return to staff for revision.
- Quote numbers are sequential `QYYYY-0001` style. Quotes snapshot their profile version and amounts; changing current profile data must not silently change a published quote.
- Customer acceptance records acceptance only. Current handling remains **Quote Accepted / Payment Setup Required**; do not claim “Awaiting Payment” means payment is enabled or start fulfilment without verified payment.
- Current quote generation supports the primary service only. The UI warns when more than one service is requested; do not imply a combined multi-service total.
- Preserve existing roles, privacy gates, encrypted storage, customer-reference access policy, quote-decision version checks and request-history/audit writes.
- The Dashboard TechSpec (`WeQ4UDashboard-Copilot-TechSpec.md` in the reference folder) is explicitly styling/layout guidance and prohibits unapproved workflow, permission, report, API and audit changes.

## Work still to do

1. Compare each reference image with the actual authorized Admin Pricing page at `localhost:3001`, at desktop and mobile widths. Record specific differences before editing.
2. Verify tab semantics, visual hierarchy, package matrix readability, active version/effective date, profile eligibility/status, calculation panel and simulator errors/empty states.
3. If implementing the screenshot's expanded breakdown, keep the line amounts and total supplied by API pricing data. Clearly distinguish component costs from customer charges, model contribution, pass-through fees and package uplift. Do not invent a “handling cost” from screenshots.
4. Use the [Customer Tracking readiness assessment](./customer-tracking-readiness-assessment.md) as the starting inventory, then compare the customer screenshots against the current tracker: quote summary/actions, response actions, documents, customer tasks, timeline and simple progress indicators. Preserve customer-safe wording and reference privacy. The assessment is code-inspection only; it is not proof of visual alignment.
5. Update [pricing engine workflow documentation](../workflows/pricing-engine.md) if verified behavior changes; it currently describes an earlier profile-editor preview in places.
6. Add/update tests for any behavior changes and rerun checks listed below. Perform browser verification; a successful build does not prove screenshot alignment.
7. Leave unresolved founder/accountant/provider choices explicitly listed rather than choosing defaults on their behalf.

## Baseline verification from Codex

After the latest changes:

- `npm test --workspace apps/api` — passed, 17 tests.
- `npm run build` — passed for API, Storefront and Admin.
- `npm run lint` — passed API syntax and Storefront/Admin TypeScript checks.
- Browser verification of the latest Pricing tabs/screenshots was **not** completed.
- `docs/workflows/pricing-engine.md` needs a follow-up documentation update to fully describe the new tabs, server-side simulator and recent quote fields.

Re-run tests/build/lint after any change. Do not commit unless the project owner asks.

## Out of scope without approval

Payment gateway, real collections/reconciliation, settlement/refunds, global pricing version, a separate QuoteEvent database/schema, multi-service quote aggregation, new quote workflow states/transitions, changing role permissions, and applying assumed VAT or cost allocations.
