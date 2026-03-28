import { NextResponse } from 'next/server';
import { kvSet } from '../../../../lib/kv.js';
import { createSubscriptionToken } from '../../../../lib/subscription.js';

// Stripe calls this endpoint when a payment completes.
// We verify the signature locally (no outbound Stripe call needed),
// then store the access token in KV so /verify can look it up.
export async function POST(req) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey     = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 400 });
  }

  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);

    // constructEvent is pure local HMAC — no outbound network call
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email   = session.customer_email
        || session.metadata?.email
        || 'unknown';

      const token     = createSubscriptionToken(email);
      const expiresAt = Date.now() + 366 * 24 * 60 * 60 * 1000;

      await kvSet(`sub_session:${session.id}`, { token, email, expires_at: expiresAt });
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
