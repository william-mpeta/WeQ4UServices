import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { chromium } from 'playwright';
import { chromiumExecutablePath, closeQuotePdfBrowser, createQuoteHtml, createQuoteHtmlDocument, createQuotePdf, createRegistryReviewHtml, createRegistryReviewPdf } from '../src/quotePdf.js';
import { quoteExpiryTimestamp, signQuoteActionToken, verifyQuoteActionToken } from '../src/quoteActionTokens.js';
import { serviceRegistry } from '../src/services/registry.js';

after(closeQuotePdfBrowser);

const snapshotDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'quote-pdf-snapshots');
const snapshotActions = {
  accept: 'https://weq4u.example/q/Q2026-TEST-0001/accept?t=accept-token',
  changes: 'https://weq4u.example/q/Q2026-TEST-0001/changes?t=changes-token',
  decline: 'https://weq4u.example/q/Q2026-TEST-0001/decline?t=decline-token',
  status: 'https://weq4u.example/q/Q2026-TEST-0001/status?t=status-token',
};
const snapshotNames = {
  'learners-licence': 'learners-licences',
  'drivers-licence': 'drivers-licences',
  prdp: 'prdps',
  'licence-disc': 'licence-disc-renewals',
  'vehicle-registration': 'vehicle-registrations',
  'change-of-ownership': 'change-of-ownership',
  'duplicate-documents': 'duplicate-documents',
  roadworthy: 'roadworthy-certificates',
  'traffic-register': 'traffic-register',
  courier: 'door-to-door-courier',
};

function quoteFixture(serviceKey) {
  const service = serviceRegistry.find((item) => item.key === serviceKey);
  const variant = service.variants[0];
  return {
    service,
    variant,
    record: {
      ref: 'WQ-2026-0123456789ABCDEF1234',
      name: '<Customer & One>',
      phone: '083 555 0101',
      email: 'customer@example.com',
      services: [service.categoryServiceId],
      serviceKey: service.key,
      serviceVariantKey: variant.key,
      serviceCode: variant.serviceCode,
      serviceDetails: {},
      documents: [{ label: 'Copy of ID', reviewState: 'verified' }],
    },
    quote: {
      id: 'WQ-Q-TEST-1',
      quoteNumber: 'Q2026-TEST-0001',
      version: 1,
      serviceId: service.categoryServiceId,
      serviceKey: service.key,
      variantKey: variant.key,
      profileName: service.displayName,
      packageName: 'Standard',
      lines: [{ label: 'Confirmed service scope', amountCents: 12500 }],
      totalCents: 12500,
      currency: 'ZAR',
      vatTreatment: null,
      generatedAt: '2026-11-16T08:00:00.000Z',
      validUntil: '2026-12-01',
      conditions: ['Price is based on the confirmed scope.'],
    },
  };
}

test('all registered services use the shared quote layout and approved registry data', () => {
  for (const service of serviceRegistry) {
    assert.ok(service.variants.length >= 2, `${service.key} needs registered variants`);
    for (const field of ['key', 'displayName', 'icon', 'overview', 'deliverables', 'documentChecklist', 'timeline', 'expectedOutcome', 'conditions', 'disclaimer']) {
      assert.ok(Object.hasOwn(service, field), `${service.key} is missing ${field}`);
    }
    const { record, quote, variant } = quoteFixture(service.key);
    const html = createQuoteHtml({
      record,
      quote,
      status: 'Awaiting decision',
      publicBaseUrl: 'https://weq4u.example',
      actions: snapshotActions,
    });
    for (const section of ['Customer and request', 'Service overview', 'Pricing', 'Document checklist', 'Your quote journey', 'Clear, independent service', 'Your decision']) {
      if (variant.documentChecklist.length || section !== 'Document checklist') {
        assert.ok(html.includes(section), `${service.key} quote omits ${section}`);
      }
    }
    assert.ok(html.includes(service.displayName.replaceAll("'", '&#39;')));
    assert.ok(html.includes(`href="${snapshotActions.accept}"`));
    assert.ok(html.includes(`href="${snapshotActions.changes}"`));
    assert.ok(html.includes(`href="${snapshotActions.decline}"`));
    assert.ok(html.includes('weq4u.example/q/Q2026-TEST-0001'));
    assert.ok(html.includes('@page { size: A4; margin: 20mm 16mm 18mm; }'));
    assert.ok(html.includes('break-inside:avoid'));
    assert.ok(html.includes('VAT: to be confirmed; no VAT amount has been calculated'));
    assert.ok(html.includes('&lt;Customer &amp; One&gt;'));
    assert.ok(!html.includes('<Customer & One>'));
    assert.ok(!html.includes('undefined'));
    assert.ok(!html.includes('null'));
    assert.ok(!html.includes('localhost'));
  }
});

test('all registered services render each customer-facing status from the shared template', () => {
  for (const service of serviceRegistry) {
    const { record, quote } = quoteFixture(service.key);
    for (const status of ['Awaiting decision', 'Accepted', 'Declined', 'Expired']) {
      const html = createQuoteHtml({
        record,
        quote,
        status,
        publicBaseUrl: 'https://weq4u.example',
        actions: snapshotActions,
      });
      assert.ok(html.includes(`status-${status.toLowerCase().replaceAll(' ', '-')}`), `${service.key} has no ${status} state`);
      assert.ok(html.includes(service.displayName.replaceAll("'", '&#39;')));
      if (status !== 'Awaiting decision') assert.ok(!html.includes('>Accept</a>'));
    }
  }
});

test('each supported service preserves its approved branded visual snapshot', async (t) => {
  const updateSnapshots = process.env.UPDATE_QUOTE_PDF_SNAPSHOTS === '1';
  await mkdir(snapshotDirectory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(chromiumExecutablePath() ? { executablePath: chromiumExecutablePath() } : {}),
  });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1123, height: 1800 }, deviceScaleFactor: 1 });
  try {
    for (const service of serviceRegistry) {
      const { record, quote } = quoteFixture(service.key);
      const html = await createQuoteHtmlDocument({
        record,
        quote,
        status: 'Awaiting decision',
        publicBaseUrl: 'https://weq4u.example',
        actions: snapshotActions,
      });
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const screenshot = await page.locator('.document').screenshot({ animations: 'disabled', timeout: 30000 });
      const snapshotPath = path.join(snapshotDirectory, `${snapshotNames[service.key]}.png`);
      if (updateSnapshots) {
        await writeFile(snapshotPath, screenshot);
        continue;
      }
      if (process.platform !== 'win32') {
        assert.ok(screenshot.length > 10000, `${service.key} quote snapshot should contain a rendered page`);
        continue;
      }
      const expected = await readFile(snapshotPath).catch((error) => {
        if (error.code === 'ENOENT') {
          throw new Error(`Missing ${service.key} quote screenshot. Run with UPDATE_QUOTE_PDF_SNAPSHOTS=1 to create approved baselines.`);
        }
        throw error;
      });
      const screenshotHash = createHash('sha256').update(screenshot).digest('hex');
      const expectedHash = createHash('sha256').update(expected).digest('hex');
      assert.equal(screenshotHash, expectedHash, `${service.key} quote visual snapshot changed (actual ${screenshotHash}, expected ${expectedHash}); inspect it and intentionally update the baseline if approved.`);
    }
  } finally {
    await page.close();
  }
});

test('Chromium PDF output is A4 and retains only active secure link annotations', async () => {
  const { record, quote } = quoteFixture('drivers-licence');
  quote.serviceKey = 'drivers-licence';
  quote.variantKey = 'renewal';
  record.serviceVariantKey = 'renewal';
  record.serviceCode = 'DL-RENEWAL';
  const pdf = await createQuotePdf({
    record,
    quote,
    status: 'Awaiting decision',
    publicBaseUrl: 'https://weq4u.example',
    actions: snapshotActions,
  });
  const contents = pdf.toString('latin1');
  assert.match(contents.slice(0, 8), /^%PDF-1\./);
  assert.ok((contents.match(/\/Subtype \/Link/g) || []).length >= 5, 'action, status and contact anchors should be active PDF links');
  assert.ok(!contents.includes('localhost'));
  const html = createQuoteHtml({
    record,
    quote,
    publicBaseUrl: 'https://weq4u.example',
    actions: snapshotActions,
  }).replace(/href="[^"]*"/g, '');
  assert.ok(!html.includes('accept-token'), 'token text must not be printed into the page content');
  const mediaBox = contents.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  assert.ok(mediaBox, 'PDF should declare page dimensions');
  assert.ok(Math.abs(Number(mediaBox[1]) - 595.28) < 1, 'PDF page width should be A4');
  assert.ok(Math.abs(Number(mediaBox[2]) - 841.89) < 1, 'PDF page height should be A4');
});

test('long quote pricing rows continue across multiple A4 pages without breaking rows', async () => {
  const { record, quote } = quoteFixture('drivers-licence');
  record.serviceVariantKey = 'renewal';
  record.serviceCode = 'DL-RENEWAL';
  quote.serviceKey = 'drivers-licence';
  quote.variantKey = 'renewal';
  quote.lines = Array.from({ length: 60 }, (_, index) => ({
    label: `Verified service line ${index + 1} with a detailed, customer-facing description`,
    amountCents: 12500,
  }));
  quote.totalCents = quote.lines.reduce((total, line) => total + line.amountCents, 0);
  const pdf = await createQuotePdf({
    record,
    quote,
    status: 'Awaiting decision',
    publicBaseUrl: 'https://weq4u.example',
    actions: snapshotActions,
  });
  const contents = pdf.toString('latin1');
  assert.ok((contents.match(/\/Type \/Page\b/g) || []).length >= 3, 'a long quote should flow onto at least three pages');
  assert.ok((contents.match(/\/Subtype \/Link/g) || []).length >= 5, 'decision links should remain available in a multi-page quote');
});

test('quote data rejects missing, placeholder and out-of-policy validity dates', () => {
  const { record, quote } = quoteFixture('drivers-licence');
  record.serviceVariantKey = 'renewal';
  record.serviceCode = 'DL-RENEWAL';
  quote.serviceKey = 'drivers-licence';
  quote.variantKey = 'renewal';
  for (const validUntil of ['', '2099-12-31', '2026-11-15', '2026-02-31']) {
    assert.throws(() => createQuoteHtml({
      record,
      quote: { ...quote, validUntil },
      publicBaseUrl: 'https://weq4u.example',
      actions: snapshotActions,
    }), /valid-until|valid-until date/i);
  }
});

test('decided and expired quote PDFs show status instead of decision buttons', () => {
  const { record, quote } = quoteFixture('drivers-licence');
  record.serviceVariantKey = 'renewal';
  record.serviceCode = 'DL-RENEWAL';
  quote.serviceKey = 'drivers-licence';
  quote.variantKey = 'renewal';
  for (const status of ['Accepted', 'Declined', 'Expired']) {
    const html = createQuoteHtml({
      record,
      quote,
      status,
      publicBaseUrl: 'https://weq4u.example',
      actions: snapshotActions,
    });
    assert.ok(html.includes(`This quotation is <strong>${status.toLowerCase()}</strong>`));
    assert.ok(html.includes(`status-${status.toLowerCase()}`));
    assert.ok(!html.includes('>Accept</a>'));
    assert.ok(!html.includes('>Request changes</a>'));
    assert.ok(!html.includes('>Decline</a>'));
    assert.ok(html.includes(snapshotActions.status));
  }
});

test('unapproved service variants produce an internal registry review instead of a quote', async () => {
  const { record } = quoteFixture('change-of-ownership');
  const html = createRegistryReviewHtml(record);
  assert.ok(html.includes('INTERNAL REGISTRY REVIEW'));
  assert.ok(html.includes('NOT A CUSTOMER QUOTATION'));
  assert.ok(html.includes('Draft'));
  const pdf = await createRegistryReviewPdf(record);
  const contents = pdf.toString('latin1');
  assert.match(contents.slice(0, 8), /^%PDF-1\./);
  assert.ok((contents.match(/\/Type \/Page\b/g) || []).length >= 1);
});

test('internal registry review templates cover every registered service', () => {
  for (const service of serviceRegistry) {
    const html = createRegistryReviewHtml({
      services: [service.categoryServiceId],
      serviceKey: service.key,
      serviceVariantKey: service.variants[0].key,
      serviceCode: service.variants[0].serviceCode,
      ref: 'WQ-2026-0123456789ABCDEF1234',
    });
    assert.ok(html.includes('INTERNAL REGISTRY REVIEW'));
    assert.ok(html.includes('NOT A CUSTOMER QUOTATION'));
    assert.ok(html.includes(service.displayName.replaceAll("'", '&#39;')));
  }
});

test('quote action tokens reject tampering and support read-only status action', () => {
  const secret = 'test-secret-with-sufficient-entropy';
  const payload = {
    version: 1,
    ref: 'WQ-2026-0123456789ABCDEF1234',
    quoteNumber: 'Q2026-TEST-0001',
    quoteId: 'WQ-Q-TEST-1',
    quoteVersion: 1,
    action: 'status',
    expiresAt: quoteExpiryTimestamp('2026-12-01'),
  };
  const token = signQuoteActionToken(payload, secret);
  const [body, signature] = token.split('.');
  const tamperedBody = `${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`;
  assert.deepEqual(verifyQuoteActionToken(token, secret), payload);
  assert.equal(verifyQuoteActionToken(`${tamperedBody}.${signature}`, secret), null);
  assert.equal(verifyQuoteActionToken(token, 'a-different-secret'), null);
  assert.equal(payload.expiresAt, Date.parse('2026-12-01T21:59:59.999Z'), 'quote links expire at the end of the South African valid-until date');
  assert.equal(quoteExpiryTimestamp('2026-02-31'), null);
});
