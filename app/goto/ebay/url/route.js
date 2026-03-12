import { NextResponse } from 'next/server';
import { ebayDirect } from '../../../../lib/ebay.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q    = (searchParams.get('q') || '').trim();
  const c    = searchParams.get('c') || '';
  const maxp = searchParams.get('max') || '';

  if (!q) return NextResponse.json({ url: 'https://www.ebay.com' });

  const cond    = /^\d+$/.test(c)    ? parseInt(c)    : null;
  const condStr = cond               ? `&LH_ItemCondition=${cond}` : '';
  const maxStr  = /^\d+$/.test(maxp) ? `&_udhi=${maxp}` : '';

  const direct = await ebayDirect(q, cond);
  if (direct) {
    const url = direct + (/^\d+$/.test(maxp) ? `?_udhi=${maxp}` : '');
    return NextResponse.json({ url });
  }

  const fallback = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_BIN=1&_sop=15${condStr}${maxStr}`;
  return NextResponse.json({ url: fallback });
}
