# WeQ4U Operations Console — Technical Specification for GitHub Copilot

**Product:** WeQ4U Services Operations Console
**Reference implementation:** `src/pages/WeQ4UDashboard.jsx` (Base44 app)
**Scope:** UI/UX modernisation only. Backend workflows, permissions, state transitions, reporting definitions and audit behaviour are fixed inputs.
**Workflow source of truth:** `C:\Users\Admin\OneDrive\Desktop\DevOPS_Projects2026\WeQ4UServices\docs\workflows`

---

## 1. Objective

Re-skin the existing admin console into an executive operations cockpit with the Base44 look and feel, without changing a single workflow rule. Copilot must treat this document as a **styling and layout specification**, not a feature request.

---

## 2. Non-negotiable guardrails

Do **not** change, re-order, add or remove:

1. The 17 request lifecycle states (section 6).
2. Any state transition, guard condition or validation rule.
3. Role definitions, role gates or permission checks.
4. Assignment logic (auto-assignment, escalation, reassignment).
5. Document review logic (required documents, verification outcomes, missing-item rules).
6. Quote logic (draft → sent → accepted / declined / expired, pricing, validity).
7. Audit trail writes, audit records or audit visibility.
8. Report definitions and the numbers they produce.
9. API contracts, database schema, migrations or environment configuration.
10. Business calculations (revenue at risk, ageing, workload, funnel counts).

If a visual change would require touching any of the above, **stop and flag it** instead of implementing it.

---

## 3. Deliberate freedom

Copilot may change only: navigation, layout, cards, colour, typography, spacing, dashboard widgets and workspace presentation.

---

## 4. Design tokens

| Token | Value | Use |
| --- | --- | --- |
| Primary | #1E40AF | Primary actions, active navigation, KPI accents |
| Accent | #0EA5E9 | Secondary series, informational chips |
| Success | #16A34A | Delivered / accepted states |
| Warning | #F59E0B | Attention, ageing, pending documents |
| Danger | #DC2626 | Overdue, rejected, breaches |
| Background | #F8FAFC | Application canvas |
| Card | #FFFFFF | Card surfaces |
| Border | #E5E7EB | 1px hairline borders |
| Ink | #0F172A | Primary text |
| Muted | #64748B | Secondary text, labels |

**Geometry:** card radius 16–20px, KPI value 26–30px/900, card title 13–14px/900, body 10.5–12px, labels 9–10px uppercase with 0.07em tracking.
**Shadow:** `0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)`
**Type:** Inter (400/500/600/700/800/900). Never below 9px.

---

## 5. Layout architecture

```
┌───────────────┬──────────────────────────────────────────────────┐
│ Sidebar 246px │ Header (sticky)                                  │
│ sticky, 100vh │  Greeting + date/time · Search · Date · Dept ·   │
│               │  Refresh · Export                                │
│ Groups:       ├──────────────────────────────────────────────────┤
│ Operations    │ KPI row (6 tiles)                                │
│ Documents     │ Live today strip (5 metrics)                     │
│ Quotes        │ Workflow board (8 stage cards + other states)    │
│ Fulfilment    │ Work queue (CRM request cards)                   │
│ Reporting     │ Reporting: funnel · ageing · workload            │
│ Administration│ Analytics: charts (unchanged data)               │
│               │ Live activity feed                               │
└───────────────┴──────────────────────────────────────────────────┘
```

* Application canvas `#F8FAFC`; all content in white cards on an 18px grid.
* Sidebar collapses to a 68px icon rail below 1100px. Header controls wrap; never overflow.
* Content max width 1320px, centred, 22–26px padding.

---

## 6. Lifecycle states and chip colours

| # | State | Chip colour | Preserved behaviour |
| --- | --- | --- | --- |
| 1 | Received | #1E40AF on #E8EEFB | Must not be renamed, merged, skipped or reordered |
| 2 | Clarification Required | #B45309 on #FEF3C7 | Must not be renamed, merged, skipped or reordered |
| 3 | Documents Under Review | #0369A1 on #E0F2FE | Must not be renamed, merged, skipped or reordered |
| 4 | Documents Required | #C2410C on #FFEDD5 | Must not be renamed, merged, skipped or reordered |
| 5 | Ready To Quote | #A16207 on #FEF9C3 | Must not be renamed, merged, skipped or reordered |
| 6 | Quote Sent | #4F46E5 on #E0E7FF | Must not be renamed, merged, skipped or reordered |
| 7 | Quote Accepted | #16A34A on #DCFCE7 | Must not be renamed, merged, skipped or reordered |
| 8 | Awaiting Payment | #7E22CE on #F3E8FF | Must not be renamed, merged, skipped or reordered |
| 9 | In Progress | #0891B2 on #CFFAFE | Must not be renamed, merged, skipped or reordered |
| 10 | Submitted | #2563EB on #DBEAFE | Must not be renamed, merged, skipped or reordered |
| 11 | Ready For Collection | #0D9488 on #CCFBF1 | Must not be renamed, merged, skipped or reordered |
| 12 | Out For Delivery | #0284C7 on #E0F2FE | Must not be renamed, merged, skipped or reordered |
| 13 | Delivered | #15803D on #DCFCE7 | Must not be renamed, merged, skipped or reordered |
| 14 | Cancelled | #6B7280 on #F1F5F9 | Must not be renamed, merged, skipped or reordered |
| 15 | Rejected | #DC2626 on #FEE2E2 | Must not be renamed, merged, skipped or reordered |
| 16 | Quote Declined | #B91C1C on #FEE2E2 | Must not be renamed, merged, skipped or reordered |
| 17 | Quote Expired | #9A3412 on #FFEDD5 | Must not be renamed, merged, skipped or reordered |

Chips: pill radius, 6px dot in the state colour, 4px/10px padding, 9.5–10px bold label, background from the table. Never colour a chip by urgency — urgency is shown separately (age badge).

---

## 7. Navigation information architecture

```
WeQ4U Services
────────────────────────
OPERATIONS
  Operations Cockpit        → #cockpit
  Work Queue                → #queue
  Workflow Board            → #workflow
DOCUMENTS
  Reviews                   → #documents
QUOTES
  Revenue At Risk           → #quotes
  Awaiting Payment          → #quotes
FULFILMENT
  Deliveries                → #fulfilment
REPORTING
  Funnel / Ageing / Workload→ #reporting
ADMINISTRATION
  Audit Activity            → #activity
```

Every item must scroll to a real section of the cockpit — no dead links. Active item: primary tint background, primary text, 800 weight.

---

## 8. Component contracts (React)

| Component | Props | Responsibility |
| --- | --- | --- |
| `CockpitSidebar` | `active`, `onNavigate` | Grouped navigation, active state, scroll to section |
| `CockpitHeader` | `greeting`, `now`, `search`, `onSearch`, `dateRange`, `onDateRange`, `dept`, `onDept`, `teams`, `onRefresh`, `onExport`, `exported` | Sticky header + global controls |
| `KpiTile` | `label`, `value`, `sub`, `icon`, `color`, `tone` | Single KPI card |
| `LiveStrip` | `items[]` | Compact live "today" metrics |
| `WorkflowBoard` | none | Stage cards with counts + remaining states |
| `QueueCard` | `r` (request), `maxAge`, `onOpen` | CRM request card |
| `ReportWidgets` | none | Funnel, ageing, workload |
| `AnalyticsPanels` | none | Existing charts, restyled |
| `StatusChip` | `state`, `size`, `dot` | Colour-coded state pill |

Request shape: `{ ref, service, customer, state, team, ageDays, next }`. Age badge turns danger colour when `ageDays > maxAge` (default 5).

---

## 9. Roles (display only)

Founder/MD · System Administrator · Back Office Supervisor · Licensing Officer · PrDP Officer · Call Centre Agent · Finance · Compliance. The UI must not add or remove capabilities per role; role gates stay in the existing backend.

---

## 10. Reporting definitions (unchanged)

* **Funnel:** Received 132 → Quote Sent 58 → Accepted 46 → In Progress 39 → Completed 31.
* **Ageing:** 0–2 days 41 · 3–5 days 28 · 6–10 days 18 · 10+ days 9.
* **Workload:** Back Office 32 · Documents Team 11 · Finance 7 · Support 5.
* **Department backlog:** open vs overdue per department.
* **Revenue at risk:** outstanding quotes + outstanding payments + payment delays.

Only the visual form changes (bar → card, table → funnel). Values and definitions stay identical.

---

## 11. Behaviour to preserve

* Live counters (work in, work completed, revenue today) update every 4 seconds.
* Activity feed keeps a maximum of 6 entries, newest first.
* Export snapshot produces `weq4u-operations-snapshot.txt` with the same sections and totals.
* Refresh resets search, department and date filters and restores baseline counters.
* Search matches reference, service, customer, team and next action; department filter matches the owning team; date filter limits by request age.

---

## 12. Acceptance checklist

- [ ] All 17 states still exist and are reachable.
- [ ] No permission, transition, assignment or validation code changed.
- [ ] KPI values equal the values produced by the existing backend.
- [ ] Every report renders the same numbers as before.
- [ ] Audit trail unaffected and still visible.
- [ ] Sidebar collapses cleanly at 1100px; no horizontal page scroll at 958px.
- [ ] Every sidebar item scrolls to a real section.
- [ ] Chips use the state colour map, never status logic.
- [ ] Export snapshot is byte-identical in structure to the previous version.
- [ ] No console errors; no change to API routes or environment files.

---

## 13. Copilot prompt (use verbatim)

```text
Redesign the WeQ4U Admin Console (localhost:3001) to match the modern executive dashboard styling and UX patterns used in the Base44 eVoucher application.

DO NOT modify any backend workflows, permissions, state transitions, reports, APIs, validation rules, role restrictions, assignment logic, document review logic, quote logic, or audit functionality.

Preserve all operational workflows exactly as implemented.

Apply the following UX changes:

• Modern left navigation sidebar
• Executive operations cockpit landing page
• Rounded cards with large KPI metrics
• Modern workflow pipeline board
• CRM-style request workspace
• Status badges and chips
• Responsive grid layout
• Modern typography
• Soft shadows
• White card surfaces
• Light grey application background
• Consistent colour-coded workflow statuses
• Data visualisations for funnel, workload and ageing reports

Maintain all workflows:

Received
Clarification Required
Documents Under Review
Documents Required
Ready To Quote
Quote Sent
Quote Accepted
Awaiting Payment
In Progress
Submitted
Ready For Collection
Out For Delivery
Delivered
Cancelled
Rejected
Quote Declined
Quote Expired

Retain all permissions and operational reporting exactly as currently defined.

This is a UI/UX modernisation only.
```
