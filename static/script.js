(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const THEME_MAP = window.THEME_MAP || {};
  const TODAY_RESULT = window.TODAY_RESULT || null;

  // ============================================================
  // 게임 테마별 전용 가젯 & 비주얼 설정
  // ============================================================
  const THEME_CONFIG = {
    // 1) 소녀전선 (지휘관) - 5발 탄창 삽탄 장전
    arsenal:  { gadgetId: 'gadgetArsenal',  tag: 'ARSENAL · RELOAD',    title: '탄창에 5.56mm 탄환을 가득 장전하세요',       artKey: 'gf',      fallback: '🔫', themeClass: 'theme-arsenal' },
    // 2) 블루 아카이브 (센세) - 샬레 공식 결재 서약서
    school:   { gadgetId: 'gadgetSchool',   tag: 'SCHALE · APPROVAL',   title: '당번 학생 서약서에 서명 후 결재를 승인하세요', artKey: 'sense',   fallback: '🖋️', themeClass: 'theme-school' },
    // 3) Fate/Grand Order (마스터) - 3획 진홍빛 영주 주입
    summon:   { gadgetId: 'gadgetSummon',   tag: 'COMMAND SPELL · RITUAL', title: '영주(令呪) 3획에 진홍의 마력을 주입하세요',      artKey: 'master',  fallback: '✒️', themeClass: 'theme-summon' },
    // 4) 우마무스메 (트레이너) - 스타팅 게이트 런치
    race:     { gadgetId: 'gadgetRace',     tag: 'TURF · GATE LAUNCH',  title: '출발 버튼을 꾹 눌러 게이트 오픈 파워를 모으세요', artKey: 'trainer', fallback: '🏁', themeClass: 'theme-race' },
    // 5) 니케 (지휘관) - 전술 HUD 락온 & 버스트 차지
    tactics:  { gadgetId: 'gadgetTactics',  tag: 'TACTICAL · BURST',    title: '버스트 방아쇠를 꾹 당겨 전술 화력을 승인하세요',  artKey: 'nikke',    fallback: '🔐', themeClass: 'theme-tactics' },
    // 6) 명일방주 (박사) - 오리지늄 크리스탈 공명 조율
    research: { gadgetId: 'gadgetResearch', tag: 'RHODES · RESONANCE',  title: '다이얼을 돌려 오리지늄 공명 주파수를 맞추세요',   artKey: 'doctor',   fallback: '🔬', themeClass: 'theme-research' },
    // 7) 붕괴3rd (함장) - 하이페리온 초공간 워프 스로틀
    voyage:   { gadgetId: 'gadgetVoyage',   tag: 'HYPERION · WARP',     title: '워프 스로틀 레버를 밀어올려 도약 출력을 높이세요', artKey: 'captain', fallback: '🧭', themeClass: 'theme-voyage' },
    // 8) 붕괴: 스타레일 (개척자) - 은하열차 황금 승차권 펀칭
    explore:  { gadgetId: 'gadgetExplore',  tag: 'EXPRESS · PUNCH',     title: '은하열차 승차권에 개찰 펀칭을 완료하세요',       artKey: 'trailbz',  fallback: '🎫', themeClass: 'theme-explore' },
  };

  // ============================================================
  // DOM 요소
  // ============================================================
  const orbWrap        = document.getElementById('orbWrap');
  const mainCardWrap   = document.getElementById('mainCardWrap');
  const mainDisplayCard= document.getElementById('mainDisplayCard');
  const mainCardArt    = document.getElementById('mainCardArt');
  const mainRarityBadge= document.getElementById('mainRarityBadge');
  const mainTermText   = document.getElementById('mainTermText');
  const mainGameText   = document.getElementById('mainGameText');
  const mainFortuneText= document.getElementById('mainFortuneText');
  const mainLuckyColor = document.getElementById('mainLuckyColor');
  const mainLuckyNumber= document.getElementById('mainLuckyNumber');
  const reopenBtn      = document.getElementById('reopenBtn');

  const pullBtn      = document.getElementById('pullBtn');
  const pityText     = document.getElementById('pityText');
  const historyStrip = document.getElementById('historyStrip');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose   = document.getElementById('modalClose');
  const stageLoading = document.getElementById('stageLoading');
  const stageGesture = document.getElementById('stageGesture');
  const stageResult  = document.getElementById('stageResult');

  const themeAmbientFx = document.getElementById('themeAmbientFx');
  const ambientBurst   = document.getElementById('ambientBurst');

  const gadgetTag    = document.getElementById('gadgetTag');
  const gadgetTitle  = document.getElementById('gadgetTitle');

  // 8개 가젯 박스
  const gadgetBoxes = {
    gadgetArsenal:  document.getElementById('gadgetArsenal'),
    gadgetSchool:   document.getElementById('gadgetSchool'),
    gadgetSummon:   document.getElementById('gadgetSummon'),
    gadgetRace:     document.getElementById('gadgetRace'),
    gadgetTactics:  document.getElementById('gadgetTactics'),
    gadgetResearch: document.getElementById('gadgetResearch'),
    gadgetVoyage:   document.getElementById('gadgetVoyage'),
    gadgetExplore:  document.getElementById('gadgetExplore'),
  };

  // 결과 카드 (3D 플립)
  const cardFlipper      = document.getElementById('cardFlipper');
  const modalCard        = document.getElementById('modalCard');
  const mCardArtWrap     = document.getElementById('mCardArtWrap');
  const mCardArt         = document.getElementById('mCardArt');
  const mCardArtFallback = document.getElementById('mCardArtFallback');
  const mRarityBadge     = document.getElementById('mRarityBadge');
  const mTermText        = document.getElementById('mTermText');
  const mGameText        = document.getElementById('mGameText');
  const mFortuneText     = document.getElementById('mFortuneText');
  const mLuckyColor      = document.getElementById('mLuckyColor');
  const mLuckyNumber     = document.getElementById('mLuckyNumber');
  const modalConfirm     = document.getElementById('modalConfirm');

  let currentResult = TODAY_RESULT || null;
  let pendingData = null;
  let isPulling   = false;
  let currentCleanup = null;

  // ============================================================
  // 이미지 로드 헬퍼
  // ============================================================
  function loadArt(frameEl, imgEl, fallbackEl, artKey, fallbackIcon) {
    if (fallbackEl) fallbackEl.textContent = fallbackIcon || '✦';
    if (frameEl) frameEl.classList.remove('no-art');
    imgEl.onload  = () => { if (frameEl) frameEl.classList.remove('no-art'); };
    imgEl.onerror = () => { if (frameEl) frameEl.classList.add('no-art'); };
    imgEl.src = '/static/images/' + (artKey || 'sense') + '.svg';
  }

  // ============================================================
  // 단계 전환 & 가젯 단일 표시 (오버랩 방지)
  // ============================================================
  function showStage(stage) {
    [stageLoading, stageGesture, stageResult].forEach(s => (s.hidden = s !== stage));
  }

  function showSingleGadget(targetId) {
    Object.keys(gadgetBoxes).forEach(key => {
      const box = gadgetBoxes[key];
      if (box) box.hidden = (key !== targetId);
    });
  }

  function openModal() {
    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
    themeAmbientFx.className = 'theme-ambient-fx';
    ambientBurst.classList.remove('explode');
    if (cardFlipper) cardFlipper.classList.remove('flipped');
    if (pendingData) {
      applyToMainPage(pendingData);
      pendingData = null;
    }
  }

  function spawnParticles() {
    if (REDUCED_MOTION) return;
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      const a = Math.random() * Math.PI * 2;
      const d = 70 + Math.random() * 110;
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      p.style.left = '50%'; p.style.top = '40%';
      modalCard.appendChild(p);
      setTimeout(() => p.remove(), 1300);
    }
  }

  // ============================================================
  // 3D 카드 플립 공개 연출
  // ============================================================
  function revealResult(data, cfg) {
    modalCard.className = 'card-face card-front card tier-' + data.tier;
    mRarityBadge.textContent = data.tier;
    mTermText.textContent    = data.term;
    mGameText.textContent    = data.game;
    mFortuneText.textContent = data.text;
    mLuckyColor.textContent  = data.color;
    mLuckyNumber.textContent = data.num;
    loadArt(mCardArtWrap, mCardArt, mCardArtFallback, cfg.artKey, cfg.fallback);

    themeAmbientFx.className = 'theme-ambient-fx active ' + (cfg.themeClass || 'theme-school');
    cardFlipper.classList.remove('flipped');
    showStage(stageResult);

    setTimeout(() => {
      cardFlipper.classList.add('flipped');
      setTimeout(() => {
        ambientBurst.classList.add('explode');
        if (data.tier === 'SSR' || data.tier === 'SR') {
          spawnParticles();
        }
      }, 450);
    }, 250);
  }

  // ============================================================
  // 가젯 인터랙션 시작 (공통 진입점)
  // ============================================================
  function startGesture(data) {
    const theme = data.theme || THEME_MAP[data.entry_id] || 'school';
    const cfg   = THEME_CONFIG[theme] || THEME_CONFIG.school;

    gadgetTag.textContent   = cfg.tag;
    gadgetTitle.textContent = cfg.title;

    showSingleGadget(cfg.gadgetId);
    showStage(stageGesture);

    const onComplete = () => {
      revealResult(data, cfg);
    };

    if      (cfg.gadgetId === 'gadgetArsenal')  runArsenal(onComplete);
    else if (cfg.gadgetId === 'gadgetSchool')   runSchool(onComplete);
    else if (cfg.gadgetId === 'gadgetSummon')   runSummon(onComplete);
    else if (cfg.gadgetId === 'gadgetRace')     runRace(onComplete);
    else if (cfg.gadgetId === 'gadgetTactics')  runTactics(onComplete);
    else if (cfg.gadgetId === 'gadgetResearch') runResearch(onComplete);
    else if (cfg.gadgetId === 'gadgetVoyage')   runVoyage(onComplete);
    else if (cfg.gadgetId === 'gadgetExplore')  runExplore(onComplete);
  }

  // ------------------------------------------------------------
  // 1) 소녀전선: 5발 탄창 삽탄 장전 (STANAG 5-Round Reload)
  // ------------------------------------------------------------
  function runArsenal(onComplete) {
    const btn = document.getElementById('ammoLoadBtn');
    const text = btn.querySelector('.ammo-text');
    const rows = document.querySelectorAll('#magSlot .bullet-row');
    let loaded = 0;
    const MAX = 5;

    rows.forEach(r => r.classList.remove('loaded'));
    text.textContent = `탄환 삽탄 (${loaded}/${MAX})`;

    function onClick(e) {
      e.preventDefault();
      if (loaded < MAX) {
        rows[loaded].classList.add('loaded');
        loaded++;
        text.textContent = (loaded < MAX) ? `탄환 삽탄 (${loaded}/${MAX})` : `장전 완료! (LOCKED & LOADED)`;
        if (loaded === MAX) {
          btn.style.background = 'linear-gradient(135deg, #22c55e, #4ade80)';
          btn.style.color = '#052e16';
          setTimeout(() => { cleanup(); onComplete(); }, 350);
        }
      }
    }

    btn.addEventListener('click', onClick);
    function cleanup() {
      btn.removeEventListener('click', onClick);
      btn.style.background = '';
      btn.style.color = '';
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 2) 블루 아카이브: 샬레 서약서 서명 & 승인 결재
  // ------------------------------------------------------------
  function runSchool(onComplete) {
    const canvas = document.getElementById('schaleCanvas');
    const ctx    = canvas.getContext('2d');
    const area   = canvas.parentElement;
    const stamp  = document.getElementById('approvalStamp');
    const rBtn   = document.getElementById('schaleResetBtn');
    const sBtn   = document.getElementById('schaleSubmitBtn');

    stamp.classList.remove('stamped');
    area.classList.remove('has-strokes');
    sBtn.disabled = true;
    sBtn.style.opacity = '0.4';

    function resize() {
      const w = canvas.offsetWidth || 320;
      const h = canvas.offsetHeight || 100;
      canvas.width  = w * (window.devicePixelRatio || 1);
      canvas.height = h * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth   = 2.8;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
    resize();

    let drawing = false;
    let strokeLen = 0;
    let lx = 0, ly = 0;

    function getP(e) {
      const r = canvas.getBoundingClientRect();
      const s = e.touches ? e.touches[0] : e;
      return { x: s.clientX - r.left, y: s.clientY - r.top };
    }
    function down(e) {
      drawing = true;
      const { x, y } = getP(e);
      lx = x; ly = y;
      ctx.beginPath(); ctx.moveTo(x, y);
      e.preventDefault();
    }
    function move(e) {
      if (!drawing) return;
      const { x, y } = getP(e);
      ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y);
      strokeLen += Math.hypot(x - lx, y - ly);
      lx = x; ly = y;
      if (strokeLen > 0) area.classList.add('has-strokes');
      if (strokeLen >= 50) {
        sBtn.disabled = false;
        sBtn.style.opacity = '1';
      }
      e.preventDefault();
    }
    function up() { drawing = false; ctx.beginPath(); }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup',   up);
    canvas.addEventListener('pointercancel', up);

    function reset() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokeLen = 0;
      area.classList.remove('has-strokes');
      sBtn.disabled = true;
      sBtn.style.opacity = '0.4';
      stamp.classList.remove('stamped');
    }

    rBtn.onclick = reset;
    sBtn.onclick = () => {
      stamp.classList.add('stamped');
      setTimeout(() => { cleanup(); onComplete(); }, 500);
    };

    function cleanup() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup',   up);
      canvas.removeEventListener('pointercancel', up);
      rBtn.onclick = null; sBtn.onclick = null;
      reset();
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 3) Fate/Grand Order: 영주 3획 점등 (Command Seal 3-Stroke)
  // ------------------------------------------------------------
  function runSummon(onComplete) {
    const btn = document.getElementById('sealIgniteBtn');
    const text = btn.querySelector('.seal-btn-text');
    const s1 = document.getElementById('sealStroke1');
    const s2 = document.getElementById('sealStroke2');
    const s3 = document.getElementById('sealStroke3');
    const core = document.getElementById('sealCenterCore');
    const strokes = [s1, s2, s3];
    let step = 0;

    strokes.forEach(s => s.classList.remove('active'));
    core.classList.remove('ignited');
    text.textContent = `영주(令呪) 마력 주입 (0/3)`;

    function onClick(e) {
      e.preventDefault();
      if (step < 3) {
        strokes[step].classList.add('active');
        step++;
        text.textContent = (step < 3) ? `영주(令呪) 마력 주입 (${step}/3)` : `영주 해방! 서번트 소환!`;
        if (step === 3) {
          core.classList.add('ignited');
          setTimeout(() => { cleanup(); onComplete(); }, 400);
        }
      }
    }

    btn.addEventListener('click', onClick);
    function cleanup() {
      btn.removeEventListener('click', onClick);
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 4) 우마무스메: 스타팅 게이트 런치 (Gate Start Power Charge)
  // ------------------------------------------------------------
  function runRace(onComplete) {
    const btn = document.getElementById('gateLaunchBtn');
    const fill = document.getElementById('turfGaugeFill');
    const txt  = document.getElementById('turfGaugeText');
    const l1 = document.getElementById('gLight1');
    const l2 = document.getElementById('gLight2');
    const l3 = document.getElementById('gLight3');

    let pct = 0;
    let pressing = false;
    let raf = null;
    let done = false;

    l1.className = 'g-light red active';
    l2.className = 'g-light yellow';
    l3.className = 'g-light green';
    fill.style.width = '0%';
    txt.textContent = 'READY...';

    function tick() {
      if (!pressing || done) return;
      pct = Math.min(100, pct + 2.2);
      fill.style.width = pct + '%';
      if (pct >= 40) l2.className = 'g-light yellow active';
      if (pct >= 85) {
        l1.className = 'g-light red';
        l2.className = 'g-light yellow';
        l3.className = 'g-light green active';
        txt.textContent = 'GATE OPEN! 🚀';
      } else {
        txt.textContent = Math.round(pct) + '%';
      }

      if (pct >= 100) {
        done = true;
        setTimeout(() => { cleanup(); onComplete(); }, 300);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function down(e) {
      if (done) return;
      pressing = true;
      btn.classList.add('pressing');
      raf = requestAnimationFrame(tick);
      e.preventDefault();
    }
    function up() {
      if (done) return;
      pressing = false;
      btn.classList.remove('pressing');
      cancelAnimationFrame(raf);
      pct = 0;
      fill.style.width = '0%';
      txt.textContent = 'READY...';
      l1.className = 'g-light red active';
      l2.className = 'g-light yellow';
      l3.className = 'g-light green';
    }

    btn.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    function cleanup() {
      cancelAnimationFrame(raf);
      btn.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 5) 니케: 전술 HUD 락온 & 버스트 차지
  // ------------------------------------------------------------
  function runTactics(onComplete) {
    const btn  = document.getElementById('burstTriggerBtn');
    const fill = document.getElementById('burstBarFill');
    const txt  = document.getElementById('hudTargetText');

    let pct = 0;
    let pressing = false;
    let raf = null;
    let done = false;

    fill.style.width = '0%';
    txt.textContent = 'LOCK-ON';

    function tick() {
      if (!pressing || done) return;
      pct = Math.min(100, pct + 2.2);
      fill.style.width = pct + '%';
      txt.textContent = pct >= 100 ? 'BURST 100% READY!' : `CHARGING ${Math.round(pct)}%`;
      if (pct >= 100) {
        done = true;
        setTimeout(() => { cleanup(); onComplete(); }, 300);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function down(e) {
      if (done) return;
      pressing = true;
      btn.classList.add('pressing');
      raf = requestAnimationFrame(tick);
      e.preventDefault();
    }
    function up() {
      if (done) return;
      pressing = false;
      btn.classList.remove('pressing');
      cancelAnimationFrame(raf);
      pct = 0;
      fill.style.width = '0%';
      txt.textContent = 'LOCK-ON';
    }

    btn.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    function cleanup() {
      cancelAnimationFrame(raf);
      btn.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 6) 명일방주: 오리지늄 공명 주파수 다이얼 (Resonance Dial)
  // ------------------------------------------------------------
  function runResearch(onComplete) {
    const container = document.getElementById('rhodesDialContainer');
    const body      = document.getElementById('rhodesDialBody');
    const freqTxt   = document.getElementById('resonanceFreq');
    const prism     = document.getElementById('crystalPrism');

    let deg = 0;
    let lastA = null;
    let dragging = false;
    let done = false;
    const NEED = 360;

    function getA(e) {
      const r = container.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const s = e.touches ? e.touches[0] : e;
      return Math.atan2(s.clientY - cy, s.clientX - cx) * 180 / Math.PI;
    }

    function down(e) {
      if (done) return;
      dragging = true;
      lastA = getA(e);
      try { container.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }
    function move(e) {
      if (!dragging || done) return;
      const a = getA(e);
      let d = a - lastA;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      deg = Math.max(0, deg + d);
      lastA = a;
      body.style.transform = `rotate(${deg % 360}deg)`;
      const pct = Math.min(100, Math.round((deg / NEED) * 100));
      freqTxt.textContent = `${pct}.0 % RESONANCE`;
      prism.style.transform = `scale(${1 + pct / 300})`;

      if (deg >= NEED && !done) {
        done = true;
        freqTxt.textContent = '100% RESONANCE MATCHED!';
        prism.style.color = '#fff';
        setTimeout(() => { cleanup(); onComplete(); }, 350);
      }
      e.preventDefault();
    }
    function up() { dragging = false; }

    container.addEventListener('pointerdown', down);
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerup',   up);
    container.addEventListener('pointercancel', up);

    function cleanup() {
      container.removeEventListener('pointerdown', down);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerup',   up);
      container.removeEventListener('pointercancel', up);
      body.style.transform = '';
      freqTxt.textContent = '0.0 % RESONANCE';
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 7) 붕괴3rd: 하이페리온 워프 스로틀 (Warp Throttle Lever)
  // ------------------------------------------------------------
  function runVoyage(onComplete) {
    const track  = document.getElementById('throttleTrack');
    const handle = document.getElementById('throttleHandle');
    const fill   = document.getElementById('throttleFill');
    const val    = document.getElementById('warpVal');

    let dragging = false;
    let done = false;

    function setP(pct) {
      pct = Math.max(0, Math.min(100, pct));
      fill.style.height = pct + '%';
      handle.style.bottom = 4 + (pct / 100) * (track.clientHeight - 60) + 'px';
      val.textContent = Math.round(pct) + ' %';
      if (pct >= 90 && !done) {
        done = true;
        val.textContent = 'WARP SPEED 100%!';
        setTimeout(() => { cleanup(); onComplete(); }, 300);
      }
    }

    function down(e) {
      if (done) return;
      dragging = true;
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
      move(e);
      e.preventDefault();
    }
    function move(e) {
      if (!dragging || done) return;
      const r = track.getBoundingClientRect();
      const s = e.touches ? e.touches[0] : e;
      const rel = r.bottom - s.clientY - 30;
      setP((rel / (r.height - 60)) * 100);
    }
    function up() {
      if (done) return;
      dragging = false;
      setP(0);
    }

    track.addEventListener('pointerdown', down);
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup',   up);
    track.addEventListener('pointercancel', up);

    function cleanup() {
      track.removeEventListener('pointerdown', down);
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup',   up);
      track.removeEventListener('pointercancel', up);
    }
    currentCleanup = cleanup;
  }

  // ------------------------------------------------------------
  // 8) 붕괴: 스타레일: 은하열차 황금 승차권 펀칭 (Express Ticket Punch)
  // ------------------------------------------------------------
  function runExplore(onComplete) {
    const btn  = document.getElementById('ticketPunchBtn');
    const hole = document.getElementById('ticketPunchHole');

    hole.classList.remove('punched');
    hole.textContent = '★ PUNCH HERE';

    function onClick(e) {
      e.preventDefault();
      hole.classList.add('punched');
      hole.textContent = '★ PUNCHED ✓';
      btn.style.background = 'linear-gradient(135deg, #22c55e, #4ade80)';
      btn.textContent = '승차권 개찰 완료!';
      setTimeout(() => { cleanup(); onComplete(); }, 400);
    }

    btn.addEventListener('click', onClick);
    function cleanup() {
      btn.removeEventListener('click', onClick);
      btn.style.background = '';
      btn.textContent = '🎫 티켓 개찰 펀칭!';
    }
    currentCleanup = cleanup;
  }

  // ============================================================
  // 메인 페이지 UI 업데이트 (결과 카드 전시)
  // ============================================================
  function prependHistoryChip(data) {
    const empty = historyStrip.querySelector('.empty-msg');
    if (empty) empty.remove();
    const today = new Date();
    const mmdd  = String(today.getMonth() + 1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const chip  = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = '<span class="dot dot-' + data.tier + '"></span>' + mmdd + ' · ' + data.term;
    historyStrip.prepend(chip);
  }

  function applyToMainPage(data) {
    currentResult = data;
    if (orbWrap) orbWrap.hidden = true;
    if (mainCardWrap) {
      mainCardWrap.hidden = false;
      mainDisplayCard.className = 'card main-display-card tier-' + data.tier;
      mainCardArt.src = '/static/images/' + (data.entry_id || 'sense') + '.svg';
      mainRarityBadge.textContent = data.tier;
      mainTermText.textContent    = data.term;
      mainGameText.textContent    = data.game;
      mainFortuneText.textContent = data.text;
      mainLuckyColor.textContent  = data.color;
      mainLuckyNumber.textContent = data.num;
    }

    if (!data.locked) prependHistoryChip(data);
  }

  function openReopen(data) {
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    openModal();
    const theme = data.theme || THEME_MAP[data.entry_id] || 'school';
    const cfg   = THEME_CONFIG[theme] || THEME_CONFIG.school;
    revealResult(data, cfg);
  }

  // ============================================================
  // 소환 실행
  // ============================================================
  async function doPull() {
    if (isPulling) return;
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    isPulling = true;
    pullBtn.disabled = true;
    openModal();
    showStage(stageLoading);

    try {
      const [res] = await Promise.all([
        fetch('/api/pull', { method: 'POST' }),
        REDUCED_MOTION ? Promise.resolve() : new Promise(r => setTimeout(r, 900)),
      ]);
      if (!res.ok) throw new Error('요청 실패');
      const data = await res.json();
      currentResult = data;
      pendingData = data;
      isPulling = false;
      startGesture(data);
    } catch (err) {
      console.error(err);
      isPulling = false;
      closeModal();
      pullBtn.disabled = false;
      pullBtn.textContent = '다시 시도하기';
    }
  }

  // ============================================================
  // 이벤트 바인딩
  // ============================================================
  if (pullBtn && !pullBtn.disabled) pullBtn.addEventListener('click', doPull);

  if (reopenBtn) {
    reopenBtn.addEventListener('click', () => {
      const targetData = currentResult || pendingData || TODAY_RESULT;
      if (targetData) {
        if (currentCleanup) { currentCleanup(); currentCleanup = null; }
        openModal();
        startGesture(targetData);
      }
    });
  }

  modalClose.addEventListener('click', closeModal);
  modalConfirm.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
})();
