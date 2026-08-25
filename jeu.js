/* ============================================================
VARIABLES D'ÉTAT DU JEU
============================================================ */
let currentMatchCharges = {};
let currentSoloCharges = {};
let current1v1Time = 30;
let radarInterval = null;
let activeTrainingMode = "classic";
let soloTarget = 1;
let soloScore = 0;
let soloTimeLeft = 30;
let soloTimerInterval = null;
let isTimeFrozen = false;
let currentCoinsGained = 0;
let rewardDoubled = false;
let avalancheGridData = [];
let avalancheTarget = null;
let avalancheInterval = null;
let avalancheTimerInterval = null;
let avalancheTimeLeft = 30;
/* ============================================================
SYSTÈME COMBO (solo) — 15 / 30 / 35 + compteur + chrono
============================================================ */
let currentCombo = 0;
let lastComboTime = 0;
let soloPerfection = false;
let comboFXEnabled = false;
let comboTimerInterval = null;
const COMBO_WINDOW_MS = 20000;
let pendingRecapAfterPopup = false;

/* ============================================================
CATALOGUE TROPHÉES CLIENT (16 trophées)
============================================================ */
const TROPHY_CATALOG_CLIENT = {
  first_victory:    { name: "Première Victoire", emoji: "⚔️", shelf: "combat",      rarity: "bronze",    condition: "Gagner 1 match 1v1",        progress: p => `${Math.min(p.wins||0,1)}/1` },
  unstoppable:      { name: "Inarrêtable",       emoji: "🔥", shelf: "combat",      rarity: "silver",    condition: "5 victoires d'affilée",       progress: p => `${Math.min(p.win_streak||0,5)}/5` },
  gladiator:        { name: "Gladiateur",        emoji: "🛡️", shelf: "combat",      rarity: "silver",    condition: "Jouer 30 matchs 1v1",         progress: p => `${Math.min(p.matches_played||0,30)}/30` },
  champion:         { name: "Champion",          emoji: "👑", shelf: "combat",      rarity: "gold",      condition: "Gagner un tournoi (bientôt !)", progress: () => "🔒 Bientôt", dormant: true },
  awakening:        { name: "Éveil",             emoji: "⚡", shelf: "skill",       rarity: "bronze",    condition: "Combo x15",                   progress: p => `x${Math.min(p.best_combo||0,15)}/15` },
  furnace:          { name: "Fournaise",         emoji: "💥", shelf: "skill",       rarity: "silver",    condition: "Combo x30",                   progress: p => `x${Math.min(p.best_combo||0,30)}/30` },
  perfection:       { name: "PERFECTION",        emoji: "💎", shelf: "skill",       rarity: "legendary", condition: "Combo x35",                   progress: p => `x${Math.min(p.best_combo||0,35)}/35` },
  avalanche_master: { name: "Maître Avalanche",  emoji: "🎯", shelf: "skill",       rarity: "gold",      condition: "Score 400 en Avalanche",      progress: p => `${Math.min(p.best_avalanche||0,400)}/400` },
  combatant:        { name: "Combattant",        emoji: "🎖️", shelf: "progression", rarity: "bronze",    condition: "Pass Palier 15",              progress: () => "—" },
  elite:            { name: "Élite",             emoji: "🏵️", shelf: "progression", rarity: "gold",      condition: "Pass Palier 30",              progress: () => "—" },
  worker:           { name: "Travailleur",       emoji: "⛏️", shelf: "progression", rarity: "silver",    condition: "1000 🪙 gagnés en jeu",       progress: p => `${Math.min(p.total_coins_earned||0,1000)}/1000` },
  rising_star:      { name: "Étoile Montante",   emoji: "⭐", shelf: "progression", rarity: "silver",    condition: "500 points au classement",    progress: p => `${Math.min(p.points||0,500)}/500` },
  local_king:       { name: "Roi Local",         emoji: "🏰", shelf: "domination",  rarity: "gold",      condition: "N°1 régional en fin de saison", progress: () => "Fin de saison" },
  midas:            { name: "Midas",             emoji: "💰", shelf: "domination",  rarity: "gold",      condition: "N°1 pièces en fin de saison", progress: () => "Fin de saison" },
  dynasty:          { name: "Dynastie",          emoji: "🏛️", shelf: "domination",  rarity: "legendary", condition: "3 saisons N°1",               progress: p => `${p.season_n1_count||0}/3` },
  world_n1:         { name: "N°1 Mondial",       emoji: "🌍", shelf: "domination",  rarity: "legendary", condition: "N°1 global fin de saison",    progress: () => "Fin de saison" }
};
const TROPHY_SHELVES = [
  { id: "combat",      label: "⚔️ COMBAT",      color: "#ff4b2b" },
  { id: "skill",       label: "💥 SKILL",       color: "#00d2ff" },
  { id: "progression", label: "📈 PROGRESSION", color: "#00ff88" },
  { id: "domination",  label: "👑 DOMINATION",  color: "#f8b500" }
];

function closeRewardPopUp() {
  const popup = document.getElementById("reward-popup-overlay");
  if (popup) popup.style.display = "none";
  if (pendingRecapAfterPopup) {
    pendingRecapAfterPopup = false;
    document.getElementById("recap-modal").style.display = "flex";
  }
}

function getComboColor() {
  const theme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (theme === "theme_glacial") return "#7be8ff";
  if (theme === "theme_alt") return "#f8b500";
  return "#00d2ff";
}

function getEquippedThemeId() {
  return (myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme) || "";
}

function getComboEmojis() {
  const theme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (theme === "theme_glacial") return ["❄️", "🧊", "✨", "💥"];
  if (theme === "theme_alt") return ["✨", "🪙", "", "⚡"];
  return ["⚡", "", "✨", ""];
}

function shakeScreen(intensity) {
  const el = document.getElementById("screen-game") || document.body;
  const d = 12 * intensity;
  el.animate([
    { transform: "translate(0, 0)" },
    { transform: `translate(${(Math.random() - 0.5) * 2 * d}px, ${(Math.random() - 0.5) * 2 * d}px)` },
    { transform: `translate(${(Math.random() - 0.5) * 2 * d}px, ${(Math.random() - 0.5) * 2 * d}px)` },
    { transform: "translate(0, 0)" }
  ], { duration: 160 });
}

function flashScreen() {
  const color = getComboColor();
  const flash = document.createElement("div");
  flash.className = "perfection-flash";
  flash.style.background = `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${color} 55%, transparent 100%)`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

function shatterExplosion() {
  const color = getComboColor();
  for (let i = 0; i < 50; i++) {
    const s = document.createElement("div");
    s.className = "shard-particle";
    s.style.background = i % 3 === 0 ? "#ffffff" : color;
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 260;
    s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    s.style.setProperty("--rot", (Math.random() - 0.5) * 720 + "deg");
    s.style.left = "50%";
    s.style.top = "50%";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function ensureComboHUD() {
  let hud = document.getElementById("combo-hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "combo-hud";
    hud.innerHTML = `<span id="combo-count">x0</span><div id="combo-timer-bar"><div id="combo-timer-fill"></div></div>`;
    const target = document.getElementById("game-target-giant");
    const parent = target ? target.parentElement : null;
    if (parent) {
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
      parent.appendChild(hud);
    } else {
      document.body.appendChild(hud);
    }
  }
  return hud;
}

function updateComboHUD() {
  const hud = ensureComboHUD();
  hud.style.display = "flex";
  hud.style.color = getComboColor();
  document.getElementById("combo-count").innerText = "x" + currentCombo;
  startComboTimer();
}

function startComboTimer() {
  if (comboTimerInterval) clearInterval(comboTimerInterval);
  const start = Date.now();
  const fill = document.getElementById("combo-timer-fill");
  comboTimerInterval = setInterval(() => {
    const remaining = Math.max(0, 1 - (Date.now() - start) / COMBO_WINDOW_MS);
    if (fill) fill.style.width = (remaining * 100) + "%";
    if (remaining <= 0) { clearInterval(comboTimerInterval); comboTimerInterval = null; }
  }, 50);
}

function hideComboHUD() {
  if (comboTimerInterval) { clearInterval(comboTimerInterval); comboTimerInterval = null; }
  const hud = document.getElementById("combo-hud");
  if (hud) hud.style.display = "none";
}

function resetCombo() {
  clearCracks();
  hideComboHUD();
  if (soloPerfection) return;
  currentCombo = 0;
  const grid = document.getElementById("grid");
  if (grid) {
    grid.classList.remove("combo-tier1", "combo-tier2", "combo-perfection");
    grid.style.setProperty("--combo-color", getComboColor());
  }
  const banner = document.getElementById("combo-banner");
  if (banner) banner.remove();
}

function showComboBanner(text) {
  const banner = document.createElement("div");
  banner.id = "combo-banner";
  banner.style.color = getComboColor();
  banner.innerText = text;
  banner.style.animation = "comboPop 0.5s ease";
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 1500);
}

function registerComboHit() {
  if (soloPerfection) return;
  const now = Date.now();
  if (now - lastComboTime > COMBO_WINDOW_MS) {
    currentCombo = 0;
    clearCracks();
    hideComboHUD();
    const g = document.getElementById("grid");
    if (g) g.classList.remove("combo-tier1", "combo-tier2");
  }
  lastComboTime = now;
  currentCombo++;
  if (comboFXEnabled) {
    updateComboHUD();
    if (currentCombo >= 10) SoundEngine.playComboTick(currentCombo);
  }
  const grid = document.getElementById("grid");
  if (grid) grid.style.setProperty("--combo-color", getComboColor());
  if (currentCombo === 15) {
    if (grid) grid.classList.add("combo-tier1");
    showComboBanner("⚡ COMBO x15 !");
    spawnCrack();
  } else if (currentCombo === 30) {
    if (grid) { grid.classList.remove("combo-tier1"); grid.classList.add("combo-tier2"); }
    showComboBanner("🔥 COMBO x30 !!");
    for (let i = 0; i < 6; i++) setTimeout(() => spawnCrack(), i * 60);
    shakeScreen(0.5);
  } else if (currentCombo >= 35) {
    triggerPerfection();
  } else if (currentCombo > 15) {
    spawnCrack();
  }
}

function triggerPerfection() {
  if (soloPerfection) return;
  soloPerfection = true;
  if (soloTimerInterval) clearInterval(soloTimerInterval);
  if (avalancheTimerInterval) clearInterval(avalancheTimerInterval);
  if (avalancheInterval) clearInterval(avalancheInterval);
  const grid = document.getElementById("grid");
  if (grid) { grid.classList.remove("combo-tier1", "combo-tier2"); grid.classList.add("combo-perfection"); }
  showComboBanner("💥 PERFECTION x35 !!!");
  SoundEngine.playPerfectionBoom(getEquippedThemeId());
  const crackCount = 18;
  for (let i = 0; i < crackCount; i++) {
    setTimeout(() => {
      spawnCrack();
      shakeScreen(0.2 + (i / crackCount) * 0.8);
    }, i * 70);
  }
  const explosionTime = crackCount * 70 + 350;
  setTimeout(() => {
    flashScreen();
    shatterExplosion();
    spawnExplosionParticles();
    shakeScreen(1.5);
    clearCracks();
    SoundEngine.playVictory();
  }, explosionTime);
  setTimeout(() => { SoundEngine.stopBoom(); }, explosionTime + 1200);
  setTimeout(() => { endSoloGame(); }, explosionTime + 1000);
}

function spawnExplosionParticles() {
  const theme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  let emojis = ["⚡", "💥", "✨", "🔥"];
  if (theme === "theme_glacial") emojis = ["❄️", "🧊", "✨", "💥"];
  if (theme === "theme_alt") emojis = ["✨", "🪙", "💰", "⚡"];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div");
    p.className = "explosion-particle";
    p.innerText = emojis[i % emojis.length];
    const angle = (Math.PI * 2 * i) / 40;
    const dist = 80 + Math.random() * 180;
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

function getComboCrackStyle() {
  const theme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (theme === "theme_glacial") return { color: "#7be8ff", width: 2, jag: 30 };
  if (theme === "theme_alt") return { color: "#f8b500", width: 3, jag: 18 };
  return { color: "#00d2ff", width: 2, jag: 38 };
}

function ensureCracksLayer() {
  let layer = document.getElementById("combo-cracks-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "combo-cracks-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function ensureCoinsLayer() {
  let layer = document.getElementById("combo-coins-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "combo-coins-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function spawnCoin() {
  const layer = ensureCoinsLayer();
  if (layer.childElementCount > 180) layer.removeChild(layer.firstChild);
  const coin = document.createElement("div");
  coin.className = "combo-coin";
  coin.innerText = "🪙";
  coin.style.left = Math.random() * 100 + "%";
  coin.style.top = Math.random() * 100 + "%";
  coin.style.fontSize = (28 + Math.random() * 24) + "px";
  coin.style.animationDuration = (0.8 + Math.random() * 1) + "s";
  layer.appendChild(coin);
}

function coinStorm() {
  const layer = ensureCoinsLayer();
  for (let i = 0; i < 150; i++) {
    setTimeout(() => {
      if (layer.childElementCount > 220) layer.removeChild(layer.firstChild);
      const coin = document.createElement("div");
      coin.className = "combo-coin";
      coin.innerText = Math.random() > 0.6 ? "💰" : "🪙";
      coin.style.left = Math.random() * 100 + "%";
      coin.style.top = Math.random() * 100 + "%";
      coin.style.fontSize = (32 + Math.random() * 32) + "px";
      coin.style.animationDuration = (0.9 + Math.random() * 1.4) + "s";
      layer.appendChild(coin);
    }, i * 18);
  }
}

function spawnCrack() {
  const themeNow = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (themeNow === "theme_alt") {
    for (let i = 0; i < 8; i++) setTimeout(() => spawnCoin(), i * 60);
    SoundEngine.playCrack(themeNow);
    return;
  }
  const layer = ensureCracksLayer();
  if (layer.childElementCount > 20) layer.removeChild(layer.firstChild);
  const style = getComboCrackStyle();
  const w = window.innerWidth, h = window.innerHeight;
  const side = Math.floor(Math.random() * 4);
  let sx, sy;
  if (side === 0) { sx = Math.random() * w; sy = 0; }
  else if (side === 1) { sx = w; sy = Math.random() * h; }
  else if (side === 2) { sx = Math.random() * w; sy = h; }
  else { sx = 0; sy = Math.random() * h; }
  const tx = w * (0.3 + Math.random() * 0.4);
  const ty = h * (0.3 + Math.random() * 0.4);
  const steps = 8 + Math.floor(Math.random() * 6);
  let points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jag = style.jag * (1 - t * 0.3);
    const x = sx + (tx - sx) * t + (Math.random() - 0.5) * jag;
    const y = sy + (ty - sy) * t + (Math.random() - 0.5) * jag;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "combo-crack");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.style.color = style.color;
  const mainCrack = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  mainCrack.setAttribute("class", "crack-main");
  mainCrack.setAttribute("points", pointsStr);
  mainCrack.setAttribute("fill", "none");
  mainCrack.setAttribute("stroke", style.color);
  mainCrack.setAttribute("stroke-width", style.width);
  mainCrack.setAttribute("stroke-linecap", "round");
  mainCrack.setAttribute("stroke-linejoin", "round");
  svg.appendChild(mainCrack);
  const innerCrack = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerCrack.setAttribute("class", "crack-inner");
  innerCrack.setAttribute("points", pointsStr);
  innerCrack.setAttribute("fill", "none");
  innerCrack.setAttribute("stroke", "#ffffff");
  innerCrack.setAttribute("stroke-width", style.width * 0.4);
  innerCrack.setAttribute("stroke-linecap", "round");
  innerCrack.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerCrack);
  const branchCount = 2 + Math.floor(Math.random() * 3);
  for (let b = 0; b < branchCount; b++) {
    const branchStart = Math.floor(Math.random() * (points.length - 1));
    const startPoint = points[branchStart];
    const branchAngle = Math.random() * Math.PI * 2;
    const branchLength = 40 + Math.random() * 80;
    const branchSteps = 3 + Math.floor(Math.random() * 3);
    let branchPoints = [{ x: startPoint.x, y: startPoint.y }];
    for (let i = 1; i <= branchSteps; i++) {
      const t = i / branchSteps;
      const x = startPoint.x + Math.cos(branchAngle) * branchLength * t + (Math.random() - 0.5) * 20;
      const y = startPoint.y + Math.sin(branchAngle) * branchLength * t + (Math.random() - 0.5) * 20;
      branchPoints.push({ x: Math.round(x), y: Math.round(y) });
    }
    const branchPointsStr = branchPoints.map(p => `${p.x},${p.y}`).join(' ');
    const branch = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    branch.setAttribute("class", "crack-branch");
    branch.setAttribute("points", branchPointsStr);
    branch.setAttribute("fill", "none");
    branch.setAttribute("stroke", style.color);
    branch.setAttribute("stroke-width", style.width * 0.6);
    branch.setAttribute("stroke-linecap", "round");
    branch.setAttribute("stroke-linejoin", "round");
    svg.appendChild(branch);
  }
  layer.appendChild(svg);
  const theme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  SoundEngine.playCrack(theme || "");
}

function clearCracks() {
  const layer = document.getElementById("combo-cracks-layer");
  if (layer) layer.innerHTML = "";
  const coins = document.getElementById("combo-coins-layer");
  if (coins) coins.innerHTML = "";
}

/* ============================================================
NAVIGATION / ÉCRANS
============================================================ */
function hideAllScreens() {
  setMenuFX(false);
  hideGameModeBadge();  // ← CETTE LIGNE MANQUAIT
  resetCombo();
  ["screen-title","screen-menu","screen-solo-menu","screen-avalanche-menu","screen-1v1-hub","screen-1v1-lobby","screen-rooms","screen-join-custom","screen-room-waiting","screen-tournament","screen-game","recap-modal","modal-leaderboard","modal-shop","modal-blitz-pass","countdown-overlay","modal-create-room","modal-launch-ad","simulated-ad-overlay","modal-ranked-loadout","modal-jackpot-wheel","modal-friends","admin-modal"].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
  const rewardPopup = document.getElementById("reward-popup-overlay");
  if (rewardPopup) rewardPopup.style.display = "none";
  if (radarInterval) clearInterval(radarInterval);
  if (soloTimerInterval) clearInterval(soloTimerInterval);
  if (avalancheInterval) clearInterval(avalancheInterval);
  if (avalancheTimerInterval) clearInterval(avalancheTimerInterval);
  isTimeFrozen = false;
}
function setGameModeBadge(text, color) {
let badge = document.getElementById("game-mode-badge");
if (!badge) {
badge = document.createElement("div");
badge.id = "game-mode-badge";
badge.style.cssText = "position:fixed; top:8px; right:8px; z-index:50; background:rgba(15,5,29,0.9); border:1px solid " + color + "; color:" + color + "; font-size:10px; font-weight:900; letter-spacing:1px; padding:4px 10px; border-radius:20px; pointer-events:none;";
document.body.appendChild(badge);
}
badge.innerText = text;
badge.style.borderColor = color;
badge.style.color = color;
badge.style.boxShadow = "0 0 10px " + color + "66";
badge.style.display = "block";
}
function hideGameModeBadge() {
const badge = document.getElementById("game-mode-badge");
if (badge) badge.style.display = "none";
}
function initMenuBackgroundFX() {
  if (document.getElementById('bg-fx')) return;
  const fx = document.createElement('div'); fx.id = 'bg-fx';
  const glow = document.createElement('div'); glow.id = 'bg-glow'; fx.appendChild(glow);
  const shapes = ['◆','▲','■','●'];
  const colors = ['#00d2ff','#ff007f','#ffe600','#00ff88'];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div'); s.className = 'bg-shape'; s.innerText = shapes[i % shapes.length];
    s.style.fontSize = (14 + Math.random() * 26) + 'px'; s.style.left = Math.random() * 100 + '%'; s.style.color = colors[i % colors.length];
    s.style.animationDuration = (14 + Math.random() * 16) + 's'; s.style.animationDelay = (-Math.random() * 25) + 's';
    fx.appendChild(s);
  }
  document.body.appendChild(fx);
}

function setMenuFX(visible) { const fx = document.getElementById('bg-fx'); if (fx) fx.style.opacity = visible ? '1' : '0'; }

if (activeTrainingMode === "random") setGameModeBadge("🎲 SOLO ALÉATOIRE", "#00ff88");
else setGameModeBadge("🏋️ SOLO CLASSIQUE", "#00d2ff");
function showTitleScreen() {
  hideAllScreens();
  window.history.replaceState({}, "", window.location.pathname);
  document.getElementById("screen-title").style.display = "block";
  SoundEngine.startMusic("menu");
  setMenuFX(true);
}

function showMainMenu() {
  leaveRoomIfInRoom();
  hideAllScreens();
  window.history.replaceState({}, "", window.location.pathname);
  const menuEl = document.getElementById("screen-menu");
  if (menuEl) { menuEl.style.display = "flex"; setMenuFX(true); }
  SoundEngine.startMusic("menu");
}

function leaveRoomIfInRoom() {
  const codeEl = document.getElementById("current-room-code");
  if (codeEl && codeEl.innerText && codeEl.innerText !== "----") { if (socket.connected) socket.emit("leave_room"); codeEl.innerText = "----"; }
}

function openLaunchAdModal() { SoundEngine.init(); document.getElementById("modal-launch-ad").style.display = "flex"; }
function playLaunchAd() { document.getElementById("modal-launch-ad").style.display = "none"; simulateAd(() => { showMainMenu(); }); }

function simulateAd(callback) {
  SoundEngine.stopMusic(false);
  document.getElementById("recap-modal").style.display = "none";
  const overlay = document.getElementById("simulated-ad-overlay");
  const timerEl = document.getElementById("ad-timer");
  const closeBtn = document.getElementById("ad-close-btn");
  overlay.style.display = "flex"; closeBtn.style.display = "none";
  let timeLeft = 5; timerEl.innerText = timeLeft;
  const interval = setInterval(() => { timeLeft--; timerEl.innerText = timeLeft; if (timeLeft <= 0) { clearInterval(interval); timerEl.innerText = "✓"; closeBtn.style.display = "block"; adCallbackFunction = callback; } }, 1000);
}

function closeSimulatedAd() { document.getElementById("simulated-ad-overlay").style.display = "none"; SoundEngine.startMusic("menu"); if (adCallbackFunction) { adCallbackFunction(); adCallbackFunction = null; } }

function watchAdToDoubleReward() {
  if (rewardDoubled) return;
  simulateAd(() => {
    rewardDoubled = true;
    socket.emit("double_reward");
    currentCoinsGained *= 2;
    document.getElementById("recap-coins-gained").innerText = `+${currentCoinsGained} (x2 ⚡)`;
    const doubleBtn = document.getElementById("btn-double-reward");
    doubleBtn.disabled = true; doubleBtn.style.opacity = "0.5"; doubleBtn.innerText = "✅ Gains doublés !";
    document.getElementById("recap-modal").style.display = "flex";
  });
}

function openSoloMenu() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById("screen-solo-menu").style.display = "flex"; SoundEngine.startMusic("menu"); }
function openAvalancheDifficulties() { hideAllScreens(); document.getElementById("screen-avalanche-menu").style.display = "flex"; SoundEngine.startMusic("menu"); }
function open1v1Hub() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById("screen-1v1-hub").style.display = "flex"; SoundEngine.startMusic("menu"); }

function sanitizeEquippedPower() {
  if (!myProfile.inventory) myProfile.inventory = {};
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) <= 0) myProfile.equippedPower = null;
  if (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) myProfile.equippedPowers = myProfile.equippedPowers.filter(p => (myProfile.inventory[p] || 0) > 0);
}

function getOptionalLoadout() { sanitizeEquippedPower(); const p = myProfile.equippedPower; if (p && (myProfile.inventory[p] || 0) > 0) return [p]; return []; }

function startTugOfWarQueue() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-1v1-lobby").style.display = "flex";
  let digit = 1;
  radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById("radar-digit").innerText = digit; }, 70);
  socket.emit("find_tug_of_war_match", getOptionalLoadout());
}

function startRandom1v1() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-1v1-lobby").style.display = "flex";
  let digit = 1;
  radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById("radar-digit").innerText = digit; }, 70);
  socket.emit("find_1v1_match", getOptionalLoadout());
}

function openRankedLoadoutModal() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } selectedRankedItems = []; document.getElementById("modal-ranked-loadout").style.display = "flex"; renderRankedLoadoutItems(); }
function closeRankedLoadoutModal() { document.getElementById("modal-ranked-loadout").style.display = "none"; }

function renderRankedLoadoutItems() {
  const container = document.getElementById("ranked-items-container");
  if (!container) return;
  container.innerHTML = "";
  const powersDict = i18n[currentLang].powers;
  const ownedPowers = POWERS_CATALOG.filter(p => p.type !== "cosmetics" && (myProfile.inventory[p.id] || 0) > 0);
  if (ownedPowers.length === 0) { container.innerHTML = `<div style="grid-column: span 2; text-align:center; color:#aaa; padding:12px; font-size:11px;">Inventaire vide !</div>`; return; }
  const summary = document.createElement("div");
  summary.style.cssText = `grid-column: span 2; background: rgba(0,210,255,0.08); border: 1px solid #00d2ff; border-radius: 10px; padding: 8px; font-size: 11px; color: #fff; margin-bottom: 6px;`;
  summary.innerHTML = `<b>Objets sélectionnés : ${selectedRankedItems.length}/2</b><br>${selectedRankedItems.length === 2 ? "✅ Prêt à lancer" : "⚠️ Tu dois sélectionner exactement 2 objets"}`;
  container.appendChild(summary);
  ownedPowers.forEach(p => {
    const powerInfo = powersDict[p.id];
    const qty = myProfile.inventory[p.id] || 0;
    const selectedCount = selectedRankedItems.filter(i => i === p.id).length;
    const card = document.createElement("div");
    card.className = `power-card ${selectedCount > 0 ? "equipped" : ""}`;
    card.innerHTML = `
      <h4>${powerInfo.name}</h4><p>${powerInfo.desc}</p>
      <div class="stock-badge">Stock : ${qty}</div>
      <div style="font-weight:bold; font-size:10px; color:${selectedCount > 0 ? "#00ff88" : "#f8b500"};">Sélectionné : ${selectedCount}</div>
      <div style="display:flex; gap:4px; margin-top:6px;">
        <button class="power-btn buy" onclick="addRankedItem('${p.id}')" ${(selectedRankedItems.length >= 2 || selectedCount >= qty) ? "disabled" : ""}>+ Ajouter</button>
        <button class="power-btn" onclick="removeRankedItem('${p.id}')" ${selectedCount === 0 ? "disabled" : ""}>- Retirer</button>
      </div>`;
    container.appendChild(card);
  });
}

function addRankedItem(id) {
  if (selectedRankedItems.length >= 2) return;
  const owned = myProfile.inventory[id] || 0;
  const sel = selectedRankedItems.filter(i => i === id).length;
  if (sel >= owned) { alert("Tu ne possèdes pas assez d'exemplaires de cet objet."); return; }
  selectedRankedItems.push(id);
  renderRankedLoadoutItems();
}

function removeRankedItem(id) { const i = selectedRankedItems.lastIndexOf(id); if (i !== -1) selectedRankedItems.splice(i, 1); renderRankedLoadoutItems(); }

function startRankedMatch() {
  if (selectedRankedItems.length !== 2) { alert("En mode classé, tu dois sélectionner exactement 2 objets."); return; }
  closeRankedLoadoutModal();
  hideAllScreens();
  document.getElementById("screen-1v1-lobby").style.display = "flex";
  let digit = 1;
  radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById("radar-digit").innerText = digit; }, 70);
  myProfile.equippedPowers = selectedRankedItems.slice();
  socket.emit("find_ranked_match", { items: selectedRankedItems.slice() });
}

function cancel1v1Search() { showMainMenu(); }

function requestRematch() {
  socket.emit("request_rematch");
  document.getElementById("recap-modal").style.display = "none";
  const roomCodeText = document.getElementById("current-room-code").innerText;
  if (roomCodeText && roomCodeText !== "----") { document.getElementById("screen-room-waiting").style.display = "block"; }
  else {
    document.getElementById("screen-1v1-lobby").style.display = "flex";
    let digit = 1;
    if (radarInterval) clearInterval(radarInterval);
    radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById("radar-digit").innerText = digit; }, 70);
  }
}
socket.on("opponent_wants_rematch", () => { showNotificationToast("⚔️ L'adversaire souhaite une revanche !", "gift"); });

/* ============================================================
POUVOIRS / HUD
============================================================ */
function preparePowerHUD() {
  const zone = document.getElementById('power-zone');
  zone.innerHTML = '';
  const isSolo = document.getElementById('hud-solo').style.display !== 'none';
  const charges = isSolo ? currentSoloCharges : currentMatchCharges;
  let usableCount = 0;
  for (const powerId in charges) {
    const remaining = charges[powerId] || 0;
    if (remaining > 0) {
      usableCount++;
      const powerInfo = i18n[currentLang].powers[powerId];
      const btn = document.createElement('button');
      btn.className = 'btn-power-hud';
      btn.innerHTML = `⚡ ${powerInfo ? powerInfo.name : powerId} (${remaining})`;
      btn.onclick = () => triggerSpecificPower(powerId, btn);
      zone.appendChild(btn);
    }
  }
  zone.style.display = usableCount > 0 ? 'block' : 'none';
}

function triggerSpecificPower(powerId, btnEl) {
  const isSolo = document.getElementById('hud-solo').style.display !== 'none';
  const charges = isSolo ? currentSoloCharges : currentMatchCharges;
  if ((charges[powerId] || 0) <= 0 || btnEl.disabled) return;
  charges[powerId]--;
  btnEl.disabled = true; btnEl.style.opacity = '0.5';
  socket.emit('use_power', powerId);
  const MALUS = ['quake','micro','eclipse','chaos'];
  if (MALUS.includes(powerId) && !isSolo) socket.emit('send_malus', { type: powerId });
  const currentTarget = parseInt(document.getElementById('game-target-giant').innerText) || 1;
  if (powerId === 'spotlight') {
    document.querySelectorAll('.tile').forEach(t => { if (parseInt(t.innerText) === currentTarget) { t.classList.add('highlight-target'); setTimeout(() => t.classList.remove('highlight-target'), 2000); } });
  } else if (powerId === 'joker') autoValidateTarget();
  else if (powerId === 'freeze') {
    isTimeFrozen = true;
    const timerEl = document.getElementById('game-timer');
    timerEl.classList.add('frozen');
    setTimeout(() => { isTimeFrozen = false; timerEl.classList.remove('frozen'); }, 3000);
  } else if (powerId === 'nova') {
    autoValidateTarget();
    setTimeout(() => autoValidateTarget(), 250);
    setTimeout(() => autoValidateTarget(), 500);
  }
  setTimeout(() => preparePowerHUD(), 100);
}

socket.on("power_used_success", () => { if (document.getElementById("screen-game").style.display === "block") preparePowerHUD(); });
socket.on("power_use_denied", () => { if (document.getElementById("screen-game").style.display === "block") preparePowerHUD(); });

function autoValidateTarget() {
  const is1v1 = document.getElementById("hud-1v1").style.display !== "none";
  if (is1v1) {
    const targetVal = parseInt(document.getElementById("game-target-giant").innerText) || 1;
    document.querySelectorAll("#grid .tile").forEach((t, idx) => { if (parseInt(t.innerText) === targetVal) handle1v1TileClick(targetVal, idx); });
  } else handleSoloTileClick(soloTarget);
}

socket.on("receive_malus", (data) => {
  const grid = document.getElementById("grid");
  SoundEngine.playError();
  showNotificationToast("💥 PIÈGE ADVERSAIRE REÇU !", "announcement");
  if (!grid) return;
  if (data.type === "quake") { grid.classList.add("effect-quake"); setTimeout(() => grid.classList.remove("effect-quake"), 2000); }
  else if (data.type === "micro") { grid.classList.add("effect-micro"); setTimeout(() => grid.classList.remove("effect-micro"), 2000); }
  else if (data.type === "eclipse") { grid.classList.add("effect-eclipse"); setTimeout(() => grid.classList.remove("effect-eclipse"), 1500); }
  else if (data.type === "chaos") {
    grid.classList.add("effect-quake");
    setTimeout(() => { grid.classList.remove("effect-quake"); grid.classList.add("effect-micro"); }, 1500);
    setTimeout(() => { grid.classList.remove("effect-micro"); grid.classList.add("effect-eclipse"); }, 3000);
    setTimeout(() => { grid.classList.remove("effect-eclipse"); }, 4500);
  }
});

/* ============================================================
CLASSEMENT
============================================================ */
let currentLbCategory = "points";
let currentLbScope = "regional";

function openLeaderboard() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } updateLbRegionLabel(); document.getElementById("modal-leaderboard").style.display = "flex"; updateCombinedExplanationVisibility(); fetchLeaderboard(); }
function closeLeaderboard() { document.getElementById("modal-leaderboard").style.display = "none"; }

function setLbCategory(cat) {
  currentLbCategory = cat;
  ["points", "trophies", "coins", "combined"].forEach(c => { const btn = document.getElementById(`lb-cat-${c}`); if (btn) btn.classList.toggle("active", c === cat); });
  updateCombinedExplanationVisibility();
  fetchLeaderboard();
}

function updateCombinedExplanationVisibility() { const el = document.getElementById("lb-combined-explanation"); if (el) el.style.display = (currentLbCategory === "combined") ? "block" : "none"; }

function setLbScope(scope) {
  currentLbScope = scope;
  ["regional", "national", "global"].forEach(s => { const btn = document.getElementById(`lb-scope-${s}`); if (btn) btn.classList.toggle("active", s === scope); });
  fetchLeaderboard();
}

function updateLbRegionLabel() {
const btn = document.getElementById("lb-scope-regional");
if (btn && myProfile && myProfile.region) btn.innerText = "Régional (" + myProfile.region + ")";
}
socket.on("player_registered", () => { updateLbRegionLabel(); });

function fetchLeaderboard() {
  const type = `${currentLbCategory}_${currentLbScope}`;
  document.getElementById("lb-list").innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;" data-i18n="loading">Chargement...</div>`;
  socket.emit("get_leaderboard", type);
}

socket.on("leaderboard_data", (res) => {
const container = document.getElementById("lb-list");
container.innerHTML = "";
if (!res.data || res.data.length === 0) { container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucun joueur.</div>`; return; }
const category = res.type ? res.type.split("_")[0] : "points";
const parsedList = res.data.map(p => parsePlayer(p));
if (category === "combined") parsedList.sort((a, b) => { if ((b.trophies - a.trophies) !== 0) return b.trophies - a.trophies; return b.points - a.points; });
parsedList.forEach((p, index) => {
const row = document.createElement("div");
row.className = "lb-row";
const badgeHtml = getAvatarBadgeHTML(p.flag, p.avatar, null, p);
const equippedTitle = p.inventory && p.inventory.__equipped && p.inventory.__equipped.title;
const titleHtml = equippedTitle ? `<span style="font-size:8px; color:#f8b500; font-weight:bold; margin-left:4px;">[${TITLE_DISPLAY_NAMES[equippedTitle] || equippedTitle}]</span>` : "";
let rightBadge = `<span class="lb-pts" style="color:#00ff88;">${p.points} pts</span>`;
if (category === "coins") rightBadge = `<span class="lb-pts" style="color:#f8b500;">${p.coins} 🪙</span>`;
else if (category === "trophies") rightBadge = `<span class="lb-pts" style="color:#fceabb;">${p.trophies} 🏆</span>`;
else if (category === "combined") rightBadge = `<span class="lb-pts" style="color:#00d2ff; font-size:11px;">🏆${p.trophies} | ${p.points}pts</span>`;
let rankDisplay = `#${index + 1}`, rankColor = "#00d2ff";
if (index === 0) { rankDisplay = "🥇"; rankColor = "#f8b500"; }
else if (index === 1) { rankDisplay = "🥈"; rankColor = "#e0e0e0"; }
else if (index === 2) { rankDisplay = "🥉"; rankColor = "#cd7f32"; }
const safeName = String(p.username || "").replace(/'/g, "\\'");
row.innerHTML = `<span class="lb-rank" style="color:${rankColor};">${rankDisplay}</span>
<div class="lb-user-info"><div class="lb-name-row">${badgeHtml}<span class="lb-clickable-name" onclick="openPlayerActions('${safeName}', event)">${p.username}</span>${titleHtml}</div>
<div class="lb-sub-details"><span>🏆 ${p.trophies}</span><span>🪙 ${p.coins}</span><span>⚔️ V:${p.wins}/D:${p.losses}</span></div></div>${rightBadge}`;
container.appendChild(row);
});
});

function openPlayerActions(username, e) {
closePlayerActions();
const safeName = String(username).replace(/'/g, "\\'");
const menu = document.createElement('div');
menu.id = 'player-actions-menu';
menu.style.cssText = 'position:fixed; z-index:10001; background:#0f051d; border:1px solid #00d2ff; border-radius:10px; padding:10px; box-shadow:0 0 20px rgba(0,210,255,0.5); min-width:170px;';
menu.style.left = Math.min(e.clientX, window.innerWidth - 190) + 'px';
menu.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
const isMe = myProfile.username && myProfile.username.toLowerCase() === username.toLowerCase();
menu.innerHTML = `
<div style="font-size:12px; font-weight:900; color:#f8b500; margin-bottom:6px;">${username}</div>
${!isMe ? `<button class="btn-main" style="width:100%; margin:2px 0; padding:8px; font-size:11px;" onclick="requestFriendFromMenu('${safeName}')">🤝 Demande d'ami</button>` : ''}
<button class="btn-main" style="width:100%; margin:2px 0; padding:8px; font-size:11px;" onclick="openTrophyRoom('${safeName}'); closePlayerActions();">🏛️ Salle des trophées</button>
`;
document.body.appendChild(menu);
setTimeout(() => document.addEventListener('click', closePlayerActions, { once: true }), 0);
}
function requestFriendFromMenu(username) {
socket.emit('send_friend_request', username);
closePlayerActions();
}
function closePlayerActions() {
const m = document.getElementById('player-actions-menu');
if (m) m.remove();
}
/* ============================================================
1V1 / ADVERSAIRE / RÉCAP
============================================================ */
function extractOpponentInfo(data) {
  if (!data) return cachedOpponent;
  let rawOpp = data.opponent || data.player2 || data.opp;
  if (!rawOpp && data.players) {
    if (Array.isArray(data.players)) rawOpp = data.players.find(p => (p.socketId || p.id) !== socket.id);
    else if (typeof data.players === "object") { const oppId = Object.keys(data.players).find(id => id !== socket.id); if (oppId) rawOpp = data.players[oppId]; }
  }
  return rawOpp ? parsePlayer(rawOpp) : cachedOpponent;
}

function updateOpponentDisplay(opp) {
  if (!opp) return;
  cachedOpponent = parsePlayer(opp);
  document.getElementById("opp-profile-name").innerText = cachedOpponent.username;
  document.getElementById("opp-profile-badge").innerHTML = getAvatarBadgeHTML(cachedOpponent.flag, cachedOpponent.avatar);
  const oppTitle = cachedOpponent.inventory && cachedOpponent.inventory.__equipped && cachedOpponent.inventory.__equipped.title;
  const el = document.getElementById("opp-profile-title");
  if (el) el.innerText = oppTitle ? `[ ${TITLE_DISPLAY_NAMES[oppTitle] || oppTitle} ]` : "";
}

socket.on("start_countdown", (data) => {
  if (radarInterval) clearInterval(radarInterval);
  latest1v1StartData = data;
  currentMatchCharges = {};
  resetCombo();
  comboFXEnabled = false;
  let loadout = (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) ? myProfile.equippedPowers : (myProfile.equippedPower ? [myProfile.equippedPower] : []);
loadout.forEach(id => { const stock = myProfile.inventory[id] || 0; if (stock > 0) currentMatchCharges[id] = Math.min((currentMatchCharges[id] || 0) + 1, stock); });
let oppData = extractOpponentInfo(data);
if (oppData) updateOpponentDisplay(oppData);
hideAllScreens();
if (data.isRanked) setGameModeBadge("⚔️ CLASSÉ", "#f8b500");
else if (data.isTugOfWar) setGameModeBadge("🪢 CORDE RAIDE", "#ff4b2b");
else setGameModeBadge("⚔️ 1v1 AMICAL", "#00ff88");
  document.getElementById("countdown-overlay").style.display = "flex";
  let count = 3;
  document.getElementById("countdown-number").innerText = count;
  const timer = setInterval(() => {
    count--;
    if (count > 0) document.getElementById("countdown-number").innerText = count;
    else {
      clearInterval(timer);
      document.getElementById("countdown-overlay").style.display = "none";
      document.getElementById("screen-game").style.display = "block";
      document.getElementById("hud-1v1").style.display = "grid";
      document.getElementById("hud-solo").style.display = "none";
      const towHud = document.getElementById("hud-tow");
      if (data.isTugOfWar) { towHud.style.display = "block"; updateTugOfWarGauge(0); } else towHud.style.display = "none";
      if (latest1v1StartData) { document.getElementById("game-target-giant").innerText = latest1v1StartData.myTarget || 1; renderGrid(latest1v1StartData.myPool, handle1v1TileClick); }
      preparePowerHUD();
      current1v1Time = latest1v1StartData ? latest1v1StartData.timeLeft : 30;
      isTimeFrozen = false;
      SoundEngine.startMusic("1v1");
    }
  }, 1000);
});

socket.on("timer_update", (time) => { if (!isTimeFrozen) { current1v1Time = time; document.getElementById("game-timer").innerText = Math.max(0, time); } });
socket.on("tug_of_war_update", (data) => { updateTugOfWarGauge(data.ropePosition); });
function updateTugOfWarGauge(pos) { const ind = document.getElementById("tow-indicator"); if (!ind) return; let percent = 50 + (pos / 6) * 45; ind.style.left = `${Math.max(5, Math.min(95, percent))}%`; }

socket.on("my_grid_updated", (data) => {
  document.getElementById("game-target-giant").innerText = data.target;
  renderGrid(data.newPool, handle1v1TileClick);
  if (data.success) { SoundEngine.playClick(); registerComboHit(); }
  else { SoundEngine.playError(); resetCombo(); }
});

socket.on("opponent_progress", (data) => { document.getElementById("opp-target").innerText = data.target; let o = extractOpponentInfo(data); if (o) updateOpponentDisplay(o); });

socket.on("trigger_jackpot_wheel", () => {
  document.getElementById("recap-modal").style.display = "none";
  const wheelModal = document.getElementById("modal-jackpot-wheel");
  const spinBtn = document.getElementById("btn-spin-wheel");
  const wheelEl = document.getElementById("wheel-element");
  wheelEl.style.transition = "none"; wheelEl.style.transform = "rotate(0deg)";
  spinBtn.disabled = false; spinBtn.style.opacity = "1";
  document.getElementById("wheel-result-text").innerText = "";
  wheelModal.style.display = "flex";
});

function spinJackpotWheel() { const b = document.getElementById("btn-spin-wheel"); b.disabled = true; b.style.opacity = "0.5"; document.getElementById("wheel-result-text").innerText = ""; socket.emit("spin_jackpot_wheel"); }

socket.on("jackpot_wheel_result", (data) => {
  const wheelEl = document.getElementById("wheel-element");
  const resultText = document.getElementById("wheel-result-text");
  const randomSpin = 1440 + Math.floor(Math.random() * 360);
  wheelEl.style.transition = "transform 3.5s cubic-bezier(0.15,0.75,0.1,1)";
  wheelEl.style.transform = `rotate(${data.targetAngle || randomSpin}deg)`;
  setTimeout(() => {
    if (data.outcome === "jackpot") { resultText.innerHTML = `🎉 <span style="color:#f8b500;">JACKPOT ! +${data.coinDelta} Pièces 🪙</span>`; SoundEngine.playVictory(); }
    else if (data.outcome === "objet") { resultText.innerHTML = `🎁 <span style="color:#00c6ff;">OBJET GAGNÉ ! ⚡</span>`; SoundEngine.playVictory(); }
    else if (data.outcome === "banqueroute") { resultText.innerHTML = `💀 <span style="color:#ff4b2b;">PERDU ! ${data.coinDelta} Pièces 🪙</span>`; SoundEngine.playError(); }
    else resultText.innerHTML = `❌ <span style="color:#38ef7d;">RIEN ! Retente ta chance.</span>`;
    setTimeout(() => { document.getElementById("modal-jackpot-wheel").style.display = "none"; if (pendingGameOverData) { showGameOverRecap(pendingGameOverData); pendingGameOverData = null; } }, 2200);
  }, 3600);
});

socket.on("game_over_1v1", (data) => {
  const wheelModal = document.getElementById("modal-jackpot-wheel");
  if (wheelModal && wheelModal.style.display === "flex") { pendingGameOverData = data; return; }
  showGameOverRecap(data);
});

function getWinnerAvatarShowcaseHTML(playerObj) {
  if (!playerObj) return "";
  const equippedAvatar = playerObj.inventory && playerObj.inventory.__equipped && playerObj.inventory.__equipped.avatar;
  const equippedFrame = playerObj.inventory && playerObj.inventory.__equipped && playerObj.inventory.__equipped.frame;
  let iconContent = playerObj.avatar || 1;
  if (equippedAvatar === "avatar_lottie_palier30") iconContent = `<div class="lottie-avatar-large" data-lottie-url="black-rainbow-cat.json" style="width:75px; height:75px;"></div>`;
  else if (equippedAvatar === "avatar_lottie_palier15") iconContent = `<div class="lottie-avatar-large" data-lottie-url="cat-assistant.json" style="width:75px; height:75px;"></div>`;
  const frameClass = getFrameClass(equippedFrame);
  setTimeout(() => initAllLottieBadges(), 50);
  return `<div class="victory-avatar-showcase"><div class="victory-badge-large ${frameClass}" style="display:flex; align-items:center; justify-content:center;"><span style="font-weight:900; color:#fff;">${iconContent}</span><span style="position:absolute; bottom:-2px; right:-2px; font-size:14px; background:#0f051d; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; border:2px solid #fff; z-index:3;">${playerObj.flag || "🇫🇷"}</span></div><div style="font-size:13px; font-weight:900; color:#f8b500; margin-top:4px;">${playerObj.username || "Joueur"} TRIOMPHE !</div></div>`;
}

function showGameOverRecap(data) {
  hideAllScreens();
  window.history.replaceState({}, "", window.location.pathname);
  const modal = document.getElementById("recap-modal");
  const modalCard = modal.querySelector(".modal-card");
  const banner = document.getElementById("recap-banner");
  document.getElementById("recap-1v1-rows").style.display = "block";
  const myId = socket.id;
  const myData = data.players[myId];
  const oppId = Object.keys(data.players).find(id => id !== myId);
  const oppData = oppId ? data.players[oppId] : { target: "-", score: 0 };
  rewardDoubled = false;
  const doubleBtn = document.getElementById("btn-double-reward");
  doubleBtn.disabled = false; doubleBtn.style.opacity = "1"; doubleBtn.innerText = "📺 Doubler mes gains (Pub)";
  const rematchBtn = document.getElementById("btn-rematch");
  if (rematchBtn) {
  if (data.isRanked) { rematchBtn.style.display = "none"; }
  else { rematchBtn.style.display = "block"; rematchBtn.disabled = false; rematchBtn.style.opacity = "1"; rematchBtn.innerText = "Revanche ⚔️"; }
}
  const myReward = data.rewards && data.rewards[myId] ? data.rewards[myId] : { baseCoins: 30, rushBonus: 0, totalCoins: 30 };
  currentCoinsGained = myReward.totalCoins;
  const winnerId = data.winnerId;
  const isWinner = (winnerId === myId);
  const cinematic = document.getElementById("winner-cinematic-container");
  if (modalCard) { modalCard.classList.remove("defeat-theme"); if (!isWinner && winnerId) modalCard.classList.add("defeat-theme"); }
  let winnerObj = null;
  if (winnerId) {
    if (winnerId === myId) winnerObj = { username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag, inventory: myProfile.inventory, unlocked_items: myProfile.unlocked_items };
    else if (cachedOpponent && (winnerId === cachedOpponent.id || winnerId === cachedOpponent.socketId)) winnerObj = cachedOpponent;
    else if (data.players[winnerId]) winnerObj = parsePlayer(data.players[winnerId]);
  }
  if (winnerObj) cinematic.innerHTML = getWinnerAvatarShowcaseHTML(winnerObj);
  else cinematic.innerHTML = `<div class="victory-avatar-showcase"><div style="font-size:28px; margin-bottom:4px;">🤝</div><div style="font-size:13px; font-weight:900; color:#00d2ff;">ÉGALITÉ !</div></div>`;
  if (isWinner) { banner.innerText = "🏆 VICTOIRE SUPRÊME !"; banner.style.color = "#00ff88"; SoundEngine.playVictory(); }
  else if (winnerId) { banner.innerText = "💥 DÉFAITE AMÈRE..."; banner.style.color = "#ff4b2b"; }
  else { banner.innerText = "⏱️ ÉGALITÉ !"; banner.style.color = "#ff8a00"; }
  document.getElementById("recap-reason").innerText = data.reason;
  document.getElementById("recap-my-target").innerText = myData ? myData.target : "-";
  document.getElementById("recap-opp-target").innerText = oppData ? oppData.target : "-";
  document.getElementById("recap-my-score").innerText = myData ? myData.score : 0;
  let htmlCoins = `+${myReward.baseCoins}`;
  if (myReward.rushBonus > 0) htmlCoins += ` <span style="color:#ff8a00;">+${myReward.rushBonus}(RUSH)</span>`;
  document.getElementById("recap-coins-gained").innerHTML = htmlCoins;
  modal.style.display = "flex";
  registerIfPossible();
}

/* ============================================================
RÉCOMPENSES SOLO (handler socket.on bien formé)
============================================================ */
socket.on("solo_reward_result", (data) => {
  currentCoinsGained = data.earnedCoins;
  let htmlCoins = `+${data.baseCoins}`;
  if (data.rushBonus > 0) htmlCoins += `<span style="color:#ff8a00;">+${data.rushBonus}(RUSH)</span>`;
  document.getElementById("recap-coins-gained").innerHTML = htmlCoins;
  if (data.perfection) {
    pendingRecapAfterPopup = true;
    setTimeout(() => {
      SoundEngine.stopBoom();
      showRewardPopUp("⚡ PERFECTION — Combo x35 atteint ! Récompense maximale + Succès 🏆 débloqué !", "🏆");
      const btn = document.querySelector("#reward-popup-overlay .btn-gold");
      if (btn) btn.onclick = closeRewardPopUp;
    }, 900);
  }
  if (data.triggerWheel && !data.perfection) {
    setTimeout(() => {
      document.getElementById("recap-modal").style.display = "none";
      document.getElementById("modal-jackpot-wheel").style.display = "flex";
      const wheelEl = document.getElementById("wheel-element");
      wheelEl.style.transition = "none";
      wheelEl.style.transform = "rotate(0deg)";
      document.getElementById("btn-spin-wheel").disabled = false;
      document.getElementById("btn-spin-wheel").style.opacity = "1";
      document.getElementById("wheel-result-text").innerText = "";
    }, 800);
  }
});

/* ============================================================
TROPHÉES : handler de déblocage (popup dorée)
============================================================ */
socket.on('trophy_unlocked', (trophies) => {
  trophies.forEach((t, i) => {
    setTimeout(() => {
      const popup = document.getElementById('trophy-unlock-popup');
      if (!popup) return;
      document.getElementById('trophy-unlock-emoji').innerText = t.emoji;
      document.getElementById('trophy-unlock-name').innerText = t.name;
      document.getElementById('trophy-unlock-title').innerText = `Titre débloqué : ${t.title}`;
      popup.style.display = 'block';
      setTimeout(() => { popup.style.display = 'none'; }, 3500);
    }, i * 800);
  });
});

function handle1v1TileClick(num, index) {
  if (current1v1Time <= 0) return;
  const tiles = document.querySelectorAll("#grid .tile");
  if (tiles[index]) { tiles[index].classList.add("ripple-active"); setTimeout(() => tiles[index].classList.remove("ripple-active"), 400); }
  socket.emit("player_click_1v1", index);
}

/* ============================================================
ENTRAÎNEMENT SOLO
============================================================ */
activeTrainingMode = mode || "classic";
hideAllScreens();
if (activeTrainingMode === "random") setGameModeBadge("🎲 SOLO ALÉATOIRE", "#00ff88");
else setGameModeBadge("🏋️ SOLO CLASSIQUE", "#00d2ff");
  soloTarget = (activeTrainingMode === "random") ? Math.floor(Math.random() * 50) + 1 : 1;
  soloScore = 0; soloTimeLeft = 50; isTimeFrozen = false;
  currentSoloCharges = {};
  resetCombo();
  comboFXEnabled = true;
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) > 0) currentSoloCharges[myProfile.equippedPower] = 1;
  socket.emit("start_solo_training", { mode: activeTrainingMode, loadout: getOptionalLoadout ? getOptionalLoadout() : [] });
  document.getElementById("screen-game").style.display = "block";
  document.getElementById("hud-solo").style.display = "grid";
  document.getElementById("hud-1v1").style.display = "none";
  document.getElementById("hud-tow").style.display = "none";
  document.getElementById("game-target-giant").innerText = soloTarget;
  document.getElementById("solo-score").innerText = soloScore;
  document.getElementById("game-timer").innerText = soloTimeLeft;
  preparePowerHUD();
  generateSoloGrid();
  SoundEngine.startMusic("solo");
  soloTimerInterval = setInterval(() => { if (!isTimeFrozen) { soloTimeLeft--; document.getElementById("game-timer").innerText = Math.max(0, soloTimeLeft); if (soloTimeLeft <= 0) endSoloGame(); } }, 1000);
}

function generateSoloGrid() {
  let pool = [soloTarget];
  let candidates = [];
  for (let i = 1; i <= 50; i++) { if (i !== soloTarget) candidates.push(i); }
  candidates.sort(() => Math.random() - 0.5);
  pool = pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
  renderGrid(pool, handleSoloTileClick);
}

function handleSoloTileClick(num, index) {
  if (soloTimeLeft <= 0) return;
  const tiles = document.querySelectorAll("#grid .tile");
  if (tiles[index]) {
    tiles[index].classList.add("ripple-active");
    setTimeout(() => { tiles[index].classList.remove("ripple-active"); }, 400);
  }
  if (activeTrainingMode === "classic") {
    if (num === soloTarget) {
      SoundEngine.playClick();
      registerComboHit();
      soloTarget++;
      soloScore += 10;
      document.getElementById("game-target-giant").innerText = soloTarget;
      document.getElementById("solo-score").innerText = soloScore;
      generateSoloGrid();
    } else {
      SoundEngine.playError();
      resetCombo();
      if (!isTimeFrozen) {
        soloTimeLeft = Math.max(0, soloTimeLeft - 1);
        document.getElementById("game-timer").innerText = Math.max(0, soloTimeLeft);
        if (soloTimeLeft <= 0) endSoloGame();
      }
    }
  } else if (activeTrainingMode === "random") {
    if (num === soloTarget) {
      SoundEngine.playClick();
      registerComboHit();
      soloScore += 15;
      soloTarget = Math.floor(Math.random() * 50) + 1;
      document.getElementById("game-target-giant").innerText = soloTarget;
      document.getElementById("solo-score").innerText = soloScore;
      generateSoloGrid();
    } else {
      SoundEngine.playError();
      resetCombo();
      if (!isTimeFrozen) {
        soloTimeLeft = Math.max(0, soloTimeLeft - 1);
        document.getElementById("game-timer").innerText = Math.max(0, soloTimeLeft);
        if (soloTimeLeft <= 0) endSoloGame();
      }
    }
  }
}

/* ============================================================
AVALANCHE
============================================================ */
function startAvalancheGame(speed, initialCount) {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-game").style.display = "block";
  document.getElementById("hud-solo").style.display = "grid";
  document.getElementById("hud-1v1").style.display = "none";
  document.getElementById("hud-tow").style.display = "none";
  soloScore = 0;
  avalancheTimeLeft = 30;
  isTimeFrozen = false;
  resetCombo();
  comboFXEnabled = true;
  setGameModeBadge("🏔️ AVALANCHE", "#7be8ff");
  currentSoloCharges = {};
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) > 0) {
    currentSoloCharges[myProfile.equippedPower] = 1;
  }
  socket.emit("start_solo_training", { mode: "avalanche", loadout: getOptionalLoadout ? getOptionalLoadout() : [] });
  document.getElementById("solo-score").innerText = soloScore;
  document.getElementById("game-timer").innerText = avalancheTimeLeft;
  avalancheGridData = Array(16).fill(null);
  avalancheTarget = null;
  for (let i = 0; i < initialCount; i++) { spawnAvalancheNumber(); }
  updateAvalancheTarget();
  renderAvalancheGrid();
  preparePowerHUD();
  SoundEngine.startMusic("solo");
  avalancheTimerInterval = setInterval(() => {
    if (!isTimeFrozen) {
      avalancheTimeLeft--;
      document.getElementById("game-timer").innerText = Math.max(0, avalancheTimeLeft);
      if (avalancheTimeLeft <= 0) {
        clearInterval(avalancheTimerInterval);
        clearInterval(avalancheInterval);
        endSoloGame();
      }
    }
  }, 1000);
  avalancheInterval = setInterval(() => {
    if (!isTimeFrozen) {
      let added = spawnAvalancheNumber();
      renderAvalancheGrid();
      if (!added) {
        clearInterval(avalancheTimerInterval);
        clearInterval(avalancheInterval);
        endSoloGame();
      }
    }
  }, speed);
}

function spawnAvalancheNumber() {
  let emptyIndices = [];
  avalancheGridData.forEach((val, idx) => { if (val === null) emptyIndices.push(idx); });
  if (emptyIndices.length === 0) return false;
  let randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  avalancheGridData[randomIdx] = Math.floor(Math.random() * 50) + 1;
  if (avalancheTarget === null) updateAvalancheTarget();
  return true;
}

function updateAvalancheTarget() {
  let activeNumbers = avalancheGridData.filter(v => v !== null);
  if (activeNumbers.length > 0) {
    avalancheTarget = activeNumbers[Math.floor(Math.random() * activeNumbers.length)];
    document.getElementById("game-target-giant").innerText = avalancheTarget;
  } else {
    avalancheTarget = null;
    document.getElementById("game-target-giant").innerText = "-";
  }
}

function renderAvalancheGrid() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  grid.innerHTML = "";
  const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  const isAltTheme = equippedTheme === "theme_alt";
  const isGlacialTheme = equippedTheme === "theme_glacial";
  avalancheGridData.forEach((val, idx) => {
    const tile = document.createElement("div");
    if (val !== null) {
      tile.className = `tile ${isAltTheme ? "alt-theme" : ""} ${isGlacialTheme ? "glacial-theme" : ""}`;
      tile.innerText = val;
      tile.onclick = () => handleAvalancheClick(val, idx);
    } else {
      tile.className = "tile empty";
      tile.innerText = "";
    }
    grid.appendChild(tile);
  });
}

function handleAvalancheClick(val, idx) {
  const tiles = document.querySelectorAll("#grid .tile");
  if (tiles[idx]) {
    tiles[idx].classList.add("ripple-active");
    setTimeout(() => { tiles[idx].classList.remove("ripple-active"); }, 400);
  }
  if (val === avalancheTarget) {
    SoundEngine.playClick();
    registerComboHit();
    avalancheGridData[idx] = null;
    soloScore += 20;
    document.getElementById("solo-score").innerText = soloScore;
    updateAvalancheTarget();
    renderAvalancheGrid();
  } else {
    SoundEngine.playError();
    resetCombo();
  }
}

/* ============================================================
FIN DE PARTIE SOLO (version corrigée avec envoi best_combo)
============================================================ */
function endSoloGame() {
  hideAllScreens();
  const wasPerfection = soloPerfection;
  const modal = document.getElementById("recap-modal");
  rewardDoubled = false;
  const doubleBtn = document.getElementById("btn-double-reward");
  doubleBtn.disabled = false;
  doubleBtn.style.opacity = "1";
  doubleBtn.innerText = "📺 Doubler mes gains (Pub)";
  const rematchBtn = document.getElementById("btn-rematch");
  if (rematchBtn) rematchBtn.style.display = "none";
  socket.emit("claim_solo_reward", { 
    score: soloScore, 
    perfection: wasPerfection,
    best_combo: currentCombo,
    avalanche_score: activeTrainingMode === "avalanche" ? soloScore : 0
  });
  document.getElementById("winner-cinematic-container").innerHTML = `
    <div class="victory-avatar-showcase">
      <div class="victory-badge-large">
        <span style="font-size: 28px;">🏋️</span>
      </div>
    </div>`;
  if (wasPerfection) {
    document.getElementById("recap-banner").innerText = "💥 PERFECTION x35 !";
    document.getElementById("recap-banner").style.color = "#f8b500";
    document.getElementById("recap-reason").innerText = "PERFECTION ! Récompense maximale + Succès 🏆";
  } else {
    document.getElementById("recap-banner").innerText = "🏋️ ENTRAÎNEMENT TERMINÉ";
    document.getElementById("recap-banner").style.color = "#00d2ff";
    document.getElementById("recap-reason").innerText = `Score : ${soloScore}`;
  }
  document.getElementById("recap-1v1-rows").style.display = "none";
  document.getElementById("recap-my-score").innerText = soloScore;
  SoundEngine.playVictory();
  if (!wasPerfection) modal.style.display = "flex";
  soloPerfection = false;
  resetCombo();
}

/* ============================================================
SALLE DES TROPHÉES — fonctions client
============================================================ */
function openTrophyRoom(targetUsername = null) {
  document.getElementById('modal-trophy-room').style.display = 'flex';
  if (targetUsername) socket.emit('get_trophy_room', targetUsername);
  else socket.emit('get_my_trophy_room');
}

function enterTrophyRoom() {
const flash = document.createElement('div');
flash.className = 'trophy-enter-flash';
flash.innerText = '🏛️';
document.body.appendChild(flash);
setTimeout(() => {
openTrophyRoom();
setTimeout(() => flash.remove(), 600);
}, 450);
}
function closeTrophyRoom() {
  document.getElementById('modal-trophy-room').style.display = 'none';
}

socket.on('trophy_room_data', (data) => {
  if (!data || !data.ok) return;
  document.getElementById('trophy-room-flag').innerText = data.flag || '🇫🇷';
  document.getElementById('trophy-room-username').innerText = data.username;
  const unlockedCount = Object.keys(data.trophies_collection || {}).length;
  document.getElementById('trophy-room-count').innerText = `${unlockedCount}/16 🏆`;
  
  const shelvesContainer = document.getElementById('trophy-room-shelves');
  shelvesContainer.innerHTML = '';
  
  TROPHY_SHELVES.forEach(shelf => {
    const shelfEl = document.createElement('div');
    shelfEl.className = 'trophy-shelf';
    const shelfTrophies = Object.entries(TROPHY_CATALOG_CLIENT).filter(([_, t]) => t.shelf === shelf.id);
    
    shelfEl.innerHTML = `<div class="trophy-shelf-title" style="color:${shelf.color}; text-shadow:0 0 8px ${shelf.color};">${shelf.label}</div>`;
    const grid = document.createElement('div');
    grid.className = 'trophy-shelf-grid';
    
    shelfTrophies.forEach(([id, trophy]) => {
      const isUnlocked = !!(data.trophies_collection && data.trophies_collection[id]);
      const vitrine = document.createElement('div');
      vitrine.className = `trophy-vitrine rarity-${trophy.rarity} ${!isUnlocked ? 'locked' : ''}`;
      vitrine.innerHTML = `
        <div class="trophy-emoji">${isUnlocked ? trophy.emoji : '❓'}</div>
        <div class="trophy-name">${isUnlocked ? trophy.name : '???'}</div>
        ${!isUnlocked ? '<div class="trophy-lock">🔒</div>' : ''}
      `;
      vitrine.onmouseenter = (e) => showTrophyTooltip(e, trophy, data, isUnlocked);
      vitrine.onmousemove = (e) => moveTrophyTooltip(e);
      vitrine.onmouseleave = hideTrophyTooltip;
      grid.appendChild(vitrine);
    });
    
    shelfEl.appendChild(grid);
    shelvesContainer.appendChild(shelfEl);
  });
});

let tooltipEl = null;
function showTrophyTooltip(e, trophy, playerData, isUnlocked) {
  hideTrophyTooltip();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'trophy-tooltip';
  const progressText = trophy.progress(playerData);
  tooltipEl.innerHTML = `
    <div style="font-size:13px; font-weight:900; color:#f8b500;">${trophy.emoji} ${trophy.name}</div>
    <div style="margin:6px 0; color:#00d2ff;">${trophy.condition}</div>
    <div style="color:#fff;">Progrès : <b>${progressText}</b></div>
    <div style="margin-top:6px; font-size:10px; color:${isUnlocked ? '#00ff88' : '#ff4b2b'};">${isUnlocked ? '✅ Débloqué' : '🔒 Verrouillé'}</div>
  `;
  document.body.appendChild(tooltipEl);
  moveTrophyTooltip(e);
}

function moveTrophyTooltip(e) {
  if (!tooltipEl) return;
  tooltipEl.style.left = (e.clientX + 15) + 'px';
  tooltipEl.style.top = (e.clientY + 15) + 'px';
}

function hideTrophyTooltip() {
  if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
}

/* ============================================================
RENDU DE LA GRILLE
============================================================ */
function renderGrid(pool, handler) {
  const grid = document.getElementById("grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!pool) return;
  const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  const isAltTheme = equippedTheme === "theme_alt";
  const isGlacialTheme = equippedTheme === "theme_glacial";
  pool.forEach((num, index) => {
    const tile = document.createElement("div");
    tile.className = `tile ${isAltTheme ? "alt-theme" : ""} ${isGlacialTheme ? "glacial-theme" : ""}`;
    tile.innerText = num;
    tile.onclick = () => handler(num, index);
    grid.appendChild(tile);
  });
}

// ===== FIN PARTIE 7/7-B — FIN DU FICHIER =====
