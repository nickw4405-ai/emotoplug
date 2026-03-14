import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { kvIncr, kvSAdd, kvSMem } from '../../../../lib/kv.js';

/**
 * CPX Research postback — called server-to-server when a user completes a survey.
 * Configure in CPX Research dashboard as:
 *   https://emotoplug.com/api/survey/postback?trans_id={trans_id}&ext_user_id={user_id}&reward={amount_usd}&amount_local={amount_local}&hash={secure_hash}
 *
 * `reward` = {amount_usd} in USD decimal (e.g. "0.75") → converted to cents for credits
 * CPX hash = md5(trans_id + '-' + security_token)
 * CPX expects a plain "1" response with HTTP 200 on success.
 */
export async function GET(req) {
  const p = Object.fromEntries(req.nextUrl.searchParams);
  const { trans_id, ext_user_id, reward, hash } = p;

  if (!trans_id || !ext_user_id || reward === undefined) {
    return new Response('0', { status: 400 });
  }

  const secToken = process.env.CPX_SECURITY_TOKEN;

  // Verify hash signature: CPX sends md5(trans_id + '-' + security_token)
  if (secToken && hash) {
    const expected = crypto
      .createHash('md5')
      .update(trans_id + '-' + secToken)
      .digest('hex');
    if (hash !== expected) {
      console.error('[survey/postback] Hash mismatch', { trans_id });
      return new Response('0', { status: 403 });
    }
  }

  // reward is {amount_usd} — a USD decimal like "0.75" → convert to cents
  const credits = Math.round(parseFloat(reward) * 100) || 0;
  if (credits <= 0) return new Response('1', { status: 200 });

  const sessionId = ext_user_id;

  // Dedup: skip if this trans_id was already credited
  const alreadyCredited = await kvSMem(`svs:txns:${sessionId}`, trans_id);
  if (alreadyCredited) return new Response('1', { status: 200 });

  // Record transaction + add credits
  await kvSAdd(`svs:txns:${sessionId}`, trans_id);
  await kvIncr(`svs:credits:${sessionId}`, credits);

  console.log(`[survey] +${credits} credits → session ${sessionId}`);
  return new Response('1', { status: 200 }); // CPX expects "1"
}
