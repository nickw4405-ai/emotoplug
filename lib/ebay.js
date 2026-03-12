import { load } from 'cheerio';

// In-memory cache (resets on cold start, fine for serverless)
const _linkCache = new Map();  // key → { url, ts }
const _failedAt  = new Map();  // key → timestamp

const CACHE_TTL = 3600 * 1000; // 1 hour
const FAIL_TTL  = 3600 * 1000; // retry after 1 hour

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

async function ebayDuckDuckGo(q, condition) {
  const condWord = condition === 1000 ? ' new' : condition === 3000 ? ' used' : '';
  const ddgQ = `ebay ${q}${condWord} buy it now`;

  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQ)}`,
      {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 5000) return null;

    const $ = load(html);
    const keywords = q.split(' ').filter(w => w.length > 2).map(w => w.toLowerCase());
    let found = null;

    $('.result__a').each((_, el) => {
      if (found) return false;
      const href = $(el).attr('href') || '';
      // DDG wraps links as /l/?uddg=<encoded-url>
      const m = href.match(/uddg=([^&]+)/);
      const actualUrl = m ? decodeURIComponent(m[1]) : href;

      // Must be US eBay direct listing (not .ca / .co.uk / search pages)
      if (!/^https?:\/\/www\.ebay\.com\/itm\/\d{10,}/.test(actualUrl)) return;

      // Title must contain at least 2 keywords
      const title = $(el).text().toLowerCase();
      const matches = keywords.filter(kw => title.includes(kw)).length;
      if (matches >= 2) {
        found = actualUrl.split('?')[0];
        return false; // break
      }
    });

    return found;
  } catch {
    return null;
  }
}

async function ebayFindingApi(q, condition) {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;
  try {
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findItemsAdvanced',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'keywords': q,
      'itemFilter(0).name': 'ListingType',
      'itemFilter(0).value': 'FixedPrice',
      'sortOrder': 'PricePlusShippingLowest',
      'paginationInput.entriesPerPage': '1',
    });
    if (condition) {
      params.set('itemFilter(1).name', 'Condition');
      params.set('itemFilter(1).value', String(condition));
    }
    const res = await fetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const items = data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
    if (items.length) {
      const urls = items[0]?.viewItemURL || [];
      if (urls.length) return urls[0].split('?')[0];
    }
  } catch {}
  return null;
}

export async function ebayDirect(q, condition = null) {
  const key = `ebay_d:${condition}:${q}`;
  const now = Date.now();

  // Memory cache
  const cached = _linkCache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.url;

  // Failure cooldown
  const failedAt = _failedAt.get(key) || 0;
  if (now - failedAt < FAIL_TTL) return null;

  let result = await ebayFindingApi(q, condition);
  if (!result) result = await ebayDuckDuckGo(q, condition);

  if (result) {
    _linkCache.set(key, { url: result, ts: now });
  } else {
    _failedAt.set(key, now);
  }
  return result;
}
