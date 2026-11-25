import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedNextStatuses, availableNextStatuses, customerStage, defaultQuoteValidityDate, normalizeWorkflowRecord, quoteLifecycleForStatus, routeToStatus, validateQuoteValidityDate } from '../src/workflow.js';

test('workflow only offers reachable stages and shows stages with explicit prerequisites', () => {
  const underReview = { status: 'Under Review', requestedDocuments: [], serviceValidated: false };
  assert.deepEqual(allowedNextStatuses(underReview), ['On Hold', 'Cancelled']);
  assert.ok(!availableNextStatuses(underReview).includes('Quote Preparation'));
  assert.ok(availableNextStatuses(underReview).includes('Awaiting Documents'));
  assert.ok(!availableNextStatuses({ ...underReview, requestedDocuments: ['Copy of ID'] }).includes('Quote Preparation'));
  const ready = {
    ...underReview,
    serviceAssessment: {
      requirementsReviewed: false,
      eligibility: 'pending',
      governmentReadiness: 'pending',
      requirements: [{ label: 'Identity document', status: 'verified', note: 'Verified against the case record.' }],
    },
    documents: [{ reviewState: 'verified' }],
  };
  assert.ok(availableNextStatuses(ready).includes('Quote Preparation'));
  assert.ok(!availableNextStatuses({ ...ready, serviceAssessment: { ...ready.serviceAssessment, requirements: [{ label: 'Identity document', status: 'verified' }] } }).includes('Quote Preparation'));
  assert.ok(!availableNextStatuses({ ...ready, documents: [{ reviewState: 'received' }] }).includes('Quote Preparation'));
  assert.ok(!availableNextStatuses({ ...ready, documents: [{ reviewState: 'rejected' }] }).includes('Quote Preparation'));
  assert.ok(!availableNextStatuses({ ...ready, serviceAssessment: { ...ready.serviceAssessment, requirements: [] } }).includes('Quote Preparation'));
  assert.ok(!allowedNextStatuses({ status: 'Awaiting Documents', requestedDocuments: ['Copy of ID'] }).includes('Under Review'));
});

test('payment and fulfilment checkpoints cannot be skipped', () => {
  assert.ok(!allowedNextStatuses({ status: 'Quote Accepted', paymentStatus: 'not-configured' }).includes('Work in Progress'));
  assert.ok(allowedNextStatuses({ status: 'Quote Accepted', paymentStatus: 'paid' }).includes('Work in Progress'));
  assert.ok(availableNextStatuses({ status: 'Work in Progress', fulfilmentValidated: false }).includes('Ready for Collection / Delivery'));
  assert.ok(availableNextStatuses({ status: 'Ready for Collection / Delivery', completionConfirmed: false }).includes('Completed'));
});

test('stage changes automatically route and clear assignment', () => {
  const record = { status: 'Under Review', department: 'Customer Support', assignee: 'Reviewer' };
  routeToStatus(record, 'Quote Preparation', '2026-01-02T03:04:05.000Z');
  assert.equal(record.status, 'Quote Preparation');
  assert.equal(record.department, 'Estimate & Pricing');
  assert.equal(record.queue, 'Quote Preparation');
  assert.equal(record.assignee, '');
  assert.equal(record.stageEnteredAt, '2026-01-02T03:04:05.000Z');
});

test('legacy records normalize stages and timeline events to the customer-safe lifecycle', () => {
  const record = normalizeWorkflowRecord({
    status: 'Documents verified',
    department: 'Licensing',
    assignee: 'Reviewer',
    createdAt: '2026-01-01T00:00:00.000Z',
    history: [{ status: 'Received', at: '2026-01-01T00:00:00.000Z' }, { status: 'Documents verified', at: '2026-01-02T00:00:00.000Z' }],
  });
  assert.equal(record.status, 'Under Review');
  assert.equal(record.department, 'Customer Support');
  assert.equal(record.assignee, '');
  assert.equal(customerStage(record.status).label, "We're reviewing your details");
  assert.deepEqual(record.history.map((event) => event.status), ['Submitted', 'Under Review']);
});

test('legacy Ready to quote records remain actionable after migration, including mis-versioned records', () => {
  const record = normalizeWorkflowRecord({
    status: 'Ready to quote',
    workflowVersion: 2,
    department: 'Customer Support',
    assignee: 'Old reviewer',
    createdAt: '2026-01-01T00:00:00.000Z',
    services: ['drivers-licences'],
    requestedDocuments: [],
  });
  assert.equal(record.status, 'Quote Preparation');
  assert.equal(record.serviceValidated, true);
  assert.equal(record.department, 'Estimate & Pricing');
  assert.equal(record.queue, 'Quote Preparation');
  assert.equal(record.assignee, '');
});

test('on-hold requests can resume their previous stage or be cancelled', () => {
  const held = { status: 'On Hold', previousStatus: 'Under Review' };
  assert.deepEqual(allowedNextStatuses(held), ['Under Review', 'Cancelled']);
});

test('quote lifecycle is explicit and separates internal routing from customer-facing milestones', () => {
  const draftLifecycle = quoteLifecycleForStatus('Quote Preparation');
  assert.equal(draftLifecycle.phase, 'Draft');
  assert.equal(draftLifecycle.customerLabel, "We're preparing your quote");
  assert.equal(draftLifecycle.internalQueue, 'Quote Preparation');

  const publishedLifecycle = quoteLifecycleForStatus('Awaiting Customer Decision');
  assert.equal(publishedLifecycle.phase, 'Customer decision');
  assert.equal(publishedLifecycle.customerLabel, 'Your quote is ready');
  assert.equal(publishedLifecycle.internalQueue, 'Awaiting Customer');

  const acceptedLifecycle = quoteLifecycleForStatus('Quote Accepted');
  assert.equal(acceptedLifecycle.phase, 'Accepted');
  assert.equal(acceptedLifecycle.internalQueue, 'Payment Setup Required');
});

test('quote validity is real, forward-dated, capped at 90 days, and defaults to 14 days', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  assert.equal(validateQuoteValidityDate('2026-01-02', now), true);
  assert.equal(validateQuoteValidityDate('2026-02-31', now), false);
  assert.equal(validateQuoteValidityDate('2026-01-01', now), false);
  assert.equal(validateQuoteValidityDate('2026-04-01', now), true);
  assert.equal(validateQuoteValidityDate('2026-04-02', now), false);
  assert.equal(defaultQuoteValidityDate(now), '2026-01-15');
});
