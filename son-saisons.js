/* ============================================================
MODULE SONS SAISONNIERS — Halloween 🎃 & Noël 🎄
(chargé APRÈS audio.js pour étendre SoundEngine)
============================================================ */

SoundEngine.startMusicSeasonal = function(season) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.timerId && this.currentMode === season) return;
  this.stopMusic(false);
  this.currentMode = season;
  this.step = 0;
  this.bpm = (season === "s2") ? 90 : 120;
  const intervalMs = (60 / this.bpm / 4) * 1000;
  this.timerId = setInterval(() => {
    if (this.isMuted || !this.ctx || this.ctx.state !== "running") return;
    if (season === "s2") this.tickHalloween(this.step % 128);
    else if (season === "s3") this.tickNoel(this.step % 128);
    this.step = (this.step + 1) % 256;
  }, intervalMs);
};

/* ---------- MUSIQUE HALLOWEEN (drone mineur angoissant) ---------- */
SoundEngine.tickHalloween = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chords = [
    { root: 55.00, notes: [110.00, 138.59, 164.81] },
    { root: 51.91, notes: [103.83, 130.81, 155.56] },
    { root: 58.27, notes: [116.54, 146.83, 174.61] },
    { root: 49.00, notes: [98.00, 123.47, 146.83] }
  ];
  const chord = chords[bar % 4];
  if (inBar === 0 || inBar === 8) {
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.25);
  }
  if (inBar === 0) {
    chord.notes.forEach(freq => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, t);
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(300, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(f); f.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 3.5);
    });
  }
  if (inBar === 4 || inBar === 12) {
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(chord.root * 1.414, t);
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(400, t);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    osc.connect(f); f.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.8);
  }
  if (inBar % 4 === 2) {
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(800 + Math.random() * 400, t);
    f.Q.setValueAtTime(8, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
    noise.start(t);
  }
  if (inBar === 0) {
    const glow = document.getElementById('bg-glow');
    if (glow) {
      glow.style.opacity = '0.18';
      setTimeout(() => { glow.style.opacity = '0.06'; }, 500);
    }
  }
};

/* ---------- MUSIQUE NOËL (grelots, carillon, ambiance chaleureuse) ---------- */
SoundEngine.tickNoel = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chords = [
    { root: 130.81, notes: [261.63, 329.63, 392.00] },
    { root: 110.00, notes: [220.00, 261.63, 329.63] },
    { root: 123.47, notes: [246.94, 293.66, 369.99] },
    { root: 98.00, notes: [196.00, 246.94, 293.66] }
  ];
  const chord = chords[bar % 4];
  if (inBar === 0 || inBar === 8) {
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.50, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 1.2);
  }
  if (inBar % 2 === 0) {
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.setValueAtTime(5000, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
    noise.start(t);
  }
  if (inBar === 0) {
    chord.notes.forEach(freq => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 3.0);
    });
  }
  if (inBar % 4 === 0) {
    const melody = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 493.88];
    const note = melody[inBar / 2];
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(note, t);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
  }
  if (inBar === 0) {
    const glow = document.getElementById('bg-glow');
    if (glow) {
      glow.style.opacity = '0.2';
      setTimeout(() => { glow.style.opacity = '0.08'; }, 400);
    }
  }
};

/* ---------- SONS COMBO THÉMATIQUES ---------- */
SoundEngine._originalCrack = SoundEngine.playCrack;
SoundEngine.playCrack = function(theme) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (theme === "theme_citrouille" || theme === "theme_fantome") {
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(1200, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
    noise.start(t);
    return;
  }
  this._originalCrack.call(this, theme);
};

SoundEngine._originalBoom = SoundEngine.playPerfectionBoom;
SoundEngine.playPerfectionBoom = function(theme) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (theme === "theme_citrouille" || theme === "theme_fantome") {
    this.stopBoom();
    const t = this.ctx.currentTime;
    this.boom(t, 0.7, 60);
    setTimeout(() => this.boom(t, 0.4, 80), 200);
    setTimeout(() => this.boom(t, 0.25, 100), 400);
    return;
  }
  this._originalBoom.call(this, theme);
};

/* ---------- OVERRIDE DE startMusic POUR CHOISIR SELON LA SAISON ---------- */
SoundEngine._originalStartMusic = SoundEngine.startMusic;
SoundEngine.startMusic = function(mode) {
  const season = (typeof window !== "undefined") ? window.CURRENT_SEASON : "s1";
  if (mode === "menu" || mode === "solo" || mode === "1v1") {
    if (season === "s2") return this.startMusicSeasonal("s2");
    if (season === "s3") return this.startMusicSeasonal("s3");
  }
  this._originalStartMusic.call(this, mode);
};

/* ---------- RECHARGE AUTOMATIQUE QUAND LA SAISON CHANGE ---------- */
if (typeof window !== "undefined") {
  let lastSeason = null;
  setInterval(() => {
    const current = window.CURRENT_SEASON || "s1";
    if (current !== lastSeason && SoundEngine.currentMode) {
      const mode = SoundEngine.currentMode;
      SoundEngine.stopMusic(false);
      SoundEngine.startMusic(mode);
    }
    lastSeason = current;
  }, 500);
}
