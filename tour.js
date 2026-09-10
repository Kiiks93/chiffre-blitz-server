/* ============================================================
TOUR.JS — AVENTURE « MATCH FACTORY » (écran fixe par monde)
============================================================ */

/* ----- 1. CONFIGURATION ----- */
const TOWER_CHAPTERS = [
  { id:1, season:1, name:"Quartier Néon", icon:"🌆", boss:"🤖", objects:[] },
  { id:2, season:1, name:"Grottes de Cristal", icon:"🧊", boss:"🗿", objects:[] },
  { id:3, season:1, name:"Banque Dorée", icon:"🏦", boss:"👾", objects:[] },
  { id:4, season:2, name:"Tour Hantée", icon:"🎃", boss:"🧛", objects:[] },
  { id:5, season:2, name:"Cimetière Brumeux", icon:"🌫️", boss:"💀", objects:[] },
  { id:6, season:2, name:"Antre Citrouille", icon:"👑", boss:"🎃", objects:[] },
  { id:7, season:3, name:"Cime Bonbon", icon:"🍭", boss:"🧝", objects:[] },
  { id:8, season:3, name:"Forêt de Sapins", icon:"🎄", boss:"⛄", objects:[] },
  { id:9, season:3, name:"Atelier du Père Noël", icon:"🎅", boss:"🎅", objects:[] }
];
const FPC = 200;
const TOTAL_FLOORS = 9 * FPC;
const WORLD_QUOTA = 240;
const MAX_LIVES = 10;
const TOWER_CURVE = [
  [12,16,30,26],
  [14,19,28,23],
  [16,21,26,21],
  [18,23,24,19],
  [20,25,22,18],
  [22,27,20,17],
  [24,29,19,16],
  [26,31,18,15],
  [28,34,17,13]
];
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
  { id:"pack_vies_1", icon:"💖", name:"Pack Vies (10 vies)", price:0, iap:true, eur:"1,00 €" },
  { id:"pack_mixte_3", icon:"🎁", name:"Pack Mixte (5 vies + 2 jokers)", price:0, iap:true, eur:"3,00 €" },
  { id:"pack_blitz_5", icon:"💎", name:"Pack Blitz (10 vies + 5 jokers)", price:0, iap:true, eur:"5,00 €" }
];

/* ----- 2. ÉTAT GLOBAL ----- */
let towerProgress = { floor: 0, stars: {} };
let twViewFloor = 1;
let twLives = MAX_LIVES;
let twJokers = { time: 0, shield: 0 };
let twNextLife = 0;
let TW = null, TW_dom = null, TW_buttons = [], TW_lastFloor = 0;
let TW_hudCache = "", TW_localTimer = null, TW_lastClick = 0, TW_pairsLock = false;
let TW_lastState = 0;
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
    const chap = Math.ceil(floor / FPC);
    const c = TOWER_CURVE[Math.min(chap,9)-1];
    const t01 = (inChap - 1) / (FPC - 1);
    let gridSize = Math.round(c[0] + (c[1]-c[0]) * t01);
    let time = Math.round(c[2] + (c[3]-c[2]) * t01);
    if (inChap <= 10) { gridSize = Math.max(10, gridSize - 2); time += 2; }
    if (inChap === FPC || inChap % 50 === 0) return { floor, gridSize, time, type: "boss" };
    const seq = ["classic","reverse","color","pairs","sprint","parity","forbidden","memory","nofail"];
    const t = seq[(inChap - 1) % 9];
    if (t === "sprint") return { floor, gridSize, time: Math.max(6, Math.round(time * 0.4)), type: "sprint" };
    if (t === "nofail") return { floor, gridSize, time: Math.max(14, Math.round(time * 0.7)), type: "nofail" };
    if (t === "pairs") { let g = gridSize + 8; if (g % 2) g++; return { floor, gridSize: g, time: Math.max(25, Math.round(g/2 * 5)), type: "pairs" }; }
    if (t === "parity") return { floor, gridSize: Math.min(60, gridSize + 12), time: time + 3, type: "parity" };
    if (t === "memory") return { floor, gridSize, time: time + 4, type: "memory" };
    return { floor, gridSize, time, type: t };
  },
  typeLabel(t) {
    const fr = currentLang === "fr";
    return ({classic:fr?"⚡ Croissant":" Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",color:fr?"🎨 Couleurs":"🎨 Colors",pairs:fr?"🧩 Paires":"🧩 Pairs",parity:fr?"🔢 Pair/Impair":"🔢 Even/Odd",forbidden:fr?"🚫 Interdit":"🚫 Forbidden",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",memory:fr?"🧠 Mémoire":"🧠 Memory",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t] || t;
  }
};

/* ----- 4. CSS CONSOLIDÉ ----- */
(function() {
  const style = document.createElement('style');
  style.textContent = `
  #screen-tower{position:fixed;inset:0;background:#000;z-index:9990;display:none;flex-direction:column;}
  #tw-bg{position:absolute;inset:0;overflow:hidden;z-index:0;}
  .tw-hud{position:relative;z-index:5;display:flex;align-items:center;gap:8px;padding:10px 12px;}
  .tw-hud .tw-back{background:#1a1a2e;border:1px solid #00d2ff;color:#00d2ff;border-radius:8px;padding:6px 10px;font-size:14px;}
  .tw-lives{display:flex;align-items:center;gap:5px;background:#1a1a2ecc;border:2px solid #ff4b2b;border-radius:10px;padding:4px 10px;color:#fff;font-weight:900;font-size:14px;}
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
  .tw-shop{position:fixed;inset:0;background:#000c;z-index:9997;display:flex;align-items:center;justify-content:center;}
  .tw-shop-card{background:#0f051d;border:2px solid #f8b500;border-radius:14px;padding:16px;width:min(92%,360px);}
  .tw-shop-card h3{margin:0 0 10px;color:#f8b500;text-align:center;}
  .tw-shop-item{display:flex;align-items:center;gap:10px;background:#1a1a2e;border:1px solid #333;border-radius:10px;padding:10px;margin-bottom:8px;}
  .tw-shop-item .ic{font-size:24px;}
  .tw-shop-item .nm{flex:1;color:#fff;font-weight:700;font-size:13px;}
  .tw-shop-item .buy{background:linear-gradient(180deg,#f8b500,#c9a227);border:none;border-radius:8px;padding:7px 12px;font-weight:900;color:#3a2a05;cursor:pointer;}
  .tw-shop-item .buy.iap{background:linear-gradient(180deg,#3ae05a,#1a9a3a);color:#fff;}
  .tw-shop-item .buy.iap:disabled{filter:grayscale(1);opacity:.6;}
  .twj-bar{display:flex;justify-content:center;gap:14px;padding:10px 12px 14px;}
  .twj-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff;color:#fff;border-radius:14px;padding:10px 18px;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #061024,0 0 12px #00d2ff33;}
  .twj-btn b{background:#00d2ff;color:#061024;border-radius:8px;padding:2px 8px;font-size:13px;}
  .twj-btn:disabled{opacity:.55;filter:grayscale(.6);cursor:default;}
  .tg-grid.shielded{outline:3px solid #f8b500;outline-offset:8px;border-radius:18px;box-shadow:0 0 30px #f8b50066,inset 0 0 20px #f8b50022;animation:twShieldGrid 1.6s ease-in-out infinite;}
  @keyframes twShieldGrid{50%{box-shadow:0 0 45px #f8b500aa,inset 0 0 26px #f8b50033;}}
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
  .tw-batsignal{position:absolute;top:5%;left:50%;transform:translateX(-50%);font-size:clamp(26px,6vw,64px);font-weight:900;letter-spacing:8px;color:#fff;white-space:nowrap;text-shadow:0 0 20px #ffffffdd,0 0 50px #ffffff99,0 0 90px #ffffff55;opacity:.92;filter:blur(.6px);animation:twSignalPulse 4s ease-in-out infinite;z-index:1;}
  .tw-signalbeam{position:absolute;bottom:26%;width:110px;height:62%;background:linear-gradient(0deg,#ffffff55,#ffffff2b 45%,#ffffff0d 100%);clip-path:polygon(35% 100%,65% 100%,100% 0,0 0);filter:blur(7px);transform-origin:bottom center;z-index:0;animation:twGlowC 4s infinite;}
  .tw-signalbeam.l{left:34%;transform:rotate(14deg);}
  .tw-signalbeam.r{left:66%;transform:rotate(-14deg);}
  .tw-cavewall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#74ebf518 0%,#0a2a3a66 35%,#000000ee 78%);}
  .tw-gceil{position:absolute;top:0;left:0;right:0;height:160px;background:linear-gradient(0deg,#0a2a3a,#04141d);}
  .tw-cavedark{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#00000055 0%,#000000aa 55%,#000000e6 100%);z-index:3;pointer-events:none;}
  .tw-stalac{position:absolute;top:0;width:44px;background:linear-gradient(180deg,#04141d,#74ebf5 60%,#e8fbff);clip-path:polygon(48% 100%,52% 100%,62% 60%,72% 30%,100% 0,0 0,28% 30%,38% 60%);filter:drop-shadow(0 0 10px #74ebf5cc);}
  .tw-stalag{position:absolute;bottom:0;width:44px;background:linear-gradient(0deg,#5a8ea0aa,#bfefffcc 55%,#ffffff);clip-path:polygon(48% 0,52% 0,62% 30%,72% 60%,100% 100%,0 100%,28% 60%,38% 30%);filter:drop-shadow(0 0 10px #74ebf5cc);}
  .tw-gwall{position:absolute;top:0;bottom:0;width:12%;background:linear-gradient(90deg,#04141d,#0a2a3a);clip-path:polygon(0 0,100% 3%,70% 8%,100% 14%,75% 22%,100% 30%,70% 38%,100% 46%,75% 55%,100% 63%,70% 72%,100% 80%,75% 88%,100% 95%,70% 100%,0 100%);}
  .tw-gwall.r{left:auto;right:0;background:linear-gradient(270deg,#04141d,#0a2a3a);clip-path:polygon(100% 0,0 3%,30% 8%,0 14%,25% 22%,0 30%,30% 38%,0 46%,25% 55%,0 63%,30% 72%,0 80%,25% 88%,0 95%,30% 100%,100% 100%);}
  .tw-gem{position:absolute;width:9px;height:9px;background:#74ebf5;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 10px #74ebf5;animation:twGlowC 2s infinite;}
  .tw-icelake{position:absolute;bottom:0;left:0;right:0;height:14%;background:linear-gradient(180deg,#74ebf533,#04141d);box-shadow:inset 0 6px 20px #74ebf544;}
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
  .tw-vaultroom{position:absolute;inset:0;background:linear-gradient(180deg,#08080f,#101018 45%,#08080f);}
  .tw-marble{position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,#ffffff08 40% 42%,transparent 42%),linear-gradient(65deg,transparent 55%,#ffffff06 55% 57%,transparent 57%),linear-gradient(150deg,transparent 70%,#ffffff05 70% 71%,transparent 71%);}
  .tw-vfloor{position:absolute;bottom:0;left:0;right:0;height:22%;background:linear-gradient(180deg,#0a0804 0%,#1a1206 40%,#241a08 100%);box-shadow:inset 0 8px 24px #000c;}
  .tw-vfloor::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 120px,#f8b50011 120px 122px);opacity:.6;}
  .tw-vfloor::after{content:"";position:absolute;left:50%;top:0;transform:translateX(-50%);width:60%;height:100%;background:radial-gradient(ellipse at 50% 0%,#f8b50055,transparent 75%);filter:blur(5px);}
  .tw-vreflect{position:absolute;bottom:0;left:9%;right:9%;height:20%;background:linear-gradient(180deg,transparent,#ff202022 25%,#ff202044 55%,transparent);filter:blur(3px);opacity:.9;}
  .tw-vfloorglow{position:absolute;bottom:4%;left:50%;transform:translateX(-50%);width:46%;height:14%;background:radial-gradient(ellipse at 50% 50%,#f8b50044,transparent 70%);filter:blur(8px);}
  .tw-pillar{position:absolute;top:0;bottom:0;width:8%;background:linear-gradient(90deg,#1a0f02,#5a4410 50%,#1a0f02);border-left:2px solid #8a6a1a44;border-right:2px solid #8a6a1a44;box-shadow:0 0 12px #000c;}
  .tw-goldpile{position:absolute;bottom:10%;width:180px;height:90px;transform:scale(1.3);transform-origin:bottom center;}
  .tw-goldpile .g{position:absolute;border-radius:3px;background:linear-gradient(180deg,#ffe9a8,#c9a227 50%,#8a6a1a);box-shadow:inset 0 1px 0 #fff8,0 2px 4px #000c;}
  .tw-goldpile .c{position:absolute;width:16px;height:16px;border-radius:50%;background:radial-gradient(#ffe9a8,#c9a227);box-shadow:0 0 8px #f8b50088;}
  .tw-spotv{position:absolute;top:0;width:16%;height:52%;background:linear-gradient(180deg,#ffd75e88,#ffe9a844 45%,transparent 85%);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);filter:blur(5px);transform-origin:top center;animation:twGlowC 4s infinite;}
  .tw-spotv.l{left:12%;transform:rotate(20deg);}
  .tw-spotv.r{right:12%;transform:rotate(-20deg);}
  .tw-spotv.c{left:42%;}
  .tw-spotimpact{position:absolute;width:90px;height:26px;border-radius:50%;background:radial-gradient(ellipse,#f8b50099,#f8b50033 55%,transparent 75%);filter:blur(5px);animation:twGlowC 3s infinite;z-index:1;}
  .tw-spotimpact.l{left:41%;top:30%;}
  .tw-spotimpact.c{left:48%;top:27%;}
  .tw-spotimpact.r{right:41%;top:30%;}
  .tw-goldpart{position:absolute;width:3px;height:3px;border-radius:50%;background:#ffd75e;box-shadow:0 0 6px #f8b500;opacity:.7;animation:twGoldFloat linear infinite;}
  @keyframes twGoldFloat{0%{transform:translateY(0);opacity:0}10%{opacity:.8}90%{opacity:.6}100%{transform:translateY(-40vh);opacity:0}}
  .tw-vvignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 40%,#000000aa 78%,#000000dd 100%);pointer-events:none;z-index:3;}
  .tw-vaultglow{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(92%,440px);aspect-ratio:1;border-radius:50%;background:radial-gradient(#f8b50044,transparent 70%);}
  .tw-vaultglow.pulse{animation:twVaultPulse 2s ease-in-out infinite;}
  @keyframes twVaultPulse{0%,100%{opacity:.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
  .tw-vaultframe{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(86%,430px);aspect-ratio:1.15;background:linear-gradient(180deg,#5a4410,#2b1a00);border-radius:14px;box-shadow:0 0 40px #f8b50033,inset 0 0 30px #000;z-index:2;}
  .tw-vaultdoor{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:82%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#c9a227,#8a6a1a 40%,#3a2a05 75%,#160d00);border:6px solid #f8b50088;box-shadow:0 0 60px #f8b50066,inset 0 0 40px #000000aa;}
  .tw-vaultwheel{position:absolute;left:50%;top:50%;width:44%;height:44%;transform:translate(-50%,-50%);border:6px solid #ffe9a8;border-radius:50%;animation:twSpin 16s linear infinite;box-shadow:0 0 20px #f8b50088,inset 0 0 10px #0006;}
  .tw-vaultwheel::before{content:"";position:absolute;inset:-6px;background:linear-gradient(#ffe9a8,#ffe9a8) 50% 0/6px 100% no-repeat,linear-gradient(#ffe9a8,#ffe9a8) 0 50%/100% 6px no-repeat,linear-gradient(45deg,transparent 47%,#ffe9a8 47% 53%,transparent 53%),linear-gradient(-45deg,transparent 47%,#ffe9a8 47% 53%,transparent 53%);}
  .tw-vaultwheel::after{content:"";position:absolute;left:50%;top:50%;width:20%;height:20%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(#fff8dc,#8a6a1a);box-shadow:0 0 12px #ffe9a8;}
  .tw-fbolt{position:absolute;width:10px;height:10px;border-radius:50%;background:radial-gradient(#ffe9a8,#8a6a1a);box-shadow:0 1px 3px #000;}
  .tw-hinge{position:absolute;left:-4%;width:10%;height:12%;background:linear-gradient(180deg,#c9a227,#8a6a1a);border-radius:4px;box-shadow:0 2px 4px #000c;}
  .tw-hinge.h1{top:22%;}.tw-hinge.h2{bottom:22%;}
  .tw-knob{position:absolute;width:9%;height:9%;border-radius:50%;background:radial-gradient(#fff8dc,#c9a227);transform:translate(-50%,-50%);box-shadow:0 0 6px #ffe9a8aa;}
  .tw-dial{position:absolute;right:16%;top:44%;width:14%;height:14%;border-radius:50%;background:radial-gradient(#c9a227,#8a6a1a);box-shadow:inset 0 0 6px #0008,0 0 4px #0008;}
  .tw-dial::before{content:"";position:absolute;inset:30%;background:linear-gradient(#160d00,#160d00) 50% 0/3px 100% no-repeat,linear-gradient(#160d00,#160d00) 0 50%/100% 3px no-repeat,linear-gradient(45deg,transparent 40%,#160d00 40% 60%,transparent 60%);}
  .tw-handle{position:absolute;right:8%;top:30%;width:4%;height:40%;border-radius:4px;background:linear-gradient(90deg,#c9a227,#ffe9a8 50%,#c9a227);box-shadow:0 0 6px #0008;}
  .tw-vbolt{position:absolute;width:5%;height:5%;border-radius:50%;background:radial-gradient(#ffe9a8,#8a6a1a);transform:translate(-50%,-50%);box-shadow:0 1px 3px #000;}
  .tw-laser{position:absolute;left:9%;right:9%;height:2px;background:linear-gradient(90deg,transparent,#ff2020 8%,#ff7070 50%,#ff2020 92%,transparent);box-shadow:0 0 8px #ff2020cc,0 0 20px #ff202066;opacity:.85;animation:twLaserV ease-in-out infinite alternate;z-index:1;}
  .tw-laser::before,.tw-laser::after{content:"";position:absolute;top:-3px;width:9px;height:9px;border-radius:2px;background:#1a0505;box-shadow:0 0 7px #ff2020,inset 0 0 3px #ff7070;animation:twFlickP 1.6s steps(2) infinite;}
  .tw-laser::before{left:-3px;}.tw-laser::after{right:-3px;}
  .tw-laser.d{animation-name:twLaserD;}
  @keyframes twLaserV{from{transform:translateY(-26px)}to{transform:translateY(26px)}}
  @keyframes twLaserD{from{transform:rotate(-5deg) translateY(-18px)}to{transform:rotate(5deg) translateY(18px)}}
  #tw-bg .tw-safebox{position:absolute;width:46px;height:36px;border-radius:4px;border:1px solid #5a4410;animation:none;
    background:
      radial-gradient(circle at 10% 14%,#fff8dc 0 2px,transparent 2px),
      radial-gradient(circle at 90% 14%,#fff8dc 0 2px,transparent 2px),
      radial-gradient(circle at 10% 86%,#fff8dc 0 2px,transparent 2px),
      radial-gradient(circle at 90% 86%,#fff8dc 0 2px,transparent 2px),
      linear-gradient(135deg,#e8c86a 0%,#b8942a 25%,#8a6a1a 50%,#c9a227 75%,#e8c86a 100%);
    box-shadow:inset 0 2px 3px #ffffff55,inset 0 -2px 3px #00000088,0 2px 5px #000000bb,0 0 10px #f8b50022;
  }
  #tw-bg .tw-safebox.bz{background:
      radial-gradient(circle at 10% 14%,#e8d8b8 0 2px,transparent 2px),
      radial-gradient(circle at 90% 14%,#e8d8b8 0 2px,transparent 2px),
      radial-gradient(circle at 10% 86%,#e8d8b8 0 2px,transparent 2px),
      radial-gradient(circle at 90% 86%,#e8d8b8 0 2px,transparent 2px),
      linear-gradient(135deg,#c8a86a 0%,#98742a 25%,#6a4a1a 50%,#a88227 75%,#c8a86a 100%);
  }
  #tw-bg .tw-safebox::before{content:"";position:absolute;left:50%;top:50%;width:13px;height:13px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8dc,#8a6a1a 60%,#3a2a05);box-shadow:0 1px 3px #0009,inset 0 1px 2px #ffffff66;}
  #tw-bg .tw-safebox::after{content:"";position:absolute;inset:3px;border:1px solid #ffffff22;border-radius:3px;background:linear-gradient(115deg,transparent 42%,#ffffff33 42% 47%,transparent 47%);}
  .tw-ncam{position:absolute;width:36px;height:26px;background:linear-gradient(180deg,#2a2a38,#14141c);border-radius:6px 6px 4px 4px;border:2px solid currentColor;box-shadow:0 0 12px currentColor;}
  .tw-ncam::after{content:"";position:absolute;left:50%;top:58%;width:10px;height:10px;transform:translateX(-50%);border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor;animation:twFlickP 1.4s steps(2) infinite;}
  .tw-ncam .beam{position:absolute;left:50%;top:100%;width:70px;height:100px;transform-origin:top center;background:linear-gradient(180deg,currentColor,transparent);opacity:.18;clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);animation:twCamSweep 4s ease-in-out infinite alternate;}
  .tw-gloss{position:absolute;bottom:0;left:0;right:0;height:12%;background:linear-gradient(180deg,#0000,#f8b50018 40%,#00000088);}
  .tw-part{position:absolute;width:4px;height:4px;border-radius:50%;}
  .tw-part.snow{background:#ffffffcc;animation:twFall linear infinite;}
  .tw-part.spark{background:#f8b500;box-shadow:0 0 6px #f8b500;animation:twRise linear infinite;}
  .tw-part.neon{box-shadow:0 0 8px currentColor;background:currentColor;animation:twFlickP 2.2s steps(2) infinite;}
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
  .tg-tile.err{border-color:#ff4b2b !important;box-shadow:0 0 14px #ff4b2b;background:linear-gradient(180deg,#3a0a0a,#200505) !important;animation:twShake .3s;}
  @keyframes twShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
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
  @keyframes twSignalPulse{50%{opacity:.55;filter:blur(1.6px)}}
  @keyframes twGlowC{50%{filter:brightness(1.6)}}
  @keyframes twFly{0%,100%{transform:translate(0,0);opacity:.9}25%{transform:translate(14px,-18px);opacity:.5}50%{transform:translate(-10px,-30px);opacity:.9}75%{transform:translate(8px,-12px);opacity:.6}}
  @keyframes twSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
  @keyframes twCamSweep{from{transform:translateX(-50%) rotate(-25deg)}to{transform:translateX(-50%) rotate(25deg)}}
  @keyframes twFall{0%{top:-4%}100%{top:104%}}
  @keyframes twRise{0%{top:104%}100%{top:-4%}}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  @keyframes twFog{50%{opacity:.25}}
  .tw-lvlpop{position:fixed;inset:0;background:#000c;z-index:9997;display:flex;align-items:center;justify-content:center;}
  .tw-lvlpop-card{background:#0f051d;border:2px solid #00d2ff;border-radius:14px;padding:14px;width:min(94%,420px);max-height:80%;display:flex;flex-direction:column;box-shadow:0 0 20px #00d2ff66;}
  .tw-lvlpop-card h3{color:#00d2ff;text-align:center;margin:0 0 10px;font-size:15px;}
  .tw-lvl-grid{overflow-y:auto;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:4px;}
  .tw-lvl-cell{aspect-ratio:1;border-radius:10px;background:#1a1a2e;border:2px solid #333;color:#fff;font-weight:900;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;cursor:pointer;}
  .tw-lvl-cell .st{font-size:8px;color:#f8b500;line-height:1;}
  .tw-lvl-cell.cur{border-color:#00d2ff;box-shadow:0 0 12px #00d2ff66;}
  .tw-lvl-cell.lock{opacity:.35;cursor:default;}
  .tw-lvl-cell.boss{border-color:#ff4b2b;}
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
    .tw-signalbeam{display:none;}
    .tw-batsignal{font-size:20px;letter-spacing:4px;}
    .tw-goldpart{display:none;}
    .tw-panel .num{font-size:36px;}
  }
  `;
  document.head.appendChild(style);
})();

/* ----- 5. GÉNÉRATION DES FONDS ----- */
function goldPileHTML(leftPos) {
  let g = "";
  [[0,0],[34,0],[68,0],[102,0],[17,14],[51,14],[85,14],[34,28],[68,28]].forEach(p => {
    g += `<span class="g" style="left:${p[0]}px;bottom:${p[1]}px;width:30px;height:11px;"></span>`;
  });
  for (let i = 0; i < 5; i++) g += `<span class="c" style="left:${-8+i*30}px;bottom:${-2+(i%2)*4}px;"></span>`;
  return `<div class="tw-goldpile" style="left:${leftPos};">${g}</div>`;
}
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
    html += `<div class="tw-gwall"></div><div class="tw-gwall r"></div>`;
    const gemN = IS_MOBILE ? 6 : 12;
    for (let i = 0; i < gemN; i++) {
      const L = (i % 2 === 0);
      html += `<span class="tw-gem" style="${L?("left:"+(2+(i*7)%8)+"%"):("right:"+(2+(i*7)%8)+"%")};top:${12+(i*11)%76}%;animation-delay:${(i*.4)%2}s;"></span>`;
    }
    html += `<div class="tw-gceil"></div>`;
    [[6,180],[16,130],[26,210],[38,110],[50,180],[62,130],[74,200],[86,120],[94,160]].forEach(p => { html += `<span class="tw-stalac" style="left:${p[0]}%;height:${p[1]}px;"></span>`; });
    const shelfN = IS_MOBILE ? 5 : 8;
    for (let i = 0; i < shelfN; i++) {
      const top = 20 + i * (58 / shelfN), L = (i % 2 === 0), s = .7 + ((i*13)%4)/10;
      html += `<div class="tw-shelf ${L?"":"r"}" style="top:${top}%;${L?"left:0;":"right:0;"}"><span class="rock"></span><span class="tw-cryscl ${["","pink","gold","green","violet"][i%5]} ${["","tall","wide"][i%3]}" style="bottom:18px;left:22%;transform:scale(${s});animation-delay:${i*.5}s;"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i></span></div>`;
    }
    const flyN = IS_MOBILE ? 4 : 10;
    for (let i = 0; i < flyN; i++) html += `<span class="tw-firefly" style="left:${10+(i*29)%80}%;top:${12+(i*17)%70}%;animation-duration:${5+(i%4)*2}s;animation-delay:${i*.6}s;"></span>`;
    html += `<div class="tw-icelake"></div>`;
    [[10,130],[26,100],[42,120],[58,90],[74,110],[90,100]].forEach(p => { html += `<span class="tw-stalag" style="left:${p[0]}%;height:${p[1]}px;"></span>`; });
    html += `<div class="tw-cavedark"></div>`;
  }
  if (W.scene === "vault") {
    html += `<div class="tw-marble"></div>`;
    html += `<div class="tw-vfloor"></div><div class="tw-vreflect"></div>`;
    html += `<div class="tw-pillar" style="left:4%;"></div><div class="tw-pillar" style="right:4%;"></div>`;
    const colsPos = IS_MOBILE ? [16] : [14, 20, 26];
    const rows = IS_MOBILE ? 7 : 10;
    colsPos.forEach((cx, ci) => {
      for (let i = 0; i < rows; i++) {
        const top = 8 + i * (84 / rows) + (ci % 2) * 2;
        html += `<span class="tw-safebox" style="left:${cx}%;top:${top}%;"></span>`;
        html += `<span class="tw-safebox bz" style="right:${cx}%;top:${top + 2}%;"></span>`;
      }
    });
    html += `<div class="tw-spotv l"></div><div class="tw-spotv c"></div><div class="tw-spotv r"></div>`;
    html += goldPileHTML("24%") + goldPileHTML("66%");
    html += `<div class="tw-spotimpact l"></div><div class="tw-spotimpact c"></div><div class="tw-spotimpact r"></div>`;
    html += `<div class="tw-vfloorglow"></div>`;
    let bolts = ""; for (let i = 0; i < 12; i++) { const a = i*Math.PI/6; bolts += `<span class="tw-vbolt" style="left:${50+44*Math.cos(a)}%;top:${50+44*Math.sin(a)}%;"></span>`; }
    let knobs = ""; for (let i = 0; i < 6; i++) { const a = i*Math.PI/3; knobs += `<span class="tw-knob" style="left:${50+38*Math.cos(a)}%;top:${50+38*Math.sin(a)}%;"></span>`; }
    html += `<div class="tw-vaultglow pulse"></div><div class="tw-vaultframe"><span class="tw-fbolt" style="left:5%;top:7%;"></span><span class="tw-fbolt" style="right:5%;top:7%;"></span><span class="tw-fbolt" style="left:5%;bottom:7%;"></span><span class="tw-fbolt" style="right:5%;bottom:7%;"></span><span class="tw-hinge h1"></span><span class="tw-hinge h2"></span><div class="tw-vaultdoor"><div class="tw-vaultwheel">${knobs}</div><span class="tw-dial"></span><span class="tw-handle"></span>${bolts}</div></div>`;
    html += `<div class="tw-laser" style="top:30%;animation-duration:5s;"></div>`;
    html += `<div class="tw-laser d" style="top:48%;animation-duration:7s;animation-delay:1s;"></div>`;
    html += `<div class="tw-laser" style="top:66%;animation-duration:6s;animation-delay:2s;"></div>`;
    html += `<div class="tw-ncam" style="left:14%;top:24%;color:#ff2020;"><span class="beam"></span></div>`;
    html += `<div class="tw-ncam" style="right:14%;top:40%;color:#ff2020;"><span class="beam"></span></div>`;
    const gpN = IS_MOBILE ? 6 : 12;
    for (let i = 0; i < gpN; i++) html += `<span class="tw-goldpart" style="left:${8+(i*17)%84}%;top:${30+(i*13)%60}%;animation-duration:${6+(i%4)*2}s;animation-delay:${i*.8}s;"></span>`;
    html += `<div class="tw-vvignette"></div>`;
  }
  let parts = "";
  for (let i = 0; i < (IS_MOBILE?0:7); i++) parts += `<span class="tw-part ${W.part}" style="color:${C.acc};left:${(i*13+c*7)%96}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;"></span>`;
  const result = html + parts;
  SCENE_CACHE[c] = result;
  return result;
}

/* ----- 6. ÉCRAN AVENTURE ----- */
function openTower() {
  let m = document.getElementById("screen-tower");
  if (!m) {
    m = document.createElement("div");
    m.id = "screen-tower";
    m.innerHTML = `
      <div id="tw-bg"></div>
      <div class="tw-hud">
        <button class="tw-back" onclick="closeTower()">⬅️</button>
        <div class="tw-lives">❤️ <span id="tw-lives-n">${twLives}</span><span id="tw-lives-regen" style="font-size:9px;opacity:.75;margin-left:5px;"></span></div>
        <div class="tw-coins">🪙 <span id="tw-coins-n">0</span></div>
        <button class="tw-shopbtn" onclick="openLevelSelect()">🎯</button>
        <button class="tw-shopbtn" style="margin-left:0;" onclick="openTowerShop()">🛒</button>
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
  localStorage.setItem("cb_last_screen", "tower");
  socket.emit("get_tower");
  setTimeout(() => { const s = document.getElementById("screen-tower"); if (s && s.style.display !== "none") socket.emit("get_tower"); }, 600);
  setTimeout(() => { const s = document.getElementById("screen-tower"); if (s && s.style.display !== "none") socket.emit("get_tower"); }, 1600);
  renderAdventure();
  towerDing();
}
function closeTower() { localStorage.removeItem("cb_last_screen"); document.getElementById("screen-tower").style.display = "none"; }
function fmtRegen(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function updateRegenLabel() {
  const lr = document.getElementById("tw-lives-regen");
  if (!lr) return;
  lr.innerText = (twLives < MAX_LIVES && twNextLife > 0) ? `(+1 ${fmtRegen(twNextLife)})` : "";
}
setInterval(() => {
  if (twNextLife > 0) {
    twNextLife -= 1000;
    if (twNextLife <= 0) { twNextLife = 0; socket.emit("get_tower"); }
    updateRegenLabel();
  }
}, 1000);
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
  updateRegenLabel();
  const def = TowerUtils.getFloorDef(twViewFloor);
  const inChap = ((twViewFloor - 1) % FPC) + 1;
  const isBoss = (inChap === FPC || inChap % 50 === 0);
  document.getElementById("tw-panel").classList.toggle("boss", isBoss);
  document.getElementById("tw-panel-num").innerText = twViewFloor;
  document.getElementById("tw-panel-typ").innerText = isBoss ? `⚔️ ${chap.boss} GARDIEN` : TowerUtils.typeLabel(def.type);
  const stGot = towerProgress.stars[String(twViewFloor)] || 0;
  document.getElementById("tw-panel-stars").innerHTML = [1,2,3].map(i => `<span class="${i <= stGot ? "on" : ""}">⭐</span>`).join("");
  const lock = document.getElementById("tw-lockmsg");
  if (!unlocked) { lock.style.display = "block"; lock.innerText = `🔒 Quota ⭐ ${WORLD_QUOTA} requis dans le monde précédent`; }
  else lock.style.display = "none";
  document.getElementById("tw-play").disabled = !unlocked || twLives <= 0;
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

/* ----- 7. SÉLECTION DE NIVEAU ----- */
function openLevelSelect() {
  closeLevelSelect();
  const world = TowerUtils.getTowerChapter(twViewFloor).id;
  const start = (world - 1) * FPC + 1, end = world * FPC;
  const maxPlayable = Math.min(towerProgress.floor + 1, end);
  let cells = "";
  for (let f = start; f <= end; f++) {
    const st = towerProgress.stars[String(f)] || 0;
    const inChap = ((f - 1) % FPC) + 1;
    const isBoss = (inChap === FPC || inChap % 50 === 0);
    const lock = f > maxPlayable;
    const cur = f === twViewFloor;
    cells += `<button class="tw-lvl-cell ${lock?"lock":""} ${cur?"cur":""} ${isBoss?"boss":""}" ${lock?"disabled":""} onclick="pickLevel(${f})">${f}<span class="st">${st?"⭐".repeat(st):""}</span></button>`;
  }
  const d = document.createElement("div");
  d.className = "tw-lvlpop"; d.id = "tw-lvlpop";
  d.innerHTML = `<div class="tw-lvlpop-card">
    <h3>🎯 ${currentLang==="fr"?"Choisis ton niveau":"Pick your level"}</h3>
    <div class="tw-lvl-grid" id="tw-lvl-grid">${cells}</div>
    <button class="btn-secondary" style="width:100%;margin-top:10px;" onclick="closeLevelSelect()">❌ ${currentLang==="fr"?"Fermer":"Close"}</button>
  </div>`;
  document.body.appendChild(d);
  const grid = document.getElementById("tw-lvl-grid");
  const target = grid.querySelector(".tw-lvl-cell.cur") || grid.children[Math.max(0, maxPlayable - start)];
  if (target) grid.scrollTop = Math.max(0, target.offsetTop - grid.clientHeight / 2);
}
function closeLevelSelect() { const s = document.getElementById("tw-lvlpop"); if (s) s.remove(); }
function pickLevel(f) { twViewFloor = f; closeLevelSelect(); renderAdventure(); }
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

/* ----- 8. BOUTIQUE AVENTURE ----- */
function openTowerShop() {
  closeTowerShop();
  const fr = currentLang === "fr";
  const d = document.createElement("div");
  d.className = "tw-shop"; d.id = "tw-shop";
  let items = "";
  SHOP_ITEMS.forEach(it => {
    const btn = it.iap
      ? `<button class="buy iap" disabled>${it.eur} 🔒</button>`
      : `<button class="buy" onclick="towerShopBuy('${it.id}')">${it.price} 🪙</button>`;
    items += `<div class="tw-shop-item"><span class="ic">${it.icon}</span><span class="nm">${it.name}${it.iap?`<br><small style="color:#8892a8;font-weight:600;">${fr?"Bientôt (Google Play)":"Soon (Google Play)"}</small>`:""}</span>${btn}</div>`;
  });
  d.innerHTML = `<div class="tw-shop-card"><h3>🛒 BOUTIQUE AVENTURE</h3>${items}<button class="btn-secondary" style="width:100%;" onclick="closeTowerShop()">❌ ${fr?"Fermer":"Close"}</button></div>`;
  document.body.appendChild(d);
}
function closeTowerShop() { const s = document.getElementById("tw-shop"); if (s) s.remove(); }
function towerShopBuy(id) {
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it || it.iap) return;
  socket.emit("shop_buy", { id: id, price: it.price });
}
socket.on("shop_result", (r) => {
  if (!r) return;
  if (r.ok) {
    if (r.lives !== undefined) twLives = r.lives;
    if (r.jokers) twJokers = r.jokers;
    if (r.coins !== undefined && myProfile) myProfile.coins = r.coins;
    renderAdventure();
    if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "✅ Achat effectué !" : "✅ Purchase complete!", "gift");
  } else {
    const fr = currentLang === "fr";
    const msg = r.reason === "coins" ? (fr ? "❌ Pas assez de pièces !" : "❌ Not enough coins!")
      : r.reason === "full" ? (fr ? "❤️ Vies déjà au maximum !" : "❤️ Lives already full!")
      : (fr ? "❌ Achat impossible." : "❌ Purchase failed.");
    if (typeof showNotificationToast === "function") showNotificationToast(msg, "announcement");
  }
});

/* ----- 9. BRIEFING ----- */
function showBriefing(def) {
  closeBriefing();
  const fr = currentLang === "fr";
  const curStars = towerProgress.stars[String(def.floor)] || 0;
  const starTime = Math.floor(def.time * 0.6);
  const ST = "\u{2B50}";
  let starRule = fr ? `💡 ${ST} terminer · ${ST}${ST} ≤2 erreurs · ${ST}${ST}${ST} 0 erreur + < ${starTime}s` : `💡 ${ST} finish · ${ST}${ST} ≤2 mistakes · ${ST}${ST}${ST} 0 mistake + < ${starTime}s`;
  if (def.type === "pairs" || def.type === "sprint") starRule = fr ? `💡 ${ST} finir · ${ST} rapide · ${ST}${ST}${ST} très rapide` : `💡 ${ST} finish · ${ST} fast · ${ST}${ST}${ST} very fast`;
  if (def.type === "memory") starRule = fr ? `💡 ${ST} terminer · ${ST}${ST} ≤2 erreurs · ${ST}${ST}${ST} 0 erreur (tout à la mémoire !)` : `💡 ${ST} finish · ${ST}${ST} ≤2 mistakes · ${ST}${ST}${ST} 0 mistakes (pure memory!)`;
  const replayLine = def.replay ? `<div style="font-size:10px;color:#f8b500;margin-bottom:6px;">${fr?"Actuel : ":"Current: "}${ST.repeat(curStars)}</div>` : "";
  const b = document.createElement("div");
  b.id = "tw-brief"; b.className = "tw-brief";
  b.innerHTML = `<div class="tw-brief-card">
    <div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🏰 ${fr?"ÉTAGE":"FLOOR"} ${def.floor} — ${TowerUtils.typeLabel(def.type)}</div>
    <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${starRule}</div>
    ${replayLine}
    <button class="btn-main btn-blue" style="width:100%;margin-bottom:6px;" onclick="closeBriefing();startTowerFloor(TowerUtils.getFloorDef(${def.floor}))">${def.replay?"🔄 REJOUER":"⚡ LANCER !"}</button>
    <button class="btn-secondary" style="width:100%;" onclick="closeBriefing()">❌ ${fr?"Annuler":"Cancel"}</button>
  </div>`;
  document.body.appendChild(b);
}
function closeBriefing() { const b = document.getElementById("tw-brief"); if (b) b.remove(); }

/* ----- 10. MOTEUR DE JEU ----- */
function ensureTowerOverlay() {
  let ov = document.getElementById("tower-game");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "tower-game"; ov.className = "twg-screen";
    ov.innerHTML = `<div class="twg-header"><button class="tw-back" onclick="quitFloor()">⬅️</button><b id="twg-title"></b><span id="tg-shield" style="color:#f8b500;font-weight:900;font-size:15px;display:none;">🛡️</span><span id="tg-err" style="color:#ff4b2b;font-weight:900;font-size:13px;min-width:40px;text-align:right;">❌ 0</span><span id="twg-timer">⏱️</span></div><div id="tg-bar" class="twg-bar"></div><div id="tg-hud" class="twg-hud"></div><div class="twg-gridwrap"><div id="tg-grid" class="tg-grid"></div></div><div class="twj-bar"><button class="twj-btn" id="twg-jt" onclick="useJoker('time')">⏱️ +10s <b id="twg-jt-n">0</b></button><button class="twj-btn" id="twg-js" onclick="useJoker('shield')">🛡️ Bouclier <b id="twg-js-n">0</b></button></div><div id="tg-msg" class="twg-msg"></div>`;
    document.body.appendChild(ov);
  }
  return ov;
}
function useJoker(kind) {
  if (!TW) return;
  if ((twJokers[kind] || 0) <= 0) {
    if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "❌ Aucun joker de ce type !" : "❌ No joker of this type!", "announcement");
    return;
  }
  socket.emit("tower_use_joker", { kind: kind });
}
function updateJokerButtons() {
  const jt = document.getElementById("twg-jt-n"), js = document.getElementById("twg-js-n");
  const bt = document.getElementById("twg-jt"), bs = document.getElementById("twg-js");
  if (jt) jt.innerText = twJokers.time || 0;
  if (js) js.innerText = twJokers.shield || 0;
  if (bt) { bt.style.display = (twJokers.time || 0) > 0 ? "flex" : "none"; bt.disabled = !TW; }
  if (bs) { bs.style.display = (twJokers.shield || 0) > 0 ? "flex" : "none"; bs.disabled = !TW; }
}
socket.on("joker_denied", () => {
  if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "❌ Joker indisponible." : "❌ Joker unavailable.", "announcement");
});
socket.on("tower_jokers_update", (d) => {
  if (d && d.jokers) { twJokers = d.jokers; updateJokerButtons(); }
});
socket.on("tower_shield_already", () => {
  if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🛡️ Bouclier déjà actif !" : "🛡️ Shield already active!", "announcement");
});
socket.on("tower_shield_used", () => {
  if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🛡️ Bouclier absorbé !" : "🛡️ Shield absorbed!", "gift");
  const s = document.getElementById("tw-shield-active"); if (s) s.remove();
});
socket.on("tower_no_lives", () => {
  if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "❤️ Plus de vies ! Reviens plus tard ou achète-en." : "❤️ No lives left! Come back later or buy some.", "announcement");
  quitFloor();
  renderAdventure();
});
function cloneState(s) {
  return { type:s.type, total:s.total, gridSize:s.gridSize, floor:s.floor, target:s.target, targetColor:s.targetColor, targetParity:s.targetParity, forbidden:s.forbidden, timeLeft:s.timeLeft, ai:s.ai, gone:Object.assign({},s.gone||{}), revealed:Object.assign({},s.revealed||{}), display:(s.display||[]).slice(), sel:(s.sel===undefined?null:s.sel), shield:s.shield||0, revealLeft:s.revealLeft||0 };
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
  updateJokerButtons();
  socket.emit("tower_floor_start", { floor: def.floor });
}
function buildGridFromState(st) {
  const g = document.getElementById("tg-grid");
  const cols = st.gridSize <= 16 ? 4 : (st.gridSize <= 20 ? 5 : 6);
  g.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  g.innerHTML = ""; TW_buttons = [];
  st.display.forEach((v, i) => {
    const b = document.createElement("button");
    b.className = "tg-tile";
    if (st.gone[i]) b.classList.add("gone");
    if (st.type === "color" && v) { b.style.background = `linear-gradient(180deg,${v.hex},#111827 85%)`; b.textContent = ""; }
    else if (st.type === "pairs" || st.type === "memory") { b.textContent = st.gone[i] ? "" : (v === null ? "?" : v); if ((st.revealed && st.revealed[i]) || st.sel === i) b.classList.add("sel"); }
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
        if (st.type === "pairs" || st.type === "memory") {
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
  if (t === "pairs" || t === "memory") { socket.emit("tower_click", { index: i }); return; }
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
    b.classList.add("err");
    setTimeout(() => { if (b) b.classList.remove("err"); }, 350);
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
  let main = "";
  if (TW.type === "color" && TW.targetColor) main = `COULEUR : <span style="color:${TW.targetColor.hex};">${TW.targetColor.name}</span>`;
  else if (TW.type === "pairs") main = "🧩 RETROUVE LES PAIRES";
  else if (TW.type === "parity") main = TW.targetParity === "even" ? "CLIQUE : PAIRS" : "CLIQUE : IMPAIRS";
  else if (TW.type === "forbidden") main = `INTERDIT : <span style="color:#ff4b2b;">${TW.forbidden}</span>`;
  else if (TW.type === "memory") main = (TW.revealLeft > 0) ? `👀 MÉMORISE ! ${TW.revealLeft}s` : "🧠 CLIQUE DANS L'ORDRE (1→N)";
  else if (TW.target !== null && TW.target !== undefined) main = `CIBLE : ${TW.target}`;
  if (main !== TW_hudCache) { h.innerHTML = main; TW_hudCache = main; }
  const bar = document.getElementById("tg-bar");
  if (bar) { if (TW.type === "boss") { bar.style.display = "block"; bar.innerHTML = `<div style="width:${Math.min(100,TW.ai/TW.total*100)}%;height:100%;background:linear-gradient(90deg,#ff4b2b,#f8b500);"></div>`; } else bar.style.display = "none"; }
  document.getElementById("twg-title").innerText = "🏰 ÉTAGE " + TW.floor + " — " + TowerUtils.typeLabel(TW.type);
  const errEl = document.getElementById("tg-err");
  if (errEl) errEl.innerText = "❌ " + (TW.mistakes || 0);
  const shEl = document.getElementById("tg-shield");
  if (shEl) shEl.style.display = (TW.shield > 0) ? "inline" : "none";
  updateJokerButtons();
  const grid = document.getElementById("tg-grid");
  if (grid) grid.classList.toggle("shielded", (TW.shield > 0));
}
function showFailUI(reason) {
  const ov = ensureTowerOverlay();
  ov.style.display = "flex";
  document.getElementById("tg-bar").style.display = "none";
  document.getElementById("tg-hud").innerHTML = "";
  const g = document.getElementById("tg-grid");
  g.style.gridTemplateColumns = "1fr";
  const fr = currentLang === "fr";
  const nolives = reason === "nolives";
  g.innerHTML = `<div style="text-align:center;"><div style="font-size:30px;">${nolives?"❤️":"💥"}</div><div style="color:#ff4b2b;font-weight:900;margin:6px 0;">${nolives?(fr?"PLUS DE VIES !":"NO LIVES LEFT!"):(fr?"ÉTAGE RATÉ !":"FLOOR FAILED!")}</div><button class="btn-main btn-blue" onclick="retryFloor()">🔄 ${fr?"Réessayer":"Retry"}</button><button class="btn-secondary" onclick="quitFloor()">${fr?"Quitter":"Quit"}</button></div>`;
}
function retryFloor() { TW = null; TW_dom = null; stopLocalTimer(); startTowerFloor({ floor: TW_lastFloor }); }
function quitFloor() {
  TW = null; TW_dom = null; stopLocalTimer();
  socket.emit("tower_quit");
  const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
  const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
  updateJokerButtons();
}
function showTowerWinPopup(res) {
  const fr = currentLang === "fr";
  const d = document.createElement("div");
  d.className = "modal-overlay"; d.style.display = "flex";
  d.innerHTML = `<div class="modal-card" style="max-width:300px;text-align:center;">
    <h3 style="color:#00ff88;margin:0 0 6px 0;">✅ ${fr?"ÉTAGE":"FLOOR"} ${res.floor} ${fr?"VAINCU":"CLEARED"} !</h3>
    <div class="tw-stars">${[1,2,3].map(i=>`<span style="animation-delay:${i*0.2}s;${i<=res.stars?"":"filter:grayscale(1);opacity:.3;"}">⭐</span>`).join("")}</div>
    <div style="font-size:13px;color:#f8b500;font-weight:bold;margin-bottom:10px;">+${res.coins} 🪙</div>
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove();renderAdventure()">${fr?"Continuer":"Continue"} ⚡</button>
  </div>`;
  document.body.appendChild(d);
  towerDing();
}

/* ----- 11. SOCKET EVENTS ----- */
socket.on("tower_data", (d) => {
  const oldWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  towerProgress = { floor: d.floor || 0, stars: d.stars || {} };
  twViewFloor = Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
  if (d.lives !== undefined) twLives = d.lives;
  if (d.nextLifeIn !== undefined) twNextLife = d.nextLifeIn || 0;
  if (d.jokers) twJokers = d.jokers;
  const newWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  if (newWorld !== oldWorld && TowerUtils.worldUnlocked(newWorld)) showWorldTransition(newWorld);
  else renderAdventure();
});

socket.on("player_registered", () => {
  const scr = document.getElementById("screen-tower");
  const open = scr && scr.style.display !== "none";
  if (open) socket.emit("get_tower");
  else if (localStorage.getItem("cb_last_screen") === "tower") openTower();
});

socket.on("tower_state", (st) => {
  if (!st || !st.display) return;
  TW_lastState = Date.now();
  const first = TW_buttons.length === 0;
  TW = st; TW_lastFloor = st.floor;
  if (first) { buildGridFromState(st); TW_dom = cloneState(st); }
  else { syncDomToState(st); TW_dom = cloneState(st); }
  renderHUDFromState();
  startLocalTimer(st.timeLeft);
});
socket.on("tower_fail", (r) => {
  TW = null; TW_dom = null; stopLocalTimer();
  if (r && r.lives !== undefined) twLives = r.lives;
  else twLives = Math.max(0, twLives - 1);
  if (r && r.nextLifeIn !== undefined) twNextLife = r.nextLifeIn || 0;
  renderAdventure();
  showFailUI(r && r.reason);
});
socket.on("tower_result", (res) => {
  TW = null;
  const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
  const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
  if (!res.ok) return;
  const oldWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  towerProgress.floor = Math.max(towerProgress.floor, res.floor);
  towerProgress.stars[String(res.floor)] = Math.max(towerProgress.stars[String(res.floor)] || 0, res.stars);
  showTowerWinPopup(res);
  const newWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
  if (newWorld !== oldWorld && TowerUtils.worldUnlocked(newWorld)) setTimeout(() => showWorldTransition(newWorld), 600);
  else renderAdventure();
});

/* ----- 12. WATCHDOG ----- */
setInterval(() => {
  if (TW && TW_lastState && Date.now() - TW_lastState > 6000) {
    TW = null; TW_dom = null; stopLocalTimer();
    const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
    const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
    if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🔌 Serveur injoignable — partie annulée." : "🔌 Server unreachable — match cancelled.", "announcement");
  }
}, 2000);
socket.on("disconnect", () => {
  if (TW) {
    TW = null; TW_dom = null; stopLocalTimer();
    const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
    const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
    if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🔌 Connexion perdue — partie annulée." : "🔌 Connection lost — match cancelled.", "announcement");
  }
});

/* ----- 13. HELPERS ----- */
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
