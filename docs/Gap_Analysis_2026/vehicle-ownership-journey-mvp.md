# Vehicle ownership journey MVP

## Purpose

Give any person who has just bought a vehicle from any dealership in South Africa one plain-language starting point for asking WeQ4UServices for help. Begin the measured pilot in Johannesburg and confirm the service area for each enquiry. This request bundles the customer's requested scope into one enquiry. It does not claim that government work is completed automatically or that a dealer is integrated.

## Customer journey

1. The home page asks whether the customer has just bought a car or needs another service.
2. The vehicle-owner path asks how the vehicle was purchased: dealership, private sale, bank or auction, or unsure.
3. The customer says what is happening with vehicle finance, then chooses one or more help areas: ownership paperwork, registration, licence disc and licensing, roadworthy help, vehicle papers, or guidance.
4. The customer provides contact details and sends an enquiry. The initial journey does not ask for an ID copy, full VIN, or vehicle papers.
5. The system creates one cryptographically random request reference. It is the customer's only tracking credential and works across devices. The staff workspace shows the purchase type and requested scope.
6. Staff confirm the applicable service, documents, quote and next action with the customer before processing.

Customers may enter an optional partner referral code in the vehicle request. The API validates and stores the code and authorized staff can view it in the request detail. It is an attribution/routing value only: the current prototype does not send customer data to any dealership or grant partner access. Customers can submit without a code. The dealership page describes a Johannesburg pilot for the wider dealership market; no connection or case sharing is active.

Customers enter one request reference on the tracking page. New references are high-entropy bearer credentials that authorize private tracking and customer actions across devices; the customer never receives a separate access key or API key. Existing older requests may still use their legacy private credential, which the storefront applies automatically when it exists in that browser session.

## Data captured

The `vehicle-ownership-onboarding` service uses the existing service request record. It adds `workItems` (an allow-listed set of requested help areas) and `vehicleContext` (`purchaseType`, `financeStage`, plus an optional dealership name). These values are validated by the API, returned in private customer tracking, and visible to authorised admin users. The public reference-only lookup does not expose them.

## Current boundaries

- This remains an enquiry intake flow, not a full ownership case with independent work orders, external dealer or government integrations, automatic document verification, or automated authority submissions.
- Requests remain in the existing encrypted local development store. PostgreSQL and private object storage are future work.
- Quote values are manually entered by staff. Payment processing, partner referrals, production identity, and per-task SLAs are not part of this slice.
- Document and fee requirements are confirmed by staff because they depend on the customer's situation and current business rules.
- The finance-stage question helps staff route an enquiry; it is not a finance application, credit check, or determination of ownership/titleholder rights.

## Partner proposal page

The public `/partners` page presents a proposed, measured pilot for a dealership or finance partner. It identifies the current intake/tracking prototype separately from future partner referrals and integrations, avoids unverified savings claims, and invites a discovery discussion. It does not name FirstRand, WesBank, BMW, Mercedes-Benz or WeBuyCars as a partner or imply endorsement.

## Next product decisions

For the founder review, confirm the supported vehicle-purchase scenarios, which tasks WeQ4U accepts, task ownership, the customer-visible status language, and when the team may request each sensitive document. Keep dealer-specific partnership language out of the public site until approved.

WesBank's public guidance distinguishes ongoing finance from post-settlement titleholder document handling. Treat the customer's finance stage as context for human review; do not present one universal ownership-transfer checklist. Sources: [WesBank - Transferring ownership to your name](https://www.wesbank.co.za/help-centre/new-to-wesbank/transferring-ownership-to-your-name) and [WesBank - Third Party Request](https://www.wesbank.co.za/SiteBranding/documents/coza/WesBank_Third_Party_Request.pdf). Confirm current requirements with the customer and relevant provider before collecting documents or making timing claims.
