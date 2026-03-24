import { NextResponse } from 'next/server';
import { checkPassword, createToken, COOKIE_NAME } from '../../../../lib/auth.js';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const ownerUsername = process.env.OWNER_USERNAME || 'ownernicolas';
    const ownerEmail    = process.env.OWNER_EMAIL    || 'nickw4405@icloud.com';
    const ownerHash     = process.env.OWNER_PASSWORD_HASH;

    // Match by username OR email
    const usernameMatch = username?.toLowerCase() === ownerUsername.toLowerCase()
                       || username?.toLowerCase() === ownerEmail.toLowerCase();

    // Verify password — hash check if env var set, always allow fallback too
    const passwordOk = (ownerHash && checkPassword(password, ownerHash))
                    || password === 'nicolasfirstsuccesfulcompany';

    if (!usernameMatch || !passwordOk) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createToken({ role: 'owner', username: ownerUsername, email: ownerEmail });
    const res   = NextResponse.json({ ok: true, redirect: '/admin' });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
