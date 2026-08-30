/* ============================================================
MODES SAISONNIERS — Halloween 🎃 (cliquer) & Noël 🎄 (attraper)
============================================================ */
const CATCH_CONFIG = {
  halloween: { good: "🦇", bad: "👻", gamble: "🎃", label: "🎃 CHASSE HANTÉE",
    rules: "Clique les 🦇 <b style='color:#00ff88'>(+10)</b> avant qu'elles ne tombent ! Évite les 👻 <b style='color:#ff4b2b'>(−15)</b>. Les 🎃 sont un pari : <b>+20 / 0 / −10</b>." },
  noel: { good: "🎁", bad: "🎄", gamble: "🧝", label: "🎄 HOTTE DU PÈRE NOËL",
    rules: "Déplace le <b>Père Noël</b> (doigt / souris) et lève sa <b>hotte</b> pour attraper les 🎁 <b style='color:#00ff88'>(+10)</b> ! Évite les 🎄 <b style='color:#ff4b2b'>(−15)</b>. Les 🧝 sont un pari : <b>+20 / 0 / −10</b>." }
};
let catchState = null;

function startHalloweenQueue() { openCatchChoice("halloween"); }
function startNoelQueue() { openCatchChoice("noel"); }

function openCatchChoice(theme) {
  closeCatchChoice();
  const cfg = CATCH_CONFIG[theme];
  const ov = document.createElement('div');
  ov.id = 'catch-choice-overlay'; ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal-card" style="max-width:340px;text-align:center;">
    <h2 style="color:#f8b500;margin:0 0 8px 0;">${cfg.label}</h2>
    <div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px;font-size:11px;color:#ddd;line-height:1.5;margin-bottom:10px;text-align:left;">
      <b style="color:#00d2ff;">📖 COMMENT JOUER :</b><br>${cfg.rules}
    </div>
    <button class="btn-main btn-blue" onclick="launchCatch('${theme}',false)">🏋️ Solo</button>
    <button class="btn-main btn-gold" onclick="launchCatch('${theme}',true)">⚔️ Duel 1v1</button>
    <button class="btn-secondary" onclick="closeCatchChoice()">⬅️ Retour</button>
  </div>`;
  document.body.appendChild(ov);
}
function closeCatchChoice() { const o = document.getElementById('catch-choice-overlay'); if (o) o.remove(); }

function launchCatch(theme, is1v1) {
  closeCatchChoice();
  if (is1v1) {
    hideAllScreens();
    document.getElementById('screen-1v1-lobby').style.display = 'flex';
    socket.emit(theme === 'halloween' ? 'find_halloween_match' : 'find_noel_match');
  } else beginCatch(theme, false, null);
}

/* ---------- Serveur ---------- */
socket.on('start_catch', (data) => {
  hideAllScreens();
  document.getElementById('countdown-overlay').style.display = 'flex';
  let c = 3; document.getElementById('countdown-number').innerText = c;
  const t = setInterval(() => { c--;
    if (c > 0) document.getElementById('countdown-number').innerText = c;
    else { clearInterval(t); document.getElementById('countdown-overlay').style.display = 'none'; beginCatch(data.theme, true, data.opponent); }
  }, 1000);
});
socket.on('catch_timer', (time) => { if (catchState && catchState.is1v1) { catchState.timeLeft = time; updateCatchHUD(); if (time <= 0) stopCatchSpawning(); } });
socket.on('catch_opp_score', (d) => { if (catchState) { catchState.oppScore = d.score; updateCatchHUD(); } });
socket.on('game_over_1v1', (data) => { if (data.isCatch) catchState = null; });

/* ---------- Moteur ---------- */
function beginCatch(theme, is1v1, opponent) {
  clearCatchArena();
  catchState = { theme, is1v1, opponent, score: 0, oppScore: 0, timeLeft: 30, active: true, items: [], hutX: innerWidth / 2, spawnDelay: 800, speed: theme === 'halloween' ? 2.6 : 3.2 };
  const cfg = CATCH_CONFIG[theme];
  const arena = document.createElement('div');
  arena.id = 'catch-arena'; arena.className = theme;
  const extra = theme === 'noel' ? '<div id="catch-santa"></div>' : '<div id="catch-backdrop">🏰</div>';
  arena.innerHTML = `${extra}
    <div id="catch-hud"><div>⭐ <span id="catch-score">0</span></div><div id="catch-timer" style="color:#ff007f;">30</div><div>${is1v1 ? '🆚 <span id="catch-opp">0</span>' : ''}</div></div>
    <div style="text-align:center;font-weight:900;color:#fff;">${cfg.label}</div>
    <div id="catch-field"></div>`;
  document.body.appendChild(arena);
  document.body.style.overflow = 'hidden';

  if (theme === 'noel') {
    const hut = document.getElementById('catch-santa');
    const move = (x) => { catchState.hutX = Math.max(50, Math.min(innerWidth - 50, x)); hut.style.left = catchState.hutX + 'px'; };
    arena.addEventListener('pointermove', (e) => move(e.clientX));
    arena.addEventListener('touchmove', (e) => { if (e.touches[0]) move(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
    move(innerWidth / 2);
    catchState.raf = requestAnimationFrame(noelLoop);
  }
  if (!is1v1) catchState.timerInterval = setInterval(() => { catchState.timeLeft--; updateCatchHUD(); if (catchState.timeLeft <= 0) endCatchSolo(); }, 1000);
  scheduleSpawn();
}

function scheduleSpawn() {
  if (!catchState || !catchState.active) return;
  spawnCatchItem();
  const elapsed = 30 - catchState.timeLeft;
  if (catchState.theme === 'noel') catchState.spawnDelay = Math.max(500, 850 - elapsed * 12);
    else { catchState.spawnDelay = Math.max(400, 800 - elapsed * 13); catchState.speed = Math.max(1.4, 2.6 - elapsed * 0.04); }
  catchState.spawnTimeout = setTimeout(scheduleSpawn, catchState.spawnDelay);
}

function spawnCatchItem() {
  const field = document.getElementById('catch-field'); if (!field || !catchState) return;
  const cfg = CATCH_CONFIG[catchState.theme];
  const r = Math.random();
  const pGood = 0.60;
  const pBad = catchState.theme === 'noel' ? 0.87 : 0.85;
  const type = r < pGood ? 'good' : (r < pBad ? 'bad' : 'gamble');
  const el = document.createElement('div');
    el.className = 'catch-item';
    el.innerText = cfg[type];
    if (catchState.theme === 'halloween') {
    if (field.childElementCount > 14) return;
    el.classList.add('fall');
    el.style.fontSize = (52 + Math.random() * 26) + 'px';
    el.style.left = (10 + Math.random() * Math.max(60, innerWidth - 100)) + 'px';
    el.style.top = '-80px';
    el.style.animationDuration = catchState.speed + 's';
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); applyCatch(type, e.clientX, e.clientY); el.remove(); }, { once: true });
    el.addEventListener('animationend', () => { if (type === 'good') penaltyMiss(el); el.remove(); });
    field.appendChild(el);
  } else {
    if (catchState.items.length > 12) return;
    el.style.fontSize = (40 + Math.random() * 16) + 'px';
    el.style.left = '0px'; el.style.top = '0px';
    field.appendChild(el);
    const bx = 30 + Math.random() * Math.max(60, innerWidth - 70);
    catchState.items.push({ el, type, bx, x: bx, y: -60, ph: Math.random() * 6.28, vy: 2.4 + Math.random() * 1.4 + (30 - catchState.timeLeft) * 0.05 });
  }
}

function noelLoop() {
  if (!catchState || !catchState.active || catchState.theme !== 'noel') return;
  const hutTop = innerHeight - 110;
  for (let i = catchState.items.length - 1; i >= 0; i--) {
    const it = catchState.items[i];
    it.y += it.vy;
    it.x = Math.max(20, Math.min(innerWidth - 20, it.bx + Math.sin(it.y * 0.02 + it.ph) * 28));
    it.el.style.transform = 'translate3d(' + it.x + 'px,' + it.y + 'px,0)';
    const w = it.type === 'good' ? 55 : (it.type === 'bad' ? 40 : 55);
    if (it.y >= hutTop - 45 && it.y <= hutTop + 50 && Math.abs(it.x - catchState.hutX) < w) {
      applyCatch(it.type, it.x, it.y); it.el.remove(); catchState.items.splice(i, 1);
    } else if (it.y > innerHeight + 60) {
      if (it.type === 'good') penaltyMiss(it.el);
      it.el.remove(); catchState.items.splice(i, 1);
    }
  }
  catchState.raf = requestAnimationFrame(noelLoop);
}

function applyCatch(type, fx, fy) {
  if (!catchState || !catchState.active) return;
  let delta;
  if (type === 'good') delta = 10;
  else if (type === 'bad') delta = -15;
  else { const r = Math.random(); delta = r < 0.4 ? 20 : (r < 0.7 ? 0 : -10); }
  catchState.score = Math.max(0, catchState.score + delta);
  updateCatchHUD();
  if (fx !== undefined) floatCatch(delta, fx, fy);
  if (delta >= 0) SoundEngine.playClick(); else SoundEngine.playError();
  if (catchState.is1v1) socket.emit('catch_click', { delta });
}
function penaltyMiss(el) {
  if (!catchState || !catchState.active) return;
  catchState.score = Math.max(0, catchState.score - 5);
  updateCatchHUD();
  const r = el.getBoundingClientRect();
  floatCatch(-5, r.left, r.top);
  if (catchState.is1v1) socket.emit('catch_click', { delta: -5 });
}
function floatCatch(delta, x, y) {
  const f = document.createElement('div');
  f.className = 'catch-float'; f.style.color = delta >= 0 ? '#00ff88' : '#ff4b2b';
  f.innerText = (delta > 0 ? '+' : '') + delta;
  f.style.left = x + 'px'; f.style.top = y + 'px';
  document.getElementById('catch-arena').appendChild(f);
  setTimeout(() => f.remove(), 900);
}

function updateCatchHUD() {
  const s = document.getElementById('catch-score'); if (s) s.innerText = catchState.score;
  const t = document.getElementById('catch-timer'); if (t) t.innerText = Math.max(0, catchState.timeLeft);
  const o = document.getElementById('catch-opp'); if (o) o.innerText = catchState.oppScore;
}
function stopCatchSpawning() { if (catchState) clearTimeout(catchState.spawnTimeout); }
function clearCatchArena() {
  if (catchState) { clearTimeout(catchState.spawnTimeout); clearInterval(catchState.timerInterval); if (catchState.raf) cancelAnimationFrame(catchState.raf); catchState.items = []; }
  const a = document.getElementById('catch-arena'); if (a) a.remove();
  document.body.style.overflow = '';
}
function endCatchSolo() {
  if (!catchState) return;
  catchState.active = false;
  stopCatchSpawning(); clearInterval(catchState.timerInterval); if (catchState.raf) cancelAnimationFrame(catchState.raf);
  socket.emit('claim_catch_solo', { score: catchState.score });
}
socket.on('catch_solo_result', (data) => {
  const score = catchState ? catchState.score : 0;
  clearCatchArena(); catchState = null;
  hideAllScreens();
  document.getElementById('recap-1v1-rows').style.display = 'none';
  document.getElementById('recap-banner').innerText = '🎯 MODE SAISONNIER TERMINÉ';
  document.getElementById('recap-banner').style.color = '#00d2ff';
  document.getElementById('recap-reason').innerText = `Score : ${score}`;
  document.getElementById('recap-my-score').innerText = score;
  document.getElementById('recap-coins-gained').innerHTML = `+${data.baseCoins}${data.rushBonus > 0 ? ` <span style="color:#ff8a00;">+${data.rushBonus}(RUSH)</span>` : ''}`;
  document.getElementById('winner-cinematic-container').innerHTML = '';
  document.getElementById('recap-modal').style.display = 'flex';
  SoundEngine.playVictory();
});

/* ---------- Visibilité boutons ---------- */
function refreshCatchButtons() {
  const season = (typeof getCurrentSeasonId === "function") ? getCurrentSeasonId() : (window.CURRENT_SEASON || "s1");
  const hb = document.getElementById('btn-halloween-menu');
  const nb = document.getElementById('btn-noel-menu');
  if (hb) hb.style.display = (latestGlobalEvents.halloweenMode || season === 's2') ? 'flex' : 'none';
  if (nb) nb.style.display = (latestGlobalEvents.noelMode || season === 's3') ? 'flex' : 'none';
}
socket.on('events_state_update', refreshCatchButtons);
socket.on('player_registered', () => setTimeout(refreshCatchButtons, 60));
socket.on('season_updated', () => setTimeout(refreshCatchButtons, 60));
