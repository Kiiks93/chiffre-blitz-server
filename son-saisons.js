/* ============================================================
MODULE SONS SAISONNIERS — Halloween 🎃 & Noël 🎄
(MENU = ambiance longue / GAME = version tendue)
============================================================ */

SoundEngine.startMusicSeasonal = function(key) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.timerId && this.currentMode === key) return;
  this.stopMusic(false);
  this.currentMode = key;
  this.step = 0;
  const bpms = { s2menu: 75, s2game: 100, s3menu: 110, s3game: 132 };
  this.bpm = bpms[key] || 100;
  const intervalMs = (60 / this.bpm / 4) * 1000;
  this.timerId = setInterval(() => {
    if (this.isMuted || !this.ctx || this.ctx.state !== "running") return;
    if (key === "s2menu") this.tickHalloweenMenu(this.step % 256);
    else if (key === "s2game") this.tickHalloweenGame(this.step % 128);
    else if (key === "s3menu") this.tickNoel(this.step % 128);
    else if (key === "s3game") this.tickNoel(this.step % 128);
    this.step = (this.step + 1) % 256;
  }, intervalMs);
};

/* ---------- HALLOWEEN MENU : chill-horreur LONG (~51s, 2 moitiés) ---------- */
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
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, t);
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

/* ---------- HALLOWEEN GAME : tendu, pulsé ---------- */
SoundEngine.tickHalloweenGame = function(step) {
  const t = this.ctx.currentTime
