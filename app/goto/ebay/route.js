import { NextResponse } from 'next/server';
import { ebayDirect } from '../../../lib/ebay.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q    = (searchParams.get('q') || '').trim();
  const c    = searchParams.get('c') || '';
  const maxp = searchParams.get('max') || '';

  if (!q) return NextResponse.redirect('https://www.ebay.com');

  const cond    = /^\d+$/.test(c)    ? parseInt(c)    : null;
  const condStr = cond               ? `&LH_ItemCondition=${cond}` : '';
  const maxStr  = /^\d+$/.test(maxp) ? `&_udhi=${maxp}` : '';

  const direct = await ebayDirect(q, cond);
  if (direct) return NextResponse.redirect(direct);

  const fallback = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_BIN=1&_sop=15${condStr}${maxStr}`;
  return NextResponse.redirect(fallback);
}
