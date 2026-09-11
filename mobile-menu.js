/* ============================================================
MENU MOBILE — Roue demi-cercle + Admirer + Néon S1
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
const WHEEL_R = 210, WHEEL_STEP = 24;

/* ---------- Affichage du menu mobile ---------- */
function showMobileMenu(show) {
    const mobileMenu = document.getElementById('screen-menu-mobile');
    if (!mobileMenu) return;
    mobileMenu.style.display = show ? 'flex' : 'none';
    if (show) { syncMobileMenuButtons(); buildModeWheel(); }
    updateS1Neon();
}

/* ---------- Toggle Admirer ---------- */
function toggleAdmireMode() {
    const mobileMenu = document.getElementById('screen-menu-mobile');
    const btn = document.getElementById('admire-btn');
    const icon = document.getElementById('admire-icon');
    const text = document.getElementById('admire-text');
    if (!mobileMenu) return;
    const isActive = mobileMenu.classList.toggle('admire-active');
    btn.classList.toggle('active', isActive);
    if (isActive) {
        icon.textContent = '🎮'; text.textContent = 'Jouer';
        setTimeout(() => { if (mobileMenu.classList.contains('admire-active')) toggleAdmireMode(); }, 8000);
    } else {
        icon.textContent = '👁️'; text.textContent = 'Admirer';
    }
}

/* ---------- Roue : modes visibles ---------- */
function visibleWheelModes() {
    return WHEEL_MODES.filter(m => !m.cond || (document.getElementById(m.cond) && document.getElementById(m.cond).style.display !== 'none'));
}

/* ---------- Roue : construction ---------- */
function buildModeWheel() {
    const wrap = document.getElementById('mode-wheel');
    if (!wrap) return;
    wrap.innerHTML = '';
    visibleWheelModes().forEach((m) => {
        const b = document.createElement('button');
        b.className = 'wheel-item';
        b.id = 'wheel-item-' + m.id;
        b.textContent = m.icon;
        b.onclick = () => {
            const idx = visibleWheelModes().indexOf(m);
            if (idx === Math.round(wheelCurrent)) launchMode(m);
            else { wheelCurrent = idx; renderWheel(); }
        };
        wrap.appendChild(b);
    });
    renderWheel();
}

/* ---------- Roue : rendu (position demi-cercle) ---------- */
function renderWheel() {
    const modes = visibleWheelModes();
    const c = Math.max(0, Math.min(modes.length - 1, Math.round(wheelCurrent)));
    modes.forEach((m, i) => {
        const el = document.getElementById('wheel-item-' + m.id);
        if (!el) return;
        const theta = ((i - wheelCurrent) * WHEEL_STEP) * Math.PI / 180;
        const x = WHEEL_R * Math.sin(theta);
        const y = WHEEL_R - WHEEL_R * Math.cos(theta);
        const d = Math.abs(i - wheelCurrent);
        const sc = Math.max(.55, 1 - .22 * d);
        const op = Math.max(.25, 1 - .3 * d);
        el.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
        el.style.opacity = op;
        el.classList.toggle('center', i === c);
    });
    const m = modes[c];
    if (m) {
        const ic = document.getElementById('mode-wheel-icon');
        const nm = document.getElementById('mode-wheel-name');
        if (ic) ic.textContent = m.icon;
        if (nm) nm.textContent = m.name;
    }
}

function launchMode(m) { if (m && typeof window[m.fn] === 'function') window[m.fn](); }
function launchCenterMode() { const modes = visibleWheelModes(); launchMode(modes[Math.round(wheelCurrent)]); }

/* ---------- Roue : swipe ---------- */
(function(){
    let startX = 0, startCur = 0, dragging = false;
    document.addEventListener('touchstart', (e) => {
        const z = e.target.closest && e.target.closest('#mode-wheel');
        if (!z) return;
        dragging = true; startX = e.touches[0].clientX; startCur = wheelCurrent;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dx = e.touches[0].clientX - startX;
        wheelCurrent = startCur - dx / 70;
        const n = visibleWheelModes().length - 1;
        wheelCurrent = Math.max(0, Math.min(n, wheelCurrent));
        renderWheel();
    }, { passive: true });
    document.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        wheelCurrent = Math.round(wheelCurrent);
        renderWheel();
        try { if (window.SoundEngine && SoundEngine.playClick) SoundEngine.playClick(); } catch(e){}
    });
})();

/* ---------- Synchro boutons conditionnels ---------- */
function syncMobileMenuButtons() {
    const map = [ ['btn-halloween-menu','mobile-btn-halloween'], ['btn-noel-menu','mobile-btn-noel'], ['btn-tow-menu','mobile-btn-tow'] ];
    map.forEach(([pc, mob]) => {
        const a = document.getElementById(pc), b = document.getElementById(mob);
        if (a && b) b.style.display = a.style.display;
    });
    renderWheel();
}

/* ---------- Néon Saison 1 + son ---------- */
function playNeonBuzz() {
    try {
        SoundEngine.init();
        const ctx = SoundEngine.ctx, t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.03, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
        o.connect(f); f.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 1);
        const len = Math.floor(ctx.sampleRate * 0.25);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const ng = ctx.createGain(); ng.gain.value = 0.06;
        const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 1500;
        src.connect(nf); nf.connect(ng); ng.connect(ctx.destination);
        src.start(t);
    } catch (e) {}
}

function updateS1Neon() {
    let sign = document.getElementById('s1-neon-sign');
    const season = (window.myProfile && myProfile.currentSeasonId) || 's1';
    const menuPc = document.getElementById('screen-menu');
    const menuMob = document.getElementById('screen-menu-mobile');
    const visible = (menuPc && menuPc.style.display !== 'none') || (menuMob && menuMob.style.display !== 'none');
    if (season === 's1' && visible) {
        if (!sign) {
            sign = document.createElement('div');
            sign.id = 's1-neon-sign'; sign.className = 's1-neon-sign';
            sign.innerHTML = '<div class="s1-neon-logo">⚡</div><div class="s1-neon-text">CHIFFRE BLITZ</div>';
            document.body.appendChild(sign);
            playNeonBuzz();
        }
    } else if (sign) {
        sign.remove();
    }
}

/* ---------- Hooks : afficher/cacher au bon moment ---------- */
(function(){
    const wait = setInterval(() => {
        if (typeof window.showMainMenu === 'function' && !window.showMainMenu.__hooked) {
            const original = window.showMainMenu;
            window.showMainMenu = function() {
                const r = original.apply(this, arguments);
                showMobileMenu(true);   // apparaît APRÈS titre + pub
                return r;
            };
            window.showMainMenu.__hooked = true;
            clearInterval(wait);
        }
    }, 100);

    ['openTower','openSoloMenu','open1v1Hub','openShop','openLeaderboard','openRoomsScreen',
     'openTournamentScreen','openBlitzPass','enterTrophyRoom','showTitleScreen',
     'startHalloweenQueue','startNoelQueue','startTugOfWarQueue','startRandom1v1'
    ].forEach(fn => {
        const w = setInterval(() => {
            if (typeof window[fn] === 'function' && !window[fn].__hooked) {
                const original = window[fn];
                window[fn] = function() {
                    showMobileMenu(false);
                    return original.apply(this, arguments);
                };
                window[fn].__hooked = true;
                clearInterval(w);
            }
        }, 100);
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    ['btn-halloween-menu','btn-noel-menu','btn-tow-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) new MutationObserver(syncMobileMenuButtons).observe(el, { attributes: true, attributeFilter: ['style'] });
    });
});
