# WeQ4UServices ERD Proposal

**Status:** Draft for founder review. Use alongside the [logical model](logical-model.md) and [PostgreSQL schema draft](postgres-schema-draft.sql). Do not apply as a production schema before process, access and retention decisions are approved.

The expanded target model for workflow instances/tasks, SLA clocks, payment orders/transactions, refunds and retention records is described in the [Digital Service Fulfilment Platform blueprint](../architecture/digital-service-fulfilment-platform.md) and [operations schema extension](platform-operations-schema-draft.sql). Staff interfaces are consolidated in the :3001 Operations & Admin Console.

```mermaid
erDiagram
    AUTH_USERS ||--o| STAFF_PROFILES : identifies
    STAFF_PROFILES }o--o{ ROLES : assigned
    ROLES }o--o{ PERMISSIONS : grants
    SERVICE_TYPES ||--o{ SERVICE_CHECKLIST_VERSIONS : defines
    SERVICE_CHECKLIST_VERSIONS ||--|{ SERVICE_CHECKLIST_ITEMS : contains
    SERVICE_REQUESTS ||--|{ REQUEST_SERVICES : includes
    SERVICE_TYPES ||--o{ REQUEST_SERVICES : selected
    SERVICE_REQUESTS ||--|{ REQUEST_CONSENTS : records
    SERVICE_REQUESTS ||--o{ REQUEST_DOCUMENTS : has
    REQUEST_SERVICES o|--o{ REQUEST_DOCUMENTS : categorizes
    SERVICE_CHECKLIST_ITEMS o|--o{ REQUEST_DOCUMENTS : requested_as
    REQUEST_STATUSES ||--o{ SERVICE_REQUESTS : current_state
    SERVICE_REQUESTS ||--o{ REQUEST_STATUS_EVENTS : history
    REQUEST_STATUSES ||--o{ REQUEST_STATUS_EVENTS : from_to
    STAFF_PROFILES o|--o{ REQUEST_STATUS_EVENTS : changes
    SERVICE_REQUESTS ||--o{ REQUEST_ASSIGNMENTS : assigned_work
    DEPARTMENTS o|--o{ REQUEST_ASSIGNMENTS : owns
    STAFF_PROFILES o|--o{ REQUEST_ASSIGNMENTS : assigned_to
    SERVICE_REQUESTS ||--o{ QUOTES : quoted
    QUOTES ||--|{ QUOTE_LINES : itemizes
    REQUEST_SERVICES o|--o{ QUOTE_LINES : prices
    STAFF_PROFILES o|--o{ QUOTES : prepares
    QUOTES ||--o{ QUOTE_DECISIONS : decision_history
    SERVICE_REQUESTS o|--o{ NOTIFICATION_OUTBOX : triggers
    SERVICE_REQUESTS o|--o{ AUDIT_EVENTS : audited
    STAFF_PROFILES o|--o{ AUDIT_EVENTS : acts

    SERVICE_REQUESTS {
        uuid id PK
        text reference_code UK
        text requester_name
        text requester_phone
        text requester_email
        text suburb
        text address
        boolean courier_requested
        text current_status FK
        timestamptz created_at
        timestamptz updated_at
    }
    REQUEST_SERVICES {
        uuid id PK
        uuid request_id FK
        text service_type_id FK
        jsonb intake_details
        integer intake_schema_version
    }
    REQUEST_DOCUMENTS {
        uuid id PK
        uuid request_id FK
        uuid request_service_id FK
        uuid checklist_item_id FK
        text display_label
        text object_path UK
        text scan_state
        text review_state
        date expiry_date
    }
    QUOTES {
        uuid id PK
        uuid request_id FK
        integer version
        text status
        bigint total_minor_units
        timestamptz valid_until
    }
    QUOTE_LINES {
        uuid id PK
        uuid quote_id FK
        text category
        bigint unit_amount_minor
        bigint line_total_minor
    }
    REQUEST_STATUS_EVENTS {
        uuid id PK
        uuid request_id FK
        text from_status FK
        text to_status FK
        uuid changed_by FK
        timestamptz occurred_at
    }
```

## Relationship and design notes

- A request may contain multiple selected services. `request_services` stores one row per service, with a JSON intake payload versioned for gradual migration to typed fields.
- A request holds a contact snapshot rather than requiring a customer login/profile in the initial release.
- Document bytes live in private object storage. `request_documents` holds an opaque storage path, classification, scan/review state and optional expiry; a file may be tied to the applicable request service and checklist item.
- Checklist versions are approved and effective-dated. Existing website checklist aids remain draft until the founder approves the requirements for each case.
- Status history, quote decisions, assignments and audit events are separate records, so reports can reconstruct who did what and when.
- A quote is versioned and its lines split handling, authority, third-party, courier and other charges. Store ZAR amounts as integer cents. “Quoted” is not the same as “revenue collected.”
- RBAC uses staff profiles, roles and permissions. Permission checks belong in the API; RLS must also prevent direct anonymous access.
- Payments, receipts/refunds, customer accounts, SLA targets and official external booking records are intentionally later entities. Add them when business rules and providers are confirmed.

## Important approval questions

See [logical model decisions](logical-model.md) and the [founder discovery workshop](founder-discovery-workshop.md). In particular, confirm whether a request may include multiple cases for the same service, quote acceptance evidence, assignment multiplicity, retention/deletion requirements and staff access to sensitive files.
