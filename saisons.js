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

  const fx = document.getElementById("bg-fx");
  if (!fx) return;

  fx.querySelectorAll(".bg-shape").forEach(s => s.remove());

  const shapes =
    seasonId === "s2"
      ? ["🎃", "👻", "🦇", "🕸️"]
      : seasonId === "s3"
        ? ["❄️", "⛄", "🎄", "🎁"]
        : ["◆", "▲", "■", "●"];

  const colors =
    seasonId === "s2"
      ? ["#ff8a00", "#b06bff", "#ff4b2b", "#e8dcc0"]
      : seasonId === "s3"
        ? ["#ffffff", "#7be8ff", "#ff4b2b", "#38ef7d"]
        : ["#00d2ff", "#ff007f", "#ffe600", "#00ff88"];

  for (let i = 0; i < 12; i++) {
    const s = document.createElement("div");
    s.className = "bg-shape";
    s.innerText = shapes[i % shapes.length];
    s.style.fontSize = (14 + Math.random() * 26) + "px";
    s.style.left = Math.random() * 100 + "%";
    s.style.color = colors[i % colors.length];
    s.style.animationDuration = (14 + Math.random() * 16) + "s";
    s.style.animationDelay = (-Math.random() * 25) + "s";
    fx.appendChild(s);
  }
  /* ---------- DÉCOR VIVANT HALLOWEEN ---------- */
let halloweenAmbienceTimer = null;

function setupHalloweenDecor(seasonId) {
  document.querySelectorAll(".halloween-web, .halloween-spider").forEach(el => el.remove());
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

  const spider = document.createElement("div");
  spider.className = "halloween-spider";
  spider.style.right = "60px";
  spider.innerHTML = `<div class="thread"></div><div class="spider">🕷️</div>`;
  document.body.appendChild(spider);

  halloweenAmbienceTimer = setInterval(() => {
    const inGame = document.getElementById("screen-game") && document.getElementById("screen-game").style.display === "block";
    if (inGame) return;
    const roll = Math.random();
    if (roll < 0.45) spawnAmbientGhost();
    else if (roll < 0.75) spawnAmbientLantern();
    else spawnAmbientBat();
  }, 2600);
}

function spawnAmbientGhost() {
  const orb = document.createElement("div");
  orb.className = "ghost-orb";
  const size = 50 + Math.random() * 40;
  orb.style.width = size + "px";
  orb.style.height = size + "px";
  orb.style.left = (Math.random() * 80 + 10) + "%";
  orb.style.top = (Math.random() * 70 + 15) + "%";
  orb.style.animationDuration = (3.5 + Math.random() * 1.5) + "s";
  orb.innerHTML = `
    <div class="ghost-orb-body">
      <div class="ghost-orb-face">
        <div class="ghost-orb-eye left"></div>
        <div class="ghost-orb-eye right"></div>
        <div class="ghost-orb-mouth"></div>
      </div>
    </div>`;
  document.body.appendChild(orb);
  setTimeout(() => orb.remove(), 5200);
}

function spawnAmbientLantern() {
  if (typeof createLantern !== "function") return;
  createLantern();
  const lans = document.querySelectorAll(".lantern");
  const last = lans[lans.length - 1];
  if (last) last.classList.add("possessed");
}

function spawnAmbientBat() {
  const fx = document.getElementById("bg-fx");
  if (!fx) return;
  const colors = ["#7be8ff", "#ffe600", "#ff007f", "#00ff88"];
  const s = document.createElement("div");
  s.className = "bg-shape";
  s.innerText = "🦇";
  s.style.fontSize = (16 + Math.random() * 18) + "px";
  s.style.left = Math.random() * 100 + "%";
  s.color = colors[Math.floor(Math.random() * colors.length)];
  s.style.animationDuration = (7 + Math.random() * 6) + "s";
  fx.appendChild(s);
  setTimeout(() => s.remove(), 14000);
}
}

/* ============================================================
APPLICATION AUTOMATIQUE
============================================================ */

// Au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof initMenuBackgroundFX === "function") initMenuBackgroundFX();
    applySeasonDA();
  }, 100);
});

// Quand le profil joueur est reçu / mis à jour
if (typeof socket !== "undefined") {
  socket.on("player_registered", () => {
    setTimeout(() => {
      applySeasonDA();
    }, 50);
  });

  // Si ton admin envoie un événement de saison, ça permet de réagir aussi
  socket.on("season_updated", (data) => {
    if (data && data.seasonId) {
      window.CURRENT_SEASON = data.seasonId;
      if (typeof myProfile !== "undefined" && myProfile) {
        myProfile.currentSeasonId = data.seasonId;
      }
    }

    setTimeout(() => {
      applySeasonDA();
    }, 50);
  });
}
/* ============================================================
FX 🎃 LANTERNES (grille Citrouille) — lanternes 3D + drone angoissant
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
    // 📱 MOBILE : corps + visage seulement (zéro halo, zéro étincelle)
    orb.innerHTML = `
      <div class="ghost-orb-body">
        <div class="ghost-orb-face">
          <div class="ghost-orb-eye left"></div>
          <div class="ghost-orb-eye right"></div>
          <div class="ghost-orb-mouth"></div>
        </div>
      </div>`;
  } else {
    // 💻 PC : version complète
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
