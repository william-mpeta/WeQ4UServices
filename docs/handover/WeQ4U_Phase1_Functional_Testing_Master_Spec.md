# WeQ4U_Phase1_Functional_Testing_Master_Spec

**Project:** WeQ4U Services · **Version:** 1.0 · **Status:** Controlled reference for GitHub Copilot
**Companion document:** WeQ4U_Service_Fulfilment_Framework_v1.0

## Objective
Determine what has been implemented, what works end to end, what does not work, what is partially implemented, and what must be completed before Phase 2 (Vehicle Ownership Concierge, Dealerships, Banks, Fleet Services).

This document does not redesign the system, the architecture or the technology stack. It is a specification to test against.

## Scope
- `DL-LEARNER` Learner's Licence — Not Implemented
- `DL-NEW-TEST` New Driver's Licence Test — Not Implemented
- `DL-RENEWAL` Driver's Licence Renewal — Implemented
- `DL-REPLACEMENT` Driver's Licence Replacement — Partial
- `DL-TEMPORARY` Temporary Driver's Licence — Partial
- `PRDP-NEW` PrDP Application — Implemented
- `PRDP-RENEWAL` PrDP Renewal — Implemented
- `VR-LICENCE-DISC` Licence Disc Renewal — Implemented
- `VR-REGISTRATION` Vehicle Registration — Partial
- `VR-CHANGE-OWNER` Change of Ownership — Implemented
- `VR-DUPLICATE-DOCUMENTS` Duplicate Documents — Partial
- `VR-ROADWORTHY` Roadworthy Certificate Assistance — Not Implemented
- `VR-TRAFFIC-REGISTER` Traffic Register — Partial

Phase 2 (documentation only, not to be implemented): Vehicle Ownership Concierge; Dealership Concierge Services; Dealer Delivery Services; Dealer Bulk Registration Services; Trade-In Services; Bank Settlement Assistance; Vehicle Release Assistance; Financed Vehicle Registration; Fleet Services; Corporate Vehicle Compliance.

## Status definitions
| Status | Meaning |
| --- | --- |
| Implemented | Service definition, document checklist, verification and readiness rules and an active pricing profile exist, and the full pre-sale lifecycle works end to end in the portal. |
| Partial | The generic request and quote lifecycle can carry the request, but the service definition, document checklist, readiness rules or pricing profile are missing or incomplete. |
| Not Implemented | The service needs a capability that does not exist at all (a booking, an appointment or a third-party certificate), so it cannot be completed even if a quote is issued. |

> No Phase 1 service currently captures fulfilment evidence (processing, appointment, certificate, delivery, closure). A service marked Implemented has a definition, an active price and a working pre-sale lifecycle; the completion half is a shared gap (defect D5 and D6).

## Master fulfilment workflow
| # | Stage | Customer label | Staff status | Status | What testing must show |
| --- | --- | --- | --- | --- | --- |
| 1 | Request Submitted | Request Received | New | Implemented | Reference issued at submission. |
| 2 | Documents Requested | Documents Needed | Awaiting Documents | Partial | Checklist exists but is not driven by a service definition. |
| 3 | Documents Uploaded | Documents Needed | Awaiting Documents | Implemented | Upload and replace work; no type validation against the checklist. |
| 4 | Documents Verified | Reviewing Information | Documents Verified | Implemented | Verify / reject with reason is in place. |
| 5 | Service Assessment | Reviewing Information | Assessment | Implemented | Scope and package confirmed by staff. |
| 6 | Readiness Assessment | Reviewing Information | Ready To Quote | Partial | Gate exists; rules are not yet per service definition. |
| 7 | Quote Draft | Reviewing Information | Quote Draft | Implemented | Auto-price for the 5 seeded services; manual lines elsewhere. |
| 8 | Internal Preview | Reviewing Information | Quote Draft | Implemented | Preview before submission for approval. |
| 9 | Independent Approval | Reviewing Information | Pending Approval | Partial | Approval step exists; not proven to block the preparer. |
| 10 | Publication | Quote Available | Published | Implemented | Quote becomes visible to the customer. |
| 11 | Customer Decision | Quote Available | Awaiting Customer | Partial | Accept noted; decline and change-request paths unproven. |
| 12 | Payment Verification | Awaiting Payment | Payment Pending | Partial | Status only; no verification record or gateway event. |
| 13 | Processing | Processing | Processing | Not Implemented | Not modelled. Work starts without a released state. |
| 14 | Fulfilment | Processing | Processing | Not Implemented | No per-service work steps or department routing. |
| 15 | Completion | Ready | Ready For Delivery | Not Implemented | No completion rule or evidence capture. |
| 16 | Closure | Completed | Completed / Closed | Not Implemented | No closure, archive or retention handling. |

Gate order that must never be bypassed: Documents verified -> Readiness met -> Quote approved -> Published -> Accepted -> Payment verified -> Processing

## Phase 1 services
## 1. Learner's Licence

**Service code:** `DL-LEARNER` · **Category:** Driver Licensing · **Pricing:** Estimate · **Status:** **Not Implemented**

**Description.** Application for a learner's licence and booking of the test on the customer's behalf, including eye-test coordination and the test date.

### Customer journey
- Customer submits a learner's licence request.
- Portal lists the exact documents needed.
- Customer uploads ID, proof of address and eye test.
- We verify the file and confirm a test centre.
- Estimate is published with the department fee shown separately.
- Customer accepts and pays; booking is made and the date is sent.

### Staff workflow
- Confirm the service code and the preferred test centre.
- Issue the document checklist from the service definition.
- Verify each document; reject with a plain-language reason.
- Check eligibility: age, existing learner's licence, centre capacity.
- Build the estimate from fee lines, preview it, submit for approval.
- On payment verified: book the test, record the reference and date.

### Required documents
- Certified copy of ID (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Eye test certificate from an accredited optometrist (mandatory)
- Passport photo (optional, centre dependent)

### Verification rules
- ID copy is certified and names match the applicant.
- Proof of address is current and in the applicant's name.
- Eye test is valid and within its validity period.
- No learner's licence already exists on record.

### Readiness rules — a quote may be generated only when
- Every mandatory document is verified, none rejected.
- A test centre and window are available.
- The estimate has been previewed and approved.

### Pricing strategy
**Estimate.** Estimate range is published. Variance above the approved tolerance needs re-approval before the booking is made.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Booking reference and test date recorded and visible to the customer, with the outcome captured afterwards.

### Failure conditions
- Eye test missing, expired or from an unaccredited optometrist.
- No centre capacity in the requested window.
- Customer declines the estimate.
- Quote expires unpaid before the booking is made.

### Status finding
No service definition, no document checklist, no booking capability and no pricing profile. Only the generic request and quote screens exist.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Submit a complete learner file, publish estimate, accept and pay | Estimate generated from fee lines; booking created on payment verified | Quote Available → Awaiting Payment | Published → Payment Pending |   |
| Submit without an eye test certificate | Quote blocked; eye test flagged as the blocking item | Documents Needed | Awaiting Documents |   |
| No payment before the quote validity date | Quote expires; no booking is created | Quote Available (expired) | Awaiting Customer → Closed |   |

---

## 2. New Driver's Licence Test

**Service code:** `DL-NEW-TEST` · **Category:** Driver Licensing · **Pricing:** Estimate · **Status:** **Not Implemented**

**Description.** Booking of the driving test for a customer who already holds a valid learner's licence, including vehicle arrangement where offered.

### Customer journey
- Customer submits a driving test booking request.
- Portal requests the learner's licence, ID and proof of address.
- We verify the learner's licence is still valid.
- Estimate is published with the test fee and any vehicle arrangement.
- Customer accepts and pays.
- Test date is booked and communicated.

### Staff workflow
- Confirm the service code and the licence code being tested.
- Issue the checklist and verify the learner's licence validity.
- Confirm whether WeQ4U arranges a vehicle for the test.
- Prepare the estimate, preview and submit for approval.
- On payment verified, book the test and record the reference.

### Required documents
- Certified copy of ID (mandatory)
- Valid learner's licence (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Proof of vehicle arrangement, where WeQ4U supplies one (conditional)

### Verification rules
- Learner's licence is valid on the requested test date.
- Licence code on the learner's licence matches the test requested.
- Proof of address is current and in the applicant's name.

### Readiness rules — a quote may be generated only when
- Learner's licence verified and valid.
- All mandatory documents verified.
- Estimate previewed and approved.

### Pricing strategy
**Estimate.** Estimate range published; the vehicle arrangement, if any, is a separate line with its own tolerance.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Test booking reference and date recorded and visible in the portal, with the outcome captured afterwards.

### Failure conditions
- Learner's licence expired before the test date.
- Licence code mismatch (for example Code 8 learner for a Code 10 test).
- No centre capacity.
- Quote declined or expired.

### Status finding
No definition, no booking capability and no price. Estimate pricing depends on the vehicle arrangement being defined.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Book a test with a valid learner's licence | Estimate published; booking created after payment | Quote Available → Awaiting Payment | Published → Payment Pending |   |
| Book a test with an expired learner's licence | Readiness blocked with a reason the customer understands | Documents Needed / Reviewing Information | Awaiting Documents |   |
| Customer declines the estimate | Request ends at declined; no booking | Quote Available (declined) | Awaiting Customer → Closed |   |

---

## 3. Driver's Licence Renewal

**Service code:** `DL-RENEWAL` · **Category:** Driver Licensing · **Pricing:** Fixed · **Status:** **Implemented**

**Description.** Renewal of an existing driving licence card, including the appointment at the licensing department and the package selected by the customer.

### Customer journey
- Customer submits a renewal request with the licence card.
- Portal requests ID and proof of address.
- We verify the card, the name and the address.
- Fixed price is generated for the chosen package.
- Customer accepts and pays by EFT with the quote number.
- Appointment is confirmed and the date is sent.

### Staff workflow
- Confirm the licence card matches the customer.
- Verify ID, proof of address and card validity.
- Confirm the package (Standard, Priority, Express, VIP).
- Generate the quote from the active pricing profile; add notes only.
- Preview and submit for independent approval.
- Publish, then confirm the appointment once payment is verified.

### Required documents
- Certified copy of ID (mandatory)
- Current driving licence card (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Eye test certificate where required by the centre (conditional)

### Verification rules
- Card is a genuine SA driving licence and not reported lost or stolen.
- Name and ID number match the ID copy.
- Address on the proof is current and in the customer's name.
- Card is within the renewal window.

### Readiness rules — a quote may be generated only when
- All mandatory documents verified.
- Package selected.
- An active pricing profile exists for the service and package.

### Pricing strategy
**Fixed.** Fixed price derived from the pricing profile for the service and package. Staff cannot type a total.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Appointment confirmed with a date and reference, communicated in the portal and by WhatsApp.

### Failure conditions
- Proof of address older than 3 months.
- Declined quote.
- Quote expired before payment.
- Licence already renewed elsewhere.

### Status finding
Definition, document checklist and pricing profile exist for the five seeded services; appointment evidence is not captured.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Renew with a complete file, Standard package | Quote equals the profile price; PDF matches the portal | Quote Available | Published |   |
| Select the VIP package on the same service | Uplift applied from the pricing master, not typed | Quote Available | Published |   |
| Submit proof of address older than 3 months | Document rejected with a reason; quote blocked | Documents Needed | Awaiting Documents |   |

---

## 4. Driver's Licence Replacement

**Service code:** `DL-REPLACEMENT` · **Category:** Driver Licensing · **Pricing:** Estimate · **Status:** **Partial**

**Description.** Replacement of a lost, stolen or damaged driving licence card, including the affidavit and the application at the department.

### Customer journey
- Customer reports a lost, stolen or damaged card.
- Portal requests ID, affidavit and proof of address.
- We verify the affidavit and the case reference.
- Estimate is published.
- Customer accepts and pays.
- Application is lodged and proof of submission is delivered.

### Staff workflow
- Record the reason for replacement (lost, stolen, damaged).
- Issue the checklist, including the affidavit requirement.
- Verify the affidavit, case number and ID.
- Prepare and preview the estimate; submit for approval.
- On payment verified, lodge the application and upload proof of submission.

### Required documents
- Certified copy of ID (mandatory)
- Affidavit of loss with SAPS case number (mandatory for lost or stolen)
- Damaged card, surrendered (mandatory for damaged)
- Proof of address, not older than 3 months (mandatory)

### Verification rules
- Affidavit is commissioned and the case number is legible.
- ID copy matches the customer and the card record.
- Reason for replacement matches the documents supplied.

### Readiness rules — a quote may be generated only when
- Affidavit or damaged card verified.
- All mandatory documents verified.
- Estimate previewed and approved.

### Pricing strategy
**Estimate.** Estimate published with the department fee separate from the WeQ4U fee.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Application lodged and proof of submission delivered to the customer in the portal.

### Failure conditions
- Affidavit missing or not commissioned.
- Replacement blocked because a renewal is already in progress.
- Quote declined or expired.

### Status finding
No service definition or price; the affidavit requirement is not in any checklist today.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Lost card, affidavit supplied | Estimate published; proof of submission delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| Lost card, no affidavit | Quote blocked; affidavit listed as blocking | Documents Needed | Awaiting Documents |   |
| Damaged card without surrendering the card | Rejected document with a reason | Documents Needed | Awaiting Documents |   |

---

## 5. Temporary Driver's Licence

**Service code:** `DL-TEMPORARY` · **Category:** Driver Licensing · **Pricing:** Estimate · **Status:** **Partial**

**Description.** Issue of a temporary driving licence while the permanent card is in production, including the authorisation document.

### Customer journey
- Customer requests a temporary licence.
- Portal requests ID, licence and proof of address.
- We verify the licence and the reason for the temporary need.
- Estimate is published.
- Customer accepts and pays.
- Temporary licence is issued and delivered.

### Staff workflow
- Confirm the permanent licence is valid and in production.
- Issue the checklist and verify the documents.
- Confirm the validity period required.
- Prepare and preview the estimate; submit for approval.
- On payment verified, issue and deliver the temporary licence.

### Required documents
- Certified copy of ID (mandatory)
- Current driving licence card or receipt of renewal (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Travel proof, where urgency is claimed (optional)

### Verification rules
- The licence has not expired beyond the permitted grace period.
- The renewal receipt matches the customer.
- The requested validity period is within the allowed maximum.

### Readiness rules — a quote may be generated only when
- Licence or renewal receipt verified.
- Validity period confirmed.
- Estimate approved.

### Pricing strategy
**Estimate.** Estimate published; the validity period is a price input and must be visible on the quote.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Temporary licence issued with its validity dates and delivered to the customer.

### Failure conditions
- Licence expired beyond the grace period.
- Validity period exceeds the maximum allowed.
- Quote declined or expired.

### Status finding
No definition, no price, and no capture of the issued validity period.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Temporary licence on a valid licence | Estimate published; validity dates on the quote and the delivery | Quote Available → Processing | Published → Payment Pending |   |
| Request on a licence expired beyond grace | Blocked with a clear reason | Reviewing Information | Assessment |   |
| Payment still pending after validity lapses | No temporary licence issued | Awaiting Payment | Payment Pending |   |

---

## 6. PrDP Application

**Service code:** `PRDP-NEW` · **Category:** PrDP · **Pricing:** Fixed · **Status:** **Implemented**

**Description.** New professional driving permit application for goods or passengers, including the medical certificate and the criminal record check.

### Customer journey
- Customer submits a PrDP application.
- Portal requests ID, licence, medical certificate and photos.
- We verify the medical certificate and the licence code.
- Fixed price is generated for the chosen package.
- Customer accepts and pays.
- Application is lodged; collection or delivery is arranged.

### Staff workflow
- Confirm the PrDP category (goods or passengers).
- Verify the licence code matches the category applied for.
- Check the medical certificate is valid and complete.
- Generate the quote from the pricing profile; preview and approve.
- Publish, then lodge the application on payment verified.

### Required documents
- Certified copy of ID (mandatory)
- Valid driving licence (mandatory)
- Medical certificate on the prescribed form (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Two passport photographs (mandatory)
- Criminal record check, where the centre requires it (conditional)

### Verification rules
- Medical certificate is signed, stamped and within validity.
- Licence code matches the PrDP category.
- Photographs meet the centre's specification.
- No disqualifying endorsement on the licence record.

### Readiness rules — a quote may be generated only when
- Medical certificate valid.
- Licence valid and code eligible.
- All mandatory documents verified.
- Pricing profile active for the service and package.

### Pricing strategy
**Fixed.** Fixed price from the pricing profile. The medical and criminal record fees are shown as separate lines.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Application and medical lodged, with collection or delivery arranged and recorded on the request.

### Failure conditions
- Expired or incomplete medical certificate.
- Licence code not eligible for the category.
- Disqualifying endorsement found.
- Quote declined or expired.

### Status finding
Definition and price exist; medical validity dates are not captured as data, so the readiness check cannot block automatically.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| PrDP goods application with a valid medical certificate | Quote equals the profile price; application lodged after payment | Quote Available → Processing | Published → Payment Pending |   |
| Medical certificate expired | Readiness blocked, quote cannot be published | Reviewing Information | Assessment |   |
| Code 8 licence on a Code 10 PrDP application | Blocked with a specific licence-code reason | Reviewing Information | Assessment |   |

---

## 7. PrDP Renewal

**Service code:** `PRDP-RENEWAL` · **Category:** PrDP · **Pricing:** Fixed · **Status:** **Implemented**

**Description.** Renewal of an existing professional driving permit before or shortly after expiry, with a fresh medical certificate.

### Customer journey
- Customer submits a PrDP renewal.
- Portal requests ID, current PrDP, medical certificate and photos.
- We verify the medical certificate and the current permit.
- Fixed price is generated for the package.
- Customer accepts and pays.
- Renewal is lodged; collection or delivery is arranged.

### Staff workflow
- Confirm the current PrDP category and expiry date.
- Verify the new medical certificate.
- Confirm the documents are complete for a renewal.
- Generate the quote from the pricing profile; preview and approve.
- Publish, then lodge the renewal on payment verified.

### Required documents
- Certified copy of ID (mandatory)
- Current PrDP card (mandatory)
- Medical certificate on the prescribed form (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Two passport photographs (mandatory)

### Verification rules
- Current PrDP is in the renewal window.
- Medical certificate is current and complete.
- Category applied for matches the existing permit.

### Readiness rules — a quote may be generated only when
- Permit in the renewal window.
- Medical certificate valid.
- All mandatory documents verified.

### Pricing strategy
**Fixed.** Fixed price from the pricing profile; no manual total permitted.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Renewal lodged with collection or delivery arranged and recorded on the request.

### Failure conditions
- Permit expired beyond the renewal window.
- Medical certificate expired.
- Quote declined or expired.

### Status finding
Definition and price exist; expiry-date intelligence (renewal reminders) is not implemented.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Renew a PrDP inside the window | Quote published and PDF matches | Quote Available | Published |   |
| Renew a PrDP more than a year expired | Blocked; advised to apply as a new PrDP | Reviewing Information | Assessment |   |
| Missing medical certificate | Quote blocked | Documents Needed | Awaiting Documents |   |

---

## 8. Licence Disc Renewal

**Service code:** `VR-LICENCE-DISC` · **Category:** Vehicle Services · **Pricing:** Fixed · **Status:** **Implemented**

**Description.** Renewal of a vehicle licence disc for a private vehicle, including the department fee and delivery of the disc.

### Customer journey
- Customer submits a disc renewal with the vehicle details.
- Portal requests the registration certificate and the owner's ID.
- We verify ownership and the vehicle record.
- Fixed price is generated for the package.
- Customer accepts and pays.
- Disc is issued and delivered.

### Staff workflow
- Confirm the vehicle registration number and owner.
- Verify the registration certificate and the owner's ID.
- Check for blocking flags on the vehicle record.
- Generate the quote from the pricing profile; preview and approve.
- Publish, then issue and deliver the disc on payment verified.

### Required documents
- Vehicle registration certificate (mandatory)
- Certified copy of the owner's ID (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Previous licence disc, where available (optional)

### Verification rules
- Registration certificate matches the vehicle and the owner.
- Owner ID matches the certificate.
- Address is current.
- The vehicle is not flagged as stolen or scrapped.

### Readiness rules — a quote may be generated only when
- Ownership verified.
- All mandatory documents verified.
- Pricing profile active for the service and package.

### Pricing strategy
**Fixed.** Fixed price from the pricing profile. The department fee is a separate line from the WeQ4U fee.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Disc issued with its validity period and delivered to the customer.

### Failure conditions
- Owner mismatch on the registration certificate.
- Vehicle flagged as stolen, scrapped or deregistered.
- Quote declined or expired.

### Status finding
Definition and price exist; delivery and disc-issue evidence is not captured.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Renew a disc for a vehicle owned by the customer | Quote equals the profile price; disc issued after payment | Quote Available → Processing | Published → Payment Pending |   |
| Renew for a vehicle registered to another person | Blocked; proof of authority required | Reviewing Information | Assessment |   |
| Vehicle flagged as scrapped | Blocked with a clear reason | Reviewing Information | Assessment |   |

---

## 9. Vehicle Registration

**Service code:** `VR-REGISTRATION` · **Category:** Vehicle Services · **Pricing:** Estimate · **Status:** **Partial**

**Description.** First registration of a vehicle on NaTIS, typically after a private import or a build, including roadworthy and police clearance where required.

### Customer journey
- Customer submits a registration request.
- Portal requests proof of purchase, ID and roadworthy certificate.
- We verify the vehicle's origin and the supporting documents.
- Estimate is published.
- Customer accepts and pays.
- Registration is confirmed on NaTIS and the certificate is delivered.

### Staff workflow
- Confirm the vehicle's origin: dealer, private import, build or estate.
- Issue the checklist; add police clearance for imports.
- Verify proof of purchase, roadworthy and clearance documents.
- Prepare and preview the estimate; submit for approval.
- On payment verified, register the vehicle and upload the NaTIS confirmation.

### Required documents
- Certified copy of the owner's ID (mandatory)
- Proof of purchase or invoice (mandatory)
- Roadworthy certificate (mandatory)
- Police clearance certificate (imports only)
- Proof of address, not older than 3 months (mandatory)

### Verification rules
- Engine and chassis numbers match the proof of purchase.
- Roadworthy certificate is valid and for this vehicle.
- Import documents and clearance are complete where applicable.
- Owner details match the ID.

### Readiness rules — a quote may be generated only when
- Origin documents verified.
- Roadworthy valid.
- Estimate previewed and approved.

### Pricing strategy
**Estimate.** Estimate published; the roadworthy and clearance costs are the variable lines that can move the final amount.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Registration confirmed on NaTIS and the registration certificate delivered to the customer.

### Failure conditions
- Engine or chassis number mismatch.
- Roadworthy expired or for a different vehicle.
- Customs or clearance outstanding on an import.
- Estimate variance not re-approved.

### Status finding
No definition or price; no field captures engine and chassis numbers or a clearance reference.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Register a dealer-bought vehicle with roadworthy | Estimate published; certificate delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| Register an import without police clearance | Blocked; clearance listed as blocking | Documents Needed | Awaiting Documents |   |
| Chassis number does not match the invoice | Rejected document with a specific reason | Documents Needed | Awaiting Documents |   |

---

## 10. Change of Ownership

**Service code:** `VR-CHANGE-OWNER` · **Category:** Vehicle Services · **Pricing:** Fixed · **Status:** **Implemented**

**Description.** Transfer of a vehicle from the seller to the buyer, including the notice of sale, the registration certificate and the new owner's documents.

### Customer journey
- Buyer or seller submits a change of ownership.
- Portal requests both IDs, the registration certificate and the notice of sale.
- We verify both parties and the vehicle record.
- Fixed price is generated for the package.
- Customer accepts and pays.
- Transfer is accepted and the new owner's documents are delivered.

### Staff workflow
- Establish who is paying: buyer, seller or a dealer.
- Verify both parties' IDs and the notice of sale.
- Confirm the vehicle is not flagged and no arrears block the transfer.
- Generate the quote from the pricing profile; preview and approve.
- Publish, then lodge the transfer on payment verified.

### Required documents
- Certified copy of the buyer's ID (mandatory)
- Certified copy of the seller's ID (mandatory)
- Vehicle registration certificate (mandatory)
- Notice of sale, signed by both parties (mandatory)
- Proof of address for the new owner (mandatory)
- Roadworthy certificate, where the vehicle requires one (conditional)

### Verification rules
- Both signatures on the notice of sale are present and dated.
- Names and ID numbers match the registration certificate.
- Vehicle is not flagged as stolen or under finance.
- Roadworthy is valid where required.

### Readiness rules — a quote may be generated only when
- Both parties verified.
- Notice of sale complete.
- No finance or flag blocking the transfer.
- Pricing profile active.

### Pricing strategy
**Fixed.** Fixed price from the pricing profile; the responsible payer must be recorded on the request.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Transfer accepted and the new owner's registration documents delivered.

### Failure conditions
- Seller signature missing on the notice of sale.
- Vehicle under finance without settlement confirmation.
- Roadworthy expired where required.
- Quote declined or expired.

### Status finding
Definition and price exist; finance and flag checks are manual, and the payer is not a recorded field.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Transfer with both signatures and a valid roadworthy | Quote equals the profile price; documents delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| Notice of sale without the seller's signature | Blocked with a specific reason | Documents Needed | Awaiting Documents |   |
| Vehicle under finance with no settlement letter | Blocked pending settlement confirmation | Reviewing Information | Assessment |   |

---

## 11. Duplicate Documents

**Service code:** `VR-DUPLICATE-DOCUMENTS` · **Category:** Vehicle Services · **Pricing:** Estimate · **Status:** **Partial**

**Description.** Replacement of a lost or damaged vehicle registration certificate or licence document.

### Customer journey
- Customer reports a lost or damaged vehicle document.
- Portal requests ID, affidavit and vehicle details.
- We verify the vehicle and the reason for the duplicate.
- Estimate is published.
- Customer accepts and pays.
- Duplicate is issued and delivered.

### Staff workflow
- Confirm which document is being duplicated.
- Verify the affidavit and the vehicle record.
- Confirm the requester is the registered owner or authorised.
- Prepare and preview the estimate; submit for approval.
- On payment verified, obtain and deliver the duplicate.

### Required documents
- Certified copy of the owner's ID (mandatory)
- Affidavit of loss (mandatory)
- Vehicle registration certificate copy, where available (optional)
- Proof of address, not older than 3 months (mandatory)

### Verification rules
- Affidavit is commissioned and names the vehicle.
- Requester matches the registered owner.
- Vehicle record is not flagged.

### Readiness rules — a quote may be generated only when
- Affidavit verified.
- Ownership verified.
- Estimate approved.

### Pricing strategy
**Estimate.** Estimate published with the department fee separate from the WeQ4U fee.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Duplicate document issued and delivered, with the document type recorded.

### Failure conditions
- Affidavit missing or not commissioned.
- Requester is not the owner and has no authority.
- Quote declined or expired.

### Status finding
No definition or price; no field identifies which document is being duplicated.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Duplicate registration certificate with an affidavit | Estimate published; document delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| Request from a non-owner without authority | Blocked with a clear reason | Reviewing Information | Assessment |   |
| Affidavit missing | Quote blocked | Documents Needed | Awaiting Documents |   |

---

## 12. Roadworthy Certificate Assistance

**Service code:** `VR-ROADWORTHY` · **Category:** Vehicle Services · **Pricing:** Estimate · **Status:** **Not Implemented**

**Description.** Arranging the roadworthy test at an accredited testing station and delivering the certificate, or the failure report with a re-test plan.

### Customer journey
- Customer requests roadworthy assistance.
- Portal requests ID, registration certificate and vehicle details.
- We verify ownership and book a testing station.
- Estimate is published with the test fee.
- Customer accepts and pays.
- Certificate is delivered, or the failure report with a re-test plan.

### Staff workflow
- Confirm the vehicle details and the reason for the test.
- Verify ownership documents.
- Select an accredited testing station and a slot.
- Prepare and preview the estimate; submit for approval.
- On payment verified, book the test and record the outcome.

### Required documents
- Certified copy of the owner's ID (mandatory)
- Vehicle registration certificate (mandatory)
- Vehicle details: make, model, VIN (mandatory)

### Verification rules
- Owner matches the registration certificate.
- Vehicle details are complete and consistent.
- The station is accredited for the vehicle class.

### Readiness rules — a quote may be generated only when
- Ownership verified.
- Station and slot available.
- Estimate approved.

### Pricing strategy
**Estimate.** Estimate published; a failed test is a second cost that must be re-quoted, not absorbed.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Certificate obtained and delivered, or the failure report issued with a re-test quote.

### Failure conditions
- Vehicle fails the test and the customer does not accept the re-test quote.
- Station cancels the slot.
- Quote declined or expired.

### Status finding
No definition, no booking capability, no price, and no place to record a pass or fail outcome.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Book a roadworthy test and pass | Estimate published; certificate delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| Vehicle fails the test | Failure report delivered; re-test quote raised separately | Ready | Ready For Delivery |   |
| Station slot cancelled | Customer notified; rebooking offered with no extra fee | Processing | Processing |   |

---

## 13. Traffic Register

**Service code:** `VR-TRAFFIC-REGISTER` · **Category:** Vehicle Services · **Pricing:** Fixed · **Status:** **Partial**

**Description.** Application for a traffic register number for a person or business that needs to register a vehicle without a standard identity document path.

### Customer journey
- Customer submits a traffic register request.
- Portal requests ID, proof of address and proof of ownership.
- We verify the entity and the supporting documents.
- Fixed price is generated for the package.
- Customer accepts and pays.
- Traffic register number is issued and delivered.

### Staff workflow
- Confirm the applicant type: individual, company or trust.
- Verify the company or trust documents where applicable.
- Confirm proof of ownership of the vehicle.
- Generate the quote from the pricing profile; preview and approve.
- Publish, then apply and deliver the traffic register number.

### Required documents
- Certified copy of ID, or company / trust registration documents (mandatory)
- Proof of address, not older than 3 months (mandatory)
- Proof of vehicle ownership: invoice or affidavit (mandatory)
- Previous traffic register document, where held (optional)

### Verification rules
- Entity documents are current and match the applicant.
- Proof of address is in the entity's name.
- Proof of ownership supports the application.

### Readiness rules — a quote may be generated only when
- Applicant type confirmed.
- All mandatory documents verified.
- Pricing profile active.

### Pricing strategy
**Fixed.** A price exists for Traffic Register, but the service has no catalogue code, so it cannot be selected on a request.

### Quote lifecycle
Assessment -> Quote Draft -> Internal Preview -> Approval -> Publication -> Customer Decision

### Completion criteria
Traffic register number issued with the reference recorded and delivered.

### Failure conditions
- Entity documents expired or mismatched.
- No proof of ownership.
- Service cannot be selected because the catalogue code is missing.
- Quote declined or expired.

### Status finding
Priced in the pricing master but absent from the service catalogue. Proposed code VR-TRAFFIC-REGISTER and a full definition are required.

### Test scenarios
| Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- |
| Apply as an individual with proof of ownership | Service selectable, quote published from the existing price | Quote Available | Published |   |
| Select Traffic Register on a new request | Service appears in the selector (expected to fail until the code exists) | Request Received | New |   |
| Apply as a company with expired registration documents | Blocked with a specific reason | Documents Needed | Awaiting Documents |   |


## Defect and gap register
| ID | Area | Finding | Impact | Priority |
| --- | --- | --- | --- | --- |
| D1 | Service definitions | 8 of 13 Phase 1 services have no definition, checklist or readiness rules. | Blocks all per-service testing. | Critical |
| D2 | Pricing profiles | Only 5 services have an active pricing profile; 7 priced services have none. | Quote cannot auto-price. | Critical |
| D3 | Traffic Register code | A price exists but no catalogue service code, so it cannot be selected. | Service unreachable. | High |
| D4 | Payment gate | Awaiting Payment is a status only; no verification record or gateway event. | Work can start unsecured. | Critical |
| D5 | Stages 13–16 | Processing, Fulfilment, Completion and Closure are not modelled. | No fulfilment control. | Critical |
| D6 | Completion evidence | No field captures a booking reference, certificate or NaTIS confirmation. | Completion cannot be proven. | High |
| D7 | Document checklist | Checklists are not driven by the service definition. | Wrong documents requested. | High |
| D8 | Package uplift | Uplift is unproven outside the seeded five services. | Inconsistent pricing. | Medium |
| D9 | Independent approval | Not proven to block the preparer from approving their own quote. | Control weakness. | High |
| D10 | Quote PDF | The PDF carries no pricing-version or definition-version reference. | Weak audit trail. | Medium |
| D11 | Quote expiry | No evidence of an expiry job moving quotes to expired. | Stale quotes. | Medium |
| D12 | Customer labels | Customer screens are not proven to hide internal status names. | Framework breach risk. | Medium |

## Phase 2 boundary
| Proposed code | Phase 2 service | What it will require |
| --- | --- | --- |
| VOC-PRIVATE-SALE | Vehicle Ownership Concierge | Private or dealer vehicle sale handled end to end under one accountable request. |
| DCS-DEALER-SALE | Dealership Concierge Services | Vehicle Admin Pack built into the dealer's point of sale. |
| DCS-DEALER-DELIVERY | Dealer Delivery Services | Per-vehicle delivery pack, door to door. |
| DCS-BULK-REGISTRATION | Dealer Bulk Registration Services | Batches of vehicles registered per unit. |
| DCS-TRADE-IN | Trade-In Services | Seller-side release and buyer-side transfer on one case. |
| BCS-SETTLEMENT | Bank Settlement Assistance | Settlement letter and bank confirmation. |
| BCS-RELEASE | Vehicle Release Assistance | Release of title and document handover. |
| BCS-FINANCED-REGISTRATION | Financed Vehicle Registration | Registration with the bank as title holder. |
| FCS-FLEET-LICENSING | Fleet Services | Recurring licensing cycles across a fleet. |
| FCS-COMPLIANCE | Corporate Vehicle Compliance | Compliance cycles with an exceptions report. |

Entry criteria for Phase 2: all 13 Phase 1 services defined and priced; every test row passed or accepted in writing; payment verification and fulfilment stages live; completion evidence captured per service; no Critical defect open.

## GitHub Copilot testing directive
Use this document as the official source of truth. Do not implement new features. Do not implement Phase 2 services. Perform a complete functional validation of every Phase 1 service against the test matrix below.

| Validation | What Copilot must do |
| --- | --- |
| Verify each Phase 1 service | Select the service, submit a request and confirm the definition, checklist and price load. |
| Validate all workflows | Walk the master workflow for two services end to end and record where it stops. |
| Validate customer tracking | Check the eight customer labels appear in order and the timeline updates. |
| Validate quote lifecycle | Draft, preview, approve, publish and record the customer decision. |
| Validate document verification | Verify and reject documents; confirm blocking behaviour after a rejection. |
| Validate readiness gates | Attempt to publish a quote with an unmet readiness rule; it must be refused. |
| Validate publication behaviour | Confirm the quote is invisible before publication and immutable after. |
| Validate customer actions | Accept, decline and request a change; confirm each produces the right status. |
| Produce the final report | Status, test results, gap analysis, defect list and recommendations, with evidence attached. |

### Evidence required
- A screen recording or screenshots per scenario, showing the request, the document state, the quote, the customer view and the staff view.
- The quote PDF for at least one Fixed and one Estimate service, cross-checked against the active pricing profile.
- Proof that each gate blocks: missing document, rejected document, failed readiness, self-approval, payment not verified.
- A filled Pass/Fail row for every scenario in the matrix, with a defect reference for every fail.
- An implementation status table using the three defined statuses, with the evidence link beside each service.

### Report must contain
- Implementation status report
- Functional test results
- Workflow validation results
- Customer journey validation
- Document verification validation
- Quote lifecycle validation
- Customer tracking validation
- Gap analysis
- Defect list
- Recommendations

## Functional test matrix (consolidated)
| Service | Scenario | Expected behaviour | Expected customer status | Expected staff status | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| DL-LEARNER | Submit a complete learner file, publish estimate, accept and pay | Estimate generated from fee lines; booking created on payment verified | Quote Available → Awaiting Payment | Published → Payment Pending |   |
| DL-LEARNER | Submit without an eye test certificate | Quote blocked; eye test flagged as the blocking item | Documents Needed | Awaiting Documents |   |
| DL-LEARNER | No payment before the quote validity date | Quote expires; no booking is created | Quote Available (expired) | Awaiting Customer → Closed |   |
| DL-NEW-TEST | Book a test with a valid learner's licence | Estimate published; booking created after payment | Quote Available → Awaiting Payment | Published → Payment Pending |   |
| DL-NEW-TEST | Book a test with an expired learner's licence | Readiness blocked with a reason the customer understands | Documents Needed / Reviewing Information | Awaiting Documents |   |
| DL-NEW-TEST | Customer declines the estimate | Request ends at declined; no booking | Quote Available (declined) | Awaiting Customer → Closed |   |
| DL-RENEWAL | Renew with a complete file, Standard package | Quote equals the profile price; PDF matches the portal | Quote Available | Published |   |
| DL-RENEWAL | Select the VIP package on the same service | Uplift applied from the pricing master, not typed | Quote Available | Published |   |
| DL-RENEWAL | Submit proof of address older than 3 months | Document rejected with a reason; quote blocked | Documents Needed | Awaiting Documents |   |
| DL-REPLACEMENT | Lost card, affidavit supplied | Estimate published; proof of submission delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| DL-REPLACEMENT | Lost card, no affidavit | Quote blocked; affidavit listed as blocking | Documents Needed | Awaiting Documents |   |
| DL-REPLACEMENT | Damaged card without surrendering the card | Rejected document with a reason | Documents Needed | Awaiting Documents |   |
| DL-TEMPORARY | Temporary licence on a valid licence | Estimate published; validity dates on the quote and the delivery | Quote Available → Processing | Published → Payment Pending |   |
| DL-TEMPORARY | Request on a licence expired beyond grace | Blocked with a clear reason | Reviewing Information | Assessment |   |
| DL-TEMPORARY | Payment still pending after validity lapses | No temporary licence issued | Awaiting Payment | Payment Pending |   |
| PRDP-NEW | PrDP goods application with a valid medical certificate | Quote equals the profile price; application lodged after payment | Quote Available → Processing | Published → Payment Pending |   |
| PRDP-NEW | Medical certificate expired | Readiness blocked, quote cannot be published | Reviewing Information | Assessment |   |
| PRDP-NEW | Code 8 licence on a Code 10 PrDP application | Blocked with a specific licence-code reason | Reviewing Information | Assessment |   |
| PRDP-RENEWAL | Renew a PrDP inside the window | Quote published and PDF matches | Quote Available | Published |   |
| PRDP-RENEWAL | Renew a PrDP more than a year expired | Blocked; advised to apply as a new PrDP | Reviewing Information | Assessment |   |
| PRDP-RENEWAL | Missing medical certificate | Quote blocked | Documents Needed | Awaiting Documents |   |
| VR-LICENCE-DISC | Renew a disc for a vehicle owned by the customer | Quote equals the profile price; disc issued after payment | Quote Available → Processing | Published → Payment Pending |   |
| VR-LICENCE-DISC | Renew for a vehicle registered to another person | Blocked; proof of authority required | Reviewing Information | Assessment |   |
| VR-LICENCE-DISC | Vehicle flagged as scrapped | Blocked with a clear reason | Reviewing Information | Assessment |   |
| VR-REGISTRATION | Register a dealer-bought vehicle with roadworthy | Estimate published; certificate delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| VR-REGISTRATION | Register an import without police clearance | Blocked; clearance listed as blocking | Documents Needed | Awaiting Documents |   |
| VR-REGISTRATION | Chassis number does not match the invoice | Rejected document with a specific reason | Documents Needed | Awaiting Documents |   |
| VR-CHANGE-OWNER | Transfer with both signatures and a valid roadworthy | Quote equals the profile price; documents delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| VR-CHANGE-OWNER | Notice of sale without the seller's signature | Blocked with a specific reason | Documents Needed | Awaiting Documents |   |
| VR-CHANGE-OWNER | Vehicle under finance with no settlement letter | Blocked pending settlement confirmation | Reviewing Information | Assessment |   |
| VR-DUPLICATE-DOCUMENTS | Duplicate registration certificate with an affidavit | Estimate published; document delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| VR-DUPLICATE-DOCUMENTS | Request from a non-owner without authority | Blocked with a clear reason | Reviewing Information | Assessment |   |
| VR-DUPLICATE-DOCUMENTS | Affidavit missing | Quote blocked | Documents Needed | Awaiting Documents |   |
| VR-ROADWORTHY | Book a roadworthy test and pass | Estimate published; certificate delivered after payment | Quote Available → Processing | Published → Payment Pending |   |
| VR-ROADWORTHY | Vehicle fails the test | Failure report delivered; re-test quote raised separately | Ready | Ready For Delivery |   |
| VR-ROADWORTHY | Station slot cancelled | Customer notified; rebooking offered with no extra fee | Processing | Processing |   |
| VR-TRAFFIC-REGISTER | Apply as an individual with proof of ownership | Service selectable, quote published from the existing price | Quote Available | Published |   |
| VR-TRAFFIC-REGISTER | Select Traffic Register on a new request | Service appears in the selector (expected to fail until the code exists) | Request Received | New |   |
| VR-TRAFFIC-REGISTER | Apply as a company with expired registration documents | Blocked with a specific reason | Documents Needed | Awaiting Documents |   |

## Sign-off
| | |
| --- | --- |
| Prepared by | Base44 |
| Reviewed by | Founder |
| Phase 1 sign-off date | |
