import { NextResponse } from 'next/server';
import { identifyEbikeText, identifyEbikeImage, getAiMods } from '../../lib/ai.js';

// Edge runtime: no timeout limit — needed for Sonnet/Haiku multi-step AI calls
export const runtime = 'edge';

export async function POST(req) {
  try {
    const data = await req.json();
    const mode = data.mode || 'image';

    let ebikeInfo;
    if (mode === 'text') {
      const bikeText = (data.bike_text || '').trim();
      if (!bikeText) return NextResponse.json({ error: 'Please enter your ebike name' }, { status: 400 });
      ebikeInfo = await identifyEbikeText(bikeText);
    } else {
      const raw = data.image_data || '';
      const [header, imageData] = raw.includes(',') ? raw.split(',') : ['', raw];
      const mime = header.includes(':') ? header.split(':')[1].split(';')[0] : 'image/jpeg';
      ebikeInfo = await identifyEbikeImage(imageData || raw, mime);
    }

    if (ebikeInfo.error) return NextResponse.json({ error: ebikeInfo.error }, { status: 400 });

    const mods = await getAiMods(ebikeInfo);
    return NextResponse.json({ ebike: ebikeInfo, mods, stripe_enabled: !!process.env.STRIPE_SECRET_KEY });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
