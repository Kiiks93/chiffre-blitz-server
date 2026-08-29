/* ============================================================
MODULE SAISONS — DA visuelle saisonnière
============================================================ */

function getCurrentSeasonId() {
  if (typeof myProfile !== "undefined" && myProfile) {
    return myProfile.currentSeasonId || myProfile.seasonId || myProfile.season_id || "s1";
  }
  return window.CURRENT_SEASON || "s1";
}

let lastAppliedSeason = null;
let _musicRestartTimer = null;

function restartSeasonMusic() {
  if (typeof SoundEngine === "undefined") return;
  if (_musicRestartTimer) clearTimeout(_musicRestartTimer);
  _musicRestartTimer = setTimeout(() => {
    if (typeof SoundEngine.startMusic !== "function") return;
    // Détermine si on est en jeu ou au menu
    const inGame = document.getElementById("screen-game") && document.getElementById("screen-game").style.display === "block";
    const mode = inGame ? "game" : "menu";
    try {
      SoundEngine.stopMusic(false);
      SoundEngine.startMusic(mode);
    } catch (e) {}
  }, 150);
}
function applySeasonDA() {
  const seasonId = getCurrentSeasonId();
  window.CURRENT_SEASON = seasonId;

  document.body.classList.remove("season-s1", "season-s2", "season-s3");
  document.body.classList.add("season-" + seasonId);
    // Force le changement de musique si la saison a changé
  if (lastAppliedSeason !== seasonId) {
    lastAppliedSeason = seasonId;
    restartSeasonMusic();
  }

  if (seasonId === "s2") buildHalloweenScene();
  else clearHalloweenScene();

  setupHalloweenDecor(seasonId);

  const fx = document.getElementById("bg-fx");
  if (!fx) return;
  fx.querySelectorAll(".bg-shape").forEach(s => s.remove());
  if (seasonId === "s2") return;

  const shapes = seasonId === "s3" ? ["❄️", "⛄", "🎄", ""] : ["◆", "▲", "■", "●"];
  const colors = seasonId === "s3"
    ? ["#ffffff", "#7be8ff", "#ff4b2b", "#38ef7d"]
    : ["#00d2ff", "#ff007f", "#ffe600", "#00ff88"];

  for (let i = 0; i < 12; i++) {
    const s = document.createElement("div");
    s.className = "bg-shape";
    s.innerText = shapes[i % shapes.length];
    s.style.fontSize = (14 + Math.random() * 26) + "px";
    s.style.left = Math.random() * 100 + "%";
    s.color = colors[i % colors.length];
    s.style.animationDuration = (14 + Math.random() * 16) + "s";
    s.style.animationDelay = (-Math.random() * 25) + "s";
    fx.appendChild(s);
  }
}

/* ============================================================
SCÈNE HALLOWEEN ANIMÉE
============================================================ */
function buildHalloweenScene() {
  let bg = document.getElementById("season-bg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "season-bg";
    document.body.prepend(bg);
  }
  if (bg.dataset.built === "s2") return;
  bg.dataset.built = "s2";
  bg.innerHTML = `
    <div class="hw-sky"></div>
    <div class="hw-moon"></div>
    <div class="hw-cloud hw-c1"></div>
    <div class="hw-cloud hw-c2"></div>
    <div class="hw-cloud hw-c3"></div>
        <div class="hw-castle">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="castleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a0033"/>
            <stop offset="100%" stop-color="#0a001a"/>
          </linearGradient>
        </defs>
        <g fill="url(#castleGrad)" stroke="#2a0a4d" stroke-width="1">
          <polygon points="45,300 52,140 44,120 60,70 74,125 70,300"/>
          <polygon points="70,300 70,190 130,180 130,300"/>
          <polygon points="130,300 138,120 128,95 150,30 172,100 162,130 168,300"/>
          <polygon points="168,300 168,170 200,160 210,140 220,165 250,170 250,300"/>
          <polygon points="250,300 258,130 250,110 268,55 284,115 278,300"/>
          <polygon points="278,300 278,200 330,190 330,300"/>
          <polygon points="330,300 336,150 330,130 344,90 358,135 352,300"/>
        </g>
        <g fill="#ff8a00">
          <rect class="win" x="56" y="150" width="7" height="11"/>
          <rect class="win" x="146" y="120" width="8" height="13" style="animation-delay:1s"/>
          <rect class="win" x="150" y="180" width="7" height="11" style="animation-delay:1.4s"/>
          <rect class="win" x="196" y="190" width="9" height="13" style="animation-delay:0.4s"/>
          <rect class="win" x="228" y="195" width="8" height="12" style="animation-delay:0.9s"/>
          <rect class="win" x="264" y="150" width="7" height="11" style="animation-delay:2s"/>
          <rect class="win" x="300" y="215" width="6" height="10" style="animation-delay:0.6s"/>
          <rect class="win" x="340" y="170" width="6" height="10" style="animation-delay:1.7s"/>
        </g>
        <g stroke="#0a001a" stroke-width="1.5" fill="none" opacity="0.4">
          <path d="M60,200 q10,20 -4,40"/>
          <path d="M150,220 q-8,25 6,45"/>
          <path d="M265,210 q8,20 -5,40"/>
        </g>
      </svg>
    </div>
        <div class="hw-tree hw-tree-left">
      <svg viewBox="0 0 200 300" preserveAspectRatio="none">
        <g stroke="#0d0016" fill="none" stroke-linecap="round">
          <path d="M30,300 C28,240 24,190 30,140 C34,100 30,70 26,40" stroke-width="18"/>
          <path d="M30,220 C70,190 110,170 150,150 C170,140 185,125 195,110" stroke-width="10"/>
          <path d="M32,170 C60,150 90,140 120,120 C140,108 155,95 165,80" stroke-width="8"/>
          <path d="M28,120 C50,105 75,95 100,80 C115,70 125,60 132,48" stroke-width="6"/>
          <path d="M110,170 C120,155 128,145 138,132" stroke-width="5"/>
          <path d="M150,150 C158,138 165,128 172,116" stroke-width="4"/>
          <path d="M90,140 C98,128 105,118 112,106" stroke-width="4"/>
          <path d="M120,120 C130,108 138,98 146,86" stroke-width="3"/>
          <path d="M70,100 C78,90 85,80 92,68" stroke-width="3"/>
          <path d="M28,200 C18,185 12,170 8,155" stroke-width="5"/>
          <path d="M26,150 C18,138 14,126 10,112" stroke-width="4"/>
        </g>
      </svg>
    </div>
    <div class="hw-tree hw-tree-right">
      <svg viewBox="0 0 200 300" preserveAspectRatio="none">
        <g stroke="#0d0016" fill="none" stroke-linecap="round">
          <path d="M30,300 C28,240 24,190 30,140 C34,100 30,70 26,40" stroke-width="18"/>
          <path d="M30,220 C70,190 110,170 150,150 C170,140 185,125 195,110" stroke-width="10"/>
          <path d="M32,170 C60,150 90,140 120,120 C140,108 155,95 165,80" stroke-width="8"/>
          <path d="M28,120 C50,105 75,95 100,80 C115,70 125,60 132,48" stroke-width="6"/>
          <path d="M110,170 C120,155 128,145 138,132" stroke-width="5"/>
          <path d="M150,150 C158,138 165,128 172,116" stroke-width="4"/>
          <path d="M90,140 C98,128 105,118 112,106" stroke-width="4"/>
          <path d="M28,200 C18,185 12,170 8,155" stroke-width="5"/>
        </g>
      </svg>
    </div>
    <div class="hw-fence"></div>
    <div class="hw-ground"></div>
    <div class="hw-mist"></div>
  `;
  preloadHalloweenLotties();
  addScenePumpkins(bg);
}

function clearHalloweenScene() {
  const bg = document.getElementById("season-bg");
  if (bg) { bg.innerHTML = ""; bg.dataset.built = ""; }
  clearHalloweenLotties();
}

/* ============================================================
DÉCOR VIVANT HALLOWEEN (toiles + spawner)
============================================================ */
let halloweenAmbienceTimer = null;

function setupHalloweenDecor(seasonId) {
  document.querySelectorAll(".halloween-web").forEach(el => el.remove());
  if (halloweenAmbienceTimer) { clearInterval(halloweenAmbienceTimer); halloweenAmbienceTimer = null; }
  if (seasonId !== "s2") return;

  const webTL = document.createElement("div");
  webTL.className = "halloween-web tl";
  webTL.innerText = "🕸️";
  document.body.appendChild(webTL);

  const webTR = document.createElement("div");
  webTR.className = "halloween-web tr";
  webTR.innerText = "🕸️";
  document.body.appendChild(webTR);

  halloweenAmbienceTimer = setInterval(() => {
    const inGame = document.getElementById("screen-game") && document.getElementById("screen-game").style.display === "block";
    if (inGame) return;
    const roll = Math.random();
    if (roll < 0.25) spawnSceneGhost();
    else if (roll < 0.6) spawnSceneBat();
    else spawnSceneSpider();
  }, 1500);
}

/* ============================================================
LOTTIE HALLOWEEN — préchargé + recyclage (zéro lag)
============================================================ */
const HALLOWEEN_LOTTIE_FILES = {
  citrouille: "CITROUILLE.json",
  fantome: "fantome.json",
  chauve: "chauve-souris.json",
  araignee: "araignée.json"
};
let _hlData = {};
let _hlPreloaded = false;
let _hlPumpkins = [];
const _hlActive = { chauve: [], fantome: [], araignee: [] };

function hlMax(type) {
  const low = (typeof IS_LOW_PERF !== "undefined") && IS_LOW_PERF;
  if (type === "araignee") return low ? 2 : 3;
  return low ? 2 : 3;
}

function preloadHalloweenLotties() {
  if (_hlPreloaded || typeof lottie === "undefined") return;
  _hlPreloaded = true;
  Object.keys(HALLOWEEN_LOTTIE_FILES).forEach(key => {
    fetch(HALLOWEEN_LOTTIE_FILES[key])
      .then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(data => { _hlData[key] = data; console.log("✅ Lottie chargé : " + key); })
      .catch(() => { _hlData[key] = null; console.log("❌ Lottie introuvable : " + HALLOWEEN_LOTTIE_FILES[key]); });
  });
}

function hlClone(key) {
  const d = _hlData[key];
  if (!d) return null;
  return (typeof structuredClone === "function") ? structuredClone(d) : JSON.parse(JSON.stringify(d));
}

function hlRecycle(type) {
  const arr = _hlActive[type];
  while (arr.length >= hlMax(type)) {
    const old = arr.shift();
    if (old) { if (old.anim) old.anim.destroy(); if (old.el && old.el.parentNode) old.el.remove(); }
  }
}

function hlRegister(type, obj, lifetime) {
  _hlActive[type].push(obj);
  setTimeout(() => {
    if (obj.anim) obj.anim.destroy();
    if (obj.el && obj.el.parentNode) obj.el.remove();
    const idx = _hlActive[type].indexOf(obj);
    if (idx !== -1) _hlActive[type].splice(idx, 1);
  }, lifetime);
}

/* ---------- CITROUILLES EN BAS (SVG = fusions respectées) ---------- */
function addScenePumpkins(bg) {
  clearHalloweenPumpkins();
  const low = (typeof IS_LOW_PERF !== "undefined") && IS_LOW_PERF;
    const spots = low
    ? [
        { left: "-4%", bottom: "-2%", size: 150 },
        { right: "-4%", bottom: "-1%", size: 170 }
      ]
    : [
        { left: "-2%", bottom: "-2%", size: 280 },
        { left: "16%", bottom: "-4%", size: 190 },
        { right: "-3%", bottom: "-1%", size: 320 },
        { right: "22%", bottom: "-4%", size: 170 }
      ];
  const count = spots.length;
  const build = () => {
    clearHalloweenPumpkins();
    for (let i = 0; i < count; i++) {
      const s = spots[i];
      const el = document.createElement("div");
      el.className = "hw-pumpkin-lottie";
      el.style.width = s.size + "px";
      el.style.height = s.size + "px";
      if (s.left) el.style.left = s.left;
      if (s.right) el.style.right = s.right;
      el.style.bottom = s.bottom;
      bg.appendChild(el);
      let anim = null;
      const data = hlClone("citrouille");
      if (data) {
        anim = lottie.loadAnimation({ container: el, renderer: "svg", loop: true, autoplay: true, animationData: data });
      } else {
        el.innerHTML = `<div class="lantern" style="width:100%;height:100%;"><div class="face"><div class="eye-left"></div><div class="eye-right"></div><div class="mouth"></div></div></div>`;
      }
      _hlPumpkins.push({ el, anim });
    }
  };
  build();
  if (!_hlData.citrouille) {
    const retry = setInterval(() => {
      if (_hlData.citrouille && window.CURRENT_SEASON === "s2" && document.getElementById("season-bg")) {
        clearInterval(retry);
        build();
      }
    }, 1000);
    setTimeout(() => clearInterval(retry), 15000);
  }
}

function clearHalloweenPumpkins() {
  _hlPumpkins.forEach(p => { if (p.anim) p.anim.destroy(); if (p.el && p.el.parentNode) p.el.remove(); });
  _hlPumpkins = [];
}

function clearHalloweenLotties() {
  clearHalloweenPumpkins();
  Object.keys(_hlActive).forEach(type => {
    _hlActive[type].forEach(o => { if (o.anim) o.anim.destroy(); if (o.el && o.el.parentNode) o.el.remove(); });
    _hlActive[type] = [];
  });
}

/* ---------- CHAUVE-SOURIS : traverse + fonce vers nous ---------- */
function spawnSceneBat() {
  hlRecycle("chauve");
  const el = document.createElement("div");
  el.className = "hw-bat-lottie";
  const size = 90 + Math.random() * 60;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.top = (5 + Math.random() * 28) + "%";
  el.style.animationDuration = (4 + Math.random() * 3) + "s";
  (document.getElementById("season-bg") || document.body).appendChild(el);
  const data = hlClone("chauve");
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({ container: el, renderer: "canvas", loop: true, autoplay: true, animationData: data, rendererSettings: { dpr: window.devicePixelRatio || 2, clearCanvas: true } });
  } else {
    el.innerText = "🦇";
    el.style.fontSize = size * 0.6 + "px";
  }
  hlRegister("chauve", { el, anim }, 8000);
}

/* ---------- FANTÔMES : du fond vers nous (fond noir masqué) ---------- */
function spawnSceneGhost() {
  hlRecycle("fantome");
  const el = document.createElement("div");
  el.className = "hw-ghost-lottie";
  const size = 110 + Math.random() * 70;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = (10 + Math.random() * 80) + "%";
  el.style.top = (15 + Math.random() * 55) + "%";
  el.style.animationDuration = (3.5 + Math.random() * 1.5) + "s";
    el.innerHTML = `
    <div class="scene-ghost">
      <div class="sg-body"></div>
      <div class="sg-fringe"></div>
      <div class="sg-eye l"></div>
      <div class="sg-eye r"></div>
      <div class="sg-mouth"></div>
    </div>`;
  (document.getElementById("season-bg") || document.body).appendChild(el);
  hlRegister("fantome", { el, anim: null }, 5500);
}

/* ---------- ARAIGNÉES : descendent du haut puis remontent ---------- */
function spawnSceneSpider() {
  hlRecycle("araignee");
  const el = document.createElement("div");
  el.className = "hw-spider-lottie";
  const w = 160 + Math.random() * 90;
  el.style.width = w + "px";
  el.style.height = (50 + Math.random() * 15) + "vh";
  el.style.left = (8 + Math.random() * 84) + "%";
  (document.getElementById("season-bg") || document.body).appendChild(el);
  const data = hlClone("araignee");
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({
      container: el,
      renderer: "canvas",
      loop: false,
      autoplay: true,
      animationData: data,
      rendererSettings: { dpr: window.devicePixelRatio || 2, clearCanvas: true, preserveAspectRatio: "xMidYMin meet" }
    });
  } else {
    el.innerHTML = `<div style="position:absolute;top:0;left:50%;width:1.5px;height:60%;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,0.4));"></div><div style="position:absolute;top:60%;left:50%;transform:translateX(-50%);font-size:46px;">🕷️</div>`;
  }
  hlRegister("araignee", { el, anim }, 9000);
}

/* ============================================================
FX 🎃 LANTERNES (grille Citrouille) — lanternes 3D + drone angoissant
(utilisé en jeu, pas seulement au menu)
============================================================ */
let _lanternAudioCtx = null;

function playLanternSound() {
  if (isMuted()) return;
  try {
    if (!_lanternAudioCtx) _lanternAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_lanternAudioCtx.state === "suspended") _lanternAudioCtx.resume();
    const ctx = _lanternAudioCtx;
    [110, 116.54].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 1.5);
    });
  } catch (e) {}
}

function spawnLanterns(big) {
  const count = big ? 14 : 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) setTimeout(() => createLantern(), i * 90);
}

function createLantern() {
  const wrapper = document.createElement("div");
  wrapper.className = "lantern-wrapper";
  wrapper.style.left = (Math.random() * (window.innerWidth - 120) + 60) + "px";
  const duration = Math.random() * 1.0 + 3.2;
  wrapper.style.animationDuration = duration + "s";
  wrapper.style.setProperty("--drift", ((Math.random() - 0.5) * 100) + "px");
  wrapper.style.setProperty("--rot", ((Math.random() - 0.5) * 120) + "deg");
  const lantern = document.createElement("div");
  lantern.className = "lantern";
  const face = document.createElement("div");
  face.className = "face";
  const eyeLeft = document.createElement("div"); eyeLeft.className = "eye-left";
  const eyeRight = document.createElement("div"); eyeRight.className = "eye-right";
  const mouth = document.createElement("div"); mouth.className = "mouth";
  face.appendChild(eyeLeft); face.appendChild(eyeRight); face.appendChild(mouth);
  lantern.appendChild(face);
  const particlesContainer = document.createElement("div");
  particlesContainer.className = "lantern-particles";
  for (let p = 0; p < 3; p++) {
    const particle = document.createElement("div");
    particle.className = "lantern-particle";
    const size = Math.random() * 4 + 3;
    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.left = ((Math.random() - 0.5) * 15) + "px";
    particle.style.top = (p * 12) + "px";
    particle.style.animationDelay = (Math.random() * 0.4) + "s";
    particlesContainer.appendChild(particle);
  }
  wrapper.appendChild(lantern);
  wrapper.appendChild(particlesContainer);
  document.body.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), duration * 1000);
}

/* ============================================================
FX 👻 ORBE FANTÔME (CSS pure, zéro lag)
(utilisé en jeu, pas seulement au menu)
============================================================ */
let _ghostAudioCtx = null;

function playGhostSound() {
  if (isMuted()) return;
  try {
    if (!_ghostAudioCtx) _ghostAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ghostAudioCtx.state === "suspended") _ghostAudioCtx.resume();
    const ctx = _ghostAudioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.5);
    osc.frequency.linearRampToValueAtTime(240, t + 1.0);
    osc.frequency.linearRampToValueAtTime(150, t + 1.6);
    gainNode.gain.setValueAtTime(0.001, t);
    gainNode.gain.linearRampToValueAtTime(0.12, t + 0.3);
    gainNode.gain.linearRampToValueAtTime(0.08, t + 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, t);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.6);
  } catch (e) {}
}

function spawnGhostLotties(big) {
  const count = big ? (IS_LOW_PERF ? 3 : 6) : (IS_LOW_PERF ? 1 : 2 + Math.floor(Math.random() * 2));
  for (let i = 0; i < count; i++) {
    setTimeout(() => createGhostOrb(), i * 180);
  }
}

function createGhostOrb() {
  const lite = (typeof IS_LOW_PERF !== "undefined") && IS_LOW_PERF;
  const orb = document.createElement("div");
  orb.className = "ghost-orb";
  const size = lite ? (60 + Math.random() * 30) : (80 + Math.random() * 60);
  orb.style.width = size + "px";
  orb.style.height = size + "px";
  orb.style.left = (Math.random() * 80 + 10) + "%";
  orb.style.top = (Math.random() * 70 + 15) + "%";
  orb.style.animationDuration = (2.4 + Math.random() * 0.8) + "s";

  if (lite) {
    orb.innerHTML = `
      <div class="ghost-orb-body">
        <div class="ghost-orb-face">
          <div class="ghost-orb-eye left"></div>
          <div class="ghost-orb-eye right"></div>
          <div class="ghost-orb-mouth"></div>
        </div>
      </div>`;
  } else {
    orb.innerHTML = `
      <div class="ghost-orb-halo"></div>
      <div class="ghost-orb-body">
        <div class="ghost-orb-face">
          <div class="ghost-orb-eye left"></div>
          <div class="ghost-orb-eye right"></div>
          <div class="ghost-orb-mouth"></div>
        </div>
      </div>`;
    for (let i = 0; i < 4; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "ghost-orb-sparkle";
      const angle = (i / 4) * Math.PI * 2;
      const distance = 60 + Math.random() * 20;
      sparkle.style.setProperty("--sx", Math.cos(angle) * distance + "px");
      sparkle.style.setProperty("--sy", Math.sin(angle) * distance + "px");
      sparkle.style.left = "50%";
      sparkle.style.top = "50%";
      sparkle.style.animationDelay = (i * 0.3) + "s";
      orb.appendChild(sparkle);
    }
  }

  document.body.appendChild(orb);
  setTimeout(() => orb.remove(), 3500);
}

/* ============================================================
FX 🎄 COMBOS NOËL (S3) — bonbons / boules / lutins
============================================================ */
function spawnBonbons(big) {
  const count = big ? 14 : 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) setTimeout(() => createBonbon(), i * 90);
}
function createBonbon() {
  const w = document.createElement("div");
  w.className = "bonbon-wrapper";
  w.style.left = (Math.random() * (window.innerWidth - 80) + 40) + "px";
  const d = Math.random() * 1 + 2.6;
  w.style.animationDuration = d + "s";
  w.style.setProperty("--drift", ((Math.random() - 0.5) * 120) + "px");
  w.style.setProperty("--rot", ((Math.random() - 0.5) * 360) + "deg");
  w.innerHTML = `<div class="bonbon"></div>`;
  document.body.appendChild(w);
  setTimeout(() => w.remove(), d * 1000);
}

function spawnSapinSparkles(big) {
  const count = big ? 14 : 3 + Math.floor(Math.random() * 3);
  const colors = ["#ff4b4b", "#ffd700", "#4bb3ff", "#38ef7d", "#ff8ae2"];
  for (let i = 0; i < count; i++) setTimeout(() => createSapinSparkle(colors[i % colors.length]), i * 90);
}
function createSapinSparkle(color) {
  const s = document.createElement("div");
  s.className = "sapin-sparkle";
  s.style.left = (Math.random() * (window.innerWidth - 60) + 30) + "px";
  const d = Math.random() * 1 + 2.4;
  s.style.animationDuration = d + "s";
  s.innerHTML = `<div class="sapin-boule" style="--c:${color}"></div>`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), d * 1000);
}

function spawnLutins(big) {
  const count = big ? 8 : 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) setTimeout(() => createLutin(), i * 120);
}
function createLutin() {
  const l = document.createElement("div");
  l.className = "lutin-jump";
  l.style.left = (Math.random() * (window.innerWidth - 80) + 40) + "px";
  document.body.appendChild(l);
  setTimeout(() => l.remove(), 1000);
}
// Relance la musique quand on entre/sort du jeu (pour passer menu↔game)
function _watchScreenGame() {
  const gameScreen = document.getElementById("screen-game");
  if (!gameScreen) return;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "style") {
        restartSeasonMusic();
      }
    }
  });
  observer.observe(gameScreen, { attributes: true, attributeFilter: ["style"] });
}
/* ============================================================
APPLICATION AUTOMATIQUE
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof initMenuBackgroundFX === "function") initMenuBackgroundFX();
    applySeasonDA();
    _watchScreenGame();
  }, 100);
});

if (typeof socket !== "undefined") {
  socket.on("player_registered", () => {
    setTimeout(() => { applySeasonDA(); }, 50);
  });
  socket.on("season_updated", (data) => {
    if (data && data.seasonId) {
      window.CURRENT_SEASON = data.seasonId;
      if (typeof myProfile !== "undefined" && myProfile) myProfile.currentSeasonId = data.seasonId;
    }
    setTimeout(() => { applySeasonDA(); }, 50);
  });
}
