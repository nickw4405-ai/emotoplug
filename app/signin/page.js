'use client';
import { useState } from 'react';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-glow" />
      <div style={styles.wrap}>
        <div style={styles.card}>
          {/* Logo */}
          <a href="/" style={styles.logoLink}>
            <span className="logo-text" style={styles.logo}>emotoplug</span>
          </a>

          <h1 style={styles.title}>Owner Sign In</h1>
          <p style={styles.sub}>Access your private dashboard</p>

          <form onSubmit={handleSubmit} style={styles.form} autoComplete="on">
            <div style={styles.field}>
              <label style={styles.label} htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={styles.input}
                placeholder="ownernicolas"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••••••"
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={styles.back}>
            <a href="/" style={styles.backLink}>← Back to emotoplug</a>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
    textAlign: 'center',
  },
  logoLink: { textDecoration: 'none' },
  logo: {
    display: 'block',
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '6px',
  },
  sub: {
    color: 'var(--muted)',
    fontSize: '0.9rem',
    marginBottom: '28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    textAlign: 'left',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--muted)',
    fontWeight: 500,
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'var(--text)',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
  },
  error: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: '0.88rem',
    textAlign: 'center',
  },
  btn: {
    background: 'linear-gradient(135deg, #00e5ff, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'opacity 0.2s',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  back: {
    marginTop: '24px',
    fontSize: '0.85rem',
  },
  backLink: {
    color: 'var(--muted)',
  },
};
