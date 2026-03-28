import { NextResponse } from 'next/server';

// Temporary debug endpoint — remove after confirming key
export async function GET() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return NextResponse.json({ error: 'No key set' });
  return NextResponse.json({
    last4: key.slice(-4),
    prefix: key.slice(0, 8),
    length: key.length,
  });
}
