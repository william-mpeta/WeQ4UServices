import { useEffect, useState, type FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Download, Eye, LockKeyhole, Search, Upload, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { services } from './site-data';

type RequestRecord = {
  ref: string;
  status: string;
  journeyStage?: string;
  services?: string[];
  workItems?: string[];
  vehicleContext?: { purchaseType?: string; financeStage?: string; retailerName?: string; referralCode?: string };
  assignedTeam?: string;
  createdAt: string;
  updatedAt: string;
  nextStep?: string;
  nextAction?: string;
  timeline?: { status: string; at: string; message: string }[];
  privateAccess?: boolean;
  quoteAmount?: number | null;
  quoteCurrency?: string;
  quoteBreakdown?: { id: string; quoteNumber: string; version: number; profileVersion: number; serviceCode?: string; serviceDefinitionVersion?: number | null; pricingBasis?: string; pricingBasisLabel?: string; estimateDisclaimer?: string; serviceName?: string; packageName?: string; vatTreatment?: 'inclusive' | 'exclusive' | 'not-applicable'; generatedAt: string; notes?: string; conditions?: string[]; requiredDocuments?: string[]; validUntil?: string; currency: string; totalCents: number; lines: { componentId: string; label: string; amountCents: number }[] } | null;
  quoteDecision?: string;
  paymentStatus?: string;
  paymentVerifiedAt?: string;
  paymentAvailable?: boolean;
  quoteDecisionAt?: string;
  quoteDecisionReason?: string;
  quoteDecisionReasonDetails?: string;
  quoteDecisionVersion?: number | null;
  requestedDocuments?: string[];
  customerTasks?: CustomerTask[];
  documents?: { label: string; uploadedAt: string; reviewState: string }[];
};
type CustomerTask = {
  id: string;
  type: 'document' | 'information' | 'appointment' | 'delivery';
  title: string;
  message: string;
  status: 'waiting-on-customer' | 'response-received' | 'completed';
  dueDate?: string;
  response?: string;
  createdAt: string;
};
type CataloguePrice = {
  pricingStatus: string;
  startingFromCents: number | null;
  currency: string;
  eligibleServiceDetails?: string[];
  packages?: { id: string; name: string; totalCents: number; upliftCents: number }[];
};
type ServiceDefinition = {
  serviceCode: string;
  serviceName: string;
  categoryServiceId: string;
  subtype: string;
  configurationStatus: string;
  requirements: { id: string; label: string; required: boolean; verificationRule: string }[];
  pricing: { type: string; minimumCents?: number; maximumCents?: number };
};
type QuoteDeclineReason = 'too-expensive' | 'not-ready' | 'chose-another-provider' | 'incorrect-details' | 'other';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const requestJourney = ['Request received', 'We check the details', 'Your quote', 'We do the work', 'Ready or complete'];
const journeyStageIndex: Record<string, number> = {
  submitted: 0,
  review: 1,
  'quote-preparation': 1,
  'quote-decision': 2,
  work: 3,
  delivery: 4,
  completed: 4,
};

const ownershipWorkItems = [
  { id: 'ownership-transfer', label: 'Help with the vehicle ownership papers' },
  { id: 'registration', label: 'Register the vehicle in my name' },
  { id: 'licence-disc', label: 'Check licence disc and licensing steps' },
  { id: 'roadworthy', label: 'Help arrange a roadworthy test' },
  { id: 'document-handover', label: 'Help me get my final vehicle papers' },
  { id: 'not-sure', label: 'I am not sure yet — please guide me' },
];

const purchaseTypes = [
  'From a car dealership',
  'Private sale',
  'Bank or auction sale',
  'I am not sure',
];
const financeStages = ['I am still paying vehicle finance', 'I have paid off the vehicle finance', 'I did not use vehicle finance', 'I am not sure'];

type ChecklistDocument = { id: string; label: string; required?: boolean; note?: string };
type ServiceGuide = { question: string; options: string[]; documents: ChecklistDocument[] };
const serviceGuides: Record<string, ServiceGuide> = {
  'vehicle-ownership-onboarding': { question: 'Where did you buy the vehicle?', options: purchaseTypes, documents: [] },
  'drivers-licences': { question: 'Which driver licence request is this?', options: ['Learner licence test', 'Learner licence rewrite', 'New driver licence test', 'Existing driver / renewal', 'Replacement', 'Temporary licence', 'Other or not sure'], documents: [{ id: 'id-copy', label: 'Copy of ID', required: true }, { id: 'booking-fee-confirmation', label: 'Booking fee confirmation', required: true, note: 'Do not include bank card details. The team confirms the current fee before payment.' }] },
  prdps: { question: 'What do you need for your PrDP?', options: ['New PrDP', 'PrDP renewal', 'Other or not sure'], documents: [{ id: 'id-copy', label: 'Copy of ID', required: true }, { id: 'medical-certificate', label: 'Medical certificate', required: true, note: 'The working notes list this for a new PrDP; the team will confirm what applies.' }, { id: 'booking-fee-confirmation', label: 'Booking fee confirmation', required: true, note: 'Do not include bank card details. The team confirms the current fee before payment.' }] },
  'licence-disc-renewals': { question: 'What is the disc renewal for?', options: ['My vehicle', 'A business or fleet vehicle', 'Other or not sure'], documents: [{ id: 'id-copy', label: 'Copy of ID', required: true }, { id: 'existing-licence-disc', label: 'Existing licence disc', note: 'Optional, if available.' }] },
  'vehicle-registrations': { question: 'Which vehicle registration situation applies?', options: ['New registration', 'Vehicle registration from bank finance', 'Vehicle registration from dealership', 'Other or not sure'], documents: [{ id: 'certified-owner-id', label: 'Certified owner ID copy', required: true }, { id: 'proof-of-residence', label: 'Proof of residence', required: true }, { id: 'purchase-documentation', label: 'Purchase documentation', required: true }, { id: 'settlement-letter', label: 'Bank settlement letter', required: true }, { id: 'bank-proxy-id', label: 'Bank proxy ID copy', required: true }, { id: 'dealer-proxy-id', label: 'Dealer proxy ID copy', required: true }, { id: 'dealer-brn', label: 'Dealer BRN certificate', required: true }, { id: 'stamped-nco', label: 'NCO form with dealer stamp', required: true }, { id: 'buyer-id', label: 'Buyer ID copy', required: true }, { id: 'buyer-proof-address', label: 'Buyer proof of residence', required: true }, { id: 'roadworthy-certificate', label: 'Roadworthy certificate', required: true, note: 'The team can discuss roadworthy assistance if one is not available.' }] },
  'change-of-ownership': { question: 'Which ownership situation applies?', options: ['Vehicle financed through a bank', 'Dealership sale', 'Private sale', 'Not sure'], documents: [{ id: 'settlement-letter', label: 'Bank settlement letter', required: true }, { id: 'bank-proxy-id', label: 'Bank proxy ID', required: true }, { id: 'dealer-proxy-id', label: 'Dealer proxy ID', required: true }, { id: 'dealer-brn', label: 'Dealer BRN certificate', required: true }, { id: 'stamped-nco', label: 'Stamped NCO form', required: true }, { id: 'buyer-id', label: 'Buyer ID copy', required: true }, { id: 'buyer-proof-address', label: 'Buyer proof of residence', required: true }, { id: 'roadworthy-certificate', label: 'Roadworthy certificate', required: true, note: 'The working notes say this is required for bank and dealership transfers.' }] },
  'duplicate-documents': { question: 'What happened to the vehicle document?', options: ['Lost or stolen', 'Damaged', 'Other or not sure'], documents: [{ id: 'certified-owner-id', label: 'Certified copy of owner ID', required: true }, { id: 'affidavit', label: 'Affidavit', required: true, note: 'For lost or stolen documents, state that the papers were lost or stolen.' }] },
  'roadworthy-certificates': { question: 'What do you need help with?', options: ['Book a roadworthy test', 'Roadworthy for a sale or transfer', 'Other or not sure'], documents: [{ id: 'vehicle-owner-id', label: 'Owner ID copy', required: true }, { id: 'roadworthy-certificate', label: 'Existing roadworthy certificate', note: 'Optional, if available.' }] },
  'traffic-register': { question: 'What do you need help with?', options: ['Apply for a traffic register number', 'Other or not sure'], documents: [] },
  'door-to-door-courier': { question: 'What courier service do you need?', options: ['Collect documents from me', 'Deliver completed documents to me', 'Collect and deliver documents'], documents: [] },
};

function documentsForService(serviceId: string, answer: string, definitions: ServiceDefinition[] = []): ChecklistDocument[] {
  if (serviceId === 'drivers-licences' || serviceId === 'prdps') {
    const definition = definitions.find((item) => item.categoryServiceId === serviceId && item.subtype.toLowerCase() === answer.split(' · ')[0].toLowerCase());
    if (definition) return definition.requirements.map((requirement) => ({ id: requirement.id, label: requirement.label, required: requirement.required, note: requirement.verificationRule }));
  }
  const documents = serviceGuides[serviceId]?.documents || [];
  if (serviceId === 'change-of-ownership') {
    if (answer === 'Vehicle financed through a bank') return documents.filter((item) => ['settlement-letter', 'bank-proxy-id', 'roadworthy-certificate'].includes(item.id));
    if (answer === 'Dealership sale') return documents.filter((item) => ['dealer-proxy-id', 'dealer-brn', 'stamped-nco', 'buyer-id', 'buyer-proof-address', 'roadworthy-certificate'].includes(item.id));
    return [];
  }
  if (serviceId === 'vehicle-registrations') {
    if (answer === 'New registration') return documents.filter((item) => ['certified-owner-id', 'proof-of-residence', 'purchase-documentation'].includes(item.id));
    if (answer === 'Vehicle registration from bank finance') return documents.filter((item) => ['settlement-letter', 'bank-proxy-id', 'buyer-id', 'buyer-proof-address', 'roadworthy-certificate'].includes(item.id));
    if (answer === 'Vehicle registration from dealership') return documents.filter((item) => ['dealer-proxy-id', 'dealer-brn', 'stamped-nco', 'buyer-id', 'buyer-proof-address', 'roadworthy-certificate'].includes(item.id));
    return [];
  }
  if (serviceId === 'prdps' && answer && answer !== 'New PrDP') return documents.filter((item) => item.id === 'id-copy');
  if (serviceId === 'duplicate-documents' && answer && answer !== 'Lost or stolen') return documents.filter((item) => item.id === 'certified-owner-id');
  return documents;
}

export function RequestFlow({ initialService }: { initialService?: string } = {}) {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>(initialService ? [initialService] : []);
  const [serviceAnswers, setServiceAnswers] = useState<Record<string, string>>({});
  const [ownershipItems, setOwnershipItems] = useState<string[]>([]);
  const [retailerName, setRetailerName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [financeStage, setFinanceStage] = useState('');
  const [servicePreferences, setServicePreferences] = useState<Record<string, string>>({});
  const [pricingPackage, setPricingPackage] = useState('standard');
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [courierCollection, setCourierCollection] = useState(false);
  const [courierDelivery, setCourierDelivery] = useState(false);
  const [details, setDetails] = useState({ name: '', phone: '', email: '', suburb: '', address: '', message: '' });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [referenceCopied, setReferenceCopied] = useState(false);
  const [error, setError] = useState('');
  const [cataloguePrices, setCataloguePrices] = useState<Record<string, CataloguePrice>>({});
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>([]);
  const [catalogueError, setCatalogueError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadCatalogue() {
      try {
        const response = await fetch(`${apiBase}/catalogue`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Live service pricing is unavailable.');
        if (!cancelled) {
          setCataloguePrices(Object.fromEntries(result.services.map((service: { id: string } & CataloguePrice) => [service.id, service])));
          setServiceDefinitions(result.serviceDefinitions || []);
        }
      } catch {
        if (!cancelled) setCatalogueError('Live pricing is unavailable right now. We will confirm any applicable price before work begins.');
      }
    }
    void loadCatalogue();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const service = initialService || searchParams.get('service');
    if (service && services.some((item) => item.id === service)) {
      setSelected((current) => current.includes(service) ? current : [...current, service]);
    }
  }, [initialService, searchParams]);

  function toggleService(id: string) {
    if (selected[0] === id) return;
    if (Object.keys(documents).length && !window.confirm('Changing your service will remove the files you attached for the current service. Continue?')) return;
    setSelected([id]);
    setServiceAnswers({});
    setOwnershipItems([]);
    setRetailerName('');
    setReferralCode('');
    setFinanceStage('');
    setServicePreferences({});
    setPricingPackage('standard');
    setDocuments({});
    setCourierCollection(false);
    setCourierDelivery(false);
    setError('');
  }

  function changeServiceAnswer(id: string, value: string) {
    const allowed = new Set(documentsForService(id, value, serviceDefinitions).map((document) => document.id));
    const removedFiles = Object.entries(documents).filter(([key]) => key.startsWith(`${id}:`) && !allowed.has(key.slice(id.length + 1)));
    if (removedFiles.length && !window.confirm('Changing this request type will remove attachments that do not apply to the new checklist. Continue?')) return;
    setServiceAnswers((current) => ({ ...current, [id]: value }));
    const packageOptions = cataloguePrices[id]?.packages || [];
    if (cataloguePrices[id]?.eligibleServiceDetails?.length
      && !cataloguePrices[id].eligibleServiceDetails.includes(value)) setPricingPackage('standard');
    setDocuments((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`) || allowed.has(key.slice(id.length + 1)))));
  }

  function continueToDetails() {
    if (selected.length !== 1) {
      setError('Choose one service to continue.');
      return;
    }
    setError('');
    setStep(2);
  }

  function continueToContact() {
    if (!selected[0] || !serviceAnswers[selected[0]]) {
      setError('Choose the closest option for this service, or choose “Other or not sure”.');
      return;
    }
    if (selected[0] === 'vehicle-ownership-onboarding' && ownershipItems.length === 0) {
      setError('Choose what you need help with, or choose “I am not sure yet”.');
      return;
    }
    if (selected[0] === 'vehicle-ownership-onboarding' && !financeStage) {
      setError('Choose the closest finance option, or choose that you are not sure.');
      return;
    }
    const missing = documentsForService(selected[0], serviceAnswers[selected[0]], serviceDefinitions)
      .filter((item) => item.required && !documents[`${selected[0]}:${item.id}`]);
    if (missing.length && !window.confirm(`You have not attached these documents:\n${missing.map((item) => `• ${item.label}`).join('\n')}\n\nYou can continue now; the team will confirm what is needed before processing. Continue?`)) return;
    setError('');
    setStep(3);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setError('Please read and accept the privacy notice before sending your request.');
      return;
    }
    const formData = new FormData();
    Object.entries(details).forEach(([name, value]) => formData.append(name, value));
    selected.forEach((service) => formData.append('services', service));
    formData.append('pricingPackage', pricingPackage);
    const chosenDefinition = serviceDefinitions.find((definition) => definition.categoryServiceId === selected[0] && definition.subtype.toLowerCase() === serviceAnswers[selected[0]]?.split(' · ')[0].toLowerCase());
    if (chosenDefinition) formData.append('serviceCode', chosenDefinition.serviceCode);
    const submittedServiceDetails = Object.fromEntries(
      Object.entries(serviceAnswers)
        .filter(([id]) => selected.includes(id))
        .map(([id, answer]) => [
          id,
          [answer, servicePreferences[id] ? `${id === 'roadworthy-certificates' ? 'Vehicle registration' : 'Appointment preference'}: ${servicePreferences[id]}` : '']
            .filter(Boolean)
            .join(' · '),
        ]),
    );
    formData.append('serviceDetails', JSON.stringify(submittedServiceDetails));
    if (selected[0] === 'vehicle-ownership-onboarding') {
      formData.append('workItems', JSON.stringify(ownershipItems));
      formData.append('vehicleContext', JSON.stringify({ purchaseType: serviceAnswers[selected[0]] || '', financeStage, retailerName: retailerName.trim(), referralCode: referralCode.trim().toUpperCase() }));
    }
    const attached = Object.entries(documents).filter(([key, file]) => file && selected.includes(key.split(':')[0]));
    formData.append('documentLabels', JSON.stringify(attached.map(([key]) => key)));
    attached.forEach(([, file]) => formData.append('documents', file));
    const courierSelection = selected[0] === 'door-to-door-courier' ? serviceAnswers[selected[0]] : '';
    formData.append('courierCollection', String(courierSelection === 'Collect documents from me' || courierSelection === 'Collect and deliver documents' || courierCollection));
    formData.append('courierDelivery', String(courierSelection === 'Deliver completed documents to me' || courierSelection === 'Collect and deliver documents' || courierDelivery));
    formData.append('consent', String(consent));
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/requests`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not send your request. Please try again.');
      setReference(result.ref);
      setReferenceCopied(false);
      setStep(5);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'We could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="request-panel" id="request-form" aria-labelledby="request-heading">
      <div className="request-heading-row">
        <div>
          <p className="eyebrow eyebrow-dark">Request · Quote · Track</p>
          <h2 id="request-heading">{initialService === 'vehicle-ownership-onboarding' ? 'Let’s sort out what comes after the keys.' : 'Tell us what needs sorting.'}</h2>
          <p className="muted-copy">No payment is taken here. We review your request and send a quote before you decide.</p>
        </div>
        <div className="step-count" aria-label={`Step ${Math.min(step, 4)} of 4`}>
          {step < 5 ? `0${step} / 04` : 'SENT'}
        </div>
      </div>

      {step < 5 && (
        <ol className="step-indicator" aria-label="Request steps">
          {(initialService === 'vehicle-ownership-onboarding' ? ['Start here', 'About the sale', 'Your details', 'Review'] : ['Choose service', 'Service details & documents', 'Your details', 'Review']).map((label, index) => (
            <li key={label} className={step === index + 1 ? 'current' : step > index + 1 ? 'complete' : ''}>
              <span>{step > index + 1 ? <Check size={14} /> : `0${index + 1}`}</span>{label}
            </li>
          ))}
        </ol>
      )}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">{step < 5 ? `Step ${step} of 4` : 'Your request has been sent.'}</p>

      {step === 1 && (
        <div className="form-step">
          {initialService === 'vehicle-ownership-onboarding' ? <div className="ownership-start-card"><span className="ownership-start-icon"><Check size={20} /></span><div><strong>One request for your new vehicle</strong><p>Tell us what you need. We will check what applies and send you the next step before any work begins.</p></div></div> : <fieldset className="service-choice-fieldset">
            <legend>What can we help with?</legend>
            <div className="choice-grid">
              {services.map((service) => {
                const price = cataloguePrices[service.id];
                const startingFromCents = price?.startingFromCents;
                return (
                <label className={`choice-card ${selected.includes(service.id) ? 'selected' : ''}`} key={service.id}>
                  <input type="radio" name="request-service" checked={selected.includes(service.id)} onChange={() => toggleService(service.id)} />
                  <span className="choice-check"><Check size={13} /></span>
                  <span>{service.name}<small className="choice-price">{startingFromCents !== null && startingFromCents !== undefined && price ? `From ${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: price.currency }).format(startingFromCents / 100)} · final quote after review` : 'Quote after request review'}</small></span>
                </label>
                );
              })}
            </div>
            {catalogueError && <p className="small-note" role="status">{catalogueError}</p>}
          </fieldset>}
          {initialService !== 'vehicle-ownership-onboarding' && selected[0] !== 'door-to-door-courier' && <fieldset className="courier-options"><legend>Optional courier add-ons</legend>
            <label className="courier-choice"><input type="checkbox" checked={courierCollection} onChange={(event) => setCourierCollection(event.target.checked)} /><span><strong>Collect documents from me</strong><small>Availability and any courier fee are confirmed in your quote.</small></span></label>
            <label className="courier-choice"><input type="checkbox" checked={courierDelivery} onChange={(event) => setCourierDelivery(event.target.checked)} /><span><strong>Deliver completed documents to me</strong><small>Availability and any courier fee are confirmed in your quote.</small></span></label>
          </fieldset>}
          <div className="form-actions form-actions-end">
            <button className="button button-primary" type="button" onClick={continueToDetails}>Continue <ChevronRight size={17} /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step">
          <p className="muted-copy">Tell us which situation applies and attach any documents you already have. This working checklist comes from current process notes; our team will confirm what applies before processing.</p>
            {selected.map((id) => {
            const service = services.find((item) => item.id === id)!;
            const guide = serviceGuides[id];
            const answer = serviceAnswers[id] || '';
            const relevantDocuments = documentsForService(id, answer, serviceDefinitions);
            const servicePricing = cataloguePrices[id];
            const serviceDefinition = serviceDefinitions.find((definition) => definition.categoryServiceId === id && definition.subtype.toLowerCase() === answer.split(' · ')[0].toLowerCase());
            const packageOptions = servicePricing?.packages || [];
            const packageEligible = !servicePricing?.eligibleServiceDetails?.length
              || servicePricing.eligibleServiceDetails.includes(answer);
            return <section className={`service-document-group ${id === 'vehicle-ownership-onboarding' ? 'ownership-details-group' : ''}`} key={id}>
            <h3>{service.name}</h3>
            <label className="field">{guide.question}<select value={answer} onChange={(event) => changeServiceAnswer(id, event.target.value)}><option value="">Choose an option</option>{guide.options.map((option) => <option key={option}>{option}</option>)}</select></label>
              {serviceDefinition && <p className="service-definition-note">{serviceDefinition.serviceName} · {serviceDefinition.serviceCode}{serviceDefinition.configurationStatus !== 'price-card-profile' ? ` · ${serviceDefinition.pricing.type === 'provisional-service-fee' ? 'Provisional pricing' : 'Configuration requires confirmation'}` : ''}</p>}
              {packageOptions.length > 0 && packageEligible && <fieldset className="package-choice-fieldset">
                <legend>Choose a service package</legend>
                <p className="detail-muted">Select the service speed that suits you. Your quote will show the full price before you decide.</p>
                <div className="package-choice-grid">{packageOptions.map((option) => <label key={option.id} className={`package-choice ${pricingPackage === option.id ? 'selected' : ''}`}>
                  <input type="radio" name="pricing-package" checked={pricingPackage === option.id} onChange={() => setPricingPackage(option.id)} />
                  <span><strong>{option.name}</strong><b>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: servicePricing?.currency || 'ZAR' }).format(option.totalCents / 100)}</b>
                    {option.upliftCents > 0 && <small>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: servicePricing?.currency || 'ZAR' }).format(option.upliftCents / 100)} package uplift</small>}
                  </span>
                </label>)}</div>
              </fieldset>}
                {id === 'vehicle-ownership-onboarding' ? <>
                  {answer === 'From a car dealership' && <label className="field">Dealership name <span className="optional-label">Optional</span><input value={retailerName} maxLength={100} onChange={(event) => setRetailerName(event.target.value)} placeholder="For example, the dealership name" /></label>}
                  <label className="field">Partner referral code <span className="optional-label">Optional</span><input value={referralCode} maxLength={40} autoCapitalize="characters" onChange={(event) => setReferralCode(event.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase())} placeholder="Enter a code if you were given one" /><small className="detail-muted">This helps WeQ4U identify the referral. You can continue without it.</small></label>
                  <label className="field">What is happening with vehicle finance?<select value={financeStage} onChange={(event) => setFinanceStage(event.target.value)}><option value="">Choose an option</option>{financeStages.map((option) => <option key={option}>{option}</option>)}</select><small className="detail-muted">This helps our team check which paperwork may apply. We do not need your account number.</small></label>
                  <fieldset className="ownership-work-picker"><legend>What would you like help with?</legend><p className="detail-muted">Choose any that fit. If you are unsure, choose the last option.</p><div className="ownership-work-grid">{ownershipWorkItems.map((item) => <label key={item.id} className={`ownership-work-choice ${ownershipItems.includes(item.id) ? 'selected' : ''}`}><input type="checkbox" checked={ownershipItems.includes(item.id)} onChange={(event) => setOwnershipItems((current) => item.id === 'not-sure' ? (event.target.checked ? ['not-sure'] : current.filter((id) => id !== 'not-sure')) : event.target.checked ? [...current.filter((id) => id !== 'not-sure'), item.id] : current.filter((id) => id !== item.id))} /><span>{item.label}</span></label>)}</div></fieldset>
                  <div className="ownership-safe-note"><LockKeyhole size={17} /><span>You do not need to upload ID, vehicle papers or a full VIN here. Our team will confirm what is needed before you send documents.</span></div>
                </> : <>
              {(id === 'drivers-licences' || id === 'prdps') && <label className="field">{id === 'prdps' ? 'Preferred appointment time or test centre' : 'Preferred test date or centre'} <span className="optional-label">Optional · to help us arrange a booking</span><input value={servicePreferences[id] || ''} maxLength={160} onChange={(event) => setServicePreferences((current) => ({ ...current, [id]: event.target.value }))} /></label>}
              {id === 'roadworthy-certificates' && <label className="field">Vehicle registration number <span className="optional-label">Optional · do not enter an ID number</span><input value={servicePreferences[id] || ''} maxLength={30} onChange={(event) => setServicePreferences((current) => ({ ...current, [id]: event.target.value }))} /></label>}
              {id === 'drivers-licences' && <p className="service-process-note">A booking fee applies. We request a test date for you to confirm at the centre. You attend the appointment and eye test; the issuing fee is due after a successful test, as applicable.</p>}
              {id === 'prdps' && <p className="service-process-note">A new PrDP follows an appointment process. The team will confirm medical, eye-test, fingerprint and fee requirements before proceeding. We will confirm timing with you.</p>}
              {id === 'licence-disc-renewals' && <p className="service-process-note">The team checks the disc status and confirms applicable renewal fees before you decide to proceed.</p>}
              {id === 'change-of-ownership' && (answer === 'Dealership sale' || answer === 'Vehicle financed through a bank') && <p className="service-process-note">A roadworthy certificate is also listed in the working process notes for this transfer. If you do not have one, ask us about the roadworthy service.</p>}
              {id === 'duplicate-documents' && answer === 'Lost or stolen' && <p className="service-process-note">The affidavit should explain that the vehicle papers were lost or stolen.</p>}
              {id === 'roadworthy-certificates' && <p className="service-process-note">Share the registration number if available. We will confirm the test centre, applicable costs and next steps before booking.</p>}
              <p className="detail-muted">Checklist for this request type · required items are needed before processing; you can still send an enquiry now</p>
              {relevantDocuments.length ? <div className="service-document-list">{relevantDocuments.map((document) => {
                const key = `${id}:${document.id}`;
                const file = documents[key];
                return <div className="service-document-item" key={key}><div className="service-document-label"><strong>{document.label}<span className={document.required ? 'document-required' : 'document-optional'}>{document.required ? 'Required for processing' : 'Optional'}</span></strong>{document.note && <small>{document.note}</small>}</div><input key={`${key}-${file?.name || 'empty'}`} aria-label={`Attach ${document.label}`} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { const uploaded = event.target.files?.[0]; if (uploaded && uploaded.size > 8 * 1024 * 1024) { setError('Each document must be 8 MB or smaller.'); event.target.value = ''; return; } const count = Object.keys(documents).filter((item) => item !== key).length; if (uploaded && count >= 10) { setError('Attach no more than 10 documents.'); event.target.value = ''; return; } setError(''); setDocuments((current) => { const next = { ...current }; if (uploaded) next[key] = uploaded; else delete next[key]; return next; }); }} /><small className={file ? 'document-uploaded' : 'document-missing'}>{file ? `Uploaded · waiting for review: ${file.name}` : 'Not attached · PDF, JPG or PNG · up to 8 MB'}</small>{file && <div className="document-file-actions"><button type="button" onClick={() => window.open(URL.createObjectURL(file), '_blank', 'noopener,noreferrer')}>View file</button><button type="button" onClick={() => setDocuments((current) => { const next = { ...current }; delete next[key]; return next; })}>Remove</button></div>}</div>;
              })}</div> : id !== 'vehicle-ownership-onboarding' && <p className="small-note">Choose the request type above to see its working document checklist. We will confirm requirements with you before processing.</p>}
                </>}
            </section>;
          })}
          <div className="upload-notice"><LockKeyhole size={19} /><div><strong>Protect your personal information.</strong><p>Only upload relevant documents. Never upload bank card details. If you prefer, send the request without files and wait for our team to confirm the checklist.</p></div></div>
          <div className="form-actions"><button className="button button-quiet" type="button" onClick={() => setStep(1)}><ChevronLeft size={17} /> Back</button><button className="button button-primary" type="button" onClick={continueToContact}>Continue <ChevronRight size={17} /></button></div>
        </div>
      )}

      {step === 3 && (
        <form className="form-step" onSubmit={(event) => { event.preventDefault(); setError(''); setStep(4); }}>
          <div className="fields-grid">
            <label className="field">Full name<input name="name" autoComplete="name" required maxLength={100} value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} /></label>
            <label className="field">Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="e.g. 083 000 0000" value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} /></label>
            <label className="field">Email address <span className="optional-label">Optional</span><input name="email" type="email" autoComplete="email" maxLength={200} value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} /></label>
            <label className="field">Area or suburb<input name="suburb" autoComplete="address-level2" required maxLength={120} placeholder={selected[0] === 'vehicle-ownership-onboarding' ? 'City or suburb in South Africa' : 'Gauteng only'} value={details.suburb} onChange={(event) => setDetails({ ...details, suburb: event.target.value })} /></label>
          </div>
          <label className="field">Collection / delivery address <span className="optional-label">Optional for now</span><textarea name="address" autoComplete="street-address" rows={2} maxLength={400} placeholder="Share this after we confirm your service area, if preferred." value={details.address} onChange={(event) => setDetails({ ...details, address: event.target.value })} /></label>
          <label className="field">Anything else we should know? <span className="optional-label">Optional</span><textarea name="message" rows={3} maxLength={1000} placeholder="Please do not include ID numbers, card details or other sensitive numbers." value={details.message} onChange={(event) => setDetails({ ...details, message: event.target.value })} /></label>
          <label className="privacy-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I agree that WeQ4UServices may use these details to respond to and manage this request. I have read the <a href="/contact#privacy">privacy notice</a>.</span>
          </label>
          <div className="form-actions">
            <button className="button button-quiet" type="button" onClick={() => setStep(2)}><ChevronLeft size={17} /> Back</button>
            <button className="button button-primary" type="submit">Review request <ChevronRight size={17} /></button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form className="form-step" onSubmit={submitRequest}>
          <h3>Review your request</h3>
          <p className="muted-copy">We will review your selected services, answers and attachments, then contact you to confirm requirements and provide a quote.</p>
          <ul className="review-list">{selected.map((id) => <li key={id}><strong>{services.find((item) => item.id === id)?.name}</strong><span>{[serviceAnswers[id] || 'Situation not specified', cataloguePrices[id]?.packages?.length && (cataloguePrices[id]?.eligibleServiceDetails?.length === 0 || cataloguePrices[id]?.eligibleServiceDetails?.includes(serviceAnswers[id])) ? `Package: ${cataloguePrices[id].packages.find((item) => item.id === pricingPackage)?.name || 'Standard'}` : '', id === 'vehicle-ownership-onboarding' ? `Finance: ${financeStage}` : '', id === 'vehicle-ownership-onboarding' ? ownershipItems.map((taskId) => ownershipWorkItems.find((item) => item.id === taskId)?.label).filter(Boolean).join(', ') : '', retailerName && id === 'vehicle-ownership-onboarding' ? `Dealership: ${retailerName}` : '', referralCode && id === 'vehicle-ownership-onboarding' ? `Referral code: ${referralCode}` : '', servicePreferences[id] ? `${id === 'roadworthy-certificates' ? 'Registration' : 'Preference'}: ${servicePreferences[id]}` : '', `${Object.keys(documents).filter((key) => key.startsWith(`${id}:`)).length} file(s) attached`].filter(Boolean).join(' · ')}</span></li>)}{selected[0] !== 'door-to-door-courier' && (courierCollection || courierDelivery) && <li><strong>Courier options</strong><span>{[courierCollection ? 'Collect documents from me' : '', courierDelivery ? 'Deliver completed documents to me' : ''].filter(Boolean).join(' · ')}</span></li>}</ul>
          <p className="small-note">No payment is taken now. Do not submit documents you are unsure about; the team can confirm first.</p>
          <div className="form-actions">
            <button className="button button-quiet" type="button" onClick={() => setStep(3)}><ChevronLeft size={17} /> Back</button>
            <button className="button button-primary" type="submit" disabled={submitting || !consent}>{submitting ? 'Sending…' : 'Send service request'} <ChevronRight size={17} /></button>
          </div>
        </form>
      )}

      {step === 5 && (
        <div className="request-success" role="status">
          <div className="success-mark"><Check size={25} /></div>
          <p className="eyebrow eyebrow-dark">Request received</p>
          <h3>Your next step is a personal quote.</h3>
          <p>We have securely recorded your request. Our team will review it and contact you to confirm documents, fees and timing.</p>
          <div className="reference-box"><span>Your reference</span><strong>{reference}</strong><button className="button button-quiet reference-copy" type="button" onClick={async () => { try { if (!navigator.clipboard) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(reference); setReferenceCopied(true); } catch { setReferenceCopied(false); } }}><Copy size={14} />{referenceCopied ? 'Copied' : 'Copy'}</button></div>
          <p className="small-note">Use this reference on the Track Request page. On this browser, your request details will open automatically. No payment has been taken.</p>
          <a className="button button-whatsapp" href={`https://wa.me/27837652453?text=${encodeURIComponent(`Hi WeQ4UServices, I sent request ${reference} and would like to follow up.`)}`} target="_blank" rel="noreferrer">Continue on WhatsApp</a>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

function formatMoney(cents: number, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

function declineReasonLabel(reason?: string) {
  if (reason === 'too-expensive') return 'The price is too high';
  if (reason === 'not-ready') return 'Not ready to proceed';
  if (reason === 'chose-another-provider') return 'Chose another provider';
  if (reason === 'incorrect-details') return 'Quote details need correcting';
  if (reason === 'other') return 'Other';
  return reason || '';
}

export function RequestTracker({ variant = 'compact' }: { variant?: 'page' | 'compact' } = {}) {
  const [trackerSearchParams] = useSearchParams();
  const [reference, setReference] = useState(trackerSearchParams.get('ref') || '');
  const [accessKey, setAccessKey] = useState('');
  const [record, setRecord] = useState<RequestRecord | null>(null);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [supportingLabel, setSupportingLabel] = useState('Additional supporting documents');
  const [taskResponses, setTaskResponses] = useState<Record<string, string>>({});
  const [pendingQuoteDecision, setPendingQuoteDecision] = useState<'accept' | 'decline' | ''>('');
  const [declineReason, setDeclineReason] = useState<QuoteDeclineReason | ''>('');
  const [declineDetails, setDeclineDetails] = useState('');
  const [quoteChangeMessage, setQuoteChangeMessage] = useState('');
  const [quoteChangeOpen, setQuoteChangeOpen] = useState(false);
  const [quotePreviewUrl, setQuotePreviewUrl] = useState('');
  const [previewingQuote, setPreviewingQuote] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!quotePreviewUrl) return;
    return () => URL.revokeObjectURL(quotePreviewUrl);
  }, [quotePreviewUrl]);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setNotice(''); setRecord(null); setQuotePreviewUrl(''); setPendingQuoteDecision(''); setDeclineReason(''); setDeclineDetails('');
    try {
      const savedAccess = sessionStorage.getItem('weq4u-request-access:' + reference.trim()) || '';
      setAccessKey(savedAccess);
      const response = await fetch(apiBase + '/requests/' + encodeURIComponent(reference.trim()), { headers: savedAccess ? { 'X-Request-Access-Key': savedAccess } : {} });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not find that reference.');
      setRecord(result);
      if (result.privateAccess) sessionStorage.setItem('weq4u-request-access:' + result.ref, savedAccess);
    } catch (lookupError) { setError(lookupError instanceof Error ? lookupError.message : 'Status is temporarily unavailable.'); }
    finally { setLoading(false); }
  }

  async function decideQuote() {
    if (!record || !record.quoteBreakdown || !pendingQuoteDecision) return;
    if (pendingQuoteDecision === 'decline' && !declineReason) {
      setError('Choose a reason for declining the quote.');
      return;
    }
    if (pendingQuoteDecision === 'decline' && declineReason === 'other' && !declineDetails.trim()) {
      setError('Please tell us briefly why you are declining the quote.');
      return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiBase + '/requests/' + encodeURIComponent(record.ref) + '/quote-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Access-Key': accessKey.trim() },
        body: JSON.stringify({
          decision: pendingQuoteDecision,
          quoteId: record.quoteBreakdown.id,
          quoteVersion: record.quoteBreakdown.version,
          declineReason: pendingQuoteDecision === 'decline' ? declineReason : undefined,
          declineDetails: pendingQuoteDecision === 'decline' && declineReason === 'other' ? declineDetails.trim() : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not record your quote decision.');
      setRecord(result);
      setPendingQuoteDecision('');
      setNotice(result.quoteDecision === 'accepted' ? 'Your quote acceptance has been recorded. Review the payment options below.' : 'Your quote decision has been recorded. Thank you for letting us know.');
    } catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : 'We could not record your decision.'); }
    finally { setSaving(false); }
  }

  async function payAcceptedQuote() {
    if (!record || record.quoteDecision !== 'accepted') return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiBase}/requests/${encodeURIComponent(record.ref)}/payfast-checkout`, {
        method: 'POST',
        headers: { 'X-Request-Access-Key': accessKey.trim() },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not start secure checkout.');
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = result.action;
      form.hidden = true;
      for (const [name, value] of Object.entries(result.fields as Record<string, string>)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'We could not start secure checkout.');
      setSaving(false);
    }
  }

  async function requestQuoteChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record?.quoteBreakdown || !quoteChangeMessage.trim()) {
      setError('Tell us what you would like changed in the quote.');
      return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiBase}/requests/${encodeURIComponent(record.ref)}/quote-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Access-Key': accessKey.trim() },
        body: JSON.stringify({
          quoteId: record.quoteBreakdown.id,
          quoteVersion: record.quoteBreakdown.version,
          message: quoteChangeMessage.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not send your quote change request.');
      setRecord(result);
      setQuoteChangeOpen(false);
      setQuoteChangeMessage('');
      setNotice('Your quote change request has been sent to WeQ4U.');
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'We could not send your quote change request.');
    } finally { setSaving(false); }
  }

  async function downloadQuotePdf() {
    if (!record?.quoteBreakdown) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`${apiBase}/requests/${encodeURIComponent(record.ref)}/quote.pdf`, {
        headers: { 'X-Request-Access-Key': accessKey.trim() },
      });
      if (!response.ok) {
        const result = response.headers.get('content-type')?.includes('application/json')
          ? await response.json()
          : null;
        throw new Error(result?.error || 'We could not download this quote.');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${record.quoteBreakdown.quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'We could not download this quote.');
    } finally { setSaving(false); }
  }

  async function toggleQuotePreview() {
    if (quotePreviewUrl) {
      setQuotePreviewUrl('');
      return;
    }
    if (!record?.quoteBreakdown) return;
    setPreviewingQuote(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/requests/${encodeURIComponent(record.ref)}/quote.pdf`, {
        headers: { 'X-Request-Access-Key': accessKey.trim() },
      });
      if (!response.ok) {
        const result = response.headers.get('content-type')?.includes('application/json')
          ? await response.json()
          : null;
        throw new Error(result?.error || 'We could not preview this quote.');
      }
      const blob = await response.blob();
      setQuotePreviewUrl(URL.createObjectURL(blob));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'We could not preview this quote.');
    } finally {
      setPreviewingQuote(false);
    }
  }

  async function uploadDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    const attached = Object.entries(files).filter(([, file]) => !!file);
    if (!attached.length) { setError('Choose at least one requested document to upload.'); return; }
    const data = new FormData();
    data.append('documentLabels', JSON.stringify(attached.map(([label]) => label)));
    data.append('requestedDocumentLabels', JSON.stringify(attached.map(([label]) => label)));
    attached.forEach(([, file]) => data.append('documents', file));
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiBase + '/requests/' + encodeURIComponent(record.ref) + '/documents', { method: 'POST', headers: { 'X-Request-Access-Key': accessKey.trim() }, body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not upload these documents.');
      setRecord(result); setFiles({}); setNotice('Your documents have been uploaded securely and are waiting for review.');
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'We could not upload these documents.'); }
    finally { setSaving(false); }
  }

  async function uploadSupportingDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || supportingFiles.length === 0) {
      setError('Choose at least one supporting document to upload.');
      return;
    }
    const form = event.currentTarget;
    if ((record.documents?.length || 0) + supportingFiles.length > 10) {
      setError('A request can contain no more than 10 documents in total.');
      return;
    }
    const data = new FormData();
    const labels = supportingFiles.map(() => supportingLabel.trim());
    data.append('documentLabels', JSON.stringify(labels));
    data.append('requestedDocumentLabels', JSON.stringify([]));
    supportingFiles.forEach((file) => data.append('documents', file));
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiBase + '/requests/' + encodeURIComponent(record.ref) + '/documents', { method: 'POST', headers: { 'X-Request-Access-Key': accessKey.trim() }, body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not upload these documents.');
      setRecord(result);
      setSupportingFiles([]);
      form.reset();
      setNotice('Your supporting documents were uploaded securely and sent to our team for review.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'We could not upload these documents.');
    } finally { setSaving(false); }
  }

  async function respondToTask(taskId: string) {
    if (!record) return;
    const responseText = taskResponses[taskId]?.trim() || '';
    if (!responseText) { setError('Write a short response before sending it.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiBase}/requests/${encodeURIComponent(record.ref)}/customer-tasks/${encodeURIComponent(taskId)}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Access-Key': accessKey.trim() },
        body: JSON.stringify({ response: responseText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not send your response.');
      setRecord(result);
      setTaskResponses((current) => ({ ...current, [taskId]: '' }));
      setNotice('Your response was sent. WeQ4U will review it.');
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'We could not send your response.');
    } finally { setSaving(false); }
  }

  const quoteCurrency = record?.quoteBreakdown?.currency || record?.quoteCurrency || 'ZAR';
  const quoteReady = record?.status === 'Your quote is ready' && !record.quoteDecision;
  const serviceName = (record?.services || []).map((id) => services.find((item) => item.id === id)?.name || id).join(', ') || 'Confirmed by our team';

  return (
    <section className={`tracker-panel${variant === 'page' ? ' track-workspace' : ''}`} id="track-request">
      {variant !== 'page' && <div><p className="eyebrow eyebrow-dark">Already contacted us?</p><h2>Track a request</h2><p className="muted-copy">Enter the one reference from your confirmation. New requests open on any device; there is no separate key to remember. Keep your reference private.</p></div>}
      <form className="tracker-form track-search-card" onSubmit={lookup}>
        <div className="track-search-copy"><strong>Track a request</strong><p>Enter the one reference from your confirmation. Keep your reference private.</p></div>
        <label className="visually-hidden" htmlFor="request-reference">Request reference</label>
        <div className="track-search-row">
          <input id="request-reference" value={reference} onChange={(event) => { const value = event.target.value; setReference(value); setAccessKey(sessionStorage.getItem('weq4u-request-access:' + value.trim()) || ''); }} placeholder="WQ-2026-0CFF0627125C547A3408" required />
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Checking...' : <><Search size={16} /> Track</>}</button>
        </div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="tracker-notice" role="status">{notice}</p>}
      {record && (
        <div className="tracking-result" role="status">
          <div className="track-summary">
            <div><span>Request</span><strong>{record.ref}</strong></div>
            {record.privateAccess && <div><span>Service</span><strong>{serviceName}</strong></div>}
            <div><span>Submitted</span><strong>{new Date(record.createdAt).toLocaleDateString('en-ZA')}</strong></div>
            <div><span>Current status</span><strong>{record.status}</strong></div>
            <div className="track-summary-wide"><span>What happens next</span><strong>{record.nextStep || 'Our team will review your request and contact you with an update.'}</strong></div>
            <div><span>Last updated</span><strong>{new Date(record.updatedAt).toLocaleString('en-ZA')}</strong></div>
            {record.privateAccess && !!record.workItems?.length && <div className="tracking-scope track-summary-wide"><span>Help you asked for</span><strong>{[record.vehicleContext?.financeStage, ...record.workItems.map((id) => ({ 'ownership-transfer': 'Ownership papers', registration: 'Vehicle registration', 'licence-disc': 'Licence disc and licensing', roadworthy: 'Roadworthy help', 'document-handover': 'Vehicle papers', 'not-sure': 'Guidance from our team' } as Record<string, string>)[id] || id)].filter(Boolean).join(' · ')}</strong></div>}
          </div>
          {record.status !== 'Request closed' && <ol className="status-steps" aria-label="Request progress">{requestJourney.map((stage, index) => {
            const currentIndex = journeyStageIndex[record.journeyStage || ''] ?? -1;
            return <li key={stage} className={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''} aria-current={index === currentIndex ? 'step' : undefined}><span>{index < currentIndex ? <Check size={14} /> : index + 1}</span>{stage}</li>;
          })}</ol>}
          {record.privateAccess && record.quoteAmount !== null && record.quoteAmount !== undefined && record.quoteBreakdown && <div className="customer-quote">
            <div className="customer-quote-heading"><div><span>{quoteReady ? 'Quote available' : record.quoteDecision ? 'Quote decision recorded' : 'Quote'}</span><strong>{quoteReady ? 'Your quote is ready to review' : record.quoteDecision ? `You ${record.quoteDecision} this quote` : 'This quote is on your request'}</strong></div><span className="quote-status-pill">{record.quoteDecision ? record.quoteDecision : quoteReady ? 'Awaiting your decision' : record.status}</span></div>
            <div className="quote-facts">
              <div><span>Quote number</span><strong>{record.quoteBreakdown.quoteNumber}</strong></div>
              <div><span>Amount</span><strong>{formatMoney(record.quoteBreakdown.totalCents, quoteCurrency)}</strong></div>
              <div><span>Package</span><strong>{record.quoteBreakdown.packageName || 'Standard'}</strong></div>
              <div><span>Valid until</span><strong>{record.quoteBreakdown.validUntil || 'Confirm with us'}</strong></div>
            </div>
            {record.quoteBreakdown.pricingBasisLabel && <div className="quote-estimate-notice"><strong>{record.quoteBreakdown.pricingBasisLabel}</strong><span>{record.quoteBreakdown.estimateDisclaimer}</span></div>}
            <div className="quote-approved-meta">
              <span>Approved quote version {record.quoteBreakdown.version || 1}</span>
              <span>{record.quoteBreakdown.pricingBasis === 'case-specific-manual' ? 'Case-specific pricing' : `Pricing version v${record.quoteBreakdown.profileVersion || 1}`}</span>
            </div>
            <div className="quote-actions quote-toolbar">
              <button type="button" className="quote-preview-button" disabled={previewingQuote || saving} onClick={toggleQuotePreview}><Eye size={15} /> {previewingQuote ? 'Loading preview…' : quotePreviewUrl ? 'Hide preview' : 'Preview quote'}</button>
              <button type="button" className="quote-pdf-button" disabled={saving} onClick={downloadQuotePdf}><Download size={15} /> {saving ? 'Preparing PDF…' : 'Download PDF'}</button>
              {quoteReady && !pendingQuoteDecision && <>
                <button type="button" className="quote-accept" disabled={saving} onClick={() => { setQuoteChangeOpen(false); setPendingQuoteDecision('accept'); }}><Check size={15} /> Accept</button>
                <button type="button" className="quote-decline" disabled={saving} onClick={() => { setQuoteChangeOpen(false); setPendingQuoteDecision('decline'); }}><X size={15} /> Decline</button>
                <button type="button" className={`quote-change${quoteChangeOpen ? ' is-open' : ''}`} disabled={saving} onClick={() => { setPendingQuoteDecision(''); setQuoteChangeOpen((open) => !open); }}><span /> Request change</button>
              </>}
            </div>
            {quotePreviewUrl && <div className="customer-quote-preview"><iframe title={`Quote preview ${record.quoteBreakdown.quoteNumber}`} src={quotePreviewUrl} /></div>}
            <div className="customer-quote-lines" id="quote-preview">{record.quoteBreakdown.lines.map((line) => <div className="quote-line" key={line.componentId}><span>{line.label}</span><strong>{formatMoney(line.amountCents, quoteCurrency)}</strong></div>)}<div className="quote-line quote-total"><strong>Total</strong><strong>{formatMoney(record.quoteBreakdown.totalCents, quoteCurrency)}</strong></div>{record.quoteBreakdown.vatTreatment && <p>VAT treatment: {record.quoteBreakdown.vatTreatment === 'inclusive' ? 'Prices include VAT' : record.quoteBreakdown.vatTreatment === 'exclusive' ? 'VAT added separately' : 'VAT not applicable'}</p>}{!!record.quoteBreakdown.conditions?.length && <div className="customer-quote-terms"><strong>Conditions</strong><ul>{record.quoteBreakdown.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></div>}{!!record.quoteBreakdown.requiredDocuments?.length && <div className="customer-quote-terms"><strong>Documents to provide</strong><ul>{record.quoteBreakdown.requiredDocuments.map((document) => <li key={document}>{document}</li>)}</ul></div>}{record.quoteBreakdown.notes && <p><strong>What happens next:</strong> {record.quoteBreakdown.notes}</p>}</div>
            {record.quoteDecision
              ? <div className="quote-decision-recorded"><strong>Decision recorded: {record.quoteDecision}</strong>{record.quoteDecisionAt && <small>{new Date(record.quoteDecisionAt).toLocaleString('en-ZA')}{record.quoteDecisionVersion ? ` · Quote version ${record.quoteDecisionVersion}` : ''}</small>}{record.quoteDecisionReason && <small>Reason: {declineReasonLabel(record.quoteDecisionReason)}{record.quoteDecisionReasonDetails ? ` · ${record.quoteDecisionReasonDetails}` : ''}</small>}</div>
              : quoteReady ? <>
                {quoteChangeOpen && <form className="quote-change-form" onSubmit={requestQuoteChange}><label>What would you like changed?<textarea rows={3} maxLength={500} required value={quoteChangeMessage} onChange={(event) => setQuoteChangeMessage(event.target.value)} placeholder="Tell us what needs correcting or what you would like to discuss." /></label><div className="quote-actions"><button type="submit" disabled={saving || !quoteChangeMessage.trim()}>{saving ? 'Sending…' : 'Send change request'}</button><button type="button" disabled={saving} onClick={() => setQuoteChangeOpen(false)}>Cancel</button></div></form>}
                {pendingQuoteDecision && <div className="quote-confirmation"><strong>{pendingQuoteDecision === 'accept' ? 'Confirm you want to accept this quote?' : 'Tell us why you are declining this quote.'}</strong><p>Total: {formatMoney(record.quoteBreakdown.totalCents, quoteCurrency)}</p>{pendingQuoteDecision === 'decline' && <><label>Reason<select value={declineReason} onChange={(event) => setDeclineReason(event.target.value as QuoteDeclineReason | '')}><option value="">Choose a reason</option><option value="too-expensive">The price is too high</option><option value="not-ready">I am not ready to proceed</option><option value="chose-another-provider">I chose another provider</option><option value="incorrect-details">The quote details need correcting</option><option value="other">Other</option></select></label>{declineReason === 'other' && <label>Tell us more<textarea rows={2} maxLength={500} value={declineDetails} onChange={(event) => setDeclineDetails(event.target.value)} /></label>}</>}<div className="quote-actions"><button type="button" disabled={saving} onClick={decideQuote}>{saving ? 'Saving...' : pendingQuoteDecision === 'accept' ? 'Confirm acceptance' : 'Confirm decline'}</button><button type="button" disabled={saving} onClick={() => { setPendingQuoteDecision(''); setDeclineReason(''); setDeclineDetails(''); }}>Cancel</button></div></div>}
              </> : <p>This quote is no longer available for a decision. Contact us if you need help.</p>}
            {record.quoteDecision === 'accepted' && record.paymentStatus === 'paid' && <p className="quote-decision-recorded">Payment verified. Your request is now being processed.</p>}
            {record.quoteDecision === 'accepted' && record.paymentStatus !== 'paid' && <div className="quote-confirmation">
              <strong>{record.paymentStatus === 'pending' ? 'Payment confirmation is pending' : 'Next step: payment'}</strong>
              <p>We will start processing only after PayFast confirms payment.</p>
              {record.paymentAvailable
                ? <button type="button" className="quote-accept" disabled={saving} onClick={payAcceptedQuote}>{saving ? 'Opening secure checkout…' : 'Continue to secure PayFast checkout'}</button>
                : <small>Online payment is not configured in this environment. Contact WeQ4U to arrange payment.</small>}
            </div>}
            {record.quoteDecision !== 'accepted' && <small>Quote acceptance records your decision; no payment is taken until you choose a payment option.</small>}
          </div>}
          {record.privateAccess && !!record.customerTasks?.some((task) => task.type !== 'document') && <div className="customer-tasks">
            <strong>Actions for you</strong>
            {record.customerTasks.filter((task) => task.type !== 'document').slice().reverse().map((task) => <article key={task.id}>
              <div><b>{task.title}</b><span>{task.status === 'waiting-on-customer' ? 'Your turn' : task.status === 'response-received' ? 'We are reviewing your reply' : 'Complete'}</span></div>
              <p>{task.message}</p>
              {task.dueDate && <small>Please reply by {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en-ZA')}.</small>}
              {task.status === 'waiting-on-customer'
                ? <><label className="visually-hidden" htmlFor={`task-response-${task.id}`}>Your response to {task.title}</label><textarea id={`task-response-${task.id}`} rows={3} maxLength={2000} value={taskResponses[task.id] || ''} onChange={(event) => setTaskResponses((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Type your answer here." /><button className="button button-quiet" type="button" disabled={saving || !taskResponses[task.id]?.trim()} onClick={() => respondToTask(task.id)}>{saving ? 'Sending...' : 'Send answer'}</button></>
                : task.response && <blockquote>Your response: {task.response}</blockquote>}
            </article>)}
          </div>}
          {record.privateAccess && !!record.requestedDocuments?.length && <form className="customer-document-actions" onSubmit={uploadDocuments}><strong>Documents requested by WeQ4U</strong>{record.requestedDocuments.map((label) => <label key={label}>{label}<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 8 * 1024 * 1024) { setError('Each document must be 8 MB or smaller.'); event.target.value = ''; return; } setError(''); setFiles((current) => ({ ...current, [label]: file! })); }} /><small>{files[label]?.name || 'PDF, JPG or PNG - up to 8 MB'}</small></label>)}<button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Uploading...' : 'Upload requested documents'}</button></form>}
          {record.privateAccess && !['Request closed', 'Completed', 'Quote decision recorded'].includes(record.status) && <form className="customer-document-actions supporting-document-upload" onSubmit={uploadSupportingDocuments}><strong><Upload size={15} /> Send supporting documents</strong><p>Have another file that may help with your request? Add it here for our team to review.</p><label>What is this document?<input type="text" maxLength={100} value={supportingLabel} onChange={(event) => setSupportingLabel(event.target.value)} required /></label><label>Choose document(s)<input type="file" accept="application/pdf,image/jpeg,image/png" multiple onChange={(event) => { const selectedFiles = Array.from(event.target.files || []); if (selectedFiles.some((file) => file.size > 8 * 1024 * 1024)) { setError('Each document must be 8 MB or smaller.'); event.target.value = ''; return; } if ((record.documents?.length || 0) + selectedFiles.length > 10) { setError('A request can contain no more than 10 documents in total.'); event.target.value = ''; return; } setError(''); setSupportingFiles(selectedFiles); }} /><small>{supportingFiles.length ? `${supportingFiles.length} file${supportingFiles.length === 1 ? '' : 's'} selected` : 'PDF, JPG or PNG · up to 8 MB each · 10 files per request'}</small></label><button className="button button-primary" type="submit" disabled={saving || !supportingFiles.length}>{saving ? 'Uploading...' : 'Send supporting documents'}</button><small>Only send files related to this request. Never upload bank card details.</small></form>}
          {record.privateAccess && !!record.documents?.length && <div className="customer-document-actions customer-document-list"><strong><Upload size={15} /> Documents sent</strong>{record.documents.map((document, index) => <p key={`${document.label}-${document.uploadedAt}-${index}`}><b>{document.label}</b><small>Received {new Date(document.uploadedAt).toLocaleString('en-ZA')} · {document.reviewState === 'received' ? 'Received for review' : document.reviewState}</small></p>)}</div>}
          {record.privateAccess && !!record.timeline?.length && <div className="tracker-timeline"><strong>Request timeline</strong><ol>{record.timeline.slice().reverse().map((event, index) => <li key={event.at + '-' + index}><i aria-hidden="true" /><div><b>{event.status}</b><span>{event.message}</span></div><time>{new Date(event.at).toLocaleString('en-ZA')}</time></li>)}</ol></div>}
          {!record.privateAccess && <p className="tracker-private-hint">For your privacy, this reference shows basic status here. Open the request in the browser you used to send it, or contact WeQ4U for help with a quote or document upload.</p>}
          <p className="small-note">For help with your request, call or WhatsApp 083 765 2453.</p>
        </div>
      )}
    </section>
  );
}
