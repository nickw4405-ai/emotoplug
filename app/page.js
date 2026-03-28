import { TRENDING, CATEGORIES } from '../lib/mods-db.js';

const TREND_TAGS = [
  'Ultra Bee Brakes','Guts Seat Cover','Supermoto Tires','Baja Lights',
  'Titanium Bolt Set','Colored Titanium Bolts','Battery Pack','Front License Plate',
];

export default function Page() {
  const trending = TRENDING.slice(0, 8);

  return (
    <>
      <div className="bg-glow"></div>


      {/* ── HEADER ── */}
      <header>
        <div className="header-inner">
          <div className="logo"><span className="logo-text">emotoplug</span></div>
          <div className="header-auth">
            <span id="header-user-name" className="header-user-name hidden"></span>
            <button className="btn btn-outline btn-sm" id="btn-signin-header">Sign In</button>
            <button className="btn btn-primary btn-sm hidden" id="btn-register-header">Create Account</button>
            <button className="btn btn-outline btn-sm hidden" id="btn-manage-sub-header">Manage</button>
            <button className="btn btn-ghost btn-sm hidden" id="btn-signout-header">Sign Out</button>
          </div>
        </div>
      </header>

      {/* ── HERO SEARCH ── */}
      <section className="hero">
        <h1>Find the Best Ebike Mods<br /><span className="accent">Top Quality. Way Less.</span></h1>
        <p className="hero-sub">100+ community-loved mods — titanium bolts, Magura brakes, Bafang motors &amp; more, all at the best prices</p>
        <div className="search-wrap">
          <div className="search-bar" id="main-search-bar">
            <span className="search-icon">🔍</span>
            <input id="search-input" type="text" placeholder="Search top-rated mods at unbeatable prices…" autoComplete="off" />
            <button className="btn btn-primary" id="btn-search">Search</button>
          </div>
          <div className="trending-tags">
            <span className="tag-label">🔥 Trending:</span>
            {TREND_TAGS.map(tag => (
              <button key={tag} className="trend-tag" data-q={tag}>{tag}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN ── */}
      <main>

        {/* ── FIND MODS FOR YOUR BIKE ── */}
        <section className="card finder-card" id="finder-section">
          <h2>🎯 Find the Best Mods for YOUR Bike</h2>
          <p className="section-sub">Upload a photo or type your bike — AI finds the top community-loved upgrades at the best prices</p>
          <div className="finder-tabs">
            <button className="finder-tab active" data-tab="photo">📷 Upload Photo</button>
            <button className="finder-tab" data-tab="text">⌨️ Type Bike Name</button>
          </div>

          {/* Photo tab */}
          <div id="tab-photo" className="finder-tab-content">
            <div id="drop-zone" className="drop-zone">
              <div id="drop-inner">
                <div className="drop-icon">📸</div>
                <p>Drop photo here or</p>
                <div className="upload-btns">
                  <button className="btn btn-primary" id="btn-upload">📁 Upload Photo</button>
                  <button className="btn btn-secondary" id="btn-camera">📷 Camera</button>
                </div>
                <p className="hint">JPG · PNG · WEBP · Max 10MB</p>
              </div>
              <div id="preview-wrap" className="hidden">
                <img id="preview-img" src="" alt="preview" />
                <div className="preview-btns">
                  <button className="btn btn-outline btn-sm" id="btn-change">Change</button>
                  <button className="btn btn-primary" id="btn-analyze-photo">🔍 Find My Mods</button>
                </div>
              </div>
            </div>
            <input type="file" id="file-input" accept="image/*" className="hidden" />
          </div>

          {/* Text tab */}
          <div id="tab-text" className="finder-tab-content hidden">
            <div className="text-finder">
              <input id="bike-text-input" type="text" placeholder="e.g. Rad Power Bikes RadRover 6, Trek Rail 9, Aventon Pace 500…" autoComplete="off" />
              <p className="hint">Spell it however — we&apos;ll figure it out ✓</p>
              <button className="btn btn-primary" id="btn-analyze-text">🔍 Find My Mods</button>
            </div>
          </div>
        </section>

        {/* Finder loading */}
        <section id="finder-loading" className="card hidden">
          <div className="loading-content">
            <div className="spinner"></div>
            <h3 id="finder-loading-title">Identifying your bike…</h3>
            <div className="loading-steps">
              <div className="step" id="fs1"><span>🔎</span><span>Identifying brand &amp; model</span><span id="fs1s" className="step-status">…</span></div>
              <div className="step" id="fs2"><span>🛠️</span><span>Finding specific mods</span><span id="fs2s" className="step-status"></span></div>
              <div className="step" id="fs3"><span>💰</span><span>Calculating your savings</span><span id="fs3s" className="step-status"></span></div>
            </div>
          </div>
        </section>

        {/* Finder results */}
        <section id="finder-results" className="hidden">
          <div className="ebike-id-card card">
            <img id="finder-img" src="" alt="" className="ebike-thumb" />
            <div className="ebike-id-info">
              <div className="id-badge">✓ Identified</div>
              <h2 id="finder-bike-name"></h2>
              <div id="finder-meta" className="meta-tags"></div>
              <div id="spell-note" className="spell-note hidden"></div>
            </div>
          </div>

          {/* What are you looking for? */}
          <div id="bike-query-section" className="card" style={{marginTop:'16px'}}>
            <h3 style={{marginBottom:'6px'}}>🎯 What are you looking for?</h3>
            <p className="section-sub" style={{margin:'-2px 0 16px'}}>Pick a category or search — we&apos;ll find the best mods for your <span id="query-bike-name" style={{color:'var(--accent)',fontWeight:700}}></span></p>
            <div className="query-chips">
              {[
                ['Ultra Bee Brakes','🛑'],['battery pack upgrade','⚡'],['titanium bolt set','🔩'],
                ['colored titanium bolts','🌈'],['Guts Racing seat cover','🪑'],['front license plate bracket','🪪'],
                ['supermoto tires','🏎️'],['Baja Designs lights','💡'],['handlebars','🏍️'],['suspension','🔗'],
              ].map(([q, icon]) => (
                <button key={q} className="query-chip" data-q={q}>{icon} {q.charAt(0).toUpperCase()+q.slice(1)}</button>
              ))}
            </div>
            <div className="search-bar" style={{marginTop:'14px'}}>
              <span className="search-icon">🔍</span>
              <input id="bike-mod-query" type="text" placeholder="Or type what you're looking for…" autoComplete="off" />
              <button className="btn btn-primary" id="btn-bike-mod-search">Find</button>
            </div>
            <div style={{textAlign:'center',marginTop:'14px'}}>
              <button className="btn btn-outline btn-sm" id="btn-show-all-mods">Show All Recommended Mods</button>
            </div>
          </div>

          {/* Mods loading */}
          <div id="finder-mods-loading" className="hidden" style={{textAlign:'center',padding:'32px'}}>
            <div className="spinner" style={{margin:'0 auto'}}></div>
            <p style={{marginTop:'12px',color:'var(--muted)'}}>Finding the best mods for your bike…</p>
          </div>

          {/* Mods grid */}
          <div id="finder-mods-section" className="hidden">
            <div className="section-header" style={{marginTop:'24px'}}>
              <h2 id="finder-mods-title">Best Mods for Your Bike</h2>
              <select id="finder-sort">
                <option value="default">Recommended</option>
                <option value="savings">Biggest Savings</option>
                <option value="price-low">Price: Low → High</option>
              </select>
            </div>
            <div id="finder-unlock-banner" className="unlock-banner hidden">
              <span>🔒 Click any product to unlock pricing &amp; buy links</span>
              <button className="btn btn-primary btn-sm" onClick="showPaywall()">Get Access →</button>
            </div>
            <div className="mods-grid" id="finder-mods-grid"></div>
            <div style={{textAlign:'center',marginTop:'16px'}}>
              <button className="btn btn-outline btn-sm" id="btn-back-to-query">← Search Again</button>
            </div>
          </div>

          <div style={{textAlign:'center',marginTop:'24px',display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn btn-outline" id="btn-finder-reset">↩ Scan Another Bike</button>
            <button className="btn btn-secondary" id="btn-browse-all">🔥 Browse All Mods</button>
          </div>
        </section>

        {/* Finder error */}
        <section id="finder-error" className="card hidden">
          <div className="error-box">
            <div style={{fontSize:'2.5rem'}}>⚠️</div>
            <h3 id="finder-error-msg">Could not identify bike</h3>
            <button className="btn btn-primary" id="btn-finder-retry">Try Again</button>
          </div>
        </section>

        {/* Search results */}
        <section id="search-results-section" className="hidden">
          <div className="section-header">
            <h2 id="search-results-title">Results</h2>
            <button className="btn btn-outline btn-sm" id="btn-clear-search">✕ Clear</button>
          </div>
          <div className="category-chips" id="search-cat-chips" style={{marginBottom:'12px'}}>
            <button className="chip active" data-cat="all">All</button>
            {CATEGORIES.map(cat => (
              <button key={cat} className="chip" data-cat={cat}>{cat.charAt(0).toUpperCase()+cat.slice(1)}</button>
            ))}
          </div>
          <div id="search-unlock-banner" className="unlock-banner hidden">
            <span>🔒 Click any product to unlock pricing &amp; buy links</span>
            <button className="btn btn-primary btn-sm" onClick="showPaywall()">Get Access →</button>
          </div>
          <div className="mods-grid" id="search-results-grid"></div>
        </section>

        {/* ── TRENDING MODS ── */}
        <section id="trending-section" className="hidden">
          <div className="section-header">
            <h2>🔥 Top Mods Right Now</h2>
            <div className="category-chips" id="cat-chips">
              <button className="chip active" data-cat="all">All</button>
              {CATEGORIES.map(cat => (
                <button key={cat} className="chip" data-cat={cat}>{cat.charAt(0).toUpperCase()+cat.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="mods-grid" id="trending-grid">
            {trending.map(mod => {
              const savings = (mod.retail_price && mod.found_price) ? mod.retail_price - mod.found_price : 0;
              const icon = mod.icon || '🔧';
              const imgSrc = mod.image_url || `/api/product-image?q=${encodeURIComponent(mod.ebay_search || '')}`;
              return (
                <div key={mod.id} className="mod-card preloaded" data-mod={JSON.stringify(mod)}>
                  <div className="mod-img-wrap">
                    <img className="mod-img" src={imgSrc} alt={mod.title} loading="lazy" />
                    <div className="mod-img-fallback">{icon}</div>
                  </div>
                  <div className="mod-card-body">
                    <div className="mod-cat-tag">{(mod.category || 'mod').toUpperCase()}</div>
                    <div className="mod-title">{mod.title}</div>
                    <div className="mod-brand">{mod.brand}</div>
                    <div className="price-row">
                      {mod.retail_price && <span className="retail-price">${mod.retail_price}</span>}
                      <span className="found-price">${mod.found_price}</span>
                    </div>
                    {savings > 0 && <div className="savings-pill">💰 Save ${savings}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SCAM CHECKER ── */}
        <section className="card" id="scam-checker-section">
          <h2>🛡️ Scam Checker</h2>
          <p className="section-sub">Paste any product link — we&apos;ll tell you if it&apos;s legit or a scam</p>
          <div className="search-bar scam-search-bar">
            <span className="search-icon">🔗</span>
            <input id="scam-url-input" type="url" placeholder="Paste product link here… amazon.com, ebay.com, aliexpress.com, anywhere…" autoComplete="off" />
            <button className="btn btn-primary" id="btn-scam-check">Check It</button>
          </div>
          <div id="scam-loading" className="hidden" style={{textAlign:'center',padding:'24px'}}>
            <div className="spinner" style={{margin:'0 auto'}}></div>
            <p style={{marginTop:'12px',color:'var(--text-muted)'}}>Analyzing link…</p>
          </div>
          <div id="scam-result" className="hidden"></div>
        </section>

        {/* ── EBIKE SHOP ── */}
        <section className="card" id="cheap-ebikes-section">
          <h2>🚲 Find Your Ebike for Less</h2>
          <div className="search-bar ebike-search-bar" style={{marginBottom:'24px'}}>
            <span className="search-icon">🔍</span>
            <input id="ebike-search-input" type="text" placeholder="Search any ebike… Sur-Ron, fat tire, under $1000…" autoComplete="off" />
            <button className="btn btn-primary" id="btn-ebike-search">Search</button>
          </div>
          <p className="section-sub" style={{marginBottom:'16px'}}>⚡ Popular bikes — cheapest new, used &amp; official site:</p>
          <div id="popular-ebike-grid" className="ebike-grid"></div>
        </section>

        {/* ── REQUEST A MOD ── */}
        <section className="card" id="request-section">
          <h2>🙋 Request a Mod</h2>
          <p className="section-sub">Don&apos;t see what you&apos;re looking for? Tell us — we source what the community asks for.</p>
          <div className="request-row">
            <input id="request-mod-input" type="text" placeholder="What mod do you want? e.g. Rear shock upgrade, LED bar ends…" autoComplete="off" />
            <input id="request-bike-input" type="text" placeholder="Your bike (optional) e.g. Sur-Ron Light Bee X" autoComplete="off" />
            <button className="btn btn-primary" id="btn-request-mod">Submit Request</button>
          </div>
          <div id="request-success" className="request-success hidden">✅ Request submitted! We&apos;ll source it if enough people want it.</div>
        </section>

        {/* ── SUBSCRIPTION PAYWALL MODAL ── */}
        <div id="sub-paywall-modal" className="modal hidden">
          <div className="modal-backdrop" id="sub-paywall-backdrop"></div>
          <div className="modal-box sub-paywall-box">
            <button className="btn-close" id="btn-close-paywall" style={{position:'absolute',top:'14px',right:'14px'}}>✕</button>

            <div style={{background:'#1a1a2e',border:'1px solid #a855f7',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',textAlign:'center',fontSize:'.88rem',lineHeight:'1.6',color:'#e2e2e2'}}>
              🎵 Follow <a href="https://www.tiktok.com/@emotoplug.com1" target="_blank" rel="noopener noreferrer" style={{color:'#a855f7',fontWeight:'600'}}>@emotoplug.com1</a> on TikTok and message us for <strong style={{color:'#fff'}}>38–51% off</strong>
            </div>

            <div className="sub-paywall-header">
              <div className="sub-paywall-icon">🚲</div>
              <h2>Unlock emotoplug</h2>
              <p>Full access — ebike finder, scam checker, bike mod finder</p>
            </div>

            {/* ── Tabs ── */}
            <div className="sub-tabs">
              <button className="sub-tab active" id="sub-tab-pay">💳 Pay $17/mo</button>
              <button className="sub-tab" id="sub-tab-survey">📋 Earn Free</button>
            </div>

            {/* ── PAY TAB ── */}
            <div id="sub-pane-pay" className="sub-pane">
              <div className="sub-price-card">
                <div className="sub-price-amount">$17</div>
                <div className="sub-price-period">one-time</div>
                <div className="sub-price-note">Lifetime access · Secure via Stripe</div>
              </div>
              <ul className="sub-features">
                <li>✅ Unlimited ebike searches</li>
                <li>✅ New vs Used price comparison</li>
                <li>✅ Direct cheapest eBay listings</li>
                <li>✅ Budget filter ($1k / $2k / $3k / $5k)</li>
                <li>✅ AI-powered bike recommendations</li>
              </ul>
              <div className="sub-form">
                <input id="sub-name"     type="text"     placeholder="Your name"                   autoComplete="name" />
                <input id="sub-email"    type="email"    placeholder="Your email"                  autoComplete="email" />
                <input id="sub-password" type="password" placeholder="Create a password (min 6 chars)" autoComplete="new-password" />
                <input id="sub-discount-code" type="text" placeholder="Discount code (optional)" style={{textTransform:'uppercase'}} />
                <button className="btn btn-primary btn-large sub-cta-btn" id="btn-subscribe">Get Lifetime Access — $17 →</button>
                <p id="sub-error" className="sub-error hidden"></p>
                <p className="sub-legal">By purchasing you agree to our <span id="paywall-terms-link" style={{cursor:'pointer',textDecoration:'underline'}}>Terms of Service</span>. One-time charge. No recurring billing.</p>
              </div>
            </div>

            {/* ── SURVEY / EARN FREE TAB ── */}
            <div id="sub-pane-survey" className="sub-pane hidden">
              <div className="survey-how">
                <p>🎯 Complete easy surveys → Earn credits → Get free access</p>
                <ul style={{textAlign:'left',margin:'8px 0 4px 0',paddingLeft:'1.2em',lineHeight:'1.8'}}>
                  <li>Every <strong>$1</strong> a survey pays = <strong>100 Credits</strong></li>
                  <li>Reach <strong>1,300 Credits ($13)</strong> → get <strong>1 month FREE</strong></li>
                  <li>Got fewer? Hit <em>Combine</em> anytime for a <strong>% discount code</strong></li>
                </ul>
                <p style={{fontSize:'0.82rem',color:'var(--muted)',marginTop:'6px',lineHeight:'1.6'}}>
                  ⏱ <strong>Most people get there in a few days</strong> — knock out 2–3 surveys whenever you have 15 minutes to spare. Each one gets you closer to a free year.
                </p>
              </div>

              {/* Progress bar */}
              <div className="survey-progress-wrap">
                <div className="survey-progress-labels">
                  <span id="survey-dollars-text">$0.00 earned</span>
                  <span id="survey-goal-text">$20.00 goal</span>
                </div>
                <div className="survey-progress-bar">
                  <div className="survey-progress-fill" id="survey-progress-fill"></div>
                </div>
                <div className="survey-progress-sub" id="survey-progress-sub">Complete a survey below to start earning</div>
              </div>

              {/* Survey iframe */}
              <div className="survey-iframe-wrap">
                <iframe id="survey-iframe" className="survey-iframe" src="about:blank" title="Earn credits with surveys"></iframe>
                <div id="survey-not-configured" className="survey-not-configured">
                  <div style={{fontSize:'2rem',marginBottom:'8px'}}>📋</div>
                  <p style={{fontWeight:700,marginBottom:'6px'}}>Survey partners coming soon!</p>
                  <p>We&apos;re finalising our survey partnerships. Check back soon — you&apos;ll be able to earn free access by completing quick paid surveys.</p>
                </div>
              </div>

              {/* Combine button */}
              <button className="btn btn-accent btn-large survey-combine-btn" id="btn-combine-credits" disabled>
                🎁 Combine Credits → Get Discount
              </button>
              <p id="survey-combine-msg" className="sub-error hidden"></p>
              <p id="survey-combine-success" className="survey-combine-success hidden"></p>
            </div>

          </div>
        </div>

        {/* ── SUBSCRIPTION SUCCESS MODAL ── */}
        <div id="sub-success-modal" className="modal hidden">
          <div className="modal-backdrop" id="sub-success-backdrop"></div>
          <div className="modal-box" style={{textAlign:'center',padding:'36px 28px'}}>
            <div style={{fontSize:'3rem',marginBottom:'12px'}}>🎉</div>
            <h2 style={{marginBottom:'8px'}}>You&apos;re subscribed!</h2>
            <p style={{color:'var(--muted)',marginBottom:'20px'}}>Access unlocked for 1 year. Start searching now.</p>
            <button className="btn btn-primary btn-large" id="btn-sub-success-close" style={{width:'100%'}}>
              Start Finding Deals →
            </button>
          </div>
        </div>

        {/* ── EBIKE RESULTS MODAL ── */}
        <div id="ebike-modal" className="modal hidden">
          <div className="modal-backdrop" id="ebike-modal-backdrop"></div>
          <div className="modal-box modal-wide">
            <div className="modal-header">
              <h3 id="ebike-modal-title">🚲 Deals Found</h3>
              <button className="btn-close" id="btn-close-ebike">✕</button>
            </div>
            <div id="ebike-loading" className="hidden" style={{textAlign:'center',padding:'32px'}}>
              <div className="spinner" style={{margin:'0 auto'}}></div>
              <p style={{marginTop:'12px',color:'var(--muted)'}}>Finding best bikes…</p>
            </div>
            <div id="ebike-results" className="ebike-grid"></div>
          </div>
        </div>

      </main>

      {/* ── CAMERA MODAL ── */}
      <div id="camera-modal" className="modal hidden">
        <div className="modal-backdrop" id="camera-backdrop"></div>
        <div className="modal-box">
          <div className="modal-header"><h3>Take a Photo</h3><button className="btn-close" id="btn-close-camera">✕</button></div>
          <video id="camera-video" autoPlay playsInline></video>
          <canvas id="camera-canvas" className="hidden"></canvas>
          <div className="modal-footer"><button className="btn btn-primary btn-large" id="btn-capture">📸 Capture</button></div>
        </div>
      </div>

      {/* ── MOD DETAIL MODAL ── */}
      <div id="mod-modal" className="modal hidden">
        <div className="modal-backdrop" id="mod-modal-backdrop"></div>
        <div className="modal-box modal-wide">
          <div className="modal-header">
            <h3 id="mod-modal-title"></h3>
            <button className="btn-close" id="btn-close-mod">✕</button>
          </div>
          <div id="mod-modal-body"></div>
        </div>
      </div>

      {/* ── USER ACCOUNT MODAL ── */}
      <div id="auth-modal" className="modal hidden">
        <div className="modal-backdrop" id="auth-backdrop"></div>
        <div className="modal-box">
          <div className="modal-header">
            <h3 id="auth-title">Welcome to emotoplug</h3>
            <button className="btn-close" id="btn-close-auth">✕</button>
          </div>
          <div className="sub-tabs" style={{marginBottom:'16px'}}>
            <button className="sub-tab active" id="auth-tab-signin">Sign In</button>
            <button className="sub-tab" id="auth-tab-register">Create Account</button>
          </div>

          {/* Sign In pane */}
          <div id="auth-pane-signin" className="auth-body">
            <input id="signin-email" type="email" placeholder="Email address" autoComplete="email" />
            <input id="signin-password" type="password" placeholder="Password" autoComplete="current-password" />
            <p id="signin-error" className="sub-error hidden"></p>
            <button className="btn btn-primary btn-large" id="btn-signin-submit">Sign In →</button>
            {/* Hidden owner access */}
            <div id="owner-signin-section" className="owner-signin-section hidden">
              <input id="owner-username" type="text" placeholder="Username or email" autoComplete="username" />
              <input id="owner-password" type="password" placeholder="Password" autoComplete="current-password" />
              <p id="owner-error" className="owner-error hidden">Invalid credentials</p>
              <button className="btn btn-primary btn-large" id="btn-owner-submit">Sign In as Owner →</button>
            </div>
          </div>

          {/* Create Account pane */}
          <div id="auth-pane-register" className="auth-body hidden">
            <input id="register-name" type="text" placeholder="Your name" autoComplete="name" />
            <input id="register-email" type="email" placeholder="Email address" autoComplete="email" />
            <input id="register-password" type="password" placeholder="Password (min 6 characters)" autoComplete="new-password" />
            <p id="register-error" className="sub-error hidden"></p>
            <button className="btn btn-primary btn-large" id="btn-register-submit">Create Account →</button>
          </div>

        </div>
      </div>

      {/* ── TERMS MODAL ── */}
      <div id="terms-modal" className="modal hidden">
        <div className="modal-backdrop" id="terms-backdrop"></div>
        <div className="modal-box modal-wide">
          <div className="modal-header"><h3>Terms of Service</h3><button className="btn-close" id="btn-close-terms">✕</button></div>
          <div className="terms-text">
            <h4>1. No Liability</h4>
            <p>eMotoFetch provides links to third-party retailers for informational purposes only. We are not responsible for the quality, safety, legality, or pricing of any products. All purchases are made directly with third-party retailers.</p>
            <h4>2. Price Accuracy</h4>
            <p>Prices shown are estimates and may not reflect current pricing. Always verify the final price on the retailer&apos;s website before purchasing.</p>
            <h4>3. No Affiliation</h4>
            <p>eMotoFetch is not affiliated with, endorsed by, or partnered with any retailer, brand, or manufacturer mentioned on this site.</p>
            <h4>4. Link Access</h4>
            <p>When you unlock a link, you receive the URL to a third-party product page. Refunds are not available once a link is unlocked, as the link is delivered immediately.</p>
            <h4>5. Use at Your Own Risk</h4>
            <p>Modification of ebikes may affect safety, warranty, and legality. Always consult local regulations. eMotoFetch accepts no responsibility for any modifications made to your vehicle.</p>
            <h4>6. Privacy</h4>
            <p>We store only your name and email for account purposes. We do not sell your data.</p>
            <button className="btn btn-primary" style={{marginTop:'16px'}} id="btn-accept-terms">I Understand &amp; Accept</button>
          </div>
        </div>
      </div>

      {/* ── ACCOUNT / SUPPORT MODAL ── */}
      <div id="manage-sub-modal" className="modal hidden">
        <div className="modal-backdrop" id="manage-sub-backdrop"></div>
        <div className="modal-box" style={{maxWidth:'400px'}}>
          <div className="modal-header">
            <h3>⚙️ Account</h3>
            <button className="btn-close" id="btn-close-manage-sub">✕</button>
          </div>
          <div style={{padding:'16px 0',display:'flex',flexDirection:'column',gap:'14px'}}>
            <p style={{color:'var(--muted)',fontSize:'.9rem'}}>You have lifetime access to all mods, prices, and tools on emotoplug. ⚡</p>
            <div style={{background:'var(--surface)',borderRadius:'10px',padding:'14px 16px',fontSize:'.88rem',lineHeight:'1.7'}}>
              <strong>Any problems or questions?</strong><br/>
              Email us at{' '}
              <a href="mailto:nickw9745@gmail.com" style={{color:'var(--accent)'}}>nickw9745@gmail.com</a>
              {' '}and we&apos;ll get back to you right away.
            </div>
            <button className="btn btn-primary" id="btn-close-manage-sub-2">Close</button>
          </div>
        </div>
      </div>

      {/* ── UNLOCK SUCCESS MODAL ── */}
      <div id="unlock-modal" className="modal hidden">
        <div className="modal-backdrop" id="unlock-backdrop"></div>
        <div className="modal-box">
          <div className="modal-header"><h3>🔓 Link Unlocked!</h3><button className="btn-close" id="btn-close-unlock">✕</button></div>
          <div style={{padding:'16px 0',display:'flex',flexDirection:'column',gap:'16px'}}>
            <p style={{color:'var(--text-muted)'}}>Here&apos;s your direct link to the best price:</p>
            <a id="unlock-link" href="#" target="_blank" rel="noopener" className="btn btn-primary btn-large" style={{justifyContent:'center'}}>Open Best Price Link →</a>
          </div>
        </div>
      </div>

      <footer>
        <p>⚡ emotoplug · Powered by Claude AI · Prices may vary · Not affiliated with any retailer · <a href="#" id="footer-terms">Terms of Service</a></p>
      </footer>
    </>
  );
}
