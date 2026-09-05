/* ============================================================
TOUR.JS — TOUR BLITZ (affichage + animations)
============================================================ */
const TOWER_CHAPTERS = [
  { id:1, season:1, name:"Quartier Néon", icon:"🌆", grad:["#00d2ff","#0f1a2e"], boss:"🤖", objects:["💡","️","📺","","🎛️","🖥️","📻","☎️","🌃"] },
  { id:2, season:1, name:"Grottes de Cristal", icon:"🧊", grad:["#74ebf5","#123"], boss:"🗿", objects:["🕯️","🔮","💎","⛏️","","❄️","🫧","🌀","🧊"] },
  { id:3, season:1, name:"Circuit Doré", icon:"⚡", grad:["#f8b500","#2b1a00"], boss:"👾", objects:["⚙️","🔋","📀","","🔶","","⚡","🔩","🏅"] },
  { id:4, season:2, name:"Tour Hantée", icon:"🎃", grad:["#ff8a00","#1a002b"], boss:"🧛", objects:["🕸️","🎃","️","🦇","️","","🐈⬛","🔮","🪦"] },
  { id:5, season:2, name:"Cimetière Brumeux", icon:"🌫️", grad:["#8a9bb0","#0d0d1a"], boss:"💀", objects:["🪦","🌫️","🕯️","🦴","🌙","🕷️","⚰️","🥀","️"] },
  { id:6, season:2, name:"Antre Citrouille", icon:"👑", grad:["#ff4b2b","#20000b"], boss:"🎃", objects:["🎃","","🕯️","🦇","","🍬","🕸️","🌙","🏆"] },
  { id:7, season:3, name:"Cime Bonbon", icon:"🍭", grad:["#ff6fa5","#2b0016"], boss:"🧝", objects:["🍭","","🧁","🎀","🍪","🥐","🍰","🍩","🎂"] },
  { id:8, season:3, name:"Forêt de Sapins", icon:"🎄", grad:["#2ecc71","#001a0d"], boss:"⛄", objects:["🎄","🎁","❄️","🔔","🕯️","⭐","🧦","🍪","🛷"] },
  { id:9, season:3, name:"Atelier du Père Noël", icon:"🎅", grad:["#ff416c","#1a0008"], boss:"🎅", objects:["🎅","","🛷","🦌","🎁","🔥","🧸","","🌟"] }
];

let towerProgress = { floor: 0, stars: {} };

function getTowerChapter(floor) { return TOWER_CHAPTERS[Math.ceil(floor / 10) - 1]; }
function currentSeasonNum() { return parseInt((myProfile.currentSeasonId || "s1").replace("s", "")) || 1; }

function getFloorDef(floor) {
  const chap = Math.ceil(floor / 10);
  const inChap = ((floor - 1) % 10) + 1;
  const gridSize = 16 + (chap - 1) * 4;
  const base = { floor, gridSize, time: Math.max(18, 32 - chap * 2) };
  if (inChap === 10) return { ...base, type: "boss" };
  const types = { 1:"classic", 2:"reverse", 3:"random", 4:"calc+", 5:"sprint", 6:"calc-", 7:"memory", 8:"fog", 9:"nofail" };
  const t = types[inChap];
  if (t === "sprint") return { ...base, type: "sprint", time: Math.max(8, 14 - chap) };
  if (t === "nofail") return { ...base, type: "nofail", time: 25 };
  return { ...base, type: t };
}

/* ----- CSS injecté (DA néon) ----- */
(function injectTowerCSS() {
  const css = `
  #modal-tower .tw-scroll{width:100%;max-height:80vh;overflow-y:auto;padding:10px 4px;}
  .tw-room{position:relative;border:2px solid rgba(0,210,255,.35);border-radius:10px;margin:6px auto;width:92%;min-height:64px;display:flex;align-items:center;gap:8px;padding:6px 10px;background:linear-gradient(90deg,var(--g1),var(--g2));overflow:hidden;}
  .tw-room.tw-boss{min-height:96px;border-color:#f8b500;}
  .tw-room.tw-won{border-color:#00ff88;}
  .tw-room.tw-current{border-color:#00d2ff;box-shadow:0 0 14px rgba(0,210,255,.6);}
  .tw-room.tw-locked{opacity:.35;filter:grayscale(1);}
  .tw-num{font-weight:900;color:#fff;font-size:12px;min-width:34px;text-shadow:0 0 6px #00d2ff;}
  .tw-obj{font-size:20px;margin:0 3px;display:inline-block;}
  .tw-obj.a0{animation:twFloat 2.2s ease-in-out infinite;}
  .tw-obj.a1{animation:twGlow 1.6s ease-in-out infinite;}
  .tw-obj.a2{animation:twFlick 1.1s steps(2) infinite;}
  @keyframes twFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes twGlow{0%,100%{filter:drop-shadow(0 0 2px #fff)}50%{filter:drop-shadow(0 0 8px #00d2ff)}}
  @keyframes twFlick{50%{opacity:.4}}
  .tw-obj.pop{animation:twPop .5s ease;}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  .tw-here{position:absolute;right:8px;top:4px;font-size:9px;color:#00d2ff;font-weight:bold;animation:twFlick 1s steps(2) infinite;}
  .tw-avatar{animation:twFloat 1.4s ease-in-out infinite;}
  .tw-play{margin-left:auto;background:linear-gradient(45deg,#00d2ff,#0066ff);border:none;color:#fff;font-weight:900;border-radius:8px;padding:8px 12px;font-size:11px;}
  .tw-doors{position:fixed;inset:0;z-index:10002;pointer-events:none;display:flex;}
  .tw-door{width:50%;height:100%;background:linear-gradient(180deg,#0f1a2e,#000);border-right:2px solid #00d2ff;transition:transform .8s ease;}
  .tw-door.r{border-right:none;border-left:2px solid #00d2ff;}
  .tw-doors.open .tw-door{transform:translateX(-100%);}
  .tw-doors.open .tw-door.r{transform:translateX(100%);}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
  `;
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
})();

/* ----- Ouverture + portes ----- */
function openTower() {
  let m = document.getElementById("modal-tower");
  if (!m) {
    m = document.createElement("div");
    m.id = "modal-tower";
    m.className = "modal-overlay";
    m.innerHTML = `<div class="modal-card" style="max-width:420px;width:95%;">
      <h3 style="color:#00d2ff;text-align:center;margin:0 0 6px 0;">🗼 TOUR BLITZ</h3>
      <div id="tower-sub" style="text-align:center;font-size:10px;color:#aaa;margin-bottom:6px;"></div>
      <div class="tw-scroll" id="tower-rooms"></div>
      <button class="btn-secondary" onclick="closeTower()">Fermer</button>
    </div>`;
    document.body.appendChild(m);
  }
  m.style.display = "flex";
  socket.emit("get_tower");

  // 🚪 Animation d'entrée
  const doors = document.createElement("div");
  doors.className = "tw-doors";
  doors.innerHTML = `<div class="tw-door"></div><div class="tw-door r"></div>`;
  document.body.appendChild(doors);
  setTimeout(() => doors.classList.add("open"), 150);
  setTimeout(() => doors.remove(), 1100);
  towerDing();
}
function closeTower() { document.getElementById("modal-tower").style.display = "none"; }

function towerDing() {
  try {
    SoundEngine.init();
    const t = SoundEngine.ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = SoundEngine.ctx.createOscillator(), g = SoundEngine.ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.08, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.25);
      o.connect(g); g.connect(SoundEngine.ctx.destination);
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.25);
    });
  } catch (e) {}
}

/* ----- Rendu de la tour ----- */
socket.on("tower_data", (d) => {
  towerProgress = { floor: d.floor || 0, stars: d.stars || {} };
  renderTower();
});

function renderTower() {
  const box = document.getElementById("tower-rooms");
  if (!box) return;
  const season = currentSeasonNum();
  const current = towerProgress.floor + 1;
  box.innerHTML = "";
  document.getElementById("tower-sub").innerText =
    (currentLang === "fr" ? "Étage actuel : " : "Current floor: ") + Math.min(current, 90) + " / 90";

  // Du haut (90) vers le bas (1)
  for (let f = 90; f >= 1; f--) {
    const chap = getTowerChapter(f);
    if (chap.season > season) {
      if (f === chap.id * 10) { // 1 bloc verrouillé par chapitre
        const lock = document.createElement("div");
        lock.className = "tw-room tw-locked";
        lock.innerHTML = `<span class="tw-num">🔒</span><b style="color:#aaa;font-size:11px;">${chap.icon} ${chap.name} — Saison S${chap.season}</b>`;
        box.appendChild(lock);
      }
      continue;
    }
    const inChap = ((f - 1) % 10) + 1;
    const isBoss = inChap === 10;
    const won = f <= towerProgress.floor;
    const isCurrent = f === current;
    const room = document.createElement("div");
    room.className = "tw-room" + (isBoss ? " tw-boss" : "") + (won ? " tw-won" : "") + (isCurrent ? " tw-current" : "");
    room.style.setProperty("--g1", chap.grad[0] + "33");
    room.style.setProperty("--g2", chap.grad[1]);
    room.id = "tw-room-" + f;

    let inner = `<span class="tw-num">É${f}</span>`;

    if (isBoss) {
      const wonInChap = Math.min(9, Math.max(0, towerProgress.floor - (chap.id - 1) * 10));
      let objs = "";
      for (let i = 0; i < wonInChap; i++) objs += `<span class="tw-obj a${i % 3}">${chap.objects[i]}</span>`;
      const awake = wonInChap >= 9;
      inner += `<div style="flex:1;text-align:center;">${objs}<div style="font-size:26px;${awake ? "filter:drop-shadow(0 0 10px #ff4b2b);" : "opacity:.5;"}">${chap.boss}</div>
        <div style="font-size:9px;color:${awake ? "#ff4b2b" : "#aaa"};font-weight:bold;">${awake ? "⚠️ GARDIEN RÉVEILLÉ" : "😴 " + wonInChap + "/9 objets"}</div></div>`;
      if (isCurrent && awake) inner += `<button class="tw-play" onclick="startTowerFloor(getFloorDef(${f}))">⚔️ DÉFIER</button>`;
    } else {
      if (won) {
        const st = towerProgress.stars[String(f)] || 1;
        inner += `<span class="tw-obj a${(f % 3)}">${chap.objects[inChap - 1]}</span><span style="font-size:9px;color:#f8b500;">${"⭐".repeat(st)}</span>`;
      } else if (isCurrent) {
        inner += `<span class="tw-here">▶ TU ES ICI</span><span class="tw-avatar" style="font-size:20px;">🧍</span>
          <button class="tw-play" onclick="startTowerFloor(getFloorDef(${f}))">▶ ${typeLabel(getFloorDef(f).type)}</button>`;
      } else {
        inner += `<span style="font-size:11px;color:#666;">${typeLabel(getFloorDef(f).type)}</span>`;
      }
    }
    room.innerHTML = inner;
    box.appendChild(room);
  }
  // Scroll vers l'étage actuel
  setTimeout(() => {
    const el = document.getElementById("tw-room-" + Math.min(current, 90));
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 300);
}

function typeLabel(t) {
  const fr = currentLang === "fr";
  return ({
    classic: fr ? "⚡ Croissant" : " Ascending",
    reverse: fr ? "🔽 Décroissant" : "🔽 Descending",
    random: fr ? "🎲 Chaos" : "🎲 Chaos",
    "calc+": fr ? "🧮 Addition" : "🧮 Addition",
    "calc-": fr ? "🧮 Soustraction" : "🧮 Subtraction",
    sprint: fr ? "⏱️ Sprint" : "⏱️ Sprint",
    memory: fr ? "🙈 Mémoire" : "🙈 Memory",
    fog: fr ? "🌫️ Brouillard" : "🌫️ Fog",
    nofail: fr ? "💎 Sans faute" : "💎 No mistake",
    boss: fr ? "⚔️ GARDIEN" : "⚔️ GUARDIAN"
  })[t] || t;
}

/* ----- Résultat d'étage (appelé par le moteur) ----- */
socket.on("tower_result", (res) => {
  if (!res.ok) return;
  towerProgress.floor = res.floor;
  towerProgress.stars[String(res.floor)] = res.stars;
  showTowerWinPopup(res);
  renderTower();
});

function showTowerWinPopup(res) {
  const chap = getTowerChapter(res.floor);
  const obj = res.floor % 10 === 0 ? chap.boss : chap.objects[((res.floor - 1) % 10)];
  const d = document.createElement("div");
  d.className = "modal-overlay";
  d.style.display = "flex";
  d.innerHTML = `<div class="modal-card" style="max-width:300px;text-align:center;">
    <h3 style="color:#00ff88;margin:0 0 6px 0;">✅ ÉTAGE ${res.floor} VAINCU !</h3>
    <div class="tw-stars">${[1,2,3].map(i => `<span style="animation-delay:${i*0.2}s;${i<=res.stars?"":"filter:grayscale(1);opacity:.3;"}">⭐</span>`).join("")}</div>
    <div style="font-size:13px;color:#f8b500;font-weight:bold;margin-bottom:6px;">+${res.coins} 🪙</div>
    <div style="font-size:12px;color:#aaa;margin-bottom:10px;">${currentLang==="fr"?"Nouvel objet placé dans la pièce :":"New object placed in the room:"} <span class="tw-obj pop" style="font-size:24px;">${obj}</span></div>
    ${res.reward ? `<div style="font-size:12px;color:#00d2ff;font-weight:bold;margin-bottom:10px;">🎁 CHAPITRE TERMINÉ : ${res.reward} débloqué !</div>` : ""}
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove()">Continuer ⚡</button>
  </div>`;
  document.body.appendChild(d);
  towerDing();
}

/* ⚙️ Le moteur des étages (startTowerFloor) arrive à la prochaine étape */
function startTowerFloor(def) { /* étape 3 */ }
