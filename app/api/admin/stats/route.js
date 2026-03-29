import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';
import { kvGet } from '../../../../lib/kv.js';

export const dynamic = 'force-dynamic';

// Simple in-memory visitor tracking (resets on cold start)
const _visitors = new Map(); // sessionId → last seen timestamp
const VISITOR_TTL = 5 * 60 * 1000; // 5 min = "active"

// ── Date key helpers ──────────────────────────────────────────────────────────
function dayKey(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `visits:${d.toISOString().slice(0, 10)}`;
}

function monthKey(monthsAgo = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `visits:${d.toISOString().slice(0, 7)}`;
}

export async function GET(req) {
  // Auth check
  const token = getTokenFromRequest(req);
  if (!verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Clean stale visitors
  const now = Date.now();
  for (const [id, ts] of _visitors) {
    if (now - ts > VISITOR_TTL) _visitors.delete(id);
  }

  // ── Build all KV keys to fetch ──────────────────────────────────────────────
  // Daily keys: last 30 days (covers 1-day, 7-day, 30-day)
  const dayKeys   = Array.from({ length: 30 },  (_, i) => dayKey(i));
  // Monthly keys: last 36 months (covers 6-month, 3-year)
  const monthKeys = Array.from({ length: 36 }, (_, i) => monthKey(i));

  // Fetch everything in parallel
  const [totalRaw, ...rest] = await Promise.all([
    kvGet('visits:total'),
    ...dayKeys.map(k => kvGet(k)),
    ...monthKeys.map(k => kvGet(k)),
  ]);

  const dayVals   = rest.slice(0, 30).map(v => Number(v) || 0);
  const monthVals = rest.slice(30).map(v => Number(v) || 0);
  const sum       = arr => arr.reduce((a, b) => a + b, 0);

  const visits = {
    allTime:   Number(totalRaw) || 0,
    threeYear: sum(monthVals.slice(0, 36)),
    sixMonth:  sum(monthVals.slice(0, 6)),
    oneMonth:  sum(dayVals.slice(0, 30)),
    sevenDay:  sum(dayVals.slice(0, 7)),
    oneDay:    dayVals[0],
  };

  return NextResponse.json({
    activeUsers:   _visitors.size,
    visits,
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
