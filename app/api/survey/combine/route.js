import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { kvGet, kvSet, kvDel } from '../../../../lib/kv.js';
import { createSubscriptionToken } from '../../../../lib/subscription.js';

const GOAL = () => parseInt(process.env.SURVEY_GOAL_CENTS || '2000', 10);

/**
 * POST /api/survey/combine
 * Body: { session_id, email? }
 *
 * If credits >= goal  → give free 1-year sub token immediately
 * If 0 < credits < goal → generate a one-time EMF-XXXX discount code
 *   stored in KV as disc:{code} = { pct, credits, used:false, created_at }
 *   Applied at checkout via /api/subscription/create-checkout { discount_code }
 */
export async function POST(req) {
  const { session_id, email } = await req.json().catch(() => ({}));
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

  const raw     = await kvGet(`svs:credits:${session_id}`);
  const credits = raw ? Math.round(parseFloat(raw)) : 0;

  if (credits <= 0) {
    return NextResponse.json({ error: 'No credits earned yet. Complete a survey first!' }, { status: 400 });
  }

  const goal = GOAL();

  // ── Full access ──────────────────────────────────────────────────────────
  if (credits >= goal) {
    const subEmail = email || `survey-${session_id.slice(0, 8)}@emotoplug.local`;
    const token    = createSubscriptionToken(subEmail);
    const exp      = Date.now() + 366 * 24 * 60 * 60 * 1000;
    await kvDel(`svs:credits:${session_id}`);
    return NextResponse.json({ type: 'free_access', token, expires_at: exp });
  }

  // ── Partial discount code ────────────────────────────────────────────────
  const pct  = Math.max(1, Math.floor((credits / goal) * 100)); // e.g. 50 = 50% off
  const code = 'EMF-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  await kvSet(`disc:${code}`, { pct, credits, used: false, created_at: Date.now() });
  await kvDel(`svs:credits:${session_id}`); // credits consumed — prevent double-spend

  return NextResponse.json({ type: 'discount_code', code, pct, credits });
}
