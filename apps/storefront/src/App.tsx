import { useEffect, useState, type CSSProperties } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowLeftRight, ArrowRight, BadgeCheck, Check, ChevronDown, ChevronRight,
  ClipboardCheck, FileText, Files, Menu, PackageCheck, Phone, Send, ShieldCheck,
  Truck, X, CarFront, MapPin, Mail, Clock3, Headset, type LucideIcon,
} from 'lucide-react';
import ChatAssistant from './ChatAssistant';
import { QuoteDecisionPage, QuoteShortLinkPage } from './QuoteDecisionPage';
import { RequestFlow, RequestTracker } from './RequestFlow';
import { faqs, services, trustPoints, type Service } from './site-data';
import './styles.css';

const phoneLabel = '083 765 2453';
const phoneHref = 'tel:+27837652453';
const whatsappHref = 'https://wa.me/27837652453';
const emails = ['william.mpeta@gmail.com', 'shelod@gmail.com'];

const serviceIcons: Record<string, LucideIcon> = {
  'steering-wheel': CarFront,
  truck: Truck,
  badge: BadgeCheck,
  'car-front': CarFront,
  'arrow-left-right': ArrowLeftRight,
  files: Files,
  'clipboard-check': ClipboardCheck,
  'package-check': PackageCheck,
};

function BrandMark({ light = false }: { light?: boolean }) {
  return <span className={`wordmark ${light ? 'wordmark-light' : ''}`} aria-label="WeQ4UServices">WeQ4U<span>Services</span></span>;
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  const navItems = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About Us' },
    { to: '/services', label: 'Services' },
    { to: '/vehicle-ownership', label: 'Just bought a car?' },
    { to: '/partners', label: 'For partners' },
    { to: '/track-request', label: 'Track Request' },
    { to: '/contact', label: 'Contact Us' },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand-link" aria-label="WeQ4UServices home"><BrandMark /></Link>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={`primary-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {navItems.map(({ to, label, end }) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <a className="header-cta" href={phoneHref}><Phone size={16} /> Free consultation</a>
      </div>
    </header>
  );
}

function TrustStrip({ compact = false }: { compact?: boolean }) {
  return <div className={`trust-strip ${compact ? 'trust-compact' : ''}`}>{trustPoints.map((point) => <span key={point}><Check size={15} strokeWidth={2.5} />{point}</span>)}</div>;
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const Icon = serviceIcons[service.icon] || FileText;
  return (
    <article className="service-card" style={{ '--card-index': index } as CSSProperties}>
      <div className="service-card-top"><span className="service-icon"><Icon size={21} strokeWidth={1.8} /></span>{service.tag && <span className={`service-tag ${service.tag === 'Most popular' ? 'tag-popular' : ''}`}>{service.tag}</span>}</div>
      <h3>{service.name}</h3>
      <p>{service.summary}</p>
      <Link to={`/services#${service.id}`} className="text-link">Service details <ArrowRight size={15} /></Link>
    </article>
  );
}

function HowItWorks() {
  const steps = [
    { title: 'Contact us', text: 'Call, WhatsApp or email and tell us what you need.', icon: Headset },
    { title: 'We handle it', text: 'We confirm the documents and quote, then process the paperwork.', icon: FileText },
    { title: 'Keep track', text: 'Follow request updates online. Collection or return delivery can be quoted where available.', icon: PackageCheck },
  ];
  return (
    <section className="section section-paper how-section">
      <div className="section-heading"><p className="eyebrow eyebrow-dark">Simple from start to finish</p><h2>Three steps. No office queues.</h2></div>
      <div className="steps-grid">{steps.map(({ title, text, icon: Icon }, index) => <article className="step-card" key={title}><span className="step-number">0{index + 1}</span><span className="step-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p>{index < 2 && <ArrowRight className="step-connector" size={22} />}</article>)}</div>
    </section>
  );
}

function ContactBand() {
  return (
    <section className="contact-band">
      <div className="contact-band-copy"><p className="eyebrow eyebrow-mint">A simpler way to get it sorted</p><h2>Get in touch today.</h2><p>Tell us what you need. Your consultation is free and there is no obligation.</p></div>
      <div className="contact-band-actions"><a className="button button-amber" href={phoneHref}><Phone size={17} /> Call {phoneLabel}</a><a className="button button-whatsapp" href={`${whatsappHref}?text=${encodeURIComponent('Hi WeQ4U, I would like a free consultation.')}`} target="_blank" rel="noreferrer"><Send size={16} /> WhatsApp us</a><div className="contact-band-emails">{emails.map((email) => <a key={email} href={`mailto:${email}`}><Mail size={14} />{email}</a>)}</div></div>
    </section>
  );
}

function HomePage() {
  usePageTitle('Home');
  return <main>
    <section className="hero-section">
      <div className="hero-pattern" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-copy"><span className="hero-pill"><span className="pill-dot" /> Local document support across Gauteng</span><p className="eyebrow eyebrow-mint">Support for what comes next</p><h1>You bought the car. We can help with the paperwork.</h1><p className="hero-summary">From ownership papers to licence renewals, we explain what is needed, confirm the quote and keep you updated.</p><p className="hero-location"><MapPin size={16} /> Based in Gauteng — serving the greater Gauteng area</p><div className="hero-actions"><a className="button button-amber" href={phoneHref}><Phone size={17} /> Free consultation</a><Link className="button button-outline" to="/contact#request-form">I need help <ArrowDownRight size={17} /></Link></div><div className="hero-proof"><ShieldCheck size={17} /> Independent service — not a government department</div></div>
        <div className="hero-visual hero-journey-visual" aria-label="How a WeQ4U request works"><div className="hero-journey-top"><span className="journey-label"><CarFront size={17} /> NEW VEHICLE OWNER</span><h2>Your next step,<br />made clear.</h2><p>One request. A real person. Updates you can follow.</p></div><ol className="hero-journey-list"><li className="current"><span>01</span><div><strong>Tell us what you need</strong><small>Choose the help that fits.</small></div><Check size={17} /></li><li><span>02</span><div><strong>We check your request</strong><small>We confirm the papers and quote.</small></div><ChevronRight size={17} /></li><li><span>03</span><div><strong>You choose what happens next</strong><small>No work starts before you agree.</small></div><ChevronRight size={17} /></li><li><span>04</span><div><strong>Follow your progress</strong><small>Use your request reference.</small></div><ChevronRight size={17} /></li></ol><div className="hero-journey-foot"><ShieldCheck size={17} /><span>Your request is reviewed by a person.</span></div></div>
      </div>
      <TrustStrip />
    </section>

    <section className="section owner-pathways" aria-labelledby="start-heading"><div className="section-heading"><p className="eyebrow eyebrow-dark">Start with what you need</p><h2 id="start-heading">What would you like help with?</h2><p>Choose a path. We will guide you one small step at a time.</p></div><div className="owner-pathway-grid"><Link className="owner-pathway owner-pathway-primary" to="/vehicle-ownership"><span className="service-icon"><CarFront size={24} /></span><span className="owner-pathway-kicker">For new car owners</span><strong>I just bought a car</strong><small>Get help with transfer, registration, licensing and papers.</small><span className="owner-pathway-link">Start here <ArrowRight size={16} /></span></Link><Link className="owner-pathway" to="/services"><span className="service-icon"><FileText size={24} /></span><span className="owner-pathway-kicker">For any other request</span><strong>I need a different service</strong><small>Driver licence, PrDP, licence disc, duplicates or roadworthy.</small><span className="owner-pathway-link">See services <ArrowRight size={16} /></span></Link></div></section>

    <section className="section section-paper services-overview">
      <div className="section-heading section-heading-split"><div><p className="eyebrow eyebrow-dark">What we can help with</p><h2>Paperwork made lighter.</h2></div><p>From a licence renewal to a change of ownership, we take the paperwork off your hands.</p></div>
      <div className="services-grid">{services.filter((service) => service.id !== 'vehicle-ownership-onboarding').map((service, index) => <ServiceCard service={service} index={index} key={service.id} />)}</div>
      <div className="section-end-link"><Link to="/services" className="button button-forest">Explore all services <ArrowRight size={16} /></Link></div>
    </section>

    <HowItWorks />

    <section className="faq-section section">
      <div className="section-heading"><p className="eyebrow eyebrow-dark">Good to know</p><h2>Questions, answered.</h2><p>Not sure where to start? We are happy to talk it through.</p></div>
      <div className="faq-list">{faqs.map((faq) => <details className="faq-item" key={faq.question}><summary>{faq.question}<ChevronDown size={18} /></summary><p>{faq.answer}</p></details>)}</div>
    </section>
    <ContactBand />
  </main>;
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="page-intro"><div className="page-intro-inner"><p className="eyebrow eyebrow-mint">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div></section>;
}

function AboutPage() {
  usePageTitle('About Us');
  const reasons = ['A clear document checklist for your request', 'Timing confirmed before work proceeds', 'Optional courier collection and delivery', 'Personal support when you need it'];
  const areas = ['Johannesburg', 'Pretoria / Tshwane', 'Ekurhuleni', 'West Rand', 'Vaal'];
  return <main>
    <PageIntro eyebrow="A little about us" title="More time for the road ahead." description="We are Gauteng-based transport-document specialists. We help you avoid long licensing-office queues by handling the paperwork and bringing your documents back to you." />
    <section className="section about-story"><div className="about-copy"><p className="eyebrow eyebrow-dark">Who we are</p><h2>We make the paperwork part simpler.</h2><p>Driver's licences, vehicle paperwork and licensing errands can take time away from work, family and the road. WeQ4UServices helps coordinate these requests, with clear communication from enquiry through completion.</p><p>We support people and businesses across Greater Gauteng. Collection and return delivery are optional and confirmed for your area before proceeding.</p><a className="text-link" href={whatsappHref} target="_blank" rel="noreferrer">Talk to our team <ArrowRight size={15} /></a></div><div className="about-photo"><img src="/assets/licensing-services-flyer.png" alt="Transport paperwork and licensing services" loading="lazy" /><span className="photo-caption"><ShieldCheck size={17} /> Helpful, personal document support</span></div></section>
    <section className="why-section"><div className="why-inner"><div><p className="eyebrow eyebrow-mint">Why WeQ4U</p><h2>Less queue.<br />More peace of mind.</h2></div><ul className="check-list">{reasons.map((reason) => <li key={reason}><span><Check size={16} /></span>{reason}</li>)}</ul></div></section>
    <section className="section audience-section"><div className="section-heading"><p className="eyebrow eyebrow-dark">Who we serve</p><h2>For the people who keep moving.</h2></div><div className="audience-grid">{[['Private drivers', 'Licence renewals and document replacements.'], ['Taxi owners', 'Licensing support for work on the move.'], ['Truckers', 'PrDP applications and renewals.'], ['Small businesses & fleets', 'Vehicle paperwork coordination across your operation.']].map(([title, copy]) => <article key={title}><span className="audience-number">/</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="area-section"><div className="area-copy"><p className="eyebrow eyebrow-dark">Our service area</p><h2>Gauteng is our home turf.</h2><p>We currently serve the greater Gauteng area only. Tell us your suburb and we will confirm collection and delivery availability.</p><Link className="text-link" to="/contact">Check your area <ArrowRight size={15} /></Link></div><div className="area-list" aria-label="Gauteng areas served">{areas.map((area, index) => <div key={area}><span>0{index + 1}</span><strong>{area}</strong><Check size={17} /></div>)}</div></section>
    <section className="section team-section"><p className="eyebrow eyebrow-dark">The people behind the paperwork</p><h2>A friendly team, here to help.</h2><div className="team-placeholder"><span className="team-placeholder-mark">W</span><div><strong>Meet the WeQ4UServices team</strong><p>Team profiles and biographies will be added by the WeQ4UServices team.</p></div></div></section>
    <ContactBand />
  </main>;
}

function ServiceDetails({ service, index }: { service: Service; index: number }) {
  const Icon = serviceIcons[service.icon] || FileText;
  return <article className="service-detail" id={service.id}>
    <div className="detail-index">0{index + 1}</div>
    <div className="detail-main"><div className="detail-title-row"><span className="service-icon"><Icon size={23} /></span><div><p className="eyebrow eyebrow-dark">{service.audience}</p><h2>{service.name}</h2></div></div><p className="detail-summary">{service.summary}</p><div className="detail-info-grid"><div><strong>What to prepare</strong><p>Document requirements vary by request. Contact us first and we will confirm your personal checklist before you send anything.</p></div><div><strong>Turnaround</strong><p>Confirmed during your free consultation, based on the service and relevant office processing.</p></div></div></div>
    <div className="detail-action"><span>Pricing shared before you proceed</span><strong>Get a quote</strong><Link className="button button-forest" to={`/contact?service=${service.id}#request-form`}>Request this service <ArrowRight size={15} /></Link></div>
  </article>;
}

function VehicleOwnershipPage() {
  usePageTitle('Just bought a car?');
  return <main className="vehicle-owner-page">
    <PageIntro eyebrow="A simple start for new owners" title="Just bought a car? Let's sort the next steps." description="Customers buying from any dealership in South Africa can ask us for help. We are starting with a Johannesburg pilot; our team will confirm service availability for your area." />
    <section className="section ownership-journey-intro"><div className="ownership-journey-copy"><p className="eyebrow eyebrow-dark">One clear journey</p><h2>From “I bought it” to “I know what happens next.”</h2><p>You do not need to know the right form or office. Choose what sounds like your situation, or ask us to guide you.</p><ol className="owner-journey-steps"><li><span>1</span><div><strong>Tell us about the sale</strong><small>Dealership, private sale, bank or not sure.</small></div></li><li><span>2</span><div><strong>Pick the help you need</strong><small>Choose one or more steps, or ask for guidance.</small></div></li><li><span>3</span><div><strong>We check and explain</strong><small>Our team confirms the papers, quote and next action with you.</small></div></li><li><span>4</span><div><strong>Track your request</strong><small>Enter your reference to see your request status.</small></div></li></ol><div className="ownership-safe-note"><ShieldCheck size={18} /><span>Start with the basics. Do not send your full ID number, bank details or vehicle VIN in this first form.</span></div></div><div className="ownership-request-card"><RequestFlow initialService="vehicle-ownership-onboarding" /></div></section>
    <section className="section owner-reassurance"><p className="eyebrow eyebrow-dark">No guesswork</p><h2>We will guide you if you are unsure.</h2><p>Vehicle rules can depend on how the car was bought and your situation. Your request is an enquiry; the team confirms what applies before asking for documents or payment.</p><Link className="text-link" to="/track-request">Already sent a request? Track it <ArrowRight size={15} /></Link></section>
    <ContactBand />
  </main>;
}

function PartnersPage() {
  usePageTitle('Dealership partnerships');
  const pilotMeasures = ['Customer opt-in and completed intakes', 'Documents accepted on first review and rework', 'Time spent at each agreed workflow stage', 'Customer and branch follow-up contacts', 'Exceptions, completion and customer feedback', 'Cost to serve and value of the agreed work'];
  return <main className="partner-page">
    <PageIntro eyebrow="For dealerships across South Africa" title="A clearer path after the keys." description="We are designing a guided vehicle-document support journey that any dealership can offer customers after purchase. Johannesburg is the proposed starting point for a small, measurable pilot." />
    <section className="section partner-opening"><div><p className="eyebrow eyebrow-dark">The idea</p><h2>Help customers understand the paperwork after they buy.</h2><p>When a customer needs ownership, registration, licensing or vehicle-paper support, one clear request could connect them to a named WeQ4U contact and a visible next step, whatever dealership sold the vehicle.</p><p className="partner-hypothesis"><strong>What we want to test:</strong> whether a guided intake, clear responsibility and proactive updates reduce avoidable confusion and follow-up work.</p></div><aside className="partner-status-card"><span className="partner-status">Johannesburg pilot · seeking a dealership partner</span><strong>No dealership partnership or funding approval is assumed.</strong><p>The current site supports customer enquiries and optional referral codes for any dealership. Partner system connections, case sharing and automated processing are not live.</p></aside></section>
    <section className="section partner-flow-section"><div className="section-heading"><p className="eyebrow eyebrow-dark">Proposed journey</p><h2>One case. Clear owners. Visible progress.</h2><p>Every stage and hand-off would be agreed with the partner before a pilot begins.</p></div><div className="partner-flow">{[['01','Customer opts in','Customer chooses a support request and sees what happens next.'],['02','WeQ4U reviews','A named case owner checks scope and asks only for relevant documents.'],['03','Customer approves','The customer sees the quote and decides whether to proceed.'],['04','Work is tracked','Staff record task progress, blockers and customer updates.'],['05','Outcome is measured','The partner reviews agreed service and customer measures.']].map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="section partner-pilot"><div><p className="eyebrow eyebrow-dark">A bounded pilot</p><h2>Start small. Learn from real cases.</h2><p>Agree one branch, one customer scenario, a capped case volume, a consent approach, responsibilities and an escalation path. Set duration and targets together after the baseline and workflow are understood.</p><Link className="button button-forest" to="/vehicle-ownership">View the customer intake <ArrowRight size={16} /></Link></div><div className="partner-measures"><h3>Measures to agree</h3><ul>{pilotMeasures.map((measure) => <li key={measure}><Check size={16} />{measure}</li>)}</ul><p>We will report only measured results from the pilot. No savings, conversion or completion claims are assumed in advance.</p></div></section>
    <section className="partner-boundaries"><div><ShieldCheck size={20} /><div><h2>Designed to work alongside finance and dealer processes.</h2><p>WeQ4UServices would coordinate only the administrative support agreed with each participating dealership. This service would not provide vehicle finance, make credit decisions, replace lender or dealer duties, or imply an official integration. A formal agreement and approved data-sharing rules would come first.</p></div></div></section>
    <section className="section partner-cta"><p className="eyebrow eyebrow-dark">Next step</p><h2>Map one real customer journey with us.</h2><p>We would like to understand your existing hand-offs, customer questions, data rules and what a successful pilot would need to prove.</p><a className="button button-amber" href="mailto:william.mpeta@gmail.com?subject=WeQ4U%20vehicle%20ownership%20pilot%20discussion">Request a discovery conversation <ArrowRight size={16} /></a><small>This opens an email to WeQ4UServices. It does not submit customer or vehicle information.</small></section>
  </main>;
}

function ServicesPage() {
  usePageTitle('Services');
  const coreServices = services.filter((service) => service.id !== 'vehicle-ownership-onboarding');
  return <main>
    <PageIntro eyebrow="Our services" title="Tell us what you need done." description="Choose a service to start. We will confirm the documents, availability, quote and expected timing with you before any work begins." />
    <section className="section service-list-section"><div className="service-list-intro"><div><p className="eyebrow eyebrow-dark">Our services</p><h2>One less thing to queue for.</h2></div><p>Every request is handled personally. No online prices or promises before we understand what you need.</p></div>{coreServices.map((service, index) => <ServiceDetails service={service} index={index} key={service.id} />)}</section>
    <section className="courier-band"><div className="courier-icon"><PackageCheck size={25} /></div><div><p className="eyebrow eyebrow-mint">Available across Gauteng</p><h2>Add collection or delivery.</h2><p>Choose courier collection, return delivery, or both as an option on a service request. We confirm area availability and fees before proceeding.</p></div><Link className="button button-amber" to="/contact?service=door-to-door-courier#request-form">Add courier option <ArrowRight size={16} /></Link></section>
    <HowItWorks />
    <ContactBand />
  </main>;
}

function ContactPage() {
  usePageTitle('Contacts');
  return <main>
    <PageIntro eyebrow="Contact WeQ4U" title="Let's get it sorted." description="A free, no-obligation consultation is the easiest place to start. Call or WhatsApp us, or send a service request and we will get back to you." />
    <section className="section contact-page-grid">
      <div className="contact-direct"><p className="eyebrow eyebrow-dark">Talk to a real person</p><h2>We're one message away.</h2><a className="contact-method contact-method-phone" href={phoneHref}><span className="contact-method-icon"><Phone size={20} /></span><span><small>Call or WhatsApp</small><strong>{phoneLabel}</strong></span><ArrowRight size={17} /></a><a className="contact-method" href={`${whatsappHref}?text=${encodeURIComponent('Hi WeQ4U, I would like a free consultation.')}`} target="_blank" rel="noreferrer"><span className="contact-method-icon"><Send size={20} /></span><span><small>WhatsApp us</small><strong>Start a conversation</strong></span><ArrowRight size={17} /></a>{emails.map((email) => <a className="contact-method" href={`mailto:${email}`} key={email}><span className="contact-method-icon"><Mail size={19} /></span><span><small>Email</small><strong>{email}</strong></span><ArrowRight size={17} /></a>)}<div className="contact-meta"><div><MapPin size={17} /><span><strong>Service area</strong><small>Greater Gauteng only</small></span></div><div><Clock3 size={17} /><span><strong>Operating hours</strong><small>To be confirmed by WeQ4UServices</small></span></div></div></div>
      <RequestFlow />
    </section>
    <section className="section tracker-section"><RequestTracker /></section>
    <section className="section location-placeholder"><MapPin size={23} /><div><p className="eyebrow eyebrow-dark">Where we work</p><h2>Serving the greater Gauteng area.</h2><p>We arrange collection and delivery across Gauteng. Share your suburb and we will confirm availability before you proceed.</p></div><span className="location-stamp">GAUTENG<br />SOUTH AFRICA</span></section>
    <section className="section legal-notes" id="privacy"><div><p className="eyebrow eyebrow-dark">Privacy notice</p><h2>Your details stay relevant to your request.</h2><p>WeQ4UServices uses the details you submit to respond to and manage your service request. Documents are collected only when needed for your request and are not placed in a public website folder. A partner referral code, if you have one, helps us identify the referral; it does not share your details with a retailer. Partner sharing would require an agreed process and clear notice. Do not send ID numbers or payment-card information through chat. You may ask us to delete your information by contacting william.mpeta@gmail.com.</p></div><div id="terms"><p className="eyebrow eyebrow-dark">Terms of service</p><h2>A quote comes before the work.</h2><p>Submitting a request does not confirm an appointment, price or processing time. We will review your requirements and confirm the service scope, applicable fees, document checklist and expected timing with you before proceeding.</p></div></section>
    <section className="accessibility-note" id="accessibility"><div><p className="eyebrow eyebrow-dark">Accessibility</p><h2>Tell us if something gets in your way.</h2><p>We want people to be able to use this site with a keyboard, screen reader, zoom or other access needs. If a page or form is difficult to use, tell us what happened and which page you were on.</p><a href="mailto:william.mpeta@gmail.com?subject=Website%20accessibility%20feedback">Report an accessibility barrier</a></div></section>
  </main>;
}

function TrackRequestPage() {
  usePageTitle('Track request');
  return <main className="track-request-page"><PageIntro eyebrow="Track request" title="See where your request stands." description="Enter the one reference from your confirmation. New requests open on any device; there is no separate key to remember." /><section className="section tracker-section"><RequestTracker variant="page" /></section><section className="section legal-notes"><div><p className="eyebrow eyebrow-dark">Keep your reference safe</p><h2>Your reference opens your request.</h2><p>Only share it with people you trust. Older requests may need to be opened in the browser used to submit them. Contact us if you need help.</p></div></section></main>;
}

function SiteFooter() {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link to="/"><BrandMark light /></Link><p>Clear help with transport paperwork across Gauteng.</p><span className="footer-area"><MapPin size={15} /> Based in Gauteng · Greater Gauteng service area</span></div><div className="footer-links"><strong>Explore</strong><Link to="/">Home</Link><Link to="/about">About Us</Link><Link to="/services">Services</Link><Link to="/vehicle-ownership">Just bought a car?</Link><Link to="/partners">For partners</Link><Link to="/track-request">Track Request</Link><Link to="/contact">Contact Us</Link></div><div className="footer-links footer-contact"><strong>Get in touch</strong><a href={phoneHref}>{phoneLabel}</a><a href="mailto:william.mpeta@gmail.com">william.mpeta@gmail.com</a><a href="mailto:shelod@gmail.com">shelod@gmail.com</a><a href={`${whatsappHref}?text=${encodeURIComponent('Hi WeQ4U, I would like a free consultation.')}`} target="_blank" rel="noreferrer">WhatsApp us <ArrowRight size={14} /></a></div><div className="footer-badges"><strong>Our service promise</strong><TrustStrip compact /></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} WeQ4UServices</span><div><Link to="/contact#privacy">Privacy notice</Link><Link to="/contact#terms">Terms of service</Link><Link to="/contact#accessibility">Accessibility feedback</Link></div><a href="/assets/licensing-services-flyer.png" download>Download service flyer <ArrowRight size={14} /></a></div></footer>;
}

function FloatingContact() {
  return <div className="floating-contact"><a className="floating-whatsapp" href={`${whatsappHref}?text=${encodeURIComponent('Hi WeQ4U, I need help with a transport document.')}`} target="_blank" rel="noreferrer" aria-label="Chat with WeQ4UServices on WhatsApp"><Send size={20} /></a><ChatAssistant /></div>;
}

function QuoteShortActionRedirect() {
  const { quoteNumber = '', action = '' } = useParams();
  const location = useLocation();
  return <Navigate to={`/quote/${encodeURIComponent(quoteNumber)}/${encodeURIComponent(action)}${location.search}`} replace />;
}

function AppFrame() {
  const location = useLocation();
  useEffect(() => { if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname, location.hash]);
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><div id="main-content"><Routes><Route path="/" element={<HomePage />} /><Route path="/about" element={<AboutPage />} /><Route path="/services" element={<ServicesPage />} /><Route path="/vehicle-ownership" element={<VehicleOwnershipPage />} /><Route path="/partners" element={<PartnersPage />} /><Route path="/track-request" element={<TrackRequestPage />} /><Route path="/q/:quoteNumber/:action" element={<QuoteShortActionRedirect />} /><Route path="/q/:quoteNumber" element={<QuoteShortLinkPage />} /><Route path="/quote/:quoteNumber/:action" element={<QuoteDecisionPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="*" element={<HomePage />} /></Routes></div><SiteFooter /><FloatingContact /></>;
}

function usePageTitle(page: string) {
  useEffect(() => {
    document.title = `${page} | WeQ4UServices`;
    const description = 'WeQ4UServices handles driver’s licences, PrDPs, licence disc renewals and vehicle paperwork door-to-door across Gauteng.';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.append(meta);
    }
    meta.content = description;
  }, [page]);
}

export default function App() {
  return <BrowserRouter><AppFrame /></BrowserRouter>;
}
