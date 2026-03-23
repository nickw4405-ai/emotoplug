import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const { mod, bike } = await req.json();
    if (!mod?.trim()) return NextResponse.json({ error: 'No mod specified' }, { status: 400 });

    const file = path.join(process.cwd(), 'mod_requests.json');
    let requests = [];
    try { requests = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    requests.push({ mod: mod.trim(), bike: bike?.trim() || '', timestamp: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(requests, null, 2));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
