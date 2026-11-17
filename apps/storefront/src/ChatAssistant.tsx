import { useState, type FormEvent } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { services } from './site-data';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const quickReplies = ["Learner / Driver Licence", 'PrDP', 'Licence Disc', 'Vehicle Registration', 'Change of Ownership', 'Duplicate Documents', 'Roadworthy', 'Courier'];
const quickReplyServices: Record<string, string> = {
  'Learner / Driver Licence': 'drivers-licences',
  PrDP: 'prdps',
  'Licence Disc': 'licence-disc-renewals',
  'Vehicle Registration': 'vehicle-registrations',
  'Change of Ownership': 'change-of-ownership',
  'Duplicate Documents': 'duplicate-documents',
  Roadworthy: 'roadworthy-certificates',
  Courier: 'door-to-door-courier',
};

type Message = { from: 'assistant' | 'visitor'; text: string };

const serviceAnswers: Record<string, string> = {
  'drivers-licences': "Learner and driver licence help: our team can discuss the booking steps and what to prepare. The applicant must attend the licensing centre for the appointment and any required eye test or test. The exact process differs for a learner test, first driver test, renewal or conversion, so tell us which one you need. We confirm the current checklist, authority fees and appointment route before you proceed.",
  prdps: 'PrDP (Professional Driving Permit) help: the applicant attends in person for the required centre steps. Our working notes mention a medical certificate for a new application, an eye test and a separate fingerprint step. Requirements can depend on the application, so our team will confirm the current checklist, payment points and timing before you proceed. We do not guarantee an appointment or issue date.',
  'licence-disc-renewals': 'Licence disc renewal: we check the vehicle licence status and confirm the amount due before proceeding. The licensing authority charge can depend on the vehicle and its licence status; any WeQ4UServices handling fee and delivery are shown separately in your quote. We will confirm the documents and collection or delivery option with you.',
  'vehicle-registrations': 'Vehicle registration support can cover a new registration and related licensing matters. The service list also mentions deregistration, address or title-holder changes, company registrations, notices of ownership change and traffic-register-number services. These are different transactions, so tell us which one applies and our team will confirm availability, documents and authority charges.',
  'change-of-ownership': 'Change of ownership: the paperwork depends on how the vehicle is changing hands. A bank-financed vehicle may need the bank settlement and proxy details; a dealership sale may need dealer and buyer documents. A roadworthy certificate may also be required for the transaction. We check your case and confirm the exact approved checklist before asking you to provide documents.',
  'duplicate-documents': 'Duplicate vehicle documents: this is for replacing a vehicle document that is lost, stolen or damaged. The working notes mention a certified owner ID copy and an affidavit for a lost or stolen document. The exact form and requirements depend on which document is missing, so please tell us what needs replacing and wait for our team to confirm the checklist.',
  'roadworthy-certificates': 'Roadworthy support: we can discuss coordinating the inspection process. The vehicle must be inspected by an authorised testing station and the station decides whether it passes. Inspection, certificate, repairs and any retest charges are separate from our handling fee; we confirm the current options and costs before booking.',
  'door-to-door-courier': 'Door-to-door courier: collection and return delivery may be available across greater Gauteng. Availability, route, timing and courier charge depend on your suburb and the request. We confirm these in your quote before arranging collection. Please do not send identity documents through chat.',
};

function detectService(topic: string) {
  const text = topic.toLowerCase();
  if (/prdp|pdp|professional driving/.test(text)) return 'prdps';
  if (/disc|vehicle licence|license disc/.test(text)) return 'licence-disc-renewals';
  if (/ownership|nco|title holder/.test(text)) return 'change-of-ownership';
  if (/duplicate|lost|stolen|replacement document/.test(text)) return 'duplicate-documents';
  if (/roadworthy|road worthy|rwc/.test(text)) return 'roadworthy-certificates';
  if (/courier|collect|deliver/.test(text)) return 'door-to-door-courier';
  if (/registration|deregister|address change|register a vehicle|company vehicle/.test(text)) return 'vehicle-registrations';
  if (/learner|driver.?s licence|driving licence|licence test|license test/.test(text)) return 'drivers-licences';
  const matched = services.find((service) => text.includes(service.name.toLowerCase()));
  return matched?.id;
}

function answerFor(topic: string) {
  const text = topic.toLowerCase();
  const serviceId = detectService(topic);
  if (text.includes('area') || text.includes('gauteng')) return 'We are based in Gauteng and serve the greater Gauteng area: Johannesburg, Pretoria/Tshwane, Ekurhuleni, the West Rand and the Vaal. Tell us your suburb so we can confirm availability.';
  if (text.includes('turnaround') || text.includes('how long') || text.includes('when')) return 'Timing depends on the service and the relevant licensing office or testing station. We will confirm the expected timing for your request; we cannot guarantee an authority issue date.';
  if (text.includes('secure upload') || text.includes('send my id') || text.includes('send documents')) return 'Please do not send identity documents, ID numbers or card details in chat or ordinary email. First ask our team which documents are needed and use the private upload route only when they have confirmed it is appropriate.';
  if (text.includes('cost') || text.includes('price') || text.includes('how much') || text.includes('pay')) return 'We send a quote before you decide. It separates our handling fee from authority charges and any courier, testing, medical or other third-party costs. The exact total depends on your case; payment steps are confirmed with the quote.';
  if (serviceId && serviceAnswers[serviceId]) return serviceAnswers[serviceId];
  if (text.includes('document') || text.includes('what do i need') || text.includes('requirements')) return 'The checklist depends on the exact transaction and is confirmed by our team. Please do not send identity documents or sensitive numbers in chat. Tell us which service you need and we will explain the next step.';
  if (text.includes('how does') || text === 'how') return 'Choose the service you need, share your contact details and suburb, and our team will confirm the scope, checklist and quote. After you accept, we coordinate the agreed steps and return delivery where requested.';
  return 'I can explain our services or connect you with the team for a case-specific answer. Please do not share ID numbers or documents in chat. Call or WhatsApp 083 765 2453.';
}

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: 'assistant', text: 'Hi! I’m the WeQ4U assistant. Choose a service or ask a question. Please do not share ID numbers or documents in chat.' },
  ]);
  const [question, setQuestion] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [leadMessage, setLeadMessage] = useState('');
  const [leadCourierCollection, setLeadCourierCollection] = useState(false);
  const [leadCourierDelivery, setLeadCourierDelivery] = useState(false);

  function ask(topic: string) {
    const serviceId = detectService(topic);
    setMessages((current) => [...current, { from: 'visitor', text: topic }, { from: 'assistant', text: answerFor(topic) }]);
    if (serviceId === 'door-to-door-courier') {
      setSelectedService('');
      setLeadMessage('Courier is an optional add-on. Choose the main service you need in the callback form, then select collection or delivery if relevant.');
    } else if (serviceId) {
      setSelectedService(serviceId);
      setLeadMessage('');
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    ask(value);
    setQuestion('');
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setLeadMessage('Please accept the privacy notice before asking us to call you.');
      return;
    }
    const values = new FormData(event.currentTarget);
    values.append('services', selectedService);
    values.append('courierCollection', String(leadCourierCollection));
    values.append('courierDelivery', String(leadCourierDelivery));
    values.append('consent', 'true');
    values.append('source', 'chatbot');
    setSending(true);
    setLeadMessage('');
    try {
      const response = await fetch(`${apiBase}/requests`, { method: 'POST', body: values });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again or call us directly.');
      setMessages((current) => [...current, { from: 'assistant', text: `Thanks. Your call-back request is saved as ${result.ref}. We’ll be in touch.` }]);
      setShowLeadForm(false);
    } catch (error) {
      setLeadMessage(error instanceof Error ? error.message : 'Please try again or call us directly.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label="Ask WeQ4U chat">
          <header className="chat-header"><div><span className="chat-avatar"><MessageCircle size={17} /></span><div><strong>Ask WeQ4U</strong><small>Service information and next steps</small></div></div><button className="chat-close" type="button" aria-label="Close chat" onClick={() => setOpen(false)}><X size={19} /></button></header>
          <div className="chat-messages" aria-live="polite">
            {messages.map((message, index) => <p key={`${message.from}-${index}`} className={`chat-message ${message.from}`}>{message.text}</p>)}
            {showLeadForm && (
              <form className="chat-lead-form" onSubmit={submitLead}>
                <p className="chat-privacy">Privacy notice: we will use these details only to respond to your request. Please do not share ID numbers or card details here.</p>
                <label>Name<input name="name" required maxLength={100} autoComplete="name" /></label>
                <label>Phone<input name="phone" type="tel" required maxLength={30} autoComplete="tel" /></label>
                <label>Area / suburb<input name="suburb" required maxLength={120} /></label>
                <label>What do you need?<select required value={selectedService} onChange={(event) => { setSelectedService(event.target.value); setLeadMessage(''); }}><option value="">Choose one primary service</option>{services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
                <fieldset className="chat-courier-options"><legend>Optional courier add-ons</legend><label><input type="checkbox" checked={leadCourierCollection} onChange={(event) => setLeadCourierCollection(event.target.checked)} /> Collect documents from me</label><label><input type="checkbox" checked={leadCourierDelivery} onChange={(event) => setLeadCourierDelivery(event.target.checked)} /> Deliver completed documents to me</label></fieldset>
                <label className="chat-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I agree to be contacted about this request.</label>
                <button className="button button-primary" disabled={sending}>{sending ? 'Sending…' : 'Request a call back'} <Send size={14} /></button>
                {leadMessage && <span className="form-error" role="alert">{leadMessage}</span>}
              </form>
            )}
          </div>
          {!showLeadForm && <div className="chat-actions">
            <form className="chat-question-form" onSubmit={submitQuestion}>
              <label className="chat-label" htmlFor="chat-question">Ask about a service</label>
              <div><input id="chat-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} placeholder="e.g. What happens for a PrDP?" /><button type="submit" aria-label="Send question"><Send size={15} /></button></div>
            </form>
            <p className="chat-label">Or choose a service</p><div className="chat-chips">{quickReplies.map((reply) => <button type="button" key={reply} onClick={() => ask(reply)}>{reply}</button>)}</div>
            <div className="chat-footer-actions"><button type="button" onClick={() => setShowLeadForm(true)}>Request a call back</button><a href="https://wa.me/27837652453?text=Hi%20WeQ4U%2C%20I%20need%20help%20with%20a%20service." target="_blank" rel="noreferrer">Chat on WhatsApp <Send size={13} /></a></div>
          </div>}
        </section>
      )}
      <button className={`chat-launcher ${open ? 'is-open' : ''}`} type="button" aria-label={open ? 'Close Ask WeQ4U chat' : 'Open Ask WeQ4U chat'} onClick={() => setOpen((value) => !value)}>{open ? <X size={23} /> : <><MessageCircle size={21} /><span>Ask WeQ4U</span></>}</button>
    </div>
  );
}
