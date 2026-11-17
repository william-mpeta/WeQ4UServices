# WeQ4UServices — Project Sponsor and Founder Update

**Status date:** 16 November 2026  
**Overall status:** Quote-workflow milestone demonstrated; operational readiness not yet established.

## Executive summary

The project has moved beyond screens-only evidence for a defined slice of the
customer journey. The API supports quote preparation, independent approval,
publication to customer tracking, and customer decisions. Synthetic examples
for Learner Licence, Driver’s Licence Renewal, PrDP, and Roadworthy displayed
quotes in the customer portal. One synthetic Learner Licence quote was
accepted in the portal and the staff workspace recorded the acceptance and
routed the request to payment setup.

This is a **technical workflow demonstration**, not proof that WeQ4UServices
is ready to process real customer cases or present as an operationally
complete system. Real service rules, approved prices, payment, fulfilment,
and completion still need validation and sign-off.

## Progress delivered

- Implemented sourced, case-specific quote drafts for cases without a
  quote-ready catalogue price. Staff must record the source and scope, and a
  different authorized reviewer must approve the draft before publication.
- Fixed assessment persistence so staff-entered case requirements are retained
  when the request is reloaded.
- Tightened readiness checks: a verified requirement needs linked evidence
  or a recorded assessment note; “not applicable” also requires a note.
- Added Learner Licence Rewrite and standalone Door-to-Door Courier to the
  customer selection flow.
- Added API integration coverage for synthetic quote creation across modeled
  service categories and variants, quote publication, tracking, PDF
  generation, acceptance, and workflow controls.
- Captured customer and staff UI evidence for the quote-review state and a
  separate accepted-quote state.

## Evidence and validation

- **API tests:** 26 passed, 0 failed on the latest recorded run.
- **Production builds:** admin and storefront builds passed after the
  optional local demo-proxy configuration was added.
- **Customer UI:** quote details and Preview, Download PDF, Accept, Decline,
  and Request change controls were visually confirmed for four synthetic
  examples.
- **Acceptance UI:** one synthetic quote was accepted. The customer saw
  “Quote approval recorded”; staff saw **Quote Accepted** and **Payment Setup
  Required**.
- **Staff lookup:** the three unaccepted synthetic references were found in
  the staff queue during the local demo check.

The underlying evidence and references are in
[the visual quote demo report](./E2E-Visual-Quote-Demo-2026-11-13.md), with
screenshots in
[the evidence folder](./E2E-Visual-Quote-Demo-2026-11-13/).

## Current gaps and risks

1. **Business approval:** Service-specific requirements, eligibility rules,
   exceptions, third-party fees, and commercial pricing need authoritative
   confirmation. Synthetic amounts must never be treated as approved prices
   or real offers.
2. **Limited UI decision coverage:** Only one synthetic customer acceptance
   was actually submitted in the UI. Decline, change-request, and all exact
   service subtypes still need focused manual checks.
3. **Payment and fulfilment:** Payment is not configured in the demo
   environment. The accepted example correctly remains at payment setup;
   payment confirmation, service execution, delivery, and closure have not
   been demonstrated end to end.
4. **Learner Licence label:** The customer summary currently displays the
   broader “Driver’s Licences” family label rather than clearly identifying
   the learner subtype.
5. **Local-only demo:** The synthetic references live in the isolated API
   store on port 4100, not the normal development API store on port 4000. The
   opt-in `npm run demo:quotes` command now starts the UI on ports 3000/3001
   and proxies API calls to the isolated store. Running the standard
   `npm run dev` instead reconnects to port 4000. `localhost` is not reachable
   from the founder’s separate device.
6. **Release status:** The changes and demo have not been deployed to a shared
   environment or promoted to GitHub as a release.

## Recommended next steps

1. Have the business owner and relevant service experts approve the exact
   scope, checklist, eligibility rules, price sources, VAT treatment, and
   third-party fee treatment for each priority service and subtype.
2. Correct and recheck the Learner Licence customer-facing label.
3. Prepare a controlled, shared demo environment using only approved
   configuration and synthetic test identities. Do not expose the local
   development database or real customer data.
4. Run and record manual customer and staff UI journeys for each approved
   subtype, including separate references for accept and decline outcomes.
5. Configure and verify payment in an authorized test environment; then test
   payment-to-fulfilment, delivery, and closure separately.
6. Publish a release only after tests pass, business approvals are recorded,
   and the sponsor accepts the remaining known limitations.

## Sponsor decision requested

Please nominate the approver for service requirements and pricing, confirm
which exact Learner, Driver’s Licence, PrDP, and Roadworthy variants are in
scope for the next demonstration, and authorize a suitable shared test
environment. Until these are in place, the safe claim is **“quote workflow
demonstrated with synthetic cases”**, not **“all services are fully working.”**

## WhatsApp Status draft

> **WeQ4UServices project update:** We’ve reached an important quote-workflow
> milestone. Synthetic demos now show customer quote reviews for Learner
> Licence, Driver’s Licence, PrDP and Roadworthy examples, plus one recorded
> quote acceptance reflected in the staff workspace. Next, we’re validating
> approved service rules and pricing, then payment and fulfilment. Building
> carefully toward a reliable customer experience—one verified step at a
> time.

This status is about progress only; it deliberately avoids synthetic
references, test prices, and any claim of full operational readiness.
