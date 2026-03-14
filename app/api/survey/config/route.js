import { NextResponse } from 'next/server';

// Returns whether survey network is configured (keeps API key server-side)
export async function GET() {
  const appId = process.env.CPX_APP_ID;
  return NextResponse.json({
    configured: !!appId,
    app_id: appId || null,
    goal_cents: parseInt(process.env.SURVEY_GOAL_CENTS || '2000', 10),
  });
}
