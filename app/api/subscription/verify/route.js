import { NextResponse } from 'next/server';
import { kvGet } from '../../../../lib/kv.js';

// Looks up the token stored by the webhook handler — no outbound Stripe call needed.
export async function POST(req) {
  const { session_id } = await req.json().catch(() => ({}));

  if (!session_id) {
    return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });
  }

  const raw = await kvGet(`sub_session:${session_id}`);
  if (!raw) {
    // Webhook hasn't arrived yet — browser should retry
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  }

  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return NextResponse.json({ token: data.token, email: data.email, expires_at: data.expires_at });
}
