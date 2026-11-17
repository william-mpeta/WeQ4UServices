import { createHmac, timingSafeEqual } from 'node:crypto';

export const quoteActionNames = ['accept', 'changes', 'decline'];
export const quoteStatusAction = 'status';

export function quoteExpiryTimestamp(validUntil) {
  if (typeof validUntil !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return null;
  const timestamp = Date.parse(`${validUntil}T21:59:59.999Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === validUntil ? timestamp : null;
}

export function signQuoteActionToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyQuoteActionToken(token, secret) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || payload.version !== 1
    || typeof payload.ref !== 'string' || !payload.ref
    || typeof payload.quoteNumber !== 'string' || !payload.quoteNumber
    || typeof payload.quoteId !== 'string' || !payload.quoteId
    || !Number.isSafeInteger(payload.quoteVersion) || payload.quoteVersion < 1
    || (!quoteActionNames.includes(payload.action) && payload.action !== quoteStatusAction)
    || !Number.isSafeInteger(payload.expiresAt)) return null;
  return payload;
}
