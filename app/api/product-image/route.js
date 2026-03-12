import { NextResponse } from 'next/server';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
const _imgCache = new Map();

async function findImage(q) {
  if (_imgCache.has(q)) return _imgCache.get(q);
  try {
    const res = await fetch(`https://www.amazon.com/s?k=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = load(html);
    let imgUrl = '';
    $('img.s-image').each((_, el) => {
      if (imgUrl) return false;
      const src = $(el).attr('src') || '';
      if (src && src.includes('media-amazon.com')) {
        imgUrl = src.replace(/\._AC_UL\d+_\./, '._AC_UL400_.');
        return false;
      }
    });
    _imgCache.set(q, imgUrl);
    return imgUrl;
  } catch {
    return '';
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const imgUrl = await findImage(q);
  if (imgUrl) {
    try {
      const imgRes = await fetch(imgUrl, {
        headers: { 'User-Agent': UA, 'Referer': 'https://www.amazon.com/', 'Accept': 'image/*' },
        signal: AbortSignal.timeout(6000),
      });
      if (imgRes.ok && imgRes.headers.get('content-type')?.includes('image')) {
        const buf = await imgRes.arrayBuffer();
        return new Response(buf, {
          headers: {
            'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    } catch {}
  }

  // Placeholder
  const label = encodeURIComponent(q.split(' ').slice(0, 3).join('+'));
  return NextResponse.redirect(`https://placehold.co/300x200/1a2235/00e5ff?text=${label}`);
}
