import { NextResponse } from 'next/server';
import { kvGet } from '../../../../lib/kv.js';

const GOAL = () => parseInt(process.env.SURVEY_GOAL_CENTS || '2000', 10);

export async function GET(req) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ credits: 0, goal: GOAL() });

  const raw     = await kvGet(`svs:credits:${sessionId}`);
  const credits = raw ? Math.round(parseFloat(raw)) : 0;
  const goal    = GOAL();

  return NextResponse.json({
    credits,
    goal,
    pct:          Math.min(100, Math.round((credits / goal) * 100)),
    dollars:      (credits / 100).toFixed(2),
    goal_dollars: (goal / 100).toFixed(2),
  });
}
