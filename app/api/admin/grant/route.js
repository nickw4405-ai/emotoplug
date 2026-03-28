import { NextResponse } from 'next/server';
import { createSubscriptionToken } from '../../../../lib/subscription.js';

// Temporary admin endpoint — remove after use
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key   = searchParams.get('key');
  const email = searchParams.get('email');

  if (key !== process.env.ADMIN_GRANT_KEY || !email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  const token     = createSubscriptionToken(email);
  const expiresAt = Date.now() + 366 * 24 * 60 * 60 * 1000;
  return NextResponse.json({ token, expires_at: expiresAt });
}
