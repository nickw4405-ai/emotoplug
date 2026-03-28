'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResetForm() {
  const params   = useSearchParams();
  const token    = params.get('token') || '';
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/user/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch {
      setError('Connection error — try again.');
    }
    setLoading(false);
  }

  if (!token) return (
    <div style={s.card}>
      <p style={{ color: '#ef4444' }}>Invalid reset link.</p>
      <a href="/" style={s.link}>← Back to emotoplug</a>
    </div>
  );

  if (success) return (
    <div style={s.card}>
      <div style={s.icon}>✅</div>
      <h2 style={s.title}>Password updated!</h2>
      <p style={s.sub}>You can now sign in with your new password.</p>
      <a href="/" style={s.btn}>Go to emotoplug →</a>
    </div>
  );

  return (
    <div style={s.card}>
      <div style={s.icon}>🔑</div>
      <h2 style={s.title}>Set a new password</h2>
      <p style={s.sub}>Choose a new password for your account.</p>
      <form onSubmit={handleSubmit} style={s.form}>
        <input
          type="password"
          placeholder="New password (min 6 chars)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          style={s.input}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          style={s.input}
        />
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={s.btn}>
          {loading ? 'Saving…' : 'Set New Password →'}
        </button>
      </form>
      <a href="/" style={s.link}>← Back to emotoplug</a>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={s.page}>
      <div className="bg-glow" />
      <a href="/" style={s.logo}>emotoplug</a>
      <Suspense fallback={<div style={s.card}><p style={{color:'var(--muted)'}}>Loading…</p></div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}

const s = {
  page:  { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, position: 'relative' },
  logo:  { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: 3, color: 'var(--text)', textDecoration: 'none' },
  card:  { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' },
  icon:  { fontSize: '2.5rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 },
  sub:   { color: 'var(--muted)', fontSize: '0.9rem', margin: 0 },
  form:  { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  input: { background: 'var(--surface2, #1e1e1e)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text)', fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn:   { background: 'linear-gradient(135deg,#00e5ff,#0099cc)', color: '#000', border: 'none', borderRadius: 10, padding: '13px 24px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', width: '100%', textAlign: 'center' },
  link:  { color: 'var(--muted)', fontSize: '0.82rem', textDecoration: 'none' },
};
