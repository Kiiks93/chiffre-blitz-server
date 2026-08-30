/* ============================================================
MODES SAISONNIERS "ATTRAPE" — Halloween 🎃 & Noël 🎄
============================================================ */
const CATCH_CONFIG = {
  halloween: { good: "🦇", bad: "👻", gamble: "🎃", label: "🎃 CHASSE HANTÉE" },
  noel: { good: "🍭", bad: "🎄", gamble: "🧝", label: "🎄 COURSE AUX CADEAUX" }
};
let catchState = null;

function startHalloweenQueue() { openCatchChoice("halloween"); }
function startNoelQueue() { openCatchChoice("noel"); }

function openCatchChoice(theme) {
  closeCatchChoice();
  const ov = document.createElement('div');
  ov.id = 'catch-choice-overlay'; ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal-card" style="max-width:320px;text-align:center;">
    <h2 style="color:#f8b500;margin:0 0 10px 0;">${CATCH_CONFIG[theme].label}</h2>
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
  } else {
    beginCatch(theme, false, null);
  }
}

/* ---------- Réception serveur ---------- */
socket.on('start_catch', (data) => {
  hideAllScreens();
  document.getElementById('countdown-overlay').style.display = 'flex';
  let c = 3; document.getElementById('countdown-number').innerText = c;
  const t = setInterval(() => {
    c--;
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
  catchState = { theme, is1v1, opponent, score: 0, oppScore: 0, timeLeft: 30, active: true, spawnDelay: 800, speed: 2.2 };
  const cfg = CATCH_CONFIG[theme];
  const arena = document.createElement('div');
  arena.id = 'catch-arena'; arena.className = theme;
  arena.innerHTML = `
    <div id="catch-backdrop">${theme === 'noel' ? '🛖' : '🏰'}</div>
    <div id="catch-hud">
      <div>⭐ <span id="catch-score">0</span></div>
      <div id="catch-timer" style="color:#ff007f;">30</div>
      <div>${is1v1 ? '🆚 <span id="catch-opp">0</span>' : ''}</div>
    </div>
    <div style="text-align:center;font-weight:900;color:#fff;">${cfg.label}</div>
    <div id="catch-field"></div>`;
  document.body.appendChild(arena);
  if (!is1v1) {
    catchState.timerInterval = setInterval(() => { catchState.timeLeft--; updateCatchHUD(); if (catchState.timeLeft <= 0) endCatchSolo(); }, 1000);
  }
  scheduleSpawn();
}
function scheduleSpawn() {
  if (!catchState || !catchState.active) return;
  spawnCatchItem();
  const elapsed = 30 - catchState.timeLeft;
  catchState.spawnDelay = Math.max(400, 800 - elapsed * 13);
  catchState.speed = Math.max(1.2, 2.2 - elapsed * 0.03);
  catchState.spawnTimeout = setTimeout(scheduleSpawn, catchState.spawnDelay);
}
function spawnCatchItem() {
  const field = document.getElementById('catch-field'); if (!field || !catchState) return;
  const cfg = CATCH_CONFIG[catchState.theme];
  const r = Math.random();
  const type = r < 0.6 ? 'good' : (r < 0.85 ? 'bad' : 'gamble');
  const el = document.createElement('div');
  el.className = 'catch-item';
  el.innerText = cfg[type];
  el.style.left = (8 + Math.random() * 80) + '%';
  el.style.top = (5 + Math.random() * 40) + '%';
  el.style.fontSize = (30 + Math.random() * 20) + 'px';
  el.style.animationDuration = catchState.speed + 's';
  el.onclick = () => hitCatchItem(type, el);
  field.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function hitCatchItem(type, el) {
  if (!catchState || !catchState.active) return;
  let delta = 0;
  if (type === 'good') delta = 10;
  else if (type === 'bad') delta = -15;
  else { const r = Math.random(); delta = r < 0.4 ? 20 : (r < 0.7 ? 0 : -10); }
  catchState.score = Math.max(0, catchState.score + delta);
  updateCatchHUD();
  floatCatch(delta, el);
  if (delta >= 0) SoundEngine.playClick(); else SoundEngine.playError();
  el.remove();
  if (catchState.is1v1) socket.emit('catch_click', { delta });
}
function floatCatch(delta, el) {
  const f = document.createElement('div');
  f.className = 'catch-float'; f.style.color = delta >= 0 ? '#00ff88' : '#ff4b2b';
  f.innerText = (delta > 0 ? '+' : '') + delta;
  f.style.left = el.style.left; f.style.top = el.style.top;
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
  if (catchState) { clearTimeout(catchState.spawnTimeout); clearInterval(catchState.timerInterval); }
  const a = document.getElementById('catch-arena'); if (a) a.remove();
}
function endCatchSolo() {
  if (!catchState) return;
  catchState.active = false;
  stopCatchSpawning(); clearInterval(catchState.timerInterval);
  socket.emit('claim_catch_solo', { score: catchState.score });
}
socket.on('catch_solo_result', (data) => {
  const score = catchState ? catchState.score : 0;
  clearCatchArena(); catchState = null;
  hideAllScreens();
  const modal = document.getElementById('recap-modal');
  document.getElementById('recap-1v1-rows').style.display = 'none';
  document.getElementById('recap-banner').innerText = '🎯 MODE SAISONNIER TERMINÉ';
  document.getElementById('recap-banner').style.color = '#00d2ff';
  document.getElementById('recap-reason').innerText = `Score : ${score}`;
  document.getElementById('recap-my-score').innerText = score;
  document.getElementById('recap-coins-gained').innerHTML = `+${data.baseCoins}${data.rushBonus > 0 ? ` <span style="color:#ff8a00;">+${data.rushBonus}(RUSH)</span>` : ''}`;
  document.getElementById('winner-cinematic-container').innerHTML = '';
  modal.style.display = 'flex';
  SoundEngine.playVictory();
});

/* ---------- Visibilité des boutons menu ---------- */
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
