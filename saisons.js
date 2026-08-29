/* ============================================================
MODULE SAISONS — DA visuelle saisonnière
============================================================ */

function getCurrentSeasonId() {
  if (typeof myProfile !== "undefined" && myProfile) {
    return myProfile.currentSeasonId || myProfile.seasonId || myProfile.season_id || "s1";
  }
  return window.CURRENT_SEASON || "s1";
}

function applySeasonDA() {
  const seasonId = getCurrentSeasonId();
  window.CURRENT_SEASON = seasonId;

  document.body.classList.remove("season-s1", "season-s2", "season-s3");
  document.body.classList.add("season-" + seasonId);

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
      <svg viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="castleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a0033"/>
            <stop offset="100%" stop-color="#0a001a"/>
          </linearGradient>
        </defs>
        <g fill="url(#castleGrad)" stroke="#2a0a4d" stroke-width="1">
          <polygon points="55,200 55,115 62,100 72,78 82,100 89,115 89,200"/>
          <rect x="89" y="135" width="55" height="65"/>
          <polygon points="144,200 144,95 156,70 168,48 180,70 192,95 192,200"/>
          <rect x="192" y="125" width="66" height="75"/>
          <polygon points="258,200 258,105 266,85 274,70 282,85 290,105 290,200"/>
          <rect x="290" y="145" width="55" height="55"/>
          <polygon points="345,200 345,115 353,100 361,86 369,100 377,115 377,200"/>
          <rect x="155" y="165" width="18" height="35"/>
          <rect x="215" y="160" width="22" height="40"/>
        </g>
        <g fill="#ff8a00">
          <rect class="win" x="68" y="125" width="7" height="11"/>
          <rect class="win" x="164" y="105" width="8" height="13" style="animation-delay:1s"/>
          <rect class="win" x="164" y="130" width="8" height="13" style="animation-delay:1.3s"/>
          <rect class="win" x="220" y="140" width="10" height="14" style="animation-delay:0.4s"/>
          <rect class="win" x="245" y="140" width="10" height="14" style="animation-delay:0.8s"/>
          <rect class="win" x="270" y="120" width="7" height="11" style="animation-delay:2s"/>
          <rect class="win" x="312" y="155" width="6" height="10" style="animation-delay:0.5s"/>
        </g>
        <g stroke="#0a001a" stroke-width="1.5" fill="none" opacity="0.4">
          <line x1="55" y1="150" x2="89" y2="150"/>
          <line x1="144" y1="140" x2="192" y2="140"/>
          <line x1="258" y1="150" x2="290" y2="150"/>
        </g>
      </svg>
    </div>
    <div class="hw-tree hw-tree-left">
      <svg viewBox="0 0 120 260" preserveAspectRatio="none">
        <g stroke="#0d0016" fill="none" stroke-linecap="round">
          <path d="M60,260 C58,210 52,170 35,125 C25,95 30,70 35,45" stroke-width="16"/>
          <path d="M58,220 C75,185 95,160 110,120 C118,95 115,70 110,50" stroke-width="10"/>
          <path d="M42,170 C30,140 20,115 5,85 C0,70 5,55 10,40" stroke-width="8"/>
          <path d="M90,150 C105,125 115,100 118,70" stroke-width="6"/>
          <path d="M20,115 C12,95 8,75 4,55" stroke-width="5"/>
          <path d="M100,130 C108,105 115,85 118,65" stroke-width="4"/>
          <path d="M35,140 C22,115 15,95 8,75" stroke-width="4"/>
          <path d="M65,180 C50,160 45,140 50,120" stroke-width="3"/>
          <path d="M80,145 C90,125 95,105 98,85" stroke-width="3"/>
        </g>
      </svg>
    </div>
    <div class="hw-tree hw-tree-right">
      <svg viewBox="0 0 120 260" preserveAspectRatio="none">
        <g stroke="#0d0016" fill="none" stroke-linecap="round">
          <path d="M60,260 C58,210 52,170 35,125 C25,95 30,70 35,45" stroke-width="16"/>
          <path d="M58,220 C75,185 95,160 110,120 C118,95 115,70 110,50" stroke-width="10"/>
          <path d="M42,170 C30,140 20,115 5,85 C0,70 5,55 10,40" stroke-width="8"/>
          <path d="M90,150 C105,125 115,100 118,70" stroke-width="6"/>
          <path d="M20,115 C12,95 8,75 4,55" stroke-width="5"/>
          <path d="M100,130 C108,105 115,85 118,65" stroke-width="4"/>
          <path d="M35,140 C22,115 15,95 8,75" stroke-width="4"/>
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
  const spots = [
    { left: "2%", bottom: "2%", size: 150 },
    { left: "18%", bottom: "1%", size: 110 },
    { right: "2%", bottom: "3%", size: 170 },
    { right: "20%", bottom: "1%", size: 100 }
  ];
  const count = low ? 2 : 4;
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
        el.innerHTML = `<div class="lantern"><div class="face"><div class="eye-left"></div><div class="eye-right"></div><div class="mouth"></div></div></div>`;
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
  const size = 120 + Math.random() * 60;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = (10 + Math.random() * 80) + "%";
  el.style.top = (15 + Math.random() * 60) + "%";
  el.style.animationDuration = (3.5 + Math.random() * 1.5) + "s";
  (document.getElementById("season-bg") || document.body).appendChild(el);
  const data = hlClone("fantome");
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({ container: el, renderer: "canvas", loop: true, autoplay: true, animationData: data, rendererSettings: { dpr: window.devicePixelRatio || 2, clearCanvas: true } });
  } else {
    el.innerText = "👻";
    el.style.fontSize = size * 0.6 + "px";
  }
  hlRegister("fantome", { el, anim }, 5500);
}

/* ---------- ARAIGNÉES : descendent du haut puis remontent ---------- */
function spawnSceneSpider() {
  hlRecycle("araignee");
  const el = document.createElement("div");
  el.className = "hw-spider-lottie";
  const size = 80 + Math.random() * 40;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = (10 + Math.random() * 80) + "%";
  (document.getElementById("season-bg") || document.body).appendChild(el);
  const data = hlClone("araignee");
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({ container: el, renderer: "canvas", loop: true, autoplay: true, animationData: data, rendererSettings: { dpr: window.devicePixelRatio || 2, clearCanvas: true } });
  } else {
    el.innerText = "🕷️";
    el.style.fontSize = size * 0.6 + "px";
  }
  hlRegister("araignee", { el, anim }, 8500);
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
APPLICATION AUTOMATIQUE
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof initMenuBackgroundFX === "function") initMenuBackgroundFX();
    applySeasonDA();
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
