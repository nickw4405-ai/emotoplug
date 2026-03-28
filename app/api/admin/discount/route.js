import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';
import { kvSet } from '../../../../lib/kv.js';
import crypto from 'crypto';

const VALID_PCTS = [100, 75, 50, 25, 10];

export async function POST(req) {
  const token = getTokenFromRequest(req);
  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pct } = await req.json().catch(() => ({}));
  if (!VALID_PCTS.includes(Number(pct))) {
    return NextResponse.json({ error: 'Invalid percentage' }, { status: 400 });
  }

  // Generate a random 8-char uppercase code
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  await kvSet(`disc:${code}`, { pct: Number(pct), used: false });

  return NextResponse.json({ code, pct });
}
