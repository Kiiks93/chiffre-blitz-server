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
  this.bpm = (season === "s2") ? 75 : 120;
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
    { root: 55.00, pad: [110.00, 130.81, 164.81, 220.00] },
    { root: 43.65, pad: [87.31, 110.00, 130.81, 174.61] },
    { root: 36.71, pad: [73.42, 87.31, 110.00, 146.83] },
    { root: 41.20, pad: [82.41, 103.83, 123.47, 164.81] }
  ];
  const chord = chords[bar % 4];

  if (inBar === 0) this._heart(t, 0.16);
  if (inBar === 3) this._heart(t, 0.10);

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
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.022, t + 1.0);
      g.gain.linearRampToValueAtTime(0.0001, t + 3.6);
      o.connect(lp); lp.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 3.6);
    });
  }

  if (inBar === 8) {
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

  const melodySteps = { 2: 0, 6: 2, 10: 4, 14: 3 };
  if (melodySteps[inBar] !== undefined && bar % 2 === 1) {
    const scale = [220.00, 261.63, 329.63, 349.23, 415.30, 440.00];
    this._eerie(t, scale[melodySteps[inBar]], 0.05);
  }

  if (inBar === 6 || inBar === 12) {
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(600 + Math.random() * 500, t);
    f.Q.setValueAtTime(6, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
    noise.start(t);
  }

  if (inBar === 0) {
    const glow = document.getElementById('bg-glow');
    if (glow) {
      glow.style.opacity = '0.16';
      setTimeout(() => { glow.style.opacity = '0.06'; }, 600);
    }
  }
};

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
