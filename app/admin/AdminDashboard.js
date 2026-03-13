'use client';
import { useState, useEffect, useCallback } from 'react';

export default function AdminDashboard({ user }) {
  const [stats,  setStats]  = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/'; return; }
      const data = await res.json();
      setStats(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 30_000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  }

  const stripe  = stats?.stripeStats;
  const stripeOk = stats?.stripeEnabled && stripe && !stripe.error;

  return (
    <>
      <div className="bg-glow" />
      <div style={s.page}>

        {/* Header */}
        <header style={s.header}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span className="logo-text" style={s.logo}>emotoplug</span>
          </a>
          <div style={s.headerRight}>
            <span style={s.welcome}>👋 Nicolas Wilson</span>
            <button onClick={logout} style={s.logoutBtn}>Sign Out</button>
          </div>
        </header>

        <main style={s.main}>
          <div style={s.titleRow}>
            <h1 style={s.pageTitle}>Owner Dashboard</h1>
            {lastUpdate && <span style={s.updated}>Updated: {lastUpdate}</span>}
          </div>

          {/* Live Stats */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>📊 Live Stats</h2>
            <div style={s.grid}>
              <StatCard icon="👥" label="Active Visitors"   value={stats ? String(stats.activeUsers) : '—'} sub="On site right now"             color="#00e5ff" />
              {stripeOk && <>
                <StatCard icon="💰" label="Total Earned"    value={`$${stripe.totalEarned}`} sub={`${stripe.totalSales} sales total`}  color="#22c55e" />
                <StatCard icon="🛍️" label="Today's Revenue" value={`$${stripe.todayEarned}`} sub={`${stripe.todaySales} sales today`}  color="#f59e0b" />
                <StatCard icon="🏦" label="Balance Ready"   value={`$${stripe.available}`}  sub={`$${stripe.pending} pending`}         color="#7c3aed" />
              </>}
              {!stats?.stripeEnabled && (
                <div style={{ ...s.infoCard, gridColumn: '1 / -1' }}>
                  <p style={{ color: 'var(--muted)' }}>💳 Add Stripe keys to see revenue stats.</p>
                </div>
              )}
              {stats?.stripeEnabled && stripe?.error && (
                <div style={{ ...s.infoCard, gridColumn: '1 / -1', borderColor: 'rgba(239,68,68,0.3)' }}>
                  <p style={{ color: '#ef4444' }}>⚠️ Stripe error: {stripe.error}</p>
                </div>
              )}
            </div>
          </section>

          {/* Payment Info */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>💳 Payment & Payout</h2>
            <div style={s.payCard}>
              <div style={s.payRow}>
                <div><p style={s.payLabel}>Name</p><p style={s.payValue}>Nicolas Wilson</p></div>
                <div><p style={s.payLabel}>Email</p><p style={s.payValue}>nickw4405@icloud.com</p></div>
              </div>
              <div style={s.divider} />
              <p style={s.payNote}>
                Stripe sends earnings directly to your connected bank account. Set up or update
                your bank details in the Stripe Dashboard below.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="https://dashboard.stripe.com/settings/payouts" target="_blank" rel="noopener noreferrer" style={s.stripeBtn}>
                  Payout Settings ↗
                </a>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={s.stripeBtnOutline}>
                  Stripe Dashboard ↗
                </a>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>🔗 Quick Links</h2>
            <div style={s.linkGrid}>
              <QuickLink href="https://dashboard.stripe.com/payments"  icon="💵" label="All Payments" />
              <QuickLink href="https://dashboard.stripe.com/customers" icon="👤" label="Customers" />
              <QuickLink href="https://vercel.com/dashboard"           icon="▲"  label="Vercel" />
              <QuickLink href="/"                                       icon="🏠" label="Live Site" />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ ...s.statCard, borderColor: color + '44' }}>
      <div style={{ ...s.statIcon, background: color + '22', color }}>{icon}</div>
      <p style={s.statLabel}>{label}</p>
      <p style={{ ...s.statValue, color }}>{value}</p>
      <p style={s.statSub}>{sub}</p>
    </div>
  );
}

function QuickLink({ href, icon, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={s.quickLink}>
      <span>{icon}</span> {label}
    </a>
  );
}

const s = {
  page:       { minHeight:'100vh', position:'relative', zIndex:1 },
  header:     { borderBottom:'1px solid var(--border)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, background:'rgba(4,8,15,0.8)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:50 },
  logo:       { fontSize:'1.6rem', letterSpacing:2 },
  headerRight:{ display:'flex', alignItems:'center', gap:16 },
  welcome:    { color:'var(--muted)', fontSize:'0.9rem' },
  logoutBtn:  { background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:'0.85rem' },
  main:       { maxWidth:1100, margin:'0 auto', padding:'32px 24px 64px' },
  titleRow:   { display:'flex', alignItems:'baseline', gap:16, marginBottom:32, flexWrap:'wrap' },
  pageTitle:  { fontSize:'1.8rem', fontWeight:700, color:'var(--text)' },
  updated:    { color:'var(--muted)', fontSize:'0.8rem' },
  section:    { marginBottom:36 },
  sectionTitle:{ fontSize:'1.1rem', fontWeight:600, color:'var(--text)', marginBottom:16 },
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16 },
  statCard:   { background:'var(--surface)', border:'1px solid', borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', gap:6 },
  statIcon:   { width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', marginBottom:6 },
  statLabel:  { color:'var(--muted)', fontSize:'0.82rem' },
  statValue:  { fontSize:'1.7rem', fontWeight:700, lineHeight:1.1 },
  statSub:    { color:'var(--muted)', fontSize:'0.78rem' },
  infoCard:   { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:20 },
  payCard:    { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:16 },
  payRow:     { display:'flex', gap:40, flexWrap:'wrap' },
  payLabel:   { color:'var(--muted)', fontSize:'0.8rem', marginBottom:4 },
  payValue:   { color:'var(--text)', fontWeight:600 },
  divider:    { height:1, background:'var(--border)' },
  payNote:    { color:'var(--muted)', fontSize:'0.88rem', lineHeight:1.6 },
  stripeBtn:  { display:'inline-block', background:'linear-gradient(135deg,#635bff,#4f46e5)', color:'#fff', padding:'10px 20px', borderRadius:10, fontSize:'0.9rem', fontWeight:600, textDecoration:'none' },
  stripeBtnOutline:{ display:'inline-block', border:'1px solid var(--border)', color:'var(--muted)', padding:'10px 20px', borderRadius:10, fontSize:'0.9rem', textDecoration:'none' },
  linkGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 },
  quickLink:  { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', color:'var(--text)', textDecoration:'none', display:'flex', alignItems:'center', gap:10, fontSize:'0.9rem', fontWeight:500 },
};
