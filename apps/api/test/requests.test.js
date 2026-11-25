import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { quoteExpiryTimestamp, signQuoteActionToken } from '../src/quoteActionTokens.js';
import { demoQuoteFixtures } from '../src/demoQuoteFixtures.js';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { payFastSignature } from '../src/payfast.js';

const apiDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminToken = 'test-only-token-for-api-integration';
const systemAdminToken = 'test-only-system-admin-token-for-api-integration';
const financeToken = 'test-only-finance-token-for-api-integration';
const quoteActionSecret = 'test-only-quote-action-token-secret';
const quoteValidUntil = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 14);
  return date.toISOString().slice(0, 10);
};

function quoteActionToken(ref, quote, action) {
  return signQuoteActionToken({
    version: 1,
    ref,
    quoteNumber: quote.quoteNumber || quote.id,
    quoteId: quote.id,
    quoteVersion: quote.version || 1,
    action,
    expiresAt: quoteExpiryTimestamp(quote.validUntil),
  }, quoteActionSecret);
}

async function findPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi(baseUrl, child, getOutput) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited before startup. ${getOutput()}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`API did not start. ${getOutput()}`);
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  let timer;
  const exited = await Promise.race([
    once(child, 'exit').then(() => true),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), 5000);
    }),
  ]);
  clearTimeout(timer);
  if (!exited) {
    child.kill('SIGKILL');
    let forceTimer;
    const killed = await Promise.race([
      once(child, 'exit').then(() => true),
      new Promise((resolve) => {
        forceTimer = setTimeout(() => resolve(false), 3000);
      }),
    ]);
    clearTimeout(forceTimer);
    if (!killed) throw new Error(`API test process ${child.pid} did not exit after SIGKILL.`);
  }
}

test('service request lifecycle enforces consent and protects uploads and admin operations', async (t) => {
  const port = await findPort();
  const validationServer = createServer((req, res) => {
    req.resume();
    res.writeHead(req.url === '/validate' && req.method === 'POST' ? 200 : 404, { 'Content-Type': 'text/plain' });
    res.end(req.url === '/validate' && req.method === 'POST' ? 'VALID' : 'Not found');
  });
  await new Promise((resolve, reject) => validationServer.once('error', reject).listen(0, '127.0.0.1', resolve));
  const validationPort = validationServer.address().port;
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'weq4u-api-test-'));
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: apiDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      FOUNDER_API_TOKEN: adminToken,
      SYS_ADMIN_API_TOKEN: systemAdminToken,
      FINANCE_API_TOKEN: financeToken,
      DATA_ENCRYPTION_KEY: '1'.repeat(64),
      QUOTE_ACTION_TOKEN_SECRET: quoteActionSecret,
      PRIVATE_STORAGE_DIR: dataDirectory,
      STOREFRONT_ORIGIN: 'http://localhost:3000',
      ADMIN_ORIGIN: 'http://localhost:3001',
      RESEND_API_KEY: '',
      NOTIFICATION_FROM: '',
      PRICING_SEED_ENABLED: 'false',
      PAYFAST_SANDBOX: 'true',
      PAYFAST_MERCHANT_ID: '10000100',
      PAYFAST_MERCHANT_KEY: 'test-merchant-key',
      PAYFAST_PASSPHRASE: 'test-passphrase',
      PAYFAST_NOTIFY_URL: `http://127.0.0.1:${port}/api/payments/payfast/itn`,
      PAYFAST_ITN_ALLOWED_IPS: '127.0.0.1',
      PAYFAST_VALIDATION_URL: `http://127.0.0.1:${validationPort}/validate`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}/api`;

  t.after(async () => {
    if (child.exitCode === null) {
      await stopChild(child);
    }
    await rm(dataDirectory, { recursive: true, force: true });
    await new Promise((resolve, reject) => validationServer.close((error) => error ? reject(error) : resolve()));
  });

  await waitForApi(baseUrl, child, () => output);

  const catalogueResponse = await fetch(`${baseUrl}/catalogue`);
  const catalogue = await catalogueResponse.json();
  assert.equal(catalogueResponse.status, 200);
  assert.ok(catalogue.services.length >= 8);
  assert.ok(catalogue.services.every((service) => service.startingFromCents === null), 'draft catalogue profiles must not publish invented prices');

  const invalidRequest = new FormData();
  invalidRequest.append('name', 'Integration Test');
  invalidRequest.append('phone', '083 555 0101');
  invalidRequest.append('suburb', 'Johannesburg');
  invalidRequest.append('services', 'drivers-licences');
  invalidRequest.append('consent', 'false');
  const rejected = await fetch(`${baseUrl}/requests`, { method: 'POST', body: invalidRequest });
  assert.equal(rejected.status, 400, 'requests without consent must be rejected');

  const requestForm = new FormData();
  requestForm.append('name', 'Integration Test');
  requestForm.append('phone', '083 555 0101');
  requestForm.append('email', 'integration@example.com');
  requestForm.append('suburb', 'Johannesburg');
  requestForm.append('services', 'drivers-licences');
  requestForm.append('pricingPackage', 'priority');
  requestForm.append('serviceDetails', JSON.stringify({ 'drivers-licences': 'Existing driver / renewal' }));
  requestForm.append('courier', 'true');
  requestForm.append('courierDelivery', 'true');
  requestForm.append('consent', 'true');
  requestForm.append('message', 'Temporary integration test content');
  requestForm.append('documents', new Blob(['temporary test attachment'], { type: 'application/pdf' }), 'test.pdf');

  const createdResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: requestForm });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201, JSON.stringify(created));
  assert.match(created.ref, /^WQ-\d{4}-[A-F0-9]{20}$/);

  const trackedResponse = await fetch(`${baseUrl}/requests/${created.ref}`);
  const tracked = await trackedResponse.json();
  assert.equal(trackedResponse.status, 200);
  assert.equal(tracked.status, 'Request received');
  assert.equal(tracked.journeyStage, 'submitted');
  assert.equal(tracked.nextStep, 'We received your request. Our team will check the details and contact you.');
  assert.equal(Object.hasOwn(tracked, 'department'), false, 'customer tracking must not reveal internal routing');
  assert.equal(Object.hasOwn(tracked, 'name'), false, 'public status lookup must not expose personal data');

  const deniedAdmin = await fetch(`${baseUrl}/admin/requests`);
  assert.equal(deniedAdmin.status, 401, 'admin request data must require a token');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const listedResponse = await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders });
  const listed = await listedResponse.json();
  assert.equal(listedResponse.status, 200);
  assert.equal(listed.requests[0].name, 'Integration Test');
  assert.equal(listed.requests[0].documents.length, 1);

  const manualQuoteResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteAmount: 123 }),
  });
  assert.equal(manualQuoteResponse.status, 400, 'staff must not enter quote amounts manually');

  const updatedResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Under Review', notes: 'Integration test only' }),
  });
  const updated = await updatedResponse.json();
  assert.equal(updatedResponse.status, 200);
  assert.equal(updated.status, 'Under Review');
  assert.equal(updated.department, 'Customer Support');
  assert.equal(updated.queue, 'Under Review');
  assert.equal(updated.assignee, 'William Mpeta', 'founder stage changes should automatically claim the next action');
  assert.equal(updated.quoteAmount, null);
  const manualDepartmentResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ department: 'Finance' }),
  });
  assert.equal(manualDepartmentResponse.status, 400, 'stage routing must not be overridden manually');

  const founderPricingResponse = await fetch(`${baseUrl}/admin/pricing-profiles`, { headers: adminHeaders });
  assert.equal(founderPricingResponse.status, 200, 'the founder can manage pricing profiles during the two-person startup phase');
  const systemAdminPricingResponse = await fetch(`${baseUrl}/admin/pricing-profiles`, {
    headers: { Authorization: `Bearer ${systemAdminToken}` },
  });
  assert.equal(systemAdminPricingResponse.status, 200, 'the system administrator can manage pricing profiles');
  const financeHeaders = { Authorization: `Bearer ${financeToken}` };
  const profilesResponse = await fetch(`${baseUrl}/admin/pricing-profiles`, { headers: financeHeaders });
  const profiles = await profilesResponse.json();
  assert.equal(profilesResponse.status, 200);
  const driverProfile = profiles.profiles.find((profile) => profile.serviceId === 'drivers-licences');
  const inactiveProfileResponse = await fetch(`${baseUrl}/admin/pricing-profiles/drivers-licences`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: true, components: driverProfile.components }),
  });
  assert.equal(inactiveProfileResponse.status, 400, 'an incomplete profile cannot be activated');

  const prematureQuoteResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation', quoteNotes: 'Service scope confirmed', quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(prematureQuoteResponse.status, 409, 'service and document validation must be explicitly confirmed before quote preparation');

  const uploadedDocument = listed.requests[0].documents[0];
  const assessmentResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: false,
      eligibility: 'pending',
      governmentReadiness: 'pending',
      requirements: [
        { id: 'id-copy', label: 'Copy of ID', required: true, status: 'verified', evidenceDocumentId: uploadedDocument.id },
        { id: 'existing-licence', label: 'Current licence', required: true, status: 'verified', note: 'Verified against the customer-provided licence.' },
        { id: 'proof-of-residence', label: 'Proof of residence', required: true, status: 'verified', note: 'Address confirmed for this request.' },
      ],
      documentReviews: [{ documentId: uploadedDocument.id, status: 'verified' }],
      notes: 'Integration test assessment',
    }),
  });
  const assessed = await assessmentResponse.json();
  assert.equal(assessmentResponse.status, 200, JSON.stringify(assessed));
  assert.equal(assessed.serviceAssessmentReady, true);
  assert.equal(assessed.documents[0].reviewState, 'verified');
  assert.equal(assessed.status, 'Under Review', 'verified customer-submitted requests should leave the new-request queue');
  assert.ok(assessed.history.some((event) => event.status === 'Under Review' && event.customerVisible), 'the status transition should be recorded in the customer-facing audit trail');

  const submittedForm = new FormData();
  submittedForm.append('name', 'Submitted Case Review Test');
  submittedForm.append('phone', '083 555 0103');
  submittedForm.append('suburb', 'Johannesburg');
  submittedForm.append('services', 'drivers-licences');
  submittedForm.append('serviceDetails', JSON.stringify({ 'drivers-licences': 'Existing driver / renewal' }));
  submittedForm.append('documentLabels', JSON.stringify([
    'drivers-licences:id-copy',
    'drivers-licences:existing-licence',
    'drivers-licences:proof-of-residence',
  ]));
  submittedForm.append('consent', 'true');
  submittedForm.append('documents', new Blob(['synthetic ID'], { type: 'application/pdf' }), 'id.pdf');
  submittedForm.append('documents', new Blob(['synthetic licence'], { type: 'application/pdf' }), 'licence.pdf');
  submittedForm.append('documents', new Blob(['synthetic address proof'], { type: 'application/pdf' }), 'address.pdf');
  const submittedResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: submittedForm });
  const submitted = await submittedResponse.json();
  assert.equal(submittedResponse.status, 201);
  const submittedAdminRecord = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === submitted.ref);
  assert.equal(submittedAdminRecord.status, 'Submitted');
  const submittedDocumentsByLabel = new Map(submittedAdminRecord.documents.map((document) => [document.label, document]));
  const submittedAssessment = await fetch(`${baseUrl}/admin/requests/${submitted.ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: true,
      eligibility: 'eligible',
      governmentReadiness: 'ready',
      requirements: submittedAdminRecord.serviceAssessment.requirements.map((requirement) => ({
        ...requirement,
        status: 'verified',
        evidenceDocumentId: submittedDocumentsByLabel.get(requirement.label)?.id || '',
      })),
      documentReviews: submittedAdminRecord.documents.map((document) => ({ documentId: document.id, status: 'verified' })),
    }),
  });
  const submittedAssessmentResult = await submittedAssessment.json();
  assert.equal(submittedAssessment.status, 200, JSON.stringify(submittedAssessmentResult));
  assert.equal(submittedAssessmentResult.serviceAssessmentReady, true);
  assert.equal(submittedAssessmentResult.status, 'Under Review', 'a verified case still in Submitted must automatically move to review');

  const blockedQuoteResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation', serviceValidated: true }),
  });
  const enteredQuotePreparation = await blockedQuoteResponse.json();
  assert.equal(blockedQuoteResponse.status, 200, JSON.stringify(enteredQuotePreparation));
  assert.equal(enteredQuotePreparation.status, 'Quote Preparation', 'staff can route a validated request into quote preparation before generating');
  assert.equal(enteredQuotePreparation.quoteAmount, null);
  assert.equal(enteredQuotePreparation.quoteReadiness.ready, false);
  assert.equal(enteredQuotePreparation.pricingResolution.serviceId, 'drivers-licences');
  assert.equal(enteredQuotePreparation.pricingResolution.serviceDetail, 'Existing driver / renewal');
  assert.equal(enteredQuotePreparation.pricingResolution.expectedProfileId, 'WQ-P-drivers-licences');
  assert.equal(enteredQuotePreparation.pricingResolution.profileStatus, 'draft');
  assert.equal(enteredQuotePreparation.pricingResolution.status, 'inactive');
  assert.match(enteredQuotePreparation.pricingResolution.reason, /exists but is draft/);
  assert.equal(enteredQuotePreparation.pricingResolution.preview.ready, false);

  const inactiveProfileQuoteResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'Service scope confirmed', quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(inactiveProfileQuoteResponse.status, 409, 'an unconfigured profile must block quote generation, not stage entry');
  assert.match((await inactiveProfileQuoteResponse.json()).error, /active, approved pricing profile/i);

  const draftPreviewResponse = await fetch(`${baseUrl}/admin/pricing-preview`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'drivers-licences',
      serviceDetail: 'Existing driver / renewal',
      pricingPackage: 'standard',
      profilePreview: {
        components: driverProfile.components,
        vatTreatment: driverProfile.vatTreatment,
        effectiveFrom: driverProfile.effectiveFrom,
      },
    }),
  });
  const draftPreview = await draftPreviewResponse.json();
  assert.equal(draftPreviewResponse.status, 200, JSON.stringify(draftPreview));
  assert.equal(draftPreview.profilePreview, true);
  assert.equal(draftPreview.resolution.status, 'inactive', 'previewing unsaved values must not activate a draft profile');
  assert.equal(draftPreview.resolution.preview.ready, false);

  const configuredComponents = Object.fromEntries(Object.entries(driverProfile.components).map(([id, value]) => [id, { ...value }]));
  Object.assign(configuredComponents, {
    governmentFee: { amountCents: 1000, costCents: 800 },
    serviceFee: { amountCents: 2000, costCents: 1000 },
    platformFee: { amountCents: 0, costCents: 0 },
    administrationFee: { amountCents: 300, costCents: 100 },
    processingFee: { amountCents: 400, costCents: 200 },
    convenienceFee: { amountCents: 700, costCents: 100 },
    paymentFee: { amountCents: 1000, costCents: 0 },
    priorityFee: { amountCents: 15000, costCents: 0 },
    expressFee: { amountCents: 30000, costCents: 0 },
    vipConciergeFee: { amountCents: 50000, costCents: 0 },
  });
  const activateProfileResponse = await fetch(`${baseUrl}/admin/pricing-profiles/drivers-licences`, {
    method: 'PATCH',
    headers: { ...financeHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: true, components: configuredComponents, vatTreatment: 'not-applicable', effectiveFrom: '2026-11-09' }),
  });
  assert.equal(activateProfileResponse.status, 200);

  const invalidDeliveryFeeOverride = await fetch(`${baseUrl}/admin/requests/${created.ref}/delivery-fee-override`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountCents: 0 }),
  });
  assert.equal(invalidDeliveryFeeOverride.status, 400, 'case-specific delivery fees must be positive valid cents');
  const unauthorizedDeliveryFeeOverride = await fetch(`${baseUrl}/admin/requests/${created.ref}/delivery-fee-override`, {
    method: 'PUT',
    headers: { ...financeHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountCents: 10000 }),
  });
  assert.equal(unauthorizedDeliveryFeeOverride.status, 403, 'finance read access alone cannot change a customer case');
  const deliveryFeeOverrideResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/delivery-fee-override`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountCents: 10000 }),
  });
  const deliveryFeeOverride = await deliveryFeeOverrideResponse.json();
  assert.equal(deliveryFeeOverrideResponse.status, 200, JSON.stringify(deliveryFeeOverride));
  assert.equal(deliveryFeeOverride.casePricingOverrides.deliveryFee.amountCents, 10000);
  assert.equal(deliveryFeeOverride.quoteReadiness.ready, true);
  assert.equal(deliveryFeeOverride.pricingResolution.preview.totalCents, 28100);
  assert.ok(deliveryFeeOverride.history.some((event) => event.message.includes('Case-only delivery fee R100.00')));
  const profileAfterCaseOverride = (await (await fetch(`${baseUrl}/admin/pricing-profiles`, { headers: adminHeaders })).json()).profiles.find((profile) => profile.serviceId === 'drivers-licences');
  assert.equal(profileAfterCaseOverride.components.deliveryFee.amountCents, null, 'a one-case fee must not change the shared pricing profile');

  const simulatorResponse = await fetch(`${baseUrl}/admin/pricing-preview`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: 'drivers-licences', serviceDetail: 'Existing driver / renewal', pricingPackage: 'priority' }),
  });
  const simulatedPricing = await simulatorResponse.json();
  assert.equal(simulatorResponse.status, 200, JSON.stringify(simulatedPricing));
  assert.equal(simulatedPricing.profilePreview, false);
  assert.equal(simulatedPricing.resolution.preview.totalCents, 18100);
  assert.equal(simulatedPricing.resolution.preview.contributionCents, 5430);
  assert.equal(simulatedPricing.estimatedCostCents, 1100);
  assert.equal(simulatedPricing.estimatedGrossMarginCents, 17000);

  const editedPreviewComponents = {
    ...configuredComponents,
    processingFee: { ...configuredComponents.processingFee, amountCents: 1400 },
  };
  const editedPreviewResponse = await fetch(`${baseUrl}/admin/pricing-preview`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'drivers-licences',
      serviceDetail: 'Existing driver / renewal',
      pricingPackage: 'priority',
      profilePreview: {
        components: editedPreviewComponents,
        vatTreatment: 'not-applicable',
        effectiveFrom: '2026-11-09',
      },
    }),
  });
  const editedPreview = await editedPreviewResponse.json();
  assert.equal(editedPreviewResponse.status, 200, JSON.stringify(editedPreview));
  assert.equal(editedPreview.profilePreview, true);
  assert.equal(editedPreview.resolution.preview.totalCents, 19100, 'the simulator must calculate from current unsaved component values');
  assert.equal(editedPreview.resolution.preview.contributionCents, 5730);
  assert.equal(editedPreview.estimatedCostCents, 1100);

  const unchangedPreviewResponse = await fetch(`${baseUrl}/admin/pricing-preview`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: 'drivers-licences', serviceDetail: 'Existing driver / renewal', pricingPackage: 'priority' }),
  });
  const unchangedPreview = await unchangedPreviewResponse.json();
  assert.equal(unchangedPreviewResponse.status, 200, JSON.stringify(unchangedPreview));
  assert.equal(unchangedPreview.profilePreview, false);
  assert.equal(unchangedPreview.resolution.preview.totalCents, 18100, 'preview overrides must not persist to the approved profile');

  const invalidQuoteConditions = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'Review the complete service scope.', conditions: ['one', 'two', 'three', 'four', 'five'], quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(invalidQuoteConditions.status, 400, 'quote terms outside the supported limits must not be silently truncated');

  const invalidQuoteExpiry = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'Confirmed service scope.', quoteValidUntil: '2099-12-31' }),
  });
  assert.equal(invalidQuoteExpiry.status, 409, 'an expiry date more than 90 days away must be rejected');
  assert.match((await invalidQuoteExpiry.json()).error, /1 to 90 days/);

  const quoteResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteNotes: 'Includes the confirmed service scope.',
      conditions: ['Price is based on the confirmed service scope.'],
    }),
  });
  const quoteDraft = await quoteResponse.json();
  assert.equal(quoteResponse.status, 200, JSON.stringify(quoteDraft));
  assert.equal(quoteDraft.status, 'Quote Preparation');
  assert.equal(quoteDraft.quote, undefined, 'draft creation must not publish a customer quote');
  assert.equal(quoteDraft.quoteDraft.approvalStatus, 'pending-approval');
  assert.match(quoteDraft.quoteDraft.quoteNumber, /^Q\d{4}-0001$/);
  assert.equal(quoteDraft.quoteDraft.validUntil, quoteValidUntil(), 'missing validity defaults to 14 days after issue');
  assert.equal(quoteDraft.quoteDraft.packageName, 'Priority');
  assert.deepEqual(quoteDraft.quoteDraft.conditions, ['Price is based on the confirmed service scope.']);
  assert.deepEqual(quoteDraft.quoteDraft.requiredDocuments, ['Copy of ID', 'Current licence', 'Proof of residence']);
  assert.equal(quoteDraft.quoteDraft.totalCents, 28100);
  assert.equal(quoteDraft.quoteDraft.casePricingOverrides.deliveryFee.amountCents, 10000);
  const financeDraftQueue = await (await fetch(`${baseUrl}/admin/requests`, { headers: financeHeaders })).json();
  assert.ok(!financeDraftQueue.requests.some((request) => request.ref === created.ref), 'Finance does not gain access to customer data while a quote is only a draft');
  const prematurePublish = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/publish`, {
    method: 'POST',
    headers: adminHeaders,
  });
  assert.equal(prematurePublish.status, 409, 'an unapproved draft must not be sent');
  const selfApprovalResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/approve`, {
    method: 'POST',
    headers: adminHeaders,
  });
  assert.equal(selfApprovalResponse.status, 409, 'the quote preparer cannot approve their own draft');
  const financeApprovalResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/approve`, {
    method: 'POST',
    headers: financeHeaders,
  });
  assert.equal(financeApprovalResponse.status, 403, 'finance read access does not imply customer-data or quote-approval access');
  const approvalResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/approve`, {
    method: 'POST',
    headers: { Authorization: 'Bearer '.concat(systemAdminToken) },
  });
  assert.equal(approvalResponse.status, 200);
  assert.equal((await approvalResponse.json()).quoteDraft.approvalStatus, 'approved');
  const publishResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/publish`, {
    method: 'POST',
    headers: adminHeaders,
  });
  const quoted = await publishResponse.json();
  assert.equal(publishResponse.status, 200, JSON.stringify(quoted));
  assert.equal(quoted.status, 'Awaiting Customer Decision');
  assert.equal(quoted.quoteCommunication.channel, 'portal');
  assert.equal(quoted.quoteAmount, 281);
  assert.equal(quoted.quote.totalCents, 28100);
  assert.equal(quoted.quote.pricingBasis, 'approved-profile-with-case-specific-delivery-fee');
  assert.equal(quoted.quote.contributionCents, 8430);
  assert.equal(quoted.quote.vatTreatment, 'not-applicable');
  assert.equal(quoted.quote.effectiveFrom, '2026-11-09');
  assert.equal(quoted.quote.profileName, "Driver's Licence Renewal");
  assert.equal(quoted.quote.packageName, 'Priority');
  assert.equal(quoted.quote.version, 1);
  assert.equal(quoted.pricingResolution.preview.ready, true);
  assert.equal(quoted.pricingResolution.preview.totalCents, quoted.quote.totalCents);
  assert.deepEqual(quoted.pricingResolution.preview.lines.map(({ componentId, amountCents }) => ({ componentId, amountCents })), quoted.quote.lines.map(({ componentId, amountCents }) => ({ componentId, amountCents })));
  assert.equal(Object.hasOwn(quoted.quote, 'estimatedCostCents'), false, 'operational staff must not see component cost data');

  const quotePdfResponse = await fetch(`${baseUrl}/requests/${created.ref}/quote.pdf`);
  assert.equal(quotePdfResponse.status, 200);
  assert.match(quotePdfResponse.headers.get('content-type'), /application\/pdf/);
  const quotePdf = Buffer.from(await quotePdfResponse.arrayBuffer()).toString('latin1');
  assert.match(quotePdf.slice(0, 8), /^%PDF-1\./);
  assert.ok((quotePdf.match(/\/Subtype \/Link/g) || []).length >= 5, 'the PDF should contain clickable decision and contact links');
  assert.ok(quotePdf.includes('/q/Q2026-0001/accept'), 'the PDF should link to the secure decision page');
  const firstActionToken = quoteActionToken(created.ref, quoted.quote, 'accept');
  const actionPreviewResponse = await fetch(`${baseUrl}/quote-decisions/${quoted.quote.quoteNumber}/accept?t=${encodeURIComponent(firstActionToken)}`);
  const actionPreview = await actionPreviewResponse.json();
  assert.equal(actionPreviewResponse.status, 200);
  assert.equal(actionPreviewResponse.headers.get('cache-control'), 'no-store, private');
  assert.equal(actionPreview.status, 'awaiting-decision');
  assert.equal(actionPreview.actionable, true);
  const statusToken = quoteActionToken(created.ref, quoted.quote, 'status');
  const readOnlyStatus = await fetch(`${baseUrl}/quote-decisions/${quoted.quote.quoteNumber}/status?t=${encodeURIComponent(statusToken)}`);
  const statusDetails = await readOnlyStatus.json();
  assert.equal(readOnlyStatus.status, 200);
  assert.equal(statusDetails.action, 'status');
  assert.equal(statusDetails.actionable, false, 'status links never allow a decision');
  const statusPost = await fetch(`${baseUrl}/quote-decisions/${quoted.quote.quoteNumber}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: statusToken }),
  });
  assert.equal(statusPost.status, 404, 'read-only status tokens cannot be posted as customer decisions');
  const signedPdfResponse = await fetch(`${baseUrl}/quote-decisions/${quoted.quote.quoteNumber}/accept.pdf?t=${encodeURIComponent(firstActionToken)}`);
  assert.equal(signedPdfResponse.status, 200);
  assert.match(signedPdfResponse.headers.get('content-type'), /application\/pdf/);
  assert.match(Buffer.from(await signedPdfResponse.arrayBuffer()).toString('latin1').slice(0, 8), /^%PDF-1\./);
  const auditBeforeConfirmation = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === created.ref);
  assert.equal(auditBeforeConfirmation.quoteActionAudit?.length || 0, 0, 'opening a confirmation link must not record a decision or audit event');

  const firstPublishedTracking = await (await fetch(`${baseUrl}/requests/${created.ref}`)).json();
  assert.equal(firstPublishedTracking.status, 'Your quote is ready');
  const quoteChangeResponse = await fetch(`${baseUrl}/requests/${created.ref}/quote-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteId: firstPublishedTracking.quoteBreakdown.id, quoteVersion: firstPublishedTracking.quoteBreakdown.version, message: 'Please explain the Priority package timing.' }),
  });
  const quoteChange = await quoteChangeResponse.json();
  assert.equal(quoteChangeResponse.status, 200);
  assert.equal(quoteChange.status, "We're revising your quote");
  const oldActionPreview = await (await fetch(`${baseUrl}/quote-decisions/${quoted.quote.quoteNumber}/accept?t=${encodeURIComponent(firstActionToken)}`)).json();
  assert.equal(oldActionPreview.status, 'updated', 'a change request invalidates earlier quote actions');
  const trackingDuringRevision = await (await fetch(`${baseUrl}/requests/${created.ref}`)).json();
  assert.equal(trackingDuringRevision.quoteAmount, null, 'the previous quote is hidden while a revision is being prepared');
  assert.equal(trackingDuringRevision.quoteBreakdown, null);

  const viewedAdminRecord = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === created.ref);
  assert.ok(viewedAdminRecord.quoteRevisionRequests.some((request) => request.message.includes('Priority package timing')));
  assert.ok(viewedAdminRecord.quoteActionAudit.some((event) => event.action === 'changes' && event.ip), 'staff audit records should include the change action and source IP');
  assert.ok(viewedAdminRecord.history.some((event) => event.message.includes('Customer viewed') && event.customerVisible === false), 'portal views are recorded for staff without exposing internal activity to the customer');
  const reopenQuoteResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation' }),
  });
  assert.equal(reopenQuoteResponse.status, 200);
  const trackingBeforeRevisedDraft = await (await fetch(`${baseUrl}/requests/${created.ref}`)).json();
  assert.equal(trackingBeforeRevisedDraft.quoteAmount, null, 're-entering quote preparation must not republish the previous quote');
  assert.equal(trackingBeforeRevisedDraft.quoteBreakdown, null);
  const revisedDraftResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteNotes: 'Includes the confirmed service scope and package timing.',
      conditions: ['Price is based on the confirmed service scope.'],
      quoteValidUntil: quoteValidUntil(),
    }),
  });
  assert.equal(revisedDraftResponse.status, 200);
  assert.equal((await revisedDraftResponse.json()).quoteDraft.version, 2);
  const revisedApprovalResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/approve`, {
    method: 'POST',
    headers: { Authorization: 'Bearer '.concat(systemAdminToken) },
  });
  assert.equal(revisedApprovalResponse.status, 200);
  const revisedPublishResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft/publish`, {
    method: 'POST',
    headers: adminHeaders,
  });
  const quotedRevision = await revisedPublishResponse.json();
  assert.equal(revisedPublishResponse.status, 200, JSON.stringify(quotedRevision));
  assert.equal(quotedRevision.quote.version, 2);
  assert.equal(Object.hasOwn(quotedRevision, 'quoteHistory'), false, 'quote history stays private to the API store');

  const updatedTrackingResponse = await fetch(`${baseUrl}/requests/${created.ref}`);
  const updatedTracking = await updatedTrackingResponse.json();
  assert.equal(updatedTracking.status, 'Your quote is ready');
  assert.equal(updatedTracking.quoteAmount, 281);
  assert.match(updatedTracking.quoteBreakdown.quoteNumber, /^Q\d{4}-0002$/);
  assert.equal(updatedTracking.quoteBreakdown.version, 2);
  assert.ok(updatedTracking.quoteBreakdown.generatedAt);
  assert.equal(updatedTracking.quoteBreakdown.totalCents, 28100);
  assert.equal(updatedTracking.quoteBreakdown.serviceName, "Driver's Licence Renewal");
  assert.equal(updatedTracking.quoteBreakdown.vatTreatment, 'not-applicable');
  assert.equal(Object.hasOwn(updatedTracking.quoteBreakdown, 'effectiveFrom'), false, 'internal pricing effective dates are not exposed in the customer portal');
  assert.equal(updatedTracking.quoteBreakdown.notes, 'Includes the confirmed service scope and package timing.');
  assert.deepEqual(updatedTracking.quoteBreakdown.conditions, ['Price is based on the confirmed service scope.']);
  assert.deepEqual(updatedTracking.quoteBreakdown.requiredDocuments, ['Copy of ID', 'Current licence', 'Proof of residence']);
  assert.equal(updatedTracking.quoteBreakdown.validUntil, quoteValidUntil());
  assert.equal(Object.hasOwn(updatedTracking.quoteBreakdown.lines[0], 'costCents'), false, 'customers must not see internal cost data');
  const viewedAdminRecordAfterRevision = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === created.ref);
  assert.ok(viewedAdminRecordAfterRevision.history.some((event) => event.message.includes('Customer viewed') && event.customerVisible === false), 'portal views are recorded for staff without exposing internal activity to the customer');
  const missingDeclineReason = await fetch(`${baseUrl}/requests/${created.ref}/quote-decision`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'decline', quoteId: updatedTracking.quoteBreakdown.id, quoteVersion: updatedTracking.quoteBreakdown.version }),
  });
  assert.equal(missingDeclineReason.status, 400, 'declining a quote requires a reason');
  const revisedActionToken = quoteActionToken(created.ref, quotedRevision.quote, 'accept');
  const revisedActionPreview = await (await fetch(`${baseUrl}/quote-decisions/${quotedRevision.quote.quoteNumber}/accept?t=${encodeURIComponent(revisedActionToken)}`)).json();
  assert.equal(revisedActionPreview.status, 'awaiting-decision');
  const quoteDecisionResponse = await fetch(`${baseUrl}/quote-decisions/${quotedRevision.quote.quoteNumber}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: revisedActionToken }),
  });
  const signedDecision = await quoteDecisionResponse.json();
  assert.equal(quoteDecisionResponse.status, 200, JSON.stringify(signedDecision));
  assert.equal(signedDecision.status, 'accepted');
  const acceptedTracking = await (await fetch(`${baseUrl}/requests/${created.ref}`)).json();
  assert.equal(acceptedTracking.status, 'Quote approval recorded');
  assert.equal(acceptedTracking.quoteDecision, 'accepted');
  assert.equal(acceptedTracking.quoteDecisionVersion, 2);
  assert.ok(acceptedTracking.quoteDecisionAt);
  const completedActionPreview = await (await fetch(`${baseUrl}/quote-decisions/${quotedRevision.quote.quoteNumber}/accept?t=${encodeURIComponent(revisedActionToken)}`)).json();
  assert.equal(completedActionPreview.status, 'accepted');
  assert.equal(completedActionPreview.actionable, false, 'a decided quote must show its current state instead of another action');
  const acceptedPdfResponse = await fetch(`${baseUrl}/quote-decisions/${quotedRevision.quote.quoteNumber}/accept.pdf?t=${encodeURIComponent(revisedActionToken)}`);
  assert.equal(acceptedPdfResponse.status, 200, 'a decided quote remains downloadable using its signed link');
  const acceptedPdf = Buffer.from(await acceptedPdfResponse.arrayBuffer()).toString('latin1');
  assert.match(acceptedPdf.slice(0, 8), /^%PDF-1\./);
  assert.ok(!acceptedPdf.includes('Accept quote'), 'a decided quote PDF should show its current status instead of decision actions');
  const replayedActionResponse = await fetch(`${baseUrl}/quote-decisions/${quotedRevision.quote.quoteNumber}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: revisedActionToken }),
  });
  assert.equal(replayedActionResponse.status, 409, 'a signed action cannot be replayed after its first successful use');
  const duplicateDecisionResponse = await fetch(`${baseUrl}/requests/${created.ref}/quote-decision`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'decline', quoteId: updatedTracking.quoteBreakdown.id, quoteVersion: updatedTracking.quoteBreakdown.version, declineReason: 'too-expensive' }),
  });
  assert.equal(duplicateDecisionResponse.status, 409, 'a quote decision can be recorded only once');
  const acceptedRequest = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === created.ref);
  assert.equal(acceptedRequest.status, 'Quote Accepted');
  assert.equal(acceptedRequest.department, 'Finance');
  assert.equal(acceptedRequest.queue, 'Payment Setup Required');

  const financeQueueResponse = await fetch(`${baseUrl}/admin/requests`, { headers: financeHeaders });
  const financeQueue = await financeQueueResponse.json();
  assert.equal(financeQueueResponse.status, 200);
  assert.deepEqual(financeQueue.requests.map((request) => request.ref), [created.ref], 'Finance can view only accepted quotes that need payment setup');
  const prematureFulfilmentResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Work in Progress', paymentStatus: 'paid' }),
  });
  assert.equal(prematureFulfilmentResponse.status, 400, 'callers cannot set a payment state directly');

  const csvResponse = await fetch(`${baseUrl}/admin/requests.csv`, { headers: adminHeaders });
  assert.equal(csvResponse.status, 200);
  assert.match(await csvResponse.text(), new RegExp(created.ref));
  const financeSummaryResponse = await fetch(`${baseUrl}/admin/finance/summary`, { headers: financeHeaders });
  const financeSummary = await financeSummaryResponse.json();
  const driverSummary = financeSummary.services.find((service) => service.serviceId === 'drivers-licences');
  assert.equal(driverSummary.quotedCents, 28100);
  assert.equal(driverSummary.estimatedCostCents, null, 'the case-only delivery fee has no approved cost amount');
  assert.equal(driverSummary.estimatedGrossMarginCents, null, 'margin is not reported until the case-only delivery cost is known');

  const checkoutResponse = await fetch(`${baseUrl}/requests/${created.ref}/payfast-checkout`, { method: 'POST' });
  const checkout = await checkoutResponse.json();
  assert.equal(checkoutResponse.status, 200, JSON.stringify(checkout));
  assert.equal(checkout.action, 'https://sandbox.payfast.co.za/eng/process');
  assert.equal(checkout.fields.amount, '281.00');
  assert.equal(checkout.fields.m_payment_id, created.ref);
  const wrongAmountNotification = {
    merchant_id: '10000100',
    m_payment_id: created.ref,
    pf_payment_id: 'test-payment-wrong-amount',
    payment_status: 'COMPLETE',
    amount_gross: '180.99',
  };
  wrongAmountNotification.signature = payFastSignature(wrongAmountNotification, 'test-passphrase');
  const wrongAmountResponse = await fetch(`${baseUrl}/payments/payfast/itn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(wrongAmountNotification),
  });
  assert.equal(wrongAmountResponse.status, 400, 'a mismatched payment amount must not release fulfilment');

  const paymentNotification = { ...wrongAmountNotification, pf_payment_id: 'test-payment-verified', amount_gross: '281.00' };
  paymentNotification.signature = payFastSignature(paymentNotification, 'test-passphrase');
  const paymentResponse = await fetch(`${baseUrl}/payments/payfast/itn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(paymentNotification),
  });
  assert.equal(paymentResponse.status, 200, await paymentResponse.text());
  const paidTracking = await (await fetch(`${baseUrl}/requests/${created.ref}`)).json();
  assert.equal(paidTracking.paymentStatus, 'paid');
  assert.equal(paidTracking.status, "We're processing your request");
  assert.equal(paidTracking.journeyStage, 'work');
  const duplicatePaymentResponse = await fetch(`${baseUrl}/payments/payfast/itn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(paymentNotification),
  });
  assert.equal(duplicatePaymentResponse.status, 200, 'a verified duplicate notification must be idempotent');

  const noDocumentsForm = new FormData();
  noDocumentsForm.append('name', 'Document Workflow Test');
  noDocumentsForm.append('phone', '083 555 0102');
  noDocumentsForm.append('suburb', 'Johannesburg');
  noDocumentsForm.append('services', 'drivers-licences');
  noDocumentsForm.append('serviceDetails', JSON.stringify({ 'drivers-licences': 'Existing driver / renewal' }));
  noDocumentsForm.append('consent', 'true');
  const noDocumentsCreated = await (await fetch(`${baseUrl}/requests`, { method: 'POST', body: noDocumentsForm })).json();
  const reviewResponse = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Under Review' }),
  });
  assert.equal(reviewResponse.status, 200);
  const requestDocumentsResponse = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Awaiting Documents', requestedDocuments: ['Copy of ID', 'Current licence', 'Proof of residence'] }),
  });
  const requestDocuments = await requestDocumentsResponse.json();
  assert.equal(requestDocumentsResponse.status, 200, `${JSON.stringify(requestDocuments)}\n${output}`);
  assert.equal(requestDocuments.queue, 'Awaiting Documents');
  const uploadForm = new FormData();
  uploadForm.append('documentLabels', JSON.stringify(['Copy of ID', 'Current licence', 'Proof of residence']));
  uploadForm.append('documents', new Blob(['requested test document'], { type: 'application/pdf' }), 'id.pdf');
  uploadForm.append('documents', new Blob(['current licence evidence'], { type: 'application/pdf' }), 'licence.pdf');
  uploadForm.append('documents', new Blob(['proof of residence evidence'], { type: 'application/pdf' }), 'residence.pdf');
  const uploadedResponse = await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}/documents`, { method: 'POST', body: uploadForm });
  const uploaded = await uploadedResponse.json();
  assert.equal(uploadedResponse.status, 200, JSON.stringify(uploaded));
  assert.equal(uploaded.status, "We're reviewing your details");
  assert.deepEqual(uploaded.requestedDocuments, []);
  const uploadedAdminRecord = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === noDocumentsCreated.ref);
  assert.equal(uploadedAdminRecord.status, 'Under Review');
  assert.equal(uploadedAdminRecord.department, 'Customer Support');
  assert.equal(uploadedAdminRecord.customerTasks.find((task) => task.type === 'document').status, 'response-received');

  const supportingUploadForm = new FormData();
  supportingUploadForm.append('documentLabels', JSON.stringify(['Additional supporting documents']));
  supportingUploadForm.append('requestedDocumentLabels', JSON.stringify([]));
  supportingUploadForm.append('documents', new Blob(['supporting test document'], { type: 'application/pdf' }), 'supporting.pdf');
  const supportingUploadResponse = await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}/documents`, { method: 'POST', body: supportingUploadForm });
  const supportingUpload = await supportingUploadResponse.json();
  assert.equal(supportingUploadResponse.status, 200, JSON.stringify(supportingUpload));
  assert.equal(supportingUpload.status, "We're reviewing your details", 'supporting uploads do not change the workflow stage');
  assert.ok(supportingUpload.documents.some((document) => document.label === 'Supporting document: Additional supporting documents'));
  assert.ok(supportingUpload.timeline.some((event) => event.message === 'You sent additional supporting documents. Our team will review them.'));

  const invalidTaskDate = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/customer-tasks`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'appointment', title: 'Choose a test centre', message: 'Tell us which centre you prefer.', dueDate: '2026-02-31' }),
  });
  assert.equal(invalidTaskDate.status, 400, 'customer tasks reject impossible dates');
  const customerTaskResponse = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/customer-tasks`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'information', title: 'Confirm testing centre', message: 'Which testing centre would you prefer?' }),
  });
  const createdTaskRecord = await customerTaskResponse.json();
  assert.equal(customerTaskResponse.status, 201, JSON.stringify(createdTaskRecord));
  const customerTask = createdTaskRecord.customerTasks.find((task) => task.title === 'Confirm testing centre');
  assert.equal(customerTask.status, 'waiting-on-customer');
  assert.equal(createdTaskRecord.notificationStatus, 'no-email');
  const customerTaskTracking = await (await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}`)).json();
  assert.equal(customerTaskTracking.customerTasks.find((task) => task.id === customerTask.id).message, 'Which testing centre would you prefer?');
  assert.ok(customerTaskTracking.timeline.some((event) => event.message === 'WeQ4U asked you: Confirm testing centre'));
  const customerResponse = await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}/customer-tasks/${customerTask.id}/response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: 'Please book the Johannesburg centre.' }),
  });
  const answeredTaskRecord = await customerResponse.json();
  assert.equal(customerResponse.status, 200, JSON.stringify(answeredTaskRecord));
  assert.equal(answeredTaskRecord.customerTasks.find((task) => task.id === customerTask.id).status, 'response-received');
  assert.equal(answeredTaskRecord.customerTasks.find((task) => task.id === customerTask.id).response, 'Please book the Johannesburg centre.');
  const completeTaskResponse = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/customer-tasks/${customerTask.id}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(completeTaskResponse.status, 200);
  assert.equal((await completeTaskResponse.json()).customerTasks.find((task) => task.id === customerTask.id).status, 'completed');

  const secondRequestForAssessment = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === noDocumentsCreated.ref);
  const documentByLabel = new Map(secondRequestForAssessment.documents.map((document) => [document.label, document]));
  const assessmentDocuments = secondRequestForAssessment.serviceDefinition.requirements.map((requirement) => ({
    ...requirement,
    status: 'verified',
    evidenceDocumentId: documentByLabel.get(requirement.label)?.id || '',
    note: documentByLabel.get(requirement.label) ? '' : 'Integration-test scope confirmation.',
  }));
  const secondAssessmentResponse = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: true,
      eligibility: 'eligible',
      governmentReadiness: 'ready',
      requirements: assessmentDocuments,
      documentReviews: secondRequestForAssessment.documents.map((document) => ({ documentId: document.id, status: 'verified' })),
    }),
  });
  assert.equal(secondAssessmentResponse.status, 200);
  assert.equal((await secondAssessmentResponse.json()).serviceAssessmentReady, true);

  const declinedQuotePrep = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation', serviceValidated: true, quoteNotes: 'Review the complete service scope.', quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(declinedQuotePrep.status, 200, 'the second request can enter quote preparation for the decline-path test');
  const declinedQuoteDraftResponse = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'Confirmed service scope.', quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(declinedQuoteDraftResponse.status, 200);
  const declineDraftApproval = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/quote-draft/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${systemAdminToken}` },
  });
  assert.equal(declineDraftApproval.status, 200);
  const declinedQuotePublication = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/quote-draft/publish`, {
    method: 'POST',
    headers: adminHeaders,
  });
  assert.equal(declinedQuotePublication.status, 200);
  const firstDeclinedPortalQuote = await (await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}`)).json();
  const signedChangesToken = quoteActionToken(noDocumentsCreated.ref, firstDeclinedPortalQuote.quoteBreakdown, 'changes');
  const changesPreview = await (await fetch(`${baseUrl}/quote-decisions/${firstDeclinedPortalQuote.quoteBreakdown.quoteNumber}/changes?t=${encodeURIComponent(signedChangesToken)}`)).json();
  assert.equal(changesPreview.status, 'awaiting-decision');
  const missingChangeMessage = await fetch(`${baseUrl}/quote-decisions/${firstDeclinedPortalQuote.quoteBreakdown.quoteNumber}/changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: signedChangesToken }),
  });
  assert.equal(missingChangeMessage.status, 400, 'a quote change link requires a customer message');
  const signedChangesResponse = await fetch(`${baseUrl}/quote-decisions/${firstDeclinedPortalQuote.quoteBreakdown.quoteNumber}/changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: signedChangesToken, message: 'Please confirm whether the booking fee is included.' }),
  });
  const signedChangesResult = await signedChangesResponse.json();
  assert.equal(signedChangesResponse.status, 200, JSON.stringify(signedChangesResult));
  assert.equal(signedChangesResult.status, 'updated');
  const revisionRequired = await (await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}`)).json();
  assert.equal(revisionRequired.status, "We're revising your quote");
  assert.equal(revisionRequired.quoteBreakdown, null);
  const reopenDeclinedQuote = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation' }),
  });
  assert.equal(reopenDeclinedQuote.status, 200);
  const revisedDeclineDraft = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'Revised quote after the customer change request.', quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(revisedDeclineDraft.status, 200);
  const revisedDeclineApproval = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/quote-draft/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${systemAdminToken}` },
  });
  assert.equal(revisedDeclineApproval.status, 200);
  const revisedDeclinePublication = await fetch(`${baseUrl}/admin/requests/${noDocumentsCreated.ref}/quote-draft/publish`, {
    method: 'POST',
    headers: adminHeaders,
  });
  assert.equal(revisedDeclinePublication.status, 200);
  const declinedPortalQuote = await (await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}`)).json();
  const staleDeclineResponse = await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}/quote-decision`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'decline', quoteId: declinedPortalQuote.quoteBreakdown.id, quoteVersion: declinedPortalQuote.quoteBreakdown.version + 1, declineReason: 'too-expensive' }),
  });
  assert.equal(staleDeclineResponse.status, 409, 'decisions cannot be recorded against a different quote version');
  const missingOtherDetailResponse = await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}/quote-decision`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'decline', quoteId: declinedPortalQuote.quoteBreakdown.id, quoteVersion: declinedPortalQuote.quoteBreakdown.version, declineReason: 'other' }),
  });
  assert.equal(missingOtherDetailResponse.status, 400, 'the other decline reason needs a short explanation');
  const signedDeclineToken = quoteActionToken(noDocumentsCreated.ref, declinedPortalQuote.quoteBreakdown, 'decline');
  const signedMissingReason = await fetch(`${baseUrl}/quote-decisions/${declinedPortalQuote.quoteBreakdown.quoteNumber}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: signedDeclineToken }),
  });
  assert.equal(signedMissingReason.status, 400, 'the signed decline flow requires a reason');
  const declineResponse = await fetch(`${baseUrl}/quote-decisions/${declinedPortalQuote.quoteBreakdown.quoteNumber}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: signedDeclineToken, declineReason: 'other', declineDetails: 'I need to review my budget.' }),
  });
  const signedDecline = await declineResponse.json();
  assert.equal(declineResponse.status, 200, JSON.stringify(signedDecline));
  const declinedTracking = await (await fetch(`${baseUrl}/requests/${noDocumentsCreated.ref}`)).json();
  assert.equal(declinedTracking.status, 'Quote decision recorded');
  assert.equal(declinedTracking.quoteDecisionReason, 'other');
  assert.equal(declinedTracking.quoteDecisionReasonDetails, 'I need to review my budget.');
  const declinedAdminRecord = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === noDocumentsCreated.ref);
  assert.ok(declinedAdminRecord.quoteActionAudit.some((event) => event.action === 'decline' && event.at && event.ip));
  const replayedDecline = await fetch(`${baseUrl}/quote-decisions/${declinedPortalQuote.quoteBreakdown.quoteNumber}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: signedDeclineToken, declineReason: 'other', declineDetails: 'Repeated action.' }),
  });
  assert.equal(replayedDecline.status, 409);

  const learnerForm = new FormData();
  learnerForm.append('name', 'Learner Estimate Test');
  learnerForm.append('phone', '083 555 0102');
  learnerForm.append('suburb', 'Johannesburg');
  learnerForm.append('services', 'drivers-licences');
  learnerForm.append('serviceDetails', JSON.stringify({ 'drivers-licences': 'New driver licence test' }));
  learnerForm.append('documentLabels', JSON.stringify(['drivers-licences:id-copy']));
  learnerForm.append('consent', 'true');
  learnerForm.append('documents', new Blob(['learner evidence'], { type: 'application/pdf' }), 'learner.pdf');
  const learnerCreatedResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: learnerForm });
  const learnerCreated = await learnerCreatedResponse.json();
  assert.equal(learnerCreatedResponse.status, 201, JSON.stringify(learnerCreated));
  const learnerAdmin = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === learnerCreated.ref);
  assert.equal(learnerAdmin.serviceCode, 'DL-NEW-TEST');
  assert.deepEqual(learnerAdmin.serviceAssessment.requirements.map(({ id, status }) => ({ id, status })), [
    { id: 'id-copy', status: 'received' },
    { id: 'learner-licence', status: 'missing' },
    { id: 'booking-confirmation', status: 'missing' },
  ]);
  const learnerDoc = learnerAdmin.documents[0];
  const waivedRequiredRequirement = await fetch(`${baseUrl}/admin/requests/${learnerCreated.ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: true,
      eligibility: 'eligible',
      governmentReadiness: 'ready',
      requirements: [
        { id: 'id-copy', label: 'Copy of ID', required: true, status: 'verified', evidenceDocumentId: learnerDoc.id },
        { id: 'learner-licence', label: "Learner's licence", required: true, status: 'not-applicable', note: 'Waive for test' },
        { id: 'booking-confirmation', label: 'Booking confirmation', required: true, status: 'verified' },
      ],
      documentReviews: [{ documentId: learnerDoc.id, status: 'verified' }],
    }),
  });
  assert.equal(waivedRequiredRequirement.status, 400, 'required definition items cannot be waived at case level');
  const learnerAssessmentResponse = await fetch(`${baseUrl}/admin/requests/${learnerCreated.ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: true,
      eligibility: 'eligible',
      governmentReadiness: 'ready',
      requirements: [
        { id: 'id-copy', label: 'Copy of ID', required: true, status: 'verified', evidenceDocumentId: learnerDoc.id },
        { id: 'learner-licence', label: "Learner's licence", required: true, status: 'verified', note: 'Verified against customer-provided details.' },
        { id: 'booking-confirmation', label: 'Booking confirmation', required: true, status: 'verified', note: 'Test booking confirmed for this integration case.' },
      ],
      documentReviews: [{ documentId: learnerDoc.id, status: 'verified' }],
    }),
  });
  assert.equal(learnerAssessmentResponse.status, 200);
  const learnerQuoteStage = await fetch(`${baseUrl}/admin/requests/${learnerCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Under Review', serviceValidated: true }),
  });
  assert.equal(learnerQuoteStage.status, 200);
  const learnerPreparation = await fetch(`${baseUrl}/admin/requests/${learnerCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation' }),
  });
  assert.equal(learnerPreparation.status, 200);
  const learnerDraftResponse = await fetch(`${baseUrl}/admin/requests/${learnerCreated.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'This estimate covers WeQ4U coordination only.', quoteValidUntil: quoteValidUntil() }),
  });
  const learnerDraft = await learnerDraftResponse.json();
  assert.equal(learnerDraftResponse.status, 409, 'the learner checklist and pricing are not approved for a customer quote');
  assert.match(learnerDraft.error, /not approved for customer quoting|active, approved pricing profile/i);
  const learnerRegistryReview = await fetch(`${baseUrl}/admin/requests/${learnerCreated.ref}/registry-review.pdf`, { headers: adminHeaders });
  assert.equal(learnerRegistryReview.status, 200);
  assert.match(learnerRegistryReview.headers.get('content-type'), /application\/pdf/);

  const rewriteForm = new FormData();
  rewriteForm.append('name', 'Learner Rewrite Quote Test');
  rewriteForm.append('phone', '083 555 0103');
  rewriteForm.append('suburb', 'Johannesburg');
  rewriteForm.append('services', 'drivers-licences');
  rewriteForm.append('serviceDetails', JSON.stringify({ 'drivers-licences': 'Learner licence rewrite' }));
  rewriteForm.append('consent', 'true');
  const rewriteCreatedResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: rewriteForm });
  const rewriteCreated = await rewriteCreatedResponse.json();
  assert.equal(rewriteCreatedResponse.status, 201, JSON.stringify(rewriteCreated));
  const rewriteAssessment = await fetch(`${baseUrl}/admin/requests/${rewriteCreated.ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: true,
      eligibility: 'eligible',
      governmentReadiness: 'ready',
      requirements: [{ id: 'rewrite-scope', label: 'Rewrite scope confirmed', required: true, status: 'verified', note: 'Customer confirmed this is a rewrite request.' }],
      notes: 'Checked',
      documentReviews: [],
    }),
  });
  assert.equal(rewriteAssessment.status, 200);
  const rewriteAssessmentResult = await rewriteAssessment.json();
  assert.equal(rewriteAssessmentResult.serviceAssessmentReady, true, JSON.stringify(rewriteAssessmentResult.serviceAssessment));
  const rewritePreparation = await fetch(`${baseUrl}/admin/requests/${rewriteCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Under Review' }),
  });
  assert.equal(rewritePreparation.status, 200);
  const rewriteUnderReview = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === rewriteCreated.ref);
  assert.ok(rewriteUnderReview.allowedNextStatuses.includes('Quote Preparation'), JSON.stringify({ ready: rewriteUnderReview.serviceAssessmentReady, assessment: rewriteUnderReview.serviceAssessment, requestedDocuments: rewriteUnderReview.requestedDocuments }));
  const rewriteQuoteStage = await fetch(`${baseUrl}/admin/requests/${rewriteCreated.ref}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation' }),
  });
  assert.equal(rewriteQuoteStage.status, 200, await rewriteQuoteStage.text());
  const caseSpecificQuoteBody = {
    manualPricing: true,
    manualVatTreatment: 'inclusive',
    manualQuoteLines: [{ componentId: 'rewrite-service', label: 'Case-specific service fee', amountCents: 25000, sourceNote: 'Test-only Finance schedule reference.' }],
    quoteNotes: 'This is a test quote based on the confirmed case scope.',
    quoteValidUntil: quoteValidUntil(),
  };
  const caseSpecificQuote = await fetch(`${baseUrl}/admin/requests/${rewriteCreated.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(caseSpecificQuoteBody),
  });
  assert.equal(caseSpecificQuote.status, 409, 'case-specific amounts are blocked regardless of a staff-provided source note');
  assert.match((await caseSpecificQuote.json()).error, /Case-specific pricing is disabled/);
  const unavailableVariantQuote = await fetch(`${baseUrl}/admin/requests/${rewriteCreated.ref}/quote-draft`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNotes: 'This service variant is pending registry confirmation.', quoteValidUntil: quoteValidUntil() }),
  });
  assert.equal(unavailableVariantQuote.status, 409, 'an unapproved variant must be routed to internal review rather than quoted');
  const rewriteRegistryReview = await fetch(`${baseUrl}/admin/requests/${rewriteCreated.ref}/registry-review.pdf`, { headers: adminHeaders });
  assert.equal(rewriteRegistryReview.status, 200);
  assert.match(rewriteRegistryReview.headers.get('content-type'), /application\/pdf/);

  const courierForm = new FormData();
  courierForm.append('name', 'Courier Request Test');
  courierForm.append('phone', '083 555 0104');
  courierForm.append('suburb', 'Johannesburg');
  courierForm.append('services', 'door-to-door-courier');
  courierForm.append('serviceDetails', JSON.stringify({ 'door-to-door-courier': 'Collect and deliver documents' }));
  courierForm.append('courierCollection', 'true');
  courierForm.append('courierDelivery', 'true');
  courierForm.append('consent', 'true');
  const courierCreatedResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: courierForm });
  const courierCreated = await courierCreatedResponse.json();
  assert.equal(courierCreatedResponse.status, 201, JSON.stringify(courierCreated));
  const courierAdmin = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === courierCreated.ref);
  assert.deepEqual(courierAdmin.services, ['door-to-door-courier']);
  assert.equal(courierAdmin.courierCollection, true);
  assert.equal(courierAdmin.courierDelivery, true);

  const registryScenarios = [
    { service: 'drivers-licences', detail: 'Learner licence test', useDefinitionRequirements: true },
    { service: 'drivers-licences', detail: 'Replacement' },
    { service: 'drivers-licences', detail: 'Temporary licence' },
    { service: 'prdps', detail: 'New PrDP', useDefinitionRequirements: true },
    { service: 'prdps', detail: 'PrDP renewal' },
    { service: 'roadworthy-certificates', detail: 'Book a roadworthy test' },
    { service: 'roadworthy-certificates', detail: 'Roadworthy for a sale or transfer' },
    { service: 'licence-disc-renewals', detail: 'My vehicle' },
    { service: 'licence-disc-renewals', detail: 'A business or fleet vehicle' },
    { service: 'vehicle-registrations', detail: 'New registration' },
    { service: 'vehicle-registrations', detail: 'Vehicle registration from bank finance' },
    { service: 'vehicle-registrations', detail: 'Vehicle registration from dealership' },
    { service: 'change-of-ownership', detail: 'Private sale' },
    { service: 'change-of-ownership', detail: 'Vehicle financed through a bank' },
    { service: 'change-of-ownership', detail: 'Dealership sale' },
    { service: 'duplicate-documents', detail: 'Lost or stolen' },
    { service: 'duplicate-documents', detail: 'Damaged' },
    { service: 'traffic-register', detail: 'Apply for a traffic register number' },
    { service: 'door-to-door-courier', detail: 'Collect and deliver documents' },
    {
      service: 'vehicle-ownership-onboarding',
      detail: 'Private sale',
      workItems: ['registration'],
      vehicleContext: { purchaseType: 'Private sale', financeStage: 'I did not use vehicle finance' },
    },
  ];
  for (const [index, scenario] of registryScenarios.entries()) {
    const form = new FormData();
    form.append('name', `Case Quote Test ${index + 1}`);
    form.append('phone', `083 555 ${String(2000 + index)}`);
    form.append('suburb', 'Johannesburg');
    form.append('services', scenario.service);
    form.append('serviceDetails', JSON.stringify({ [scenario.service]: scenario.detail }));
    form.append('consent', 'true');
    if (scenario.workItems) form.append('workItems', JSON.stringify(scenario.workItems));
    if (scenario.vehicleContext) form.append('vehicleContext', JSON.stringify(scenario.vehicleContext));
    const createdResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: form });
    const created = await createdResponse.json();
    assert.equal(createdResponse.status, 201, `${scenario.service} / ${scenario.detail}: ${JSON.stringify(created)}`);
    const requestRecord = (await (await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders })).json()).requests.find((request) => request.ref === created.ref);
    const requirements = scenario.useDefinitionRequirements
      ? requestRecord.serviceAssessment.requirements.map((requirement) => ({
        id: requirement.id,
        label: requirement.label,
        required: requirement.required,
        status: 'verified',
        note: 'Synthetic scope verification for API workflow test.',
      }))
      : [{ id: `scope-${index}`, label: 'Case scope confirmation', required: true, status: 'verified', note: 'Synthetic test scope only.' }];
    const assessmentResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/service-assessment`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirementsReviewed: true,
        eligibility: 'eligible',
        governmentReadiness: 'ready',
        requirements,
        notes: 'Synthetic test scope confirmation; no authority rule or commercial price is implied.',
        documentReviews: [],
      }),
    });
    assert.equal(assessmentResponse.status, 200, `${scenario.service} assessment`);
    const underReviewResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Under Review' }),
    });
    assert.equal(underReviewResponse.status, 200, `${scenario.service} review stage`);
    const quotePreparationResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Quote Preparation' }),
    });
    assert.equal(quotePreparationResponse.status, 200, `${scenario.service} quote stage`);
    const draftResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/quote-draft`, {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteNotes: 'Synthetic quote-flow test only; not a commercial offer.',
        quoteValidUntil: quoteValidUntil(),
      }),
    });
    const draft = await draftResponse.json();
    assert.equal(draftResponse.status, 409, `${scenario.service} / ${scenario.detail}: ${JSON.stringify(draft)}`);
    assert.match(draft.error, /not approved|not configured|active, approved pricing|service and variant/i);
    if (scenario.service === 'vehicle-ownership-onboarding') {
      const reviewResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/registry-review.pdf`, { headers: adminHeaders });
      assert.equal(reviewResponse.status, 200);
      assert.match(reviewResponse.headers.get('content-type'), /application\/pdf/);
    }
  }

  const document = updated.documents[0];
  const downloadResponse = await fetch(`${baseUrl}/admin/requests/${created.ref}/documents/${document.id}`, { headers: adminHeaders });
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'temporary test attachment');

  const encryptedStore = await readFile(path.join(dataDirectory, 'requests.enc'));
  assert.equal(encryptedStore.includes(Buffer.from('Integration Test')), false, 'request records must be encrypted at rest');
  const encryptedFiles = await readdir(path.join(dataDirectory, 'documents'));
  assert.equal(encryptedFiles.length, 9);
  const encryptedDocument = await readFile(path.join(dataDirectory, 'documents', encryptedFiles[0]));
  assert.equal(encryptedDocument.includes(Buffer.from('temporary test attachment')), false, 'uploaded documents must be encrypted at rest');

  const driverServiceScenarios = [
    { detail: 'Learner licence test', code: 'DL-LEARNER-APPLICATION', documentIds: ['id-copy', 'booking-confirmation'], labels: ['Copy of ID', 'Booking confirmation'] },
    { detail: 'New driver licence test', code: 'DL-NEW-TEST', documentIds: ['id-copy', 'learner-licence', 'booking-confirmation'], labels: ['Copy of ID', "Learner's licence", 'Booking confirmation'] },
    { detail: 'Existing driver / renewal', code: 'DL-RENEWAL', documentIds: ['id-copy', 'existing-licence', 'proof-of-residence'], labels: ['Copy of ID', 'Current licence', 'Proof of residence'] },
    { detail: 'Replacement', code: 'DL-REPLACEMENT', documentIds: [], labels: [] },
    { detail: 'Temporary licence', code: 'DL-TEMPORARY', documentIds: [], labels: [] },
  ];
  for (const [index, scenario] of driverServiceScenarios.entries()) {
    const form = new FormData();
    form.append('name', `Driver service upload ${index + 1}`);
    form.append('phone', `083 555 01${String(index + 10).slice(-2)}`);
    form.append('suburb', 'Johannesburg');
    form.append('services', 'drivers-licences');
    form.append('serviceDetails', JSON.stringify({ 'drivers-licences': scenario.detail }));
    form.append('documentLabels', JSON.stringify(scenario.documentIds.map((id) => `drivers-licences:${id}`)));
    form.append('consent', 'true');
    for (const documentId of scenario.documentIds) {
      form.append('documents', new Blob([`Synthetic ${scenario.detail} ${documentId}`], { type: 'application/pdf' }), `${documentId}.pdf`);
    }

    const response = await fetch(`${baseUrl}/requests`, { method: 'POST', body: form });
    const submitted = await response.json();
    assert.equal(response.status, 201, `${scenario.detail}: ${JSON.stringify(submitted)}`);
    const requestsResponse = await fetch(`${baseUrl}/admin/requests`, { headers: adminHeaders });
    const requests = await requestsResponse.json();
    const request = requests.requests.find((item) => item.ref === submitted.ref);
    assert.equal(request.serviceCode, scenario.code);
    assert.deepEqual(request.documents.map((document) => document.label), scenario.labels);
    assert.ok(request.documents.every((document) => document.reviewState === 'pending'));
  }
});

test('local development startup seeds the published price card and profile edits retain history', async (t) => {
  const port = await findPort();
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'weq4u-pricing-seed-test-'));
  const token = 'test-only-pricing-seed-token';
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: apiDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      FOUNDER_API_TOKEN: token,
      DATA_ENCRYPTION_KEY: '2'.repeat(64),
      PRIVATE_STORAGE_DIR: dataDirectory,
      STOREFRONT_ORIGIN: 'http://localhost:3000',
      ADMIN_ORIGIN: 'http://localhost:3001',
      PRICING_SEED_ENABLED: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}/api`;
  t.after(async () => {
    if (child.exitCode === null) {
      await stopChild(child);
    }
    await rm(dataDirectory, { recursive: true, force: true });
  });
  await waitForApi(baseUrl, child, () => output);
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch(`${baseUrl}/admin/pricing-profiles`, { headers });
  assert.equal(response.status, 200);
  const { profiles } = await response.json();
  const driverProfile = profiles.find((profile) => profile.serviceId === 'drivers-licences');
  assert.equal(driverProfile.status, 'active');
  assert.equal(driverProfile.version, 2);
  assert.equal(driverProfile.effectiveFrom, '2026-11-01');
  assert.equal(driverProfile.components.governmentFee.amountCents
    + driverProfile.components.processingFee.amountCents
    + driverProfile.components.platformFee.amountCents
    + driverProfile.components.convenienceFee.amountCents
    + driverProfile.components.paymentFee.amountCents, 45000);
  const changedComponents = { ...driverProfile.components, ...{
    governmentFee: { ...driverProfile.components.governmentFee, costCents: 5000 },
  } };
  const updateResponse = await fetch(`${baseUrl}/admin/pricing-profiles/drivers-licences`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      active: true,
      components: changedComponents,
      vatTreatment: driverProfile.vatTreatment,
      effectiveFrom: driverProfile.effectiveFrom,
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updatedProfile = (await updateResponse.json()).profile;
  assert.equal(updatedProfile.version, 3);
  assert.equal(updatedProfile.versionHistory[0].version, 2);
  assert.equal(updatedProfile.versionHistory[0].components.governmentFee.costCents, null);
});

test('local quote-demo requests are seeded once and persist across API restarts', async (t) => {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'weq4u-quote-demo-test-'));
  const children = [];
  const token = 'test-only-quote-demo-persistence-token';
  const startApi = async () => {
    const port = await findPort();
    const child = spawn(process.execPath, ['src/index.js'], {
      cwd: apiDirectory,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        QUOTE_DEMO_SEED_ENABLED: 'true',
        ADMIN_API_TOKEN: token,
        DATA_ENCRYPTION_KEY: '3'.repeat(64),
        PRIVATE_STORAGE_DIR: dataDirectory,
        PRICING_SEED_ENABLED: 'false',
        RESEND_API_KEY: '',
        NOTIFICATION_FROM: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    const baseUrl = `http://127.0.0.1:${port}/api`;
    await waitForApi(baseUrl, child, () => output);
    return { baseUrl, child };
  };
  t.after(async () => {
    for (const child of children) {
      if (child.exitCode === null) await stopChild(child);
    }
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const assertSeededQuotes = async (baseUrl, heldReference = '') => {
    const headers = { Authorization: `Bearer ${token}` };
    const adminResponse = await fetch(`${baseUrl}/admin/requests`, { headers });
    assert.equal(adminResponse.status, 200);
    const { requests } = await adminResponse.json();
    for (const fixture of demoQuoteFixtures) {
      const request = requests.find((record) => record.ref === fixture.ref);
      assert.ok(request, `${fixture.ref} should be visible in the staff queue`);
      assert.equal(request.quote.quoteNumber, fixture.quoteNumber);
      assert.equal(request.status, fixture.ref === heldReference ? 'On Hold' : 'Awaiting Customer Decision');
      if (fixture.ref === heldReference) {
        assert.equal(request.notes, 'Preserve this staff update across restarts.');
        continue;
      }

      const trackingResponse = await fetch(`${baseUrl}/requests/${fixture.ref}`);
      assert.equal(trackingResponse.status, 200);
      const tracking = await trackingResponse.json();
      assert.equal(tracking.status, 'Your quote is ready');
      assert.equal(tracking.quoteBreakdown.quoteNumber, fixture.quoteNumber);
      assert.equal(tracking.quoteBreakdown.totalCents, 50000);
      if (fixture.ref === 'WQ-2026-079D20628548E52904F2') {
        const pdfResponse = await fetch(`${baseUrl}/requests/${fixture.ref}/quote.pdf`);
        assert.equal(pdfResponse.status, 200, 'a previously published quote remains downloadable when its service registry entry is no longer customer-quotable');
        assert.match(pdfResponse.headers.get('content-type'), /application\/pdf/);
        assert.match(Buffer.from(await pdfResponse.arrayBuffer()).toString('latin1').slice(0, 8), /^%PDF-1\./);
      }
    }
    assert.equal(requests.filter((record) => demoQuoteFixtures.some((fixture) => fixture.ref === record.ref)).length, 3);
  };

  const firstRun = await startApi();
  await assertSeededQuotes(firstRun.baseUrl);
  const holdResponse = await fetch(`${firstRun.baseUrl}/admin/requests/${demoQuoteFixtures[0].ref}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'On Hold', notes: 'Preserve this staff update across restarts.' }),
  });
  assert.equal(holdResponse.status, 200);
  await stopChild(firstRun.child);

  const secondRun = await startApi();
  await assertSeededQuotes(secondRun.baseUrl, demoQuoteFixtures[0].ref);
});
