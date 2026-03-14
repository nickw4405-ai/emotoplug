'use client';
import { useState } from 'react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
      }
    } catch {
      setError('Connection error — try again');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #0d0d0d)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: 'var(--surface, #1a1a1a)',
        border: '1px solid var(--border, #2a2a2a)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '380px',
      }}>
        <h1 style={{ color: 'var(--text, #fff)', fontSize: '1.4rem', marginBottom: '8px' }}>
          Owner Sign In
        </h1>
        <p style={{ color: 'var(--muted, #888)', fontSize: '0.85rem', marginBottom: '28px' }}>
          emotoplug dashboard
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              background: 'var(--surface2, #222)',
              border: '1px solid var(--border, #2a2a2a)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: 'var(--text, #fff)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              background: 'var(--surface2, #222)',
              border: '1px solid var(--border, #2a2a2a)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: 'var(--text, #fff)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--accent, #7c5cfc)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--muted, #888)', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Back to site
          </a>
        </p>
      </div>
    </div>
  );
}
