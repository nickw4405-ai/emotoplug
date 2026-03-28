import { NextResponse } from 'next/server';
import { kvGet, kvSet, kvDel } from '../../../../lib/kv.js';
import crypto from 'crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(req) {
  const { token, password } = await req.json().catch(() => ({}));

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const raw = await kvGet(`reset:${token}`);
  const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

  if (!data || Date.now() > data.expiresAt) {
    return NextResponse.json({ error: 'Reset link is invalid or has expired.' }, { status: 400 });
  }

  // Update the account password
  const key     = `acct:${data.email}`;
  const acctRaw = await kvGet(key);
  const acct    = acctRaw ? (typeof acctRaw === 'string' ? JSON.parse(acctRaw) : acctRaw) : null;

  if (!acct) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  acct.passwordHash = hashPassword(password);
  await kvSet(key, acct);
  await kvDel(`reset:${token}`); // one-time use

  return NextResponse.json({ ok: true });
}
