from __future__ import annotations
import os, base64, json, re, time, subprocess
from concurrent.futures import ThreadPoolExecutor
import anthropic, requests, stripe
from curl_cffi import requests as cf_requests  # Chrome TLS impersonation (bypasses bot detection)
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, redirect, Response
from dotenv import load_dotenv
from urllib.parse import quote
from data.mods_db import MODS, TRENDING, CATEGORIES, search_mods

load_dotenv(override=True)

app = Flask(__name__)
app.secret_key = os.urandom(24)
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUB = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
EBAY_APP_ID = os.getenv("EBAY_APP_ID", "")  # free at developer.ebay.com

pending_unlocks: dict = {}
_img_cache: dict = {}
_link_cache: dict = {}   # in-memory cache (fast lookups)
_failed_at: dict = {}    # key -> timestamp of last failure (TTL-based, don't permanently block)
FAIL_TTL   = 3600        # retry failed eBay scrapes after 1 hour
CACHE_TTL  = 3600        # re-fetch disk-cached eBay URLs after 1 h (listings sell out fast)

# Persistent disk cache — survives server restarts so we don't re-scrape on every reload
# Format: { key: {"url": "...", "ts": <unix_timestamp>} }
_cache_path = os.path.join(os.path.dirname(__file__), ".ebay_cache.json")
_disk_cache: dict = {}

def _load_disk_cache():
    global _disk_cache
    try:
        with open(_cache_path) as f:
            _disk_cache = json.load(f)
    except Exception:
        _disk_cache = {}

def _save_disk_cache():
    try:
        with open(_cache_path, "w") as f:
            json.dump(_disk_cache, f)
    except Exception:
        pass

_load_disk_cache()

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TRUSTED = {"amazon.com","ebay.com","walmart.com","rei.com","trekbikes.com","specialized.com",
           "radpowerbikes.com","lunacycle.com","grintech.com","nashbar.com","bikeinn.com"}

# ── helpers ────────────────────────────────────────────────────────────────

def domain(url):
    m = re.search(r"https?://(?:www\.)?([^/]+)", url)
    return m.group(1).lower() if m else ""

def legit(url):
    d = domain(url)
    for t in TRUSTED:
        if t in d:
            return {"score":9,"label":"Trusted","color":"#22c55e"}
    return {"score":6,"label":"Secure","color":"#f59e0b"} if url.startswith("https") else {"score":3,"label":"Unverified","color":"#ef4444"}

def ebay_product(q):
    key = f"ebay:{q}"
    if key in _link_cache:
        return _link_cache[key]
    result = None
    try:
        r = requests.get(f"https://www.ebay.com/sch/i.html?_nkw={quote(q)}&_sop=15&LH_BIN=1",
                         headers=BROWSER_HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "lxml")
        for a in soup.select(".s-item__link"):
            href = a.get("href","")
            # Skip sponsored/ad placeholder items
            if "ebay.com/itm/" in href and "/123456" not in href:
                result = href.split("?")[0]
                break
    except: pass
    _link_cache[key] = result
    return result

def ebay_direct(q: str, condition: int = None) -> str | None:
    """Get a direct eBay itm/ URL for a search query.

    Strategy (in order):
      1. Memory cache  — instant
      2. Disk cache    — survives restarts, no HTTP needed
      3. eBay Finding API (if EBAY_APP_ID set) — reliable, no bot detection
      4. system curl scraping — fallback, bypasses Python TLS fingerprint detection
    Only caches successes. Failures are retried after FAIL_TTL seconds.
    condition: 1000=new, 3000=used, None=any
    """
    key = f"ebay_d:{condition}:{q}"

    # 1. Memory cache (within this server session, no TTL needed — server restarts clear it)
    if key in _link_cache:
        return _link_cache[key]

    # 2. Disk cache — valid for CACHE_TTL seconds (24 h) so sold listings get refreshed
    now = time.time()
    if key in _disk_cache:
        entry = _disk_cache[key]
        url = entry.get("url") if isinstance(entry, dict) else entry  # handle old format
        ts  = entry.get("ts",  0) if isinstance(entry, dict) else 0
        if url and (now - ts) < CACHE_TTL:
            _link_cache[key] = url
            return url
        # Expired — fall through and re-fetch

    # 3. Don't hammer DDG if we recently failed — wait FAIL_TTL seconds before retry
    if now - _failed_at.get(key, 0) < FAIL_TTL:
        return None

    result = None

    # 4a. eBay Finding API (free, 5000 req/day, no bot detection) — most reliable
    if EBAY_APP_ID:
        result = _ebay_api(q, condition)

    # 4b. DuckDuckGo search — parses actual result links, US eBay only, title-validated
    if result is None:
        result = _ebay_duckduckgo(q, condition)

    if result:
        # Cache successful result in memory + disk (with timestamp for TTL)
        _link_cache[key] = result
        _disk_cache[key] = {"url": result, "ts": now}
        _save_disk_cache()
    else:
        # Record failure timestamp so we retry after FAIL_TTL, NOT permanently block
        _failed_at[key] = now

    return result


def _ebay_api(q: str, condition: int = None) -> str | None:
    """eBay Finding API — returns a direct itm/ URL. Requires free EBAY_APP_ID."""
    try:
        params = {
            "OPERATION-NAME":            "findItemsAdvanced",
            "SERVICE-VERSION":           "1.0.0",
            "SECURITY-APPNAME":          EBAY_APP_ID,
            "RESPONSE-DATA-FORMAT":      "JSON",
            "keywords":                  q,
            "itemFilter(0).name":        "ListingType",
            "itemFilter(0).value":       "FixedPrice",
            "sortOrder":                 "PricePlusShippingLowest",
            "paginationInput.entriesPerPage": "1",
        }
        if condition:
            params["itemFilter(1).name"]  = "Condition"
            params["itemFilter(1).value"] = str(condition)
        r = requests.get(
            "https://svcs.ebay.com/services/search/FindingService/v1",
            params=params, timeout=8
        )
        data = r.json()
        items = (data.get("findItemsAdvancedResponse", [{}])[0]
                     .get("searchResult", [{}])[0]
                     .get("item", []))
        if items:
            urls = items[0].get("viewItemURL", [])
            if urls:
                return urls[0].split("?")[0]  # strip eBay tracking params
    except Exception:
        pass
    return None


def _ebay_duckduckgo(q: str, condition: int = None) -> str | None:
    """Find a direct eBay itm/ URL via DuckDuckGo search.

    Parses DDG's actual result link hrefs (not raw text) so we only get
    URLs that DDG is actively showing as results — more reliable than
    regex-scanning the full page which picks up stale snippet mentions.
    Only returns US ebay.com/itm/ links (not .ca / .co.uk).
    condition: 1000=new, 3000=used, None=any
    """
    try:
        from urllib.parse import unquote as _unquote
        cond_word = " new" if condition == 1000 else " used" if condition == 3000 else ""
        ddg_q = f"ebay {q}{cond_word} buy it now"
        r = cf_requests.get(
            f"https://html.duckduckgo.com/html/?q={quote(ddg_q)}",
            impersonate="chrome110",
            timeout=12
        )
        if r.status_code != 200 or len(r.text) < 5000:
            return None

        soup = BeautifulSoup(r.text, "lxml")
        keywords = [w.lower() for w in q.split() if len(w) > 2]

        for a in soup.select(".result__a"):
            href = a.get("href", "")
            # DDG wraps links as /l/?uddg=<encoded-url> — decode to real URL
            m = re.search(r"uddg=([^&]+)", href)
            actual_url = _unquote(m.group(1)) if m else href

            # Must be US eBay direct listing (not .ca / .co.uk / search pages)
            if not re.match(r"https?://www\.ebay\.com/itm/\d{10,}", actual_url):
                continue

            # Title should contain at least 2 keywords from the search query
            title = a.get_text().lower()
            if sum(1 for kw in keywords if kw in title) >= 2:
                return actual_url.split("?")[0]

    except Exception:
        pass
    return None

def product_image(q: str) -> str:
    """Scrape Amazon search results for a product image. Returns URL or empty string."""
    if q in _img_cache:
        return _img_cache[q]
    result = ""
    try:
        r = requests.get(f"https://www.amazon.com/s?k={quote(q)}",
                         headers=BROWSER_HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "lxml")
        for img in soup.select("img.s-image"):
            src = img.get("src", "")
            if src and "media-amazon.com" in src:
                # Upgrade to a larger thumbnail
                result = re.sub(r"\._AC_UL\d+_\.", "._AC_UL400_.", src)
                break
    except:
        pass
    _img_cache[q] = result
    return result

# Keep backward-compat alias used by enrich_mod
def ebay_image(q: str) -> str:
    return product_image(q)

def amazon_product(q):
    key = f"amz:{q}"
    if key in _link_cache:
        return _link_cache[key]
    result = None
    try:
        headers = {**BROWSER_HEADERS,
                   "Accept-Encoding": "gzip, deflate, br",
                   "Cache-Control": "no-cache"}
        r = requests.get(f"https://www.amazon.com/s?k={quote(q)}&ref=nb_sb_noss",
                         headers=headers, timeout=10)
        soup = BeautifulSoup(r.text, "lxml")
        for el in soup.select("[data-asin]"):
            asin = el.get("data-asin","").strip()
            if asin and len(asin) == 10:
                result = f"https://www.amazon.com/dp/{asin}"
                break
    except: pass
    _link_cache[key] = result
    return result

def enrich_mod(mod: dict) -> dict:
    """Add direct links and image to a mod dict."""
    m = dict(mod)
    search = m.get("amazon_search", m.get("title",""))
    m["ebay_direct"] = ebay_product(m.get("ebay_search", search)) or ""
    m["amazon_direct"] = amazon_product(search) or ""
    m["image_url"] = m.get("image_url") or ebay_image(m.get("ebay_search", search))
    # Fallback search links
    aq = quote(search); eq = quote(m.get("ebay_search", search))
    m["amazon_search_link"] = f"https://www.amazon.com/s?k={aq}"
    m["ebay_search_link"] = f"https://www.ebay.com/sch/i.html?_nkw={eq}&LH_BIN=1&_sop=15"
    m["google_shopping_link"] = f"https://www.google.com/search?tbm=shop&q={aq}"
    # Savings / unlock
    retail = m.get("retail_price",0) or 0
    found  = m.get("found_price",0) or 0
    savings = max(0, retail - found)
    m["savings"] = savings
    m["price_display"] = f"${found}" if found else "Varies"
    m["retail_display"] = f"${retail}" if retail else ""
    unlock = round(max(1.0, min(3.0, savings * 0.05)) * 2) / 2
    m["unlock_price"] = unlock
    m["unlock_cents"] = int(unlock * 100)
    return m

# ── routes ─────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    trending = TRENDING[:8]
    return render_template("index.html",
        trending=trending,
        categories=CATEGORIES,
        stripe_key=STRIPE_PUB)

@app.route("/api/mods/trending")
def api_trending():
    return jsonify(TRENDING[:20])

@app.route("/api/mods/search")
def api_search():
    q = request.args.get("q","").strip()
    results = search_mods(q)[:24]
    return jsonify(results)

@app.route("/api/mods/enrich", methods=["POST"])
def api_enrich():
    """Fetch direct links + image for a single mod."""
    mod = request.get_json()
    return jsonify(enrich_mod(mod))

# Verified specific product page URLs (checked March 2026)
BIKE_PRODUCT_PAGES = {
    # Surron — official US site is us.sur-ron.com
    "light bee x":       "https://us.sur-ron.com/lightbee/x",
    "light bee s":       "https://us.sur-ron.com/lightbee/s",
    "ultra bee":         "https://us.sur-ron.com/ultrabee/c",
    "storm bee":         "https://us.sur-ron.com/stormbee",
    # Talaria — talaria.bike is down, verified US distributor pages
    "talaria sting r":   "https://talariausa.us.com/product/talaria-sting-r-mx4/",
    "sting r mx4":       "https://talariausa.us.com/product/talaria-sting-r-mx4/",
    "talaria mx4":       "https://talariausa.us.com/product/talaria-sting-r-mx4/",
    "talaria sting":     "https://talariausa.us.com/product-category/talaria-sting/",
    # Segway — X160/X260 pages removed, send to ebike section
    "segway x160":       "https://store.segway.com/ebike",
    "segway x260":       "https://store.segway.com/ebike",
    # KTM — verified working freeride page
    "ktm freeride":      "https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html",
    "freeride e":        "https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html",
}

# Brand-level pages (fallback when no specific model page found)
BRAND_OFFICIAL_URLS = {
    "surron":          "https://us.sur-ron.com",
    "sur-ron":         "https://us.sur-ron.com",
    "sur ron":         "https://us.sur-ron.com",
    "light bee":       "https://us.sur-ron.com",
    "talaria":         "https://talariausa.us.com",
    "sting":           "https://talariausa.us.com/product-category/talaria-sting/",
    "mx4":             "https://talariausa.us.com",
    "segway":          "https://store.segway.com/ebike",
    "x160":            "https://store.segway.com/ebike",
    "x260":            "https://store.segway.com/ebike",
    "ktm":             "https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html",
    "freeride":        "https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html",
    "rad power":       "https://www.radpowerbikes.com/collections/electric-bikes",
    "radpower":        "https://www.radpowerbikes.com/collections/electric-bikes",
    "radrunner":       "https://www.radpowerbikes.com/collections/electric-bikes",
    "aventon":         "https://www.aventon.com/collections/ebikes",
    "lectric":         "https://lectricebikes.com/collections/ebikes",
    "ariel rider":     "https://arielrider.com/collections/all-ebikes",
    "arielrider":      "https://arielrider.com/collections/all-ebikes",
    "super73":         "https://super73.com/collections/bikes",
    "onyx":            "https://onyxmotorbikes.com/collections/bikes",
    "stark":           "https://www.stark-future.com",
    "biktrix":         "https://www.biktrix.com/collections/ebikes",
    "juiced":          "https://www.juicedbikes.com/collections/e-bikes",
    "cake":            "https://ridecake.com",
}

def find_official_url(title: str) -> str:
    """Return the brand-level page URL by scanning the bike title."""
    t = title.lower()
    for keyword, url in BRAND_OFFICIAL_URLS.items():
        if keyword in t:
            return url
    return ""

def find_product_url(title: str) -> str:
    """Return the most specific verified product page — specific model first, then brand page."""
    t = title.lower()
    for keyword, url in BIKE_PRODUCT_PAGES.items():
        if keyword in t:
            return url
    return find_official_url(title)

@app.route("/api/ebikes/search")
def api_ebike_search():
    """Use Claude AI to curate bike recommendations with new + used pricing."""
    q = request.args.get("q", "cheap ebike").strip()
    try:
        prompt = (
            f'User is looking for: "{q}" light electric bike / ebike.\n'
            "List 5 specific models they should consider — Surron, Talaria, Segway, KTM Freeride E, etc.\n"
            "For EACH bike return:\n"
            "- title: exact model name (e.g. 'Surron Light Bee X')\n"
            "- description: one punchy sell line (under 10 words)\n"
            "- new_price: retail price string e.g. '$3,200–$4,500'\n"
            "- used_price_typical: typical used market price string e.g. '$2,200–$3,000'\n"
            "- used_price_min: lowest realistic used sale price as integer (USD). "
            "  Set to 0 if brand new model with no used market yet.\n"
            "- ebay_search: best eBay search phrase to find this model (include make + model, e.g. 'Surron Light Bee X ebike')\n"
            "Return ONLY valid JSON array, no extra text:\n"
            '[{"title":"Surron Light Bee X","description":"52V off-road legend, massive community",'
            '"new_price":"$3,200–$3,800","used_price_typical":"$1,800–$2,600","used_price_min":1600,'
            '"ebay_search":"Surron Light Bee X electric bike"}]'
        )
        msg = client.messages.create(
            model="claude-haiku-4-5", max_tokens=1200,
            messages=[{"role": "user", "content": prompt}]
        )
        m = re.search(r"\[.*\]", msg.content[0].text, re.DOTALL)
        bikes = json.loads(m.group()) if m else []
    except Exception:
        bikes = []

    # Build results — eBay direct links are fetched at click-time by the frontend
    # via /goto/ebay/url so we never serve stale pre-scraped listing IDs here.
    results = []
    for bike in bikes[:6]:
        title    = bike.get("title", q)
        search_q = bike.get("ebay_search") or title
        sq = search_q
        fb_used = f"https://www.ebay.com/sch/i.html?_nkw={quote(sq)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000"
        fb_new  = f"https://www.ebay.com/sch/i.html?_nkw={quote(sq)}&LH_BIN=1&_sop=15&LH_ItemCondition=1000"
        results.append({
            "title":              title,
            "description":        bike.get("description", ""),
            "new_price":          bike.get("new_price", ""),
            "used_price_typical": bike.get("used_price_typical", ""),
            "used_price_min":     int(bike.get("used_price_min") or 0),
            "ebay_url":           fb_used,      # frontend upgrades to itm/ at click time
            "ebay_new_url":       fb_new,       # frontend upgrades to itm/ at click time
            "google_shop_url":    f"https://www.google.com/search?tbm=shop&q={quote(title + ' electric bike buy new')}",
            "official_url":       find_official_url(title),
            "product_url":        find_product_url(title),
            "ebay_search":        sq,
        })

    if not results:
        sq = q + " electric bike"
        results = [{
            "title": f'Search: "{q}"', "description": "No specific models found",
            "new_price": "", "used_price_typical": "Check eBay",
            "used_price_min": 0,
            "ebay_url":        f"https://www.ebay.com/sch/i.html?_nkw={quote(sq)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000",
            "ebay_new_url":    f"https://www.ebay.com/sch/i.html?_nkw={quote(sq)}&LH_BIN=1&_sop=15&LH_ItemCondition=1000",
            "google_shop_url": f"https://www.google.com/search?tbm=shop&q={quote(q + ' electric bike')}",
            "official_url":    find_official_url(q),
            "product_url":     find_product_url(q),
            "ebay_search":     sq,
        }]
    return jsonify(results)


@app.route("/goto/ebay/url")
def goto_ebay_url():
    """Return JSON {url: direct_itm_url_or_fallback} — used by filterUsed() JS."""
    q    = request.args.get("q", "").strip()
    c    = request.args.get("c", "")
    maxp = request.args.get("max", "")
    if not q:
        return jsonify({"url": "https://www.ebay.com"})
    cond = int(c) if c.isdigit() else None
    cond_str = f"&LH_ItemCondition={cond}" if cond else ""
    max_str  = f"&_udhi={maxp}" if maxp.isdigit() else ""
    direct = ebay_direct(q, cond)
    if direct:
        url = direct + (f"?_udhi={maxp}" if maxp.isdigit() else "")
        return jsonify({"url": url})
    fallback = f"https://www.ebay.com/sch/i.html?_nkw={quote(q)}&LH_BIN=1&_sop=15{cond_str}{max_str}"
    return jsonify({"url": fallback})

@app.route("/goto/ebay")
def goto_ebay():
    """Scrape eBay for the cheapest direct listing and redirect to it.
    Falls back to eBay search if scraping is blocked.
    ?q=search term  &c=1000 (new) or 3000 (used)  &max=price ceiling
    """
    q    = request.args.get("q", "").strip()
    c    = request.args.get("c", "")
    maxp = request.args.get("max", "")
    if not q:
        return redirect("https://www.ebay.com")
    cond = int(c) if c.isdigit() else None
    cond_str = f"&LH_ItemCondition={cond}" if cond else ""
    max_str  = f"&_udhi={maxp}" if maxp.isdigit() else ""
    # Try to get a direct itm/ link
    direct = ebay_direct(q, cond)
    if direct:
        return redirect(direct)
    # Fallback: eBay search with filters (still shows real listings)
    fallback = f"https://www.ebay.com/sch/i.html?_nkw={quote(q)}&LH_BIN=1&_sop=15{cond_str}{max_str}"
    return redirect(fallback)

@app.route("/api/product-image")
def api_product_image():
    q = request.args.get("q","")
    img = ebay_image(q)
    if img:
        try:
            r = requests.get(img, headers={
                "User-Agent": BROWSER_HEADERS["User-Agent"],
                "Referer": "https://www.amazon.com/",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            }, timeout=6)
            if r.status_code == 200 and "image" in r.headers.get("Content-Type",""):
                return Response(r.content,
                    content_type=r.headers.get("Content-Type","image/jpeg"),
                    headers={"Cache-Control":"public, max-age=86400"})
        except:
            pass
    # Placeholder with the product name as text
    label = quote("+".join(q.split()[:3]))
    return redirect(f"https://placehold.co/300x200/1a2235/00e5ff?text={label}")

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        mode = data.get("mode","image")

        if mode == "text":
            bike_text = data.get("bike_text","").strip()
            if not bike_text:
                return jsonify({"error":"Please enter your ebike name"}), 400
            ebike_info = identify_ebike_text(bike_text)
        else:
            raw = data.get("image_data","")
            if "," in raw:
                header, image_data = raw.split(",",1)
                mime = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
            else:
                image_data, mime = raw, "image/jpeg"
            ebike_info = identify_ebike_image(image_data, mime)

        if "error" in ebike_info:
            return jsonify({"error": ebike_info["error"]}), 400

        mods = get_ai_mods(ebike_info)
        return jsonify({"ebike": ebike_info, "mods": mods, "stripe_enabled": bool(stripe.api_key)})
    except Exception as e:
        print(f"Error /analyze: {e}")
        return jsonify({"error": str(e)}), 500

def identify_ebike_text(text: str) -> dict:
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=512,
        messages=[{"role":"user","content":
            f"The user typed: '{text}'\n"
            "Identify which ebike brand and model they mean, correcting any spelling errors. "
            "Return ONLY valid JSON:\n"
            '{"brand":"name","model":"name","type":"mountain/road/cargo/commuter/folding/fat-tire/other",'
            '"year":"Unknown","motor_type":"Unknown","confidence":"medium","spell_corrected":"what you understood"}'
        }])
    m = re.search(r"\{.*\}", msg.content[0].text, re.DOTALL)
    if m:
        try: return json.loads(m.group())
        except: pass
    return {"error": "Could not identify that ebike. Try being more specific."}

def identify_ebike_image(image_data: str, mime: str) -> dict:
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=512,
        messages=[{"role":"user","content":[
            {"type":"image","source":{"type":"base64","media_type":mime,"data":image_data}},
            {"type":"text","text":
                'Identify this ebike. Return ONLY valid JSON:\n'
                '{"brand":"name","model":"name","type":"mountain/road/cargo/commuter/folding/fat-tire/other",'
                '"year":"Unknown","motor_type":"hub/mid-drive/Unknown","confidence":"high/medium/low"}\n'
                'If not an ebike: {"error":"Not an ebike"}'}
        ]}])
    m = re.search(r"\{.*\}", msg.content[0].text, re.DOTALL)
    if m:
        try: return json.loads(m.group())
        except: pass
    return {"error": "Could not identify ebike from image"}

def get_ai_mods(ebike_info: dict) -> list:
    brand = ebike_info.get("brand","ebike")
    model = ebike_info.get("model","")
    etype = ebike_info.get("type","ebike")
    motor = ebike_info.get("motor_type","")
    bike = f"{brand} {model}".strip()

    prompt = (
        f"You are an expert mod guide for the {bike}. "
        f"List the 10 most popular mods that {bike} owners actually buy and talk about on Reddit, YouTube, and forums. "
        f"ONLY suggest mods that physically fit and work with the {bike} — no generic mods. "
        f"Use real brand names: for light electric bikes (Surron/Talaria/Segway) include Guts Racing seat foam, "
        f"supermoto tires, Baja Designs lights, hydraulic brake kits, titanium bolt sets, fatbar handlebars. "
        f"For hub-motor commuter ebikes include brake upgrades, bigger batteries, displays, comfort grips, racks. "
        f"For mid-drive bikes include chainring upgrades, EggRider display, Luna battery, Schwalbe tires. "
        f"Every item MUST explicitly fit the {bike}. "
        "Return ONLY a valid JSON array, no extra text:\n"
        '[{"title":"Brand + Exact Product Name",'
        '"brand":"brand",'
        f'"description":"why this fits the {bike} specifically",'
        '"retail_price":120,"found_price":75,'
        '"category":"brakes/battery/motor/lighting/comfort/performance/tires/suspension/hardware/security/storage/accessories",'
        '"amazon_search":"exact amazon search query",'
        '"ebay_search":"exact ebay search query",'
        f'"compatibility_note":"confirmed fits {bike}",'
        '"difficulty":"easy/medium/hard",'
        f'"why_popular":"why {bike} owners love this mod"}}]'
    )

    msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=3000,
                                  messages=[{"role":"user","content":prompt}])
    m = re.search(r"\[.*\]", msg.content[0].text, re.DOTALL)
    if not m: return []
    try:
        mods = json.loads(m.group())
    except: return []

    ICONS = {"battery":"🔋","motor":"⚡","lighting":"💡","comfort":"🛋️","safety":"🛡️",
             "performance":"🚀","storage":"🎒","display":"📱","brakes":"🛑",
             "suspension":"🏔️","tires":"🔵","hardware":"🔩","security":"🔒","accessories":"🎯"}
    for mod in mods:
        cat = (mod.get("category") or "accessories").lower()
        mod["icon"] = ICONS.get(cat,"🔧")
        retail = mod.get("retail_price",0) or 0
        found  = mod.get("found_price",0) or 0
        savings = max(0, retail - found)
        mod["savings"] = savings
        mod["price_display"] = f"${found}" if found else "Varies"
        mod["retail_display"] = f"${retail}" if retail else ""
        unlock = round(max(1.0, min(3.0, savings*0.05))*2)/2
        mod["unlock_price"] = unlock
        mod["unlock_cents"] = int(unlock*100)
        aq = quote(mod.get("amazon_search", mod.get("title","")))
        eq = quote(mod.get("ebay_search", mod.get("title","")))
        mod["amazon_search_link"] = f"https://www.amazon.com/s?k={aq}"
        mod["ebay_search_link"] = f"https://www.ebay.com/sch/i.html?_nkw={eq}&LH_BIN=1&_sop=15"
        mod["google_shopping_link"] = f"https://www.google.com/search?tbm=shop&q={aq}"
        mod["ebay_direct"] = ""
        mod["amazon_direct"] = ""
        mod["image_url"] = ""
    return mods

@app.route("/api/mods/for-bike", methods=["POST"])
def api_mods_for_bike():
    data = request.get_json(force=True)
    brand = data.get("bike_brand", "").strip()
    model = data.get("bike_model", "").strip()
    query = data.get("query", "").strip()
    bike = f"{brand} {model}".strip() or "ebike"

    # Search DB first
    db_results = search_mods(query) if query else []

    if len(db_results) >= 4:
        return jsonify(db_results[:12])

    # Not enough in DB — generate with Claude
    ai_mods = get_ai_mods_for_query(bike, query)
    seen = {m.get("title", "") for m in ai_mods}
    combined = ai_mods + [m for m in db_results if m.get("title", "") not in seen]
    return jsonify(combined[:12])

def get_ai_mods_for_query(bike: str, query: str) -> list:
    prompt = (
        f"You are an expert mod guide for the {bike}. "
        f"List 8 of the best '{query}' upgrades that {bike} owners actually buy. "
        f"Only suggest real products that physically fit the {bike}. Use real brand names. "
        "Return ONLY a valid JSON array, no extra text:\n"
        '[{"title":"Brand + Exact Product Name","brand":"brand",'
        f'"description":"why this fits the {bike}",'
        '"retail_price":120,"found_price":80,'
        '"category":"brakes/battery/motor/lighting/comfort/performance/tires/suspension/hardware/accessories",'
        '"amazon_search":"exact amazon search query",'
        '"ebay_search":"exact ebay search query",'
        f'"compatibility_note":"fits {bike}",'
        '"difficulty":"easy/medium/hard",'
        f'"why_popular":"why {bike} owners buy this"}}]'
    )
    try:
        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=2000,
                                      messages=[{"role": "user", "content": prompt}])
        m = re.search(r"\[.*\]", msg.content[0].text, re.DOTALL)
        if not m: return []
        mods = json.loads(m.group())
    except:
        return []

    ICONS = {"battery":"🔋","motor":"⚡","lighting":"💡","comfort":"🛋️","safety":"🛡️",
             "performance":"🚀","storage":"🎒","display":"📱","brakes":"🛑",
             "suspension":"🏔️","tires":"🔵","hardware":"🔩","security":"🔒","accessories":"🎯"}
    for mod in mods:
        cat = (mod.get("category") or query or "accessories").lower()
        mod["icon"] = ICONS.get(cat, "🔧")
        retail = mod.get("retail_price", 0) or 0
        found  = mod.get("found_price", 0) or 0
        mod["savings"] = max(0, retail - found)
        mod["price_display"] = f"${found}" if found else "Varies"
        unlock = round(max(1.0, min(3.0, mod["savings"] * 0.05)) * 2) / 2
        mod["unlock_price"] = unlock
        mod["unlock_cents"] = int(unlock * 100)
        aq = quote(mod.get("amazon_search", mod.get("title", "")))
        eq = quote(mod.get("ebay_search", mod.get("title", "")))
        mod["amazon_search_link"] = f"https://www.amazon.com/s?k={aq}"
        mod["ebay_search_link"] = f"https://www.ebay.com/sch/i.html?_nkw={eq}&LH_BIN=1&_sop=15"
        mod["google_shopping_link"] = f"https://www.google.com/search?tbm=shop&q={aq}"
        mod["ebay_direct"] = ""
        mod["amazon_direct"] = ""
        mod["image_url"] = ""
    return mods

@app.route("/api/scam-check", methods=["POST"])
def api_scam_check():
    url = request.get_json().get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    try:
        prompt = (
            f"Analyze this product URL for scam risk: {url}\n\n"
            "Check: domain reputation, URL structure (suspicious characters, random strings, typosquatting), "
            "known scam domains, HTTPS, redirect chains, price-too-good-to-be-true signals in the URL.\n\n"
            "Return ONLY valid JSON:\n"
            '{"scam_percentage":0,"verdict":"Safe","verdict_emoji":"✅",'
            '"domain":"domain.com","is_https":true,"is_known_legit":true,'
            '"red_flags":[],"green_flags":[],"recommendation":"short advice"}'
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        m = re.search(r"\{.*\}", msg.content[0].text, re.DOTALL)
        if m:
            return jsonify(json.loads(m.group()))
        return jsonify({"error": "Could not analyze URL"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/create-checkout", methods=["POST"])
def create_checkout():
    if not stripe.api_key:
        return jsonify({"error":"Stripe not configured"}), 400
    d = request.get_json()
    sess = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price_data":{"currency":"usd","product_data":{
            "name":f"Best Price Link: {d.get('mod_title','Mod')}",
            "description":f"Save ~${d.get('savings',0)} — direct cheapest link"},
            "unit_amount":int(d.get("price_cents",100))},"quantity":1}],
        mode="payment",
        success_url=f"http://localhost:{os.getenv('PORT',5001)}/?unlocked={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"http://localhost:{os.getenv('PORT',5001)}/",
        metadata={"direct_url":d.get("direct_url",""),"mod_title":d.get("mod_title","")})
    pending_unlocks[sess.id] = {"direct_url":d.get("direct_url",""),"mod_title":d.get("mod_title","")}
    return jsonify({"checkout_url":sess.url})

@app.route("/verify-unlock", methods=["POST"])
def verify_unlock():
    sid = request.get_json().get("session_id","")
    try:
        s = stripe.checkout.Session.retrieve(sid)
        if s.payment_status == "paid":
            u = pending_unlocks.get(sid) or {"direct_url":s.metadata.get("direct_url",""),"mod_title":s.metadata.get("mod_title","")}
            return jsonify({"success":True,**u})
        return jsonify({"error":"Not paid"}), 400
    except Exception as e:
        return jsonify({"error":str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT",5001)))
