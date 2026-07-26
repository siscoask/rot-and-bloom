(() => {
  'use strict';

  /* =========================================================
     Storage keys & state
     ========================================================= */
  const STORE_KEY = 'rb_items_v1';
  const PREFS_KEY = 'rb_prefs_v1';
  const SEEN_INTRO_KEY = 'rb_seen_intro_v1';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const FAST_UNIT_MS = 10 * 1000; // in fast mode, 1 "day" = 10 seconds

  let items = loadItems();
  let prefs = loadPrefs();
  let activeDetailId = null;

  function loadItems(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveItems(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(items)); }
    catch(e){ showToast("Couldn't save — storage may be full"); }
  }
  function loadPrefs(){
    try{
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : { reduceMotion: false, fastMode: false };
    }catch(e){ return { reduceMotion: false, fastMode: false }; }
  }
  function savePrefs(){
    try{ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(e){}
  }

  /* =========================================================
     Fertilizer lines — revealed at harvest
     ========================================================= */
  const FERTILIZER_LINES = [
    "Not everything needs a sequel.",
    "You kept it warm long enough. Let it go cold.",
    "It cost you nothing to carry, and everything.",
    "The story's over. You just kept re-reading it.",
    "Some things are only heavy while you're holding them.",
    "It was never really about them.",
    "You don't owe it a resolution.",
    "This one taught you where your edges are.",
    "Nothing here needs your permission to be over.",
    "You get to stop being the narrator of this one.",
    "It was true. It's also done.",
    "Not forgiveness. Just less weight.",
    "You survived it before you finished processing it.",
    "The grudge was never as strong as your grip on it.",
    "It's soil now. Soil doesn't remember.",
    "You don't have to win it to be done with it.",
    "That version of you handled it fine.",
    "Some doors close better than they open.",
    "It wasn't wasted. It composted.",
    "You can let it go without deciding it didn't matter.",
    "The apology you wanted isn't coming. This is instead.",
    "It's allowed to just… end.",
    "You already know how this one turns out.",
    "Some things are worth less than the space they take up.",
    "It's not closure. It's compost. Close enough.",
    "This one's done being useful to you.",
    "You get the last word now, and the last word is nothing.",
    "It's lighter already. You just haven't noticed yet.",
    "Not every ending needs an explanation attached.",
    "You held it. That was enough. You can put it down."
  ];
  function pickFertilizerLine(seed){
    const idx = Math.abs(hashStr(seed)) % FERTILIZER_LINES.length;
    return FERTILIZER_LINES[idx];
  }
  function hashStr(str){
    let h = 0;
    for(let i=0;i<str.length;i++){ h = (h<<5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }

  /* =========================================================
     DOM refs
     ========================================================= */
  const $ = (sel) => document.querySelector(sel);
  const yardEl = $('#yard');
  const emptyStateEl = $('#emptyState');
  const yardStatsEl = $('#yardStats');
  const toastEl = $('#toast');

  /* =========================================================
     Bin SVG — the signature visual
     progress: 0..1
     ========================================================= */
  function tierForDays(days){
    if(days <= 7) return 'small';
    if(days <= 30) return 'medium';
    return 'large';
  }

  const SPROUTS = {
    small: `
      <g>
        <path d="M50 45 C50 39, 47 36, 47 31" stroke="#8CA084" stroke-width="2" fill="none" stroke-linecap="round"/>
        <ellipse cx="45" cy="31" rx="5" ry="3.2" fill="#8CA084" transform="rotate(-20 45 31)"/>
      </g>`,
    medium: `
      <g>
        <path d="M50 46 C50 34, 44 30, 44 22" stroke="#8CA084" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="41" cy="22" rx="7" ry="4.5" fill="#8CA084" transform="rotate(-25 41 22)"/>
        <ellipse cx="49" cy="17" rx="6" ry="4" fill="#7C9473" transform="rotate(15 49 17)"/>
      </g>`,
    large: `
      <g>
        <path d="M50 46 C50 30, 42 26, 42 14" stroke="#8CA084" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <ellipse cx="38" cy="28" rx="7" ry="4.5" fill="#7C9473" transform="rotate(-30 38 28)"/>
        <ellipse cx="47" cy="20" rx="6.5" ry="4.2" fill="#8CA084" transform="rotate(20 47 20)"/>
        <g transform="translate(42 12)">
          <circle cx="4.2" cy="-1" r="3" fill="#C1703C" opacity="0.85"/>
          <circle cx="-4.2" cy="-1" r="3" fill="#C1703C" opacity="0.85"/>
          <circle cx="0" cy="-4.5" r="3" fill="#C1703C" opacity="0.85"/>
          <circle r="1.6" fill="#EDE3D0"/>
        </g>
      </g>`
  };

  // options: { progress, ready, grown, days }
  function binSvg(opts){
    const { progress = 0, ready = false, grown = false, days = 30 } = opts;
    const p = Math.max(0, Math.min(1, progress));
    // fill color shifts from a lighter clay to a darker rich compost brown
    const fillColor = mixColor('#6B5138', '#241A10', p);
    const soilLevel = 68 - p * 30; // fill rises as it composts (y coordinate, lower = higher fill)

    const steam = (!grown && p < 0.15) ? `
      <g opacity="0.8">
        <ellipse class="steam" cx="35" cy="30" rx="3" ry="8" fill="#EDE3D0"/>
        <ellipse class="steam s2" cx="50" cy="26" rx="3" ry="9" fill="#EDE3D0"/>
        <ellipse class="steam s3" cx="64" cy="30" rx="3" ry="8" fill="#EDE3D0"/>
      </g>` : '';

    const budding = `
      <g>
        <path d="M50 46 C50 40, 47 37, 47 32" stroke="#8CA084" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="45" cy="32" rx="4.5" ry="3" fill="#8CA084" transform="rotate(-20 45 32)"/>
      </g>`;

    const sprout = grown ? SPROUTS[tierForDays(days)] : (ready ? budding : '');

    return `
    <svg class="bin-svg ${ready && !grown ? 'ready-pulse' : ''}" viewBox="0 0 100 100" role="img" aria-hidden="true">
      <path class="bin-shape" d="M22 42 Q20 84 50 90 Q80 84 78 42 Q79 30 50 28 Q21 30 22 42 Z"
        fill="#332619" stroke="#4A3A2C" stroke-width="1.5"/>
      <clipPath id="clip-${Math.round(p*1000)}">
        <path d="M24 43 Q22 82 50 88 Q78 82 76 43 Q77 32 50 30 Q23 32 24 43 Z"/>
      </clipPath>
      <rect x="20" y="${soilLevel}" width="60" height="40" fill="${fillColor}" clip-path="url(#clip-${Math.round(p*1000)})"/>
      <ellipse cx="50" cy="29" rx="29" ry="6" fill="none" stroke="#5C4A38" stroke-width="1.5"/>
      ${steam}
      ${sprout}
    </svg>`;
  }

  function dustMotes(){
    let out = '';
    for(let i=0;i<7;i++){
      const angle = Math.random()*Math.PI*2;
      const dist = 22 + Math.random()*28;
      const dx = (Math.cos(angle)*dist).toFixed(1);
      const dy = (Math.sin(angle)*dist - 8).toFixed(1);
      const delay = (Math.random()*0.12).toFixed(2);
      const left = 42 + Math.random()*16;
      const top = 55 + Math.random()*15;
      out += `<span class="dust-mote" style="--dx:${dx}px;--dy:${dy}px;left:${left}%;top:${top}%;animation-delay:${delay}s;"></span>`;
    }
    return out;
  }

  function mixColor(hexA, hexB, t){
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r-a.r)*t);
    const g = Math.round(a.g + (b.g-a.g)*t);
    const bl = Math.round(a.b + (b.b-a.b)*t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(hex){
    const v = hex.replace('#','');
    return { r: parseInt(v.substring(0,2),16), g: parseInt(v.substring(2,4),16), b: parseInt(v.substring(4,6),16) };
  }

  /* =========================================================
     Time helpers
     ========================================================= */
  function unitMs(){ return prefs.fastMode ? FAST_UNIT_MS : DAY_MS; }

  function getProgress(item){
    if(item.state === 'grown') return 1;
    const elapsed = Date.now() - item.createdAt;
    const total = item.days * unitMs();
    return Math.max(0, Math.min(1, elapsed / total));
  }
  function isReady(item){
    return item.state === 'composting' && getProgress(item) >= 1;
  }
  function timeRemainingLabel(item){
    const total = item.days * unitMs();
    const elapsed = Date.now() - item.createdAt;
    const remaining = Math.max(0, total - elapsed);
    if(prefs.fastMode){
      const secs = Math.ceil(remaining/1000);
      return secs <= 0 ? 'ready' : `${secs}s left`;
    }
    const daysLeft = Math.ceil(remaining / DAY_MS);
    if(daysLeft <= 0) return 'ready';
    if(daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  }

  /* =========================================================
     Rendering
     ========================================================= */
  function render(){
    // sync ready states
    let changed = false;
    items.forEach(it => {
      if(it.state === 'composting' && isReady(it)){
        // stays 'composting' but flagged ready visually; harvesting is a user action
        changed = true;
      }
    });

    if(items.length === 0){
      yardEl.innerHTML = '';
      emptyStateEl.classList.remove('hidden');
    }else{
      emptyStateEl.classList.add('hidden');
      yardEl.innerHTML = items
        .slice()
        .sort((a,b) => a.createdAt - b.createdAt)
        .map(renderPlot)
        .join('');
    }

    renderStats();
  }

  function renderPlot(item){
    const grown = item.state === 'grown';
    const ready = isReady(item);
    const progress = getProgress(item);
    const svg = binSvg({ progress, ready, grown, days: item.days });
    let stateLabel;
    if(grown) stateLabel = 'grown';
    else if(ready) stateLabel = 'ready';
    else stateLabel = timeRemainingLabel(item);

    const caption = grown ? 'released' : `day ${Math.min(item.days, Math.ceil(progress*item.days))} of ${item.days}`;

    const plotClass = item.diggingUp ? 'plot digging' : 'plot';
    const btnClass = 'plot-btn' + (item.justGrown ? ' sprouting' : '');
    const motes = item.diggingUp ? dustMotes() : '';

    return `
      <div class="${plotClass}">
        <button class="${btnClass}" data-id="${item.id}" aria-label="${grown ? 'View what grew from this' : 'Open this burial'}" ${item.diggingUp ? 'disabled' : ''}>
          ${svg}
          ${motes}
        </button>
        <div class="plot-caption">${grown ? 'Grown' : caption}<span class="state">${stateLabel}</span></div>
      </div>`;
  }

  function renderStats(){
    const activeCount = items.filter(i => i.state === 'composting').length;
    const grownCount = items.filter(i => i.state === 'grown').length;
    if(items.length === 0){ yardStatsEl.innerHTML = ''; return; }
    yardStatsEl.innerHTML = `<span><strong>${activeCount}</strong> composting</span><span><strong>${grownCount}</strong> released</span>`;
  }

  /* =========================================================
     Toast
     ========================================================= */
  let toastTimer = null;
  const toastMsgEl = $('#toastMsg');
  const toastActionEl = $('#toastAction');
  function showToast(msg, actionLabel, actionFn){
    toastMsgEl.textContent = msg;
    if(actionLabel && actionFn){
      toastActionEl.textContent = actionLabel;
      toastActionEl.classList.remove('hidden');
      toastActionEl.onclick = () => { actionFn(); toastEl.classList.remove('show'); };
    }else{
      toastActionEl.classList.add('hidden');
      toastActionEl.onclick = null;
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), actionLabel ? 7000 : 2600);
  }

  /* =========================================================
     Overlays
     ========================================================= */
  function openOverlay(id){
    document.getElementById(id).classList.add('open');
  }
  function closeOverlay(id){
    document.getElementById(id).classList.remove('open');
  }
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if(e.target === ov) ov.classList.remove('open'); });
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      document.querySelectorAll('.overlay.open').forEach(ov => ov.classList.remove('open'));
    }
  });

  /* =========================================================
     Bury flow
     ========================================================= */
  const buryBtn = $('#buryBtn');
  const grudgeInput = $('#grudgeInput');
  const durationRow = $('#durationRow');
  const confirmBuryBtn = $('#confirmBuryBtn');
  let selectedDays = 30;

  buryBtn.addEventListener('click', () => {
    grudgeInput.value = '';
    confirmBuryBtn.disabled = true;
    openOverlay('buryOverlay');
    setTimeout(() => grudgeInput.focus(), 250);
  });

  grudgeInput.addEventListener('input', () => {
    confirmBuryBtn.disabled = grudgeInput.value.trim().length === 0;
  });

  durationRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.duration-chip');
    if(!chip) return;
    durationRow.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedDays = parseInt(chip.dataset.days, 10);
  });

  confirmBuryBtn.addEventListener('click', () => {
    const text = grudgeInput.value.trim();
    if(!text) return;
    const item = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      text,
      days: selectedDays,
      createdAt: Date.now(),
      state: 'composting'
    };
    items.push(item);
    saveItems();
    closeOverlay('buryOverlay');
    render();
    showToast('Buried. Come back later.');
  });

  /* =========================================================
     Detail flow
     ========================================================= */
  yardEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.plot-btn');
    if(!btn) return;
    openDetail(btn.dataset.id);
  });

  const detailActiveView = $('#detailActiveView');
  const detailHarvestView = $('#detailHarvestView');
  const detailGrownView = $('#detailGrownView');

  function openDetail(id){
    const item = items.find(i => i.id === id);
    if(!item) return;
    activeDetailId = id;

    detailActiveView.classList.add('hidden');
    detailHarvestView.classList.add('hidden');
    detailGrownView.classList.add('hidden');

    if(item.state === 'grown'){
      $('#grownFertilizerLine').textContent = item.fertilizer || pickFertilizerLine(item.id);
      $('#grownGrudgeText').textContent = item.text;
      detailGrownView.classList.remove('hidden');
    }else if(isReady(item)){
      const line = item.fertilizer || pickFertilizerLine(item.id);
      item.fertilizer = line; // lock it in so it doesn't change on reopen
      saveItems();
      $('#fertilizerLine').textContent = line;
      $('#harvestIcon').innerHTML = binSvg({ progress: 1, ready: true, grown: false, days: item.days });
      detailHarvestView.classList.remove('hidden');
    }else{
      const progress = getProgress(item);
      $('#detailProgressFill').style.width = (progress*100) + '%';
      $('#detailProgressCaption').textContent = timeRemainingLabel(item);
      $('#detailGrudgeText').textContent = item.text;
      detailActiveView.classList.remove('hidden');
    }
    openOverlay('detailOverlay');
  }

  function haptic(ms){
    if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} }
  }

  $('#digUpBtn').addEventListener('click', () => {
    if(!activeDetailId) return;
    if(!confirm('Dig this up early and delete it? This can\'t be undone.')) return;
    const id = activeDetailId;
    const item = items.find(i => i.id === id);
    closeOverlay('detailOverlay');
    if(!item){ return; }
    haptic(20);
    if(prefs.reduceMotion){
      items = items.filter(i => i.id !== id);
      saveItems();
      render();
      showToast('Dug up.');
      return;
    }
    item.diggingUp = true;
    render();
    showToast('Dug up.');
    setTimeout(() => {
      items = items.filter(i => i.id !== id);
      saveItems();
      render();
    }, 680);
  });

  $('#harvestConfirmBtn').addEventListener('click', () => {
    if(!activeDetailId) return;
    const item = items.find(i => i.id === activeDetailId);
    if(!item) return;
    item.state = 'grown';
    item.grownAt = Date.now();
    item.justGrown = true;
    saveItems();
    closeOverlay('detailOverlay');
    haptic(12);
    render();
    showToast('It grew into something.');
    setTimeout(() => {
      item.justGrown = false;
      saveItems();
      render();
    }, 900);
  });

  /* =========================================================
     Settings
     ========================================================= */
  $('#settingsBtn').addEventListener('click', () => openOverlay('settingsOverlay'));

  const motionToggle = $('#motionToggle');
  const demoToggle = $('#demoToggle');

  function syncPrefUI(){
    motionToggle.classList.toggle('on', prefs.reduceMotion);
    motionToggle.setAttribute('aria-checked', String(prefs.reduceMotion));
    demoToggle.classList.toggle('on', prefs.fastMode);
    demoToggle.setAttribute('aria-checked', String(prefs.fastMode));
    document.body.classList.toggle('reduce-motion', prefs.reduceMotion);
  }

  motionToggle.addEventListener('click', () => {
    prefs.reduceMotion = !prefs.reduceMotion;
    savePrefs(); syncPrefUI();
  });
  demoToggle.addEventListener('click', () => {
    prefs.fastMode = !prefs.fastMode;
    savePrefs(); syncPrefUI();
    showToast(prefs.fastMode ? 'Fast mode on — 1 day ≈ 10 seconds' : 'Fast mode off');
    render();
  });

  $('#exportBtn').addEventListener('click', () => {
    const data = JSON.stringify({ items, exportedAt: Date.now() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rot-and-bloom-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported.');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        if(!Array.isArray(parsed.items)) throw new Error('bad format');
        items = parsed.items;
        saveItems();
        render();
        showToast('Imported.');
        closeOverlay('settingsOverlay');
      }catch(err){
        showToast("Couldn't read that file");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#clearAllBtn').addEventListener('click', () => {
    if(!confirm('Clear everything? This deletes all burials and can\'t be undone.')) return;
    items = [];
    saveItems();
    render();
    closeOverlay('settingsOverlay');
    showToast('Cleared.');
  });

  /* =========================================================
     Intro ritual (first open only)
     ========================================================= */
  const INTRO_STEPS = [
    {
      icon: `<svg viewBox="0 0 64 64" fill="none"><path d="M14 26 Q13 52 32 57 Q51 52 50 26 Q51 16 32 15 Q13 16 14 26 Z" stroke="#8CA084" stroke-width="2"/></svg>`,
      title: 'Something\u2019s bothering you.',
      body: 'Write it down. No one else will read it — it stays on this device.'
    },
    {
      icon: `<svg viewBox="0 0 64 64" fill="none"><path d="M14 26 Q13 52 32 57 Q51 52 50 26 Q51 16 32 15 Q13 16 14 26 Z" stroke="#C1703C" stroke-width="2"/><rect x="18" y="34" width="28" height="18" fill="#8A4F2C" opacity="0.5"/></svg>`,
      title: 'Bury it. Let it sit.',
      body: 'It breaks down slowly, on its own schedule. You don\u2019t have to think about it.'
    },
    {
      icon: `<svg viewBox="0 0 64 64" fill="none"><path d="M14 26 Q13 52 32 57 Q51 52 50 26 Q51 16 32 15 Q13 16 14 26 Z" stroke="#8CA084" stroke-width="2"/><path d="M32 30 C32 22 27 19 27 12" stroke="#8CA084" stroke-width="2" stroke-linecap="round"/></svg>`,
      title: 'Come back later.',
      body: 'It\u2019ll have turned into something else — a small line, a small plant, and less weight.'
    }
  ];
  let introStep = 0;
  const introCard = $('#introCard');

  function renderIntro(){
    const step = INTRO_STEPS[introStep];
    const isLast = introStep === INTRO_STEPS.length - 1;
    introCard.innerHTML = `
      <div class="intro-icon">${step.icon}</div>
      <h2>${step.title}</h2>
      <p style="color:var(--bone-dim); font-size:0.92rem; margin-top:8px;">${step.body}</p>
      <div class="intro-dots">
        ${INTRO_STEPS.map((_, i) => `<span class="${i === introStep ? 'active' : ''}"></span>`).join('')}
      </div>
      <div class="intro-nav">
        ${introStep > 0 ? `<button class="btn-ghost" id="introBack">Back</button>` : ''}
        <button class="btn-primary" id="introNext">${isLast ? 'Start' : 'Next'}</button>
      </div>
    `;
    $('#introNext').addEventListener('click', () => {
      if(isLast){
        localStorage.setItem(SEEN_INTRO_KEY, '1');
        closeOverlay('introOverlay');
      }else{
        introStep++;
        renderIntro();
      }
    });
    const backBtn = $('#introBack');
    if(backBtn) backBtn.addEventListener('click', () => { introStep--; renderIntro(); });
  }

  function maybeShowIntro(){
    if(!localStorage.getItem(SEEN_INTRO_KEY)){
      introStep = 0;
      renderIntro();
      openOverlay('introOverlay');
    }
  }

  /* =========================================================
     Install banner (custom — not the default browser prompt)
     ========================================================= */
  const installBanner = $('#installBanner');
  const INSTALL_DISMISSED_KEY = 'rb_install_dismissed';
  let deferredInstallPrompt = null;

  function isStandalone(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if(!localStorage.getItem(INSTALL_DISMISSED_KEY) && !isStandalone()){
      installBanner.classList.remove('hidden');
      requestAnimationFrame(() => installBanner.classList.add('show'));
    }
  });

  const installBtn = $('#installBtn');
  if(installBtn){
    installBtn.addEventListener('click', async () => {
      installBanner.classList.remove('show');
      if(!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      try{
        const { outcome } = await deferredInstallPrompt.userChoice;
        if(outcome === 'accepted') showToast('Installed.');
      }catch(e){}
      deferredInstallPrompt = null;
    });
  }
  const installDismiss = $('#installDismiss');
  if(installDismiss){
    installDismiss.addEventListener('click', () => {
      installBanner.classList.remove('show');
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    });
  }
  window.addEventListener('appinstalled', () => {
    installBanner.classList.remove('show');
    installBanner.classList.add('hidden');
  });

  /* =========================================================
     Init
     ========================================================= */
  function init(){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      prefs.reduceMotion = true;
    }
    syncPrefUI();
    render();
    maybeShowIntro();

    // live re-render so bins visibly decay / become ready without reload
    setInterval(render, prefs.fastMode ? 1000 : 60 * 1000);
    setInterval(() => { if(prefs.fastMode) render(); }, 1000);

    window.addEventListener('online', () => showToast('Back online.'));
    window.addEventListener('offline', () => showToast("You're offline — everything here still works."));

    if('serviceWorker' in navigator){
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if(!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
                showToast('New version ready.', 'Refresh', () => window.location.reload());
              }
            });
          });
        }).catch(() => {});
      });
    }
  }

  init();
})();
