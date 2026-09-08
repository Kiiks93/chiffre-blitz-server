/* ============================================================
TOUR.JS — AVENTURE « MATCH FACTORY » (écran fixe par monde)
============================================================ */

/* ----- 1. CONFIGURATION ----- */
const TOWER_CHAPTERS = [
  { id:1, season:1, name:"Quartier Néon", icon:"🌆", boss:"🤖", objects:["💡","⚡","📺","🔌","🎛️","🖥️","📻","","🌃"] },
  { id:2, season:1, name:"Grottes de Cristal", icon:"🧊", boss:"🗿", objects:["🕯️","","💎","️","","❄️","🫧","🌀","🧊"] },
  { id:3, season:1, name:"Banque Dorée", icon:"🏦", boss:"👾", objects:["🪙","💰","💵","💳","🥇","","💎","🏅",""] },
  { id:4, season:2, name:"Tour Hantée", icon:"🎃", boss:"🧛", objects:["🕸️","","🕯️","🦇","","👻","🐈⬛","","⚰️"] },
  { id:5, season:2, name:"Cimetière Brumeux", icon:"🌫️", boss:"💀", objects:["🪦","🌫️","🕯️","️","","🕷️","","🦴","🖤"] },
  { id:6, season:2, name:"Antre Citrouille", icon:"👑", boss:"🎃", objects:["🎃","🍬","","🦇","🧹","🍭","️","","🏆"] },
  { id:7, season:3, name:"Cime Bonbon", icon:"🍭", boss:"🧝", objects:["🍭","","🎀","🎂","🧁","🥐","🍰","🍩",""] },
  { id:8, season:3, name:"Forêt de Sapins", icon:"🎄", boss:"⛄", objects:["🎄","🎁","❄️","🔔","️","⭐","🧦","🍪","🦌"] },
  { id:9, season:3, name:"Atelier du Père Noël", icon:"🎅", boss:"🎅", objects:["🎅","🤶","","🦌","🔥","","⛄","","🍪"] }
];
const FPC = 200;
const TOTAL_FLOORS = 9 * FPC;
const WORLD_QUOTA = 240;
const MAX_LIVES = 5;
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
const SHOP_ITEMS = [
  { id:"vies", icon:"❤️", name:"+3 Vies", price:150 },
  { id:"joker_time", icon:"⏱️", name:"Joker Temps", price:250 },
  { id:"joker_skip", icon:"🃏", name:"Joker Pass", price:300 },
  { id:"pack_coins", icon:"🪙", name:"Pack Pièces (IAP)", price:0, iap:true }
];

/* ----- 2. ÉTAT GLOBAL ----- */
let towerProgress = { floor: 0, stars: {} };
let twViewFloor = 1;
let twLives = MAX_LIVES;
let TW = null, TW_dom = null, TW_buttons = [], TW_lastFloor = 0;
let TW_hudCache = "", TW_localTimer = null, TW_lastClick = 0, TW_pairsLock = false;
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
    for (let x = 2; x <= w; x++) if (this.starsInWorld(x - 1) < WORLD_QUOTA) return false;
    return true;
  },
  getTowerChapter(f) { return TOWER_CHAPTERS[Math.ceil(f / FPC) - 1]; },
  currentSeasonNum() { return parseInt((myProfile.currentSeasonId || "s1").replace("s", "")) || 1; },
  worldUnlocked(w) { return TOWER_CHAPTERS[w-1].season <= this.currentSeasonNum() && this.worldUnlockedByStars(w); },
  getFloorDef(floor) {
    const inChap = ((floor - 1) % FPC) + 1;
    const global = (floor - 1) / (TOTAL_FLOORS - 1);
    let gridSize = Math.min(48, Math.round(16 + global * 32));
    let time = Math.max(12, Math.round(28 - global * 16));
    if (inChap === FPC || inChap % 50 === 0) return { floor, gridSize, time, type: "boss" };
    const seq = ["classic","reverse","color","pairs","sprint","parity","forbidden","fog","nofail"];
    const t = seq[(inChap - 1) % 9];
    if (t === "sprint") return { floor, gridSize, time: Math.max(6, Math.round(time * 0.4)), type: "sprint" };
    if (t === "nofail") return { floor, gridSize, time: Math.max(14, Math.round(time * 0.7)), type: "nofail" };
    if (t === "pairs") { let g = gridSize + 8; if (g % 2) g++; return { floor, gridSize: g, time: Math.max(20, Math.round(g/2 * 3)), type: "pairs" }; }
    if (t === "parity") return { floor, gridSize: Math.min(60, gridSize + 12), time: time + 3, type: "parity" };
    return { floor, gridSize, time, type: t };
  },
  typeLabel(t) {
    const fr = currentLang === "fr";
    return ({classic:fr?"⚡ Croissant":"⚡ Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",color:fr?"🎨 Couleurs":"🎨 Colors",pairs:fr?"🧩 Paires":"🧩 Pairs",parity:fr?"🔢 Pair/Impair":"🔢 Even/Odd",forbidden:fr?"🚫 Interdit":"🚫 Forbidden",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",fog:fr?"🌫️ Brouillard":"🌫️ Fog",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t] || t;
  }
};

/* ----- 4. CSS CONSOLIDÉ ----- */
(function() {
  const style = document.createElement('style');
  style.textContent = `
  /* === ÉCRAN AVENTURE FIXE === */
  #screen-tower{position:fixed;inset:0;background:#000;z-index:9990;display:none;flex-direction:column;}
  #tw-bg{position:absolute;inset:0;overflow:hidden;z-index:0;}
  .tw-hud{position:relative;z-index:5;display:flex;align-items:center;gap:8px;padding:10px 12px;}
  .tw-hud .tw-back{background:#1a1a2e;border:1px solid #00d2ff;color:#00d2ff;border-radius:8px;padding:6px 10px;font-size:14px;}
  .tw-lives{display:flex;align-items:center;gap:5px;background:#1a1a2ecc;border:2px solid #ff4b2b;border-radius:10px;padding:4px 10px;color:#fff;font-weight:900;font-size:14px;}
  .tw-lives small{color:#aaa;font-weight:600;font-size:10px;}
  .tw-coins{display:flex;align-items:center;gap:5px;background:#1a1a2ecc;border:2px solid #f8b500;border-radius:10px;padding:4px 10px;color:#ffd75e;font-weight:900;font-size:14px;}
  .tw-shopbtn{margin-left:auto;width:44px;height:44px;border-radius:10px;background:#1a1a2ecc;border:2px solid #f8b500;font-size:22px;cursor:pointer;}
  .tw-qwrap{position:relative;z-index:5;margin:0 12px 4px;display:flex;align-items:center;gap:8px;}
  .tw-qwrap .lbl{font-size:11px;font-weight:900;color:#f8b500;white-space:nowrap;}
  .tw-qbar{flex:1;height:14px;background:#200010;border-radius:7px;overflow:hidden;border:2px solid #00d2ff66;}
  .tw-qbar div{height:100%;background:linear-gradient(90deg,#f8b500,#ffd700);box-shadow:0 0 8px #f8b50088;}
  .tw-center{position:relative;z-index:5;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:10px;}
  .tw-worldtag{font-size:15px;font-weight:900;color:#fff;text-shadow:0 2px 6px #000;background:#0f051dcc;border:2px solid #00d2ff;border-radius:12px;padding:6px 16px;}
  .tw-panel{background:linear-gradient(180deg,#8a5a2a,#5a3a1a);border:4px solid #c9a227;border-radius:16px;padding:16px 34px;text-align:center;box-shadow:0 8px 0 #3a2a05,0 0 30px #000a;}
  .tw-panel .num{font-size:46px;font-weight:900;color:#fff;text-shadow:0 3px 0 #0008;line-height:1;}
  .tw-panel .typ{font-size:13px;color:#ffe9a8;font-weight:700;margin-top:4px;}
  .tw-panel-stars{font-size:16px;letter-spacing:4px;margin-top:5px;}
  .tw-panel-stars span{filter:grayscale(1);opacity:.3;}
  .tw-panel-stars span.on{filter:none;opacity:1;}
  .tw-panel.boss{border-color:#ff4b2b;background:linear-gradient(180deg,#5a1a1a,#3a0a0a);box-shadow:0 8px 0 #2a0505,0 0 30px #ff4b2b66;}
  .tw-panel.boss .typ{color:#ff8a8a;}
  .tw-playrow{display:flex;align-items:center;gap:16px;}
  .tw-arrow{width:46px;height:46px;border-radius:50%;background:#1a1a2e;border:2px solid #00d2ff;color:#00d2ff;font-size:20px;cursor:pointer;}
  .tw-arrow:disabled{opacity:.3;cursor:default;}
  .tw-playbtn{background:linear-gradient(180deg,#3ae05a,#1a9a3a);border:3px solid #0a5a1a;border-radius:14px;padding:14px 62px;font-size:26px;font-weight:900;color:#fff;text-shadow:0 2px 0 #0008;box-shadow:0 6px 0 #0a5a1a,0 0 20px #3ae05a66;cursor:pointer;}
  .tw-playbtn:disabled{filter:grayscale(1);opacity:.5;cursor:default;}
  .tw-lockmsg{font-size:11px;color:#f8b500;background:#0f051dcc;border:1px solid #f8b50066;border-radius:8px;padding:5px 12px;}
  .tw-worldfade{position:fixed;inset:0;background:#000;z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;opacity:0;transition:opacity .6s;pointer-events:none;}
  .tw-worldfade.on{opacity:1;}
  .tw-worldfade .big{font-size:34px;font-weight:900;color:#00d2ff;text-shadow:0 0 20px #00d2ff;}
  .tw-worldfade .sub{font-size:14px;color:#aaa;}

  /* === BOUTIQUE === */
  .tw-shop{position:fixed;inset:0;background:#000c;z-index:9997;display:flex;align-items:center;justify-content:center;}
  .tw-shop-card{background:#0f051d;border:2px solid #f8b500;border-radius:14px;padding:16px;width:min(92%,360px);}
  .tw-shop-card h3{margin:0 0 10px;color:#f8b500;text-align:center;}
  .tw-shop-item{display:flex;align-items:center;gap:10px;background:#1a1a2e;border:1px solid #333;border-radius:10px;padding:10px;margin-bottom:8px;}
  .tw-shop-item .ic{font-size:24px;}
  .tw-shop-item .nm{flex:1;color:#fff;font-weight:700;font-size:13px;}
  .tw-shop-item .buy{background:linear-gradient(180deg,#f8b500,#c9a227);border:none;border-radius:8px;padding:7px 12px;font-weight:900;color:#3a2a05;cursor:pointer;}

  /* === SCÈNES (fonds) === */
  .tw-moon{position:absolute;top:2%;right:10%;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff8e8,#d8c9a8 60%,#a89878);box-shadow:0 0 30px #fff8e866;}
  .tw-star2{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:twFlickP 3s steps(2) infinite;}
  .tw-cloud{position:absolute;height:10px;border-radius:6px;background:linear-gradient(90deg,transparent,#8888aa22 30%,#8888aa22 70%,transparent);filter:blur(3px);animation:twCloud linear infinite;}
  .tw-horizon{position:absolute;bottom:180px;left:0;right:0;height:200px;background:radial-gradient(ellipse at 50% 100%,#ff00ff33,transparent 70%),radial-gradient(ellipse at 30% 100%,#00ffff2b,transparent 60%);}
  .tw-cityback{position:absolute;bottom:180px;left:0;right:0;height:44%;display:flex;align-items:flex-end;gap:2%;padding:0 1%;opacity:.45;filter:brightness(.5);}
  .tw-cityback .tw-bldg{border-top:none;}
  .tw-city{position:absolute;bottom:180px;left:0;right:0;height:36%;display:flex;align-items:flex-end;gap:3%;padding:0 2%;}
  .tw-bldg{flex:1;position:relative;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;box-shadow:0 0 12px #000;border-top:2px solid #00d2ff44;}
  .tw-ant{position:absolute;top:-14px;left:50%;width:2px;height:14px;background:#333;box-shadow:0 -3px 6px #ff4b2b;}
  .tw-wl{position:absolute;width:7px;height:9px;background:currentColor;box-shadow:0 0 8px currentColor;animation:twWin linear infinite;}
  .tw-road{position:absolute;bottom:0;left:0;right:0;height:180px;background:linear-gradient(180deg,#23232e,#101016 30%,#0a0a0e);}
  .tw-lane{position:absolute;left:0;right:0;top:50%;height:3px;background:repeating-linear-gradient(90deg,#f8b50088 0 34px,transparent 34px 70px);opacity:.7;}
  .tw-reflect{position:absolute;left:0;right:0;bottom:0;height:180px;background:linear-gradient(90deg,#ff00ff22,#00ffff22,#f8b50022,#ff00ff22);background-size:300% 100%;filter:blur(7px);animation:twSlide 6s linear infinite;opacity:.45;}
  .tw-car{position:absolute;width:54px;height:16px;z-index:3;animation:twDrive linear infinite;}
  .tw-car i{position:absolute;display:block;}
  .tw-car .cb{bottom:3px;left:0;right:0;height:9px;border-radius:8px 14px 6px 6px;background:linear-gradient(180deg,#3d3d52,#12121c 70%);}
  .tw-car .cc{bottom:10px;left:12px;width:26px;height:8px;border-radius:8px 10px 0 0;background:linear-gradient(180deg,#2a2a3a,#151520);}
  .tw-car .ug{position:absolute;bottom:-3px;left:6%;right:6%;height:4px;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor;opacity:.9;}
  .tw-car .hl{right:-32px;bottom:5px;width:34px;height:5px;background:linear-gradient(90deg,#bffcffcc,transparent);filter:blur(2px);}
  .tw-car .tl{left:-4px;bottom:6px;width:7px;height:5px;background:radial-gradient(closest-side,#ff2bd6,transparent);}
  .tw-car.r{animation-name:twDriveR;transform:scaleX(-1);}
  .tw-car.s{transform:scale(.8);transform-origin:bottom left;}
  .tw-car.s.r{transform:scale(.8) scaleX(-1);}
  .tw-bldg-solo{position:absolute;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;border-top:2px solid #00d2ff44;}
  .tw-blimp{position:absolute;width:120px;height:44px;border-radius:50%;background:linear-gradient(180deg,#3a3a52,#14141f);box-shadow:0 0 20px #00d2ff44;animation:twBlimp linear infinite;}
  .tw-blimp .neo{position:absolute;left:12%;right:12%;top:38%;height:6px;border-radius:3px;background:currentColor;box-shadow:0 0 10px currentColor;animation:twFlickP 2s steps(2) infinite;}
  .tw-plane{position:absolute;width:34px;height:8px;background:linear-gradient(90deg,transparent,#bffcffcc 60%,#fff);border-radius:4px;filter:blur(1px);animation:twPlaneX linear infinite;}
  .tw-shoot{position:absolute;width:90px;height:2px;background:linear-gradient(90deg,#fff,transparent);transform:rotate(-30deg);opacity:0;animation:twShoot 7s linear infinite;}

  .tw-cavewall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#74ebf518 0%,#0a2a3a66 35%,#000000ee 78%);}
  .tw-gceil{position:absolute;top:0;left:0;right:0;height:160px;background:linear-gradient(0deg,#0a2a3a,#04141d);}
  .tw-gfloor{position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(180deg,#0a2a3a,#04141d);}
  .tw-stalac{position:absolute;top:0;width:44px;background:linear-gradient(180deg,#04141d,#74ebf5 60%,#e8fbff);clip-path:polygon(48% 100%,52% 100%,62% 60%,72% 30%,100% 0,0 0,28% 30%,38% 60%);filter:drop-shadow(0 0 10px #74ebf5cc);}
  .tw-stalag{position:absolute;bottom:0;width:44px;background:linear-gradient(0deg,#5a8ea0aa,#bfefffcc 55%,#ffffff);clip-path:polygon(48% 0,52% 0,62% 30%,72% 60%,100% 100%,0 100%,28% 60%,38% 30%);filter:drop-shadow(0 0 10px #74ebf5cc);}
  .tw-gwall{position:absolute;top:0;bottom:0;width:12%;background:linear-gradient(90deg,#04141d,#0a2a3a);clip-path:polygon(0 0,100% 3%,70% 8%,100% 14%,75% 22%,100% 30%,70% 38%,100% 46%,75% 55%,100% 63%,70% 72%,100% 80%,75% 88%,100% 95%,70% 100%,0 100%);}
  .tw-gwall.r{left:auto;right:0;background:linear-gradient(270deg,#04141d,#0a2a3a);clip-path:polygon(100% 0,0 3%,30% 8%,0 14%,25% 22%,0 30%,30% 38%,0 46%,25% 55%,0 63%,30% 72%,0 80%,25% 88%,0 95%,30% 100%,100% 100%);}
  .tw-gem{position:absolute;width:9px;height:9px;background:#74ebf5;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 10px #74ebf5;animation:twGlowC 2s infinite;}
  .tw-shelf{position:absolute;width:24%;height:130px;}
  .tw-shelf .rock{position:absolute;bottom:0;left:0;right:0;height:26px;background:linear-gradient(180deg,#123a4a,#04141d);clip-path:polygon(0 0,100% 25%,88% 100%,0 100%);}
  .tw-shelf.r{transform:scaleX(-1);}
  .tw-shelf .tw-cryscl{position:absolute;bottom:18px;left:22%;width:80px;height:100px;}
  .tw-cryscl{position:absolute;width:90px;height:120px;filter:drop-shadow(0 0 22px #74ebf5cc);animation:twGlowC 2.6s infinite;}
  .tw-cryscl .c{position:absolute;bottom:0;background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f4feff,#8ff2ff 45%,#2a8ba8 80%,#14506a);clip-path:polygon(50% 0,76% 12%,90% 62%,70% 100%,30% 100%,10% 62%,24% 12%);}
  .tw-cryscl .c1{left:30%;width:40%;height:100%;}
  .tw-cryscl .c2{left:0;width:30%;height:62%;transform:rotate(-14deg);}
  .tw-cryscl .c3{right:0;width:30%;height:70%;transform:rotate(12deg);}
  .tw-cryscl.pink .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#fff0f8,#ff8ac2 45%,#a82a6a 80%,#50143a);}
  .tw-cryscl.gold .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#fff8e0,#ffd75e 45%,#a8781a 80%,#503a0a);}
  .tw-cryscl.green .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f0fff0,#7dff8a 45%,#2a8b3a 80%,#145020);}
  .tw-cryscl.violet .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f8f0ff,#c28aff 45%,#6a2aa8 80%,#3a1450);}
  .tw-cryscl.tall{width:60px;height:150px;}
  .tw-cryscl.wide{width:110px;height:90px;}
  .tw-firefly{position:absolute;width:5px;height:5px;border-radius:50%;background:#bffcff;box-shadow:0 0 10px #74ebf5;animation:twFly ease-in-out infinite;}
  .tw-iceblock{position:absolute;left:50%;top:5%;transform:translateX(-50%);width:min(62%,380px);height:170px;background:linear-gradient(180deg,#ffffffcc,#bfefff88 40%,#74ebf544 70%,#74ebf522);border-radius:14px;box-shadow:0 0 40px #bfefff88;clip-path:polygon(6% 0,94% 0,100% 30%,96% 100%,4% 100%,0 30%);z-index:2;}
  .tw-coinp{position:absolute;width:14px;height:14px;border-radius:50%;background:radial-gradient(#ffe9a8,#c9a227);box-shadow:0 0 8px #f8b500;}
  .tw-ingot{position:absolute;width:42px;height:14px;border-radius:3px;background:linear-gradient(180deg,#ffe9a8,#c9a227 50%,#8a6a1a);box-shadow:inset 0 1px 0 #fff8,0 2px 4px #000c;}

  .tw-vaultroom{position:absolute;inset:0;background:linear-gradient(180deg,#08080f,#101018 45%,#08080f);}
  .tw-safebox{position:absolute;width:36px;height:28px;border-radius:5px;background:linear-gradient(180deg,#161622,#0b0b14);border:2px solid currentColor;box-shadow:0 0 10px currentColor;animation:twFlickP 3s steps(2) infinite;}
  .tw-vspot{position:absolute;top:0;width:14%;height:40%;background:linear-gradient(180deg,#ffe9a844,transparent 85%);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%);filter:blur(3px);animation:twGlowC 4s infinite;}
  .tw-vaultdoorround{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(70%,420px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 32%,#3a3a48,#1c1c26 55%,#0c0c12 85%);border:8px solid #f8b50066;box-shadow:0 0 60px #f8b50044;}
  .tw-vaultdoorround .tw-ring{position:absolute;inset:10%;border-radius:50%;border:5px solid #00d2ff88;box-shadow:0 0 20px #00d2ff66;animation:twSpin 14s linear infinite;}
  .tw-keypad{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:34%;height:40%;background:linear-gradient(180deg,#1a2142,#0d1226);border:3px solid #7dff8a88;border-radius:8px;box-shadow:0 0 16px #7dff8a55;display:grid;grid-template-columns:repeat(3,1fr);gap:6%;padding:8%;}
  .tw-keypad i{background:linear-gradient(180deg,#2a3a5a,#16203a);border-radius:3px;}
  .tw-beam2{position:absolute;height:3px;background:currentColor;box-shadow:0 0 10px currentColor,0 0 20px currentColor;opacity:.85;animation:twBeamPulse 2s ease-in-out infinite;}
  .tw-ncam{position:absolute;width:36px;height:26px;background:linear-gradient(180deg,#2a2a38,#14141c);border-radius:6px 6px 4px 4px;border:2px solid currentColor;box-shadow:0 0 12px currentColor;}
  .tw-ncam::after{content:"";position:absolute;left:50%;top:58%;width:10px;height:10px;transform:translateX(-50%);border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor;animation:twFlickP 1.4s steps(2) infinite;}
  .tw-ncam .beam{position:absolute;left:50%;top:100%;width:70px;height:100px;transform-origin:top center;background:linear-gradient(180deg,currentColor,transparent);opacity:.18;clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);animation:twCamSweep 4s ease-in-out infinite alternate;}
  .tw-gloss{position:absolute;bottom:0;left:0;right:0;height:12%;background:linear-gradient(180deg,#0000,#f8b50018 40%,#00000088);}
  .tw-goldspill{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:70%;height:18%;background:radial-gradient(ellipse at 50% 100%,#f8b50055,transparent 70%);filter:blur(6px);}

  .tw-part{position:absolute;width:4px;height:4px;border-radius:50%;}
  .tw-part.snow{background:#ffffffcc;animation:twFall linear infinite;}
  .tw-part.spark{background:#f8b500;box-shadow:0 0 6px #f8b500;animation:twRise linear infinite;}
  .tw-part.neon{box-shadow:0 0 8px currentColor;background:currentColor;animation:twFlickP 2.2s steps(2) infinite;}

  /* === BRIEFING + JEU (inchangés) === */
  .tw-brief{position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9995;}
  .tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:16px;max-width:82%;text-align:center;}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
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

  @keyframes twFlickP{50%{opacity:.15}}
  @keyframes twCloud{from{left:-30%}to{left:110%}}
  @keyframes twWin{0%,38%{opacity:1}45%,88%{opacity:.08}95%,100%{opacity:1}}
  @keyframes twDrive{from{left:-20%}to{left:115%}}
  @keyframes twDriveR{from{left:115%}to{left:-20%}}
  @keyframes twSlide{to{background-position:300% 0}}
  @keyframes twBlimp{from{left:-15%}to{left:110%}}
  @keyframes twPlaneX{from{left:110%}to{left:-10%}}
  @keyframes twShoot{0%{opacity:0;transform:rotate(-30deg) translateX(0)}5%{opacity:.9}12%{opacity:0;transform:rotate(-30deg) translateX(-240px)}100%{opacity:0}}
  @keyframes twGlowC{50%{filter:brightness(1.6)}}
  @keyframes twFly{0%,100%{transform:translate(0,0);opacity:.9}25%{transform:translate(14px,-18px);opacity:.5}50%{transform:translate(-10px,-30px);opacity:.9}75%{transform:translate(8px,-12px);opacity:.6}}
  @keyframes twSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
  @keyframes twBeamPulse{50%{opacity:.4}}
  @keyframes twCamSweep{from{transform:translateX(-50%) rotate(-25deg)}to{transform:translateX(-50%) rotate(25deg)}}
  @keyframes twFall{0%{top:-4%}100%{top:104%}}
  @keyframes twRise{0%{top:104%}100%{top:-4%}}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  @keyframes twFog{50%{opacity:.25}}

  @media (max-width:760px), (pointer:coarse){
    .tw-road{height:140px;}
    .tw-horizon{bottom:140px;}
    .tw-cityback{bottom:140px;height:38%;}
    .tw-city{bottom:140px;height:30%;}
    .tw-wl{animation:none;box-shadow:none;}
    .tw-star2{animation:none;}
    .tw-part{display:none;}
    .tw-cloud{display:none;}
    .tw-reflect{display:none;}
    .tw-car .hl,.tw-car .tl{display:none;}
    .tw-cryscl{filter:none;animation:none;}
    .tw-panel .num{font-size:36px;}
  }
  `;
  document.head.appendChild(style);
})();

/* ----- 5. GÉNÉRATION DES FONDS ----- */
function generateSceneHTML(c, W, C) {
  if (SCENE_CACHE[c]) return SCENE_CACHE[c];
  let html = "";

  if (W.scene === "city") {
    html += `<span class="tw-moon"></span>`;
    const starsN = IS_MOBILE ? 45 : 120;
    for (let i = 0; i < starsN; i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%55}%;animation-delay:${(i*.23)%3}s;"></span>`;
    const cloudsN = IS_MOBILE ? 2 : 4;
    for (let i = 0; i < cloudsN; i++) html += `<span class="tw-cloud" style="top:${3+i*7}%;width:${22+(i*9)%16}%;animation-duration:${70+i*25}s;animation-delay:${i*11}s;"></span>`;
    html += `<div class="tw-horizon"></div>`;
    // 🔦 Bat-signal : projecteurs + logo projeté dans le ciel
    html += `<div class="tw-signalbeam l"></div><div class="tw-signalbeam r"></div>`;
    html += `<div class="tw-batsignal">⚡ CHIFFRE BLITZ</div>`;
    const cols = ["#00ffff","#ff00ff","#f8b500","#7dff8a"];
    let back = "";
    const hb = [72,92,80,96,86,90,78];
    for (let i = 0; i < (IS_MOBILE?6:7); i++) back += `<div class="tw-bldg" style="height:${hb[i]}%;flex:${i%2?1.25:1};"></div>`;
    html += `<div class="tw-cityback">${back}</div>`;
    let b = "";
    const hs = [48,72,56,86,62,76], hf = [1,1.2,.95,1.15,1,.9];
    for (let i = 0; i < (IS_MOBILE?5:6); i++) {
      let wins = "";
      const n = IS_MOBILE ? (6+(i%3)*3) : (14+(i%3)*6);
      for (let w = 0; w < n; w++) wins += `<span class="tw-wl" style="color:${cols[(w+i)%4]};left:${6+((w*23)%82)}%;top:${4+((w*29)%88)}%;animation-duration:${2.5+((w*13)%4)}s;animation-delay:${(w*0.37)%3}s;"></span>`;
      b += `<div class="tw-bldg" style="height:${hs[i]}%;flex:${hf[i]};">${wins}${(!IS_MOBILE&&i%3===0)?'<span class="tw-ant"></span>':""}</div>`;
    }
    html += `<div class="tw-city">${b}</div>`;
    const roadH = IS_MOBILE ? 140 : 180;
    const tpos = IS_MOBILE ? [{o:8,l:true},{o:10,l:false}] : [{o:5,l:true},{o:9,l:false},{o:22,l:true}];
    for (let i = 0; i < tpos.length; i++) {
      const p = tpos[i], h = 300 + i*120, w = 90 + (i*23)%40;
      let wins2 = "";
      const nw = IS_MOBILE ? 10 : 22;
      for (let wI = 0; wI < nw; wI++) wins2 += `<span class="tw-wl" style="color:${cols[(wI+i)%4]};left:${8+((wI*23)%78)}%;top:${2+((wI*17)%94)}%;animation-duration:${2.5+((wI*13)%4)}s;"></span>`;
      html += `<div class="tw-bldg-solo" style="bottom:${roadH}px;${p.l?("left:"+p.o+"%"):("right:"+p.o+"%")};height:${h}px;width:${w}px;opacity:.85;">${wins2}</div>`;
    }
    html += `<div class="tw-blimp" style="top:24%;animation-duration:55s;animation-delay:-20s;color:#00d2ff;"><span class="neo"></span></div>`;
    if (!IS_MOBILE) {
      html += `<div class="tw-blimp" style="top:48%;animation-duration:70s;animation-delay:-45s;color:#ff2bd6;"><span class="neo"></span></div>`;
      html += `<div class="tw-plane" style="top:18%;animation-duration:16s;animation-delay:-6s;"></div>`;
    }
    html += `<span class="tw-shoot" style="left:70%;top:14%;animation-delay:2s;"></span>`;
    html += `<div class="tw-road"><span class="tw-lane"></span></div>`;
    if (!IS_MOBILE) html += `<div class="tw-reflect"></div>`;
    const car = (cls, bottom, dur, delay, col) => `<span class="tw-car ${cls}" style="bottom:${bottom};animation-duration:${dur};animation-delay:${delay};color:${col};"><i class="cb"></i><i class="cc"></i><i class="ug"></i><i class="hl"></i><i class="tl"></i></span>`;
    if (IS_MOBILE) html += car("","14px","9s","0s","#00d2ff")+car("s","28px","7s","3s","#f8b500")+car("r","78px","10s","1.5s","#ff2bd6");
    else html += car("","16px","9s","0s","#00d2ff")+car("","34px","11s","2.5s","#f8b500")+car("s","24px","7s","5s","#7dff8a")+car("r","96px","10s","1.5s","#ff2bd6")+car("r s","104px","8s","6.5s","#ff8a00");
  }

  if (W.scene === "glacier") {
    html += `<div class="tw-cavewall"></div>`;
    let treasure = "";
    for (let i = 0; i < 6; i++) treasure += `<span class="tw-ingot" style="left:${16+i*11}%;bottom:${16+(i%2)*10}px;"></span>`;
    for (let i = 0; i < 8; i++) treasure += `<span class="tw-coinp" style="left:${12+i*10}%;bottom:${6+(i%3)*6}px;"></span>`;
    treasure += `<span class="tw-gem" style="left:22%;bottom:44px;background:#ff2bd6;box-shadow:0 0 12px #ff2bd6;"></span>`;
    html += `<div class="tw-iceblock">${treasure}</div>`;
    html += `<div class="tw-gwall"></div><div class="tw-gwall r"></div>`;
    const gemN = IS_MOBILE ? 8 : 16;
    for (let i = 0; i < gemN; i++) {
      const L = (i % 2 === 0);
      html += `<span class="tw-gem" style="${L?("left:"+(2+(i*7)%8)+"%"):("right:"+(2+(i*7)%8)+"%")};top:${10+(i*11)%80}%;animation-delay:${(i*.4)%2}s;"></span>`;
    }
    html += `<div class="tw-gceil"></div>`;
    [[6,180],[16,130],[26,210],[38,110],[50,180],[62,130],[74,200],[86,120],[94,160]].forEach(p => { html += `<span class="tw-stalac" style="left:${p[0]}%;height:${p[1]}px;"></span>`; });
    html += `<div class="tw-gfloor"></div>`;
    [[10,130],[26,100],[42,120],[58,90],[74,110],[90,100]].forEach(p => { html += `<span class="tw-stalag" style="left:${p[0]}%;height:${p[1]}px;"></span>`; });
    const shelfN = IS_MOBILE ? 5 : 8;
    for (let i = 0; i < shelfN; i++) {
      const top = 18 + i * (60 / shelfN), L = (i % 2 === 0), s = .7 + ((i*13)%4)/10;
      html += `<div class="tw-shelf ${L?"":"r"}" style="top:${top}%;${L?"left:0;":"right:0;"}"><span class="rock"></span><span class="tw-cryscl ${["","pink","gold","green","violet"][i%5]} ${["","tall","wide"][i%3]}" style="bottom:18px;left:22%;transform:scale(${s});animation-delay:${i*.5}s;"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i></span></div>`;
    }
    const flyN = IS_MOBILE ? 4 : 8;
    for (let i = 0; i < flyN; i++) html += `<span class="tw-firefly" style="left:${10+(i*29)%80}%;top:${12+(i*17)%70}%;animation-duration:${5+(i%4)*2}s;animation-delay:${i*.6}s;"></span>`;
  }

  if (W.scene === "vault") {
    html += `<div class="tw-vaultroom"></div>`;
    const safeCols = ["#00d2ff","#ff2bd6","#f8b500","#7dff8a","#ff8a00","#c28aff"];
    const rows = IS_MOBILE ? 8 : 12;
    for (let i = 0; i < rows; i++) {
      const top = 6 + i * (88 / rows);
      html += `<span class="tw-safebox" style="left:3%;top:${top}%;color:${safeCols[i%6]};"></span>`;
      html += `<span class="tw-safebox" style="left:9%;top:${top+2}%;color:${safeCols[(i+1)%6]};"></span>`;
      html += `<span class="tw-safebox" style="right:3%;top:${top}%;color:${safeCols[(i+3)%6]};"></span>`;
      html += `<span class="tw-safebox" style="right:9%;top:${top+2}%;color:${safeCols[(i+4)%6]};"></span>`;
    }
    html += `<div class="tw-vspot" style="left:20%;"></div><div class="tw-vspot" style="left:50%;animation-delay:1s;"></div><div class="tw-vspot" style="left:78%;animation-delay:2s;"></div>`;
    html += `<div class="tw-vaultdoorround"><div class="tw-ring"></div><div class="tw-keypad"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>`;
    [{top:20,rot:8,col:"#ff2020"},{top:34,rot:-10,col:"#2bff8a"},{top:50,rot:6,col:"#00d2ff"},{top:66,rot:-8,col:"#ff2bd6"},{top:80,rot:10,col:"#f8b500"}].forEach((b,i)=>{
      html += `<span class="tw-beam2" style="top:${b.top}%;left:6%;right:6%;color:${b.col};transform:rotate(${b.rot}deg);animation-delay:${i*.5}s;"></span>`;
    });
    html += `<div class="tw-ncam" style="left:14%;top:24%;color:#ff2020;"><span class="beam"></span></div>`;
    html += `<div class="tw-ncam" style="right:14%;top:40%;color:#00d2ff;"><span class="beam"></span></div>`;
    for (let i = 0; i < 8; i++) html += `<span class="tw-ingot" style="left:${8+i*11}%;bottom:${12+(i%3)*12}px;"></span>`;
    html += `<div class="tw-gloss"></div><div class="tw-goldspill"></div>`;
  }

  let parts = "";
  for (let i = 0; i < (IS_MOBILE?0:7); i++) parts += `<span class="tw-part ${W.part}" style="color:${C.acc};left:${(i*13+c*7)%96}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;"></span>`;

  const result = html + parts;
  SCENE_CACHE[c] = result;
  return result;
}
  /* === BAT-SIGNAL CHIFFRE BLITZ === */
  .tw-batsignal{position:absolute;top:5%;left:50%;transform:translateX(-50%);font-size:clamp(26px,6vw,64px);font-weight:900;letter-spacing:8px;color:#fff;white-space:nowrap;text-shadow:0 0 20px #ffffffdd,0 0 50px #ffffff99,0 0 90px #ffffff55;opacity:.92;filter:blur(.6px);animation:twSignalPulse 4s ease-in-out infinite;z-index:1;}
  .tw-signalbeam{position:absolute;bottom:26%;width:110px;height:62%;background:linear-gradient(0deg,#ffffff55,#ffffff2b 45%,#ffffff0d 100%);clip-path:polygon(35% 100%,65% 100%,100% 0,0 0);filter:blur(7px);transform-origin:bottom center;z-index:0;animation:twGlowC 4s infinite;}
  .tw-signalbeam.l{left:34%;transform:rotate(14deg);}
  .tw-signalbeam.r{left:66%;transform:rotate(-14deg);}
  @keyframes twSignalPulse{50%{opacity:.55;filter:blur(1.6px)}}
/* ----- 6. ÉCRAN AVENTURE (fixe) ----- */
function openTower() {
  let m = document.getElementById("screen-tower");
  if (!m) {
    m = document.createElement("div");
    m.id = "screen-tower";
    m.innerHTML = `
      <div id="tw-bg"></div>
      <div class="tw-hud">
        <button class="tw-back" onclick="closeTower()">⬅️</button>
        <div class="tw-lives">❤️ <span id="tw-lives-n">${twLives}</span><small id="tw-lives-t"></small></div>
        <div class="tw-coins">🪙 <span id="tw-coins-n">0</span></div>
        <button class="tw-shopbtn" onclick="openShop()">🛒</button>
      </div>
      <div class="tw-qwrap"><span class="lbl" id="tw-q-lbl">⭐ 0/240</span><div class="tw-qbar"><div id="tw-q-fill" style="width:0%"></div></div></div>
      <div class="tw-center">
        <div class="tw-worldtag" id="tw-worldtag"></div>
          <div class="tw-panel" id="tw-panel">
          <div class="num" id="tw-panel-num">1</div>
          <div class="typ" id="tw-panel-typ"></div>
          <div class="tw-panel-stars" id="tw-panel-stars"></div>
        </div>
        <div class="tw-playrow">
          <button class="tw-arrow" id="tw-prev" onclick="advPrev()">‹</button>
          <button class="tw-playbtn" id="tw-play" onclick="advPlay()">PLAY</button>
          <button class="tw-arrow" id="tw-next" onclick="advNext()">›</button>
        </div>
        <div class="tw-lockmsg" id="tw-lockmsg" style="display:none;"></div>
      </div>`;
    document.body.appendChild(m);
  }
  m.style.display = "flex";
  twViewFloor = Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
  socket.emit("get_tower");
  renderAdventure();
  towerDing();
}

function closeTower() { document.getElementById("screen-tower").style.display = "none"; }

function renderAdventure() {
  const scr = document.getElementById("screen-tower");
  if (!scr || scr.style.display === "none") return;
  const world = TowerUtils.getTowerChapter(twViewFloor).id;
  const chap = TOWER_CHAPTERS[world - 1];
  const W = TOWER_WORLDS[world], C = TOWER_COLORS[world];
  document.getElementById("tw-bg").innerHTML = generateSceneHTML(world, W, C);

  const unlocked = TowerUtils.worldUnlocked(world);
  const stars = TowerUtils.starsInWorld(world);
  const pct = Math.min(100, Math.round(stars / WORLD_QUOTA * 100));
  document.getElementById("tw-q-lbl").innerText = `⭐ ${stars}/${WORLD_QUOTA}`;
  document.getElementById("tw-q-fill").style.width = pct + "%";
  document.getElementById("tw-worldtag").innerText = `${chap.icon} ${chap.name}`;
  document.getElementById("tw-coins-n").innerText = (myProfile.coins || 0);
  document.getElementById("tw-lives-n").innerText = twLives;

  const def = TowerUtils.getFloorDef(twViewFloor);
  const inChap = ((twViewFloor - 1) % FPC) + 1;
  const isBoss = (inChap === FPC || inChap % 50 === 0);
  const panel = document.getElementById("tw-panel");
  panel.classList.toggle("boss", isBoss);
  document.getElementById("tw-panel-num").innerText = twViewFloor;
  document.getElementById("tw-panel-typ").innerText = isBoss ? `⚔️ ${chap.boss} GARDIEN` : TowerUtils.typeLabel(def.type);
  const stGot = towerProgress.stars[String(twViewFloor)] || 0;
  document.getElementById("tw-panel-stars").innerHTML = [1,2,3].map(i => `<span class="${i <= stGot ? "on" : ""}">⭐</span>`).join("");

  const lock = document.getElementById("tw-lockmsg");
  if (!unlocked) {
    lock.style.display = "block";
    lock.innerText = `🔒 Quota ⭐ ${WORLD_QUOTA} requis dans le monde précédent`;
  } else lock.style.display = "none";

  const play = document.getElementById("tw-play");
  play.disabled = !unlocked || twLives <= 0;
  document.getElementById("tw-prev").disabled = twViewFloor <= 1;
  document.getElementById("tw-next").disabled = twViewFloor >= Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
}

function advPrev() { if (twViewFloor > 1) { twViewFloor--; renderAdventure(); } }
function advNext() { if (twViewFloor < Math.min(towerProgress.floor + 1, TOTAL_FLOORS)) { twViewFloor++; renderAdventure(); } }
function advPlay() {
  const def = TowerUtils.getFloorDef(twViewFloor);
  def.replay = twViewFloor <= towerProgress.floor;
  showBriefing(def);
}

function showWorldTransition(w) {
  const chap = TOWER_CHAPTERS[w - 1];
  let f = document.createElement("div");
  f.className = "tw-worldfade";
  f.innerHTML = `<div class="big">${chap.icon} ${chap.name}</div><div class="sub">${currentLang==="fr"?"Nouveau monde débloqué !":"New world unlocked!"}</div>`;
  document.body.appendChild(f);
  requestAnimationFrame(() => f.classList.add("on"));
  setTimeout(() => {
    twViewFloor = (w - 1) * FPC + 1;
    renderAdventure();
    f.classList.remove("on");
    setTimeout(() => f.remove(), 700);
  }, 1400);
}

/* ----- 7. BOUTIQUE ----- */
function openShop() {
  closeShop();
  const d = document.createElement("div");
  d.className = "tw-shop";
  d.id = "tw-shop";
  let items = "";
  SHOP_ITEMS.forEach(it => {
    items += `<div class="tw-shop-item"><span class="ic">${it.icon}</span><span class="nm">${it.name}</span><button class="buy" onclick="shopBuy('${it.id}')">${it.iap ? "Bientôt" : it.price + " 🪙"}</button></div>`;
  });
  d.innerHTML = `<div class="tw-shop-card"><h3>🛒 BOUTIQUE</h3>${items}<button class="btn-secondary" style="width:100%;" onclick="closeShop()">❌ Fermer</button></div>`;
  document.body.appendChild(d);
}
function closeShop() { const s = document.getElementById("tw-shop"); if (s) s.remove(); }
function shopBuy(id) {
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it) return;
  if (it.iap) { alert(currentLang==="fr" ? "Bientôt disponible via Google Play !" : "Coming soon via Google Play!"); return; }
  socket.emit("shop_buy", { id: id, price: it.price });
}
socket.on("shop_result", (r) => {
  if (r && r.ok) { if (r.lives) twLives = Math.min(MAX_LIVES, twLives + r.lives); renderAdventure(); }
});

/* ----- 8. BRIEFING ----- */
function showBriefing(def) {
  closeBriefing();
  const fr = currentLang === "fr";
  const curStars = towerProgress.stars[String(def.floor)] || 0;
  const starTime = Math.floor(def.time * 0.6);
  let starRule = fr ? `💡 ⭐ terminer · ⭐⭐ ≤2 erreurs · ⭐⭐⭐ 0 erreur + < ${starTime}s` : `💡 ⭐ finish · ⭐⭐ ≤2 mistakes · ⭐⭐⭐ 0 mistake + < ${starTime}s`;
  if (def.type === "pairs" || def.type === "sprint") starRule = fr ? `💡 ⭐ finir · ⭐⭐ rapide · ⭐⭐⭐ très rapide` : `💡 ⭐ finish · ⭐⭐ fast · ⭐⭐⭐ very fast`;
  const replayLine = def.replay ? `<div style="font-size:10px;color:#f8b500;margin-bottom:6px;">${fr?"Actuel : ":"Current: "}{"⭐".repeat(curStars)}</div>` : "";
  const b = document.createElement("div");
  b.id = "tw-brief"; b.className = "tw-brief";
  b.innerHTML = `<div class="tw-brief-card">
    <div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🏰 ${fr?"ÉTAGE":"FLOOR"} ${def.floor} — ${TowerUtils.typeLabel(def.type)}</div>
    <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${starRule}</div>
    ${replayLine}
    <button class="btn-main btn-blue" style="width:100%;margin-bottom:6px;" onclick="closeBriefing();startTowerFloor(TowerUtils.getFloorDef(${def.floor}))">${def.replay?"🔄 REJOUER":"⚡ LANCER !"}</button>
    <button class="btn-secondary" style="width:100%;" onclick="closeBriefing()">❌ Annuler</button>
  </div>`;
  document.body.appendChild(b);
}
function closeBriefing() { const b = document.getElementById("tw-brief"); if (b) b.remove(); }

/* ----- 9. MOTEUR DE JEU ----- */
function ensureTowerOverlay() {
  let ov = document.getElementById("tower-game");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "tower-game"; ov.className = "twg-screen";
    ov.innerHTML = `<div class="twg-header"><button class="tw-back" onclick="quitFloor()">⬅️</button><b id="twg-title"></b><span id="twg-timer">⏱️</span></div><div id="tg-bar" class="twg-bar"></div><div id="tg-hud" class="twg-hud"></div><div class="twg-gridwrap"><div id="tg-grid" class="tg-grid"></div></div><div id="tg-msg" class="twg-msg"></div>`;
    document.body.appendChild(ov);
  }
  return ov;
}
function cloneState(s) {
  return { type:s.type, total:s.total, gridSize:s.gridSize, floor:s.floor, target:s.target, targetColor:s.targetColor, targetParity:s.targetParity, forbidden:s.forbidden, timeLeft:s.timeLeft, ai:s.ai, gone:Object.assign({},s.gone||{}), revealed:Object.assign({},s.revealed||{}), display:(s.display||[]).slice(), sel:(s.sel===undefined?null:s.sel) };
}
function startTowerFloor(def) {
  if (TW) return;
  const ov = ensureTowerOverlay();
  ov.style.display = "flex";
  TW_lastFloor = def.floor;
  TW = null; TW_dom = null; TW_buttons = []; TW_hudCache = "";
  stopLocalTimer();
  document.getElementById("tg-grid").innerHTML = "";
  document.getElementById("twg-title").innerText = "🏰 ÉTAGE " + def.floor;
  socket.emit("tower_floor_start", { floor: def.floor });
}
function buildGridFromState(st) {
  const g = document.getElementById("tg-grid");
  const cols = st.gridSize <= 16 ? 4 : (st.gridSize <= 20 ? 5 : 6);
  g.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  g.innerHTML = ""; TW_buttons = [];
  st.display.forEach((v, i) => {
    const b = document.createElement("button");
    b.className = "tg-tile" + (st.type === "fog" ? " foggy" : "");
    if (st.gone[i]) b.classList.add("gone");
    if (st.type === "color" && v) { b.style.background = `linear-gradient(180deg,${v.hex},#111827 85%)`; b.textContent = ""; }
    else if (st.type === "pairs") { b.textContent = st.gone[i] ? "" : (v === null ? "?" : v); if ((st.revealed && st.revealed[i]) || st.sel === i) b.classList.add("sel"); }
    else b.textContent = v;
    b.onclick = () => handleTowerClick(i, b);
    g.appendChild(b); TW_buttons[i] = b;
  });
}
function syncDomToState(st) {
  for (let i = 0; i < st.display.length; i++) {
    const b = TW_buttons[i]; if (!b) continue;
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
  if (!TW_dom || TW_dom.gone[i] || TW_pairsLock) return;
  b.style.transform = "scale(0.9)";
  setTimeout(() => { if (b) b.style.transform = ""; }, 120);
  const t = TW_dom.type;
  if (t === "pairs") { socket.emit("tower_click", { index: i }); return; }
  const v = TW_dom.display[i];
  let success = null;
  if (t === "color" && TW_dom.targetColor) success = (v && v.key === TW_dom.targetColor.key);
  else if (t === "parity") success = (TW_dom.targetParity === "even" ? (v % 2 === 0) : (v % 2 !== 0));
  else if (t === "forbidden") success = (v !== TW_dom.forbidden);
  else if (TW_dom.target !== null && TW_dom.target !== undefined) success = (v === TW_dom.target);
  if (success === true) {
    TW_dom.gone[i] = true; b.classList.add("gone");
    if (t === "reverse") TW_dom.target--;
    else if (["classic","sprint","fog","nofail"].includes(t)) TW_dom.target++;
    if (typeof SoundEngine !== "undefined" && SoundEngine.playClick) SoundEngine.playClick();
  } else if (success === false) {
    if (typeof SoundEngine !== "undefined" && SoundEngine.playError) SoundEngine.playError();
  }
  socket.emit("tower_click", { index: i });
}
function stopLocalTimer() { if (TW_localTimer) { clearInterval(TW_localTimer); TW_localTimer = null; } }
function startLocalTimer(tl) {
  stopLocalTimer();
  let left = (typeof tl === "number" ? tl : 0);
  const el = document.getElementById("twg-timer");
  const paint = () => { if (el) { el.innerText = "⏱️ " + Math.max(0, Math.ceil(left)) + "s"; el.style.color = left <= 5 ? "#ff4b2b" : "#fff"; } };
  paint();
  TW_localTimer = setInterval(() => { left -= 0.25; paint(); }, 250);
}
function renderHUDFromState() {
  const h = document.getElementById("tg-hud"); if (!h || !TW) return;
  const fr = currentLang === "fr";
  let main = "";
  if (TW.type === "color" && TW.targetColor) main = `COULEUR : <span style="color:${TW.targetColor.hex};">${TW.targetColor.name}</span>`;
  else if (TW.type === "pairs") main = "🧩 RETROUVE LES PAIRES";
  else if (TW.type === "parity") main = TW.targetParity === "even" ? "CLIQUE : PAIRS" : "CLIQUE : IMPAIRS";
  else if (TW.type === "forbidden") main = `INTERDIT : <span style="color:#ff4b2b;">${TW.forbidden}</span>`;
  else if (TW.target !== null && TW.target !== undefined) main = `CIBLE : ${TW.target}`;
  if (main !== TW_hudCache) { h.innerHTML = main; TW_hudCache = main; }
  const bar = document.getElementById("tg-bar");
  if (bar) { if (TW.type === "boss") { bar.style.display = "block"; bar.innerHTML = `<div style="width:${Math.min(100,TW.ai/TW.total*100)}%;height:100%;background:linear-gradient(90deg,#ff4b2b,#f8b500);"></div>`; } else bar.style.display = "none"; }
  document.getElementById("twg-title").innerText = "🏰 ÉTAGE " + TW.floor + " — " + TowerUtils.typeLabel(TW.type);
}
function showFailUI() {
  const ov = ensureTowerOverlay();
  ov.style.display = "flex";
  document.getElementById("tg-bar").style.display = "none";
  document.getElementById("tg-hud").innerHTML = "";
  const g = document.getElementById("tg-grid");
  g.style.gridTemplateColumns = "1fr";
  g.innerHTML = `<div style="text-align:center;"><div style="font-size:30px;">💥</div><div style="color:#ff4b2b;font-weight:900;margin:6px 0;">ÉTAGE RATÉ !</div><button class="btn-main btn-blue" onclick="retryFloor()">🔄 Réessayer</button><button class="btn-secondary" onclick="quitFloor()">Quitter</button></div>`;
}
function retryFloor() { TW = null; TW_dom = null; stopLocalTimer(); startTowerFloor({ floor: TW_lastFloor }); }
function quitFloor() {
  TW = null; TW_dom = null; stopLocalTimer();
  socket.emit("tower_quit");
  const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
}
function showTowerWinPopup(res) {
  const d = document.createElement("div");
  d.className = "modal-overlay"; d.style.display = "flex";
  d.innerHTML = `<div class="modal-card" style="max-width:300px;text-align:center;">
    <h3 style="color:#00ff88;margin:0 0 6px 0;">✅ ÉTAGE ${res.floor} VAINCU !</h3>
    <div class="tw-stars">${[1,2,3].map(i=>`<span style="animation-delay:${i*0.2}s;${i<=res.stars?"":"filter:grayscale(1);opacity:.3;"}">⭐</span>`).join("")}</div>
    <div style="font-size:13px;color:#f8b500;font-weight:bold;margin-bottom:10px;">+${res.coins} 🪙</div>
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove();renderAdventure()">Continuer ⚡</button>
  </div>`;
  document.body.appendChild(d);
  towerDing();
}

/* ----- 10. SOCKET EVENTS ----- */
socket.on("tower_data", (d) => {
  const oldWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  towerProgress = { floor: d.floor || 0, stars: d.stars || {} };
  const newWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  if (newWorld !== oldWorld && TowerUtils.worldUnlocked(newWorld)) showWorldTransition(newWorld);
  else renderAdventure();
});
socket.on("tower_state", (st) => {
  if (!st || !st.display) return;
  const first = TW_buttons.length === 0;
  TW = st; TW_lastFloor = st.floor;
  if (first) { buildGridFromState(st); TW_dom = cloneState(st); }
  else { syncDomToState(st); TW_dom = cloneState(st); }
  renderHUDFromState();
  startLocalTimer(st.timeLeft);
});
socket.on("tower_fail", () => { TW = null; TW_dom = null; stopLocalTimer(); showFailUI(); });
socket.on("tower_result", (res) => {
  TW = null;
  const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
  if (!res.ok) return;
  const oldWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  towerProgress.floor = Math.max(towerProgress.floor, res.floor);
  towerProgress.stars[String(res.floor)] = Math.max(towerProgress.stars[String(res.floor)] || 0, res.stars);
  showTowerWinPopup(res);
  const newWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  if (newWorld !== oldWorld && TowerUtils.worldUnlocked(newWorld)) setTimeout(() => showWorldTransition(newWorld), 600);
  else renderAdventure();
});

/* ----- 11. HELPERS ----- */
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
function renderTower() { renderAdventure(); }
function showElevator() { renderAdventure(); }
function afterWinTravel() { renderAdventure(); }
