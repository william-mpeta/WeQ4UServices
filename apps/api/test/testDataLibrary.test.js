import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const apiDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = path.resolve(apiDirectory, '../..');
const libraryDirectory = path.join(repositoryDirectory, 'docs', 'Process_Documents');
const reportDirectory = path.join(repositoryDirectory, 'docs');
const adminToken = 'test-only-library-integration-token';

const serviceCases = {
  Learners_Licence: { serviceId: 'drivers-licences', detail: 'Learner licence test', serviceCode: 'DL-LEARNER-APPLICATION' },
  Drivers_Licence_Renewal: { serviceId: 'drivers-licences', detail: 'Existing driver / renewal', serviceCode: 'DL-RENEWAL' },
  Drivers_Licence_Replacement: { serviceId: 'drivers-licences', detail: 'Replacement', serviceCode: 'DL-REPLACEMENT' },
  Temporary_Drivers_Licence: { serviceId: 'drivers-licences', detail: 'Temporary licence', serviceCode: 'DL-TEMPORARY' },
  PrDP_Application: { serviceId: 'prdps', detail: 'New PrDP', serviceCode: 'PD-APPLICATION' },
  PrDP_Renewal: { serviceId: 'prdps', detail: 'PrDP renewal', serviceCode: 'PD-RENEWAL' },
  Vehicle_Registration: { serviceId: 'vehicle-registrations' },
  Licence_Disc_Renewal: { serviceId: 'licence-disc-renewals', detail: 'My vehicle' },
  Change_Of_Ownership: { serviceId: 'change-of-ownership' },
  Duplicate_Documents: { serviceId: 'duplicate-documents', detail: 'Lost or stolen' },
  Roadworthy_Assistance: { serviceId: 'roadworthy-certificates', detail: 'Roadworthy for a sale or transfer' },
  Traffic_Register: { serviceId: 'traffic-register', detail: 'Apply for a traffic register number' },
};

const variantDetails = {
  Vehicle_Registration: {
    New_Registration: 'New registration',
    Bank_Finance: 'Vehicle registration from bank finance',
    Dealership: 'Vehicle registration from dealership',
  },
  Change_Of_Ownership: {
    Bank_Finance: 'Vehicle financed through a bank',
    Dealership_Sale: 'Dealership sale',
    _PROVISIONAL_Private_Sale: 'Private sale',
  },
};

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCsv(text) {
  const contents = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];
    if (quoted) {
      if (character === '"' && contents[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''));
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  if (value.length || row.length) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ''), record[index] || ''])));
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

function requestDetails(service, variant) {
  const base = serviceCases[service];
  const detail = variantDetails[service]?.[variant] || base.detail;
  return { ...base, detail };
}

function makeRequestForm({ serviceId, detail, serviceCode, files = [] }) {
  const form = new FormData();
  form.append('name', 'QA Test Fixture');
  form.append('phone', '0000000000');
  form.append('email', 'qa@example.invalid');
  form.append('suburb', 'QA Test Area');
  form.append('services', serviceId);
  form.append('serviceDetails', JSON.stringify(detail ? { [serviceId]: detail } : {}));
  form.append('consent', 'true');
  form.append('pricingPackage', 'standard');
  if (serviceCode) form.append('serviceCode', serviceCode);
  for (const file of files) {
    form.append('documents', new Blob([file.contents], { type: file.mimeType }), file.name);
  }
  return form;
}

async function readFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !['.pdf', '.png', '.jpg', '.jpeg'].includes(path.extname(entry.name).toLowerCase())) continue;
    const fullPath = path.join(directory, entry.name);
    files.push({
      name: entry.name,
      fullPath,
      contents: await readFile(fullPath),
      mimeType: path.extname(entry.name).toLowerCase() === '.pdf'
        ? 'application/pdf'
        : path.extname(entry.name).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg',
    });
  }
  return files;
}

async function listAdminRequests(baseUrl, headers) {
  const response = await fetch(`${baseUrl}/admin/requests`, { headers });
  assert.equal(response.status, 200);
  return (await response.json()).requests;
}

async function submitRequest(baseUrl, params) {
  const response = await fetch(`${baseUrl}/requests`, {
    method: 'POST',
    body: makeRequestForm(params),
  });
  return { response, body: await response.json() };
}

async function recordNegativeReview(baseUrl, headers, ref, expectedLabel) {
  const requests = await listAdminRequests(baseUrl, headers);
  const record = requests.find((item) => item.ref === ref);
  assert.ok(record, `Expected to find QA request ${ref}`);
  assert.equal(record.documents.length, 1);
  const document = record.documents[0];
  const response = await fetch(`${baseUrl}/admin/requests/${ref}/service-assessment`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirementsReviewed: true,
      eligibility: 'pending',
      governmentReadiness: 'pending',
      requirements: [
        { id: 'id-copy', label: 'Copy of ID', required: true, status: 'rejected', note: expectedLabel },
        { id: 'existing-licence', label: 'Current licence', required: true, status: 'missing' },
        { id: 'proof-of-residence', label: 'Proof of residence', required: true, status: 'missing' },
      ],
      documentReviews: [{ documentId: document.id, status: 'rejected', note: expectedLabel }],
      notes: `QA negative fixture: ${expectedLabel}`,
    }),
  });
  const assessed = await response.json();
  assert.equal(response.status, 200, JSON.stringify(assessed));
  assert.equal(assessed.serviceAssessmentReady, false);
  assert.equal(assessed.documents[0].reviewState, 'rejected');
  const transition = await fetch(`${baseUrl}/admin/requests/${ref}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Quote Preparation' }),
  });
  assert.equal(transition.status, 409);
  return { reviewState: assessed.documents[0].reviewState, quotePreparationStatus: transition.status };
}

test('all supplied packs upload, round-trip privately, and exercise the negative scenarios', async (t) => {
  const port = await findPort();
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'weq4u-library-test-'));
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: apiDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      FOUNDER_API_TOKEN: adminToken,
      DATA_ENCRYPTION_KEY: '2'.repeat(64),
      PRIVATE_STORAGE_DIR: dataDirectory,
      STOREFRONT_ORIGIN: 'http://localhost:3000',
      ADMIN_ORIGIN: 'http://localhost:3001',
      RESEND_API_KEY: '',
      NOTIFICATION_FROM: '',
      PRICING_SEED_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const evidence = [];
  const findings = [];
  const packResults = [];
  const negativeResults = [];
  let runError = null;
  const generatedAt = new Date().toISOString();

  t.after(async () => {
    if (child.exitCode === null) {
      await stopChild(child);
    }
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const writeReports = async () => {
    const csvRows = [
      ['test_type', 'service_or_scenario', 'variant', 'sample', 'file', 'bytes', 'upload_http', 'download_http', 'sha256_match', 'source_sha256', 'downloaded_sha256', 'observed_result'],
      ...evidence.map((item) => [
        item.testType, item.serviceOrScenario, item.variant, item.sample, item.file, item.bytes,
        item.uploadHttp, item.downloadHttp, item.sha256Match, item.sourceSha256, item.downloadedSha256, item.observedResult,
      ]),
    ];
    await writeFile(path.join(reportDirectory, 'QA_Test_Evidence.csv'), `${csvRows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');

    const grouped = new Map();
    for (const result of packResults) {
      const current = grouped.get(result.service) || { packs: 0, files: 0, roundTrips: 0, blocked: 0 };
      current.packs += 1;
      current.files += result.files;
      current.roundTrips += result.roundTrips;
      current.blocked += Number(result.quoteBlocked);
      grouped.set(result.service, current);
    }
    const serviceRows = [...grouped.entries()].map(([service, result]) => `| ${service} | ${result.packs} | ${result.files} | ${result.roundTrips}/${result.files} | ${result.blocked}/${result.packs} |`).join('\n');
    const negativeRows = negativeResults.map((item) => `| ${item.scenario} | ${item.fileCount} | ${item.outcome} | ${item.result} |`).join('\n');
    const passCount = evidence.filter((item) => item.sha256Match === true).length;
    const finalFindings = findings.map((item) => `- **${item.severity}: ${item.title}.** ${item.detail}`).join('\n');
    const outcome = runError ? 'INCOMPLETE - AUTOMATED RUN FAILED' : 'NOT READY FOR UNQUALIFIED SIGN-OFF';
    const uiEvidence = process.env.QA_UI_EVIDENCE
      ? process.env.QA_UI_EVIDENCE.split('\n').map((item) => `- ${item}`).join('\n')
      : '- Browser UI checks were not run as part of this test invocation.';
    const uiScope = process.env.QA_UI_EVIDENCE
      ? '- Browser smoke checks are limited to the specific checks listed below; this was not a browser-driven upload test of every pack.'
      : '- Browser/UI testing was not performed as part of this invocation.';
    const report = `# WeQ4U Test Data Library - Automated Test Report

**Run time:** ${generatedAt}  
**Environment:** ${process.env.QA_TEST_ENVIRONMENT || 'Isolated temporary local API'}; no Base44 or production systems contacted.  
**Library:** \`docs/Process_Documents/\`

## Executive result

**Outcome: ${outcome}.** The run processed ${packResults.length} of 48 sample packs and ${passCount} of 144 positive/provisional files were uploaded and downloaded byte-for-byte. The corrupt-PDF scenario was accepted by the API, contrary to its expected rejection.${runError ? ` Run error: ${runError.message}` : ' All submitted packs remained blocked from quote preparation until assessment.'}

## Scope and method

- Submitted each of the 48 packs through \`POST /api/requests\` using its mapped service type and variant. Provisional and unconfirmed checklist entries were not treated as approved requirements.
- Retrieved every uploaded file through the authenticated admin document endpoint and compared SHA-256 hashes against the source fixture.
- Attempted to move each newly submitted pack to Quote Preparation before staff assessment; expected the transition to be blocked.
- Exercised missing-document, unsupported-MIME, oversized-file, and the 10 catalogue negative fixtures. For semantic negatives, the automated check confirmed staff can reject the uploaded fixture and that the assessment remains not quote-ready; it did not claim automated OCR or identity/date recognition.
- This was API-level integration testing, not full browser/UI UAT or external authority validation.
${uiScope}

## Local web-app smoke checks

${uiEvidence}

- These checks confirm local page-to-API connectivity and one interactive checklist. They do not claim that all 48 packs were submitted through browser file inputs.

## Separate quote-demo references (not part of this test run)

The document-library integration test created its own requests and evidence rows for the 48 sample packs. It did **not** use or assess the pre-existing synthetic quote-demo references below. Those records live in the separate isolated quote-demo API on port 4100; the normal development API on port 4000 does not contain them.

| Service | Request reference | Quote | Demo status |
|---|---|---|---|
| Driver's Licence | \`WQ-2026-4778584AC255D77A4C7C\` | \`Q2026-0002\` | Awaiting customer decision |
| PrDP | \`WQ-2026-E6C17F49F41A3CAE9A7C\` | \`Q2026-0003\` | Awaiting customer decision |
| Roadworthy | \`WQ-2026-079D20628548E52904F2\` | \`Q2026-0004\` | Awaiting customer decision |

These are historical synthetic quotes, not real commercial offers or evidence of payment/fulfilment. Their separate UI screenshots and limits are documented in [E2E-Visual-Quote-Demo-2026-11-13.md](./Gap_Analysis_2026/E2E-Visual-Quote-Demo-2026-11-13.md). The **NOT READY FOR UNQUALIFIED SIGN-OFF** outcome above applies to the document-library acceptance criteria, particularly the accepted corrupt-PDF fixture; it does not mean those quote-demo records failed.

## Results by service folder

| Service folder | Packs | Fixture files | Byte-identical round trips | Quote-preparation blocked |
|---|---:|---:|---:|---:|
${serviceRows}

## Negative scenarios

| Scenario | Fixture files | Observed result | Assessment |
|---|---:|---|---|
${negativeRows}

## Findings

${finalFindings || '- No product gaps were detected by these checks.'}

## Interpretation and limitations

- Successful upload and byte-for-byte retrieval establish file intake/storage behavior only. They do **not** prove that every fixture corresponds to the current customer checklist or that its contents are authentic or correct.
- Checklist content remains reference-only; requirements explicitly marked provisional remain unconfirmed pending business approval.
- Semantic negative fixtures (expired, unreadable, mismatched name, or future-dated) require staff review in the current workflow. This report does not claim that the application automatically detects those properties.
- The application has not been tested against live payments, email delivery, an authority, or a production database. No customer data was used.
- Detailed per-file evidence, HTTP results, byte sizes, and hashes are in [QA_Test_Evidence.csv](./QA_Test_Evidence.csv).

## Recommendation

Resolve the corrupt-file validation gap or record a formally accepted manual-review control, confirm the provisional checklists with the service owner, and then repeat the suite before sponsor sign-off.
`;
    await writeFile(path.join(reportDirectory, 'QA_Test_Report.md'), report, 'utf8');
  };

  try {
    await waitForApi(baseUrl, child, () => output);
    const catalogueResponse = await fetch(`${baseUrl}/catalogue`);
    assert.equal(catalogueResponse.status, 200);
    const catalogue = await catalogueResponse.json();
    assert.equal(catalogueResponse.status, 200);

    const catalogueRows = parseCsv(await readFile(path.join(libraryDirectory, 'CATALOGUE.csv'), 'utf8'));
    const positiveRows = catalogueRows.filter((row) => row.service !== '_Negative_Scenarios');
    const negativeRows = catalogueRows.filter((row) => row.service === '_Negative_Scenarios');
    assert.equal(positiveRows.length, 144);
    assert.equal(negativeRows.length, 10);
    assert.equal(Object.keys(serviceCases).length, 12);
    assert.equal(catalogue.serviceDefinitions.length > 0, true);

    const packs = new Map();
    for (const row of positiveRows) {
      const fullPath = path.resolve(libraryDirectory, ...row.relative_path.split('/'));
      assert.ok(fullPath.startsWith(`${path.resolve(libraryDirectory)}${path.sep}`), 'Catalogue paths must remain inside the test library.');
      const relativeDirectory = path.dirname(row.relative_path);
      const parts = relativeDirectory.split('/');
      const service = parts[0];
      const variant = parts.length > 2 ? parts.slice(1, -1).join('_') : '';
      const sample = parts.at(-1);
      const key = `${service}/${variant}/${sample}`;
      const pack = packs.get(key) || { service, variant, sample, rows: [] };
      pack.rows.push({ ...row, fullPath });
      packs.set(key, pack);
    }
    assert.equal(packs.size, 48);

    const requestRefs = new Map();
    for (const pack of packs.values()) {
      const serviceCase = requestDetails(pack.service, pack.variant);
      const files = await Promise.all(pack.rows.map(async (row) => ({
        name: path.basename(row.fullPath),
        fullPath: row.fullPath,
        contents: await readFile(row.fullPath),
        mimeType: row.file_type === 'pdf' ? 'application/pdf' : row.file_type === 'png' ? 'image/png' : 'image/jpeg',
      })));
      const { response, body } = await submitRequest(baseUrl, {
        ...serviceCase,
        files,
      });
      assert.equal(response.status, 201, `${pack.service}/${pack.variant}/${pack.sample}: ${JSON.stringify(body)}`);
      assert.match(body.ref, /^WQ-\d{4}-[A-F0-9]{20}$/);
      requestRefs.set(body.ref, { ...pack, files });

      const transition = await fetch(`${baseUrl}/admin/requests/${body.ref}`, {
        method: 'PATCH',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Quote Preparation' }),
      });
      assert.equal(transition.status, 409, `${pack.service}/${pack.variant}/${pack.sample} must not become quote-ready from uploads alone.`);
      packResults.push({ service: pack.service, variant: pack.variant, sample: pack.sample, files: files.length, quoteBlocked: true, roundTrips: 0 });
    }

    const adminRequests = await listAdminRequests(baseUrl, adminHeaders);
    for (const [ref, pack] of requestRefs) {
      const record = adminRequests.find((item) => item.ref === ref);
      assert.ok(record, `Admin record missing for ${pack.service}/${pack.sample}`);
      assert.equal(record.documents.length, pack.files.length);
      assert.equal(record.status, 'Submitted');
      assert.equal(record.serviceValidated, false);
      const packResult = packResults.find((item) => item.service === pack.service && item.variant === pack.variant && item.sample === pack.sample);
      for (let index = 0; index < pack.files.length; index += 1) {
        const source = pack.files[index];
        const document = record.documents[index];
        const response = await fetch(`${baseUrl}/admin/requests/${ref}/documents/${document.id}`, { headers: adminHeaders });
        assert.equal(response.status, 200, `${source.name} download failed`);
        const downloaded = Buffer.from(await response.arrayBuffer());
        const sourceHash = hash(source.contents);
        const downloadedHash = hash(downloaded);
        const matches = sourceHash === downloadedHash && source.contents.equals(downloaded);
        assert.equal(matches, true, `${source.name} did not round-trip byte-for-byte`);
        packResult.roundTrips += 1;
        evidence.push({
          testType: 'positive-pack',
          serviceOrScenario: pack.service,
          variant: pack.variant,
          sample: pack.sample,
          file: path.relative(libraryDirectory, source.fullPath).replaceAll(path.sep, '/'),
          bytes: source.contents.length,
          uploadHttp: 201,
          downloadHttp: response.status,
          sha256Match: true,
          sourceSha256: sourceHash,
          downloadedSha256: downloadedHash,
          observedResult: 'Uploaded and downloaded; SHA-256 identical',
        });
      }
    }

    const missingCase = serviceCases.Drivers_Licence_Renewal;
    const missing = await submitRequest(baseUrl, missingCase);
    assert.equal(missing.response.status, 201);
    const awaitDocuments = await fetch(`${baseUrl}/admin/requests/${missing.body.ref}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Awaiting Documents', requestedDocuments: ['Current licence'] }),
    });
    assert.equal(awaitDocuments.status, 200);
    const missingQuoteAttempt = await fetch(`${baseUrl}/admin/requests/${missing.body.ref}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Quote Preparation' }),
    });
    assert.equal(missingQuoteAttempt.status, 409);
    negativeResults.push({ scenario: 'Missing_Document', fileCount: 1, outcome: 'Fixture intentionally withheld; request moved to Awaiting Documents', result: 'PASS: quote preparation blocked (409)' });
    evidence.push({
      testType: 'negative-scenario',
      serviceOrScenario: 'Missing_Document',
      variant: '',
      sample: 'Sample_01',
      file: '',
      bytes: 0,
      uploadHttp: 201,
      downloadHttp: '',
      sha256Match: '',
      observedResult: 'Awaiting Documents; Quote Preparation blocked (409)',
    });

    const unsupportedForm = makeRequestForm({ ...missingCase, files: [{ name: 'unsupported.txt', contents: Buffer.from('not an allowed upload type'), mimeType: 'text/plain' }] });
    const unsupportedResponse = await fetch(`${baseUrl}/requests`, { method: 'POST', body: unsupportedForm });
    assert.equal(unsupportedResponse.status, 400);
    evidence.push({
      testType: 'negative-control',
      serviceOrScenario: 'Unsupported_MIME',
      variant: '',
      sample: '',
      file: 'unsupported.txt',
      bytes: 26,
      uploadHttp: unsupportedResponse.status,
      downloadHttp: '',
      sha256Match: '',
      sourceSha256: hash(Buffer.from('not an allowed upload type')),
      observedResult: 'Rejected as unsupported MIME type',
    });

    const negativeGroups = new Map();
    for (const row of negativeRows) {
      const fullPath = path.resolve(libraryDirectory, ...row.relative_path.split('/'));
      const files = await readFiles(path.dirname(fullPath));
      const file = files.find((item) => item.fullPath === fullPath);
      assert.ok(file, `Negative fixture not found: ${row.relative_path}`);
      const group = negativeGroups.get(row.negative_scenario) || [];
      group.push({ row, file });
      negativeGroups.set(row.negative_scenario, group);
    }

    for (const [scenario, fixtures] of negativeGroups) {
      const scenarioOutcomes = [];
      if (scenario === 'Missing_Document') {
        const { row, file } = fixtures[0];
        evidence.push({
          testType: 'negative-fixture',
          serviceOrScenario: scenario,
          variant: '',
          sample: row.sample,
          file: row.relative_path,
          bytes: file.contents.length,
          uploadHttp: 'NOT_UPLOADED',
          downloadHttp: '',
          sha256Match: '',
          sourceSha256: hash(file.contents),
          observedResult: 'Deliberately withheld; missing-document request remained in Awaiting Documents and quote preparation was blocked (409)',
        });
        continue;
      }
      for (const { row, file } of fixtures) {
        const { response, body } = await submitRequest(baseUrl, { ...missingCase, files: [file] });
        const expected = row.expected_result;
        if (scenario === 'Oversized_File') {
          assert.equal(response.status, 400, 'Oversized fixture must be rejected by the 8 MiB upload limit.');
          scenarioOutcomes.push('Rejected by upload-size limit');
          evidence.push({
            testType: 'negative-fixture',
            serviceOrScenario: scenario,
            variant: '',
            sample: row.sample,
            file: row.relative_path,
            bytes: file.contents.length,
            uploadHttp: response.status,
            downloadHttp: '',
            sha256Match: '',
            sourceSha256: hash(file.contents),
            observedResult: 'Rejected by upload-size limit',
          });
          continue;
        }

        assert.equal(response.status, 201, `${scenario}/${file.name}: ${JSON.stringify(body)}`);
        const manualReview = await recordNegativeReview(baseUrl, adminHeaders, body.ref, expected);
        const itemResult = scenario === 'Corrupt_File'
          ? 'FAIL: corrupt PDF accepted; manual rejection works, but upload integrity is not checked'
          : 'PASS with manual review: upload accepted; staff rejection blocked quote readiness';
        scenarioOutcomes.push(itemResult);
        evidence.push({
          testType: 'negative-fixture',
          serviceOrScenario: scenario,
          variant: '',
          sample: row.sample,
          file: row.relative_path,
          bytes: file.contents.length,
          uploadHttp: response.status,
          downloadHttp: '',
          sha256Match: '',
          sourceSha256: hash(file.contents),
          observedResult: `${itemResult}; review=${manualReview.reviewState}; quote-preparation=${manualReview.quotePreparationStatus}`,
        });
      }
      const scenarioResult = scenarioOutcomes.some((item) => item.startsWith('FAIL:'))
        ? scenarioOutcomes.join('; ')
        : scenarioOutcomes.join('; ');
      if (scenario === 'Corrupt_File') {
        findings.push({
          severity: 'HIGH',
          title: 'Corrupt PDF upload is accepted',
          detail: 'The corrupt-PDF fixture was accepted with HTTP 201 because the upload endpoint checks declared MIME type and size but does not validate PDF structure. Staff can reject it afterward, but the library acceptance criterion for corrupt-file rejection is not met.',
        });
      }
      if (['Wrong_Document_Type', 'Expired_Document', 'Unreadable_Scan', 'Name_Mismatch', 'Future_Dated'].includes(scenario)) {
        findings.push({
          severity: 'NOTE',
          title: `${scenario} requires human verification`,
          detail: 'The upload endpoint accepts the file; the negative control confirmed that staff can reject it and that quote preparation remains blocked. Automatic content classification is not implemented or claimed.',
        });
      }
      negativeResults.push({
        scenario,
        fileCount: fixtures.length,
        outcome: scenario === 'Corrupt_File' ? 'Acceptance criterion not met' : 'Observed',
        result: scenarioResult,
      });
    }

    assert.equal(evidence.filter((item) => item.testType === 'positive-pack' && item.sha256Match === true).length, 144);
    assert.equal(packResults.length, 48);
    assert.equal(negativeGroups.size, 8);
    assert.equal(negativeRows.length, 10);
    assert.equal(negativeResults.length, 8, 'One report row is required for each library negative scenario.');
  } catch (error) {
    runError = error;
    findings.push({
      severity: 'HIGH',
      title: 'Automated run incomplete',
      detail: error.message,
    });
  } finally {
    await writeReports();
  }

  assert.equal(runError, null, runError?.stack || 'Automated run did not complete.');
});
