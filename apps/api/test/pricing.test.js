import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPricingProfiles, generateProvisionalLicenceServiceFeeEstimate, generateQuote, hasConfiguredPricingProfiles, isProvisionalLicenceEstimateEligible, publicServiceCatalogue, resolvePricingProfile, seedCommercialPricingProfiles, validatePricingProfileUpdate } from '../src/pricing.js';
import { normalizeRequestServiceDefinition, resolveServiceDefinition, serviceDefinitionCanQuote, serviceQuoteIssue } from '../src/serviceDefinitions.js';
import { serviceRegistry } from '../src/services/registry.js';
import { serviceAssessmentReady } from '../src/workflow.js';

function completeProfile(overrides = {}) {
  const profile = createDefaultPricingProfiles({}, '2026-11-09')['drivers-licences'];
  for (const [componentId, amountCents] of Object.entries({
    governmentFee: 1000,
    serviceFee: 2000,
    platformFee: 0,
    administrationFee: 300,
    processingFee: 400,
    convenienceFee: 700,
    paymentFee: 0,
  })) {
    profile.components[componentId] = { amountCents, costCents: 500 };
  }
  profile.status = 'active';
  profile.vatTreatment = 'not-applicable';
  profile.effectiveFrom = '2026-11-09';
  return { ...profile, ...overrides };
}

test('new catalogue profiles contain no invented price values', () => {
  const profiles = createDefaultPricingProfiles();
  assert.equal(profiles['drivers-licences'].status, 'draft');
  assert.ok(Object.values(profiles['drivers-licences'].components).every((component) => component.amountCents === null));
  assert.equal(publicServiceCatalogue(profiles).find((service) => service.id === 'drivers-licences').startingFromCents, null);
});

test('commercial seed imports only services and amounts present on the approved price card', () => {
  const seeded = seedCommercialPricingProfiles({}, '2026-11-09');
  const totals = {
    'drivers-licences': 45000,
    prdps: 65000,
    'licence-disc-renewals': 35000,
    'change-of-ownership': 50000,
    'traffic-register': 25000,
  };
  for (const [serviceId, totalCents] of Object.entries(totals)) {
    const profile = seeded[serviceId];
    assert.equal(profile.status, 'active');
    assert.equal(profile.version, 2);
    assert.equal(profile.effectiveFrom, '2026-11-01');
    assert.equal(profile.components.governmentFee.amountCents
      + profile.components.processingFee.amountCents
      + profile.components.platformFee.amountCents
      + profile.components.convenienceFee.amountCents
      + profile.components.paymentFee.amountCents, totalCents);
    assert.equal(profile.components.priorityFee.amountCents, 15000);
    assert.equal(profile.components.expressFee.amountCents, 30000);
    assert.equal(profile.components.vipConciergeFee.amountCents, 50000);
    const serviceDetails = profile.eligibleServiceDetails?.[0]
      ? { [serviceId]: profile.eligibleServiceDetails[0] }
      : {};
    const quote = generateQuote({ services: [serviceId], serviceDetails }, profile);
    assert.equal(quote.quote.totalCents, totalCents);
  }
  assert.equal(seeded['vehicle-registrations'].status, 'draft');
  assert.equal(seeded['duplicate-documents'].status, 'draft');
  assert.equal(hasConfiguredPricingProfiles(createDefaultPricingProfiles({}, '2026-11-09')), false);
  assert.equal(hasConfiguredPricingProfiles(seeded), true);
  assert.match(generateQuote(
    { services: ['drivers-licences'], serviceDetails: { 'drivers-licences': 'New driver licence test' } },
    seeded['drivers-licences'],
  ).error, /separate provisional service-fee estimate workflow/);
  assert.ok(generateQuote(
    { services: ['drivers-licences'], serviceDetails: { 'drivers-licences': 'Existing driver / renewal' } },
    seeded['drivers-licences'],
  ).quote);
});

test('pricing resolution explains matches and previews the same amount as quote generation', () => {
  const profiles = seedCommercialPricingProfiles({}, '2026-11-09');
  const request = {
    services: ['drivers-licences'],
    serviceDetails: { 'drivers-licences': 'Existing driver / renewal' },
  };
  const resolution = resolvePricingProfile(request, profiles, '2026-11-09T10:00:00.000Z');
  const quote = generateQuote(request, profiles['drivers-licences'], { at: '2026-11-09T10:00:00.000Z' }).quote;
  assert.equal(resolution.serviceId, 'drivers-licences');
  assert.equal(resolution.expectedProfileName, "Driver's Licence Renewal");
  assert.equal(resolution.profileStatus, 'active');
  assert.equal(resolution.status, 'active');
  assert.equal(resolution.preview.totalCents, quote.totalCents);
  assert.deepEqual(resolution.preview.lines.map(({ componentId, amountCents }) => ({ componentId, amountCents })), quote.lines.map(({ componentId, amountCents }) => ({ componentId, amountCents })));

  const courierProfiles = structuredClone(profiles);
  courierProfiles['drivers-licences'].components.collectionFee.amountCents = 2500;
  const courierRequest = { ...request, courierCollection: true };
  const courierResolution = resolvePricingProfile(courierRequest, courierProfiles, '2026-11-09T10:00:00.000Z');
  const courierQuote = generateQuote(courierRequest, courierProfiles['drivers-licences'], { at: '2026-11-09T10:00:00.000Z' }).quote;
  assert.equal(courierResolution.preview.totalCents, courierQuote.totalCents);
  assert.equal(courierResolution.preview.lines.at(-1).componentId, 'collectionFee');

  const inactiveProfiles = structuredClone(profiles);
  inactiveProfiles['drivers-licences'].status = 'draft';
  const inactive = resolvePricingProfile(request, inactiveProfiles, '2026-11-09T10:00:00.000Z');
  assert.equal(inactive.status, 'inactive');
  assert.match(inactive.reason, /exists but is draft/);

  const wrongVariant = resolvePricingProfile({
    ...request,
    serviceDetails: { 'drivers-licences': 'New driver licence test' },
  }, profiles, '2026-11-09T10:00:00.000Z');
  assert.equal(wrongVariant.status, 'provisional-estimate');
  assert.match(wrongVariant.reason, /provisional R200–R350 band/);

  const missing = resolvePricingProfile({ services: ['vehicle-ownership-onboarding'] }, profiles, '2026-11-09T10:00:00.000Z');
  assert.equal(missing.status, 'inactive');
  assert.equal(missing.profileStatus, 'draft');
  assert.ok(missing.availableProfiles.some(({ serviceId }) => serviceId === 'drivers-licences'));

  const priorityRequest = { ...request, pricingPackage: 'priority' };
  const priorityQuote = generateQuote(priorityRequest, profiles['drivers-licences'], { at: '2026-11-09T10:00:00.000Z' }).quote;
  assert.equal(priorityQuote.totalCents, 60000);
  assert.equal(priorityQuote.packageName, 'Priority');
  assert.equal(priorityQuote.contributionRatePercent, 30);
  assert.equal(priorityQuote.contributionCents, 18000);
  assert.equal(priorityQuote.lines.at(-1).componentId, 'priorityFee');
  assert.deepEqual(publicServiceCatalogue(profiles).find(({ id }) => id === 'drivers-licences').packages.map(({ id, totalCents }) => ({ id, totalCents })), [
    { id: 'standard', totalCents: 45000 },
    { id: 'priority', totalCents: 60000 },
    { id: 'express', totalCents: 75000 },
    { id: 'vip', totalCents: 95000 },
  ]);
  assert.equal(resolvePricingProfile(priorityRequest, profiles, '2026-11-09T10:00:00.000Z').preview.totalCents, priorityQuote.totalCents);
});

test('learner and new-driver requests use a bounded provisional service-fee estimate, not renewal pricing', () => {
  for (const serviceDetail of ['Learner licence test', 'New driver licence test · Appointment preference: Xavier Centre']) {
    const request = { services: ['drivers-licences'], serviceDetails: { 'drivers-licences': serviceDetail }, pricingPackage: 'standard' };
    assert.equal(isProvisionalLicenceEstimateEligible(request), true);
    const resolution = resolvePricingProfile(request, seedCommercialPricingProfiles({}, '2026-11-09'), '2026-11-09T10:00:00.000Z');
    assert.equal(resolution.status, 'provisional-estimate');
    const estimate = generateProvisionalLicenceServiceFeeEstimate(request, 27500, {
      notes: 'We will confirm the test-centre charges separately.',
      validUntil: '2026-11-16',
      at: '2026-11-09T10:00:00.000Z',
    });
    assert.equal(estimate.quote.totalCents, 27500);
    assert.deepEqual(estimate.quote.lines.map((line) => line.componentId), ['provisionalServiceFee']);
    assert.equal(estimate.quote.pricingBasis, 'provisional-service-fee-estimate');
    assert.match(estimate.quote.estimateDisclaimer, /Government, test-centre, booking/);
    assert.equal(estimate.quote.contributionCents, null);
    assert.match(generateProvisionalLicenceServiceFeeEstimate({ ...request, pricingPackage: 'priority' }, 27500).error, /Only the Standard package/);
    assert.match(generateProvisionalLicenceServiceFeeEstimate(request, 19999).error, /between R200 and R350/);
    assert.match(generateProvisionalLicenceServiceFeeEstimate(request, 35001).error, /between R200 and R350/);
    assert.match(generateQuote(request, seedCommercialPricingProfiles({}, '2026-11-09')['drivers-licences']).error, /separate provisional service-fee estimate workflow/);
  }
  assert.equal(isProvisionalLicenceEstimateEligible({ services: ['drivers-licences'], serviceDetails: { 'drivers-licences': 'Existing driver / renewal' } }), false);
  assert.equal(isProvisionalLicenceEstimateEligible({ services: ['prdps'], serviceDetails: { prdps: 'New PrDP' } }), false);
});

test('service definitions distinguish new-driver test from renewal and seed only unverified template requirements', () => {
  const request = normalizeRequestServiceDefinition({
    services: ['drivers-licences'],
    serviceDetails: { 'drivers-licences': 'New driver licence test · Appointment preference: Xavier Centre' },
    documents: [{ id: 'doc-1', label: 'Copy of ID', reviewState: 'received' }],
  });
  assert.equal(request.serviceCode, 'DL-NEW-TEST');
  assert.equal(request.serviceDefinitionName, "New driver's licence test");
  assert.equal(request.serviceAssessment.configurationStatus, 'needs-business-confirmation');
  assert.deepEqual(request.serviceAssessment.requirements.map(({ id, status }) => ({ id, status })), [
    { id: 'id-copy', status: 'received' },
    { id: 'learner-licence', status: 'missing' },
    { id: 'booking-confirmation', status: 'missing' },
  ]);
  assert.ok(request.serviceAssessment.requirements.every(({ status }) => status !== 'verified'));
  assert.equal(serviceAssessmentReady(request), false, 'received evidence and missing checklist items cannot satisfy readiness');
  assert.equal(serviceDefinitionCanQuote(request), false, 'new-driver test requirements are not approved for customer quoting');
  const renewal = resolveServiceDefinition({ services: ['drivers-licences'], serviceDetails: { 'drivers-licences': 'Existing driver / renewal' } });
  assert.equal(renewal.serviceCode, 'DL-RENEWAL');
  assert.notEqual(renewal.serviceCode, request.serviceCode);
});

test('only the configured provisional driver-renewal variant can pass customer quote gates', () => {
  const profiles = seedCommercialPricingProfiles({}, '2026-11-16');
  for (const service of serviceRegistry) {
    for (const variant of service.variants) {
      const request = {
        services: [service.categoryServiceId],
        serviceKey: service.key,
        serviceVariantKey: variant.key,
        serviceCode: variant.serviceCode,
        serviceDetails: { [service.categoryServiceId]: variant.subtype },
      };
      const result = serviceQuoteIssue(request, profiles[variant.pricingProfileRef]);
      assert.equal(result.allowed, service.key === 'drivers-licence' && variant.key === 'renewal', `${service.key}/${variant.key} must not be customer-quotable`);
    }
  }
});

test('active profiles require explicit base component amounts', () => {
  const profile = createDefaultPricingProfiles({}, '2026-11-09')['drivers-licences'];
  const metadata = { vatTreatment: 'not-applicable', effectiveFrom: '2026-11-09' };
  assert.match(validatePricingProfileUpdate({ active: true, components: profile.components, ...metadata }), /Complete each base component amount/);
  assert.equal(validatePricingProfileUpdate({ active: false, components: profile.components, vatTreatment: null, effectiveFrom: '2026-11-09' }), '');
  assert.match(validatePricingProfileUpdate({ active: true, components: profile.components, vatTreatment: null, effectiveFrom: '2026-11-09' }), /VAT treatment/);
  assert.match(validatePricingProfileUpdate({ active: true, components: profile.components, vatTreatment: 'not-applicable', effectiveFrom: '2026-02-30' }), /valid effective-from date/);
  assert.equal(validatePricingProfileUpdate({ active: true, components: completeProfile().components, ...metadata }), '');
});

test('quotes include configured payment fees and snapshot pricing metadata', () => {
  const profile = completeProfile({
    components: {
      ...completeProfile().components,
      platformFee: { amountCents: 5700, costCents: 0 },
      collectionFee: { amountCents: 2500, costCents: 2000 },
      deliveryFee: { amountCents: 3000, costCents: 2200 },
      priorityFee: { amountCents: 9000, costCents: 0 },
      paymentFee: { amountCents: 1000, costCents: 0 },
    },
  });
  const request = { services: ['drivers-licences'], courierCollection: true, courierDelivery: false };
  const result = generateQuote(request, profile, { notes: 'Confirmed service scope', validUntil: '2026-11-16', at: '2026-11-09T10:00:00.000Z' });
  assert.ok(result.quote);
  assert.equal(result.quote.totalCents, 11300);
  assert.deepEqual(result.quote.lines.map((line) => line.componentId), [
    'governmentFee', 'processingFee', 'platformFee', 'convenienceFee', 'paymentFee', 'collectionFee',
  ]);
  assert.equal(result.quote.estimatedCostCents, 3500);
  assert.equal(result.quote.profileVersion, 0);
  assert.equal(result.quote.vatTreatment, 'not-applicable');
  assert.equal(result.quote.effectiveFrom, '2026-11-09');
  assert.equal(result.quote.notes, 'Confirmed service scope');
  assert.equal(result.quote.validUntil, '2026-11-16');
  assert.equal(result.quote.generatedAt, '2026-11-09T10:00:00.000Z');
});

test('legacy profiles become effective today without inventing component prices', () => {
  const profiles = createDefaultPricingProfiles({
    'drivers-licences': {
      serviceId: 'drivers-licences',
      status: 'active',
      components: { governmentFee: { amountCents: 1000 } },
    },
  }, '2026-11-09');
  const profile = profiles['drivers-licences'];
  assert.equal(profile.components.governmentFee.amountCents, 1000);
  assert.equal(profile.components.governmentFee.costCents, null);
  assert.equal(profile.components.platformFee.amountCents, null);
  assert.equal(profile.components.paymentFee.amountCents, null);
  assert.equal(profile.vatTreatment, null);
  assert.equal(profile.effectiveFrom, '2026-11-09');
  assert.equal(publicServiceCatalogue(profiles).find((service) => service.id === 'drivers-licences').startingFromCents, null);
});

test('profiles cannot generate quotes before their effective date', () => {
  const profile = completeProfile({ effectiveFrom: '2026-12-01' });
  assert.match(
    generateQuote({ services: ['drivers-licences'] }, profile, { at: '2026-11-09T10:00:00.000Z' }).error,
    /becomes effective on 2026-12-01/,
  );
  assert.ok(generateQuote({ services: ['drivers-licences'] }, profile, { at: '2026-12-01T10:00:00.000Z' }).quote);
});

test('quotes fail closed when a selected delivery option is not priced', () => {
  const profile = completeProfile();
  assert.match(generateQuote({ services: ['drivers-licences'], courierDelivery: true }, profile).error, /delivery service/);
  assert.match(generateQuote({ services: ['drivers-licences'] }, null).error, /No active pricing profile configured/);
});
