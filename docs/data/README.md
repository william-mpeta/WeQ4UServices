# Data Design

The governing target is the [Digital Service Fulfilment Platform blueprint](../architecture/digital-service-fulfilment-platform.md), derived from the supplied Business Process Requirements PDF. All staff-facing functions (call centre, back office, finance, compliance, management dashboard and technical administration) are modules in the single admin app at `http://localhost:3001`; the customer app is at `http://localhost:3000`.

## Design drafts

- [ERD proposal](erd-proposal.md) - conceptual entities, relationships and security notes
- [Logical model](logical-model.md) - core data boundaries and decisions
- [PostgreSQL schema draft](postgres-schema-draft.sql) - Supabase-oriented foundation; not applied
- [Platform operations schema draft](platform-operations-schema-draft.sql) - workflow tasks, SLA, payments and retention; not applied
- [DFD and workflows](dfd-and-workflows.md) - context, request, quote and booking flows
- [Founder discovery workshop](founder-discovery-workshop.md) - service-specific rules and operating exceptions to map
- [Operations workflow and reporting](../workflows/operations-and-reporting-design.md) - lifecycle, staff workspace and KPI definitions
- [OpenAPI draft](../api/openapi-draft.yaml) - current and planned API contract
- [4D architecture](../architecture/enterprise-4d-design.md) - business, data, application and technology views

## Governance boundary

These diagrams and SQL files are planning artifacts, not approved or applied Supabase migrations. The business requirements establish payment gates, customer action handling, role-based staff work, SLA visibility and configurable retention as target capabilities. Provider-specific payment processing, legal/contractual retention durations, service checklists and SLA targets still require operational, legal or provider decisions. Do not apply drafts to production.
