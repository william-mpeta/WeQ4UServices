# Founder demo, test checklist, and payment plan

**Purpose:** Give WeQ4UServices a time-boxed functional and regression review before the founder demo, then capture the business decisions needed before payment development.

**Scope:** Local prototype only. This is a review guide, not a production readiness certificate or a statement that payment is live.

## What exists today

- Customer service enquiry, service-specific questions, optional document upload, reference tracking, and customer quote acceptance/decline.
- Staff request queues, role-based API permissions, status/next-action updates, quotes, and a management dashboard based on recorded requests.
- New request references are random and serve as the customer's single tracking credential.
- Request data and uploaded documents use encrypted local development storage. PostgreSQL, production staff identity, payment gateway, customer payment notifications, reconciliation, and refunds are not implemented.
- The API currently records quote acceptance and explicitly says payment is not available. Quote accepted must not be represented as paid or as authorization to begin work.

## Founder demo run sheet

### 1. Start and confirm the environment (10 minutes)

- Run `npm run dev` from the project root. It starts the API on `4000`, customer site on `3000`, and staff console on `3001`.
- Open `http://localhost:4000/api/health`; confirm `ok: true`.
- Open `http://localhost:3000` and `http://localhost:3001`.
- If startup reports a port conflict, use the printed process information and `.dev` logs. Do not terminate unrelated Node processes blindly.
- Use demo names, contact details, and harmless sample documents only. Do not use a real customer's identity or bank information in the local prototype.

### 2. Walk one customer request end to end (15 minutes)

- Start with “I just bought a car.” Confirm the enquiry supports customers from any dealership, treats Johannesburg as the proposed pilot start, and asks the team to confirm availability for other areas.
- Choose a dealership purchase, request a few help items, leave the optional referral code blank, and confirm the form still proceeds.
- Enter demo contact details and consent; submit without documents to confirm that an enquiry is not blocked by a missing document.
- Copy the single request reference. On the tracking page, use it in a second browser profile/private window and confirm the request details load without a separate key.
- In the staff console, locate the same reference. Update the status, next action and customer-facing update. Reload customer tracking and confirm the update appears.
- Add a quote as an authorized role. Confirm the customer sees it, can accept or decline once, and that a repeated decision is rejected.
- Confirm that accepting a quote records **acceptance only**. It does not create a payment, mark funds received, or claim fulfilment has started.

### 3. Check other services and operational access (15 minutes)

- Submit one standard non-vehicle request to confirm the vehicle journey has not displaced existing service intake.
- Try optional documents and a harmless valid sample file; confirm the staff request shows the attachment. Try an unsupported format or a file over the configured limit and confirm a clear error.
- Sign in with each available demo role. Verify that customer support can handle support work, back-office staff can work the queue, supervisors can assign/escalate, and only approved roles can change quote amounts or export reports.
- Compare the dashboard with the requests you just created. Check date/department filters, queue counts, and the referral count; do not present demo records as real business performance.
- Export a report only with synthetic data. Confirm it opens and contains expected columns, then remove the local export if it contains any real personal information.

### 4. Test failure and recovery (10 minutes)

- Confirm the form rejects missing required contact data and missing privacy consent with a useful message.
- Try an unknown reference, an unavailable quote, a declined quote, and an already-decided quote.
- Stop the API briefly and confirm the storefront explains that it could not complete the action; restart it and confirm the customer can retry.
- Refresh both sites and confirm the request remains available in local development storage.
- Check that customer-facing pages never display staff tokens or the old separate tracking key. Keep new references private because each one grants access to its request.

## Regression gates before showing the founder

- `npm run build` succeeds across API, storefront and admin.
- `npm run lint` succeeds, if time allows.
- The package scripts show an API `node --test` command; confirm whether test files have been added before treating that command as meaningful. Storefront and admin currently expose TypeScript lint/build checks, not browser test suites.
- Repeat the customer-to-staff request journey after any change to intake, reference generation, quote, roles, or tracking.
- Record pass/fail, build date, browser, and known defect for each item. A short screen recording of the clean happy path is useful for handover, but do not include real customer records.

## Payment design: customer approves, provider confirms, then fulfilment may proceed

1. **WeQ4U issues a versioned quote.** Line items separate the WeQ4U handling fee from authority/statutory charges, third-party costs, courier, and any payment-provider fee. Show the total due, quote expiry, payment timing, and cancellation/refund terms.
2. **Customer accepts the quote.** Record the quote version, amount and timestamp. This is not a payment event.
3. **API creates a payment order.** The order references the accepted quote and exact amount in ZAR minor units. Create a provider checkout session with an idempotency key. Do not let a browser-supplied amount determine what is charged.
4. **Customer pays through the provider's hosted checkout.** The gateway provider processes card/instant-EFT credentials. The WeQ4U application must not receive or store card numbers, CVV, online-banking passwords, or PINs.
5. **Provider callback/webhook confirms the outcome.** Verify its signature and merchant/order/amount/currency. Deduplicate provider event IDs and process retries safely. A successful browser redirect alone must never mark the order paid.
6. **Payment is reconciled.** Record provider reference, gross amount, provider fee, net settlement, settlement batch/date and the FNB or Nedbank business account that receives the provider payout. Reconcile against the provider statement and bank statement.
7. **Fulfilment follows the approved payment gate.** Start only after the required amount is confirmed by the provider and the business rule says it is sufficient. Keep pending, failed, expired, refunded, reversed and disputed states visible to staff and customer.

The funds flow is normally **customer → payment gateway provider → WeQ4UServices merchant settlement account (FNB or Nedbank)**. The bank account is configured in the provider's merchant settlement setup; the web application should not collect or store the business bank login. Confirm the exact settlement model with the chosen provider and bank before implementation.

## Payment decisions the founder must own

- Which registered WeQ4UServices entity is merchant of record, and which business account receives settlement?
- Which provider and payment methods will be supported? What are the provider fees, settlement timing, limits, support route, and refund/dispute process?
- Does the customer pay the full quote before work, a deposit, or service-specific milestones? Are authority and third-party amounts collected by WeQ4U or paid directly?
- Who bears provider fees? How are statutory/third-party/courier pass-through amounts disclosed and accounted for?
- What happens when an appointment is unavailable, a customer cancels, a quote changes, an authority rejects paperwork, or payment is duplicated?
- Who may issue/adjust/refund a quote or payment, and what second-person approval or evidence is required?
- What receipt/invoice and tax details must be captured? Confirm this with the business accountant.
- Who performs daily payment-to-provider-to-bank reconciliation, and what is the escalation path for mismatches?

## Payment integration regression scenarios

Before enabling live payments, test in the provider sandbox: success, customer cancellation, decline, timeout, duplicate checkout, duplicate webhook, invalid webhook signature, mismatched amount/currency/order, delayed or out-of-order callback, partial payment if supported, refund, reversal/chargeback, settlement fee, and a provider payout that does not match the bank statement. Verify that retries never charge twice and no failed/pending payment advances fulfilment.

## Suggested handover format

Keep one short issue/decision log with: item, customer/business impact, current state, next action, owner, date needed, and link to the relevant screen or document. The founder owns service scope, prices, refunds, privacy/retention, and partner commitments. The developer owns the technical design and implementation after those rules are recorded. Mark the payment provider, merchant onboarding, PostgreSQL cutover, and production security review as **not started** until they actually are.
