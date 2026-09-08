/* ============================================================
TOUR.JS — MODE AVENTURE OPTIMISÉ
============================================================ */

/* ----- 1. CONFIGURATION ----- */
const TOWER_CHAPTERS = [
  { id:1, season:1, name:"Quartier Néon", icon:"🌆", boss:"🤖", objects:["💡","⚡","📺","🔌","🎛️","🖥️","","💾",""] },
  { id:2, season:1, name:"Grottes de Cristal", icon:"🧊", boss:"🗿", objects:["🕯️","🔮","💎","⛏️","","❄️","🫧","🌀","🧊"] },
  { id:3, season:1, name:"Banque Dorée", icon:"🏦", boss:"👾", objects:["🪙","💰","💵","💳","","🔐","💎","🏅","📜"] },
  { id:4, season:2, name:"Tour Hantée", icon:"🎃", boss:"🧛", objects:["🕸️","🎃","🕯️","🦇","","👻","‍⬛","","⚰️"] },
  { id:5, season:2, name:"Cimetière Brumeux", icon:"🌫️", boss:"💀", objects:["🪦","🌫️","️","️","🌙","️","💀","","🖤"] },
  { id:6, season:2, name:"Antre Citrouille", icon:"👑", boss:"🎃", objects:["🎃","🍬","🔮","","🧹","","🕸️","","🏆"] },
  { id:7, season:3, name:"Cime Bonbon", icon:"🍭", boss:"🧝", objects:["🍭","","🎀","","🧁","🥐","🍰","🍩","🍫"] },
  { id:8, season:3, name:"Forêt de Sapins", icon:"🎄", boss:"⛄", objects:["🎄","","❄️","","🕯️","⭐","🧦","","🦌"] },
  { id:9, season:3, name:"Atelier du Père Noël", icon:"🎅", boss:"🎅", objects:["🎅","","🧝","","🔥","","⛄","","🍪"] }
];
const FPC = 200;
const TOTAL_FLOORS = 9 * FPC;
const STEP = 48;
const WORLD_QUOTA = 240;
const IS_MOBILE = /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
const TOWER_COLORS = {1:{acc:"#00d2ff"},2:{acc:"#74ebf5"},3:{acc:"#f8b500"},4:{acc:"#ff8a00"},5:{acc:"#8a9bb0"},6:{acc:"#ff4b2b"},7:{acc:"#ff6fa5"},8:{acc:"#2ecc71"},9:{acc:"#ff416c"}};
const TOWER_WORLDS = {
  1:{bg:"linear-gradient(180deg,#050514,#0a0a2a 55%,#1a1030)",scene:"city",part:"neon"},
  2:{bg:"linear-gradient(180deg,#062028,#0a2a3a 50%,#123a4a)",scene:"glacier",part:"snow"},
  3:{bg:"linear-gradient(180deg,#160d00,#2b1a00 60%,#3a2a05)",scene:"vault",part:"spark"},
  4:{bg:"radial-gradient(ellipse at 30% 10%,#ff8a0022,transparent 45%),linear-gradient(180deg,#12041a,#2a0a33)",scene:"glacier",part:"snow"},
  5:{bg:"linear-gradient(180deg,#0a0d14,#1a2230)",scene:"glacier",part:"snow"},
  6:{bg:"radial-gradient(ellipse at 50% 10%,#ff4b2b22,transparent 50%),linear-gradient(180deg,#18040a,#330a12)",scene:"vault",part:"spark"},
  7:{bg:"radial-gradient(ellipse at 50% 10%,#ff6fa522,transparent 50%),linear-gradient(180deg,#180410,#330a20)",scene:"glacier",part:"snow"},
  8:{bg:"radial-gradient(ellipse at 50% 10%,#2ecc7122,transparent 50%),linear-gradient(180deg,#04180b,#0a3318)",scene:"glacier",part:"snow"},
  9:{bg:"radial-gradient(ellipse at 50% 10%,#ff416c22,transparent 50%),linear-gradient(180deg,#180404,#330a0a)",scene:"vault",part:"spark"}
};

/* ----- 2. ÉTAT GLOBAL ----- */
let towerProgress = { floor: 0, stars: {} };
let TW = null, TW_dom = null, TW_buttons = [], TW_lastFloor = 0;
let TW_hudCache = "", TW_localTimer = null, TW_lastClick = 0, TW_pairsLock = false;
let TW_nodesRaf = null;
const SCENE_CACHE = {};

/* ----- 3. UTILITAIRES ----- */
const TowerUtils = {
  starsInWorld(w) {
    let s = 0;
    const start = (w - 1) * FPC + 1, end = w * FPC;
    for (let f = start; f <= end; f++) s += towerProgress.stars[String(f)] || 0;
    return s;
  },
  worldUnlockedByStars(w) {
    if (w <= 1) return true;
    for (let x = 2; x <= w; x++) {
      if (this.starsInWorld(x - 1) < WORLD_QUOTA) return false;
    }
    return true;
  },
  getTowerChapter(f) { return TOWER_CHAPTERS[Math.ceil(f / FPC) - 1]; },
  currentSeasonNum() { return parseInt((myProfile.currentSeasonId || "s1").replace("s", "")) || 1; },
  getFloorDef(floor) {
    const chap = Math.ceil(floor / FPC), inChap = ((floor - 1) % FPC) + 1;
    const global = (floor - 1) / (TOTAL_FLOORS - 1);
    let gridSize = Math.min(48, Math.round(16 + global * 32));
    let time = Math.max(12, Math.round(28 - global * 16));
    if (inChap === FPC) return { floor, gridSize, time, type: "boss" };
    if (inChap % 50 === 0) return { floor, gridSize, time, type: "boss" };
    const seq = ["classic","reverse","color","pairs","sprint","parity","forbidden","fog","nofail"];
    const t = seq[(inChap - 1) % 9];
    if (t === "sprint") return { floor, gridSize, time: Math.max(6, Math.round(time * 0.4)), type: "sprint" };
    if (t === "nofail") return { floor, gridSize, time: Math.max(14, Math.round(time * 0.7)), type: "nofail" };
    if (t === "pairs") { let g = gridSize + 8; if (g % 2) g++; const pr = g / 2; return { floor, gridSize: g, time: Math.max(20, Math.round(pr * 3)), type: "pairs" }; }
    if (t === "parity") return { floor, gridSize: Math.min(60, gridSize + 12), time: time + 3, type: "parity" };
    return { floor, gridSize, time, type: t };
  },
  typeLabel(t) {
    const fr = currentLang === "fr";
    return ({classic:fr?"⚡ Croissant":"⚡ Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",random:fr?"🎲 Chaos":" Chaos",color:fr?"🎨 Couleurs":"🎨 Colors",pairs:fr?"🧩 Paires":"🧩 Pairs",parity:fr?"🔢 Pair / Impair":"🔢 Even / Odd",forbidden:fr?"🚫 Interdit":"🚫 Forbidden","calc+":fr?"🧮 Addition":"🧮 Addition","calc-":fr?"🧮 Soustraction":"🧮 Subtraction",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",memory:fr?"🙈 Mémoire":"🙈 Memory",fog:fr?"🌫️ Brouillard":"🌫️ Fog",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t] || t;
  },
  twDesc(t) {
    const fr = currentLang === "fr";
    return ({classic:fr?"Monte les nombres dans l'ordre croissant, le plus vite possible !":"Climb the numbers in ascending order, as fast as you can!",reverse:fr?"Cette fois on descend ! Clique du plus grand au plus petit.":"This time we go down! Click from biggest to smallest.",random:fr?"La cible change au hasard : reste concentré !":"The target changes randomly: stay focused!",color:fr?"Clique toutes les cases de la couleur demandée.":"Click all tiles matching the requested color.",pairs:fr?"Retrouve les paires cachées. Mémorise bien les symboles !":"Find the hidden pairs. Memorize the symbols!",parity:fr?"Clique UNIQUEMENT les nombres demandés (pairs OU impairs).":"Click ONLY the requested numbers (even OR odd).",forbidden:fr?"Clique tous les nombres SAUF le nombre interdit.":"Click all numbers EXCEPT the forbidden one.","calc+":fr?"Clique sur les DEUX cases dont la SOMME donne la cible.":"Click the TWO tiles whose SUM equals the target.","calc-":fr?"Clique sur les DEUX cases dont la DIFFÉRENCE donne la cible.":"Click the TWO tiles whose DIFFERENCE equals the target.",sprint:fr?"Le temps est minuscule : vitesse pure !":"Tiny time limit: pure speed!",memory:fr?"Mémorise les nombres... ils seront cachés après 2 secondes !":"Memorize the numbers... they hide after 2 seconds!",fog:fr?"Le brouillard fait clignoter les nombres !":"Fog makes numbers blink!",nofail:fr?"UNE seule erreur et l'étage est raté. Concentration maximale.":"ONE single mistake and the floor fails. Max focus.",boss:fr?"Le Gardien grimpe en même temps que toi. Finis AVANT lui !":"The Guardian climbs with you. Finish BEFORE him!"})[t] || "";
  }
};

/* ----- 4. CSS CONSOLIDÉ (un seul bloc complet) ----- */
(function() {
  const style = document.createElement('style');
  style.textContent = `
  /* === LAYOUT === */
  #screen-tower{position:fixed;inset:0;background:#000;z-index:9990;display:none;flex-direction:column;}
  .tw-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;z-index:6;}
  .tw-header b{color:#00d2ff;font-size:15px;flex:1;text-align:center;}
  .tw-header .tw-back{background:#1a1a2e;border:1px solid #00d2ff;color:#00d2ff;border-radius:8px;padding:6px 10px;font-size:12px;}
  .tw-mapwrap{flex:1;overflow-y:auto;position:relative;}
  .tw-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 50%,#000000c9 100%);z-index:4;}
  .tw-map{position:relative;width:100%;}
  .tw-zone{position:absolute;left:0;right:0;overflow:hidden;}
  .tw-col{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,560px);}

  /* === NODES === */
  .tw-node{position:absolute;width:clamp(40px,12vw,50px);height:clamp(40px,12vw,50px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(14px,4vw,17px);color:#fff;text-shadow:0 1px 2px #000a;transform:translate(-50%,0);border:3px solid #333;background:#1a1a2e;z-index:2;}
  .tw-node.won{border-color:#ffffff44;box-shadow:0 3px 0 #00000066;}
  .tw-node.cur{background:radial-gradient(circle at 35% 30%,#a8f0ff,#00d2ff 60%,#0066aa)!important;border-color:#fff;animation:twPulse 1s infinite;cursor:pointer;}
  .tw-node.lock{opacity:.35;}
  .tw-node.boss{width:clamp(50px,15vw,62px);height:clamp(50px,15vw,62px);font-size:clamp(22px,6vw,28px);}
  .tw-node .tw-st{position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);font-size:clamp(7px,2.2vw,9px);color:#f8b500;white-space:nowrap;}
  .tw-ava{position:absolute;top:-27px;left:50%;transform:translateX(-50%);font-size:clamp(16px,5vw,20px);animation:twBounce2 1.2s infinite;}
  .tw-gate{position:absolute;background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:5px 14px;font-size:clamp(9px,2.8vw,11px);font-weight:900;color:#00d2ff;white-space:nowrap;z-index:3;box-shadow:0 0 12px #00d2ff44;}
  .tw-gate.lock{border-color:#333;color:#666;box-shadow:none;}
  .tw-quota{position:absolute;background:#0f051dee;border:2px solid #f8b500;border-radius:14px;padding:9px 18px;z-index:3;text-align:center;box-shadow:0 0 16px #f8b50044;min-width:220px;}
  .tw-quota-label{font-size:clamp(10px,3vw,13px);font-weight:900;color:#f8b500;margin-bottom:6px;white-space:nowrap;}
  .tw-quota-bar{height:9px;background:#200010;border-radius:5px;overflow:hidden;}
  .tw-quota-bar div{height:100%;background:linear-gradient(90deg,#f8b500,#ffd700);border-radius:5px;box-shadow:0 0 8px #f8b50088;}

  /* === CITY SCENE === */
  .tw-moon{position:absolute;top:2%;right:10%;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff8e8,#d8c9a8 60%,#a89878);box-shadow:0 0 30px #fff8e866,0 0 80px #fff8e833;}
  .tw-star2{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:twFlickP 3s steps(2) infinite;}
  .tw-cloud{position:absolute;height:10px;border-radius:6px;background:linear-gradient(90deg,transparent,#8888aa22 30%,#8888aa22 70%,transparent);filter:blur(3px);animation:twCloud linear infinite;}
  .tw-horizon{position:absolute;bottom:180px;left:0;right:0;height:200px;background:radial-gradient(ellipse at 50% 100%,#ff00ff33,transparent 70%),radial-gradient(ellipse at 30% 100%,#00ffff2b,transparent 60%);}
  .tw-cityback{position:absolute;bottom:180px;left:0;right:0;height:600px;display:flex;align-items:flex-end;gap:2%;padding:0 1%;opacity:.45;filter:brightness(.5);}
  .tw-cityback .tw-bldg{border-top:none;}
  .tw-city{position:absolute;bottom:180px;left:0;right:0;height:480px;display:flex;align-items:flex-end;gap:3%;padding:0 2%;}
  .tw-bldg{flex:1;position:relative;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;box-shadow:0 0 12px #000;border-top:2px solid #00d2ff44;}
  .tw-ant{position:absolute;top:-14px;left:50%;width:2px;height:14px;background:#333;box-shadow:0 -3px 6px #ff4b2b;}
  .tw-wl{position:absolute;width:7px;height:9px;background:currentColor;box-shadow:0 0 8px currentColor,0 0 16px currentColor;animation:twWin linear infinite;}
  .tw-road{position:absolute;bottom:0;left:0;right:0;height:180px;background:linear-gradient(180deg,#23232e,#101016 30%,#0a0a0e);box-shadow:inset 0 4px 10px #000c;}
  .tw-lane{position:absolute;left:0;right:0;top:50%;height:3px;background:repeating-linear-gradient(90deg,#f8b50088 0 34px,transparent 34px 70px);opacity:.7;}
  .tw-reflect{position:absolute;left:0;right:0;bottom:0;height:180px;background:linear-gradient(90deg,#ff00ff22,#00ffff22,#f8b50022,#ff00ff22);background-size:300% 100%;filter:blur(7px);animation:twSlide 6s linear infinite;pointer-events:none;opacity:.45;}
  .tw-car{position:absolute;width:54px;height:16px;z-index:3;animation:twDrive linear infinite;}
  .tw-car i{position:absolute;display:block;}
  .tw-car .cb{bottom:3px;left:0;right:0;height:9px;border-radius:8px 14px 6px 6px;background:linear-gradient(180deg,#3d3d52,#12121c 70%);box-shadow:inset 0 1px 0 #ffffff55,0 0 10px #00d2ff44;}
  .tw-car .cc{bottom:10px;left:12px;width:26px;height:8px;border-radius:8px 10px 0 0;background:linear-gradient(180deg,#2a2a3a,#151520);box-shadow:inset 0 1px 0 #ffffff33;}
  .tw-car .cc::after{content:"";position:absolute;inset:2px 3px 1px 3px;background:linear-gradient(180deg,#7ff4ff88,#20405066);border-radius:3px;}
  .tw-car .ug{position:absolute;bottom:-3px;left:6%;right:6%;height:4px;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor,0 0 20px currentColor;opacity:.9;}
  .tw-car .w1,.tw-car .w2{bottom:0;width:9px;height:9px;border-radius:50%;background:radial-gradient(#666 25%,#111 60%);box-shadow:0 1px 2px #000;display:none;}
  .tw-car .hl{right:-32px;bottom:5px;width:34px;height:5px;background:linear-gradient(90deg,#bffcffcc,transparent);filter:blur(2px);}
  .tw-car .tl{left:-4px;bottom:6px;width:7px;height:5px;background:radial-gradient(closest-side,#ff2bd6,transparent);box-shadow:0 0 8px #ff2bd6;}
  .tw-car.r{animation-name:twDriveR;transform:scaleX(-1);}
  .tw-car.s{transform:scale(.8);transform-origin:bottom left;}
  .tw-car.s.r{transform:scale(.8) scaleX(-1);}
  .tw-bldg-solo{position:absolute;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;border-top:2px solid #00d2ff44;box-shadow:0 0 12px #000;}
  .tw-blimp{position:absolute;width:120px;height:44px;border-radius:50%;background:linear-gradient(180deg,#3a3a52,#14141f);box-shadow:0 0 20px #00d2ff44,inset 0 2px 6px #ffffff22;animation:twBlimp linear infinite;}
  .tw-blimp::after{content:"";position:absolute;left:50%;top:100%;transform:translateX(-50%);width:26px;height:12px;border-radius:4px;background:#1a1a28;box-shadow:0 2px 4px #000;}
  .tw-blimp .neo{position:absolute;left:12%;right:12%;top:38%;height:6px;border-radius:3px;background:currentColor;box-shadow:0 0 10px currentColor;animation:twFlickP 2s steps(2) infinite;}
  .tw-plane{position:absolute;width:34px;height:8px;background:linear-gradient(90deg,transparent,#bffcffcc 60%,#fff);border-radius:4px;filter:blur(1px);animation:twPlaneX linear infinite;}
  .tw-shoot{position:absolute;width:90px;height:2px;background:linear-gradient(90deg,#fff,transparent);transform:rotate(-30deg);opacity:0;animation:twShoot 7s linear infinite;}

  /* === GLACIER SCENE === */
  .tw-cavewall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#74ebf518 0%,#0a2a3a66 35%,#000000ee 78%);}
  .tw-gceil{position:absolute;top:0;left:0;right:0;height:200px;background:linear-gradient(0deg,#0a2a3a,#04141d);}
  .tw-gfloor{position:absolute;bottom:0;left:0;right:0;height:200px;background:linear-gradient(180deg,#0a2a3a,#04141d);box-shadow:inset 0 8px 20px #74ebf533;}
  .tw-stalac{position:absolute;top:0;width:44px;background:linear-gradient(180deg,#04141d,#74ebf5 60%,#e8fbff);clip-path:polygon(48% 100%,52% 100%,62% 60%,72% 30%,100% 0,0 0,28% 30%,38% 60%);filter:drop-shadow(0 0 10px #74ebf5cc);}
  .tw-stalag{position:absolute;bottom:0;width:44px;background:linear-gradient(0deg,#5a8ea0aa,#bfefffcc 55%,#ffffff);clip-path:polygon(48% 0,52% 0,62% 30%,72% 60%,100% 100%,0 100%,28% 60%,38% 30%);filter:drop-shadow(0 0 10px #74ebf5cc);}
  .tw-gwall{position:absolute;top:0;bottom:0;width:12%;background:linear-gradient(90deg,#04141d,#0a2a3a);clip-path:polygon(0 0,100% 3%,70% 8%,100% 14%,75% 22%,100% 30%,70% 38%,100% 46%,75% 55%,100% 63%,70% 72%,100% 80%,75% 88%,100% 95%,70% 100%,0 100%);}
  .tw-gwall.r{left:auto;right:0;background:linear-gradient(270deg,#04141d,#0a2a3a);clip-path:polygon(100% 0,0 3%,30% 8%,0 14%,25% 22%,0 30%,30% 38%,0 46%,25% 55%,0 63%,30% 72%,0 80%,25% 88%,0 95%,30% 100%,100% 100%);}
  .tw-gem{position:absolute;width:9px;height:9px;background:#74ebf5;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 10px #74ebf5,0 0 18px #74ebf588;animation:twGlowC 2s infinite;}
  .tw-shelf{position:absolute;width:24%;height:130px;}
  .tw-shelf .rock{position:absolute;bottom:0;left:0;right:0;height:26px;background:linear-gradient(180deg,#123a4a,#04141d);clip-path:polygon(0 0,100% 25%,88% 100%,0 100%);}
  .tw-shelf.r{transform:scaleX(-1);}
  .tw-shelf .tw-cryscl{position:absolute;bottom:18px;left:22%;width:80px;height:100px;}
  .tw-cryscl{position:absolute;width:90px;height:120px;filter:drop-shadow(0 0 22px #74ebf5cc);animation:twGlowC 2.6s infinite;}
  .tw-cryscl .c{position:absolute;bottom:0;background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f4feff,#8ff2ff 45%,#2a8ba8 80%,#14506a);clip-path:polygon(50% 0,76% 12%,90% 62%,70% 100%,30% 100%,10% 62%,24% 12%);}
  .tw-cryscl .c::before{content:"";position:absolute;left:50%;top:6%;width:2px;height:80%;background:linear-gradient(#ffffffcc,transparent);}
  .tw-cryscl .c1{left:30%;width:40%;height:100%;}
  .tw-cryscl .c2{left:0;width:30%;height:62%;transform:rotate(-14deg);}
  .tw-cryscl .c3{right:0;width:30%;height:70%;transform:rotate(12deg);}
  .tw-cryscl.pink .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#fff0f8,#ff8ac2 45%,#a82a6a 80%,#50143a);}
  .tw-cryscl.gold .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#fff8e0,#ffd75e 45%,#a8781a 80%,#503a0a);}
  .tw-cryscl.green .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f0fff0,#7dff8a 45%,#2a8b3a 80%,#145020);}
  .tw-cryscl.violet .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f8f0ff,#c28aff 45%,#6a2aa8 80%,#3a1450);}
  .tw-cryscl.tall{width:60px;height:150px;}
  .tw-cryscl.wide{width:110px;height:90px;}
  .tw-firefly{position:absolute;width:5px;height:5px;border-radius:50%;background:#bffcff;box-shadow:0 0 10px #74ebf5,0 0 20px #74ebf5;animation:twFly ease-in-out infinite;}

  /* === VAULT SCENE (v3 réaliste) === */
  .tw-marble{position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,#ffffff08 40% 42%,transparent 42%),linear-gradient(65deg,transparent 55%,#ffffff06 55% 57%,transparent 57%),linear-gradient(150deg,transparent 70%,#ffffff05 70% 71%,transparent 71%);}
  .tw-spot{position:absolute;top:0;width:16%;height:70%;background:linear-gradient(180deg,#ffe9a833,transparent 80%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);filter:blur(3px);animation:twGlowC 4s infinite;}
  .tw-pillar{position:absolute;top:0;bottom:0;width:8%;background:linear-gradient(90deg,#1a0f02,#5a4410 50%,#1a0f02);border-left:2px solid #8a6a1a44;border-right:2px solid #8a6a1a44;box-shadow:0 0 12px #000c;}
  .tw-vaultwall{position:absolute;left:0;right:0;top:30%;height:44%;background:linear-gradient(180deg,#4a4a40,#2a2a22 50%,#16160f);box-shadow:inset 0 12px 40px #000c,inset 0 -12px 40px #000c;}
  .tw-vaultopening{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:min(64%,400px);aspect-ratio:1;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 40%,#fff8dc 0%,#ffd700 25%,#b8860b 60%,#5a4410 100%);box-shadow:inset 0 0 50px #00000088,0 0 70px #f8b50077;border:10px solid #8a6a1a;z-index:2;}
  .tw-vaultbars{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 30px,#c9a227cc 30px 40px);box-shadow:inset 0 0 20px #0006;}
  .tw-vaultdooropen{position:absolute;left:3%;top:33%;width:min(50%,330px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 32%,#f0f0e8,#a8a89e 40%,#606058 72%,#2e2e28);box-shadow:0 14px 50px #000d,inset 0 0 40px #00000066,inset 0 4px 10px #ffffff44;transform:perspective(900px) rotateY(38deg);z-index:3;}
  .tw-vaultdooropen::before{content:"";position:absolute;inset:12%;border-radius:50%;background:radial-gradient(circle at 40% 35%,#d8d8d0,#808078 50%,#404038 80%);box-shadow:inset 0 0 20px #0008;}
  .tw-vaultdooropen::after{content:"";position:absolute;inset:36%;border-radius:50%;background:radial-gradient(circle at 40% 35%,#c0c0b8,#606058 60%,#303028);box-shadow:inset 0 2px 8px #ffffff44,0 2px 10px #0008;}
  .tw-doorspokes{position:absolute;inset:22%;}
  .tw-doorspokes i{position:absolute;left:50%;top:50%;width:48%;height:6px;margin-top:-3px;background:linear-gradient(90deg,#909088,#505048);transform-origin:left center;border-radius:3px;}
  .tw-bankgrille{position:absolute;left:0;right:0;height:150px;background:repeating-linear-gradient(90deg,#3a3a30 0 10px,transparent 10px 46px),linear-gradient(180deg,#5a5a50,#2a2a22);box-shadow:0 0 20px #000c,inset 0 0 20px #0008;}
  .tw-goldlogo{position:absolute;top:9%;left:50%;transform:translateX(-50%);font-size:clamp(28px,6vw,58px);font-weight:900;letter-spacing:8px;white-space:nowrap;background:linear-gradient(180deg,#fff8dc,#ffd700 30%,#b8860b 55%,#ffd700 78%,#fff8dc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;filter:drop-shadow(0 2px 0 #8a6a1a) drop-shadow(0 4px 0 #5a4410) drop-shadow(0 7px 10px #000);animation:twGlowC 3s infinite;}
  .tw-ingot{position:absolute;width:42px;height:14px;border-radius:3px;background:linear-gradient(180deg,#ffe9a8,#c9a227 50%,#8a6a1a);box-shadow:inset 0 1px 0 #fff8,0 2px 4px #000c;}
  .tw-laser{position:absolute;left:9%;right:9%;height:2px;background:linear-gradient(90deg,transparent,#ff2020 8%,#ff7070 50%,#ff2020 92%,transparent);box-shadow:0 0 8px #ff2020cc,0 0 20px #ff202066;opacity:.85;animation:twLaserV ease-in-out infinite alternate;z-index:1;}
  .tw-laser::before,.tw-laser::after{content:"";position:absolute;top:-3px;width:9px;height:9px;border-radius:2px;background:#1a0505;box-shadow:0 0 7px #ff2020,inset 0 0 3px #ff7070;animation:twFlickP 1.6s steps(2) infinite;}
  .tw-laser::before{left:-3px;}.tw-laser::after{right:-3px;}
  .tw-laser.d{animation-name:twLaserD;}
  .tw-cam{position:absolute;width:34px;height:24px;background:linear-gradient(180deg,#3a3a48,#14141c);border-radius:6px 6px 4px 4px;box-shadow:0 2px 6px #000;}
  .tw-cam::after{content:"";position:absolute;left:50%;top:60%;width:10px;height:10px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(#ff6060,#801010);box-shadow:0 0 10px #ff2020;animation:twFlickP 1.5s steps(2) infinite;}
  .tw-cam .beam{position:absolute;left:50%;top:100%;width:60px;height:90px;transform-origin:top center;background:linear-gradient(180deg,#ff202033,transparent);clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);animation:twCamSweep 4s ease-in-out infinite alternate;}
  .tw-sensor{position:absolute;width:14px;height:6px;border-radius:3px;background:#1a0505;box-shadow:0 0 8px #ff2020,inset 0 1px 2px #ff7070;animation:twFlickP 1.2s steps(2) infinite;}
  .tw-gloss{position:absolute;bottom:0;left:0;right:0;height:12%;background:linear-gradient(180deg,#0000,#f8b50018 40%,#00000088);box-shadow:inset 0 6px 14px #000a;}
  .tw-goldspill{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:70%;height:18%;background:radial-gradient(ellipse at 50% 100%,#f8b50055,transparent 70%);filter:blur(6px);}

  /* === PARTICULES === */
  .tw-part{position:absolute;width:4px;height:4px;border-radius:50%;}
  .tw-part.snow{background:#ffffffcc;animation:twFall linear infinite;}
  .tw-part.spark{background:#f8b500;box-shadow:0 0 6px #f8b500;animation:twRise linear infinite;}
  .tw-part.neon{box-shadow:0 0 8px currentColor;background:currentColor;animation:twFlickP 2.2s steps(2) infinite;}

  /* === BRIEFING === */
  .tw-brief{position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9995;}
  .tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:16px;max-width:82%;text-align:center;box-shadow:0 0 20px #00d2ff66;}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
  .btn-tower{background:linear-gradient(45deg,#7a00ff,#00d2ff)!important;animation:twBtn 2s infinite;box-shadow:0 0 14px #7a00ff88;}

  /* === GAME SCREEN === */
  .twg-screen{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,#1a2142,#05050f 70%);z-index:9996;display:none;flex-direction:column;}
  .twg-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;}
  .twg-header b{color:#00d2ff;font-size:13px;flex:1;text-align:center;}
  #twg-timer{color:#fff;font-weight:900;font-size:15px;min-width:56px;text-align:right;}
  .twg-hud{text-align:center;padding:10px 6px 4px;font-size:clamp(20px,6vw,28px);font-weight:900;color:#00d2ff;text-shadow:0 0 14px #00d2ff88;}
  .twg-bar{height:10px;margin:4px 16px;background:#200010;border-radius:5px;overflow:hidden;display:none;}
  .twg-gridwrap{flex:1;display:flex;align-items:center;justify-content:center;padding:10px;overflow:hidden;}
  #tower-game .tg-grid{display:grid;gap:8px;width:100%;max-width:520px;}
  .tg-tile{background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff55;border-radius:12px;color:#fff;font-weight:900;font-size:clamp(18px,5vw,26px);padding:0;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .tg-tile.sel{border-color:#f8b500;box-shadow:0 0 10px #f8b500;}
  .tg-tile.gone{opacity:0;pointer-events:none;transform:scale(.4);transition:all .3s;}
  .tg-tile.foggy{animation:twFog 2s infinite;}
  .twg-msg{text-align:center;font-size:11px;color:#aaa;padding:6px 10px 12px;}

  /* === ANIMATIONS === */
  @keyframes twPulse{50%{transform:translate(-50%,0) scale(1.15)}}
  @keyframes twBounce2{50%{transform:translateX(-50%) translateY(-4px)}}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  @keyframes twBtn{50%{box-shadow:0 0 22px #00d2ffcc}}
  @keyframes twFog{50%{opacity:.25}}
  @keyframes twCloud{from{left:-30%}to{left:110%}}
  @keyframes twWin{0%,38%{opacity:1}45%,88%{opacity:.08}95%,100%{opacity:1}}
  @keyframes twDrive{from{left:-20%}to{left:115%}}
  @keyframes twDriveR{from{left:115%}to{left:-20%}}
  @keyframes twFlickP{50%{opacity:.15}}
  @keyframes twGlowC{50%{filter:brightness(1.6)}}
  @keyframes twSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
  @keyframes twLaserV{from{transform:translateY(-26px)}to{transform:translateY(26px)}}
  @keyframes twLaserD{from{transform:rotate(-5deg) translateY(-18px)}to{transform:rotate(5deg) translateY(18px)}}
  @keyframes twFall{0%{top:-4%}100%{top:104%}}
  @keyframes twRise{0%{top:104%}100%{top:-4%}}
  @keyframes twSlide{to{background-position:300% 0}}
  @keyframes twBlimp{from{left:-15%}to{left:110%}}
  @keyframes twPlaneX{from{left:110%}to{left:-10%}}
  @keyframes twShoot{0%{opacity:0;transform:rotate(-30deg) translateX(0)}5%{opacity:.9}12%{opacity:0;transform:rotate(-30deg) translateX(-240px)}100%{opacity:0}}
  @keyframes twFly{0%,100%{transform:translate(0,0);opacity:.9}25%{transform:translate(14px,-18px);opacity:.5}50%{transform:translate(-10px,-30px);opacity:.9}75%{transform:translate(8px,-12px);opacity:.6}}
  @keyframes twCamSweep{from{transform:translateX(-50%) rotate(-25deg)}to{transform:translateX(-50%) rotate(25deg)}}

  /* === MOBILE PERF === */
  @media (max-width:760px), (pointer:coarse){
    .tw-road{height:140px;}
    .tw-horizon{bottom:140px;}
    .tw-cityback{bottom:140px;height:440px;}
    .tw-city{bottom:140px;height:340px;}
    .tw-wl{animation:none;box-shadow:none;}
    .tw-star2{animation:none;}
    .tw-part{display:none;}
    .tw-cloud{display:none;}
    .tw-reflect{display:none;}
    .tw-car .hl,.tw-car .tl{display:none;}
    .tw-cryscl{filter:none;animation:none;}
  }
  `;
  document.head.appendChild(style);
})();

/* ----- 5. GÉNÉRATION DE SCÈNES (avec cache) ----- */
function generateSceneHTML(c, W, C) {
  if (SCENE_CACHE[c]) return SCENE_CACHE[c];
  let html = "";

  if (W.scene === "city") {
    html += `<span class="tw-moon"></span>`;
    const starsN = IS_MOBILE ? 45 : 140;
    for (let i = 0; i < starsN; i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%62}%;animation-delay:${(i*.23)%3}s;"></span>`;
    const cloudsN = IS_MOBILE ? 2 : 4;
    for (let i = 0; i < cloudsN; i++) html += `<span class="tw-cloud" style="top:${3+i*7}%;width:${22+(i*9)%16}%;animation-duration:${70+i*25}s;animation-delay:${i*11}s;"></span>`;
    html += `<div class="tw-horizon"></div>`;
    const cols = ["#00ffff","#ff00ff","#f8b500","#7dff8a"];

    let back = "";
    const hb = [72,92,80,96,86,90,78];
    const backN = IS_MOBILE ? 6 : 7;
    for (let i = 0; i < backN; i++) back += `<div class="tw-bldg" style="height:${hb[i]}%;flex:${i%2?1.25:1};"></div>`;
    html += `<div class="tw-cityback">${back}</div>`;

    let b = "";
    const hs = [48,72,56,86,62,76];
    const hf = [1,1.2,.95,1.15,1,.9];
    const mainN = IS_MOBILE ? 5 : 6;
    for (let i = 0; i < mainN; i++) {
      let wins = "";
      const n = IS_MOBILE ? (6 + (i%3)*3) : (14 + (i%3)*6);
      for (let w = 0; w < n; w++) wins += `<span class="tw-wl" style="color:${cols[(w+i)%4]};left:${6+((w*23)%82)}%;top:${4+((w*29)%88)}%;animation-duration:${2.5+((w*13)%4)}s;animation-delay:${(w*0.37)%3}s;"></span>`;
      b += `<div class="tw-bldg" style="height:${hs[i]}%;flex:${hf[i]};">${wins}${(!IS_MOBILE && i%3===0)?'<span class="tw-ant"></span>':""}</div>`;
    }
    html += `<div class="tw-city">${b}</div>`;

    const roadH = IS_MOBILE ? 140 : 180;
    const tpos = IS_MOBILE ? [{o:8,l:true},{o:10,l:false}] : [{o:5,l:true},{o:9,l:false},{o:22,l:true}];
    for (let i = 0; i < tpos.length; i++) {
      const p = tpos[i];
      const h = 1400 + i * 500;
      const w = 90 + (i * 23) % 40;
      let wins2 = "";
      const nw = IS_MOBILE ? 10 : 22;
      for (let wI = 0; wI < nw; wI++) wins2 += `<span class="tw-wl" style="color:${cols[(wI+i)%4]};left:${8+((wI*23)%78)}%;top:${2+((wI*17)%94)}%;animation-duration:${2.5+((wI*13)%4)}s;animation-delay:${(wI*0.4)%3}s;"></span>`;
      html += `<div class="tw-bldg-solo" style="bottom:${roadH}px;${p.l?("left:"+p.o+"%"):("right:"+p.o+"%")};height:${h}px;width:${w}px;opacity:.85;">${wins2}</div>`;
    }

    html += `<div class="tw-blimp" style="top:26%;animation-duration:55s;animation-delay:-20s;color:#00d2ff;"><span class="neo"></span></div>`;
    if (!IS_MOBILE) {
      html += `<div class="tw-blimp" style="top:58%;animation-duration:70s;animation-delay:-45s;color:#ff2bd6;"><span class="neo"></span></div>`;
      html += `<div class="tw-plane" style="top:20%;animation-duration:16s;animation-delay:-6s;"></div>`;
      html += `<div class="tw-plane" style="top:44%;animation-duration:22s;animation-delay:-14s;"></div>`;
    }
    html += `<span class="tw-shoot" style="left:70%;top:18%;animation-delay:2s;"></span>`;
    html += `<span class="tw-shoot" style="left:20%;top:50%;animation-delay:5s;"></span>`;

    html += `<div class="tw-road"><span class="tw-lane"></span></div>`;
    if (!IS_MOBILE) html += `<div class="tw-reflect"></div>`;
    const car = (cls, bottom, dur, delay, col) => `<span class="tw-car ${cls}" style="bottom:${bottom};animation-duration:${dur};animation-delay:${delay};color:${col};"><i class="cb"></i><i class="cc"></i><i class="ug"></i><i class="w1"></i><i class="w2"></i><i class="hl"></i><i class="tl"></i></span>`;
    if (IS_MOBILE) {
      html += car("", "14px", "9s", "0s", "#00d2ff") + car("s", "28px", "7s", "3s", "#f8b500") + car("r", "78px", "10s", "1.5s", "#ff2bd6") + car("r s", "96px", "8s", "5s", "#7dff8a");
    } else {
      html += car("", "16px", "9s", "0s", "#00d2ff") + car("", "34px", "11s", "2.5s", "#f8b500") + car("s", "24px", "7s", "5s", "#7dff8a") + car("", "44px", "13s", "7.5s", "#ff8a00") + car("s", "18px", "8s", "9.5s", "#ff2bd6");
      html += car("r", "96px", "10s", "1.5s", "#ff2bd6") + car("r", "114px", "12s", "4s", "#00d2ff") + car("r s", "104px", "8s", "6.5s", "#ff8a00") + car("r", "126px", "14s", "8.5s", "#7dff8a") + car("r s", "98px", "9s", "11s", "#f8b500");
    }
  }

  if (W.scene === "glacier") {
    html += `<div class="tw-cavewall"></div>`;
    html += `<div class="tw-gwall"></div><div class="tw-gwall r"></div>`;
    const gemN = IS_MOBILE ? 8 : 16;
    for (let i = 0; i < gemN; i++) {
      const leftSide = (i % 2 === 0);
      html += `<span class="tw-gem" style="${leftSide ? ("left:" + (2 + (i*7)%8) + "%") : ("right:" + (2 + (i*7)%8) + "%")};top:${4 + (i*11)%90}%;animation-delay:${(i*.4)%2}s;"></span>`;
    }
    html += `<div class="tw-gceil"></div>`;
    [[6,220],[16,160],[26,260],[38,140],[50,220],[62,160],[74,240],[86,150],[94,200]].forEach(p => {
      html += `<span class="tw-stalac" style="left:${p[0]}%;height:${p[1]}px;"></span>`;
    });
    html += `<div class="tw-gfloor"></div>`;
    [[10,160],[26,120],[42,150],[58,110],[74,140],[90,120]].forEach(p => {
      html += `<span class="tw-stalag" style="left:${p[0]}%;height:${p[1]}px;"></span>`;
    });
    const shelfN = IS_MOBILE ? 6 : 10;
    for (let i = 0; i < shelfN; i++) {
      const top = 12 + i * (70 / shelfN);
      const leftSide = (i % 2 === 0);
      const s = .7 + ((i * 13) % 4) / 10;
      html += `<div class="tw-shelf ${leftSide ? "" : "r"}" style="top:${top}%;${leftSide ? "left:0;" : "right:0;"}">
        <span class="rock"></span>
        <span class="tw-cryscl ${["","pink","gold","green","violet"][i%5]} ${["","tall","wide"][i%3]}" style="bottom:18px;left:22%;transform:scale(${s});animation-delay:${i*.5}s;"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i></span>
      </div>`;
    }
    const flyN = IS_MOBILE ? 4 : 9;
    for (let i = 0; i < flyN; i++) {
      html += `<span class="tw-firefly" style="left:${10+(i*29)%80}%;top:${12+(i*17)%70}%;animation-duration:${5+(i%4)*2}s;animation-delay:${i*.6}s;"></span>`;
    }
  }

  if (W.scene === "vault") {
    html += `<div class="tw-marble"></div>`;
    html += `<div class="tw-spot" style="left:16%;"></div><div class="tw-spot" style="left:64%;animation-delay:1.5s;"></div>`;
    html += `<div class="tw-vaultwall"></div>`;
    let ingots = "";
    for (let i = 0; i < 10; i++) ingots += `<span class="tw-ingot" style="left:${10+(i%5)*16}%;bottom:${6+Math.floor(i/5)*15}px;"></span>`;
    html += `<div class="tw-vaultopening">
      <div class="tw-vaultbars"></div>
      <div class="tw-goldlogo" style="top:26%;font-size:clamp(14px,3vw,28px);letter-spacing:4px;">CHIFFRE BLITZ</div>
      ${ingots}
    </div>`;
    let spokes = "";
    for (let i = 0; i < 8; i++) spokes += `<i style="transform:rotate(${i*45}deg);"></i>`;
    html += `<div class="tw-vaultdooropen"><div class="tw-doorspokes">${spokes}</div></div>`;
    html += `<div class="tw-bankgrille" style="bottom:190px;"></div>`;
    html += `<div class="tw-laser" style="top:70%;animation-duration:5s;"></div><div class="tw-laser d" style="top:78%;animation-duration:7s;animation-delay:1s;"></div>`;
    html += `<div class="tw-cam" style="left:10%;top:66%;"><span class="beam"></span></div><div class="tw-cam" style="right:10%;top:74%;"><span class="beam"></span></div>`;
    for (let i = 0; i < 6; i++) html += `<span class="tw-sensor" style="left:${10+i*15}%;bottom:180px;"></span>`;
    html += `<div class="tw-pillar" style="left:4%;"></div><div class="tw-pillar" style="right:4%;"></div>`;
    html += `<div class="tw-gloss"></div><div class="tw-goldspill"></div>`;
  }

  let parts = "";
  for (let i = 0; i < 7; i++) parts += `<span class="tw-part ${W.part}" style="color:${C.acc};left:${(i*13+c*7)%96}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;"></span>`;

  const result = html + parts;
  SCENE_CACHE[c] = result;
  return result;
}

/* ----- 6. RENDU CARTE ----- */
function drawRoom() {
  const wrap = document.getElementById("tw-mapwrap");
  if (!wrap) return;
  const season = TowerUtils.currentSeasonNum();
  const current = Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
  let totalStars = 0;
  for (const k in towerProgress.stars) totalStars += towerProgress.stars[k];
  document.getElementById("tower-sub").innerText = "É" + current + " ⭐" + totalStars;

  const H = TOTAL_FLOORS * STEP + 110;
  let zones = "", gates = "", paths = "", ptsByChap = {}, quotas = "";

  for (let c = 1; c <= 9; c++) {
    const chap = TOWER_CHAPTERS[c - 1];
    const zTop = H - STEP * c * FPC - 32, zH = STEP * FPC;
    const starLock = !TowerUtils.worldUnlockedByStars(c);
    if (chap.season > season || starLock) {
      zones += `<div class="tw-zone" style="top:${zTop}px;height:${zH}px;background:linear-gradient(180deg,#0a0a14,#050508);"></div>`;
      if (chap.season > season) {
        gates += `<div class="tw-gate lock" style="top:${zTop + 10}px;right:12px;left:auto;transform:none;">🔒 ${currentLang === "fr" ? "Bientôt" : "Soon"}</div>`;
      } else {
        const stars = TowerUtils.starsInWorld(c - 1);
        const pct = Math.min(100, Math.round(stars / WORLD_QUOTA * 100));
        quotas += `<div class="tw-quota" style="top:${zTop + 10}px;right:12px;">
          <div class="tw-quota-label">🔒 ${chap.icon} ${chap.name} — ⭐ ${stars}/${WORLD_QUOTA}</div>
          <div class="tw-quota-bar"><div style="width:${pct}%"></div></div>
        </div>`;
      }
      continue;
    }
    const W = TOWER_WORLDS[c], C = TOWER_COLORS[c];
    zones += `<div class="tw-zone" style="top:${zTop}px;height:${zH}px;background:${W.bg};">${generateSceneHTML(c, W, C)}</div>`;
    gates += `<div class="tw-gate" style="top:${zTop + 10}px;right:12px;left:auto;transform:none;border-color:${C.acc};color:${C.acc};">${chap.icon} ${chap.name}</div>`;
  }

  for (let f = 1; f <= TOTAL_FLOORS; f++) {
    const chap = TowerUtils.getTowerChapter(f);
    if (chap.season > season || !TowerUtils.worldUnlockedByStars(chap.id)) continue;
    const y = H - STEP * f, x = 50 + Math.sin(f * 0.55) * 16;
    (ptsByChap[chap.id] = ptsByChap[chap.id] || []).push([x, y + 23]);
  }
  for (const cid in ptsByChap) {
    const pts = ptsByChap[cid];
    if (pts.length > 1) paths += `<path d="M${pts.map(p => p[0] + " " + p[1]).join(" L ")}" fill="none" stroke="${TOWER_COLORS[cid].acc}44" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }

  wrap.innerHTML = `<div class="tw-map" style="height:${H}px;">${zones}${quotas}<div class="tw-col"><svg style="position:absolute;inset:0;width:100%;height:100%;z-index:1;" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${paths}</svg><div id="tw-nodes" style="position:absolute;inset:0;z-index:2;"></div>${gates}</div></div>`;
  wrap.onscroll = scheduleRenderWindow;
  const yCur = H - STEP * current;
  wrap.scrollTop = Math.max(0, yCur - wrap.clientHeight / 2);
  renderWindow();
}

function scheduleRenderWindow() {
  if (TW_nodesRaf) return;
  TW_nodesRaf = requestAnimationFrame(() => { TW_nodesRaf = null; renderWindow(); });
}

function renderWindow() {
  const wrap = document.getElementById("tw-mapwrap");
  if (!wrap) return;
  const layer = document.getElementById("tw-nodes");
  if (!layer) return;
  const H = TOTAL_FLOORS * STEP + 110;
  const top = wrap.scrollTop, vh = wrap.clientHeight;
  const season = TowerUtils.currentSeasonNum();
  const current = Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
  const worldOk = {};
  for (let c = 1; c <= 9; c++) worldOk[c] = (TOWER_CHAPTERS[c - 1].season <= season) && TowerUtils.worldUnlockedByStars(c);

  const yTop = top - 300, yBot = top + vh + 300;
  const hi = Math.min(TOTAL_FLOORS, Math.floor((H - yTop) / STEP) + 1);
  const lo = Math.max(1, Math.ceil((H - yBot) / STEP) - 1);

  let nhtml = "";
  for (let f = lo; f <= hi; f++) {
    const chap = TowerUtils.getTowerChapter(f);
    if (!worldOk[chap.id]) continue;
    const y = H - STEP * f, x = 50 + Math.sin(f * 0.55) * 16;
    const won = f <= towerProgress.floor, cur = f === current;
    const inChap = ((f - 1) % FPC) + 1;
    const boss = inChap === FPC, guardian = !boss && (inChap % 50 === 0);
    const st = towerProgress.stars[String(f)];
    const awake = (boss || guardian) ? (towerProgress.floor >= f - 1) : true;
    const clickable = (cur && awake) || won;
    const C = TOWER_COLORS[chap.id];
    const wonBg = won ? `background:radial-gradient(circle at 35% 30%,#ffffffb3,${C.acc} 55%,#000000c9);` : "";
    nhtml += `<div class="tw-node ${won ? "won" : (cur && awake ? "cur" : "lock")} ${(boss || guardian) ? "boss" : ""}" style="left:${x}%;top:${y}px;${wonBg}${(boss || guardian) ? `border-color:${C.acc};` : ""}" ${clickable ? `onclick="mapPlay(${f})"` : ""}>
      ${boss ? chap.boss : (guardian ? "⚔️" : f)}
      ${won && st ? `<span class="tw-st">${"⭐".repeat(st)}</span>` : ""}
      ${cur ? `<span class="tw-ava">🧍</span>` : ""}
    </div>`;
  }
  layer.innerHTML = nhtml;
}

/* ----- 7. NAVIGATION & BRIEFING ----- */
function openTower() {
  let m = document.getElementById("screen-tower");
  if (!m) {
    m = document.createElement("div");
    m.id = "screen-tower";
    m.innerHTML = `<div class="tw-header"><button class="tw-back" onclick="closeTower()">⬅️</button><b>🗺️ MODE AVENTURE</b><span id="tower-sub" style="font-size:9px;color:#aaa;"></span></div><div class="tw-mapwrap" id="tw-mapwrap"></div><div class="tw-vig"></div>`;
    document.body.appendChild(m);
  }
  m.style.display = "flex";
  socket.emit("get_tower");
  towerDing();
}

function closeTower() {
  document.getElementById("screen-tower").style.display = "none";
}

function mapPlay(f) {
  const def = TowerUtils.getFloorDef(f);
  def.replay = f <= towerProgress.floor;
  showBriefing(def);
}

function showBriefing(def) {
  closeBriefing();
  const fr = currentLang === "fr";
  const curStars = towerProgress.stars[String(def.floor)] || 0;
  const starTime = Math.floor(def.time * 0.6);
  let starRule;
  if (def.type === "pairs") {
    const pr = def.gridSize / 2;
    const t3 = Math.round(pr * 1.5), t2 = Math.round(pr * 2.5);
    starRule = fr ? `💡 ⭐ finir · ⭐⭐ en ${t2}s · ⭐⭐⭐ en ${t3}s` : `💡 ⭐ finish · ⭐⭐ under ${t2}s · ⭐⭐⭐ under ${t3}s`;
  } else if (def.type === "sprint") {
    const t3 = Math.round(def.gridSize * 0.45);
    const t2 = Math.round(def.gridSize * 0.75);
    starRule = fr ? `💡 ⭐ finir · ⭐⭐ en ${t2}s · ⭐⭐⭐ en ${t3}s` : `💡 ⭐ finish · ⭐⭐ under ${t2}s · ⭐⭐⭐ under ${t3}s`;
  } else {
    starRule = fr ? `💡 ⭐ terminer · ⭐⭐ ≤2 erreurs · ⭐⭐⭐ 0 erreur + moins de ${starTime}s !` : `💡 ⭐ finish · ⭐⭐ ≤2 mistakes · ⭐⭐⭐ 0 mistake + under ${starTime}s!`;
  }
  const replayLine = def.replay ? `<div style="font-size:10px;color:#f8b500;margin-bottom:6px;">${fr ? "Actuel : " + "⭐".repeat(curStars) + " — rejoue pour viser 3 ⭐ !" : "Current: " + "⭐".repeat(curStars) + " — replay for 3 ⭐!"}</div>` : "";
  const b = document.createElement("div");
  b.id = "tw-brief";
  b.className = "tw-brief";
  b.innerHTML = `<div class="tw-brief-card">
    <div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🏰 ${fr ? "ÉTAGE" : "FLOOR"} ${def.floor} — ${TowerUtils.typeLabel(def.type)}</div>
    <div style="font-size:11px;color:#ddd;line-height:1.5;margin-bottom:8px;">${TowerUtils.twDesc(def.type)}</div>
    <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${starRule}</div>
    ${replayLine}
    <button class="btn-main btn-blue" style="width:100%;margin-bottom:6px;" onclick="closeBriefing();startTowerFloor(TowerUtils.getFloorDef(${def.floor}))">${def.replay ? "🔄 " + (fr ? "REJOUER" : "REPLAY") : "⚡ " + (fr ? "LANCER !" : "GO!")}</button>
    <button class="btn-secondary" style="width:100%;" onclick="closeBriefing()">❌ ${fr ? "Annuler" : "Cancel"}</button>
  </div>`;
  document.body.appendChild(b);
}

function closeBriefing() {
  const b = document.getElementById("tw-brief");
  if (b) b.remove();
}

/* ----- 8. MOTEUR DE JEU ----- */
function ensureTowerOverlay() {
  let ov = document.getElementById("tower-game");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "tower-game";
    ov.className = "twg-screen";
    ov.innerHTML = `<div class="twg-header"><button class="tw-back" onclick="quitFloor()">⬅️</button><b id="twg-title"></b><span id="twg-timer">⏱️</span></div><div id="tg-bar" class="twg-bar"></div><div id="tg-hud" class="twg-hud"></div><div class="twg-gridwrap"><div id="tg-grid" class="tg-grid"></div></div><div id="tg-msg" class="twg-msg"></div>`;
    document.body.appendChild(ov);
  }
  return ov;
}

function cloneState(s) {
  return {
    type: s.type, total: s.total, gridSize: s.gridSize, floor: s.floor,
    target: s.target, targetColor: s.targetColor, targetParity: s.targetParity, forbidden: s.forbidden,
    timeLeft: s.timeLeft, ai: s.ai,
    gone: Object.assign({}, s.gone || {}),
    revealed: Object.assign({}, s.revealed || {}),
    display: (s.display || []).slice(),
    sel: (s.sel === undefined ? null : s.sel)
  };
}

function startTowerFloor(def) {
  if (TW) return;
  const ov = ensureTowerOverlay();
  ov.style.display = "flex";
  TW_lastFloor = def.floor;
  TW = null; TW_dom = null; TW_buttons = []; TW_hudCache = "";
  stopLocalTimer();
  document.getElementById("tg-grid").innerHTML = "";
  document.getElementById("twg-title").innerText = "🏰 " + (currentLang === "fr" ? "ÉTAGE" : "FLOOR") + " " + def.floor;
  socket.emit("tower_floor_start", { floor: def.floor });
}

function buildGridFromState(st) {
  const g = document.getElementById("tg-grid");
  const cols = st.gridSize <= 16 ? 4 : (st.gridSize <= 20 ? 5 : 6);
  g.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  g.innerHTML = "";
  TW_buttons = [];
  st.display.forEach((v, i) => {
    const b = document.createElement("button");
    b.className = "tg-tile" + (st.type === "fog" ? " foggy" : "");
    if (st.gone[i]) b.classList.add("gone");
    if (st.type === "color" && v) {
      b.style.background = `radial-gradient(circle at 35% 25%,#ffffffaa,transparent 22%),linear-gradient(180deg,${v.hex},#111827 85%)`;
      b.style.boxShadow = `0 0 14px ${v.hex}66,inset 0 1px 0 #fff8`;
      b.textContent = "";
    } else if (st.type === "pairs") {
      b.textContent = st.gone[i] ? "" : (v === null ? "?" : v);
      if ((st.revealed && st.revealed[i]) || st.sel === i) b.classList.add("sel");
    } else {
      b.textContent = v;
    }
    b.onclick = () => handleTowerClick(i, b);
    g.appendChild(b);
    TW_buttons[i] = b;
  });
}

function syncDomToState(st) {
  for (let i = 0; i < st.display.length; i++) {
    const b = TW_buttons[i];
    if (!b) continue;
    const wasGone = !!TW_dom.gone[i], isGone = !!st.gone[i];
    if (isGone !== wasGone) b.classList.toggle("gone", isGone);
    if (st.type === "pairs") {
      const dv = st.display[i], ov = TW_dom.display[i];
      if (dv !== ov) b.textContent = isGone ? "" : (dv === null ? "?" : dv);
      const rev = !!(st.revealed && st.revealed[i]) || st.sel === i;
      const orev = !!(TW_dom.revealed && TW_dom.revealed[i]) || TW_dom.sel === i;
      if (rev !== orev) b.classList.toggle("sel", rev);
    }
  }
}

function handleTowerClick(i, b) {
  const now = Date.now();
  if (now - TW_lastClick < 100) return;
  TW_lastClick = now;
  if (!TW_dom || TW_dom.gone[i]) return;
  if (TW_pairsLock) return;

  b.style.transform = "scale(0.9)";
  setTimeout(() => { if (b) b.style.transform = ""; }, 120);

  const t = TW_dom.type;
  if (t === "pairs") {
    socket.emit("tower_click", { index: i });
    return;
  }

  const v = TW_dom.display[i];
  let success = null;
  if (t === "color" && TW_dom.targetColor) success = (v && v.key === TW_dom.targetColor.key);
  else if (t === "parity") success = (TW_dom.targetParity === "even" ? (v % 2 === 0) : (v % 2 !== 0));
  else if (t === "forbidden") success = (v !== TW_dom.forbidden);
  else if (TW_dom.target !== null && TW_dom.target !== undefined) success = (v === TW_dom.target);

  if (success === true) {
    TW_dom.gone[i] = true;
    b.classList.add("gone");
    if (t === "reverse") TW_dom.target--;
    else if (t === "classic" || t === "sprint" || t === "fog" || t === "nofail") TW_dom.target++;
    if (typeof SoundEngine !== "undefined" && SoundEngine.playClick) SoundEngine.playClick();
  } else if (success === false) {
    if (typeof SoundEngine !== "undefined" && SoundEngine.playError) SoundEngine.playError();
  }
  socket.emit("tower_click", { index: i });
}

function stopLocalTimer() {
  if (TW_localTimer) { clearInterval(TW_localTimer); TW_localTimer = null; }
}

function startLocalTimer(tl) {
  stopLocalTimer();
  let left = (typeof tl === "number" ? tl : 0);
  const el = document.getElementById("twg-timer");
  const paint = () => { if (el) { el.innerText = "⏱️ " + Math.max(0, Math.ceil(left)) + "s"; el.style.color = left <= 5 ? "#ff4b2b" : "#fff"; } };
  paint();
  TW_localTimer = setInterval(() => { left -= 0.25; paint(); }, 250);
}

function renderHUDFromState() {
  const h = document.getElementById("tg-hud");
  if (!h || !TW) return;
  const fr = currentLang === "fr";
  let main = "";
  if (TW.type === "color" && TW.targetColor) main = `${fr ? "COULEUR" : "COLOR"} : <span style="color:${TW.targetColor.hex};text-shadow:0 0 12px ${TW.targetColor.hex};">${TW.targetColor.name}</span>`;
  else if (TW.type === "pairs") main = fr ? "🧩 RETROUVE LES PAIRES" : "🧩 FIND THE PAIRS";
  else if (TW.type === "parity") main = TW.targetParity === "even" ? (fr ? "CLIQUE : PAIRS" : "CLICK: EVEN") : (fr ? "CLIQUE : IMPAIRS" : "CLICK: ODD");
  else if (TW.type === "forbidden") main = `${fr ? "INTERDIT" : "FORBIDDEN"} : <span style="color:#ff4b2b;text-shadow:0 0 12px #ff4b2b;">${TW.forbidden}</span>`;
  else if (TW.target !== null && TW.target !== undefined) main = `<span>${fr ? "CIBLE" : "TARGET"} : ${TW.target}</span>`;
  if (main !== TW_hudCache) { h.innerHTML = main; TW_hudCache = main; }

  const bar = document.getElementById("tg-bar");
  if (bar) {
    if (TW.type === "boss") { bar.style.display = "block"; bar.innerHTML = `<div style="width:${Math.min(100, TW.ai / TW.total * 100)}%;height:100%;background:linear-gradient(90deg,#ff4b2b,#f8b500);"></div>`; }
    else bar.style.display = "none";
  }
  document.getElementById("twg-title").innerText = "🏰 " + (fr ? "ÉTAGE" : "FLOOR") + " " + TW.floor + " — " + TowerUtils.typeLabel(TW.type);

  const msg = TW.type === "nofail" ? (fr ? "💎 Une seule erreur = échec !" : "💎 One mistake = fail!") : (TW.type === "pairs" ? (fr ? "🧠 Mémorise les positions !" : "🧠 Memorize positions!") : (TW.type === "forbidden" ? (fr ? "🚫 Ne touche pas le nombre interdit !" : "🚫 Don't touch the forbidden number!") : ""));
  const msgEl = document.getElementById("tg-msg");
  if (msgEl && msgEl.innerText !== msg) msgEl.innerText = msg;
}

function showFailUI(r) {
  const fr = currentLang === "fr";
  const ov = ensureTowerOverlay();
  ov.style.display = "flex";
  document.getElementById("tg-bar").style.display = "none";
  document.getElementById("tg-hud").innerHTML = "";
  const g = document.getElementById("tg-grid");
  g.style.gridTemplateColumns = "1fr";
  g.innerHTML = `<div style="text-align:center;"><div style="font-size:30px;">💥</div><div style="color:#ff4b2b;font-weight:900;margin:6px 0;">${fr ? "ÉTAGE RATÉ !" : "FLOOR FAILED!"}</div><button class="btn-main btn-blue" onclick="retryFloor()">🔄 ${fr ? "Réessayer" : "Retry"}</button><button class="btn-secondary" onclick="quitFloor()">${fr ? "Quitter" : "Quit"}</button></div>`;
}

function retryFloor() {
  TW = null; TW_dom = null; stopLocalTimer();
  startTowerFloor({ floor: TW_lastFloor });
}

function quitFloor() {
  TW = null; TW_dom = null; stopLocalTimer();
  socket.emit("tower_quit");
  const ov = document.getElementById("tower-game");
  if (ov) ov.style.display = "none";
}

function showTowerWinPopup(res) {
  const fr = currentLang === "fr";
  let ms = res.floor + 1, label = "";
  while (ms <= res.floor + FPC) {
    const ic = ((ms - 1) % FPC) + 1;
    if (ic === FPC) { label = fr ? "👑 Boss" : "👑 Boss"; break; }
    if (ic % 50 === 0) { label = fr ? "⚔️ Gardien" : "⚔️ Guardian"; break; }
    if (ic % 20 === 0) { label = fr ? "🎁 Cache" : "🎁 Cache"; break; }
    ms++;
  }

  const d = document.createElement("div");
  d.className = "modal-overlay";
  d.style.display = "flex";
  d.innerHTML = `<div class="modal-card" style="max-width:300px;text-align:center;">
    <h3 style="color:#00ff88;margin:0 0 6px 0;">✅ ${fr ? "ÉTAGE" : "FLOOR"} ${res.floor} ${fr ? "VAINCU !" : "CLEARED!"}</h3>
    <div class="tw-stars">${[1, 2, 3].map(i => `<span style="animation-delay:${i * 0.2}s;${i <= res.stars ? "" : "filter:grayscale(1);opacity:.3;"}">⭐</span>`).join("")}</div>
    <div style="font-size:13px;color:#f8b500;font-weight:bold;margin-bottom:6px;">+${res.coins} 🪙</div>
    <div style="font-size:11px;color:#00d2ff;margin-bottom:10px;">🎯 ${fr ? "Prochain palier" : "Next milestone"} : ${label} ${fr ? "à l'étage" : "at floor"} ${ms}</div>
    ${res.reward ? `<div style="font-size:12px;color:#00d2ff;font-weight:bold;margin-bottom:10px;">🎁 ${fr ? "CHAPITRE TERMINÉ" : "CHAPTER COMPLETE"} : ${res.reward} ${fr ? "débloqué !" : "unlocked!"}</div>` : ""}
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove();renderTower()">${fr ? "Continuer" : "Continue"} ⚡</button>
  </div>`;
  document.body.appendChild(d);
  towerDing();
}

/* ----- 9. SOCKET EVENTS ----- */
socket.on("tower_data", (d) => {
  towerProgress = { floor: d.floor || 0, stars: d.stars || {} };
  drawRoom();
});

socket.on("tower_state", (st) => {
  if (!st || !st.display) return;
  const first = TW_buttons.length === 0;
  TW = st;
  TW_lastFloor = st.floor;
  if (first) {
    buildGridFromState(st);
    TW_dom = cloneState(st);
  } else {
    syncDomToState(st);
    TW_dom = cloneState(st);
  }
  renderHUDFromState();
  startLocalTimer(st.timeLeft);
});

socket.on("tower_fail", (r) => {
  TW = null; TW_dom = null; stopLocalTimer();
  showFailUI(r);
});

socket.on("tower_result", (res) => {
  TW = null;
  const ov = document.getElementById("tower-game");
  if (ov) ov.style.display = "none";
  if (!res.ok) return;
  towerProgress.floor = Math.max(towerProgress.floor, res.floor);
  towerProgress.stars[String(res.floor)] = Math.max(towerProgress.stars[String(res.floor)] || 0, res.stars);
  showTowerWinPopup(res);
  renderTower();
});

/* ----- 10. HELPERS & ALIASES ----- */
function towerDing() {
  try {
    SoundEngine.init();
    const t = SoundEngine.ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = SoundEngine.ctx.createOscillator(), g = SoundEngine.ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(.08, t + i * .12);
      g.gain.exponentialRampToValueAtTime(.0001, t + i * .12 + .25);
      o.connect(g); g.connect(SoundEngine.ctx.destination);
      o.start(t + i * .12); o.stop(t + i * .12 + .25);
    });
  } catch (e) {}
}

function renderTower() { drawRoom(); }
function showElevator() { drawRoom(); }
function afterWinTravel() { drawRoom(); }
