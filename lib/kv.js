/**
 * Vercel KV (Upstash Redis) REST wrapper.
 * Set env vars in Vercel: Storage → Create KV → Connect to project.
 * Env vars auto-added: KV_REST_API_URL, KV_REST_API_TOKEN
 */

async function kv(cmd, ...args) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null; // KV not configured — ops silently no-op
  try {
    const r = await fetch(url, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify([cmd, ...args.map(String)]),
    });
    const { result } = await r.json();
    return result ?? null;
  } catch { return null; }
}

export const kvGet  = (k)       => kv('GET', k);
export const kvSet  = (k, v)    => kv('SET', k, typeof v === 'string' ? v : JSON.stringify(v));
export const kvIncr = (k, n)    => kv('INCRBYFLOAT', k, n);
export const kvSAdd = (k, m)    => kv('SADD', k, m);
export const kvSMem = (k, m)    => kv('SISMEMBER', k, m);
export const kvDel  = (k)       => kv('DEL', k);
