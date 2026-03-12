import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });

  try {
    const stripe = new Stripe(secretKey);
    const { session_id = '' } = await req.json();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        direct_url: session.metadata?.direct_url || '',
        mod_title:  session.metadata?.mod_title  || '',
      });
    }
    return NextResponse.json({ error: 'Not paid' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
