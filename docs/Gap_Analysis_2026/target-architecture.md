# WeQ4UServices Target Architecture

**Status:** Proposal for founder review. This describes a future target, not the current prototype.

## Application boundary

The public customer storefront, request flow and self-service tracking are hosted by the existing storefront at `http://localhost:3000`. Every staff-facing function belongs in the existing admin application at `http://localhost:3001`: call-centre, back-office work queues, finance, compliance, supervisor tools, management dashboard and technical administration. These are role-aware modules of one application, not separate portals. The API remains a backend service. See the [Digital Service Fulfilment Platform blueprint](digital-service-fulfilment-platform.md).

## 1. Product boundary

WeQ4UServices is a Gauteng transport-document service business. The platform supports the work the founder currently performs manually: receive a request, clarify the service and documents, quote, process the paperwork, coordinate collection/delivery, and keep the customer informed.

The system does not assume that a licensing department exposes an online booking API. Government integration is a future capability that requires an identified official interface, written authorization, technical documentation, and a test environment.

## 2. Recommended evolution

Start with a modular application and a managed database. Do not begin with microservices. Preserve domain boundaries in the existing Express API so database, storage, notifications, payments, and any later government connection can be changed independently.

```text
Customer browser                         Staff browser
  Public website                           Admin request desk
        |                                         |
        +--------------- HTTPS ------------------+
                          |
                 WeQ4U application API
          +---------------+----------------+
          |               |                |
   Request domain    Staff identity   Integration adapters
          |               |          email / payment / future
          +-------+-------+          official booking channel
                  |
       Supabase PostgreSQL
       private Supabase Storage
```

## 3. Proposed stack

- Web: existing React + Vite storefront and admin apps.
- API: existing Express API remains the only application boundary for customer requests and staff mutations.
- Database: Supabase Postgres, accessed by the API using a server-side Supabase client or a restricted database role.
- Staff identity: Supabase Auth for staff only. Customers continue using a reference number; do not create customer accounts until a validated need exists.
- Documents: private Supabase Storage bucket. Store object paths and metadata in Postgres, never public URLs.
- Notifications: provider adapter backed by an outbox table; Resend may be used after sender verification.
- Payments: separate provider adapter after the founder chooses a provider, opens a merchant account, and approves the payment/refund process.
- Future licensing connection: isolated adapter with a manual fallback and a feature flag; enable only after official authorization.

## 4. Security boundaries

- Treat the public website and all customer-submitted values/files as untrusted.
- The Supabase service-role key and database credentials exist only in the API environment. Never expose them in `VITE_*` variables or browser bundles.
- Use Supabase Auth for staff and verify the staff JWT and role in the API on every privileged route.
- Enable Row Level Security on tables. Deny direct anonymous access to requests, quotes, status events and staff data.
- Use a private Storage bucket. The API authorizes each upload/download and issues short-lived signed URLs only when necessary.
- Validate actual file signatures as well as content type, enforce file/count limits, use randomized object names, and plan malware scanning before production uploads.
- Keep consent notice version and timestamp with each request. Collect the minimum data required for the task, define retention periods, and implement a deletion/export process approved by the founder and privacy adviser.
- Keep access and mutation audit events. Never put ID numbers, identity-document contents, card data, or secrets in application logs.
- Configure HTTPS, secret rotation, database backups, restore drills, monitoring, rate limits and incident response before public launch.

## 5. Domain boundaries

1. **Service catalogue:** approved service descriptions and founder-confirmed document checklists.
2. **Service requests:** requester contact snapshot, chosen services, Gauteng location, consent, courier choice and reference.
3. **Documents:** private object metadata and controlled storage operations.
4. **Workflow:** status transitions and immutable status history.
5. **Quoting:** quote versions and line items; no prices are calculated until the founder supplies an approved pricing model.
6. **Communications:** email/WhatsApp notification attempts with retry and delivery state; no secrets or sensitive attachments in ordinary email by default.
7. **Payments:** future payment records and provider references, separate from quote calculation.
8. **External bookings:** future authorized licensing-office adapter, external reference IDs and reconciliation state. The first release remains staff-assisted/manual.

## 6. Environments and delivery

- Create separate Supabase projects for development, staging and production. Do not point development builds at production data.
- Store credentials in local ignored `.env` files for development and deployment-platform secrets for hosted environments.
- Manage schema changes through checked-in Supabase CLI SQL migrations. Review migrations in pull requests; do not make undocumented dashboard-only production changes.
- Seed only the eight approved service records. Keep unconfirmed checklists in draft until the founder approves them.
- CI should run dependency install from the lockfile, tests, build and lint. Deploy staging first; require founder sign-off before production.
- Before database cutover, decide whether prototype request records are only test records. If real personal data was entered, plan a controlled, verified migration and deletion of the local copy rather than copying files casually.

## 7. Decisions to make with the founder

1. Walk through one normal request for each service, including required documents and exceptions.
2. Confirm who may quote, approve a quote, mark a request submitted, and release documents.
3. Define quote components: service fee, courier fee, office/statutory costs, expiry and payment terms.
4. Confirm customer update channels, callback hours, refund/cancellation rules and complaint handling.
5. Approve retention periods and the privacy notice wording with appropriate privacy/legal advice.
6. Confirm which Gauteng areas are serviceable and what happens outside those areas.
7. Identify the exact licensing authority/process and ask the department about an official integration or booking partner. Request written authorization, API documentation, credentials, sandbox, rate limits and support contacts before designing a production connector.

## 8. Delivery phases

- **A. Process discovery:** map the founder's current manual steps, decisions, documents and exceptions.
- **B. Data design:** review the ERD and DFD with the founder; approve statuses, access roles, consent and retention.
- **C. Supabase foundation:** create isolated projects, migrations, Auth/RLS and private Storage policies.
- **D. API migration:** replace local encrypted JSON/file storage with repository interfaces backed by Supabase; test migration and rollback.
- **E. Business integrations:** enable verified email and agreed payments; preserve manual fallbacks.
- **F. Government feasibility:** pursue official authorization and sandbox access. Implement an adapter only after the interface and permitted use are confirmed.
- **G. Production readiness:** accessibility/security review, backup restore test, operational training, domain/HTTPS and staged launch.

## 9. Current prototype boundary

The existing application persists requests in an encrypted local JSON file and documents in a local encrypted folder. This is for development and workflow assessment only. It is not the proposed production database or document-storage architecture.
