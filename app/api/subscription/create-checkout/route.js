import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';
import { createSubscriptionToken } from '../../../../lib/subscription.js';

export async function POST(req) {
  const { email, name, discount_code } = await req.json().catch(() => ({}));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emotoplug.com';

  // ── Validate discount code if provided ──────────────────────────────────
  let discountPct = 0;
  if (discount_code) {
    const raw = await kvGet(`disc:${discount_code}`);
    const codeData = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

    if (!codeData || (codeData.oneTime !== false && codeData.used)) {
      return NextResponse.json({ error: 'invalid_code', message: 'Code is invalid or already used.' }, { status: 400 });
    }

    discountPct = codeData.pct || 0;

    // 100% off → give free token directly (no Stripe needed)
    if (discountPct >= 100) {
      const subEmail = email || `code-${discount_code}@emotoplug.local`;
      const token    = createSubscriptionToken(subEmail);
      const exp      = Date.now() + 366 * 24 * 60 * 60 * 1000;
      if (codeData.oneTime !== false) await kvSet(`disc:${discount_code}`, { ...codeData, used: true });
      return NextResponse.json({ type: 'free_access', token, expires_at: exp });
    }
  }

  // ── Stripe checkout ──────────────────────────────────────────────────────
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 400 });
  }

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);

    const baseAmount      = 2100; // $21.00 in cents
    const discountedAmount = Math.round(baseAmount * (1 - discountPct / 100));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency:   'usd',
          unit_amount: discountedAmount,
          product_data: {
            name:        discountPct > 0
              ? `emotoplug Lifetime Access (${discountPct}% off)`
              : 'emotoplug Lifetime Access',
            description: 'Unlimited searches — one-time payment',
          },
        },
        quantity: 1,
      }],
      mode:        'payment',
      success_url: `${baseUrl}/?subscribed={CHECKOUT_SESSION_ID}&sub_email=${encodeURIComponent(email || '')}`,
      cancel_url:  `${baseUrl}/`,
      metadata:    { email: email || '', name: name || '', discount_code: discount_code || '' },
    });

    // Mark one-time codes as used after Stripe session created
    if (discount_code && discountPct > 0) {
      const raw2 = await kvGet(`disc:${discount_code}`);
      const cd2  = raw2 ? (typeof raw2 === 'string' ? JSON.parse(raw2) : raw2) : {};
      if (cd2.oneTime !== false) await kvSet(`disc:${discount_code}`, { ...cd2, used: true });
    }

    return NextResponse.json({ checkout_url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
