// Verified specific product page URLs
export const BIKE_PRODUCT_PAGES = {
  'light bee x':  'https://us.sur-ron.com/lightbee/x',
  'light bee s':  'https://us.sur-ron.com/lightbee/s',
  'ultra bee':    'https://us.sur-ron.com/ultrabee/c',
  'storm bee':    'https://us.sur-ron.com/stormbee',
  'talaria sting r': 'https://talariausa.us.com/product/talaria-sting-r-mx4/',
  'sting r mx4':  'https://talariausa.us.com/product/talaria-sting-r-mx4/',
  'talaria mx4':  'https://talariausa.us.com/product/talaria-sting-r-mx4/',
  'talaria sting':'https://talariausa.us.com/product-category/talaria-sting/',
  'segway x160':  'https://store.segway.com/ebike',
  'segway x260':  'https://store.segway.com/ebike',
  'ktm freeride': 'https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html',
  'freeride e':   'https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html',
};

export const BRAND_OFFICIAL_URLS = {
  'surron':       'https://us.sur-ron.com',
  'sur-ron':      'https://us.sur-ron.com',
  'sur ron':      'https://us.sur-ron.com',
  'light bee':    'https://us.sur-ron.com',
  'talaria':      'https://talariausa.us.com',
  'sting':        'https://talariausa.us.com/product-category/talaria-sting/',
  'mx4':          'https://talariausa.us.com',
  'segway':       'https://store.segway.com/ebike',
  'x160':         'https://store.segway.com/ebike',
  'x260':         'https://store.segway.com/ebike',
  'ktm':          'https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html',
  'freeride':     'https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html',
  'rad power':    'https://www.radpowerbikes.com/collections/electric-bikes',
  'radpower':     'https://www.radpowerbikes.com/collections/electric-bikes',
  'radrunner':    'https://www.radpowerbikes.com/collections/electric-bikes',
  'aventon':      'https://www.aventon.com/collections/ebikes',
  'lectric':      'https://lectricebikes.com/collections/ebikes',
  'ariel rider':  'https://arielrider.com/collections/all-ebikes',
  'arielrider':   'https://arielrider.com/collections/all-ebikes',
  'super73':      'https://super73.com/collections/bikes',
  'onyx':         'https://onyxmotorbikes.com/collections/bikes',
  'stark':        'https://www.stark-future.com',
  'biktrix':      'https://www.biktrix.com/collections/ebikes',
  'juiced':       'https://www.juicedbikes.com/collections/e-bikes',
  'cake':         'https://ridecake.com',
};

export function findOfficialUrl(title) {
  const t = title.toLowerCase();
  for (const [kw, url] of Object.entries(BRAND_OFFICIAL_URLS)) {
    if (t.includes(kw)) return url;
  }
  return '';
}

export function findProductUrl(title) {
  const t = title.toLowerCase();
  for (const [kw, url] of Object.entries(BIKE_PRODUCT_PAGES)) {
    if (t.includes(kw)) return url;
  }
  return findOfficialUrl(title);
}
