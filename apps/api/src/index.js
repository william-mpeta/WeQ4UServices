import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeQuotePdfBrowser, createQuotePdf, createRegistryReviewPdf } from './quotePdf.js';
import { quoteActionNames, quoteExpiryTimestamp, quoteStatusAction, signQuoteActionToken, verifyQuoteActionToken } from './quoteActionTokens.js';
import { seedDemoQuoteRequests } from './demoQuoteFixtures.js';
import { contributionRatePercent, createDefaultPricingProfiles, financeQuoteSummary, generateQuote, hasConfiguredPricingProfiles, isProvisionalLicenceEstimateEligible, pricingComponents, pricingPackages, publicServiceCatalogue, quoteConfigurationIssue, resolvePricingProfile, seedCommercialPricingProfiles, serviceCatalogue, validatePricingProfileUpdate } from './pricing.js';
import { assessmentForServiceDefinition, normalizeRequestServiceDefinition, resolveServiceDefinition, serviceDefinitionCanQuote, serviceDefinitions, serviceQuoteIssue } from './serviceDefinitions.js';
import { resolveRegistryConfiguration } from './services/registry.js';
import { allowedNextStatuses, availableNextStatuses, customerStage, defaultQuoteValidityDate, getRouting, normalizeWorkflowRecord, routeToStatus, serviceAssessmentReady, validateQuoteValidityDate, workflowStatuses } from './workflow.js';
import { buildPayFastCheckout, parsePayFastAmountCents, payFastCheckoutIsConfigured, payFastSignatureIsValid, payFastSourceIsAllowed, validatePayFastItn } from './payfast.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const privateDirectory = path.resolve(process.env.PRIVATE_STORAGE_DIR || path.join(currentDirectory, '../private'));
const documentsDirectory = path.join(privateDirectory, 'documents');
const requestStorePath = path.join(privateDirectory, 'requests.enc');
const developmentKeyPath = path.join(privateDirectory, 'development.key');
const validServices = new Set([
  'vehicle-ownership-onboarding',
  'drivers-licences',
  'prdps',
  'licence-disc-renewals',
  'vehicle-registrations',
  'change-of-ownership',
  'duplicate-documents',
  'roadworthy-certificates',
  'door-to-door-courier',
  'traffic-register',
]);
const ownershipWorkItems = new Set(['ownership-transfer', 'registration', 'licence-disc', 'roadworthy', 'document-handover', 'not-sure']);
const ownershipPurchaseTypes = new Set(['From a car dealership', 'Private sale', 'Bank or auction sale', 'I am not sure']);
const ownershipFinanceStages = new Set(['I am still paying vehicle finance', 'I have paid off the vehicle finance', 'I did not use vehicle finance', 'I am not sure']);
const validDocumentKeys = new Set([
  'drivers-licences:id-copy', 'drivers-licences:booking-fee-confirmation', 'drivers-licences:booking-confirmation', 'drivers-licences:learner-licence', 'drivers-licences:existing-licence', 'drivers-licences:proof-of-residence', 'prdps:id-copy', 'prdps:medical-certificate', 'prdps:booking-fee-confirmation', 'licence-disc-renewals:id-copy', 'licence-disc-renewals:existing-licence-disc',
  'vehicle-registrations:certified-owner-id', 'vehicle-registrations:proof-of-residence', 'vehicle-registrations:purchase-documentation', 'vehicle-registrations:settlement-letter', 'vehicle-registrations:bank-proxy-id', 'vehicle-registrations:dealer-proxy-id', 'vehicle-registrations:dealer-brn', 'vehicle-registrations:stamped-nco', 'vehicle-registrations:buyer-id', 'vehicle-registrations:buyer-proof-address', 'vehicle-registrations:roadworthy-certificate',
  'change-of-ownership:settlement-letter', 'change-of-ownership:bank-proxy-id', 'change-of-ownership:dealer-proxy-id',
  'change-of-ownership:dealer-brn', 'change-of-ownership:stamped-nco', 'change-of-ownership:buyer-id',
  'change-of-ownership:buyer-proof-address', 'change-of-ownership:roadworthy-certificate', 'duplicate-documents:certified-owner-id', 'duplicate-documents:affidavit',
  'roadworthy-certificates:vehicle-owner-id', 'roadworthy-certificates:roadworthy-certificate',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 8 * 1024 * 1024, fields: 20, fieldSize: 5000 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    if (!allowedTypes.has(file.mimetype)) return callback(new Error('Only PDF, JPG and PNG documents are accepted.'));
    callback(null, true);
  },
});
const allowedOrigins = new Set([
  process.env.STOREFRONT_ORIGIN || 'http://localhost:3000',
  process.env.ADMIN_ORIGIN || 'http://localhost:3001',
  ...(process.env.PUBLIC_BASE_URL ? [new URL(process.env.PUBLIC_BASE_URL).origin] : []),
]);

let encryptionKey;
let writeQueue = Promise.resolve();

app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.urlencoded({
  extended: false,
  limit: '8kb',
  verify: (req, res, buffer) => { req.rawBody = buffer.toString('utf8'); },
}));
app.use(express.json({ limit: '32kb' }));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});
app.use('/api/requests', (req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  next();
});
app.use('/api/quote-decisions', (req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  next();
});

function encryptBuffer(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([Buffer.from('WQ1'), iv, cipher.getAuthTag(), ciphertext]);
}

function decryptBuffer(value) {
  if (value.subarray(0, 3).toString() !== 'WQ1') throw new Error('Private storage format is invalid.');
  const iv = value.subarray(3, 15);
  const tag = value.subarray(15, 31);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(value.subarray(31)), decipher.final()]);
}

async function initializePrivateStorage() {
  if (process.env.NODE_ENV === 'production') publicBaseUrl();
  await mkdir(documentsDirectory, { recursive: true });
  if (process.env.DATA_ENCRYPTION_KEY) {
    if (!/^[\da-f]{64}$/i.test(process.env.DATA_ENCRYPTION_KEY)) {
      throw new Error('DATA_ENCRYPTION_KEY must be a 64-character hexadecimal value.');
    }
    encryptionKey = Buffer.from(process.env.DATA_ENCRYPTION_KEY, 'hex');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATA_ENCRYPTION_KEY must be configured in production.');
  }
  try {
    encryptionKey = await readFile(developmentKeyPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const generatedKey = randomBytes(32);
    try {
      await writeFile(developmentKeyPath, generatedKey, { flag: 'wx', mode: 0o600 });
      encryptionKey = generatedKey;
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
      encryptionKey = await readFile(developmentKeyPath);
    }
  }
  if (encryptionKey.length !== 32) throw new Error('Local development encryption key is invalid.');
}

async function readRequestStore() {
  try {
    const encryptedStore = await readFile(requestStorePath);
    const store = JSON.parse(decryptBuffer(encryptedStore).toString('utf8'));
    store.pricingProfiles = createDefaultPricingProfiles(store.pricingProfiles);
    store.requests = (store.requests || []).map((record) => normalizeRequestServiceDefinition(normalizeWorkflowRecord(record)));
    for (const record of store.requests) {
      syncDocumentTasks(record, record.requestedDocuments || [], 'System migration', record.updatedAt || record.createdAt);
    }
    return store;
  } catch (error) {
    if (error.code === 'ENOENT') return { sequence: 0, requests: [], pricingProfiles: createDefaultPricingProfiles() };
    throw error;
  }
}

async function saveRequestStore(store) {
  const temporaryPath = `${requestStorePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, encryptBuffer(Buffer.from(JSON.stringify(store))), { mode: 0o600 });
  await rename(temporaryPath, requestStorePath);
}

async function initializePricingProfiles() {
  if (process.env.PRICING_SEED_ENABLED === 'false'
    || (process.env.NODE_ENV === 'test' && process.env.PRICING_SEED_ENABLED !== 'true')) return;
  let store;
  try {
    store = JSON.parse(decryptBuffer(await readFile(requestStorePath)).toString('utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    store = { sequence: 0, requests: [], pricingProfiles: {} };
  }
  if (store.pricingSeedVersion === 'commercial-pricing-model-v2' || store.pricingSeedVersion === 'skipped-existing-pricing') return;
  const existingProfiles = store.pricingProfiles || {};
  if (store.pricingSeedVersion === 'commercial-pricing-model-v1') {
    const refreshedProfiles = seedCommercialPricingProfiles(existingProfiles);
    for (const [serviceId, current] of Object.entries(existingProfiles)) {
      if (!['Commercial pricing model seed', 'Commercial pricing model v2.0 seed'].includes(current.updatedBy)) {
        refreshedProfiles[serviceId] = current;
        continue;
      }
      const { versionHistory = [], ...previousVersion } = current;
      refreshedProfiles[serviceId] = {
        ...refreshedProfiles[serviceId],
        version: current.version + 1,
        versionHistory: [...versionHistory, previousVersion],
        updatedAt: new Date().toISOString(),
      };
    }
    store.pricingProfiles = refreshedProfiles;
    store.pricingSeedVersion = 'commercial-pricing-model-v2';
    await saveRequestStore(store);
    return;
  }
  if (store.pricingSeedVersion) return;
  const shouldSeed = !hasConfiguredPricingProfiles(existingProfiles);
  store.pricingProfiles = shouldSeed
    ? seedCommercialPricingProfiles(existingProfiles)
    : createDefaultPricingProfiles(existingProfiles);
  store.pricingSeedVersion = shouldSeed ? 'commercial-pricing-model-v2' : 'skipped-existing-pricing';
  await saveRequestStore(store);
}

async function initializeDemoQuoteRequests() {
  if (process.env.QUOTE_DEMO_SEED_ENABLED !== 'true'
    || !['development', 'test'].includes(process.env.NODE_ENV)) return;
  await withStoreLock(async () => {
    const store = await readRequestStore();
    const added = seedDemoQuoteRequests(store);
    if (!added) return;
    await saveRequestStore(store);
    console.log(`Added ${added} missing local quote-demo request(s).`);
  });
}

function withStoreLock(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => undefined);
  return result;
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validateQuoteList(value, field, maxItems, maxLength) {
  if (value === undefined) return { items: [] };
  if (!Array.isArray(value) || value.length > maxItems) return { error: `${field} must contain no more than ${maxItems} items.` };
  const items = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > maxLength) {
      return { error: `Each ${field.toLowerCase()} item must be between 1 and ${maxLength} characters.` };
    }
    items.push(item.trim());
  }
  return { items };
}

function financeServicePricing(profiles) {
  return publicServiceCatalogue(profiles).map((service) => ({
    ...service,
    packages: service.packages.map((pricingPackage) => ({
      ...pricingPackage,
      contributionCents: Math.round(pricingPackage.totalCents * contributionRatePercent / 100),
    })),
  }));
}

function nextQuoteNumber(requests, year) {
  const pattern = new RegExp(`^Q${year}-(\\d+)$`);
  let latestNumber = 0;
  for (const record of requests) {
    const quotes = [
      record.quote,
      record.quoteDraft,
      ...(record.quoteHistory || []),
      ...(record.quoteDraftHistory || []),
    ];
    for (const quote of quotes) {
      const match = pattern.exec(quote?.quoteNumber || '');
      if (match) latestNumber = Math.max(latestNumber, Number(match[1]));
    }
  }
  return `Q${year}-${String(latestNumber + 1).padStart(4, '0')}`;
}

const staffRoleConfig = [
  { env: 'SYS_ADMIN_API_TOKEN', role: 'system-administrator', name: 'Lebo Mpeta', title: 'System Administrator' },
  { env: 'FOUNDER_API_TOKEN', role: 'founder', name: 'William Mpeta', title: 'Founder' },
  { env: 'SUPERVISOR_API_TOKEN', role: 'backoffice-supervisor', name: 'Supervisor', title: 'Back-office Supervisor' },
  { env: 'BACKOFFICE_API_TOKEN', role: 'backoffice-officer', name: 'Back-office Team', title: 'Back-office Officer' },
  { env: 'CUSTOMER_SUPPORT_API_TOKEN', role: 'customer-support', name: 'Customer Support Team', title: 'Customer Support' },
  { env: 'FINANCE_API_TOKEN', role: 'finance', name: 'Finance Team', title: 'Finance' },
];
const rolePermissions = {
  'system-administrator': ['dashboard:read', 'requests:read', 'requests:update', 'documents:read', 'reports:export', 'roles:manage', 'operations:manage', 'pricing:manage', 'finance:read', 'quotes:approve'],
  founder: ['dashboard:read', 'requests:read', 'requests:update', 'documents:read', 'reports:export', 'quotes:manage', 'operations:manage', 'pricing:manage', 'finance:read', 'quotes:approve'],
  'backoffice-supervisor': ['dashboard:read', 'requests:read', 'requests:update', 'documents:read', 'reports:export', 'operations:manage'],
  'backoffice-officer': ['dashboard:read', 'requests:read', 'requests:update', 'documents:read'],
  'customer-support': ['dashboard:read', 'requests:read', 'requests:update'],
  finance: ['dashboard:read', 'requests:read', 'pricing:manage', 'finance:read'],
};

function resolveStaff(supplied) {
  const configured = staffRoleConfig.find(({ env }) => process.env[env] && Buffer.byteLength(process.env[env]) === Buffer.byteLength(supplied) && timingSafeEqual(Buffer.from(process.env[env]), Buffer.from(supplied)));
  if (configured) return { role: configured.role, name: configured.name, title: configured.title, permissions: rolePermissions[configured.role] };
  const legacy = process.env.ADMIN_API_TOKEN;
  if (legacy && Buffer.byteLength(legacy) === Buffer.byteLength(supplied) && timingSafeEqual(Buffer.from(legacy), Buffer.from(supplied))) {
    return { role: 'system-administrator', name: 'Lebo Mpeta', title: 'System Administrator (legacy admin token)', permissions: rolePermissions['system-administrator'] };
  }
  return null;
}

function requireAdmin(req, res, next) {
  const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!staffRoleConfig.some(({ env }) => process.env[env]) && !process.env.ADMIN_API_TOKEN) return res.status(503).json({ error: 'Admin access is not configured on this server.' });
  const staff = resolveStaff(supplied);
  if (!staff) return res.status(401).json({ error: 'Admin authorization is required.' });
  req.staff = staff;
  next();
}

function requirePermission(permission) {
  return (req, res, next) => req.staff?.permissions.includes(permission)
    ? next()
    : res.status(403).json({ error: 'Your staff role does not allow this action.' });
}

function hasCustomerAccess(record, token) {
  if (record.accessMode === 'reference') return true;
  if (!record.accessTokenHash || typeof token !== 'string' || token.length < 32 || token.length > 100) return false;
  const expected = Buffer.from(record.accessTokenHash, 'hex');
  const supplied = createHash('sha256').update(token).digest();
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function customerStatusUpdate(status) {
  return customerStage(status).update;
}

function quoteActionSigningSecret() {
  if (process.env.QUOTE_ACTION_TOKEN_SECRET) return process.env.QUOTE_ACTION_TOKEN_SECRET;
  return createHash('sha256').update(encryptionKey).update('weq4u:quote-action:v1').digest();
}

function publicBaseUrl() {
  const configured = process.env.PUBLIC_BASE_URL
    || (process.env.NODE_ENV === 'production' ? '' : process.env.STOREFRONT_ORIGIN || 'http://localhost:3000');
  if (!configured) throw new Error('PUBLIC_BASE_URL must be configured in production.');
  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be an absolute HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_BASE_URL must be an origin using HTTP or HTTPS, without a path or query.');
  }
  if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('PUBLIC_BASE_URL must not point to localhost in production.');
  }
  return url.origin;
}

function quoteActionLinks(record) {
  const expiry = quoteExpiryTimestamp(record.quote?.validUntil);
  if (!expiry || !record.quote) return null;
  const storefrontUrl = new URL(publicBaseUrl());
  const quoteNumber = record.quote.quoteNumber || record.quote.id;
  if (typeof quoteNumber !== 'string' || !quoteNumber) return null;
  const actions = quotePdfStatus(record) === 'Awaiting decision' ? [...quoteActionNames, quoteStatusAction] : [quoteStatusAction];
  return Object.fromEntries(actions.map((action) => {
    const token = signQuoteActionToken({
      version: 1,
      ref: record.ref,
      quoteNumber,
      quoteId: record.quote.id,
      quoteVersion: record.quote.version || 1,
      action,
      expiresAt: expiry,
      nonce: randomUUID(),
    }, quoteActionSigningSecret());
    const href = new URL(`/q/${encodeURIComponent(quoteNumber)}/${action}`, storefrontUrl.origin);
    href.searchParams.set('t', token);
    return [action, href.toString()];
  }));
}

function quoteActionState(record, token) {
  if (record.quote?.id !== token.quoteId || (record.quote.version || 1) !== token.quoteVersion
    || (record.quote.quoteNumber || record.quote.id) !== token.quoteNumber
    || quoteExpiryTimestamp(record.quote.validUntil) !== token.expiresAt) return 'updated';
  if (record.quoteDecision === 'accepted' || record.status === 'Quote Accepted') return 'accepted';
  if (record.quoteDecision === 'declined' || record.status === 'Quote Declined') return 'declined';
  if (record.status === 'Quote Expired' || Date.now() > token.expiresAt) return 'expired';
  if (record.status === 'Awaiting Customer Decision' && record.quotePublishedAt) return 'awaiting-decision';
  return 'updated';
}

function recordQuoteActionAudit(record, action, req, at, quote = record.quote) {
  record.quoteActionAudit ||= [];
  record.quoteActionAudit.push({
    quoteNumber: quote?.quoteNumber || quote?.id || '',
    quoteId: quote?.id || '',
    quoteVersion: quote?.version || 1,
    action,
    at,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
  });
}

function quotePdfStatus(record) {
  if (record.quoteDecision === 'accepted' || record.status === 'Quote Accepted') return 'Accepted';
  if (record.quoteDecision === 'declined' || record.status === 'Quote Declined') return 'Declined';
  if (record.status === 'Quote Expired' || (quoteExpiryTimestamp(record.quote?.validUntil) && Date.now() > quoteExpiryTimestamp(record.quote.validUntil))) return 'Expired';
  return 'Awaiting decision';
}

function pricingProfileForRequest(record, pricingProfiles) {
  const serviceId = record.services?.[0];
  const profile = pricingProfiles[serviceId];
  const deliveryFeeOverride = record.casePricingOverrides?.deliveryFee;
  if (!profile || !deliveryFeeOverride) return profile;
  return {
    ...profile,
    components: {
      ...profile.components,
      deliveryFee: {
        ...profile.components?.deliveryFee,
        amountCents: deliveryFeeOverride.amountCents,
        costCents: null,
      },
    },
  };
}

function quotePublicationIssue(record, pricingProfiles) {
  const profile = pricingProfileForRequest(record, pricingProfiles);
  const readiness = serviceQuoteIssue(record, profile);
  if (!readiness.allowed) return readiness.reason;
  if (record.quote?.pricingBasis === 'case-specific-manual') return 'Case-specific quotes are not available for customer publication.';
  const currentDeliveryFee = record.casePricingOverrides?.deliveryFee;
  const quotedDeliveryFee = record.quote?.casePricingOverrides?.deliveryFee;
  if (currentDeliveryFee
    ? quotedDeliveryFee?.amountCents !== currentDeliveryFee.amountCents || quotedDeliveryFee?.setAt !== currentDeliveryFee.setAt
    : Boolean(quotedDeliveryFee)) {
    return 'The case-specific delivery fee changed after this quote draft was prepared. Prepare a new quote draft.';
  }
  if (record.quote?.profileId !== profile.profileId || record.quote?.profileVersion !== profile.version) {
    return 'This quote is not based on the current approved pricing profile.';
  }
  return '';
}

function quoteSnapshotIssue(record) {
  const { service, variant } = resolveRegistryConfiguration({ record, quote: record.quote });
  if (!service || !variant) return 'This quote does not match a registered service variant.';
  if (!['approved', 'provisional'].includes(service.approvalState)
    || !['approved', 'provisional'].includes(variant.approvalState)
    || !variant.issueCustomerQuote) return 'This service variant is not approved for customer quotations.';
  if (record.quote?.pricingBasis === 'case-specific-manual'
    || record.quote?.serviceId !== variant.pricingProfileRef
    || !Number.isSafeInteger(record.quote?.profileVersion)
    || record.quote.profileVersion < 1) return 'This quote does not contain a valid approved pricing snapshot.';
  return '';
}

function publishQuoteToPortal(record, at, actor = 'portal') {
  if (!record.quote || record.status !== 'Quote Preparation') return false;
  routeToStatus(record, 'Awaiting Customer Decision', at);
  record.quotePublishedAt = at;
  record.quoteCommunication = { channel: 'portal', confirmedAt: at, confirmedBy: actor };
  record.customerUpdate = customerStatusUpdate('Awaiting Customer Decision');
  record.nextAction = 'Wait for the customer to review and decide on the quote in the private tracking portal';
  record.updatedAt = at;
  record.history ||= [];
  record.history.push({
    status: 'Awaiting Customer Decision',
    at,
    message: 'Your quote is ready to review in the private tracking portal.',
    customerVisible: true,
  });
  return true;
}

function publicRequest(record, authorized = false) {
  const quoteVisible = ['Awaiting Customer Decision', 'Quote Accepted', 'Quote Declined', 'Quote Expired', 'Work in Progress', 'Ready for Collection / Delivery', 'Completed'].includes(record.status);
  const result = {
    ref: record.ref,
    status: customerStage(record.status).label,
    journeyStage: customerStage(record.status).stage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    nextStep: record.customerUpdate || customerStatusUpdate(record.status),
  };
  if (!authorized) return { ...result, privateAccess: false };
  return {
    ...result,
    privateAccess: true,
    services: record.services || [],
    pricingPackage: record.pricingPackage || 'standard',
    workItems: record.workItems || [],
    vehicleContext: record.vehicleContext || {},
    nextAction: record.customerUpdate || '',
    requestedDocuments: record.requestedDocuments || [],
    customerTasks: (record.customerTasks || []).map(({ id, type, title, message, status, dueDate, response, createdAt, responseAt, completedAt, notificationStatus }) => ({
      id, type, title, message, status, dueDate, response, createdAt, responseAt, completedAt, notificationStatus,
    })),
    documents: (record.documents || []).map(({ label, uploadedAt, reviewState }) => ({
      label,
      uploadedAt,
      reviewState: reviewState === 'verified' ? 'Verified'
        : reviewState === 'rejected' || reviewState === 'replacement-required' ? 'Please contact us about this document'
          : 'Received for review',
    })),
    quoteAmount: quoteVisible ? record.quoteAmount : null,
    quoteDecision: quoteVisible ? record.quoteDecision || '' : '',
    paymentStatus: quoteVisible ? record.paymentStatus || 'not-configured' : '',
    paymentVerifiedAt: quoteVisible && record.paymentStatus === 'paid' ? record.paymentVerifiedAt || '' : '',
    paymentAvailable: quoteVisible && payFastCheckoutIsConfigured(),
    quoteCurrency: record.quoteCurrency || 'ZAR',
    quoteBreakdown: quoteVisible && record.quote ? {
      id: record.quote.id,
      quoteNumber: record.quote.quoteNumber || record.quote.id,
      version: record.quote.version || 1,
      profileVersion: record.quote.profileVersion,
      pricingBasis: record.quote.pricingBasis,
      pricingBasisLabel: record.quote.pricingBasisLabel,
      estimateDisclaimer: record.quote.estimateDisclaimer,
      serviceCode: record.quote.serviceCode,
      serviceDefinitionVersion: record.quote.serviceDefinitionVersion,
      serviceName: record.quote.profileName,
      packageName: record.quote.packageName || 'Standard',
      vatTreatment: record.quote.vatTreatment,
      generatedAt: record.quote.generatedAt,
      currency: record.quote.currency,
      lines: record.quote.lines.map(({ componentId, label, amountCents }) => ({ componentId, label, amountCents })),
      totalCents: record.quote.totalCents,
      notes: record.quote.notes,
      conditions: record.quote.conditions || [],
      requiredDocuments: record.quote.requiredDocuments || [],
      validUntil: record.quote.validUntil,
    } : null,
    quoteDecisionAt: quoteVisible ? record.quoteDecisionAt || '' : '',
    quoteDecisionReason: quoteVisible ? record.quoteDecisionReason || '' : '',
    quoteDecisionReasonDetails: quoteVisible ? record.quoteDecisionReasonDetails || '' : '',
    quoteDecisionVersion: quoteVisible ? record.quoteDecisionVersion || null : null,
    timeline: (record.history || [{ status: record.status, at: record.updatedAt || record.createdAt, message: 'Request received', customerVisible: true }])
      .filter((event) => event.customerVisible !== false)
      .map(({ status, at, message }) => ({
        status: customerStage(status).label,
        at,
        message: message || customerStage(status).update,
      })),
  };
}

function adminRequest(record, pricingProfiles = {}) {
  const safeRecord = { ...record };
  const serviceId = record.services?.[0];
  const activeProfile = pricingProfileForRequest(record, pricingProfiles);
  const requestPricingProfiles = activeProfile
    ? { ...pricingProfiles, [serviceId]: activeProfile }
    : pricingProfiles;
  const quoteIssue = quoteConfigurationIssue(record, activeProfile);
  const registryReadiness = serviceQuoteIssue(record, activeProfile);
  const pricingResolution = resolvePricingProfile(record, requestPricingProfiles);
  delete safeRecord.accessTokenHash;
  delete safeRecord.quoteHistory;
  if (safeRecord.quote) {
    safeRecord.quote = {
      ...safeRecord.quote,
      lines: safeRecord.quote.lines.map(({ componentId, label, amountCents, sourceNote }) => ({ componentId, label, amountCents, sourceNote })),
      estimatedCostCents: undefined,
    };
  }
  if (safeRecord.quoteDraft?.lines) {
    safeRecord.quoteDraft = {
      ...safeRecord.quoteDraft,
      lines: safeRecord.quoteDraft.lines.map(({ componentId, label, amountCents, sourceNote }) => ({ componentId, label, amountCents, sourceNote })),
      estimatedCostCents: undefined,
    };
  }
  return {
    ...safeRecord,
    allowedNextStatuses: availableNextStatuses(record),
    quoteReadiness: {
      ready: registryReadiness.allowed && !quoteIssue,
      reason: !registryReadiness.allowed
        ? registryReadiness.reason
        : quoteIssue ? pricingResolution.reason || quoteIssue : '',
    },
    provisionalEstimate: isProvisionalLicenceEstimateEligible(record),
    provisionalEstimateReason: isProvisionalLicenceEstimateEligible(record) ? pricingResolution.reason : '',
    caseSpecificQuoteAvailable: serviceAssessmentReady(record),
    serviceDefinition: resolveServiceDefinition({
      serviceCode: record.serviceCode,
      services: record.services,
      serviceDetails: record.serviceDetails,
    }),
    pricingResolution,
    documents: record.documents.map(({ id, type, size, uploadedAt, label, serviceId, reviewState, reviewedBy, reviewedAt, reviewNote }) => ({ id, type, size, uploadedAt, label, serviceId, reviewState: reviewState || 'pending', reviewedBy, reviewedAt, reviewNote })),
    serviceAssessment: record.serviceAssessment || null,
    serviceAssessmentReady: serviceAssessmentReady(record),
    serviceDefinitionReady: !record.serviceDefinitionStatus || ['price-card-profile', 'approved', 'provisional-pilot'].includes(record.serviceDefinitionStatus),
    customerTasks: record.customerTasks || [],
  };
}

const customerTaskTypes = new Set(['information', 'appointment', 'delivery']);

function syncDocumentTasks(record, requestedDocuments, actor, at) {
  record.customerTasks ||= [];
  for (const task of record.customerTasks) {
    if (task.type === 'document' && task.status === 'waiting-on-customer' && !requestedDocuments.includes(task.title)) {
      task.status = 'completed';
      task.completedAt = at;
      task.completedBy = actor;
    }
  }
  for (const title of requestedDocuments) {
    const hasOpenTask = record.customerTasks.some((task) => task.type === 'document' && task.title === title && task.status === 'waiting-on-customer');
    if (!hasOpenTask) {
      record.customerTasks.push({
        id: actor === 'System migration'
          ? `legacy-document-${createHash('sha256').update(title).digest('hex').slice(0, 20)}`
          : randomUUID(),
        type: 'document',
        title,
        message: `Please upload ${title} using the secure upload area on this page.`,
        status: 'waiting-on-customer',
        createdAt: at,
        createdBy: actor,
      });
    }
  }
}

function customerTaskDueDateValid(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function sendRequestNotification(record) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) return;
  const serviceNames = record.services.join(', ');
  const body = [
    `Reference: ${record.ref}`,
    `Name: ${record.name}`,
    `Phone: ${record.phone}`,
    `Email: ${record.email || 'Not supplied'}`,
    `Area: ${record.suburb}`,
    `Services: ${serviceNames}`,
    `Courier requested: ${record.courier ? 'Yes' : 'No'}`,
    `Message: ${record.message || 'None'}`,
  ].join('\n');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_FROM,
        to: ['william.mpeta@gmail.com', 'shelod@gmail.com'],
        subject: `New WeQ4UServices request ${record.ref}`,
        text: body,
      }),
    });
    if (!response.ok) console.error(`Request notification failed: Resend returned ${response.status}.`);
  } catch (error) {
    console.error(`Request notification failed: ${error.message}`);
  }
}

async function notifyCustomerTask(record, task) {
  if (!record.email) return 'no-email';
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) return 'not-configured';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer '.concat(process.env.RESEND_API_KEY), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_FROM,
        to: [record.email],
        subject: `WeQ4U needs your help (${record.ref})`,
        text: `Hello ${record.name},\n\nWe need your help with: ${task.title}\n${task.message}\n${task.dueDate ? `Please respond by: ${task.dueDate}\n` : ''}\nOpen Track Request on the WeQ4UServices website and enter your reference to respond.\n\nReference: ${record.ref}\n\nWeQ4UServices`,
      }),
    });
    if (!response.ok) {
      console.error(`Customer task notification failed: Resend returned ${response.status}.`);
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    console.error(`Customer task notification failed: ${error.message}`);
    return 'failed';
  }
}

async function sendQuoteNotification(record) {
  if (!record.email) return 'no-email';
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) return 'not-configured';
  const total = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(record.quote.totalCents / 100);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_FROM,
        to: [record.email],
        subject: `Your WeQ4U quote is ready (${record.ref})`,
        text: `Hello ${record.name},\n\nYour quote for ${record.ref} is ready. Total: ${total}.\nValid until: ${record.quote.validUntil}\nQuote notes: ${record.quote.notes}\nOpen Track Request on the WeQ4UServices website and enter your reference to review and respond. Quote acceptance records your decision; payment is not available in this request desk yet.\n\nWeQ4UServices`,
      }),
    });
    if (!response.ok) {
      console.error(`Quote notification failed: Resend returned ${response.status}.`);
      return 'failed';
    }

    return 'sent';
  } catch (error) {
    console.error(`Quote notification failed: ${error.message}`);
    return 'failed';
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'WeQ4U Services API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/catalogue', async (req, res, next) => {
  try {
    const store = await readRequestStore();
    return res.json({ services: publicServiceCatalogue(store.pricingProfiles), serviceDefinitions });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/requests', upload.array('documents', 10), async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 100);
    const phone = cleanText(req.body.phone, 30);
    const email = cleanText(req.body.email, 200);
    const suburb = cleanText(req.body.suburb, 120);
    const address = cleanText(req.body.address, 400);
    const message = cleanText(req.body.message, 1000);
    const requestedServices = (Array.isArray(req.body.services) ? req.body.services : [req.body.services]).filter(Boolean);
    const pricingPackage = cleanText(req.body.pricingPackage, 30) || 'standard';
    if (!name || !phone || !suburb || req.body.consent !== 'true' || requestedServices.length === 0) {
      return res.status(400).json({ error: 'Name, phone, area, service selection and privacy consent are required.' });
    }
    if (!/^[+()\d][+()\d\s.-]{6,28}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (requestedServices.some((service) => !validServices.has(service))) return res.status(400).json({ error: 'One or more selected services are not available.' });
    if (requestedServices.length !== 1) return res.status(400).json({ error: 'Choose one primary service for each request.' });
    if (!pricingPackages.some(({ id }) => id === pricingPackage)) return res.status(400).json({ error: 'Choose a supported pricing package.' });
    let serviceDetails = {};
    let documentLabels = [];
    let workItems = [];
    let vehicleContext = {};
    const hasDocumentLabels = req.body.documentLabels !== undefined;
    try {
      serviceDetails = req.body.serviceDetails ? JSON.parse(req.body.serviceDetails) : {};
      documentLabels = req.body.documentLabels ? JSON.parse(req.body.documentLabels) : [];
      workItems = req.body.workItems ? JSON.parse(req.body.workItems) : [];
      vehicleContext = req.body.vehicleContext ? JSON.parse(req.body.vehicleContext) : {};
    } catch {
      return res.status(400).json({ error: 'Service details or document information could not be read.' });
    }
    if (!serviceDetails || typeof serviceDetails !== 'object' || Array.isArray(serviceDetails) || Object.keys(serviceDetails).some((id) => !requestedServices.includes(id) || typeof serviceDetails[id] !== 'string' || serviceDetails[id].length > 120)) {
      return res.status(400).json({ error: 'One or more service answers are invalid.' });
    }
    if (requestedServices[0] === 'door-to-door-courier'
      && !['Collect documents from me', 'Deliver completed documents to me', 'Collect and deliver documents'].includes(serviceDetails['door-to-door-courier'])) {
      return res.status(400).json({ error: 'Choose whether you need document collection, delivery, or both.' });
    }
    if (requestedServices[0] === 'vehicle-ownership-onboarding') {
      if (!Array.isArray(workItems) || workItems.length < 1 || workItems.length > ownershipWorkItems.size || workItems.some((item) => typeof item !== 'string' || !ownershipWorkItems.has(item)) || new Set(workItems).size !== workItems.length || (workItems.includes('not-sure') && workItems.length !== 1)) {
        return res.status(400).json({ error: 'Choose at least one valid vehicle ownership task.' });
      }
      if (!vehicleContext || typeof vehicleContext !== 'object' || Array.isArray(vehicleContext) || !ownershipPurchaseTypes.has(vehicleContext.purchaseType) || !ownershipFinanceStages.has(vehicleContext.financeStage) || (vehicleContext.retailerName !== undefined && (typeof vehicleContext.retailerName !== 'string' || vehicleContext.retailerName.length > 100)) || (vehicleContext.referralCode !== undefined && (typeof vehicleContext.referralCode !== 'string' || vehicleContext.referralCode.length > 40 || (vehicleContext.referralCode && !/^[A-Z0-9_-]+$/i.test(vehicleContext.referralCode))))) {
        return res.status(400).json({ error: 'Vehicle purchase details could not be read.' });
      }
      if (serviceDetails['vehicle-ownership-onboarding'] !== vehicleContext.purchaseType) return res.status(400).json({ error: 'Vehicle purchase details do not match.' });
    } else if (workItems.length || Object.keys(vehicleContext || {}).length) {
      return res.status(400).json({ error: 'Vehicle ownership details must use the vehicle ownership request.' });
    }
    if (hasDocumentLabels && (!Array.isArray(documentLabels) || documentLabels.length !== (req.files || []).length || documentLabels.some((key) => typeof key !== 'string' || !validDocumentKeys.has(key) || !requestedServices.includes(key.split(':')[0])))) {
      return res.status(400).json({ error: 'Document labels do not match the selected services and files.' });
    }
    if (!hasDocumentLabels) {
      documentLabels = [];
    }
    const courierCollection = req.body.courierCollection === 'true';
    const courierDelivery = req.body.courierDelivery === 'true';
    if (['courierCollection', 'courierDelivery'].some((key) => req.body[key] !== undefined && !['true', 'false'].includes(req.body[key]))) {
      return res.status(400).json({ error: 'Courier options could not be read.' });
    }
    const serviceDefinition = resolveServiceDefinition({
      serviceCode: cleanText(req.body.serviceCode, 80),
      services: requestedServices,
      serviceDetails,
    });
    if (req.body.serviceCode && !serviceDefinition) return res.status(400).json({ error: 'The service code does not match the selected service and subtype.' });

    const record = await withStoreLock(async () => {
      const store = await readRequestStore();
      const year = new Date().getFullYear();
      let ref;
      do { ref = `WQ-${year}-${randomBytes(10).toString('hex').toUpperCase()}`; }
      while (store.requests.some((request) => request.ref === ref));
      const documentRecords = [];
      try {
        for (const [index, file] of (req.files || []).entries()) {
          const id = randomUUID();
          const privateName = `${ref}-${id}.enc`;
          await writeFile(path.join(documentsDirectory, privateName), encryptBuffer(file.buffer), { flag: 'wx', mode: 0o600 });
          const [serviceId, documentId] = documentLabels[index]?.split(':') || [];
          const labels = { 'id-copy': 'Copy of ID', 'booking-fee-confirmation': 'Booking fee confirmation', 'booking-confirmation': 'Booking confirmation', 'learner-licence': "Learner's licence", 'existing-licence': 'Current licence', 'proof-of-residence': 'Proof of residence', 'medical-certificate': 'Medical certificate', 'settlement-letter': 'Bank settlement letter', 'bank-proxy-id': 'Bank proxy ID', 'dealer-proxy-id': 'Dealer proxy ID', 'dealer-brn': 'Dealer BRN certificate', 'stamped-nco': 'Stamped NCO form', 'buyer-id': 'Buyer ID copy', 'buyer-proof-address': 'Buyer proof of residence', 'certified-owner-id': 'Certified copy of owner ID', 'purchase-documentation': 'Purchase documentation', 'roadworthy-certificate': 'Roadworthy certificate', 'existing-licence-disc': 'Existing licence disc', 'vehicle-owner-id': 'Vehicle owner ID', affidavit: 'Affidavit' };
          documentRecords.push({ id, privateName, type: file.mimetype, size: file.size, uploadedAt: new Date().toISOString(), order: index + 1, serviceId, label: labels[documentId] || 'Unlabelled attachment' });
        }
        const createdAt = new Date().toISOString();
        const newRecord = {
          ref,
          accessMode: 'reference',
          name,
          phone,
          email,
          services: [...new Set(requestedServices)],
          serviceCode: serviceDefinition?.serviceCode || '',
          serviceDefinitionVersion: serviceDefinition?.version || null,
          serviceDefinitionName: serviceDefinition?.serviceName || '',
          serviceDefinitionStatus: serviceDefinition?.configurationStatus || 'unmatched',
          pricingPackage,
          serviceDetails: Object.fromEntries(Object.entries(serviceDetails).map(([id, answer]) => [id, cleanText(answer, 120)])),
          workItems: requestedServices[0] === 'vehicle-ownership-onboarding' ? [...new Set(workItems)] : [],
          vehicleContext: requestedServices[0] === 'vehicle-ownership-onboarding' ? { purchaseType: vehicleContext.purchaseType, financeStage: vehicleContext.financeStage, retailerName: cleanText(vehicleContext.retailerName || '', 100), referralCode: cleanText(vehicleContext.referralCode || '', 40).toUpperCase() } : {},
          suburb,
          address,
          courier: courierCollection || courierDelivery || req.body.courier === 'true',
          courierCollection,
          courierDelivery,
          message,
          consent: true,
          consentAt: createdAt,
          source: cleanText(req.body.source, 40) || 'website',
          workflowVersion: 2,
          status: 'Submitted',
          requestedDocuments: [],
          serviceAssessment: assessmentForServiceDefinition(serviceDefinition, documentRecords),
          customerTasks: [],
          quoteDecision: '',
          department: '',
          queue: '',
          assignee: '',
          nextAction: '',
          targetDate: '',
          customerUpdate: '',
          serviceValidated: false,
          fulfilmentValidated: false,
          completionConfirmed: false,
          paymentStatus: 'not-configured',
          history: [{ status: 'Submitted', at: createdAt, message: customerStatusUpdate('Submitted'), customerVisible: true }],
          quoteAmount: null,
          quoteCurrency: 'ZAR',
          paid: false,
          notes: '',
          documents: documentRecords,
          createdAt,
          updatedAt: createdAt,
        };
        routeToStatus(newRecord, 'Submitted', createdAt);
        newRecord.customerUpdate = customerStatusUpdate('Submitted');
        store.requests.unshift(newRecord);
        await saveRequestStore(store);
        return newRecord;
      } catch (error) {
        await Promise.all(documentRecords.map((document) => unlink(path.join(documentsDirectory, document.privateName)).catch(() => undefined)));
        throw error;
      }
    });
    await sendRequestNotification(record);
    return res.status(201).json({ ref: record.ref, status: customerStage(record.status).label, journeyStage: customerStage(record.status).stage, createdAt: record.createdAt });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/requests/:ref', async (req, res, next) => {
  try {
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return null;
      const authorized = hasCustomerAccess(record, req.get('x-request-access-key'));
      let changed = false;
      if (authorized && record.status === 'Awaiting Customer Decision' && record.quote && !record.quote.viewedAt) {
        const viewedAt = new Date().toISOString();
        record.quote.viewedAt = viewedAt;
        record.history ||= [];
        record.history.push({ status: record.status, at: viewedAt, message: `Customer viewed ${record.quote.quoteNumber || 'the quote'} in the tracking portal.`, customerVisible: false });
        changed = true;
      }
      if (changed) await saveRequestStore(store);
      return publicRequest(record, authorized);
    });
    if (!result) return res.status(404).json({ error: 'No request was found for that reference.' });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/quote-decisions/:quoteNumber/:action.pdf', async (req, res, next) => {
  try {
    if (![...quoteActionNames, quoteStatusAction].includes(req.params.action) || typeof req.query.t !== 'string') {
      return res.status(404).json({ error: 'This quote link is invalid.' });
    }
    const token = verifyQuoteActionToken(req.query.t, quoteActionSigningSecret());
    if (!token || token.quoteNumber !== req.params.quoteNumber || token.action !== req.params.action) {
      return res.status(404).json({ error: 'This quote link is invalid.' });
    }
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === token.ref);
      if (!record) return null;
      const status = quoteActionState(record, token);
      if (status === 'updated') return { updated: true };
      const eligibilityIssue = quoteSnapshotIssue(record);
      return eligibilityIssue
        ? { unavailable: true, reason: eligibilityIssue }
        : { record: structuredClone(record), status };
    });
    if (!result) return res.status(404).json({ error: 'This quote is no longer available.' });
    if (result.updated) return res.status(409).json({ error: 'This quote has changed. Open the latest quotation from Track Request.' });
    if (result.unavailable) return res.status(409).json({ error: result.reason });
    const buffer = await createQuotePdf({
      record: result.record,
      quote: result.record.quote,
      actions: quoteActionLinks(result.record),
      status: result.status === 'awaiting-decision' ? 'Awaiting decision' : result.status[0].toUpperCase() + result.status.slice(1),
      publicBaseUrl: publicBaseUrl(),
    });
    return res.type('application/pdf').attachment(`${token.quoteNumber}.pdf`).send(buffer);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/quote-decisions/:quoteNumber/:action', async (req, res, next) => {
  try {
    if (![...quoteActionNames, quoteStatusAction].includes(req.params.action) || typeof req.query.t !== 'string') {
      return res.status(404).json({ error: 'This quote link is invalid.' });
    }
    const token = verifyQuoteActionToken(req.query.t, quoteActionSigningSecret());
    if (!token || token.quoteNumber !== req.params.quoteNumber || token.action !== req.params.action) {
      return res.status(404).json({ error: 'This quote link is invalid.' });
    }
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === token.ref);
      if (!record) return null;
      return {
        status: quoteActionState(record, token),
        quoteNumber: record.quote?.quoteNumber || record.quote?.id || token.quoteNumber,
        requestRef: record.ref,
        action: token.action,
        totalCents: record.quote?.totalCents ?? null,
        currency: record.quote?.currency || 'ZAR',
        validUntil: record.quote?.validUntil || null,
      };
    });
    if (!result) return res.status(404).json({ error: 'This quote link is no longer available.' });
    return res.json({ ...result, actionable: result.status === 'awaiting-decision' && token.action !== quoteStatusAction });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/quote-decisions/:quoteNumber/:action', async (req, res, next) => {
  try {
    if (!quoteActionNames.includes(req.params.action)) return res.status(404).json({ error: 'This quote link is invalid.' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const token = verifyQuoteActionToken(body.token, quoteActionSigningSecret());
    if (!token || token.quoteNumber !== req.params.quoteNumber || token.action !== req.params.action) {
      return res.status(404).json({ error: 'This quote link is invalid.' });
    }
    const message = token.action === 'changes' ? cleanText(body.message, 500) : '';
    const declineReasons = new Set(['too-expensive', 'not-ready', 'chose-another-provider', 'incorrect-details', 'other']);
    const declineReason = token.action === 'decline' ? cleanText(body.declineReason, 40) : '';
    const declineDetails = token.action === 'decline' ? cleanText(body.declineDetails, 500) : '';
    if (token.action === 'changes' && !message) return res.status(400).json({ error: 'Tell us what you would like changed in the quote.' });
    if (token.action === 'decline' && !declineReasons.has(declineReason)) return res.status(400).json({ error: 'Choose a reason for declining the quote.' });
    if (token.action === 'decline' && declineReason === 'other' && !declineDetails) {
      return res.status(400).json({ error: 'Add a short explanation for the other decline reason.' });
    }

    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === token.ref);
      if (!record) return { missing: true };
      const state = quoteActionState(record, token);
      if (state !== 'awaiting-decision') {
        if (state === 'expired' && record.status === 'Awaiting Customer Decision') {
          const at = new Date().toISOString();
          routeToStatus(record, 'Quote Expired', at);
          record.customerUpdate = customerStatusUpdate('Quote Expired');
          record.updatedAt = at;
          record.history ||= [];
          record.history.push({ status: record.status, at, message: record.customerUpdate, customerVisible: true });
          await saveRequestStore(store);
        }
        return { status: state, applied: false };
      }

      const at = new Date().toISOString();
      record.workflowVersion = 2;
      record.updatedAt = at;
      if (token.action === 'changes') {
        record.quoteRevisionRequests ||= [];
        record.quoteRevisionRequests.push({ quoteId: token.quoteId, quoteVersion: token.quoteVersion, message, requestedAt: at });
        delete record.quotePublishedAt;
        routeToStatus(record, 'Quote Revision Required', at);
        record.customerUpdate = customerStatusUpdate('Quote Revision Required');
        record.history ||= [];
        record.history.push({ status: record.status, at, message: record.customerUpdate, customerVisible: true });
        record.history.push({ status: record.status, at, message: `Customer requested a quote change: ${message}`, customerVisible: false });
      } else {
        record.quoteDecision = token.action === 'accept' ? 'accepted' : 'declined';
        record.quoteDecisionAt = at;
        record.quoteDecisionVersion = token.quoteVersion;
        if (token.action === 'decline') {
          record.quoteDecisionReason = declineReason;
          if (declineDetails) record.quoteDecisionReasonDetails = declineDetails;
        }
        record.paymentStatus ||= 'not-configured';
        routeToStatus(record, token.action === 'accept' ? 'Quote Accepted' : 'Quote Declined', at);
        record.customerUpdate = customerStatusUpdate(record.status);
        record.history ||= [];
        record.history.push({ status: record.status, at, message: record.customerUpdate, customerVisible: true });
      }
      recordQuoteActionAudit(record, token.action, req, at);
      await saveRequestStore(store);
      return { status: token.action === 'changes' ? 'updated' : token.action === 'accept' ? 'accepted' : 'declined', applied: true };
    });
    if (result.missing) return res.status(404).json({ error: 'This quote link is no longer available.' });
    if (result.status === 'expired') return res.status(409).json({ error: 'This quote has expired. Contact WeQ4U if you would like us to review it.', status: result.status });
    if (result.applied) {
      return res.json({ status: result.status, action: token.action, quoteNumber: token.quoteNumber, requestRef: token.ref });
    }
    return res.status(409).json({ error: 'This quote is no longer awaiting a decision.', status: result.status });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/requests/:ref/quote.pdf', async (req, res, next) => {
  try {
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (!hasCustomerAccess(record, req.get('x-request-access-key'))) return { forbidden: true };
      if (!record.quote || !record.quotePublishedAt) return { unavailable: true };
      return { record: structuredClone(record) };
    });
    if (result.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (result.forbidden) return res.status(403).json({ error: 'Use the private request link provided when you submitted the request.' });
    if (result.unavailable) return res.status(409).json({ error: result.reason || 'A customer-ready quote is not available for this request.' });
    const record = result.record;
    const quoteNumber = record.quote.quoteNumber || record.quote.id;
    const actions = quoteSnapshotIssue(record) ? undefined : quoteActionLinks(record);
    const buffer = await createQuotePdf({
      record,
      quote: record.quote,
      actions,
      status: quotePdfStatus(record),
      publicBaseUrl: publicBaseUrl(),
    });
    return res.set('Cache-Control', 'no-store, private').type('application/pdf').attachment(`${quoteNumber}.pdf`).send(buffer);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/requests/:ref/registry-review.pdf', requireAdmin, requirePermission('requests:read'), async (req, res, next) => {
  try {
    const record = await withStoreLock(async () => {
      const store = await readRequestStore();
      const request = store.requests.find((item) => item.ref === req.params.ref);
      return request ? structuredClone(request) : null;
    });
    if (!record) return res.status(404).json({ error: 'No request was found for that reference.' });
    const buffer = await createRegistryReviewPdf(record);
    return res.type('application/pdf').attachment(`registry-review-${record.ref}.pdf`).send(buffer);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/requests/:ref/quote-decision', async (req, res, next) => {
  try {
    const decision = req.body.decision === 'accept' ? 'accepted' : req.body.decision === 'decline' ? 'declined' : '';
    if (!decision) return res.status(400).json({ error: 'Choose accept or decline.' });
    const quoteId = cleanText(req.body.quoteId, 100);
    const quoteVersion = Number(req.body.quoteVersion);
    const declineReasons = new Set(['too-expensive', 'not-ready', 'chose-another-provider', 'incorrect-details', 'other']);
    const declineReason = decision === 'declined' ? cleanText(req.body.declineReason, 40) : '';
    const declineDetails = decision === 'declined' ? cleanText(req.body.declineDetails, 500) : '';
    if (!quoteId || !Number.isSafeInteger(quoteVersion) || quoteVersion < 1) return res.status(400).json({ error: 'Refresh the quote before recording your decision.' });
    if (decision === 'declined' && !declineReasons.has(declineReason)) return res.status(400).json({ error: 'Choose a reason for declining the quote.' });
    if (decision === 'declined' && declineReason === 'other' && !declineDetails) return res.status(400).json({ error: 'Add a short explanation for the other decline reason.' });
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (!hasCustomerAccess(record, req.get('x-request-access-key'))) return { forbidden: true };
      if (record.quoteAmount === null || record.quoteAmount === undefined) return { noQuote: true };
      if (record.quote?.id !== quoteId || (record.quote.version || 1) !== quoteVersion) return { staleQuote: true };
      if (record.quoteDecision) return { alreadyDecided: true };
      if (record.status !== 'Awaiting Customer Decision') return { noQuote: true };
      const quoteExpiry = record.quote?.validUntil ? new Date(`${record.quote.validUntil}T23:59:59.999Z`) : null;
      if (record.quote?.validUntil && (!quoteExpiry || Number.isNaN(quoteExpiry.getTime()) || quoteExpiry.toISOString().slice(0, 10) !== record.quote.validUntil)) return { invalidQuote: true };
      if (quoteExpiry && Date.now() > quoteExpiry.getTime()) {
        const at = new Date().toISOString();
        routeToStatus(record, 'Quote Expired', at);
        record.customerUpdate = customerStatusUpdate('Quote Expired');
        record.updatedAt = at;
        record.history ||= [];
        record.history.push({ status: 'Quote Expired', at, message: record.customerUpdate, customerVisible: true });
        await saveRequestStore(store);
        return { expired: true };
      }
      record.quoteDecision = decision;
      record.quoteDecisionAt = new Date().toISOString();
      record.quoteDecisionVersion = record.quote.version || 1;
      if (decision === 'declined') {
        record.quoteDecisionReason = declineReason;
        if (declineDetails) record.quoteDecisionReasonDetails = declineDetails;
      }
      const newStatus = decision === 'accepted' ? 'Quote Accepted' : 'Quote Declined';
      record.workflowVersion = 2;
      record.paymentStatus ||= 'not-configured';
      record.updatedAt = record.quoteDecisionAt;
      routeToStatus(record, newStatus, record.updatedAt);
      record.history ||= [];
      record.history.push({ status: record.status, at: record.updatedAt, message: customerStatusUpdate(record.status), customerVisible: true });
      record.customerUpdate = customerStatusUpdate(record.status);
      recordQuoteActionAudit(record, decision === 'accepted' ? 'accept' : 'decline', req, record.updatedAt);
      await saveRequestStore(store);
      return { record };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.forbidden) return res.status(403).json({ error: 'Use the private request link provided when you submitted the request.' });
    if (updated.noQuote) return res.status(409).json({ error: 'A quote is not available yet.' });
    if (updated.staleQuote) return res.status(409).json({ error: 'This quote has changed. Refresh the tracking page and review the latest version.' });
    if (updated.alreadyDecided) return res.status(409).json({ error: 'A decision has already been recorded for this quote.' });
    if (updated.invalidQuote) return res.status(409).json({ error: 'This quote has an invalid expiry date. Contact WeQ4U for help.' });
    if (updated.expired) return res.status(409).json({ error: 'This quote has expired. Contact WeQ4U if you would like us to review it.' });
    return res.json(publicRequest(updated.record, true));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/requests/:ref/payfast-checkout', async (req, res, next) => {
  try {
    const checkout = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (!hasCustomerAccess(record, req.get('x-request-access-key'))) return { forbidden: true };
      if (record.status !== 'Quote Accepted' || record.quoteDecision !== 'accepted' || !record.quote) return { invalid: true };
      if (record.paymentStatus === 'paid') return { paid: true };
      const result = buildPayFastCheckout({
        ref: record.ref,
        quoteNumber: record.quote.quoteNumber || record.quote.id,
        amountCents: record.quote.totalCents,
        email: record.email,
        storefrontOrigin: process.env.STOREFRONT_ORIGIN || 'http://localhost:3000',
      });
      if (result.error) return { configurationError: result.error };
      record.paymentStatus = 'pending';
      record.paymentProvider = 'payfast';
      record.paymentStartedAt = new Date().toISOString();
      await saveRequestStore(store);
      return result;
    });
    if (checkout.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (checkout.forbidden) return res.status(403).json({ error: 'Use the private request link provided when you submitted the request.' });
    if (checkout.invalid) return res.status(409).json({ error: 'Payment is available only after accepting a published quote.' });
    if (checkout.paid) return res.status(409).json({ error: 'Payment has already been verified for this request.' });
    if (checkout.configurationError) return res.status(503).json({ error: checkout.configurationError });
    return res.json({ action: checkout.action, fields: checkout.fields });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/payments/payfast/itn', async (req, res, next) => {
  try {
    const parameters = req.body;
    const rawBody = req.rawBody;
    const allowedAddresses = (process.env.PAYFAST_ITN_ALLOWED_IPS || '').split(',').map((address) => address.trim()).filter(Boolean);
    if (!allowedAddresses.length || !process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_PASSPHRASE) {
      return res.status(503).send('PayFast callback verification is not configured.');
    }
    if (!payFastSourceIsAllowed(req.socket.remoteAddress, allowedAddresses)) return res.status(403).send('Untrusted callback source.');
    if (!rawBody || !parameters || typeof parameters !== 'object'
      || Object.values(parameters).some((value) => typeof value !== 'string')
      || !payFastSignatureIsValid(parameters, process.env.PAYFAST_PASSPHRASE)) {
      return res.status(400).send('Invalid callback signature.');
    }
    if (parameters.merchant_id !== process.env.PAYFAST_MERCHANT_ID) return res.status(400).send('Merchant verification failed.');

    const sandbox = process.env.PAYFAST_SANDBOX === 'true';
    const providerValidated = await validatePayFastItn(rawBody, { sandbox });
    if (!providerValidated) return res.status(400).send('Provider validation failed.');
    if (parameters.payment_status !== 'COMPLETE') return res.status(200).send('OK');

    const amountCents = parsePayFastAmountCents(parameters.amount_gross);
    if (amountCents === null || !parameters.m_payment_id || !parameters.pf_payment_id) {
      return res.status(400).send('Payment details are invalid.');
    }
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === parameters.m_payment_id);
      if (!record) return { missing: true };
      if (record.paymentStatus === 'paid') {
        return record.paymentTransactionId === parameters.pf_payment_id ? { duplicate: true } : { alreadyPaid: true };
      }
      if (record.status !== 'Quote Accepted' || record.quoteDecision !== 'accepted' || !record.quote) return { invalidState: true };
      if (record.quote.totalCents !== amountCents) return { amountMismatch: true };

      const at = new Date().toISOString();
      record.paymentStatus = 'paid';
      record.paymentProvider = 'payfast';
      record.paymentTransactionId = parameters.pf_payment_id;
      record.paymentVerifiedAt = at;
      routeToStatus(record, 'Work in Progress', at);
      record.updatedAt = at;
      record.workflowVersion = 2;
      record.customerUpdate = customerStatusUpdate('Work in Progress');
      record.history ||= [];
      record.history.push({ status: record.status, at, message: record.customerUpdate, customerVisible: true });
      await saveRequestStore(store);
      return { record };
    });
    if (updated.missing) return res.status(404).send('Request not found.');
    if (updated.invalidState) return res.status(409).send('Request is not awaiting payment.');
    if (updated.amountMismatch) return res.status(400).send('Payment amount does not match the accepted quote.');
    if (updated.alreadyPaid) return res.status(409).send('A different payment is already recorded.');
    return res.status(200).send('OK');
  } catch (error) {
    return next(error);
  }
});

app.post('/api/requests/:ref/quote-change', async (req, res, next) => {
  try {
    const message = cleanText(req.body.message, 500);
    const quoteId = cleanText(req.body.quoteId, 100);
    const quoteVersion = Number(req.body.quoteVersion);
    if (!message) return res.status(400).json({ error: 'Tell us what you would like changed in the quote.' });
    if (!quoteId || !Number.isSafeInteger(quoteVersion) || quoteVersion < 1) return res.status(400).json({ error: 'Refresh the quote before requesting a change.' });
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (!hasCustomerAccess(record, req.get('x-request-access-key'))) return { forbidden: true };
      if (record.status !== 'Awaiting Customer Decision' || record.quoteDecision) return { unavailable: true };
      if (record.quote?.id !== quoteId || (record.quote.version || 1) !== quoteVersion) return { staleQuote: true };
      const at = new Date().toISOString();
      record.quoteRevisionRequests ||= [];
      record.quoteRevisionRequests.push({ quoteId, quoteVersion, message, requestedAt: at });
      delete record.quotePublishedAt;
      routeToStatus(record, 'Quote Revision Required', at);
      record.customerUpdate = customerStatusUpdate('Quote Revision Required');
      record.history ||= [];
      record.history.push({
        status: record.status,
        at,
        message: record.customerUpdate,
        customerVisible: true,
      });
      record.history.push({
        status: record.status,
        at,
        message: `Customer requested a quote change: ${message}`,
        customerVisible: false,
      });
      recordQuoteActionAudit(record, 'changes', req, at);
      await saveRequestStore(store);
      return { record };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.forbidden) return res.status(403).json({ error: 'Use the private request link provided when you submitted the request.' });
    if (updated.unavailable) return res.status(409).json({ error: 'A quote change cannot be requested for this quote now.' });
    if (updated.staleQuote) return res.status(409).json({ error: 'This quote has changed. Refresh the tracking page and review the latest version.' });
    return res.json(publicRequest(updated.record, true));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/requests/:ref/documents', upload.array('documents', 10), async (req, res, next) => {
  const createdFiles = [];
  try {
    let labels;
    let requestedLabels;
    try {
      labels = JSON.parse(req.body.documentLabels || '[]');
      requestedLabels = req.body.requestedDocumentLabels === undefined
        ? labels
        : JSON.parse(req.body.requestedDocumentLabels);
    } catch {
      return res.status(400).json({ error: 'Document labels could not be read.' });
    }
    if (!Array.isArray(labels) || !labels.length || labels.length !== (req.files || []).length || labels.some((label) => typeof label !== 'string' || !label.trim() || label.length > 120)
      || !Array.isArray(requestedLabels) || requestedLabels.some((label) => typeof label !== 'string' || !labels.includes(label))) {
      return res.status(400).json({ error: 'Choose a label for each document.' });
    }
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (!hasCustomerAccess(record, req.get('x-request-access-key'))) return { forbidden: true };
      const requested = record.requestedDocuments || [];
      const requestedUploads = requestedLabels;
      const supportingUploads = labels.filter((label) => !requestedUploads.includes(label));
      if (requestedUploads.length && record.status !== 'Awaiting Documents') return { notAwaiting: true };
      if (requestedUploads.some((label) => !requested.includes(label))) return { notRequested: true };
      if (supportingUploads.length && ['Completed', 'Quote Declined', 'Cancelled'].includes(record.status)) return { closed: true };
      if ((record.documents || []).length + req.files.length > 10) return { tooMany: true };
      for (const [index, file] of req.files.entries()) {
        const id = randomUUID();
        const privateName = `${record.ref}-${id}.enc`;
        await writeFile(path.join(documentsDirectory, privateName), encryptBuffer(file.buffer), { flag: 'wx', mode: 0o600 });
        createdFiles.push(privateName);
        const label = labels[index].trim();
        record.documents.push({ id, privateName, type: file.mimetype, size: file.size, uploadedAt: new Date().toISOString(), order: record.documents.length + 1, label: requestedUploads.includes(label) ? label : `Supporting document: ${label}`, serviceId: '', reviewState: 'received' });
      }
      if (req.files.length && record.serviceAssessment) {
        record.serviceAssessment.requirementsReviewed = false;
        record.serviceAssessment.eligibility = 'pending';
        record.serviceAssessment.governmentReadiness = 'pending';
      }
      const receivedLabels = new Set(requestedUploads.map((label) => label.trim()));
      record.requestedDocuments = requested.filter((item) => !receivedLabels.has(item));
      const nextStatus = requestedUploads.length && !record.requestedDocuments.length ? 'Under Review' : record.status;
      record.updatedAt = new Date().toISOString();
      for (const task of record.customerTasks || []) {
        if (task.type === 'document' && receivedLabels.has(task.title) && task.status === 'waiting-on-customer') {
          task.status = 'response-received';
          task.response = 'The requested document was uploaded.';
          task.responseAt = record.updatedAt;
        }
      }
      routeToStatus(record, nextStatus, record.updatedAt);
      record.history ||= [];
      const historyMessage = requestedUploads.length
        ? customerStatusUpdate(record.status)
        : 'You sent additional supporting documents. Our team will review them.';
      record.history.push({ status: record.status, at: record.updatedAt, message: historyMessage, customerVisible: true });
      record.customerUpdate = requestedUploads.length ? customerStatusUpdate(record.status) : historyMessage;
      await saveRequestStore(store);
      return { record };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.forbidden) return res.status(403).json({ error: 'Use the private request link provided when you submitted the request.' });
    if (updated.notRequested) return res.status(409).json({ error: 'These documents were not requested for this case. Contact WeQ4U for help.' });
    if (updated.tooMany) return res.status(400).json({ error: 'A request can contain no more than 10 documents.' });
    if (updated.notAwaiting) return res.status(409).json({ error: 'This request is not waiting for documents.' });
    if (updated.closed) return res.status(409).json({ error: 'This request is closed. Contact WeQ4U if you need to send another document.' });
    return res.json(publicRequest(updated.record, true));
  } catch (error) {
    await Promise.all(createdFiles.map((file) => unlink(path.join(documentsDirectory, file)).catch(() => undefined)));
    return next(error);
  }
});

app.post('/api/requests/:ref/customer-tasks/:taskId/response', async (req, res, next) => {
  try {
    const responseText = cleanText(req.body.response, 2000);
    if (!responseText) return res.status(400).json({ error: 'Enter a response before sending it.' });
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (!hasCustomerAccess(record, req.get('x-request-access-key'))) return { forbidden: true };
      const task = (record.customerTasks || []).find((item) => item.id === req.params.taskId);
      if (!task || !customerTaskTypes.has(task.type)) return { missingTask: true };
      if (task.status !== 'waiting-on-customer') return { alreadyResponded: true };
      const at = new Date().toISOString();
      task.status = 'response-received';
      task.response = responseText;
      task.responseAt = at;
      record.updatedAt = at;
      record.customerUpdate = 'Thanks. We received your response and our team will review it.';
      record.nextAction = 'Review the customer response';
      record.history ||= [];
      record.history.push({ status: record.status, at, message: `Your response was received: ${task.title}`, customerVisible: true });
      await saveRequestStore(store);
      return { record };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.forbidden) return res.status(403).json({ error: 'Use the private request link provided when you submitted the request.' });
    if (updated.missingTask) return res.status(404).json({ error: 'This customer action is no longer available.' });
    if (updated.alreadyResponded) return res.status(409).json({ error: 'This customer action has already been answered or completed.' });
    return res.json(publicRequest(updated.record, true));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ staff: req.staff }));

app.get('/api/admin/requests', requireAdmin, requirePermission('requests:read'), async (req, res, next) => {
  try {
    const store = await readRequestStore();
    const requests = req.staff.role === 'finance'
      ? store.requests.filter((record) => record.status === 'Quote Accepted')
      : store.requests;
    return res.json({ requests: requests.map((record) => adminRequest(record, store.pricingProfiles)) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/admin/requests/:ref/service-assessment', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    const eligibility = req.body.eligibility;
    const governmentReadiness = req.body.governmentReadiness;
    const requirements = req.body.requirements;
    const documentReviews = req.body.documentReviews;
    if (typeof req.body.requirementsReviewed !== 'boolean'
      || !['pending', 'eligible', 'ineligible'].includes(eligibility)
      || !['pending', 'ready', 'not-ready'].includes(governmentReadiness)
      || !Array.isArray(requirements) || requirements.length > 30
      || !Array.isArray(documentReviews) || documentReviews.length > 10) {
      return res.status(400).json({ error: 'Complete the service assessment fields using the supported requirement and review states.' });
    }
    const cleanRequirements = requirements.map((item) => ({
      id: cleanText(item?.id, 80),
      label: cleanText(item?.label, 160),
      required: item?.required !== false,
      status: item?.status,
      evidenceDocumentId: cleanText(item?.evidenceDocumentId, 100),
      note: cleanText(item?.note, 300),
    }));
    if (cleanRequirements.some((item) => !item.id || !item.label
      || !['received', 'missing', 'verified', 'rejected', 'not-applicable'].includes(item.status))
      || new Set(cleanRequirements.map((item) => item.id)).size !== cleanRequirements.length) {
      return res.status(400).json({ error: 'Each requirement needs a unique identifier, label, and valid assessment state.' });
    }
    const reviews = documentReviews.map((item) => ({
      documentId: cleanText(item?.documentId, 100),
      status: item?.status,
      note: cleanText(item?.note, 300),
    }));
    if (reviews.some((item) => !item.documentId || !['pending', 'verified', 'rejected', 'replacement-required'].includes(item.status))
      || new Set(reviews.map((item) => item.documentId)).size !== reviews.length) {
      return res.status(400).json({ error: 'Each document needs one valid review outcome.' });
    }
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      const definition = resolveServiceDefinition({ serviceCode: record.serviceCode, services: record.services, serviceDetails: record.serviceDetails });
      if (definition && definition.requirements.length) {
        const configured = new Map(definition.requirements.map((requirement) => [requirement.id, requirement]));
        if (cleanRequirements.length !== configured.size || cleanRequirements.some((item) => {
          const requirement = configured.get(item.id);
          return !requirement || item.label !== requirement.label || item.required !== requirement.required;
        })) return { invalidRequirements: true };
        if (cleanRequirements.some((item) => {
          const requirement = configured.get(item.id);
          return item.status === 'not-applicable' && requirement.required;
        })) return { invalidRequirementOutcome: true };
      }
      const documentsById = new Map((record.documents || []).map((document) => [document.id, document]));
      if (reviews.some((review) => !documentsById.has(review.documentId))) return { invalidDocument: true };
      if (cleanRequirements.some((item) => item.evidenceDocumentId && !documentsById.has(item.evidenceDocumentId))) return { invalidEvidence: true };
      if (cleanRequirements.some((item) => item.required && item.status === 'not-applicable' && !item.note)) return { missingExceptionNote: true };
      if (cleanRequirements.some((item) => item.status === 'verified' && item.evidenceDocumentId
        && (documentsById.get(item.evidenceDocumentId).reviewState !== 'verified'
          && !reviews.some((review) => review.documentId === item.evidenceDocumentId && review.status === 'verified')))) return { unverifiedEvidence: true };
      const at = new Date().toISOString();
      for (const review of reviews) {
        const document = documentsById.get(review.documentId);
        document.reviewState = review.status;
        document.reviewedBy = req.staff.name;
        document.reviewedAt = at;
        document.reviewNote = review.note;
      }
      record.serviceAssessment = {
        requirementsReviewed: req.body.requirementsReviewed,
        requirements: cleanRequirements,
        eligibility,
        governmentReadiness,
        reviewedBy: req.staff.name,
        reviewedAt: at,
        notes: cleanText(req.body.notes, 1000),
      };
      record.serviceValidated = serviceAssessmentReady(record);
      record.updatedAt = at;
      record.history ||= [];
      record.history.push({
        status: record.status,
        at,
        message: `Service assessment updated by ${req.staff.name}; readiness ${serviceAssessmentReady(record) ? 'confirmed' : 'not yet met'}.`,
        customerVisible: false,
      });
      if (serviceAssessmentReady(record) && ['Submitted', 'Awaiting Documents'].includes(record.status)) {
        routeToStatus(record, 'Under Review', at);
        record.workflowVersion = 2;
        record.customerUpdate = customerStatusUpdate(record.status);
        record.history.push({
          status: record.status,
          at,
          message: record.customerUpdate,
          customerVisible: true,
        });
      }
      await saveRequestStore(store);
      return { record, pricingProfiles: store.pricingProfiles };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.invalidRequirements) return res.status(400).json({ error: 'Use the requirements defined for this service. Required checklist items cannot be removed or relabelled.' });
    if (updated.invalidRequirementOutcome) return res.status(400).json({ error: 'A required service-definition requirement cannot be marked not applicable.' });
    if (updated.invalidDocument) return res.status(400).json({ error: 'A reviewed document does not belong to this request.' });
    if (updated.invalidEvidence) return res.status(400).json({ error: 'A requirement references a document that does not belong to this request.' });
    if (updated.missingExceptionNote) return res.status(400).json({ error: 'Add a case note before marking a required item not applicable.' });
    if (updated.unverifiedEvidence) return res.status(400).json({ error: 'A requirement cannot be verified using evidence that has not been verified.' });
    return res.json(adminRequest(updated.record, updated.pricingProfiles));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/requests/:ref/customer-tasks', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    const type = cleanText(req.body.type, 30);
    const title = cleanText(req.body.title, 120);
    const message = cleanText(req.body.message, 1000);
    const dueDate = cleanText(req.body.dueDate, 10);
    if (!customerTaskTypes.has(type)) return res.status(400).json({ error: 'Choose an information, appointment, or delivery task.' });
    if (!title || !message) return res.status(400).json({ error: 'Add a short title and explain what the customer needs to do.' });
    if (!customerTaskDueDateValid(dueDate)) return res.status(400).json({ error: 'Enter a valid due date.' });
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      record.customerTasks ||= [];
      if (record.customerTasks.some((task) => task.type === type && task.title === title && task.status === 'waiting-on-customer')) {
        return { duplicate: true };
      }
      const at = new Date().toISOString();
      const task = {
        id: randomUUID(),
        type,
        title,
        message,
        dueDate,
        status: 'waiting-on-customer',
        createdAt: at,
        createdBy: req.staff.name,
      };
      record.customerTasks.push(task);
      record.updatedAt = at;
      record.customerUpdate = `Please respond to: ${title}`;
      record.nextAction = `Wait for the customer: ${title}`;
      record.history ||= [];
      record.history.push({ status: record.status, at, message: `WeQ4U asked you: ${title}`, customerVisible: true });
      await saveRequestStore(store);
      return { record, task, pricingProfiles: store.pricingProfiles };
    });
    if (result.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (result.duplicate) return res.status(409).json({ error: 'An open task with this title already exists for the customer.' });
    const notificationStatus = await notifyCustomerTask(result.record, result.task);
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      const task = record?.customerTasks?.find((item) => item.id === result.task.id);
      if (!record || !task) return result.record;
      task.notificationStatus = notificationStatus;
      if (notificationStatus !== 'sent') record.nextAction = 'Contact the customer to explain the outstanding task';
      await saveRequestStore(store);
      return { record, pricingProfiles: store.pricingProfiles };
    });
    const updatedRecord = updated.record || updated;
    return res.status(201).json({ ...adminRequest(updatedRecord, updated.pricingProfiles || result.pricingProfiles), notificationStatus });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/requests/:ref/customer-tasks/:taskId', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    if (req.body.status !== 'completed') return res.status(400).json({ error: 'Customer tasks can only be marked completed by staff.' });
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      const task = (record.customerTasks || []).find((item) => item.id === req.params.taskId);
      if (!task) return { missingTask: true };
      if (task.status === 'completed') return { alreadyCompleted: true };
      const at = new Date().toISOString();
      task.status = 'completed';
      task.completedAt = at;
      task.completedBy = req.staff.name;
      record.updatedAt = at;
      record.history ||= [];
      record.history.push({ status: record.status, at, message: `WeQ4U completed the customer action: ${task.title}`, customerVisible: true });
      await saveRequestStore(store);
      return { record, pricingProfiles: store.pricingProfiles };
    });
    if (result.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (result.missingTask) return res.status(404).json({ error: 'Customer task not found.' });
    if (result.alreadyCompleted) return res.status(409).json({ error: 'This customer task is already complete.' });
    return res.json(adminRequest(result.record, result.pricingProfiles));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/pricing-profiles', requireAdmin, requirePermission('pricing:manage'), async (req, res, next) => {
  try {
    const store = await readRequestStore();
    return res.json({
      services: serviceCatalogue,
      servicePricing: financeServicePricing(store.pricingProfiles),
      components: pricingComponents,
      profiles: Object.values(store.pricingProfiles),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/pricing-preview', requireAdmin, requirePermission('pricing:manage'), async (req, res, next) => {
  try {
    const { serviceId, pricingPackage, serviceDetail, courierCollection, courierDelivery, profilePreview } = req.body;
    if (!serviceCatalogue.some((service) => service.id === serviceId)) return res.status(400).json({ error: 'Choose a service from the catalogue.' });
    if (!pricingPackages.some(({ id }) => id === pricingPackage)) return res.status(400).json({ error: 'Choose a supported package.' });
    if (serviceDetail !== undefined && (typeof serviceDetail !== 'string' || serviceDetail.trim().length > 120)) return res.status(400).json({ error: 'Service detail must be 120 characters or fewer.' });
    if (courierCollection !== undefined && typeof courierCollection !== 'boolean') return res.status(400).json({ error: 'Choose whether collection is included.' });
    if (courierDelivery !== undefined && typeof courierDelivery !== 'boolean') return res.status(400).json({ error: 'Choose whether delivery is included.' });
    const store = await readRequestStore();
    let profiles = store.pricingProfiles;
    if (profilePreview !== undefined) {
      if (!profilePreview || typeof profilePreview !== 'object' || Array.isArray(profilePreview)
        || Object.keys(profilePreview).length !== 3
        || !['components', 'vatTreatment', 'effectiveFrom'].every((key) => Object.hasOwn(profilePreview, key))) {
        return res.status(400).json({ error: 'Provide only the pricing components, VAT treatment, and effective date for a preview.' });
      }
      const currentProfile = store.pricingProfiles[serviceId];
      if (!currentProfile) return res.status(404).json({ error: 'Pricing profile not found for this service.' });
      const validationError = validatePricingProfileUpdate({
        active: currentProfile.status === 'active',
        components: profilePreview.components,
        vatTreatment: profilePreview.vatTreatment,
        effectiveFrom: profilePreview.effectiveFrom,
      });
      if (validationError) return res.status(400).json({ error: validationError });
      profiles = {
        ...store.pricingProfiles,
        [serviceId]: { ...currentProfile, ...profilePreview },
      };
    }
    const resolution = resolvePricingProfile({
      services: [serviceId],
      serviceDetails: serviceDetail?.trim() ? { [serviceId]: serviceDetail.trim() } : {},
      pricingPackage,
      courierCollection: courierCollection === true,
      courierDelivery: courierDelivery === true,
    }, profiles);
    const profile = profiles[serviceId];
    const costs = resolution.preview.lines.map(({ componentId }) => profile?.components?.[componentId]?.costCents);
    const costsComplete = resolution.preview.ready && costs.every(Number.isSafeInteger);
    return res.json({
      profilePreview: profilePreview !== undefined,
      resolution,
      estimatedCostCents: costsComplete ? costs.reduce((total, cost) => total + cost, 0) : null,
      estimatedGrossMarginCents: costsComplete && resolution.preview.totalCents !== null
        ? resolution.preview.totalCents - costs.reduce((total, cost) => total + cost, 0)
        : null,
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/pricing-profiles/:serviceId', requireAdmin, requirePermission('pricing:manage'), async (req, res, next) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceCatalogue.some((service) => service.id === serviceId)) return res.status(404).json({ error: 'Pricing profile not found for this service.' });
    const validationError = validatePricingProfileUpdate(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const current = store.pricingProfiles[serviceId];
      const { versionHistory = [], ...previousVersion } = current;
      const updated = {
        ...previousVersion,
        version: current.version + 1,
        status: req.body.active ? 'active' : 'draft',
        components: req.body.components,
        vatTreatment: req.body.vatTreatment,
        effectiveFrom: req.body.effectiveFrom,
        versionHistory: [...versionHistory, previousVersion],
        updatedAt: new Date().toISOString(),
        updatedBy: req.staff.name,
      };
      store.pricingProfiles[serviceId] = updated;
      await saveRequestStore(store);
      return { profile: updated, servicePricing: financeServicePricing(store.pricingProfiles) };
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/finance/summary', requireAdmin, requirePermission('finance:read'), async (req, res, next) => {
  try {
    const store = await readRequestStore();
    return res.json({ currency: 'ZAR', paymentReconciliation: 'not-connected', services: financeQuoteSummary(store.requests) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/admin/requests/:ref/delivery-fee-override', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    const amountCents = req.body?.amountCents;
    if (!req.body || Object.keys(req.body).some((key) => key !== 'amountCents')
      || !Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000) {
      return res.status(400).json({ error: 'Enter a positive delivery fee as whole cents, up to R1,000,000.' });
    }
    const result = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (record.status !== 'Quote Preparation') return { invalid: 'Set a case-specific delivery fee only while the request is in Quote Preparation.' };
      if (!record.courierDelivery) return { invalid: 'This request does not include courier delivery.' };
      if (!serviceAssessmentReady(record) || (record.requestedDocuments || []).length) {
        return { invalid: 'Verify all required documents and resolve outstanding document requests before setting a case-specific fee.' };
      }
      if (record.quote || record.quotePublishedAt || record.quoteDraft?.lines) {
        return { invalid: 'A case-specific delivery fee must be set before preparing or publishing a quote draft.' };
      }
      const baseProfile = store.pricingProfiles[record.services?.[0]];
      if (Number.isSafeInteger(baseProfile?.components?.deliveryFee?.amountCents)) {
        return { invalid: 'The shared pricing profile already has a delivery fee; case-specific fees are only available when that price is not configured.' };
      }
      const at = new Date().toISOString();
      const deliveryFee = { amountCents, setAt: at, setBy: req.staff.name };
      const candidate = {
        ...record,
        casePricingOverrides: {
          ...record.casePricingOverrides,
          deliveryFee,
        },
      };
      const effectiveProfile = pricingProfileForRequest(candidate, store.pricingProfiles);
      const registryReadiness = serviceQuoteIssue(candidate, effectiveProfile);
      if (!registryReadiness.allowed) return { invalid: registryReadiness.reason };
      if (!serviceDefinitionCanQuote(candidate)) return { invalid: 'This service variant is not approved for customer quoting.' };
      const pricingIssue = quoteConfigurationIssue(candidate, effectiveProfile);
      if (pricingIssue) return { invalid: pricingIssue };
      record.casePricingOverrides = candidate.casePricingOverrides;
      record.casePricingOverrideHistory ||= [];
      record.casePricingOverrideHistory.push(deliveryFee);
      record.updatedAt = at;
      record.history ||= [];
      record.history.push({
        status: record.status,
        at,
        message: `Case-only delivery fee R${(amountCents / 100).toFixed(2)} set by ${req.staff.name}. The shared pricing profile was not changed.`,
        customerVisible: false,
      });
      await saveRequestStore(store);
      return { record, pricingProfiles: store.pricingProfiles };
    });
    if (result.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (result.invalid) return res.status(409).json({ error: result.invalid });
    return res.json(adminRequest(result.record, result.pricingProfiles));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/requests/:ref/quote-draft', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    const quoteNotes = cleanText(req.body.quoteNotes, 500);
    const quoteValidUntil = cleanText(req.body.quoteValidUntil, 10) || defaultQuoteValidityDate();
    const quoteConditions = validateQuoteList(req.body.conditions, 'Conditions', 4, 120);
    if (quoteConditions.error) return res.status(400).json({ error: quoteConditions.error });
    if (req.body.serviceValidated !== undefined && typeof req.body.serviceValidated !== 'boolean') return res.status(400).json({ error: 'Confirm whether the service and documents have been validated.' });
    if (req.body.manualPricing === true || req.body.manualQuoteLines !== undefined) {
      return res.status(409).json({ error: 'Case-specific pricing is disabled. Use a service variant with an active approved pricing profile.' });
    }
    if (Array.isArray(req.body.requiredDocuments) && req.body.requiredDocuments.length) {
      return res.status(409).json({ error: 'Customer document checklists are managed in the service registry and cannot be changed on a quote.' });
    }
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (record.status !== 'Quote Preparation') return { invalid: 'Move the request to Quote Preparation before preparing a quote.' };
      if (!serviceAssessmentReady(record)) return { invalid: 'Approve all required documents and resolve outstanding document requests before preparing a quote.' };
      if ((record.requestedDocuments || []).length) return { invalid: 'Resolve all outstanding document requests before preparing a quote.' };
      if (!validateQuoteValidityDate(quoteValidUntil)) return { invalid: 'Choose a valid-until date from 1 to 90 days after issue.' };
      const requestDefinition = resolveServiceDefinition({
        serviceCode: record.serviceCode,
        services: record.services,
        serviceDetails: record.serviceDetails,
        serviceVariantKey: record.serviceVariantKey,
      });
      const baseProfile = store.pricingProfiles[record.services[0]];
      const activeProfile = pricingProfileForRequest(record, store.pricingProfiles);
      const quoteReadiness = serviceQuoteIssue(record, activeProfile);
      if (!quoteReadiness.allowed) return { invalid: quoteReadiness.reason };
      const at = new Date().toISOString();
      const year = at.slice(0, 4);
      const quoteNumber = nextQuoteNumber(store.requests, year);
      const quoteOptions = {
        notes: quoteNotes,
        conditions: quoteConditions.items,
        requiredDocuments: quoteReadiness.variant.documentChecklist.map(({ label }) => label),
        validUntil: quoteValidUntil,
        quoteNumber,
        at,
      };
      if (!serviceDefinitionCanQuote(record)) return { invalid: 'This service variant is not approved for customer quoting.' };
      const generated = generateQuote(record, activeProfile, quoteOptions);
      if (generated.error) return { pricingUnavailable: generated.error };
      generated.quote.serviceCode = record.serviceCode || requestDefinition?.serviceCode || '';
      generated.quote.serviceKey = quoteReadiness.service.key;
      generated.quote.variantKey = quoteReadiness.variant.key;
      generated.quote.serviceDefinitionVersion = record.serviceDefinitionVersion || requestDefinition?.version || null;
      generated.quote.version = (record.quoteHistory?.length || 0) + (record.quote ? 2 : 1);
      if (record.casePricingOverrides?.deliveryFee) {
        generated.quote.casePricingOverrides = structuredClone(record.casePricingOverrides);
        generated.quote.pricingBasis = 'approved-profile-with-case-specific-delivery-fee';
      }
      record.serviceValidated = true;
      if (record.quoteDraft) {
        record.quoteDraftHistory ||= [];
        record.quoteDraftHistory.push(record.quoteDraft);
      }
      record.quoteDraft = {
        ...generated.quote,
        approvalStatus: 'pending-approval',
        preparedAt: at,
        preparedBy: req.staff.name,
      };
      record.updatedAt = at;
      record.history ||= [];
      record.history.push({
        status: record.status,
        at,
        message: `Quote ${generated.quote.quoteNumber} prepared for approval.`,
        customerVisible: false,
      });
      await saveRequestStore(store);
      return { record, profile: baseProfile };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.invalid) return res.status(409).json({ error: updated.invalid });
    if (updated.pricingUnavailable) return res.status(409).json({ error: updated.pricingUnavailable });
    return res.json(adminRequest(updated.record, { [updated.record.services[0]]: updated.profile }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/requests/:ref/quote-draft/approve', requireAdmin, requirePermission('quotes:approve'), async (req, res, next) => {
  try {
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      if (record.status !== 'Quote Preparation' || record.quoteDraft?.approvalStatus !== 'pending-approval') {
        return { invalid: 'Prepare a quote draft before approving it.' };
      }
      if (record.quoteDraft.preparedBy === req.staff.name) return { invalid: 'A different authorized reviewer must approve this quote.' };
      const at = new Date().toISOString();
      record.quoteDraft.approvalStatus = 'approved';
      record.quoteDraft.approvedAt = at;
      record.quoteDraft.approvedBy = req.staff.name;
      record.updatedAt = at;
      record.history ||= [];
      record.history.push({
        status: record.status,
        at,
        message: `Quote ${record.quoteDraft.quoteNumber} approved by ${req.staff.name}.`,
        customerVisible: false,
      });
      await saveRequestStore(store);
      return { record, profile: store.pricingProfiles[record.services[0]] };
    });
    if (updated.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.invalid) return res.status(409).json({ error: updated.invalid });
    return res.json(adminRequest(updated.record, { [updated.record.services[0]]: updated.profile }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/requests/:ref/quote-draft/publish', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    const published = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return { missing: true };
      const draft = record.quoteDraft;
      if (record.status !== 'Quote Preparation' || draft?.approvalStatus !== 'approved') {
        return { invalid: 'Approve the quote draft before publishing it to the customer.' };
      }
      if (!validateQuoteValidityDate(draft.validUntil)) {
        return { invalid: 'This approved quote is no longer valid. Prepare a new draft with a valid-until date within 90 days.' };
      }
      const activeProfile = store.pricingProfiles[record.services[0]];
      const eligibilityIssue = quotePublicationIssue({ ...record, quote: draft }, store.pricingProfiles);
      if (eligibilityIssue) return { invalid: eligibilityIssue };
      if (activeProfile?.version !== draft.profileVersion || activeProfile?.status !== 'active') {
        return { invalid: 'The pricing profile changed after this draft was prepared. Prepare a new quote draft for the current profile.' };
      }
      const at = new Date().toISOString();
      if (record.quote) {
        record.quoteHistory ||= [];
        record.quoteHistory.push(record.quote);
      }
      record.quote = {
        ...draft,
        publishedAt: at,
        publishedBy: req.staff.name,
      };
      delete record.quote.approvalStatus;
      delete record.quote.preparedAt;
      delete record.quote.preparedBy;
      record.quoteAmount = record.quote.totalCents / 100;
      record.quoteCurrency = record.quote.currency;
      record.quoteDecision = '';
      delete record.quoteDecisionAt;
      delete record.quoteDecisionReason;
      delete record.quoteDecisionReasonDetails;
      delete record.quoteDecisionVersion;
      delete record.quoteDraft;
      publishQuoteToPortal(record, at, req.staff.name);
      await saveRequestStore(store);
      return { record, profile: activeProfile };
    });
    if (published.missing) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (published.invalid) return res.status(409).json({ error: published.invalid });
    const notificationStatus = await sendQuoteNotification(published.record);
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === published.record.ref);
      if (!record || record.quote?.id !== published.record.quote.id) return { record: published.record, profile: published.profile };
      record.notificationStatus = notificationStatus;
      await saveRequestStore(store);
      return { record, profile: store.pricingProfiles[record.services[0]] };
    });
    return res.json({ ...adminRequest(updated.record, { [updated.record.services[0]]: updated.profile }), notificationStatus });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/requests/:ref', requireAdmin, requirePermission('requests:update'), async (req, res, next) => {
  try {
    const status = cleanText(req.body.status, 40);
    const notes = cleanText(req.body.notes, 2000);
    const assignee = cleanText(req.body.assignee, 100);
    const nextAction = cleanText(req.body.nextAction, 240);
    const targetDate = cleanText(req.body.targetDate, 40);
    const requestedDocuments = Array.isArray(req.body.requestedDocuments)
      ? req.body.requestedDocuments.map((label) => cleanText(label, 120)).filter(Boolean).slice(0, 10)
      : undefined;
    const quoteNotes = cleanText(req.body.quoteNotes, 500);
    const quoteValidUntil = cleanText(req.body.quoteValidUntil, 10) || defaultQuoteValidityDate();
    const communicationChannel = cleanText(req.body.quoteCommunicationChannel, 20);
    const quoteCommunicationConfirmed = req.body.quoteCommunicationConfirmed === true;
    const fulfilmentValidated = req.body.fulfilmentValidated === true;
    const completionConfirmed = req.body.completionConfirmed === true;
    const generateQuoteRequested = req.body.generateQuote === true;
    if (req.body.quoteAmount !== undefined) return res.status(400).json({ error: 'Quote amounts are generated from the active Finance pricing profile and cannot be entered manually.' });
    if (req.body.department !== undefined) return res.status(400).json({ error: 'Department and queue are routed automatically from the workflow stage.' });
    if (req.body.paymentStatus !== undefined || req.body.paid !== undefined) return res.status(400).json({ error: 'Payment status can only be set by a future verified payment integration.' });
    if ((req.body.assignee !== undefined || req.body.targetDate !== undefined) && !req.staff.permissions.includes('operations:manage')) return res.status(403).json({ error: 'Only supervisors, the founder, or system administrators can manage assignments and targets.' });
    if (status && !workflowStatuses.includes(status)) return res.status(400).json({ error: 'Choose a valid customer-aligned workflow stage.' });
    if (['Quote Accepted', 'Quote Declined', 'Quote Expired', 'Quote Revision Required'].includes(status)) return res.status(400).json({ error: 'Quote decisions, changes and expiry are recorded by the customer or quote workflow.' });
    if (req.body.serviceValidated !== undefined && typeof req.body.serviceValidated !== 'boolean') return res.status(400).json({ error: 'Confirm whether the service and documents have been validated.' });
    if (req.body.fulfilmentValidated !== undefined && typeof req.body.fulfilmentValidated !== 'boolean') return res.status(400).json({ error: 'Confirm whether the fulfilment quality checks are complete.' });
    if (req.body.completionConfirmed !== undefined && typeof req.body.completionConfirmed !== 'boolean') return res.status(400).json({ error: 'Confirm whether the customer handover is complete.' });
    if (req.body.generateQuote !== undefined && typeof req.body.generateQuote !== 'boolean') return res.status(400).json({ error: 'Quote generation must be explicitly requested.' });
    if (generateQuoteRequested) return res.status(400).json({ error: 'Prepare, approve and publish quotes using the quote lifecycle actions.' });
    if (req.body.quoteValidUntil !== undefined && !validateQuoteValidityDate(quoteValidUntil)) {
      return res.status(400).json({ error: 'Choose a valid-until date from 1 to 90 days after issue.' });
    }
    const updated = await withStoreLock(async () => {
      const store = await readRequestStore();
      const record = store.requests.find((request) => request.ref === req.params.ref);
      if (!record) return null;
      const currentStatus = record.status;
      const statusChanged = Boolean(status && status !== currentStatus);
      const updatedAt = new Date().toISOString();
      if (statusChanged && req.body.assignee) return { invalidTransition: 'A new workflow stage clears the current owner. Assign a staff member after the stage has changed.' };
      const candidate = {
        ...record,
        serviceValidated: record.serviceValidated || req.body.serviceValidated === true,
        fulfilmentValidated: record.fulfilmentValidated || fulfilmentValidated,
        completionConfirmed: record.completionConfirmed || completionConfirmed,
        requestedDocuments: requestedDocuments ?? record.requestedDocuments ?? [],
      };
      const previousTaskIds = new Set((record.customerTasks || []).map((task) => task.id));
      if (statusChanged && !allowedNextStatuses(candidate).includes(status)) {
        return { invalidTransition: `This request cannot move from ${currentStatus} to ${status}. Check the required customer, payment or quality-check step.` };
      }
      if (status === 'Under Review' && statusChanged && candidate.requestedDocuments.length) {
        return { invalidTransition: 'Resolve every outstanding document request before returning this case to review.' };
      }
      if (status === 'Awaiting Customer Decision' && statusChanged) {
        if (!record.quote || !record.quotePublishedAt) return { invalidTransition: 'Approve and publish the quote before moving this request to the customer.' };
        if (!quoteCommunicationConfirmed || !['portal', 'email', 'phone', 'whatsapp', 'in-person'].includes(communicationChannel)) {
          return { invalidTransition: 'Confirm that the quote, total and expiry are available to the customer, then record the portal or contact method.' };
        }
        record.quoteCommunication = { channel: communicationChannel, confirmedAt: new Date().toISOString(), confirmedBy: req.staff.name };
      }
      if (statusChanged) {
        routeToStatus(record, status, updatedAt);
        if (['founder', 'system-administrator'].includes(req.staff.role)) record.assignee = req.staff.name;
        record.updatedAt = updatedAt;
        record.workflowVersion = 2;
        record.history ||= [];
        record.customerUpdate = customerStatusUpdate(status);
        record.history.push({ status, at: updatedAt, message: record.customerUpdate, customerVisible: true });
      }
      if (requestedDocuments !== undefined) record.requestedDocuments = [...new Set(requestedDocuments)];
      if (requestedDocuments !== undefined) syncDocumentTasks(record, record.requestedDocuments, req.staff.name, updatedAt);
      const newDocumentTasks = (record.customerTasks || []).filter((task) => task.type === 'document' && !previousTaskIds.has(task.id));
      if (status === 'Awaiting Documents' && statusChanged && !record.requestedDocuments.length) return { invalidTransition: 'List the missing information or documents before moving this request to Awaiting Documents.' };
      if (candidate.serviceValidated) record.serviceValidated = true;
      if (req.body.assignee !== undefined && !statusChanged) record.assignee = assignee;
      if (req.body.targetDate !== undefined) record.targetDate = targetDate;
      if (req.body.fulfilmentValidated === true) record.fulfilmentValidated = true;
      if (req.body.completionConfirmed === true) record.completionConfirmed = true;
      if (req.body.nextAction !== undefined && !statusChanged) record.nextAction = nextAction;
      if (record.status === 'Quote Preparation' && !['pending-approval', 'approved'].includes(record.quoteDraft?.approvalStatus)) {
        record.quoteDraft = { notes: quoteNotes, validUntil: quoteValidUntil, approvalStatus: 'editing' };
      }
      record.notes = notes;
      record.updatedAt = updatedAt;
      await saveRequestStore(store);
      return { record, newDocumentTasks, pricingProfile: store.pricingProfiles[record.services?.[0]] };
    });
    if (!updated) return res.status(404).json({ error: 'No request was found for that reference.' });
    if (updated.invalidTransition) return res.status(409).json({ error: updated.invalidTransition });
    if (updated.pricingUnavailable) return res.status(409).json({ error: updated.pricingUnavailable });
    if (updated.newDocumentTasks?.length) {
      const notificationStatuses = await Promise.all(updated.newDocumentTasks.map((task) => notifyCustomerTask(updated.record, task)));
      const notified = await withStoreLock(async () => {
        const store = await readRequestStore();
        const record = store.requests.find((item) => item.ref === updated.record.ref);
        if (!record) return null;
        for (const [index, task] of updated.newDocumentTasks.entries()) {
          const currentTask = record.customerTasks?.find((item) => item.id === task.id);
          if (currentTask) currentTask.notificationStatus = notificationStatuses[index];
        }
        if (notificationStatuses.some((status) => status !== 'sent')) record.nextAction = 'Contact the customer to explain the outstanding document request';
        await saveRequestStore(store);
        return record;
      });
      if (notified) updated.record = notified;
    }
    return res.json(adminRequest(updated.record, { [updated.record.services?.[0]]: updated.pricingProfile }));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/requests.csv', requireAdmin, requirePermission('reports:export'), async (req, res, next) => {
  try {
    const store = await readRequestStore();
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = ['Reference', 'Name', 'Phone', 'Email', 'Services', 'Suburb', 'Status', 'Quote ZAR', 'Courier', 'Created'];
    const rows = store.requests.map((record) => [record.ref, record.name, record.phone, record.email, record.services.join('; '), record.suburb, record.status, record.quoteAmount ?? '', record.courier ? 'Yes' : 'No', record.createdAt].map(quote).join(','));
    res.type('text/csv').attachment('weq4u-service-requests.csv').send([header.map(quote).join(','), ...rows].join('\r\n'));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/requests/:ref/documents/:id', requireAdmin, requirePermission('documents:read'), async (req, res, next) => {
  try {
    const store = await readRequestStore();
    const record = store.requests.find((request) => request.ref === req.params.ref);
    const document = record?.documents.find((item) => item.id === req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found.' });
    const file = decryptBuffer(await readFile(path.join(documentsDirectory, document.privateName)));
    res.type(document.type).attachment(`${record.ref}-document-${document.order}`);
    return res.send(file);
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each document must be 8 MB or smaller.'
      : error.code === 'LIMIT_FILE_COUNT'
        ? 'Attach no more than 10 documents.'
        : 'The uploaded documents could not be accepted.';
    return res.status(400).json({ error: message });
  }
  if (error.message?.startsWith('Only PDF')) return res.status(400).json({ error: error.message });
  console.error('API request failed:', error.message);
  return res.status(500).json({ error: 'Something went wrong. Please contact WeQ4UServices directly.' });
});

initializePrivateStorage().then(initializePricingProfiles).then(initializeDemoQuoteRequests).then(() => {
  const server = app.listen(port, () => {
    console.log(`WeQ4U Services API listening on http://localhost:${port}`);
  });
  const shutdown = async (signal) => {
    console.log(`Received ${signal}; shutting down the API.`);
    const closed = new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server.closeAllConnections();
    await closed;
    await closeQuotePdfBrowser();
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`Could not shut down the API cleanly: ${error.message}`);
        process.exitCode = 1;
      });
    });
  }
}).catch((error) => {
  console.error(`Could not initialize private storage and pricing profiles: ${error.message}`);
  process.exitCode = 1;
});
