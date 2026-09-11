/* ============================================================
MENU MOBILE — Halo demi-cercle + projection haut + Néon S1
============================================================ */
const WHEEL_MODES = [
  { id:'tower',     icon:'🗺️', name:'Aventure',  fn:'openTower' },
  { id:'solo',      icon:'🏋️', name:'Solo',      fn:'openSoloMenu' },
  { id:'1v1',       icon:'⚔️', name:'1v1',       fn:'open1v1Hub' },
  { id:'halloween', icon:'🎃', name:'Halloween', fn:'startHalloweenQueue', cond:'btn-halloween-menu' },
  { id:'noel',      icon:'🎄', name:'Noël',      fn:'startNoelQueue',      cond:'btn-noel-menu' },
  { id:'tow',       icon:'🪢', name:'Corde',     fn:'startTugOfWarQueue',  cond:'btn-tow-menu' },
];
let wheelCurrent = 0;
const WHEEL_R = 150, WHEEL_STEP = 26;

function showMobileMenu(show) {
    const m = document.getElementById('screen-menu-mobile');
    if (!m) return;
    m.style.display = show ? 'flex' : 'none';
    if (show) { syncMobileMenuButtons(); buildModeWheel(); }
    updateS1Neon();
}

function toggleAdmireMode() {
    const m = document.getElementById('screen-menu-mobile');
    const btn = document.getElementById('admire-btn');
    const icon = document.getElementById('admire-icon');
    const text = document.getElementById('admire-text');
    if (!m) return;
    const active = m.classList.toggle('admire-active');
    btn.classList.toggle('active', active);
    if (active) { icon.textContent='🎮'; text.textContent='Jouer';
        setTimeout(()=>{ if(m.classList.contains('admire-active')) toggleAdmireMode(); },8000);
    } else { icon.textContent='👁️'; text.textContent='Admirer'; }
}

function visibleWheelModes(){ return WHEEL_MODES.filter(m=>!m.cond||(document.getElementById(m.cond)&&document.getElementById(m.cond).style.display!=='none')); }

function buildModeWheel(){
    const wrap=document.getElementById('mode-wheel'); if(!wrap)return;
    wrap.innerHTML='';
    visibleWheelModes().forEach(m=>{
        const b=document.createElement('button');
        b.className='wheel-item'; b.id='wheel-item-'+m.id; b.textContent=m.icon;
        b.onclick=()=>{ const i=visibleWheelModes().indexOf(m);
            if(i===Math.round(wheelCurrent)) launchMode(m); else { wheelCurrent=i; renderWheel(); } };
        wrap.appendChild(b);
    });
    renderWheel();
}

function renderWheel(){
    const modes=visibleWheelModes();
    const c=Math.max(0,Math.min(modes.length-1,Math.round(wheelCurrent)));
    modes.forEach((m,i)=>{
        const el=document.getElementById('wheel-item-'+m.id); if(!el)return;
        const th=((i-wheelCurrent)*WHEEL_STEP)*Math.PI/180;
        const x=WHEEL_R*Math.sin(th);
        const y=-WHEEL_R*Math.cos(th);
        const d=Math.abs(i-wheelCurrent);
        el.style.transform=`translate(${x}px,${y}px) scale(${Math.max(.6,1-.2*d)})`;
        el.style.opacity=Math.max(.3,1-.3*d);
        el.classList.toggle('center',i===c);
    });
    const m=modes[c];
    if(m){ const ic=document.getElementById('mode-wheel-icon'),nm=document.getElementById('mode-wheel-name');
        if(ic)ic.textContent=m.icon; if(nm)nm.textContent=m.name; }
}
function launchMode(m){ if(m&&typeof window[m.fn]==='function') window[m.fn](); }
function launchCenterMode(){ launchMode(visibleWheelModes()[Math.round(wheelCurrent)]); }

(function(){
    let sx=0,sc=0,drag=false;
    document.addEventListener('touchstart',e=>{ const z=e.target.closest&&e.target.closest('#mode-wheel'); if(!z)return; drag=true; sx=e.touches[0].clientX; sc=wheelCurrent; },{passive:true});
    document.addEventListener('touchmove',e=>{ if(!drag)return; const dx=e.touches[0].clientX-sx; wheelCurrent=sc-dx/70; const n=visibleWheelModes().length-1; wheelCurrent=Math.max(0,Math.min(n,wheelCurrent)); renderWheel(); },{passive:true});
    document.addEventListener('touchend',()=>{ if(!drag)return; drag=false; wheelCurrent=Math.round(wheelCurrent); renderWheel(); try{if(window.SoundEngine&&SoundEngine.playClick)SoundEngine.playClick();}catch(e){} });
})();

function syncMobileMenuButtons(){
    [['btn-halloween-menu','mobile-btn-halloween'],['btn-noel-menu','mobile-btn-noel'],['btn-tow-menu','mobile-btn-tow']].forEach(([a,b])=>{
        const x=document.getElementById(a),y=document.getElementById(b); if(x&&y)y.style.display=x.style.display;
    });
    renderWheel();
}

/* ---------- SON : whoosh + hum néon continu + grésillement ---------- */
let NEON_HUM=null;
function playWhoosh(){
    try{ SoundEngine.init(); const ctx=SoundEngine.ctx,t=ctx.currentTime;
        const len=Math.floor(ctx.sampleRate*0.4),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
        for(let i=0;i<len;i++){const p=i/len;d[i]=(Math.random()*2-1)*Math.sin(p*Math.PI);}
        const src=ctx.createBufferSource();src.buffer=buf;
        const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=1;
        f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(2500,t+0.4);
        const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.1,t+0.2);g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
        src.connect(f);f.connect(g);g.connect(ctx.destination);src.start(t);
    }catch(e){}
}
let NEON_HUM = null;
let NEON_FLICK_TIMER = null;

/* Vrai buzz néon "zzzz" : secteur 100Hz + harmonique + crépitement */
function makeBuzz(ctx, dest, startT, dur, vol) {
    const o  = ctx.createOscillator(); o.type  = 'sawtooth'; o.frequency.value  = 100;
    const o2 = ctx.createOscillator(); o2.type = 'square';   o2.frequency.value = 200;
    const f  = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 1.5;
    const g  = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startT);
    g.gain.exponentialRampToValueAtTime(vol, startT + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 45;
    const lg  = ctx.createGain(); lg.gain.value = vol * 0.6;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(dest);
    o.start(startT); o2.start(startT); lfo.start(startT);
    o.stop(startT + dur + .05); o2.stop(startT + dur + .05); lfo.stop(startT + dur + .05);
}

function startNeonHum() {
    if (NEON_HUM) return;
    try {
        SoundEngine.init();
        const ctx = SoundEngine.ctx, t = ctx.currentTime;
        // hum continu "zzzz"
        const o  = ctx.createOscillator(); o.type  = 'sawtooth'; o.frequency.value  = 100;
        const o2 = ctx.createOscillator(); o2.type = 'square';   o2.frequency.value = 200;
        const f  = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
        const g  = ctx.createGain(); g.gain.value = 0;
        const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 50;
        const lg  = ctx.createGain(); lg.gain.value = 0.02;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(f); o2.connect(f); f.connect(g); g.connect(ctx.destination);
        g.gain.linearRampToValueAtTime(0.035, t + 0.8);
        o.start(); o2.start(); lfo.start();
        NEON_HUM = { o, o2, lfo, g };
        // sync avec le flicker visuel (neonFlicker = 5s, baisses à ~6%,39%,73%)
        const offsets = [0.30, 1.95, 3.65];
        const cycle = () => offsets.forEach(off => setTimeout(() => {
            if (NEON_HUM) makeBuzz(SoundEngine.ctx, SoundEngine.ctx.destination, SoundEngine.ctx.currentTime, 0.12, 0.10);
        }, off * 1000));
        cycle();
        NEON_FLICK_TIMER = setInterval(cycle, 5000);
    } catch (e) {}
}

function stopNeonHum() {
    if (NEON_FLICK_TIMER) { clearInterval(NEON_FLICK_TIMER); NEON_FLICK_TIMER = null; }
    if (!NEON_HUM) return;
    try {
        const ctx = SoundEngine.ctx, t = ctx.currentTime, n = NEON_HUM;
        NEON_HUM = null;
        n.g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
        setTimeout(() => { try { n.o.stop(); n.o2.stop(); n.lfo.stop(); } catch (e) {} }, 500);
    } catch (e) { NEON_HUM = null; }
}

function updateS1Neon(){
    let sign=document.getElementById('s1-neon-sign');
    const season=(window.myProfile&&myProfile.currentSeasonId)||'s1';
    const pc=document.getElementById('screen-menu'),mob=document.getElementById('screen-menu-mobile');
    const visible=(pc&&pc.style.display!=='none')||(mob&&mob.style.display!=='none');
    if(season==='s1'&&visible){
        if(!sign){ sign=document.createElement('div');sign.id='s1-neon-sign';sign.className='s1-neon-sign';
            sign.innerHTML='<div class="s1-neon-logo">⚡</div><div class="s1-neon-text">CHIFFRE BLITZ</div>';
            document.body.appendChild(sign); playWhoosh(); startNeonHum(); }
    } else { if(sign)sign.remove(); stopNeonHum(); }
}

/* ---------- Hooks : cacher ONLY écrans pleins, réafficher via showMainMenu/closeTower ---------- */
(function(){
    const HIDE=['openTower','openSoloMenu','open1v1Hub','openRoomsScreen','openTournamentScreen','showTitleScreen','openAvalancheDifficulties','startHalloweenQueue','startNoelQueue','startTugOfWarQueue','startRandom1v1','startSoloTraining'];
    const SHOW=['showMainMenu','closeTower'];
    HIDE.forEach(fn=>{ const w=setInterval(()=>{ if(typeof window[fn]==='function'&&!window[fn].__h){ const o=window[fn]; window[fn]=function(){ showMobileMenu(false); return o.apply(this,arguments); }; window[fn].__h=true; clearInterval(w);} },100); });
    SHOW.forEach(fn=>{ const w=setInterval(()=>{ if(typeof window[fn]==='function'&&!window[fn].__s){ const o=window[fn]; window[fn]=function(){ const r=o.apply(this,arguments); showMobileMenu(true); return r; }; window[fn].__s=true; clearInterval(w);} },100); });
})();

document.addEventListener('DOMContentLoaded',()=>{
    ['btn-halloween-menu','btn-noel-menu','btn-tow-menu'].forEach(id=>{ const el=document.getElementById(id); if(el)new MutationObserver(syncMobileMenuButtons).observe(el,{attributes:true,attributeFilter:['style']}); });
});
