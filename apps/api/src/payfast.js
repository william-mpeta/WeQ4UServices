import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

const encode = (value) => encodeURIComponent(String(value).trim()).replace(/%20/g, '+');

export function payFastSignature(parameters, passphrase = '') {
  const entries = Object.entries(parameters)
    .filter(([key, value]) => key !== 'signature' && value !== '')
    .map(([key, value]) => `${key}=${encode(value)}`);
  if (passphrase) entries.push(`passphrase=${encode(passphrase)}`);
  return createHash('md5').update(entries.join('&')).digest('hex');
}

export function payFastSignatureIsValid(parameters, passphrase = '') {
  if (typeof parameters.signature !== 'string' || !/^[a-f\d]{32}$/i.test(parameters.signature)) return false;
  const expected = Buffer.from(payFastSignature(parameters, passphrase), 'hex');
  const received = Buffer.from(parameters.signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function parsePayFastAmountCents(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function payFastCheckoutIsConfigured(env = process.env) {
  const notifyUrl = (() => {
    try { return new URL(env.PAYFAST_NOTIFY_URL); } catch { return null; }
  })();
  const sandbox = env.PAYFAST_SANDBOX !== 'false';
  return Boolean(env.PAYFAST_MERCHANT_ID
    && env.PAYFAST_MERCHANT_KEY
    && env.PAYFAST_PASSPHRASE
    && notifyUrl
    && (sandbox || notifyUrl.protocol === 'https:')
    && env.PAYFAST_ITN_ALLOWED_IPS?.split(',').some((address) => isIP(address.trim()) !== 0));
}

export function buildPayFastCheckout({ ref, quoteNumber, amountCents, email, storefrontOrigin, env = process.env }) {
  const merchantId = env.PAYFAST_MERCHANT_ID;
  const merchantKey = env.PAYFAST_MERCHANT_KEY;
  const passphrase = env.PAYFAST_PASSPHRASE;
  if (!merchantId || !merchantKey || !passphrase) return { error: 'PayFast merchant ID, merchant key and passphrase must be configured.' };
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return { error: 'The approved quote has an invalid payment amount.' };

  const sandbox = env.PAYFAST_SANDBOX !== 'false';
  const storefront = new URL(storefrontOrigin);
  const returnUrl = new URL('/track-request', storefront);
  returnUrl.searchParams.set('ref', ref);
  const notifyUrl = env.PAYFAST_NOTIFY_URL;
  let parsedNotifyUrl;
  try {
    parsedNotifyUrl = new URL(notifyUrl);
  } catch {
    return { error: 'Configure PAYFAST_NOTIFY_URL as a valid public callback URL.' };
  }
  if ((env.NODE_ENV === 'production' || !sandbox) && parsedNotifyUrl.protocol !== 'https:') {
    return { error: 'PAYFAST_NOTIFY_URL must use HTTPS in production.' };
  }
  if (!payFastCheckoutIsConfigured(env)) return { error: 'Configure PayFast credentials, callback URL and allowed callback IPs before accepting payments.' };

  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: returnUrl.toString(),
    cancel_url: returnUrl.toString(),
    notify_url: parsedNotifyUrl.toString(),
    m_payment_id: ref,
    amount: (amountCents / 100).toFixed(2),
    item_name: `${quoteNumber} - WeQ4U service request`,
  };
  if (email) fields.email_address = email;
  fields.signature = payFastSignature(fields, passphrase);

  return {
    action: sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process',
    fields,
  };
}

export async function validatePayFastItn(rawBody, { sandbox, env = process.env, fetchImpl = fetch } = {}) {
  const validationUrl = env.NODE_ENV === 'test' && env.PAYFAST_VALIDATION_URL
    ? env.PAYFAST_VALIDATION_URL
    : `${sandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za'}/eng/query/validate`;
  const response = await fetchImpl(validationUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return false;
  return (await response.text()).trim() === 'VALID';
}

export function payFastSourceIsAllowed(remoteAddress, allowedAddresses) {
  const normalizedAddress = String(remoteAddress || '').replace(/^::ffff:/i, '');
  return allowedAddresses.some((address) => address === normalizedAddress);
}
