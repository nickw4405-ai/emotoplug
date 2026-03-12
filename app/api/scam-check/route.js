import { NextResponse } from 'next/server';
import { scamCheck } from '../../../lib/ai.js';

export const runtime = 'edge'; // Edge = no timeout, Haiku is fast anyway

export async function POST(req) {
  try {
    const { url = '' } = await req.json();
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    const result = await scamCheck(url);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
