import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';

// Links a subscription token to a logged-in user's account
export async function POST(req) {
  const { email, subToken } = await req.json().catch(() => ({}));
  if (!email || !subToken) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });

  const key = `acct:${email.toLowerCase().trim()}`;
  const raw = await kvGet(key);
  const account = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

  if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

  await kvSet(key, { ...account, subToken });
  return NextResponse.json({ ok: true });
}
