import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth.js';

export async function GET(req) {
  const token   = getTokenFromRequest(req);
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, username: payload.username, email: payload.email });
}
