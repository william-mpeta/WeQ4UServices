# Visual quote demo evidence — 13 November 2026

## What this demonstrates

Four synthetic requests reached the customer-tracking screen with a quote in
**Awaiting your decision** state. Each card displayed quote details and the
customer actions to preview, download a PDF, accept, decline, or request a
change. The staff workspace showed the corresponding Roadworthy quote and its
internal pricing-source note.

These are isolated demo records, not records in the normal application
database. The screenshots and quoted amounts below are historical synthetic
evidence; they are not approved offers and do not satisfy the current registry
and pricing gates. For the local quote demo, the customer portal at
`http://localhost:3000` and staff workspace at `http://localhost:3001` are
routed through an opt-in Vite proxy to the demo API on port `4100`. The normal
API on port `4000` and its data store are unchanged. Do not use the demo prices
as commercial offers.

## Starting the local quote demo

From the project root, run:

```powershell
npm run demo:quotes
```

This command first checks that the isolated API on port `4100` is healthy and
contains the expected synthetic quotes. It then starts only the storefront
and admin UI on ports `3000` and `3001`, routing their `/api` requests to
port `4100`. It refuses to use port `4000` as a fallback and will not stop an
unrecognized process occupying either UI port.

Stop only the quote-demo UI servers with:

```powershell
npm run demo:quotes:stop
```

The script leaves both APIs alone. Use the normal `npm run dev` command when
you want the usual development environment connected to API port `4000`.

## Customer quote references

| Historical service scenario | Request reference | Quote | Historical demo amount — not an offer | Customer portal | Screenshot |
|---|---|---|---:|---|---|
| Learner Licence | `WQ-2026-E07C466D1EAA6B2B8ED7` | `Q2026-0001` | R275 provisional service-fee estimate | [Open on localhost:3000](http://localhost:3000/track-request?ref=WQ-2026-E07C466D1EAA6B2B8ED7) | [01 — Learner Licence](./E2E-Visual-Quote-Demo-2026-11-13/01-Learner-Licence-Quote.png) |
| Driver’s Licence Renewal | `WQ-2026-4778584AC255D77A4C7C` | `Q2026-0002` | R500 synthetic case-specific quote | [Open on localhost:3000](http://localhost:3000/track-request?ref=WQ-2026-4778584AC255D77A4C7C) | [02 — Driver’s Licence](./E2E-Visual-Quote-Demo-2026-11-13/02-Drivers-Licence-Quote.png) |
| PrDP | `WQ-2026-E6C17F49F41A3CAE9A7C` | `Q2026-0003` | R500 synthetic case-specific quote | [Open on localhost:3000](http://localhost:3000/track-request?ref=WQ-2026-E6C17F49F41A3CAE9A7C) | [03 — PrDP](./E2E-Visual-Quote-Demo-2026-11-13/03-PrDP-Quote.png) |
| Roadworthy | `WQ-2026-079D20628548E52904F2` | `Q2026-0004` | R500 synthetic case-specific quote | [Open on localhost:3000](http://localhost:3000/track-request?ref=WQ-2026-079D20628548E52904F2) | [04 — Roadworthy](./E2E-Visual-Quote-Demo-2026-11-13/04-Roadworthy-Quote.png) |

Open a link above and press **Track** to load that quote.
For the Learner Licence record, the current portal labels the service family
as “Driver’s Licences” and does not show the learner subtype in the request
summary; that is a visible labeling gap, not evidence that the category is
fully differentiated in the UI.

The standard-port customer view was rechecked with all three outstanding
references; each displayed its expected quote and Accept/Decline controls:
[08 — localhost:3000 customer view](./E2E-Visual-Quote-Demo-2026-11-13/08-Customer-3000-Roadworthy.png).

## Staff view

[05 — Staff Roadworthy request and quote](./E2E-Visual-Quote-Demo-2026-11-13/05-Staff-Roadworthy-Quote.png)

The staff view at [localhost:3001](http://localhost:3001/) shows the Roadworthy
request in **Awaiting Customer Decision**,
the generated quote, and the staff-only source note. The request has no real
documents attached; its assessment and notes are synthetic test data.
The standard-port staff search found all three outstanding references:
[09 — localhost:3001 work queue](./E2E-Visual-Quote-Demo-2026-11-13/09-Staff-3001-Work-Queue.png).

## Interactive branded quotation PDF — 16 November 2026

The quote download is generated from one server-side HTML template and
headless Chromium. It uses the shared website design tokens, self-hosted Inter,
a white header with amber status strip, A4 pages, repeated table headings,
page-numbered headers/footers, and clickable decision links. The customer
action page requires a second, explicit confirmation: opening or previewing a
link does not change the request. Quote expiry defaults to 14 days and dates
more than 90 days away are rejected.

The signed accept, changes, and decline links are tied to the quote number,
quote ID/version, request, and South African valid-until date. A confirmed
decision/change updates the existing request workflow and creates a staff-only
audit record with timestamp and source IP. Authorized staff can inspect that
audit in the request detail panel on port `3001`. A decided or expired eligible quote remains downloadable, with its current
status shown instead of decision controls. The signed quote page also provides
a PDF download and print fallback.

### Current issuance gate

Only the Driver’s Licence renewal registry variant is currently enabled for
customer quotes, and it remains provisional pending operational sign-off. It
also requires an active matching price profile. All other variants produce an
internal registry-review PDF rather than a customer offer. Case-specific
pricing is disabled. The historical references in the table above—including
Q2026-0002—were synthetic/manual demo quotes and are not valid current examples
of downloadable customer quotations; do not use them to demonstrate the new
PDF or commercial readiness.

### Local manual check

1. Use the standard local application (`npm run dev`) for current implementation checks. `npm run demo:quotes` is only for the historical synthetic UI and routes to the isolated API on port `4100`.
2. The historical quote references below remain useful only for tracking/UI
   history checks. Current quote-draft and PDF routes reject their synthetic
   quote snapshots; use a fresh, eligible Driver’s Licence renewal request with
   an active matching profile to test a customer quotation.
3. Open an action link. Confirm that the quote, total, current status, and a
   **Download quotation PDF** fallback are shown. The request remains awaiting a
   decision until the confirmation form is submitted.
4. Open Learner Licence `Q2026-0001`, which is already accepted in the
   synthetic demo. Its action page should report the current status and offer
   the updated PDF, not record another decision.
5. To test a new decision/change, use one of the three awaiting quotes above.
   Actions persist in the isolated synthetic demo store and update that quote's
   workflow; they are not automatically reset by restarting the API.
6. On port `3001`, open the request detail and inspect **Quote decision audit ·
   staff only** after a customer action.

The per-service rendering baselines are in
[`apps/api/test/fixtures/quote-pdf-snapshots/`](../../apps/api/test/fixtures/quote-pdf-snapshots/).
The test checks all ten registry configurations render from the shared
template, A4 dimensions, clickable PDF links, a long multi-page quote, current
status rendering, and an internal-review PDF. Rendering snapshots do not mean a
service is approved for customer quoting.
After an approved design change, update baselines with
`$env:UPDATE_QUOTE_PDF_SNAPSHOTS='1'; npm run test --workspace apps/api`.

These are interaction and presentation checks against synthetic pricing and
request data. They do **not** establish approved commercial prices, real
authority processing, payment, fulfilment, or Ministerial readiness.

## Accepted quote check

The synthetic Learner Licence quote `Q2026-0001` was accepted in the customer
portal after confirming the acceptance prompt. Both sides showed the recorded
decision:

- Customer request: `WQ-2026-E07C466D1EAA6B2B8ED7`
- Customer status: **Quote approval recorded**; decision **accepted**
- Staff workflow: **Quote Accepted**, routed to **Payment Setup Required**
- [06 — Customer accepted quote](./E2E-Visual-Quote-Demo-2026-11-13/06-Learner-Licence-Accepted.png)
- [07 — Staff view of accepted quote](./E2E-Visual-Quote-Demo-2026-11-13/07-Staff-Learner-Accepted.png)

The screen correctly states that payment is unavailable in this environment
and fulfilment must not begin until payment is confirmed. This demonstrates
the quote-decision transition only; it is not evidence of payment or service
completion.

## Evidence limits

- The displayed values are synthetic fixtures, not approved WeQ4U prices,
  government fees, tax advice, or service commitments.
- The screenshots prove quote presentation and decision controls. The
  acceptance check proves one synthetic acceptance transition. They do not
  prove payment, government processing, fulfilment, delivery, and closure work
  end to end for every service.
- The isolated references are not present in the regular application’s data
  store. They should not be presented as live customer requests or as proof of
  operational readiness.
- The quote demo must be started with `npm run demo:quotes`; starting the
  standard app with `npm run dev` reconnects to API port 4000, where these
  references are not present. `localhost` is accessible only on this computer;
  a founder on another device needs a screen-share or a separately deployed
  demo environment.
- The Learner Licence service-family label should be corrected and rechecked
  before using that screen in a formal demonstration.
