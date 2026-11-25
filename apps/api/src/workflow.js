export const workflowStatuses = [
  'Submitted',
  'Under Review',
  'Awaiting Documents',
  'Quote Preparation',
  'Quote Revision Required',
  'Awaiting Customer Decision',
  'Quote Accepted',
  'Quote Declined',
  'Quote Expired',
  'Work in Progress',
  'Ready for Collection / Delivery',
  'Completed',
  'On Hold',
  'Cancelled',
];

const routingByStatus = {
  Submitted: { department: 'Customer Support', queue: 'New Requests', nextAction: 'Review the request and confirm the service details' },
  'Under Review': { department: 'Customer Support', queue: 'Under Review', nextAction: 'Check the request, service scope and applicable documents' },
  'Awaiting Documents': { department: 'Customer Support', queue: 'Awaiting Documents', nextAction: 'Wait for the requested information or documents' },
  'Quote Preparation': { department: 'Estimate & Pricing', queue: 'Quote Preparation', nextAction: 'Prepare a quote from the approved pricing profile and publish it in the customer portal' },
  'Quote Revision Required': { department: 'Estimate & Pricing', queue: 'Quote Preparation', nextAction: 'Review the customer’s requested quote changes and prepare a revised quote' },
  'Awaiting Customer Decision': { department: 'Customer Support', queue: 'Awaiting Customer', nextAction: 'Wait for the customer to accept, decline or contact support' },
  'Quote Accepted': { department: 'Finance', queue: 'Payment Setup Required', nextAction: 'Payment collection is not connected. Do not begin fulfilment.' },
  'Quote Declined': { department: 'Closed Cases', queue: 'Completed', nextAction: 'Review the customer decision and close the case' },
  'Quote Expired': { department: 'Customer Support', queue: 'Under Review', nextAction: 'Contact the customer and confirm whether a refreshed quote is needed' },
  'Work in Progress': { department: 'Operations', queue: 'In Progress', nextAction: 'Complete the approved service and record material progress' },
  'Ready for Collection / Delivery': { department: 'Operations', queue: 'Ready for Delivery', nextAction: 'Confirm collection or delivery arrangements with the customer' },
  Completed: { department: 'Closed Cases', queue: 'Completed', nextAction: 'Case closed' },
  'On Hold': { department: 'Operations', queue: 'Escalations', nextAction: 'Review the hold reason and schedule the next update' },
  Cancelled: { department: 'Closed Cases', queue: 'Completed', nextAction: 'Case closed' },
};

const customerStages = {
  Submitted: { stage: 'submitted', label: 'Request received', update: 'We received your request. Our team will check the details and contact you.' },
  'Under Review': { stage: 'review', label: "We're reviewing your details", update: "We're reviewing your request and the information you shared." },
  'Awaiting Documents': { stage: 'review', label: 'Waiting for your documents', update: 'We need some information or documents from you before we can continue.' },
  'Quote Preparation': { stage: 'quote-preparation', label: "We're reviewing your information", update: "We're checking your service requirements and documents before preparing a quote." },
  'Quote Revision Required': { stage: 'quote-preparation', label: "We're revising your quote", update: 'We received your request to change the quote. Our team will review it and share an update.' },
  'Awaiting Customer Decision': { stage: 'quote-decision', label: 'Your quote is ready', update: 'Your quote is ready. Review it and choose whether you would like to continue.' },
  'Quote Accepted': { stage: 'quote-decision', label: 'Quote approval recorded', update: 'Your quote approval is recorded. We will contact you about the next step. Payment is not available in this request desk yet.' },
  'Quote Declined': { stage: 'quote-decision', label: 'Quote decision recorded', update: 'Your quote decision is recorded. Contact us if you would like to discuss it.' },
  'Quote Expired': { stage: 'quote-decision', label: 'Quote expired', update: 'This quote has expired. Contact us if you would like us to review it.' },
  'Work in Progress': { stage: 'work', label: "We're processing your request", update: "We're working on your request." },
  'Ready for Collection / Delivery': { stage: 'delivery', label: 'Ready for collection or delivery', update: 'Your request is ready. We will confirm collection or delivery arrangements.' },
  Completed: { stage: 'completed', label: 'Completed', update: 'Your request is complete.' },
  'On Hold': { stage: 'review', label: 'We are checking something', update: 'We are checking something before we can continue. We will update you soon.' },
  Cancelled: { stage: 'completed', label: 'Request closed', update: 'This request is closed. Contact us if you need help with a new request.' },
};

const legacyStatusMap = {
  Received: 'Submitted',
  'Documents required': 'Awaiting Documents',
  'Documents pending': 'Awaiting Documents',
  'Documents received': 'Under Review',
  'Documents under review': 'Under Review',
  'Verification in progress': 'Under Review',
  'Documents verified': 'Under Review',
  'Service validated': 'Under Review',
  'Ready to quote': 'Quote Preparation',
  'Quote generated': 'Quote Preparation',
  'Quote sent': 'Awaiting Customer Decision',
  'Awaiting customer': 'Awaiting Customer Decision',
  'Quote accepted': 'Quote Accepted',
  'Quote declined': 'Quote Declined',
  'In progress': 'Work in Progress',
  Submitted: 'Work in Progress',
  Ready: 'Ready for Collection / Delivery',
  'Out for delivery': 'Ready for Collection / Delivery',
  Delivered: 'Completed',
  Completed: 'Completed',
  'On hold': 'On Hold',
  Cancelled: 'Cancelled',
  'Booking in progress': 'Work in Progress',
  'Appointment issued': 'Work in Progress',
  'Awaiting client attendance': 'Work in Progress',
};

const transitions = {
  Submitted: ['Under Review', 'Awaiting Documents', 'On Hold', 'Cancelled'],
  'Under Review': ['Awaiting Documents', 'Quote Preparation', 'On Hold', 'Cancelled'],
  'Awaiting Documents': ['Under Review', 'On Hold', 'Cancelled'],
  'Quote Preparation': ['Awaiting Customer Decision', 'On Hold', 'Cancelled'],
  'Quote Revision Required': ['Quote Preparation', 'On Hold', 'Cancelled'],
  'Awaiting Customer Decision': ['Quote Revision Required', 'On Hold', 'Cancelled'],
  'Quote Accepted': ['Work in Progress', 'On Hold', 'Cancelled'],
  'Quote Declined': [],
  'Quote Expired': ['Under Review', 'Cancelled'],
  'Work in Progress': ['Ready for Collection / Delivery', 'On Hold', 'Cancelled'],
  'Ready for Collection / Delivery': ['Completed', 'On Hold'],
  Completed: [],
  'On Hold': [],
  Cancelled: [],
};

export function getRouting(status) {
  return routingByStatus[status] || routingByStatus.Submitted;
}

export function customerStage(status) {
  return customerStages[status] || customerStages.Submitted;
}

export function quoteLifecycleForStatus(status) {
  const lifecycleMap = {
    Submitted: { phase: 'Request received', customerLabel: 'Request received', internalQueue: 'New Requests' },
    'Under Review': { phase: 'Request assessment', customerLabel: "We're reviewing your details", internalQueue: 'Under Review' },
    'Awaiting Documents': { phase: 'Awaiting documents', customerLabel: 'Waiting for your documents', internalQueue: 'Awaiting Documents' },
    'Quote Preparation': { phase: 'Draft', customerLabel: "We're preparing your quote", internalQueue: 'Quote Preparation' },
    'Quote Revision Required': { phase: 'Revision required', customerLabel: "We're revising your quote", internalQueue: 'Quote Preparation' },
    'Awaiting Customer Decision': { phase: 'Customer decision', customerLabel: 'Your quote is ready', internalQueue: 'Awaiting Customer' },
    'Quote Accepted': { phase: 'Accepted', customerLabel: 'Quote approval recorded', internalQueue: 'Payment Setup Required' },
    'Quote Declined': { phase: 'Declined', customerLabel: 'Quote decision recorded', internalQueue: 'Completed' },
    'Quote Expired': { phase: 'Expired', customerLabel: 'Quote expired', internalQueue: 'Under Review' },
    'Work in Progress': { phase: 'In progress', customerLabel: "We're processing your request", internalQueue: 'In Progress' },
    'Ready for Collection / Delivery': { phase: 'Ready for delivery', customerLabel: 'Ready for collection or delivery', internalQueue: 'Ready for Delivery' },
    Completed: { phase: 'Completed', customerLabel: 'Completed', internalQueue: 'Completed' },
    'On Hold': { phase: 'On hold', customerLabel: 'We are checking something', internalQueue: 'Escalations' },
    Cancelled: { phase: 'Closed', customerLabel: 'Request closed', internalQueue: 'Completed' },
  };
  return lifecycleMap[status] || { phase: 'Request received', customerLabel: 'Request received', internalQueue: 'New Requests' };
}

export function serviceAssessmentReady(record) {
  const assessment = record.serviceAssessment;
  const requirements = assessment?.requirements || [];
  return requirements.length > 0
    && requirements.every((requirement) => ['verified', 'not-applicable'].includes(requirement.status)
      && (requirement.status !== 'not-applicable' || (requirement.required === false && Boolean(requirement.note)))
      && (requirement.status !== 'verified'
        || Boolean(requirement.note)
        || (requirement.evidenceDocumentId && (record.documents || []).some((document) => document.id === requirement.evidenceDocumentId && document.reviewState === 'verified'))))
    && (record.documents || []).every((document) => document.reviewState === 'verified')
    && (record.requestedDocuments || []).length === 0;
}

export function allowedNextStatuses(record) {
  if (record.status === 'On Hold') return [...new Set([record.previousStatus, 'Cancelled'].filter(Boolean))];
  const allowed = transitions[record.status] || [];
  return allowed.filter((status) => status !== 'Quote Preparation' || serviceAssessmentReady(record))
    .filter((status) => status !== 'Awaiting Documents' || (record.requestedDocuments || []).length > 0)
    .filter((status) => status !== 'Under Review' || (record.requestedDocuments || []).length === 0)
    .filter((status) => status !== 'Awaiting Customer Decision' || Boolean(record.quote))
    .filter((status) => status !== 'Work in Progress' || record.paymentStatus === 'paid')
    .filter((status) => status !== 'Ready for Collection / Delivery' || record.fulfilmentValidated === true)
    .filter((status) => status !== 'Completed' || record.completionConfirmed === true);
}

export function availableNextStatuses(record) {
  const available = allowedNextStatuses(record);
  const hasOutstandingDocuments = (record.requestedDocuments || []).length > 0;
  const requestable = {
    Submitted: ['Awaiting Documents'],
    'Under Review': hasOutstandingDocuments ? ['Awaiting Documents'] : ['Awaiting Documents', ...(serviceAssessmentReady(record) ? ['Quote Preparation'] : [])],
    'Work in Progress': ['Ready for Collection / Delivery'],
    'Ready for Collection / Delivery': ['Completed'],
  }[record.status] || [];
  return [...new Set([...available, ...requestable])];
}

export function routeToStatus(record, status, at = new Date().toISOString()) {
  const routing = getRouting(status);
  const previousStatus = record.status;
  record.status = status;
  record.department = routing.department;
  record.queue = routing.queue;
  record.assignee = '';
  record.stageEnteredAt = at;
  record.nextAction = routing.nextAction;
  if (status === 'On Hold') record.previousStatus = previousStatus;
  else if (record.previousStatus && status !== 'On Hold') delete record.previousStatus;
}

export function normalizeWorkflowRecord(record) {
  const isLegacyRecord = record.workflowVersion !== 2;
  const originalStatus = record.status;
  const status = record.workflowVersion === 2
    ? (workflowStatuses.includes(originalStatus) ? originalStatus : legacyStatusMap[originalStatus] || 'Submitted')
    : (legacyStatusMap[originalStatus] || (workflowStatuses.includes(originalStatus) ? originalStatus : 'Submitted'));
  if (['Service validated', 'Ready to quote'].includes(originalStatus)) record.serviceValidated = true;
  record.status = originalStatus === 'Quote generated' && record.quote && record.notificationStatus === 'sent'
    ? 'Awaiting Customer Decision'
    : status;
  record.workflowVersion = 2;
  if (Array.isArray(record.history)) {
    record.history = record.history.map((event) => {
      const eventStatus = workflowStatuses.includes(event.status) && !(isLegacyRecord && event.status === 'Submitted')
        ? event.status
        : legacyStatusMap[event.status] || event.status;
      return eventStatus === event.status ? event : { ...event, legacyStatus: event.status, status: eventStatus };
    });
  }
  const routing = getRouting(record.status);
  if (record.department !== routing.department || record.queue !== routing.queue) record.assignee = '';
  record.department = routing.department;
  record.queue = routing.queue;
  record.stageEnteredAt ||= record.updatedAt || record.createdAt;
  record.paymentStatus ||= 'not-configured';
  record.customerUpdate = customerStage(record.status).update;
  if (record.status === 'Quote Accepted') record.nextAction = routing.nextAction;
  else record.nextAction ||= routing.nextAction;
  return record;
}

export function validateQuoteValidityDate(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const daysUntilExpiry = (date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
  return daysUntilExpiry >= 1 && daysUntilExpiry <= 90;
}

export function defaultQuoteValidityDate(now = new Date()) {
  const validUntil = new Date(now);
  validUntil.setUTCHours(0, 0, 0, 0);
  validUntil.setUTCDate(validUntil.getUTCDate() + 14);
  return validUntil.toISOString().slice(0, 10);
}
