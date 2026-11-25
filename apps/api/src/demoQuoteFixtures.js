import { assessmentForServiceDefinition, normalizeRequestServiceDefinition, resolveServiceDefinition } from './serviceDefinitions.js';
import { customerStage, normalizeWorkflowRecord, routeToStatus } from './workflow.js';

export const demoQuoteFixtures = [
  {
    ref: 'WQ-2026-4778584AC255D77A4C7C',
    quoteNumber: 'Q2026-0002',
    serviceId: 'drivers-licences',
    serviceKey: 'drivers-licence',
    serviceVariantKey: 'renewal',
    serviceCode: 'DL-RENEWAL',
    serviceDetail: 'Existing driver / renewal',
  },
  {
    ref: 'WQ-2026-E6C17F49F41A3CAE9A7C',
    quoteNumber: 'Q2026-0003',
    serviceId: 'prdps',
    serviceKey: 'prdp',
    serviceVariantKey: 'new',
    serviceCode: 'PD-APPLICATION',
    serviceDetail: 'New PrDP',
  },
  {
    ref: 'WQ-2026-079D20628548E52904F2',
    quoteNumber: 'Q2026-0004',
    serviceId: 'roadworthy-certificates',
    serviceKey: 'roadworthy',
    serviceVariantKey: 'transfer',
    serviceCode: '',
    serviceDetail: 'Roadworthy for a sale or transfer',
  },
];

export function seedDemoQuoteRequests(store, now = new Date()) {
  const existingRefs = new Set((store.requests || []).map((record) => record.ref));
  const createdAt = now.toISOString();
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let added = 0;

  for (const fixture of demoQuoteFixtures) {
    if (existingRefs.has(fixture.ref)) continue;

    const serviceDetails = { [fixture.serviceId]: fixture.serviceDetail };
    const serviceDefinition = resolveServiceDefinition({
      serviceCode: fixture.serviceCode,
      services: [fixture.serviceId],
      serviceDetails,
      serviceVariantKey: fixture.serviceVariantKey,
    });
    const profileId = `WQ-P-${fixture.serviceId}`;
    const quoteId = `WQ-Q-${fixture.quoteNumber}`;
    const quote = {
      id: quoteId,
      quoteNumber: fixture.quoteNumber,
      version: 1,
      profileId,
      profileVersion: 1,
      serviceId: fixture.serviceId,
      serviceKey: fixture.serviceKey,
      variantKey: fixture.serviceVariantKey,
      serviceCode: fixture.serviceCode,
      serviceDefinitionVersion: serviceDefinition?.version || 1,
      profileName: fixture.serviceDetail,
      packageName: 'Local demonstration quote',
      pricingBasis: 'profile',
      pricingBasisLabel: 'Synthetic local demonstration data',
      estimateDisclaimer: 'This fictional quote is for local software testing only and is not a commercial offer.',
      contributionRatePercent: 0,
      contributionCents: 0,
      vatTreatment: null,
      currency: 'ZAR',
      totalCents: 50000,
      lines: [{
        componentId: 'demo-service',
        label: 'Synthetic demonstration service fee',
        amountCents: 50000,
        sourceNote: 'Local demo data only',
      }],
      notes: 'Fictional local demonstration only. Not a commercial offer.',
      conditions: ['Synthetic local software test data; not valid for customer use.'],
      requiredDocuments: [],
      generatedAt: createdAt,
      validUntil,
    };
    const record = normalizeRequestServiceDefinition(normalizeWorkflowRecord({
      ref: fixture.ref,
      accessMode: 'reference',
      name: `Demo Customer ${String(added + 1).padStart(2, '0')}`,
      phone: '0000000000',
      email: '',
      services: [fixture.serviceId],
      serviceCode: fixture.serviceCode,
      serviceKey: fixture.serviceKey,
      serviceVariantKey: fixture.serviceVariantKey,
      serviceDefinitionVersion: serviceDefinition?.version || null,
      serviceDefinitionName: serviceDefinition?.serviceName || '',
      serviceDefinitionStatus: serviceDefinition?.configurationStatus || 'unmatched',
      pricingPackage: 'standard',
      serviceDetails,
      suburb: 'Demo',
      address: '',
      courier: false,
      courierCollection: false,
      courierDelivery: false,
      message: 'Synthetic local demonstration request.',
      consent: true,
      consentAt: createdAt,
      source: 'local-demo-fixture',
      workflowVersion: 2,
      status: 'Submitted',
      requestedDocuments: [],
      serviceAssessment: assessmentForServiceDefinition(serviceDefinition),
      customerTasks: [],
      quoteDecision: '',
      serviceValidated: false,
      fulfilmentValidated: false,
      completionConfirmed: false,
      paymentStatus: 'not-configured',
      history: [
        { status: 'Submitted', at: createdAt, message: 'Synthetic local demonstration request received.', customerVisible: true },
      ],
      quoteAmount: 500,
      quoteCurrency: 'ZAR',
      paid: false,
      notes: 'Synthetic local demonstration request; not customer data.',
      documents: [],
      quote,
      quoteHistory: [],
      quotePublishedAt: createdAt,
      quoteCommunication: { channel: 'portal', confirmedAt: createdAt, confirmedBy: 'Local demo fixture' },
      createdAt,
      updatedAt: createdAt,
    }));

    routeToStatus(record, 'Awaiting Customer Decision', createdAt);
    record.customerUpdate = customerStage(record.status).update;
    record.history.push({
      status: record.status,
      at: createdAt,
      message: 'A synthetic local demonstration quote is ready to review.',
      customerVisible: true,
    });
    store.requests.unshift(record);
    existingRefs.add(fixture.ref);
    added += 1;
  }

  return added;
}
