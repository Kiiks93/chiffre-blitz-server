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

/* ----- CSS citadelle néon ----- */
(function(){
  const s=document.createElement("style");
  s.textContent=`
  #tower-rooms .tw-sky{position:relative;max-height:70vh;overflow-y:auto;background:radial-gradient(ellipse at 50% -20%,#232355 0%,#0a0a1f 60%);padding:26px 0 14px;border-radius:10px;}
  .tw-star{position:absolute;background:#fff;border-radius:50%;animation:twTwinkle 2s infinite;}
  @keyframes twTwinkle{50%{opacity:.15}}
  .tw-tower{position:relative;width:min(300px,88%);margin:0 auto;}
  .tw-crenel{height:14px;background:repeating-linear-gradient(90deg,#2b3a67 0 18px,transparent 18px 30px);}
  .tw-flag{position:absolute;top:-24px;left:50%;transform:translateX(-50%);font-size:20px;animation:twFloat 2s infinite;}
  .tw-floor{display:flex;align-items:center;gap:6px;background:linear-gradient(180deg,#1a2142,#10142e);border:2px solid #2b3a67;border-bottom:none;padding:7px 8px;min-height:52px;}
  .tw-floor:last-child{border-bottom:2px solid #2b3a67;}
  .tw-plaque{font-size:10px;font-weight:900;color:#00d2ff;background:#05070f;border:1px solid #00d2ff;border-radius:4px;padding:2px 5px;}
  .tw-win{flex:1;height:36px;border-radius:8px 8px 0 0;background:#05070f;border:2px solid #222c4e;display:flex;align-items:center;justify-content:center;font-size:16px;}
  .tw-win.lit{background:radial-gradient(circle at 50% 60%,#ffd76a,#b06000);border-color:#f8b500;box-shadow:0 0 10px #f8b50066;}
  .tw-win.now{border-color:#00d2ff;box-shadow:0 0 12px #00d2ff;animation:twFlick 1s steps(2) infinite;}
  .tw-win.dark{opacity:.45;}
  .tw-gate{min-height:88px;flex-direction:column;gap:3px;background:linear-gradient(180deg,#241a3e,#120b26);border-color:#f8b50055;}
  .tw-objslot{display:inline-block;margin:0 2px;font-size:14px;}
  .tw-objslot.empty{opacity:.25;filter:grayscale(1);}
  .tw-lockblk{margin:10px auto;width:min(300px,88%);border:2px dashed #333;border-radius:8px;padding:10px;text-align:center;color:#666;font-size:11px;background:#0a0a14;}
  .tw-play{margin-left:auto;background:linear-gradient(45deg,#00d2ff,#0066ff);border:none;color:#fff;font-weight:900;border-radius:8px;padding:8px 12px;font-size:12px;}
  .btn-tower{background:linear-gradient(45deg,#7a00ff,#00d2ff)!important;animation:twBtn 2s infinite;box-shadow:0 0 14px #7a00ff88;}
  @keyframes twBtn{50%{box-shadow:0 0 22px #00d2ffcc}}
  @keyframes twFloat{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-5px)}}
  @keyframes twFlick{50%{opacity:.4}}
  .tw-obj{animation:twGlow 1.6s infinite;}
  @keyframes twGlow{50%{filter:drop-shadow(0 0 8px #00d2ff)}}
  .tw-doors{position:fixed;inset:0;z-index:10002;pointer-events:none;display:flex;}
  .tw-door{width:50%;height:100%;background:linear-gradient(180deg,#0f1a2e,#000);transition:transform .8s ease;border-right:2px solid #00d2ff;}
  .tw-door.r{border-right:none;border-left:2px solid #00d2ff;}
  .tw-doors.open .tw-door{transform:translateX(-100%);}
  .tw-doors.open .tw-door.r{transform:translateX(100%);}
  #tower-game .tg-grid{display:grid;gap:6px;}
  .tg-tile{background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff55;border-radius:8px;color:#fff;font-weight:900;font-size:16px;padding:12px 0;cursor:pointer;}
  .tg-tile.sel{border-color:#f8b500;box-shadow:0 0 10px #f8b500;}
  .tg-tile.gone{opacity:0;pointer-events:none;transform:scale(.4);transition:all .3s;}
  .tg-tile.foggy{animation:twFog 2s infinite;}
  @keyframes twFog{50%{opacity:.25}}
  .tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
  .tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
  @keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
  `;
  document.head.appendChild(s);
})();

/* ----- Ouverture ----- */
function openTower(){
  let m=document.getElementById("modal-tower");
  if(!m){
    m=document.createElement("div");m.id="modal-tower";m.className="modal-overlay";
    m.innerHTML=`<div class="modal-card" style="max-width:420px;width:95%;">
      <h3 style="color:#00d2ff;text-align:center;margin:0 0 4px 0;">🏰 TOUR BLITZ</h3>
      <div id="tower-sub" style="text-align:center;font-size:10px;color:#aaa;margin-bottom:6px;"></div>
      <div id="tower-rooms"></div>
      <button class="btn-secondary" onclick="closeTower()">Fermer</button></div>`;
    document.body.appendChild(m);
  }
  m.style.display="flex";
  socket.emit("get_tower");
  const doors=document.createElement("div");doors.className="tw-doors";
  doors.innerHTML=`<div class="tw-door"></div><div class="tw-door r"></div>`;
  document.body.appendChild(doors);
  setTimeout(()=>doors.classList.add("open"),150);
  setTimeout(()=>doors.remove(),1100);
  towerDing();
}
function closeTower(){document.getElementById("modal-tower").style.display="none";}
function towerDing(){
  try{SoundEngine.init();const t=SoundEngine.ctx.currentTime;
  [880,1320].forEach((f,i)=>{const o=SoundEngine.ctx.createOscillator(),g=SoundEngine.ctx.createGain();
  o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.08,t+i*.12);g.gain.exponentialRampToValueAtTime(.0001,t+i*.12+.25);
  o.connect(g);g.connect(SoundEngine.ctx.destination);o.start(t+i*.12);o.stop(t+i*.12+.25);});}catch(e){}
}

/* ----- Rendu citadelle ----- */
socket.on("tower_data",(d)=>{towerProgress={floor:d.floor||0,stars:d.stars||{}};renderTower();});
function renderTower(){
  const box=document.getElementById("tower-rooms");if(!box)return;
  const season=currentSeasonNum(),current=towerProgress.floor+1;
  document.getElementById("tower-sub").innerText=(currentLang==="fr"?"Étage actuel : ":"Current floor: ")+Math.min(current,90)+" / 90";
  let html='<div class="tw-sky" id="tw-sky"><div class="tw-tower"><div class="tw-flag">🚩</div><div class="tw-crenel"></div>';
  for(let f=90;f>=1;f--){
    const chap=getTowerChapter(f);
    if(chap.season>season){
      if(f===chap.id*10)html+=`</div><div class="tw-lockblk">🔒 ${currentLang==="fr"?"Étages "+((chap.id-1)*10+1)+"-"+(chap.id*10)+" — Bientôt":"Floors "+((chap.id-1)*10+1)+"-"+(chap.id*10)+" — Soon"}</div><div class="tw-tower"><div class="tw-crenel"></div>`;
      continue;
    }
    const inChap=((f-1)%10)+1;
    if(inChap===10){
      const wonInChap=Math.min(9,Math.max(0,towerProgress.floor-(chap.id-1)*10));
      const awake=wonInChap>=9,isCur=f===current;
      let slots="";for(let i=0;i<9;i++)slots+=`<span class="tw-objslot ${i<wonInChap?"":"empty"}">${i<wonInChap?chap.objects[i]:"•"}</span>`;
      html+=`<div class="tw-floor tw-gate" id="tw-room-${f}"><div class="tw-plaque">É${f}</div><div style="text-align:center;flex:1;">${slots}<div style="font-size:28px;${awake?"filter:drop-shadow(0 0 10px #ff4b2b);":"opacity:.5;"}">${chap.boss}</div><div style="font-size:9px;font-weight:bold;color:${awake?"#ff4b2b":"#888"};">${awake?"⚠️ GARDIEN RÉVEILLÉ":"😴 "+wonInChap+"/9"}</div></div>${isCur&&awake?`<button class="tw-play" onclick="startTowerFloor(getFloorDef(${f}))">⚔️</button>`:""}</div>`;
    }else{
      const won=f<=towerProgress.floor,isCur=f===current;
      const mid=won?`<span class="tw-obj">${chap.objects[inChap-1]}</span>`:(isCur?"🧍":"");
      html+=`<div class="tw-floor" id="tw-room-${f}"><div class="tw-plaque">É${f}</div><div class="tw-win ${won?"lit":"dark"}"></div><div class="tw-win ${won?"lit":(isCur?"now":"dark")}">${mid}</div><div class="tw-win ${won?"lit":"dark"}"></div>${isCur?`<button class="tw-play" onclick="startTowerFloor(getFloorDef(${f}))">▶</button>`:""}</div>`;
    }
  }
  html+="</div></div>";
  box.innerHTML=html;
  const sky=document.getElementById("tw-sky");
  for(let i=0;i<40;i++){const st=document.createElement("span");st.className="tw-star";const sz=Math.random()*2+1;
  st.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*2}s;`;sky.appendChild(st);}
  setTimeout(()=>{const el=document.getElementById("tw-room-"+Math.min(current,90));if(el)el.scrollIntoView({block:"center",behavior:"smooth"});},300);
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
