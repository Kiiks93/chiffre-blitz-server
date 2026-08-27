/* ============================================================
FX — EFFETS VISUELS ET SONORES
============================================================ */

/* ---------- HELPERS ---------- */
function isMuted() {
  const muteBtn = document.getElementById("mute-btn");
  return !!(muteBtn && muteBtn.innerText.includes("🔇"));
}

/* ============================================================
FX ⚡ ÉCLAIR — arcs fractals (plein écran, partant des bords)
============================================================ */
let _efxCanvas = null, _efxCtx = null, _efxBolts = [];
let _arcAudio = null, _explosionAudio = null, _lastArcTime = 0;

function initElectricFx() {
  if (_efxCanvas) return;
  _efxCanvas = document.createElement("canvas");
  _efxCanvas.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:1;";
  document.body.appendChild(_efxCanvas);
  _efxCtx = _efxCanvas.getContext("2d");
  const resize = () => { _efxCanvas.width = innerWidth; _efxCanvas.height = innerHeight; };
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(efxLoop);
}

function efxLoop() {
  requestAnimationFrame(efxLoop);
  if (!_efxCtx) return;
  _efxCtx.clearRect(0, 0, _efxCanvas.width, _efxCanvas.height);
  if (_efxBolts.length === 0) return;
  _efxCtx.globalCompositeOperation = "lighter";
  _efxBolts = _efxBolts.filter(b => b.alpha > 0.05);
  for (const b of _efxBolts) { efxDrawBolt(b); b.alpha -= 0.08; }
  _efxCtx.globalCompositeOperation = "source-over";
}

function efxMakeBolt(x1, y1, x2, y2, gens, amp) {
  let pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  for (let g = 0; g < gens; g++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
      const dx = c.x - a.x, dy = c.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const off = (Math.random() - 0.5) * 2 * amp / (g + 1);
      mid.x += (-dy / len) * off; mid.y += (dx / len) * off;
      next.push(mid, c);
    }
    pts = next;
  }
  return pts;
}

function efxStroke(pts, color, width) {
  _efxCtx.strokeStyle = color; _efxCtx.lineWidth = width;
  _efxCtx.beginPath(); _efxCtx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) _efxCtx.lineTo(pts[i].x, pts[i].y);
  _efxCtx.stroke();
}

function efxDrawBolt(b) {
  _efxCtx.save();
  _efxCtx.globalAlpha = b.alpha;
  _efxCtx.shadowColor = "#FF8800"; _efxCtx.shadowBlur = 25;
  efxStroke(b.pts, "#FF8800", 6);
  efxStroke(b.pts, "#FFFFDD", 2);
  for (const br of b.branches) { efxStroke(br, "#FF8800", 3); efxStroke(br, "#FFFFDD", 1); }
  _efxCtx.restore();
}

function spawnLightningBurst(big) {
  initElectricFx();
  const w = innerWidth, h = innerHeight;
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let sx, sy;
    if (side === 0) { sx = Math.random() * w; sy = 0; }
    else if (side === 1) { sx = w; sy = Math.random() * h; }
    else if (side === 2) { sx = Math.random() * w; sy = h; }
    else { sx = 0; sy = Math.random() * h; }
    const tx = w * (0.3 + Math.random() * 0.4);
    const ty = h * (0.3 + Math.random() * 0.4);
    const pts = efxMakeBolt(sx, sy, tx, ty, 4, big ? 60 : 45);
    const branches = [];
    for (let j = 4; j < pts.length - 1; j += 4) {
      if (Math.random() < 0.6) {
        const p = pts[j];
        const a2 = Math.random() * Math.PI * 2;
        const l2 = 60 + Math.random() * 150;
        branches.push(efxMakeBolt(p.x, p.y, p.x + Math.cos(a2) * l2, p.y + Math.sin(a2) * l2, 2, 25));
      }
    }
    _efxBolts.push({ pts, branches, alpha: 1 });
  }
}

function clearElectricFx() { _efxBolts = []; }

function playElectricArcSound() {
  if (isMuted()) return;
  const now = Date.now();
  if (now - _lastArcTime < 90) return;
  _lastArcTime = now;
  if (!_arcAudio) _arcAudio = new Audio("sound/arc-electrical.mp3");
  _arcAudio.currentTime = 0; _arcAudio.volume = 0.85;
  _arcAudio.play().catch(() => {});
}

function playElectroExplosionSound() {
  if (isMuted()) return;
  if (!_explosionAudio) _explosionAudio = new Audio("sound/electro_explosion.wav");
  _explosionAudio.currentTime = 0; _explosionAudio.volume = 0.9;
  _explosionAudio.play().catch(() => {});
}

/* ============================================================
FX 🖤 OBSIDIENNE — rochers + débris + onde de choc (plein écran)
============================================================ */
let _obsCanvas = null, _obsCtx = null, _obsRocks = [], _obsDebris = [], _obsLanded = [], _obsWaves = [];
let _obsAudioCtx = null;

function initObsidianFx() {
  if (_obsCanvas) return;
  _obsCanvas = document.createElement("canvas");
  _obsCanvas.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:1;";
  document.body.appendChild(_obsCanvas);
  _obsCtx = _obsCanvas.getContext("2d");
  const resize = () => { _obsCanvas.width = innerWidth; _obsCanvas.height = innerHeight; };
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(obsLoop);
}

function obsDrawRock(x, y, rot) {
  _obsCtx.save();
  _obsCtx.translate(x, y); _obsCtx.rotate(rot);
  _obsCtx.shadowColor = "#ff2a4d"; _obsCtx.shadowBlur = 20;
  _obsCtx.beginPath();
  _obsCtx.moveTo(-34, -42.5); _obsCtx.lineTo(42.5, -34); _obsCtx.lineTo(59.5, 17);
  _obsCtx.lineTo(25.5, 42.5); _obsCtx.lineTo(-34, 42.5); _obsCtx.lineTo(-59.5, 0);
  _obsCtx.closePath();
  _obsCtx.fillStyle = "#14080a"; _obsCtx.fill();
  _obsCtx.strokeStyle = "#ff2a4d"; _obsCtx.lineWidth = 3; _obsCtx.stroke();
  _obsCtx.fillStyle = "rgba(255,77,109,0.25)";
  _obsCtx.beginPath(); _obsCtx.moveTo(-34, -42.5); _obsCtx.lineTo(42.5, -34); _obsCtx.lineTo(0, 0); _obsCtx.closePath(); _obsCtx.fill();
  _obsCtx.restore();
}

function obsLoop() {
  requestAnimationFrame(obsLoop);
  if (!_obsCtx) return;
  _obsCtx.clearRect(0, 0, _obsCanvas.width, _obsCanvas.height);
  for (const r of _obsLanded) obsDrawRock(r.x, r.y, r.rot);
  _obsRocks = _obsRocks.filter(r => r.active);
  for (const r of _obsRocks) {
    r.vy += 0.22; r.y += r.vy; r.rot += r.rotSpeed;
    obsDrawRock(r.x, r.y, r.rot);
    if (r.y >= r.landY) {
      r.active = false;
      _obsLanded.push({ x: r.x, y: r.landY, rot: r.rot });
      if (_obsLanded.length > 40) _obsLanded.shift();
      for (let i = 0; i < 12; i++) _obsDebris.push({ x: r.x, y: r.landY, vx: (Math.random() - 0.5) * 16, vy: -6 + Math.random() * 5, size: 2 + Math.random() * 5, alpha: 1 });
      _obsWaves.push({ x: r.x, y: r.landY, radius: 10, alpha: 1 });
      playObsidianImpactSound();
    }
  }
  _obsWaves = _obsWaves.filter(wv => wv.radius < 180 && wv.alpha > 0.05);
  for (const wv of _obsWaves) {
    wv.radius += 12; wv.alpha -= 0.06;
    _obsCtx.save(); _obsCtx.globalAlpha = wv.alpha;
    _obsCtx.strokeStyle = "#ff2a4d"; _obsCtx.lineWidth = 3;
    _obsCtx.shadowColor = "#ff2a4d"; _obsCtx.shadowBlur = 20;
    _obsCtx.beginPath(); _obsCtx.arc(wv.x, wv.y, wv.radius, 0, Math.PI * 2); _obsCtx.stroke();
    _obsCtx.restore();
  }
  _obsDebris = _obsDebris.filter(d => d.alpha > 0.02);
  for (const d of _obsDebris) {
    d.vy += 0.15; d.x += d.vx; d.y += d.vy; d.alpha -= 0.015;
    _obsCtx.save(); _obsCtx.globalAlpha = d.alpha; _obsCtx.fillStyle = "#ff2a4d";
    _obsCtx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size); _obsCtx.restore();
  }
}

function spawnObsidianRock() {
  initObsidianFx();
  const w = innerWidth, h = innerHeight;
  _obsRocks.push({ x: Math.random() * w, y: -120, vy: 0.4, rot: (Math.random() - 0.5) * 0.5, rotSpeed: (Math.random() - 0.5) * 0.03, landY: h * (0.35 + Math.random() * 0.6), active: true });
}

function clearObsidianFx() { _obsRocks = []; _obsDebris = []; _obsLanded = []; _obsWaves = []; }

function initObsidianAudio() {
  if (!_obsAudioCtx) _obsAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_obsAudioCtx.state === "suspended") _obsAudioCtx.resume();
}

function playObsidianImpactSound() {
  if (isMuted()) return;
  initObsidianAudio();
  const now = _obsAudioCtx.currentTime;
  const osc1 = _obsAudioCtx.createOscillator();
  const gain1 = _obsAudioCtx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(15, now + 0.5);
  gain1.gain.setValueAtTime(0.6, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc1.connect(gain1).connect(_obsAudioCtx.destination);
  osc1.start(now); osc1.stop(now + 0.5);
  const osc2 = _obsAudioCtx.createOscillator();
  const gain2 = _obsAudioCtx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(2400, now);
  osc2.frequency.exponentialRampToValueAtTime(400, now + 0.06);
  gain2.gain.setValueAtTime(0.4, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
  osc2.connect(gain2).connect(_obsAudioCtx.destination);
  osc2.start(now); osc2.stop(now + 0.06);
  const osc3 = _obsAudioCtx.createOscillator();
  const gain3 = _obsAudioCtx.createGain();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(120, now);
  osc3.frequency.exponentialRampToValueAtTime(20, now + 0.9);
  gain3.gain.setValueAtTime(0.8, now);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
  osc3.connect(gain3).connect(_obsAudioCtx.destination);
  osc3.start(now); osc3.stop(now + 0.9);
}

function playObsidianExplosionSound() {
  if (isMuted()) return;
  initObsidianAudio();
  const now = _obsAudioCtx.currentTime;
  const osc = _obsAudioCtx.createOscillator();
  const gain = _obsAudioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.9);
  gain.gain.setValueAtTime(1.0, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
  osc.connect(gain).connect(_obsAudioCtx.destination);
  osc.start(now); osc.stop(now + 0.9);
  const bufferSize = _obsAudioCtx.sampleRate * 0.6;
  const buffer = _obsAudioCtx.createBuffer(1, bufferSize, _obsAudioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = _obsAudioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = _obsAudioCtx.createGain();
  const filter = _obsAudioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(50, now + 0.6);
  noiseGain.gain.setValueAtTime(0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
  noise.connect(filter).connect(noiseGain).connect(_obsAudioCtx.destination);
  noise.start(now); noise.stop(now + 0.6);
}
