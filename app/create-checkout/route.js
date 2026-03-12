import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });

  try {
    const stripe = new Stripe(secretKey);
    const d = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emotoplug.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Best Price Link: ${d.mod_title || 'Mod'}`,
            description: `Save ~$${d.savings || 0} — direct cheapest link`,
          },
          unit_amount: parseInt(d.price_cents || 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/?unlocked={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/`,
      metadata: { direct_url: d.direct_url || '', mod_title: d.mod_title || '' },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
