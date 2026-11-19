# WeQ4U Test Data Library: Technical Build Specification for GitHub Copilot

Version 1.0 | 17 November 2026 | Owner: WeQ4U (william-mpeta/WeQ4UServices) | Target: reproduce the delivered QA library exactly.

---

## 0. What you must build

A static, versioned library of fictional South African transport-document samples, plus the web page that serves them. It is used for automated and manual testing of the WeQ4U service request, document-upload, verification and quote-readiness flows.

The delivered library is the reference implementation. Reproduce its structure, counts, filenames and visual treatment. Do not redesign it, do not add services, do not add documents.

Deliverable counts (these are the acceptance gate):

| Item | Required |
|---|---|
| Service folders | 12 |
| Sample packs (Sample_01 to Sample_03 per variant) | 48 |
| Sample documents in positive/provisional packs | 144 |
| Negative scenarios | 8 |
| Total files in the archive | 224 |
| Archive size | about 1.6 MB |

Nothing else in the product may change as a side effect of this work.

---

## 1. Non-negotiable safety rules

1. Every readable document carries the text **TEST DOCUMENT - NOT FOR OFFICIAL USE** twice: a faint diagonal watermark across the body and a solid footer bar.
2. Every identity, address, vehicle, licence and reference number is synthetic. No real person, no public figure, no real vehicle.
3. No official coat of arms, government logo, bank logo, dealership logo, stamp image or signature image. Use a labelled placeholder block instead: **SAMPLE STAMP / SIGNATURE BLOCK: TEST ONLY - NOT SIGNED OR CERTIFIED**.
4. No document may be a copy, scan or redrawing of a real government document. Build generic mock-ups that carry the same information fields.
5. Use unmistakably invalid identifiers such as `TEST-ID-001` and `TEST-PROXY-ID-001`. Never generate checksum-valid, government-format identity numbers. These fixtures test file upload and manual review, not national-ID checksum validation.
6. No clinical, legal, certification or payment meaning. Medical fixtures state **FICTIONAL QA CLINIC - NO CLINICAL ASSESSMENT**. Fee fixtures state **SYNTHETIC, NOT A PAYMENT**.
7. Provisional packs must never be presented as a list of requirements. See section 8.

---

## 2. Folder tree (exact)

Create at the repository root:

```
docs/Required_Documents/
├── README.md
├── CATALOGUE.csv
├── Learners_Licence/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Drivers_Licence_Renewal/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Drivers_Licence_Replacement/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Temporary_Drivers_Licence/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── PrDP_Application/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── PrDP_Renewal/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Vehicle_Registration/
│   ├── New_Registration/Sample_01..03/
│   ├── Bank_Finance/Sample_01..03/
│   └── Dealership/Sample_01..03/
├── Licence_Disc_Renewal/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Change_Of_Ownership/
│   ├── Dealership_Sale/Sample_01..03/
│   ├── Bank_Finance/Sample_01..03/
│   └── _PROVISIONAL_Private_Sale/Sample_01..03/
├── Duplicate_Documents/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Roadworthy_Assistance/
│   ├── Sample_01/  Sample_02/  Sample_03/
├── Traffic_Register/
│   ├── Sample_01/  Sample_02/  Sample_03/
└── _Negative_Scenarios/<scenario_name>/
```

Folder names are exact. Do not rename, reorder or prefix the twelve service folders. Keep the leading underscore on `_PROVISIONAL_Private_Sale` and on `_Negative_Scenarios`.

Every sample pack folder contains its documents plus a `README.md`. Every service folder contains a `README.md`. Every negative scenario folder contains its fixtures plus a `README.md`.

---

## 3. Sample packs and document matrix (exact)

Each row below is one variant. Every variant has three packs: `Sample_01`, `Sample_02`, `Sample_03`. In each pack the filename suffix is 001, 002 or 003 to match the pack.

### 3.1 Reference checklists (9 packs per service, 3 documents per pack)

**Learners_Licence** (3 docs x 3 packs = 9)
| Document label | File pattern | Type |
|---|---|---|
| Copy of ID | Copy_of_ID_00N | PNG |
| Learner's licence | Learners_licence_00N | PNG |
| Booking confirmation | Booking_confirmation_00N | PDF |

**Drivers_Licence_Renewal** (2 docs x 3 = 6)
| Document label | File pattern | Type |
|---|---|---|
| Copy of ID | Copy_of_ID_00N | PNG |
| Booking fee confirmation | Booking_fee_confirmation_00N | PDF |

**PrDP_Application** (3 docs x 3 = 9)
| Document label | File pattern | Type |
|---|---|---|
| Copy of ID | Copy_of_ID_00N | PNG |
| Medical certificate | Medical_certificate_00N | PDF |
| Booking fee confirmation | Booking_fee_confirmation_00N | PDF |

**PrDP_Renewal** (3 docs x 3 = 9): same three documents as PrDP_Application.

**Licence_Disc_Renewal** (2 docs x 3 = 6)
| Document label | File pattern | Type | Status |
|---|---|---|---|
| Copy of ID | Copy_of_ID_00N | PNG | required |
| Existing licence disc | Existing_licence_disc_00N | PNG | optional |

**Roadworthy_Assistance** (2 docs x 3 = 6)
| Document label | File pattern | Type | Status |
|---|---|---|---|
| Owner ID copy | Owner_ID_copy_00N | PNG | required |
| Existing roadworthy certificate | Existing_roadworthy_certificate_00N | PDF | optional |

### 3.2 Vehicle_Registration (3 variants x 3 packs = 9 packs, 42 documents)

**New_Registration** (3 docs per pack)
| Document label | File pattern | Type |
|---|---|---|
| Certified owner ID copy | Certified_owner_ID_copy_00N | PNG |
| Proof of residence | Proof_of_residence_00N | PNG |
| Purchase documentation | Purchase_documentation_00N | PDF |

**Bank_Finance** (5 docs per pack)
| Document label | File pattern | Type |
|---|---|---|
| Bank settlement letter | Bank_settlement_letter_00N | PDF |
| Bank proxy ID copy | Bank_proxy_ID_copy_00N | PNG |
| Buyer ID copy | Buyer_ID_copy_00N | PNG |
| Buyer proof of residence | Buyer_proof_of_residence_00N | PNG |
| Roadworthy certificate | Roadworthy_certificate_00N | PDF |

**Dealership** (6 docs per pack)
| Document label | File pattern | Type |
|---|---|---|
| Dealer proxy ID copy | Dealer_proxy_ID_copy_00N | PNG |
| Dealer BRN certificate | Dealer_BRN_certificate_00N | PDF |
| NCO form with dealer stamp | NCO_form_with_dealer_stamp_00N | PDF |
| Buyer ID copy | Buyer_ID_copy_00N | PNG |
| Buyer proof of residence | Buyer_proof_of_residence_00N | PNG |
| Roadworthy certificate | Roadworthy_certificate_00N | PDF |

### 3.3 Change_Of_Ownership (3 variants x 3 packs = 9 packs, 33 documents)

**Dealership_Sale** (6 docs per pack)
| Document label | File pattern | Type |
|---|---|---|
| Dealer proxy ID | Dealer_proxy_ID_00N | PNG |
| Dealer BRN certificate | Dealer_BRN_certificate_00N | PDF |
| Stamped NCO form | Stamped_NCO_form_00N | PDF |
| Buyer ID copy | Buyer_ID_copy_00N | PNG |
| Buyer proof of residence | Buyer_proof_of_residence_00N | PNG |
| Roadworthy certificate | Roadworthy_certificate_00N | PDF |

**Bank_Finance** (3 docs per pack)
| Document label | File pattern | Type |
|---|---|---|
| Bank settlement letter | Bank_settlement_letter_00N | PDF |
| Bank proxy ID | Bank_proxy_ID_00N | PNG |
| Roadworthy certificate | Roadworthy_certificate_00N | PDF |

**_PROVISIONAL_Private_Sale** (2 docs per pack, provisional): see section 8.

### 3.4 Provisional services (2 docs x 3 packs = 6 each)

**Drivers_Licence_Replacement**, **Temporary_Drivers_Licence**, **Duplicate_Documents**, **Traffic_Register** each contain, per pack:

| Document label | File pattern | Type |
|---|---|---|
| Identity test fixture | Identity_test_fixture_00N | PNG |
| Checklist pending confirmation | Checklist_pending_confirmation_00N | PDF |

Count check: 9 + 6 + 6 + 6 + 9 + 9 + 42 + 6 + 33 + 6 + 6 + 6 = **144**.

---

## 4. Fictional personas (exact, reuse verbatim)

Three people are reused across every service so the same person and vehicle appear consistently. Do not invent extra personas.

| Field | Sample_01 (001) | Sample_02 (002) | Sample_03 (003) |
|---|---|---|---|
| Full name | Naledi QA Molefe | Thabo QA Dlamini | Lerato QA Nkosi |
| Synthetic ID (intentionally invalid format) | TEST-ID-001 | TEST-ID-002 | TEST-ID-003 |
| Synthetic proxy ID (intentionally invalid format) | TEST-PROXY-ID-001 | TEST-PROXY-ID-002 | TEST-PROXY-ID-003 |
| Fictional address | 17 Fictional Crescent, Mamelodi, Gauteng | 28 Example Avenue, Soshanguve, Gauteng | 39 Sample Street, Midrand, Gauteng |
| Test mobile | 0000000001 | 0000000002 | 0000000003 |
| Test email | qa.sample01@example.test | qa.sample02@example.test | qa.sample03@example.test |
| Vehicle registration | TEST 001 GP | TEST 002 GP | TEST 003 GP |
| Synthetic VIN | TESTVIN00000000001 | TESTVIN00000000002 | TESTVIN00000000003 |
| Synthetic engine number | TEST-ENGINE-001 | TEST-ENGINE-002 | TEST-ENGINE-003 |
| Test reference | TEST-WQ4U-2026-001 | TEST-WQ4U-2026-002 | TEST-WQ4U-2026-003 |

Proxy documents (bank proxy, dealer proxy) must show a separate `TEST-PROXY-ID-00N` value, never the buyer's test ID, and must label the person as **TEST PROXY**.

---

## 5. PDF rendering rules (A4, 1 page)

Use a standard PDF writer (jsPDF, Puppeteer, WeasyPrint or equivalent). One page per document. Required elements:

1. Dark green header band (#0D4037) with **WeQ4U | QA TEST DOCUMENT** and the subline **FICTIONAL FIXTURE - NO GOVERNMENT, BANK OR MEDICAL AUTHORITY**.
2. The document title at heading size, derived from the document label (for example *Copy of ID*, *Bank settlement letter*).
3. The service or variant name underneath in small grey text.
4. A label and value table, at minimum: fixture state, customer or applicant, synthetic ID, fictional address, test contact, test email, vehicle registration, synthetic VIN, test engine number, test reference, issue date, expiry or review date.
5. Proxy documents replace the person row with **TEST PROXY** and use the proxy ID row.
6. Conditional rows: booking date for booking documents; **ZAR 100.00 - SYNTHETIC, NOT A PAYMENT** for fee, purchase and settlement documents; **FICTIONAL QA CLINIC - NO CLINICAL ASSESSMENT** for medical documents.
7. A diagonal watermark across the body: **TEST DOCUMENT - NOT FOR OFFICIAL USE**.
8. A note block stating that all values are synthetic and that no identity verification, certification, examination, payment, transfer or registration has occurred, or, for provisional packs, that the checklist is unconfirmed.
9. The placeholder stamp block.
10. Amber footer bar (#F2B233) with **TEST DOCUMENT - NOT FOR OFFICIAL USE**, the library name, the baseline date and **Page 1 of 1**.

Defaults: issue date 2026-11-10, expiry or review date 2027-02-10. Documents with a 2023 expiry belong only in the negative scenarios.

---

## 6. PNG rendering rules (1500 x 1000 px)

Used for identity cards, licence cards, disc images and forms that a customer would photograph. Required elements:

1. Off-white canvas inside a thick dark green border.
2. Dark green top band with **WEQ4U QA - FICTIONAL TEST FIXTURE**.
3. The document type in dark green capitals.
4. The same label and value fields as the PDF, using the persona data.
5. One of the two state lines: **PROVISIONAL - CHECKLIST NOT CONFIRMED** or **SOFTWARE TESTING ONLY - NO LEGAL VALIDITY**.
6. A diagonal watermark reading **TEST DOCUMENT - NOT FOR OFFICIAL USE**.
7. Amber bottom band repeating **TEST DOCUMENT - NOT FOR OFFICIAL USE**.

A crisp, high-contrast result matters because these files prove that image upload and OCR or manual review paths work.

---

## 7. Per-folder README files

Each sample pack `README.md` states:

- Service, variant and sample name.
- The checklist state: reference or provisional.
- A one-line warning for provisional packs: illustrative fixtures only, not a list of requirements.
- The fictional customer name, synthetic ID and fictional vehicle.
- The line: All files are TEST DOCUMENTS - NOT FOR OFFICIAL USE.

Each service folder `README.md` states the service name, the checklist state, a note that no new legal or operational approval is implied, and for Change_Of_Ownership an explicit line that Private Sale is provisional with no confirmed checklist.

The root `README.md` explains scope, safety, folder structure, checklist status, baseline dates and the fact that no external test has been executed. It must not claim test results.

---

## 8. Provisional handling

The following have no confirmed checklist: Driver's Licence Replacement, Temporary Driver's Licence, Duplicate Documents, Traffic Register, and Change of Ownership: Private Sale.

Rules:

1. Keep the requested top-level folder names unchanged.
2. Put provisional status inside the pack: filename labels **Identity test fixture** and **Checklist pending confirmation**, a provisional README line, and the provisional state line on the rendered document.
3. Mark every provisional catalogue row with the value PROVISIONAL_NOT_A_REQUIREMENT in the required_or_optional column.
4. Never let provisional files satisfy a real "documents complete" rule in the application under test without an explicit override.

---

## 9. CATALOGUE.csv

UTF-8 with BOM, CRLF line endings, every value quoted. Header:

```
service,variant,sample,document_name,required_or_optional,file_type,size_kb,negative_scenario,expected_result,relative_path
```

Rules:

- One row per document file, including the 10 negative fixture files.
- `service` is the top-level folder name; `variant` is the sub-folder name or empty.
- `required_or_optional` is one of: required, optional, PROVISIONAL_NOT_A_REQUIREMENT, negative_fixture.
- `negative_scenario` is empty for positive rows.
- `relative_path` is the path inside the archive, for example `Learners_Licence/Sample_01/Copy_of_ID_001.png`.
- Positive rows: 144. Negative rows: 10.

---

## 10. Negative scenarios (8 folders, 10 fixture files)

| Folder | Files | Purpose | Expected application behaviour |
|---|---|---|---|
| Missing_Document | Copy_of_ID_001.png | Only the ID is present; booking fee confirmation absent | Request stays incomplete; never quote-ready |
| Wrong_Document_Type | Not_An_ID_001.pdf | Fictional shop receipt submitted where an ID is expected | Type mismatch or manual verification warning |
| Expired_Document | Expired_Medical_Certificate_001.pdf, Expired_Roadworthy_Certificate_001.pdf | Both expired in 2023 | Expired document warning or rejection |
| Unreadable_Scan | Unreadable_ID_001.png | Near-blank, low-contrast image | Unreadable scan warning or manual failure |
| Oversized_File | Oversized_Test_9MiB.pdf | Structurally valid PDF padded to exactly 9 MiB, above the 8 MB limit | File size rejection |
| Corrupt_File | Corrupt_Document.pdf | Intentionally truncated, invalid PDF bytes | Unreadable or corrupt file rejection |
| Name_Mismatch | Buyer_ID_Copy_001.png, Purchase_Documentation_002.pdf | The buyer in the purchase document is a different persona | Identity mismatch flag during verification |
| Future_Dated | Future_Issued_Booking_Confirmation_001.pdf | ISSUE date set to 2090-01-01 | Future issue-date warning; policy needs confirmation |

Important: a future *booking* date is normal and must not be rejected. Only a future *issue* date is the negative case. The fixture note must say so.

---

## 11. Packaging

1. Per-sample ZIP: `<Service>__<Variant>__<Sample>.zip` (double underscore between parts), containing the pack under `docs/Required_Documents/`.
2. Per-service ZIP: `<Service>.zip`, containing every pack of that service under the same root.
3. `Negative_Scenarios.zip` for the eight scenarios under the same root.
4. Full library: `Required_Documents.zip`, containing `README.md`, `CATALOGUE.csv` and all folders under `docs/Required_Documents/`.
5. Archive entry names use forward slashes and a fixed timestamp. Deflate compression, standard ZIP, no encryption.
6. Every archive must open cleanly with Windows Explorer, macOS Archive Utility and `unzip -t`.

---

## 12. Base44-only delivery

Provide the library inside the authorized WeQ4U Base44 project as a downloadable QA resource. Do not add a route, asset, or download link to the public WeQ4UServices storefront or this repository's customer-facing site.

1. Make the full library ZIP available as a downloadable Base44 project artifact.
2. Provide separate downloads for `README.md`, `CATALOGUE.csv`, each service ZIP, each sample-pack ZIP, and `Negative_Scenarios.zip`.
3. If Base44 provides a project-internal resource page, restrict it to authorized project collaborators. Show the warning **TEST DOCUMENTS: NOT FOR OFFICIAL USE. Synthetic people and vehicle details only.**
4. Show the summary: 12 service folders, 48 sample packs, 144 positive/provisional documents, and 8 negative scenarios.
5. Label provisional content as illustrative fixtures, not confirmed requirements.
6. Warn that the corrupt PDF and 9 MiB file are intentionally invalid uploads.
7. Nothing may imply that upload, verification, quote-readiness, or regression tests against the WeQ4UServices application have passed.
8. Re-render the generated fixtures using invalid `TEST-ID-00N` placeholders before attaching or distributing the library. Existing generated files that contain checksum-valid identity-shaped values are not approved for Base44 upload.

---

## 13. Positive test cases

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| P-01 | Complete learner application | Learners_Licence/Sample_01 | All three documents accepted; request marked documents complete |
| P-02 | Complete driver's licence renewal | Drivers_Licence_Renewal/Sample_02 | After staff verification, continue only if the existing assessment, service-eligibility and active-pricing gates pass; document upload alone must not enable a quote |
| P-03 | Complete PrDP new application | PrDP_Application/Sample_03 | Three accepted including the medical certificate |
| P-04 | PrDP renewal | PrDP_Renewal/Sample_01 | Three accepted |
| P-05 | Disc renewal without the optional disc | Licence_Disc_Renewal/Sample_01 minus Existing_licence_disc | Accepted; optional item not blocking |
| P-06 | Disc renewal with the optional disc | Licence_Disc_Renewal/Sample_02 | Accepted; optional item recorded |
| P-07 | New vehicle registration | Vehicle_Registration/New_Registration/Sample_01 | Three accepted |
| P-08 | Bank-financed registration | Vehicle_Registration/Bank_Finance/Sample_02 | Five accepted, proxy identity distinct from buyer |
| P-09 | Dealership registration | Vehicle_Registration/Dealership/Sample_03 | Six accepted |
| P-10 | Dealership change of ownership | Change_Of_Ownership/Dealership_Sale/Sample_01 | Six accepted |
| P-11 | Bank-financed change of ownership | Change_Of_Ownership/Bank_Finance/Sample_02 | Three accepted |
| P-12 | Roadworthy assistance with optional certificate | Roadworthy_Assistance/Sample_03 | Accepted |
| P-13 | Mixed formats in one pack | Any pack containing both PDF and PNG | Both formats upload and render in review |
| P-14 | Persona consistency | Any pack | Same name, ID, address, registration and VIN across every document in the pack |
| P-15 | Repeat submission | Two packs of the same service | Second request handled independently, no cross-contamination |
| P-16 | Provisional pack submission | Duplicate_Documents/Sample_01 | Upload works, but the flow must not treat the files as confirmed requirements |

---

## 14. Negative test cases

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| N-01 | Missing document | Missing_Document/Copy_of_ID_001.png only | Incomplete; quote blocked |
| N-02 | Wrong document type | Wrong_Document_Type/Not_An_ID_001.pdf | Type mismatch or manual warning |
| N-03 | Expired medical certificate | Expired_Document/Expired_Medical_Certificate_001.pdf | Expired warning or rejection |
| N-04 | Expired roadworthy certificate | Expired_Document/Expired_Roadworthy_Certificate_001.pdf | Expired warning or rejection |
| N-05 | Unreadable scan | Unreadable_Scan/Unreadable_ID_001.png | Unreadable warning or manual failure |
| N-06 | Oversized upload | Oversized_File/Oversized_Test_9MiB.pdf | Rejected for exceeding 8 MB |
| N-07 | Corrupt file | Corrupt_File/Corrupt_Document.pdf | Rejected as unreadable |
| N-08 | Name mismatch | Name_Mismatch/Buyer_ID_Copy_001.png plus Purchase_Documentation_002.pdf | Identity mismatch flag |
| N-09 | Future issue date | Future_Dated/Future_Issued_Booking_Confirmation_001.pdf | Future issue-date warning |
| N-10 | Control: future booking | Any booking document with a future booking date | Accepted; must not be rejected |

---

## 15. Definition of done

```
1. 12 service folders exist with the exact names in section 2.
2. 48 sample pack folders exist; each contains its documents and a README.md.
3. 144 positive or provisional documents exist; counts per service match section 3.
4. 8 negative scenario folders exist with 10 fixture files and a README.md each.
5. Total archive entries = 224 (144 documents + 48 sample READMEs + 12 service READMEs
   + 10 negative fixtures + 8 negative READMEs + root README + CATALOGUE.csv).
6. CATALOGUE.csv has 154 data rows and the exact header from section 9.
7. Every readable file shows the watermark and the footer text.
8. No file contains an official logo, seal, signature, real name, checksum-valid identity-shaped number, or other real identity number.
9. All archives pass an integrity test and open on Windows and macOS.
10. The delivery page renders every folder with correct counts and all downloads resolve.
```

Add an automated check that fails the build when: a folder is missing, a pack has fewer documents than specified, the watermark text is absent from a generated file, or the total counts differ from 144 / 48 / 8 / 224.

---

## 16. Baselines, gaps and open items

- Baseline date for all fixtures: **17 November 2026**.
- Positive fixture issue date 2026-11-10, expiry or review 2027-02-10. Revalidation is needed after February 2027.
- Reference checklists are inherited from the earlier supplied brief. They were not re-validated against the current live request form and are not approved requirements.
- Access decision: Base44 project artifacts only; do not expose this library from the public storefront. Checklist rows remain reference-only and unapproved unless WeQ4U operations approves them.
- This library has not been uploaded to or tested against the external WeQ4U application. Expected results above are test instructions, not evidence of executed tests.

---

End of specification. Reproduce the delivered structure exactly, and change nothing outside the test data library.
