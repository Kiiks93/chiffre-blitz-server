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

/* ----- CSS carte saga (style Candy Crush néon) ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  .tw-scene{position:relative;height:360px;}
  .tw-mapwrap{position:relative;height:100%;overflow-y:auto;background:radial-gradient(ellipse at 50% 0%,#232355,#0a0a1f 70%);border-radius:12px;border:2px solid #2b3a67;}
  .tw-map{position:relative;width:100%;}
  .tw-node{position:absolute;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:#fff;transform:translate(-50%,0);border:3px solid #333;background:#1a1a2e;z-index:2;}
  .tw-node.won{background:radial-gradient(circle at 35% 30%,#ffe9a8,#f8b500 60%,#b06000);border-color:#ffffff44;color:#5a3000;box-shadow:0 3px 0 #00000066;}
  .tw-node.cur{background:radial-gradient(circle at 35% 30%,#a8f0ff,#00d2ff 60%,#0066aa);border-color:#ffffff44;animation:twPulse 1s infinite;cursor:pointer;}
  @keyframes twPulse{50%{transform:translate(-50%,0) scale(1.15)}}
  .tw-node.lock{opacity:.35;}
  .tw-node.boss{width:58px;height:58px;font-size:24px;border-color:#f8b500;}
  .tw-node .tw-st{position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);font-size:8px;color:#f8b500;white-space:nowrap;}
  .tw-ava{position:absolute;top:-27px;left:50%;transform:translateX(-50%);font-size:20px;animation:twBounce2 1.2s infinite;}
  @keyframes twBounce2{50%{transform:translateX(-50%) translateY(-4px)}}
  .tw-gate{position:absolute;left:50%;transform:translateX(-50%);background:#0f051d;border:2px solid #00d2ff;border-radius:10px;padding:4px 12px;font-size:10px;font-weight:900;color:#00d2ff;white-space:nowrap;z-index:3;}
  .tw-gate.lock{border-color:#333;color:#666;}
  .tw-brief{position:absolute;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:6;}
  .tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:14px;max-width:82%;text-align:center;box-shadow:0 0 20px #00d2ff66;}
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
function towerTick(){
  try{const t=SoundEngine.ctx.currentTime;const o=SoundEngine.ctx.createOscillator(),g=SoundEngine.ctx.createGain();
  o.type="square";o.frequency.value=220;g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+.08);
  o.connect(g);g.connect(SoundEngine.ctx.destination);o.start(t);o.stop(t+.09);}catch(e){}
}

/* ----- Ouverture ----- */
function openTower(){
  let m=document.getElementById("modal-tower");
  if(!m){
    m=document.createElement("div");m.id="modal-tower";m.className="modal-overlay";
    m.innerHTML=`<div class="modal-card" style="max-width:430px;width:95%;">
      <h3 style="color:#00d2ff;text-align:center;margin:0 0 4px 0;">🏰 TOUR BLITZ</h3>
      <div id="tower-sub" style="text-align:center;font-size:10px;color:#aaa;margin-bottom:6px;"></div>
      <div class="tw-scene" id="tw-scene"><div class="tw-mapwrap" id="tw-mapwrap"></div></div>
      <div id="tw-actions" style="display:flex;gap:6px;justify-content:center;margin-top:6px;"></div>
      <button class="btn-secondary" onclick="closeTower()">Fermer</button></div>`;
    document.body.appendChild(m);
  }
  m.style.display="flex";
  TW_phase="room";
  socket.emit("get_tower");
  towerDing();
}
function closeTower(){document.getElementById("modal-tower").style.display="none";}

/* ----- Compat (fonctions de l'ancien affichage) ----- */
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

/* ----- LA CARTE ----- */
function drawRoom(){
  const wrap=document.getElementById("tw-mapwrap");if(!wrap)return;
  const season=currentSeasonNum();
  const current=Math.min(towerProgress.floor+1,90);
  let totalStars=0;for(const k in towerProgress.stars)totalStars+=towerProgress.stars[k];
  document.getElementById("tower-sub").innerText=(currentLang==="fr"?"Étage ":"Floor ")+Math.min(current,90)+"/90 — ⭐ "+totalStars;

  const STEP=64,H=90*STEP+110;
  let nodes="",pts=[];
  for(let f=1;f<=90;f++){
    const chap=getTowerChapter(f);
    const y=H-STEP*f;
    const x=50+Math.sin(f*0.55)*30;
    if(chap.season>season){
      if(f===(chap.id-1)*10+1)nodes+=`<div class="tw-gate lock" style="top:${y-8}px;">🔒 ${currentLang==="fr"?"Bientôt":"Soon"}</div>`;
      continue;
    }
    pts.push([x,y+23]);
    const won=f<=towerProgress.floor,cur=f===current,boss=f%10===0;
    const st=towerProgress.stars[String(f)];
    const awake=boss?(towerProgress.floor>=f-1):true;
    const clickable=cur&&awake;
    nodes+=`<div class="tw-node ${won?"won":(clickable?"cur":"lock")} ${boss?"boss":""}" style="left:${x}%;top:${y}px;" ${clickable?`onclick="mapPlay(${f})"`:""}>
      ${boss?chap.boss:f}
      ${won&&st?`<span class="tw-st">${"⭐".repeat(st)}</span>`:""}
      ${cur?`<span class="tw-ava">🧍</span>`:""}
    </div>`;
    if(f%10===1)nodes+=`<div class="tw-gate" style="top:${y-16}px;">${chap.icon} ${chap.name}</div>`;
  }
  let path="";
  if(pts.length>1)path=`<svg style="position:absolute;inset:0;width:100%;height:100%;z-index:1;" viewBox="0 0 100 ${H}" preserveAspectRatio="none"><path d="M${pts.map(p=>p[0]+" "+p[1]).join(" L ")}" fill="none" stroke="#00d2ff26" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  wrap.innerHTML=`<div class="tw-map" style="height:${H}px;">${path}${nodes}</div>`;
  setTimeout(()=>{const el=wrap.querySelector(".tw-node.cur");if(el)el.scrollIntoView({block:"center",behavior:"smooth"});},200);
  document.getElementById("tw-actions").innerHTML=`<span style="font-size:10px;color:#888;">${currentLang==="fr"?"Touche ton étage pour jouer !":"Tap your floor to play!"}</span>`;
}
function mapPlay(f){showBriefing(getFloorDef(f));}

/* ----- Briefing ----- */
function showBriefing(def){
  closeBriefing();
  const b=document.createElement("div");b.id="tw-brief";b.className="tw-brief";
  b.innerHTML=`<div class="tw-brief-card">
    <div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🏰 ${currentLang==="fr"?"ÉTAGE":"FLOOR"} ${def.floor} — ${typeLabel(def.type)}</div>
    <div style="font-size:11px;color:#ddd;line-height:1.5;margin-bottom:10px;">${twDesc(def.type)}</div>
    <button class="btn-main btn-blue" style="width:100%;" onclick="closeBriefing();startTowerFloor(getFloorDef(${def.floor}))">⚡ ${currentLang==="fr"?"LANCER !":"GO!"}</button>
  </div>`;
  document.getElementById("tw-scene").appendChild(b);
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
    <button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove();afterWinTravel()">Continuer ⚡</button></div>`;
  document.body.appendChild(d);
  towerDing();
}
