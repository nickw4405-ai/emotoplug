'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function AdminDashboard({ user }) {
  const [stats,      setStats]      = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [period,     setPeriod]     = useState('week');
  const [discPct,    setDiscPct]    = useState('');
  const [oneTime,    setOneTime]    = useState(true);
  const [discResult, setDiscResult] = useState(null);
  const [discErr,    setDiscErr]    = useState('');
  const [discLoading,setDiscLoading]= useState(false);
  const [copied,     setCopied]     = useState(false);

  async function generateCode() {
    setDiscErr('');
    setDiscResult(null);
    const pctNum = Number(discPct);
    if (!pctNum || pctNum < 1 || pctNum > 100) {
      setDiscErr('Enter a percentage between 1 and 100.');
      return;
    }
    setDiscLoading(true);
    try {
      const res  = await fetch('/api/admin/discount', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pct: pctNum, oneTime }),
      });
      const data = await res.json();
      if (data.code) setDiscResult(data);
      else setDiscErr(data.error || 'Failed to generate code.');
    } catch {
      setDiscErr('Network error — try again.');
    }
    setDiscLoading(false);
  }

  async function copyCode() {
    if (!discResult?.code) return;
    await navigator.clipboard.writeText(discResult.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

          {/* Performance Chart */}
          <section style={s.section}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <h2 style={{ ...s.sectionTitle, margin:0 }}>📊 Performance</h2>
              <div style={s.tabs}>
                {[['day','Today'],['week','Week'],['month','Month'],['allTime','All Time']].map(([key,label]) => (
                  <button key={key} onClick={() => setPeriod(key)}
                    style={period === key ? s.tabActive : s.tabInactive}>{label}</button>
                ))}
              </div>
            </div>
            <div style={s.chartCard}>
              {/* Summary numbers */}
              <div style={s.chartSummary}>
                <div style={s.chartMetric}>
                  <span style={{ ...s.chartMetricVal, color:'#00e5ff' }}>
                    {stats?.totals?.[period]?.visitors?.toLocaleString() ?? '—'}
                  </span>
                  <span style={s.chartMetricLabel}>
                    <span style={{ display:'inline-block', width:10, height:10, background:'#00e5ff', borderRadius:2, marginRight:5 }}/>
                    Visitors
                  </span>
                </div>
                <div style={s.chartMetric}>
                  <span style={{ ...s.chartMetricVal, color:'#22c55e' }}>
                    {stats?.totals?.[period]?.revenue != null
                      ? `$${stats.totals[period].revenue.toFixed(2)}`
                      : <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer" style={{ color:'#22c55e', fontSize:'0.85rem' }}>View Stripe ↗</a>}
                  </span>
                  <span style={s.chartMetricLabel}>
                    <span style={{ display:'inline-block', width:10, height:10, background:'#22c55e', borderRadius:2, marginRight:5 }}/>
                    Revenue
                  </span>
                </div>
                <div style={s.chartMetric}>
                  <span style={{ ...s.chartMetricVal, color:'#a78bfa', fontSize:'1.1rem' }}>
                    {stats?.activeUsers ?? '—'}
                  </span>
                  <span style={s.chartMetricLabel}>🟢 Live now</span>
                </div>
              </div>
              {/* Bar chart */}
              {period === 'day'
                ? <p style={{ color:'var(--muted)', fontSize:'0.85rem', textAlign:'center', padding:'24px 0' }}>Switch to Week or Month to see the chart</p>
                : <BarChart data={stats?.chart?.[period]} />
              }
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

          {/* Discount Codes */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>🎟️ Discount Codes</h2>
            <div style={s.discCard}>
              <div style={s.discRow}>
                <input
                  type="number"
                  min="1" max="100"
                  placeholder="% off (e.g. 50)"
                  value={discPct}
                  onChange={e => { setDiscPct(e.target.value); setDiscResult(null); setDiscErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && generateCode()}
                  style={s.discInput}
                />
                <span style={{ color: 'var(--muted)', fontSize: '1rem' }}>%</span>
                <label style={s.discToggleLabel}>
                  <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={e => setOneTime(e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  One-time use
                </label>
                <button onClick={generateCode} disabled={discLoading} style={s.discGenBtn}>
                  {discLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>

              {discErr && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{discErr}</p>}

              {discResult && (
                <div style={s.discResultRow}>
                  <span style={s.discCode}>{discResult.code}</span>
                  <span style={s.discMeta}>{discResult.pct}% off · {discResult.oneTime ? 'one-time' : 'reusable'}</span>
                  <button onClick={copyCode} style={s.discCopyBtn}>
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button onClick={generateCode} style={s.discRegenBtn} title="Generate another">↺ New</button>
                </div>
              )}
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

function BarChart({ data }) {
  if (!data?.labels?.length) return <p style={{ color:'var(--muted)', fontSize:'0.85rem', textAlign:'center', padding:'24px 0' }}>No data yet — visits will appear here</p>;
  const { labels, visitors, revenue } = data;
  const n = labels.length;
  const maxVis = Math.max(...visitors, 1);
  const maxRev = Math.max(...revenue, 0.01);
  // Fixed viewBox width — bars scale to fit
  const W = 600, chartH = 110, padX = 8;
  const groupW = (W - padX * 2) / n;
  const barW   = Math.max(groupW * 0.38, 1);
  const gap    = Math.max(groupW * 0.06, 0.5);

  return (
    <div style={{ marginTop:16 }}>
      <svg viewBox={`0 0 ${W} ${chartH + 20}`} style={{ width:'100%', display:'block' }}>
        {labels.map((lbl, i) => {
          const x = padX + i * groupW;
          const visH = Math.max((visitors[i] / maxVis) * chartH, visitors[i] > 0 ? 2 : 0);
          const revH = Math.max((revenue[i] / maxRev) * chartH, revenue[i] > 0 ? 2 : 0);
          const showLbl = n <= 12 || i % Math.ceil(n / 8) === 0;
          return (
            <g key={i}>
              <rect x={x}               y={chartH - visH} width={barW} height={visH} fill="#00e5ff" fillOpacity={0.85} rx={1} />
              <rect x={x + barW + gap}  y={chartH - revH} width={barW} height={revH} fill="#22c55e" fillOpacity={0.85} rx={1} />
              {showLbl && <text x={x + barW} y={chartH + 14} textAnchor="middle" fontSize={8} fill="#555">{lbl}</text>}
            </g>
          );
        })}
        <line x1={padX} y1={chartH} x2={W - padX} y2={chartH} stroke="#333" strokeWidth={1} />
      </svg>
    </div>
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
  page:          { minHeight:'100vh', position:'relative', zIndex:1 },
  header:        { borderBottom:'1px solid var(--border)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, background:'rgba(4,8,15,0.8)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:50 },
  logo:          { fontSize:'1.6rem', letterSpacing:2 },
  headerRight:   { display:'flex', alignItems:'center', gap:16 },
  welcome:       { color:'var(--muted)', fontSize:'0.9rem' },
  logoutBtn:     { background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:'0.85rem' },
  main:          { maxWidth:1100, margin:'0 auto', padding:'32px 24px 64px' },
  titleRow:      { display:'flex', alignItems:'baseline', gap:16, marginBottom:32, flexWrap:'wrap' },
  pageTitle:     { fontSize:'1.8rem', fontWeight:700, color:'var(--text)' },
  updated:       { color:'var(--muted)', fontSize:'0.8rem' },
  section:       { marginBottom:36 },
  sectionTitle:  { fontSize:'1.1rem', fontWeight:600, color:'var(--text)', marginBottom:16 },
  grid:          { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16 },
  statCard:      { background:'var(--surface)', border:'1px solid', borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', gap:6 },
  statIcon:      { width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', marginBottom:6 },
  statLabel:     { color:'var(--muted)', fontSize:'0.82rem' },
  statValue:     { fontSize:'1.7rem', fontWeight:700, lineHeight:1.1 },
  statSub:       { color:'var(--muted)', fontSize:'0.78rem' },
  infoCard:      { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:20 },
  payCard:       { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:16 },
  payRow:        { display:'flex', gap:40, flexWrap:'wrap' },
  payLabel:      { color:'var(--muted)', fontSize:'0.8rem', marginBottom:4 },
  payValue:      { color:'var(--text)', fontWeight:600 },
  divider:       { height:1, background:'var(--border)' },
  payNote:       { color:'var(--muted)', fontSize:'0.88rem', lineHeight:1.6 },
  stripeBtn:     { display:'inline-block', background:'linear-gradient(135deg,#635bff,#4f46e5)', color:'#fff', padding:'10px 20px', borderRadius:10, fontSize:'0.9rem', fontWeight:600, textDecoration:'none' },
  stripeBtnOutline:{ display:'inline-block', border:'1px solid var(--border)', color:'var(--muted)', padding:'10px 20px', borderRadius:10, fontSize:'0.9rem', textDecoration:'none' },
  linkGrid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 },
  quickLink:     { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', color:'var(--text)', textDecoration:'none', display:'flex', alignItems:'center', gap:10, fontSize:'0.9rem', fontWeight:500 },
  discCard:      { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:16 },
  discRow:       { display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' },
  tabs:          { display:'flex', gap:4, background:'var(--surface)', borderRadius:10, padding:4, border:'1px solid var(--border)' },
  tabActive:     { background:'var(--accent,#00e5ff)', color:'#000', border:'none', borderRadius:7, padding:'5px 14px', cursor:'pointer', fontSize:'0.82rem', fontWeight:700 },
  tabInactive:   { background:'transparent', color:'var(--muted)', border:'none', borderRadius:7, padding:'5px 14px', cursor:'pointer', fontSize:'0.82rem' },
  chartCard:     { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 24px' },
  chartSummary:  { display:'flex', gap:32, flexWrap:'wrap', marginBottom:8 },
  chartMetric:   { display:'flex', flexDirection:'column', gap:4 },
  chartMetricVal:{ fontSize:'1.8rem', fontWeight:700, lineHeight:1 },
  chartMetricLabel:{ color:'var(--muted)', fontSize:'0.78rem', display:'flex', alignItems:'center' },
  discInput:     { background:'var(--surface2,#1e1e1e)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', color:'var(--text)', fontSize:'1rem', width:110, outline:'none' },
  discToggleLabel:{ display:'flex', alignItems:'center', color:'var(--muted)', fontSize:'0.88rem', cursor:'pointer', userSelect:'none' },
  discGenBtn:    { background:'linear-gradient(135deg,#00e5ff,#0099cc)', border:'none', color:'#000', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontSize:'0.9rem', fontWeight:700 },
  discResultRow: { display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', background:'rgba(0,229,255,0.06)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:12, padding:'14px 18px' },
  discCode:      { fontFamily:'monospace', fontSize:'1.3rem', fontWeight:700, color:'#00e5ff', letterSpacing:3 },
  discMeta:      { color:'var(--muted)', fontSize:'0.82rem' },
  discCopyBtn:   { background:'transparent', border:'1px solid var(--border)', color:'var(--text)', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:'0.85rem' },
  discRegenBtn:  { background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:'0.85rem' },
};
