import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { kvGet, kvSet } from '../../../../lib/kv.js';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(req) {
  const { name, email, password, subToken } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  const key = `acct:${email.toLowerCase().trim()}`;
  const existing = await kvGet(key);
  if (existing) return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 400 });

  const account = {
    name: (name || '').trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    subToken: subToken || null,
    createdAt: Date.now(),
  };

  await kvSet(key, account);
  return NextResponse.json({ ok: true, name: account.name, subToken: account.subToken });
}
