const disclaimer = 'WeQ4U is an independent service, not a government department. Authority decisions and outcomes are outside our control.';
const quoteTimeline = [
  { key: 'review', title: 'Review your quote', detail: 'Check the scope, price, documents, and validity.' },
  { key: 'decision', title: 'Confirm your decision', detail: 'Accept, request a change, or decline securely.' },
  { key: 'payment', title: 'Payment and service start', detail: 'Required next steps are confirmed before work begins.' },
  { key: 'handover', title: 'Completion and handover', detail: 'We update you when the agreed assistance is complete.' },
];

const trustCards = [
  { icon: 'person-check', label: 'Reviewed by a WeQ4U team member' },
  { icon: 'shield', label: 'Independent service, not a government department' },
  { icon: 'lock', label: 'Private request tracking' },
  { icon: 'check', label: 'No work before agreement and required next steps' },
];

function variant(key, displayName, options = {}) {
  return {
    key,
    displayName,
    subtype: options.subtype || displayName,
    serviceCode: options.serviceCode || '',
    aliases: options.aliases || [],
    version: options.version || 1,
    approvalState: options.approvalState || 'draft',
    issueCustomerQuote: options.issueCustomerQuote === true,
    pricingProfileRef: options.pricingProfileRef || null,
    overview: options.overview || `WeQ4U assistance for ${displayName.toLowerCase()}, subject to confirming the agreed case scope.`,
    deliverables: options.deliverables || [],
    documentChecklist: options.documentChecklist || [],
    timeline: quoteTimeline,
    expectedOutcome: options.expectedOutcome || 'A clear record of the agreed assistance and next steps.',
    conditions: options.conditions || [],
    disclaimer,
    approvalVersion: options.approvalVersion || 1,
    approvedBy: options.approvedBy || null,
    approvedAt: options.approvedAt || null,
  };
}

export const serviceRegistry = [
  {
    key: 'learners-licence',
    categoryServiceId: 'drivers-licences',
    displayName: "Learner's Licence",
    icon: 'LL',
    approvalState: 'provisional',
    version: 1,
    pricingProfileRef: 'learner-licence',
    variants: [
      variant('test', 'Learner licence test', {
        serviceCode: 'DL-LEARNER-APPLICATION',
        approvalState: 'provisional',
        pricingProfileRef: 'learner-licence',
        overview: 'Provisional learner-licence test assistance. This is not an all-in price or an authority-approved process.',
        deliverables: ['Booking support', 'Application paperwork review', 'Test-booking coordination'],
        documentChecklist: [
          { id: 'id-copy', label: 'Copy of ID', required: true, approvalState: 'provisional' },
          { id: 'booking-confirmation', label: 'Booking confirmation', required: true, approvalState: 'provisional' },
        ],
        conditions: ['Provisional estimate only; authority, test-centre, booking, and third-party charges are not included.'],
        expectedOutcome: 'A clear record of the agreed assistance. Test outcomes and licence decisions remain with the relevant authorities.',
      }),
      variant('rewrite', 'Learner licence rewrite', {
        serviceCode: 'DL-LEARNER-REWRITE',
        subtype: 'Learner licence rewrite',
      }),
    ],
  },
  {
    key: 'drivers-licence',
    categoryServiceId: 'drivers-licences',
    displayName: "Driver's Licence",
    icon: 'DL',
    approvalState: 'provisional',
    version: 1,
    pricingProfileRef: 'drivers-licences',
    variants: [
      variant('new-test', "New driver's licence test", {
        serviceCode: 'DL-NEW-TEST',
        subtype: 'New driver licence test',
        approvalState: 'draft',
        deliverables: ['Booking coordination', 'Application paperwork review'],
        documentChecklist: [
          { id: 'id-copy', label: 'Copy of ID', required: true, approvalState: 'provisional' },
          { id: 'learner-licence', label: "Learner's licence", required: true, approvalState: 'provisional' },
          { id: 'booking-confirmation', label: 'Booking confirmation', required: true, approvalState: 'provisional' },
        ],
      }),
      variant('renewal', 'Driver licence renewal', {
        serviceCode: 'DL-RENEWAL',
        subtype: 'Existing driver / renewal',
        approvalState: 'provisional',
        issueCustomerQuote: true,
        pricingProfileRef: 'drivers-licences',
        deliverables: ['Renewal paperwork review', 'Booking coordination', 'Request progress updates'],
        documentChecklist: [
          { id: 'id-copy', label: 'Copy of ID', required: true, approvalState: 'provisional' },
          { id: 'existing-licence', label: 'Current licence', required: true, approvalState: 'provisional' },
          { id: 'proof-of-residence', label: 'Proof of residence', required: true, approvalState: 'provisional' },
        ],
        expectedOutcome: 'A clear record of the agreed renewal assistance. Licence issuance remains subject to the relevant authority.',
      }),
      variant('conversion', 'Driver licence conversion', { serviceCode: 'DL-CONVERSION' }),
      variant('replacement', "Driver's licence replacement", { serviceCode: 'DL-REPLACEMENT', subtype: 'Replacement' }),
      variant('temporary', 'Temporary driver licence', { serviceCode: 'DL-TEMPORARY', subtype: 'Temporary licence' }),
    ],
  },
  {
    key: 'prdp',
    categoryServiceId: 'prdps',
    displayName: 'PrDP',
    icon: 'P',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'prdps',
    variants: [
      variant('new', 'New PrDP application', {
        serviceCode: 'PD-APPLICATION',
        subtype: 'New PrDP',
        pricingProfileRef: 'prdps',
        documentChecklist: [
          { id: 'id-copy', label: 'Copy of ID', required: true, approvalState: 'draft' },
          { id: 'medical-certificate', label: 'Medical certificate', required: true, approvalState: 'draft' },
        ],
      }),
      variant('renewal', 'PrDP renewal', { serviceCode: 'PD-RENEWAL', subtype: 'PrDP renewal' }),
    ],
  },
  {
    key: 'licence-disc',
    categoryServiceId: 'licence-disc-renewals',
    displayName: 'Licence Disc Renewal',
    icon: 'DR',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'licence-disc-renewals',
    variants: [
      variant('private-vehicle', 'Private vehicle disc renewal', { pricingProfileRef: 'licence-disc-renewals', aliases: ['My vehicle'] }),
      variant('fleet-vehicle', 'Business or fleet vehicle disc renewal', { pricingProfileRef: 'licence-disc-renewals', aliases: ['A business or fleet vehicle'] }),
    ],
  },
  {
    key: 'vehicle-registration',
    categoryServiceId: 'vehicle-registrations',
    displayName: 'Vehicle Registration',
    icon: 'VR',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'vehicle-registrations',
    variants: [
      variant('new', 'New vehicle registration', { pricingProfileRef: 'vehicle-registrations', aliases: ['New registration'] }),
      variant('re-registration', 'Vehicle re-registration', {
        pricingProfileRef: 'vehicle-registrations',
        aliases: ['Vehicle registration from bank finance', 'Vehicle registration from dealership'],
      }),
    ],
  },
  {
    key: 'change-of-ownership',
    categoryServiceId: 'change-of-ownership',
    displayName: 'Change of Ownership',
    icon: 'CO',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'change-of-ownership',
    variants: [
      variant('bank-financed', 'Bank-financed transfer', {
        aliases: ['Vehicle financed through a bank'],
        documentChecklist: [
          { id: 'settlement-letter', label: 'Bank settlement letter', required: true, approvalState: 'draft' },
          { id: 'bank-proxy-id', label: 'Bank proxy ID', required: true, approvalState: 'draft' },
          { id: 'roadworthy-certificate', label: 'Roadworthy certificate', required: true, approvalState: 'draft' },
        ],
      }),
      variant('dealership', 'Dealership sale', {
        documentChecklist: [
          { id: 'dealer-proxy-id', label: 'Dealer proxy ID', required: true, approvalState: 'draft' },
          { id: 'dealer-brn', label: 'Dealer BRN certificate', required: true, approvalState: 'draft' },
          { id: 'stamped-nco', label: 'Stamped NCO form', required: true, approvalState: 'draft' },
          { id: 'buyer-id', label: 'Buyer ID copy', required: true, approvalState: 'draft' },
          { id: 'buyer-proof-address', label: 'Buyer proof of address', required: true, approvalState: 'draft' },
          { id: 'roadworthy-certificate', label: 'Roadworthy certificate', required: true, approvalState: 'draft' },
        ],
      }),
      variant('private-sale', 'Private sale'),
      variant('not-sure', 'Not sure'),
    ],
  },
  {
    key: 'duplicate-documents',
    categoryServiceId: 'duplicate-documents',
    displayName: 'Duplicate Documents',
    icon: 'DD',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'duplicate-documents',
    variants: [
      variant('lost-stolen', 'Lost or stolen document', { aliases: ['Lost or stolen'] }),
      variant('damaged', 'Damaged document', { aliases: ['Damaged'] }),
      variant('other', 'Other or unknown document', { aliases: ['Other or not sure'] }),
    ],
  },
  {
    key: 'roadworthy',
    categoryServiceId: 'roadworthy-certificates',
    displayName: 'Roadworthy Certificate',
    icon: 'RW',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'roadworthy-certificates',
    variants: [
      variant('test-booking', 'Roadworthy test booking', { aliases: ['Book a roadworthy test'] }),
      variant('transfer', 'Roadworthy for a sale or transfer'),
    ],
  },
  {
    key: 'traffic-register',
    categoryServiceId: 'traffic-register',
    displayName: 'Traffic Register',
    icon: 'TR',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'traffic-register',
    variants: [
      variant('application', 'Traffic register number application', { pricingProfileRef: 'traffic-register', aliases: ['Apply for a traffic register number'] }),
      variant('other', 'Other traffic register request', { pricingProfileRef: 'traffic-register' }),
    ],
  },
  {
    key: 'courier',
    categoryServiceId: 'door-to-door-courier',
    displayName: 'Door-to-Door Courier',
    icon: 'DC',
    approvalState: 'draft',
    version: 1,
    pricingProfileRef: 'door-to-door-courier',
    variants: [
      variant('collection', 'Document collection', { aliases: ['Collect documents from me'] }),
      variant('delivery', 'Document delivery', { aliases: ['Deliver completed documents to me'] }),
      variant('collection-delivery', 'Collection and delivery', { aliases: ['Collect and deliver documents'] }),
    ],
  },
];

for (const service of serviceRegistry) {
  Object.assign(service, {
    overview: 'Variant-specific scope is confirmed in the service registry before a customer quote is issued.',
    deliverables: [],
    documentChecklist: [],
    timeline: quoteTimeline,
    expectedOutcome: 'A clear record of the agreed assistance. Authority decisions and outcomes remain outside WeQ4U control.',
    conditions: [],
    disclaimer,
  });
}

export function resolveRegistryService({ serviceKey, categoryServiceId, serviceCode, services = [], serviceDetail = '' } = {}) {
  if (serviceCode) {
    const service = serviceRegistry.find((item) => item.variants.some((entry) => entry.serviceCode === serviceCode));
    if (service && (!services.length || services.includes(service.categoryServiceId))) return service;
  }
  const key = serviceKey || categoryServiceId || services[0];
  const exact = serviceRegistry.find((item) => item.key === key);
  if (exact) return exact;
  const candidates = serviceRegistry.filter((item) => item.categoryServiceId === key);
  if (candidates.length <= 1) return candidates[0] || null;
  const normalizedDetail = String(serviceDetail).trim().toLowerCase();
  return candidates.find((candidate) => candidate.variants.some((item) => normalizedDetail === item.subtype.toLowerCase()
    || normalizedDetail.startsWith(`${item.subtype.toLowerCase()} · `)
    || normalizedDetail === item.displayName.toLowerCase())) || candidates[0];
}

export function resolveRegistryVariant(service, { serviceCode, variantKey, serviceDetail = '' } = {}) {
  if (!service) return null;
  if (serviceCode) {
    const byCode = service.variants.find((item) => item.serviceCode === serviceCode);
    if (byCode) return byCode;
  }
  if (variantKey) {
    const byKey = service.variants.find((item) => item.key === variantKey);
    if (byKey) return byKey;
  }
  const normalizedDetail = String(serviceDetail).trim().toLowerCase();
  if (normalizedDetail) {
    const byDetail = service.variants.find((item) => [item.subtype, item.displayName, ...item.aliases]
      .some((value) => normalizedDetail === value.toLowerCase()
        || normalizedDetail.startsWith(`${value.toLowerCase()} · `)));
    if (byDetail) return byDetail;
  }
  return service.variants.length === 1 ? service.variants[0] : null;
}

export function resolveRegistryConfiguration({ record = {}, quote = {} } = {}) {
  const serviceCode = quote.serviceCode || record.serviceCode || record.serviceAssessment?.serviceCode || '';
  const initialServiceDetail = record.serviceDetails?.[record.services?.[0]] || quote.serviceDetail || '';
  const service = resolveRegistryService({
    serviceKey: quote.serviceKey || record.serviceKey,
    serviceCode,
    services: record.services || [],
    serviceDetail: initialServiceDetail,
  });
  const serviceDetail = record.serviceDetails?.[service?.categoryServiceId] || quote.serviceDetail || '';
  const variant = resolveRegistryVariant(service, {
    serviceCode,
    variantKey: quote.variantKey || record.serviceVariantKey,
    serviceDetail,
  });
  return { service, variant, serviceDetail };
}

export function registryQuoteIssue(record, profile) {
  const { service, variant } = resolveRegistryConfiguration({ record });
  if (!service || !variant) return { allowed: false, reason: 'Select a service and variant that exist in the service registry.' };
  if (!['approved', 'provisional'].includes(service.approvalState)
    || !['approved', 'provisional'].includes(variant.approvalState)) {
    return { allowed: false, service, variant, reason: 'This service variant is not approved for customer quoting. Prepare an internal registry review instead.' };
  }
  if (!variant.issueCustomerQuote) {
    return { allowed: false, service, variant, reason: 'This service variant is not configured for customer quoting.' };
  }
  if (!variant.pricingProfileRef || profile?.serviceId !== variant.pricingProfileRef || profile?.status !== 'active') {
    return { allowed: false, service, variant, reason: 'An active, approved pricing profile is required for this service variant.' };
  }
  if (variant.approvalState === 'approved' && variant.documentChecklist.some((item) => item.approvalState !== 'approved')) {
    return { allowed: false, service, variant, reason: 'The service document checklist must be approved before customer quoting.' };
  }
  return { allowed: true, service, variant, provisional: variant.approvalState === 'provisional' || service.approvalState === 'provisional' };
}
