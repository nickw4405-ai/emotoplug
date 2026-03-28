import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '../../../../lib/kv.js';
import { createSubscriptionToken } from '../../../../lib/subscription.js';

export async function POST(req) {
  const { email, name, discount_code } = await req.json().catch(() => ({}));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emotoplug.com';

  // ── Validate discount code ───────────────────────────────────────────────
  let discountPct = 0;
  if (discount_code) {
    const raw      = await kvGet(`disc:${discount_code}`);
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

  // ── Stripe checkout via direct fetch (no SDK) ────────────────────────────
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 400 });
  }

  try {
    const baseAmount       = 2100; // $21.00 in cents
    const discountedAmount = Math.round(baseAmount * (1 - discountPct / 100));
    const productName      = discountPct > 0
      ? `emotoplug Lifetime Access (${discountPct}% off)`
      : 'emotoplug Lifetime Access';
    const successUrl = `${baseUrl}/?subscribed={CHECKOUT_SESSION_ID}&sub_email=${encodeURIComponent(email || '')}`;

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('payment_method_types[]', 'card');
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(discountedAmount));
    params.set('line_items[0][price_data][product_data][name]', productName);
    params.set('line_items[0][price_data][product_data][description]', 'Unlimited searches — one-time payment');
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', successUrl);
    params.set('cancel_url', `${baseUrl}/`);
    if (email) params.set('customer_email', email);
    if (email) params.set('metadata[email]', email);
    if (name)  params.set('metadata[name]', name);
    if (discount_code) params.set('metadata[discount_code]', discount_code);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return NextResponse.json({ error: session.error?.message || 'Stripe error' }, { status: 500 });
    }

    // Mark one-time codes as used after session created
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
