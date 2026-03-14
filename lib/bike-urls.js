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
  // Sur-Ron
  'surron':        'https://us.sur-ron.com',
  'sur-ron':       'https://us.sur-ron.com',
  'sur ron':       'https://us.sur-ron.com',
  'light bee':     'https://us.sur-ron.com',
  'storm bee':     'https://us.sur-ron.com',
  // Talaria
  'talaria':       'https://talariausa.us.com',
  'sting':         'https://talariausa.us.com/product-category/talaria-sting/',
  'mx4':           'https://talariausa.us.com',
  // Segway
  'segway':        'https://store.segway.com/ebike',
  'x160':          'https://store.segway.com/ebike',
  'x260':          'https://store.segway.com/ebike',
  // KTM
  'ktm':           'https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html',
  'freeride':      'https://www.ktm.com/en-us/models/electric/freeride/2025-ktm-freeridee.html',
  // Rad Power
  'rad power':     'https://www.radpowerbikes.com/collections/electric-bikes',
  'radpower':      'https://www.radpowerbikes.com/collections/electric-bikes',
  'radrunner':     'https://www.radpowerbikes.com/collections/electric-bikes',
  'radrover':      'https://www.radpowerbikes.com/collections/electric-bikes',
  'radwagon':      'https://www.radpowerbikes.com/collections/electric-bikes',
  'radmini':       'https://www.radpowerbikes.com/collections/electric-bikes',
  'radcity':       'https://www.radpowerbikes.com/collections/electric-bikes',
  'radexpand':     'https://www.radpowerbikes.com/collections/electric-bikes',
  // Aventon
  'aventon':       'https://www.aventon.com/collections/ebikes',
  'aventure':      'https://www.aventon.com/collections/ebikes',
  'aventon pace':  'https://www.aventon.com/collections/ebikes',
  'aventon level': 'https://www.aventon.com/collections/ebikes',
  'aventon sinch': 'https://www.aventon.com/collections/ebikes',
  'abound':        'https://www.aventon.com/collections/ebikes',
  // Lectric
  'lectric':       'https://lectricebikes.com/collections/ebikes',
  'lectric xp':    'https://lectricebikes.com/collections/ebikes',
  // Ariel Rider
  'ariel rider':   'https://arielrider.com/collections/all-ebikes',
  'arielrider':    'https://arielrider.com/collections/all-ebikes',
  'grizzly':       'https://arielrider.com/collections/all-ebikes',
  // Super73
  'super73':       'https://super73.com/collections/bikes',
  'super 73':      'https://super73.com/collections/bikes',
  // Onyx
  'onyx':          'https://onyxmotorbikes.com/collections/bikes',
  // Stark
  'stark':         'https://www.stark-future.com',
  'stark varg':    'https://www.stark-future.com',
  // Biktrix
  'biktrix':       'https://www.biktrix.com/collections/ebikes',
  // Juiced Bikes
  'juiced':        'https://www.juicedbikes.com/collections/e-bikes',
  'hyperschrambler':'https://www.juicedbikes.com/collections/e-bikes',
  'scorpion':      'https://www.juicedbikes.com/collections/e-bikes',
  // Himiway
  'himiway':       'https://himiwaybike.com/collections/all-ebikes',
  'himiway cruiser':'https://himiwaybike.com/collections/all-ebikes',
  // SONDORS
  'sondors':       'https://sondors.com/collections/ebikes',
  // Fiido
  'fiido':         'https://www.fiido.com/collections/all',
  // Trek
  'trek rail':     'https://www.trekbikes.com/us/en_US/electric-bikes/',
  'trek powerfly': 'https://www.trekbikes.com/us/en_US/electric-bikes/',
  // Specialized
  'specialized turbo': 'https://www.specialized.com/us/en/c/electric-bikes',
  'turbo levo':    'https://www.specialized.com/us/en/c/electric-bikes',
  'turbo vado':    'https://www.specialized.com/us/en/c/electric-bikes',
  // Giant
  'giant trance':  'https://www.giant-bicycles.com/us/trance-x-e',
  'giant reign':   'https://www.giant-bicycles.com/us/trance-x-e',
  // Cannondale
  'cannondale moterra': 'https://www.cannondale.com/en/bikes/mountain/electric-mountain',
  // Cake
  'cake':          'https://ridecake.com',
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
