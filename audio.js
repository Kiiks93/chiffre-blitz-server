const SoundEngine = {
ctx: null, isMuted: false, timerId: null, currentMode: null, step: 0, bpm: 115,
init() {
try {
if (!this.ctx) {
const AudioCtx = window.AudioContext || window.webkitAudioContext;
this.ctx = new AudioCtx();
}
if (this.ctx.state === "suspended") this.ctx.resume();
} catch (e) {}
},
toggleMute() {
this.isMuted = !this.isMuted;
if (this.isMuted) this.stopMusic(false);
else if (this.currentMode) this.startMusic(this.currentMode);
return this.isMuted;
},
playClick() {
if (this.isMuted) return;
this.init();
if (!this.ctx) return;
const t = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "square";
osc.frequency.setValueAtTime(440, t);
osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
gain.gain.setValueAtTime(0.1, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.05);
},
playError() {
if (this.isMuted) return;
this.init();
if (!this.ctx) return;
const t = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "sawtooth";
osc.frequency.setValueAtTime(120, t);
osc.frequency.linearRampToValueAtTime(60, t + 0.12);
gain.gain.setValueAtTime(0.15, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.12);
},
playVictory() {
if (this.isMuted) return;
this.init();
if (!this.ctx) return;
[523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
setTimeout(() => {
if (this.isMuted || !this.ctx) return;
const t = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "square";
osc.frequency.setValueAtTime(freq, t);
gain.gain.setValueAtTime(0.12, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.25);
}, i * 80);
});
},
stopMusic(clear = true) {
if (this.timerId) clearInterval(this.timerId);
this.timerId = null;
if (clear) this.currentMode = null;
},
startMusic(mode) {
if (this.isMuted) return;
this.init();
if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
if (this.timerId && this.currentMode === mode) return;
this.stopMusic(false);
this.currentMode = mode;
this.step = 0;
this.bpm = (mode === "menu") ? 108 : 138;
const intervalMs = (60 / this.bpm / 4) * 1000;
this.timerId = setInterval(() => {
if (this.isMuted || !this.ctx || this.ctx.state !== "running") return;
if (this.currentMode === "menu") this.tickMenu8Bit(this.step);
else this.tickGeometryDash(this.step);
this.step = (this.step + 1) % 128;
}, intervalMs);
},
tickMenu8Bit(step) {
const t = this.ctx.currentTime;
const bar = Math.floor(step / 16);
const inBar = step % 16;
const chords = [
{ root: 110.00, notes: [220.00, 261.63, 329.63] },
{ root: 87.31, notes: [174.61, 220.00, 261.63] },
{ root: 130.81, notes: [261.63, 329.63, 392.00] },
{ root: 98.00, notes: [196.00, 246.94, 293.66] }
];
const chord = chords[bar % 4];
if (inBar === 0 || inBar === 8) {
const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
osc.type = 'sine';
osc.frequency.setValueAtTime(150, t);
osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
gain.gain.setValueAtTime(0.16, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.12);
}
if (inBar % 4 === 2) {
const bufferSize = this.ctx.sampleRate * 0.03;
const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
const filter = this.ctx.createBiquadFilter();
filter.type = 'highpass'; filter.frequency.setValueAtTime(6000, t);
const gain = this.ctx.createGain();
gain.gain.setValueAtTime(0.025, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
noise.start(t);
}
if (inBar % 2 === 0) {
const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(chord.root, t);
filter.type = 'lowpass';
filter.frequency.setValueAtTime(600, t);
filter.frequency.exponentialRampToValueAtTime(180, t + 0.1);
gain.gain.setValueAtTime(0.055, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.11);
}
if (inBar % 2 === 0) {
const melodyA = [
[440, 493.88, 523.25, 659.25, 587.33, 523.25, 493.88, 440],
[349.23, 392, 440, 523.25, 440, 392, 349.23, 392],
[392, 440, 392, 329.63, 261.63, 293.66, 329.63, 392],
[293.66, 329.63, 369.99, 392, 369.99, 329.63, 293.66, 246.94]
];
const melodyB = [
[659.25, 587.33, 523.25, 493.88, 523.25, 587.33, 659.25, 523.25],
[523.25, 440, 392, 440, 523.25, 440, 392, 349.23],
[392, 329.63, 261.63, 329.63, 392, 523.25, 493.88, 392],
[293.66, 392, 493.88, 587.33, 493.88, 392, 293.66, 0]
];
const table = (bar < 4) ? melodyA : melodyB;
const note = table[bar % 4][inBar / 2];
if (note > 0) {
const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(note, t);
filter.type = 'lowpass';
filter.frequency.setValueAtTime(1600, t);
filter.frequency.exponentialRampToValueAtTime(500, t + 0.22);
gain.gain.setValueAtTime(0.04, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.32);
}
}
if (inBar === 0) {
chord.notes.forEach((f) => {
const o = this.ctx.createOscillator(), g = this.ctx.createGain();
o.type = 'triangle';
o.frequency.setValueAtTime(f, t);
g.gain.setValueAtTime(0.0001, t);
g.gain.linearRampToValueAtTime(0.015, t + 0.4);
g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
o.connect(g); g.connect(this.ctx.destination);
o.start(t); o.stop(t + 2.2);
});
const glow = document.getElementById('bg-glow');
if (glow) {
glow.style.opacity = '0.22';
setTimeout(() => { glow.style.opacity = '0.08'; }, 350);
}
}
},
tickGeometryDash(step) {
const t = this.ctx.currentTime;
if (step % 16 === 0) {
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "sine";
osc.frequency.setValueAtTime(160, t);
osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
gain.gain.setValueAtTime(0.28, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.13);
}
if (step % 16 === 8) {
const bufferSize = this.ctx.sampleRate * 0.08;
const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
const filter = this.ctx.createBiquadFilter();
filter.type = "bandpass";
filter.frequency.setValueAtTime(2500, t);
filter.Q.setValueAtTime(2, t);
const gain = this.ctx.createGain();
gain.gain.setValueAtTime(0.18, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
noise.start(t);
}
const gdNotes = [220, 261.63, 329.63, 440, 523.25, 659.25, 523.25, 440];
const osc = this.ctx.createOscillator();
const filter = this.ctx.createBiquadFilter();
const gain = this.ctx.createGain();
osc.type = "sawtooth";
osc.frequency.setValueAtTime(gdNotes[step % gdNotes.length], t);
filter.type = "lowpass";
filter.frequency.setValueAtTime(1400, t);
filter.frequency.exponentialRampToValueAtTime(300, t + 0.07);
gain.gain.setValueAtTime(0.08, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.07);
}
};
function toggleMute() {
const muted = SoundEngine.toggleMute();
const muteBtn = document.getElementById("mute-btn");
if (muteBtn) muteBtn.innerText = muted ? "🔇" : "🔊";
}
document.addEventListener("click", () => { SoundEngine.init(); }, { once: true });
