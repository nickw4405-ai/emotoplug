import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const key  = `acct:${email.toLowerCase()}`;
  const raw  = await kvGet(key);
  const acct = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

  if (!acct) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  // Mark as cancelled and remove sub token
  acct.cancelled   = true;
  acct.cancelledAt = Date.now();
  acct.subToken    = null;
  await kvSet(key, acct);

  return NextResponse.json({ ok: true });
}
