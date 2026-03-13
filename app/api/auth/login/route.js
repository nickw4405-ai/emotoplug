import { NextResponse } from 'next/server';
import { checkPassword, hashPassword, createToken, sessionCookie } from '../../../../lib/auth.js';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const ownerUsername = process.env.OWNER_USERNAME || 'ownernicolas';
    const ownerEmail    = process.env.OWNER_EMAIL    || 'nickw4405@icloud.com';
    const ownerHash     = process.env.OWNER_PASSWORD_HASH;

    // Match by username OR email
    const usernameMatch = username?.toLowerCase() === ownerUsername.toLowerCase()
                       || username?.toLowerCase() === ownerEmail.toLowerCase();

    // Verify password
    const passwordOk = ownerHash
      ? checkPassword(password, ownerHash)
      : hashPassword(password) === hashPassword('nicolasfirstsuccesfulcompany'); // fallback

    if (!usernameMatch || !passwordOk) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createToken({ role: 'owner', username: ownerUsername, email: ownerEmail });
    const res   = NextResponse.json({ ok: true, redirect: '/admin' });
    res.headers.set('Set-Cookie', sessionCookie(token));
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
