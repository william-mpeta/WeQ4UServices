import { randomUUID } from 'node:crypto';
import { pricingSeedData } from './pricingSeedData.js';
import { resolveServiceDefinition } from './serviceDefinitions.js';

export const serviceCatalogue = [
  { id: 'vehicle-ownership-onboarding', name: 'New vehicle owner help', department: 'Operations', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'drivers-licences', name: "Driver's Licences", pricingName: "Driver's Licence Renewal", department: 'Licensing', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'prdps', name: 'PrDPs', pricingName: 'PrDP Application', department: 'PrDP Processing', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'licence-disc-renewals', name: 'Licence Disc Renewals', department: 'Licensing', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'vehicle-registrations', name: 'Vehicle Registrations', department: 'Licensing', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'change-of-ownership', name: 'Change of Ownership', department: 'Licensing', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'duplicate-documents', name: 'Duplicate Documents', department: 'Licensing', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'roadworthy-certificates', name: 'Roadworthy Certificates', department: 'Operations', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'door-to-door-courier', name: 'Door-to-Door Courier', department: 'Courier', turnaround: null, documentPolicy: 'case-specific' },
  { id: 'traffic-register', name: 'Traffic Register', department: 'Licensing', turnaround: null, documentPolicy: 'case-specific' },
];

export const pricingComponents = [
  { id: 'governmentFee', label: 'Government fee (pass-through)', applies: 'base' },
  { id: 'processingFee', label: 'Processing service fee', applies: 'base' },
  { id: 'serviceFee', label: 'Service fee', applies: 'not-used' },
  { id: 'platformFee', label: 'Platform fee', applies: 'base' },
  { id: 'administrationFee', label: 'Administration fee', applies: 'not-used' },
  { id: 'convenienceFee', label: 'Convenience fee', applies: 'base' },
  { id: 'paymentFee', label: 'Payment fee (pass-through)', applies: 'base' },
  { id: 'collectionFee', label: 'Collection service', applies: 'collection' },
  { id: 'deliveryFee', label: 'Delivery service', applies: 'delivery' },
  { id: 'priorityFee', label: 'Priority package uplift', applies: 'future' },
  { id: 'expressFee', label: 'Express package uplift', applies: 'future' },
  { id: 'vipConciergeFee', label: 'VIP Concierge package uplift', applies: 'future' },
];

export const pricingPackages = [
  { id: 'standard', name: 'Standard', componentId: null },
  { id: 'priority', name: 'Priority', componentId: 'priorityFee' },
  { id: 'express', name: 'Express', componentId: 'expressFee' },
  { id: 'vip', name: 'VIP Concierge', componentId: 'vipConciergeFee' },
];
export const contributionRatePercent = 30;

export function isProvisionalLicenceEstimateEligible(record) {
  return resolveServiceDefinition({
    serviceCode: record.serviceCode,
    services: record.services,
    serviceDetails: record.serviceDetails,
  })?.pricing.type === 'provisional-service-fee';
}

const requiredComponentIds = pricingComponents.filter((component) => component.applies === 'base').map((component) => component.id);
const vatTreatments = new Set(['inclusive', 'exclusive', 'not-applicable']);

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function createDefaultPricingProfiles(existing = {}, today = localDateString()) {
  return Object.fromEntries(serviceCatalogue.map((service) => {
    const saved = existing[service.id];
    const defaults = {
      serviceId: service.id,
      profileId: `WQ-P-${service.id}`,
      version: 0,
      status: 'draft',
      currency: 'ZAR',
      components: Object.fromEntries(pricingComponents.map(({ id }) => [id, { amountCents: null, costCents: null }])),
      vatTreatment: null,
      effectiveFrom: today,
      versionHistory: [],
      updatedAt: null,
      updatedBy: null,
    };
    if (!saved) return [service.id, defaults];
    return [service.id, {
      ...defaults,
      ...saved,
      components: Object.fromEntries(pricingComponents.map(({ id }) => [
        id,
        { ...defaults.components[id], ...(saved.components?.[id] || {}) },
      ])),
      vatTreatment: saved.vatTreatment ?? null,
      effectiveFrom: saved.effectiveFrom ?? today,
    }];
  }));
}

export function seedCommercialPricingProfiles(existing = {}, today = localDateString()) {
  const profiles = createDefaultPricingProfiles(existing, today);
  for (const row of pricingSeedData) {
    const components = { ...profiles[row.serviceId].components };
    for (const component of pricingComponents) {
      if (Object.hasOwn(row.amountsCents, component.id)) {
        components[component.id] = { amountCents: row.amountsCents[component.id], costCents: null };
      }
    }
    profiles[row.serviceId] = {
      ...profiles[row.serviceId],
      profileId: `WQ-P-${row.serviceId}`,
      name: row.name,
      version: 2,
      status: 'active',
      currency: 'ZAR',
      components,
      vatTreatment: 'not-applicable',
      effectiveFrom: '2026-11-01',
      eligibleServiceDetails: row.eligibleServiceDetails,
      seededFrom: 'WeQ4U-Pricing-Engine-v2.0 · approved customer price card',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Commercial pricing model v2.0 seed',
    };
  }
  return profiles;
}

export function hasConfiguredPricingProfiles(profiles = {}) {
  return Object.values(profiles).some((profile) =>
    profile.status === 'active'
    || profile.version > 0
    || Boolean(profile.updatedAt)
    || Object.values(profile.components || {}).some((component) =>
      Number.isSafeInteger(component?.amountCents) || Number.isSafeInteger(component?.costCents)));
}

function selectedQuoteComponents(record) {
  const packageComponentId = pricingPackages.find(({ id }) => id === (record.pricingPackage || 'standard'))?.componentId;
  return pricingComponents.filter(({ id, applies }) =>
    applies === 'base'
    || (applies === 'collection' && record.courierCollection)
    || (applies === 'delivery' && record.courierDelivery)
    || id === packageComponentId);
}

function packagePriceOptions(profile) {
  if (profile?.status !== 'active'
    || !vatTreatments.has(profile.vatTreatment)
    || !isValidDate(profile.effectiveFrom)
    || profile.effectiveFrom > localDateString()) return [];
  if (!requiredComponentIds.every((id) => Number.isSafeInteger(profile?.components?.[id]?.amountCents))) return [];
  const standardCents = requiredComponentIds.reduce((total, id) => total + profile.components[id].amountCents, 0);
  return pricingPackages.flatMap((pricingPackage) => {
    const upliftCents = pricingPackage.componentId
      ? profile.components[pricingPackage.componentId]?.amountCents
      : 0;
    if (!Number.isSafeInteger(upliftCents)) return [];
    return [{
      id: pricingPackage.id,
      name: pricingPackage.name,
      totalCents: standardCents + upliftCents,
      upliftCents,
    }];
  });
}

function isProfileEligibleForRequest(record, profile) {
  return !profile?.eligibleServiceDetails?.length
    || profile.eligibleServiceDetails.some((detail) => record.serviceDetails?.[profile.serviceId] === detail
      || record.serviceDetails?.[profile.serviceId]?.startsWith(`${detail} · `));
}

export function resolvePricingProfile(record, profiles = {}, at = new Date().toISOString()) {
  const service = serviceCatalogue.find(({ id }) => id === record.services?.[0]);
  const profile = service ? profiles[service.id] : null;
  const serviceDefinition = resolveServiceDefinition({ serviceCode: record.serviceCode, services: record.services, serviceDetails: record.serviceDetails });
  if (serviceDefinition?.pricing.type === 'provisional-service-fee') {
    const serviceDetail = serviceDefinition.subtype;
    return {
      serviceId: service.id,
      serviceName: service.name,
      serviceCode: serviceDefinition.serviceCode,
      serviceDefinitionName: serviceDefinition.serviceName,
      serviceDefinitionVersion: serviceDefinition.version,
      serviceDefinitionStatus: serviceDefinition.configurationStatus,
      serviceDetail,
      packageId: 'standard',
      packageName: 'Standard estimate',
      expectedProfileId: `WQ-EST-${serviceDefinition.serviceCode}`,
      expectedProfileName: serviceDefinition.serviceName,
      profileStatus: 'provisional',
      profileVersion: null,
      effectiveFrom: localDateString(new Date(at)),
      status: 'provisional-estimate',
      reason: `Choose a service fee from the configured provisional R${serviceDefinition.pricing.minimumCents / 100}–R${serviceDefinition.pricing.maximumCents / 100} band. Authority and third-party charges are excluded.`,
      availableProfiles: [],
      preview: {
        ready: true,
        currency: 'ZAR',
        lines: [],
        missing: [],
        totalCents: null,
        contributionCents: null,
        packages: [],
      },
    };
  }
  const profileName = profile?.name || service?.pricingName || service?.name || '';
  const availableProfiles = Object.values(profiles)
    .filter((candidate) => candidate.status === 'active')
    .map((candidate) => ({
      serviceId: candidate.serviceId,
      profileId: candidate.profileId,
      name: candidate.name || serviceCatalogue.find(({ id }) => id === candidate.serviceId)?.pricingName || serviceCatalogue.find(({ id }) => id === candidate.serviceId)?.name || candidate.serviceId,
      version: candidate.version,
    }));
  let status = 'active';
  let reason = '';
  if (!service || !profile) {
    status = 'not-found';
    reason = 'No pricing profile is mapped to this request service.';
  } else if (profile.status !== 'active') {
    status = 'inactive';
    reason = `The ${profileName} profile exists but is ${profile.status}.`;
  } else if (!isProfileEligibleForRequest(record, profile)) {
    status = 'service-mismatch';
    reason = `${profileName} is limited to ${profile.eligibleServiceDetails.join(' or ')}; this request is ${record.serviceDetails?.[service.id] || 'unspecified'}.`;
  } else if (!vatTreatments.has(profile.vatTreatment)) {
    status = 'incomplete';
    reason = 'Configure and approve the VAT treatment before generating a quote.';
  } else if (!isValidDate(profile.effectiveFrom)) {
    status = 'incomplete';
    reason = 'Configure a valid effective-from date before generating a quote.';
  } else if (profile.effectiveFrom > localDateString(new Date(at))) {
    status = 'not-yet-effective';
    reason = `This pricing profile becomes effective on ${profile.effectiveFrom}.`;
  }
  const components = profile ? selectedQuoteComponents(record) : [];
  const missing = profile && ['active', 'incomplete'].includes(status)
    ? components.filter(({ id }) => !Number.isSafeInteger(profile.components?.[id]?.amountCents)).map(({ id, label }) => ({ id, label }))
    : [];
  if (!reason && missing.length) {
    status = 'incomplete';
    reason = `Configure ${missing.map(({ label }) => label.toLowerCase()).join(', ')} before generating a quote.`;
  }
  const configuredLines = components
    .filter(({ id }) => Number.isSafeInteger(profile?.components?.[id]?.amountCents))
    .map(({ id, label }) => ({
      componentId: id,
      label,
      amountCents: profile.components[id].amountCents,
    }));
  const totalCents = configuredLines.reduce((total, line) => total + line.amountCents, 0);
  if (!reason && (!Number.isSafeInteger(totalCents) || totalCents <= 0)) {
    status = 'incomplete';
    reason = 'The configured quote total must be greater than zero.';
  }
  return {
    serviceId: service?.id || record.services?.[0] || '',
    serviceName: service?.name || record.services?.[0] || 'Unknown service',
    serviceDetail: record.serviceDetails?.[service?.id] || '',
    packageId: record.pricingPackage || 'standard',
    packageName: pricingPackages.find(({ id }) => id === (record.pricingPackage || 'standard'))?.name || 'Unknown package',
    expectedProfileId: profile?.profileId || `WQ-P-${service?.id || 'unknown'}`,
    expectedProfileName: profileName,
    profileStatus: profile?.status || 'missing',
    profileVersion: profile?.version ?? null,
    effectiveFrom: profile?.effectiveFrom || null,
    status,
    reason,
    availableProfiles,
    preview: {
      ready: status === 'active',
      currency: profile?.currency || 'ZAR',
      lines: configuredLines,
      missing,
      totalCents: configuredLines.length === components.length && components.length > 0 ? totalCents : null,
      contributionCents: configuredLines.length === components.length && components.length > 0
        ? Math.round(totalCents * contributionRatePercent / 100)
        : null,
      packages: packagePriceOptions(profile),
    },
  };
}

export function publicServiceCatalogue(profiles) {
  return serviceCatalogue.map((service) => {
    const profile = profiles[service.id];
    const canShowStartingPrice = profile?.status === 'active'
      && !profile.eligibleServiceDetails?.length
      && vatTreatments.has(profile.vatTreatment)
      && isValidDate(profile.effectiveFrom)
      && profile.effectiveFrom <= localDateString()
      && requiredComponentIds.every((id) => Number.isSafeInteger(profile.components?.[id]?.amountCents));
    const startingFromCents = canShowStartingPrice
      ? requiredComponentIds.reduce((total, id) => total + profile.components[id].amountCents, 0)
      : null;
    return {
      ...service,
      pricingProfileId: profile.profileId,
      pricingStatus: canShowStartingPrice ? 'active' : 'quote-after-review',
      startingFromCents,
      currency: profile.currency,
      eligibleServiceDetails: profile.eligibleServiceDetails || [],
      packages: packagePriceOptions(profile),
    };
  });
}

export function validatePricingProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !body.components || typeof body.components !== 'object' || Array.isArray(body.components)) {
    return 'Pricing components are required.';
  }
  if (typeof body.active !== 'boolean') return 'Choose whether the approved pricing profile should be active.';
  if (body.vatTreatment !== null && !vatTreatments.has(body.vatTreatment)) return 'Choose a supported VAT treatment.';
  if (!isValidDate(body.effectiveFrom)) return 'Enter a valid effective-from date (YYYY-MM-DD).';
  if (body.active && !vatTreatments.has(body.vatTreatment)) return 'Choose and approve a VAT treatment before activating this profile.';
  const componentIds = new Set(pricingComponents.map(({ id }) => id));
  if (Object.keys(body.components).length !== componentIds.size || Object.keys(body.components).some((id) => !componentIds.has(id))) {
    return 'Provide every pricing component exactly once.';
  }
  for (const id of componentIds) {
    const component = body.components[id];
    if (!component || typeof component !== 'object' || Array.isArray(component)) return `The ${id} component is invalid.`;
    for (const field of ['amountCents', 'costCents']) {
      const value = component[field];
      if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000)) {
        return `${id} ${field} must be a non-negative whole number of cents or left blank.`;
      }
    }
    if (Object.keys(component).some((field) => !['amountCents', 'costCents'].includes(field))) return `The ${id} component contains an unsupported field.`;
  }
  if (body.active && requiredComponentIds.some((id) => !Number.isSafeInteger(body.components[id].amountCents))) {
    return 'Complete each base component amount before activating this profile. Use 0 only when Finance has approved no charge.';
  }
  return '';
}

export function quoteConfigurationIssue(record, profile, at = new Date().toISOString()) {
  if (isProvisionalLicenceEstimateEligible(record)) return 'Use the separate provisional service-fee estimate workflow; renewal pricing does not apply to learner or new-driver tests.';
  if (!profile || profile.status !== 'active') return 'No active pricing profile configured for this service.';
  if (!isProfileEligibleForRequest(record, profile)) return `No active pricing profile configured for this ${profile.eligibleServiceDetails.join(' or ')} service.`;
  if (!vatTreatments.has(profile.vatTreatment)) return 'Finance must configure and approve the VAT treatment before a quote can be generated.';
  if (!isValidDate(profile.effectiveFrom)) return 'Finance must configure a valid pricing effective-from date before a quote can be generated.';
  if (profile.effectiveFrom > localDateString(new Date(at))) return `This pricing profile becomes effective on ${profile.effectiveFrom}. Quotes can be generated from that date.`;
  if (!pricingPackages.some(({ id }) => id === (record.pricingPackage || 'standard'))) return 'Choose a supported quote package.';
  const selectedComponents = selectedQuoteComponents(record);
  const missing = selectedComponents.find(({ id }) => !Number.isSafeInteger(profile.components?.[id]?.amountCents));
  if (missing) return `Finance must configure the ${missing.label.toLowerCase()} for this request before a quote can be generated.`;
  const totalCents = selectedComponents.reduce((total, { id }) => total + profile.components[id].amountCents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) return 'The configured quote total must be greater than zero.';
  return '';
}

export function generateQuote(record, profile, { notes, conditions = [], requiredDocuments = [], validUntil, quoteNumber, at = new Date().toISOString() } = {}) {
  const error = quoteConfigurationIssue(record, profile, at);
  if (error) return { error };
  const selectedComponents = selectedQuoteComponents(record);
  const lines = selectedComponents.map(({ id, label }) => ({
    componentId: id,
    label,
    amountCents: profile.components[id].amountCents,
    costCents: profile.components[id].costCents,
  }));
  const totalCents = lines.reduce((total, line) => total + line.amountCents, 0);
  const costsAreComplete = lines.every((line) => Number.isSafeInteger(line.costCents));
  return {
    quote: {
      id: `Q-${randomUUID()}`,
      quoteNumber: quoteNumber || `QUO-${new Date(at).getFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      serviceId: record.services[0],
      profileId: profile.profileId,
      profileVersion: profile.version,
      vatTreatment: profile.vatTreatment,
      effectiveFrom: profile.effectiveFrom,
      profileName: profile.name || serviceCatalogue.find(({ id }) => id === profile.serviceId)?.pricingName || serviceCatalogue.find(({ id }) => id === profile.serviceId)?.name,
      packageId: record.pricingPackage || 'standard',
      packageName: pricingPackages.find(({ id }) => id === (record.pricingPackage || 'standard'))?.name || 'Standard',
      version: 1,
      currency: 'ZAR',
      lines,
      totalCents,
      estimatedCostCents: costsAreComplete ? lines.reduce((total, line) => total + line.costCents, 0) : null,
      contributionRatePercent,
      contributionCents: Math.round(totalCents * contributionRatePercent / 100),
      notes,
      conditions,
      requiredDocuments,
      validUntil,
      generatedAt: at,
    },
  };
}

export function generateProvisionalLicenceServiceFeeEstimate(record, amountCents, { notes, conditions = [], requiredDocuments = [], validUntil, quoteNumber, at = new Date().toISOString() } = {}) {
  const definition = resolveServiceDefinition({ serviceCode: record.serviceCode, services: record.services, serviceDetails: record.serviceDetails });
  if (definition?.pricing.type !== 'provisional-service-fee') return { error: 'This provisional estimate is not configured for the selected service definition.' };
  if (!Number.isSafeInteger(amountCents)
    || amountCents < definition.pricing.minimumCents
    || amountCents > definition.pricing.maximumCents) {
    return { error: `Choose a provisional service fee between R${definition.pricing.minimumCents / 100} and R${definition.pricing.maximumCents / 100}.` };
  }
  if ((record.pricingPackage || 'standard') !== 'standard') return { error: 'Only the Standard package is available for this provisional estimate; package uplifts are not approved for this service.' };
  if (record.courierCollection || record.courierDelivery) return { error: 'Courier charges are not included in this provisional estimate; remove courier or confirm an approved route charge separately.' };
  const serviceDetail = definition.subtype;
  const estimateConditions = [...new Set([
    'Provisional WeQ4U service-fee estimate only. Government, test-centre, booking, medical, and other third-party charges are excluded and must be confirmed separately before proceeding.',
    ...conditions,
  ])];
  return {
    quote: {
      id: `Q-${randomUUID()}`,
      quoteNumber: quoteNumber || `QUO-${new Date(at).getFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      serviceId: record.services[0],
      serviceDetail,
      pricingBasis: 'provisional-service-fee-estimate',
      pricingBasisLabel: 'Provisional service-fee estimate',
      pricingBasisVersion: `${definition.serviceCode}-v${definition.version}`,
      estimateDisclaimer: 'This is not an all-in price. Government, test-centre, booking, and third-party charges are excluded and remain subject to confirmation.',
      profileId: `WQ-EST-${definition.serviceCode}`,
      profileVersion: 0,
      vatTreatment: 'not-applicable',
      effectiveFrom: at.slice(0, 10),
      profileName: serviceDetail,
      packageId: 'standard',
      packageName: 'Standard',
      version: 1,
      currency: 'ZAR',
      lines: [{ componentId: 'provisionalServiceFee', label: 'Provisional WeQ4U service fee', amountCents }],
      totalCents: amountCents,
      estimatedCostCents: null,
      contributionRatePercent: null,
      contributionCents: null,
      notes,
      conditions: estimateConditions,
      requiredDocuments,
      validUntil,
      generatedAt: at,
    },
  };
}

export function financeQuoteSummary(requests) {
  const byService = new Map(serviceCatalogue.map(({ id, name }) => [id, {
    serviceId: id, serviceName: name, quoteCount: 0, quotedCents: 0, contributionCents: 0, contributionComplete: true, estimatedCostCents: 0, costsComplete: true,
  }]));
  for (const record of requests) {
    const quote = record.quote;
    if (!quote || !byService.has(quote.serviceId)) continue;
    const row = byService.get(quote.serviceId);
    row.quoteCount += 1;
    row.quotedCents += quote.totalCents;
    if (quote.pricingBasis === 'case-specific-manual') {
      row.contributionComplete = false;
      row.costsComplete = false;
      continue;
    }
    row.contributionCents += Number.isSafeInteger(quote.contributionCents)
      ? quote.contributionCents
      : Math.round(quote.totalCents * contributionRatePercent / 100);
    if (!Number.isSafeInteger(quote.estimatedCostCents)) row.costsComplete = false;
    else row.estimatedCostCents += quote.estimatedCostCents;
  }
  return [...byService.values()].map(({ costsComplete, contributionComplete, ...row }) => ({
    ...row,
    contributionCents: contributionComplete ? row.contributionCents : null,
    estimatedCostCents: costsComplete && row.quoteCount ? row.estimatedCostCents : null,
    estimatedGrossMarginCents: costsComplete && row.quoteCount ? row.quotedCents - row.estimatedCostCents : null,
  }));
}
