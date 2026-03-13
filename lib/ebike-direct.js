/**
 * Pre-collected direct eBay itm/ listing URLs for popular ebike models.
 * Multiple URLs per condition so if one listing expires, others still work.
 * URLs rotate hourly so different visitors see different listings.
 *
 * To add more: search eBay for the bike, copy the itm/ URL, paste below.
 */

const EBIKE_DIRECT = [
  {
    // Sur-Ron Light Bee X — most popular light electric dirt bike
    keywords: ['surron light bee x', 'sur-ron light bee x', 'light bee x'],
    new: [
      'https://www.ebay.com/itm/395993336072', // 2024 Brand New
      'https://www.ebay.com/itm/326371239155', // 2024 Multiple colors
      'https://www.ebay.com/itm/167243226556', // 2024 Silver
      'https://www.ebay.com/itm/326347230018', // 2024 Purple
      'https://www.ebay.com/itm/167243141066', // 2024 Purple alt
    ],
    used: [
      'https://www.ebay.com/itm/315287961821', // 2023 used
      'https://www.ebay.com/itm/135074061632', // built/modified
      'https://www.ebay.com/itm/177011339985', // 72V modified
    ],
  },
  {
    // Sur-Ron Ultra Bee — larger, more powerful
    keywords: ['surron ultra bee', 'sur-ron ultra bee', 'ultra bee'],
    new: [
      'https://www.ebay.com/itm/317247516568',
      'https://www.ebay.com/itm/205797457089',
      'https://www.ebay.com/itm/317373531680',
    ],
    used: [],
  },
  {
    // Talaria Sting R MX4 — match BEFORE generic 'talaria sting'
    keywords: ['talaria sting r', 'sting r mx4', 'talaria mx4', 'mx4'],
    new: [
      'https://www.ebay.com/itm/235600717697',
      'https://www.ebay.com/itm/167882461579',
    ],
    used: [],
  },
  {
    // Talaria Sting (original / generic)
    keywords: ['talaria sting', 'talaria'],
    new: [
      'https://www.ebay.com/itm/235600717697',
      'https://www.ebay.com/itm/389149000793',
    ],
    used: [
      'https://www.ebay.com/itm/196201633756',
    ],
  },
  {
    // Segway X260
    keywords: ['segway x260', 'x260'],
    new: [
      'https://www.ebay.com/itm/176583665824',
      'https://www.ebay.com/itm/125234309221',
      'https://www.ebay.com/itm/187520481219',
    ],
    used: [
      'https://www.ebay.com/itm/125759557862',
    ],
  },
  {
    // Segway X160 — smaller/younger rider version
    keywords: ['segway x160', 'x160'],
    new: [
      'https://www.ebay.com/itm/267289566421',
      'https://www.ebay.com/itm/194472999957',
    ],
    used: [
      'https://www.ebay.com/itm/365121104719',
      'https://www.ebay.com/itm/305503147869',
    ],
  },
  {
    // Lectric XP Lite — budget folding commuter
    keywords: ['lectric xp lite', 'xp lite'],
    new: [
      'https://www.ebay.com/itm/336241859496',
      'https://www.ebay.com/itm/396633909293',
    ],
    used: [
      'https://www.ebay.com/itm/365663067596',
      'https://www.ebay.com/itm/315724551639',
    ],
  },
  {
    // Lectric XP 3.0 — match before generic 'lectric xp'
    keywords: ['lectric xp 3', 'lectric xp3', 'xp 3.0', 'xp3.0'],
    new: [
      'https://www.ebay.com/itm/395560867265',
      'https://www.ebay.com/itm/286202247734',
      'https://www.ebay.com/itm/177180886387',
    ],
    used: [],
  },
  {
    // Rad Power RadRover 6
    keywords: ['radrover 6', 'rad rover 6', 'radrover6'],
    new: [],
    used: [
      'https://www.ebay.com/itm/355132127064',
    ],
  },
  {
    // Aventon Aventure fat-tire e-bike
    keywords: ['aventon aventure', 'aventure'],
    new: [
      'https://www.ebay.com/itm/176477416964', // Aventure.2 Step-Thru
      'https://www.ebay.com/itm/375536389850', // Brand New Step-Over
      'https://www.ebay.com/itm/195139910995', // Class 3 Step-Thru
    ],
    used: [
      'https://www.ebay.com/itm/204169289478',
      'https://www.ebay.com/itm/296733091063',
    ],
  },
  {
    // Super73 S2
    keywords: ['super73 s2', 'super 73 s2', 'super73-s2'],
    new: [
      'https://www.ebay.com/itm/375424016787',
    ],
    used: [
      'https://www.ebay.com/itm/405063885702',
    ],
  },
  {
    // Ariel Rider Grizzly — dual-motor commuter/adventure
    keywords: ['ariel rider grizzly', 'arielrider grizzly', 'grizzly'],
    new: [],
    used: [
      'https://www.ebay.com/itm/356241304269',
      'https://www.ebay.com/itm/296574108792',
    ],
  },
  {
    // Himiway Cruiser / D3 fat-tire commuter
    keywords: ['himiway cruiser', 'himiway d3', 'himiway'],
    new: [
      'https://www.ebay.com/itm/375662034948',
      'https://www.ebay.com/itm/375662044004',
    ],
    used: [],
  },
];

/**
 * Pick a URL from an array, rotating hourly so different visitors
 * get different listings and we're not always sending to one listing.
 */
function pickUrl(arr) {
  if (!arr || arr.length === 0) return null;
  const idx = Math.floor(Date.now() / (1000 * 60 * 60)) % arr.length;
  return arr[idx];
}

/**
 * Given a bike title string, return { new_url, used_url } with direct eBay itm/ URLs,
 * or null if no match found.
 * Matches the most specific keyword first (longest keyword wins).
 */
export function findDirectUrls(title) {
  if (!title) return null;
  const t = title.toLowerCase();

  // Sort entries so longer keywords are tried first (more specific match wins)
  const sorted = [...EBIKE_DIRECT].sort((a, b) => {
    const aMax = Math.max(...a.keywords.map(k => k.length));
    const bMax = Math.max(...b.keywords.map(k => k.length));
    return bMax - aMax;
  });

  for (const entry of sorted) {
    if (entry.keywords.some(kw => t.includes(kw))) {
      const new_url  = pickUrl(entry.new);
      const used_url = pickUrl(entry.used);
      if (new_url || used_url) {
        return { new_url, used_url };
      }
    }
  }
  return null;
}
