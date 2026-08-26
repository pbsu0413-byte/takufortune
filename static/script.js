(function () {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const THEME_MAP = window.THEME_MAP || {};
  const TODAY_RESULT = window.TODAY_RESULT || null;

  // 게임 테마별 제스처 연출 설정
  const GESTURE_CONFIG = {
    school:   { icon: '🖋️', label: '서약서 끝까지 서명해서\n오늘의 방과후를 확정하세요', vertical: false },
    race:     { icon: '🏁', label: '출발 신호를 끝까지 밀어\n트랙에 신호를 보내세요', vertical: false },
    tactics:  { icon: '🔐', label: '작전 승인 슬라이더를 밀어\n오늘의 지휘를 확정하세요', vertical: false },
    research: { icon: '🎒', label: '가방 잠금을 끝까지 밀어 올려\n오늘의 발견을 확인하세요', vertical: true },
    voyage:   { icon: '🧭', label: '타륜을 끝까지 밀어\n항로를 확정하세요', vertical: false },
    summon:   { icon: '✒️', label: '계약서에 마력으로 서명해\n인연을 확정하세요', vertical: false },
    arsenal:  { icon: '🔫', label: '탄창을 끝까지 밀어 올려\n장전을 완료하세요', vertical: true },
    explore:  { icon: '🎫', label: '티켓을 끝까지 밀어 넣어\n개찰을 완료하세요', vertical: false },
  };

  const pullBtn = document.getElementById('pullBtn');
  const pityText = document.getElementById('pityText');
  const historyStrip = document.getElementById('historyStrip');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const stageLoading = document.getElementById('stageLoading');
  const stageGesture = document.getElementById('stageGesture');
  const stageResult = document.getElementById('stageResult');

  const gestureIcon = document.getElementById('gestureIcon');
  const gestureLabel = document.getElementById('gestureLabel');
  const gestureTrack = document.getElementById('gestureTrack');
  const gestureFill = document.getElementById('gestureFill');
  const gestureHandle = document.getElementById('gestureHandle');
  const gestureSub = document.getElementById('gestureSub');

  const modalCard = document.getElementById('modalCard');
  const mCardArt = document.getElementById('mCardArt');
  const mRarityBadge = document.getElementById('mRarityBadge');
  const mTermText = document.getElementById('mTermText');
  const mGameText = document.getElementById('mGameText');
  const mFortuneText = document.getElementById('mFortuneText');
  const mLuckyColor = document.getElementById('mLuckyColor');
  const mLuckyNumber = document.getElementById('mLuckyNumber');
  const modalConfirm = document.getElementById('modalConfirm');

  let pendingData = null;
  let isPulling = false;

  function showStage(stage) {
    [stageLoading, stageGesture, stageResult].forEach((s) => (s.hidden = s !== stage));
  }

  function openModal() {
    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (gestureTrack._cleanup) gestureTrack._cleanup();
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
    resetGesture();
    if (pendingData) {
      applyToMainPage(pendingData);
      pendingData = null;
    }
  }

  function resetGesture() {
    gestureTrack.classList.remove('vertical');
    gestureFill.style.width = '0%';
    gestureFill.style.height = '0%';
    gestureHandle.style.left = '3px';
    gestureHandle.style.top = '3px';
    gestureHandle.style.bottom = 'auto';
    gestureHandle.textContent = '→';
    gestureHandle.style.cursor = 'grab';
  }

  function spawnParticles() {
    if (REDUCED_MOTION) return;
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.left = '50%';
      p.style.top = '35%';
      modalCard.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  function revealResult(data) {
    modalCard.className = 'card tier-' + data.tier;
    mRarityBadge.textContent = data.tier;
    mTermText.textContent = data.term;
    mGameText.textContent = data.game;
    mFortuneText.textContent = data.text;
    mLuckyColor.textContent = data.color;
    mLuckyNumber.textContent = data.num;
    if (mCardArt) {
      mCardArt.src = '/static/images/' + (data.entry_id || 'sense') + '.svg';
      mCardArt.alt = data.term;
    }
    showStage(stageResult);
    modalCard.classList.remove('show');
    requestAnimationFrame(() => {
      modalCard.classList.add('show');
      if (data.tier === 'SSR') spawnParticles();
    });
  }

  function startGesture(data) {
    const theme = data.theme || THEME_MAP[data.entry_id] || 'school';
    const cfg = GESTURE_CONFIG[theme] || GESTURE_CONFIG.school;

    resetGesture();
    gestureIcon.textContent = cfg.icon;
    gestureLabel.textContent = cfg.label;
    if (gestureSub) {
      gestureSub.textContent = cfg.vertical ? '핸들을 위로 밀거나 터치하세요' : '핸들을 오른쪽으로 밀거나 터치하세요';
    }
    if (cfg.vertical) {
      gestureTrack.classList.add('vertical');
      gestureHandle.style.top = 'auto';
      gestureHandle.style.bottom = '3px';
      gestureHandle.textContent = '↑';
    }

    showStage(stageGesture);
    attachDrag(cfg.vertical, () => {
      if (!REDUCED_MOTION) {
        setTimeout(() => revealResult(data), 200);
      } else {
        revealResult(data);
      }
    });
  }

  function attachDrag(vertical, onComplete) {
    let done = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    const track = gestureTrack;
    const handle = gestureHandle;

    function setProgress(pct, animate) {
      pct = Math.max(0, Math.min(100, pct));
      if (animate) {
        handle.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        gestureFill.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
      } else {
        handle.style.transition = '';
        gestureFill.style.transition = '';
      }

      if (vertical) {
        gestureFill.style.height = pct + '%';
        const maxOffset = (track.clientHeight || 220) - 52;
        handle.style.bottom = 3 + (pct / 100) * maxOffset + 'px';
      } else {
        gestureFill.style.width = pct + '%';
        const maxOffset = (track.clientWidth || 340) - 52;
        handle.style.left = 3 + (pct / 100) * maxOffset + 'px';
      }

      if (pct >= 85 && !done) {
        done = true;
        setProgress(100, true);
        handle.style.cursor = 'default';
        if (track._cleanup) track._cleanup();
        setTimeout(onComplete, 300);
      }
    }

    function pointerToProgress(clientX, clientY) {
      const rect = track.getBoundingClientRect();
      if (vertical) {
        const rel = rect.bottom - clientY - 26;
        const total = rect.height - 52;
        return total > 0 ? (rel / total) * 100 : 0;
      }
      const rel = clientX - rect.left - 26;
      const total = rect.width - 52;
      return total > 0 ? (rel / total) * 100 : 0;
    }

    function onMove(e) {
      if (!dragging || done) return;
      setProgress(pointerToProgress(e.clientX, e.clientY), false);
    }

    function onUp(e) {
      if (done) return;
      const wasDragging = dragging;
      dragging = false;
      try {
        if (handle.hasPointerCapture && handle.hasPointerCapture(e.pointerId)) {
          handle.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const movedDist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (wasDragging && movedDist < 10) {
        setProgress(100, true);
      } else {
        setProgress(0, true);
      }
    }

    function onDown(e) {
      if (done) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      try {
        if (handle.setPointerCapture) {
          handle.setPointerCapture(e.pointerId);
        }
      } catch (_) {}
      setProgress(pointerToProgress(e.clientX, e.clientY), false);
      e.preventDefault();
    }

    function onTapToUnlock() {
      if (done) return;
      setProgress(100, true);
    }

    handle.onpointerdown = onDown;
    track.onpointerdown = onDown;
    if (gestureSub) gestureSub.onclick = onTapToUnlock;
    if (gestureIcon) gestureIcon.onclick = onTapToUnlock;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    track._cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      handle.onpointerdown = null;
      track.onpointerdown = null;
      if (gestureSub) gestureSub.onclick = null;
      if (gestureIcon) gestureIcon.onclick = null;
    };
  }

  function prependHistoryChip(data) {
    const empty = historyStrip.querySelector('.empty-msg');
    if (empty) empty.remove();
    const today = new Date();
    const mmdd =
      String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = '<span class="dot dot-' + data.tier + '"></span>' + mmdd + ' · ' + data.term;
    historyStrip.prepend(chip);
  }

  function applyToMainPage(data) {
    pullBtn.disabled = true;
    pullBtn.textContent = '오늘의 인연은 이미 확인했어요';
    if (data.pity_text) pityText.textContent = data.pity_text;
    if (!data.locked) prependHistoryChip(data);
    let reopen = document.getElementById('reopenBtn');
    if (!reopen) {
      reopen = document.createElement('button');
      reopen.className = 'ghost-btn';
      reopen.id = 'reopenBtn';
      reopen.textContent = '오늘의 인연 다시 보기';
      reopen.addEventListener('click', () => openReopen(data));
      pityText.insertAdjacentElement('afterend', reopen);
    }
  }

  function openReopen(data) {
    if (gestureTrack._cleanup) gestureTrack._cleanup();
    openModal();
    revealResult(data);
  }

  async function doPull() {
    if (isPulling) return;
    if (gestureTrack._cleanup) gestureTrack._cleanup();
    isPulling = true;
    pullBtn.disabled = true;
    openModal();
    showStage(stageLoading);

    try {
      const [res] = await Promise.all([
        fetch('/api/pull', { method: 'POST' }),
        REDUCED_MOTION ? Promise.resolve() : new Promise((r) => setTimeout(r, 900)),
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

  if (pullBtn && !pullBtn.disabled) {
    pullBtn.addEventListener('click', doPull);
  }
  const initialReopenBtn = document.getElementById('reopenBtn');
  if (initialReopenBtn && TODAY_RESULT) {
    initialReopenBtn.addEventListener('click', () => openReopen(TODAY_RESULT));
  }
  modalClose.addEventListener('click', closeModal);
  modalConfirm.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
})();
