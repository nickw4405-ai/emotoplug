import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';
import { kvSet } from '../../../../lib/kv.js';
import crypto from 'crypto';

export async function POST(req) {
  const token = getTokenFromRequest(req);
  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pct, oneTime } = await req.json().catch(() => ({}));
  const pctNum = Number(pct);
  if (!pctNum || pctNum < 1 || pctNum > 100) {
    return NextResponse.json({ error: 'Percentage must be 1–100' }, { status: 400 });
  }

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  // oneTime: true → mark as used after first use; false → reusable (used never set)
  await kvSet(`disc:${code}`, { pct: pctNum, used: false, oneTime: oneTime !== false });

  return NextResponse.json({ code, pct: pctNum, oneTime: oneTime !== false });
}
