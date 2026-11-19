# GitHub Copilot Implementation Verification Request

## Objective

Verify that the current WeQ4UServices implementation supports the complete Phase 1.5 reference journey before any additional development begins.

The reference journey is:

**PrDP Application — Discover → Document → Decide → Ready for Payment**

This is the golden-path demonstration and the baseline journey for future service offerings. This request is for verification and reporting only; do not change application functionality as part of the assessment.

## Important

Do **not** implement or execute:

- PayFast checkout
- ITN processing
- Payment ledger records
- Payment intents
- Work In Progress
- Fulfilment
- Completion

These are future phases. The demonstration must terminate at **Ready for Payment**.

## Reference Documents

Use the following documents as the source of truth:

1. `WeQ4U-Phase-1.5-Test-Specification.md`
2. `PDF-Workflow Customer Journey 2026.pdf`
3. `12 Steps Storyboard - PrDP.PNG`

The first two files and the storyboard are located in the supplied Customer-Journey2026 reference folder. The storyboard is also represented in the supplied 12-step image. If the implementation differs from the specification, report a defect; the specification takes precedence over the code.

## Verification Scope

Verify the PrDP Application journey below. Mark each storyboard step as **Implemented**, **Partially Implemented**, or **Missing**, and support the assessment with reproducible evidence.

### DISCOVER

1. Customer selects PrDP Application.
2. Case is created.
3. PrDP checklist is attached to the case.
4. Status is **Request Started**.

### DOCUMENT

1. Customer uploads:
   - Copy of ID
   - Medical Certificate
   - Booking Confirmation
2. Documents are stored privately.
3. Documents are linked to the case.
4. Status is **Documents In Progress**.

### VERIFICATION

1. Readiness verification/scoring runs.
2. Readiness is recorded as **Ready** when the required documents pass.
3. Case enters the Admin Queue.

Do not describe a rule-based check as AI verification unless the implementation and run evidence establish that an AI agent actually performed it.

### DECIDE

1. Admin receives the case.
2. Admin reviews each document.
3. Admin approves or rejects each document; rejection blocks quote readiness.
4. Case moves to **Ready for Quote** only when all required documents are approved and assessment is recorded.
5. Quote is created.
6. Quote versioning is applied.
7. Supervisor approval is captured by a separate authorized user.
8. Approved quote is published to the customer.

### CUSTOMER

1. Customer views the published quote.
2. Customer accepts the quote.
3. Acceptance timestamp, customer, and accepted quote version are stored.

### DELIVER — PHASE 1.5 STOP

1. Case status becomes **Ready for Payment**.
2. A notification is queued/created.
3. The demonstration ends. Do not start payment, work, fulfilment, or completion.

## Mandatory Assertions

Confirm with case-correlated evidence:

- Case exists and has the PrDP checklist attached.
- Audit trail records each state change with actor, timestamp, and previous state.
- All three uploaded documents are stored privately and linked to the case.
- Verification/readiness result and individual document decisions exist.
- Quote history and version history exist.
- Supervisor approval history exists and is attributable to a different user from the quote creator.
- Customer acceptance, timestamp, and accepted version exist.
- Case reaches **Ready for Payment** and a notification is queued/created.

Confirm that the Phase 1.5 run does **not** create or invoke:

- Payment Intent
- PayFast Request or gateway call
- ITN Record
- Payment Ledger Entry
- Work In Progress status
- Fulfilment Record
- Completion Record

Use the exact application terminology when querying or reporting records. If a data store or event cannot be inspected, mark the assertion **Not Verified** rather than inferring success from a screen.

## Deliverables

### 1. Gap Analysis

For every storyboard step 1–12, report:

- Step number and expected outcome
- Status: **Implemented**, **Partially Implemented**, or **Missing**
- Evidence reference (test output, screenshot, record, or log)
- Defect or limitation, if applicable

### 2. Functional Validation

Execute all functional tests **FT-01 to FT-12** from `WeQ4U-Phase-1.5-Test-Specification.md`. Record actual results and evidence for each test. A test is not a pass unless it was executed and produced evidence.

### 3. Regression Validation

Execute all regression tests **RT-01 to RT-09** from the specification. Record actual results and evidence for each test.

### 4. Defect Log

For every defect, include an identifier, affected step/test, observed result, expected result, evidence, and severity:

- Critical
- High
- Medium
- Low

Do not silently change the specification to match current behavior.

### 5. Readiness Verdict

Choose exactly one verdict and provide evidence:

- ✅ READY FOR DEMO
- ⚠ READY FOR DEMO WITH KNOWN GAPS
- ❌ NOT READY FOR DEMO

Also list untested items, environment limitations, and any evidence that could not be collected.

## Test Execution and Evidence Rules

1. Use synthetic personas and fictional test documents only. Never use real identity numbers, medical records, or live customer data in test evidence.
2. Identify the environment, test data, case reference, and run time. Do not confuse historical screenshots or synthetic quote-demo records with evidence from this run.
3. Run the existing tests and user journey without weakening gates or changing product behavior to obtain a pass.
4. If a requested action cannot be performed safely in the available environment, report it as blocked/untested and explain why.
5. Preserve evidence for both successful and failed assertions. Redact secrets and personal data.
6. Report summary, the 12-step gap analysis, FT-01–FT-12 results, RT-01–RT-09 results, defect log, verdict, and untested items.

## Success Criteria

The system must demonstrate:

**Customer Request → Document Upload → Verification → Admin Review → Assessment → Quote → Approval → Publication → Acceptance → Ready for Payment**

without any payment functionality or fulfilment activity.

Only after this journey is verified and the verdict is **READY FOR DEMO** should development proceed to:

> “Just Bought a Car? Let’s sort the next steps.”
