import { NextResponse } from 'next/server';

export const maxDuration = 15;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const itemId   = (searchParams.get('item_id') || '').replace(/\D/g, '');
  const search   = searchParams.get('search') || '';
  const condition = searchParams.get('condition') === 'new' ? '1000' : '3000';

  if (!itemId) {
    return NextResponse.json({ available: false, url: null });
  }

  try {
    const res = await fetch(`https://www.ebay.com/itm/${itemId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    // Redirected away from /itm/ → listing is gone
    if (!res.url.includes('/itm/')) {
      return fallback(search, condition);
    }
    if (res.status === 404) {
      return fallback(search, condition);
    }

    const html = await res.text();
    const ended =
      html.includes('This listing has ended') ||
      html.includes('listing-ended') ||
      html.includes('item-ended') ||
      html.includes('"ended":true') ||
      html.toLowerCase().includes('item not found');

    if (ended) return fallback(search, condition);

    return NextResponse.json({ available: true, url: `https://www.ebay.com/itm/${itemId}` });
  } catch {
    // Timeout or network error — assume available so we don't break the UI
    return NextResponse.json({ available: true, url: `https://www.ebay.com/itm/${itemId}` });
  }
}

function fallback(search, condition) {
  const url = search
    ? `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(search)}&LH_BIN=1&_sop=15&LH_ItemCondition=${condition}`
    : null;
  return NextResponse.json({ available: false, url });
}
