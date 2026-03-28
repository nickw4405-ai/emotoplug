import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';

export async function POST(req) {
  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: 'No code provided.' }, { status: 400 });

  const key  = `disc:${code.toUpperCase().trim()}`;
  const raw  = await kvGet(key);
  const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

  if (!data || (data.oneTime !== false && data.used)) {
    return NextResponse.json({ error: 'invalid_code', message: 'Code is invalid or already used.' }, { status: 400 });
  }

  // Mark one-time codes as used immediately
  if (data.oneTime !== false) {
    await kvSet(key, { ...data, used: true });
  }

  return NextResponse.json({ ok: true, pct: data.pct, code: code.toUpperCase().trim() });
}
