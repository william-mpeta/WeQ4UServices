# WeQ4UServices

A mobile-first service website for a Gauteng business that handles transport-document requests door-to-door. Its scope follows the client-supplied build brief, which is kept offline because it is marked confidential, and the approved flyer asset used on the site.

## Customer experience

- Four public pages: Home, About Us, Services, Contacts
- Eight service types with quote-first requests and no invented pricing
- WhatsApp, click-to-call and email contact paths
- Multi-step service request, private document upload and reference tracking
- Rule-based Ask WeQ4U assistant with privacy notice and human hand-off
- Gauteng-only service information and provided contact details

## Applications

- `apps/storefront` — React, Vite and TypeScript customer website
- `apps/admin` — staff request desk with status and quote updates, secure file access and CSV export
- `apps/api` — Express request API and encrypted local development storage
- `.github/workflows/main.yml` — request tests, build and lint checks

## Local development

Install Node.js and npm, then run from the repository root:

```bash
npm install
npm run dev
```

The development servers start in the background on fixed local ports. Run `npm run dev:stop` from the repository root to stop the API, storefront and admin processes started by this project. Startup logs and process IDs are kept under the ignored `.dev` directory. If a port is occupied by a process this project did not start, startup reports its PID and leaves it untouched.

- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API health: http://localhost:4000/api/health

Copy `apps/api/.env.example` to `apps/api/.env` and configure unique random tokens for `SYS_ADMIN_API_TOKEN` (Lebo Mpeta), `FOUNDER_API_TOKEN` (William Mpeta), `SUPERVISOR_API_TOKEN`, `BACKOFFICE_API_TOKEN`, and `CUSTOMER_SUPPORT_API_TOKEN`. The legacy `ADMIN_API_TOKEN` is still accepted as a development compatibility token with system administrator access. Role permissions are checked by the API. See [staff access and dashboard notes](docs/workflows/dashboard-and-staff-access.md). Set a persistent `DATA_ENCRYPTION_KEY` for production; local development creates a private key automatically. Never commit `.env` files.

## Production requirements not yet configured

- PostgreSQL or managed database credentials
- Production private object storage and key management
- Verified email sender and Resend credentials
- PayFast merchant onboarding and production credentials
- Production domain, HTTPS and deployment configuration

PayFast checkout is sandbox-first. To test it, configure the PayFast fields in `apps/api/.env.example` using sandbox credentials and a publicly reachable `PAYFAST_NOTIFY_URL`; a local-only URL cannot receive PayFast ITN callbacks. The callback IP allowlist is required, and payment is recorded only after signature, source, amount, merchant and PayFast server validation succeed. Set `PAYFAST_SANDBOX=false` only with live credentials and an HTTPS callback URL. The browser return page is not proof of payment.

Without PayFast configuration, requests and quotes continue to work, but online payment is unavailable. Do not use local file storage for production customer documents.

See the implementation and security boundaries in [docs/architecture/service-request-platform.md](docs/architecture/service-request-platform.md).

For architecture and database planning, start with the [4D target architecture](docs/architecture/enterprise-4d-design.md), [data-design index](docs/data/README.md), [logical model](docs/data/logical-model.md), [ERD proposal](docs/data/erd-proposal.md), and [PostgreSQL schema draft](docs/data/postgres-schema-draft.sql). These are proposals to review with the founder; the SQL has not been applied. Workflow and report concepts are in [operations workflow and reporting design](docs/workflows/operations-and-reporting-design.md), and the API contract is in [the OpenAPI draft](docs/api/openapi-draft.yaml).
