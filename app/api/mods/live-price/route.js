import { NextResponse } from 'next/server';
import { ebayLowestPrice } from '../../../../lib/ebay.js';
import { MODS } from '../../../../lib/mods-db.js';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const q  = searchParams.get('q');

  // Build search query: prefer explicit ?q, otherwise derive from mod id
  let query = q;
  if (!query && id) {
    const mod = MODS.find(m => m.id === id);
    if (mod) query = mod.ebay_search || mod.title;
  }

  if (!query) return NextResponse.json({ price: null, url: null });

  const result = await ebayLowestPrice(query);
  return NextResponse.json({ price: result.price, url: result.url });
}
