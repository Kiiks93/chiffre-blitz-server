/* ============================================================
TOUR.JS — TOUR BLITZ (citadelle néon + moteur des étages)
============================================================ */
const TOWER_CHAPTERS = [
  { id:1, season:1, name:"Quartier Néon", icon:"🌆", boss:"🤖", objects:["💡","️","📺","","🎛️","🖥️","📻","️","🌃"] },
  { id:2, season:1, name:"Grottes de Cristal", icon:"🧊", boss:"🗿", objects:["🕯️","🔮","💎","⛏️","🪞","❄️","🫧","🌀","🧊"] },
  { id:3, season:1, name:"Circuit Doré", icon:"⚡", boss:"👾", objects:["⚙️","🔋","","🧲","","🪛","","🔩",""] },
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

/* ----- CSS tour 1ʳ personne ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .tw-scene{position:relative;height:320px;overflow:hidden;border-radius:12px;background:#000;}
  .tw-star{position:absolute;background:#fff;border-radius:50%;animation:twTwinkle 2s infinite;}
  @keyframes twTwinkle{50%{opacity:.15}}
  /* --- Extérieur --- */
  .tw-ext{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,#232355,#050514 70%);}
  .tw-facade{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:62%;height:88%;background:linear-gradient(180deg,#141a33,#0d1226);border:2px solid #2b3a67;border-bottom:none;display:flex;flex-wrap:wrap;align-content:flex-start;gap:6% 8%;padding:10% 14% 20%;}
  .tw-fwin{width:22%;height:7%;background:#05070f;border:1px solid #222c4e;border-radius:2px;}
  .tw-fwin.lit{background:radial-gradient(#ffd76a,#b06000);box-shadow:0 0 8px #f8b50088;}
  .tw-fdoor{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:36%;height:15%;display:flex;border:2px solid #00d2ff;border-bottom:none;border-radius:6px 6px 0 0;overflow:hidden;}
  .tw-fd{width:50%;height:100%;background:linear-gradient(90deg,#2b3a67,#141a33);transition:transform .6s;}
  .tw-fdoor.open .tw-fd:first-child{transform:translateX(-100%);}
  .tw-fdoor.open .tw-fd:last-child{transform:translateX(100%);}
  .tw-sign{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:900;color:#00d2ff;text-shadow:0 0 10px #00d2ff;white-space:nowrap;}
  .tw-walker{position:absolute;left:50%;bottom:1%;transform:translateX(-50%);font-size:28px;transition:all 1.1s ease;z-index:2;}
  .tw-walker.walk{bottom:13%;font-size:15px;}
  /* --- Ascenseur 1ʳᵉ personne --- */
  .tw-elv{position:absolute;inset:0;background:#0a0a14;}
  .tw-elv-ceil{position:absolute;left:0;right:0;top:0;height:10%;background:linear-gradient(180deg,#000,#1a2142);clip-path:polygon(0 0,100% 0,78% 100%,22% 100%);}
  .tw-elv-left{position:absolute;left:0;top:0;bottom:0;width:22%;background:linear-gradient(90deg,#000,#1a2142);clip-path:polygon(0 0,100% 10%,100% 80%,0 100%);}
  .tw-elv-right{position:absolute;right:0;top:0;bottom:0;width:22%;background:linear-gradient(-90deg,#000,#1a2142);clip-path:polygon(100% 0,0 10%,0 80%,100% 100%);}
  .tw-elv-floor{position:absolute;left:0;right:0;bottom:0;height:20%;background:linear-gradient(180deg,#232c4e,#0d1226);clip-path:polygon(22% 0,78% 0,100% 100%,0 100%);}
  .tw-elv-doors{position:absolute;left:26%;right:26%;top:10%;bottom:20%;display:flex;border:3px solid #3a4670;border-radius:6px;overflow:hidden;background:#111;}
  .tw-elv-d{width:50%;height:100%;background:linear-gradient(90deg,#2b3a67,#1a2142 55%,#2b3a67);transition:transform .7s;}
  .tw-elv-doors.open .tw-elv-d:first-child{transform:translateX(-100%);}
  .tw-elv-doors.open .tw-elv-d:last-child{transform:translateX(100%);}
  .tw-elv-ind{position:absolute;left:50%;top:3%;transform:translateX(-50%);background:#000;border:2px solid #f8b500;color:#f8b500;font-weight:900;border-radius:6px;padding:2px 10px;font-size:14px;z-index:2;}
  .tw-elv-panel{position:absolute;right:5%;top:28%;width:15%;background:#10142e;border:2px solid #3a4670;border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px;z-index:2;}
  .tw-elv-btn{border-radius:50%;border:2px solid #444;background:#05070f;color:#888;font-size:9px;font-weight:900;padding:5px 0;cursor:pointer;}
  .tw-elv-btn.cur{border-color:#00d2ff;color:#00d2ff;animation:twFlick 1s steps(2) infinite;}
  .tw-elv-btn.won{border-color:#00ff88;color:#00ff88;}
  .tw-elv-btn.lit{background:#f8b500;color:#000;border-color:#f8b500;box-shadow:0 0 10px #f8b500;}
  .tw-elv-btn.off{opacity:.3;}
  .tw-scene.shake{animation:twShake .4s infinite;}
  @keyframes twShake{25%{transform:translateY(2px)}75%{transform:translateY(-2px)}}
  @keyframes twFlick{50%{opacity:.4}}
  /* --- Pièce 3D --- */
  .tw-room3d{position:absolute;inset:0;}
  .tw-back{position:absolute;left:20%;right:20%;top:10%;bottom:32%;background:linear-gradient(180deg,var(--w1),var(--w2));box-shadow:inset 0 0 40px #000a;}
  .tw-ceil{position:absolute;left:0;right:0;top:0;height:10%;background:linear-gradient(180deg,#000,var(--w1));clip-path:polygon(0 0,100% 0,80% 100%,20% 100%);}
  .tw-floor3d{position:absolute;left:0;right:0;bottom:0;height:32%;background:linear-gradient(180deg,var(--f1),var(--f2));clip-path:polygon(20% 0,80% 0,100% 100%,0 100%);box-shadow:inset 0 12px 30px #0008;}
  .tw-left{position:absolute;left:0;top:0;bottom:0;width:20%;background:linear-gradient(90deg,#000,var(--w2));clip-path:polygon(0 0,100% 10%,100% 68%,0 100%);}
  .tw-right{position:absolute;right:0;top:0;bottom:0;width:20%;background:linear-gradient(-90deg,#000,var(--w2));clip-path:polygon(100% 0,0 10%,0 68%,100% 100%);}
  .tw-window{position:absolute;left:8%;top:12%;width:30%;height:45%;background:radial-gradient(#232355,#050514);border:3px solid var(--acc);border-radius:6px;box-shadow:0 0 12px var(--acc);}
  .tw-moon{position:absolute;right:4px;top:2px;font-size:14px;}
  .tw-obj3d{position:absolute;font-size:26px;filter:drop-shadow(0 4px 4px #000a);}
  .tw-obj3d.a0{animation:twFloat2 2.4s infinite;}
  .tw-obj3d.a1{animation:twGlow2 1.6s infinite;}
  .tw-obj3d.a2{animation:twFlick 1.1s steps(2) infinite;}
  @keyframes twFloat2{50%{transform:translateY(-5px)}}
  @keyframes twGlow2{50%{filter:drop-shadow(0 0 10px var(--acc))}}
  .tw-avatar3d{position:absolute;left:50%;bottom:24%;transform:translateX(-50%);font-size:30px;animation:twBounce 1.4s infinite;}
  @keyframes twBounce{50%{transform:translateX(-50%) translateY(-6px)}}
  .tw-here3d{position:absolute;left:50%;bottom:19%;transform:translateX(-50%);font-size:9px;color:var(--acc);font-weight:900;}
  /* --- Briefing --- */
  .tw-brief{position:absolute;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:6;}
  .tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:14px;max-width:82%;text-align:center;box-shadow:0 0 20px #00d2ff66;}
  /* --- Divers --- */
  .tw-chip{border:1px solid #333;background:#0a0a14;color:#888;border-radius:6px;font-size:10px;font-weight:900;padding:4px 6px;margin:0 1px;}
  .tw-chip.won{border-color:#00ff88;color:#00ff88;}
  .tw-chip.cur{border-color:#00d2ff;color:#00d2ff;animation:twFlick 1s steps(2) infinite;}
  .tw-chip.on{border-color:#f8b500;color:#f8b500;}
  #tower-game .tg-grid{display:grid;gap:6px;}
  .tg-tile{background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff55;border-radius:8px;color:#fff;font-weight:900;font-size:16px;padding:12px 0;cursor:pointer;}
  .tg-tile.sel{border-color:#f8b500;box-shadow:0 0 10px #f8b500;}
  .tg-tile.gone{opacity:0;pointer-events:none;transform:scale(.4);transition:all .3s;}
  .tg-tile.foggy{animation:twFog 2s infinite;}
  @keyframes twFog{50%{opacity:.25}}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  .btn-tower{background:linear-gradient(45deg,#7a00ff,#00d2ff)!important;animation:twBtn 2s infinite;box-shadow:0 0 14px #7a00ff88;}
  @keyframes twBtn{50%{box-shadow:0 0 22px #00d2ffcc}}
  `;
  document.head.appendChild(s);
})();

const TOWER_COLORS={
  1:{w1:"#12203f",w2:"#0a1226",f1:"#1a2142",f2:"#0d1226",acc:"#00d2ff"},
  2:{w1:"#0a2a3a",w2:"#04141d",f1:"#0f3a4a",f2:"#062028",acc:"#74ebf5"},
  3:{w1:"#2b1a00",w2:"#160d00",f1:"#3a2a05",f2:"#1c1400",acc:"#f8b500"},
  4:{w1:"#2a0a33",w2:"#12041a",f1:"#3a0f45",f2:"#1a0620",acc:"#ff8a00"},
  5:{w1:"#1a2230",w2:"#0a0d14",f1:"#242e3e",f2:"#10141c",acc:"#8a9bb0"},
  6:{w1:"#330a12",w2:"#18040a",f1:"#45101c",f2:"#20060c",acc:"#ff4b2b"},
  7:{w1:"#330a20",w2:"#180410",f1:"#45102c",f2:"#200614",acc:"#ff6fa5"},
  8:{w1:"#0a3318",w2:"#04180b",f1:"#0f4522",f2:"#062010",acc:"#2ecc71"},
  9:{w1:"#330a0a",w2:"#180404",f1:"#451010",f2:"#200606",acc:"#ff416c"}
};
const OBJ_SPOTS=[[30,58],[62,58],[46,64],[26,70],[68,70],[38,74],[56,74],[46,52],[70,62]];
let viewChap=0,viewFloorOverride=null,TW_phase="idle";

function typeLabel(t){
  const fr=currentLang==="fr";
  return ({classic:fr?"⚡ Croissant":"⚡ Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",random:fr?"🎲 Chaos":"🎲 Chaos","calc+":fr?"🧮 Addition":"🧮 Addition","calc-":fr?"🧮 Soustraction":"🧮 Subtraction",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",memory:fr?"🙈 Mémoire":"🙈 Memory",fog:fr?"🌫️ Brouillard":"🌫️ Fog",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t]||t;
}
function twDesc(t){
  const fr=currentLang==="fr";
  return ({
    classic:fr?"Monte les nombres dans l'ordre croissant, le plus vite possible !":"Climb the numbers in ascending order, as fast as you can!",
    reverse:fr?"Cette fois on descend ! Clique du plus grand au plus petit.":"This time we go down! Click from biggest to smallest.",
    random:fr?"La cible change au hasard à chaque fois : reste concentré !":"The target changes randomly each time: stay focused!",
    "calc+":fr?"Clique sur les DEUX cases dont la SOMME donne la cible.":"Click the TWO tiles whose SUM equals the target.",
    "calc-":fr?"Clique sur les DEUX cases dont la DIFFÉRENCE donne la cible.":"Click the TWO tiles whose DIFFERENCE equals the target.",
    sprint:fr?"Le temps est minuscule : vitesse pure !":"Tiny time limit: pure speed!",
    memory:fr?"Mémorise les nombres... ils seront cachés après 2 secondes !":"Memorize the numbers... they hide after 2 seconds!",
    fog:fr?"Le brouillard fait clignoter les nombres : accroche-toi !":"Fog makes numbers blink: hold on!",
    nofail:fr?"UNE seule erreur et l'étage est raté. Concentration maximale.":"ONE single mistake and the floor fails. Max focus.",
    boss:fr?"Le Gardien grimpe en même temps que toi. Finis AVANT lui !":"The Guardian climbs with you. Finish BEFORE him!"
  })[t]||"";
}

/* ----- Sons ----- */
function towerDing(){
  try{SoundEngine.init();const t=SoundEngine.ctx.currentTime;
  [880,1320].forEach((f,i)=>{const o=SoundEngine.ctx.createOscillator(),g=SoundEngine.ctx.createGain();
  o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.08,t+i*.12);g.gain.exponentialRampToValueAtTime(.0001,t+i*.12+.25);
  o.connect(g);g.connect(SoundEngine.ctx.destination);o.start(t+i*.12);o.stop(t+i*.12+.25);});}catch(e){}
}
function towerTick(){
  try{const t=SoundEngine.ctx.currentTime;const o=SoundEngine.ctx.createOscillator(),g=SoundEngine.ctx.createGain();
  o.type="square";o.frequency.value=220;g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+.08);
  o.connect(g);g.connect(SoundEngine.ctx.destination);o.start(t);o.stop(t+.09);}catch(e){}
}
function towerRumble(ms){
  try{const t=SoundEngine.ctx.currentTime;const o=SoundEngine.ctx.createOscillator(),g=SoundEngine.ctx.createGain();
  o.type="sawtooth";o.frequency.value=55;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+ms/1000);
  o.connect(g);g.connect(SoundEngine.ctx.destination);o.start(t);o.stop(t+ms/1000);}catch(e){}
}

/* ----- Ouverture : extérieur puis ascenseur ----- */
function openTower(){
  let m=document.getElementById("modal-tower");
  if(!m){
    m=document.createElement("div");m.id="modal-tower";m.className="modal-overlay";
    m.innerHTML=`<div class="modal-card" style="max-width:430px;width:95%;">
      <h3 style="color:#00d2ff;text-align:center;margin:0 0 4px 0;">🏰 TOUR BLITZ</h3>
      <div id="tower-sub" style="text-align:center;font-size:10px;color:#aaa;margin-bottom:4px;"></div>
      <div id="tw-chapters" style="text-align:center;margin-bottom:6px;"></div>
      <div class="tw-scene" id="tw-scene"></div>
      <div id="tw-chips" style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;margin:8px 0;"></div>
      <div id="tw-actions" style="display:flex;gap:6px;justify-content:center;margin-bottom:6px;"></div>
      <button class="btn-secondary" onclick="closeTower()">Fermer</button></div>`;
    document.body.appendChild(m);
  }
  m.style.display="flex";
  viewChap=0;viewFloorOverride=null;TW_phase="ext";
  socket.emit("get_tower");
  playExterior();
}
function closeTower(){document.getElementById("modal-tower").style.display="none";}

function playExterior(){
  const box=document.getElementById("tw-scene");if(!box)return;
  let wins="";for(let i=0;i<12;i++)wins+=`<div class="tw-fwin ${Math.random()<.5?"lit":""}"></div>`;
  box.innerHTML=`<div class="tw-ext">
    <div class="tw-facade"><div class="tw-sign">🏰 TOUR BLITZ</div>${wins}
      <div class="tw-fdoor" id="tw-fdoor"><div class="tw-fd"></div><div class="tw-fd"></div></div>
    </div>
    <span class="tw-walker" id="tw-walker">🧍</span></div>`;
  for(let i=0;i<30;i++){const st=document.createElement("span");st.className="tw-star";const sz=Math.random()*2+1;
    st.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*40}%;animation-delay:${Math.random()*2}s;`;box.appendChild(st);}
  setTimeout(()=>{const w=document.getElementById("tw-walker");if(w)w.classList.add("walk");},150);
  setTimeout(()=>{const d=document.getElementById("tw-fdoor");if(d)d.classList.add("open");towerTick();},1300);
  setTimeout(()=>{showElevator();},2000);
}

/* ----- Ascenseur 1ʳ personne ----- */
function showElevator(){
  TW_phase="elv";
  const box=document.getElementById("tw-scene");if(!box)return;
  const current=Math.min(towerProgress.floor+1,90);
  viewChap=getTowerChapter(current).id;
  box.innerHTML=`<div class="tw-elv">
    <div class="tw-elv-ceil"></div><div class="tw-elv-left"></div><div class="tw-elv-right"></div><div class="tw-elv-floor"></div>
    <div class="tw-elv-ind" id="tw-elv-ind">É${Math.max(1,towerProgress.floor)}</div>
    <div class="tw-elv-doors" id="tw-elv-doors"><div class="tw-elv-d"></div><div class="tw-elv-d"></div></div>
    <div class="tw-elv-panel" id="tw-elv-panel"></div>
  </div>`;
  drawPanel();drawChips();
  document.getElementById("tower-sub").innerText=currentLang==="fr"?"🛗 Appuie sur le bouton de ton étage !":"🛗 Press your floor button!";
}
function drawPanel(){
  const p=document.getElementById("tw-elv-panel");if(!p)return;
  const current=Math.min(towerProgress.floor+1,90);
  let html="";
  for(let f=viewChap*10;f>=(viewChap-1)*10+1;f--){
    const won=f<=towerProgress.floor,cur=f===current;
    html+=`<button class="tw-elv-btn ${won?"won":(cur?"cur":"off")}" ${cur?`onclick="pressFloor(${f})"`:(won?`onclick="viewWonFloor(${f})"`:"disabled")}>${f%10===0?"👑":f}</button>`;
  }
  p.innerHTML=html;
}
function pressFloor(f){
  const btns=document.querySelectorAll(".tw-elv-btn");btns.forEach(b=>b.classList.remove("cur"));
  if(event&&event.currentTarget)event.currentTarget.classList.add("lit");
  towerTick();
  setTimeout(()=>rideTo(f),400);
}
function viewWonFloor(f){
  viewChap=getTowerChapter(f).id;viewFloorOverride=f;TW_phase="room";
  drawRoom();drawChips();
}
function rideTo(f){
  const box=document.getElementById("tw-scene");
  const doors=document.getElementById("tw-elv-doors");
  const ind=document.getElementById("tw-elv-ind");
  if(doors)doors.classList.remove("open");
  setTimeout(()=>{
    box.classList.add("shake");towerRumble(1200);
    let from=Math.max(1,f-1);ind.innerText="É"+from;
    const iv=setInterval(()=>{
      from++;
      if(from>f){clearInterval(iv);box.classList.remove("shake");
        if(doors)doors.classList.add("open");towerDing();
        setTimeout(()=>arriveFloor(f),700);
        return;}
      ind.innerText="É"+from;towerTick();
    },180);
  },500);
}
function arriveFloor(f){
  TW_phase="room";viewFloorOverride=null;
  viewChap=getTowerChapter(f).id;
  drawRoom();drawChips();
  const current=Math.min(towerProgress.floor+1,90);
  if(f===current)showBriefing(getFloorDef(f));
}

/* ----- Pièce 3D ----- */
socket.on("tower_data",(d)=>{
  towerProgress={floor:d.floor||0,stars:d.stars||{}};
  if(TW_phase==="elv")drawPanel();
  else if(TW_phase==="room")drawRoom();
  drawChips();
});
function renderTower(){
  const current=Math.min(towerProgress.floor+1,90);
  if(TW_phase==="room"||TW_phase==="idle"){TW_phase="elv";showElevator();}
  else{drawPanel();drawChips();}
}
function drawRoom(){
  const box=document.getElementById("tw-scene");if(!box)return;
  const current=Math.min(towerProgress.floor+1,90);
  const chap=TOWER_CHAPTERS[viewChap-1];
  const C=TOWER_COLORS[viewChap];
  const floorShown=viewFloorOverride||(viewChap===getTowerChapter(current).id?current:viewChap*10);
  const inChap=((floorShown-1)%10)+1;
  const isBoss=inChap===10;
  const wonInChap=Math.min(9,Math.max(0,towerProgress.floor-(viewChap-1)*10));
  const count=isBoss?wonInChap:Math.max(0,Math.min(wonInChap,inChap-1));
  let objs="";
  for(let i=0;i<count;i++){const s=OBJ_SPOTS[i];objs+=`<span class="tw-obj3d a${i%3}" style="left:${s[0]}%;top:${s[1]}%;">${chap.objects[i]}</span>`;}
  const isCurrent=floorShown===current;
  let center="";
  if(isBoss){
    const awake=wonInChap>=9;
    center=`<div style="position:absolute;left:50%;top:28%;transform:translateX(-50%);font-size:44px;${awake?"filter:drop-shadow(0 0 14px #ff4b2b);":"opacity:.5;"}">${chap.boss}</div>
    <div style="position:absolute;left:50%;top:13%;transform:translateX(-50%);font-size:9px;font-weight:900;color:${awake?"#ff4b2b":"#888"};">${awake?"⚠️ GARDIEN RÉVEILLÉ":"😴 "+wonInChap+"/9 "+(currentLang==="fr"?"objets":"objects")}</div>`;
  }else if(isCurrent){
    center=`<span class="tw-avatar3d">🧍</span><span class="tw-here3d">▶ ${currentLang==="fr"?"TU ES ICI":"YOU ARE HERE"}</span>`;
  }
  box.innerHTML=`<div class="tw-room3d" style="--w1:${C.w1};--w2:${C.w2};--f1:${C.f1};--f2:${C.f2};--acc:${C.acc};">
    <div class="tw-ceil"></div><div class="tw-left"></div><div class="tw-right"></div>
    <div class="tw-back"><div class="tw-window"><span class="tw-moon">🌙</span></div></div>
    <div class="tw-floor3d"></div>
    ${objs}${center}
  </div>`;
  document.getElementById("tower-sub").innerText=chap.icon+" "+chap.name+" — "+(currentLang==="fr"?"Étage":"Floor")+" "+floorShown+" / 90";
  const act=document.getElementById("tw-actions");
  if(isCurrent&&!isBoss)act.innerHTML=`<button class="btn-main btn-blue" onclick="startTowerFloor(getFloorDef(${current}))">▶ ${typeLabel(getFloorDef(current).type)}</button>`;
  else if(isCurrent&&isBoss&&wonInChap>=9)act.innerHTML=`<button class="btn-main" style="background:linear-gradient(45deg,#ff4b2b,#f8b500);color:#fff;font-weight:900;" onclick="startTowerFloor(getFloorDef(${current}))">⚔️ ${currentLang==="fr"?"DÉFIER LE GARDIEN":"CHALLENGE THE GUARDIAN"}</button>`;
  else if(!isCurrent)act.innerHTML=`<span style="font-size:10px;color:#888;">🔒 ${currentLang==="fr"?"Gagne les étages précédents !":"Clear the previous floors!"}</span>`;
  else act.innerHTML=`<button class="btn-secondary" onclick="showElevator()">🛗 ${currentLang==="fr"?"Ascenseur":"Elevator"}</button>`;
  drawChips();
}
function showBriefing(def){
  closeBriefing();
  const b=document.createElement("div");b.id="tw-brief";b.className="tw-brief";
  b.innerHTML=`<div class="tw-brief-card">
    <div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🛗 ${currentLang==="fr"?"ÉTAGE":"FLOOR"} ${def.floor} — ${typeLabel(def.type)}</div>
    <div style="font-size:11px;color:#ddd;line-height:1.5;margin-bottom:10px;">${twDesc(def.type)}</div>
    <button class="btn-main btn-blue" style="width:100%;margin-bottom:6px;" onclick="closeBriefing();startTowerFloor(getFloorDef(${def.floor}))">⚡ ${currentLang==="fr"?"LANCER !":"GO!"}</button>
    <button class="btn-secondary" style="width:100%;" onclick="closeBriefing()">👀 ${currentLang==="fr"?"Voir la pièce":"See the room"}</button>
  </div>`;
  document.getElementById("tw-scene").appendChild(b);
}
function closeBriefing(){const b=document.getElementById("tw-brief");if(b)b.remove();}
function afterWinTravel(){TW_phase="elv";showElevator();}

function drawChips(){
  const season=currentSeasonNum();
  let tabs="";
  TOWER_CHAPTERS.forEach(c=>{if(c.season<=season)tabs+=`<button class="tw-chip ${viewChap===c.id?"on":""}" onclick="viewChap=${c.id};viewFloorOverride=null;drawRoom();">${c.icon}</button>`;});
  const tc=document.getElementById("tw-chapters");if(tc)tc.innerHTML=tabs;
  const box=document.getElementById("tw-chips");if(!box)return;
  let html="";
  for(let f=(viewChap-1)*10+1;f<=viewChap*10;f++){
    const won=f<=towerProgress.floor,cur=f===towerProgress.floor+1;
    const st=towerProgress.stars[String(f)];
    html+=`<span class="tw-chip ${won?"won":(cur?"cur":"")}">${f%10===0?"👑":f}${won&&st?"<i style='font-size:7px;color:#f8b500;font-style:normal;'>"+"★".repeat(st)+"</i>":""}</span>`;
  }
  box.innerHTML=html;
}
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
  TW.done=true;clearInterval(TW.int);
  const used=(Date.now()-TW.start)/1000;
  let stars=1;
  if(TW.mistakes===0&&used<=TW.def.time*0.6)stars=3;
  else if(TW.mistakes<=2)stars=2;
  document.getElementById("tower-game").style.display="none";
  socket.emit("tower_floor_win",{floor:TW.def.floor,stars});
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
  towerProgress.floor=res.floor;
  towerProgress.stars[String(res.floor)]=res.stars;
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
    <div style="font-size:12px;color:#aaa;margin-bottom:10px;">${currentLang==="fr"?"Nouvel objet placé dans la pièce :":"New object placed in the room:"} <span style="font-size:24px;">${obj}</span></div>
    ${res.reward?`<div style="font-size:12px;color:#00d2ff;font-weight:bold;margin-bottom:10px;">🎁 CHAPITRE TERMINÉ : ${res.reward} débloqué !</div>`:""}
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove()">Continuer ⚡</button></div>`;
  document.body.appendChild(d);
  towerDing();
}
