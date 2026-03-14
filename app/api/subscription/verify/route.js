import { NextResponse } from 'next/server';
import { createSubscriptionToken } from '../../../../lib/subscription.js';

export async function POST(req) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 400 });
  }

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);
    const { session_id, email } = await req.json();

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Accept complete subscription checkout sessions
    if (session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const customerEmail = session.customer_email
      || email
      || session.metadata?.email
      || 'unknown';

    const token      = createSubscriptionToken(customerEmail);
    const expiresAt  = Date.now() + 366 * 24 * 60 * 60 * 1000;

    return NextResponse.json({ token, email: customerEmail, expires_at: expiresAt });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
