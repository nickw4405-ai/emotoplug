import { NextResponse } from 'next/server';
import { searchMods } from '../../../../lib/mods-db.js';
import { getAiModsForQuery } from '../../../../lib/ai.js';

export const maxDuration = 60; // seconds — needs Pro for >10s, but Haiku is fast

export async function POST(req) {
  try {
    const { bike_brand = '', bike_model = '', query = '' } = await req.json();
    const bike = `${bike_brand} ${bike_model}`.trim() || 'ebike';

    // Search DB first
    const dbResults = query ? searchMods(query) : [];
    if (dbResults.length >= 4) return NextResponse.json(dbResults.slice(0, 12));

    // Generate with AI
    const aiMods = await getAiModsForQuery(bike, query);
    const seen = new Set(aiMods.map(m => m.title || ''));
    const combined = [...aiMods, ...dbResults.filter(m => !seen.has(m.title || ''))];
    return NextResponse.json(combined.slice(0, 12));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
