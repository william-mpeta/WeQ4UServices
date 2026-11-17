# Customer intake and tracking: first release

This release turns the documented service enquiry into a clearer customer journey and a staff-operable workflow. It is an MVP foundation; it does not claim that WeQ4U is a government agency or that government integrations are live.

## Customer journey

1. The customer selects one primary service. Courier collection and return delivery are optional add-ons, not services that replace the requested work.
2. The form asks the service-specific questions and shows a working document checklist. Existing files can be attached at enquiry time, with a visible upload status and remove action.
3. Missing checklist items do not prevent an enquiry. Staff confirm the applicable requirements before quoting or processing, especially where the business notes do not define a complete checklist.
4. The customer submits the enquiry and can use its reference to view the current status on the storefront.
5. Staff use the operations console queues to review incoming work, request missing items, prepare a quote, and advance fulfilment through explicit statuses.

The customer tracker presents five plain-language phases—request received, details checked, quote decision, work underway, and ready or complete. It shows the current status and the latest customer-facing update, not a predicted internal status. Detailed service events appear in the private timeline; staff-only status names and assignments are not used as customer instructions.

## Operational safeguards

- A request has exactly one primary service. The API validates this as well as the storefront.
- Document uploads use an allowlist, file-count/size limits, and private API storage; no public document links are presented to customers.
- Workflow statuses describe work state. Target dates are only surfaced when actually recorded; this release does not invent service SLAs.
- Queue and dashboard metrics are based on recorded requests. Revenue, payment, conversion, and satisfaction figures are not fabricated where the source data is absent.
- Courier availability and fees are confirmed before proceeding. Delivery is not promised as included or universally available.
- A checklist is operational guidance, not legal or government advice. The team verifies the current requirements for the customer's case.

## Deliberately deferred

Do not activate until the founder confirms the operating model and figures: customer prices and fee breakdowns, payment collection/refunds/reconciliation, service-specific SLA clocks, legal retention periods, government/partner integrations, automated document verification, AI recommendations, and automated completion-time estimates. Authority fees and WeQ4U service charges must remain distinct.

## Review before production

Confirm each checklist and service subtype with the founder and current authority guidance; validate customer and staff permissions; configure approved privacy/retention rules; and complete the PostgreSQL migration, production identity, backup, monitoring, and secure object-storage work described in the platform architecture.
