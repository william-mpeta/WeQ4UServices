export type Service = {
  id: string;
  name: string;
  summary: string;
  audience: string;
  icon: string;
  tag?: string;
};

export const services: Service[] = [
  {
    id: 'vehicle-ownership-onboarding',
    name: 'Just bought a vehicle',
    summary: 'A guided request for ownership transfer, registration, licensing and other post-purchase help.',
    audience: 'New vehicle owners',
    icon: 'car-front',
    tag: 'New owner journey',
  },
  {
    id: 'drivers-licences',
    name: "Driver's Licences",
    summary: 'New applications, renewals and conversions handled end-to-end.',
    audience: 'Private drivers and busy professionals',
    icon: 'steering-wheel',
    tag: 'Most popular',
  },
  {
    id: 'prdps',
    name: 'PrDPs',
    summary: 'Professional Driving Permits, new applications and renewals.',
    audience: 'Truckers, taxi drivers and professional drivers',
    icon: 'truck',
    tag: 'Taxi & truckers',
  },
  {
    id: 'licence-disc-renewals',
    name: 'Licence Disc Renewals',
    summary: 'Vehicle disc renewals handled for you, without the queues.',
    audience: 'Drivers, families and fleet operators',
    icon: 'badge',
    tag: 'Most popular',
  },
  {
    id: 'vehicle-registrations',
    name: 'Vehicle Registrations',
    summary: 'New vehicle registrations and licensing, sorted for you.',
    audience: 'Private owners and small businesses',
    icon: 'car-front',
  },
  {
    id: 'change-of-ownership',
    name: 'Change of Ownership',
    summary: 'Transfer paperwork managed so you do not have to queue.',
    audience: 'Buyers, sellers and dealerships',
    icon: 'arrow-left-right',
  },
  {
    id: 'duplicate-documents',
    name: 'Duplicate Documents',
    summary: 'Help replacing lost or damaged cards, discs and documents.',
    audience: 'Drivers and vehicle owners',
    icon: 'files',
  },
  {
    id: 'roadworthy-certificates',
    name: 'Roadworthy Certificates',
    summary: 'Booking and coordination for roadworthy testing.',
    audience: 'Vehicle owners preparing for a sale or transfer',
    icon: 'clipboard-check',
  },
  {
    id: 'traffic-register',
    name: 'Traffic Register',
    summary: 'Help applying for a traffic register number.',
    audience: 'Drivers and vehicle owners',
    icon: 'badge',
  },
  {
    id: 'door-to-door-courier',
    name: 'Door-to-Door Courier',
    summary: 'Arrange collection or delivery of service documents.',
    audience: 'Customers who need document collection or delivery',
    icon: 'package',
  },
];

export const trustPoints = ['Quote before you decide', 'Private request tracking', 'Greater Gauteng service'];

export const faqs = [
  {
    question: 'Which areas do you serve?',
    answer: 'We are based in Gauteng and serve the greater Gauteng area, including Johannesburg, Pretoria/Tshwane, Ekurhuleni, the West Rand and the Vaal.',
  },
  {
    question: 'How does the service work?',
    answer: 'Contact us with the service you need. We confirm the required documents and quote, process the paperwork, and arrange door-to-door return where needed.',
  },
  {
    question: 'How long will my request take?',
    answer: 'Turnaround depends on the service and the relevant licensing office. We confirm the expected timing during your free consultation.',
  },
  {
    question: 'How much does it cost?',
    answer: 'We do not publish set prices here. Tell us what you need and we will send you a quote before you decide to proceed.',
  },
  {
    question: 'What documents do I need to send?',
    answer: 'The checklist depends on your service. Contact us first and we will confirm exactly what is needed. Please do not send ID or card details in chat.',
  },
];
