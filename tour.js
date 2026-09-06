/* ============================================================
TOUR.JS — MODE AVENTURE (100% CSS, immersif)
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
function getTowerChapter(f) { return TOWER_CHAPTERS[Math.ceil(f / 10) - 1]; }
function currentSeasonNum() { return parseInt((myProfile.currentSeasonId || "s1").replace("s", "")) || 1; }
function getFloorDef(floor) {
  const chap = Math.ceil(floor / 10), inChap = ((floor - 1) % 10) + 1;
  const base = { floor, gridSize: 16 + (chap - 1) * 4, time: Math.max(18, 32 - chap * 2) };
  if (inChap === 10) return { ...base, type: "boss" };
  const t = { 1:"classic", 2:"reverse", 3:"random", 4:"calc+", 5:"sprint", 6:"calc-", 7:"memory", 8:"fog", 9:"nofail" }[inChap];
  if (t === "sprint") return { ...base, type: "sprint", time: Math.max(8, 14 - chap) };
  if (t === "nofail") return { ...base, type: "nofail", time: 25 };
  return { ...base, type: t };
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

  /* ============ VILLE NÉON ============ */
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

  /* ============ GROTTE DE CRISTAL ============ */
  .tw-cavewall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#74ebf518 0%,#0a2a3a66 35%,#000000ee 78%);}
  .tw-rocktop{position:absolute;top:0;left:0;right:0;height:26%;background:#020608;clip-path:polygon(0 0,100% 0,96% 55%,88% 25%,80% 70%,70% 30%,60% 75%,50% 35%,40% 80%,30% 30%,20% 70%,12% 28%,4% 60%,0 30%);}
  .tw-rockbot{position:absolute;bottom:0;left:0;right:0;height:20%;background:#020608;clip-path:polygon(0 100%,100% 100%,96% 45%,88% 75%,80% 30%,70% 70%,60% 25%,50% 65%,40% 20%,30% 70%,20% 30%,12% 72%,4% 40%,0 70%);}
  .tw-stalac{position:absolute;top:0;background:linear-gradient(180deg,#020608,#3a5a6e 60%,#74ebf5);clip-path:polygon(30% 0,70% 0,60% 100%,40% 100%);box-shadow:0 0 6px #74ebf566;}
  .tw-bigcrys{position:absolute;background:linear-gradient(180deg,#ffffffee,#74ebf5 55%,#0a2a3a);clip-path:polygon(50% 0,100% 100%,0 100%);box-shadow:0 0 30px #74ebf5cc,0 0 60px #74ebf566;animation:twGlowC 2.2s infinite;}
  .tw-ray{position:absolute;top:28%;left:50%;width:7%;height:62%;background:linear-gradient(180deg,#74ebf533,transparent);transform-origin:top center;filter:blur(4px);animation:twRay 4s ease-in-out infinite;}
  @keyframes twRay{50%{opacity:.35}}
  .tw-icefloor{position:absolute;bottom:0;left:0;right:0;height:16%;background:linear-gradient(180deg,#74ebf522,#04141d);box-shadow:inset 0 8px 20px #74ebf533;}
  @keyframes twGlowC{50%{filter:brightness(1.6)}}

  /* ============ BANQUE DORÉE ============ */
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

  /* ============ PARTICULES ============ */
  .tw-part{position:absolute;width:4px;height:4px;border-radius:50%;}
  .tw-part.snow{background:#ffffffcc;animation:twFall linear infinite;}
  .tw-part.spark{background:#f8b500;box-shadow:0 0 6px #f8b500;animation:twRise linear infinite;}
  .tw-part.neon{box-shadow:0 0 8px currentColor;background:currentColor;animation:twFlickP 2.2s steps(2) infinite;}
  @keyframes twFall{0%{top:-4%}100%{top:104%}}
  @keyframes twRise{0%{top:104%}100%{top:-4%}}
  @keyframes twFlickP{50%{opacity:.15}}

  /* ============ NŒUDS ============ */
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

  /* ============ BRIEFING ============ */
  .tw-brief{position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9995;}
  .tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:16px;max-width:82%;text-align:center;box-shadow:0 0 20px #00d2ff66;}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  .btn-tower{background:linear-gradient(45deg,#7a00ff,#00d2ff)!important;animation:twBtn 2s infinite;box-shadow:0 0 14px #7a00ff88;}
  @keyframes twBtn{50%{box-shadow:0 0 22px #00d2ffcc}}

  /* ============ JEU ============ */
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
  /* --- Route + voitures réalistes --- */
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
  /* --- Grotte : vrais cristaux + stalactites + brume --- */
  .tw-icicle{position:absolute;top:0;width:14px;background:linear-gradient(180deg,#9fd8e8aa,#e8fbffdd 70%,#ffffff);clip-path:polygon(0 0,100% 0,62% 60%,54% 100%,46% 100%,38% 60%);filter:drop-shadow(0 0 4px #74ebf588);}
  .tw-cryscl{position:absolute;width:90px;height:120px;filter:drop-shadow(0 0 18px #74ebf5aa);animation:twGlowC 2.6s infinite;}
  .tw-cryscl .c{position:absolute;bottom:0;background:linear-gradient(115deg,transparent 42%,#ffffff88 42% 48%,transparent 48%),linear-gradient(180deg,#e8fbff,#74ebf5 55%,#1a5a6e);clip-path:polygon(50% 0,80% 16%,88% 68%,68% 100%,32% 100%,12% 68%,20% 16%);}
  .tw-cryscl .c1{left:30%;width:40%;height:100%;}
  .tw-cryscl .c2{left:0;width:30%;height:62%;transform:rotate(-14deg);}
  .tw-cryscl .c3{right:0;width:30%;height:70%;transform:rotate(12deg);}
  .tw-mist{position:absolute;left:50%;top:40%;width:60%;height:30%;transform:translateX(-50%);background:radial-gradient(ellipse,#74ebf522,transparent 70%);filter:blur(10px);animation:twMist 7s ease-in-out infinite;}
  .tw-mist.m2{top:55%;width:45%;animation-delay:2.5s;}
  @keyframes twMist{50%{transform:translateX(-46%) scale(1.08);opacity:.7}}
  /* --- Banque : coffre enrichi, sans lingots/pièces --- */
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
  return ({classic:fr?"⚡ Croissant":"⚡ Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",random:fr?"🎲 Chaos":"🎲 Chaos","calc+":fr?"🧮 Addition":"🧮 Addition","calc-":fr?"🧮 Soustraction":"🧮 Subtraction",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",memory:fr?"🙈 Mémoire":"🙈 Memory",fog:fr?"🌫️ Brouillard":"🌫️ Fog",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t]||t;
}
function twDesc(t){
  const fr=currentLang==="fr";
  return ({
    classic:fr?"Monte les nombres dans l'ordre croissant, le plus vite possible !":"Climb the numbers in ascending order, as fast as you can!",
    reverse:fr?"Cette fois on descend ! Clique du plus grand au plus petit.":"This time we go down! Click from biggest to smallest.",
    random:fr?"La cible change au hasard : reste concentré !":"The target changes randomly: stay focused!",
    "calc+":fr?"Clique sur les DEUX cases dont la SOMME donne la cible.":"Click the TWO tiles whose SUM equals the target.",
    "calc-":fr?"Clique sur les DEUX cases dont la DIFFÉRENCE donne la cible.":"Click the TWO tiles whose DIFFERENCE equals the target.",
    sprint:fr?"Le temps est minuscule : vitesse pure !":"Tiny time limit: pure speed!",
    memory:fr?"Mémorise les nombres... ils seront cachés après 2 secondes !":"Memorize the numbers... they hide after 2 seconds!",
    fog:fr?"Le brouillard fait clignoter les nombres !":"Fog makes numbers blink!",
    nofail:fr?"UNE seule erreur et l'étage est raté. Concentration maximale.":"ONE single mistake and the floor fails. Max focus.",
    boss:fr?"Le Gardien grimpe en même temps que toi. Finis AVANT lui !":"The Guardian climbs with you. Finish BEFORE him!"
  })[t]||"";
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

/* ----- Scènes CSS ----- */
function sceneHTML(c,W,C){
  if(W.scene==="city"){
    let b="";const hs=[55,80,65,95,70,88,60,92];
    const cols=["#00ffff","#ff00ff","#f8b500","#7dff8a"];
    for(let i=0;i<8;i++){
      let wins="";const n=10+(i%3)*4;
      for(let w=0;w<n;w++){
        wins+=`<span class="tw-wl" style="color:${cols[(w+i)%4]};left:${6+((w*23)%84)}%;top:${8+((w*31)%78)}%;animation-duration:${2.5+((w*13)%4)}s;animation-delay:${(w*0.53)%3}s;"></span>`;
      }
      const sign=(i%2===0)?`<span class="tw-sign" style="color:${cols[i%4]};"></span>`:"";
      b+=`<div class="tw-bldg" style="height:${hs[i]}%;">${wins}${sign}${i%3===0?'<span class="tw-ant"></span>':""}</div>`;
    }
    const car=(cls,bottom,dur,delay)=>`<span class="tw-car ${cls}" style="bottom:${bottom};animation-duration:${dur};animation-delay:${delay};"><i class="cb"></i><i class="cc"></i><i class="w1"></i><i class="w2"></i><i class="hl"></i><i class="tl"></i></span>`;
    return `<div class="tw-horizon"></div><div class="tw-city">${b}</div>
      <div class="tw-road"><span class="tw-lane"></span></div><div class="tw-reflect"></div>
      ${car("","2.5%","9s","0s")}${car("r","8%","12s","2s")}${car("s","9%","7s","4.5s")}`;
  }
  if(W.scene==="glacier"){
    let ice="";
    [[6,16],[14,10],[22,18],[31,9],[40,15],[49,8],[58,17],[67,10],[76,16],[85,9],[93,14]].forEach((p,i)=>{
      ice+=`<span class="tw-icicle" style="left:${p[0]}%;height:${p[1]}%;"></span>`;
    });
    const cluster=(x,s,d)=>`<span class="tw-cryscl" style="left:${x}%;bottom:14%;transform:scale(${s});animation-delay:${d};"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i></span>`;
    return `<div class="tw-cavewall"></div><div class="tw-rocktop"></div>${ice}
      <div class="tw-mist m1"></div><div class="tw-mist m2"></div>
      ${cluster(14,1,"0s")}${cluster(68,.85,".8s")}
      <span class="tw-cryscl" style="left:44%;bottom:12%;transform:scale(.45);animation-delay:1.4s;"><i class="c c1"></i><i class="c c2"></i></span>
      <div class="tw-icefloor"></div><div class="tw-rockbot"></div>`;
  }
  if(W.scene==="vault"){
    let bolts="";for(let i=0;i<12;i++){const a=i*Math.PI/6;bolts+=`<span class="tw-vbolt" style="left:${50+44*Math.cos(a)}%;top:${50+44*Math.sin(a)}%;"></span>`;}
    let knobs="";for(let i=0;i<6;i++){const a=i*Math.PI/3;knobs+=`<span class="tw-knob" style="left:${50+38*Math.cos(a)}%;top:${50+38*Math.sin(a)}%;"></span>`;}
    return `<div class="tw-bankwall"></div>
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
      <div class="tw-goldspill"></div>
      <div class="tw-sweep"></div>`;
  }
  return "";
}

/* ----- Carte ----- */
function drawRoom(){
  const wrap=document.getElementById("tw-mapwrap");if(!wrap)return;
  const season=currentSeasonNum();
  const current=Math.min(towerProgress.floor+1,90);
  let totalStars=0;for(const k in towerProgress.stars)totalStars+=towerProgress.stars[k];
  document.getElementById("tower-sub").innerText="É"+Math.min(current,90)+" ⭐"+totalStars;

  const STEP=64,H=90*STEP+110;
  let nodes="",paths="",zones="",ptsByChap={};
  for(let c=1;c<=9;c++){
    const chap=TOWER_CHAPTERS[c-1];
    const zTop=H-STEP*c*10-32,zH=STEP*10;
    if(chap.season>season){
      zones+=`<div class="tw-zone" style="top:${zTop}px;height:${zH}px;background:linear-gradient(180deg,#0a0a14,#050508);"></div>`;
      nodes+=`<div class="tw-gate lock" style="top:${zTop+10}px;right:12px;left:auto;transform:none;">🔒 ${currentLang==="fr"?"Bientôt":"Soon"}</div>`;
      continue;
    }
    const W=TOWER_WORLDS[c],C=TOWER_COLORS[c];
    let parts="";
    for(let i=0;i<7;i++){
      parts+=`<span class="tw-part ${W.part}" style="color:${C.acc};left:${(i*13+c*7)%96}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;"></span>`;
    }
    zones+=`<div class="tw-zone" style="top:${zTop}px;height:${zH}px;background:${W.bg};">${sceneHTML(c,W,C)}${parts}</div>`;
    nodes+=`<div class="tw-gate" style="top:${zTop+10}px;right:12px;left:auto;transform:none;border-color:${C.acc};color:${C.acc};">${chap.icon} ${chap.name}</div>`;
  }
  for(let f=1;f<=90;f++){
    const chap=getTowerChapter(f);
    if(chap.season>season)continue;
    const y=H-STEP*f,x=50+Math.sin(f*0.55)*16;
    (ptsByChap[chap.id]=ptsByChap[chap.id]||[]).push([x,y+23]);
    const won=f<=towerProgress.floor,cur=f===current,boss=f%10===0;
    const st=towerProgress.stars[String(f)];
    const awake=boss?(towerProgress.floor>=f-1):true;
    const clickable=(cur&&awake)||won;
    const C=TOWER_COLORS[chap.id];
    const wonBg=won?`background:radial-gradient(circle at 35% 30%,#ffffffb3,${C.acc} 55%,#000000c9);`:"";
    nodes+=`<div class="tw-node ${won?"won":(cur&&awake?"cur":"lock")} ${boss?"boss":""}" style="left:${x}%;top:${y}px;${wonBg}${boss?`border-color:${C.acc};`:""}" ${clickable?`onclick="mapPlay(${f})"`:""}>
      ${boss?chap.boss:f}
      ${won&&st?`<span class="tw-st">${"⭐".repeat(st)}</span>`:""}
      ${cur?`<span class="tw-ava">🧍</span>`:""}
    </div>`;
  }
  for(const cid in ptsByChap){
    const pts=ptsByChap[cid];
    if(pts.length>1)paths+=`<path d="M${pts.map(p=>p[0]+" "+p[1]).join(" L ")}" fill="none" stroke="${TOWER_COLORS[cid].acc}44" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }
  wrap.innerHTML=`<div class="tw-map" style="height:${H}px;">${zones}
    <div class="tw-col">
      <svg style="position:absolute;inset:0;width:100%;height:100%;z-index:1;" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${paths}</svg>
      ${nodes}
    </div></div>`;
  setTimeout(()=>{const el=wrap.querySelector(".tw-node.cur");if(el)el.scrollIntoView({block:"center",behavior:"smooth"});},200);
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
  const starRule=fr
    ?"💡 ⭐ terminer · ⭐⭐ ≤2 erreurs · ⭐⭐⭐ 0 erreur + moins de "+starTime+"s !"
    :"💡 ⭐ finish · ⭐⭐ ≤2 mistakes · ⭐⭐⭐ 0 mistake + under "+starTime+"s!";
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

/* ================= MOTEUR DES ÉTAGES ================= */
let TW=null;
function startTowerFloor(def){
  if(TW)return;
  let ov=document.getElementById("tower-game");
  if(!ov){ov=document.createElement("div");ov.id="tower-game";ov.className="modal-overlay";
    ov.innerHTML=`<div class="modal-card" style="max-width:380px;width:95%;">
      <div id="tg-hud" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"></div>
      <div id="tg-bar" style="height:8px;background:#200010;border-radius:4px;overflow:hidden;margin-bottom:8px;display:none;"></div>
      <div id="tg-grid" class="tg-grid"></div>
      <div id="tg-msg" style="text-align:center;font-size:10px;color:#aaa;margin-top:8px;"></div></div>`;
    document.body.appendChild(ov);}
  ov.style.display="flex";
  const tgBar=document.getElementById("tg-bar");if(tgBar){tgBar.style.display="none";tgBar.innerHTML="";}
  TW={def,mistakes:0,sel:null,start:Date.now(),time:def.time,ai:0,done:false,gone:{},hidden:false,op:null};
  buildFloor();paintGrid();renderHUD();
  TW.int=setInterval(()=>{
    if(!TW||TW.done)return;
    TW.time--;
    if(TW.def.type==="boss"){TW.ai+=0.8+Math.ceil(TW.def.floor/10)*0.15;
      const p=Math.min(100,TW.ai/TW.total*100);
      const bar=document.getElementById("tg-bar");bar.style.display="block";
      bar.innerHTML=`<div style="width:${p}%;height:100%;background:linear-gradient(90deg,#ff4b2b,#f8b500);"></div>`;
      if(TW.ai>=TW.total)return failFloor();}
    if(TW.time<=0)return failFloor();
    renderHUD();
  },1000);
  if(def.type==="memory")setTimeout(()=>{if(TW&&!TW.done){TW.hidden=true;paintGrid();}},2000);
}
function buildFloor(){
  const d=TW.def,N=d.gridSize;TW.total=N;
  if(d.type==="calc+"||d.type==="calc-"){
    const max=9+Math.ceil(d.floor/10)*3;
    let a=1+Math.floor(Math.random()*max),b=1+Math.floor(Math.random()*max);
    if(d.type==="calc-"){if(a===b)b=(a%max)+1;if(b>a)[a,b]=[b,a];TW.target=a-b;TW.op="-";}
    else{TW.target=a+b;TW.op="+";}
    const vals=[a,b];while(vals.length<N)vals.push(1+Math.floor(Math.random()*max));
    TW.nums=shuffle(vals);
  }else{
    TW.nums=shuffle([...Array(N)].map((_,i)=>i+1));
    TW.remaining=new Set(TW.nums);
    TW.target=d.type==="reverse"?N:1;
    if(d.type==="random")nextTarget();
  }
}
function nextTarget(){
  const t=TW.def.type;
  if(t==="reverse")TW.target--;
  else if(t==="random"){const arr=[...TW.remaining];TW.target=arr[Math.floor(Math.random()*arr.length)];}
  else TW.target++;
}
function paintGrid(){
  const g=document.getElementById("tg-grid"),d=TW.def;
  const cols=d.gridSize<=16?4:(d.gridSize<=20?5:6);
  g.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  g.innerHTML="";
  TW.nums.forEach((v,i)=>{
    const b=document.createElement("button");
    b.className="tg-tile"+(d.type==="fog"?" foggy":"")+(TW.gone[i]?" gone":"");
    b.textContent=TW.hidden?"?":v;
    b.onclick=()=>twClick(i,b);
    g.appendChild(b);
  });
}
function renderHUD(){
  const h=document.getElementById("tg-hud");if(!h||!TW)return;
  const left=TW.op?`<b style="color:#f8b500;font-size:16px;">${TW.target} ${TW.op==="+"?"➕":"➖"}</b>`
    :`<b style="color:#00d2ff;font-size:15px;">CIBLE : ${TW.target}</b>`;
  h.innerHTML=left+`<b style="color:${TW.time<=5?"#ff4b2b":"#fff"};">⏱️ ${TW.time}s</b>`;
  document.getElementById("tg-msg").innerText=TW.def.type==="nofail"?"💎 Une seule erreur = échec !":(TW.def.type==="memory"?"🙈 Mémorise vite !":"");
}
function twClick(idx,el){
  if(!TW||TW.done||TW.gone[idx])return;
  const v=TW.nums[idx];
  if(TW.op){
    if(TW.sel===null){TW.sel=idx;el.classList.add("sel");return;}
    if(TW.sel===idx){el.classList.remove("sel");TW.sel=null;return;}
    const a=TW.nums[TW.sel];
    const ok=TW.op==="+"?(a+v===TW.target):(Math.abs(a-v)===TW.target);
    TW.sel=null;
    if(ok)winFloor();else mistake();
    return;
  }
  if(v===TW.target){
    TW.gone[idx]=true;el.classList.add("gone");
    TW.remaining.delete(v);
    if(SoundEngine.playComboTick)SoundEngine.playComboTick(TW.total-TW.remaining.size);
    if(TW.remaining.size===0)return winFloor();
    nextTarget();renderHUD();
  }else mistake();
}
function mistake(){
  if(!TW||TW.done)return;
  TW.mistakes++;if(SoundEngine.playError)SoundEngine.playError();
  if(TW.def.type==="nofail")failFloor();
}
function winFloor(){
  if(!TW||TW.done)return;
  TW.done=true;clearInterval(TW.int);
  const used=(Date.now()-TW.start)/1000;
  let stars=1;
  if(TW.mistakes===0&&used<=TW.def.time*0.6)stars=3;
  else if(TW.mistakes<=2)stars=2;
  document.getElementById("tower-game").style.display="none";
  socket.emit(TW.def.replay?"tower_floor_replay":"tower_floor_win",{floor:TW.def.floor,stars});
  TW=null;
}
function failFloor(){
  if(!TW||TW.done)return;
  TW.done=true;clearInterval(TW.int);
  document.getElementById("tg-bar").style.display="none";
  document.getElementById("tg-hud").innerHTML="";
  document.getElementById("tg-grid").style.gridTemplateColumns="1fr";
  document.getElementById("tg-grid").innerHTML=`<div style="text-align:center;"><div style="font-size:30px;">💥</div>
    <div style="color:#ff4b2b;font-weight:900;margin:6px 0;">ÉTAGE RATÉ !</div>
    <button class="btn-main btn-blue" onclick="retryFloor()">🔄 Réessayer</button>
    <button class="btn-secondary" onclick="quitFloor()">Quitter</button></div>`;
}
function retryFloor(){const d=TW?TW.def:null;TW=null;if(d)startTowerFloor(d);}
function quitFloor(){TW=null;document.getElementById("tower-game").style.display="none";}

/* ----- Résultat ----- */
socket.on("tower_result",(res)=>{
  if(!res.ok)return;
  towerProgress.floor=Math.max(towerProgress.floor,res.floor);
  towerProgress.stars[String(res.floor)]=Math.max(towerProgress.stars[String(res.floor)]||0,res.stars);
  showTowerWinPopup(res);renderTower();
});
function showTowerWinPopup(res){
  const chap=getTowerChapter(res.floor);
  const obj=res.floor%10===0?chap.boss:chap.objects[((res.floor-1)%10)];
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
