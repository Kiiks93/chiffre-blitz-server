/* ============================================================
ADMIN.JS — Panneau d'administration Chiffre Blitz
Version propre — 18 septembre 2026
============================================================ */

// ============================================================
// CONFIGURATION
// ============================================================
const SERVER_URL = "https://chiffre-blitz-server.onrender.com";

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let socket = null;
let isAdmin = false;
let adminCatalog = { items: [], trophies: [] };
let currentEvents = {};
let currentSchedules = {};

// ============================================================
// HELPERS UI
// ============================================================
function $(id) { return document.getElementById(id); }

function showResult(elId, message, type = 'ok') {
    const el = $(elId);
    if (!el) return;
    el.textContent = message;
    el.className = 'result-box ' + type;
    if (type !== 'info') {
        setTimeout(() => { el.textContent = ''; el.className = 'result-box'; }, 8000);
    }
}

function showToast(message, color = '#00d2ff') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.background = color;
    t.style.color = '#000';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function setConnexionStatus(text, type = 'wait') {
    const el = $('connexion-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'connexion-status ' + type;
}

// ============================================================
// CONNEXION SOCKET.IO
// ============================================================
function connectSocket() {
    setConnexionStatus('🔄 Connexion serveur...', 'wait');

    socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 2000,
        timeout: 10000,
        auth: { isAdmin: false }
    });

    socket.on('connect', () => {
        setConnexionStatus('✅ Connecté au serveur — En attente d\'authentification...', 'ok');
        console.log('[admin] Connecté :', socket.id);

        // Tenter la reconnexion auto si mot de passe en mémoire
        const savedPw = sessionStorage.getItem('admin_pw');
        if (savedPw && !isAdmin) {
            socket.emit('admin_auth', savedPw);
        }
    });

    socket.on('disconnect', (reason) => {
        setConnexionStatus('❌ Déconnecté : ' + reason, 'ko');
        console.log('[admin] Déconnecté :', reason);
    });

    socket.on('connect_error', (err) => {
        setConnexionStatus('❌ Erreur connexion : ' + err.message, 'ko');
        console.error('[admin] Erreur connexion :', err.message);
    });

    // ============================================================
    // AUTHENTIFICATION ADMIN
    // ============================================================
    socket.on('admin_auth_success', (data) => {
        isAdmin = true;
        setConnexionStatus('🔓 ADMIN AUTHENTIFIÉ — Accès total', 'ok');
        $('login-screen').style.display = 'none';
        $('admin-panel').style.display = 'block';
        showToast('✅ Bienvenue, Administrateur !', '#00ff88');

        // Stocker les événements et schedules
        if (data && data.events) currentEvents = data.events;
        if (data && data.schedules) currentSchedules = data.schedules;

        // Charger les données initiales
        loadInitialData();
    });

    socket.on('admin_auth_fail', (message) => {
        isAdmin = false;
        showResult('login-result', '❌ ' + message, 'err');
        sessionStorage.removeItem('admin_pw');
        showToast('❌ ' + message, '#ff4b2b');
    });

    // ============================================================
    // COMPTEUR EN LIGNE
    // ============================================================
    socket.on('online_count', (data) => {
        const el = $('online-count');
        if (el) el.textContent = data.online;
    });

    // ============================================================
    // MAINTENANCE
    // ============================================================
    socket.on('maintenance_state', (data) => {
        $('maint-enabled').checked = data.enabled;
        $('maint-message').value = data.message || '';
        $('maint-bypass').value = data.bypassCode || '';
        const statusText = data.enabled
            ? `🔴 MAINTENANCE ACTIVE depuis ${data.since ? new Date(data.since).toLocaleTimeString('fr-FR') : '—'}`
            : '🟢 Maintenance inactive';
        showResult('maint-status', statusText, data.enabled ? 'err' : 'ok');
    });

    // ============================================================
    // JOURNAL DES TRANSACTIONS
    // ============================================================
    socket.on('admin_logs_data', (data) => {
        const container = $('logs-container');
        if (!container) return;
        container.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            showResult('logs-result', '📭 Aucune transaction trouvée.', 'info');
            return;
        }

        showResult('logs-result', `📜 ${data.rows.length} transaction(s) pour "${data.username || 'tous'}"`, 'ok');

        data.rows.forEach((row) => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            const date = row.created_at ? new Date(row.created_at).toLocaleString('fr-FR') : '—';
            const amountStr = row.amount !== null && row.amount !== undefined
                ? ` | ${row.amount > 0 ? '+' : ''}${row.amount} ${row.currency || ''}`
                : '';
            const balanceStr = row.balance_after !== null && row.balance_after !== undefined
                ? ` → Solde: ${row.balance_after}`
                : '';
            entry.innerHTML = `
                <div class="log-time">${date}</div>
                <div><span class="log-action">${row.action}</span>${amountStr}${balanceStr}</div>
                <div class="log-detail">${row.detail || ''}</div>
                <div style="font-size:10px;color:#888">${row.username} (${row.socket_id || '—'})</div>
            `;
            container.appendChild(entry);
        });
    });

    // ============================================================
    // CATALOGUE (objets + trophées)
    // ============================================================
    socket.on('admin_catalog', (data) => {
        adminCatalog = data || { items: [], trophies: [] };
        populateGiftSelect();
    });

    // ============================================================
    // RÉSULTATS DES ACTIONS ADMIN
    // ============================================================
    socket.on('admin_give_result', (data) => {
        showResult('gift-result', data.message, data.ok ? 'ok' : 'err');
    });

    socket.on('admin_reset_result', (data) => {
        if (data.ok) {
            showResult('reset-result',
                `✅ Nouveau code pour ${data.username} : ${data.newCode}`, 'ok');
        } else {
            showResult('reset-result', '❌ ' + data.message, 'err');
        }
    });

    socket.on('admin_season_result', (data) => {
        showResult('season-result',
            data.ok ? `✅ Saison forcée : ${data.season}` : '❌ Erreur',
            data.ok ? 'ok' : 'err');
    });

    socket.on('admin_season_dates', (dates) => {
        renderSeasonDates(dates);
    });

    socket.on('admin_schedule_saved', (schedules) => {
        currentSchedules = schedules;
        showResult('events-result', '✅ Configurations sauvegardées !', 'ok');
    });

    socket.on('admin_stats', (data) => {
        const el = $('online-count');
        if (el) el.textContent = data.online;
    });

    socket.on('admin_adjust_result', (data) => {
        showResult('adjust-result', data.message, data.ok ? 'ok' : 'err');
    });

    socket.on('admin_adv_result', (data) => {
        showResult('adv-result', data.message, data.ok ? 'ok' : 'err');
    });

    socket.on('admin_force_refresh_result', (data) => {
        showResult('adv-result', data.message, data.ok ? 'ok' : 'err');
    });

    socket.on('events_state_update', (events) => {
        currentEvents = events;
    });

    socket.on('seasons_updated', (dates) => {
        renderSeasonDates(dates);
    });
}

// ============================================================
// CHARGEMENT INITIAL
// ============================================================
function loadInitialData() {
    socket.emit('admin_get_maintenance');
    socket.emit('admin_get_stats');
    socket.emit('admin_get_catalog');
    socket.emit('admin_get_season_dates');

    // Charger les événements/schedules déjà reçus lors de l'auth
    renderEventsPanel();

    // Polling compteur en ligne toutes les 5s
    setInterval(() => {
        if (isAdmin && socket && socket.connected) {
            socket.emit('admin_get_stats');
        }
    }, 5000);
}

// ============================================================
// REMPLIR LE SELECT DES OBJETS POUR "ATTRIBUER"
// ============================================================
function populateGiftSelect() {
    const select = $('gift-item');
    if (!select) return;
    select.innerHTML = '';

    const kind = $('gift-kind').value;

    if (kind === 'trophy') {
        (adminCatalog.trophies || []).forEach((t) => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `🏆 ${t.name} (${t.id})`;
            select.appendChild(opt);
        });
    } else {
        (adminCatalog.items || []).forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.id} [${item.type}]`;
            select.appendChild(opt);
        });
    }
}

// ============================================================
// DATES DES SAISONS
// ============================================================
function renderSeasonDates(dates) {
    const container = $('season-dates-container');
    if (!container) return;
    container.innerHTML = '';

    if (!dates || !Array.isArray(dates)) return;

    const seasonNames = { s1: '🐱 S1 — Félin & Néon', s2: '🎃 S2 — Halloween', s3: '🎄 S3 — Noël' };

    dates.forEach((s) => {
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <label style="font-weight:800;color:#fff;font-size:13px">${seasonNames[s.id] || s.id} — ${s.name}</label>
            <div class="grid2">
                <div>
                    <label>Début</label>
                    <input type="date" id="sdate-${s.id}-start" value="${s.start || ''}">
                </div>
                <div>
                    <label>Fin</label>
                    <input type="date" id="sdate-${s.id}-end" value="${s.end || ''}">
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function collectSeasonDates() {
    const dates = {};
    ['s1', 's2', 's3'].forEach((id) => {
        const start = $(`sdate-${id}-start`);
        const end = $(`sdate-${id}-end`);
        if (start && end && start.value && end.value) {
            dates[id] = { start: start.value, end: end.value };
        }
    });
    return dates;
}

// ============================================================
// PANNEAU ÉVÉNEMENTS
// ============================================================
const EVENT_LABELS = {
    coinRush: '🪙 Coin Rush (Pièces x2)',
    rankShield: '🛡️ Rank Shield (Zéro perte)',
    expressoMatch: '⚡ Expresso Match (20s)',
    chaosMode: '🌪️ Chaos Mode (Malus aléatoires)',
    jackpotEclair: '🎁 Jackpot Éclair (Coffres)',
    tugOfWarMode: '🪢 Corde Raide (Tug-of-War)',
    halloweenMode: '🎃 Mode Halloween',
    noelMode: '🎄 Mode Noël'
};

function renderEventsPanel() {
    const container = $('events-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(EVENT_LABELS).forEach((key) => {
        const schedule = (currentSchedules && currentSchedules[key]) || {};
        const div = document.createElement('div');
        div.className = 'event-row';
        div.innerHTML = `
            <label>${EVENT_LABELS[key]}</label>
            <input type="datetime-local" id="ev-${key}-start" value="${formatDTLocal(schedule.start)}" title="Début">
            <input type="datetime-local" id="ev-${key}-end" value="${formatDTLocal(schedule.end)}" title="Fin">
            <input type="checkbox" id="ev-${key}-manual" ${schedule.manual ? 'checked' : ''} title="Forcer manuellement">
        `;
        container.appendChild(div);
    });
}

function formatDTLocal(ts) {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) { return ''; }
}

function collectEventsSchedules() {
    const schedules = {};
    Object.keys(EVENT_LABELS).forEach((key) => {
        const start = $(`ev-${key}-start`);
        const end = $(`ev-${key}-end`);
        const manual = $(`ev-${key}-manual`);
        schedules[key] = {
            manual: manual ? manual.checked : false,
            start: start && start.value ? new Date(start.value).getTime() : null,
            end: end && end.value ? new Date(end.value).getTime() : null
        };
    });
    return schedules;
}

// ============================================================
// BINDING DES BOUTONS
// ============================================================
function bindButtons() {

    // --- LOGIN ---
    $('btn-login').addEventListener('click', () => {
        const pw = $('admin-password').value.trim();
        if (!pw) {
            showResult('login-result', '❌ Entre le mot de passe.', 'err');
            return;
        }
        sessionStorage.setItem('admin_pw', pw);
        showResult('login-result', '⏳ Authentification...', 'info');
        if (socket && socket.connected) {
            socket.emit('admin_auth', pw);
        } else {
            showResult('login-result', '❌ Pas connecté au serveur.', 'err');
        }
    });

    $('admin-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') $('btn-login').click();
    });

    // --- MAINTENANCE ---
    $('btn-maint-save').addEventListener('click', () => {
        if (!isAdmin) return;
        socket.emit('admin_set_maintenance', {
            enabled: $('maint-enabled').checked,
            message: $('maint-message').value.trim(),
            bypassCode: $('maint-bypass').value.trim()
        });
        showResult('maint-result', '⏳ Enregistrement...', 'info');
        setTimeout(() => socket.emit('admin_get_maintenance'), 1500);
    });

    $('btn-maint-refresh').addEventListener('click', () => {
        if (!isAdmin) return;
        socket.emit('admin_get_maintenance');
    });

    // --- ANNONCE ---
    $('btn-announce').addEventListener('click', () => {
        if (!isAdmin) return;
        const msg = $('announce-msg').value.trim();
        if (!msg) {
            showResult('announce-result', '❌ Message vide.', 'err');
            return;
        }
        socket.emit('admin_broadcast_message', msg);
        showResult('announce-result', '✅ Annonce diffusée !', 'ok');
        $('announce-msg').value = '';
    });

    // --- AJUSTER DEVISES ---
    const adjustMode = $('adjust-mode');
    function updateAdjustVisibility() {
        const mode = adjustMode.value;
        $('adjust-pseudo-wrap').style.display = mode === 'pseudo' ? 'block' : 'none';
        $('adjust-count-wrap').style.display = mode === 'random' ? 'block' : 'none';
    }
    adjustMode.addEventListener('change', updateAdjustVisibility);
    updateAdjustVisibility();

    $('btn-adjust').addEventListener('click', () => {
        if (!isAdmin) return;
        const mode = adjustMode.value;
        const currency = $('adjust-currency').value;
        const amount = parseInt($('adjust-amount').value) || 0;
        const pseudo = $('adjust-pseudo').value.trim();
        const count = parseInt($('adjust-count').value) || 1;

        if (amount === 0) {
            showResult('adjust-result', '❌ Montant ne peut pas être 0.', 'err');
            return;
        }
        if (mode === 'pseudo' && !pseudo) {
            showResult('adjust-result', '❌ Pseudo requis.', 'err');
            return;
        }

        socket.emit('admin_adjust_currency', { mode, currency, amount, pseudo, count });
        showResult('adjust-result', '⏳ Application...', 'info');
    });

    // --- AVENTURE ---
    $('btn-adv-apply').addEventListener('click', () => {
        if (!isAdmin) return;
        const username = $('adv-username').value.trim();
        if (!username) {
            showResult('adv-result', '❌ Pseudo requis.', 'err');
            return;
        }

        const data = { username };

        const halloween = $('adv-halloween').checked;
        const noel = $('adv-noel').checked;
        if (halloween || noel) {
            data.halloween = halloween;
            data.noel = noel;
        }

        const stars = $('adv-stars').value;
        if (stars !== '') data.starsPerWorld = parseInt(stars);

        const floor = $('adv-floor').value;
        if (floor !== '') data.maxFloor = parseInt(floor);

        const lives = $('adv-lives').value;
        if (lives !== '') data.lives = parseInt(lives);

        const jtime = $('adv-jtime').value;
        if (jtime !== '') data.jokersTime = parseInt(jtime);

        const jshield = $('adv-jshield').value;
        if (jshield !== '') data.jokersShield = parseInt(jshield);

        socket.emit('admin_give_adventure', data);
        showResult('adv-result', '⏳ Application...', 'info');
    });

    $('btn-adv-unlock-all').addEventListener('click', () => {
        if (!isAdmin) return;
        const username = $('adv-username').value.trim();
        if (!username) {
            showResult('adv-result', '❌ Pseudo requis.', 'err');
            return;
        }
        socket.emit('admin_give_adventure', {
            username,
            halloween: true,
            noel: true,
            starsPerWorld: 240,
            maxFloor: 1800,
            lives: 10,
            jokersTime: 10,
            jokersShield: 10
        });
        showResult('adv-result', '⏓ Tout débloquer en cours...', 'info');
    });

    // --- JOURNAL ---
    $('btn-logs-search').addEventListener('click', () => {
        if (!isAdmin) return;
        const username = $('logs-username').value.trim();
        socket.emit('admin_get_logs', { username });
        showResult('logs-result', '⏳ Chargement...', 'info');
    });

    // --- ATTRIBUER OBJET ---
    $('gift-kind').addEventListener('change', populateGiftSelect);

    $('btn-gift').addEventListener('click', () => {
        if (!isAdmin) return;
        const username = $('gift-username').value.trim();
        const itemId = $('gift-item').value;
        const kind = $('gift-kind').value;

        if (!username) {
            showResult('gift-result', '❌ Pseudo requis.', 'err');
            return;
        }
        if (!itemId) {
            showResult('gift-result', '❌ Objet requis.', 'err');
            return;
        }

        socket.emit('admin_give_cosmetic', { username, itemId, kind });
        showResult('gift-result', '⏳ Attribution...', 'info');
    });

    // --- RESET CODE ---
    $('btn-reset').addEventListener('click', () => {
        if (!isAdmin) return;
        const username = $('reset-username').value.trim();
        const recoveryKey = $('reset-key').value.trim();

        if (!username || !recoveryKey) {
            showResult('reset-result', '❌ Pseudo et clé requis.', 'err');
            return;
        }

        socket.emit('admin_reset_password', { username, recoveryKey });
        showResult('reset-result', '⏳ Vérification...', 'info');
    });

    // --- SAISON ---
    $('btn-season').addEventListener('click', () => {
        if (!isAdmin) return;
        const seasonId = $('season-select').value;
        socket.emit('admin_set_season', seasonId);
        showResult('season-result', '⏳ Application...', 'info');
    });

    // --- DATES SAISONS ---
    $('btn-season-dates').addEventListener('click', () => {
        if (!isAdmin) return;
        const dates = collectSeasonDates();
        if (Object.keys(dates).length === 0) {
            showResult('season-dates-result', '❌ Aucune date définie.', 'err');
            return;
        }
        socket.emit('admin_set_season_dates', dates);
        showResult('season-dates-result', '⏳ Enregistrement...', 'info');
    });

    // --- ÉVÉNEMENTS ---
    $('btn-events-save').addEventListener('click', () => {
        if (!isAdmin) return;
        const schedules = collectEventsSchedules();
        socket.emit('admin_update_schedule', schedules);
        showResult('events-result', '⏳ Sauvegarde...', 'info');
    });
}

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    bindButtons();
    connectSocket();
});
