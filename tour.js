/* ============================================================
TOUR.JS — MODE AVENTURE (100% CSS, immersif, NIVEAU 2)
============================================================ */
const TOWER_CHAPTERS = [
  { id:1, season:1, name:"Quartier Néon", icon:"🌆", boss:"🤖", objects:["💡","️","📺","","🎛️","🖥️","📻","️","🌃"] },
  { id:2, season:1, name:"Grottes de Cristal", icon:"🧊", boss:"🗿", objects:["🕯️","🔮","💎","⛏️","🪞","❄️","🫧","🌀","🧊"] },
  { id:3, season:1, name:"Banque Dorée", icon:"🏦", boss:"👾", objects:["🪙","💰","💵","💳","🥇","🔐","🪙","","🏅"] },
  { id:4, season:2, name:"Tour Hantée", icon:"🎃", boss:"🧛", objects:["🕸️","🎃","🕯️","🦇","🪦","","🐈⬛","","⚰️"] },
  { id:5, season:2, name:"Cimetière Brumeux", icon:"🌫️", boss:"💀", objects:["🪦","🌫️","🕯️","","🌙","🕷️","️","","🖤"] },
  { id:6, season:2, name:"Antre Citrouille", icon:"👑", boss:"🎃", objects:["🎃","🍬","️","🦇","🧹","🍭","🕸️","","🏆"] },
  { id:7, season:3, name:"Cime Bonbon", icon:"🍭", boss:"🧝", objects:["🍭","","","🎀","","🥐","🍰","🍩",""] },
  { id:8, season:3, name:"Forêt de Sapins", icon:"🎄", boss:"⛄", objects:["🎄","🎁","❄️","🔔","🕯️","⭐","🧦","🍪",""] },
  { id:9, season:3, name:"Atelier du Père Noël", icon:"🎅", boss:"🎅", objects:["🎅","🤶","","🦌","","🔥","","🥛",""] }
];
let towerProgress = { floor: 0, stars: {} };
const FPC = 200;
const TOTAL_FLOORS = 9 * FPC; // 1800
const STEP = 48;
const WORLD_QUOTA = 240;
function starsInWorld(w){
  let s=0; const start=(w-1)*FPC+1, end=w*FPC;
  for(let f=start; f<=end; f++){ s += towerProgress.stars[String(f)]||0; }
  return s;
}
function worldUnlockedByStars(w){
  if(w<=1) return true;
  for(let x=2;x<=w;x++){ if(starsInWorld(x-1)<WORLD_QUOTA) return false; }
  return true;
}
function getTowerChapter(f) { return TOWER_CHAPTERS[Math.ceil(f / FPC) - 1]; }
function currentSeasonNum() { return parseInt((myProfile.currentSeasonId || "s1").replace("s", "")) || 1; }
function getFloorDef(floor) {
  const chap = Math.ceil(floor / FPC), inChap = ((floor - 1) % FPC) + 1;
  const global = (floor - 1) / (TOTAL_FLOORS - 1);
  let gridSize = Math.min(36, Math.round(12 + global * 24));
  let time = Math.max(14, Math.round(34 - global * 20));
  if (inChap === FPC) return { floor, gridSize, time, type: "boss" };
  if (inChap % 50 === 0) return { floor, gridSize, time, type: "boss" };
  const seq = ["classic","reverse","color","pairs","sprint","parity","forbidden","fog","nofail"];
  const t = seq[(inChap - 1) % 9];
  if (t === "sprint") return { floor, gridSize, time: Math.max(8, Math.round(time * 0.5)), type: "sprint" };
  if (t === "nofail") return { floor, gridSize, time: Math.max(15, Math.round(time * 0.8)), type: "nofail" };
  if (t === "pairs") { let g = gridSize; if (g % 2) g++; return { floor, gridSize: g, time: Math.max(20, time + 6), type: "pairs" }; }
  if (t === "parity") return { floor, gridSize: Math.min(48, gridSize + 8), time: time + 4, type: "parity" };
  return { floor, gridSize, time, type: t };
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ----- CSS principal ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  #screen-tower{position:fixed;inset:0;background:#000;z-index:9990;display:none;flex-direction:column;}
  .tw-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;z-index:6;}
  .tw-header b{color:#00d2ff;font-size:15px;flex:1;text-align:center;}
  .tw-header .tw-back{background:#1a1a2e;border:1px solid #00d2ff;color:#00d2ff;border-radius:8px;padding:6px 10px;font-size:12px;}
  .tw-mapwrap{flex:1;overflow-y:auto;position:relative;}
  .tw-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 50%,#000000c9 100%);z-index:4;}
  .tw-map{position:relative;width:100%;}
  .tw-zone{position:absolute;left:0;right:0;overflow:hidden;}
  .tw-col{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,560px);}
  .tw-horizon{position:absolute;bottom:36%;left:0;right:0;height:22%;background:radial-gradient(ellipse at 50% 100%,#ff00ff33,transparent 70%),radial-gradient(ellipse at 30% 100%,#00ffff2b,transparent 60%);}
  .tw-city{position:absolute;bottom:0;left:0;right:0;height:42%;display:flex;align-items:flex-end;gap:2%;padding:0 2%;}
  .tw-bldg{flex:1;position:relative;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;box-shadow:0 0 12px #000;border-top:2px solid #00d2ff44;}
  .tw-ant{position:absolute;top:-14px;left:50%;width:2px;height:14px;background:#333;box-shadow:0 -3px 6px #ff4b2b;}
  .tw-wl{position:absolute;width:4px;height:5px;background:currentColor;box-shadow:0 0 5px currentColor;animation:twWin linear infinite;}
  @keyframes twWin{0%,38%{opacity:1}45%,88%{opacity:.08}95%,100%{opacity:1}}
  .tw-sign{position:absolute;left:15%;top:12%;width:70%;height:7%;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor,0 0 22px currentColor;opacity:.9;animation:twFlickP 3s steps(2) infinite;}
  .tw-street{position:absolute;bottom:0;left:0;right:0;height:6%;background:linear-gradient(90deg,#ff00ff44,#00ffff44,#f8b50044);filter:blur(8px);}
  .tw-reflect{position:absolute;left:0;right:0;bottom:0;height:16%;background:linear-gradient(90deg,#ff00ff22,#00ffff22,#f8b50022,#ff00ff22);background-size:300% 100%;filter:blur(7px);animation:twSlide 6s linear infinite;pointer-events:none;}
  @keyframes twSlide{to{background-position:300% 0}}
  .tw-car{position:absolute;width:46px;height:12px;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg,#3a3a48,#101018 60%,#05050a);box-shadow:inset 0 1px 0 #ffffff33,0 2px 6px #000c;z-index:3;animation:twDrive linear infinite;}
  .tw-car::before{content:"";position:absolute;right:-34px;top:2px;width:36px;height:8px;background:linear-gradient(90deg,#ffffff88,transparent);filter:blur(2px);}
  .tw-car::after{content:"";position:absolute;left:-6px;top:3px;width:8px;height:6px;background:radial-gradient(closest-side,#ff5040cc,transparent);filter:blur(1px);}
  .tw-car.s{width:34px;height:9px;}
  .tw-car.s::before{right:-26px;width:28px;}
  .tw-car.r{animation-name:twDriveR;transform:scaleX(-1);}
  @keyframes twDrive{from{left:-20%}to{left:115%}}
  @keyframes twDriveR{from{left:115%}to{left:-20%}}
  .tw-cavewall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#74ebf518 0%,#0a2a3a66 35%,#000000ee 78%);}
  .tw-rocktop{position:absolute;top:0;left:0;right:0;height:26%;background:#020608;clip-path:polygon(0 0,100% 0,96% 55%,88% 25%,80% 70%,70% 30%,60% 75%,50% 35%,40% 80%,30% 30%,20% 70%,12% 28%,4% 60%,0 30%);}
  .tw-rockbot{position:absolute;bottom:0;left:0;right:0;height:20%;background:#020608;clip-path:polygon(0 100%,100% 100%,96% 45%,88% 75%,80% 30%,70% 70%,60% 25%,50% 65%,40% 20%,30% 70%,20% 30%,12% 72%,4% 40%,0 70%);}
  .tw-stalac{position:absolute;top:0;background:linear-gradient(180deg,#020608,#3a5a6e 60%,#74ebf5);clip-path:polygon(30% 0,70% 0,60% 100%,40% 100%);box-shadow:0 0 6px #74ebf566;}
  .tw-bigcrys{position:absolute;background:linear-gradient(180deg,#ffffffee,#74ebf5 55%,#0a2a3a);clip-path:polygon(50% 0,100% 100%,0 100%);box-shadow:0 0 30px #74ebf5cc,0 0 60px #74ebf566;animation:twGlowC 2.2s infinite;}
  .tw-ray{position:absolute;top:28%;left:50%;width:7%;height:62%;background:linear-gradient(180deg,#74ebf533,transparent);transform-origin:top center;filter:blur(4px);animation:twRay 4s ease-in-out infinite;}
  @keyframes twRay{50%{opacity:.35}}
  .tw-icefloor{position:absolute;bottom:0;left:0;right:0;height:16%;background:linear-gradient(180deg,#74ebf522,#04141d);box-shadow:inset 0 8px 20px #74ebf533;}
  @keyframes twGlowC{50%{filter:brightness(1.6)}}
  .tw-bankwall{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 110px,#00000044 110px 114px),linear-gradient(180deg,#3a2a05,#2b1a00 40%,#160d00);}
  .tw-pillar{position:absolute;top:0;bottom:0;width:8%;background:linear-gradient(90deg,#1a0f02,#5a4410 50%,#1a0f02);border-left:2px solid #8a6a1a44;border-right:2px solid #8a6a1a44;box-shadow:0 0 12px #000c;}
  .tw-vaultglow{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(92%,440px);aspect-ratio:1;border-radius:50%;background:radial-gradient(#f8b50044,transparent 70%);animation:twGlowC 3s infinite;}
  .tw-vaultframe{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(76%,370px);aspect-ratio:1.15;background:linear-gradient(180deg,#5a4410,#2b1a00);border-radius:14px;box-shadow:0 0 40px #f8b50033,inset 0 0 30px #000;}
  .tw-vaultdoor{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:82%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#c9a227,#8a6a1a 40%,#3a2a05 75%,#160d00);border:6px solid #f8b50088;box-shadow:0 0 60px #f8b50066,inset 0 0 40px #000000aa;}
  .tw-vaultwheel{position:absolute;left:50%;top:50%;width:44%;height:44%;transform:translate(-50%,-50%);border:6px solid #ffe9a8;border-radius:50%;animation:twSpin 16s linear infinite;box-shadow:0 0 20px #f8b50088,inset 0 0 10px #0006;}
  .tw-vaultwheel::before{content:"";position:absolute;inset:-6px;background:linear-gradient(#ffe9a8,#ffe9a8) 50% 0/6px 100% no-repeat,linear-gradient(#ffe9a8,#ffe9a8) 0 50%/100% 6px no-repeat,linear-gradient(45deg,transparent 47%,#ffe9a8 47% 53%,transparent 53%),linear-gradient(-45deg,transparent 47%,#ffe9a8 47% 53%,transparent 53%);}
  .tw-vaultwheel::after{content:"";position:absolute;left:50%;top:50%;width:20%;height:20%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(#fff8dc,#8a6a1a);box-shadow:0 0 12px #ffe9a8;}
  @keyframes twSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
  .tw-vbolt{position:absolute;width:5%;height:5%;border-radius:50%;background:radial-gradient(#ffe9a8,#8a6a1a);transform:translate(-50%,-50%);box-shadow:0 1px 3px #000;}
  .tw-ingot{position:absolute;width:42px;height:14px;border-radius:3px;background:linear-gradient(180deg,#ffe9a8,#c9a227 50%,#8a6a1a);box-shadow:inset 0 1px 0 #fff8,0 2px 4px #000c;}
  .tw-sweep{position:absolute;top:8%;bottom:8%;width:14%;background:linear-gradient(90deg,transparent,#ffe9a855,transparent);transform:skewX(-12deg);animation:twSweep 5.5s ease-in-out infinite;pointer-events:none;}
  @keyframes twSweep{0%{left:-20%;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:110%;opacity:0}}
  .tw-coin{position:absolute;font-size:22px;filter:drop-shadow(0 0 8px #f8b500);animation:twCoin 2.5s ease-in-out infinite;}
  @keyframes twCoin{50%{transform:translateY(-4px) rotate(15deg)}}
  .tw-part{position:absolute;width:4px;height:4px;border-radius:50%;}
  .tw-part.snow{background:#ffffffcc;animation:twFall linear infinite;}
  .tw-part.spark{background:#f8b500;box-shadow:0 0 6px #f8b500;animation:twRise linear infinite;}
  .tw-part.neon{box-shadow:0 0 8px currentColor;background:currentColor;animation:twFlickP 2.2s steps(2) infinite;}
  @keyframes twFall{0%{top:-4%}100%{top:104%}}
  @keyframes twRise{0%{top:104%}100%{top:-4%}}
  @keyframes twFlickP{50%{opacity:.15}}
  .tw-node{position:absolute;width:clamp(40px,12vw,50px);height:clamp(40px,12vw,50px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(14px,4vw,17px);color:#fff;text-shadow:0 1px 2px #000a;transform:translate(-50%,0);border:3px solid #333;background:#1a1a2e;z-index:2;}
  .tw-node.won{border-color:#ffffff44;box-shadow:0 3px 0 #00000066;}
  .tw-node.cur{background:radial-gradient(circle at 35% 30%,#a8f0ff,#00d2ff 60%,#0066aa)!important;border-color:#fff;animation:twPulse 1s infinite;cursor:pointer;}
  @keyframes twPulse{50%{transform:translate(-50%,0) scale(1.15)}}
  .tw-node.lock{opacity:.35;}
  .tw-node.boss{width:clamp(50px,15vw,62px);height:clamp(50px,15vw,62px);font-size:clamp(22px,6vw,28px);}
  .tw-node .tw-st{position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);font-size:clamp(7px,2.2vw,9px);color:#f8b500;white-space:nowrap;}
  .tw-ava{position:absolute;top:-27px;left:50%;transform:translateX(-50%);font-size:clamp(16px,5vw,20px);animation:twBounce2 1.2s infinite;}
  @keyframes twBounce2{50%{transform:translateX(-50%) translateY(-4px)}}
  .tw-gate{position:absolute;background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:5px 14px;font-size:clamp(9px,2.8vw,11px);font-weight:900;color:#00d2ff;white-space:nowrap;z-index:3;box-shadow:0 0 12px #00d2ff44;}
  .tw-gate.lock{border-color:#333;color:#666;box-shadow:none;}
  .tw-brief{position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9995;}
  .tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:16px;max-width:82%;text-align:center;box-shadow:0 0 20px #00d2ff66;}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  .btn-tower{background:linear-gradient(45deg,#7a00ff,#00d2ff)!important;animation:twBtn 2s infinite;box-shadow:0 0 14px #7a00ff88;}
  @keyframes twBtn{50%{box-shadow:0 0 22px #00d2ffcc}}
  #tower-game .tg-grid{display:grid;gap:6px;}
  .tg-tile{background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff55;border-radius:8px;color:#fff;font-weight:900;font-size:16px;padding:12px 0;cursor:pointer;}
  .tg-tile.sel{border-color:#f8b500;box-shadow:0 0 10px #f8b500;}
  .tg-tile.gone{opacity:0;pointer-events:none;transform:scale(.4);transition:all .3s;}
  .tg-tile.foggy{animation:twFog 2s infinite;}
  @keyframes twFog{50%{opacity:.25}}
  `;
  document.head.appendChild(s);
})();

/* ----- CSS correctifs v2 ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .tw-city{bottom:14%;height:36%;}
  .tw-street{display:none;}
  .tw-reflect{height:14%;opacity:.45;}
  .tw-road{position:absolute;bottom:0;left:0;right:0;height:14%;background:linear-gradient(180deg,#23232e,#101016 30%,#0a0a0e);box-shadow:inset 0 4px 10px #000c;}
  .tw-lane{position:absolute;left:0;right:0;top:46%;height:3px;background:repeating-linear-gradient(90deg,#f8b50088 0 34px,transparent 34px 70px);opacity:.7;}
  .tw-car{position:absolute;width:54px;height:16px;z-index:3;animation:twDrive linear infinite;}
  .tw-car::before,.tw-car::after{content:none;}
  .tw-car i{position:absolute;display:block;}
  .tw-car .cb{bottom:3px;left:0;right:0;height:9px;border-radius:5px 7px 3px 3px;background:linear-gradient(180deg,#52526a,#16161e 70%);box-shadow:inset 0 1px 0 #ffffff44,0 2px 4px #000c;}
  .tw-car .cc{bottom:10px;left:12px;width:26px;height:8px;border-radius:5px 5px 0 0;background:linear-gradient(180deg,#3d3d4e,#1a1a24);box-shadow:inset 0 1px 0 #ffffff33;}
  .tw-car .cc::after{content:"";position:absolute;inset:2px 3px 1px 3px;background:linear-gradient(180deg,#7fd8ff55,#20304055);border-radius:3px;}
  .tw-car .w1,.tw-car .w2{bottom:0;width:9px;height:9px;border-radius:50%;background:radial-gradient(#666 25%,#111 60%);box-shadow:0 1px 2px #000;}
  .tw-car .w1{left:8px;}
  .tw-car .w2{right:8px;}
  .tw-car .hl{right:-32px;bottom:5px;width:34px;height:7px;background:linear-gradient(90deg,#ffffffaa,transparent);filter:blur(2px);}
  .tw-car .tl{left:-4px;bottom:6px;width:7px;height:5px;background:radial-gradient(closest-side,#ff5040,transparent);}
  .tw-car.r{animation-name:twDriveR;transform:scaleX(-1);}
  .tw-car.s{transform:scale(.8);transform-origin:bottom left;}
  .tw-car.s.r{transform:scale(.8) scaleX(-1);}
  .tw-icicle{position:absolute;top:0;width:14px;background:linear-gradient(180deg,#9fd8e8aa,#e8fbffdd 70%,#ffffff);clip-path:polygon(0 0,100% 0,62% 60%,54% 100%,46% 100%,38% 60%);filter:drop-shadow(0 0 4px #74ebf588);}
  .tw-cryscl{position:absolute;width:90px;height:120px;filter:drop-shadow(0 0 18px #74ebf5aa);animation:twGlowC 2.6s infinite;}
  .tw-cryscl .c{position:absolute;bottom:0;background:linear-gradient(115deg,transparent 42%,#ffffff88 42% 48%,transparent 48%),linear-gradient(180deg,#e8fbff,#74ebf5 55%,#1a5a6e);clip-path:polygon(50% 0,80% 16%,88% 68%,68% 100%,32% 100%,12% 68%,20% 16%);}
  .tw-cryscl .c1{left:30%;width:40%;height:100%;}
  .tw-cryscl .c2{left:0;width:30%;height:62%;transform:rotate(-14deg);}
  .tw-cryscl .c3{right:0;width:30%;height:70%;transform:rotate(12deg);}
  .tw-mist{position:absolute;left:50%;top:40%;width:60%;height:30%;transform:translateX(-50%);background:radial-gradient(ellipse,#74ebf522,transparent 70%);filter:blur(10px);animation:twMist 7s ease-in-out infinite;}
  .tw-mist.m2{top:55%;width:45%;animation-delay:2.5s;}
  @keyframes twMist{50%{transform:translateX(-46%) scale(1.08);opacity:.7}}
  .tw-vaultframe{width:min(86%,430px);}
  .tw-fbolt{position:absolute;width:10px;height:10px;border-radius:50%;background:radial-gradient(#ffe9a8,#8a6a1a);box-shadow:0 1px 3px #000;}
  .tw-hinge{position:absolute;left:-4%;width:10%;height:12%;background:linear-gradient(180deg,#c9a227,#8a6a1a);border-radius:4px;box-shadow:0 2px 4px #000c;}
  .tw-hinge.h1{top:22%;}
  .tw-hinge.h2{bottom:22%;}
  .tw-knob{position:absolute;width:9%;height:9%;border-radius:50%;background:radial-gradient(#fff8dc,#c9a227);transform:translate(-50%,-50%);box-shadow:0 0 6px #ffe9a8aa;}
  .tw-dial{position:absolute;right:16%;top:44%;width:14%;height:14%;border-radius:50%;background:radial-gradient(#c9a227,#8a6a1a);box-shadow:inset 0 0 6px #0008,0 0 4px #0008;}
  .tw-dial::before{content:"";position:absolute;inset:30%;background:linear-gradient(#160d00,#160d00) 50% 0/3px 100% no-repeat,linear-gradient(#160d00,#160d00) 0 50%/100% 3px no-repeat,linear-gradient(45deg,transparent 40%,#160d00 40% 60%,transparent 60%);}
  .tw-handle{position:absolute;right:8%;top:30%;width:4%;height:40%;border-radius:4px;background:linear-gradient(90deg,#c9a227,#ffe9a8 50%,#c9a227);box-shadow:0 0 6px #0008;}
  .tw-goldspill{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:70%;height:18%;background:radial-gradient(ellipse at 50% 100%,#f8b50055,transparent 70%);filter:blur(6px);}
  `;
  document.head.appendChild(s);
})();

const TOWER_COLORS={1:{acc:"#00d2ff"},2:{acc:"#74ebf5"},3:{acc:"#f8b500"},4:{acc:"#ff8a00"},5:{acc:"#8a9bb0"},6:{acc:"#ff4b2b"},7:{acc:"#ff6fa5"},8:{acc:"#2ecc71"},9:{acc:"#ff416c"}};
const TOWER_WORLDS={
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

function typeLabel(t){
  const fr=currentLang==="fr";
  return ({classic:fr?"⚡ Croissant":"⚡ Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",random:fr?"🎲 Chaos":"🎲 Chaos",color:fr?"🎨 Couleurs":"🎨 Colors",pairs:fr?"🧩 Paires":"🧩 Pairs",parity:fr?"🔢 Pair / Impair":"🔢 Even / Odd",forbidden:fr?"🚫 Interdit":"🚫 Forbidden","calc+":fr?"🧮 Addition":"🧮 Addition","calc-":fr?"🧮 Soustraction":"🧮 Subtraction",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",memory:fr?"🙈 Mémoire":"🙈 Memory",fog:fr?"🌫️ Brouillard":"🌫️ Fog",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t]||t;
}
function twDesc(t){
  const fr=currentLang==="fr";
  return ({classic:fr?"Monte les nombres dans l'ordre croissant, le plus vite possible !":"Climb the numbers in ascending order, as fast as you can!",reverse:fr?"Cette fois on descend ! Clique du plus grand au plus petit.":"This time we go down! Click from biggest to smallest.",random:fr?"La cible change au hasard : reste concentré !":"The target changes randomly: stay focused!",color:fr?"Clique toutes les cases de la couleur demandée. La cible change quand la couleur est terminée.":"Click all tiles matching the requested color. The target changes when that color is cleared.",pairs:fr?"Retrouve les paires cachées. Mémorise bien les symboles !":"Find the hidden pairs. Memorize the symbols!",parity:fr?"Clique UNIQUEMENT les nombres demandés (pairs OU impairs). Les autres sont des pièges : ne les touche pas !":"Click ONLY the requested numbers (even OR odd). The others are traps: don't touch them!",forbidden:fr?"Clique tous les nombres SAUF le nombre interdit. Ne le touche surtout pas !":"Click all numbers EXCEPT the forbidden one. Do not touch it!","calc+":fr?"Clique sur les DEUX cases dont la SOMME donne la cible.":"Click the TWO tiles whose SUM equals the target.","calc-":fr?"Clique sur les DEUX cases dont la DIFFÉRENCE donne la cible.":"Click the TWO tiles whose DIFFERENCE equals the target.",sprint:fr?"Le temps est minuscule : vitesse pure !":"Tiny time limit: pure speed!",memory:fr?"Mémorise les nombres... ils seront cachés après 2 secondes !":"Memorize the numbers... they hide after 2 seconds!",fog:fr?"Le brouillard fait clignoter les nombres !":"Fog makes numbers blink!",nofail:fr?"UNE seule erreur et l'étage est raté. Concentration maximale.":"ONE single mistake and the floor fails. Max focus.",boss:fr?"Le Gardien grimpe en même temps que toi. Finis AVANT lui !":"The Guardian climbs with you. Finish BEFORE him!"})[t]||"";
}
function towerDing(){
  try{SoundEngine.init();const t=SoundEngine.ctx.currentTime;
  [880,1320].forEach((f,i)=>{const o=SoundEngine.ctx.createOscillator(),g=SoundEngine.ctx.createGain();
  o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.08,t+i*.12);g.gain.exponentialRampToValueAtTime(.0001,t+i*.12+.25);
  o.connect(g);g.connect(SoundEngine.ctx.destination);o.start(t+i*.12);o.stop(t+i*.12+.25);});}catch(e){}
}

function openTower(){
  let m=document.getElementById("screen-tower");
  if(!m){
    m=document.createElement("div");m.id="screen-tower";
    m.innerHTML=`<div class="tw-header">
        <button class="tw-back" onclick="closeTower()">⬅️</button>
        <b>🗺️ MODE AVENTURE</b>
        <span id="tower-sub" style="font-size:9px;color:#aaa;"></span>
      </div>
      <div class="tw-mapwrap" id="tw-mapwrap"></div>
      <div class="tw-vig"></div>`;
    document.body.appendChild(m);
  }
  m.style.display="flex";
  TW_phase="room";
  socket.emit("get_tower");
  towerDing();
}
function closeTower(){document.getElementById("screen-tower").style.display="none";}
function drawPanel(){}
function drawChips(){}
function pressFloor(){}
function rideTo(){}
function viewWonFloor(){}
function playExterior(){}
function showElevator(){drawRoom();}
function afterWinTravel(){drawRoom();}
function renderTower(){drawRoom();}

socket.on("tower_data",(d)=>{
  towerProgress={floor:d.floor||0,stars:d.stars||{}};
  drawRoom();
});

function sceneHTML(c,W,C){
  if(W.scene==="city"){
    let sky=`<span class="tw-moon"></span>`;
    for(let i=0;i<16;i++)sky+=`<span class="tw-star2" style="left:${(i*61)%96}%;top:${(i*29)%30}%;animation-delay:${(i*.4)%3}s;"></span>`;
    sky+=`<span class="tw-cloud" style="top:10%;width:26%;animation-duration:60s;"></span><span class="tw-cloud" style="top:20%;width:18%;animation-duration:80s;animation-delay:12s;"></span>`;
    let back="";const hb=[70,88,76,96,82,90];
    for(let i=0;i<6;i++)back+=`<div class="tw-bldg" style="height:${hb[i]}%;flex:${i%2?1.3:1};"></div>`;
    let b="";const hs=[42,62,50,74,56,68,46,70];const hf=[1,1.25,.9,1.15,1,.85,1.2,1];
    const cols=["#00ffff","#ff00ff","#f8b500","#7dff8a"];
    for(let i=0;i<8;i++){
      let wins="";const n=8+(i%3)*3;
      for(let w=0;w<n;w++){
        wins+=`<span class="tw-wl" style="color:${cols[(w+i)%4]};left:${6+((w*23)%84)}%;top:${8+((w*31)%78)}%;animation-duration:${2.5+((w*13)%4)}s;animation-delay:${(w*0.53)%3}s;"></span>`;
      }
      b+=`<div class="tw-bldg" style="height:${hs[i]}%;flex:${hf[i]};">${wins}${i%3===0?'<span class="tw-ant"></span>':""}</div>`;
    }
    const car=(cls,bottom,dur,delay,col)=>`<span class="tw-car ${cls}" style="bottom:${bottom};animation-duration:${dur};animation-delay:${delay};color:${col};"><i class="cb"></i><i class="cc"></i><i class="ug"></i><i class="w1"></i><i class="w2"></i><i class="hl"></i><i class="tl"></i></span>`;
    return `${sky}<div class="tw-horizon"></div><div class="tw-cityback">${back}</div><div class="tw-city">${b}</div>
      <div class="tw-road"><span class="tw-lane"></span></div><div class="tw-reflect"></div>
      ${car("","2.5%","9s","0s","#00d2ff")}${car("r","8%","12s","2s","#ff2bd6")}${car("s","9%","7s","4.5s","#f8b500")}`;
  }
  if(W.scene==="glacier"){
    let ice="";
    [[6,16],[14,10],[22,18],[31,9],[40,15],[49,8],[58,17],[67,10],[76,16],[85,9],[93,14]].forEach((p,i)=>{
      ice+=`<span class="tw-icicle" style="left:${p[0]}%;height:${p[1]}%;"></span>`;
    });
    let stag="";[[10,10],[26,7],[52,9],[64,6],[84,8]].forEach(p=>{stag+=`<span class="tw-stalag" style="left:${p[0]}%;height:${p[1]}%;"></span>`;});
    const cluster=(x,s,d)=>`<span class="tw-cryscl" style="left:${x}%;bottom:14%;transform:scale(${s});animation-delay:${d};"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i></span>`;
    return `<div class="tw-cavewall"></div><div class="tw-rocktop"></div>${ice}
      <div class="tw-mist m1"></div><div class="tw-mist m2"></div>
      ${cluster(14,1,"0s")}${cluster(68,.85,".8s")}
      <span class="tw-cryscl" style="left:44%;bottom:12%;transform:scale(.45);animation-delay:1.4s;"><i class="c c1"></i><i class="c c2"></i></span>
      <div class="tw-icefloor"></div>${stag}<div class="tw-rockbot"></div>`;
  }
  if(W.scene==="vault"){
    let bolts="";for(let i=0;i<12;i++){const a=i*Math.PI/6;bolts+=`<span class="tw-vbolt" style="left:${50+44*Math.cos(a)}%;top:${50+44*Math.sin(a)}%;"></span>`;}
    let knobs="";for(let i=0;i<6;i++){const a=i*Math.PI/3;knobs+=`<span class="tw-knob" style="left:${50+38*Math.cos(a)}%;top:${50+38*Math.sin(a)}%;"></span>`;}
    return `<div class="tw-bankwall"></div><div class="tw-marble"></div>
      <div class="tw-spot" style="left:22%;"></div><div class="tw-spot" style="left:62%;animation-delay:1.5s;"></div>
      <div class="tw-pillar" style="left:2%;"></div><div class="tw-pillar" style="right:2%;"></div>
      <div class="tw-vaultglow"></div>
      <div class="tw-vaultframe">
        <span class="tw-fbolt" style="left:5%;top:7%;"></span><span class="tw-fbolt" style="right:5%;top:7%;"></span>
        <span class="tw-fbolt" style="left:5%;bottom:7%;"></span><span class="tw-fbolt" style="right:5%;bottom:7%;"></span>
        <span class="tw-hinge h1"></span><span class="tw-hinge h2"></span>
        <div class="tw-vaultdoor">
          <div class="tw-vaultwheel">${knobs}</div>
          <span class="tw-dial"></span>
          <span class="tw-handle"></span>
          ${bolts}
        </div>
      </div>
      <div class="tw-laser" style="top:28%;animation-duration:5s;"></div>
      <div class="tw-laser d" style="top:50%;animation-duration:7s;animation-delay:1s;"></div>
      <div class="tw-laser" style="top:72%;animation-duration:6s;animation-delay:2s;"></div>
      <div class="tw-gloss"></div><div class="tw-goldspill"></div>`;
  }
  return "";
}

function drawRoom(){
  const wrap=document.getElementById("tw-mapwrap");if(!wrap)return;
  const season=currentSeasonNum();
  const current=Math.min(towerProgress.floor+1,TOTAL_FLOORS);
  let totalStars=0;for(const k in towerProgress.stars)totalStars+=towerProgress.stars[k];
  document.getElementById("tower-sub").innerText="É"+current+" ⭐"+totalStars;
  const H=TOTAL_FLOORS*STEP+110;
  let zones="",gates="",paths="",ptsByChap={};
  for(let c=1;c<=9;c++){
    const chap=TOWER_CHAPTERS[c-1];
    const zTop=H-STEP*c*FPC-32,zH=STEP*FPC;
       const starLock=!worldUnlockedByStars(c);
    if(chap.season>season || starLock){
      zones+=`<div class="tw-zone" style="top:${zTop}px;height:${zH}px;background:linear-gradient(180deg,#0a0a14,#050508);"></div>`;
      const label=(chap.season>season)
        ? `🔒 ${currentLang==="fr"?"Bientôt":"Soon"}`
        : `🔒 ${starsInWorld(c-1)}/${WORLD_QUOTA} ⭐`;
      gates+=`<div class="tw-gate lock" style="top:${zTop+10}px;right:12px;left:auto;transform:none;">${label}</div>`;
      continue;
    }
    const W=TOWER_WORLDS[c],C=TOWER_COLORS[c];
    let parts="";
    for(let i=0;i<7;i++){
      parts+=`<span class="tw-part ${W.part}" style="color:${C.acc};left:${(i*13+c*7)%96}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;"></span>`;
    }
    zones+=`<div class="tw-zone" style="top:${zTop}px;height:${zH}px;background:${W.bg};">${sceneHTML(c,W,C)}${parts}</div>`;
    gates+=`<div class="tw-gate" style="top:${zTop+10}px;right:12px;left:auto;transform:none;border-color:${C.acc};color:${C.acc};">${chap.icon} ${chap.name}</div>`;
  }
  for(let f=1;f<=TOTAL_FLOORS;f++){
    const chap=getTowerChapter(f);
    if(chap.season>season)continue;
    const y=H-STEP*f,x=50+Math.sin(f*0.55)*16;
    (ptsByChap[chap.id]=ptsByChap[chap.id]||[]).push([x,y+23]);
  }
  for(const cid in ptsByChap){
    const pts=ptsByChap[cid];
    if(pts.length>1)paths+=`<path d="M${pts.map(p=>p[0]+" "+p[1]).join(" L ")}" fill="none" stroke="${TOWER_COLORS[cid].acc}44" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }
  wrap.innerHTML=`<div class="tw-map" style="height:${H}px;">${zones}
    <div class="tw-col">
      <svg style="position:absolute;inset:0;width:100%;height:100%;z-index:1;" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${paths}</svg>
      <div id="tw-nodes" style="position:absolute;inset:0;z-index:2;"></div>
      ${gates}
    </div></div>`;
  wrap.onscroll=scheduleRenderNodes;
  const yCur=H-STEP*current;
  wrap.scrollTop=Math.max(0,yCur-wrap.clientHeight/2);
  renderNodesWindow();
}

let TW_nodesRaf=null;
function scheduleRenderNodes(){
  if(TW_nodesRaf)return;
  TW_nodesRaf=requestAnimationFrame(()=>{TW_nodesRaf=null;renderNodesWindow();});
}
function renderNodesWindow(){
  const wrap=document.getElementById("tw-mapwrap");if(!wrap)return;
  const layer=document.getElementById("tw-nodes");if(!layer)return;
  const H=TOTAL_FLOORS*STEP+110;
  const top=wrap.scrollTop, vh=wrap.clientHeight;
  const yTop=top-300, yBot=top+vh+300;
  const hi=Math.min(TOTAL_FLOORS,Math.floor((H-yTop)/STEP)+1);
  const lo=Math.max(1,Math.ceil((H-yBot)/STEP)-1);
   const season=currentSeasonNum();
  const current=Math.min(towerProgress.floor+1,TOTAL_FLOORS);
  const worldOk={};
  for(let c=1;c<=9;c++) worldOk[c]=(TOWER_CHAPTERS[c-1].season<=season)&&worldUnlockedByStars(c);
  let html="";
  for(let f=lo;f<=hi;f++){
    const chap=getTowerChapter(f);
    if(!worldOk[chap.id])continue;
    const y=H-STEP*f,x=50+Math.sin(f*0.55)*16;
    const won=f<=towerProgress.floor,cur=f===current;
    const inChap=((f-1)%FPC)+1;
    const boss=inChap===FPC, guardian=!boss&&(inChap%50===0);
    const st=towerProgress.stars[String(f)];
    const awake=(boss||guardian)?(towerProgress.floor>=f-1):true;
    const clickable=(cur&&awake)||won;
    const C=TOWER_COLORS[chap.id];
    const wonBg=won?`background:radial-gradient(circle at 35% 30%,#ffffffb3,${C.acc} 55%,#000000c9);`:"";
    html+=`<div class="tw-node ${won?"won":(cur&&awake?"cur":"lock")} ${(boss||guardian)?"boss":""}" style="left:${x}%;top:${y}px;${wonBg}${(boss||guardian)?`border-color:${C.acc};`:""}" ${clickable?`onclick="mapPlay(${f})"`:""}>
      ${boss?chap.boss:(guardian?"⚔️":f)}
      ${won&&st?`<span class="tw-st">${"⭐".repeat(st)}</span>`:""}
      ${cur?`<span class="tw-ava">🧍</span>`:""}
    </div>`;
  }
  layer.innerHTML=html;
}

function mapPlay(f){
  const def=getFloorDef(f);
  def.replay=f<=towerProgress.floor;
  showBriefing(def);
}
function showBriefing(def){
  closeBriefing();
  const fr=currentLang==="fr";
  const curStars=towerProgress.stars[String(def.floor)]||0;
  const starTime=Math.floor(def.time*0.6);
  let starRule;
  if(def.type==="pairs"){
    starRule=fr?"💡 ⭐ finir · ⭐ en 25s · ⭐⭐⭐ en 15s (erreurs OK !)":"💡 ⭐ finish · ⭐ under 25s · ⭐⭐⭐ under 15s (mistakes OK!)";
  } else if(def.type==="sprint"){
    const t3=Math.round(def.gridSize*0.45);
    const t2=Math.round(def.gridSize*0.75);
    starRule=fr?"💡 ⭐ finir · ⭐⭐ en "+t2+"s · ⭐⭐⭐ en "+t3+"s":"💡 ⭐ finish · ⭐ under "+t2+"s · ⭐⭐⭐ under "+t3+"s";
  } else {
    starRule=fr?"💡 ⭐ terminer · ⭐⭐ ≤2 erreurs · ⭐⭐⭐ 0 erreur + moins de "+starTime+"s !":"💡 ⭐ finish · ⭐⭐ ≤2 mistakes · ⭐⭐⭐ 0 mistake + under "+starTime+"s!";
  }
  const replayLine=def.replay?`<div style="font-size:10px;color:#f8b500;margin-bottom:6px;">${fr?"Actuel : "+"⭐".repeat(curStars)+" — rejoue pour viser 3 ⭐ !":"Current: "+"⭐".repeat(curStars)+" — replay for 3 ⭐!"}</div>`:"";
  const b=document.createElement("div");b.id="tw-brief";b.className="tw-brief";
  b.innerHTML=`<div class="tw-brief-card">
    <div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🏰 ${fr?"ÉTAGE":"FLOOR"} ${def.floor} — ${typeLabel(def.type)}</div>
    <div style="font-size:11px;color:#ddd;line-height:1.5;margin-bottom:8px;">${twDesc(def.type)}</div>
    <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${starRule}</div>
    ${replayLine}
    <button class="btn-main btn-blue" style="width:100%;margin-bottom:6px;" onclick="closeBriefing();startTowerFloor(getFloorDef(${def.floor}))">${def.replay?"🔄 "+(fr?"REJOUER":"REPLAY"):"⚡ "+(fr?"LANCER !":"GO!")}</button>
    <button class="btn-secondary" style="width:100%;" onclick="closeBriefing()">❌ ${fr?"Annuler":"Cancel"}</button>
  </div>`;
  document.body.appendChild(b);
}
function closeBriefing(){const b=document.getElementById("tw-brief");if(b)b.remove();}

/* ================= MOTEUR TOUR — NIVEAU 2 FLUIDE (optimistic) ================= */
let TW=null;            // état serveur de référence
let TW_dom=null;        // miroir local appliqué au DOM (pour optimistic)
let TW_buttons=[];
let TW_lastFloor=0;
let TW_hudCache="";
let TW_localTimer=null;
let TW_lastClick=0;
let TW_pairsLock=false;

function ensureTowerOverlay(){
  let ov=document.getElementById("tower-game");
  if(!ov){ov=document.createElement("div");ov.id="tower-game";ov.className="twg-screen";
    ov.innerHTML=`<div class="twg-header">
        <button class="tw-back" onclick="quitFloor()">⬅️</button>
        <b id="twg-title"></b>
        <span id="twg-timer">⏱️</span>
      </div>
      <div id="tg-bar" class="twg-bar"></div>
      <div id="tg-hud" class="twg-hud"></div>
      <div class="twg-gridwrap"><div id="tg-grid" class="tg-grid"></div></div>
      <div id="tg-msg" class="twg-msg"></div>`;
    document.body.appendChild(ov);}
  return ov;
}

function cloneState(s){
  return {
    type:s.type, total:s.total, gridSize:s.gridSize, floor:s.floor,
    target:s.target, targetColor:s.targetColor, targetParity:s.targetParity, forbidden:s.forbidden,
    timeLeft:s.timeLeft, ai:s.ai,
    gone:Object.assign({},s.gone||{}),
    revealed:Object.assign({},s.revealed||{}),
    display:(s.display||[]).slice(),
    sel:(s.sel===undefined?null:s.sel)
  };
}

function startTowerFloor(def){
  if(TW)return;
  const ov=ensureTowerOverlay();
  ov.style.display="flex";
  TW_lastFloor=def.floor;
  TW=null; TW_dom=null; TW_buttons=[]; TW_hudCache="";
  stopLocalTimer();
  document.getElementById("tg-grid").innerHTML="";
  document.getElementById("twg-title").innerText="🏰 "+(currentLang==="fr"?"ÉTAGE":"FLOOR")+" "+def.floor;
  socket.emit("tower_floor_start",{floor:def.floor});
}

socket.on("tower_state",(st)=>{
  if(!st||!st.display)return;
  const first=TW_buttons.length===0;
  TW=st;
  TW_lastFloor=st.floor;
  if(first){
    buildGridFromState(st);
    TW_dom=cloneState(st);
  }else{
    syncDomToState(st);
    TW_dom=cloneState(st);
  }
  renderHUDFromState();
  startLocalTimer(st.timeLeft);
});

socket.on("tower_fail",(r)=>{
  TW=null; TW_dom=null; stopLocalTimer();
  showFailUI(r);
});

function buildGridFromState(st){
  const g=document.getElementById("tg-grid");
  const cols=st.gridSize<=16?4:(st.gridSize<=20?5:6);
  g.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  g.innerHTML="";
  TW_buttons=[];
  st.display.forEach((v,i)=>{
    const b=document.createElement("button");
    b.className="tg-tile"+(st.type==="fog"?" foggy":"");
    if(st.gone[i])b.classList.add("gone");
    if(st.type==="color"&&v){
      b.style.background=`radial-gradient(circle at 35% 25%,#ffffffaa,transparent 22%),linear-gradient(180deg,${v.hex},#111827 85%)`;
      b.style.boxShadow=`0 0 14px ${v.hex}66,inset 0 1px 0 #fff8`;
      b.textContent="";
    }else if(st.type==="pairs"){
      b.textContent=st.gone[i]?"":(v===null?"?":v);
      if((st.revealed&&st.revealed[i])||st.sel===i)b.classList.add("sel");
    }else{
      b.textContent=v;
    }
    b.onclick=()=>handleTowerClick(i,b);
    g.appendChild(b);
    TW_buttons[i]=b;
  });
}

function syncDomToState(st){
  for(let i=0;i<st.display.length;i++){
    const b=TW_buttons[i]; if(!b)continue;
    const wasGone=!!TW_dom.gone[i], isGone=!!st.gone[i];
    if(isGone!==wasGone)b.classList.toggle("gone",isGone);
    if(st.type==="pairs"){
      const dv=st.display[i], ov=TW_dom.display[i];
      if(dv!==ov)b.textContent=isGone?"":(dv===null?"?":dv);
      const rev=!!(st.revealed&&st.revealed[i])||st.sel===i;
      const orev=!!(TW_dom.revealed&&TW_dom.revealed[i])||TW_dom.sel===i;
      if(rev!==orev)b.classList.toggle("sel",rev);
    }
  }
}

function handleTowerClick(i,b){
  const now=Date.now();
  if(now-TW_lastClick<100)return;
  TW_lastClick=now;
  if(!TW_dom||TW_dom.gone[i])return;
  if(TW_pairsLock)return;

  // ✅ feedback tactile IMMÉDIAT
  b.style.transform="scale(0.9)";
  setTimeout(()=>{ if(b)b.style.transform=""; },120);

  const t=TW_dom.type;
  if(t==="pairs"){
    // valeurs cachées : pas d'optimistic, serveur confirme vite (280ms lock)
    socket.emit("tower_click",{index:i});
    return;
  }
  const v=TW_dom.display[i];
  let success=null;
  if(t==="color"&&TW_dom.targetColor)success=(v&&v.key===TW_dom.targetColor.key);
  else if(t==="parity")success=(TW_dom.targetParity==="even"?(v%2===0):(v%2!==0));
  else if(t==="forbidden")success=(v!==TW_dom.forbidden);
  else if(TW_dom.target!==null&&TW_dom.target!==undefined)success=(v===TW_dom.target);

  // ✅ OPTIMISTIC : on applique le résultat immédiatement, le serveur confirmera
  if(success===true){
    TW_dom.gone[i]=true;
    b.classList.add("gone");
    if(t==="reverse")TW_dom.target--;
    else if(t==="classic"||t==="sprint"||t==="fog"||t==="nofail")TW_dom.target++;
    if(typeof SoundEngine!=="undefined"&&SoundEngine.playClick)SoundEngine.playClick();
  }else if(success===false){
    if(typeof SoundEngine!=="undefined"&&SoundEngine.playError)SoundEngine.playError();
  }
  socket.emit("tower_click",{index:i});
}

function stopLocalTimer(){ if(TW_localTimer){clearInterval(TW_localTimer);TW_localTimer=null;} }
function startLocalTimer(tl){
  stopLocalTimer();
  let left=(typeof tl==="number"?tl:0);
  const el=document.getElementById("twg-timer");
  const paint=()=>{ if(el){ el.innerText="⏱️ "+Math.max(0,Math.ceil(left))+"s"; el.style.color=left<=5?"#ff4b2b":"#fff"; } };
  paint();
  TW_localTimer=setInterval(()=>{ left-=0.25; paint(); },250);
}

function renderHUDFromState(){
  const h=document.getElementById("tg-hud");if(!h||!TW)return;
  const fr=currentLang==="fr";
  let main="";
  if(TW.type==="color"&&TW.targetColor)main=`${fr?"COULEUR":"COLOR"} : <span style="color:${TW.targetColor.hex};text-shadow:0 0 12px ${TW.targetColor.hex};">${TW.targetColor.name}</span>`;
  else if(TW.type==="pairs")main=fr?"🧩 RETROUVE LES PAIRES":"🧩 FIND THE PAIRS";
  else if(TW.type==="parity")main=TW.targetParity==="even"?(fr?"CLIQUE : PAIRS":"CLICK: EVEN"):(fr?"CLIQUE : IMPAIRS":"CLICK: ODD");
  else if(TW.type==="forbidden")main=`${fr?"INTERDIT":"FORBIDDEN"} : <span style="color:#ff4b2b;text-shadow:0 0 12px #ff4b2b;">${TW.forbidden}</span>`;
  else if(TW.target!==null&&TW.target!==undefined)main=`<span>${fr?"CIBLE":"TARGET"} : ${TW.target}</span>`;
  if(main!==TW_hudCache){ h.innerHTML=main; TW_hudCache=main; }
  const bar=document.getElementById("tg-bar");
  if(bar){
    if(TW.type==="boss"){ bar.style.display="block"; bar.innerHTML=`<div style="width:${Math.min(100,TW.ai/TW.total*100)}%;height:100%;background:linear-gradient(90deg,#ff4b2b,#f8b500);"></div>`; }
    else bar.style.display="none";
  }
  document.getElementById("twg-title").innerText="🏰 "+(fr?"ÉTAGE":"FLOOR")+" "+TW.floor+" — "+typeLabel(TW.type);
  const msg=TW.type==="nofail"?"💎 Une seule erreur = échec !":(TW.type==="pairs"?"🧠 Mémorise les positions !":(TW.type==="forbidden"?"🚫 Ne touche pas le nombre interdit !":""));
  const msgEl=document.getElementById("tg-msg"); if(msgEl&&msgEl.innerText!==msg)msgEl.innerText=msg;
}

function showFailUI(r){
  const ov=ensureTowerOverlay();
  ov.style.display="flex";
  document.getElementById("tg-bar").style.display="none";
  document.getElementById("tg-hud").innerHTML="";
  const g=document.getElementById("tg-grid");
  g.style.gridTemplateColumns="1fr";
  g.innerHTML=`<div style="text-align:center;"><div style="font-size:30px;">💥</div>
    <div style="color:#ff4b2b;font-weight:900;margin:6px 0;">ÉTAGE RATÉ !</div>
    <button class="btn-main btn-blue" onclick="retryFloor()">🔄 Réessayer</button>
    <button class="btn-secondary" onclick="quitFloor()">Quitter</button></div>`;
}
function retryFloor(){TW=null;TW_dom=null;stopLocalTimer();startTowerFloor({floor:TW_lastFloor});}
function quitFloor(){TW=null;TW_dom=null;stopLocalTimer();socket.emit("tower_quit");const ov=document.getElementById("tower-game");if(ov)ov.style.display="none";}

socket.on("tower_result",(res)=>{
  TW=null;
  const ov=document.getElementById("tower-game");if(ov)ov.style.display="none";
  if(!res.ok)return;
  towerProgress.floor=Math.max(towerProgress.floor,res.floor);
  towerProgress.stars[String(res.floor)]=Math.max(towerProgress.stars[String(res.floor)]||0,res.stars);
  showTowerWinPopup(res);renderTower();
});
function showTowerWinPopup(res){
  const chap=getTowerChapter(res.floor);
  const inChap=((res.floor-1)%FPC)+1;
  const obj=inChap===FPC?chap.boss:chap.objects[(inChap-1)%9];
  const d=document.createElement("div");d.className="modal-overlay";d.style.display="flex";
  d.innerHTML=`<div class="modal-card" style="max-width:300px;text-align:center;">
    <h3 style="color:#00ff88;margin:0 0 6px 0;">✅ ÉTAGE ${res.floor} VAINCU !</h3>
    <div class="tw-stars">${[1,2,3].map(i=>`<span style="animation-delay:${i*0.2}s;${i<=res.stars?"":"filter:grayscale(1);opacity:.3;"}">⭐</span>`).join("")}</div>
    <div style="font-size:13px;color:#f8b500;font-weight:bold;margin-bottom:6px;">+${res.coins} 🪙</div>
    <div style="font-size:9px;color:#aaa;margin-bottom:6px;">💡 ${currentLang==="fr"?"3⭐ = 0 erreur + rapide !":"3⭐ = 0 mistake + fast!"}</div>
    <div style="font-size:12px;color:#aaa;margin-bottom:10px;">${currentLang==="fr"?"Nouvel objet placé dans la pièce :":"New object placed in the room:"} <span style="font-size:24px;">${obj}</span></div>
    ${res.reward?`<div style="font-size:12px;color:#00d2ff;font-weight:bold;margin-bottom:10px;">🎁 CHAPITRE TERMINÉ : ${res.reward} débloqué !</div>`:""}
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove();afterWinTravel()">Continuer ⚡</button></div>`;
  document.body.appendChild(d);
  towerDing();
}

/* ----- CSS correctifs v3 ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .tw-moon{position:absolute;top:6%;right:12%;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff8e8,#d8c9a8 60%,#a89878);box-shadow:0 0 24px #fff8e866,0 0 60px #fff8e833;}
  .tw-star2{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:twFlickP 3s steps(2) infinite;}
  .tw-cloud{position:absolute;height:10px;border-radius:6px;background:linear-gradient(90deg,transparent,#8888aa22 30%,#8888aa22 70%,transparent);filter:blur(3px);animation:twCloud linear infinite;}
  @keyframes twCloud{from{left:-30%}to{left:110%}}
  .tw-cityback{position:absolute;bottom:14%;left:0;right:0;height:52%;display:flex;align-items:flex-end;gap:1%;padding:0 1%;opacity:.5;filter:brightness(.5);}
  .tw-cityback .tw-bldg{border-top:none;}
  .tw-car .w1,.tw-car .w2{display:none;}
  .tw-car .cb{border-radius:8px 14px 6px 6px;background:linear-gradient(180deg,#3d3d52,#12121c 70%);box-shadow:inset 0 1px 0 #ffffff55,0 0 10px #00d2ff44;}
  .tw-car .ug{position:absolute;bottom:-3px;left:6%;right:6%;height:4px;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor,0 0 20px currentColor;opacity:.9;}
  .tw-car .cc{border-radius:8px 10px 0 0;background:linear-gradient(180deg,#2a2a3a,#151520);}
  .tw-car .cc::after{background:linear-gradient(180deg,#7ff4ff88,#20405066);}
  .tw-car .hl{background:linear-gradient(90deg,#bffcffcc,transparent);height:5px;}
  .tw-car .tl{background:radial-gradient(closest-side,#ff2bd6,transparent);box-shadow:0 0 8px #ff2bd6;}
  .tw-cryscl{filter:drop-shadow(0 0 22px #74ebf5cc);}
  .tw-cryscl .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f4feff,#8ff2ff 45%,#2a8ba8 80%,#14506a);clip-path:polygon(50% 0,76% 12%,90% 62%,70% 100%,30% 100%,10% 62%,24% 12%);}
  .tw-cryscl .c::before{content:"";position:absolute;left:50%;top:6%;width:2px;height:80%;background:linear-gradient(#ffffffcc,transparent);}
  .tw-icicle{width:22px;background:linear-gradient(180deg,#5a8ea0aa,#bfefffcc 55%,#ffffff);clip-path:polygon(0 0,100% 0,70% 45%,60% 80%,52% 100%,48% 100%,40% 80%,30% 45%);filter:drop-shadow(0 0 6px #74ebf5aa);}
  .tw-stalag{position:absolute;bottom:0;width:26px;background:linear-gradient(0deg,#5a8ea0aa,#bfefffcc 55%,#ffffff);clip-path:polygon(48% 0,52% 0,62% 30%,72% 60%,100% 100%,0 100%,28% 60%,38% 30%);filter:drop-shadow(0 0 6px #74ebf5aa);}
  .tw-marble{position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,#ffffff08 40% 42%,transparent 42%),linear-gradient(65deg,transparent 55%,#ffffff06 55% 57%,transparent 57%),linear-gradient(150deg,transparent 70%,#ffffff05 70% 71%,transparent 71%);}
  .tw-spot{position:absolute;top:0;width:16%;height:70%;background:linear-gradient(180deg,#ffe9a833,transparent 80%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);filter:blur(3px);animation:twGlowC 4s infinite;}
  .tw-gloss{position:absolute;bottom:0;left:0;right:0;height:12%;background:linear-gradient(180deg,#0000,#f8b50018 40%,#00000088);box-shadow:inset 0 6px 14px #000a;}
  `;
  document.head.appendChild(s);
})();

/* ----- CSS lasers de sécurité ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .tw-laser{position:absolute;left:9%;right:9%;height:2px;background:linear-gradient(90deg,transparent,#ff2020 8%,#ff7070 50%,#ff2020 92%,transparent);box-shadow:0 0 8px #ff2020cc,0 0 20px #ff202066;opacity:.85;animation:twLaserV ease-in-out infinite alternate;z-index:1;}
  .tw-laser::before,.tw-laser::after{content:"";position:absolute;top:-3px;width:9px;height:9px;border-radius:2px;background:#1a0505;box-shadow:0 0 7px #ff2020,inset 0 0 3px #ff7070;animation:twFlickP 1.6s steps(2) infinite;}
  .tw-laser::before{left:-3px;}
  .tw-laser::after{right:-3px;}
  @keyframes twLaserV{from{transform:translateY(-26px)}to{transform:translateY(26px)}}
  .tw-laser.d{animation-name:twLaserD;}
  @keyframes twLaserD{from{transform:rotate(-5deg) translateY(-18px)}to{transform:rotate(5deg) translateY(18px)}}
  `;
  document.head.appendChild(s);
})();

/* ----- CSS jeu plein écran ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .twg-screen{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,#1a2142,#05050f 70%);z-index:9996;display:none;flex-direction:column;}
  .twg-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;}
  .twg-header b{color:#00d2ff;font-size:13px;flex:1;text-align:center;}
  #twg-timer{color:#fff;font-weight:900;font-size:15px;min-width:56px;text-align:right;}
  .twg-hud{text-align:center;padding:10px 6px 4px;font-size:clamp(20px,6vw,28px);font-weight:900;color:#00d2ff;text-shadow:0 0 14px #00d2ff88;}
  .twg-bar{height:10px;margin:4px 16px;background:#200010;border-radius:5px;overflow:hidden;display:none;}
  .twg-gridwrap{flex:1;display:flex;align-items:center;justify-content:center;padding:10px;overflow:hidden;}
  #tower-game .tg-grid{gap:8px;width:100%;max-width:520px;}
  .tg-tile{padding:0;aspect-ratio:1;font-size:clamp(18px,5vw,26px);display:flex;align-items:center;justify-content:center;border-radius:12px;}
  .twg-msg{text-align:center;font-size:11px;color:#aaa;padding:6px 10px 12px;}
  `;
  document.head.appendChild(s);
})();
/* ----- CSS tuiles de scène ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .tw-scenetile{position:absolute;left:0;right:0;overflow:hidden;}
  `;
  document.head.appendChild(s);
})();
