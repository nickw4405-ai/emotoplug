import crypto from 'crypto';

const SECRET  = process.env.AUTH_SECRET || 'emotoplug-fallback-secret';
const TTL_MS  = 366 * 24 * 60 * 60 * 1000; // ~1 year

/** Create a signed 1-year subscription token for the given email */
export function createSubscriptionToken(email) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify({
    email,
    type: 'sub',
    exp:  Date.now() + TTL_MS,
    iat:  Date.now(),
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/** Verify a subscription token. Returns payload or null. */
export function verifySubscriptionToken(token) {
  try {
    if (!token) return null;
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.type !== 'sub') return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}
