import { load } from 'cheerio';

const _linkCache = new Map();
const _failedAt  = new Map();

const CACHE_TTL = 3600 * 1000;  // 1 hour
const FAIL_TTL  = 600  * 1000;  // 10 min cooldown before retry

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ── Method 1: eBay Finding API (fastest, needs EBAY_APP_ID env var) ──────────
async function ebayFindingApi(q, condition) {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;
  try {
    const params = new URLSearchParams({
      'OPERATION-NAME':         'findItemsAdvanced',
      'SERVICE-VERSION':        '1.0.0',
      'SECURITY-APPNAME':       appId,
      'RESPONSE-DATA-FORMAT':   'JSON',
      'keywords':               q,
      'itemFilter(0).name':     'ListingType',
      'itemFilter(0).value':    'FixedPrice',
      'sortOrder':              'PricePlusShippingLowest',
      'paginationInput.entriesPerPage': '1',
    });
    if (condition) {
      params.set('itemFilter(1).name',  'Condition');
      params.set('itemFilter(1).value', String(condition));
    }
    const res  = await fetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const items = data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
    if (items.length) {
      const item = items[0];
      const urls = item?.viewItemURL || [];
      const url  = urls.length ? urls[0].split('?')[0] : null;
      const raw  = item?.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'];
      const ship = item?.shippingInfo?.[0]?.shippingServiceCost?.[0]?.['__value__'];
      const price = raw ? parseFloat(raw) + (parseFloat(ship) || 0) : null;
      return { url, price };
    }
  } catch {}
  return null;
}

// ── Method 2: Scrape eBay search page directly (no API key needed) ────────────
async function ebayScrapeDirect(q, condition) {
  const condStr = condition ? `&LH_ItemCondition=${condition}` : '';
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_BIN=1&_sop=15${condStr}&_ipg=5`;
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':      UA,
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 2000) return null;   // CAPTCHA or empty page

    const $ = load(html);
    let url = null;
    let price = null;

    // Walk items in order (already sorted lowest price first by &_sop=15)
    $('.s-item').each((_, item) => {
      if (url) return false;
      const a    = $(item).find('a[href*="/itm/"]').first();
      const href = a.attr('href') || '';
      const m    = href.match(/\/itm\/(?:[^/?#]+\/)?(\d{10,})/);
      if (!m) return;
      url = `https://www.ebay.com/itm/${m[1]}`;
      // Parse price — handle ranges like "$12.99 to $15.99" by taking first number
      const priceText = $(item).find('.s-item__price').first().text().replace(/,/g, '');
      const pm = priceText.match(/\$?([\d.]+)/);
      if (pm) price = parseFloat(pm[1]);
    });

    return url ? { url, price } : null;
  } catch {
    return null;
  }
}

// ── Method 3: DuckDuckGo scrape (fallback if eBay blocks the request) ────────
async function ebayDuckDuckGo(q, condition) {
  const condWord = condition === 1000 ? ' new' : condition === 3000 ? ' used' : '';
  const ddgQ = `site:ebay.com/itm ${q}${condWord}`;
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQ)}`,
      {
        headers: {
          'User-Agent':      UA,
          'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 3000) return null;

    const $ = load(html);
    const keywords = q.split(' ').filter(w => w.length > 2).map(w => w.toLowerCase());
    let found = null;

    $('.result__a').each((_, el) => {
      if (found) return false;
      const href  = $(el).attr('href') || '';
      const m     = href.match(/uddg=([^&]+)/);
      const actual = m ? decodeURIComponent(m[1]) : href;

      if (!/^https?:\/\/www\.ebay\.com\/itm\//.test(actual)) return;

      // Require at least 1 keyword match (relaxed from 2)
      const title   = $(el).text().toLowerCase();
      const matches = keywords.filter(kw => title.includes(kw)).length;
      if (matches >= 1) {
        found = actual.split('?')[0];
        return false;
      }
    });

    return found;
  } catch {
    return null;
  }
}

// ── Normalize results: all methods now return { url, price } or null ─────────
function norm(r) {
  if (!r) return null;
  if (typeof r === 'string') return { url: r, price: null };
  return r;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function ebayDirect(q, condition = null) {
  const key = `ebay_d:${condition}:${q}`;
  const now = Date.now();

  const cached = _linkCache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.url;

  const failedAt = _failedAt.get(key) || 0;
  if (now - failedAt < FAIL_TTL) return null;

  const result = norm(await ebayFindingApi(q, condition))
              || norm(await ebayScrapeDirect(q, condition))
              || norm(await ebayDuckDuckGo(q, condition));

  if (result?.url) {
    _linkCache.set(key, { url: result.url, ts: now });
    return result.url;
  }
  _failedAt.set(key, now);
  return null;
}

// Returns { price, url } with the live lowest eBay price for a search query
const _priceCache = new Map();
export async function ebayLowestPrice(q) {
  const now = Date.now();
  const cached = _priceCache.get(q);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached;

  const result = norm(await ebayFindingApi(q, null))
              || norm(await ebayScrapeDirect(q, null));

  const entry = { url: result?.url || null, price: result?.price || null, ts: now };
  if (entry.url || entry.price) _priceCache.set(q, entry);
  return entry;
}
