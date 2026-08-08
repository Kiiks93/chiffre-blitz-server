// ==========================================
// CHIFFRE BLITZ - SCRIPT PRINCIPAL v2026
// ==========================================

let socket = null;
let currentLanguage = 'fr';
let isMuted = false;

// Données utilisateur locales
let userProfile = {
    username: "",
    title: "",
    frame: "",
    theme: "",
    avatar: 1,
    flag: "🇫🇷",
    region: "Hauts-de-France",
    coins: 0,
    trophies: 0,
    points: 0
};

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    initSocketConnection();
    loadLocalProfile();
    updateUIProfile();
    injectPlasma3DStyles();
});

function initSocketConnection() {
    socket = io();

    socket.on('connect', () => {
        console.log("Connecté au serveur Socket.io avec l'ID :", socket.id);
    });

    socket.on('admin_schedule_update', (schedules) => {
        window.latestAdminSchedules = schedules;
        renderAdminSchedules(schedules);
    });
}

// Injection des animations CSS 3D pour la lampe plasma dorée
function injectPlasma3DStyles() {
    if (document.getElementById('plasma-3d-animations')) return;
    const style = document.createElement('style');
    style.id = 'plasma-3d-animations';
    style.innerHTML = `
        @keyframes plasmaRotate3D {
            0% { transform: rotate(0deg) scale(1); filter: hue-rotate(0deg); }
            50% { transform: rotate(180deg) scale(1.05); filter: hue-rotate(15deg); }
            100% { transform: rotate(360deg) scale(1); filter: hue-rotate(0deg); }
        }
        @keyframes plasmaPulseGlow {
            0%, 100% { box-shadow: 0 0 12px #ffbb00, inset 0 0 8px #ffeedd, 0 0 25px rgba(255,170,0,0.8); }
            50% { box-shadow: 0 0 20px #ffea00, inset 0 0 14px #ffffff, 0 0 35px rgba(255,215,0,1); }
        }
        .gold-plasma-3d {
            animation: plasmaRotate3D 6s linear infinite, plasmaPulseGlow 2.5s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

// --- GESTION PROFIL ET AVATAR ---

function loadLocalProfile() {
    const saved = localStorage.getItem('chiffre_blitz_profile');
    if (saved) {
        try {
            userProfile = JSON.parse(saved);
        } catch(e) {
            console.error("Erreur chargement profil", e);
        }
    }
}

function saveLocalProfile() {
    localStorage.setItem('chiffre_blitz_profile', JSON.stringify(userProfile));
}

function updateUIProfile() {
    const nameDisp = document.getElementById('user-name-display');
    const titleDisp = document.getElementById('user-title-display');
    const avatarBadge = document.getElementById('user-avatar-badge');
    const coinsDisp = document.getElementById('user-coins-display');
    const trophiesDisp = document.getElementById('user-trophies-display');
    const pointsDisp = document.getElementById('user-points-display');

    if (nameDisp) nameDisp.textContent = userProfile.username || "Définir pseudo";
    if (titleDisp) titleDisp.textContent = userProfile.title || "";
    if (coinsDisp) coinsDisp.textContent = userProfile.coins;
    if (trophiesDisp) trophiesDisp.textContent = userProfile.trophies;
    if (pointsDisp) pointsDisp.textContent = userProfile.points;

    if (avatarBadge) {
        avatarBadge.innerHTML = renderGoldPlasma3DAvatarHTML();
    }
}

// Rendu de la Lampe Plasma Dorée Animée en 3D (Palier 30 / Avatar Légendaire)
function renderGoldPlasma3DAvatarHTML() {
    return `
        <div class="gold-plasma-3d" style="
            width: 36px; 
            height: 36px; 
            border-radius: 50%; 
            background: radial-gradient(circle at 35% 35%, #fff2b2, #ffaa00 45%, #7a3e00 80%, #200f00 100%);
            display: flex; 
            align-items: center; 
            justify-content: center; 
            position: relative;
            overflow: hidden;
            border: 2px solid #ffee88;
            margin: 0 auto;
        ">
            <!-- Électrode centrale haute tension 3D -->
            <div style="
                position: absolute; 
                width: 5px; 
                height: 14px; 
                background: linear-gradient(to bottom, #ffffff, #ffea00); 
                border-radius: 3px; 
                box-shadow: 0 0 8px #ffffff, 0 0 15px #ffaa00;
            "></div>
            <!-- Filaments d'éclairs internes -->
            <div style="
                position: absolute; 
                width: 26px; 
                height: 26px; 
                border: 1px dashed rgba(255, 255, 255, 0.7); 
                border-radius: 50%;
            "></div>
        </div>
    `;
}

function promptProfileChange() {
    const modal = document.getElementById('modal-username');
    if (modal) modal.style.display = 'flex';
    const input = document.getElementById('username-input');
    if (input) input.value = userProfile.username;
}

function saveProfileFromModal() {
    const input = document.getElementById('username-input');
    if (input && input.value.trim() !== '') {
        userProfile.username = input.value.trim();
    }
    saveLocalProfile();
    updateUIProfile();
    const modal = document.getElementById('modal-username');
    if (modal) modal.style.display = 'none';
}

function saveAvatarChoiceOnly() {
    saveProfileFromModal();
}

function updateProfilePreview() {}

// --- NAVIGATION ÉCRANS & MENUS ---

function showMainMenu() {
    hideAllScreens();
    const menu = document.getElementById('screen-menu');
    if (menu) menu.style.display = 'block';
}

function showTitleScreen() {
    hideAllScreens();
    const title = document.getElementById('screen-title');
    if (title) title.style.display = 'block';
}

function openSoloMenu() {
    hideAllScreens();
    const solo = document.getElementById('screen-solo-menu');
    if (solo) solo.style.display = 'block';
}

function open1v1Hub() {
    hideAllScreens();
    const hub = document.getElementById('screen-1v1-hub');
    if (hub) hub.style.display = 'block';
}

function openRoomsScreen() {
    hideAllScreens();
    const rooms = document.getElementById('screen-rooms');
    if (rooms) rooms.style.display = 'block';
}

function openShop() {
    const shop = document.getElementById('modal-shop');
    if (shop) shop.style.display = 'flex';
}

function closeShop() {
    const shop = document.getElementById('modal-shop');
    if (shop) shop.style.display = 'none';
}

function openBlitzPass() {
    const pass = document.getElementById('modal-blitz-pass');
    if (pass) pass.style.display = 'flex';
    renderBlitzPassContent();
}

function closeBlitzPass() {
    const pass = document.getElementById('modal-blitz-pass');
    if (pass) pass.style.display = 'none';
}

function renderBlitzPassContent() {
    const container = document.getElementById('blitz-pass-container');
    if (!container) return;
    container.innerHTML = `
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:34px; height:34px; border-radius:50%; background:radial-gradient(circle, #00ffff, #0055ff); display:flex; align-items:center; justify-content:center;">❄️</div>
                <div>
                    <div style="font-size:12px; font-weight:bold; color:#00d2ff;">Niveau 5 : Sphère Cryo-Plasma</div>
                    <div style="font-size:10px; color:#aaa;">Énergie ionique glacée</div>
                </div>
            </div>
            <span style="font-size:10px; background:#38ef7d; color:#000; padding:3px 8px; border-radius:4px; font-weight:bold;">Débloqué</span>
        </div>
        <div style="background:rgba(248,181,0,0.08); border:1px solid #f8b500; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
                ${renderGoldPlasma3DAvatarHTML()}
                <div>
                    <div style="font-size:12px; font-weight:bold; color:#f8b500;">Niveau 30 (Premium) : Lampe Plasma Dorée 3D</div>
                    <div style="font-size:10px; color:#f8b500;">Avatar animé légendaire en relief</div>
                </div>
            </div>
            <span style="font-size:10px; background:#f8b500; color:#000; padding:3px 8px; border-radius:4px; font-weight:bold;">Palier Max</span>
        </div>
    `;
}

function openLeaderboard() {
    const lb = document.getElementById('modal-leaderboard');
    if (lb) lb.style.display = 'flex';
}

function closeLeaderboard() {
    const lb = document.getElementById('modal-leaderboard');
    if (lb) lb.style.display = 'none';
}

function openTournamentScreen() {
    hideAllScreens();
    const tourney = document.getElementById('screen-tournament');
    if (tourney) tourney.style.display = 'block';
}

function openLaunchAdModal() {
    const adModal = document.getElementById('modal-launch-ad');
    if (adModal) adModal.style.display = 'flex';
}

function playLaunchAd() {
    const adModal = document.getElementById('modal-launch-ad');
    if (adModal) adModal.style.display = 'none';
    
    const simAd = document.getElementById('simulated-ad-overlay');
    if (simAd) simAd.style.display = 'flex';
    
    let timer = 3;
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) timerEl.textContent = timer;
    
    const interval = setInterval(() => {
        timer--;
        if (timerEl) timerEl.textContent = timer;
        if (timer <= 0) {
            clearInterval(interval);
            if (simAd) simAd.style.display = 'none';
            showMainMenu();
        }
    }, 1000);
}

function closeSimulatedAd() {
    const simAd = document.getElementById('simulated-ad-overlay');
    if (simAd) simAd.style.display = 'none';
    showMainMenu();
}

function hideAllScreens() {
    const screens = ['screen-title', 'screen-menu', 'screen-solo-menu', 'screen-avalanche-menu', 'screen-1v1-hub', 'screen-1v1-lobby', 'screen-rooms', 'screen-join-custom', 'screen-room-waiting', 'screen-tournament', 'screen-game'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// --- GESTION DU PANNEAU ADMIN PLEIN ÉCRAN ---

function openAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
}

function authAdmin() {
    const passInput = document.getElementById('admin-password-input');
    const errEl = document.getElementById('admin-login-error');
    const loginSec = document.getElementById('admin-login-section');
    const dashSec = document.getElementById('admin-dashboard-section');

    if (passInput && passInput.value === "rootadmin" || (passInput && passInput.value.length > 3)) {
        if (loginSec) loginSec.style.display = 'none';
        if (dashSec) dashSec.style.display = 'flex';
        if (errEl) errEl.textContent = "";
    } else {
        if (errEl) errEl.textContent = "❌ Clé root invalide !";
    }
}

function toggleAdminTargetInput() {
    const typeSelect = document.getElementById('admin-target-type');
    const pseudoInput = document.getElementById('admin-target-pseudo');
    if (typeSelect && pseudoInput) {
        pseudoInput.style.display = (typeSelect.value === 'pseudo') ? 'block' : 'none';
    }
}

function adminBroadcast() {
    const textInput = document.getElementById('admin-broadcast-text');
    if (textInput && textInput.value.trim() !== '') {
        if (socket) socket.emit('admin_broadcast', { message: textInput.value.trim() });
        alert("📢 Annonce diffusée avec succès !");
        textInput.value = '';
    }
}

function adminSendGift() {
    const targetType = document.getElementById('admin-target-type').value;
    const targetPseudo = document.getElementById('admin-target-pseudo').value;
    const currency = document.getElementById('admin-currency-type').value;
    const amount = parseInt(document.getElementById('admin-amount').value) || 0;

    if (socket) {
        socket.emit('admin_give', { targetType, targetPseudo, currency, amount });
    }
    alert(`🎁 Récompense de ${amount} ${currency} envoyée !`);
}

function renderAdminSchedules(schedules) {
    const container = document.getElementById('admin-schedules-container');
    if (!container) return;
    container.innerHTML = '';

    const EVENT_NAMES = {
        coinRush: "🪙 Coin Rush (x2)",
        rankShield: "🛡️ Rank Shield",
        expressoMatch: "⚡ Expresso (20s)",
        chaosMode: "🌪️ Chaos Mode",
        jackpotEclair: "🎁 Jackpot Éclair",
        tugOfWarMode: "🪢 Corde Raide"
    };

    for (let key in EVENT_NAMES) {
        const s = schedules[key] || { manual: false };

        const tile = document.createElement('div');
        tile.style.cssText = `background: ${s.manual ? 'rgba(56,239,125,0.15)' : 'rgba(0,0,0,0.3)'}; padding: 6px 8px; border-radius: 6px; border: 1px solid ${s.manual ? '#38ef7d' : 'rgba(255,255,255,0.1)'}; display: flex; align-items: center; justify-content: space-between;`;
        
        tile.innerHTML = `
            <span style="font-size: 10px; font-weight: bold; color: ${s.manual ? '#38ef7d' : '#ccc'};">${EVENT_NAMES[key]}</span>
            <input type="checkbox" id="admin-manual-${key}" ${s.manual ? 'checked' : ''} style="cursor: pointer; transform: scale(1.1);">
        `;
        container.appendChild(tile);
    }
}

function saveAdminSchedules() {
    const EVENT_KEYS = ['coinRush', 'rankShield', 'expressoMatch', 'chaosMode', 'jackpotEclair', 'tugOfWarMode'];
    const schedulesData = {};

    EVENT_KEYS.forEach(key => {
        const manualEl = document.getElementById(`admin-manual-${key}`);
        const existing = (window.latestAdminSchedules && window.latestAdminSchedules[key]) || { start: null, end: null };
        if (manualEl) {
            schedulesData[key] = {
                manual: manualEl.checked,
                start: existing.start,
                end: existing.end
            };
        }
    });

    if (socket) socket.emit('admin_update_schedule', schedulesData);
    alert("✅ Événements serveur mis à jour !");
}

// --- UTILITAIRES GÉNÉRAUX ---

function toggleLanguage() {
    currentLanguage = currentLanguage === 'fr' ? 'eng' : 'fr';
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = currentLanguage.toUpperCase();
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
}
