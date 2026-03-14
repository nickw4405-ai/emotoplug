import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { kvGet } from '../../../../lib/kv.js';

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(hash, 'hex'));
  } catch { return false; }
}

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });

  const raw = await kvGet(`acct:${email.toLowerCase().trim()}`);
  const account = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

  if (!account || !verifyPassword(password, account.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, name: account.name, subToken: account.subToken || null });
}
