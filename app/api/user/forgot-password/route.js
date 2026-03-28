import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';
import crypto from 'crypto';

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400 });

  const key = `acct:${email.toLowerCase().trim()}`;
  const existing = await kvGet(key);
  if (!existing) {
    // Don't reveal whether the email exists — same response either way
    return NextResponse.json({ ok: true });
  }

  // Generate a secure one-time reset token valid for 1 hour
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await kvSet(`reset:${token}`, { email: email.toLowerCase().trim(), expiresAt });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emotoplug.com';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  return NextResponse.json({ ok: true, resetUrl });
}
