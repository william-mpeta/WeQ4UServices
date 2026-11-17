# WeQ4UServices Service Request Platform

## Product boundary

A four-page public website and staff request desk for the Gauteng transport-document services described in the client-approved build brief. The confidential source brief is not included in this public repository. This is not a fintech, wallet, agent-network or retail product platform.

## Public pages

- `/` — Home, service catalogue, how-it-works, FAQs and contact band
- `/about` — company mission, audiences and Gauteng service areas
- `/services` — eight service descriptions with request links
- `/contact` — phone, WhatsApp, email, quote request, private uploads and reference tracking

## Request lifecycle

1. A customer selects one or more services and optional courier collection/delivery.
2. For each service, the customer chooses a case type, may provide a booking preference where relevant, and can attach optional files under the working checklist.
3. The customer supplies contact details, Gauteng suburb and privacy consent, then reviews before submission.
4. Service-specific optional documents are accepted as PDF, JPG or PNG, up to ten files and 8 MB each. Each uploaded file is labelled with its service/document category in the request record.
5. The API stores request records encrypted and encrypts uploaded files before writing them to the private development directory.
6. Staff review documents, confirm the requested scope, and mark the service validated.
7. When staff move a validated request to **Ready to quote**, the API generates a versioned quote from the Finance-approved service profile. If configuration is incomplete, the request remains unchanged and quote generation returns an actionable error.
8. The customer can review and accept or decline the generated quote using request tracking. Acceptance is not payment.

Key statuses: Received, Documents verified, Service validated, Ready to quote, Quote generated, Quote sent, Quote accepted, Submitted, Ready, Out for delivery, Delivered.

## API and staff access

- `POST /api/requests` — create a consented service request
- `GET /api/requests/:ref` — retrieve a minimal public status response
- `GET /api/catalogue` — retrieve customer-safe service metadata and approved base prices, when configured
- `GET /api/admin/requests` — list requests (Bearer token required)
- `PATCH /api/admin/requests/:ref` — update status and internal work details; quote amounts are engine-generated (Bearer token required)
- `GET /api/admin/pricing-profiles` and `PATCH /api/admin/pricing-profiles/:serviceId` — maintain Finance-only pricing profiles (Bearer token required)
- `GET /api/admin/finance/summary` — view quoted totals and estimated margins, not collected revenue (Bearer token required)
- `GET /api/admin/requests.csv` — export request data (Bearer token required)
- `GET /api/admin/requests/:ref/documents/:id` — decrypt and download a private attachment (Bearer token required)

Configure a long random `ADMIN_API_TOKEN`, a separate `FINANCE_API_TOKEN`, and a 32-byte hex `DATA_ENCRYPTION_KEY` outside source control. Development generates a local encryption key under the ignored API private directory. Request JSON and pricing profiles are encrypted as an AES-256-GCM payload; document bytes use AES-256-GCM before being written to disk.

## Chat assistant

The assistant uses a fixed local knowledge base and quick replies. It must not invent prices, turnaround guarantees, document requirements, legal advice or services. It must not ask for ID numbers or card data. It gives a privacy notice before collecting a callback lead and always offers WhatsApp hand-off.

## Brand and content rules

- Forest green, mint, amber and off-white from the client brief
- Inter typography and Lucide line icons
- Use only the client-provided name, contacts, service descriptions and Gauteng areas
- Display “Get a quote” until prices are supplied
- Do not fabricate staff profiles, testimonials, customer counts or partner badges

## Integration boundary

The current implementation is a local functional prototype, not a production deployment. It does not yet use PostgreSQL, cloud object storage, an email provider or a payment provider. Production deployment requires a managed database, private encrypted object storage, key rotation/secret management, verified email sending, payment-provider onboarding, HTTPS, retention/deletion policies and operational access controls. Do not store real customer identity documents in the local development directory.
