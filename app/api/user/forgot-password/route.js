import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';
import crypto from 'crypto';

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400 });

  const key      = `acct:${email.toLowerCase().trim()}`;
  const existing = await kvGet(key);

  // Always return the same response — never reveal if email exists
  if (!existing) return NextResponse.json({ ok: true });

  // Generate a secure one-time reset token valid for 1 hour
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await kvSet(`reset:${token}`, { email: email.toLowerCase().trim(), expiresAt });

  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL || 'https://emotoplug.com';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // Send via Resend if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      // Use onboarding@resend.dev until emotoplug.com domain is verified in Resend
      const fromAddr = process.env.RESEND_FROM || 'onboarding@resend.dev';
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    fromAddr,
          to:      [email],
          subject: 'Reset your emotoplug password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:16px">
              <h2 style="margin:0 0 8px">Reset your password</h2>
              <p style="color:#888;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#00e5ff,#0099cc);color:#000;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none">
                Reset Password →
              </a>
              <p style="color:#555;font-size:12px;margin-top:24px">If you didn't request this, ignore this email — your password won't change.</p>
            </div>`,
        }),
      });

      if (res.ok) {
        return NextResponse.json({ ok: true }); // email sent — don't expose resetUrl
      }
      // Email failed — fall through to show link as fallback
    } catch { /* fall through */ }
  }

  // Resend not configured or failed — return link directly
  return NextResponse.json({ ok: true, resetUrl });
}
