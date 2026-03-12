import Anthropic from '@anthropic-ai/sdk';

// Lazy-init client so missing key doesn't crash at import time
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const ICONS = {
  battery:'🔋', motor:'⚡', lighting:'💡', comfort:'🛋️', safety:'🛡️',
  performance:'🚀', storage:'🎒', display:'📱', brakes:'🛑',
  suspension:'🏔️', tires:'🔵', hardware:'🔩', security:'🔒', accessories:'🎯',
};

function enrichMod(mod) {
  const cat = (mod.category || 'accessories').toLowerCase();
  mod.icon = ICONS[cat] || '🔧';
  const retail  = mod.retail_price  || 0;
  const found   = mod.found_price   || 0;
  mod.savings       = Math.max(0, retail - found);
  mod.price_display = found ? `$${found}` : 'Varies';
  mod.retail_display = retail ? `$${retail}` : '';
  const unlock = Math.round(Math.max(1.0, Math.min(3.0, mod.savings * 0.05)) * 2) / 2;
  mod.unlock_price = unlock;
  mod.unlock_cents = Math.round(unlock * 100);
  const aq = encodeURIComponent(mod.amazon_search || mod.title || '');
  const eq = encodeURIComponent(mod.ebay_search   || mod.title || '');
  mod.amazon_search_link    = `https://www.amazon.com/s?k=${aq}`;
  mod.ebay_search_link      = `https://www.ebay.com/sch/i.html?_nkw=${eq}&LH_BIN=1&_sop=15`;
  mod.google_shopping_link  = `https://www.google.com/search?tbm=shop&q=${aq}`;
  mod.ebay_direct   = mod.ebay_direct   || '';
  mod.amazon_direct = mod.amazon_direct || '';
  mod.image_url     = mod.image_url     || '';
  return mod;
}

export async function identifyEbikeText(text) {
  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `The user typed: '${text}'\nIdentify which ebike brand and model they mean, correcting any spelling errors. Return ONLY valid JSON:\n{"brand":"name","model":"name","type":"mountain/road/cargo/commuter/folding/fat-tire/other","year":"Unknown","motor_type":"Unknown","confidence":"medium","spell_corrected":"what you understood"}`,
    }],
  });
  const m = msg.content[0].text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return { error: 'Could not identify that ebike. Try being more specific.' };
}

export async function identifyEbikeImage(imageData, mime) {
  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: imageData } },
        { type: 'text', text: 'Identify this ebike. Return ONLY valid JSON:\n{"brand":"name","model":"name","type":"mountain/road/cargo/commuter/folding/fat-tire/other","year":"Unknown","motor_type":"hub/mid-drive/Unknown","confidence":"high/medium/low"}\nIf not an ebike: {"error":"Not an ebike"}' },
      ],
    }],
  });
  const m = msg.content[0].text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return { error: 'Could not identify ebike from image' };
}

export async function getAiMods(ebikeInfo) {
  const brand = ebikeInfo.brand || 'ebike';
  const model = ebikeInfo.model || '';
  const bike  = `${brand} ${model}`.trim();

  const prompt = `You are an expert mod guide for the ${bike}. List the 10 most popular mods that ${bike} owners actually buy and talk about on Reddit, YouTube, and forums. ONLY suggest mods that physically fit and work with the ${bike} — no generic mods. Use real brand names: for light electric bikes (Surron/Talaria/Segway) include Guts Racing seat foam, supermoto tires, Baja Designs lights, hydraulic brake kits, titanium bolt sets, fatbar handlebars. For hub-motor commuter ebikes include brake upgrades, bigger batteries, displays, comfort grips, racks. For mid-drive bikes include chainring upgrades, EggRider display, Luna battery, Schwalbe tires. Every item MUST explicitly fit the ${bike}. Return ONLY a valid JSON array, no extra text:\n[{"title":"Brand + Exact Product Name","brand":"brand","description":"why this fits the ${bike} specifically","retail_price":120,"found_price":75,"category":"brakes/battery/motor/lighting/comfort/performance/tires/suspension/hardware/security/storage/accessories","amazon_search":"exact amazon search query","ebay_search":"exact ebay search query","compatibility_note":"confirmed fits ${bike}","difficulty":"easy/medium/hard","why_popular":"why ${bike} owners love this mod"}]`;

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  const m = msg.content[0].text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const mods = JSON.parse(m[0]);
    return mods.map(enrichMod);
  } catch { return []; }
}

export async function getAiModsForQuery(bike, query) {
  const prompt = `You are an expert mod guide for the ${bike}. List 8 of the best '${query}' upgrades that ${bike} owners actually buy. Only suggest real products that physically fit the ${bike}. Use real brand names. Return ONLY a valid JSON array, no extra text:\n[{"title":"Brand + Exact Product Name","brand":"brand","description":"why this fits the ${bike}","retail_price":120,"found_price":80,"category":"brakes/battery/motor/lighting/comfort/performance/tires/suspension/hardware/accessories","amazon_search":"exact amazon search query","ebay_search":"exact ebay search query","compatibility_note":"fits ${bike}","difficulty":"easy/medium/hard","why_popular":"why ${bike} owners buy this"}]`;

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  const m = msg.content[0].text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const mods = JSON.parse(m[0]);
    return mods.map(enrichMod);
  } catch { return []; }
}

export async function ebikeSearch(q) {
  const prompt = `User is looking for: "${q}" light electric bike / ebike.\nList 5 specific models they should consider — Surron, Talaria, Segway, KTM Freeride E, etc.\nFor EACH bike return:\n- title: exact model name (e.g. 'Surron Light Bee X')\n- description: one punchy sell line (under 10 words)\n- new_price: retail price string e.g. '$3,200–$4,500'\n- used_price_typical: typical used market price string e.g. '$2,200–$3,000'\n- used_price_min: lowest realistic used sale price as integer (USD). Set to 0 if brand new model with no used market yet.\n- ebay_search: best eBay search phrase to find this model (include make + model, e.g. 'Surron Light Bee X ebike')\nReturn ONLY valid JSON array, no extra text:\n[{"title":"Surron Light Bee X","description":"52V off-road legend, massive community","new_price":"$3,200–$3,800","used_price_typical":"$1,800–$2,600","used_price_min":1600,"ebay_search":"Surron Light Bee X electric bike"}]`;

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });
  const m = msg.content[0].text.match(/\[[\s\S]*\]/);
  return m ? JSON.parse(m[0]) : [];
}

export async function scamCheck(url) {
  const prompt = `Analyze this product URL for scam risk: ${url}\n\nCheck: domain reputation, URL structure (suspicious characters, random strings, typosquatting), known scam domains, HTTPS, redirect chains, price-too-good-to-be-true signals in the URL.\n\nReturn ONLY valid JSON:\n{"scam_percentage":0,"verdict":"Safe","verdict_emoji":"✅","domain":"domain.com","is_https":true,"is_known_legit":true,"red_flags":[],"green_flags":[],"recommendation":"short advice"}`;

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });
  const m = msg.content[0].text.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error('Could not analyze URL');
}
