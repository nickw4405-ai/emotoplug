import { NextResponse } from 'next/server';
import { searchMods } from '../../../../lib/mods-db.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  return NextResponse.json(searchMods(q).slice(0, 24));
}
