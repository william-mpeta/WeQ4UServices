# WeQ4U Required Documents: generated QA library

Generated: 17 November 2026.

This archive contains actual PDF and PNG files, not a generation specification. Extract at the destination project root to create docs/Required_Documents/.

## Contents

- 12 requested service folders, keeping their exact names.
- 48 customer packs: three samples per variant.
- 144 positive/provisional documents.
- Eight negative scenarios, including deliberately corrupt and oversized files.
- CATALOGUE.csv with exact document labels, file paths, sizes and expected results.

## Safety and scope

Every readable document is marked TEST DOCUMENT - NOT FOR OFFICIAL USE with a diagonal watermark and footer. Identity fields use unmistakably invalid placeholders such as TEST-ID-001; they are not valid customer identifiers. Use this library only for local QA, never for customer submissions. No official logos, seals or signatures should be used. Files are generic QA mock-ups, not copies of government documents.

Baseline date: 2026-11-17. Positive fixture issue date: 2026-11-10; review/expiry: 2027-02-10. Revalidate date-dependent tests when using this library later. Future bookings are normal; the future-dated negative fixture tests a future ISSUE date.

## Checklist status

Reference checklists come from the previous supplied brief. The live localhost request form and the external WeQ4UServices repository are not available here and were not revalidated. Reference is not approval. Learner requirements specifically still need confirmation.

Driver's Licence Replacement, Temporary Driver's Licence, Duplicate Documents, Traffic Register and Private Sale have no confirmed checklist. Their samples are PROVISIONAL and contain only an identity test fixture and a clearly labelled checklist-pending notice. These files do not establish requirements. Top-level folder names are kept exactly as requested; provisional status is recorded in each folder, sample and catalogue row.

## Folder structure

- Learners_Licence/
  - Sample_01/, Sample_02/, Sample_03/
- Drivers_Licence_Renewal/
  - Sample_01/, Sample_02/, Sample_03/
- Drivers_Licence_Replacement/
  - Sample_01/, Sample_02/, Sample_03/
- Temporary_Drivers_Licence/
  - Sample_01/, Sample_02/, Sample_03/
- PrDP_Application/
  - Sample_01/, Sample_02/, Sample_03/
- PrDP_Renewal/
  - Sample_01/, Sample_02/, Sample_03/
- Vehicle_Registration/
  - New_Registration/Sample_01/, Sample_02/, Sample_03/
  - Bank_Finance/Sample_01/, Sample_02/, Sample_03/
  - Dealership/Sample_01/, Sample_02/, Sample_03/
- Licence_Disc_Renewal/
  - Sample_01/, Sample_02/, Sample_03/
- Change_Of_Ownership/
  - Dealership_Sale/Sample_01/, Sample_02/, Sample_03/
  - Bank_Finance/Sample_01/, Sample_02/, Sample_03/
  - _PROVISIONAL_Private_Sale/Sample_01/, Sample_02/, Sample_03/
- Duplicate_Documents/
  - Sample_01/, Sample_02/, Sample_03/
- Roadworthy_Assistance/
  - Sample_01/, Sample_02/, Sample_03/
- Traffic_Register/
  - Sample_01/, Sample_02/, Sample_03/
- _Negative_Scenarios/

## Using the files

Normal PDF/PNG fixtures are under 8 MB. The oversized negative PDF is 9 MiB intentionally; the corrupt PDF is deliberately invalid. Three consistent fictional people are reused across services, with matching names, IDs, addresses, vehicle registrations and VINs within each sample. Proxy identity fields are separately labelled.

Individual sample ZIPs and service ZIPs use the same docs/Required_Documents/ root, so they can be merged on extraction. Delivery is for authorized Base44 project collaborators only; do not add a public storefront route.

No upload, quote-readiness, verification or regression test has been run against the external application. Expected outcomes in CATALOGUE.csv are test instructions, not test results. The quotation implementation report is a separate specification, not proof that PDF rendering changes were implemented.
