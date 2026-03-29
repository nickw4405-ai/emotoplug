import { NextResponse } from 'next/server';
import { kvIncr } from '../../../../lib/kv.js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const now   = new Date();
    const day   = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const month = now.toISOString().slice(0, 7);  // YYYY-MM

    await Promise.all([
      kvIncr('visits:total', 1),
      kvIncr(`visits:${day}`, 1),
      kvIncr(`visits:${month}`, 1),
    ]);
  } catch { /* silent — never break the page */ }

  return NextResponse.json({ ok: true });
}
