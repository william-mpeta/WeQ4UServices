import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ClipboardList, DollarSign, Download, FileText, KeyRound, LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import './styles.css';

type RequestRecord = {
  ref: string;
  name: string;
  phone: string;
  email: string;
  services: string[];
  pricingPackage?: string;
  serviceDetails?: Record<string, string>;
  workItems?: string[];
  vehicleContext?: { purchaseType?: string; financeStage?: string; retailerName?: string; referralCode?: string };
  suburb: string;
  address: string;
  courier: boolean;
  courierCollection?: boolean;
  courierDelivery?: boolean;
  message: string;
  consentAt: string;
  source: string;
  status: string;
  allowedNextStatuses: string[];
  quoteReadiness?: { ready: boolean; reason: string };
  caseSpecificQuoteAvailable?: boolean;
  provisionalEstimate?: boolean;
  provisionalEstimateReason?: string;
  serviceDefinition?: { serviceCode: string; serviceName: string; version: number; configurationStatus: string; requirements: ServiceRequirement[]; pricing: { type: string; minimumCents?: number; maximumCents?: number } } | null;
  serviceDefinitionReady?: boolean;
  serviceAssessment?: ServiceAssessment | null;
  serviceAssessmentReady?: boolean;
  pricingResolution?: {
    serviceId: string;
    serviceName: string;
    serviceDetail: string;
    packageId: string;
    packageName: string;
    expectedProfileId: string;
    expectedProfileName: string;
    profileStatus: string;
    profileVersion: number | null;
    effectiveFrom: string | null;
    status: string;
    reason: string;
    availableProfiles: { serviceId: string; profileId?: string; name: string; version: number }[];
    preview: {
      ready: boolean;
      currency: string;
      lines: { componentId: string; label: string; amountCents: number }[];
      missing: { id: string; label: string }[];
      totalCents: number | null;
      contributionCents: number | null;
      packages: { id: string; name: string; totalCents: number; upliftCents: number }[];
    };
  };
  department?: string;
  queue?: string;
  assignee?: string;
  nextAction?: string;
  targetDate?: string;
  requestedDocuments?: string[];
  serviceValidated?: boolean;
  fulfilmentValidated?: boolean;
  completionConfirmed?: boolean;
  history?: { status: string; at: string; message: string; customerVisible?: boolean }[];
  customerTasks?: CustomerTask[];
  quoteAmount: number | null;
  quoteCurrency?: string;
  quoteDraft?: { id?: string; quoteNumber?: string; version?: number; approvalStatus?: 'editing' | 'pending-approval' | 'approved'; approvedBy?: string; approvedAt?: string; preparedBy?: string; preparedAt?: string; packageName?: string; serviceCode?: string; serviceDefinitionVersion?: number | null; pricingBasisLabel?: string; estimateDisclaimer?: string; contributionRatePercent?: number | null; contributionCents?: number | null; notes?: string; conditions?: string[]; requiredDocuments?: string[]; validUntil?: string; totalCents?: number; vatTreatment?: VatTreatment; lines?: { componentId: string; label: string; amountCents: number; sourceNote?: string }[] };
  quote?: { id: string; quoteNumber?: string; version?: number; profileId: string; profileVersion: number; profileName?: string; packageName?: string; serviceCode?: string; serviceDefinitionVersion?: number | null; pricingBasis?: string; pricingBasisLabel?: string; estimateDisclaimer?: string; contributionRatePercent?: number | null; contributionCents?: number | null; vatTreatment?: VatTreatment; effectiveFrom?: string; totalCents: number; generatedAt?: string; validUntil?: string; notes?: string; conditions?: string[]; requiredDocuments?: string[]; lines: { componentId: string; label: string; amountCents: number; sourceNote?: string }[] };
  quoteRevisionRequests?: { quoteVersion: number; message: string; requestedAt: string }[];
  quoteActionAudit?: { quoteNumber: string; quoteId: string; quoteVersion: number; action: string; at: string; ip: string }[];
  quoteDecision?: string;
  quoteDecisionAt?: string;
  quoteDecisionReason?: string;
  quoteDecisionReasonDetails?: string;
  quoteDecisionVersion?: number;
  paid: boolean;
  notes: string;
  documents: { id: string; type: string; size: number; uploadedAt: string; label?: string; serviceId?: string; reviewState?: string; reviewedBy?: string; reviewedAt?: string; reviewNote?: string }[];
  createdAt: string;
  updatedAt: string;
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
  responseAt?: string;
  completedAt?: string;
  notificationStatus?: string;
};
type ServiceRequirement = { id: string; label: string; required: boolean; status: 'received' | 'missing' | 'verified' | 'rejected' | 'not-applicable'; evidenceDocumentId?: string; note?: string };
type ServiceAssessment = { requirementsReviewed: boolean; requirements: ServiceRequirement[]; eligibility: 'pending' | 'eligible' | 'ineligible'; governmentReadiness: 'pending' | 'ready' | 'not-ready'; reviewedBy?: string; reviewedAt?: string; notes?: string };
type StaffSession = { role: string; name: string; title: string; permissions: string[] };
type PricingComponentValue = { amountCents: number | null; costCents: number | null };
type VatTreatment = 'inclusive' | 'exclusive' | 'not-applicable';
type PricingProfileVersion = { version: number; status: 'draft' | 'active'; components: Record<string, PricingComponentValue>; vatTreatment: VatTreatment | null; effectiveFrom: string; updatedAt: string | null; updatedBy: string | null };
type PricingProfile = PricingProfileVersion & { serviceId: string; profileId: string; name?: string; currency: string; eligibleServiceDetails?: string[] | null; seededFrom?: string; versionHistory: PricingProfileVersion[] };
type PricingService = { id: string; name: string; pricingName?: string; department: string; turnaround: number | null; documentPolicy: string; pricingStatus?: string; startingFromCents?: number | null; currency?: string; eligibleServiceDetails?: string[]; packages?: { id: string; name: string; totalCents: number; upliftCents: number; contributionCents: number }[] };
type PricingComponent = { id: string; label: string; applies: string };
type FinanceSummaryRow = { serviceId: string; serviceName: string; quoteCount: number; quotedCents: number; contributionCents?: number | null; estimatedCostCents: number | null; estimatedGrossMarginCents: number | null };
type PricingPreview = {
  profilePreview?: boolean;
  resolution: {
    status: string;
    reason: string;
    serviceName: string;
    serviceDetail: string;
    packageName: string;
    expectedProfileName: string;
    profileVersion: number | null;
    effectiveFrom: string | null;
    preview: {
      ready: boolean;
      currency: string;
      lines: { componentId: string; label: string; amountCents: number }[];
      totalCents: number | null;
      contributionCents: number | null;
    };
  };
  estimatedCostCents: number | null;
  estimatedGrossMarginCents: number | null;
};

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const statuses = ['Submitted', 'Under Review', 'Awaiting Documents', 'Quote Preparation', 'Quote Revision Required', 'Awaiting Customer Decision', 'Quote Accepted', 'Quote Declined', 'Quote Expired', 'Work in Progress', 'Ready for Collection / Delivery', 'Completed', 'On Hold', 'Cancelled'];
const serviceNames: Record<string, string> = {
  'vehicle-ownership-onboarding': 'New vehicle owner help',
  'drivers-licences': "Driver's Licences",
  prdps: 'PrDPs',
  'licence-disc-renewals': 'Licence Disc Renewals',
  'vehicle-registrations': 'Vehicle Registrations',
  'change-of-ownership': 'Change of Ownership',
  'duplicate-documents': 'Duplicate Documents',
  'roadworthy-certificates': 'Roadworthy Certificates',
  'door-to-door-courier': 'Door-to-Door Courier',
  'traffic-register': 'Traffic Register',
};
const terminalStatuses = new Set(['Completed', 'Quote Declined', 'Cancelled']);
const queueGroups: Record<string, string[]> = {
  'Waiting on Customer': [],
  'New Requests': ['Submitted'],
  'Under Review': ['Under Review', 'Quote Expired'],
  'Awaiting Documents': ['Awaiting Documents'],
  'Quote Preparation': ['Quote Preparation', 'Quote Revision Required'],
  'Awaiting Customer': ['Awaiting Customer Decision'],
  'Payment Setup Required': ['Quote Accepted'],
  'In Progress': ['Work in Progress'],
  'Ready for Delivery': ['Ready for Collection / Delivery'],
  'Completed': ['Completed', 'Quote Declined', 'Cancelled'],
  'Escalations': ['On Hold'],
};
const todayKey = () => new Date().toLocaleDateString('en-CA');
const tomorrowKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const quoteDefaultValidUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const quoteMaximumValidUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const money = (value: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value);
const shortDate = (value: Date) => value.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit' });
const moneyExact = (value: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const priceText = (cents: number | null) => cents === null ? '' : (cents / 100).toFixed(2);
const parseCents = (value: string) => value.trim() === '' ? null : Math.round(Number(value) * 100);
const isWaitingOnCustomer = (record: RequestRecord) => record.status === 'Awaiting Customer Decision'
  || !!record.requestedDocuments?.length
  || !!record.customerTasks?.some((task) => task.status === 'waiting-on-customer');

function FinancePricing({ token }: { token: string }) {
  const [services, setServices] = useState<PricingService[]>([]);
  const [servicePricing, setServicePricing] = useState<PricingService[]>([]);
  const [components, setComponents] = useState<PricingComponent[]>([]);
  const [profiles, setProfiles] = useState<PricingProfile[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'breakdown' | 'simulator'>('overview');
  const [active, setActive] = useState(false);
  const [breakdownPackage, setBreakdownPackage] = useState('standard');
  const [breakdownPreview, setBreakdownPreview] = useState<PricingPreview | null>(null);
  const [breakdownError, setBreakdownError] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownRequestVersion, setBreakdownRequestVersion] = useState(0);
  const [simulatorServiceId, setSimulatorServiceId] = useState('');
  const [simulatorDetail, setSimulatorDetail] = useState('');
  const [simulatorPackage, setSimulatorPackage] = useState('standard');
  const [simulatorPreview, setSimulatorPreview] = useState<PricingPreview | null>(null);
  const [simulatorError, setSimulatorError] = useState('');
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorRequestVersion, setSimulatorRequestVersion] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const profile = profiles.find((item) => item.serviceId === selectedId);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [profileResponse, summaryResponse] = await Promise.all([
          fetch(`${apiBase}/admin/pricing-profiles`, { headers }),
          fetch(`${apiBase}/admin/finance/summary`, { headers }),
        ]);
        const profileResult = await profileResponse.json();
        const summaryResult = await summaryResponse.json();
        if (!profileResponse.ok) throw new Error(profileResult.error || 'Could not load pricing profiles.');
        if (!summaryResponse.ok) throw new Error(summaryResult.error || 'Could not load finance summary.');
        if (!cancelled) {
          setServices(profileResult.services);
          setServicePricing(profileResult.servicePricing);
          setComponents(profileResult.components);
          setProfiles(profileResult.profiles);
          setSelectedId((current) => current || profileResult.profiles[0]?.serviceId || '');
          setSimulatorServiceId((current) => current || profileResult.services[0]?.id || '');
          setSummary(summaryResult.services);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load Finance workspace.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => setActive(profile?.status === 'active'), [profile?.serviceId, profile?.status]);

  const simulatorService = servicePricing.find((service) => service.id === simulatorServiceId);
  const simulatorProfile = profiles.find((item) => item.serviceId === simulatorServiceId);
  const latestProfile = profiles.reduce<PricingProfile | null>((latest, item) =>
    !latest || (item.updatedAt || '') > (latest.updatedAt || '') ? item : latest, null);
  const configuredProfileCount = profiles.filter((item) => item.status === 'active').length;
  const quoteCount = summary.reduce((total, row) => total + row.quoteCount, 0);
  const quotedCents = summary.reduce((total, row) => total + row.quotedCents, 0);

  async function requestPricingPreview(serviceId: string, packageId: string, serviceDetail: string, previewProfile?: PricingProfile) {
    const response = await fetch(`${apiBase}/admin/pricing-preview`, {
      method: 'POST',
      headers: { Authorization: 'Bearer '.concat(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        pricingPackage: packageId,
        serviceDetail,
        ...(previewProfile ? {
          profilePreview: {
            components: previewProfile.components,
            vatTreatment: previewProfile.vatTreatment,
            effectiveFrom: previewProfile.effectiveFrom,
          },
        } : {}),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not calculate this pricing preview.');
    return result as PricingPreview;
  }

  useEffect(() => {
    if (!breakdownRequestVersion || !profile) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      requestPricingPreview(profile.serviceId, breakdownPackage, profile.eligibleServiceDetails?.[0] || '', profile)
        .then((preview) => { if (!cancelled) setBreakdownPreview(preview); })
        .catch((previewError: unknown) => {
          if (!cancelled) setBreakdownError(previewError instanceof Error ? previewError.message : 'Could not calculate this pricing preview.');
        })
        .finally(() => { if (!cancelled) setBreakdownLoading(false); });
    }, 250);
    setBreakdownLoading(true);
    setBreakdownError('');
    setBreakdownPreview(null);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [breakdownPackage, breakdownRequestVersion, profile, token]);

  useEffect(() => {
    if (!simulatorRequestVersion || !simulatorServiceId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      requestPricingPreview(simulatorServiceId, simulatorPackage, simulatorDetail, simulatorProfile)
        .then((preview) => { if (!cancelled) setSimulatorPreview(preview); })
        .catch((previewError: unknown) => {
          if (!cancelled) setSimulatorError(previewError instanceof Error ? previewError.message : 'Could not simulate this service.');
        })
        .finally(() => { if (!cancelled) setSimulatorLoading(false); });
    }, 250);
    setSimulatorLoading(true);
    setSimulatorError('');
    setSimulatorPreview(null);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [simulatorDetail, simulatorPackage, simulatorProfile, simulatorRequestVersion, simulatorServiceId, token]);

  function previewBreakdown() {
    setBreakdownRequestVersion((version) => version + 1);
  }

  function updateComponent(id: string, field: keyof PricingComponentValue, value: string) {
    const cents = parseCents(value);
    if (value !== '' && (!Number.isFinite(cents) || cents! < 0 || cents! > 100_000_000)) return;
    setProfiles((current) => current.map((item) => item.serviceId !== selectedId ? item : {
      ...item,
      components: { ...item.components, [id]: { ...item.components[id], [field]: cents } },
    }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/pricing-profiles/${encodeURIComponent(profile.serviceId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, components: profile.components, vatTreatment: profile.vatTreatment, effectiveFrom: profile.effectiveFrom }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save this pricing profile.');
      setProfiles((current) => current.map((item) => item.serviceId === result.profile.serviceId ? result.profile : item));
      setServicePricing(result.servicePricing);
      setNotice(`Profile ${result.profile.status === 'active' ? 'activated' : 'saved as a draft'} · version ${result.profile.version}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this pricing profile.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="finance-workspace">
    <header className="finance-heading"><div><p className="admin-eyebrow">Pricing · finance control</p><h2>Service pricing profiles</h2><p>Configure and activate only formally approved amounts. Blank amounts are never treated as free.</p></div><span className="finance-status"><ShieldCheck size={15} /> Authorized pricing access</span></header>
    <nav className="pricing-tabs" aria-label="Pricing workspace">
      {([
        ['overview', 'Overview'],
        ['matrix', 'Pricing matrix'],
        ['breakdown', 'Revenue breakdown'],
        ['simulator', 'Services simulator'],
      ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>{label}</button>)}
    </nav>
    {activeTab === 'overview' && <>
      <div className="finance-overview-grid">
        <article><span>Active pricing profiles</span><strong>{configuredProfileCount} / {services.length}</strong><small>Each service keeps its own version and effective date.</small></article>
        <article><span>Latest profile update</span><strong>{latestProfile?.updatedAt ? new Date(latestProfile.updatedAt).toLocaleDateString('en-ZA') : 'No saved changes'}</strong><small>{latestProfile?.updatedBy || 'Seeded from the approved pricing reference'}</small></article>
        <article><span>Quotes issued</span><strong>{quoteCount}</strong><small>{moneyExact(quotedCents / 100)} quoted · not collected revenue</small></article>
        <article><span>Payment reconciliation</span><strong>Not connected</strong><small>Collected revenue is unavailable until payment integration.</small></article>
      </div>
      <div className="finance-summary">
        {summary.filter((row) => row.quoteCount > 0).map((row) => <article key={row.serviceId}><span>{row.serviceName}</span><strong>{row.quoteCount} quotes · {moneyExact(row.quotedCents / 100)}</strong><small>{row.contributionCents === null ? 'Contribution not estimated for case-specific quotes' : `Model contribution (30%): ${moneyExact((row.contributionCents || 0) / 100)}`} · quotes, not collections</small>{row.estimatedGrossMarginCents !== null && <small>Estimated gross margin from Finance-entered costs: {moneyExact(row.estimatedGrossMarginCents / 100)}</small>}</article>)}
        {!summary.some((row) => row.quoteCount > 0) && <p>No engine-generated quotes to analyse yet. Collected revenue and payment reconciliation are not connected.</p>}
      </div>
    </>}
    {activeTab === 'matrix' && <section className="pricing-master" aria-labelledby="pricing-master-heading">
      <header><div><h3 id="pricing-master-heading">Pricing master</h3><p>Customer prices from the active profile. Premium packages add the configured model uplift.</p></div><span>Model contribution: 30% of quote total</span></header>
      <div className="pricing-master-scroll"><table><thead><tr><th>Service</th><th>Standard</th><th>Priority</th><th>Express</th><th>VIP Concierge</th></tr></thead>
        <tbody>{servicePricing.map((service) => {
          const item = profiles.find((candidate) => candidate.serviceId === service.id);
          const prices = ['standard', 'priority', 'express', 'vip'].map((packageId) => service.packages?.find((pricingPackage) => pricingPackage.id === packageId));
          return <tr key={service.id}><th scope="row">{service.pricingName || service.name}{item?.eligibleServiceDetails?.length ? <small>For {item.eligibleServiceDetails.join(', ')}</small> : null}</th>
            {prices.map((pricingPackage, index) => <td key={pricingPackage?.id || index}>{pricingPackage ? <><strong>{moneyExact(pricingPackage.totalCents / 100)}</strong><small className="pricing-contribution-value">Model contribution {moneyExact(pricingPackage.contributionCents / 100)}</small></> : <span className="pricing-unavailable">Not configured</span>}</td>)}
          </tr>;
        })}</tbody></table></div>
      <small>Contribution is a planning assumption set to 30% of the customer quote total; it is not audited profit or a reconciliation of supplier/government costs. Collected revenue is unavailable until payment integration.</small>
    </section>}
    {activeTab === 'breakdown' && <>
    <section className="pricing-calculation" aria-labelledby="pricing-calculation-heading">
      <header><div><h3 id="pricing-calculation-heading">View calculation</h3><p>Live API calculation using the selected service profile. No quote is created.</p></div></header>
      <div className="pricing-simulator-controls">
        <label>Service profile<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setBreakdownPreview(null); }} disabled={!services.length}>{services.map((service) => <option key={service.id} value={service.id}>{service.pricingName || service.name}</option>)}</select></label>
        <label>Package<select value={breakdownPackage} onChange={(event) => { setBreakdownPackage(event.target.value); setBreakdownPreview(null); }}><option value="standard">Standard</option><option value="priority">Priority</option><option value="express">Express</option><option value="vip">VIP Concierge</option></select></label>
        <button className="admin-secondary-button" type="button" onClick={previewBreakdown} disabled={breakdownLoading || !profile}>{breakdownLoading ? 'Calculating…' : 'View calculation'}</button>
      </div>
      {breakdownError && <p className="admin-error" role="alert">{breakdownError}</p>}
      {breakdownPreview && <div className="pricing-calculation-result">
        {breakdownPreview.profilePreview && <p className="admin-hint">Preview uses current form values · saved pricing and customer quotes are unchanged.</p>}
        {breakdownPreview.resolution.preview.ready ? <>
          <p>{breakdownPreview.resolution.expectedProfileName} · Version {breakdownPreview.resolution.profileVersion} · Effective from {breakdownPreview.resolution.effectiveFrom}</p>
          {breakdownPreview.resolution.preview.lines.map((line) => <div className="pricing-preview-line" key={line.componentId}><span>{line.label}</span><strong>{moneyExact(line.amountCents / 100)}</strong></div>)}
          <div className="pricing-preview-total"><strong>Customer price</strong><strong>{moneyExact((breakdownPreview.resolution.preview.totalCents || 0) / 100)}</strong></div>
          <p>Model contribution (30%): {moneyExact((breakdownPreview.resolution.preview.contributionCents || 0) / 100)} · planning assumption, not audited margin.</p>
          {breakdownPreview.estimatedGrossMarginCents === null
            ? <p>Estimated gross margin unavailable: complete the Finance-entered direct costs for every line.</p>
            : <p>Estimated direct costs: {moneyExact((breakdownPreview.estimatedCostCents || 0) / 100)} · estimated gross margin: {moneyExact(breakdownPreview.estimatedGrossMarginCents / 100)}</p>}
        </> : <p className="admin-hint">{breakdownPreview.resolution.reason || 'This profile is not ready to generate quotes.'}</p>}
      </div>}
    </section>
    <div className="finance-profile-card">
      <div className="finance-profile-toolbar"><label>Service profile<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{services.map((service) => <option key={service.id} value={service.id}>{service.pricingName || service.name} · {service.department}</option>)}</select></label>{profile && <span>{profile.profileId} · v{profile.version} · {profile.status}</span>}</div>
      {loading && <p className="admin-empty">Loading Finance workspace…</p>}
      {profile && !loading && <form onSubmit={saveProfile}>
        {profile.seededFrom && <p className="admin-hint">Seeded from {profile.seededFrom}. Only published standard prices are active; service variants not priced in the document remain blocked.</p>}
        {!!profile.eligibleServiceDetails?.length && <p className="admin-hint">Applies only to: {profile.eligibleServiceDetails.join(', ')}.</p>}
        <div className="pricing-component-grid">{components.map((component) => <fieldset key={component.id} className={component.applies === 'future' ? 'future-component' : ''}><legend>{component.label}</legend><small>{component.applies === 'base' ? 'Included in every quote' : component.applies === 'collection' || component.applies === 'delivery' ? 'Applied only when selected by the customer' : component.id === 'priorityFee' || component.id === 'expressFee' || component.id === 'vipConciergeFee' ? 'Package uplift applied when the customer selects this package' : 'Not used by the current commercial pricing model'}</small><label>Customer charge (ZAR)<input type="number" min="0" max="1000000" step="0.01" disabled={component.applies === 'not-used'} value={priceText(profile.components[component.id]?.amountCents ?? null)} onChange={(event) => updateComponent(component.id, 'amountCents', event.target.value)} placeholder="Not configured" /></label><label>Estimated direct cost (ZAR)<input type="number" min="0" max="1000000" step="0.01" disabled={component.applies === 'not-used'} value={priceText(profile.components[component.id]?.costCents ?? null)} onChange={(event) => updateComponent(component.id, 'costCents', event.target.value)} placeholder="Optional until measured" /></label></fieldset>)}</div>
        <div className="pricing-profile-meta">
          <label>VAT treatment<select value={profile.vatTreatment || ''} onChange={(event) => setProfiles((current) => current.map((item) => item.serviceId === selectedId ? { ...item, vatTreatment: (event.target.value || null) as VatTreatment | null } : item))}><option value="">Not configured</option><option value="inclusive">Prices include VAT</option><option value="exclusive">VAT added separately</option><option value="not-applicable">VAT not applicable</option></select></label>
          <label>Effective from<input type="date" value={profile.effectiveFrom} onChange={(event) => setProfiles((current) => current.map((item) => item.serviceId === selectedId ? { ...item, effectiveFrom: event.target.value } : item))} /></label>
        </div>
        <label className="pricing-activation"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> I confirm these amounts and the VAT treatment are formally approved and this profile can generate customer quotes.</label>
        <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : active ? 'Save and activate profile' : 'Save draft profile'} <span>→</span></button>
      </form>}
      {!loading && profile && <details className="pricing-version-history"><summary>Version history ({profile.versionHistory.length + 1})</summary><ol>{[{ ...profile, current: true }, ...profile.versionHistory.slice().reverse()].map((version) => <li key={`${version.version}-${version.updatedAt || 'seed'}`}><details><summary>Version {version.version}{'current' in version && version.current ? ' · current' : ''} · {version.status}</summary><span>{version.updatedAt ? new Date(version.updatedAt).toLocaleString('en-ZA') : 'Seeded from pricing model'}{version.updatedBy ? ` · ${version.updatedBy}` : ''}</span><ul>{components.map((component) => <li key={component.id}>{component.label}: {priceText(version.components[component.id]?.amountCents ?? null) ? moneyExact((version.components[component.id].amountCents || 0) / 100) : 'Not configured'}</li>)}</ul><span>VAT: {version.vatTreatment || 'Not configured'} · Effective from {version.effectiveFrom || 'Not set'}</span></details></li>)}</ol></details>}
      {!loading && profile && <p className="finance-footnote">Turnaround and required documents remain case-specific until approved service rules are configured. Package uplifts apply to the matching package selected by the customer. A quote does not collect payment; no payment gateway or reconciliation is connected.</p>}
    </div>
    </>}
    {activeTab === 'simulator' && <section className="pricing-calculation" aria-labelledby="pricing-simulator-heading">
      <header><div><h3 id="pricing-simulator-heading">Services simulator</h3><p>Try a service and package without creating a request or quote.</p></div></header>
      <div className="pricing-simulator-controls">
        <label>Service<select value={simulatorServiceId} onChange={(event) => {
          const nextId = event.target.value;
          setSimulatorServiceId(nextId);
          setSimulatorDetail(servicePricing.find((service) => service.id === nextId)?.eligibleServiceDetails?.[0] || '');
          setSimulatorPreview(null);
        }}>{services.map((service) => <option key={service.id} value={service.id}>{service.pricingName || service.name}</option>)}</select></label>
        {simulatorService?.eligibleServiceDetails?.length ? <label>Service detail<select value={simulatorDetail} onChange={(event) => { setSimulatorDetail(event.target.value); setSimulatorPreview(null); }}><option value="">Choose a service detail</option>{simulatorService.eligibleServiceDetails.map((detail) => <option key={detail}>{detail}</option>)}</select></label> : null}
        <label>Package<select value={simulatorPackage} onChange={(event) => { setSimulatorPackage(event.target.value); setSimulatorPreview(null); }}><option value="standard">Standard</option><option value="priority">Priority</option><option value="express">Express</option><option value="vip">VIP Concierge</option></select></label>
        <button className="admin-primary-button" type="button" onClick={() => setSimulatorRequestVersion((version) => version + 1)} disabled={simulatorLoading || !simulatorServiceId || (!!simulatorService?.eligibleServiceDetails?.length && !simulatorDetail)}>{simulatorLoading ? 'Calculating…' : 'Preview price'} <span>→</span></button>
      </div>
      {simulatorError && <p className="admin-error" role="alert">{simulatorError}</p>}
      {simulatorPreview && <div className="pricing-calculation-result">
        {simulatorPreview.profilePreview && <p className="admin-hint">Preview uses current form values · saved pricing and customer quotes are unchanged.</p>}
        {simulatorPreview.resolution.preview.ready ? <>
          <p>{simulatorPreview.resolution.serviceName} · {simulatorPreview.resolution.packageName} · Profile v{simulatorPreview.resolution.profileVersion}</p>
          {simulatorPreview.resolution.preview.lines.map((line) => <div className="pricing-preview-line" key={line.componentId}><span>{line.label}</span><strong>{moneyExact(line.amountCents / 100)}</strong></div>)}
          <div className="pricing-preview-total"><strong>Customer price</strong><strong>{moneyExact((simulatorPreview.resolution.preview.totalCents || 0) / 100)}</strong></div>
          <p>Model contribution: {moneyExact((simulatorPreview.resolution.preview.contributionCents || 0) / 100)} · estimated direct costs: {simulatorPreview.estimatedCostCents === null ? 'not configured' : moneyExact(simulatorPreview.estimatedCostCents / 100)}</p>
          {simulatorPreview.estimatedGrossMarginCents !== null && <p>Estimated gross margin: {moneyExact(simulatorPreview.estimatedGrossMarginCents / 100)}. This uses Finance-entered costs; it is not collected revenue.</p>}
        </> : <p className="admin-hint">{simulatorPreview.resolution.reason || 'This profile is not ready to generate quotes.'}</p>}
      </div>}
      <small>Prices, contribution and margin calculations come from the API pricing engine using current profile edits. Missing or inactive profiles remain blocked; previews do not activate profiles or create quotes.</small>
    </section>}
    {notice && <p className="admin-success" role="status">{notice}</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}
  </section>;
}

function ExecutiveDashboard({ requests, onOpenQueue }: { requests: RequestRecord[]; onOpenQueue: (status?: string) => void }) {
  const [dateRange, setDateRange] = useState('7');
  const [department, setDepartment] = useState('All departments');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const selectedStart = new Date(todayStart);
  const selectedEnd = new Date(todayStart); selectedEnd.setHours(23, 59, 59, 999);
  if (dateRange === 'yesterday') { selectedStart.setDate(selectedStart.getDate() - 1); selectedEnd.setDate(selectedEnd.getDate() - 1); }
  else if (dateRange === '2') selectedStart.setDate(selectedStart.getDate() - 1);
  else if (dateRange === '7' || dateRange === '30') selectedStart.setDate(selectedStart.getDate() - Number(dateRange) + 1);
  else if (dateRange === 'month') selectedStart.setDate(1);
  else if (dateRange === 'custom') {
    if (customFrom) selectedStart.setTime(new Date(`${customFrom}T00:00:00`).getTime());
    if (customTo) selectedEnd.setTime(new Date(`${customTo}T23:59:59`).getTime());
  }
  const isPastTarget = (record: RequestRecord) => !!record.targetDate && new Date(`${record.targetDate}T23:59:59`) < new Date();
  const dateAndDepartment = requests.filter((record) => new Date(record.createdAt) >= selectedStart && new Date(record.createdAt) <= selectedEnd && (department === 'All departments' || (record.department || 'Customer Support') === department));
  const scoped = dateAndDepartment.filter((record) => !overdueOnly || isPastTarget(record));
  const open = scoped.filter((record) => !terminalStatuses.has(record.status));
  const completedToday = requests.filter((record) => record.status === 'Completed' && new Date(record.updatedAt).toLocaleDateString('en-CA') === todayKey());
  const receivedToday = requests.filter((record) => new Date(record.createdAt).toLocaleDateString('en-CA') === todayKey());
  const potentialRevenue = open.filter((record) => !record.quote && record.pricingResolution?.preview.ready && record.pricingResolution.preview.totalCents !== null)
    .reduce((sum, record) => sum + (record.pricingResolution?.preview.totalCents || 0), 0) / 100;
  const quotedRecords = scoped.filter((record) => record.quote);
  const quotedRevenue = quotedRecords.reduce((sum, record) => sum + (record.quote?.totalCents || 0), 0) / 100;
  const modeledContribution = quotedRecords.reduce((sum, record) => record.quote?.pricingBasis === 'case-specific-manual'
    ? sum
    : sum + (record.quote?.contributionCents ?? Math.round((record.quote?.totalCents || 0) * 0.3)), 0) / 100;
  const outstandingRevenue = scoped.filter((record) => record.status === 'Quote Accepted' && !record.paid)
    .reduce((sum, record) => sum + (record.quote?.totalCents || 0), 0) / 100;
  const declinedRevenue = scoped.filter((record) => record.status === 'Quote Declined')
    .reduce((sum, record) => sum + (record.quote?.totalCents || 0), 0) / 100;
  const partnerReferrals = scoped.filter((record) => Boolean(record.vehicleContext?.referralCode));
  const overdue = open.filter(isPastTarget);
  const waitingDocuments = open.filter((record) => record.status === 'Awaiting Documents');
  const waitingOnCustomer = open.filter(isWaitingOnCustomer);
  const quotesAwaitingDecision = scoped.filter((record) => record.status === 'Awaiting Customer Decision' && record.quote);
  const quotePipeline = open.some((record) => record.quote);
  const decidedQuotes = scoped.filter((record) => record.quote && (record.quoteDecision === 'accepted' || record.quoteDecision === 'declined'));
  const acceptedQuotes = decidedQuotes.filter((record) => record.quoteDecision === 'accepted');
  const declinedQuotes = decidedQuotes.filter((record) => record.quoteDecision === 'declined');
  const acceptanceRate = decidedQuotes.length ? Math.round(acceptedQuotes.length / decidedQuotes.length * 100) : null;
  const decisionHours = decidedQuotes
    .filter((record) => record.quote?.generatedAt && record.quoteDecisionAt)
    .map((record) => Math.max(0, new Date(record.quoteDecisionAt!).getTime() - new Date(record.quote!.generatedAt!).getTime()) / 3600000);
  const averageDecisionHours = decisionHours.length ? decisionHours.reduce((sum, hours) => sum + hours, 0) / decisionHours.length : null;
  const declineReasonLabels: Record<string, string> = {
    'too-expensive': 'Price too high',
    'not-ready': 'Not ready',
    'chose-another-provider': 'Chose another provider',
    'incorrect-details': 'Quote details need correcting',
    other: 'Other',
  };
  const declineReasonCounts = declinedQuotes.reduce<Record<string, number>>((counts, record) => {
    if (record.quoteDecisionReason) counts[record.quoteDecisionReason] = (counts[record.quoteDecisionReason] || 0) + 1;
    return counts;
  }, {});
  const waitingQuotes = open.filter((record) => ['Quote Preparation', 'Quote Revision Required'].includes(record.status));
  const unassigned = open.filter((record) => !record.assignee);
  const channels = ['WhatsApp', 'Call', 'Website', 'Email', 'chatbot'];
  const channelLabel: Record<string, string> = { WhatsApp: 'WhatsApp', Call: 'Calls', Website: 'Portal / Web', Email: 'Email', chatbot: 'Chat assistant' };
  const channelRows = channels.map((channel) => ({ channel, count: scoped.filter((record) => record.source?.toLowerCase() === channel.toLowerCase()).length })).filter((row) => row.count > 0);
  const departments = ['Customer Support', 'Estimate & Pricing', 'Finance', 'Operations', 'Closed Cases'];
  const departmentRows = departments.map((name) => ({ name, total: open.filter((record) => (record.department || 'Customer Support') === name).length, overdue: overdue.filter((record) => (record.department || 'Customer Support') === name).length }));
  const recentDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index)); return day; });
  const trendRows = requests.filter((record) => department === 'All departments' || (record.department || 'Customer Support') === department);
  const maxDaily = Math.max(1, ...recentDays.map((day) => trendRows.filter((record) => new Date(record.createdAt).toDateString() === day.toDateString()).length));
  const activity = scoped.flatMap((record) => (record.history || []).map((event) => ({ ...event, ref: record.ref, name: record.name }))).sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
  const alerts = [
    overdue.length ? { level: 'red', text: `${overdue.length} request${overdue.length === 1 ? '' : 's'} past the recorded target date`, action: () => onOpenQueue() } : null,
    unassigned.length ? { level: 'amber', text: `${unassigned.length} open request${unassigned.length === 1 ? '' : 's'} without an assignee`, action: () => onOpenQueue() } : null,
    waitingOnCustomer.length ? { level: 'amber', text: `${waitingOnCustomer.length} request${waitingOnCustomer.length === 1 ? '' : 's'} waiting on a customer action`, action: () => onOpenQueue('Waiting on Customer') } : null,
    waitingQuotes.length ? { level: 'amber', text: `${waitingQuotes.length} request${waitingQuotes.length === 1 ? '' : 's'} in the quote queue`, action: () => onOpenQueue('Quote Preparation') } : null,
  ].filter(Boolean) as { level: string; text: string; action: () => void }[];
  const pipeline = statuses;
  const bottlenecks = [
    { label: 'Waiting on customer', count: waitingOnCustomer.length },
    { label: 'Pending documents', count: waitingDocuments.length },
    { label: 'Pending quotes', count: waitingQuotes.length },
    { label: 'Payment setup required', count: open.filter((record) => record.status === 'Quote Accepted').length },
    { label: 'Supervisor review', count: open.filter((record) => (record.department || '').toLowerCase().includes('supervisor')).length },
    { label: 'Past target date', count: overdue.length },
  ];
  return <section className="executive-dashboard">
    <div className="dashboard-toolbar"><div><p className="admin-eyebrow">Executive operations cockpit</p><h2>Business performance</h2><span>Based on {scoped.length} recorded requests · refreshed when the data is refreshed</span></div><div className="dashboard-filters"><label>Date range<select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="1">Today</option><option value="yesterday">Yesterday</option><option value="2">Last 2 days</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option><option value="custom">Custom range</option></select></label>{dateRange === 'custom' && <><label>From<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>To<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></>}<label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}><option>All departments</option>{departments.map((name) => <option key={name}>{name}</option>)}</select></label><label className="overdue-filter"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} /> Overdue only</label><button type="button" className="admin-secondary-button" onClick={() => window.print()}>Print / Save PDF</button></div></div>
    <div className="executive-kpis">
      <button onClick={() => onOpenQueue()}><span>Requests received today</span><strong>{receivedToday.length}</strong><small>All recorded channels</small></button>
      <button onClick={() => onOpenQueue('Completed')}><span>Completed today</span><strong>{completedToday.length}</strong><small>Closed requests today</small></button>
      <button onClick={() => onOpenQueue()}><span>Open backlog</span><strong>{open.length}</strong><small>Requests in selected period</small></button>
      <button onClick={() => onOpenQueue('Partner referrals')}><span>Partner referrals</span><strong>{partnerReferrals.length}</strong><small>Requests with a referral code</small></button>
      <article><span>SLA compliance</span><strong className="metric-muted">Not configured</strong><small>No approved SLA targets yet</small></article>
      <button onClick={() => onOpenQueue('Quote Preparation')}><span>Potential · priced requests</span><strong>{money(potentialRevenue)}</strong><small>Unquoted open requests with an eligible active profile</small></button>
      <button onClick={() => onOpenQueue('Awaiting Customer')}><span>Quoted revenue · not collected</span><strong>{money(quotedRevenue)}</strong><small>{quotedRecords.length} issued quotes in the selected period</small></button>
      <button onClick={() => onOpenQueue('Payment Setup Required')}><span>Accepted · payment setup required</span><strong>{money(outstandingRevenue)}</strong><small>{open.filter((record) => record.status === 'Quote Accepted').length} accepted quotes · no payment recorded</small></button>
      <article><span>Modeled contribution · 30%</span><strong>{money(modeledContribution)}</strong><small>Planning assumption; not audited profit or cash</small></article>
      <button onClick={() => onOpenQueue('Completed')}><span>Declined quote value</span><strong>{money(declinedRevenue)}</strong><small>Declined quotes only; expired quotes are not counted as lost</small></button>
      <article><span>Collected revenue</span><strong className="metric-muted">Unavailable</strong><small>Payment gateway and reconciliation are not connected</small></article>
    </div>
    <div className="executive-grid">
      <article className="exec-card"><header><div><h3>Work in vs work done</h3><p>New requests by day · last 7 days</p></div><span className="freshness-chip">LIVE DATA</span></header><div className="daily-chart" role="img" aria-label="Requests received by day over the last 7 days">{recentDays.map((day) => { const count = trendRows.filter((record) => new Date(record.createdAt).toDateString() === day.toDateString()).length; return <div className="daily-column" key={day.toISOString()} title={`${count} requests`}><strong>{count}</strong><span style={{ height: `${Math.max(3, count / maxDaily * 100)}%` }} /><small>{shortDate(day)}</small></div>; })}</div><footer>Completed today: <b>{completedToday.length}</b> · 7 day incoming: <b>{recentDays.reduce((sum, day) => sum + trendRows.filter((record) => new Date(record.createdAt).toDateString() === day.toDateString()).length, 0)}</b><span className="metric-note">Completion rate needs reliable completion timestamps and history.</span></footer></article>
      <article className="exec-card"><header><div><h3>Intake by channel</h3><p>Source attribution from request records</p></div></header>{channelRows.length ? <div className="channel-table">{channelRows.map((row) => <button key={row.channel} onClick={() => onOpenQueue()}><span>{channelLabel[row.channel] || row.channel}</span><b>{row.count}</b><i><span style={{ width: `${Math.round(row.count / Math.max(1, scoped.length) * 100)}%` }} /></i><small>{Math.round(row.count / Math.max(1, scoped.length) * 100)}%</small></button>)}</div> : <p className="empty-chart">No channel data recorded for this period.</p>}<p className="metric-note">Conversion by channel unavailable until enquiries and completed service records are linked.</p></article>
      <article className="exec-card"><header><div><h3>Portal quote decisions</h3><p>Customer decisions recorded for the selected period</p></div></header><div className="unconfigured-grid"><span><b>{quotesAwaitingDecision.length}</b>Awaiting decision</span><span><b>{acceptanceRate === null ? '—' : `${acceptanceRate}%`}</b>Acceptance rate {decidedQuotes.length ? `· ${decidedQuotes.length} decided` : '· no decisions yet'}</span><span><b>{averageDecisionHours === null ? '—' : `${averageDecisionHours.toFixed(1)}h`}</b>Average time to decision</span></div><div className="quote-decline-reasons"><strong>Decline reasons</strong>{Object.entries(declineReasonCounts).length ? Object.entries(declineReasonCounts).map(([reason, count]) => <div key={reason}><span>{declineReasonLabels[reason] || reason}</span><b>{count}</b></div>) : <p className="empty-chart">No quote declines recorded in this period.</p>}</div><p className="metric-note">Acceptance rate uses accepted ÷ accepted and declined quotes. Quotes awaiting a decision are excluded. This portal does not process payments.</p></article>
      <article className="exec-card"><header><div><h3>Department workload & backlog</h3><p>Open requests and those past their recorded target</p></div></header><div className="department-bars">{departmentRows.map((row) => <button key={row.name} onClick={() => { setDepartment(row.name); onOpenQueue(); }}><span>{row.name}</span><i><b style={{ width: `${row.total ? Math.max(5, row.total / Math.max(1, ...departmentRows.map((x) => x.total)) * 100) : 0}%` }} /><em style={{ width: `${row.total ? row.overdue / row.total * 100 : 0}%` }} /></i><small>{row.total} open · {row.overdue} late</small></button>)}</div><div className="legend"><span>Open work</span><span>Past target date</span></div></article>
      <article className="exec-card"><header><div><h3>Process bottlenecks</h3><p>Queue counts from current workflow states</p></div></header><div className="bottleneck-list">{bottlenecks.map((item) => <button key={item.label} onClick={() => onOpenQueue(item.label === 'Pending documents' ? 'Awaiting Documents' : item.label === 'Pending quotes' ? 'Quote Preparation' : item.label === 'Payment setup required' ? 'Payment Setup Required' : undefined)}><span>{item.label}</span><b className={item.count > 0 ? 'attention' : ''}>{item.count}</b><small>{item.count ? 'Waiting time unavailable' : 'No matching records'}</small></button>)}</div></article>
      <article className="exec-card"><header><div><h3>Revenue by service</h3><p>Quote amounts currently recorded (ZAR)</p></div><span className="caveat-chip">ESTIMATES ONLY</span></header><div className="service-revenue">{Object.entries(serviceNames).map(([service, label]) => { const rows = open.filter((record) => record.services.includes(service)); const amount = rows.reduce((sum, record) => sum + (Number(record.quoteAmount) || 0), 0); return <button key={service} onClick={() => onOpenQueue()}><span>{label}</span><i><b style={{ width: `${quotePipeline ? amount / Math.max(1, ...Object.keys(serviceNames).map((id) => open.filter((record) => record.services.includes(id)).reduce((sum, record) => sum + (Number(record.quoteAmount) || 0), 0))) * 100 : 0}%` }} /></i><strong>{money(amount)}</strong></button>; })}</div><p className="metric-note">Amounts are draft quotes. Collected revenue and pass-through charges are not available.</p></article>
      <article className="exec-card"><header><div><h3>Team capacity</h3><p>Open requests assigned to named staff</p></div></header>{Array.from(new Set(open.map((record) => record.assignee).filter(Boolean))).length ? <div className="capacity-list">{Array.from(new Set(open.map((record) => record.assignee).filter(Boolean))).map((name) => { const count = open.filter((record) => record.assignee === name).length; return <button key={name} onClick={() => onOpenQueue()}><span>{name}</span><b>{count} open</b><small>Capacity target not configured</small></button>; })}</div> : <p className="empty-chart">No open requests are assigned to named staff yet.</p>}<div className="capacity-footer">Unassigned: <b>{unassigned.length}</b> · Utilisation: <b>Not configured</b></div></article>
      <article className="exec-card"><header><div><h3>SLA & customer experience</h3><p>Governance measures requiring approved targets/data</p></div></header><div className="unconfigured-grid"><span><b>—</b>SLA compliance</span><span><b>—</b>Average resolution</span><span><b>—</b>Customer satisfaction</span><span><b>—</b>Escalation policy</span></div><p className="metric-note">Configure business-hour calendars, SLA targets, feedback capture and escalation ownership before reporting these figures.</p></article>
      <article className="exec-card feed-card"><header><div><h3>Live activity</h3><p>Latest recorded request events</p></div><span className="freshness-chip">FROM REQUEST TIMELINE</span></header>{activity.length ? <ol className="activity-feed">{activity.map((event, index) => <li key={`${event.ref}-${event.at}-${index}`}><span className="activity-marker" /><div><strong>{event.message}</strong><small>{event.ref} · {event.name}</small></div><time>{new Date(event.at).toLocaleString()}</time></li>)}</ol> : <p className="empty-chart">No activity events recorded yet.</p>}</article>
      <article className="exec-card alerts-card"><header><div><h3>Management alerts</h3><p>Items that may need intervention</p></div><span className="alert-count">{alerts.length}</span></header>{alerts.length ? alerts.map((alert, index) => <button key={index} className={`management-alert ${alert.level}`} onClick={alert.action}><i />{alert.text}<span>Review →</span></button>) : <p className="healthy-state">No overdue target dates or unassigned requests in this period.</p>}<p className="metric-note">Automated alert thresholds and SLA escalation rules remain unconfigured.</p></article>
    </div>
    <article className="exec-card workflow-card"><header><div><h3>Service pipeline</h3><p>Current workflow stage distribution</p></div></header><div className="pipeline-strip">{pipeline.map((status) => { const count = scoped.filter((record) => record.status === status).length; return <button key={status} onClick={() => onOpenQueue(status)}><small>{status}</small><b>{count}</b></button>; })}</div></article>
  </section>;
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('weq4u-admin-token') || '');
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [loginProfile, setLoginProfile] = useState<'system-administrator' | 'founder'>('system-administrator');
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All requests');
  const [activeView, setActiveView] = useState<'overview' | 'queue' | 'pricing'>('overview');
  const [draftStatus, setDraftStatus] = useState('Submitted');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [draftTargetDate, setDraftTargetDate] = useState('');
  const [draftRequestedDocuments, setDraftRequestedDocuments] = useState('');
  const [draftServiceValidated, setDraftServiceValidated] = useState(false);
  const [assessmentRequirements, setAssessmentRequirements] = useState<ServiceRequirement[]>([]);
  const [assessmentEligibility, setAssessmentEligibility] = useState<ServiceAssessment['eligibility']>('pending');
  const [assessmentGovernmentReadiness, setAssessmentGovernmentReadiness] = useState<ServiceAssessment['governmentReadiness']>('pending');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [assessmentRequirementsReviewed, setAssessmentRequirementsReviewed] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');
  const [documentReviewStates, setDocumentReviewStates] = useState<Record<string, { status: 'pending' | 'verified' | 'rejected' | 'replacement-required'; note: string }>>({});
  const [draftQuoteNotes, setDraftQuoteNotes] = useState('');
  const [draftQuoteConditions, setDraftQuoteConditions] = useState('');
  const [draftQuoteValidUntil, setDraftQuoteValidUntil] = useState('');
  const [draftQuoteCommunicationConfirmed, setDraftQuoteCommunicationConfirmed] = useState(false);
  const [draftQuoteCommunicationChannel, setDraftQuoteCommunicationChannel] = useState('portal');
  const [draftFulfilmentValidated, setDraftFulfilmentValidated] = useState(false);
  const [draftCompletionConfirmed, setDraftCompletionConfirmed] = useState(false);
  const [customerTaskType, setCustomerTaskType] = useState<'information' | 'appointment' | 'delivery'>('information');
  const [customerTaskTitle, setCustomerTaskTitle] = useState('');
  const [customerTaskMessage, setCustomerTaskMessage] = useState('');
  const [customerTaskDueDate, setCustomerTaskDueDate] = useState('');
  const [customerTaskDirty, setCustomerTaskDirty] = useState(false);
  const [customerTaskNotice, setCustomerTaskNotice] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = token
      ? `${activeView === 'overview' ? 'Management dashboard' : activeView === 'pricing' ? 'Finance pricing' : 'Work queue'} | WeQ4U Staff Workspace`
      : 'Staff sign in | WeQ4U Staff Workspace';
  }, [activeView, token]);

  async function loadRequests(accessToken: string) {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const sessionResponse = await fetch(`${apiBase}/admin/session`, { headers });
      const sessionResult = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(sessionResult.error || 'Could not verify staff access.');
      setStaff(sessionResult.staff);
      if (sessionResult.staff.permissions.includes('pricing:manage') && !sessionResult.staff.permissions.includes('requests:read')) setActiveView('pricing');
      if (sessionResult.staff.permissions.includes('requests:read')) {
        const response = await fetch(`${apiBase}/admin/requests`, { headers });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load service requests.');
        setRequests(result.requests);
        setSelectedRef((current) => current && result.requests.some((item: RequestRecord) => item.ref === current) ? current : result.requests[0]?.ref || '');
      } else {
        setRequests([]);
        setSelectedRef('');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load service requests.');
      if (requestError instanceof Error && requestError.message.includes('authorization')) logout();
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem('weq4u-admin-token');
    setToken('');
    setStaff(null);
    setRequests([]);
    setSelectedRef('');
  }

  useEffect(() => {
    if (token) loadRequests(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const refreshTimer = window.setInterval(() => loadRequests(token), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [token]);

  const filteredRequests = useMemo(() => requests.filter((record) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [record.ref, record.name, record.phone, record.email, record.suburb, ...record.services.map((service) => serviceNames[service] || service)].some((value) => value.toLowerCase().includes(query));
    const group = queueGroups[statusFilter];
    const matchesOwnership = statusFilter !== 'Vehicle ownership cases' || record.services.includes('vehicle-ownership-onboarding');
    const matchesPartnerReferral = statusFilter !== 'Partner referrals' || Boolean(record.vehicleContext?.referralCode);
    const waitingOnCustomer = record.status === 'Awaiting Customer Decision'
      || (record.requestedDocuments || []).length > 0
      || (record.customerTasks || []).some((task) => task.status === 'waiting-on-customer');
    const matchesQueue = statusFilter === 'Waiting on Customer'
      ? waitingOnCustomer
      : statusFilter === 'All requests' || statusFilter === 'Vehicle ownership cases' || statusFilter === 'Partner referrals' || (group ? group.includes(record.status) : record.status === statusFilter);
    return matchesQuery && matchesOwnership && matchesPartnerReferral && matchesQueue;
  }), [requests, search, statusFilter]);
  const selected = requests.find((record) => record.ref === selectedRef);
  const needsCaseSpecificAssessment = Boolean(selected && (!selected.serviceDefinitionReady || !selected.serviceDefinition));
  const quotePreparationReady = Boolean(selected && selected.serviceAssessmentReady
    && selected.quoteReadiness?.ready
    && selected.pricingResolution?.preview.ready
    && Boolean(draftQuoteValidUntil));

  useEffect(() => {
    const request = requests.find((record) => record.ref === selectedRef);
    if (!request) return;
    setDraftStatus(request.status);
    setDraftNotes(request.notes || '');
    setDraftAssignee(request.assignee || '');
    setDraftTargetDate(request.targetDate || '');
    setDraftRequestedDocuments((request.requestedDocuments || []).join('\n'));
    setDraftServiceValidated(request.serviceValidated || false);
    setAssessmentRequirements(request.serviceAssessment?.requirements || []);
    setAssessmentEligibility(request.serviceAssessment?.eligibility || 'pending');
    setAssessmentGovernmentReadiness(request.serviceAssessment?.governmentReadiness || 'pending');
    setAssessmentNotes(request.serviceAssessment?.notes || '');
    setAssessmentRequirementsReviewed(request.serviceAssessment?.requirementsReviewed || false);
    setNewRequirement('');
    setDocumentReviewStates(Object.fromEntries(request.documents.map((document) => [document.id, {
      status: document.reviewState === 'received' ? 'pending' : document.reviewState === 'verified' || document.reviewState === 'rejected' || document.reviewState === 'replacement-required' ? document.reviewState : 'pending',
      note: document.reviewNote || '',
    }])));
    setDraftQuoteNotes(request.quoteDraft?.notes || request.quote?.notes || '');
    setDraftQuoteConditions((request.quoteDraft?.conditions || request.quote?.conditions || []).join('\n'));
    setDraftQuoteValidUntil(request.quoteDraft?.validUntil || request.quote?.validUntil || quoteDefaultValidUntil());
    setDraftQuoteCommunicationConfirmed(false);
    setDraftQuoteCommunicationChannel('portal');
    setDraftFulfilmentValidated(request.fulfilmentValidated || false);
    setDraftCompletionConfirmed(request.completionConfirmed || false);
    setCustomerTaskType('information');
    setCustomerTaskTitle('');
    setCustomerTaskMessage('');
    setCustomerTaskDueDate('');
    setCustomerTaskDirty(false);
    setNotice('');
  }, [selectedRef]);

  function selectRequest(ref: string) {
    if (ref === selectedRef) return;
    if (customerTaskDirty && !window.confirm('Discard the unsent customer action before opening another request?')) return;
    setSelectedRef(ref);
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supplied = tokenInput.trim();
    if (supplied.length < 32) {
      setError('The admin API token should be at least 32 characters. Check apps/api/.env.example and the API configuration.');
      return;
    }
    try {
      const response = await fetch(`${apiBase}/admin/session`, { headers: { Authorization: `Bearer ${supplied}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'This staff token is not recognised.');
      if (result.staff.role !== loginProfile) throw new Error(`This token belongs to the ${result.staff.title} profile. Choose the matching profile and try again.`);
      setStaff(result.staff);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not verify staff access.');
      return;
    }
    sessionStorage.setItem('weq4u-admin-token', supplied);
    setToken(supplied);
    setTokenInput('');
    setError('');
  }

  async function saveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload: Record<string, unknown> = {
        status: draftStatus,
        notes: draftNotes,
        requestedDocuments: draftRequestedDocuments.split('\n').map((label) => label.trim()).filter(Boolean),
        serviceValidated: draftServiceValidated,
        quoteNotes: draftQuoteNotes,
        conditions: draftQuoteConditions.split('\n').map((value) => value.trim()).filter(Boolean),
        quoteValidUntil: draftQuoteValidUntil,
        quoteCommunicationConfirmed: draftQuoteCommunicationConfirmed,
        quoteCommunicationChannel: draftQuoteCommunicationChannel,
        fulfilmentValidated: draftFulfilmentValidated,
        completionConfirmed: draftCompletionConfirmed,
      };
      if (staff?.permissions.includes('operations:manage')) {
        Object.assign(payload, { targetDate: draftTargetDate });
        if (draftStatus === selected.status) payload.assignee = draftAssignee;
      }
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save this request.');
      setRequests((current) => current.map((record) => record.ref === result.ref ? result : record));
      setNotice('Request updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this request.');
    } finally {
      setSaving(false);
    }
  }

  async function saveServiceAssessment() {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/service-assessment`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsReviewed: assessmentRequirementsReviewed,
          requirements: assessmentRequirements,
          documentReviews: selected.documents.map((document) => ({ documentId: document.id, ...(documentReviewStates[document.id] || { status: 'pending', note: '' }) })),
          eligibility: assessmentEligibility,
          governmentReadiness: assessmentGovernmentReadiness,
          notes: assessmentNotes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the service assessment.');
      setRequests((current) => current.map((record) => record.ref === result.ref ? result : record));
      setNotice(result.serviceAssessmentReady ? 'Assessment complete. This request is ready for quote preparation.' : 'Assessment saved. Quote preparation remains blocked until all checks pass.');
    } catch (assessmentError) {
      setError(assessmentError instanceof Error ? assessmentError.message : 'Could not save the service assessment.');
    } finally {
      setSaving(false);
    }
  }

  function updateRequirement(requirementId: string, patch: Partial<ServiceRequirement>) {
    setAssessmentRequirements((current) => current.map((requirement) => requirement.id === requirementId ? { ...requirement, ...patch } : requirement));
  }

  async function createCustomerTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    setCustomerTaskNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/customer-tasks`, {
        method: 'POST',
        headers: { Authorization: 'Bearer '.concat(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: customerTaskType,
          title: customerTaskTitle,
          message: customerTaskMessage,
          dueDate: customerTaskDueDate,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the customer action.');
      setRequests((current) => current.map((record) => record.ref === result.ref ? result : record));
      setCustomerTaskType('information');
      setCustomerTaskTitle('');
      setCustomerTaskMessage('');
      setCustomerTaskDueDate('');
      setCustomerTaskDirty(false);
      setCustomerTaskNotice(result.notificationStatus === 'sent'
        ? 'Customer action created and emailed.'
        : 'Customer action saved. Contact the customer and explain what they need to do.');
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Could not create the customer action.');
    } finally {
      setSaving(false);
    }
  }

  async function completeCustomerTask(taskId: string) {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    setCustomerTaskNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/customer-tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer '.concat(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not complete the customer action.');
      setRequests((current) => current.map((record) => record.ref === result.ref ? result : record));
      setCustomerTaskNotice('Customer action marked complete.');
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Could not complete the customer action.');
    } finally {
      setSaving(false);
    }
  }

  async function generateSelectedQuote() {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/quote-draft`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteNotes: draftQuoteNotes,
          conditions: draftQuoteConditions.split('\n').map((value) => value.trim()).filter(Boolean),
          quoteValidUntil: draftQuoteValidUntil,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not prepare this quote.');
      setRequests((current) => current.map((record) => record.ref === result.ref ? result : record));
      setDraftStatus(result.status);
      setNotice('Quote draft prepared for approval. It has not been sent to the customer.');
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : 'Could not prepare this quote.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadRegistryReview() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/registry-review.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Could not create the internal registry review.');
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `registry-review-${selected.ref}.pdf`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not create the internal registry review.');
    } finally {
      setSaving(false);
    }
  }

  async function updateQuoteDraft(action: 'approve' | 'publish') {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/quote-draft/${action}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer '.concat(token) },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Could not ${action} this quote.`);
      setRequests((current) => current.map((record) => record.ref === result.ref ? result : record));
      setDraftStatus(result.status);
      setNotice(action === 'approve'
        ? 'Quote approved. It remains a draft until you explicitly publish it.'
        : result.notificationStatus === 'sent'
          ? 'Approved quote published to the customer portal; an email notification was also sent.'
          : 'Approved quote published to the customer’s private tracking portal.');
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : `Could not ${action} this quote.`);
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    try {
      const response = await fetch(`${apiBase}/admin/requests.csv`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Could not export requests.');
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'weq4u-service-requests.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export requests.');
    }
  }

  async function downloadDocument(documentId: string, index: number) {
    if (!selected) return;
    try {
      const response = await fetch(`${apiBase}/admin/requests/${encodeURIComponent(selected.ref)}/documents/${encodeURIComponent(documentId)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Could not download this document.');
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selected.ref}-document-${index + 1}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Could not download this document.');
    }
  }

  if (!token) {
    return <main className="admin-login-page"><section className="admin-login"><span className="admin-login-mark">W</span><p className="admin-eyebrow">WeQ4UServices · Private access</p><h1>Staff workspace</h1><p>Choose your profile, then enter that profile’s private access token. The token confirms your identity and permissions.</p><form onSubmit={authenticate}><label htmlFor="login-profile">Sign in as</label><select id="login-profile" value={loginProfile} onChange={(event) => setLoginProfile(event.target.value as typeof loginProfile)}><option value="system-administrator">System administrator</option><option value="founder">Founder</option></select><label htmlFor="admin-token">Profile access token</label><div className="token-input"><KeyRound size={17} /><input id="admin-token" type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} required /></div><button className="admin-primary-button" type="submit">Open staff workspace <span>→</span></button></form>{error && <p className="admin-error" role="alert">{error}</p>}<span className="secure-label"><ShieldCheck size={14} /> Token is held in this browser session only. Profile selection does not grant access.</span></section></main>;
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <a className="admin-wordmark" href="http://localhost:3000/"><b>WQ</b><span>WeQ4U Services</span></a>
      <p className="admin-sidebar-label">Operations Intelligence</p>
      <nav className="admin-navigation" aria-label="Operations navigation">
        {staff?.permissions.includes('requests:read') && <>
        <p>OPERATIONS</p>
        <button type="button" className={`admin-sidebar-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}><LayoutDashboard size={17} /> Dashboard</button>
        <p>REQUESTS</p>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'All requests' ? 'active' : ''}`} onClick={() => { setStatusFilter('All requests'); setActiveView('queue'); }}><ClipboardList size={17} /> Work queue</button>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'Waiting on Customer' ? 'active' : ''}`} onClick={() => { setStatusFilter('Waiting on Customer'); setActiveView('queue'); }}><ClipboardList size={17} /> Waiting on customer</button>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'Awaiting Documents' ? 'active' : ''}`} onClick={() => { setStatusFilter('Awaiting Documents'); setActiveView('queue'); }}><FileText size={17} /> Awaiting documents</button>
        <p>QUOTES & FULFILMENT</p>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'Quote Preparation' ? 'active' : ''}`} onClick={() => { setStatusFilter('Quote Preparation'); setActiveView('queue'); }}><FileText size={17} /> Quote preparation</button>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'Awaiting Customer' ? 'active' : ''}`} onClick={() => { setStatusFilter('Awaiting Customer'); setActiveView('queue'); }}><ClipboardList size={17} /> Awaiting customer</button>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'Payment Setup Required' ? 'active' : ''}`} onClick={() => { setStatusFilter('Payment Setup Required'); setActiveView('queue'); }}><DollarSign size={17} /> Payment setup required</button>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'In Progress' ? 'active' : ''}`} onClick={() => { setStatusFilter('In Progress'); setActiveView('queue'); }}><ClipboardList size={17} /> In progress</button>
        <button type="button" className={`admin-sidebar-item ${activeView === 'queue' && statusFilter === 'Ready for Delivery' ? 'active' : ''}`} onClick={() => { setStatusFilter('Ready for Delivery'); setActiveView('queue'); }}><ClipboardList size={17} /> Ready for delivery</button>
        </>}
        {staff?.permissions.includes('pricing:manage') && <><p>PRICING & FINANCE</p><button type="button" className={`admin-sidebar-item ${activeView === 'pricing' ? 'active' : ''}`} onClick={() => setActiveView('pricing')}><DollarSign size={17} /> Pricing & margins</button></>}
      </nav>
      <div className="admin-sidebar-bottom"><span><ShieldCheck size={15} /> Staff console · localhost:3001</span><button type="button" onClick={logout}><LogOut size={15} /> Sign out</button></div>
    </aside>
    <section className="admin-content">
      <header className="admin-topbar"><div><p className="admin-eyebrow">Operations & Admin Console · staff workspace</p><h1>{activeView === 'overview' ? 'Management dashboard' : activeView === 'pricing' ? 'Finance pricing workspace' : 'Work queue'}</h1><span className="staff-identity">{staff?.name || 'Staff'} · {staff?.title || 'Verifying role'}</span></div><div className="admin-top-actions">{staff?.permissions.includes('reports:export') && <button className="admin-secondary-button" type="button" onClick={exportCsv}><Download size={15} /> Export CSV</button>}{activeView !== 'pricing' && <button className="admin-icon-button" type="button" onClick={() => loadRequests(token)} aria-label="Refresh requests"><RefreshCw size={17} /></button>}</div></header>
      {activeView !== 'pricing' && staff?.permissions.includes('requests:read') && <div className="admin-summary"><div><span>New requests</span><strong>{requests.filter((record) => record.status === 'Submitted').length}</strong></div><div><span>Needs action</span><strong>{requests.filter((record) => ['Under Review', 'Awaiting Documents', 'Quote Preparation'].includes(record.status)).length}</strong></div><div><span>Waiting on customer</span><strong>{requests.filter(isWaitingOnCustomer).length}</strong></div><div><span>Active fulfilment</span><strong>{requests.filter((record) => ['Work in Progress', 'Ready for Collection / Delivery'].includes(record.status)).length}</strong></div><small>Recorded requests only · no SLA targets configured</small></div>}
      {activeView === 'overview' && staff?.permissions.includes('requests:read') && <ExecutiveDashboard requests={requests} onOpenQueue={(status) => { setStatusFilter(status || 'All requests'); setActiveView('queue'); }} />}
      {activeView === 'pricing' && staff?.permissions.includes('pricing:manage') && <FinancePricing token={token} />}
      {activeView === 'queue' && <div className="admin-workspace">
        <section className="request-list-pane"><div className="list-heading"><div><h2>Operational queues</h2><span>{filteredRequests.length} shown</span></div></div><div className="queue-views" aria-label="Request queues">{Object.entries(queueGroups).map(([label, queueStatuses]) => <button type="button" key={label} className={statusFilter === label ? 'active' : ''} onClick={() => setStatusFilter(label)}>{label}<b>{requests.filter((record) => label === 'Waiting on Customer' ? isWaitingOnCustomer(record) : queueStatuses.includes(record.status)).length}</b></button>)}</div><div className="request-filters"><label className="admin-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, suburb, reference" /></label><label className="visually-hidden" htmlFor="status-filter">Filter by queue or status</label><select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All requests</option><option>Vehicle ownership cases</option><option>Partner referrals</option><optgroup label="Operational queues">{Object.keys(queueGroups).map((label) => <option key={label}>{label}</option>)}</optgroup><optgroup label="Individual status">{statuses.map((status) => <option key={status}>{status}</option>)}</optgroup></select></div>
          {loading && <p className="admin-empty">Loading service requests…</p>}
          {!loading && filteredRequests.length === 0 && <div className="admin-empty"><span className="admin-empty-mark"><FileText size={21} /></span><strong>{requests.length ? 'No requests match these filters.' : 'Your request queue is clear.'}</strong><p>New website and callback requests will appear here.</p></div>}
          <div className="request-list">{filteredRequests.map((record) => { const ageHours = Math.max(0, Math.floor((Date.now() - new Date(record.createdAt).getTime()) / 3600000)); const ageText = ageHours < 24 ? `${ageHours}h old` : `${Math.floor(ageHours / 24)}d old`; const late = !!record.targetDate && new Date(`${record.targetDate}T23:59:59`) < new Date() && !terminalStatuses.has(record.status); return <button type="button" className={`request-row ${record.ref === selectedRef ? 'selected' : ''}`} key={record.ref} onClick={() => selectRequest(record.ref)}><div className="request-row-top"><strong>{record.name}</strong><span className={`request-status status-${record.status.toLowerCase().replace(/ /g, '-')}`}>{record.status}</span></div><div className="request-row-services">{record.services.map((service) => serviceNames[service] || service).join(' · ')}</div><div className="request-row-meta"><span>{record.ref}</span><span>{record.suburb}</span><span className={late ? 'age-overdue' : 'request-age'}>{late ? 'Past target' : ageText}</span></div></button>; })}</div>
        </section>
        <section className="request-detail-pane">{selected ? <>
          <div className="detail-header"><div><p className="admin-eyebrow">{selected.ref}</p><h2>{selected.name}</h2><span>Received {new Date(selected.createdAt).toLocaleString()}</span></div><a href={`tel:${selected.phone.replace(/[^+\d]/g, '')}`}>{selected.phone}</a></div>
          <div className="detail-contact"><a href={`mailto:${selected.email}`}>{selected.email || 'No email supplied'}</a><span>{selected.suburb}{selected.address ? ` · ${selected.address}` : ''}</span><span>Source: {selected.source === 'chatbot' ? 'Ask WeQ4U chat' : 'Website request'}</span></div>
          <div className="detail-section"><p className="detail-label">Requested service</p><div className="detail-tags">{selected.services.map((service) => <span key={service}>{serviceNames[service] || service}</span>)}{selected.courierCollection && <span>Courier collection requested</span>}{selected.courierDelivery && <span>Courier delivery requested</span>}{selected.courier && !selected.courierCollection && !selected.courierDelivery && <span>Courier option (legacy request)</span>}</div>{selected.serviceDetails && Object.entries(selected.serviceDetails).map(([service, answer]) => <p className="detail-muted" key={service}><strong>{serviceNames[service] || service}:</strong> {answer}</p>)}{selected.message && <p className="customer-message">“{selected.message}”</p>}</div>
          {selected.services.includes('vehicle-ownership-onboarding') && <div className="detail-section"><p className="detail-label">New vehicle request scope</p><p><strong>Purchase type:</strong> {selected.vehicleContext?.purchaseType || 'Not recorded'}</p><p><strong>Finance stage:</strong> {selected.vehicleContext?.financeStage || 'Not recorded'}</p>{selected.vehicleContext?.retailerName && <p><strong>Dealership:</strong> {selected.vehicleContext.retailerName}</p>}{selected.vehicleContext?.referralCode && <p><strong>Partner referral code:</strong> {selected.vehicleContext.referralCode}</p>}<ul className="ownership-admin-list">{(selected.workItems || []).map((item) => <li key={item}>{({ 'ownership-transfer': 'Help with vehicle ownership papers', registration: 'Register vehicle', 'licence-disc': 'Check licence disc and licensing steps', roadworthy: 'Help arrange roadworthy test', 'document-handover': 'Help with final vehicle papers', 'not-sure': 'Customer asked for guidance' } as Record<string, string>)[item] || item}</li>)}</ul><p className="detail-muted">These are requested services. Confirm the work scope and documents with the customer before processing.</p></div>}
          <div className="detail-section"><p className="detail-label">Documents supplied</p>{selected.documents.length ? <div className="document-list">{selected.documents.map((document, index) => <button type="button" key={document.id} onClick={() => downloadDocument(document.id, index)}><FileText size={16} /><span>{document.label || `Document ${index + 1}`}<small>{document.serviceId ? `${serviceNames[document.serviceId] || document.serviceId} · ` : ''}{document.type} · {(document.size / 1024 / 1024).toFixed(1)} MB · encrypted at rest</small></span><Download size={15} /></button>)}</div> : <p className="detail-muted">No documents attached.</p>}</div>
          <div className="detail-section"><p className="detail-label">Activity timeline</p><ol className="admin-timeline">{(selected.history || [{ status: selected.status, at: selected.updatedAt, message: "Current status" }]).slice().reverse().map((event, index) => <li key={index}><span className="timeline-dot" /><div><strong>{event.status}</strong><p>{event.message}</p><small>{new Date(event.at).toLocaleString()}</small></div></li>)}</ol><p className="detail-muted"><strong>Department:</strong> {selected.department || "Customer Support"} · <strong>Owner:</strong> {selected.assignee || "Unassigned"} · <strong>Next:</strong> {selected.nextAction || "Not set"}</p></div>
          {selected.quote && <div className="detail-section quote-breakdown">
            <p className="detail-label">{selected.quote.pricingBasis === 'case-specific-manual' ? 'Generated quote · case-specific' : `Generated quote · profile v${selected.quote.profileVersion}`}</p>
            <div className="customer-quote-preview">
              {selected.quote.pricingBasisLabel && <div className="quote-estimate-notice"><strong>{selected.quote.pricingBasisLabel}</strong><span>{selected.quote.estimateDisclaimer}</span></div>}
              <div className="customer-quote-heading"><div><span>{selected.quote.profileName || 'Quotation ready to review'}</span><strong>{selected.quote.quoteNumber || selected.quote.id}</strong></div><span>Version {selected.quote.version || 1}</span></div>
              <p>Package: <strong>{selected.quote.packageName || 'Standard'}</strong></p>
              <p className="customer-quote-meta">Prepared {selected.quote.generatedAt ? new Date(selected.quote.generatedAt).toLocaleDateString('en-ZA') : 'date not recorded'}{selected.quote.validUntil ? ` · Valid until ${new Date(`${selected.quote.validUntil}T00:00:00`).toLocaleDateString('en-ZA')}` : ''}</p>
              <div className="customer-quote-lines">{selected.quote.lines.map((line) => <div className="quote-line" key={line.componentId}><span>{line.label}{line.sourceNote && <small>Source: {line.sourceNote}</small>}</span><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.quoteCurrency || 'ZAR' }).format(line.amountCents / 100)}</strong></div>)}<div className="quote-line quote-total"><strong>Total</strong><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.quoteCurrency || 'ZAR' }).format(selected.quote.totalCents / 100)}</strong></div></div>
              {selected.quote.vatTreatment && <p>VAT treatment: {selected.quote.vatTreatment === 'inclusive' ? 'Prices include VAT' : selected.quote.vatTreatment === 'exclusive' ? 'VAT added separately' : 'VAT not applicable'}</p>}
              {!!selected.quote.conditions?.length && <div><strong>Conditions</strong><ul>{selected.quote.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></div>}
              {!!selected.quote.requiredDocuments?.length && <div><strong>Documents to provide</strong><ul>{selected.quote.requiredDocuments.map((document) => <li key={document}>{document}</li>)}</ul></div>}
              {selected.quote.notes && <p>{selected.quote.notes}</p>}
              {selected.quoteDecision
                ? <p className="detail-muted">Decision recorded: <strong>{selected.quoteDecision}</strong>{selected.quoteDecisionAt ? ` · ${new Date(selected.quoteDecisionAt).toLocaleString('en-ZA')}` : ''}</p>
                : <div className="quote-actions"><button type="button" disabled>Accept quote</button><button type="button" disabled>Decline</button></div>}
              <small>Customer decision is made in the private tracking portal. Payment processing is not enabled.</small>
            </div>
          </div>}
            {staff?.permissions.includes('requests:update') && <section className="detail-section service-assessment-panel">
              <p className="detail-label">Service assessment · quote readiness</p>
                {selected.serviceDefinition && <div className="service-definition-banner"><strong>{selected.serviceDefinition.serviceName}</strong><span>{selected.serviceDefinition.serviceCode} · Definition v{selected.serviceDefinition.version} · {selected.serviceDefinition.configurationStatus === 'provisional-pilot' ? 'Provisional pilot configuration' : selected.serviceDefinition.configurationStatus.replace(/-/g, ' ')}</span>{!selected.serviceDefinitionReady && <small>This service template is awaiting business approval. Its draft requirements must be confirmed before quoting.</small>}{selected.serviceDefinition.configurationStatus === 'provisional-pilot' && <small>Owner-authorized pilot checklist and provisional service-fee range. Confirm the requirements and exclusions during pilot review.</small>}</div>}
              <p className="detail-muted">Review the case requirements and evidence before building a quote. Do not infer government requirements from uploaded files; record the source used for each verified requirement.</p>
              <label className="check-field"><input type="checkbox" checked={assessmentRequirementsReviewed} onChange={(event) => setAssessmentRequirementsReviewed(event.target.checked)} /> I reviewed the applicable service requirements for this case.</label>
              <div className="assessment-requirements">
                <strong>Requirements checklist</strong>
                {assessmentRequirements.map((requirement) => <div className="assessment-row" key={requirement.id}>
                  <span>{requirement.label}{requirement.required ? ' · required' : ' · optional'}</span>
                  <select aria-label={`${requirement.label} assessment`} value={requirement.status} onChange={(event) => updateRequirement(requirement.id, { status: event.target.value as ServiceRequirement['status'] })}>
                    <option value="received">Received</option><option value="missing">Missing</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="not-applicable">Not applicable</option>
                  </select>
                  <select aria-label={`${requirement.label} evidence`} value={requirement.evidenceDocumentId || ''} onChange={(event) => updateRequirement(requirement.id, { evidenceDocumentId: event.target.value })}>
                    <option value="">No linked evidence</option>{selected.documents.map((document) => <option key={document.id} value={document.id}>{document.label || document.id}</option>)}
                  </select>
                  <input aria-label={`${requirement.label} note`} value={requirement.note || ''} onChange={(event) => updateRequirement(requirement.id, { note: event.target.value })} placeholder="Assessment note" maxLength={300} />
                  {needsCaseSpecificAssessment && <button className="admin-secondary-button" type="button" aria-label={`Remove ${requirement.label}`} onClick={() => setAssessmentRequirements((current) => current.filter((item) => item.id !== requirement.id))}>Remove</button>}
                </div>)}
                {!assessmentRequirements.length && <p className="admin-hint">No requirements are configured. Add case-specific requirements and record their authoritative sources before marking them verified.</p>}
                {needsCaseSpecificAssessment && <form className="assessment-add-requirement" onSubmit={(event) => { event.preventDefault(); const label = newRequirement.trim(); if (!label) return; setAssessmentRequirements((current) => [...current, { id: crypto.randomUUID(), label, required: true, status: 'received' }]); setNewRequirement(''); }}>
                  <input aria-label="New requirement" value={newRequirement} onChange={(event) => setNewRequirement(event.target.value)} placeholder="Add a case-specific requirement" maxLength={160} />
                  <button className="admin-secondary-button" type="submit" disabled={!newRequirement.trim()}>Add case requirement</button>
                </form>}
              </div>
              <div className="assessment-documents">
                <strong>Document verification</strong>
                {selected.documents.length ? selected.documents.map((document, index) => <div className="assessment-row" key={document.id}>
                  <span>{document.label || `Document ${index + 1}`}<small>{document.reviewedBy ? `Reviewed by ${document.reviewedBy}${document.reviewedAt ? ` · ${new Date(document.reviewedAt).toLocaleString()}` : ''}` : 'Not reviewed'}</small></span>
                  <select aria-label={`Review ${document.label || 'document'}`} value={documentReviewStates[document.id]?.status || 'pending'} onChange={(event) => setDocumentReviewStates((current) => ({ ...current, [document.id]: { ...(current[document.id] || { note: '' }), status: event.target.value as 'pending' | 'verified' | 'rejected' | 'replacement-required' } }))}>
                    <option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="replacement-required">Replacement required</option>
                  </select>
                  <input aria-label={`Review note for ${document.label || 'document'}`} value={documentReviewStates[document.id]?.note || ''} onChange={(event) => setDocumentReviewStates((current) => ({ ...current, [document.id]: { ...(current[document.id] || { status: 'pending' }), note: event.target.value } }))} placeholder="Reason or verification note" maxLength={300} />
                  <button type="button" className="admin-secondary-button" onClick={() => downloadDocument(document.id, index)}><Download size={14} /> Open evidence</button>
                </div>) : <p className="admin-hint">No evidence has been uploaded.</p>}
              </div>
              <div className="assessment-decisions">
                <label>Service eligibility<select value={assessmentEligibility} onChange={(event) => setAssessmentEligibility(event.target.value as ServiceAssessment['eligibility'])}><option value="pending">Not assessed</option><option value="eligible">Eligible</option><option value="ineligible">Ineligible</option></select></label>
                <label>Government process readiness<select value={assessmentGovernmentReadiness} onChange={(event) => setAssessmentGovernmentReadiness(event.target.value as ServiceAssessment['governmentReadiness'])}><option value="pending">Not assessed</option><option value="ready">Ready for quotation</option><option value="not-ready">Not ready</option></select></label>
              </div>
              <label className="assessment-notes">Assessment notes<textarea rows={3} value={assessmentNotes} onChange={(event) => setAssessmentNotes(event.target.value)} maxLength={1000} placeholder="Record case-specific findings, exceptions, or the source of the applicable requirement." /></label>
              <div className={`assessment-readiness ${selected.serviceAssessmentReady ? 'is-ready' : ''}`} role="status">{selected.serviceAssessmentReady ? 'Assessment complete · ready for quote preparation' : 'Not ready for quote preparation · finish all required checks and verify all uploaded documents'}</div>
              <button type="button" className="admin-primary-button" disabled={saving} onClick={saveServiceAssessment}>{saving ? 'Saving assessment…' : 'Save service assessment'} <span>→</span></button>
            </section>}
          {!!selected.quoteRevisionRequests?.length && <div className="detail-section quote-breakdown"><p className="detail-label">Customer quote change requests</p>{selected.quoteRevisionRequests.map((request, index) => <p className="customer-message" key={`${request.quoteVersion}-${request.requestedAt}-${index}`}><strong>Quote v{request.quoteVersion} · {new Date(request.requestedAt).toLocaleString('en-ZA')}</strong><br />{request.message}</p>)}</div>}
          {!!selected.quoteActionAudit?.length && <div className="detail-section quote-breakdown"><p className="detail-label">Quote decision audit · staff only</p><ul className="quote-audit-list">{selected.quoteActionAudit.slice().reverse().map((entry, index) => <li key={`${entry.quoteId}-${entry.action}-${entry.at}-${index}`}><strong>Quote v{entry.quoteVersion} · {entry.action}</strong><span>{new Date(entry.at).toLocaleString('en-ZA')} · IP {entry.ip}</span></li>)}</ul><p className="detail-muted">Audit records are stored in the encrypted request store and visible only to authorized staff.</p></div>}
          {!selected.quote && selected.quoteAmount !== null && <p className="detail-muted">Legacy quote: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.quoteCurrency || 'ZAR' }).format(selected.quoteAmount)} · manually entered before pricing profiles were introduced.</p>}
          {staff?.permissions.includes('requests:update') && <section className="detail-section customer-task-panel">
            <p className="detail-label">Customer actions · you or WeQ4U can act next</p>
            {(selected.customerTasks || []).length
              ? <div className="customer-task-list">{selected.customerTasks!.slice().reverse().map((task) => <article key={task.id}>
                <header><strong>{task.title}</strong><span className={`customer-task-status task-${task.status}`}>{task.status.replace(/-/g, ' ')}</span></header>
                <p>{task.message}</p>
                {task.dueDate && <small>Due {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en-ZA')}</small>}
                {task.response && <blockquote>Customer response: {task.response}</blockquote>}
                {task.notificationStatus && task.notificationStatus !== 'sent' && <small>Email not sent ({task.notificationStatus}); contact the customer directly.</small>}
                {task.status !== 'completed' && <button className="admin-secondary-button" type="button" disabled={saving} onClick={() => completeCustomerTask(task.id)}>Mark complete</button>}
              </article>)}</div>
              : <p className="detail-muted">No customer actions are open. Create a clarification, appointment, or delivery task when the customer needs to do something.</p>}
            {customerTaskNotice && <p className="admin-success" role="status">{customerTaskNotice}</p>}
            <form className="customer-task-create" onSubmit={createCustomerTask}>
              <label>Action type<select value={customerTaskType} onChange={(event) => { setCustomerTaskType(event.target.value as typeof customerTaskType); setCustomerTaskDirty(true); }}><option value="information">Question or information</option><option value="appointment">Appointment confirmation</option><option value="delivery">Collection or delivery confirmation</option></select></label>
              <label>What should the customer do?<input value={customerTaskTitle} onChange={(event) => { setCustomerTaskTitle(event.target.value); setCustomerTaskDirty(true); }} maxLength={120} required placeholder="e.g. Confirm your preferred test centre" /></label>
              <label>Explain what is needed<textarea rows={2} value={customerTaskMessage} onChange={(event) => { setCustomerTaskMessage(event.target.value); setCustomerTaskDirty(true); }} maxLength={1000} required placeholder="Give a clear reason and tell the customer how to respond." /></label>
              <label>Optional due date<input type="date" value={customerTaskDueDate} onChange={(event) => { setCustomerTaskDueDate(event.target.value); setCustomerTaskDirty(true); }} /></label>
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Send customer action'} <span>→</span></button>
            </form>
          </section>}
          {staff?.permissions.includes('requests:update') ? <form className="request-update-form" onSubmit={saveRequest}>
            <p className="detail-label">Customer journey and work routing</p>
            <label>Workflow stage<select value={draftStatus} onChange={(event) => { setDraftStatus(event.target.value); setDraftAssignee(''); }}>
              {[...new Set([selected.status, ...(selected.allowedNextStatuses || [])])].map((status) => <option key={status}>{status}</option>)}
            </select></label>
            <p className="detail-muted">Routed automatically to <strong>{selected.department || 'Customer Support'}</strong> · {selected.queue || 'New Requests'}. The customer sees a simple progress update, not this internal queue name.</p>
            {draftStatus === 'Awaiting Documents' && <label>What is missing? <span className="field-note">One item per line; customers can upload these from their private tracking page.</span><textarea rows={3} value={draftRequestedDocuments} onChange={(event) => setDraftRequestedDocuments(event.target.value)} placeholder="Copy of ID&#10;Medical certificate" /></label>}
            {draftStatus === 'Quote Preparation' && <>
              <p className="admin-hint">Customer quotes can be prepared only for a registry-approved service variant with an active pricing profile. Other requests stay in internal review until the service scope, checklist and price are approved.</p>
              <label>Quote notes for the customer<textarea rows={3} value={draftQuoteNotes} onChange={(event) => setDraftQuoteNotes(event.target.value)} placeholder="Explain what is included and any important conditions." /></label>
              <label>Conditions <span className="field-note">Optional; one per line, up to 4.</span><textarea rows={2} maxLength={500} value={draftQuoteConditions} onChange={(event) => setDraftQuoteConditions(event.target.value)} placeholder="For example: Price is based on the confirmed service scope." /></label>
              <label>Quote valid until<input type="date" min={tomorrowKey()} max={quoteMaximumValidUntil()} value={draftQuoteValidUntil} onChange={(event) => setDraftQuoteValidUntil(event.target.value)} /></label>
              {selected.pricingResolution && <div className="pricing-resolution">
                <p className="detail-label">Pricing profile resolution</p>
                {selected.services.length > 1 && <p className="admin-hint">Only the primary service is currently included in this quote preview. Other requested services are not included in this quote.</p>}
                <dl>
                  <div><dt>Detected service</dt><dd>{selected.pricingResolution.serviceName} <code>{selected.pricingResolution.serviceId}</code></dd></div>
                  <div><dt>Request detail</dt><dd>{selected.pricingResolution.serviceDetail || 'Not specified'}</dd></div>
                  <div><dt>Selected package</dt><dd>{selected.pricingResolution.packageName}</dd></div>
                  <div><dt>Expected profile</dt><dd>{selected.pricingResolution.expectedProfileName} <code>{selected.pricingResolution.expectedProfileId}</code></dd></div>
                  <div><dt>Profile status</dt><dd>{selected.pricingResolution.profileStatus.toUpperCase()} · {selected.pricingResolution.status.replace(/-/g, ' ')}</dd></div>
                  <div><dt>Version / effective from</dt><dd>{selected.pricingResolution.profileVersion === null ? 'No version' : `v${selected.pricingResolution.profileVersion}`} · {selected.pricingResolution.effectiveFrom || 'Not set'}</dd></div>
                </dl>
                {!selected.pricingResolution.preview.ready && <p className="admin-hint">{selected.pricingResolution.reason || selected.quoteReadiness?.reason || 'A matching active profile is not ready.'}</p>}
                {selected.pricingResolution.availableProfiles.length > 0 && <p className="detail-muted">Other active profiles: {selected.pricingResolution.availableProfiles.map((profile) => `${profile.name} (${profile.serviceId}, v${profile.version})`).join(' · ')}</p>}
                {selected.pricingResolution.preview.ready && <div className="live-quote-preview">
                  <p className="detail-label">Customer quote preview</p>
                  <p className="detail-muted">This is a live price preview. It will be saved as a fixed snapshot and reviewed before it is sent.</p>
                  {selected.pricingResolution.preview.lines.map((line) => <div className="quote-line" key={line.componentId}><span>{line.label}</span><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.pricingResolution!.preview.currency }).format(line.amountCents / 100)}</strong></div>)}
                  {selected.pricingResolution.preview.totalCents !== null && <div className="quote-line quote-total"><strong>Total</strong><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.pricingResolution.preview.currency }).format(selected.pricingResolution.preview.totalCents / 100)}</strong></div>}
                  {selected.pricingResolution.preview.contributionCents !== null && <p className="detail-muted">Model contribution (30%): {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.pricingResolution.preview.currency }).format(selected.pricingResolution.preview.contributionCents / 100)} · planning assumption, not audited profit</p>}
                </div>}
              </div>}
              {selected.quoteDraft?.lines && <div className="live-quote-preview quote-draft-preview">
                <p className="detail-label">Internal quote preview</p>
                <div className="quote-lifecycle-rail">
                  {['Draft', 'Pending approval', 'Approved', 'Published'].map((stage, index) => (
                    <span key={stage} className={`quote-stage ${selected.quoteDraft?.approvalStatus === 'approved' && index >= 2 ? 'active' : selected.quoteDraft?.approvalStatus === 'pending-approval' && index >= 1 ? 'active' : selected.quoteDraft?.approvalStatus === 'editing' && index === 0 ? 'active' : ''}`}>
                      {stage}
                    </span>
                  ))}
                </div>
                <div className="customer-quote-heading"><div><span>Quote preview</span><strong>{selected.quoteDraft.quoteNumber || 'Quote draft'}</strong></div><span>Version {selected.quoteDraft.version || 1}</span></div>
                <div className="customer-quote-preview">
                  {selected.quoteDraft.pricingBasisLabel && <div className="quote-estimate-notice"><strong>{selected.quoteDraft.pricingBasisLabel}</strong><span>{selected.quoteDraft.estimateDisclaimer}</span></div>}
                  <p><strong>Service:</strong> {selected.pricingResolution?.serviceName || selected.services[0] || 'Not specified'}</p>
                  <p><strong>Package:</strong> {selected.quoteDraft.packageName || 'Standard'}</p>
                  <div className="customer-quote-lines">{selected.quoteDraft.lines?.map((line) => <div className="quote-line" key={line.componentId}><span>{line.label}{line.sourceNote && <small>Internal price source: {line.sourceNote}</small>}</span><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.quoteCurrency || 'ZAR' }).format(line.amountCents / 100)}</strong></div>)}<div className="quote-line quote-total"><strong>Total</strong><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: selected.quoteCurrency || 'ZAR' }).format((selected.quoteDraft.totalCents || 0) / 100)}</strong></div></div>
                  <p><strong>Valid until:</strong> {selected.quoteDraft.validUntil ? new Date(`${selected.quoteDraft.validUntil}T00:00:00`).toLocaleDateString('en-ZA') : 'Not set'}</p>
                  {!!selected.quoteDraft.conditions?.length && <div><strong>Conditions</strong><ul>{selected.quoteDraft.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></div>}
                  {!!selected.quoteDraft.requiredDocuments?.length && <div><strong>Required documents</strong><ul>{selected.quoteDraft.requiredDocuments.map((document) => <li key={document}>{document}</li>)}</ul></div>}
                  {selected.quoteDraft.notes && <p><strong>What happens next:</strong> {selected.quoteDraft.notes}</p>}
                  {selected.quoteDraft.approvedBy && <p><strong>Approved by:</strong> {selected.quoteDraft.approvedBy} {selected.quoteDraft.approvedAt ? `· ${new Date(selected.quoteDraft.approvedAt).toLocaleString('en-ZA')}` : ''}</p>}
                </div>
                <div className="quote-preview-actions">
                  <button className="admin-secondary-button" type="button" onClick={() => setDraftQuoteNotes(selected.quoteDraft?.notes || '')}>Edit quote</button>
                  {selected.quoteDraft.approvalStatus === 'pending-approval' && <><p className="admin-hint">Approval must be completed by an authorized reviewer other than the quote preparer.</p><button className="admin-primary-button" type="button" disabled={saving || selected.quoteDraft.preparedBy === staff?.name} onClick={() => updateQuoteDraft('approve')}>Approve quote</button></>}
                  {selected.quoteDraft.approvalStatus === 'approved' && <button className="admin-primary-button" type="button" disabled={saving || !staff?.permissions.includes('requests:update')} onClick={() => updateQuoteDraft('publish')}>Send to customer</button>}
                </div>
              </div>}
              {selected.status === 'Quote Preparation' && <>
                {!selected.quoteReadiness?.ready && staff?.permissions.includes('requests:read') && <button className="admin-secondary-button" type="button" disabled={saving} onClick={downloadRegistryReview}>Download internal registry review</button>}
                {!quotePreparationReady && <div className="quote-blockers" role="status">
                  <strong>{selected.quoteReadiness?.ready ? 'Quote preparation is blocked until these checks pass:' : 'Customer quotation is not approved for this service variant:'}</strong>
                  <ul>
                    {!selected.quoteReadiness?.ready && <li>{selected.quoteReadiness?.reason || selected.pricingResolution?.reason || 'An approved service variant and active pricing profile are required.'}</li>}
                    {!selected.serviceAssessmentReady && <li>Save a complete service assessment: resolve every source-documented requirement, verify every uploaded document, and confirm eligibility and government readiness.</li>}
                    {!draftQuoteValidUntil && <li>Set the quote validity date.</li>}
                  </ul>
                </div>}
                <button className="admin-primary-button" type="button" onClick={generateSelectedQuote} disabled={saving || !quotePreparationReady}>
                  {saving ? 'Preparing…' : !quotePreparationReady ? 'Quote blocked · complete checks' : selected.quoteDraft?.lines ? 'Prepare updated draft' : 'Prepare quote for approval'} <span>→</span>
                </button>
              </>}
              {selected.status !== 'Quote Preparation' && <p className="admin-hint">Save this stage first. Then you can prepare, approve and publish a quote as separate steps.</p>}
            </>}
            {draftStatus === 'Awaiting Customer Decision' && selected.status !== 'Awaiting Customer Decision' && <>
              <label className="check-field"><input type="checkbox" checked={draftQuoteCommunicationConfirmed} onChange={(event) => setDraftQuoteCommunicationConfirmed(event.target.checked)} /> I confirmed that the quote is available to the customer in Track Request.</label>
              <label>Customer quote channel<select value={draftQuoteCommunicationChannel} onChange={(event) => setDraftQuoteCommunicationChannel(event.target.value)}><option value="portal">Private tracking portal</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="in-person">In person</option></select></label>
            </>}
            {draftStatus === 'Awaiting Documents' && selected.status !== 'Awaiting Documents' && !draftRequestedDocuments.trim() && <p className="admin-hint">Add at least one missing item before saving this stage.</p>}
            {draftStatus === 'Ready for Collection / Delivery' && <label className="check-field"><input type="checkbox" checked={draftFulfilmentValidated} onChange={(event) => setDraftFulfilmentValidated(event.target.checked)} /> I completed the service-specific quality and handover checks.</label>}
            {draftStatus === 'Completed' && <label className="check-field"><input type="checkbox" checked={draftCompletionConfirmed} onChange={(event) => setDraftCompletionConfirmed(event.target.checked)} /> I confirmed the customer handover and closed outstanding tasks.</label>}
            {selected.status === 'Quote Accepted' && <p className="admin-hint">Payment is not connected or verified yet. Fulfilment cannot begin, and this request must remain with Finance until an approved payment process is available.</p>}
            {staff?.permissions.includes('operations:manage') && <>
              <div className="assignment-fields"><label>Assigned staff<input value={draftAssignee} onChange={(event) => setDraftAssignee(event.target.value)} disabled={draftStatus !== selected.status} placeholder="Unassigned" /></label><label>Target date<input type="date" value={draftTargetDate} onChange={(event) => setDraftTargetDate(event.target.value)} /></label></div>
            </>}
            <label>Internal notes<textarea rows={3} value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} placeholder="Visible to authorised staff only" /></label>
            <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save workflow update'} <span>→</span></button>
            {notice && <p className="admin-success" role="status">{notice}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
          </form> : <p className="admin-hint">Finance queue is read-only and shows accepted quotes needing payment setup. Payment collection is not configured, so do not start fulfilment or record payment here.</p>}
        </> : <div className="detail-empty"><span className="admin-empty-mark"><FileText size={22} /></span><strong>Select a request</strong><p>Request details and management tools will appear here.</p></div>}</section>
      </div>}
    </section>
  </main>;
}
