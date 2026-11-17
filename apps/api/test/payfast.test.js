import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPayFastCheckout, parsePayFastAmountCents, payFastCheckoutIsConfigured, payFastSignature, payFastSignatureIsValid, payFastSourceIsAllowed, validatePayFastItn } from '../src/payfast.js';

const sandboxEnvironment = {
  NODE_ENV: 'test',
  PAYFAST_SANDBOX: 'true',
  PAYFAST_MERCHANT_ID: '10000100',
  PAYFAST_MERCHANT_KEY: 'test-merchant-key',
  PAYFAST_PASSPHRASE: 'test passphrase',
  PAYFAST_NOTIFY_URL: 'http://localhost:4000/api/payments/payfast/itn',
  PAYFAST_ITN_ALLOWED_IPS: '127.0.0.1',
};

test('PayFast signatures include the configured passphrase and reject changed values', () => {
  const parameters = { merchant_id: '10000100', item_name: ' Quote 1 - WeQ4U ', amount: '45.00', custom_str1: '' };
  const signed = { ...parameters, signature: payFastSignature(parameters, 'test passphrase') };

  assert.equal(payFastSignatureIsValid(signed, 'test passphrase'), true);
  assert.equal(payFastSignatureIsValid(signed, 'wrong passphrase'), false);
  assert.equal(payFastSignatureIsValid({ ...signed, amount: '46.00' }, 'test passphrase'), false);
});

test('checkout uses the configured quote amount and sandbox endpoint', () => {
  const result = buildPayFastCheckout({
    ref: 'WQ-2026-AAAAAAAAAAAAAAAAAAAA',
    quoteNumber: 'Q2026-0001',
    amountCents: 45000,
    email: 'customer@example.com',
    storefrontOrigin: 'http://localhost:3000',
    env: sandboxEnvironment,
  });

  assert.equal(result.action, 'https://sandbox.payfast.co.za/eng/process');
  assert.equal(result.fields.amount, '450.00');
  assert.equal(result.fields.m_payment_id, 'WQ-2026-AAAAAAAAAAAAAAAAAAAA');
  assert.match(result.fields.return_url, /\/track-request\?ref=/);
  assert.equal(payFastSignatureIsValid(result.fields, sandboxEnvironment.PAYFAST_PASSPHRASE), true);
  assert.equal(payFastCheckoutIsConfigured(sandboxEnvironment), true);
});

test('live checkout requires an HTTPS callback URL', () => {
  const result = buildPayFastCheckout({
    ref: 'WQ-2026-AAAAAAAAAAAAAAAAAAAA',
    quoteNumber: 'Q2026-0001',
    amountCents: 45000,
    storefrontOrigin: 'https://example.com',
    env: { ...sandboxEnvironment, PAYFAST_SANDBOX: 'false' },
  });

  assert.match(result.error, /HTTPS/);
  assert.equal(payFastCheckoutIsConfigured({ ...sandboxEnvironment, PAYFAST_SANDBOX: 'false' }), false);
});

test('payment amount parsing rejects ambiguous and excessive values', () => {
  assert.equal(parsePayFastAmountCents('450'), 45000);
  assert.equal(parsePayFastAmountCents('450.5'), 45050);
  assert.equal(parsePayFastAmountCents('450.05'), 45005);
  assert.equal(parsePayFastAmountCents('450.005'), null);
  assert.equal(parsePayFastAmountCents('4.5e2'), null);
  assert.equal(parsePayFastAmountCents('9007199254740992.00'), null);
});

test('callback source matching normalizes IPv4-mapped addresses', () => {
  assert.equal(payFastSourceIsAllowed('::ffff:127.0.0.1', ['127.0.0.1']), true);
  assert.equal(payFastSourceIsAllowed('192.0.2.1', ['127.0.0.1']), false);
  assert.equal(payFastCheckoutIsConfigured({ ...sandboxEnvironment, PAYFAST_ITN_ALLOWED_IPS: 'not-an-ip' }), false);
});

test('ITN validation posts the original body and requires an exact VALID response', async () => {
  let received;
  const fetchImpl = async (url, options) => {
    received = { url, options };
    return { ok: true, text: async () => 'VALID\n' };
  };
  const rawBody = 'merchant_id=10000100&payment_status=COMPLETE';
  const accepted = await validatePayFastItn(rawBody, {
    sandbox: true,
    env: { ...sandboxEnvironment, PAYFAST_VALIDATION_URL: 'http://127.0.0.1/validate' },
    fetchImpl,
  });

  assert.equal(accepted, true);
  assert.equal(received.url, 'http://127.0.0.1/validate');
  assert.equal(received.options.body, rawBody);
  assert.equal(received.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(await validatePayFastItn(rawBody, {
    sandbox: true,
    env: { ...sandboxEnvironment, PAYFAST_VALIDATION_URL: 'http://127.0.0.1/validate' },
    fetchImpl: async () => ({ ok: true, text: async () => 'INVALID' }),
  }), false);
});
