'use strict';

/* ── State ── */
let currentImage = null, finderMods = [], stream = null;
let pendingUnlockMod = null, currentBike = null;

/* ── DOM ── */
const _noop = { addEventListener:()=>{}, removeEventListener:()=>{}, classList:{add:()=>{},remove:()=>{},contains:()=>false,toggle:()=>{}}, style:{}, querySelectorAll:()=>[], querySelector:()=>null, scrollIntoView:()=>{}, get value(){return '';}, set value(v){}, get textContent(){return '';}, set textContent(v){}, get src(){return '';}, set src(v){}, get disabled(){return false;}, set disabled(v){}, get innerHTML(){return '';}, set innerHTML(v){}, get checked(){return false;}, set checked(v){} };
const $ = id => document.getElementById(id) || _noop;
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');
const delay = ms => new Promise(r => setTimeout(r, ms));

/* ── Subscription token helpers ── */
const SUB_KEY = 'emf_sub';

function getSubToken() {
  try {
    const s = JSON.parse(localStorage.getItem(SUB_KEY) || 'null');
    if (!s || !s.token) return null;
    if (s.exp && Date.now() > s.exp) { localStorage.removeItem(SUB_KEY); return null; }
    return s.token;
  } catch { return null; }
}

function saveSubToken(token, expiresAt) {
  localStorage.setItem(SUB_KEY, JSON.stringify({ token, exp: expiresAt }));
}

function showPaywall() {
  $('sub-name').value = ''; $('sub-email').value = '';
  $('sub-discount-code').value = '';
  $('sub-error').classList.add('hidden');
  // Always open on Pay tab
  switchPaywallTab('pay');
  show('sub-paywall-modal');
}

/* ── PAYWALL TAB SWITCHING ── */
function switchPaywallTab(tab) {
  document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
  $(`sub-tab-${tab}`)?.classList.add('active');
  ['pay','survey'].forEach(t => { t === tab ? show(`sub-pane-${t}`) : hide(`sub-pane-${t}`); });
  if (tab === 'survey') initSurveyTab();
}
$('sub-tab-pay')?.addEventListener('click',    () => switchPaywallTab('pay'));
$('sub-tab-survey')?.addEventListener('click', () => switchPaywallTab('survey'));

/* ── SURVEY SESSION ── */
const SURVEY_SESSION_KEY = 'emf_svs';
function getSurveySession() {
  let sid = localStorage.getItem(SURVEY_SESSION_KEY);
  if (!sid) {
    sid = (crypto.randomUUID ? crypto.randomUUID() :
      Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(SURVEY_SESSION_KEY, sid);
  }
  return sid;
}

/* ── SURVEY TAB INIT ── */
let _surveyTabInited = false;
async function initSurveyTab() {
  loadSurveyCredits(); // always refresh credits
  if (_surveyTabInited) return;
  _surveyTabInited = true;

  try {
    const r = await fetch('/api/survey/config');
    const { configured, app_id } = await r.json();
    if (configured && app_id) {
      const sid = getSurveySession();
      $('survey-iframe').src =
        `https://offers.cpx-research.com/index.php?app_id=${app_id}&ext_user_id=${encodeURIComponent(sid)}&output_method=iframe`;
      hide('survey-not-configured');
    } else {
      $('survey-iframe').style.display = 'none';
      show('survey-not-configured');
    }
  } catch {
    $('survey-iframe').style.display = 'none';
    show('survey-not-configured');
  }
}

/* ── SURVEY CREDITS ── */
async function loadSurveyCredits() {
  const sid = getSurveySession();
  try {
    const r = await fetch(`/api/survey/credits?session_id=${encodeURIComponent(sid)}`);
    const d = await r.json();
    const credits = d.credits || 0;
    const goal    = d.goal || 2000;
    const dollars = parseFloat(d.dollars || 0);
    const goalDol = parseFloat(d.goal_dollars || 20);
    const pct     = Math.min(100, Math.round((credits / goal) * 100));

    $('survey-dollars-text').textContent = `$${dollars.toFixed(2)} earned`;
    $('survey-goal-text').textContent    = `$${goalDol.toFixed(2)} goal`;
    $('survey-progress-fill').style.width = pct + '%';

    const btn = $('btn-combine-credits');
    if (credits >= goal) {
      $('survey-progress-sub').textContent = '🎉 Goal reached! Claim your free access below.';
      btn.textContent = '🎉 Claim Free Access!';
      btn.disabled = false;
    } else if (credits > 0) {
      $('survey-progress-sub').textContent = `${pct}% there — keep going!`;
      btn.textContent = `🎁 Combine → Get ${pct}% Discount Code`;
      btn.disabled = false;
    } else {
      $('survey-progress-sub').textContent = 'Complete a survey below to start earning';
      btn.textContent = '🎁 Combine Credits → Get Discount';
      btn.disabled = true;
    }
  } catch { /* silent */ }
}

/* ── COMBINE CREDITS ── */
$('btn-combine-credits')?.addEventListener('click', async () => {
  const btn   = $('btn-combine-credits');
  const msgEl = $('survey-combine-msg');
  const sucEl = $('survey-combine-success');
  msgEl.classList.add('hidden'); sucEl.classList.add('hidden');

  const orig = btn.textContent;
  btn.textContent = '⏳ Combining…'; btn.disabled = true;

  try {
    const sid = getSurveySession();
    const r   = await fetch('/api/survey/combine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid }),
    });
    const d = await r.json();

    if (!r.ok || d.error) {
      msgEl.textContent = d.error || 'Something went wrong. Try again.';
      msgEl.classList.remove('hidden');
      btn.textContent = orig; btn.disabled = false;
      return;
    }

    if (d.type === 'free_access') {
      saveSubToken(d.token, d.expires_at);
      hide('sub-paywall-modal');
      show('sub-success-modal');
      loadSurveyCredits();
      return;
    }

    if (d.type === 'discount_code') {
      sucEl.innerHTML = `
        <div class="discount-code-reveal">
          <div class="discount-code-label">Your ${d.pct}% discount code:</div>
          <div class="discount-code-value" id="discount-code-display">${d.code}</div>
          <button class="btn btn-sm btn-outline discount-code-copy" id="btn-copy-code">📋 Copy</button>
          <div class="discount-code-hint">Switch to the 💳 Pay tab, paste this code, then subscribe at ${d.pct}% off!</div>
        </div>`;
      sucEl.classList.remove('hidden');
      $('btn-copy-code')?.addEventListener('click', () => {
        navigator.clipboard.writeText(d.code).then(() => {
          $('btn-copy-code').textContent = '✅ Copied!';
          setTimeout(() => { $('btn-copy-code').textContent = '📋 Copy'; }, 2000);
        });
      });
      btn.textContent = orig; btn.disabled = true; // credits are gone
      loadSurveyCredits();
    }
  } catch(e) {
    msgEl.textContent = 'Request failed. Try again.';
    msgEl.classList.remove('hidden');
    btn.textContent = orig; btn.disabled = false;
  }
});

/* ── On load: check Stripe return ── */
window.addEventListener('load', () => {
  const p = new URLSearchParams(location.search);

  // Existing unlock flow
  const sid = p.get('unlocked');
  if (sid) { history.replaceState({}, '', '/'); verifyUnlock(sid); }

  // Subscription return from Stripe
  const subSid   = p.get('subscribed');
  const subEmail = p.get('sub_email') || '';
  if (subSid) { history.replaceState({}, '', '/'); verifySubscription(subSid, subEmail); }

  initTrendingCards();
  initPopularEbikes();
  loadUserFromStorage();
});

/* ── SEARCH ─────────────────────────────────────────────── */
$('btn-search').addEventListener('click', () => doSearch());
$('search-input').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
document.querySelectorAll('.trend-tag').forEach(btn =>
  btn.addEventListener('click', () => { $('search-input').value = btn.dataset.q; doSearch(); }));
$('btn-clear-search').addEventListener('click', clearSearch);

let lastSearchMods = [];

async function doSearch(catFilter) {
  const q = $('search-input').value.trim();
  // Reset category chips to All when doing a fresh search (no catFilter arg)
  if (!catFilter) {
    document.querySelectorAll('#search-cat-chips .chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('#search-cat-chips .chip[data-cat="all"]');
    if (allChip) allChip.classList.add('active');
    const res = await fetch(`/api/mods/search?q=${encodeURIComponent(q)}`);
    lastSearchMods = await res.json();
  }
  const mods = catFilter && catFilter !== 'all'
    ? lastSearchMods.filter(m => m.category === catFilter)
    : lastSearchMods;
  const grid = $('search-results-grid');
  $('search-results-title').textContent = q ? `Results for "${q}" (${mods.length})` : `All Mods (${mods.length})`;
  grid.innerHTML = mods.map(buildModCard).join('');
  attachCardClicks(grid, mods);
  // PAYWALL DISABLED — banner hidden
  // const banner = $('search-unlock-banner');
  // if (banner) { getSubToken() ? banner.classList.add('hidden') : banner.classList.remove('hidden'); }
  show('search-results-section');
  if (!catFilter) $('search-results-section').scrollIntoView({behavior:'smooth'});
}

// Category chip filtering on search results
document.addEventListener('click', e => {
  const chip = e.target.closest('#search-cat-chips .chip');
  if (!chip) return;
  document.querySelectorAll('#search-cat-chips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  doSearch(chip.dataset.cat);
});

function clearSearch() {
  $('search-input').value = '';
  lastSearchMods = [];
  hide('search-results-section');
}

/* ── TRENDING GRID ──────────────────────────────────────── */
function initTrendingCards() {
  const grid = $('trending-grid');
  grid.querySelectorAll('.mod-card.preloaded').forEach(card => {
    const mod = JSON.parse(card.dataset.mod);
    card.addEventListener('click', () => openModModal(mod));
    card.querySelectorAll('.mod-img').forEach(img => {
      img.addEventListener('error', () => { img.style.display = 'none'; });
    });
  });
}

/* Category filter */
document.querySelectorAll('#cat-chips .chip').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('#cat-chips .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    const q = cat === 'all' ? '' : cat;
    const res = await fetch(`/api/mods/search?q=${encodeURIComponent(q)}`);
    const mods = await res.json();
    const grid = $('trending-grid');
    grid.innerHTML = mods.slice(0,20).map(buildModCard).join('');
    attachCardClicks(grid, mods.slice(0,20));
  });
});

/* ── FINDER TABS ────────────────────────────────────────── */
document.querySelectorAll('.finder-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.finder-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.finder-tab-content').forEach(c => hide(c.id));
    show(`tab-${tab.dataset.tab}`);
  });
});

/* ── PHOTO UPLOAD ────────────────────────────────────────── */
$('btn-upload').addEventListener('click', () => $('file-input').click());
$('btn-camera').addEventListener('click', openCamera);
$('file-input').addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });
$('btn-change').addEventListener('click', resetPhotoState);
$('btn-analyze-photo').addEventListener('click', () => analyzeImage('image'));

const dz = $('drop-zone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f?.type.startsWith('image/')) loadFile(f);
});

function loadFile(file) {
  const r = new FileReader();
  r.onload = e => { currentImage = e.target.result; showPreview(currentImage); };
  r.readAsDataURL(file);
}

function showPreview(src) {
  hide('drop-inner'); show('preview-wrap');
  $('preview-img').src = src;
}

function resetPhotoState() {
  currentImage = null; $('file-input').value = '';
  show('drop-inner'); hide('preview-wrap');
}

/* ── CAMERA ──────────────────────────────────────────────── */
async function openCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('camera-video').srcObject = stream;
    show('camera-modal');
  } catch(e) { alert('Camera not available: ' + e.message); }
}
$('btn-close-camera').addEventListener('click', closeCamera);
$('camera-backdrop').addEventListener('click', closeCamera);
function closeCamera() {
  if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
  hide('camera-modal');
}
$('btn-capture').addEventListener('click', () => {
  const v = $('camera-video'), c = $('camera-canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);
  currentImage = c.toDataURL('image/jpeg', .92);
  showPreview(currentImage);
  closeCamera();
});

/* ── TEXT ANALYZE ────────────────────────────────────────── */
$('btn-analyze-text').addEventListener('click', () => analyzeImage('text'));
$('bike-text-input').addEventListener('keydown', e => { if (e.key==='Enter') analyzeImage('text'); });

/* ── ANALYZE ─────────────────────────────────────────────── */
async function analyzeImage(mode) {
  hide('finder-error');
  if (mode === 'image' && !currentImage) return;
  if (mode === 'text' && !$('bike-text-input').value.trim()) return;

  hide('finder-section'); hide('finder-results');
  show('finder-loading');
  stepState('fs1','active'); stepState('fs2',''); stepState('fs3','');

  const body = mode === 'text'
    ? {mode:'text', bike_text: $('bike-text-input').value.trim()}
    : {mode:'image', image_data: currentImage};

  try {
    const res = await fetch('/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    stepState('fs1','done'); stepState('fs2','active');
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error);
    stepState('fs2','done'); stepState('fs3','active');
    await delay(300);
    stepState('fs3','done');
    await delay(200);
    hide('finder-loading');
    renderFinderResults(data, mode);
  } catch(err) {
    hide('finder-loading');
    $('finder-error-msg').textContent = err.message || 'Could not identify bike';
    show('finder-section');
    show('finder-error');
  }
}

function stepState(id, state) {
  const el=$(id), st=$(id+'s');
  if (!el) return;
  el.classList.remove('active','done');
  if (state==='active'){el.classList.add('active');st.textContent='working…';}
  else if(state==='done'){el.classList.add('done');st.textContent='✓';}
  else {st.textContent='';}
}

/* ── RENDER FINDER RESULTS ───────────────────────────────── */
function renderFinderResults(data, mode) {
  const {ebike, mods} = data;
  finderMods = mods || [];
  currentBike = ebike;

  // Show bike thumbnail if photo was used
  const thumb = $('finder-img');
  if (mode === 'image' && currentImage) {
    thumb.src = currentImage; thumb.style.display = 'block';
  } else {
    thumb.style.display = 'none';
  }

  const name = [ebike.brand, ebike.model].filter(v=>v&&v!=='Unknown').join(' ') || 'Your Ebike';
  $('finder-bike-name').textContent = name;
  $('query-bike-name').textContent = name;

  const meta = [$ebike_meta(ebike.type), $ebike_meta(ebike.year), $ebike_meta(ebike.motor_type)].filter(Boolean);
  $('finder-meta').innerHTML = meta.map(t=>`<span class="meta-tag">${t}</span>`).join('');

  // Spell correction notice
  if (ebike.spell_corrected && ebike.spell_corrected !== $('bike-text-input').value) {
    const sn = $('spell-note');
    sn.textContent = `✓ Interpreted as: "${ebike.spell_corrected}"`;
    sn.classList.remove('hidden');
  }

  // Reset query UI state
  document.querySelectorAll('.query-chip').forEach(c => c.classList.remove('active'));
  $('bike-mod-query').value = '';
  show('bike-query-section');
  hide('finder-mods-section');
  hide('finder-mods-loading');

  hide('finder-section');
  show('finder-results');
  $('finder-results').scrollIntoView({behavior:'smooth'});
}

/* ── BIKE MOD QUERY ─────────────────────────────────────── */
document.querySelectorAll('.query-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.query-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    searchModsForBike(btn.dataset.q);
  });
});

$('btn-bike-mod-search').addEventListener('click', () => {
  const q = $('bike-mod-query').value.trim();
  if (q) searchModsForBike(q);
});
$('bike-mod-query').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const q = $('bike-mod-query').value.trim(); if (q) searchModsForBike(q); }
});

$('btn-show-all-mods').addEventListener('click', () => {
  renderFinderMods(finderMods);
  $('finder-mods-title').textContent = 'All Recommended Mods';
  hide('bike-query-section');
  show('finder-mods-section');
  $('finder-mods-section').scrollIntoView({behavior:'smooth'});
});

$('btn-back-to-query').addEventListener('click', () => {
  hide('finder-mods-section');
  show('bike-query-section');
  $('bike-query-section').scrollIntoView({behavior:'smooth'});
});

async function searchModsForBike(query) {
  hide('bike-query-section');
  show('finder-mods-loading');
  hide('finder-mods-section');
  try {
    const res = await fetch('/api/mods/for-bike', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        bike_brand: currentBike?.brand || '',
        bike_model: currentBike?.model || '',
        query
      })
    });
    const mods = await res.json();
    finderMods = mods;
    renderFinderMods(mods);
    const label = query.charAt(0).toUpperCase() + query.slice(1);
    $('finder-mods-title').textContent = `Best ${label} for ${$('finder-bike-name').textContent}`;
    hide('finder-mods-loading');
    show('finder-mods-section');
    $('finder-mods-section').scrollIntoView({behavior:'smooth'});
  } catch(err) {
    hide('finder-mods-loading');
    show('bike-query-section');
  }
}

function $ebike_meta(v) { return v && v !== 'Unknown' ? v : null; }

function isCompatibleWithBike(mod, bike) {
  if (!bike || !mod.compatibility) return true;
  const c = mod.compatibility.toLowerCase();
  if (c.includes('universal') || c.includes('most electric')) return true;
  const brand = (bike.brand || '').toLowerCase();
  const model = (bike.model || '').toLowerCase();
  if (brand && c.includes(brand)) return true;
  if (model) {
    const words = model.split(/[\s\-\/]+/).filter(w => w.length > 2);
    for (const w of words) { if (c.includes(w)) return true; }
  }
  return false;
}

function renderFinderMods(mods) {
  const sort = $('finder-sort').value;
  const compatible = currentBike ? mods.filter(m => isCompatibleWithBike(m, currentBike)) : mods;
  const sorted = [...compatible];
  if (sort === 'savings') sorted.sort((a,b)=>(b.savings||0)-(a.savings||0));
  else if (sort === 'price-low') sorted.sort((a,b)=>(a.found_price||0)-(b.found_price||0));
  const grid = $('finder-mods-grid');
  grid.innerHTML = sorted.length ? sorted.map(buildModCard).join('') : '<p style="color:var(--muted);text-align:center;padding:24px">No compatible mods found for this bike yet.</p>';
  attachCardClicks(grid, sorted);
  // PAYWALL DISABLED — banner hidden
  // const banner = $('finder-unlock-banner');
  // if (banner) { getSubToken() ? banner.classList.add('hidden') : banner.classList.remove('hidden'); }
}

$('finder-sort').addEventListener('change', () => renderFinderMods(finderMods));
$('btn-finder-reset').addEventListener('click', () => {
  resetPhotoState();
  $('bike-text-input').value = '';
  $('spell-note').classList.add('hidden');
  $('bike-mod-query').value = '';
  document.querySelectorAll('.query-chip').forEach(c => c.classList.remove('active'));
  hide('finder-results');
  hide('finder-mods-section');
  show('finder-section');
  finderMods = [];
  currentBike = null;
});
$('btn-finder-retry').addEventListener('click', () => { hide('finder-error'); show('finder-section'); });

/* ── BUILD MOD CARD ──────────────────────────────────────── */
function buildModCard(mod) {
  const icon = mod.icon || '🔧';
  const savings = mod.savings || (mod.retail_price && mod.found_price ? mod.retail_price - mod.found_price : 0);
  const found = mod.found_price || 0;
  const retail = mod.retail_price || 0;
  const imgSrc = mod.image_url || `/api/product-image?q=${encodeURIComponent(mod.ebay_search||mod.title||'')}`;
  return `<div class="mod-card" data-id="${esc(mod.id||mod.title||'')}">
    <div class="mod-img-wrap">
      <img class="mod-img" src="${imgSrc}" alt="${esc(mod.title)}" loading="lazy" onerror="this.style.display='none'"/>
      <div class="mod-img-fallback">${icon}</div>
    </div>
    <div class="mod-card-body">
      <div class="mod-cat-tag">${esc((mod.category||'mod').toUpperCase())}</div>
      <div class="mod-title">${esc(mod.title||'')}</div>
      <div class="mod-brand">${esc(mod.brand||'')}</div>
      <div class="price-row">
        ${retail ? `<span class="retail-price">$${retail}</span>` : ''}
        <span class="found-price">${found ? `$${found}` : 'Varies'}</span>
      </div>
      ${savings > 0 ? `<div class="savings-pill">💰 Save $${savings}</div>` : ''}
    </div>
  </div>`;
}

function attachCardClicks(grid, mods) {
  grid.querySelectorAll('.mod-card').forEach((card, i) => {
    card.addEventListener('click', () => openModModal(mods[i]));
  });
}

/* ── MOD MODAL ───────────────────────────────────────────── */

function buildShopLinks(mod, aq) {
  const amzSearch = `https://www.amazon.com/s?k=${aq}`;
  const ebaySearch = `https://www.ebay.com/sch/i.html?_nkw=${aq}`;
  const isAmazon = mod.amazon_direct && mod.amazon_direct.includes('amazon.com');
  const isEbay = mod.amazon_direct && mod.amazon_direct.includes('ebay.com');
  const isDirect = mod.amazon_direct && (isAmazon || isEbay || (!mod.amazon_direct.includes('/s?') && !mod.amazon_direct.includes('/sch/')));
  const firstLabel = isAmazon ? '✅ Amazon Direct' : isEbay ? '✅ eBay Direct' : isDirect ? '✅ Buy Direct' : '🛒 Amazon';
  const firstUrl = isDirect ? mod.amazon_direct : amzSearch;
  return `
    <a class="shop-btn amazon" href="${firstUrl}" target="_blank" rel="noopener">${firstLabel}</a>
    <a class="shop-btn ebay" href="${ebaySearch}" target="_blank" rel="noopener">🏷️ eBay</a>
  `;
}

function openModModal(mod) {
  // PAYWALL DISABLED — re-enable when ready
  // if (!getSubToken()) { showPaywall(); return; }
  const savings = mod.savings || (mod.retail_price && mod.found_price ? mod.retail_price - mod.found_price : 0);
  const imgSrc = mod.image_url || `/api/product-image?q=${encodeURIComponent(mod.ebay_search||mod.title||'')}`;
  const aq = encodeURIComponent(mod.amazon_search || mod.title || '');
  const eq = encodeURIComponent(mod.ebay_search || mod.title || '');

  $('mod-modal-title').textContent = `${mod.icon||'🔧'} ${mod.title||''}`;
  $('mod-modal-body').innerHTML = `
    <img class="mod-detail-img" src="${imgSrc}" alt="${esc(mod.title)}" onerror="this.style.display='none'"/>
    <div class="detail-section">
      <div class="detail-label">Why it's popular</div>
      <p>${esc(mod.why_popular || mod.description || '')}</p>
    </div>
    <div class="detail-section">
      <div class="detail-label">Description</div>
      <p style="color:var(--muted);font-size:.85rem">${esc(mod.description||'')}</p>
    </div>
    <div class="detail-section">
      <div class="detail-label">Pricing</div>
      <div class="modal-savings-row">
        ${mod.retail_price ? `<span style="color:var(--muted);text-decoration:line-through">$${mod.retail_price}</span>` : ''}
        ${mod.found_price ? `<span style="font-size:1.3rem;font-weight:800;color:var(--accent)">$${mod.found_price}</span>` : ''}
        ${savings > 0 ? `<span class="modal-savings-badge">You save $${savings}!</span>` : ''}
      </div>
    </div>
    ${mod.compatibility_note||mod.compatibility ? `<div class="detail-section">
      <div class="detail-label">Compatibility</div>
      <p style="color:var(--yellow);font-size:.85rem">💡 ${esc(mod.compatibility_note||mod.compatibility||'')}</p>
    </div>` : ''}
    ${mod.difficulty ? `<div class="detail-section">
      <div class="detail-label">Install Difficulty</div>
      <p>${{'easy':'🟢 Easy','medium':'🟡 Medium','hard':'🔴 Hard'}[mod.difficulty]||mod.difficulty}</p>
    </div>` : ''}
    <div class="detail-section">
      <div class="detail-label">Shop — Best Price</div>
      <div class="shop-links">${buildShopLinks(mod, aq, eq)}</div>
    </div>`;
  show('mod-modal');
}

$('btn-close-mod').addEventListener('click', () => hide('mod-modal'));
$('mod-modal-backdrop').addEventListener('click', () => hide('mod-modal'));

/* ── CHEAP EBIKES SEARCH ─────────────────────────────────── */
$('btn-ebike-search').addEventListener('click', searchEbikes);
$('ebike-search-input').addEventListener('keydown', e => { if(e.key==='Enter') searchEbikes(); });
$('btn-close-ebike').addEventListener('click', () => hide('ebike-modal'));
$('ebike-modal-backdrop').addEventListener('click', () => hide('ebike-modal'));

/* Quick-search chips in the ebike section */
document.querySelectorAll('.ebike-trend-tag').forEach(btn =>
  btn.addEventListener('click', () => { $('ebike-search-input').value = btn.dataset.q; searchEbikes(); }));

/* ── SUBSCRIPTION PAYWALL ─────────────────────────────────── */
$('btn-close-paywall').addEventListener('click',  () => hide('sub-paywall-modal'));
$('sub-paywall-backdrop').addEventListener('click', () => hide('sub-paywall-modal'));
$('btn-sub-success-close').addEventListener('click', () => {
  hide('sub-success-modal');
  // Run the pending search after subscription confirmed
  runEbikeSearch();
});
$('sub-success-backdrop').addEventListener('click', () => hide('sub-success-modal'));
$('paywall-terms-link').addEventListener('click', () => show('terms-modal'));

let _pendingSearchQuery = null;

$('btn-subscribe').addEventListener('click', async () => {
  const name          = $('sub-name').value.trim();
  const email         = $('sub-email').value.trim();
  const discount_code = ($('sub-discount-code').value.trim().toUpperCase()) || undefined;
  const errEl         = $('sub-error');
  errEl.classList.add('hidden');

  if (!name || !email) {
    errEl.textContent = 'Please enter your name and email.';
    errEl.classList.remove('hidden');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn  = $('btn-subscribe');
  const orig = btn.textContent;
  btn.textContent = '⏳ Setting up payment…';
  btn.disabled = true;

  try {
    const res  = await fetch('/api/subscription/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, discount_code }),
    });
    const data = await res.json();

    if (data.error === 'stripe_not_configured') {
      errEl.textContent = '💳 Payment system is being set up — check back soon!';
      errEl.classList.remove('hidden');
      btn.textContent = orig; btn.disabled = false;
      return;
    }
    if (data.error === 'invalid_code') {
      errEl.textContent = '❌ ' + (data.message || 'Discount code is invalid or already used.');
      errEl.classList.remove('hidden');
      btn.textContent = orig; btn.disabled = false;
      return;
    }
    // Free access via 100% discount code
    if (data.type === 'free_access') {
      saveSubToken(data.token, data.expires_at);
      hide('sub-paywall-modal');
      show('sub-success-modal');
      return;
    }
    if (data.checkout_url) {
      location.href = data.checkout_url;
    } else {
      throw new Error(data.error || 'Could not start checkout');
    }
  } catch (e) {
    errEl.textContent = e.message || 'Something went wrong. Try again.';
    errEl.classList.remove('hidden');
    btn.textContent = orig; btn.disabled = false;
  }
});

async function verifySubscription(sessionId, email) {
  try {
    const res  = await fetch('/api/subscription/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, email }),
    });
    const data = await res.json();
    if (data.token) {
      saveSubToken(data.token, data.expires_at);
      show('sub-success-modal');
    }
  } catch { /* silent */ }
}

/* openDirect — called by eBay buttons; fetches a live direct itm/ URL at click
   time so we never navigate to a stale pre-fetched listing that may have sold. */
async function openDirect(event, btn, search, condition) {
  event.preventDefault();
  // Open the window synchronously (direct user gesture) — Safari blocks window.open after await
  const win = window.open(btn.href, '_blank', 'noopener,noreferrer');
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳ Finding best deal...';
  btn.style.pointerEvents = 'none';
  try {
    const res = await fetch(`/goto/ebay/url?q=${encodeURIComponent(search)}&c=${condition}`);
    const data = await res.json();
    if (win) win.location.href = data.url;
  } catch {
    // fallback: win already has btn.href from window.open above
  } finally {
    btn.innerHTML = orig;
    btn.style.pointerEvents = '';
  }
}

async function filterUsed(btn, search, maxPrice) {
  const card = btn.closest('.ebike-result-card');
  card.querySelectorAll('.budget-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const usedBtn = card.querySelector('.used-btn');
  if (!usedBtn) return;

  // Show loading state on the button
  const orig = usedBtn.textContent;
  usedBtn.textContent = '⏳ Finding...';
  usedBtn.style.pointerEvents = 'none';

  try {
    const maxParam = maxPrice > 0 ? `&max=${maxPrice}` : '';
    const res = await fetch(`/goto/ebay/url?q=${encodeURIComponent(search)}&c=3000${maxParam}`);
    const data = await res.json();
    usedBtn.href = data.url;
  } catch {
    // fallback: eBay search with price cap
    const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(search)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000`;
    usedBtn.href = maxPrice > 0 ? `${base}&_udhi=${maxPrice}` : base;
  } finally {
    usedBtn.textContent = orig;
    usedBtn.style.pointerEvents = '';
  }
}

function isDirectLink(url) {
  return url && url.includes('/itm/');
}

/* ── POPULAR EBIKES ──────────────────────────────────────── */
const POPULAR_EBIKES = [
  {
    title: 'Sur-Ron Light Bee X',
    description: 'The most popular electric dirt bike — lightweight, fast, tons of mods',
    new_price: '~$4,500', used_price_typical: '~$2,500–3,500', used_price_min: 2000,
    official_url: 'https://sur-ronusa.com/sur-ron-light-bee/',
    product_url:  'https://sur-ronusa.com/sur-ron-light-bee/',
    ebay_search:  'Sur-Ron Light Bee X electric',
    ebay_new_url: 'https://www.ebay.com/itm/326371239155',
    ebay_url:     'https://www.ebay.com/itm/315287961821',
    image_url: 'https://cdn11.bigcommerce.com/s-nlkkuaauhz/product_images/uploaded_images/homepage-surron-01.png',
  },
  {
    title: 'Talaria Sting',
    description: 'Smooth power, great for trail riding — strong community & mod scene',
    new_price: '~$3,800', used_price_typical: '~$2,200–3,000', used_price_min: 1800,
    official_url: 'https://www.talaria.bike',
    product_url:  'https://www.talaria.bike',
    ebay_search:  'Talaria Sting electric dirt bike',
    ebay_new_url: 'https://www.ebay.com/itm/235600717697',
    ebay_url:     'https://www.ebay.com/itm/196201633756',
    image_url: 'https://chainedandcharged.com/cdn/shop/files/BlueNewSize2_grande.jpg?v=1750309724',
  },
  {
    title: 'Segway X260',
    description: 'Off-road beast with long suspension travel — great stock performance',
    new_price: '~$4,000', used_price_typical: '~$2,500–3,500', used_price_min: 2000,
    official_url: 'https://store.segway.com/segway-dirt-ebike-x260',
    product_url:  'https://store.segway.com/segway-dirt-ebike-x260',
    ebay_search:  'Segway X260 electric dirt bike',
    ebay_new_url: 'https://www.ebay.com/itm/187520481219',
    ebay_url:     'https://www.ebay.com/itm/125758674063',
    image_url: 'https://segway.imgix.net/catalog/product/cache/d3ec3723470ff918c92e447639eaf984/x/2/x260_blue_708x708.png',
  },
  {
    title: 'Super73 S2',
    description: 'Iconic retro moto style — great for street & light off-road',
    new_price: '~$2,995', used_price_typical: '~$1,500–2,200', used_price_min: 1200,
    official_url: 'https://super73.com/products/super73-s2-se-legacy',
    product_url:  'https://super73.com/products/super73-s2-se-legacy',
    ebay_search:  'Super73 S2 electric bike',
    ebay_new_url: 'https://www.ebay.com/itm/295245627954',
    ebay_url:     'https://www.ebay.com/itm/227058088146',
    image_url: 'https://super73.com/cdn/shop/files/25YM_S2SESTREET_FRONTHERO_BLACKOUT.jpg?v=1772739162',
  },
  {
    title: 'Aventon Pace 500',
    description: 'Most popular commuter ebike — fast, reliable, great value',
    new_price: '~$1,299', used_price_typical: '~$600–900', used_price_min: 500,
    official_url: 'https://www.aventon.com/products/pace-500-ebike',
    product_url:  'https://www.aventon.com/products/pace-500-ebike',
    ebay_search:  'Aventon Pace 500 electric bike',
    ebay_new_url: 'https://www.ebay.com/itm/374412865069',
    ebay_url:     'https://www.ebay.com/itm/304159309897',
    image_url: 'https://www.aventon.com/cdn/shop/files/01_PACE_Ghost-White_side-_1_a00ea7f8-ed65-49c6-a0be-c041f96b648b.jpg?v=1755057571',
  },
  {
    title: 'KTM Freeride E-XC',
    description: 'Premium Austrian enduro bike — top-tier performance for serious riders',
    new_price: '~$11,499', used_price_typical: '~$5,000–8,000', used_price_min: 4000,
    official_url: 'https://www.ktm.com/en-us/models/e-bikes/freeride-e-xc.html',
    product_url:  'https://www.ktm.com/en-us/models/e-bikes/freeride-e-xc.html',
    ebay_search:  'KTM Freeride E-XC electric',
    image_url: 'https://azwecdnepstoragewebsiteuploads.azureedge.net/PHO_BIKE_90_RE_freeride-ex-c-21-90re_%23SALL_%23AEPI_%23V1.jpg',
  },
];

function initPopularEbikes() {
  const grid = $('popular-ebike-grid');
  if (!grid || grid === _noop) return;
  grid.innerHTML = POPULAR_EBIKES.map(buildEbikeCard).join('');
  // Background-check all direct itm/ links — swap if sold, hide if nothing found
  POPULAR_EBIKES.forEach((b, i) => checkEbikeLinks(b, i));
}

function _itemId(url) {
  if (!url || !url.includes('/itm/')) return null;
  return url.split('/itm/')[1].split('?')[0].replace(/\D/g, '');
}

async function checkEbikeLinks(bike, idx) {
  const search = bike.ebay_search || bike.title;
  const cards  = () => document.querySelectorAll('.ebike-result-card');

  async function checkOne(url, condition) {
    const id = _itemId(url);
    if (!id) return null;
    const cacheKey = `ec-${id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* Safari private mode blocks sessionStorage */ }
    try {
      const r = await fetch(`/api/ebikes/check-listing?item_id=${id}&search=${encodeURIComponent(search)}&condition=${condition}`);
      const data = await r.json();
      try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* private mode */ }
      return data;
    } catch { return null; }
  }

  // Check new link
  if (isDirectLink(bike.ebay_new_url)) {
    const data = await checkOne(bike.ebay_new_url, 'new');
    if (data && !data.available) {
      const card = cards()[idx];
      const btn  = card && card.querySelector('.cheap-btn');
      if (btn) {
        if (data.url) {
          btn.href = data.url;
          btn.textContent = '💸 Find Cheapest New ↗';
          btn.onclick = null;
        } else {
          btn.textContent = '❌ Not Available';
          btn.removeAttribute('href');
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none';
        }
      }
    }
  }

  // Check used link
  if (isDirectLink(bike.ebay_url)) {
    const data = await checkOne(bike.ebay_url, 'used');
    if (data && !data.available) {
      const card = cards()[idx];
      const btn  = card && card.querySelector('.used-btn');
      if (btn) {
        if (data.url) {
          btn.href = data.url;
          btn.textContent = '🏷️ Find Cheapest Used ↗';
          btn.onclick = null;
        } else {
          btn.textContent = '❌ Not Available';
          btn.removeAttribute('href');
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none';
        }
      }
    }
  }
}

function buildEbikeCard(b) {
  const isRare = b.used_price_min === 0;
  const search = b.ebay_search || b.title;
  const usedEbay = b.ebay_url || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(search)}&LH_BIN=1&_sop=15&LH_ItemCondition=3000`;
  const newEbay  = b.ebay_new_url || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(search)}&LH_BIN=1&_sop=15&LH_ItemCondition=1000`;
  const gShop    = b.google_shop_url || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(b.title+' electric bike new')}`;

  // ── New column: up to 3 guaranteed-working buttons ──
  const productUrl  = b.product_url || b.official_url || '';
  const officialUrl = b.official_url || '';
  const showSeparateOfficial = officialUrl && productUrl && officialUrl !== productUrl;

  const buyNewBtn = productUrl
    ? `<a class="ebike-option-btn new-btn" href="${productUrl}" target="_blank" rel="noopener">🛒 Buy New (Direct)</a>`
    : `<a class="ebike-option-btn new-btn" href="${gShop}" target="_blank" rel="noopener">🛒 Buy New</a>`;
  const officialBtn = showSeparateOfficial
    ? `<a class="ebike-option-btn official-btn" href="${officialUrl}" target="_blank" rel="noopener">🌐 Official Site</a>`
    : '';

  // If we already have a direct itm/ link, open it straight away (no live lookup needed)
  const cheapNewBtn = isDirectLink(newEbay)
    ? `<a class="ebike-option-btn cheap-btn" href="${newEbay}"
        target="_blank" rel="noopener">💸 Cheapest New on eBay ↗</a>`
    : `<a class="ebike-option-btn cheap-btn" href="${newEbay}"
        onclick="openDirect(event,this,'${search.replace(/'/g,"\\'")}',1000);return false"
        target="_blank" rel="noopener">💸 Cheapest New on eBay</a>`;

  // ── Used column ──
  let usedSection;
  if (isRare) {
    usedSection = `
      <div class="used-unavail">⚠️ No used listings<br>available right now</div>
      ${productUrl ? `<a class="ebike-option-btn new-btn" href="${productUrl}" target="_blank" rel="noopener" style="margin-top:6px">🛒 Buy New Instead</a>` : buyNewBtn}`;
  } else if (isDirectLink(usedEbay)) {
    // We have a direct itm/ link — open it directly, no live-lookup spinner
    usedSection = `
      <a class="ebike-option-btn used-btn" href="${usedEbay}"
        target="_blank" rel="noopener">🏷️ View Cheapest Used ↗</a>
      <div class="budget-chips">
        <span class="budget-label">Max $</span>
        ${[1000,2000,3000,5000].filter(p => p >= b.used_price_min * 0.8).map(p =>
          `<button class="budget-chip" onclick="filterUsed(this,'${search.replace(/'/g,"\\'")}',${p})">$${p>=1000?(p/1000)+'k':p}</button>`
        ).join('')}
        <button class="budget-chip active" onclick="filterUsed(this,'${search.replace(/'/g,"\\'")}',0)">Any</button>
      </div>`;
  } else {
    usedSection = `
      <a class="ebike-option-btn used-btn" href="${usedEbay}"
        onclick="openDirect(event,this,'${search.replace(/'/g,"\\'")}',3000);return false"
        target="_blank" rel="noopener">🏷️ Find Cheapest Used</a>
      <div class="budget-chips">
        <span class="budget-label">Max $</span>
        ${[1000,2000,3000,5000].filter(p => p >= b.used_price_min * 0.8).map(p =>
          `<button class="budget-chip" onclick="filterUsed(this,'${search.replace(/'/g,"\\'")}',${p})">$${p>=1000?(p/1000)+'k':p}</button>`
        ).join('')}
        <button class="budget-chip active" onclick="filterUsed(this,'${search.replace(/'/g,"\\'")}',0)">Any</button>
      </div>`;
  }

  const imgSrc = b.image_url || `/api/product-image?q=${encodeURIComponent(b.title + ' electric bike')}`;
  return `
  <div class="ebike-result-card">
    <div class="ebike-result-header">
      <img class="ebike-card-img" src="${imgSrc}" alt="${esc(b.title)}" loading="lazy" onerror="this.style.display='none'"/>
      <div class="ebike-result-title">${esc(b.title)}</div>
      ${b.description ? `<div class="ebike-result-desc">${esc(b.description)}</div>` : ''}
    </div>
    <div class="ebike-options-row">
      <div class="ebike-option-col">
        <div class="option-label">🆕 New</div>
        <div class="option-price">${esc(b.new_price) || 'Check dealer'}</div>
        ${officialBtn}
        ${buyNewBtn}
        ${cheapNewBtn}
      </div>
      <div class="ebike-option-divider"></div>
      <div class="ebike-option-col">
        <div class="option-label">🔄 Used</div>
        <div class="option-price">${isRare ? '—' : esc(b.used_price_typical) || 'Check eBay'}</div>
        ${usedSection}
      </div>
    </div>
  </div>`;
}

function searchEbikes() {
  // PAYWALL DISABLED — re-enable when ready
  runEbikeSearch();
}

async function runEbikeSearch() {
  // PAYWALL DISABLED — re-enable when ready
  const q = _pendingSearchQuery || $('ebike-search-input').value.trim() || 'cheap ebike';
  _pendingSearchQuery = null;

  $('ebike-modal-title').textContent = `🚲 "${q}" — New vs Used`;
  $('ebike-results').innerHTML = '';
  show('ebike-loading');
  show('ebike-modal');

  try {
    const res = await fetch(`/api/ebikes/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const grid = $('ebike-results');

    if (data.error === 'subscription_required') {
      hide('ebike-loading'); hide('ebike-modal');
      return;
    }
    if (!Array.isArray(data) || !data.length) {
      grid.innerHTML = `<p style="color:var(--muted);padding:20px 0">No results found. Try different keywords.</p>`;
    } else {
      grid.innerHTML = data.map(buildEbikeCard).join('');
    }
    hide('ebike-loading');
  } catch(e) {
    hide('ebike-loading');
    $('ebike-results').innerHTML = '<p style="color:var(--red)">Search failed. Try again.</p>';
  }
}

/* ── USER ACCOUNT AUTH ───────────────────────────────────── */
let currentUser = null;

function loadUserFromStorage() {
  try { currentUser = JSON.parse(localStorage.getItem('emf_user') || 'null'); } catch {}
  updateHeaderForUser();
}

function updateHeaderForUser() {
  if (currentUser) {
    const firstName = (currentUser.name || currentUser.email || '').split(/[\s@]/)[0];
    $('header-user-name').textContent = `Hi, ${firstName}`;
    $('header-user-name').classList.remove('hidden');
    $('btn-signin-header').classList.add('hidden');
    $('btn-register-header').classList.add('hidden');
    $('btn-signout-header').classList.remove('hidden');
    // Link sub token to account if we have one
    const token = getSubToken();
    if (token && currentUser.email && !currentUser.subLinked) {
      fetch('/api/user/link-sub', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email: currentUser.email, subToken: token }),
      }).then(() => {
        currentUser.subLinked = true;
        localStorage.setItem('emf_user', JSON.stringify(currentUser));
      }).catch(() => {});
    }
  } else {
    $('header-user-name').classList.add('hidden');
    $('btn-signin-header').classList.remove('hidden');
    $('btn-register-header').classList.remove('hidden');
    $('btn-signout-header').classList.add('hidden');
  }
}

function switchAuthTab(tab) {
  ['signin','register'].forEach(t => {
    $(`auth-tab-${t}`).classList.toggle('active', t === tab);
    t === tab ? show(`auth-pane-${t}`) : hide(`auth-pane-${t}`);
  });
}

$('btn-signin-header').addEventListener('click', () => { switchAuthTab('signin'); show('auth-modal'); });
$('btn-register-header').addEventListener('click', () => { switchAuthTab('register'); show('auth-modal'); });
$('btn-close-auth').addEventListener('click', () => hide('auth-modal'));
$('auth-backdrop').addEventListener('click', () => hide('auth-modal'));
$('auth-tab-signin').addEventListener('click', () => switchAuthTab('signin'));
$('auth-tab-register').addEventListener('click', () => switchAuthTab('register'));

$('btn-signout-header').addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('emf_user');
  updateHeaderForUser();
});

// Sign In
$('btn-signin-submit').addEventListener('click', async () => {
  const email = $('signin-email').value.trim();
  const password = $('signin-password').value;
  const errEl = $('signin-error');
  const btn = $('btn-signin-submit');
  if (!email || !password) return;
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const res = await fetch('/api/user/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      currentUser = { name: data.name || email, email, subLinked: !!data.subToken };
      localStorage.setItem('emf_user', JSON.stringify(currentUser));
      if (data.subToken) {
        localStorage.setItem('emf_sub_token', data.subToken);
      }
      updateHeaderForUser();
      hide('auth-modal');
    } else {
      errEl.textContent = data.error || 'Invalid email or password.';
      errEl.classList.remove('hidden');
    }
  } catch { errEl.textContent = 'Connection error — try again.'; errEl.classList.remove('hidden'); }
  btn.disabled = false; btn.textContent = 'Sign In →';
});

// Create Account
$('btn-register-submit').addEventListener('click', async () => {
  const name = $('register-name').value.trim();
  const email = $('register-email').value.trim();
  const password = $('register-password').value;
  const errEl = $('register-error');
  const btn = $('btn-register-submit');
  if (!email || !password) return;
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const res = await fetch('/api/user/register', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password, subToken: getSubToken() || undefined }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      currentUser = { name: name || email, email, subLinked: true };
      localStorage.setItem('emf_user', JSON.stringify(currentUser));
      updateHeaderForUser();
      hide('auth-modal');
    } else {
      errEl.textContent = data.error || 'Could not create account.';
      errEl.classList.remove('hidden');
    }
  } catch { errEl.textContent = 'Connection error — try again.'; errEl.classList.remove('hidden'); }
  btn.disabled = false; btn.textContent = 'Create Account →';
});

// Enter key support
['signin-email','signin-password'].forEach(id => $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-signin-submit').click(); }));
['register-name','register-email','register-password'].forEach(id => $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-register-submit').click(); }));

/* ── OWNER LOGIN (hidden — triple-click logo to access) ──── */
document.querySelector('.logo').addEventListener('click', (() => {
  let clicks = 0, t;
  return () => {
    clicks++;
    clearTimeout(t);
    t = setTimeout(() => { clicks = 0; }, 600);
    if (clicks >= 3) { clicks = 0; $('owner-signin-section').classList.remove('hidden'); show('auth-modal'); switchAuthTab('signin'); }
  };
})());

$('btn-owner-submit').addEventListener('click', async () => {
  const username = $('owner-username').value.trim();
  const password = $('owner-password').value;
  const errEl    = $('owner-error');
  const btn      = $('btn-owner-submit');
  if (!username || !password) return;
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'include',
      body: JSON.stringify({username, password}),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      window.location.replace('/admin');
    } else {
      errEl.textContent = data.error || 'Invalid credentials';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Sign In as Owner →';
    }
  } catch {
    errEl.textContent = 'Connection error — try again';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Sign In as Owner →';
  }
});

// Allow Enter key in owner fields
['owner-username','owner-password'].forEach(id => {
  $(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') $('btn-owner-submit').click();
  });
});

/* ── TERMS ───────────────────────────────────────────────── */
$('btn-show-terms').addEventListener('click', e => { e.preventDefault(); show('terms-modal'); });
$('btn-close-terms').addEventListener('click', () => hide('terms-modal'));
$('terms-backdrop').addEventListener('click', () => hide('terms-modal'));
$('btn-accept-terms').addEventListener('click', () => {
  hide('terms-modal');
  $('terms-check').checked = true;
  $('terms-check').dispatchEvent(new Event('change'));
});
$('footer-terms').addEventListener('click', e => { e.preventDefault(); show('terms-modal'); });

/* ── UNLOCK / STRIPE ─────────────────────────────────────── */
function handleUnlock(modJson) {
  const mod = JSON.parse(modJson);
  if (!currentUser) {
    pendingUnlockMod = mod;
    $('auth-title').textContent = 'Sign In to Unlock Best Price';
    show('auth-modal');
    return;
  }
  doUnlock(mod);
}

async function doUnlock(mod) {
  const directUrl = mod.ebay_direct || mod.amazon_direct || mod.amazon_search_link || '';
  try {
    const res = await fetch('/create-checkout', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mod_title:mod.title, price_cents:mod.unlock_cents||100, direct_url:directUrl, savings:mod.savings||0})
    });
    const data = await res.json();
    if (data.checkout_url) location.href = data.checkout_url;
    else showUnlockSuccess(mod.title, directUrl);
  } catch { showUnlockSuccess(mod.title, directUrl); }
}

async function verifyUnlock(sid) {
  try {
    const res = await fetch('/verify-unlock', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({session_id:sid})});
    const data = await res.json();
    if (data.success) showUnlockSuccess(data.mod_title, data.direct_url);
  } catch {}
}

function showUnlockSuccess(title, url) {
  $('unlock-link').href = url; $('unlock-link').textContent = url || 'Open Link';
  show('unlock-modal');
}

$('btn-close-unlock').addEventListener('click', () => hide('unlock-modal'));
$('unlock-backdrop').addEventListener('click', () => hide('unlock-modal'));

/* ── BROWSE ALL MODS ─────────────────────────────────────── */
document.addEventListener('click', e => {
  if (e.target.id === 'btn-browse-all') {
    show('trending-section');
    $('trending-section').scrollIntoView({behavior:'smooth'});
  }
});

/* ── SCAM CHECKER ────────────────────────────────────────── */
$('btn-scam-check').addEventListener('click', runScamCheck);
$('scam-url-input').addEventListener('keydown', e => { if(e.key==='Enter') runScamCheck(); });

async function runScamCheck() {
  // PAYWALL DISABLED — re-enable when ready
  // if (!getSubToken()) { showPaywall(); return; }
  const url = $('scam-url-input').value.trim();
  if (!url) return;
  show('scam-loading'); hide('scam-result');
  try {
    const res = await fetch('/api/scam-check', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url})
    });
    const d = await res.json();
    hide('scam-loading');
    if (d.error) {
      $('scam-result').innerHTML = `<p style="color:var(--red)">⚠️ ${esc(d.error)}</p>`;
      show('scam-result'); return;
    }
    const pct = d.scam_percentage || 0;
    const cls = pct >= 60 ? 'danger' : pct >= 30 ? 'warning' : 'safe';
    const redHtml = (d.red_flags||[]).map(f=>`<div class="scam-detail-item"><span>🚨</span><span>${esc(f)}</span></div>`).join('');
    const greenHtml = (d.green_flags||[]).map(f=>`<div class="scam-detail-item"><span>✅</span><span>${esc(f)}</span></div>`).join('');
    $('scam-result').innerHTML = `
      <div class="scam-result-box ${cls}">
        <div class="scam-score-row">
          <div class="scam-score-badge ${cls}">${pct}% Scam Risk</div>
          <div>
            <div class="scam-verdict">${esc(d.verdict_emoji||'')} ${esc(d.verdict||'')}</div>
            <div style="font-size:.8rem;color:var(--muted)">${esc(d.domain||'')}</div>
          </div>
        </div>
        <p style="font-size:.85rem;color:var(--text)">${esc(d.recommendation||'')}</p>
        ${greenHtml ? `<div class="scam-detail-list">${greenHtml}</div>` : ''}
        ${redHtml ? `<div class="scam-detail-list">${redHtml}</div>` : ''}
      </div>`;
    show('scam-result');
  } catch(e) {
    hide('scam-loading');
    $('scam-result').innerHTML = `<p style="color:var(--red)">Failed to check. Try again.</p>`;
    show('scam-result');
  }
}

/* ── HELPERS ─────────────────────────────────────────────── */
const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
