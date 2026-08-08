// ==========================================
// CHIFFRE BLITZ - SCRIPT PRINCIPAL v2026
// ==========================================

let socket = null;
let currentLanguage = 'fr';
let isMuted = false;

// Données utilisateur locales
let myProfile = {
    username: localStorage.getItem('cb_username') || "",
    region: localStorage.getItem('cb_region') || "Hauts-de-France",
    avatar: parseInt(localStorage.getItem('cb_avatar')) || 1,
    flag: localStorage.getItem('cb_flag') || "🇫🇷",
    points: 0, coins: 0, trophies: 0, wins: 0, losses: 0, 
    inventory: {
        __equipped: {
            title: localStorage.getItem('cb_equipped_title') || "",
            frame: localStorage.getItem('cb_equipped_frame') || "",
            theme: localStorage.getItem('cb_equipped_theme') || "",
            avatar: localStorage.getItem('cb_equipped_avatar') || ""
        }
    }, 
    unlocked_items: [], equippedPower: null, equippedPowers: [],
    blitzPassPremium: false,
    claimedPassTiers: {}
};

let cachedOpponent = null;
let adCallbackFunction = null;
let selectedRankedItems = [];
let latestGlobalEvents = {};
let latest1v1StartData = null;
let pendingGameOverData = null;
let activeAvatarChoice = 'standard';
let currentFriendFilter = 'all';
let myGameInvites = [];
window.lastRequestsCount = 0;

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    initSocketConnection();
    loadLocalProfile();
    updateEconomyUI();
    checkAndShowProfileModal();
    injectPlasma3DStyles();

    const mainLogo = document.querySelector('h1');
    if (mainLogo) {
        let logoClickCount = 0;
        let logoClickTimer = null;
        mainLogo.addEventListener('click', () => {
            logoClickCount++;
            clearTimeout(logoClickTimer);
            logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 2500);
            if (logoClickCount >= 10) { logoClickCount = 0; openAdminPanel(); }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const targetRoom = urlParams.get('room');
    if (targetRoom) {
        setTimeout(() => { if (isProfileValid()) openJoinCustomScreen(targetRoom.toUpperCase()); }, 1000);
    }
});

function initSocketConnection() {
    // Connexion au serveur Socket.io
    socket = io("https://chiffre-blitz-server.onrender.com", {
        reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000
    });

    socket.on('disconnect', () => { SoundEngine.stopMusic(true); });

    socket.on('connect', () => {
        registerIfPossible();
        const urlParams = new URLSearchParams(window.location.search);
        const targetRoom = urlParams.get('room');
        if (targetRoom && isProfileValid()) {
            setTimeout(() => { joinRoomDirect(targetRoom.toUpperCase(), ''); }, 500);
        }
    });

    socket.on('admin_schedule_update', (schedules) => {
        window.latestAdminSchedules = schedules;
        renderAdminSchedules(schedules);
    });

    socket.on('admin_gift_received', (data) => {
        const msg = data.message || `🎁 Cadeau reçu de l'Administrateur !`;
        showNotificationToast(`🎁 <b>CADEAU ADMIN REÇU !</b><br>` + msg, 'gift');
        registerIfPossible();
    });

    socket.on('global_announcement', (msg) => {
        showNotificationToast(`📢 <b>ANNONCE GLOBALE :</b><br>` + msg, 'announcement');
    });

    socket.on('events_state_update', (events) => {
        latestGlobalEvents = events;
        const banner = document.getElementById('player-event-banner');
        const towBtn = document.getElementById('btn-tow-menu');
        if (towBtn) towBtn.style.display = events.tugOfWarMode ? 'flex' : 'none';
        if (!banner) return;

        let activeList = [];
        if (events.coinRush) activeList.push("🪙 <b>Coin Rush</b> (Pièces x2)");
        if (events.rankShield) activeList.push("🛡️ <b>Rank Shield</b> (Zéro perte de points en classé)");
        if (events.expressoMatch) activeList.push("⚡ <b>Expresso Match</b> (Parties rapides en 20s pour le 1v1 Online Non Classé)");
        if (events.chaosMode) activeList.push("🌪️ <b>Chaos Mode</b> (Modificateurs aléatoires en non classé)");
        if (events.jackpotEclair) activeList.push("🎁 <b>Jackpot Éclair</b> (Coffres mystères)");
        if (events.tugOfWarMode) activeList.push("🪢 <b>Mode Exclusif : Corde Raide (Tug-of-War)</b>");

        if (activeList.length > 0) {
            banner.innerHTML = `⚡ <b>ADMIN ABUSE EN COURS :</b><br>` + activeList.join("<br>");
            banner.style.display = 'block';
        } else { banner.style.display = 'none'; }
    });
}

// --- GESTION DES ANIMATIONS ET STYLES 3D (LAMPE PLASMA DORÉE) ---
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

// --- GESTION PROFIL ET AVATARS ÉNERGÉTIQUES ---

function loadLocalProfile() {
    const savedName = localStorage.getItem('cb_username');
    if (savedName) myProfile.username = savedName;
    const savedRegion = localStorage.getItem('cb_region');
    if (savedRegion) myProfile.region = savedRegion;
    const savedAvatar = localStorage.getItem('cb_avatar');
    if (savedAvatar) myProfile.avatar = parseInt(savedAvatar) || 1;
    const savedFlag = localStorage.getItem('cb_flag');
    if (savedFlag) myProfile.flag = getFlagEmoji(savedFlag);
}

function saveLocalPreferences() {
    localStorage.setItem('cb_username', myProfile.username);
    localStorage.setItem('cb_region', myProfile.region);
    localStorage.setItem('cb_avatar', myProfile.avatar);
    localStorage.setItem('cb_flag', myProfile.flag);
}

function isItemUnlocked(itemId) {
    return myProfile.unlocked_items && myProfile.unlocked_items.includes(itemId);
}

function equipAvatar(itemId) {
    if (isItemUnlocked(itemId)) {
        if (!myProfile.inventory) myProfile.inventory = {};
        if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
        myProfile.inventory.__equipped.avatar = itemId;
        localStorage.setItem('cb_equipped_avatar', itemId);
        socket.emit('equip_cosmetic', itemId);
        updateEconomyUI();
        showNotificationToast("✅ Avatar énergétique équipé avec succès !", "gift");
    } else {
        showNotificationToast("🔒 Cet avatar n'est pas encore débloqué ! Atteignez le palier requis dans le Passe de Combat.", "announcement");
    }
}

function renderGoldPlasma3DAvatarHTML() {
    return `
        <div class="gold-plasma-3d" style="width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff2b2, #ffaa00 45%, #7a3e00 80%, #200f00 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 2px solid #ffee88; margin: 0 auto;">
            <div style="position: absolute; width: 4px; height: 12px; background: linear-gradient(to bottom, #ffffff, #ffea00); border-radius: 2px; box-shadow: 0 0 6px #ffffff, 0 0 10px #ffaa00;"></div>
        </div>
    `;
}

function renderCryoPlasmaAvatarHTML() {
    return `
        <div style="width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #00ffff, #0055ff 60%, #02020a 90%); box-shadow: 0 0 10px #00d2ff; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 2px solid #80e5ff; margin: 0 auto;">
            <div style="position: absolute; width: 5px; height: 5px; background: #ffffff; border-radius: 50%; box-shadow: 0 0 6px #fff, 0 0 10px #00ffff;"></div>
        </div>
    `;
}

function getFlagEmoji(flag) {
    if (!flag) return '🇫🇷';
    let cleanFlag = flag.replace(/['"]/g, '').trim();
    if (cleanFlag.length === 2) {
        try {
            const codePoints = cleanFlag.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
            return String.fromCodePoint(...codePoints);
        } catch(e) { return '🇫🇷'; }
    }
    return cleanFlag;
}

function parsePlayer(p) {
    if (!p) return {};
    return {
        id: p.id || '',
        username: p.username || p.name || p.pseudo || 'Joueur',
        region: p.region || 'Hauts-de-France',
        points: Number(p.points !== undefined ? p.points : 0),
        coins: Number(p.coins !== undefined ? p.coins : 0),
        trophies: Number(p.trophies !== undefined ? p.trophies : 0),
        wins: Number(p.wins !== undefined ? p.wins : 0),
        losses: Number(p.losses !== undefined ? p.losses : 0),
        avatar: Number(p.avatar !== undefined ? p.avatar : 1),
        flag: getFlagEmoji(p.flag),
        inventory: p.inventory || {},
        unlocked_items: p.unlocked_items || [],
        equippedPower: p.equippedPower || p.equipped_power || null,
        blitzPassPremium: p.blitzPassPremium || false,
        claimedPassTiers: p.claimedPassTiers || {}
    };
}

function getRankName(points) {
    if (points >= 1300) return currentLanguage === 'fr' ? 'Calculateur ⚡' : 'Calculator ⚡';
    if (points >= 700)  return currentLanguage === 'fr' ? 'Expert 🧠' : 'Expert 🧠';
    if (points >= 300)  return currentLanguage === 'fr' ? 'Chiffre 🔢' : 'Cipher 🔢';
    return currentLanguage === 'fr' ? 'Novice 🌱' : 'Novice 🌱';
}

function getAvatarBadgeHTML(flag, avatarNum, overrideAvatarType, playerObj) {
    const profile = playerObj || myProfile;
    const equippedAvatar = overrideAvatarType || (profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.avatar);
    const equippedFrame = profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.frame;
    
    if (!playerObj) {
        const pill = document.getElementById('user-pill');
        if (pill) {
            pill.classList.remove('silver-frame', 'gold-frame', 'animated-frame');
            if (equippedFrame === 'frame_silver') pill.classList.add('silver-frame');
            if (equippedFrame === 'frame_gold') pill.classList.add('gold-frame');
            if (equippedFrame === 'frame_animated') pill.classList.add('animated-frame');
        }
    }
    
    if (equippedAvatar === 'gold_plasma_3d' && isItemUnlocked('gold_plasma_3d')) {
        return `
            <div class="tft-avatar-container gold-frame" title="Lampe Plasma Dorée 3D">
                ${renderGoldPlasma3DAvatarHTML()}
                <span class="tft-flag-overlay">${flag || '🇫🇷'}</span>
            </div>
        `;
    }
    if (equippedAvatar === 'cryo_plasma' && isItemUnlocked('cryo_plasma')) {
        return `
            <div class="tft-avatar-container" title="Sphère Cryo-Plasma">
                ${renderCryoPlasmaAvatarHTML()}
                <span class="tft-flag-overlay">${flag || '🇫🇷'}</span>
            </div>
        `;
    }

    let avatarContent = avatarNum || 1;
    let avatarTitle = `Avatar #${avatarNum || 1}`;
    if (equippedAvatar === 'avatar_legend') { avatarContent = '🤖'; avatarTitle = 'Robot Mathématicien'; }

    const isGold = equippedFrame === 'frame_gold';
    const isSilver = equippedFrame === 'frame_silver';
    const isAnimated = equippedFrame === 'frame_animated';

    return `
        <div class="tft-avatar-container ${isGold ? 'gold-frame' : ''} ${isSilver ? 'silver-frame' : ''} ${isAnimated ? 'animated-frame' : ''}" title="${avatarTitle}">
            <span class="tft-avatar-icon" style="${typeof avatarContent === 'number' ? 'font-size: 14px;' : 'font-size: 16px;'}">${avatarContent}</span>
            <span class="tft-flag-overlay">${flag || '🇫🇷'}</span>
        </div>
    `;
}

function getLargeAvatarBadgeHTML(flag, avatarNum, overrideAvatarType) {
    const avatarType = overrideAvatarType || activeAvatarChoice || (myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar);
    if (avatarType === 'gold_plasma_3d' && isItemUnlocked('gold_plasma_3d')) return renderGoldPlasma3DAvatarHTML();
    if (avatarType === 'cryo_plasma' && isItemUnlocked('cryo_plasma')) return renderCryoPlasmaAvatarHTML();

    let avatarContent = avatarNum || 1;
    if (avatarType === 'avatar_legend') avatarContent = '🤖';

    return `
        <div class="tft-avatar-large">
            <span class="tft-avatar-large-icon" style="${typeof avatarContent === 'number' ? 'font-size: 24px;' : 'font-size: 30px;'}">${avatarContent}</span>
            <span class="tft-flag-large-overlay">${flag || '🇫🇷'}</span>
        </div>
    `;
}

function updateProfilePreview() {
    const avatarNum = parseInt(document.getElementById('avatar-input').value) || 1;
    const rawFlag = document.getElementById('flag-input').value;
    const flag = getFlagEmoji(rawFlag);
    const previewContainer = document.getElementById('modal-avatar-preview');
    if (previewContainer) previewContainer.innerHTML = getLargeAvatarBadgeHTML(flag, avatarNum, activeAvatarChoice);
}

function renderProfileAvatarSelector() {
    const container = document.getElementById('profile-avatar-selector');
    if (!container) return;
    container.innerHTML = '';

    const isStandardActive = (activeAvatarChoice === 'standard' || !activeAvatarChoice);
    const stdCard = document.createElement('div');
    stdCard.style.cssText = `flex: 1; min-width: 90px; background: ${isStandardActive ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.05)'}; border: 2px solid ${isStandardActive ? '#00d2ff' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; padding: 4px; text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;`;
    stdCard.onclick = () => { activeAvatarChoice = 'standard'; renderProfileAvatarSelector(); updateProfilePreview(); };
    stdCard.innerHTML = `<span style="font-size: 13px;">🔢</span><div style="font-size: 9px; font-weight: bold; color: #fff;">Standard</div>`;
    container.appendChild(stdCard);

    if (isItemUnlocked('cryo_plasma')) {
        const isCryoActive = (activeAvatarChoice === 'cryo_plasma');
        const cryoCard = document.createElement('div');
        cryoCard.style.cssText = `flex: 1; min-width: 90px; background: ${isCryoActive ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.05)'}; border: 2px solid ${isCryoActive ? '#00d2ff' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; padding: 4px; text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;`;
        cryoCard.onclick = () => { activeAvatarChoice = 'cryo_plasma'; renderProfileAvatarSelector(); updateProfilePreview(); };
        cryoCard.innerHTML = `<span style="font-size: 13px;">❄️</span><div style="font-size: 9px; font-weight: bold; color: #fff;">Cryo</div>`;
        container.appendChild(cryoCard);
    }

    if (isItemUnlocked('gold_plasma_3d')) {
        const isGoldActive = (activeAvatarChoice === 'gold_plasma_3d');
        const goldCard = document.createElement('div');
        goldCard.style.cssText = `flex: 1; min-width: 90px; background: ${isGoldActive ? 'rgba(248,181,0,0.2)' : 'rgba(255,255,255,0.05)'}; border: 2px solid ${isGoldActive ? '#f8b500' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; padding: 4px; text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;`;
        goldCard.onclick = () => { activeAvatarChoice = 'gold_plasma_3d'; renderProfileAvatarSelector(); updateProfilePreview(); };
        goldCard.innerHTML = `<span style="font-size: 13px;">⚡</span><div style="font-size: 9px; font-weight: bold; color: #f8b500;">Plasma 3D</div>`;
        container.appendChild(goldCard);
    }
}

const TITLE_DISPLAY_NAMES = {
    'title_plasma_initiate': '⚡ Initié du Plasma',
    'title_flux_master': '⚡ Maître des Flux',
    'title_lightning_pro': '⚡ Pro de l\'Éclair',
    'title_free_electron': '⚡ Électron Libre',
    'title_brain_overload': '⚡ Surcharge Mentale',
    'title_legend': '👑 Légende'
};

const FRAME_DISPLAY_NAMES = {
    'frame_silver': '🛡️ Cadre de Profil Argenté',
    'frame_gold': '👑 Cadre Or Massif',
    'frame_animated': '✨ Cadre Animé de Saison'
};

const THEME_DISPLAY_NAMES = {
    'theme_alt': '🎨 Thème Rétro (Plasma)'
};

function renderProfileCustomizationMenus() {
    const titleSelect = document.getElementById('title-input');
    const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
    
    if (titleSelect) {
        titleSelect.innerHTML = `<option value="">Aucun titre actif</option>`;
        const unlockedTitles = (myProfile.unlocked_items || []).filter(id => id.startsWith('title_'));
        unlockedTitles.forEach(tId => {
            const displayName = TITLE_DISPLAY_NAMES[tId] || tId;
            const opt = document.createElement('option');
            opt.value = tId; opt.innerText = displayName;
            if (equippedTitle === tId) opt.selected = true;
            titleSelect.appendChild(opt);
        });
    }

    const frameSelect = document.getElementById('frame-input');
    const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
    if (frameSelect) {
        frameSelect.innerHTML = `<option value="">Aucun cadre (Défaut)</option>`;
        const unlockedFrames = (myProfile.unlocked_items || []).filter(id => id.startsWith('frame_'));
        unlockedFrames.forEach(fId => {
            const displayName = FRAME_DISPLAY_NAMES[fId] || fId;
            const opt = document.createElement('option');
            opt.value = fId; opt.innerText = displayName;
            if (equippedFrame === fId) opt.selected = true;
            frameSelect.appendChild(opt);
        });
    }

    const themeSelect = document.getElementById('theme-input');
    const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
    if (themeSelect) {
        themeSelect.innerHTML = `<option value="">Thème de grille standard</option>`;
        const unlockedThemes = (myProfile.unlocked_items || []).filter(id => id.startsWith('theme_'));
        unlockedThemes.forEach(thId => {
            const displayName = THEME_DISPLAY_NAMES[thId] || thId;
            const opt = document.createElement('option');
            opt.value = thId; opt.innerText = displayName;
            if (equippedTheme === thId) opt.selected = true;
            themeSelect.appendChild(opt);
        });
    }

    renderProfileAvatarSelector();
}

function updateEconomyUI() {
    const coinsEl = document.getElementById('user-coins-display');
    const trophiesEl = document.getElementById('user-trophies-display');
    const rankEl = document.getElementById('user-rank-display');
    const pointsEl = document.getElementById('user-points-display');
    const nameEl = document.getElementById('user-name-display');
    const titleEl = document.getElementById('user-title-display');
    const avatarBadge = document.getElementById('user-avatar-badge');

    if (coinsEl) coinsEl.innerText = myProfile.coins;
    if (trophiesEl) trophiesEl.innerText = myProfile.trophies;
    if (rankEl) rankEl.innerText = getRankName(myProfile.points);
    if (pointsEl) pointsEl.innerText = myProfile.points;
    if (nameEl) nameEl.innerText = myProfile.username || "Définir";

    const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
    if (titleEl) titleEl.innerText = equippedTitle ? `[ ${TITLE_DISPLAY_NAMES[equippedTitle] || equippedTitle} ]` : "";

    if (avatarBadge) {
        avatarBadge.innerHTML = getAvatarBadgeHTML(myProfile.flag, myProfile.avatar);
    }
    updateShopCoinsDisplay();
}

function updateShopCoinsDisplay() {
    const valEl = document.getElementById('shop-coins-val');
    if (valEl) valEl.innerText = myProfile.coins;
}

function isProfileValid() {
    const savedName = localStorage.getItem('cb_username');
    const savedRegion = localStorage.getItem('cb_region');
    return savedName && savedName.trim().length >= 3 && savedName !== "Profil" && savedName !== "Définir un pseudo" && savedRegion;
}

function checkAndShowProfileModal() {
    if (!isProfileValid()) { promptProfileChange(); } 
    else {
        myProfile.username = localStorage.getItem('cb_username');
        myProfile.region = localStorage.getItem('cb_region');
        myProfile.avatar = parseInt(localStorage.getItem('cb_avatar')) || 1;
        myProfile.flag = getFlagEmoji(localStorage.getItem('cb_flag') || "🇫🇷");
        
        const savedTitle = localStorage.getItem('cb_equipped_title');
        const savedFrame = localStorage.getItem('cb_equipped_frame');
        const savedTheme = localStorage.getItem('cb_equipped_theme');
        const savedAvatar = localStorage.getItem('cb_equipped_avatar');

        if (!myProfile.inventory) myProfile.inventory = {};
        if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
        if (savedTitle) myProfile.inventory.__equipped.title = savedTitle;
        if (savedFrame) myProfile.inventory.__equipped.frame = savedFrame;
        if (savedTheme) myProfile.inventory.__equipped.theme = savedTheme;
        if (savedAvatar) myProfile.inventory.__equipped.avatar = savedAvatar;

        updateEconomyUI();
        document.getElementById('modal-username').style.display = 'none';
        registerIfPossible();
        showTitleScreen();
    }
}

function saveProfileFromModal() {
    const nameInput = document.getElementById('username-input').value.trim();
    const regionInput = document.getElementById('region-input').value;
    const selectedTitleId = document.getElementById('title-input').value;
    const selectedFrameId = document.getElementById('frame-input').value;
    const selectedThemeId = document.getElementById('theme-input').value;
    let avatarVal = parseInt(document.getElementById('avatar-input').value);
    const flagVal = document.getElementById('flag-input').value;

    if (nameInput.length < 3) { alert("Ton pseudo doit contenir au moins 3 caractères !"); return; }
    if (isNaN(avatarVal) || avatarVal < 1) avatarVal = 1;
    if (avatarVal > 999) avatarVal = 999;

    myProfile.username = nameInput; 
    myProfile.region = regionInput;
    myProfile.avatar = avatarVal;
    myProfile.flag = getFlagEmoji(flagVal);

    if (!myProfile.inventory) myProfile.inventory = {};
    if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
    
    if (selectedTitleId) {
        myProfile.inventory.__equipped.title = selectedTitleId;
        localStorage.setItem('cb_equipped_title', selectedTitleId);
        socket.emit('equip_cosmetic', selectedTitleId);
    } else {
        delete myProfile.inventory.__equipped.title;
        localStorage.removeItem('cb_equipped_title');
        socket.emit('equip_cosmetic', 'none_title');
    }

    if (selectedFrameId) {
        myProfile.inventory.__equipped.frame = selectedFrameId;
        localStorage.setItem('cb_equipped_frame', selectedFrameId);
        socket.emit('equip_cosmetic', selectedFrameId);
    } else {
        delete myProfile.inventory.__equipped.frame;
        localStorage.removeItem('cb_equipped_frame');
        socket.emit('equip_cosmetic', 'none_frame');
    }

    if (selectedThemeId) {
        myProfile.inventory.__equipped.theme = selectedThemeId;
        localStorage.setItem('cb_equipped_theme', selectedThemeId);
        socket.emit('equip_cosmetic', selectedThemeId);
    } else {
        delete myProfile.inventory.__equipped.theme;
        localStorage.removeItem('cb_equipped_theme');
        socket.emit('equip_cosmetic', 'none_theme');
    }

    if (activeAvatarChoice === 'gold_plasma_3d' || activeAvatarChoice === 'cryo_plasma') {
        myProfile.inventory.__equipped.avatar = activeAvatarChoice;
        localStorage.setItem('cb_equipped_avatar', activeAvatarChoice);
        socket.emit('equip_cosmetic', activeAvatarChoice);
    } else {
        delete myProfile.inventory.__equipped.avatar;
        localStorage.removeItem('cb_equipped_avatar');
        socket.emit('equip_cosmetic', 'none_avatar');
    }

    saveLocalPreferences();
    updateEconomyUI();
    document.getElementById('modal-username').style.display = 'none';
    registerIfPossible();
    SoundEngine.init();
    showTitleScreen();
}

function saveAvatarChoiceOnly() {
    let avatarVal = parseInt(document.getElementById('avatar-input').value);
    const flagVal = document.getElementById('flag-input').value;
    const selectedTitleId = document.getElementById('title-input').value;
    const selectedFrameId = document.getElementById('frame-input').value;
    const selectedThemeId = document.getElementById('theme-input').value;

    if (isNaN(avatarVal) || avatarVal < 1) avatarVal = 1;
    if (avatarVal > 999) avatarVal = 999;

    myProfile.avatar = avatarVal;
    myProfile.flag = getFlagEmoji(flagVal);

    if (!myProfile.inventory) myProfile.inventory = {};
    if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};

    if (selectedTitleId) {
        myProfile.inventory.__equipped.title = selectedTitleId;
        localStorage.setItem('cb_equipped_title', selectedTitleId);
        socket.emit('equip_cosmetic', selectedTitleId);
    } else {
        delete myProfile.inventory.__equipped.title;
        localStorage.removeItem('cb_equipped_title');
        socket.emit('equip_cosmetic', 'none_title');
    }

    if (selectedFrameId) {
        myProfile.inventory.__equipped.frame = selectedFrameId;
        localStorage.setItem('cb_equipped_frame', selectedFrameId);
        socket.emit('equip_cosmetic', selectedFrameId);
    } else {
        delete myProfile.inventory.__equipped.frame;
        localStorage.removeItem('cb_equipped_frame');
        socket.emit('equip_cosmetic', 'none_frame');
    }

    if (selectedThemeId) {
        myProfile.inventory.__equipped.theme = selectedThemeId;
        localStorage.setItem('cb_equipped_theme', selectedThemeId);
        socket.emit('equip_cosmetic', selectedThemeId);
    } else {
        delete myProfile.inventory.__equipped.theme;
        localStorage.removeItem('cb_equipped_theme');
        socket.emit('equip_cosmetic', 'none_theme');
    }

    if (activeAvatarChoice === 'gold_plasma_3d' || activeAvatarChoice === 'cryo_plasma') {
        myProfile.inventory.__equipped.avatar = activeAvatarChoice;
        localStorage.setItem('cb_equipped_avatar', activeAvatarChoice);
        socket.emit('equip_cosmetic', activeAvatarChoice);
    } else {
        delete myProfile.inventory.__equipped.avatar;
        localStorage.removeItem('cb_equipped_avatar');
        socket.emit('equip_cosmetic', 'none_avatar');
    }

    saveLocalPreferences();
    updateEconomyUI();
    document.getElementById('modal-username').style.display = 'none';
    showNotificationToast("✅ Choix de profil enregistré avec succès !", "gift");
    registerIfPossible();
}

function promptProfileChange() {
    document.getElementById('username-input').value = isProfileValid() ? myProfile.username : '';
    if (myProfile.region) document.getElementById('region-input').value = myProfile.region;
    document.getElementById('avatar-input').value = myProfile.avatar || 1;
    document.getElementById('flag-input').value = myProfile.flag || "🇫🇷";
    
    const equippedAvatar = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar;
    activeAvatarChoice = equippedAvatar || 'standard';

    renderProfileCustomizationMenus();
    updateProfilePreview();
    document.getElementById('modal-username').style.display = 'flex';
}

function registerIfPossible() {
    if (isProfileValid() && socket.connected) {
        socket.emit('register_player', {
            username: myProfile.username, region: myProfile.region,
            avatar: myProfile.avatar, flag: myProfile.flag, inventory: myProfile.inventory
        });
    }
}

socket.on('player_registered', (rawData) => {
    if (rawData) {
        const player = parsePlayer(rawData);
        myProfile.username = player.username;
        myProfile.region = player.region;
        myProfile.avatar = player.avatar;
        myProfile.flag = player.flag;
        myProfile.points = player.points;
        myProfile.coins = player.coins;
        myProfile.trophies = player.trophies;
        myProfile.wins = player.wins;
        myProfile.losses = player.losses;
        
        const localEquipped = myProfile.inventory && myProfile.inventory.__equipped ? {...myProfile.inventory.__equipped} : {};
        const savedTitle = localStorage.getItem('cb_equipped_title');
        const savedFrame = localStorage.getItem('cb_equipped_frame');
        const savedTheme = localStorage.getItem('cb_equipped_theme');
        const savedAvatar = localStorage.getItem('cb_equipped_avatar');
        
        if (savedTitle && !localEquipped.title) localEquipped.title = savedTitle;
        if (savedFrame && !localEquipped.frame) localEquipped.frame = savedFrame;
        if (savedTheme && !localEquipped.theme) localEquipped.theme = savedTheme;
        if (savedAvatar && !localEquipped.avatar) localEquipped.avatar = savedAvatar;

        myProfile.inventory = player.inventory || {};
        if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
        
        myProfile.inventory.__equipped.title = savedTitle || localEquipped.title || "";
        myProfile.inventory.__equipped.frame = savedFrame || localEquipped.frame || "";
        myProfile.inventory.__equipped.theme = savedTheme || localEquipped.theme || "";
        myProfile.inventory.__equipped.avatar = savedAvatar || localEquipped.avatar || "";

        myProfile.unlocked_items = player.unlocked_items;
        myProfile.equippedPower = player.equippedPower;
        myProfile.blitzPassPremium = player.blitzPassPremium;
        myProfile.claimedPassTiers = player.claimedPassTiers;
        
        updateEconomyUI();
        if (document.getElementById('modal-shop').style.display === 'flex') switchShopTab(currentShopTab);
        if (document.getElementById('modal-blitz-pass').style.display === 'flex') renderBlitzPass();
    }
});

socket.on('blitz_pass_updated', (data) => {
    if (data.coins !== undefined) myProfile.coins = data.coins;
    if (data.blitzPassPremium !== undefined) myProfile.blitzPassPremium = data.blitzPassPremium;
    if (data.claimedPassTiers) myProfile.claimedPassTiers = data.claimedPassTiers;
    updateEconomyUI();
    if (document.getElementById('modal-blitz-pass').style.display === 'flex') renderBlitzPass();
    showNotificationToast("✨ Passe de combat mis à jour avec succès !", "gift");
});

function showNotificationToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 15px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 6px; pointer-events: none; width: 90%; max-width: 400px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    let bg = 'rgba(0, 210, 255, 0.95)', border = '#00d2ff', color = '#000';
    if (type === 'gift') { bg = 'rgba(248, 181, 0, 0.95)'; border = '#f8b500'; color = '#000'; }
    else if (type === 'announcement') { bg = 'rgba(255, 75, 43, 0.95)'; border = '#ff4b2b'; color = '#fff'; }
    toast.style.cssText = `background: ${bg}; border: 2px solid ${border}; color: ${color}; padding: 10px 14px; border-radius: 12px; font-weight: bold; font-size: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); pointer-events: auto; animation: toastFade 4.5s ease forwards;`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4500);
}

// ========================================== */
/* GESTION DU PANNEAU ADMINISTRATEUR PLEIN ÉCRAN */
/* ========================================== */
function openAdminPanel() {
    const modal = document.getElementById('admin-modal');
    const loginSec = document.getElementById('admin-login-section');
    const dashSec = document.getElementById('admin-dashboard-section');
    const passInput = document.getElementById('admin-password-input');
    const errEl = document.getElementById('admin-login-error');

    if (modal) modal.style.display = 'flex';
    if (loginSec) loginSec.style.display = 'block';
    if (dashSec) dashSec.style.display = 'none';
    if (passInput) passInput.value = '';
    if (errEl) errEl.innerText = '';
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
}

function authAdmin() {
    const passInput = document.getElementById('admin-password-input');
    const pass = passInput ? passInput.value : '';
    socket.emit('admin_auth', pass);
}

socket.on('admin_auth_fail', (msg) => {
    const errEl = document.getElementById('admin-login-error');
    if (errEl) errEl.innerText = msg || "Mot de passe incorrect";
});

socket.on('admin_auth_success', (data) => {
    const loginSec = document.getElementById('admin-login-section');
    const dashSec = document.getElementById('admin-dashboard-section');
    
    if (loginSec) loginSec.style.display = 'none';
    if (dashSec) dashSec.style.display = 'block';
    
    renderAdminDashboard(data);
});

function renderAdminDashboard(data) {
    const dash = document.getElementById('admin-dashboard-section');
    if (!dash) return;
    dash.innerHTML = `
        <div style="font-size: 14px; font-weight: 900; color: #f8b500; margin-bottom: 10px; text-align: center;">⚡ CONSOLE SUPRÊME ADMIN (PLEIN ÉCRAN) ⚡</div>
        
        <!-- ANNONCES GLOBALES -->
        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-weight: bold; color: #00d2ff; margin-bottom: 6px; font-size: 11px; font-family: monospace;">📢 :broadcast [MESSAGE]</div>
            <div style="display:flex; gap:6px;">
                <input type="text" id="admin-broadcast-text" placeholder="Message global..." style="flex:1; background: #0f051d; color: #fff; border: 1px solid rgba(0,210,255,0.4); border-radius: 6px; padding: 7px; font-size: 11px; outline:none;">
                <button class="btn-main btn-blue" onclick="adminBroadcast()" style="width:auto; margin-top:0; padding:6px 12px; font-size:11px;">Diffuser 🚀</button>
            </div>
        </div>

        <!-- DISTRIBUTION DE CADEAUX -->
        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-weight: bold; color: #f8b500; margin-bottom: 6px; font-size: 11px; font-family: monospace;">🎁 :give [PLAYER] [CURRENCY] [AMT]</div>
            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <select id="admin-target-type" onchange="toggleAdminTargetInput()" style="flex: 1; background: #0f051d; color: #fff; border: 1px solid rgba(248,181,0,0.4); border-radius: 6px; padding: 6px; font-size: 11px; outline:none;">
                    <option value="all">🌍 TOUS (Global)</option>
                    <option value="pseudo">👤 Joueur Spécifique</option>
                </select>
                <input type="text" id="admin-target-pseudo" placeholder="Pseudo exact..." style="flex: 1; background: #0f051d; color: #fff; border: 1px solid rgba(248,181,0,0.4); border-radius: 6px; padding: 6px; font-size: 11px; display: none; outline:none;">
            </div>
            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <select id="admin-currency-type" style="flex: 1; background: #0f051d; color: #fff; border: 1px solid rgba(248,181,0,0.4); border-radius: 6px; padding: 6px; font-size: 11px; outline:none;">
                    <option value="coins">🪙 Pièces</option>
                    <option value="points">🏅 Points</option>
                    <option value="trophies">🏆 Trophées</option>
                </select>
                <input type="number" id="admin-amount" placeholder="Montant" value="100" style="flex: 1; background: #0f051d; color: #fff; border: 1px solid rgba(248,181,0,0.4); border-radius: 6px; padding: 6px; font-size: 11px; text-align:center; outline:none;">
            </div>
            <button class="btn-main btn-gold" onclick="adminSendGift()" style="width: 100%; margin-top:0; padding: 7px; font-size: 11px; color: #000; font-weight: 900;">DONNER LA RÉCOMPENSE ⚡</button>
        </div>

        <!-- ÉVÉNEMENTS & MODES (Grille 2 colonnes sans scroll) -->
        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-weight: bold; color: #38ef7d; margin-bottom: 6px; font-size: 11px; font-family: monospace;">⚙️ :server_events [FORCED TOGGLES]</div>
            <div id="admin-schedules-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px;"></div>
            <button class="btn-main" onclick="saveAdminSchedules()" style="width: 100%; margin-top: 0; padding: 7px; font-size: 11px; background: linear-gradient(45deg, #11998e, #38ef7d); color: #000; font-weight: 900;">APPLIQUER LES ÉVÉNEMENTS 💾</button>
        </div>

        <button class="btn-secondary" onclick="closeAdminPanel()" style="width: 100%; margin-top: 2px; padding: 8px; font-size: 11px; background: rgba(255,75,43,0.15); border-color: #ff4b2b; color: #ff4b2b;">FERMER LA CONSOLE ❌</button>
    `;
    renderAdminSchedules(data.schedules || {});
}

function toggleAdminTargetInput() {
    const type = document.getElementById('admin-target-type').value;
    const pseudoInput = document.getElementById('admin-target-pseudo');
    if (pseudoInput) {
        pseudoInput.style.display = (type === 'pseudo') ? 'block' : 'none';
    }
}

function adminSendGift() {
    const targetType = document.getElementById('admin-target-type').value;
    const pseudo = document.getElementById('admin-target-pseudo').value.trim();
    const currency = document.getElementById('admin-currency-type').value;
    const amount = parseInt(document.getElementById('admin-amount').value) || 0;

    const target = (targetType === 'all') ? 'ALL' : pseudo;
    if (targetType === 'pseudo' && !pseudo) {
        alert("Entre un pseudo valide !");
        return;
    }

    socket.emit('admin_send_gift', { target, currency, amount });
    showNotificationToast(`🎁 Don de ${amount} (${currency}) envoyé à ${target === 'ALL' ? 'tout le monde' : target} !`, "gift");
}

function adminBroadcast() {
    const text = document.getElementById('admin-broadcast-text').value.trim();
    if (!text) { alert("Entre un message d'annonce !"); return; }
    socket.emit('admin_broadcast', text);
    document.getElementById('admin-broadcast-text').value = '';
    showNotificationToast("📢 Annonce globale diffusée avec succès !", "announcement");
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
        jackpotEclair: "🎁 Jackpot",
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

    socket.emit('admin_update_schedule', schedulesData);
    showNotificationToast("✅ Événements serveur mis à jour instantanément !", "gift");
}

// --- AMIS & INVITATIONS ---

function openFriendsModal() {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    document.getElementById('modal-friends').style.display = 'flex';
    socket.emit('get_friends_list');
}
function closeFriendsModal() { document.getElementById('modal-friends').style.display = 'none'; }

function updateFriendsBadge() {
    const totalCount = (window.lastRequestsCount || 0) + (myGameInvites ? myGameInvites.length : 0);
    const badge = document.getElementById('friends-main-badge');
    if (badge) {
        badge.innerText = totalCount;
        badge.style.display = totalCount > 0 ? 'inline-block' : 'none';
    }
}

function switchFriendTab(tab) {
    currentFriendFilter = tab;
    document.getElementById('friend-tab-all').classList.toggle('active', tab === 'all');
    document.getElementById('friend-tab-requests').classList.toggle('active', tab === 'requests');
    const invitesTab = document.getElementById('friend-tab-invites');
    if (invitesTab) invitesTab.classList.toggle('active', tab === 'invites');
    
    if (tab === 'invites') renderGameInvitesList();
    else socket.emit('get_friends_list');
}

function sendFriendRequest() {
    const target = document.getElementById('input-add-friend').value.trim();
    if (target) { socket.emit('send_friend_request', target); document.getElementById('input-add-friend').value = ''; }
}

function acceptFriend(id) { socket.emit('accept_friend_request', id); }
function removeFriend(id) { socket.emit('remove_friend', id); }

function inviteFriend(targetSocketId) {
    const randomRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit('create_room', { code: randomRoomCode, password: '', username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
    socket.emit('invite_friend_to_game', { targetSocketId, roomCode: randomRoomCode });
    closeFriendsModal();
    showNotificationToast("📤 Salon créé et invitation envoyée !", "gift");
}

socket.on('receive_game_invite', (data) => {
    myGameInvites.unshift({ from: data.from, roomCode: data.roomCode, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    updateFriendsBadge();
    if (currentFriendFilter === 'invites' && document.getElementById('modal-friends').style.display === 'flex') renderGameInvitesList();

    let inviteHtml = `📩 Invitation de jeu de <b>${data.from}</b> !`;
    if (data.roomCode) inviteHtml += `<br><button class="power-btn equip" onclick="closeFriendsModal(); joinRoomDirect('${data.roomCode}', '')" style="margin-top:6px; font-size:11px; padding:4px 10px;">Rejoindre le salon ⚡</button>`;
    showNotificationToast(inviteHtml, 'gift');
});

function renderGameInvitesList() {
    const container = document.getElementById('friends-list-container');
    container.innerHTML = '';
    if (myGameInvites.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucune invitation en attente.</div>`;
        return;
    }
    myGameInvites.forEach((inv, index) => {
        const row = document.createElement('div');
        row.className = 'friend-card';
        row.innerHTML = `
            <div style="text-align:left;">
                <div style="font-weight:bold; color:#fff; font-size:12px;">${inv.from}</div>
                <div style="font-size:10px; color:#00d2ff;">Salon : ${inv.roomCode} (${inv.time})</div>
            </div>
            <div style="display:flex; gap:4px; align-items:center;">
                <button class="power-btn equip" onclick="closeFriendsModal(); joinRoomDirect('${inv.roomCode}', '')" style="font-size:10px; padding:4px 8px;">Rejoindre ⚡</button>
                <button class="power-btn" onclick="removeGameInvite(${index})" style="font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;">✕</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function removeGameInvite(index) {
    myGameInvites.splice(index, 1);
    updateFriendsBadge();
    renderGameInvitesList();
}

socket.on('friends_list_data', (friends) => {
    if (currentFriendFilter === 'invites') return;
    const container = document.getElementById('friends-list-container');
    container.innerHTML = '';
    
    let allFriends = friends || [];
    const incomingRequests = allFriends.filter(f => f.status === 'pending' && !f.isRequester);
    window.lastRequestsCount = incomingRequests.length;
    updateFriendsBadge();

    let filtered = allFriends;
    if (currentFriendFilter === 'all') filtered = allFriends.filter(f => f.status === 'accepted');
    else if (currentFriendFilter === 'requests') filtered = incomingRequests;

    if (!filtered || filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucun ami pour le moment.</div>`;
        return;
    }
    
    filtered.forEach(f => {
        const row = document.createElement('div');
        row.className = 'friend-card';
        const dotColor = f.isOnline ? '#38ef7d' : '#aaa';
        const statusText = f.isOnline ? 'En ligne' : 'Hors-ligne';
        
        let actionsHtml = '';
        if (f.status === 'pending') {
            if (!f.isRequester) actionsHtml += `<button class="power-btn equip" onclick="acceptFriend('${f.id}')" style="font-size:10px; padding:4px 6px;">Accepter</button>`;
            else actionsHtml += `<span style="font-size:10px; color:#f8b500;">En attente</span>`;
        } else if (f.status === 'accepted' && f.isOnline && f.targetSocketId) {
            actionsHtml += `<button class="power-btn buy" onclick="inviteFriend('${f.targetSocketId}')" style="font-size:10px; padding:4px 6px;">Inviter</button>`;
        }
        actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;">Supprimer</button>`;

        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="width:7px; height:7px; border-radius:50%; background:${dotColor}; box-shadow:0 0 5px ${dotColor};"></span>
                <div style="text-align:left;">
                    <div style="font-weight:bold; color:#fff; font-size:12px;">${f.username}</div>
                    <div style="font-size:9px; color:${dotColor};">${statusText}</div>
                </div>
            </div>
            <div style="display:flex; gap:4px; align-items:center;">${actionsHtml}</div>
        `;
        container.appendChild(row);
    });
});

socket.on('friend_error', (msg) => { showNotificationToast("❌ " + msg, 'announcement'); });
socket.on('friend_success', (msg) => { showNotificationToast("✅ " + msg, 'gift'); document.getElementById('input-add-friend').value = ''; socket.emit('get_friends_list'); });
socket.on('friend_updated', () => { socket.emit('get_friends_list'); });

// --- NAVIGATION ÉCRANS ---

function hideAllScreens() {
    ['screen-title', 'screen-menu', 'screen-solo-menu', 'screen-avalanche-menu', 'screen-1v1-hub', 'screen-1v1-lobby', 'screen-rooms', 'screen-join-custom', 'screen-room-waiting', 'screen-tournament', 'screen-game', 'recap-modal', 'modal-leaderboard', 'modal-shop', 'modal-blitz-pass', 'countdown-overlay', 'modal-create-room', 'modal-launch-ad', 'simulated-ad-overlay', 'modal-ranked-loadout', 'modal-jackpot-wheel', 'admin-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (window.radarInterval) clearInterval(window.radarInterval);
    if (window.soloTimerInterval) clearInterval(window.soloTimerInterval);
    if (window.avalancheInterval) clearInterval(window.avalancheInterval);
    if (window.avalancheTimerInterval) clearInterval(window.avalancheTimerInterval);
    window.isTimeFrozen = false;
}

function showTitleScreen() {
    hideAllScreens();
    window.history.replaceState({}, '', window.location.pathname);
    document.getElementById('screen-title').style.display = 'block';
    SoundEngine.startMusic('menu');
}

function showMainMenu() {
    hideAllScreens();
    window.history.replaceState({}, '', window.location.pathname);
    const menuEl = document.getElementById('screen-menu');
    if (menuEl) menuEl.style.display = 'flex';
    SoundEngine.startMusic('menu');
}

function openLaunchAdModal() { SoundEngine.init(); document.getElementById('modal-launch-ad').style.display = 'flex'; }
function playLaunchAd() { document.getElementById('modal-launch-ad').style.display = 'none'; simulateAd(() => { showMainMenu(); }); }
function openSoloMenu() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById('screen-solo-menu').style.display = 'flex'; SoundEngine.startMusic('menu'); }
function openAvalancheDifficulties() { hideAllScreens(); document.getElementById('screen-avalanche-menu').style.display = 'flex'; SoundEngine.startMusic('menu'); }
function startTugOfWarQueue() {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    hideAllScreens(); document.getElementById('screen-1v1-lobby').style.display = 'flex';
    let digit = 1; window.radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById('radar-digit').innerText = digit; }, 70);
    socket.emit('find_tug_of_war_match');
}

function simulateAd(callback) {
    SoundEngine.stopMusic(false);
    document.getElementById('recap-modal').style.display = 'none';
    const overlay = document.getElementById('simulated-ad-overlay');
    const timerEl = document.getElementById('ad-timer');
    const closeBtn = document.getElementById('ad-close-btn');
    overlay.style.display = 'flex'; closeBtn.style.display = 'none';
    let timeLeft = 5; timerEl.innerText = timeLeft;
    const interval = setInterval(() => {
        timeLeft--; timerEl.innerText = timeLeft;
        if (timeLeft <= 0) { clearInterval(interval); timerEl.innerText = "✓"; closeBtn.style.display = 'block'; adCallbackFunction = callback; }
    }, 1000);
}

function closeSimulatedAd() {
    document.getElementById('simulated-ad-overlay').style.display = 'none';
    SoundEngine.startMusic('menu');
    if (adCallbackFunction) { adCallbackFunction(); adCallbackFunction = null; }
}

function watchAdToDoubleReward() {
    if (window.rewardDoubled) return;
    simulateAd(() => {
        window.rewardDoubled = true; socket.emit('double_reward'); window.currentCoinsGained *= 2;
        document.getElementById('recap-coins-gained').innerText = `+${window.currentCoinsGained} (x2 ⚡)`;
        const doubleBtn = document.getElementById('btn-double-reward');
        doubleBtn.disabled = true; doubleBtn.style.opacity = '0.5';
        doubleBtn.innerText = '✅ Gains doublés !';
        document.getElementById('recap-modal').style.display = 'flex';
    });
}

function open1v1Hub() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById('screen-1v1-hub').style.display = 'flex'; SoundEngine.startMusic('menu'); }
function startRandom1v1() {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    hideAllScreens(); document.getElementById('screen-1v1-lobby').style.display = 'flex';
    let digit = 1; window.radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById('radar-digit').innerText = digit; }, 70);
    socket.emit('find_1v1_match');
}

function openRankedLoadoutModal() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } selectedRankedItems = []; document.getElementById('modal-ranked-loadout').style.display = 'flex'; renderRankedLoadoutItems(); }
function closeRankedLoadoutModal() { document.getElementById('modal-ranked-loadout').style.display = 'none'; }

function renderRankedLoadoutItems() {
    const container = document.getElementById('ranked-items-container'); container.innerHTML = '';
    const powersDict = i18n[currentLanguage].powers;
    const ownedPowers = POWERS_CATALOG.filter(p => p.type !== 'cosmetics' && (myProfile.inventory[p.id] || 0) > 0);
    
    if (ownedPowers.length === 0) { container.innerHTML = `<div style="grid-column: span 2; text-align:center; color:#aaa; padding:12px; font-size:11px;">Inventaire vide !</div>`; return; }

    ownedPowers.forEach(p => {
        const powerInfo = powersDict[p.id];
        const qty = myProfile.inventory[p.id] || 0;
        const isSelected = selectedRankedItems.includes(p.id);
        const card = document.createElement('div');
        card.className = `power-card ${isSelected ? 'equipped' : ''}`;
        card.style.cursor = 'pointer';
        card.onclick = () => toggleRankedItem(p.id);
        card.innerHTML = `
            <h4>${powerInfo.name}</h4>
            <p>${powerInfo.desc}</p>
            <div class="stock-badge">Stock : ${qty}</div>
            <div style="font-weight:bold; font-size:10px; color:${isSelected ? '#00ff88' : '#f8b500'};">${isSelected ? 'Sélectionné ✅' : 'Sélectionner'}</div>
        `;
        container.appendChild(card);
    });
}

function toggleRankedItem(id) {
    if (selectedRankedItems.includes(id)) selectedRankedItems = selectedRankedItems.filter(item => item !== id);
    else {
        if (selectedRankedItems.length >= 2) { alert('Maximum 2 objets pour le classé.'); return; }
        selectedRankedItems.push(id);
    }
    renderRankedLoadoutItems();
}

function startRankedMatch() {
    if (selectedRankedItems.length === 0) { alert('Sélectionne au moins un objet.'); return; }
    closeRankedLoadoutModal(); hideAllScreens();
    document.getElementById('screen-1v1-lobby').style.display = 'flex';
    let digit = 1; window.radarInterval = setInterval(() => { digit = (digit % 50) + 1; document.getElementById('radar-digit').innerText = digit; }, 70);
    myProfile.equippedPowers = selectedRankedItems;
    socket.emit('find_ranked_match', { items: selectedRankedItems });
}

function cancel1v1Search() { showMainMenu(); }
function openRoomsScreen() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); window.history.replaceState({}, '', window.location.pathname); document.getElementById('screen-rooms').style.display = 'flex'; fetchRoomsList(); }
function fetchRoomsList() { socket.emit('get_rooms_list'); }

function openCreateRoomModal() {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    document.getElementById('custom-room-name').value = ''; document.getElementById('custom-room-pass').value = '';
    document.getElementById('modal-create-room').style.display = 'flex';
}
function closeCreateRoomModal() { document.getElementById('modal-create-room').style.display = 'none'; }

function submitCreateRoom() {
    const code = document.getElementById('custom-room-name').value.trim().toUpperCase();
    const password = document.getElementById('custom-room-pass').value.trim();
    if (code !== '' && code.length < 2) { alert("Nom de salon trop court."); return; }
    socket.emit('create_room', { code: code, password: password, username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
    closeCreateRoomModal();
}

function openJoinCustomScreen(prefilledCode = '') {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    hideAllScreens(); document.getElementById('screen-join-custom').style.display = 'flex';
    document.getElementById('join-room-code-input').value = prefilledCode;
    document.getElementById('join-room-pass-input').value = '';
}

function submitJoinCustomRoom() {
    const roomCode = document.getElementById('join-room-code-input').value.trim().toUpperCase();
    const password = document.getElementById('join-room-pass-input').value.trim();
    if (!roomCode) { alert("Entrer un code valide."); return; }
    socket.emit('join_room', { code: roomCode, password: password });
}

function joinRoomFromList(code, hasPassword) { if (hasPassword) openJoinCustomScreen(code); else joinRoomDirect(code, ''); }
function joinRoomDirect(code, password) { socket.emit('join_room', { code: code.toUpperCase(), password: password }); }
function leaveCustomRoom() { socket.emit('leave_room'); window.history.replaceState({}, '', window.location.pathname); openRoomsScreen(); }
function copyRoomLink() { const input = document.getElementById('room-share-link'); input.select(); navigator.clipboard.writeText(input.value).then(() => { alert(i18n[currentLanguage].link_copied); }); }
function shareRoomLink() {
    const input = document.getElementById('room-share-link');
    if (navigator.share) navigator.share({ title: 'Chiffre Blitz ⚡', text: 'Viens m\'affronter !', url: input.value }).catch(() => {});
    else copyRoomLink();
}

socket.on('rooms_list_data', (rooms) => {
    const listEl = document.getElementById('rooms-list'); listEl.innerHTML = '';
    if (!rooms || rooms.length === 0) { listEl.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:8px; font-size:11px;">Aucun salon ouvert.</div>`; return; }
    rooms.forEach(r => {
        const row = document.createElement('div'); row.className = 'room-row';
        const lockIcon = r.hasPassword ? ' 🔒' : '';
        row.innerHTML = `<span class="room-info">Salon <b>${r.code}</b>${lockIcon} (${r.playersCount}/2)</span><button class="power-btn equip" onclick="joinRoomFromList('${r.code}', ${r.hasPassword})">Rejoindre</button>`;
        listEl.appendChild(row);
    });
});

socket.on('room_joined_success', (data) => {
    hideAllScreens(); document.getElementById('screen-room-waiting').style.display = 'flex';
    document.getElementById('current-room-code').innerText = data.code;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${data.code}`;
    window.history.replaceState({}, '', `?room=${data.code}`);
    document.getElementById('room-share-link').value = shareUrl;
    updateRoomPlayers(data.players);
});

socket.on('room_players_update', (data) => { updateRoomPlayers(data.players); });

function updateRoomPlayers(players) {
    const playersListEl = document.getElementById('room-players-list');
    if (!players || players.length === 0) { playersListEl.innerText = 'En attente d\'un adversaire...'; return; }
    playersListEl.innerHTML = players.map(rawData => {
        const p = parsePlayer(rawData);
        const title = p.inventory && p.inventory.__equipped && p.inventory.__equipped.title;
        const titleHtml = title ? `<span style="font-size: 8px; color: #f8b500; margin-left: 3px;">[${TITLE_DISPLAY_NAMES[title] || title}]</span>` : '';
        return `<div style="display:inline-flex; align-items:center; gap:4px;">${getAvatarBadgeHTML(p.flag, p.avatar, null, p)} <span>${p.username}</span> ${titleHtml}</div>`;
    }).join(' <span style="color:#aaa; margin:0 4px;">vs</span> ');
    if (players && socket.id) {
        const opp = players.find(p => (p.socketId || p.id) !== socket.id);
        if (opp) cachedOpponent = parsePlayer(opp);
    }
}

socket.on('room_error', (msg) => { alert(msg); });
function openTournamentScreen() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById('screen-tournament').style.display = 'flex'; }
function openShop() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } updateShopCoinsDisplay(); document.getElementById('modal-shop').style.display = 'flex'; switchShopTab(window.currentShopTab || 'bonus'); }
function closeShop() { document.getElementById('modal-shop').style.display = 'none'; }

const BLITZ_PASS_TIERS = [
    { tier: 1, free: "50 Pièces (🪙)", premium: "Titre exclusif « Initié du Plasma »" },
    { tier: 2, free: "1 💡 Projecteur", premium: "100 Pièces (🪙)" },
    { tier: 3, free: "50 Pièces (🪙)", premium: "Titre rare « Maître des Flux »" },
    { tier: 4, free: "1 ⏳ Blocage du Temps", premium: "🛡️ Cadre de Profil Argenté" },
    { tier: 5, free: "75 Pièces (🪙)", premium: "Sphère Cryo-Plasma (Avatar Glacé)" },
    { tier: 6, free: "1 ⚡ Joker Éclair", premium: "Pack de Consommables (Bonus)" },
    { tier: 7, free: "50 Pièces (🪙)", premium: "Titre « Pro de l'Éclair »" },
    { tier: 8, free: "1 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 9, free: "100 Pièces (🪙)", premium: "200 Pièces (🪙)" },
    { tier: 10, free: "1 🌟 Nova Temporelle", premium: "🎨 Thème de Grille Alternatif (Plasma)" },
    { tier: 11, free: "60 Pièces (🪙)", premium: "120 Pièces (🪙)" },
    { tier: 12, free: "1 ⏳ Blocage du Temps", premium: "1 💡 Projecteur" },
    { tier: 13, free: "70 Pièces (🪙)", premium: "Titre « Électron Libre »" },
    { tier: 14, free: "1 ⚡ Joker Éclair", premium: "2 ⏳ Blocage du Temps" },
    { tier: 15, free: "150 Pièces (🪙)", premium: "👑 Cadre Or Massif" },
    { tier: 16, free: "80 Pièces (🪙)", premium: "160 Pièces (🪙)" },
    { tier: 17, free: "2 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 18, free: "90 Pièces (🪙)", premium: "250 Pièces (🪙)" },
    { tier: 19, free: "1 ⚡ Joker Éclair", premium: "1 📳 Séisme" },
    { tier: 20, free: "100 Pièces (🪙)", premium: "🤖 Avatar Robot Exclusif" },
    { tier: 21, free: "110 Pièces (🪙)", premium: "220 Pièces (🪙)" },
    { tier: 22, free: "1 ⏳ Blocage du Temps", premium: "3 💡 Projecteur" },
    { tier: 23, free: "120 Pièces (🪙)", premium: "Titre « Surcharge Mentale »" },
    { tier: 24, free: "1 ⚡ Joker Éclair", premium: "300 Pièces (🪙)" },
    { tier: 25, free: "150 Pièces (🪙)", premium: "✨ Cadre Animé de Saison" },
    { tier: 26, free: "130 Pièces (🪙)", premium: "260 Pièces (🪙)" },
    { tier: 27, free: "2 💡 Projecteur", premium: "4 🌟 Novas Temporelles" },
    { tier: 28, free: "140 Pièces (🪙)", premium: "400 Pièces (🪙)" },
    { tier: 29, free: "300 Pièces (🪙)", premium: "500 Pièces (🪙)" },
    { tier: 30, free: "Titre suprême « Légende » + 500 🪙", premium: "🏆 GRAND LOT : Lampe Plasma Dorée Animée (Avatar 3D en Relief)" }
];

function openBlitzPass() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } document.getElementById('modal-blitz-pass').style.display = 'flex'; renderBlitzPass(); }

function showRewardPopUp(rewardName, rewardIcon) {
    let popup = document.getElementById('reward-popup-overlay');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'reward-popup-overlay'; popup.className = 'modal-overlay';
        popup.innerHTML = `
            <div class="modal-card" style="text-align:center; animation: victoryScalePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; border-color: #f8b500; box-shadow: 0 0 40px rgba(248,181,0,0.8);">
                <div style="font-size: 55px; margin-bottom: 10px;" id="popup-reward-icon">🎁</div>
                <div style="font-size: 10px; font-weight: 900; color: #f8b500; letter-spacing: 2px; margin-bottom: 4px;">RÉCOMPENSE DÉBLOQUÉE</div>
                <div id="popup-reward-name" style="color: #fff; font-size: 15px; font-weight: bold; margin-bottom: 20px; line-height: 1.4;">-</div>
                <button class="btn-main btn-gold" onclick="document.getElementById('reward-popup-overlay').style.display='none'" style="width:100%; margin-top:0;">Récupéré ! ⚡</button>
            </div>
        `;
        document.body.appendChild(popup);
    }
    document.getElementById('popup-reward-icon').innerText = rewardIcon || '🎁';
    document.getElementById('popup-reward-name').innerText = rewardName;
    popup.style.display = 'flex'; SoundEngine.playVictory();
}

function closeBlitzPass() { document.getElementById('modal-blitz-pass').style.display = 'none'; }

function renderBlitzPass() {
    const container = document.getElementById('blitz-pass-container');
    const isPremium = myProfile.blitzPassPremium;
    const claimed = myProfile.claimedPassTiers || {};

    container.innerHTML = `
        <div class="bp-header-banner">
            <div style="font-size: 13px; font-weight: 900; color: #f8b500; margin-bottom: 2px;">🌟 SAISON 1 : PLASMA DORÉ</div>
            <div style="font-size: 10px; color: #ccc; margin-bottom: 6px;">${isPremium ? '✨ Passe Premium Actif !' : 'Débloque le Passe Premium pour 1000 🪙'}</div>
            ${!isPremium ? `<button class="btn-main btn-gold" onclick="buyBlitzPassPremium()" style="padding: 6px 10px; font-size: 11px; margin: 0 auto; width: auto;">Acheter le Passe Premium (1000 🪙) ⭐</button>` : `<div style="color: #00ff88; font-weight: bold; font-size: 10px;">Statut : VIP / Premium</div>`}
        </div>
    `;
    
    const listDiv = document.createElement('div');
    listDiv.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    
    BLITZ_PASS_TIERS.forEach(t => {
        const freeKey = `${t.tier}_free`;
        const premKey = `${t.tier}_premium`;
        const isFreeClaimed = claimed[freeKey];
        const isPremClaimed = claimed[premKey];

        const card = document.createElement('div');
        card.className = `bp-tier-card unlocked`;
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 3px;">
                <span style="font-weight: 900; color: #f8b500; font-size: 11px;">PALIER ${t.tier}</span>
                <span style="font-size: 9px; font-weight: bold; color: #00ff88;">Disponible ✅</span>
            </div>
            <div class="bp-tracks-grid">
                <div class="bp-track-box">
                    <div><span style="color:#38ef7d; font-weight:bold;">🟢 Gratuit :</span><br>${t.free}</div>
                    <button class="power-btn ${isFreeClaimed ? 'active' : 'equip'}" style="margin-top:4px; font-size:9px; padding:3px;" ${isFreeClaimed ? 'disabled style="opacity:0.5;"' : ''} onclick="claimPassReward(${t.tier}, 'free')">${isFreeClaimed ? 'Récupéré' : 'Récupérer'}</button>
                </div>
                <div class="bp-track-box">
                    <div><span style="color:#00d2ff; font-weight:bold;">⭐ Premium :</span><br>${t.premium}</div>
                    <button class="power-btn ${isPremClaimed ? 'active' : 'equip'}" style="margin-top:4px; font-size:9px; padding:3px;" ${isPremClaimed ? 'disabled style="opacity:0.5;"' : ''} onclick="claimPassReward(${t.tier}, 'premium')">${isPremClaimed ? 'Récupéré' : 'Récupérer'}</button>
                </div>
            </div>
        `;
        listDiv.appendChild(card);
    });
    container.appendChild(listDiv);
}

function buyBlitzPassPremium() {
    if (myProfile.coins < 1000) { showNotificationToast(i18n[currentLanguage].not_enough_coins, 'announcement'); return; }
    socket.emit('buy_blitz_pass');
}

function claimPassReward(tier, track) { 
    socket.emit('claim_pass_tier', { tier, track });
    const tierData = BLITZ_PASS_TIERS.find(t => t.tier === tier);
    const rewardText = tierData ? (track === 'premium' ? tierData.premium : tierData.free) : `Palier ${tier}`;
    const icon = (tier === 30 && track === 'premium') ? '🏆' : '🌟';
    showRewardPopUp(rewardText, icon);
}

const POWERS_CATALOG = [
    { id: 'spotlight', price: 300, type: 'bonus' },
    { id: 'freeze', price: 700, type: 'bonus' },
    { id: 'joker', price: 1200, type: 'bonus' },
    { id: 'nova', price: 2500, type: 'bonus' },
    { id: 'quake', price: 400, type: 'malus' },
    { id: 'micro', price: 800, type: 'malus' },
    { id: 'eclipse', price: 1500, type: 'malus' },
    { id: 'chaos', price: 4000, type: 'malus' },
    { id: 'theme_alt', price: 1500, type: 'cosmetics' },
    { id: 'avatar_legend', price: 2500, type: 'cosmetics' },
    { id: 'frame_gold', price: 5000, type: 'cosmetics' }
];

function switchShopTab(type) {
    window.currentShopTab = type; updateShopCoinsDisplay();
    document.getElementById('shop-tab-bonus').classList.toggle('active', type === 'bonus');
    document.getElementById('shop-tab-malus').classList.toggle('active', type === 'malus');
    const cosmeticsTabBtn = document.getElementById('shop-tab-cosmetics');
    if (cosmeticsTabBtn) cosmeticsTabBtn.classList.toggle('active', type === 'cosmetics');
    
    const container = document.getElementById('shop-container'); container.innerHTML = '';
    const powersDict = i18n[currentLanguage].powers;
    const cosmeticsDict = {
        theme_alt: { name: '🎨 Thème Rétro', desc: 'Grille visuelle alternative' },
        avatar_legend: { name: '🤖 Avatar Robot', desc: 'Avatar exclusif robot' },
        frame_gold: { name: '👑 Cadre Or Massif', desc: 'Bordure dorée prestigieuse' }
    };

    POWERS_CATALOG.filter(p => p.type === type).forEach(p => {
        const card = document.createElement('div');
        if (type === 'cosmetics') {
            const info = cosmeticsDict[p.id];
            const unlocked = myProfile.unlocked_items && myProfile.unlocked_items.includes(p.id);
            const equipped = myProfile.inventory && myProfile.inventory.__equipped && Object.values(myProfile.inventory.__equipped).includes(p.id);

            card.className = `power-card ${equipped ? 'equipped' : ''}`;
            card.innerHTML = `
                <h4>${info.name}</h4>
                <p>${info.desc}</p>
                <div style="font-weight:bold; margin-bottom:4px; font-size:10px; color:#f8b500;">${p.price} 🪙</div>
                ${unlocked ? `<button class="power-btn ${equipped ? 'active' : 'equip'}" onclick="equipCosmetic('${p.id}')">${equipped ? 'Équipé ✅' : 'Équiper'}</button>` : `<button class="power-btn buy" onclick="buyItem('${p.id}')">Acheter</button>`}
            `;
        } else {
            const powerInfo = powersDict[p.id];
            const qty = myProfile.inventory[p.id] || 0;
            const isEquipped = myProfile.equippedPower === p.id;
            card.className = `power-card ${isEquipped ? 'equipped' : ''}`;
            card.innerHTML = `
                <h4>${powerInfo.name}</h4>
                <p>${powerInfo.desc}</p>
                <div class="stock-badge">Stock : ${qty}</div>
                <div style="font-weight:bold; margin-bottom:4px; font-size:10px; color:#f8b500;">${p.price} 🪙</div>
                <button class="power-btn buy" onclick="buyItem('${p.id}')">Acheter (+1)</button>
                ${qty > 0 ? `<button class="power-btn ${isEquipped ? 'active' : 'equip'}" onclick="equipPower('${p.id}')">${isEquipped ? 'Équipé ✅' : 'Équiper'}</button>` : ''}
            `;
        }
        container.appendChild(card);
    });
}

function buyItem(id) {
    const itemObj = POWERS_CATALOG.find(p => p.id === id);
    if (itemObj && myProfile.coins < itemObj.price) { SoundEngine.playError(); showNotificationToast(i18n[currentLanguage].not_enough_coins, 'announcement'); return; }
    if (socket.connected) socket.emit('buy_item', id);
}

function equipCosmetic(id) { if (socket.connected) socket.emit('equip_cosmetic', id); }
function equipPower(id) { if (socket.connected) socket.emit('equip_power', id); }

function preparePowerHUD() {
    const zone = document.getElementById('power-zone'); zone.innerHTML = '';
    let powers = (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) ? myProfile.equippedPowers : (myProfile.equippedPower ? [myProfile.equippedPower] : []);
    let usableCount = 0;

    powers.forEach(powerId => {
        const stock = myProfile.inventory[powerId] || 0;
        if (stock > 0) {
            usableCount++;
            const powerInfo = i18n[currentLanguage].powers[powerId];
            const btn = document.createElement('button');
            btn.className = 'btn-power-hud';
            btn.innerHTML = `⚡ ${powerInfo ? powerInfo.name : powerId} (${stock})`;
            btn.onclick = () => triggerSpecificPower(powerId, btn);
            zone.appendChild(btn);
        }
    });
    zone.style.display = usableCount > 0 ? 'block' : 'none';
}

function triggerSpecificPower(powerId, btnEl) {
    const stock = myProfile.inventory[powerId] || 0;
    if (stock <= 0) return;
    socket.emit('use_power', powerId);
    myProfile.inventory[powerId]--;
    btnEl.disabled = true; btnEl.style.opacity = '0.5';

    const currentTarget = parseInt(document.getElementById('game-target-giant').innerText) || 1;
    if (powerId === 'spotlight') {
        document.querySelectorAll('.tile').forEach(t => {
            if (parseInt(t.innerText) === currentTarget) {
                t.classList.add('highlight-target'); setTimeout(() => t.classList.remove('highlight-target'), 2000);
            }
        });
    } else if (powerId === 'joker') autoValidateTarget();
    else if (powerId === 'freeze') {
        window.isTimeFrozen = true; const timerEl = document.getElementById('game-timer');
        timerEl.classList.add('frozen');
        setTimeout(() => { window.isTimeFrozen = false; timerEl.classList.remove('frozen'); }, 3000);
    } else if (powerId === 'nova') {
        autoValidateTarget(); setTimeout(() => autoValidateTarget(), 250); setTimeout(() => autoValidateTarget(), 500);
    } else socket.emit('send_malus', { type: powerId });
    setTimeout(() => preparePowerHUD(), 100);
}

function autoValidateTarget() {
    const is1v1 = document.getElementById('hud-1v1').style.display !== 'none';
    if (is1v1) {
        const targetVal = parseInt(document.getElementById('game-target-giant').innerText) || 1;
        document.querySelectorAll('#grid .tile').forEach((t, idx) => {
            if (parseInt(t.innerText) === targetVal) handle1v1TileClick(targetVal, idx);
        });
    } else handleSoloTileClick(window.soloTarget);
}

socket.on('receive_malus', (data) => {
    const grid = document.getElementById('grid'); SoundEngine.playError();
    showNotificationToast(`💥 PIÈGE ADVERSAIRE REÇU !`, 'announcement');
    if (data.type === 'quake') { grid.classList.add('effect-quake'); setTimeout(() => grid.classList.remove('effect-quake'), 2000); }
    else if (data.type === 'micro') { grid.classList.add('effect-micro'); setTimeout(() => grid.classList.remove('effect-micro'), 2000); }
    else if (data.type === 'eclipse') { grid.classList.add('effect-eclipse'); setTimeout(() => grid.classList.remove('effect-eclipse'), 1500); }
    else if (data.type === 'chaos') { 
        grid.classList.add('effect-quake');
        setTimeout(() => { grid.classList.remove('effect-quake'); grid.classList.add('effect-micro'); }, 1500);
        setTimeout(() => { grid.classList.remove('effect-micro'); grid.classList.add('effect-eclipse'); }, 3000);
        setTimeout(() => { grid.classList.remove('effect-eclipse'); }, 4500);
    }
});

let currentLbCategory = 'points', currentLbScope = 'regional';

function openLeaderboard() {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    document.getElementById('modal-leaderboard').style.display = 'flex';
    updateCombinedExplanationVisibility(); fetchLeaderboard();
}

function closeLeaderboard() { document.getElementById('modal-leaderboard').style.display = 'none'; }

function setLbCategory(cat) {
    currentLbCategory = cat;
    ['points', 'trophies', 'coins', 'combined'].forEach(c => {
        const btn = document.getElementById(`lb-cat-${c}`);
        if (btn) btn.classList.toggle('active', c === cat);
    });
    updateCombinedExplanationVisibility(); fetchLeaderboard();
}

function updateCombinedExplanationVisibility() {
    const explEl = document.getElementById('lb-combined-explanation');
    if (explEl) explEl.style.display = (currentLbCategory === 'combined') ? 'block' : 'none';
}

function setLbScope(scope) {
    currentLbScope = scope;
    ['regional', 'national', 'global'].forEach(s => {
        const btn = document.getElementById(`lb-scope-${s}`);
        if (btn) btn.classList.toggle('active', s === scope);
    });
    fetchLeaderboard();
}

function fetchLeaderboard() {
    const type = `${currentLbCategory}_${currentLbScope}`;
    document.getElementById('lb-list').innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;" data-i18n="loading">Chargement...</div>`;
    socket.emit('get_leaderboard', type);
}

socket.on('leaderboard_data', (res) => {
    const container = document.getElementById('lb-list'); container.innerHTML = '';
    if (!res.data || res.data.length === 0) { container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucun joueur.</div>`; return; }
    
    const category = res.type ? res.type.split('_')[0] : 'points';
    const parsedList = res.data.map(p => parsePlayer(p));
    if (category === 'combined') parsedList.sort((a, b) => (b.trophies - a.trophies) !== 0 ? (b.trophies - a.trophies) : (b.points - a.points));

    parsedList.forEach((p, index) => {
        const row = document.createElement('div'); row.className = 'lb-row';
        const badgeHtml = getAvatarBadgeHTML(p.flag, p.avatar, null, p);
        const equippedTitle = p.inventory && p.inventory.__equipped && p.inventory.__equipped.title;
        const titleHtml = equippedTitle ? `<span style="font-size: 8px; color: #f8b500; font-weight: bold; margin-left: 4px;">[${TITLE_DISPLAY_NAMES[equippedTitle] || equippedTitle}]</span>` : '';
        
        let rightBadge = `<span class="lb-pts" style="color:#00ff88;">${p.points} pts</span>`;
        if (category === 'coins') rightBadge = `<span class="lb-pts" style="color:#f8b500;">${p.coins} 🪙</span>`;
        else if (category === 'trophies') rightBadge = `<span class="lb-pts" style="color:#fceabb;">${p.trophies} 🏆</span>`;
        else if (category === 'combined') rightBadge = `<span class="lb-pts" style="color:#00d2ff; font-size:11px;">🏆${p.trophies} | ${p.points}pts</span>`;

        let rankDisplay = `#${index + 1}`, rankColor = '#00d2ff';
        if (index === 0) { rankDisplay = '🥇'; rankColor = '#f8b500'; }
        else if (index === 1) { rankDisplay = '🥈'; rankColor = '#e0e0e0'; }
        else if (index === 2) { rankDisplay = '🥉'; rankColor = '#cd7f32'; }

        row.innerHTML = `
            <span class="lb-rank" style="color: ${rankColor};">${rankDisplay}</span>
            <div class="lb-user-info">
                <div class="lb-name-row">${badgeHtml} <span>${p.username}</span> ${titleHtml}</div>
                <div class="lb-sub-details"><span>🏆 ${p.trophies}</span><span>🪙 ${p.coins}</span><span>⚔️ V:${p.wins}/D:${p.losses}</span></div>
            </div>
            ${rightBadge}
        `;
        container.appendChild(row);
    });
});

function extractOpponentInfo(data) {
    if (!data) return cachedOpponent;
    let rawOpp = data.opponent || data.player2 || data.opp;
    if (!rawOpp && data.players) {
        if (Array.isArray(data.players)) rawOpp = data.players.find(p => (p.socketId || p.id) !== socket.id);
        else if (typeof data.players === 'object') {
            const oppId = Object.keys(data.players).find(id => id !== socket.id);
            if (oppId) rawOpp = data.players[oppId];
        }
    }
    return rawOpp ? parsePlayer(rawOpp) : cachedOpponent;
}

function updateOpponentDisplay(opp) {
    if (!opp) return;
    cachedOpponent = parsePlayer(opp);
    document.getElementById('opp-profile-name').innerText = cachedOpponent.username;
    document.getElementById('opp-profile-badge').innerHTML = getAvatarBadgeHTML(cachedOpponent.flag, cachedOpponent.avatar);
    const oppTitle = cachedOpponent.inventory && cachedOpponent.inventory.__equipped && cachedOpponent.inventory.__equipped.title;
    const oppTitleEl = document.getElementById('opp-profile-title');
    if (oppTitleEl) oppTitleEl.innerText = oppTitle ? `[ ${TITLE_DISPLAY_NAMES[oppTitle] || oppTitle} ]` : "";
}

socket.on('start_countdown', (data) => {
    if (window.radarInterval) clearInterval(window.radarInterval);
    latest1v1StartData = data; 
    let oppData = extractOpponentInfo(data);
    if (oppData) updateOpponentDisplay(oppData);

    hideAllScreens();
    document.getElementById('countdown-overlay').style.display = 'flex';
    let count = 3; document.getElementById('countdown-number').innerText = count;
    const timer = setInterval(() => {
        count--;
        if (count > 0) document.getElementById('countdown-number').innerText = count;
        else {
            clearInterval(timer);
            document.getElementById('countdown-overlay').style.display = 'none';
            document.getElementById('screen-game').style.display = 'block';
            document.getElementById('hud-1v1').style.display = 'grid';
            document.getElementById('hud-solo').style.display = 'none';

            const towHud = document.getElementById('hud-tow');
            if (data.isTugOfWar) { towHud.style.display = 'block'; updateTugOfWarGauge(0); }
            else towHud.style.display = 'none';

            if (latest1v1StartData) {
                document.getElementById('game-target-giant').innerText = latest1v1StartData.myTarget || 1;
                renderGrid(latest1v1StartData.myPool, handle1v1TileClick);
            }
            preparePowerHUD();
            window.current1v1Time = latest1v1StartData ? latest1v1StartData.timeLeft : 30;
            window.isTimeFrozen = false; SoundEngine.startMusic('1v1');
        }
    }, 1000);
});

socket.on('timer_update', (time) => { if (!window.isTimeFrozen) { window.current1v1Time = time; document.getElementById('game-timer').innerText = Math.max(0, time); } });
socket.on('tug_of_war_update', (data) => { updateTugOfWarGauge(data.ropePosition); });

function updateTugOfWarGauge(pos) {
    const indicator = document.getElementById('tow-indicator');
    if (!indicator) return;
    let percent = 50 + (pos / 6) * 45;
    indicator.style.left = `${Math.max(5, Math.min(95, percent))}%`;
}

socket.on('my_grid_updated', (data) => {
    document.getElementById('game-target-giant').innerText = data.target;
    renderGrid(data.newPool, handle1v1TileClick);
    if (data.success) SoundEngine.playClick(); else SoundEngine.playError();
});

socket.on('opponent_progress', (data) => {
    document.getElementById('opp-target').innerText = data.target;
    let oppData = extractOpponentInfo(data);
    if (oppData) updateOpponentDisplay(oppData);
});

socket.on('trigger_jackpot_wheel', () => {
    document.getElementById('recap-modal').style.display = 'none';
    const wheelModal = document.getElementById('modal-jackpot-wheel');
    const spinBtn = document.getElementById('btn-spin-wheel');
    const wheelEl = document.getElementById('wheel-element');
    wheelEl.style.transition = 'none'; wheelEl.style.transform = 'rotate(0deg)';
    spinBtn.disabled = false; spinBtn.style.opacity = '1';
    document.getElementById('wheel-result-text').innerText = '';
    wheelModal.style.display = 'flex';
});

function spinJackpotWheel() {
    const spinBtn = document.getElementById('btn-spin-wheel');
    spinBtn.disabled = true; spinBtn.style.opacity = '0.5';
    document.getElementById('wheel-result-text').innerText = '';
    socket.emit('spin_jackpot_wheel');
}

socket.on('jackpot_wheel_result', (data) => {
    const wheelEl = document.getElementById('wheel-element');
    const resultText = document.getElementById('wheel-result-text');
    wheelEl.style.transition = 'transform 3.5s cubic-bezier(0.15, 0.75, 0.1, 1)';
    wheelEl.style.transform = `rotate(${data.targetAngle || 135}deg)`;

    setTimeout(() => {
        if (data.outcome === 'jackpot') { resultText.innerHTML = `🎉 <span style="color:#f8b500;">JACKPOT ! +${data.coinDelta} Pièces 🪙</span>`; SoundEngine.playVictory(); }
        else if (data.outcome === 'objet') { resultText.innerHTML = `🎁 <span style="color:#00c6ff;">OBJET GAGNÉ ! ⚡</span>`; SoundEngine.playVictory(); }
        else if (data.outcome === 'banqueroute') { resultText.innerHTML = `💀 <span style="color:#ff4b2b;">PERDU ! ${data.coinDelta} Pièces 🪙</span>`; SoundEngine.playError(); }
        else resultText.innerHTML = `❌ <span style="color:#38ef7d;">RIEN ! Retente ta chance.</span>`;

        setTimeout(() => {
            document.getElementById('modal-jackpot-wheel').style.display = 'none';
            if (pendingGameOverData) { showGameOverRecap(pendingGameOverData); pendingGameOverData = null; }
        }, 2200);
    }, 3600);
});

socket.on('game_over_1v1', (data) => {
    const wheelModal = document.getElementById('modal-jackpot-wheel');
    if (wheelModal && wheelModal.style.display === 'flex') { pendingGameOverData = data; return; }
    showGameOverRecap(data);
});

function getWinnerAvatarShowcaseHTML(playerObj) {
    if (!playerObj) return '';
    const equippedAvatar = playerObj.inventory && playerObj.inventory.__equipped && playerObj.inventory.__equipped.avatar;
    if (equippedAvatar === 'gold_plasma_3d') {
        return `<div class="victory-avatar-showcase"><div style="transform: scale(1.6); margin: 10px 0;">${renderGoldPlasma3DAvatarHTML()}</div><div style="font-size: 13px; font-weight: 900; color: #f8b500; margin-top: 4px;">${playerObj.username || 'Joueur'} TRIOMPHE !</div></div>`;
    }
    return `<div class="victory-avatar-showcase"><div class="victory-badge-large"><span style="font-size: 26px;">🏆</span></div><div style="font-size: 13px; font-weight: 900; color: #f8b500; margin-top: 4px;">${playerObj.username || 'Joueur'} TRIOMPHE !</div></div>`;
}

function showGameOverRecap(data) {
    hideAllScreens(); window.history.replaceState({}, '', window.location.pathname);
    const modal = document.getElementById('recap-modal');
    const banner = document.getElementById('recap-banner');
    document.getElementById('recap-1v1-rows').style.display = 'block';
    const myId = socket.id, myData = data.players[myId];
    const oppId = Object.keys(data.players).find(id => id !== myId);
    const oppData = oppId ? data.players[oppId] : { target: '-', score: 0 };
    
    window.rewardDoubled = false;
    const doubleBtn = document.getElementById('btn-double-reward');
    doubleBtn.disabled = false; doubleBtn.style.opacity = '1';
    doubleBtn.innerText = '📺 Doubler mes gains (Pub)';

    const rematchBtn = document.getElementById('btn-rematch');
    if (rematchBtn) { rematchBtn.style.display = 'block'; rematchBtn.disabled = false; rematchBtn.style.opacity = '1'; rematchBtn.innerText = "Revanche ⚔️"; }

    const myReward = data.rewards && data.rewards[myId] ? data.rewards[myId] : { baseCoins: 30, rushBonus: 0, totalCoins: 30 };
    window.currentCoinsGained = myReward.totalCoins;

    const winnerId = data.winnerId, isWinner = (winnerId === myId);
    const cinematicContainer = document.getElementById('winner-cinematic-container');
    
    let winnerObj = null;
    if (winnerId) {
        if (winnerId === myId) winnerObj = { username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag, inventory: myProfile.inventory, unlocked_items: myProfile.unlocked_items };
        else if (cachedOpponent && (winnerId === cachedOpponent.id || winnerId === cachedOpponent.socketId)) winnerObj = cachedOpponent;
        else if (data.players[winnerId]) winnerObj = parsePlayer(data.players[winnerId]);
    }

    if (winnerObj) cinematicContainer.innerHTML = getWinnerAvatarShowcaseHTML(winnerObj);
    else cinematicContainer.innerHTML = `<div class="victory-avatar-showcase"><div style="font-size: 28px; margin-bottom: 4px;">🤝</div><div style="font-size: 13px; font-weight: 900; color: #00d2ff;">ÉGALITÉ !</div></div>`;

    if (isWinner) { banner.innerText = "🏆 VICTOIRE !"; banner.style.color = "#00d2ff"; SoundEngine.playVictory(); }
    else if (winnerId) { banner.innerText = "❌ DÉFAITE !"; banner.style.color = "#ff007f"; }
    else { banner.innerText = "⏱️ ÉGALITÉ !"; banner.style.color = "#ff8a00"; }
    
    document.getElementById('recap-reason').innerText = data.reason;
    document.getElementById('recap-my-target').innerText = myData ? myData.target : '-';
    document.getElementById('recap-opp-target').innerText = oppData ? oppData.target : '-';
    document.getElementById('recap-my-score').innerText = myData ? myData.score : 0;

    let htmlCoins = `+${myReward.baseCoins}`;
    if (myReward.rushBonus > 0) htmlCoins += ` <span style="color:#ff8a00;">+${myReward.rushBonus}(RUSH)</span>`;
    document.getElementById('recap-coins-gained').innerHTML = htmlCoins;
    modal.style.display = 'flex'; registerIfPossible();
}

socket.on('solo_reward_result', (data) => {
    window.currentCoinsGained = data.earnedCoins;
    let htmlCoins = `+${data.baseCoins}`;
    if (data.rushBonus > 0) htmlCoins += ` <span style="color:#ff8a00;">+${data.rushBonus}(RUSH)</span>`;
    document.getElementById('recap-coins-gained').innerHTML = htmlCoins;

    if (data.triggerWheel) {
        setTimeout(() => {
            document.getElementById('recap-modal').style.display = 'none';
            document.getElementById('modal-jackpot-wheel').style.display = 'flex';
            const wheelEl = document.getElementById('wheel-element');
            wheelEl.style.transition = 'none'; wheelEl.style.transform = 'rotate(0deg)';
            document.getElementById('btn-spin-wheel').disabled = false;
            document.getElementById('btn-spin-wheel').style.opacity = '1';
            document.getElementById('wheel-result-text').innerText = '';
        }, 800);
    }
});

function handle1v1TileClick(num, index) {
    if (window.current1v1Time <= 0) return;
    socket.emit('player_click_1v1', index);
}

function startSoloTraining(mode) {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    window.activeTrainingMode = mode || 'classic';
    hideAllScreens();
    window.soloTarget = (window.activeTrainingMode === 'random') ? Math.floor(Math.random() * 50) + 1 : 1;
    window.soloScore = 0; window.soloTimeLeft = 30; window.isTimeFrozen = false;
    
    document.getElementById('screen-game').style.display = 'block';
    document.getElementById('hud-solo').style.display = 'grid';
    document.getElementById('hud-1v1').style.display = 'none';
    document.getElementById('hud-tow').style.display = 'none';
    document.getElementById('game-target-giant').innerText = window.soloTarget;
    document.getElementById('solo-score').innerText = window.soloScore;
    document.getElementById('game-timer').innerText = window.soloTimeLeft;
    preparePowerHUD(); generateSoloGrid(); SoundEngine.startMusic('solo');

    window.soloTimerInterval = setInterval(() => {
        if (!window.isTimeFrozen) {
            window.soloTimeLeft--;
            document.getElementById('game-timer').innerText = Math.max(0, window.soloTimeLeft);
            if (window.soloTimeLeft <= 0) endSoloGame();
        }
    }, 1000);
}

function generateSoloGrid() {
    let pool = [window.soloTarget];
    let candidates = [];
    for (let i = 1; i <= 50; i++) if (i !== window.soloTarget) candidates.push(i);
    candidates.sort(() => Math.random() - 0.5);
    pool = pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
    renderGrid(pool, handleSoloTileClick);
}

function handleSoloTileClick(num) {
    if (window.soloTimeLeft <= 0) return;
    if (window.activeTrainingMode === 'classic') {
        if (num === window.soloTarget) {
            SoundEngine.playClick();
            window.soloTarget++; window.soloScore += 10;
            document.getElementById('game-target-giant').innerText = window.soloTarget;
            document.getElementById('solo-score').innerText = window.soloScore;
            generateSoloGrid();
        } else {
            SoundEngine.playError();
            if (!window.isTimeFrozen) {
                window.soloTimeLeft = Math.max(0, window.soloTimeLeft - 1);
                document.getElementById('game-timer').innerText = Math.max(0, window.soloTimeLeft);
                if (window.soloTimeLeft <= 0) endSoloGame();
            }
        }
    } else if (window.activeTrainingMode === 'random') {
        if (num === window.soloTarget) {
            SoundEngine.playClick();
            window.soloScore += 15;
            window.soloTarget = Math.floor(Math.random() * 50) + 1;
            document.getElementById('game-target-giant').innerText = window.soloTarget;
            document.getElementById('solo-score').innerText = window.soloScore;
            generateSoloGrid();
        } else {
            SoundEngine.playError();
            if (!window.isTimeFrozen) {
                window.soloTimeLeft = Math.max(0, window.soloTimeLeft - 1);
                document.getElementById('game-timer').innerText = Math.max(0, window.soloTimeLeft);
                if (window.soloTimeLeft <= 0) endSoloGame();
            }
        }
    }
}

function startAvalancheGame(speed, initialCount) {
    if (!isProfileValid()) { checkAndShowProfileModal(); return; }
    hideAllScreens();
    document.getElementById('screen-game').style.display = 'block';
    document.getElementById('hud-solo').style.display = 'grid';
    document.getElementById('hud-1v1').style.display = 'none';
    document.getElementById('hud-tow').style.display = 'none';

    window.soloScore = 0; window.avalancheTimeLeft = 30; window.isTimeFrozen = false;
    document.getElementById('solo-score').innerText = window.soloScore;
    document.getElementById('game-timer').innerText = window.avalancheTimeLeft;

    window.avalancheGridData = Array(16).fill(null);
    window.avalancheTarget = null;
    for (let i = 0; i < initialCount; i++) spawnAvalancheNumber();
    updateAvalancheTarget(); renderAvalancheGrid(); preparePowerHUD();
    SoundEngine.startMusic('solo');

    window.avalancheTimerInterval = setInterval(() => {
        if (!window.isTimeFrozen) {
            window.avalancheTimeLeft--;
            document.getElementById('game-timer').innerText = Math.max(0, window.avalancheTimeLeft);
            if (window.avalancheTimeLeft <= 0) {
                clearInterval(window.avalancheTimerInterval); clearInterval(window.avalancheInterval); endSoloGame();
            }
        }
    }, 1000);

    window.avalancheInterval = setInterval(() => {
        if (!window.isTimeFrozen) {
            let added = spawnAvalancheNumber(); renderAvalancheGrid();
            if (!added) { clearInterval(window.avalancheTimerInterval); clearInterval(window.avalancheInterval); endSoloGame(); }
        }
    }, speed);
}

function spawnAvalancheNumber() {
    let emptyIndices = [];
    window.avalancheGridData.forEach((val, idx) => { if (val === null) emptyIndices.push(idx); });
    if (emptyIndices.length === 0) return false;
    let randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    window.avalancheGridData[randomIdx] = Math.floor(Math.random() * 50) + 1;
    if (window.avalancheTarget === null) updateAvalancheTarget();
    return true;
}

function updateAvalancheTarget() {
    let activeNumbers = window.avalancheGridData.filter(v => v !== null);
    if (activeNumbers.length > 0) {
        window.avalancheTarget = activeNumbers[Math.floor(Math.random() * activeNumbers.length)];
        document.getElementById('game-target-giant').innerText = window.avalancheTarget;
    } else {
        window.avalancheTarget = null; document.getElementById('game-target-giant').innerText = '-';
    }
}

function renderAvalancheGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return; grid.innerHTML = '';
    const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
    const isAltTheme = equippedTheme === 'theme_alt';
    window.avalancheGridData.forEach((val, idx) => {
        const tile = document.createElement('div');
        if (val !== null) {
            tile.className = `tile ${isAltTheme ? 'alt-theme' : ''}`;
            tile.innerText = val; tile.onclick = () => handleAvalancheClick(val, idx);
        } else { tile.className = 'tile empty'; tile.innerText = ''; }
        grid.appendChild(tile);
    });
}

function handleAvalancheClick(val, idx) {
    if (val === window.avalancheTarget) {
        SoundEngine.playClick();
        window.avalancheGridData[idx] = null; window.soloScore += 20;
        document.getElementById('solo-score').innerText = window.soloScore;
        updateAvalancheTarget(); renderAvalancheGrid();
    } else SoundEngine.playError();
}

function endSoloGame() {
    hideAllScreens();
    const modal = document.getElementById('recap-modal');
    window.rewardDoubled = false;
    const doubleBtn = document.getElementById('btn-double-reward');
    doubleBtn.disabled = false; doubleBtn.style.opacity = '1';
    doubleBtn.innerText = '📺 Doubler mes gains (Pub)';

    const rematchBtn = document.getElementById('btn-rematch');
    if (rematchBtn) rematchBtn.style.display = 'none';

    socket.emit('claim_solo_reward', window.soloScore);

    document.getElementById('winner-cinematic-container').innerHTML = `
        <div class="victory-avatar-showcase">
            <div class="victory-badge-large"><span style="font-size: 28px;">🏋️</span></div>
        </div>
    `;

    document.getElementById('recap-banner').innerText = "🏋️ ENTRAÎNEMENT TERMINÉ";
    document.getElementById('recap-banner').style.color = "#00d2ff";
    document.getElementById('recap-1v1-rows').style.display = 'none';
    document.getElementById('recap-reason').innerText = `Score : ${window.soloScore}`;
    document.getElementById('recap-my-score').innerText = window.soloScore;

    SoundEngine.playVictory(); modal.style.display = 'flex';
}

function renderGrid(pool, handler) {
    const grid = document.getElementById('grid');
    if (!grid) return; grid.innerHTML = '';
    if (!pool) return;
    const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
    const isAltTheme = equippedTheme === 'theme_alt';
    pool.forEach((num, index) => {
        const tile = document.createElement('div');
        tile.className = `tile ${isAltTheme ? 'alt-theme' : ''}`;
        tile.innerText = num; tile.onclick = () => handler(num, index);
        grid.appendChild(tile);
    });
}

function toggleLanguage() {
    currentLanguage = (currentLanguage === 'fr') ? 'en' : 'fr';
    localStorage.setItem('cb_lang', currentLanguage);
    applyTranslations();
    if (document.getElementById('modal-shop').style.display === 'flex') switchShopTab(window.currentShopTab || 'bonus');
    if (document.getElementById('modal-ranked-loadout').style.display === 'flex') renderRankedLoadoutItems();
    if (document.getElementById('modal-blitz-pass').style.display === 'flex') renderBlitzPass();
    updateCombinedExplanationVisibility();
}

function applyTranslations() {
    const dict = i18n[currentLanguage];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerText = dict[key];
    });
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.innerText = (currentLanguage === 'fr') ? 'ENG' : 'FR';
}

const SoundEngine = {
    ctx: null, isMuted: false, timerId: null, currentMode: null, step: 0, bpm: 115,
    init() { 
        try {
            if (!this.ctx) { 
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx(); 
            }
            if (this.ctx.state === 'suspended') this.ctx.resume();
        } catch(e) {}
    },
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) this.stopMusic(false);
        else if (this.currentMode) this.startMusic(this.currentMode);
        return this.isMuted;
    },
    playClick() {
        if (this.isMuted) return; this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.05);
    },
    playError() {
        if (this.isMuted) return; this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(60, t + 0.12);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.12);
    },
    playVictory() {
        if (this.isMuted) return; this.init();
        if (!this.ctx) return;
        [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
            setTimeout(() => {
                if (this.isMuted || !this.ctx) return;
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
                osc.type = 'square';
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
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.timerId && this.currentMode === mode) return;
        this.stopMusic(false);
        this.currentMode = mode;
        this.step = 0;
        this.bpm = (mode === 'menu') ? 115 : 138;
        const intervalMs = (60 / this.bpm / 4) * 1000;

        this.timerId = setInterval(() => {
            if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
            if (this.currentMode === 'menu') {
                this.tickMenu8Bit(this.step);
            } else {
                this.tickGeometryDash(this.step);
            }
            this.step = (this.step + 1) % 64;
        }, intervalMs);
    },
    tickMenu8Bit(step) {
        const t = this.ctx.currentTime;
        const melodyNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23];
        
        if (step % 4 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(130.81, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(t); osc.stop(t + 0.1);
        }

        if (step % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            const note = melodyNotes[(step / 2) % melodyNotes.length];
            osc.frequency.setValueAtTime(note, t);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(t); osc.stop(t + 0.08);
        }
    },
    tickGeometryDash(step) {
        const t = this.ctx.currentTime;
        
        if (step % 16 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
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
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass'; filter.frequency.setValueAtTime(2500, t); filter.Q.setValueAtTime(2, t);
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

        osc.type = 'sawtooth';
        const noteFreq = gdNotes[step % gdNotes.length];
        osc.frequency.setValueAtTime(noteFreq, t);

        filter.type = 'lowpass';
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
    document.getElementById('mute-btn').innerText = muted ? '🔇' : '🔊';
}

document.addEventListener('click', () => { SoundEngine.init(); }, { once: true });
