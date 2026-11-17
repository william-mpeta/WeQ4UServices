import { registryQuoteIssue, resolveRegistryConfiguration, serviceRegistry } from './services/registry.js';

const commonLifecycle = ['assessment', 'verification', 'readiness', 'quote', 'approval', 'publication', 'customer-decision', 'payment', 'processing', 'completion'];

function configurationStatus(approvalState) {
  if (approvalState === 'approved') return 'approved';
  if (approvalState === 'provisional') return 'provisional-pilot';
  return 'needs-business-confirmation';
}

function definitionFor(service, variant) {
  const isEstimate = ['DL-LEARNER-APPLICATION', 'DL-NEW-TEST'].includes(variant.serviceCode);
  return {
    serviceCode: variant.serviceCode,
    serviceName: variant.displayName,
    categoryServiceId: service.categoryServiceId,
    subtype: variant.subtype,
    variantKey: variant.key,
    serviceKey: service.key,
    version: variant.version,
    approvalVersion: variant.approvalVersion,
    configurationStatus: configurationStatus(variant.approvalState),
    approvalState: variant.approvalState,
    approvalBy: variant.approvedBy,
    approvalAt: variant.approvedAt,
    issueCustomerQuote: variant.issueCustomerQuote,
    requirements: variant.documentChecklist.map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      verificationRule: item.verificationRule || 'Review against the approved service checklist.',
      approvalState: item.approvalState,
    })),
    pricing: isEstimate
      ? { type: 'provisional-service-fee', minimumCents: 20000, maximumCents: 35000, package: 'standard', excludes: ['government', 'test-centre', 'booking', 'third-party'] }
      : variant.pricingProfileRef
        ? { type: 'profile', profileServiceId: variant.pricingProfileRef }
        : { type: 'unconfigured' },
    quoteType: variant.approvalState === 'provisional' ? 'Provisional estimate' : 'Standard quote',
    workflow: commonLifecycle,
    completionRules: [],
  };
}

export const serviceDefinitions = serviceRegistry.flatMap((service) => service.variants
  .filter((variant) => variant.serviceCode)
  .map((variant) => definitionFor(service, variant)));

const normalized = (value) => String(value || '').trim().toLowerCase();

export function resolveServiceDefinition({ serviceCode, services = [], serviceDetails = {}, serviceVariantKey } = {}) {
  const registry = resolveRegistryConfiguration({
    record: { serviceCode, services, serviceDetails, serviceVariantKey },
  });
  if (registry.variant?.serviceCode) {
    return serviceDefinitions.find((item) => item.serviceCode === registry.variant.serviceCode) || null;
  }
  if (serviceCode) {
    const definition = serviceDefinitions.find((item) => item.serviceCode === serviceCode);
    if (!definition || (services.length && !services.includes(definition.categoryServiceId))) return null;
    const detail = normalized(serviceDetails[definition.categoryServiceId]);
    if (detail && !detail.startsWith(normalized(definition.subtype))) return null;
    return definition;
  }
  return null;
}

export function getServiceDefinition(serviceCode) {
  return serviceDefinitions.find((item) => item.serviceCode === serviceCode) || null;
}

export function serviceDefinitionCanQuote(record) {
  const { variant, service } = resolveRegistryConfiguration({ record });
  return Boolean(service && variant
    && ['approved', 'provisional'].includes(service.approvalState)
    && ['approved', 'provisional'].includes(variant.approvalState)
    && variant.issueCustomerQuote);
}

export function serviceQuoteIssue(record, profile) {
  return registryQuoteIssue(record, profile);
}

export function assessmentForServiceDefinition(definition, documents = []) {
  if (!definition) return null;
  const labels = new Set(documents.map((document) => normalized(document.label)));
  return {
    serviceCode: definition.serviceCode,
    serviceDefinitionVersion: definition.version,
    serviceName: definition.serviceName,
    configurationStatus: definition.configurationStatus,
    requirementsReviewed: false,
    requirements: definition.requirements.map((requirement) => ({
      ...requirement,
      status: labels.has(normalized(requirement.label)) ? 'received' : 'missing',
    })),
    eligibility: 'pending',
    governmentReadiness: 'pending',
    notes: '',
  };
}

export function normalizeRequestServiceDefinition(record) {
  const definition = resolveServiceDefinition({
    serviceCode: record.serviceCode,
    services: record.services,
    serviceDetails: record.serviceDetails,
    serviceVariantKey: record.serviceVariantKey,
  });
  if (!definition) return record;
  record.serviceCode ||= definition.serviceCode;
  record.serviceKey ||= definition.serviceKey;
  record.serviceVariantKey ||= definition.variantKey;
  record.serviceDefinitionVersion ||= definition.version;
  record.serviceDefinitionName ||= definition.serviceName;
  record.serviceDefinitionStatus ||= definition.configurationStatus;
  const baseline = assessmentForServiceDefinition(definition, record.documents || []);
  const saved = record.serviceAssessment;
  const savedRequirements = new Map((saved?.requirements || []).map((item) => [item.id, item]));
  record.serviceAssessment = {
    ...baseline,
    ...saved,
    serviceCode: definition.serviceCode,
    serviceDefinitionVersion: definition.version,
    serviceName: definition.serviceName,
    configurationStatus: definition.configurationStatus,
    requirements: definition.requirements.length
      ? definition.requirements.map((requirement) => ({
        ...requirement,
        status: savedRequirements.get(requirement.id)?.status || baseline.requirements.find((item) => item.id === requirement.id)?.status || 'missing',
        evidenceDocumentId: savedRequirements.get(requirement.id)?.evidenceDocumentId || '',
        note: savedRequirements.get(requirement.id)?.note || '',
      }))
      : saved?.requirements || baseline.requirements,
  };
  return record;
}
