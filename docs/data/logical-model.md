# Logical Data Model

**Status:** Draft for founder review; not yet a production schema.

## Core entities

| Entity | Purpose | Key relationship |
|---|---|---|
| Service type | Approved public/operational service catalogue | One service type has many request-service records and checklist versions |
| Service request | One customer enquiry/work item with a generated reference and contact snapshot | Contains one or more request-service records and many events, files and quote versions |
| Request service | One selected service within a request, including that service's intake answers | Belongs to one request and one service type |
| Consent event | Evidence of the privacy notice/version and affirmative action | Belongs to a request; append-only |
| Checklist version/item | Founder-approved document rules with effective dates and required/optional semantics | Version belongs to a service type; each submitted file may reference an item |
| Request document | Metadata and private object path for an uploaded/returned file | Belongs to one request and optionally one request-service/checklist item |
| Workflow status/event | Current state and append-only record of each allowed transition | Event belongs to a request and actor where applicable |
| Quote/quote line/quote decision | Versioned offer with separated cost categories and decision history | Request has ordered quote versions; each version contains one or more lines |
| Staff profile/role/permission | Authenticated staff and server-side authorization model | Staff may hold multiple roles; roles grant permissions |
| Department/assignment | Operational ownership and workload | Request may have multiple dated assignments; one may be active at a time |
| Notification outbox | Retryable delivery work without losing a request if a provider is unavailable | References the triggering request/event and tracks attempts |
| Audit event | Who changed/accessed a sensitive business record and when | Actor may be a staff member or a system process |

## Deliberate omissions from the core

- **Customer account/profile:** no customer login is needed for the current reference-based flow. Avoid identity matching across requests until renewal reminders or self-service accounts have a validated consent and identity model.
- **Payment method/card data:** never store card credentials. Payment transactions, receipts, reconciliation and refunds are a separate later design after merchant onboarding and payment timing are approved.
- **Government booking tables/integration:** appointments can initially be captured as internal work details. Add an external-booking entity only when an official interface and written authorization are known.
- **Revenue summary tables:** derive reports from approved quote line categories and reconciled payment records; do not store a second editable total that can drift from source transactions.
- **Fixed SLA targets:** store targets only after the founder defines service-specific working calendars, pause conditions and what event starts/stops the clock.

## Data rules

- Requests and quotes are not deleted when corrected; preserve change events and apply an approved retention/deletion policy to personal data and file objects.
- Request services are unique per `(request_id, service_type_id)` unless discovery shows customers can open multiple cases of the same service under one reference.
- Money is integer minor units (cents), currency is explicit, and quote lines distinguish handling, authority/statutory, third-party and courier categories.
- Service answers are structured JSON only as a transition format; define versioned typed fields per service before reporting on answer values.
- Every uploaded file has an approved label and storage object path. Never use an original filename as the storage key.
- Current status is a convenient projection; status events are the audit history and reporting source.

## Decisions needed before migration

1. Confirm request granularity: one reference with multiple services or one reference per service.
2. Approve the status names, transition graph, customer-visible subset and cancellation/rejection handling.
3. Approve service checklist versions and document retention/deletion periods.
4. Decide whether address is collected on enquiry or only when courier work is accepted.
5. Approve quote line categories, VAT treatment, expiry, approval and acceptance evidence.
6. Decide staff roles, department structure, assignment rules and access to document contents.
7. Confirm which prototype rows/files are synthetic. If actual personal data exists, decide controlled migration or secure disposal before cloud cutover.
8. Agree data region, hosting, backups, restore objectives and incident process with the project owner and appropriate privacy/security advisers.
