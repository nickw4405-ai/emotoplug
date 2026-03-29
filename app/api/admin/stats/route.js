import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';
import { kvGet } from '../../../../lib/kv.js';

export const dynamic = 'force-dynamic';

// ── Active-visitor tracking (in-memory) ──────────────────────────────────────
const _visitors = new Map();
const VISITOR_TTL = 5 * 60 * 1000;

// ── Date helpers ──────────────────────────────────────────────────────────────
function isoDay(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function isoMonth(monthsAgo = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 7); // YYYY-MM
}
function toUnix(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}
function shortDay(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function shortMonth(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ── Stripe helpers ────────────────────────────────────────────────────────────
async function fetchCharges(fromUnix) {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return [];
  try {
    const url = `https://api.stripe.com/v1/charges?limit=100&created%5Bgte%5D=${fromUnix}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return [];
    const { data } = await res.json();
    return (data || []).filter(c => c.status === 'succeeded');
  } catch { return []; }
}

export async function GET(req) {
  const token = getTokenFromRequest(req);
  if (!verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Clean stale visitors
  const now = Date.now();
  for (const [id, ts] of _visitors) {
    if (now - ts > VISITOR_TTL) _visitors.delete(id);
  }

  // ── Fetch all KV data in parallel ────────────────────────────────────────
  const N_DAYS   = 30;
  const N_MONTHS = 12;
  const [totalVisRaw, totalClicksRaw, totalConvRaw, ...kvRest] = await Promise.all([
    kvGet('visits:total'),
    kvGet('clicks:total'),
    kvGet('conversions:total'),
    ...Array.from({ length: N_DAYS   }, (_, i) => kvGet(`visits:${isoDay(i)}`)),
    ...Array.from({ length: N_MONTHS }, (_, i) => kvGet(`visits:${isoMonth(i)}`)),
    ...Array.from({ length: N_DAYS   }, (_, i) => kvGet(`clicks:${isoDay(i)}`)),
    ...Array.from({ length: N_DAYS   }, (_, i) => kvGet(`conversions:${isoDay(i)}`)),
  ]);
  const dayVis   = kvRest.slice(0,          N_DAYS).map(v => Number(v) || 0);
  const monthVis = kvRest.slice(N_DAYS,     N_DAYS + N_MONTHS).map(v => Number(v) || 0);
  const dayClick = kvRest.slice(N_DAYS + N_MONTHS, N_DAYS + N_MONTHS + N_DAYS).map(v => Number(v) || 0);
  const dayConv  = kvRest.slice(N_DAYS + N_MONTHS + N_DAYS).map(v => Number(v) || 0);

  // ── Fetch Stripe charges (last 30 days) ───────────────────────────────────
  const charges = await fetchCharges(toUnix(N_DAYS));

  // Bucket revenue by day
  const revByDay = {};
  for (let i = 0; i < N_DAYS; i++) revByDay[isoDay(i)] = 0;
  for (const c of charges) {
    const d = new Date(c.created * 1000).toISOString().slice(0, 10);
    if (d in revByDay) revByDay[d] = (revByDay[d] || 0) + c.amount / 100;
  }
  const dayRev = Array.from({ length: N_DAYS }, (_, i) => revByDay[isoDay(i)] || 0);

  // ── Build chart slices (reversed so oldest → newest) ─────────────────────
  const slice = (arr, n) => arr.slice(0, n).reverse();
  const week = {
    labels:      Array.from({ length: 7  }, (_, i) => shortDay(6  - i)),
    visitors:    slice(dayVis,   7),
    revenue:     slice(dayRev,   7),
    clicks:      slice(dayClick, 7),
    conversions: slice(dayConv,  7),
  };
  const month = {
    labels:      Array.from({ length: 30 }, (_, i) => shortDay(29 - i)),
    visitors:    slice(dayVis,   30),
    revenue:     slice(dayRev,   30),
    clicks:      slice(dayClick, 30),
    conversions: slice(dayConv,  30),
  };
  const allTime = {
    labels:      Array.from({ length: N_MONTHS }, (_, i) => shortMonth(N_MONTHS - 1 - i)),
    visitors:    slice(monthVis, N_MONTHS),
    revenue:     [],
    clicks:      [],
    conversions: [],
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const sum  = arr => arr.reduce((a, b) => a + b, 0);
  const rate = (conv, vis) => vis > 0 ? +((conv / vis) * 100).toFixed(1) : 0;

  const totalVis  = Number(totalVisRaw)    || 0;
  const totalClk  = Number(totalClicksRaw) || 0;
  const totalConv = Number(totalConvRaw)   || 0;

  const totals = {
    day: {
      visitors: dayVis[0],   revenue: dayRev[0],
      clicks:   dayClick[0], conversions: dayConv[0],
      convRate: rate(dayConv[0], dayVis[0]),
    },
    week: {
      visitors: sum(dayVis.slice(0,7)),   revenue: sum(dayRev.slice(0,7)),
      clicks:   sum(dayClick.slice(0,7)), conversions: sum(dayConv.slice(0,7)),
      convRate: rate(sum(dayConv.slice(0,7)), sum(dayVis.slice(0,7))),
    },
    month: {
      visitors: sum(dayVis.slice(0,30)),   revenue: sum(dayRev.slice(0,30)),
      clicks:   sum(dayClick.slice(0,30)), conversions: sum(dayConv.slice(0,30)),
      convRate: rate(sum(dayConv.slice(0,30)), sum(dayVis.slice(0,30))),
    },
    allTime: {
      visitors: totalVis, revenue: null,
      clicks:   totalClk, conversions: totalConv,
      convRate: rate(totalConv, totalVis),
    },
  };

  return NextResponse.json({
    activeUsers:   _visitors.size,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    timestamp:     new Date().toISOString(),
    chart:         { week, month, allTime },
    totals,
  });
}

// Heartbeat — clients ping to stay "active"
export async function POST(req) {
  try {
    const { sessionId } = await req.json();
    if (sessionId) _visitors.set(sessionId, Date.now());
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }); }
}
