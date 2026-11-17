import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { resolveRegistryConfiguration } from './services/registry.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const brandTokensPath = path.resolve(currentDirectory, '../../shared/brand-tokens.css');
const fontPath = path.resolve(currentDirectory, '../../../node_modules/@fontsource/inter/files');
const dayMilliseconds = 24 * 60 * 60 * 1000;
const quoteStatuses = new Set(['Awaiting decision', 'Accepted', 'Declined', 'Expired']);
let browserPromise;
let brandAssetsPromise;

export function chromiumExecutablePath() {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) return process.env.CHROMIUM_EXECUTABLE_PATH;
  if (existsSync(chromium.executablePath())) return undefined;
  if (process.platform === 'win32') {
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    return edgePaths.find(existsSync);
  }
  return undefined;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function displayName(value) {
  const cleaned = String(value || '').trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
  if (!cleaned) return 'Customer';
  return cleaned.replace(/\b([a-z])/gi, (letter) => letter.toLocaleUpperCase('en-ZA'));
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function validateQuote(record, quote, status) {
  if (!record || !quote) throw new Error('A request and published quote are required to render a quotation.');
  if (!quoteStatuses.has(status)) throw new Error('The quotation status is invalid.');
  if (typeof quote.quoteNumber !== 'string' || !quote.quoteNumber.trim()) throw new Error('A quote number is required.');
  if (!Number.isSafeInteger(quote.totalCents) || quote.totalCents < 0) throw new Error('The quote total is invalid.');
  if (!Array.isArray(quote.lines) || quote.lines.some((line) => !line || !Number.isSafeInteger(line.amountCents) || line.amountCents < 0)) {
    throw new Error('The quote pricing lines are invalid.');
  }
  const issueDate = new Date(quote.generatedAt);
  const expiryDate = validDate(quote.validUntil);
  if (Number.isNaN(issueDate.getTime()) || !expiryDate) throw new Error('A valid issue date and valid-until date are required.');
  const issueDay = Date.UTC(issueDate.getUTCFullYear(), issueDate.getUTCMonth(), issueDate.getUTCDate());
  const daysUntilExpiry = (expiryDate.getTime() - issueDay) / dayMilliseconds;
  if (daysUntilExpiry < 1 || daysUntilExpiry > 90) throw new Error('The quote valid-until date must be 1 to 90 days after issue.');
}

function money(cents, currency) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(cents / 100);
}

function formattedDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shortReference(ref) {
  if (typeof ref !== 'string' || !ref.trim()) return null;
  const match = /^(WQ-\d{4}-)([A-Z0-9]{8,})$/i.exec(ref.trim());
  return match ? `${match[1]}${match[2].slice(0, 4)} ${match[2].slice(4, 8)}` : ref.trim().slice(0, 18);
}

function statusCopy(status) {
  if (status === 'Accepted') return 'Your acceptance has been recorded. Work begins only after the agreed next steps are confirmed.';
  if (status === 'Declined') return 'Your decision has been recorded. No work will start under this quotation.';
  if (status === 'Expired') return 'This quotation has expired. Contact us to ask whether a new quote can be prepared.';
  return 'Review the scope and pricing, then choose an action. Opening a link does not record a decision.';
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(' ', '-');
}

function renderPricingRows(lines, currency) {
  return lines.map((line) => {
    const quantity = Number.isSafeInteger(line.quantity) && line.quantity > 0 ? line.quantity : 1;
    const total = line.amountCents * quantity;
    if (!Number.isSafeInteger(total)) throw new Error('A quote line total is invalid.');
    return `<tr>
      <td>${escapeHtml(line.label || 'Service')}</td>
      <td class="quantity">${quantity}</td>
      <td class="money">${escapeHtml(money(line.amountCents, currency))}</td>
      <td class="money">${escapeHtml(money(total, currency))}</td>
    </tr>`;
  }).join('');
}

function renderChecklist(record, variant) {
  const requirements = variant.documentChecklist || [];
  if (!requirements.length) return '';
  const received = record.documents || [];
  const rows = requirements.map((requirement) => {
    const document = received.find((item) => item.id === requirement.id
      || item.label?.trim().toLowerCase() === requirement.label.toLowerCase());
    const status = document?.reviewState === 'verified'
      ? 'Verified'
      : document ? 'Received' : requirement.required ? 'Required' : 'Optional';
    return `<tr><td>${escapeHtml(requirement.label)}</td><td><span class="document-status ${status.toLowerCase()}">${status}</span></td></tr>`;
  }).join('');
  return `<section class="card">
    <p class="eyebrow">What we may need</p><h2 class="section-title">Document checklist</h2>
    <table class="document-table"><thead><tr><th>Document</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}

function timelineFor(variant, status) {
  const steps = variant.timeline || [];
  const currentKey = status === 'Accepted' ? 'payment' : status === 'Declined' || status === 'Expired' ? 'decision' : 'review';
  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === currentKey));
  return `<ol class="stepper">${steps.map((step, index) => {
    const state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
    return `<li class="step ${state}"><span class="step-number">${index < currentIndex ? '✓' : index + 1}</span><div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.detail)}</p></div></li>`;
  }).join('')}</ol>`;
}

function renderActions(actions, quoteUrl, status) {
  if (status !== 'Awaiting decision') {
    return `<p class="decision-unavailable">This quotation is <strong>${escapeHtml(status.toLowerCase())}</strong>. No further decision can be recorded.</p>
      ${actions?.status ? `<a class="short-url" href="${escapeHtml(actions.status)}">${escapeHtml(quoteUrl)}</a>` : `<span class="short-url">${escapeHtml(quoteUrl)}</span>`}`;
  }
  if (!actions?.accept || !actions?.changes || !actions?.decline) {
    return '<p class="decision-unavailable">Secure decision links are unavailable. Contact us using the details below.</p>';
  }
  return `<div class="decision-actions">
      <a class="action-link action-accept" href="${escapeHtml(actions.accept)}">Accept</a>
      <a class="action-link action-change" href="${escapeHtml(actions.changes)}">Request changes</a>
      <a class="action-link action-decline" href="${escapeHtml(actions.decline)}">Decline</a>
    </div>
    <p class="action-hint">Each link opens a confirmation page. A decision is recorded only after you confirm.</p>
    <a class="short-url" href="${escapeHtml(actions.status || quoteUrl)}">${escapeHtml(quoteUrl)}</a>`;
}

function headerTemplate(quoteNumber, issuedOn, brandTokens) {
  return `<style>${brandTokens}</style>
    <div style="width:100%;padding:0 16mm;font-family:Arial,sans-serif;color:var(--forest);">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--amber);padding:4mm 0 2mm;">
        <div><strong style="font-size:14px">WeQ4U <span style="font-size:10px">Services</span></strong><div style="font-size:8px;color:var(--muted)">From Keys to Compliance</div></div>
        <div style="text-align:right"><strong style="font-size:9px">Quote ${escapeHtml(quoteNumber)}</strong><div style="font-size:8px;color:var(--muted)">Issued ${escapeHtml(issuedOn)}</div></div>
      </div>
    </div>`;
}

function footerTemplate(quoteNumber, brandTokens) {
  return `<style>${brandTokens}</style>
    <div style="width:100%;padding:0 16mm;font-family:Arial,sans-serif;color:var(--muted);">
      <div style="border-top:1px solid var(--line);padding-top:1.5mm;font-size:7px;">
        <div style="margin-bottom:1mm">WeQ4UServices · Greater Gauteng coverage · 083 765 2453 · william.mpeta@gmail.com</div>
        <div style="display:flex;justify-content:space-between">
        <span>${escapeHtml(quoteNumber)} · Independent service; authority decisions are outside our control.</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      </div>
    </div>`;
}

export function createQuoteHtml({ record, quote, actions, status = 'Awaiting decision', publicBaseUrl, storefrontOrigin, brandTokens = '', fontFaces = '' }) {
  validateQuote(record, quote, status);
  const { service, variant } = resolveRegistryConfiguration({ record, quote });
  if (!service || !variant) throw new Error('A registered service and variant are required to render a quotation.');
  const quoteNumber = quote.quoteNumber.trim();
  const issuedOn = formattedDate(quote.generatedAt);
  const validUntil = formattedDate(quote.validUntil);
  const customerName = displayName(record.name);
  const reference = shortReference(record.ref);
  const serviceName = service.displayName;
  const variantName = variant.displayName;
  const baseUrl = String(publicBaseUrl || storefrontOrigin || '').replace(/\/+$/, '');
  const quoteUrl = `${baseUrl}/q/${encodeURIComponent(quoteNumber)}`;
  const contact = [record.phone, record.email].filter((value) => typeof value === 'string' && value.trim());
  const packageName = typeof quote.packageName === 'string' && quote.packageName.trim()
    ? `<div class="fact"><small>Package</small><strong>${escapeHtml(quote.packageName.trim())}</strong></div>` : '';
  const conditions = Array.isArray(quote.conditions) && quote.conditions.length
    ? `<div class="conditions"><h3>Conditions</h3><ul>${quote.conditions.map((condition) => `<li>${escapeHtml(condition)}</li>`).join('')}</ul></div>` : '';
  const note = typeof quote.notes === 'string' && quote.notes.trim()
    ? `<p class="quote-note">${escapeHtml(quote.notes.trim())}</p>` : '';
  const statusText = statusCopy(status);
  const mailto = `mailto:william.mpeta@gmail.com?subject=${encodeURIComponent(`Question about quote ${quoteNumber}`)}`;
  const whatsapp = `https://wa.me/27837652453?text=${encodeURIComponent(`Hi WeQ4U, I have a question about quote ${quoteNumber}.`)}`;
  const vatLabel = quote.vatTreatment === 'inclusive'
    ? 'VAT: included'
    : quote.vatTreatment === 'exclusive'
      ? 'VAT: excluded; no VAT amount has been calculated'
      : quote.vatTreatment === 'not-applicable'
        ? 'VAT: not applicable'
        : 'VAT: to be confirmed; no VAT amount has been calculated';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WeQ4U quotation ${escapeHtml(quoteNumber)}</title>
<style>
${brandTokens}
${fontFaces}
@page { size: A4; margin: 20mm 16mm 18mm; }
* { box-sizing: border-box; }
html { color: var(--ink); font-family: var(--font-family); font-size: 9px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: var(--white); }
.document { width: 100%; }
.amber-strip { height: 3px; margin: 0 0 10px; background: var(--amber); }
.hero { display:flex; justify-content:space-between; align-items:center; gap:12px; margin:0 0 9px; padding:11px 13px; border:1px solid var(--card-border); border-radius:var(--radius-card); background:var(--white); }
.hero-service { display:flex; align-items:center; gap:10px; }
.service-icon { display:grid; width:35px; height:35px; place-items:center; border-radius:var(--radius-button); background:var(--forest); color:var(--amber); font-size:11px; font-weight:900; }
h1 { margin:0; color:var(--forest); font-size:17px; line-height:1.2; }
.hero p { margin:3px 0 0; color:var(--muted); font-size:8px; }
.status-badge { flex:0 0 auto; padding:5px 8px; border-radius:999px; font-size:8px; font-weight:800; }
.status-awaiting-decision { background:var(--quote-awaiting-bg); color:var(--quote-awaiting-ink); }
.status-accepted { background:var(--quote-accepted-bg); color:var(--quote-accepted-ink); }
.status-declined { background:var(--quote-declined-bg); color:var(--quote-declined-ink); }
.status-expired { background:var(--quote-expired-bg); color:var(--quote-expired-ink); }
.status-banner { margin:0 0 9px; padding:8px 11px; border-left:3px solid var(--quote-status-accent); border-radius:0 var(--radius-button) var(--radius-button) 0; background:var(--quote-status-bg); }
.status-banner.status-accepted { --quote-status-bg:var(--quote-accepted-bg); --quote-status-accent:var(--mint-strong); }
.status-banner.status-declined { --quote-status-bg:var(--quote-declined-bg); --quote-status-accent:var(--quote-declined-ink); }
.status-banner.status-expired { --quote-status-bg:var(--quote-expired-bg); --quote-status-accent:var(--quote-expired-ink); }
.status-banner strong { color:var(--forest); font-size:9px; }
.status-banner p { margin:2px 0 0; color:var(--ink); font-size:8px; }
.card { margin:0 0 9px; padding:10px 12px; border:1px solid var(--card-border); border-radius:var(--radius-card); background:var(--white); box-shadow:var(--card-shadow); break-inside:avoid; }
.eyebrow { margin:0 0 2px; color:var(--mint-strong); font-size:7px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; }
.section-title { margin:0 0 7px; color:var(--forest); font-size:11px; font-weight:800; }
.summary-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px 12px; }
.fact { display:block; min-width:0; }
.fact small { display:block; color:var(--muted); font-size:7px; font-weight:700; text-transform:uppercase; }
.fact strong { display:block; overflow-wrap:anywhere; color:var(--ink); font-size:8px; }
.ref-full { display:block; color:var(--muted); font-size:6px; font-weight:400; overflow-wrap:anywhere; }
.overview { margin:0 0 7px; color:var(--ink); }
.columns { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
h3 { margin:0 0 3px; color:var(--forest); font-size:8px; }
ul { margin:0; padding-left:13px; }
li { margin:2px 0; break-inside:avoid; }
.outcome { margin:7px 0 0; padding:7px 9px; border-radius:var(--radius-button); background:var(--paper); }
.pricing-table,.document-table { width:100%; border-collapse:collapse; font-size:8px; }
.pricing-table thead,.document-table thead { display:table-header-group; }
th { padding:6px; background:var(--forest); color:var(--white); font-size:7px; text-align:left; }
td { padding:6px; border-bottom:1px solid var(--line); vertical-align:top; }
tr { break-inside:avoid; }
.quantity { width:35px; text-align:center; }
.money { width:76px; text-align:right; white-space:nowrap; }
.total-panel { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:8px; padding:10px 12px; border-radius:var(--radius-card); background:var(--forest); color:var(--white); break-inside:avoid; }
.total-panel strong { color:var(--amber); font-size:9px; }
.total-amount { color:var(--amber); font-size:18px; font-weight:900; }
.total-panel small { display:block; color:var(--white-on-forest); font-size:7px; }
.document-status { display:inline-block; padding:2px 6px; border-radius:999px; background:var(--paper); color:var(--forest); font-size:7px; font-weight:800; }
.document-status.verified { background:var(--quote-accepted-bg); color:var(--quote-accepted-ink); }
.stepper { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:0; padding:0; list-style:none; }
.step { min-width:0; padding:7px; border-top:2px solid var(--line); break-inside:avoid; }
.step.complete { border-color:var(--mint-strong); }
.step.current { border-color:var(--amber); background:var(--amber-soft); }
.step-number { display:grid; width:19px; height:19px; margin-bottom:5px; place-items:center; border-radius:50%; background:var(--paper); color:var(--forest); font-size:8px; font-weight:900; }
.step.complete .step-number { background:var(--mint-strong); color:var(--white); }
.step.current .step-number { background:var(--amber); color:var(--forest); }
.step strong { color:var(--forest); font-size:7px; }
.step p { margin:2px 0 0; color:var(--muted); font-size:6.5px; }
.trust-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; }
.trust-item { min-height:50px; padding:7px; border:1px solid var(--card-border); border-radius:var(--radius-button); background:var(--paper); color:var(--ink); font-size:7px; break-inside:avoid; }
.trust-icon { display:block; margin-bottom:3px; color:var(--mint-strong); font-size:13px; font-weight:900; }
.decision-summary { margin:0 0 7px; padding:7px 9px; border-radius:var(--radius-button); background:var(--amber-soft); color:var(--forest); font-weight:700; }
.decision-actions { display:flex; gap:7px; }
.action-link { display:block; flex:1; padding:8px 6px; border:1px solid var(--card-border); border-radius:var(--radius-button); color:var(--forest); font-size:8px; font-weight:800; text-align:center; text-decoration:none; }
.action-accept { border-color:var(--amber); background:var(--amber); }
.action-change { background:var(--white); }
.action-decline { background:var(--paper); }
.action-hint,.decision-unavailable { margin:6px 0 0; color:var(--muted); font-size:7px; }
.short-url { display:inline-block; margin-top:5px; color:var(--forest-soft); font-size:7px; overflow-wrap:anywhere; }
.quote-note { margin:7px 0 0; padding:7px 9px; border-left:2px solid var(--mint-strong); background:var(--paper); }
.contact-row { display:flex; gap:12px; margin-top:6px; color:var(--muted); font-size:7px; }
a { color:var(--forest-soft); }
@media (max-width:620px) { .summary-grid { grid-template-columns:1fr 1fr; } .stepper { grid-template-columns:1fr 1fr; } .trust-grid { grid-template-columns:1fr 1fr; } }
@media print { .card,.hero,.total-panel { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<main class="document">
  <div class="amber-strip"></div>
  <section class="hero">
    <div class="hero-service"><span class="service-icon">${escapeHtml(service.icon)}</span><div><p>Service quotation · ${escapeHtml(variantName)}</p><h1>${escapeHtml(serviceName)}</h1></div></div>
    <span class="status-badge status-${statusClass(status)}">${escapeHtml(status)}</span>
  </section>
  <section class="status-banner status-${statusClass(status)}"><strong>${escapeHtml(status)}</strong><p>${escapeHtml(statusText)}</p></section>
  <section class="card">
    <p class="eyebrow">Quote summary</p><h2 class="section-title">Customer and request</h2>
    <div class="summary-grid">
      ${reference ? `<div class="fact"><small>Request reference</small><strong>${escapeHtml(reference)}<span class="ref-full">Ref: ${escapeHtml(record.ref)}</span></strong></div>` : ''}
      <div class="fact"><small>Service type</small><strong>${escapeHtml(serviceName)} · ${escapeHtml(variantName)}</strong></div>
      <div class="fact"><small>Customer</small><strong>${escapeHtml(customerName)}</strong></div>
      ${contact.length ? `<div class="fact"><small>Contact</small><strong>${contact.map(escapeHtml).join('<br>')}</strong></div>` : ''}
      <div class="fact"><small>Issued</small><strong>${escapeHtml(issuedOn)}</strong></div>
      <div class="fact"><small>Valid until</small><strong>${escapeHtml(validUntil)}</strong></div>
      ${packageName}
    </div>
  </section>
  <section class="card">
    <p class="eyebrow">Agreed scope</p><h2 class="section-title">Service overview</h2>
    <p class="overview">${escapeHtml(variant.overview)}</p>
    <div class="columns"><div><h3>Included assistance</h3><ul>${(variant.deliverables || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>${conditions}</div>
    <p class="outcome"><strong>Expected outcome:</strong> ${escapeHtml(variant.expectedOutcome)}</p>
  </section>
  <section class="card">
    <p class="eyebrow">Quote details</p><h2 class="section-title">Pricing</h2>
    <table class="pricing-table"><thead><tr><th>Description</th><th class="quantity">Qty</th><th class="money">Fee</th><th class="money">Line total</th></tr></thead>
      <tbody>${renderPricingRows(quote.lines, quote.currency)}</tbody></table>
    <div class="total-panel"><div><strong>Total due</strong><small>${escapeHtml(vatLabel)}</small></div><span class="total-amount">${escapeHtml(money(quote.totalCents, quote.currency))}</span></div>
    ${note}
  </section>
  ${renderChecklist(record, variant)}
  <section class="card"><p class="eyebrow">What happens next</p><h2 class="section-title">Your quote journey</h2>${timelineFor(variant, status)}</section>
  <section class="card"><p class="eyebrow">Our commitments</p><h2 class="section-title">Clear, independent service</h2>
    <div class="trust-grid">
      <div class="trust-item"><span class="trust-icon">✓</span>Reviewed by a WeQ4U team member</div>
      <div class="trust-item"><span class="trust-icon">◇</span>Independent service, not a government department</div>
      <div class="trust-item"><span class="trust-icon">▣</span>Private request tracking</div>
      <div class="trust-item"><span class="trust-icon">✓</span>No work before agreement and required next steps</div>
    </div>
  </section>
  <section class="card">
    <p class="eyebrow">Your decision</p><h2 class="section-title">Review and respond securely</h2>
    <p class="decision-summary">${status === 'Awaiting decision' ? `Decision needed for ${escapeHtml(serviceName)} · ${escapeHtml(variantName)} — ${escapeHtml(money(quote.totalCents, quote.currency) )}.` : `Current quote status: ${escapeHtml(status)}.`}</p>
    ${renderActions(actions, quoteUrl, status)}
    ${contact.length ? `<div class="contact-row"><a href="${escapeHtml(mailto)}">Email WeQ4U</a><a href="${escapeHtml(whatsapp)}">WhatsApp us</a></div>` : ''}
  </section>
</main>
</body>
</html>`;
}

async function brandAssets() {
  if (!brandAssetsPromise) {
    brandAssetsPromise = Promise.all([
      readFile(brandTokensPath, 'utf8'),
      ...[400, 500, 600, 700, 800, 900].map((weight) => readFile(path.join(fontPath, `inter-latin-${weight}-normal.woff2`))),
    ]).then(([tokens, ...fonts]) => ({
      tokens,
      fonts: fonts.map((font, index) => `@font-face { font-family: Inter; font-style: normal; font-weight: ${[400, 500, 600, 700, 800, 900][index]}; src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2'); }`).join('\n'),
    }));
  }
  return brandAssetsPromise;
}

export async function createQuoteHtmlDocument(options) {
  const assets = await brandAssets();
  return createQuoteHtml({ ...options, brandTokens: assets.tokens, fontFaces: assets.fonts });
}

async function renderPdf(html, { headerTemplate, footerTemplate } = {}) {
  if (!browserPromise) {
    const executablePath = chromiumExecutablePath();
    browserPromise = chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  }
  const browser = await browserPromise;
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: Boolean(headerTemplate || footerTemplate),
      headerTemplate,
      footerTemplate,
      margin: { top: '20mm', right: '16mm', bottom: '18mm', left: '16mm' },
    }));
  } finally {
    await page.close();
  }
}

export async function createQuotePdf({ record, quote, actions, status = 'Awaiting decision', publicBaseUrl, storefrontOrigin }) {
  const assets = await brandAssets();
  const html = createQuoteHtml({ record, quote, actions, status, publicBaseUrl, storefrontOrigin, brandTokens: assets.tokens, fontFaces: assets.fonts });
  return renderPdf(html, {
    headerTemplate: headerTemplate(quote.quoteNumber, formattedDate(quote.generatedAt), assets.tokens),
    footerTemplate: footerTemplate(quote.quoteNumber, assets.tokens),
  });
}

export function createRegistryReviewHtml(record, { tokens = '', fonts = '' } = {}) {
  const { service, variant } = resolveRegistryConfiguration({ record });
  const serviceName = service?.displayName || String(record.services?.[0] || 'Unmapped service').replaceAll('-', ' ');
  const variants = variant ? [variant] : service?.variants || [];
  const status = (value) => value === 'approved' ? 'Approved' : value === 'provisional' ? 'Provisional pilot' : 'Draft — confirmation required';
  const variantMarkup = variants.map((item) => `<section class="review-card">
    <h2>${escapeHtml(item.displayName)} <span>${escapeHtml(item.key)}</span></h2>
    <p><strong>Approval:</strong> ${escapeHtml(status(item.approvalState))}</p>
    <p><strong>Customer quote:</strong> ${item.issueCustomerQuote ? 'Eligible only after pricing and assessment gates pass' : 'Blocked pending approval'}</p>
    <p><strong>Pricing profile:</strong> ${escapeHtml(item.pricingProfileRef || 'Not configured')}</p>
    ${item.documentChecklist.length ? `<h3>Draft checklist — operations confirmation required</h3><ul>${item.documentChecklist.map((document) => `<li>${escapeHtml(document.label)} · ${escapeHtml(status(document.approvalState))}</li>`).join('')}</ul>` : '<p>No checklist has been approved for this variant.</p>'}
  </section>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Internal registry review</title>
  <style>${tokens}${fonts}
  @page { size:A4; margin:20mm 16mm 18mm; }
  *{box-sizing:border-box}html{font:9px var(--font-family);color:var(--ink);line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0}.strip{height:3px;background:var(--amber);margin-bottom:10px}.notice{padding:9px 12px;border:1px solid var(--quote-declined-ink);border-radius:var(--radius-card);background:var(--quote-declined-bg);color:var(--quote-declined-ink);font-weight:800}
  h1{margin:8px 0;color:var(--forest);font-size:18px}.meta{margin:0 0 10px;color:var(--muted)}.review-card{margin:0 0 9px;padding:10px 12px;border:1px solid var(--card-border);border-radius:var(--radius-card);break-inside:avoid}
  .review-card h2{margin:0 0 6px;color:var(--forest);font-size:12px}.review-card h2 span{color:var(--muted);font-size:8px;font-weight:400}.review-card p{margin:3px 0}.review-card h3{margin:8px 0 4px;color:var(--forest);font-size:9px}.review-card li{margin:3px 0;break-inside:avoid}
  </style></head><body><main><div class="strip"></div><div class="notice">INTERNAL REGISTRY REVIEW — NOT A CUSTOMER QUOTATION</div>
  <h1>${escapeHtml(serviceName)}</h1><p class="meta">Request reference: ${escapeHtml(record.ref || 'Not assigned')} · Service approval: ${service ? escapeHtml(status(service.approvalState)) : 'Not registered'}</p>
  <p>${escapeHtml(service?.disclaimer || 'This request is not mapped to an approved customer-quotable service registry entry.')}</p>
  ${variantMarkup || '<section class="review-card"><p>No service variant is configured for this request. Map its scope to the service registry before quoting.</p></section>'}
  <p><strong>Required action:</strong> Operations and the authorized business approver must confirm each service variant, its customer-facing scope, document checklist, pricing profile and disclaimer before customer quotations are enabled.</p>
  </main></body></html>`;
  return html;
}

export async function createRegistryReviewPdf(record) {
  const assets = await brandAssets();
  const html = createRegistryReviewHtml(record, assets);
  return renderPdf(html, {
    headerTemplate: headerTemplate('Internal registry review', new Date().toLocaleDateString('en-ZA'), assets.tokens),
    footerTemplate: footerTemplate('Internal review · not a customer offer', assets.tokens),
  });
}

export async function closeQuotePdfBrowser() {
  const activeBrowserPromise = browserPromise;
  browserPromise = undefined;
  if (!activeBrowserPromise) return;
  const browser = await activeBrowserPromise;
  await browser.close();
}
