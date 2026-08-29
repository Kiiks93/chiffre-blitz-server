/* ============================================================
MODULE SONS SAISONNIERS — Halloween 🎃 & Noël 🎄
(MENU = ambiance longue / GAME = version tendue)
============================================================ */

/* ---------- DÉMARRAGE MUSIQUE SAISONNIÈRE ---------- */
SoundEngine.startMusicSeasonal = function(key) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.ctx.state === "suspended") this.ctx.resume();
  if (this.timerId && this.currentMode === key) return;
  this.stopMusic(false);
  this.currentMode = key;
  this.step = 0;
  const bpms = { s2menu: 75, s2game: 100, s3menu: 66, s3game: 132 };
  this.bpm = bpms[key] || 100;
  const intervalMs = (60 / this.bpm / 4) * 1000;
  this.timerId = setInterval(() => {
    if (this.isMuted || !this.ctx || this.ctx.state !== "running") return;
    if (key === "s2menu") this.tickHalloweenMenu(this.step % 256);
    else if (key === "s2game") this.tickHalloweenGame(this.step % 128);
    else if (key === "s3menu") this.tickNoelMenu(this.step % 128);
    else if (key === "s3game") this.tickNoelGame(this.step % 128);
    this.step = (this.step + 1) % 256;
  }, intervalMs);
};

/* ---------- OVERRIDE startMusic : route vers la saison en cours ---------- */
SoundEngine._originalStartMusic = SoundEngine.startMusic;
SoundEngine.startMusic = function(mode) {
  this._baseMode = mode;
  const season = (typeof window !== "undefined") ? (window.CURRENT_SEASON || "s1") : "s1";
  if (season === "s2") {
    if (mode === "menu") return this.startMusicSeasonal("s2menu");
    return this.startMusicSeasonal("s2game");
  }
  if (season === "s3") {
    if (mode === "menu") return this.startMusicSeasonal("s3menu");
    return this.startMusicSeasonal("s3game");
  }
  this._originalStartMusic.call(this, mode);
};
/* ============================================================
HALLOWEEN MENU : chill-horreur LONG (~51s, 2 moitiés)
============================================================ */
SoundEngine.tickHalloweenMenu = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const half = bar < 8 ? 0 : 1;
  const progA = [
    { root: 55.00, pad: [110.00, 130.81, 164.81, 220.00] },
    { root: 43.65, pad: [87.31, 110.00, 130.81, 174.61] },
    { root: 36.71, pad: [73.42, 87.31, 110.00, 146.83] },
    { root: 41.20, pad: [82.41, 103.83, 123.47, 164.81] }
  ];
  const progB = [
    { root: 55.00, pad: [110.00, 130.81, 164.81, 220.00] },
    { root: 49.00, pad: [98.00, 123.47, 146.83, 196.00] },
    { root: 43.65, pad: [87.31, 110.00, 130.81, 174.61] },
    { root: 41.20, pad: [82.41, 103.83, 123.47, 164.81] }
  ];
  const chord = (half === 0 ? progA : progB)[bar % 4];

  if (inBar === 0 && bar % 2 === 0) this._heart(t, 0.16);
  if (inBar === 3 && bar % 2 === 0) this._heart(t, 0.10);

  if (inBar === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(chord.root, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 3.8);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 3.8);
  }

  if (inBar === 0) {
    chord.pad.forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(i % 2 === 0 ? -4 : 4, t);
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.022, t + 1.0);
      g.gain.linearRampToValueAtTime(0.0001, t + 3.6);
      o.connect(lp); lp.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 3.6);
    });
  }

  if (inBar === 8 && bar % 4 === 2) {
    const f = chord.pad[2] * 2;
    [f, f * 1.005].forEach(fr => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(fr, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 2.4);
    });
  }

  const scale = [220.00, 261.63, 329.63, 349.23, 415.30, 440.00];
  const melA = { 2: 0, 6: 2, 10: 4, 14: 3 };
  const melB = { 0: 5, 4: 4, 8: 2, 12: 1 };
  const mel = half === 0 ? melA : melB;
  if (mel[inBar] !== undefined && Math.random() < 0.85) {
    this._eerie(t, scale[mel[inBar]], 0.05);
  }

  if ((inBar === 6 || inBar === 12) && Math.random() < 0.6) {
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.setValueAtTime(600 + Math.random() * 500, t); f.Q.setValueAtTime(6, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
    noise.start(t);
  }

  if (inBar === 0 && bar % 4 === 3) {
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(200, t);
    f.frequency.linearRampToValueAtTime(800, t + 1.5);
    f.frequency.linearRampToValueAtTime(200, t + 3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.04, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 3);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
    noise.start(t);
  }

  if (inBar === 4 && Math.random() < 0.35) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880 + Math.random() * 440, t);
    g.gain.setValueAtTime(0.02, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 1.8);
  }

  if (inBar === 0) {
    const glow = document.getElementById('bg-glow');
    if (glow) {
      glow.style.opacity = '0.16';
      setTimeout(() => { glow.style.opacity = '0.06'; }, 600);
    }
  }
};

/* ============================================================
HALLOWEEN GAME : tendu, pulsé
============================================================ */
SoundEngine.tickHalloweenGame = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const prog = [
    { root: 55.00, pad: [110.00, 130.81, 164.81] },
    { root: 43.65, pad: [87.31, 110.00, 130.81] },
    { root: 36.71, pad: [73.42, 87.31, 110.00] },
    { root: 41.20, pad: [82.41, 103.83, 123.47] }
  ];
  const chord = prog[bar % 4];

  if (inBar % 4 === 0) this._heart(t, 0.2);

  if (inBar % 2 === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(chord.root * 2, t);
    f.type = "lowpass"; f.frequency.setValueAtTime(700, t);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(f); f.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.12);
  }

  if (inBar % 4 === 2) {
    this._eerie(t, 440.00, 0.04);
    this._eerie(t, 466.16, 0.03);
  }

  if (inBar === 0 && bar % 2 === 0) {
    chord.pad.forEach((fq, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(fq, t);
      o.detune.setValueAtTime(i % 2 === 0 ? -5 : 5, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.5);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 2.5);
    });
  }

  if (inBar === 8 && Math.random() < 0.3) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(chord.root * 1.414 * 4, t);
    f.type = "bandpass"; f.frequency.setValueAtTime(900, t);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(f); f.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.7);
  }
};

/* ============================================================
NOËL (menu + game partagent le même tick)
============================================================ */
SoundEngine.tickNoelMenu = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const prog = [
    { root: 130.81, pad: [261.63, 329.63, 392.00, 493.88] },
    { root: 98.00,  pad: [196.00, 246.94, 293.66, 369.99] },
    { root: 110.00, pad: [220.00, 261.63, 329.63, 440.00] },
    { root: 87.31,  pad: [174.61, 220.00, 261.63, 349.23] },
    { root: 130.81, pad: [261.63, 329.63, 392.00, 493.88] },
    { root: 98.00,  pad: [196.00, 246.94, 293.66, 369.99] },
    { root: 87.31,  pad: [174.61, 220.00, 261.63, 349.23] },
    { root: 130.81, pad: [261.63, 329.63, 392.00, 523.25] }
  ];
  const chord = prog[bar % 8];

  if (inBar === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(chord.root, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 1.0); g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 4.2);
    chord.pad.forEach((f, i) => {
      const oo = this.ctx.createOscillator(), gg = this.ctx.createGain();
      oo.type = "triangle"; oo.frequency.setValueAtTime(f, t); oo.detune.setValueAtTime(i % 2 ? 3 : -3, t);
      gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.016, t + 1.2); gg.gain.linearRampToValueAtTime(0.0001, t + 4.0);
      oo.connect(gg); gg.connect(this.ctx.destination); oo.start(t); oo.stop(t + 4.0);
    });
  }

  // Mélodie boîte à musique (douce, rêveuse)
  const melody = [
    [659.25, 783.99, 659.25, 523.25],
    [587.33, 783.99, 493.88, 587.33],
    [523.25, 659.25, 440.00, 523.25],
    [440.00, 523.25, 698.46, 523.25],
    [659.25, 523.25, 392.00, 659.25],
    [493.88, 587.33, 783.99, 587.33],
    [440.00, 523.25, 698.46, 523.25],
    [392.00, 659.25, 523.25, 783.99]
  ];
  const notes = melody[bar % 8];
  const pos = [0, 4, 8, 12];
  const idx = pos.indexOf(inBar);
  if (idx !== -1 && notes[idx]) {
    const f = notes[idx];
    [0, 0.005].forEach((delay, k) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f * 2, t + delay);
      const vol = k === 0 ? 0.06 : 0.02;
      g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.4);
      o.connect(g); g.connect(this.ctx.destination); o.start(t + delay); o.stop(t + delay + 1.4);
    });
  }

  // Grelots très discrets
  if (inBar === 8 && bar % 2 === 0) {
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const n = this.ctx.createBufferSource(); n.buffer = buffer;
    const f = this.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.setValueAtTime(6000, t);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(f); f.connect(g); g.connect(this.ctx.destination); n.start(t);
  }
};

SoundEngine.tickNoelGame = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const bass = [65.41, 65.41, 87.31, 98.00][bar % 4];
  if (inBar % 4 === 0) this._heart(t, 0.2);
  if (inBar % 2 === 0) {
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const n = this.ctx.createBufferSource(); n.buffer = buffer;
    const f = this.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.setValueAtTime(6000, t);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(f); f.connect(g); g.connect(this.ctx.destination); n.start(t);
  }
  if (inBar % 8 === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(bass, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 1.2);
  }
  const mel  = { 0: 329.63, 2: 329.63, 4: 329.63, 6: 329.63, 8: 329.63, 10: 329.63, 12: 329.63, 14: 392.00 };
  const mel2 = { 0: 261.63, 2: 293.66, 4: 329.63, 6: 349.23, 8: 392.00, 10: 392.00, 12: 392.00, 14: 392.00 };
  const m = (bar % 2 === 0) ? mel : mel2;
  if (m[inBar]) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(m[inBar], t);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2500, t);
    o.connect(lp); lp.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 0.18);
  }
};
/* ============================================================
HELPERS (réutilisables)
============================================================ */
SoundEngine._heart = function(t, vol) {
  const o = this.ctx.createOscillator(), g = this.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(55, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(this.ctx.destination);
  o.start(t); o.stop(t + 0.16);
};

SoundEngine._eerie = function(t, freq, vol) {
  const o = this.ctx.createOscillator(), g = this.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  const vib = this.ctx.createOscillator();
  const vibG = this.ctx.createGain();
  vib.frequency.setValueAtTime(5.5, t);
  vibG.gain.setValueAtTime(6, t);
  vib.connect(vibG); vibG.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(g); g.connect(this.ctx.destination);
  o.start(t); vib.start(t);
  o.stop(t + 1.4); vib.stop(t + 1.4);
};

/* ============================================================
OVERRIDES THÉMATIQUES (combo crack + perfection)
============================================================ */
SoundEngine._originalCrack = SoundEngine.playCrack;
SoundEngine.playCrack = function(theme) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.ctx.state === "suspended") this.ctx.resume();
  if (theme === "theme_bonbon") { playBonbonSound(); return; }
  if (theme === "theme_sapin") { playSapinSound(); return; }
  if (theme === "theme_lutin") { playLutinSound(); return; }
  if (theme === "theme_citrouille" || theme === "theme_fantome") {
    this._originalCrack.call(this, theme);
    return;
  }
  this._originalCrack.call(this, theme);
};

SoundEngine._originalBoom = SoundEngine.playPerfectionBoom;
SoundEngine.playPerfectionBoom = function(theme) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.ctx.state === "suspended") this.ctx.resume();
  if (theme === "theme_bonbon" || theme === "theme_sapin" || theme === "theme_lutin") {
    this.stopBoom();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t + i * 0.09);
      g.gain.setValueAtTime(0.14, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.4);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.4);
    });
    return;
  }
  if (theme === "theme_citrouille" || theme === "theme_fantome") {
    this._originalBoom.call(this, theme);
    return;
  }
  this._originalBoom.call(this, theme);
};

/* ============================================================
SONS COMBO NOËL 🎄 (S3) — fonctions dédiées
============================================================ */
function playBonbonSound() {
  if (isMuted()) return;
  try {
    SoundEngine.init();
    const ctx = SoundEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    [2200, 2800, 3400].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t + i * 0.03);
      g.gain.setValueAtTime(0.11, t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.18);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.setValueAtTime(1800, t);
      o.connect(hp); hp.connect(g); g.connect(ctx.destination);
      o.start(t + i * 0.03); o.stop(t + i * 0.03 + 0.18);
    });
  } catch (e) {}
}

function playSapinSound() {
  if (isMuted()) return;
  try {
    SoundEngine.init();
    const ctx = SoundEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    [783.99, 987.77, 1174.66].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t + i * 0.08);
      g.gain.setValueAtTime(0.13, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.5);
      o.connect(g); g.connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.5);
    });
  } catch (e) {}
}

function playLutinSound() {
  if (isMuted()) return;
  try {
    SoundEngine.init();
    const ctx = SoundEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    
    // Pattern "hi hi hi hi" rapide et aigu
    const laughPattern = [
      { freq: 2200, time: 0.0, dur: 0.08 },
      { freq: 2400, time: 0.12, dur: 0.08 },
      { freq: 2600, time: 0.24, dur: 0.08 },
      { freq: 2800, time: 0.4, dur: 0.1 },
      { freq: 2200, time: 0.55, dur: 0.08 },
      { freq: 2400, time: 0.67, dur: 0.08 }
    ];
    
    laughPattern.forEach(note => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(note.freq, t + note.time);
      o.frequency.exponentialRampToValueAtTime(note.freq * 0.9, t + note.time + note.dur);
      
      g.gain.setValueAtTime(0.09, t + note.time);
      g.gain.exponentialRampToValueAtTime(0.0001, t + note.time + note.dur);
      
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(note.freq, t + note.time);
      bp.Q.setValueAtTime(12, t + note.time);
      
      o.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      o.start(t + note.time);
      o.stop(t + note.time + note.dur + 0.01);
    });
  } catch (e) {}
}
