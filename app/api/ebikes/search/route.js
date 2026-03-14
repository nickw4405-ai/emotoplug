import { NextResponse } from 'next/server';
import { ebikeSearch } from '../../../../lib/ai.js';
import { findOfficialUrl, findProductUrl } from '../../../../lib/bike-urls.js';
import { findDirectUrls } from '../../../../lib/ebike-direct.js';
import { verifySubscriptionToken } from '../../../../lib/subscription.js';

export const maxDuration = 30;

export async function GET(req) {
  // ── Subscription gate ──────────────────────────────────────────
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!verifySubscriptionToken(token)) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'cheap ebike';

  try {
    const bikes = await ebikeSearch(q);
    const results = bikes.slice(0, 6).map(bike => {
      const title   = bike.title || q;
      const searchQ = bike.ebay_search || title;

      // eBay search fallbacks (shown only if no direct URL found)
      const fbUsed = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQ)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000`;
      const fbNew  = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQ)}&LH_BIN=1&_sop=15&LH_ItemCondition=1000`;

      // Look up direct itm/ listing URLs from our pre-collected table
      const direct = findDirectUrls(title);

      return {
        title,
        description:        bike.description || '',
        new_price:          bike.new_price || '',
        used_price_typical: bike.used_price_typical || '',
        used_price_min:     parseInt(bike.used_price_min) || 0,
        // Use direct itm/ URL if we have one, else fall back to search
        ebay_url:        (direct?.used_url) || (direct?.new_url) || fbUsed,
        ebay_new_url:    (direct?.new_url)  || fbNew,
        google_shop_url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title + ' electric bike buy new')}`,
        official_url:    findOfficialUrl(title),
        product_url:     findProductUrl(title),
        ebay_search:     searchQ,
        has_direct_link: !!(direct?.new_url || direct?.used_url),
      };
    });

    if (!results.length) {
      const sq = q + ' electric bike';
      return NextResponse.json([{
        title: `Search: "${q}"`, description: 'No specific models found',
        new_price: '', used_price_typical: 'Check eBay', used_price_min: 0,
        ebay_url:        `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(sq)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000`,
        ebay_new_url:    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(sq)}&LH_BIN=1&_sop=15&LH_ItemCondition=1000`,
        google_shop_url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q + ' electric bike')}`,
        official_url: findOfficialUrl(q), product_url: findProductUrl(q), ebay_search: sq,
        has_direct_link: false,
      }]);
    }
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
