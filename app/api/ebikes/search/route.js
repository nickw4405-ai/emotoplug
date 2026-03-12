import { NextResponse } from 'next/server';
import { ebikeSearch } from '../../../../lib/ai.js';
import { findOfficialUrl, findProductUrl } from '../../../../lib/bike-urls.js';

export const maxDuration = 30;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'cheap ebike';

  try {
    const bikes = await ebikeSearch(q);
    const results = bikes.slice(0, 6).map(bike => {
      const title    = bike.title || q;
      const searchQ  = bike.ebay_search || title;
      const fbUsed   = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQ)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000`;
      const fbNew    = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQ)}&LH_BIN=1&_sop=15&LH_ItemCondition=1000`;
      return {
        title,
        description:        bike.description || '',
        new_price:          bike.new_price || '',
        used_price_typical: bike.used_price_typical || '',
        used_price_min:     parseInt(bike.used_price_min) || 0,
        ebay_url:           fbUsed,
        ebay_new_url:       fbNew,
        google_shop_url:    `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title + ' electric bike buy new')}`,
        official_url:       findOfficialUrl(title),
        product_url:        findProductUrl(title),
        ebay_search:        searchQ,
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
      }]);
    }
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
