import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'emotoplug-fallback-secret';
const COOKIE  = 'emoto_session';
const TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Token ──────────────────────────────────────────────────────
export function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TTL_MS })).toString('base64url');
  const sig    = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [header, body, sig] = (token || '').split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ── Password ───────────────────────────────────────────────────
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'emotoplug-salt-v1').digest('hex');
}

export function checkPassword(input, hash) {
  return hashPassword(input) === hash;
}

// ── Cookie helpers ─────────────────────────────────────────────
export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL_MS / 1000}`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getTokenFromRequest(req) {
  const cookie = req.headers.get('cookie') || '';
  const match  = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

export const COOKIE_NAME = COOKIE;
