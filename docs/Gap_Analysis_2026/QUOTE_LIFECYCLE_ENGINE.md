# WeQ4UServices - Quote Lifecycle Engine (Technical Specification)

**Priority:** HIGH  |  **Version:** 1.0  |  **Product Owner:** Lebo Mpeta  |  **Founder:** William Mpeta
**Target repo folder:** `C:\Users\Admin\OneDrive\Desktop\DevOPS_Projects2026\WeQ4UServices`
Suggested file path: `docs/QUOTE_LIFECYCLE_ENGINE.md`

## 1. Business problem
- Pricing exists in the approved commercial model but is not operationalised.
- Admins interpret and calculate prices manually, which risks errors.
- Admins cannot see the final quote before delivery, see which pricing version is active, or trace prices to the approved model.
- Customers cannot preview, download, accept or decline quotes, or see quote pricing in Track Request.

## 2. Solution
A centralised **Pricing Engine** as the single source of truth for service pricing, quote generation, customer portal visibility, workflow updates and revenue reporting.

Lifecycle: Pricing Master -> Service Request -> Quote Preparation -> Quote Preview -> Admin Approval -> Customer Portal -> Accept / Decline -> Workflow Update -> Payment Collection -> Service Delivery -> Revenue Dashboard

## 3. Pricing Master (Phase 1-2)
| Service | Code | Standard | Priority | Express | VIP |
| --- | --- | --- | --- | --- | --- |
| Driver's Licence Renewal | `drivers_licence` | R450 | R600 | R750 | R950 |
| PrDP Application | `prdp` | R650 | R800 | R950 | R1 150 |
| Vehicle Licensing | `vehicle_licensing` | R350 | R500 | R650 | R850 |
| Change Of Ownership | `change_ownership` | R500 | R650 | R800 | R1 000 |
| Traffic Register | `traffic_register` | R250 | R400 | R550 | R750 |

Package uplifts: Priority +R150, Express +R300, VIP +R500.

### View Calculation - Driver's Licence Renewal
| Line | Amount |
| --- | --- |
| Government Fee | R228 |
| Processing Fee | R110 |
| Platform Fee | R57 |
| Convenience Fee | R45 |
| Payment Fee | R10 |
| **Client price** | **R450** |
| Contribution | R135 |
| Margin | 30% |

> Reconciliation to confirm: R450 - government R228 - payment R10 - contribution R135 = R77 direct handling cost. Verify against the approved model before build.

### Seed rules
- Table `pricing_profiles`, one row per service code, seeded automatically when empty (idempotent, never overwrites edits).
- Rows carry `version` and `active`; edits create a new version.
- VAT field reserved (future).

## 4. Quote Builder and Preview (Phase 3-4)
Automatic: service, standard price, package uplifts, subtotal/total, VAT (future), quote number `Q{year}-{0000}`, pricing version snapshot.
Admin enters only: **Notes, Conditions, Required Documents, Valid-Until date.**

Internal preview (mandatory): quote number, service, package, subtotal, notes, valid until, attachments. Actions: **Edit / Approve / Send to Customer**. No quote is sent without preview and approval.

## 5. Customer Portal Quote Centre (Phase 5)
Track Request shows a "Quote Available" card: quote number, issued, valid until, amount. Actions: **Preview Quote, Download PDF, Accept Quote, Decline Quote, Request Change.** PDF is branded A4 with quote number and pricing version.

## 6. Workflow automation (Phase 6)
### Quote states
| State | Set by | Next | Note |
| --- | --- | --- | --- |
| draft | Admin | pending_approval | Builder saved, not yet previewed |
| pending_approval | Admin / Supervisor | sent | draft | Internal preview shown; Edit or Approve |
| sent | System | accepted | declined | revision_required | expired | Visible in customer portal, notification fired |
| accepted | Customer | - | Request moves to Awaiting Payment |
| declined | Customer | - | Reason captured; request moves to Quote Declined |
| revision_required | Customer | draft (new version) | Admin notified; re-issue creates v+1 |
| expired | System | draft (re-issue) | valid_until passed with no response |

### Request transitions
| From | Event | To |
| --- | --- | --- |
| Quote Preparation | Quote sent | Quote Sent |
| Quote Sent | Customer accepts | Awaiting Payment |
| Quote Sent | Customer declines | Quote Declined |
| Quote Sent | Customer requests change | Quote Revision Required |
| Quote Sent | valid_until passes | Quote Expired |
| Quote Revision Required | Admin re-issues | Quote Sent |
| Awaiting Payment | Payment confirmed | In Progress |

Every transition writes a QuoteEvent, a timeline entry and a notification.

## 7. Data model
| Entity | Key fields |
| --- | --- |
| `PricingProfile` | service_code, service_name, standard, priority_uplift, express_uplift, vip_uplift, government_fee, processing_fee, platform_fee, convenience_fee, payment_fee, contribution, version, active, effective_from |
| `Quote` | quote_number (Q2026-0045), request_id, service_code, package, pricing_profile_id, pricing_version, subtotal, vat_amount (future), total, notes, conditions, required_documents[], valid_until, status, version, issued_at, approved_by, decline_reason |
| `QuoteEvent` | quote_id, event (created, approved, sent, viewed, accepted, declined, change_requested, expired), actor, timestamp, detail - audit trail |
| `ServiceRequest (extend)` | service_code, package, active_quote_id, status (adds Quote Sent / Declined / Revision Required / Expired) |
| `RevenueSnapshot (optional)` | date, potential, quoted, outstanding, collected, lost - for trend charts |

Pricing Engine API: `getPrice(service_code, package)`, `createQuote(request_id, package, builder_fields)`, `nextQuoteNumber()`. No component calculates a price itself.

## 8. Dashboards (Phase 7-8)
Revenue pipeline (illustrative targets): Potential R420 000 | Quoted R186 000 | Outstanding R142 500 | Collected R312 000 | Lost R68 200

KPIs: Requests Received, Quotes Generated, Quote Acceptance %, Collection Rate %, Average Order Value, Turnaround Time, Revenue This Month.

| Role | Focus | Widgets |
| --- | --- | --- |
| Founder | Strategic | Revenue, Pipeline, Acceptance ratios, Growth, EBITDA tracking |
| Finance | Financial | Margin, Collections, Settlements, Revenue allocation |
| Operations | Operational | Work queue, SLA, Delays, Escalations |

## 9. Phases
| # | Phase | Output | Priority |
| --- | --- | --- | --- |
| 1 | Pricing Master & Margin View | Read-only matrix + 'View Calculation' drawer | High |
| 2 | Pricing Seed | pricing_profiles auto-seeded on first load | High |
| 3 | Intelligent Quote Builder | Admin enters notes/conditions/docs/validity only | High |
| 4 | Internal Quote Preview | Edit / Approve / Send - no send without preview | High |
| 5 | Customer Quote Centre | Preview, PDF, Accept, Decline, Request Change | High |
| 6 | Workflow Automation | Accept/Decline/Change drive request status | High |
| 7 | Founder Revenue Dashboard | Pipeline + operational KPIs | Medium |
| 8 | Role-Based Dashboards | Founder / Finance / Operations views | Medium |

## 10. GitHub backlog
| ID | Issue | Phase | Size |
| --- | --- | --- | --- |
| WQ-101 | Seed pricing_profiles + Pricing Master table | 2 | S |
| WQ-102 | View Calculation drawer (fee breakdown) | 1 | S |
| WQ-103 | Quote + QuoteEvent entities and numbering service | 3 | M |
| WQ-104 | Quote Builder (notes, conditions, docs, validity) | 3 | M |
| WQ-105 | Internal Quote Preview with Edit/Approve/Send | 4 | M |
| WQ-106 | Quote PDF generator (A4, branded) | 5 | M |
| WQ-107 | Customer Quote Centre card in Track Request | 5 | M |
| WQ-108 | Accept / Decline / Request Change + status transitions | 6 | L |
| WQ-109 | Admin + customer notifications on quote events | 6 | M |
| WQ-110 | Revenue Pipeline + KPI calculations from live data | 7 | L |
| WQ-111 | Role-based dashboard views (RBAC) | 8 | L |

## 11. Acceptance criteria
- [ ] Pricing Master shows 5 services x 4 packages, values match the approved model exactly.
- [ ] 'View Calculation' shows fee lines and they sum to the client price.
- [ ] pricing_profiles is seeded automatically when empty; no manual set-up step exists.
- [ ] Admin cannot type a price in the Quote Builder; price is derived from profile + package.
- [ ] Quote numbers are unique and sequential (Q{year}-{0000}).
- [ ] A quote cannot be sent without passing through Preview and Approve.
- [ ] Customer sees quote card in Track Request with Preview, PDF, Accept, Decline, Request Change.
- [ ] Accept moves request to Awaiting Payment; Decline captures a reason; Change notifies admin.
- [ ] Every quote state change writes a QuoteEvent with actor and time.
- [ ] Quote stores pricing_version so later price edits never change an issued quote.
- [ ] Dashboard pipeline and KPIs calculate from Quote + payment data, not static values.
- [ ] Role views hide data outside the role (Finance cannot see Founder-only EBITDA).

## 12. Project workflow (end to end)
1. Customer contacts WeQ4U (portal, call centre, WhatsApp, referral).
2. Request is created and documents are collected and verified.
3. Pricing Engine builds the quote; admin adds notes/conditions; preview and approval.
4. Quote appears in the customer portal; customer accepts, declines or requests change.
5. Accepted -> Awaiting Payment -> payment confirmed -> In Progress (appointment, booking, processing).
6. Completion rules per service -> Complete -> Closure.
7. Revenue Dashboard aggregates potential, quoted, outstanding, collected and lost revenue for Founder, Finance and Operations.

## 13. Existing repository context
Related in-app pages: WeQ4U Dashboard, Dashboard Spec, Vehicle Ownership Deck, Partnership Proposal, Pricing & Revenue model, Contact and IT Supplier directories, QUE4U email template.

## 14. Out of scope
VAT calculation (field reserved), payment gateway changes, partner/dealer white-label quotes, bulk B2B subscription quoting.
