# WeQ4UServices Delivery Roadmap

## Built in this iteration

- four-page mobile-first service website based on the client build brief
- all eight supplied transport-document services and Gauteng service area
- WhatsApp-first contact, quote request, reference tracker and guarded FAQ assistant
- encrypted local prototype storage, private document handling and authenticated staff request desk

## Target application boundary

- Customer storefront and self-service: `http://localhost:3000`.
- One staff-facing Operations & Admin Console: `http://localhost:3001`. Call-centre, every back-office function, finance, compliance, supervisor, management dashboard and technical administration are role-aware modules inside this app.
- API, database and workers are backend services, not additional staff-facing sites.
- [Digital Service Fulfilment Platform blueprint](architecture/digital-service-fulfilment-platform.md) is the design baseline from the supplied business requirements PDF. The existing prototype has not yet implemented this target.

## Next: platform foundation

- hold the founder discovery workshop and record one real end-to-end example per service
- map one real end-to-end request and exceptions for each service against the target workflow; configure each service version within the common platform
- approve the role scopes, quote/payment milestone exceptions, financial definitions and authority/courier pass-through treatment
- approve measurable SLA calendars/targets and the service completion criteria
- approve accurate per-service document checklists, quote stages, status transitions and exception handling
- approve privacy notice, retention periods, deletion/export process and data region with appropriate advisers
- decide which existing local requests are synthetic versus real data before any migration

## After process and data approval

- create isolated Supabase development/staging/production projects and apply reviewed migrations first in development
- build and review RLS policies, staff authentication and API authorization before adding real customer records
- move documents to private managed storage and test upload, malware review, access logging, backup and restore
- migrate only reviewed and authorized prototype data; reconcile request references and file counts
- implement workflow instances/tasks, role-aware queues, status timeline, assignments, quote versions, payment orders/reconciliation, configurable retention and the first operational reports
- keep all staff-facing work in the existing admin app at :3001; implement customer actions/tracking in the storefront at :3000
- configure verified notification adapters and payment provider processing after account onboarding; preserve auditable manual fallbacks
- plan production hosting, TLS, monitoring, incident response and access audit before launch

## GitHub delivery

- keep production-ready changes on `main`
- use pull requests for client review and approval
- configure repository/environment secrets outside committed files
- run the existing GitHub Actions build and lint workflow on each pull request
