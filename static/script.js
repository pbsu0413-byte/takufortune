(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const THEME_MAP = window.THEME_MAP || {};
  const TODAY_RESULT = window.TODAY_RESULT || null;

  // ============================================================
  // 테마별 설정 & 고유 비주얼 설정
  // ============================================================
  const THEME_CONFIG = {
    // A) 서명형
    school:   { gestureType: 'sign',  label: '서약서에 직접 서명해\n오늘의 방과후를 확정하세요',  artKey: 'sense',   fallback: '🖋️', themeClass: 'theme-school' },
    summon:   { gestureType: 'sign',  label: '계약서에 마력으로 서명해\n인연을 확정하세요',         artKey: 'master',  fallback: '✒️', themeClass: 'theme-summon' },
    // B) 꾹 누르기형
    race:     { gestureType: 'hold',  label: '출발 버튼을 꾹 누르고 있어요\n신호가 울릴 때까지!',    artKey: 'trainer', fallback: '🏁', themeClass: 'theme-race' },
    tactics:  { gestureType: 'hold',  label: '작전 승인 버튼을 꾹 누르고 있어요\n게이지가 꽉 차면 확정!', artKey: 'nikke', fallback: '🔐', themeClass: 'theme-tactics' },
    // C) 돌리기형
    voyage:   { gestureType: 'dial',  label: '타륜을 시계방향으로 돌려\n항로를 확정하세요',          artKey: 'captain', fallback: '🧭', themeClass: 'theme-voyage' },
    research: { gestureType: 'dial',  label: '오리지늄 크리스탈을 돌려\n오늘의 분석을 완료하세요',    artKey: 'doctor',  fallback: '🔬', themeClass: 'theme-research' },
    // D) 연타형
    arsenal:  { gestureType: 'tap',   label: '탄창을 빠르게 탭해서\n장전을 완료하세요',              artKey: 'gf',      fallback: '🔫', themeClass: 'theme-arsenal' },
    explore:  { gestureType: 'tap',   label: '개찰구를 빠르게 탭해서\n탑승을 완료하세요',             artKey: 'trailbz', fallback: '🎫', themeClass: 'theme-explore' },
  };

  // ============================================================
  // DOM 요소
  // ============================================================
  // 메인 페이지 요소
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

  // 모달 요소
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose   = document.getElementById('modalClose');
  const stageLoading = document.getElementById('stageLoading');
  const stageGesture = document.getElementById('stageGesture');
  const stageResult  = document.getElementById('stageResult');

  // 테마 Ambient VFX
  const themeAmbientFx = document.getElementById('themeAmbientFx');
  const ambientBurst   = document.getElementById('ambientBurst');

  // 제스처 공통
  const gestureArtFrame    = document.getElementById('gestureArtFrame');
  const gestureArtImg      = document.getElementById('gestureArtImg');
  const gestureArtFallback = document.getElementById('gestureArtFallback');
  const gestureLabel       = document.getElementById('gestureLabel');
  const gestureSub         = document.getElementById('gestureSub');

  // A) 서명형
  const gestureSignWrap  = document.getElementById('gestureSignWrap');
  const gestureCanvas    = document.getElementById('gestureCanvas');
  const signResetBtn     = document.getElementById('signResetBtn');
  const signSubmitBtn    = document.getElementById('signSubmitBtn');

  // B) 꾹 누르기형
  const gestureHoldWrap  = document.getElementById('gestureHoldWrap');
  const holdRingFill     = document.getElementById('holdRingFill');
  const holdBtn          = document.getElementById('holdBtn');
  const holdBtnIcon      = document.getElementById('holdBtnIcon');

  // C) 돌리기형
  const gestureDialWrap  = document.getElementById('gestureDialWrap');
  const dialContainer    = document.getElementById('dialContainer');
  const dialBody         = document.getElementById('dialBody');
  const dialFill         = document.getElementById('dialFill');
  const dialHandleDot    = document.getElementById('dialHandleDot');

  // D) 연타형
  const gestureTapWrap   = document.getElementById('gestureTapWrap');
  const tapFill          = document.getElementById('tapFill');
  const tapProgressLabel = document.getElementById('tapProgressLabel');
  const tapBtn           = document.getElementById('tapBtn');
  const tapHint          = document.getElementById('tapHint');

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

  let pendingData = null;
  let isPulling   = false;
  let currentCleanup = null;

  // SVG 그라디언트 삽입
  (function injectSvgDefs() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    svg.innerHTML = `
      <defs>
        <linearGradient id="holdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
        <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>`;
    document.body.prepend(svg);
  })();

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
  // 단계 전환
  // ============================================================
  function showStage(stage) {
    [stageLoading, stageGesture, stageResult].forEach(s => (s.hidden = s !== stage));
  }

  function showGestureWrap(which) {
    [gestureSignWrap, gestureHoldWrap, gestureDialWrap, gestureTapWrap]
      .forEach(el => { if (el) el.hidden = el !== which; });
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

  // ============================================================
  // SSR 파티클 & 빛 폭발 이펙트
  // ============================================================
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
  // 3D 카드 플립 & 결과 공개 연출
  // ============================================================
  function revealResult(data, cfg) {
    // 1) 카드 앞면 내용 채우기
    modalCard.className = 'card-face card-front card tier-' + data.tier;
    mRarityBadge.textContent = data.tier;
    mTermText.textContent    = data.term;
    mGameText.textContent    = data.game;
    mFortuneText.textContent = data.text;
    mLuckyColor.textContent  = data.color;
    mLuckyNumber.textContent = data.num;
    loadArt(mCardArtWrap, mCardArt, mCardArtFallback, cfg.artKey, cfg.fallback);

    // 2) 테마별 Ambient VFX 활성화
    themeAmbientFx.className = 'theme-ambient-fx active ' + (cfg.themeClass || 'theme-school');

    // 3) 결과 스테이지 열기 (초기엔 카드 뒷면 보임)
    cardFlipper.classList.remove('flipped');
    showStage(stageResult);

    // 4) 드라마틱한 3D 플립 애니메이션 시작
    setTimeout(() => {
      cardFlipper.classList.add('flipped');

      // 뒤집히는 순간(400ms 후) 빛 폭발 및 파티클 발동
      setTimeout(() => {
        ambientBurst.classList.add('explode');
        if (data.tier === 'SSR' || data.tier === 'SR') {
          spawnParticles();
        }
      }, 450);
    }, 250);
  }

  // ============================================================
  // 제스처 시작 (공통 진입점)
  // ============================================================
  function startGesture(data) {
    const theme = data.theme || THEME_MAP[data.entry_id] || 'school';
    const cfg   = THEME_CONFIG[theme] || THEME_CONFIG.school;

    // 공통: 이미지 + 라벨
    loadArt(gestureArtFrame, gestureArtImg, gestureArtFallback, cfg.artKey, cfg.fallback);
    gestureLabel.textContent = cfg.label;
    gestureSub.textContent   = '';

    // 완료 콜백
    const onComplete = () => {
      revealResult(data, cfg);
    };

    // 타입별 제스처 실행
    showStage(stageGesture);
    if      (cfg.gestureType === 'sign') startSign(onComplete);
    else if (cfg.gestureType === 'hold') startHold(onComplete);
    else if (cfg.gestureType === 'dial') startDial(onComplete);
    else if (cfg.gestureType === 'tap')  startTap(onComplete);
  }

  // ============================================================
  // A) 서명형: 캔버스 서명
  // ============================================================
  function startSign(onComplete) {
    showGestureWrap(gestureSignWrap);
    gestureSub.textContent = '서명을 그은 뒤 제출 버튼을 눌러주세요';

    const canvas = gestureCanvas;
    const ctx    = canvas.getContext('2d');
    const box    = canvas.parentElement;

    function resizeCanvas() {
      const w = canvas.offsetWidth || 340;
      const h = canvas.offsetHeight || 100;
      canvas.width  = w * (window.devicePixelRatio || 1);
      canvas.height = h * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
    resizeCanvas();

    let drawing    = false;
    let totalLen   = 0;
    const THRESHOLD = 60;
    let lastX = 0, lastY = 0;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    function onDown(e) {
      drawing = true;
      const { x, y } = getPos(e);
      lastX = x; lastY = y;
      ctx.beginPath();
      ctx.moveTo(x, y);
      e.preventDefault();
    }
    function onMove(e) {
      if (!drawing) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y);
      totalLen += Math.hypot(x - lastX, y - lastY);
      lastX = x; lastY = y;
      if (totalLen > 0) box.classList.add('has-strokes');
      if (totalLen >= THRESHOLD) {
        signSubmitBtn.disabled = false;
        signSubmitBtn.style.opacity = '1';
        signSubmitBtn.style.pointerEvents = 'auto';
      }
      e.preventDefault();
    }
    function onUp() { drawing = false; ctx.beginPath(); }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    canvas.addEventListener('pointercancel', onUp);

    function resetCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      totalLen = 0;
      box.classList.remove('has-strokes');
      signSubmitBtn.disabled = true;
      signSubmitBtn.style.opacity = '0.4';
      signSubmitBtn.style.pointerEvents = 'none';
    }

    signResetBtn.onclick  = resetCanvas;
    signSubmitBtn.onclick = () => {
      if (totalLen < THRESHOLD) return;
      cleanup();
      onComplete();
    };

    function cleanup() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup',   onUp);
      canvas.removeEventListener('pointercancel', onUp);
      signResetBtn.onclick  = null;
      signSubmitBtn.onclick = null;
      resetCanvas();
    }
    currentCleanup = cleanup;
  }

  // ============================================================
  // B) 꾹 누르기형: 원형 게이지
  // ============================================================
  function startHold(onComplete) {
    showGestureWrap(gestureHoldWrap);
    gestureSub.textContent = '버튼을 꾹 누르고 있으면 게이지가 채워져요';

    const CIRCUMFERENCE = 2 * Math.PI * 58;
    holdRingFill.style.strokeDashoffset = CIRCUMFERENCE;

    let pct     = 0;
    let pressing = false;
    let rafId   = null;
    let done    = false;

    function tick() {
      if (!pressing || done) return;
      pct = Math.min(100, pct + 2.0);
      holdRingFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
      holdBtnIcon.textContent = Math.round(pct) + '%';
      if (pct >= 100) {
        done = true;
        cleanup();
        onComplete();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function onDown(e) {
      if (done) return;
      pressing = true;
      holdBtn.classList.add('pressing');
      rafId = requestAnimationFrame(tick);
      e.preventDefault();
    }
    function onUp() {
      if (done) return;
      pressing = false;
      holdBtn.classList.remove('pressing');
      cancelAnimationFrame(rafId);
      const drain = setInterval(() => {
        if (pressing || done) { clearInterval(drain); return; }
        pct = Math.max(0, pct - 4);
        holdRingFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
        holdBtnIcon.textContent = pct > 0 ? Math.round(pct) + '%' : '꾹';
        if (pct <= 0) clearInterval(drain);
      }, 30);
    }

    holdBtn.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup',    onUp);
    window.addEventListener('pointercancel', onUp);

    function cleanup() {
      cancelAnimationFrame(rafId);
      holdBtn.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup',    onUp);
      window.removeEventListener('pointercancel', onUp);
      holdBtn.classList.remove('pressing');
      holdRingFill.style.strokeDashoffset = CIRCUMFERENCE;
      holdBtnIcon.textContent = '꾹';
      pct = 0;
    }
    currentCleanup = cleanup;
  }

  // ============================================================
  // C) 돌리기형: 다이얼 회전
  // ============================================================
  function startDial(onComplete) {
    showGestureWrap(gestureDialWrap);
    gestureSub.textContent = '손잡이를 시계방향으로 돌려주세요';

    const CIRCUMFERENCE = 2 * Math.PI * 68;
    const NEED_DEG = 360;
    dialFill.style.strokeDashoffset = CIRCUMFERENCE;

    let totalDeg = 0;
    let lastAngle = null;
    let dragging = false;
    let done = false;

    function getAngle(e, el) {
      const rect   = el.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const src    = e.touches ? e.touches[0] : e;
      return Math.atan2(src.clientY - cy, src.clientX - cx) * 180 / Math.PI;
    }

    function setDeg(deg) {
      dialHandleDot.style.transform = `rotate(${deg}deg) translateX(0) translateY(-36px)`;
      dialBody.style.transform = `rotate(${deg}deg)`;
      const pct = Math.min(100, (totalDeg / NEED_DEG) * 100);
      dialFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
    }

    function onDown(e) {
      if (done) return;
      dragging   = true;
      lastAngle  = getAngle(e, dialBody);
      try { dialBody.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging || done) return;
      const a = getAngle(e, dialBody);
      let delta = a - lastAngle;
      if (delta >  180) delta -= 360;
      if (delta < -180) delta += 360;
      totalDeg = Math.max(0, totalDeg + delta);
      lastAngle = a;
      setDeg(totalDeg % 360);
      if (totalDeg >= NEED_DEG && !done) {
        done = true;
        setDeg(360);
        dialFill.style.strokeDashoffset = 0;
        setTimeout(() => { cleanup(); onComplete(); }, 300);
      }
      e.preventDefault();
    }
    function onUp() { dragging = false; }

    dialBody.addEventListener('pointerdown', onDown);
    dialBody.addEventListener('pointermove', onMove);
    dialBody.addEventListener('pointerup',   onUp);
    dialBody.addEventListener('pointercancel', onUp);
    dialContainer.addEventListener('pointerdown', onDown);
    dialContainer.addEventListener('pointermove', onMove);

    function cleanup() {
      dialBody.removeEventListener('pointerdown', onDown);
      dialBody.removeEventListener('pointermove', onMove);
      dialBody.removeEventListener('pointerup',   onUp);
      dialBody.removeEventListener('pointercancel', onUp);
      dialContainer.removeEventListener('pointerdown', onDown);
      dialContainer.removeEventListener('pointermove', onMove);
      dialFill.style.strokeDashoffset = CIRCUMFERENCE;
      dialBody.style.transform = '';
      totalDeg = 0; lastAngle = null;
    }
    currentCleanup = cleanup;
  }

  // ============================================================
  // D) 연타형: 빠르게 탭해서 채우기
  // ============================================================
  function startTap(onComplete) {
    showGestureWrap(gestureTapWrap);
    gestureSub.textContent = '버튼을 빠르게 여러 번 탭해주세요!';

    const NEED_TAPS = 12;
    let count = 0;
    let done  = false;
    let decayTimer = null;

    tapFill.style.width = '0%';
    tapProgressLabel.textContent = '0%';
    tapHint.textContent = `0 / ${NEED_TAPS}`;

    function setPct(pct) {
      pct = Math.max(0, Math.min(100, pct));
      tapFill.style.width = pct + '%';
      tapProgressLabel.textContent = Math.round(pct) + '%';
    }

    function resetDecay() {
      clearInterval(decayTimer);
      decayTimer = setInterval(() => {
        if (done) { clearInterval(decayTimer); return; }
        const cur = parseFloat(tapFill.style.width) || 0;
        if (cur > 0) {
          setPct(cur - 1.8);
        } else {
          clearInterval(decayTimer);
        }
      }, 60);
    }

    function onTap(e) {
      if (done) return;
      e.preventDefault();
      count++;
      tapHint.textContent = `${count} / ${NEED_TAPS}`;
      const pct = (count / NEED_TAPS) * 100;
      setPct(pct);
      clearInterval(decayTimer);
      setTimeout(resetDecay, 600);

      if (count >= NEED_TAPS) {
        done = true;
        setPct(100);
        cleanup();
        setTimeout(onComplete, 300);
      }
    }

    tapBtn.addEventListener('pointerdown', onTap);
    tapBtn.addEventListener('touchstart',  onTap, { passive: false });

    function cleanup() {
      clearInterval(decayTimer);
      tapBtn.removeEventListener('pointerdown', onTap);
      tapBtn.removeEventListener('touchstart',  onTap);
      count = 0;
      setPct(0);
      tapHint.textContent = `0 / ${NEED_TAPS}`;
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
    // 1) 소환 구체 영역 숨기고, 메인 결과 카드 영역 표시
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
      const targetData = pendingData || TODAY_RESULT;
      if (targetData) openReopen(targetData);
    });
  }

  modalClose.addEventListener('click', closeModal);
  modalConfirm.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
})();
