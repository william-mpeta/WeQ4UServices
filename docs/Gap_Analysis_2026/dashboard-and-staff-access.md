# Management dashboard and staff access

## Dashboard scope

The admin console at `http://localhost:3001` now has an executive management cockpit based on request records in the current encrypted local development store. It refreshes every 30 seconds and also has a manual refresh control. The dashboard supports date range and department filters, request queue drill-throughs, print/save-to-PDF, and CSV export where the staff role permits it.

Metrics are deliberately sourced from recorded facts:

- Incoming and completed counts use request creation and last-update timestamps.
- Backlog, workflow stages, unassigned work, and bottlenecks use current request status and assignment fields.
- The quote pipeline sums open request quote amounts. It is an indicative pipeline, not collected revenue.
- Past-target alerts use a request target date if staff recorded one. A target date is not an approved SLA.
- Intake source and assigned workload appear only where those values have been recorded.
- SLA compliance, average resolution, customer satisfaction, payment risk, and collected revenue remain unavailable until their policies and source records are implemented.

The dashboard does not create demo activity or financial values. A zero means no matching record was found in the selected scope. “Not configured” means the required policy or source data does not exist yet.

## Operations Intelligence presentation

The staff workspace uses a navy and teal visual theme, rounded KPI and report cards, a workflow pipeline ahead of the analytics panels, grouped navigation to existing dashboard and request queues, and selectable request cards. These are presentation changes only: queue groups, KPI calculations, report data, API calls, permissions, and available request actions remain unchanged. Sidebar shortcuts lead only to dashboard views or existing queue filters; payment processing and separate document-review or audit modules are not implemented by this visual update.

## Staff roles

API access is role-checked. Configure unique random tokens in the API environment (the API's `.env` file, not the Vite browser environment):

| Environment key | Display identity | Permission outline |
|---|---|---|
| `SYS_ADMIN_API_TOKEN` | Lebo Mpeta — System Administrator | Dashboard, request operations, documents, exports, system administration |
| `FOUNDER_API_TOKEN` | William Mpeta — Founder | Dashboard, requests, documents, quotes, operations, exports |
| `SUPERVISOR_API_TOKEN` | Supervisor — Back-office Supervisor | Dashboard, requests, documents, assignments/targets, exports |
| `BACKOFFICE_API_TOKEN` | Back-office Team — Back-office Officer | Dashboard, request work and document access; cannot change quote values or assignments |
| `CUSTOMER_SUPPORT_API_TOKEN` | Customer Support Team — Customer Support | Dashboard and request/customer updates; document contents and exports are denied |

The existing `ADMIN_API_TOKEN` remains a development compatibility credential and resolves to the system administrator. Remove it after individual credentials are configured. Tokens should be unique, generated randomly, and never committed to source control. Restart the API after changing environment configuration. The browser holds the entered token in session storage only.

These are role-specific bearer credentials, not individual accounts. The prototype still lacks staff identity lifecycle, MFA, per-person sessions, department-scoped record filtering, and immutable audit events. Do not treat these local tokens as production identity management.

For the current two-person setup, configure separate values for `SYS_ADMIN_API_TOKEN` and `FOUNDER_API_TOKEN` in `apps/api/.env`. Choose **System administrator** or **Founder** from the sign-in dropdown, then enter that profile's token. The API verifies that the token matches the selected profile; the dropdown itself does not grant access. Sign out before another person uses the same browser session. This is separate role access, not yet username/password accounts or an in-console user manager.

## Outstanding platform requirements

The following remain future implementation work because this workspace does not yet have the required providers, policies, database, or business decisions:

- PostgreSQL as the source of truth, versioned migrations, task/event tables, reporting views, and backup/restore procedures.
- Configured SLA calendars, approved service targets, pause rules, escalation tiers, and scheduled SLA evaluation.
- Payment checkout, provider callbacks, reconciliation ledger, refunds, verified receipts, and revenue reports. No payment is taken by this prototype.
- WhatsApp Business integration, template approval/consent, inbound webhook, outbox worker, SMS provider, and automated reminders.
- Malware scanning, private object storage, document review decisions, document-access audit, retention schedule, legal holds, and purge workflow. Current local upload encryption is not a replacement for those operational controls.
- Customer satisfaction capture and reporting, staff capacity targets, and conversion cohorts.
- Individual staff accounts, MFA, role administration UI, least-privilege department scope, and immutable audit review.
- A true Excel workbook export and generated PDF report. CSV export and browser print/save-to-PDF are provided for the current slice.

Payment work remains deferred until the business pricing and collection model is approved. No financial provider or production integrations are implied by the dashboard.
