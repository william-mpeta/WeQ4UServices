# Customer trust and accessibility bar

## The product promise

WeQ4UServices helps customers understand a service request, see a quote before deciding, and follow progress with one private request reference. The interface must not promise lender approval, government completion, fixed turnaround, guaranteed savings, or that every service is available for every customer.

Do not publish prices or implied savings until the founder validates actual cost and operating figures. Before implementing a line-item quote, agree how to distinguish WeQ4U fees from licensing authority, lender, dealer, third-party and courier charges. Validate willingness to pay through customer conversations and a measured pilot rather than assumed conversion or revenue.

Do not claim the site is "the most secure in the world." Describe specific safeguards that are implemented and verified. The current local prototype is not production-ready for live partner data sharing. Its optional vehicle referral code supports WeQ4U attribution/routing only; no partner receives customer details. Future sharing requires an approved partner agreement, clear customer notice and consent, scoped access, audit and retention controls.

The customer sees one request reference, not a separate private key or API key. New references are cryptographically random and act as bearer credentials, so a customer can use the same reference on another device. Treat the reference like a password: do not expose it publicly, use sequential references, or include it in analytics. Add rate limiting and access logging before production use.

## Accessibility target

“Stanford requirements” apply to Stanford-operated or Stanford-representing sites, not to this independent product. Stanford states its electronic-content minimum as WCAG 2.0 Level A and AA, and its site guidance also emphasizes responsive layouts, intuitive navigation and accessibility feedback. WeQ4UServices uses WCAG 2.2 AA as a forward-looking design target; no conformance certification is claimed.

Current foundations include a document language tag, page titles, skip link, visible keyboard focus, labelled form controls, keyboard-operable choices, reduced-motion rules, responsive layouts and a customer path to report an accessibility barrier. Text size and contrast should be checked on every page and component.

## Required before a public release claim

- Complete a manual keyboard-only pass on the storefront, request steps, tracking, chat widget, admin sign-in and work queue.
- Test zoom/reflow at 200% and narrow mobile widths; confirm sticky or floating elements do not hide keyboard focus.
- Run an automated accessibility scan, then manually verify all errors and important warnings with screen reader and keyboard use.
- Measure text and component contrast, including hover, focus, disabled and status colors; never use color alone to communicate state.
- Confirm heading order, unique page titles, accessible names, error announcements, upload controls, chat open/close behavior and touch target sizes.
- Test file upload/recovery, form errors and tracking at realistic slow network conditions; every error must explain how to recover.
- Publish an accurate privacy notice and provide an accessible way to report a barrier.

## External references

- [Stanford University Minimum Web Standards](https://uit.stanford.edu/guide/webstandards)
- [Stanford Accessibility Policy and Standard](https://uit.stanford.edu/accessibility/policy-standard)
- [Stanford Accessibility Quick Checks](https://uit.stanford.edu/accessibility/testing/quick-checks)
- [W3C Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
