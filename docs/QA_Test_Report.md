# WeQ4U Test Data Library - Automated Test Report

**Run time:** 2026-11-19T04:59:58.825Z  
**Environment:** Isolated temporary local API; no Base44 or production systems contacted.  
**Library:** `docs/Process_Documents/`

## Executive result

**Outcome: NOT READY FOR UNQUALIFIED SIGN-OFF.** The run processed 48 of 48 sample packs and 144 of 144 positive/provisional files were uploaded and downloaded byte-for-byte. The corrupt-PDF scenario was accepted by the API, contrary to its expected rejection. All submitted packs remained blocked from quote preparation until assessment.

## Scope and method

- Submitted each of the 48 packs through `POST /api/requests` using its mapped service type and variant. Provisional and unconfirmed checklist entries were not treated as approved requirements.
- Retrieved every uploaded file through the authenticated admin document endpoint and compared SHA-256 hashes against the source fixture.
- Attempted to move each newly submitted pack to Quote Preparation before staff assessment; expected the transition to be blocked.
- Exercised missing-document, unsupported-MIME, oversized-file, and the 10 catalogue negative fixtures. For semantic negatives, the automated check confirmed staff can reject the uploaded fixture and that the assessment remains not quote-ready; it did not claim automated OCR or identity/date recognition.
- This was API-level integration testing, not full browser/UI UAT or external authority validation.
- Browser/UI testing was not performed as part of this invocation.

## Local web-app smoke checks

- Browser UI checks were not run as part of this test invocation.

- These checks confirm local page-to-API connectivity and one interactive checklist. They do not claim that all 48 packs were submitted through browser file inputs.

## Separate quote-demo references (not part of this test run)

The document-library integration test created its own requests and evidence rows for the 48 sample packs. It did **not** use or assess the pre-existing synthetic quote-demo references below. Those records live in the separate isolated quote-demo API on port 4100; the normal development API on port 4000 does not contain them.

| Service | Request reference | Quote | Demo status |
|---|---|---|---|
| Driver's Licence | `WQ-2026-4778584AC255D77A4C7C` | `Q2026-0002` | Awaiting customer decision |
| PrDP | `WQ-2026-E6C17F49F41A3CAE9A7C` | `Q2026-0003` | Awaiting customer decision |
| Roadworthy | `WQ-2026-079D20628548E52904F2` | `Q2026-0004` | Awaiting customer decision |

These are historical synthetic quotes, not real commercial offers or evidence of payment/fulfilment. Their separate UI screenshots and limits are documented in [E2E-Visual-Quote-Demo-2026-11-13.md](./Gap_Analysis_2026/E2E-Visual-Quote-Demo-2026-11-13.md). The **NOT READY FOR UNQUALIFIED SIGN-OFF** outcome above applies to the document-library acceptance criteria, particularly the accepted corrupt-PDF fixture; it does not mean those quote-demo records failed.

## Results by service folder

| Service folder | Packs | Fixture files | Byte-identical round trips | Quote-preparation blocked |
|---|---:|---:|---:|---:|
| Learners_Licence | 3 | 9 | 9/9 | 3/3 |
| Drivers_Licence_Renewal | 3 | 6 | 6/6 | 3/3 |
| Drivers_Licence_Replacement | 3 | 6 | 6/6 | 3/3 |
| Temporary_Drivers_Licence | 3 | 6 | 6/6 | 3/3 |
| PrDP_Application | 3 | 9 | 9/9 | 3/3 |
| PrDP_Renewal | 3 | 9 | 9/9 | 3/3 |
| Vehicle_Registration | 9 | 42 | 42/42 | 9/9 |
| Licence_Disc_Renewal | 3 | 6 | 6/6 | 3/3 |
| Change_Of_Ownership | 9 | 33 | 33/33 | 9/9 |
| Duplicate_Documents | 3 | 6 | 6/6 | 3/3 |
| Roadworthy_Assistance | 3 | 6 | 6/6 | 3/3 |
| Traffic_Register | 3 | 6 | 6/6 | 3/3 |

## Negative scenarios

| Scenario | Fixture files | Observed result | Assessment |
|---|---:|---|---|
| Missing_Document | 1 | Fixture intentionally withheld; request moved to Awaiting Documents | PASS: quote preparation blocked (409) |
| Wrong_Document_Type | 1 | Observed | PASS with manual review: upload accepted; staff rejection blocked quote readiness |
| Expired_Document | 2 | Observed | PASS with manual review: upload accepted; staff rejection blocked quote readiness; PASS with manual review: upload accepted; staff rejection blocked quote readiness |
| Unreadable_Scan | 1 | Observed | PASS with manual review: upload accepted; staff rejection blocked quote readiness |
| Oversized_File | 1 | Observed | Rejected by upload-size limit |
| Corrupt_File | 1 | Acceptance criterion not met | FAIL: corrupt PDF accepted; manual rejection works, but upload integrity is not checked |
| Name_Mismatch | 2 | Observed | PASS with manual review: upload accepted; staff rejection blocked quote readiness; PASS with manual review: upload accepted; staff rejection blocked quote readiness |
| Future_Dated | 1 | Observed | PASS with manual review: upload accepted; staff rejection blocked quote readiness |

## Findings

- **NOTE: Wrong_Document_Type requires human verification.** The upload endpoint accepts the file; the negative control confirmed that staff can reject it and that quote preparation remains blocked. Automatic content classification is not implemented or claimed.
- **NOTE: Expired_Document requires human verification.** The upload endpoint accepts the file; the negative control confirmed that staff can reject it and that quote preparation remains blocked. Automatic content classification is not implemented or claimed.
- **NOTE: Unreadable_Scan requires human verification.** The upload endpoint accepts the file; the negative control confirmed that staff can reject it and that quote preparation remains blocked. Automatic content classification is not implemented or claimed.
- **HIGH: Corrupt PDF upload is accepted.** The corrupt-PDF fixture was accepted with HTTP 201 because the upload endpoint checks declared MIME type and size but does not validate PDF structure. Staff can reject it afterward, but the library acceptance criterion for corrupt-file rejection is not met.
- **NOTE: Name_Mismatch requires human verification.** The upload endpoint accepts the file; the negative control confirmed that staff can reject it and that quote preparation remains blocked. Automatic content classification is not implemented or claimed.
- **NOTE: Future_Dated requires human verification.** The upload endpoint accepts the file; the negative control confirmed that staff can reject it and that quote preparation remains blocked. Automatic content classification is not implemented or claimed.

## Interpretation and limitations

- Successful upload and byte-for-byte retrieval establish file intake/storage behavior only. They do **not** prove that every fixture corresponds to the current customer checklist or that its contents are authentic or correct.
- Checklist content remains reference-only; requirements explicitly marked provisional remain unconfirmed pending business approval.
- Semantic negative fixtures (expired, unreadable, mismatched name, or future-dated) require staff review in the current workflow. This report does not claim that the application automatically detects those properties.
- The application has not been tested against live payments, email delivery, an authority, or a production database. No customer data was used.
- Detailed per-file evidence, HTTP results, byte sizes, and hashes are in [QA_Test_Evidence.csv](./QA_Test_Evidence.csv).

## Recommendation

Resolve the corrupt-file validation gap or record a formally accepted manual-review control, confirm the provisional checklists with the service owner, and then repeat the suite before sponsor sign-off.
