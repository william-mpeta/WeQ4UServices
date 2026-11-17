# WeQ4UServices DFD and Workflow Proposal

**Status:** Draft for founder review. These flows describe the intended managed-platform design, not the current local-file prototype.

## 1. DFD Level 0: context

```mermaid
flowchart LR
    C[Customer / requester]
    S[WeQ4UServices staff]
    W[Public website and request form]
    A[Staff request desk]
    API[WeQ4U application API]
    DB[(Supabase Postgres)]
    FS[(Private Supabase Storage)]
    N[Email / WhatsApp providers]
    PG[Payment provider - future]
    GOV[Licensing department or authorized booking partner - future]

    C -->|service enquiry, contact details, consent, optional documents| W
    W -->|validated request over HTTPS| API
    S -->|authenticated staff actions| A
    A -->|verified staff API requests| API
    API <-->|requests, quotes, status history| DB
    API <-->|private object upload/download| FS
    API -->|status and quote notifications| N
    API <-->|payment initiation and result| PG
    API <-->|authorized booking request and confirmation| GOV
```

Payment and government connections are future flows. Do not activate them based only on assumptions or public-page behavior.

## 2. DFD Level 1: service request

```mermaid
flowchart TB
    subgraph TB1[Untrusted public internet]
        C[Customer]
        WEB[React public website]
    end
    subgraph TB2[Application trust boundary]
        API[Express API]
        VALIDATE[Validate consent, service, contact, area and file]
        REQUEST[Create request and reference]
        AUTH[Verify staff identity and role]
        NOTIFY[Write notification outbox item]
    end
    subgraph TB3[Supabase project]
        DB[(Postgres with RLS)]
        STORAGE[(Private document bucket)]
        AUTHDB[Supabase Auth]
    end
    STAFF[Authorized staff]
    MAIL[Verified email provider]

    C -->|request fields and chosen services| WEB
    C -->|optional documents using protected upload flow| WEB
    WEB -->|HTTPS: multipart request| API
    API --> VALIDATE
    VALIDATE -->|valid request| REQUEST
    REQUEST -->|request, selected services, consent event| DB
    REQUEST -->|opaque private object paths| STORAGE
    REQUEST --> NOTIFY
    NOTIFY -->|queued notification| DB
    DB -->|request reference and current status only| API
    API -->|minimal tracking response| WEB
    STAFF -->|credentials| AUTHDB
    STAFF -->|authorized admin action| API
    API --> AUTH
    AUTH -->|read/update request, quote, status event| DB
    AUTH -->|authorize each file operation| STORAGE
    NOTIFY -->|retryable message without document attachment| MAIL
```

## 3. DFD Level 1: quote and service processing

```mermaid
flowchart LR
    R[(Service request)] --> REVIEW[Staff reviews request]
    REVIEW -->|missing information| CONTACT[Call, email or WhatsApp customer]
    CONTACT --> UPDATE[Record clarification / request note]
    UPDATE --> R
    REVIEW -->|scope and fees confirmed| QUOTE[Create versioned quote]
    QUOTE --> SEND[Send quote through approved channel]
    SEND --> DECISION{Customer decision}
    DECISION -->|declines or asks a question| DISCUSS[Staff records decision and follows up]
    DECISION -->|accepts and payment method is confirmed| PROCESS[Process documents]
    PROCESS -->|status transition + actor + timestamp| HISTORY[(Status event history)]
    PROCESS -->|ready for return| COURIER[Arrange collection / delivery]
    COURIER --> DELIVERED[Mark Delivered]
    DELIVERED --> HISTORY
    DISCUSS --> QUOTE
```

This is a manual-assisted business flow until payment, courier and official licensing interfaces are approved and configured.

## 4. DFD Level 2: optional official booking integration

```mermaid
flowchart LR
    API[WeQ4U API] --> POLICY{Written authorization, documented API and sandbox?}
    POLICY -->|No| MANUAL[Staff performs existing approved manual process]
    POLICY -->|Yes| ADAPTER[Government booking adapter]
    ADAPTER --> AUTH[Official authentication / credentials]
    AUTH --> DEPT[Official licensing endpoint or authorized provider]
    DEPT -->|booking ID, status, rejection reason| ADAPTER
    ADAPTER -->|redacted result and correlation ID| DB[(Supabase request / booking record)]
    ADAPTER -->|temporary outage or rejected request| MANUAL
```

Never screen-scrape, automate staff portals, reuse personal credentials, or send customer documents to an unofficial endpoint without explicit permission and a security/privacy review.

## 5. DFD Level 2: request review, quote and fulfilment

```mermaid
flowchart TB
    CUSTOMER[Customer]
    STAFF[Assigned staff]
    API[Application API]
    REQ[(Requests and selected services)]
    CHECK[(Approved checklist versions)]
    DOC[(Private document store and metadata)]
    QUOTE[(Quote versions, lines and decisions)]
    STATUS[(Status events and assignments)]
    OUTBOX[(Notification outbox)]

    CUSTOMER -->|service answers, consent, optional labelled files| API
    API -->|validate fields, files and service keys| VALID{Valid?}
    VALID -->|No: field-level error| CUSTOMER
    VALID -->|Yes: create reference| REQ
    API -->|store encrypted/private file and metadata| DOC
    REQ --> STAFF
    CHECK --> STAFF
    STAFF -->|review file, mark accepted/rejected/request replacement| API
    API -->|review outcome| DOC
    API -->|clarification/document request event| STATUS
    API -->|queue message without sensitive attachment| OUTBOX
    OUTBOX -->|approved channel| CUSTOMER
    STAFF -->|confirm scope and create quote lines| API
    API -->|append quote version| QUOTE
    API -->|queue quote notification| OUTBOX
    CUSTOMER -->|accept/decline through confirmed channel| STAFF
    STAFF -->|record decision; authorize next step| API
    API -->|decision and allowed transition| QUOTE
    API -->|status transition and assignment| STATUS
    STATUS --> STAFF
    STAFF -->|manual office/appointment work and completion evidence| API
    API -->|progress and final status events| STATUS
```

This process is staff-assisted. The customer acceptance channel, payment point, service-specific appointment steps and completion evidence must be confirmed per service before automating transitions.

## 6. Operational workflows to validate with the founder

For each of the eight services, sit with the founder and document:

1. How a request currently arrives and what information is collected first.
2. Which documents are genuinely required, optional, or only requested later.
3. How the founder decides eligibility, area coverage, price and expected timing.
4. Which office/third party is contacted and who performs each action.
5. What happens when documents are missing, a request is rejected, an office is delayed, a quote is declined, or a courier fails.
6. What proof of submission/completion is returned and how long records must be retained.
7. Who can view documents, issue/approve quotes, change statuses, and respond to complaints.

Keep approved customer wording and draft internal procedures separate. Mark every unconfirmed checklist, fee or service promise as draft rather than publishing it.

## 7. Supabase setup order

1. Create separate development and production Supabase projects; add staging if the team will test releases with realistic workflows.
2. Confirm data region and POPIA/data-transfer considerations with the project owner and an appropriate adviser before choosing production location.
3. Create SQL migrations for service catalog, requests, request-services, consent events, private document metadata, status events, staff profiles and audit trail.
4. Seed only the eight founder-approved services. Seed document checklists only after the founder signs off on each one.
5. Enable RLS on every table and test from anonymous, customer-reference and staff contexts. Keep the service-role key server-side only.
6. Create a private storage bucket and policies. Test unauthorized upload/download denial, short-lived access, file-size/type checks, deletion and backup/restore.
7. Replace local JSON/file persistence behind API repository methods; do not let browser code write directly to privileged tables.
8. Migrate only reviewed records, reconcile counts/references, verify attached-file access, then retire local prototype files according to an approved retention plan.

## 8. Acceptance checks for the architecture phase

- Founder confirms the as-is workflow and exception paths for all eight services.
- ERD entities, statuses, quote revision rules, consent notice and staff roles are approved.
- Anonymous browser cannot read requests, private documents, quotes or staff data.
- Staff can only access records and files allowed by role; sensitive changes create audit events.
- A request can be created, quoted, updated, delivered, tracked and deleted/retained according to policy.
- Notification failure does not lose a request; retries are observable and do not duplicate customer actions.
- Backup restoration and migration rollback are rehearsed before any production cutover.
