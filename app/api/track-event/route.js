import { NextResponse } from 'next/server';
import { kvIncr } from '../../../lib/kv.js';

export const dynamic = 'force-dynamic';

// Tracks 'click' (paywall opened) and 'conversion' (payment succeeded)
export async function POST(req) {
  try {
    const { type } = await req.json(); // type: 'click' | 'conversion'
    if (type !== 'click' && type !== 'conversion') return NextResponse.json({ ok: false });

    const now   = new Date();
    const day   = now.toISOString().slice(0, 10);
    const month = now.toISOString().slice(0, 7);

    await Promise.all([
      kvIncr(`${type}s:total`, 1),
      kvIncr(`${type}s:${day}`, 1),
      kvIncr(`${type}s:${month}`, 1),
    ]);
  } catch { /* silent */ }

  return NextResponse.json({ ok: true });
}
