import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';
import Stripe from 'stripe';

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

  let stripeStats = null;
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      // Get balance (total available + pending)
      const balance = await stripe.balance.retrieve();
      const available = balance.available.reduce((s, b) => s + b.amount, 0);
      const pending    = balance.pending.reduce((s, b) => s + b.amount, 0);

      // Get recent payment intents (last 100)
      const charges = await stripe.paymentIntents.list({ limit: 100 });
      const succeeded = charges.data.filter(c => c.status === 'succeeded');
      const totalEarned = succeeded.reduce((s, c) => s + (c.amount_received || 0), 0);
      const todayStart  = new Date(); todayStart.setHours(0,0,0,0);
      const todayEarned = succeeded
        .filter(c => c.created * 1000 >= todayStart.getTime())
        .reduce((s, c) => s + (c.amount_received || 0), 0);

      stripeStats = {
        available:    (available / 100).toFixed(2),
        pending:      (pending  / 100).toFixed(2),
        totalEarned:  (totalEarned / 100).toFixed(2),
        todayEarned:  (todayEarned / 100).toFixed(2),
        totalSales:   succeeded.length,
        todaySales:   succeeded.filter(c => c.created * 1000 >= todayStart.getTime()).length,
      };
    } catch (e) {
      stripeStats = { error: e.message };
    }
  }

  return NextResponse.json({
    activeUsers:  _visitors.size,
    stripeStats,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString(),
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
