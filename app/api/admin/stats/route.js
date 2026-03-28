import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';

// Simple in-memory visitor tracking (resets on cold start)
const _visitors = new Map(); // sessionId → last seen timestamp
const VISITOR_TTL = 5 * 60 * 1000; // 5 min = "active"

export async function GET(req) {
  // Auth check
  const token = getTokenFromRequest(req);
  if (!verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Clean stale visitors
  const now = Date.now();
  for (const [id, ts] of _visitors) {
    if (now - ts > VISITOR_TTL) _visitors.delete(id);
  }

  return NextResponse.json({
    activeUsers:   _visitors.size,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    timestamp:     new Date().toISOString(),
  });
}

// Heartbeat endpoint — clients ping this to show as active
export async function POST(req) {
  try {
    const { sessionId } = await req.json();
    if (sessionId) _visitors.set(sessionId, Date.now());
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }); }
}
