# Founder guide: What makes up a service price?

## In one sentence

A pricing profile is the approved, versioned set of prices for **one service**. When staff prepare a quote, the API takes the matching service profile, the customer's selected package, and any priced optional delivery choices, then saves those amounts as a quote snapshot. The customer sees the itemized quote; later price edits do not recalculate an already issued quote.

## Components in the current price card

| Component | Plain-language explanation | Commercial treatment / current boundary |
|---|---|---|
| **Government fee** | The amount charged by the government office or authority for the underlying transaction. | Pass-through at the documented amount, not WeQ4U income; the commercial model says do not mark it up, discount it, or use it in a package discount. The exact authority tariff must still be verified when prices change. |
| **Processing fee** | WeQ4U's charge for handling and processing the customer's request. | A WeQ4U fee. The model describes service/processing revenue, but the seeded number is a price-card amount—not a measured calculation of staff hours or payroll. |
| **Platform fee** | The per-request platform amount shown in the approved price-card composition. | It is currently a component of the service quote, not a separate subscription charge. Do not describe it as a monthly SaaS fee unless a separate founder-approved plan is implemented. |
| **Convenience fee** | The price-card amount associated with making the service easier to request and follow. | A WeQ4U fee. Digital intake, tracking and communication are examples of the customer value; the fee is not independently calculated from those features. |
| **Payment fee** | The payment-related amount included in the documented service price. | A proposed charge in the quote; no payment gateway, actual processor charge, collection or settlement is connected. Do not say it equals a verified PayFast/Ozow/Yoco charge. The commercial model describes recovering payment charges at cost. |
| **Priority / Express / VIP uplift** | The extra amount for the selected speed/service package. | Added on top of the Standard price: Priority **+R150**, Express **+R300**, VIP Concierge **+R500**. These are package uplifts, not separate payment or government fees. The model says discount the package rather than the base service. |
| **Collection / delivery** | An optional amount if the customer selects a physical collection or delivery service. | Optional profile components exist, but the reference price card has no approved courier amount. If a selected option has no configured price, quote preparation is blocked; staff must not assume it is free or invent a price. |

### Example: Driver's Licence Renewal, Standard

| Line | Amount |
|---|---:|
| Government fee | R228 |
| Processing fee | R110 |
| Platform fee | R57 |
| Convenience fee | R45 |
| Payment fee | R10 |
| **Customer price** | **R450** |

Choosing Priority adds R150, for a total of R600; Express adds R300 (R750 total); VIP Concierge adds R500 (R950 total). The API prices the selected package and includes the uplift in the quote lines.

## "Contribution" is not profit or margin

The current UI calculates a **modeled contribution equal to 30% of the customer quote total** (R450 × 30% = R135 in the Standard example). This was a planning assumption selected earlier. It is not a verified gross margin, net profit, cash received, or the commercial model's operating-cost allocation. Actual estimated gross margin is shown only when Finance has supplied costs for every quoted line; it is still an estimate. Government/payment pass-through, operating expenses, tax, partner commission, collection, and settlement must not be inferred from the 30% figure.

## What a profile also records

- Service/profile identity and eligible request variant (for example, Driver's Licence **Renewal**, not a new or learner licence).
- Draft/active status, per-service version, effective-from date, and VAT treatment.
- Customer charge and optional estimated direct cost for each component.
- Version history. Issued quote snapshots retain the applicable profile version and amounts.

The current demo seeded the listed prices with VAT marked “not applicable,” but the commercial PDF does not establish VAT treatment; confirm it with the accountant before production. Services without documented prices remain unpriced and blocked rather than receiving guessed values.

## Reference price cards

These are the current Standard totals in the existing seed data and pricing documentation:

| Service | Standard |
|---|---:|
| Driver's Licence Renewal | R450 |
| PrDP Application | R650 |
| Vehicle Licensing (Annual Disc) | R350 |
| Change of Ownership | R500 |
| Traffic Register | R250 |

The full component breakdowns are in [pricing engine workflow documentation](../workflows/pricing-engine.md). These prices are the approved local demo reference, not a promise that government tariffs are current.

## Safe founder summary

> “For each service we maintain an approved price profile. The quote is composed from the documented government pass-through and WeQ4U price-card fees, then any customer-selected package uplift. We show the breakdown, profile version and validity to the customer. The 30% figure is only a planning contribution assumption; it is not profit or collected money. Payment collection and reconciliation are not connected yet.”

