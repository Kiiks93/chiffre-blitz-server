/* ============================================================
PANEL ADMIN
============================================================ */
function openAdminPanel() {
  window.open("admin.html", "cb_admin", "width=430,height=780");
}
function closeAdminPanel() {
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}
function authAdmin() {
  const passInput = document.getElementById("admin-password-input");
  const pass = passInput ? passInput.value : "";
  socket.emit("admin_auth", pass);
}
socket.on("admin_auth_fail", (msg) => {
  const errEl = document.getElementById("admin-login-error");
  if (errEl) errEl.innerText = msg || "Mot de passe incorrect";
});
socket.on("admin_auth_success", (data) => {
  const loginSec = document.getElementById("admin-login-section");
  const dashSec = document.getElementById("admin-dashboard-section");
  if (loginSec) loginSec.style.display = "none";
  if (dashSec) dashSec.style.display = "flex";
  renderAdminDashboard(data);
});

function renderAdminDashboard(data) {
  const dash = document.getElementById("admin-dashboard-section");
  if (!dash) return;
  dash.innerHTML = `
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
    <div class="roblox-card">
      <div style="font-weight: 900; color: #00d2ff; margin-bottom: 8px; font-size: 13px;">📢 Diffuseur d'Annonce</div>
      <input type="text" id="admin-broadcast-text" placeholder="Message global..." style="width: 100%; background: #0f051d; color: #fff; border: 2px solid #00d2ff; border-radius: 6px; padding: 8px; font-size: 11px; margin-bottom: 8px; box-sizing: border-box;">
      <button class="btn-main btn-blue" onclick="adminBroadcast()" style="width: 100%; padding: 8px; font-size: 11px; margin-top: 0;">Diffuser l'annonce 🚀</button>
    </div>

    <div class="roblox-card">
      <div style="font-weight: 900; color: #f8b500; margin-bottom: 8px; font-size: 13px;">🎁 Distribution de Cadeaux Admin</div>
      <div style="display: flex; gap: 6px; margin-bottom: 8px;">
        <select id="admin-target-type" onchange="toggleAdminTargetInput()" style="flex: 1; background: #0f051d; color: #fff; border: 2px solid #f8b500; border-radius: 6px; padding: 6px; font-size: 11px;">
          <option value="all">🌍 Tout le monde</option>
          <option value="pseudo">👤 Par Pseudo</option>
        </select>
        <input type="text" id="admin-target-pseudo" placeholder="Pseudo exact..." style="flex: 1; background: #0f051d; color: #fff; border: 2px solid #f8b500; border-radius: 6px; padding: 6px; font-size: 11px; display: none;">
      </div>
      <div style="display: flex; gap: 6px; margin-bottom: 8px;">
        <select id="admin-currency-type" style="flex: 1; background: #0f051d; color: #fff; border: 2px solid #f8b500; border-radius: 6px; padding: 6px; font-size: 11px;">
          <option value="coins">🪙 Pièces</option>
          <option value="points">⚡ Points</option>
          <option value="trophies">🏆 Trophées</option>
        </select>
        <input type="number" id="admin-amount" placeholder="Montant" value="100" style="flex: 1; background: #0f051d; color: #fff; border: 2px solid #f8b500; border-radius: 6px; padding: 6px; font-size: 11px;">
      </div>
      <button class="btn-main btn-gold" onclick="adminSendGift()" style="width: 100%; padding: 8px; font-size: 11px; margin-top: 0;">Envoyer le Cadeau ⚡</button>
    </div>

    <div class="roblox-card" style="border-color: #ff8a00;">
      <div style="font-weight: 900; color: #ff8a00; margin-bottom: 8px; font-size: 13px;">🗓️ Contrôle de Saison (override)</div>
      <div style="font-size: 10px; color: #aaa; margin-bottom: 6px;">Force la saison active pour <b>tous les joueurs</b>. L'override se réinitialise au redémarrage serveur.</div>
      <select id="admin-season-select" style="width: 100%; background: #0f051d; color: #fff; border: 2px solid #ff8a00; border-radius: 6px; padding: 8px; font-size: 12px; margin-bottom: 8px;">
        <option value="auto">⏱️ Auto (date réelle du serveur)</option>
        <option value="s1">🐱 S1 — Felin & Neon</option>
        <option value="s2">🎃 S2 — Halloween</option>
        <option value="s3">🎄 S3 — Noël</option>
      </select>
      <button class="btn-main" style="width: 100%; padding: 8px; font-size: 11px; margin-top: 0; background: linear-gradient(45deg, #ff8a00, #e52e71);" onclick="adminSetSeason()">Appliquer la saison 🎃</button>
    </div>
  </div>

  <div class="roblox-card" style="flex: 1; display: flex; flex-direction: column;">
    <div style="font-weight: 900; color: #38ef7d; margin-bottom: 8px; font-size: 13px;">⚡ Planification des Événements & Abuses</div>
    <div id="admin-schedules-container" style="flex: 1; overflow-y: auto; max-height: 250px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;"></div>
    <button class="btn-main btn-blue" onclick="saveAdminSchedules()" style="width: 100%; padding: 8px; font-size: 11px; margin-top: 0;">Sauvegarder les Configurations 💾</button>
  </div>`;
  renderAdminSchedules(data.schedules || {});
}

function toggleAdminTargetInput() {
  const type = document.getElementById("admin-target-type").value;
  const pseudoInput = document.getElementById("admin-target-pseudo");
  if (pseudoInput) pseudoInput.style.display = (type === "pseudo") ? "block" : "none";
}

function adminSendGift() {
  const targetType = document.getElementById("admin-target-type").value;
  const pseudo = document.getElementById("admin-target-pseudo").value.trim();
  const currency = document.getElementById("admin-currency-type").value;
  const amount = parseInt(document.getElementById("admin-amount").value) || 0;
  const target = (targetType === "all") ? "TOUS" : pseudo;
  if (targetType === "pseudo" && !pseudo) { alert("Entre un pseudo valide !"); return; }
  socket.emit("admin_give_gift", { targetUsername: target, currency, amount });
  showNotificationToast(`🎁 Don de ${amount} (${currency}) envoyé !`, "gift");
}

function adminBroadcast() {
  const text = document.getElementById("admin-broadcast-text").value.trim();
  if (!text) { alert("Entre un message d'annonce !"); return; }
  socket.emit("admin_broadcast_message", text);
  document.getElementById("admin-broadcast-text").value = "";
  showNotificationToast("📢 Annonce globale diffusée avec succès !", "announcement");
}

/* ============================================================
CONTRÔLE DE SAISON
============================================================ */
function adminSetSeason() {
  const select = document.getElementById("admin-season-select");
  if (!select) return;
  const seasonId = select.value;
  socket.emit("admin_set_season", seasonId);
}
socket.on("admin_season_result", (data) => {
  if (data && data.ok) {
    const names = { s1: "🐱 Felin & Neon", s2: "🎃 Halloween", s3: "🎄 Noël" };
    const label = names[data.season] || `Saison ${data.season}`;
    showNotificationToast(`🗓️ Saison forcée : <b>${label}</b>`, "gift");
  } else {
    showNotificationToast("❌ Erreur : saison non modifiée.", "announcement");
  }
});

/* ============================================================
ÉVÉNEMENTS & ABUSES (planification)
============================================================ */
function renderAdminSchedules(schedules) {
  const container = document.getElementById("admin-schedules-container");
  if (!container) return;
  container.innerHTML = "";
  const EVENT_NAMES = {
    coinRush: "🪙 Coin Rush (Pièces x2)",
    rankShield: "🛡️ Rank Shield (Zéro perte)",
    expressoMatch: "⚡ Expresso Match (20s)",
    chaosMode: "🌪️ Chaos Mode (Malus auto)",
    jackpotEclair: "🎁 Jackpot Éclair",
    tugOfWarMode: "🪢 Mode Corde Raide (Tug-of-War)"
  };
  for (let key in EVENT_NAMES) {
    const s = schedules[key] || { manual: false, start: null, end: null };
    const startStr = s.start ? new Date(s.start).toISOString().slice(0, 16) : "";
    const endStr = s.end ? new Date(s.end).toISOString().slice(0, 16) : "";
    const row = document.createElement("details");
    row.className = "admin-event-details";
    row.innerHTML = `
      <summary>${EVENT_NAMES[key]}</summary>
      <div style="display:flex; align-items:center; gap:8px; margin:6px 0 4px 0;">
        <label style="display:flex; align-items:center; gap:4px; cursor:pointer; font-size:10px; color:#aaa;">
          <input type="checkbox" id="admin-manual-${key}" ${s.manual ? "checked" : ""}> Actif (Forcé)
        </label>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#aaa; font-size:9px;">Début :</span>
          <input type="datetime-local" id="admin-start-${key}" value="${startStr}" style="background:#0f051d; color:#fff; border:1px solid #444; border-radius:4px; padding:2px 4px; font-size:10px;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#aaa; font-size:9px;">Fin :</span>
          <input type="datetime-local" id="admin-end-${key}" value="${endStr}" style="background:#0f051d; color:#fff; border:1px solid #444; border-radius:4px; padding:2px 4px; font-size:10px;">
        </div>
      </div>`;
    container.appendChild(row);
  }
}

function saveAdminSchedules() {
  const EVENT_KEYS = ["coinRush", "rankShield", "expressoMatch", "chaosMode", "jackpotEclair", "tugOfWarMode"];
  const schedulesData = {};
  EVENT_KEYS.forEach(key => {
    const manualEl = document.getElementById(`admin-manual-${key}`);
    const startEl = document.getElementById(`admin-start-${key}`);
    const endEl = document.getElementById(`admin-end-${key}`);
    if (manualEl && startEl && endEl) {
      schedulesData[key] = {
        manual: manualEl.checked,
        start: startEl.value ? new Date(startEl.value).getTime() : null,
        end: endEl.value ? new Date(endEl.value).getTime() : null
      };
    }
  });
  socket.emit("admin_update_schedule", schedulesData);
  showNotificationToast("✅ Programmation enregistrée avec succès !", "gift");
}

socket.on("admin_schedule_saved", () => {
  showNotificationToast("✅ Événements mis à jour côté serveur !", "gift");
});
