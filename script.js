/* =============================================
   LearnBetter — script.js
============================================= */

// ── Mobile hamburger toggle ───────────────────
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobile');

if (hamburger && mobileMenu) {
  const openIcon  = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
  const closeIcon = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>`;

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent document handler from immediately closing
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.innerHTML = isOpen ? closeIcon : openIcon;
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  // Close on outside click/touch
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.innerHTML = openIcon;
    }
  });
  document.addEventListener('touchstart', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.innerHTML = openIcon;
    }
  }, { passive: true });

  // Close when a mobile link is tapped
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.innerHTML = openIcon;
    });
  });
}

// ── Scroll-Controlled Video Hero ─────────────
(function () {
  const MIN_TIME   = 0.2;
  const SENSITIVITY = 2000;
  const BASE_OPACITY = 0.2;
  const IDLE_OPACITY = 0.7;
  const IDLE_BLUR    = 8;

  const CONTENT = [
    {
      title:    'Own What You Learn. Forever.',
      subtitle: 'LearnBetter is the only platform that automates your learning by capturing and locking in the best ideas from everything you watch and read.'
    },
    {
      title:    'Never Forget Your Best Ideas.',
      subtitle: 'Our smart engine predicts when you\'re about to forget and triggers the perfect review to lock knowledge in for life.'
    },
    {
      title:    'Build Your Library of Mastery.',
      subtitle: 'Knowledge is your greatest asset. Turn everything you consume into permanent career capital that scales as you grow.'
    }
  ];

  const container = document.getElementById('svContainer');
  const video     = document.getElementById('svVideo');
  const overlay   = document.getElementById('svOverlay');
  const titleEl   = document.getElementById('svTitle');
  const subtitleEl= document.getElementById('svSubtitle');
  const textInner = document.getElementById('svTextInner');
  const hint      = document.getElementById('svHint');

  if (!container || !video) return;

  let targetTime     = MIN_TIME;
  let isActive       = false;     // true while scrolling
  let scrollTimer    = null;
  let touchStartY    = 0;
  let isScrubbing    = false;
  let currentPhase   = 0;
  let lastOpacity    = -1;
  let lastBlur       = -1;

  // Responsive video sources
  const VIDEOS = {
    desktop: 'https://storage.googleapis.com/learn_better_home/Desktop%20Home.mp4',
    tablet:  'https://storage.googleapis.com/learn_better_home/Generating%20Video%20From%20Narrative%20Waifu2x%203840X2160%20Mp4(1).mp4',
    mobile:  'https://storage.googleapis.com/learn_better_home/MOBILE%20Learn%20Better%20Home.mp4',
  };

  function getVideoUrl() {
    const w = window.innerWidth;
    if (w < 768)  return VIDEOS.mobile;
    if (w < 1024) return VIDEOS.tablet;
    return VIDEOS.desktop;
  }

  function setVideoSource() {
    const url = getVideoUrl();
    if (video.src !== url) {
      video.src = url;
      video.load();
    }
  }

  setVideoSource();
  window.addEventListener('resize', setVideoSource);

  // Init once data is ready
  function initVideo() {
    video.pause();
    video.muted     = true;
    video.playsInline = true;
    if (video.duration >= MIN_TIME) {
      video.currentTime = MIN_TIME;
      targetTime        = MIN_TIME;
    }
    video.classList.add('loaded');
  }
  if (video.readyState >= 2) initVideo();
  else { video.load(); video.addEventListener('loadeddata', initVideo, { once: true }); }

  // Phase transition
  function setPhase(phase) {
    if (phase === currentPhase) return;
    currentPhase = phase;
    if (!textInner) return;
    textInner.style.opacity   = '0';
    textInner.style.transform = 'translateY(8px)';
    setTimeout(() => {
      titleEl.textContent    = CONTENT[phase].title;
      subtitleEl.textContent = CONTENT[phase].subtitle;
      textInner.style.opacity   = '1';
      textInner.style.transform = 'translateY(0)';
    }, 280);
  }

  // Boundary check — when at edge, don't preventDefault so page can scroll
  function atBoundary(dir) {
    const eps = 0.1;
    if (dir === 'forward')  return targetTime >= (video.duration || 999) - MIN_TIME - eps;
    if (dir === 'backward') return targetTime <= MIN_TIME + eps;
    return false;
  }

  // Mark as actively scrolling → clears after 250 ms idle
  function markActive() {
    isActive = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { isActive = false; }, 250);
  }

  // rAF render loop
  function loop() {
    if (video.readyState >= 2 && !video.seeking) {
      const diff    = targetTime - video.currentTime;
      const absDiff = Math.abs(diff);
      const mobile  = window.innerWidth < 768;

      if (absDiff > 0.001) {
        if (targetTime <= MIN_TIME + 0.05) {
          video.currentTime = targetTime;
        } else if (mobile) {
          if (absDiff > 0.03) video.currentTime = targetTime;
        } else {
          if (absDiff > 0.05) video.currentTime += diff * 0.2;
          else video.currentTime = targetTime;
        }
      }

      // Hide scroll hint after first interaction
      if (hint && video.currentTime > MIN_TIME + 0.5) hint.style.opacity = '0';

      // Phase detection
      if (video.duration) {
        const progress = (video.currentTime - MIN_TIME) / (video.duration - MIN_TIME);
        const phase = progress > 0.66 ? 2 : progress > 0.33 ? 1 : 0;
        setPhase(phase);
      }

      // Overlay focus-mode (dirty check to avoid thrashing)
      if (overlay) {
        const tOpacity = isActive ? BASE_OPACITY : IDLE_OPACITY;
        const tBlur    = isActive ? 0 : IDLE_BLUR;
        if (tOpacity !== lastOpacity || tBlur !== lastBlur) {
          overlay.style.opacity             = tOpacity;
          overlay.style.backdropFilter      = `blur(${tBlur}px)`;
          overlay.style.webkitBackdropFilter= `blur(${tBlur}px)`;
          lastOpacity = tOpacity;
          lastBlur    = tBlur;
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();

  // ── Wheel ───────────────────────────────────
  container.addEventListener('wheel', (e) => {
    if (!video || isNaN(video.duration)) return;
    const dir = e.deltaY > 0 ? 'forward' : 'backward';
    if (atBoundary(dir)) return;           // let page scroll naturally at edges
    e.preventDefault();
    markActive();
    const abs  = Math.abs(e.deltaY);
    const step = (abs * (abs > 50 ? 12 : 6)) / SENSITIVITY;
    targetTime = Math.max(MIN_TIME, Math.min(video.duration - MIN_TIME,
      dir === 'forward' ? targetTime + step : targetTime - step
    ));
  }, { passive: false });

  // ── Touch ───────────────────────────────────
  container.addEventListener('touchstart', (e) => {
    touchStartY  = e.touches[0].clientY;
    isScrubbing  = false;
    // Unlock video on iOS with a silent play/pause
    if (video.paused) video.play().then(() => video.pause()).catch(() => {});
    markActive();
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    if (!video || isNaN(video.duration)) return;
    const touchY = e.touches[0].clientY;
    const delta  = touchStartY - touchY;
    const dir    = delta > 0 ? 'forward' : 'backward';
    const atEdge = atBoundary(dir);

    if (isScrubbing && e.cancelable) e.preventDefault();
    else if (!atEdge) { isScrubbing = true; if (e.cancelable) e.preventDefault(); }

    markActive();
    const step = Math.abs(delta) / (SENSITIVITY / 20);
    targetTime = Math.max(MIN_TIME, Math.min(video.duration - MIN_TIME,
      dir === 'forward' ? targetTime + step : targetTime - step
    ));
    touchStartY = touchY;
  }, { passive: false });
})();

// ── Active nav link ───────────────────────────
(function setActiveNav() {
  const links = document.querySelectorAll('.nav-links a');
  const path = location.pathname.split('/').pop() || 'index.html';
  links.forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path) a.classList.add('active');
  });
})();

// ── Intersection Observer — scroll reveals ────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || 0);
      setTimeout(() => el.classList.add('visible'), delay);
      revealObserver.unobserve(el);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

// Stagger children inside a parent grid
function observeGroup(selector, baseDelay = 80) {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.dataset.delay = i * baseDelay;
    revealObserver.observe(el);
  });
}

observeGroup('.rs-card', 80);
observeGroup('.step-card', 100);
observeGroup('.t-card', 80);
document.querySelectorAll('.fade-up').forEach(el => revealObserver.observe(el));

// ── Bloom's Taxonomy Slider ───────────────────
(function () {
  if (!document.getElementById('bloomsCard')) return;

  const PRIMARY = '#3457A5';

  function getTint(hex, op) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${op})`;
  }

  const TAXONOMY = [
    {
      level:'Remember', abbrev:'Rem',
      context:'Laying the Foundation. Identify the fundamental facts and key terms instantly.',
      badge:'[Primer]',
      question:'Pick the correct definition of Product-Market Fit from the list below.',
      type:'multiple-choice',
      data:[{text:'When a product can be sold for profit.',correct:false},{text:'Being in a good market with a product that can satisfy that market.',correct:true},{text:'When you have over 1,000 active users.',correct:false}]
    },
    {
      level:'Understand', abbrev:'Und',
      context:'Grasping the Why. Organize and group ideas to build mental clarity.',
      badge:'Matching',
      question:'Match these strategy outcomes to their correct definitions.',
      type:'matching',
      data:[{left:'Churn',right:'Customer Attrition'},{left:'LTV',right:'Lifetime Value'}]
    },
    {
      level:'Apply', abbrev:'App',
      context:'Taking Action. Solve real-world scenarios by implementing your insights.',
      badge:'[Generator]',
      question:'Select the best framework to use for a high-priority Q3 project.',
      type:'grid-select',
      data:['RICE Score','Kano Model','MoSCoW Method']
    },
    {
      level:'Analyze', abbrev:'Ana',
      context:'Linking Strategy. Break down systems to find the connections between ideas.',
      badge:'Sorting',
      question:"Sort these feature requests into 'High-Value' and 'Operational Noise'.",
      type:'kanban',
      data:{leftCol:'Incoming',rightCols:['High Value','Noise']}
    },
    {
      level:'Evaluate', abbrev:'Eva',
      context:'Expert Judgment. Assess the value of data and make high-stakes calls.',
      badge:'[Calibration Lab]',
      question:'Rank these three product bets based on their potential career ROI.',
      type:'ranking',
      data:['AI Integration','Mobile Refactor','Enterprise SSO']
    },
    {
      level:'Create', abbrev:'Cre',
      context:'System Innovation. Synthesize your knowledge to identify new solutions.',
      badge:'[Builder]',
      question:'Select the three core pillars required for a new growth experiment.',
      type:'pill-select',
      data:['Viral Loop','Paid Acquisition','Content SEO','Referral','Sales','Community']
    }
  ];

  const MAX = TAXONOMY.length - 1;
  let val = 0, levelIdx = 0;

  const input       = document.getElementById('bloomsInput');
  const fill        = document.getElementById('bloomsTrackFill');
  const thumb       = document.getElementById('bloomsThumb');
  const labelsWrap  = document.getElementById('bloomsLabels');
  const levelNameEl = document.getElementById('bloomsLevelName');
  const badgeEl     = document.getElementById('bloomsLevelBadge');
  const ctxWrap     = document.getElementById('bloomsContextWrap');
  const ctxH        = document.getElementById('bloomsContextHeading');
  const ctxD        = document.getElementById('bloomsContextDesc');
  const typeEl      = document.getElementById('bloomsChallengeType');
  const questionEl  = document.getElementById('bloomsChallengeText');
  const vizEl       = document.getElementById('bloomsVisualizer');
  const challenge   = document.getElementById('bloomsChallenge');

  // Build labels
  TAXONOMY.forEach((lvl, i) => {
    const el = document.createElement('span');
    el.className = 'blooms-label' + (i === 0 ? ' active-label' : '');
    el.dataset.i = i;
    el.textContent = lvl.level;
    el.style.left = `${(i / MAX) * 100}%`;
    labelsWrap.appendChild(el);
  });

  function updateTrack(v) {
    const pct = (v / MAX) * 100;
    fill.style.width  = pct + '%';
    thumb.style.left  = pct + '%';
  }

  function updateLabels(rounded) {
    labelsWrap.querySelectorAll('.blooms-label').forEach(el => {
      const isActive = parseInt(el.dataset.i) === rounded;
      el.classList.toggle('active-label', isActive);
      el.style.color = isActive ? PRIMARY : '';
    });
  }

  // Visualizer renderer
  function renderViz(type, data) {
    const P = PRIMARY, tint = op => getTint(P, op);
    switch (type) {
      case 'multiple-choice':
        return `<div style="display:flex;flex-direction:column;gap:8px;width:100%">
          ${(data||[]).map(o=>`
          <div style="padding:10px 12px;border-radius:8px;border:2px solid ${o.correct?P:'#f3f4f6'};background:${o.correct?tint(.08):'#fff'};display:flex;align-items:center;">
            <div style="width:15px;height:15px;min-width:15px;border-radius:50%;border:2px solid ${o.correct?P:'#d1d5db'};background:${o.correct?P:'transparent'};margin-right:10px;flex-shrink:0"></div>
            <span style="font-size:13px;font-weight:500;color:${o.correct?'#111827':'#4b5563'}">${o.text}</span>
          </div>`).join('')}
        </div>`;

      case 'matching':
        return `<div style="display:flex;gap:14px;width:100%;align-items:center">
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            ${(data||[]).map(d=>`<div style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;font-size:13px;font-weight:500;color:#6b7280">${d.left}</div>`).join('')}
          </div>
          <div style="color:#d1d5db;font-size:22px;line-height:1">⇄</div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            ${(data||[]).map((d,i)=>`<div style="padding:8px;border:2px dashed ${i===0?P:'#e5e7eb'};border-radius:6px;text-align:center;font-size:13px;font-weight:500;background:${i===0?tint(.05):'#fff'};color:${i===0?P:'#6b7280'}">${d.right}</div>`).join('')}
          </div>
        </div>`;

      case 'grid-select':
        return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%">
          ${(data||[]).map((item,i)=>`
          <div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;border:2px solid ${i===0?P:'#f3f4f6'};background:${i===0?tint(.1):'#fff'};color:${i===0?P:'#6b7280'};font-size:11px;font-weight:700;text-align:center">
            ${item}
          </div>`).join('')}
        </div>`;

      case 'kanban':
        return `<div style="display:flex;gap:10px;width:100%;height:94px">
          <div style="width:33%;background:#f3f4f6;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;border:1px solid #e5e7eb">
            <div style="background:#fff;padding:6px 8px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.06);font-size:11px;text-align:center;color:#6b7280">Item A</div>
            <div style="background:#fff;padding:6px 8px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.06);font-size:11px;text-align:center;color:#6b7280">Item B</div>
          </div>
          <div style="flex:1;display:grid;grid-template-rows:1fr 1fr;gap:8px">
            <div style="border:2px dashed ${tint(.4)};border-radius:10px;background:${tint(.05)};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${P}">High Value</div>
            <div style="border:2px dashed #e5e7eb;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Noise</div>
          </div>
        </div>`;

      case 'ranking':
        return `<div style="display:flex;flex-direction:column;gap:8px;width:100%">
          ${(data||[]).map((item,i)=>`
          <div style="display:flex;align-items:center;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(0,0,0,.04)">
            <div style="width:22px;height:22px;border-radius:50%;background:${P};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-right:12px">${i+1}</div>
            <span style="font-size:13px;font-weight:600;color:#374151">${item}</span>
            <span style="margin-left:auto;color:#d1d5db">☰</span>
          </div>`).join('')}
        </div>`;

      case 'pill-select': {
        const sel = [0,2,5];
        return `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:8px 0">
          ${(data||[]).map((item,i)=>`
          <div style="padding:10px 20px;border-radius:100px;font-size:13px;font-weight:600;border:1px solid ${sel.includes(i)?P:'#e5e7eb'};background:${sel.includes(i)?P:'#fff'};color:${sel.includes(i)?'#fff':'#6b7280'};box-shadow:${sel.includes(i)?'0 2px 8px rgba(52,87,165,.2)':'none'}">
            ${item}
          </div>`).join('')}
        </div>`;
      }
      default: return '<span style="color:#9ca3af;font-size:13px">—</span>';
    }
  }

  function setContent(idx, animate) {
    const d = TAXONOMY[idx];
    const parts = d.context.split('.');

    if (animate) {
      challenge.classList.remove('active');
      challenge.classList.add('exit');
      ctxWrap.style.opacity = '0';
      setTimeout(() => {
        levelNameEl.textContent = d.level;
        badgeEl.textContent     = `Level ${idx+1}/6`;
        ctxH.textContent        = parts[0] + '.';
        ctxD.textContent        = parts.slice(1).join('.').trim();
        typeEl.textContent      = d.badge;
        questionEl.textContent  = d.question;
        vizEl.innerHTML         = renderViz(d.type, d.data);

        ctxWrap.style.opacity = '1';
        challenge.classList.remove('exit');
        requestAnimationFrame(() => challenge.classList.add('active'));
      }, 240);
    } else {
      levelNameEl.textContent = d.level;
      badgeEl.textContent     = `Level ${idx+1}/6`;
      ctxH.textContent        = parts[0] + '.';
      ctxD.textContent        = parts.slice(1).join('.').trim();
      typeEl.textContent      = d.badge;
      questionEl.textContent  = d.question;
      vizEl.innerHTML         = renderViz(d.type, d.data);
      challenge.classList.add('active');
    }
  }

  // Init
  setContent(0, false);
  updateTrack(0);

  // Input
  input.addEventListener('input', () => {
    val = parseFloat(input.value);
    updateTrack(val);
    const newIdx = Math.min(Math.floor(val), MAX);
    updateLabels(Math.round(val));
    if (newIdx !== levelIdx) {
      levelIdx = newIdx;
      setContent(newIdx, true);
    }
  });

  function snap() {
    const nearest = Math.round(val);
    val = nearest;
    input.value = nearest;
    updateTrack(nearest);
    updateLabels(nearest);
    const newIdx = Math.min(nearest, MAX);
    if (newIdx !== levelIdx) { levelIdx = newIdx; setContent(newIdx, true); }
  }
  input.addEventListener('mouseup',  snap);
  input.addEventListener('touchend', snap);
})();

// ── Concept To Question animation ─────────────
(function () {
  const container = document.getElementById('ctqContainer');
  if (!container) return;

  // ── Data (matches React component defaults) ──
  const TEXT1 = "To scale your impact, you must identify specific AI PM Archetypes to align your team's strengths with market needs. A generic Job Description won't get you there.";
  const TEXT2 = "Don't get bogged down by every individual Bug Report. You should implement AI Workflow Evals to build a systemic way of measuring and improving your product's intelligence over time.";
  const CANDIDATES = ["AI PM Archetypes","AI Workflow Evals","Job Description","Bug Report"];
  const ACCEPTED   = ["ai pm archetypes","ai workflow evals"];
  const LOOP_COUNT  = 2;

  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ── Parse text → [{term, index, isAccepted}] ─
  function parseConcepts(text, candidates, accepted) {
    const lower = text.toLowerCase();
    return candidates
      .map(term => {
        const idx = lower.indexOf(term.toLowerCase());
        if (idx === -1) return null;
        return { term, index: idx, isAccepted: accepted.includes(term.toLowerCase()) };
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
  }

  const c1 = parseConcepts(TEXT1, CANDIDATES, ACCEPTED);
  const c2 = parseConcepts(TEXT2, CANDIDATES, ACCEPTED);
  const allConcepts = [...c1, ...c2];

  const acceptedItems = allConcepts.filter(c => c.isAccepted);
  const rejectedItems = allConcepts
    .filter(c => !c.isAccepted)
    .filter((v, i, a) => a.findIndex(t => t.term === v.term) === i);

  // ── Render paragraph HTML ─────────────────────
  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function buildPara(text, concepts) {
    let html = '', last = 0;
    for (const item of concepts) {
      if (item.index < last) continue;
      if (item.index > last) html += esc(text.slice(last, item.index));
      const word = text.slice(item.index, item.index + item.term.length);
      const t    = item.isAccepted ? 'accept' : 'reject';
      const tip  = item.isAccepted ? '✓ Key Concept' : '✕ Distractor';
      html += `<span class="ctq-concept ctq-concept--${t}" data-term="${esc(item.term)}">` +
              `<span class="ctq-concept-tip ctq-concept-tip--${t}">${tip}</span>` +
              `${esc(word)}</span>`;
      last = item.index + item.term.length;
    }
    if (last < text.length) html += esc(text.slice(last));
    return `<p class="ctq-para">${html}</p>`;
  }

  const textArea = document.getElementById('ctqTextArea');
  textArea.innerHTML = buildPara(TEXT1, c1) + '<div style="height:24px"></div>' + buildPara(TEXT2, c2);

  // ── Concept state helpers ─────────────────────
  function setConceptState(term, state) {
    document.querySelectorAll(`.ctq-concept[data-term="${term}"]`).forEach(el => {
      el.className = 'ctq-concept' + (state ? ` ctq-concept--${state}` : '');
      // re-inject tooltip (class wipe destroys it)
      if (!el.querySelector('.ctq-concept-tip')) {
        const t    = ACCEPTED.includes(term.toLowerCase()) ? 'accept' : 'reject';
        const tip  = t === 'accept' ? '✓ Key Concept' : '✕ Distractor';
        const span = document.createElement('span');
        span.className = `ctq-concept-tip ctq-concept-tip--${t}`;
        span.textContent = tip;
        el.prepend(span);
      }
    });
  }

  // ── Scan line ─────────────────────────────────
  const scanLine = document.getElementById('ctqScanLine');
  function startScan() {
    scanLine.classList.remove('ctq-scan-line--active');
    void scanLine.offsetWidth; // reflow to restart animation
    scanLine.classList.add('ctq-scan-line--active');
  }

  // ── Right panel helpers ───────────────────────
  const acceptedWrap  = document.getElementById('ctqAcceptedWrap');
  const divider       = document.getElementById('ctqDivider');
  const rejectedList  = document.getElementById('ctqRejectedList');

  function addAccepted(item) {
    if (acceptedWrap.querySelector(`[data-term="${item.term}"]`)) return;
    const div = document.createElement('div');
    div.className = 'ctq-accepted-item';
    div.dataset.term = item.term;
    div.innerHTML =
      `<div>
        <div class="ctq-accepted-name">${esc(item.term)}</div>
        <div class="ctq-accepted-label">Key learning identified</div>
      </div>
      <div class="ctq-accepted-check">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>`;
    acceptedWrap.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
  }

  function addRejected(item) {
    if (rejectedList.querySelector(`[data-term="${item.term}"]`)) return;
    divider.style.opacity = '1';
    const div = document.createElement('div');
    div.className = 'ctq-rejected-item';
    div.dataset.term = item.term;
    div.innerHTML =
      `<span class="ctq-rejected-name">${esc(item.term)}</span>
      <div class="ctq-rejected-x">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>`;
    rejectedList.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
  }

  function resetPanel() {
    acceptedWrap.innerHTML = '';
    rejectedList.innerHTML = '';
    divider.style.opacity  = '0';
  }

  function resetConcepts() {
    document.querySelectorAll('.ctq-concept').forEach(el => {
      el.className = el.className.replace(/\sctq-concept--\S+/g, '');
    });
  }

  // ── Main animation loop ───────────────────────
  let cancelled = false;
  let loop      = 0;

  async function runLoop() {
    while (loop < LOOP_COUNT && !cancelled) {
      resetConcepts();
      resetPanel();

      // Scanning phase
      await delay(1200);
      if (cancelled) return;
      startScan();
      await delay(1600);
      if (cancelled) return;

      // Highlighting phase — one concept at a time
      for (const concept of allConcepts) {
        if (cancelled) return;
        const activeState = concept.isAccepted ? 'active-accept' : 'active-reject';
        setConceptState(concept.term, activeState);

        await delay(900);
        if (cancelled) return;

        const revealState = concept.isAccepted ? 'revealed-accept' : 'revealed-reject';
        setConceptState(concept.term, revealState);

        if (concept.isAccepted) addAccepted(concept);
        else                    addRejected(concept);

        await delay(400);
      }

      // Complete — pause before next loop
      await delay(2500);
      if (cancelled) return;
      loop++;
    }
  }

  // ── Start on scroll into view ─────────────────
  let started = false;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !started) {
      started = true;
      runLoop();
      obs.disconnect();
    }
  }, { threshold: 0.35 });
  obs.observe(container);
})();

// ── Concept filtering (legacy guard) ──────────
const filterBtns  = document.querySelectorAll('.filter-btn');
const conceptCards = document.querySelectorAll('.concept-card');

if (filterBtns.length) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      conceptCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        if (match) {
          card.classList.remove('hidden');
          card.style.animation = 'none';
          card.offsetHeight; // reflow
          card.style.animation = 'fadeUp .3s ease both';
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

// ── Pricing billing toggle ────────────────────
const pricingToggle = document.getElementById('pricingToggle');
if (pricingToggle) {
  const prices = {
    monthly: { free: '0', pro: '12', team: '29' },
    annual:  { free: '0', pro: '9',  team: '22' }
  };

  pricingToggle.addEventListener('change', () => {
    const isAnnual = pricingToggle.checked;
    const set = isAnnual ? prices.annual : prices.monthly;

    document.querySelectorAll('.p-amount[data-plan]').forEach(el => {
      el.textContent = set[el.dataset.plan];
    });
    document.querySelectorAll('.p-period').forEach(el => {
      el.textContent = isAnnual ? '/month, billed annually' : '/month';
    });
  });
}

// ── Smooth anchor scroll ──────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Hide scroll hint after first scroll ───────
const scrollHint = document.querySelector('.scroll-hint');
if (scrollHint) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) scrollHint.style.opacity = '0';
    else scrollHint.style.opacity = '1';
  }, { passive: true });
}

// ── Forgetting Curve Chart ────────────────────
(function () {
  const container = document.getElementById('fcChart');
  if (!container) return;

  // ── Constants (match React component exactly) ─
  const graphWidth    = 900;
  const graphHeight   = 450;
  const offsetX       = 80;
  const bottomY       = 400;
  const forgettingRate = 0.07;
  const srsColor      = '#3457A5';
  const noRepColor    = '#9E9E9E';
  const glowIntensity = 5;

  const dayToX   = d => d * 20 + offsetX;
  const retToY   = r => bottomY - r * 300;

  // ── No-rep polyline (M/L, not beziers) ───────
  const initialRetention = 0.9;
  const noRepDays = [0, 1, 2, 5, 10, 20, 40];
  const noRepPoints = noRepDays.map(day => ({
    day,
    retention: initialRetention * Math.exp(-forgettingRate * day)
  }));
  const noRepPathD = noRepPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${dayToX(pt.day)} ${retToY(pt.retention)}`)
    .join(' ');

  // ── SRS cubic bezier path ─────────────────────
  const srsReviewDays = [0, 1, 4.5, 16, 35];
  const srsReviewPoints = [{ day: 0, retention: 1.0 }];
  let srsPathD = '';

  for (let i = 0; i < srsReviewDays.length - 1; i++) {
    const startDay     = srsReviewDays[i];
    const endDay       = srsReviewDays[i + 1];
    const interval     = endDay - startDay;
    const adjustedRate = forgettingRate * (0.8 - 0.2 * i);
    const midDay1      = startDay + interval * 0.33;
    const midDay2      = startDay + interval * 0.66;
    const midRet1      = Math.exp(-adjustedRate * (midDay1 - startDay));
    const midRet2      = Math.exp(-adjustedRate * (midDay2 - startDay));
    const endDecayDay  = endDay - 0.01;
    const endDecayRet  = Math.exp(-adjustedRate * (endDecayDay - startDay));
    const ctrlRet1     = (1 + midRet1) / 2;
    const ctrlRet2     = (midRet2 + endDecayRet) / 2;

    if (i === 0) srsPathD += `M ${dayToX(startDay)} ${retToY(1)} `;
    else         srsPathD += `L ${dayToX(startDay)} ${retToY(1)} `;

    srsPathD += `C ${dayToX(midDay1)} ${retToY(ctrlRet1)}, ` +
                `${dayToX(midDay2)} ${retToY(ctrlRet2)}, ` +
                `${dayToX(endDecayDay)} ${retToY(endDecayRet)} `;
    srsPathD += `L ${dayToX(endDay)} ${retToY(endDecayRet)} `;
    srsPathD += `L ${dayToX(endDay)} ${retToY(1)} `;

    srsReviewPoints.push({ day: endDay, retention: 1.0 });
  }

  // ── Grid ──────────────────────────────────────
  const yLevels = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const xDays   = [0, 10, 20, 30, 40];

  const gridLinesHTML =
    yLevels.map(y =>
      `<line x1="${offsetX}" y1="${retToY(y)}" x2="${graphWidth - 20}" y2="${retToY(y)}" stroke="#E5E7EB" stroke-dasharray="4 4"/>`
    ).join('') +
    xDays.map(d =>
      `<line x1="${dayToX(d)}" y1="0" x2="${dayToX(d)}" y2="${bottomY}" stroke="#E5E7EB" stroke-dasharray="4 4"/>`
    ).join('');

  const yLabelsHTML = yLevels.map(y =>
    `<text x="${offsetX - 15}" y="${retToY(y) + 5}" text-anchor="end" font-size="12" fill="#9CA3AF" font-weight="500">${Math.round(y * 100)}%</text>`
  ).join('');

  const xLabelsHTML = xDays.map(d =>
    `<text x="${dayToX(d)}" y="${bottomY + 25}" text-anchor="middle" font-size="12" fill="#9CA3AF" font-weight="500">Day ${d}</text>`
  ).join('');

  // ── Dots ─────────────────────────────────────
  const noRepDotsHTML = noRepPoints.map((pt, i) =>
    `<circle class="fc-nr-dot" cx="${dayToX(pt.day)}" cy="${retToY(pt.retention)}" r="6"
      fill="${noRepColor}" data-day="${pt.day}" data-pct="${Math.round(pt.retention * 100)}"
      data-isNr="1" style="cursor:pointer"/>`
  ).join('');

  const srsDotsHTML = srsReviewPoints.map((pt, i) =>
    `<circle class="fc-srs-dot" cx="${dayToX(pt.day)}" cy="${retToY(pt.retention)}" r="8"
      fill="${srsColor}" stroke="white" stroke-width="2"
      data-day="${pt.day}" data-pct="${Math.round(pt.retention * 100)}"
      style="cursor:pointer;filter:drop-shadow(0 0 ${glowIntensity}px ${srsColor})"/>`
  ).join('');

  // ── Build SVG ─────────────────────────────────
  container.innerHTML = `
<svg viewBox="0 0 ${graphWidth} ${graphHeight}" preserveAspectRatio="xMidYMid meet"
     style="width:100%;height:auto;display:block;overflow:visible" id="fcSvg">
  <defs>
    <filter id="srsGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="${glowIntensity * 0.6}"
        flood-color="${srsColor}" flood-opacity="0.7"/>
    </filter>
  </defs>

  ${gridLinesHTML}

  <!-- Axes -->
  <line x1="${offsetX}" y1="${bottomY}" x2="${graphWidth - 20}" y2="${bottomY}"
        stroke="#374151" stroke-width="2"/>
  <line x1="${offsetX}" y1="0" x2="${offsetX}" y2="${bottomY}"
        stroke="#374151" stroke-width="2"/>

  <!-- Labels -->
  ${yLabelsHTML}
  ${xLabelsHTML}
  <text x="20" y="${graphHeight / 2}" text-anchor="middle"
        transform="rotate(-90 20 ${graphHeight / 2})"
        font-size="14" fill="#4B5563" font-weight="700" letter-spacing="0.04em">RETENTION</text>

  <!-- No-rep curve -->
  <path id="fcNoRepPath" d="${noRepPathD}"
        stroke="${noRepColor}" stroke-width="3" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>

  <!-- SRS curve -->
  <path id="fcSrsPath" d="${srsPathD}"
        stroke="${srsColor}" stroke-width="3" fill="none"
        stroke-linecap="round" stroke-linejoin="round"
        filter="url(#srsGlow)"/>

  <!-- In-graph annotations -->
  <text x="500" y="280" text-anchor="start">
    <tspan x="500" dy="0"  font-size="14" font-weight="700" fill="#374151">Natural Forgetting</tspan>
    <tspan x="500" dy="22" font-size="13" fill="#6B7280">Memory fades quickly</tspan>
  </text>
  <text x="480" y="70" text-anchor="start">
    <tspan x="480" dy="0"  font-size="14" font-weight="700" fill="${srsColor}">Adaptive Intervals</tspan>
    <tspan x="480" dy="22" font-size="13" fill="#6B7280">Reviews scheduled just in time</tspan>
  </text>

  <!-- Dots -->
  ${noRepDotsHTML}
  ${srsDotsHTML}

  <!-- SVG tooltip (hidden) -->
  <g id="fcTooltip" style="display:none;pointer-events:none">
    <rect id="fcTipRect" x="-45" y="-32" width="90" height="26" rx="4"
          fill="white" stroke="#E5E7EB"
          style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.12))"/>
    <text id="fcTipText" x="0" y="-14" text-anchor="middle"
          font-size="12" font-weight="700" fill="#1F2937"></text>
    <polygon points="-5,0 5,0 0,6" fill="white" transform="translate(0,-6)"/>
  </g>
</svg>`;

  // ── Tooltip interaction ───────────────────────
  const svg      = container.querySelector('#fcSvg');
  const tipGroup = document.getElementById('fcTooltip');
  const tipText  = document.getElementById('fcTipText');

  function showTip(e, dot) {
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    tipGroup.setAttribute('transform', `translate(${loc.x},${loc.y - 15})`);
    tipText.textContent = `Day ${dot.dataset.day}: ${dot.dataset.pct}%`;
    tipGroup.style.display = '';
    dot.setAttribute('r', dot.dataset.isNr ? '10' : '12');
  }

  function hideTip(dot) {
    tipGroup.style.display = 'none';
    dot.setAttribute('r', dot.dataset.isNr ? '6' : '8');
  }

  container.querySelectorAll('.fc-nr-dot, .fc-srs-dot').forEach(dot => {
    dot.addEventListener('mouseenter', e => showTip(e, dot));
    dot.addEventListener('mouseleave', () => hideTip(dot));
  });
  svg.addEventListener('mouseleave', () => {
    tipGroup.style.display = 'none';
    container.querySelectorAll('.fc-nr-dot').forEach(d => d.setAttribute('r', '6'));
    container.querySelectorAll('.fc-srs-dot').forEach(d => d.setAttribute('r', '8'));
  });

  // ── Animate paths on scroll ───────────────────
  function animatePath(el, delay) {
    const len = el.getTotalLength();
    el.style.strokeDasharray  = len;
    el.style.strokeDashoffset = len;
    el.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = `stroke-dashoffset 2s ease-in-out ${delay}ms`;
      el.style.strokeDashoffset = '0';
    }));
  }

  const fcObs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    animatePath(document.getElementById('fcNoRepPath'), 0);
    animatePath(document.getElementById('fcSrsPath'),   500);
    fcObs.disconnect();
  }, { threshold: 0.3 });

  fcObs.observe(container);
})();

// ── Testimonials Carousel ─────────────────────
(function () {
  const stack = document.querySelector('.testi-stack');
  if (!stack) return;

  const ACCENT      = '#3457A5';
  const MAX_VISIBLE = 3;
  const CARD_OFFSET = 120;   // px per delta step (desktop)
  const CARD_ROT    = 15;    // deg per delta step

  const DATA = [
    { id: 1, name: 'Sarah M.',    title: '3rd Year Medical Student',       quote: 'LearnBetter completely changed how I prepare for my medical boards. I retained information I would have normally forgotten within a week.',                                                                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop&auto=format' },
    { id: 2, name: 'James K.',    title: 'MBA Student, Wharton',           quote: 'The concept filtering feature is genius. Being able to see all my strategy concepts in one place helped me ace my MBA case interviews.',                                                                       avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&auto=format' },
    { id: 3, name: 'Aisha P.',    title: 'Software Developer',             quote: "I'm a self-taught developer and LearnBetter helped me structure everything I was learning. My retention went from terrible to genuinely solid.",                                                              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&auto=format' },
    { id: 4, name: 'Dr. R. Chen', title: 'Professor of Cognitive Science', quote: 'As a professor, I recommend LearnBetter to all my students. The spaced repetition algorithm is grounded in genuinely solid cognitive science.',                                                               avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&h=250&fit=crop&auto=format' },
    { id: 5, name: 'Priya N.',    title: 'CPA Exam Candidate',             quote: "Passed all four CPA sections on my first try. LearnBetter's active recall system made the difference between cramming and truly knowing the material.",                                                        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&h=250&fit=crop&auto=format' },
    { id: 6, name: 'Marcus T.',   title: 'Product Manager, Fintech',       quote: 'I consume a lot of articles and research. LearnBetter is the first tool that actually makes me retain what I read rather than just nodding along and forgetting.',                                             avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&auto=format' },
  ];

  let cur      = 0;
  let locked   = false;
  let touchX   = null;
  let wheelAcc = 0;

  // ── Build cards ───────────────────────────────
  DATA.forEach((t, i) => {
    const initials = t.name.split(' ').map(w => w[0]).join('');
    const card = document.createElement('div');
    card.className = 'testi-card';
    card.dataset.index = i;
    card.innerHTML = `
      <div class="testi-quote-mark">\u201C</div>
      <p class="testi-quote">${t.quote}</p>
      <div class="testi-author">
        <div class="testi-avatar-wrap">
          <img src="${t.avatar}" alt="${t.name}" class="testi-avatar-img" loading="lazy"
               onerror="this.outerHTML='<div class=\\'testi-avatar-fallback\\'>${initials}</div>'">
        </div>
        <div>
          <strong class="testi-name">${t.name}</strong>
          <span class="testi-role">${t.title}</span>
        </div>
      </div>`;
    stack.appendChild(card);
  });

  // ── Build dots ────────────────────────────────
  const dotsWrap = document.querySelector('.testi-dots');
  DATA.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'testi-dot';
    d.setAttribute('aria-label', `Testimonial ${i + 1}`);
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
  });

  // ── Transform math ────────────────────────────
  function calcStyle(idx) {
    let delta = idx - cur;
    const len = DATA.length;
    if (delta >  len / 2) delta -= len;
    if (delta < -len / 2) delta += len;
    const dist = Math.abs(delta);
    const dir  = delta < 0 ? -1 : 1;
    if (dist > MAX_VISIBLE) return null;

    const mobile = stack.offsetWidth < 600;
    const xBase  = mobile ? 40 : CARD_OFFSET;
    const rBase  = mobile ? 4  : CARD_ROT;

    return {
      x:       dir * xBase * dist,
      y:       dist * (mobile ? 12 : 8),
      z:       -dist * 80,
      rZ:      dir * rBase * dist,
      scale:   Math.max(0.85, 1 - dist * 0.08),
      opacity: dist === 0 ? 1 : Math.max(0.4, 1 - dist * 0.3),
      zIndex:  100 - dist,
      active:  dist === 0,
    };
  }

  // ── Render ────────────────────────────────────
  function render() {
    stack.querySelectorAll('.testi-card').forEach((card, i) => {
      const s = calcStyle(i);
      if (!s) {
        card.style.cssText += ';opacity:0;pointer-events:none;z-index:0';
        return;
      }
      card.style.transform    = `translate(-50%,-50%) translateX(${s.x}px) translateY(${s.y}px) translateZ(${s.z}px) rotateZ(${s.rZ}deg) scale(${s.scale})`;
      card.style.opacity      = s.opacity;
      card.style.zIndex       = s.zIndex;
      card.style.pointerEvents = s.active ? 'auto' : 'none';
      card.style.borderColor  = s.active ? ACCENT : 'transparent';
    });
    document.querySelectorAll('.testi-dot').forEach((d, i) => {
      d.classList.toggle('active', i === cur);
    });
  }

  // ── Navigation ────────────────────────────────
  function move(dir) {
    if (locked) return;
    locked = true;
    cur = (cur + dir + DATA.length) % DATA.length;
    render();
    setTimeout(() => { locked = false; wheelAcc = 0; }, 520);
  }

  function goTo(idx) {
    if (locked || idx === cur) return;
    locked = true;
    cur = idx;
    render();
    setTimeout(() => { locked = false; }, 520);
  }

  // ── Button clicks ─────────────────────────────
  document.querySelector('.testi-prev').addEventListener('click', () => move(-1));
  document.querySelector('.testi-next').addEventListener('click', () => move( 1));

  // ── Touch swipe ───────────────────────────────
  stack.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  stack.addEventListener('touchend', e => {
    if (touchX === null || locked) return;
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) move(diff > 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  // ── Horizontal trackpad / wheel ───────────────
  stack.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    e.preventDefault();
    if (locked) return;
    wheelAcc += e.deltaX;
    if (Math.abs(wheelAcc) > 25) move(wheelAcc > 0 ? 1 : -1);
  }, { passive: false });

  render();
})();
