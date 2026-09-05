/* ============================================================
TOUR3D.JS — Three.js (fallback CSS automatique)
============================================================ */
(function(){
if(typeof THREE==="undefined")return;
if(navigator.deviceMemory&&navigator.deviceMemory<=2)return;
let OK=false;try{const t=new THREE.WebGLRenderer();OK=true;t.dispose();}catch(e){}
if(!OK)return;

let R=null;
function ease(k){return k*k*(3-2*k);}
function emojiTex(e){
  const c=document.createElement("canvas");c.width=c.height=128;
  const x=c.getContext("2d");x.font="100px serif";x.textAlign="center";x.textBaseline="middle";
  x.fillText(e,64,68);return new THREE.CanvasTexture(c);
}
function starTex(){
  const c=document.createElement("canvas");c.width=c.height=128;
  const x=c.getContext("2d");x.fillStyle="#050514";x.fillRect(0,0,128,128);
  for(let i=0;i<40;i++){x.fillStyle="rgba(255,255,255,"+(Math.random()*.8+.2)+")";x.fillRect(Math.random()*128,Math.random()*128,2,2);}
  x.fillStyle="#ffe9a8";x.beginPath();x.arc(96,30,12,0,7);x.fill();
  return new THREE.CanvasTexture(c);
}
function tween(dur,fn,cb){R.anims.push({t:0,dur,fn,cb});}
function loop(){
  if(!R||!R.running)return;
  requestAnimationFrame(loop);
  const dt=Math.min(.05,R.clock.getDelta());
  const t=R.clock.elapsedTime;
  for(let i=R.anims.length-1;i>=0;i--){const a=R.anims[i];a.t+=dt;const k=Math.min(1,a.t/a.dur);a.fn(k);if(k>=1){R.anims.splice(i,1);if(a.cb)a.cb();}}
  if(R.bobs)R.bobs.forEach((b,i)=>{b.sp.position.y=b.base+Math.sin(t*2+i)*.05;});
  if(R.sway)R.camera.position.x=Math.sin(t*.5)*.06;
  R.renderer.render(R.scene,R.camera);
}
function ensure(box){
  if(R){R.renderer.setSize(box.clientWidth,box.clientHeight);return;}
  R={anims:[],bobs:[],clock:new THREE.Clock()};
  R.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  R.renderer.setSize(box.clientWidth,box.clientHeight);
  R.renderer.domElement.style.cssText="position:absolute;inset:0;width:100%;height:100%;";
  R.scene=new THREE.Scene();
  R.camera=new THREE.PerspectiveCamera(70,box.clientWidth/box.clientHeight,.1,100);
  box.prepend(R.renderer.domElement);
  R.running=true;loop();
}
function clearScene(){while(R.scene.children.length)R.scene.remove(R.scene.children[0]);R.anims=[];R.bobs=[];}
function fade(box,out,cb){
  let f=box.querySelector(".tw3d-fade");
  if(!f){f=document.createElement("div");f.className="tw3d-fade";f.style.cssText="position:absolute;inset:0;background:#000;opacity:0;transition:opacity .35s;pointer-events:none;z-index:4;";box.appendChild(f);}
  f.style.opacity=out?"1":"0";
  setTimeout(function(){if(cb)cb();},380);
}

/* ----- Scènes ----- */
function stageExterior(){
  clearScene();R.sway=false;
  const tower=new THREE.Mesh(new THREE.BoxGeometry(3,7,3),new THREE.MeshBasicMaterial({color:0x141a33}));
  tower.position.y=3.5;R.scene.add(tower);
  for(let i=0;i<24;i++){
    const w=new THREE.Mesh(new THREE.PlaneGeometry(.35,.45),new THREE.MeshBasicMaterial({color:Math.random()<.5?0xffd76a:0x05070f}));
    w.position.set(-1+(i%3),1+Math.floor(i/3)*.9,1.51);R.scene.add(w);
  }
  R.doorL=new THREE.Mesh(new THREE.PlaneGeometry(.75,1.4),new THREE.MeshBasicMaterial({color:0x2b3a67}));
  R.doorL.position.set(-.38,.7,1.52);R.scene.add(R.doorL);
  R.doorR=R.doorL.clone();R.doorR.position.x=.38;R.scene.add(R.doorR);
  R.camera.position.set(0,1.6,9);R.camera.lookAt(0,2,0);
}
function stageElevator(){
  clearScene();R.sway=true;
  const room=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.6,2),new THREE.MeshBasicMaterial({color:0x1a2142,side:THREE.BackSide}));
  room.position.y=1.3;R.scene.add(room);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2),new THREE.MeshBasicMaterial({color:0x0d1226}));
  fl.rotation.x=-Math.PI/2;fl.position.y=.01;R.scene.add(fl);
  const li=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.5),new THREE.MeshBasicMaterial({color:0xfff2c0}));
  li.rotation.x=Math.PI/2;li.position.y=2.58;R.scene.add(li);
  R.doorL=new THREE.Mesh(new THREE.PlaneGeometry(.8,2.2),new THREE.MeshBasicMaterial({color:0x2b3a67}));
  R.doorL.position.set(-.4,1.2,-.99);R.scene.add(R.doorL);
  R.doorR=R.doorL.clone();R.doorR.position.x=.4;R.scene.add(R.doorR);
  R.camera.position.set(0,1.5,.7);R.camera.lookAt(0,1.4,-1);
}
function stageRoom(chapId,count,isBoss,awake,isCurrent){
  clearScene();R.sway=true;
  const C=TOWER_COLORS[chapId],chap=TOWER_CHAPTERS[chapId-1];
  const room=new THREE.Mesh(new THREE.BoxGeometry(4,2.8,4),new THREE.MeshBasicMaterial({color:new THREE.Color(C.w2),side:THREE.BackSide}));
  room.position.y=1.4;R.scene.add(room);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshBasicMaterial({color:new THREE.Color(C.f1)}));
  fl.rotation.x=-Math.PI/2;fl.position.y=.02;R.scene.add(fl);
  const wf=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1),new THREE.MeshBasicMaterial({color:new THREE.Color(C.acc)}));
  wf.position.set(-1,1.6,-1.98);R.scene.add(wf);
  const win=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.85),new THREE.MeshBasicMaterial({map:starTex()}));
  win.position.set(-1,1.6,-1.97);R.scene.add(win);
  const SPOTS=[[-1.2,.5,-.5],[1.2,.5,-.5],[0,.5,-1],[-1.5,.4,.5],[1.5,.4,.5],[-.6,.35,1],[.6,.35,1],[0,1.2,-1.5],[1.3,.9,-1.2]];
  for(let i=0;i<count;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(chap.objects[i]),transparent:true}));
    s.scale.set(.55,.55,1);s.position.set(SPOTS[i][0],SPOTS[i][1],SPOTS[i][2]);
    R.scene.add(s);R.bobs.push({sp:s,base:SPOTS[i][1]});
  }
  if(isBoss){
    const g=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(chap.boss),transparent:true,opacity:awake?1:.5}));
    g.scale.set(1.4,1.4,1);g.position.set(0,1.2,-1.4);R.scene.add(g);R.bobs.push({sp:g,base:1.2});
  }
  if(isCurrent){
    const a=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex("🧍"),transparent:true}));
    a.scale.set(.6,.6,1);a.position.set(0,.45,.3);R.scene.add(a);R.bobs.push({sp:a,base:.45});
  }
  R.camera.position.set(0,1.5,1.6);R.camera.lookAt(0,1.2,-1);
}

/* ----- Flux ----- */
function openTower3D(){
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
  const box=document.getElementById("tw-scene");
  box.innerHTML="";
  ensure(box);stageExterior();
  tween(1.4,k=>{R.camera.position.z=9-6.5*ease(k);});
  setTimeout(()=>{tween(.6,k=>{R.doorL.position.x=-.38-.8*k;R.doorR.position.x=.38+.8*k;});towerTick();},1500);
  setTimeout(()=>{fade(box,true,()=>{showElevator3D();fade(box,false);});},2400);
  drawChips();
}
function closeTower3D(){document.getElementById("modal-tower").style.display="none";if(R)R.running=false;}
function showElevator3D(){
  TW_phase="elv";
  const box=document.getElementById("tw-scene");if(!box)return;
  const current=Math.min(towerProgress.floor+1,90);
  viewChap=getTowerChapter(current).id;
  box.innerHTML=`<div class="tw-elv-ind" id="tw-elv-ind">É${Math.max(1,towerProgress.floor)}</div><div class="tw-elv-panel" id="tw-elv-panel"></div>`;
  ensure(box);stageElevator();
  drawPanel();drawChips();
  document.getElementById("tower-sub").innerText=currentLang==="fr"?"🛗 Appuie sur le bouton de ton étage !":"🛗 Press your floor button!";
}
function pressFloor3D(f){
  if(event&&event.currentTarget)event.currentTarget.classList.add("lit");
  towerTick();
  setTimeout(()=>rideTo3D(f),400);
}
function rideTo3D(f){
  const box=document.getElementById("tw-scene");
  box.classList.add("shake");towerRumble(1200);
  const ind=document.getElementById("tw-elv-ind");
  let from=Math.max(1,f-1);
  const iv=setInterval(()=>{
    from++;
    if(from>f){clearInterval(iv);box.classList.remove("shake");
      fade(box,true,()=>{arriveFloor3D(f);fade(box,false);});
      return;}
    if(ind)ind.innerText="É"+from;towerTick();
    R.camera.position.y=1.5+Math.sin(from*2)*.03;
  },220);
}
function arriveFloor3D(f){
  TW_phase="room";viewFloorOverride=null;viewChap=getTowerChapter(f).id;
  drawRoom3D();
  const current=Math.min(towerProgress.floor+1,90);
  if(f===current)showBriefing(getFloorDef(f));
}
function drawRoom3D(){
  const box=document.getElementById("tw-scene");if(!box)return;
  const current=Math.min(towerProgress.floor+1,90);
  if(!viewChap)viewChap=getTowerChapter(current).id;
  const chap=TOWER_CHAPTERS[viewChap-1];
  const floorShown=viewFloorOverride||(viewChap===getTowerChapter(current).id?current:viewChap*10);
  const inChap=((floorShown-1)%10)+1,isBoss=inChap===10;
  const wonInChap=Math.min(9,Math.max(0,towerProgress.floor-(viewChap-1)*10));
  const count=isBoss?wonInChap:Math.max(0,Math.min(wonInChap,inChap-1));
  const isCurrent=floorShown===current;
  ensure(box);stageRoom(viewChap,count,isBoss,wonInChap>=9,isCurrent);
  document.getElementById("tower-sub").innerText=chap.icon+" "+chap.name+" — "+(currentLang==="fr"?"Étage":"Floor")+" "+floorShown+" / 90";
  const act=document.getElementById("tw-actions");
  if(isCurrent&&!isBoss)act.innerHTML=`<button class="btn-main btn-blue" onclick="startTowerFloor(getFloorDef(${current}))">▶ ${typeLabel(getFloorDef(current).type)}</button>`;
  else if(isCurrent&&isBoss&&wonInChap>=9)act.innerHTML=`<button class="btn-main" style="background:linear-gradient(45deg,#ff4b2b,#f8b500);color:#fff;font-weight:900;" onclick="startTowerFloor(getFloorDef(${current}))">⚔️ ${currentLang==="fr"?"DÉFIER LE GARDIEN":"CHALLENGE THE GUARDIAN"}</button>`;
  else if(!isCurrent)act.innerHTML=`<span style="font-size:10px;color:#888;">🔒 ${currentLang==="fr"?"Gagne les étages précédents !":"Clear the previous floors!"}</span>`;
  else act.innerHTML=`<button class="btn-secondary" onclick="showElevator()">🛗 ${currentLang==="fr"?"Ascenseur":"Elevator"}</button>`;
  drawChips();
}
function renderTower3D(){
  if(TW_phase==="room")drawRoom3D();
  else if(TW_phase==="elv")drawPanel();
  drawChips();
}
function afterWinTravel3D(){showElevator3D();}
function viewWonFloor3D(f){viewChap=getTowerChapter(f).id;viewFloorOverride=f;TW_phase="room";drawRoom3D();}

/* ----- Activation (sinon fallback CSS) ----- */
window.openTower=openTower3D;
window.closeTower=closeTower3D;
window.showElevator=showElevator3D;
window.pressFloor=pressFloor3D;
window.rideTo=rideTo3D;
window.viewWonFloor=viewWonFloor3D;
window.drawRoom=drawRoom3D;
window.renderTower=renderTower3D;
window.afterWinTravel=afterWinTravel3D;
console.log("🗼 Tour 3D activée (Three.js)");
})();
