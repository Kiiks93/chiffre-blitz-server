/* ============================================================
PROFIL.JS — GESTION PROFIL, COMPTE & PERSONNALISATION
============================================================ */

/* ============================================================
1. CONSTANTES
============================================================ */
const CONFIG = {
SERVER_URL: window.location.hostname.endsWith('.onrender.com') 
    ? window.location.origin 
    : 'https://chiffre-blitz-server.onrender.com',
  MIN_PSEUDO_LENGTH: 3,
  MIN_CODE_LENGTH: 8,
  MAX_AVATAR_NUM: 999,
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY_MS: 1000,
  EMOTE_COOLDOWN_MS: 300,
  TWEEN_DURATION_MS: 900,
  DELTA_DISPLAY_MS: 1600,
  TOAST_DURATION_MS: 4500,
  LOGO_CLICK_TIMEOUT_MS: 5000,
  LOGO_CLICK_COUNT: 10
};

const RANKS = [
  { min: 1300, fr: "Calculateur ⚡", en: "Calculator ⚡" },
  { min: 700, fr: "Expert 🧠", en: "Expert 🧠" },
  { min: 300, fr: "Chiffre 🔢", en: "Cipher 🔢" },
  { min: 0, fr: "Novice 🌱", en: "Novice 🌱" }
];

const FRAME_CLASS_MAP = {
  frame_standard: "standard-frame",
  frame_silver: "silver-frame",
  frame_chroma: "chroma-frame",
  frame_prism: "prism-frame",
  frame_voltage: "voltage-frame",
  frame_obsidian: "obsidian-frame",
  frame_givre: "givre-frame",
  frame_osseux: "osseux-frame",
  frame_fantome: "fantome-frame",
  frame_bonbon: "bonbon-frame",
  frame_guirlande: "guirlande-frame",
  frame_lutin: "lutin-frame"
};

const EMOTES = ["\u{1F525}", "\u26A1", "\u{1F916}", "\u{1F480}", "\u{1F602}", "\u{1F451}"];

/* ============================================================
2. CONNEXION SERVEUR
============================================================ */
if (!CONFIG.SERVER_URL || CONFIG.SERVER_URL.indexOf("chiffre-blitz.fr") !== -1) {
  CONFIG.SERVER_URL = "https://chiffre-blitz-server.onrender.com";
}
const socket = io(CONFIG.SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: CONFIG.RECONNECTION_ATTEMPTS,
  reconnectionDelay: CONFIG.RECONNECTION_DELAY_MS,
  query: { v: typeof VERSION_CLIENT !== 'undefined' ? VERSION_CLIENT.version : "1.3.0" },
  auth: { maintCode: localStorage.getItem('cb_maint_code') || "" }
});

// ✅ CORRECTION 1 : Gestion version_blocked + disconnect amélioré
socket.on("version_blocked", () => {
  console.warn('⚠️ Version obsolète détectée, rechargement forcé...');
  const url = new URL(window.location.href);
  url.searchParams.set('_v', Date.now());
  window.location.replace(url.toString());
});

socket.on("disconnect", (reason) => {
  SoundEngine.stopMusic(true);
  // Si déconnexion anormale par le serveur, tenter un reload après 3s
  if (reason === 'io server disconnect' && !window.__kicked) {
    setTimeout(() => {
      if (!socket.connected) {
        const url = new URL(window.location.href);
        url.searchParams.set('_r', Date.now());
        window.location.replace(url.toString());
      }
    }, 3000);
  }
});

socket.on("connect", () => {
  if (localStorage.getItem('cb_secret')) registerIfPossible();
  const urlParams = new URLSearchParams(window.location.search);
  const targetRoom = urlParams.get("room");
  if (targetRoom && isProfileValid()) {
    setTimeout(() => { joinRoomDirect(targetRoom.toUpperCase(), ""); }, 500);
  }
});

// 🛡️ Écoute force_disconnect : retour à la fenêtre de connexion
function attachForceDisconnect() {
  if (typeof socket !== 'undefined' && socket && socket.on) {
    socket.on('force_disconnect', (data) => {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #ff416c, #ff4b2b);
        color: white; padding: 12px 20px; border-radius: 12px;
        font-weight: bold; font-size: 14px; z-index: 9999; text-align: center;
        box-shadow: 0 4px 20px rgba(255,75,43,0.5);
        animation: slideDown 0.3s ease-out;
      `;
      toast.innerHTML = `⚠️ ${data.reason}<br><small style="opacity:0.8;">Retour à la connexion...</small>`;
      document.body.appendChild(toast);

      const name = (document.getElementById('user-name-display')?.innerText || '').trim();
      Object.keys(localStorage).forEach(k => {
        const v = localStorage.getItem(k) || '';
        const kl = k.toLowerCase();
        const isProfileKey = /profile|user|login|secret|code|pass|pseudo|player|account|session|blitz|cb_/.test(kl);
        if (isProfileKey || (name && name !== 'Définir pseudo' && v.includes(name))) {
          localStorage.removeItem(k);
        }
      });
      sessionStorage.clear();
      localStorage.setItem('cb_kicked', '1');
      setTimeout(() => location.reload(), 1500);
    });
    console.log('✅ Écouteur anti double-compte activé');
  } else {
    setTimeout(attachForceDisconnect, 100);
  }
}
attachForceDisconnect();

window.addEventListener('load', () => {
  window.__kicked = false;
  if (localStorage.getItem('cb_kicked')) {
    localStorage.removeItem('cb_kicked');
    setTimeout(() => {
      if (typeof openLaunchAdModal === 'function') openLaunchAdModal();
    }, 600);
  }
});

/* ============================================================
3. ÉTAT GLOBAL
============================================================ */
let myProfile = {
  username: localStorage.getItem("cb_username") || "",
  region: localStorage.getItem("cb_region") || "Hauts-de-France",
  avatar: parseInt(localStorage.getItem("cb_avatar")) || 1,
  flag: localStorage.getItem("cb_flag") || "🇫🇷",
  secretCode: localStorage.getItem('cb_secret') || '',
  points: 0, coins: 0, trophies: 0, wins: 0, losses: 0,
  inventory: {
    __equipped: {
      title: localStorage.getItem("cb_equipped_title") || "",
      frame: localStorage.getItem("cb_equipped_frame") || "",
      theme: localStorage.getItem("cb_equipped_theme") || ""
    }
  },
  unlocked_items: [],
  equippedPower: null,
  equippedPowers: [],
  blitzPassPremium: false,
  claimedPassTiers: {},
  currentSeasonId: "s1"
};

let cachedOpponent = null;
let pendingProfileValidation = false;
let pendingAccountLogin = false;
let pendingCustomization = false;
let adCallbackFunction = null;
let recapActive = false;
let launchAdWatched = false;
let selectedRankedItems = [];
let latestGlobalEvents = {};
let latest1v1StartData = null;
let pendingGameOverData = null;
let activeAvatarChoice = "standard";
let currentFriendFilter = "all";
let myGameInvites = [];
let lastEmoteTime = 0;
let lastDisplayed = { coins: null, trophies: null, points: null };
let profileMode = "create";

window.lastRequestsCount = 0;

const POWERS_CATALOG = [
  { id: "spotlight", price: 300, type: "bonus" },
  { id: "freeze", price: 700, type: "bonus" },
  { id: "joker", price: 1200, type: "bonus" },
  { id: "nova", price: 2500, type: "bonus" },
  { id: "quake", price: 400, type: "malus" },
  { id: "micro", price: 800, type: "malus" },
  { id: "eclipse", price: 1500, type: "malus" },
  { id: "chaos", price: 4000, type: "malus" },
  { id: "theme_glacial", price: 1200, type: "cosmetics" },
  { id: "frame_voltage", price: 2200, type: "cosmetics" },
  { id: "frame_obsidian", price: 4500, type: "cosmetics" },
  { id: "theme_eclair", price: 1500, type: "cosmetics" },
  { id: "frame_givre", price: 2200, type: "cosmetics" },
  { id: "theme_alt", price: 1800, type: "cosmetics" },
  { id: "frame_prism", price: 2600, type: "cosmetics" },
  { id: "theme_obsidian", price: 1800, type: "cosmetics" },
  { id: "pack_haute_tension", price: 2900, type: "packs" },
  { id: "pack_cryo", price: 2700, type: "packs" },
  { id: "pack_solaire", price: 3200, type: "packs" },
  { id: "pack_obsidienne", price: 5200, type: "packs" }
];

const PACKS_LIST = [
  { id: "pack_standard", name: "🔰 Standard", theme: "", frame: "frame_standard" },
  { id: "pack_haute_tension", name: "⚡ Haute Tension", theme: "theme_eclair", frame: "frame_voltage" },
  { id: "pack_cryo", name: "🧊 Cryo", theme: "theme_glacial", frame: "frame_givre" },
  { id: "pack_solaire", name: "✨ Doré", theme: "theme_alt", frame: "frame_prism" },
  { id: "pack_obsidienne", name: "🖤 Obsidienne", theme: "theme_obsidian", frame: "frame_obsidian" },
  { id: "pack_neon", name: "🌈 Néon", theme: "theme_neon", frame: "frame_chroma" },
  { id: "pack_halloween_citrouille", name: "🎃 Pack Lanterne", theme: "theme_citrouille", frame: "frame_osseux" },
  { id: "pack_halloween_fantome", name: "👻 Pack Fantôme", theme: "theme_fantome", frame: "frame_fantome" },
  { id: "pack_noel_bonbon", name: "🍭 Pack Bonbon", theme: "theme_bonbon", frame: "frame_bonbon" },
  { id: "pack_noel_sapin", name: "🎄 Pack Sapin", theme: "theme_sapin", frame: "frame_guirlande" },
  { id: "pack_noel_lutin", name: "🧝 Pack Lutin", theme: "theme_lutin", frame: "frame_lutin" }
];

/* ============================================================
4. HELPERS PROFIL
============================================================ */
function getPlayerTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'; }
  catch (e) { return 'Europe/Paris'; }
}
function getFlagEmoji(flag) {
  if (!flag) return "🇫🇷";
  let cleanFlag = flag.replace(/['"]/g, "").trim();
  if (cleanFlag.length === 2) {
    try {
      const codePoints = cleanFlag.toUpperCase().split("").map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch (e) {
      return "🇫🇷";
    }
  }
  return cleanFlag;
}

function parsePlayer(p) {
  if (!p) return {};
  return {
    id: p.id || "",
    username: p.username || p.name || p.pseudo || "Joueur",
    region: p.region || "Hauts-de-France",
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
  const lang = currentLang === "fr" ? "fr" : "en";
  for (const rank of RANKS) {
    if (points >= rank.min) return rank[lang];
  }
  return RANKS[RANKS.length - 1][lang];
}

function getFrameClass(equippedFrame) {
  return FRAME_CLASS_MAP[equippedFrame] || "";
}

function isStrongCode(code) {
  if (!code || code.length < CONFIG.MIN_CODE_LENGTH) return false;
  const hasLower = /[a-z]/.test(code);
  const hasUpper = /[A-Z]/.test(code);
  const hasDigit = /\d/.test(code);
  const hasSpecial = /[!@#$%&*+\-_=]/.test(code);
  return hasLower && hasUpper && hasDigit && hasSpecial;
}

/* ============================================================
5. NOMS D'AFFICHAGE TRADUITS
============================================================ */
function getAvatarDisplayNames() {
  const fr = currentLang === "fr";
  return {
    avatar_lottie_palier15: fr ? "🐱 Chat Assistant (Pass S1)" : "🐱 Assistant Cat (Pass S1)",
    avatar_lottie_palier30: fr ? "🌈 Chat Arc-en-ciel (Pass S1)" : "🌈 Rainbow Cat (Pass S1)",
    avatar_tigre: fr ? "🐯 Tigre de Sibérie (GRAAL S1)" : "🐯 Siberian Tiger (GRAAL S1)",
    avatar_s2_squelette: fr ? "💀 Squelette qui danse (Pass S2)" : "💀 Dancing Skeleton (Pass S2)",
    avatar_s2_chauve: fr ? "🦇 Chauve-Souris (Pass S2)" : "🦇 Bat (Pass S2)",
    avatar_s2_citrouille: fr ? "🎃 Citrouille du Château (GRAAL S2)" : "🎃 Castle Pumpkin (GRAAL S2)",
    avatar_s3_bonhomme: fr ? "⛄ Bonhomme de neige (Pass S3)" : "⛄ Snowman (Pass S3)",
    avatar_s3_boule: fr ? "🔮 Boule de neige (Pass S3)" : "🔮 Snowball (Pass S3)",
    avatar_s3_perenoel: fr ? "🎅 Père Noël (Pass S3)" : "🎅 Santa Claus (Pass S3)"
  };
}

function getTitleDisplayNames() {
  const fr = currentLang === "fr";
  const d = i18n[currentLang];
  return {
    title_stalker: "🕵️ " + (fr ? "Stalker Numérique" : "Digital Stalker"),
    title_felin: "🐱 " + (fr ? "Réflexe Félin" : "Feline Reflex"),
    title_neon: "🌈 " + (fr ? "Pulsion Néon" : "Neon Pulse"),
    title_spectre: "🌌 " + (fr ? "Spectre Cosmique" : "Cosmic Specter"),
    title_supreme: "⚡ " + (fr ? "FÉLIN SUPRÊME" : "SUPREME FELINE"),
    title_champion: "🏅 " + (fr ? "Champion Éclair" : "Lightning Champion"),
    title_combattant: "🎖️ " + d.trophy_name_combatant,
    title_elite: "🏵️ " + d.trophy_name_elite,
    title_eveille: "⚡ " + d.trophy_name_awakening,
    title_flamme: "🔥 " + d.trophy_name_furnace,
    title_parfait: "💎 " + d.trophy_name_perfection,
    title_vainqueur: "⚔️ " + (fr ? "Vainqueur" : "Victor"),
    title_inarrettable: "🔥 " + d.trophy_name_unstoppable,
    title_gladiateur: "🛡️ " + d.trophy_name_gladiator,
    title_champion_trophy: "👑 " + d.trophy_name_champion,
    title_maitre_avalanche: "🎯 " + d.trophy_name_avalanche_master,
    title_travailleur: "⛏️ " + d.trophy_name_worker,
    title_etoile: "⭐ " + d.trophy_name_rising_star,
    title_roi_local: "🏰 " + d.trophy_name_local_king,
    title_midas: "💰 " + d.trophy_name_midas,
    title_dynastie: "🏛️ " + d.trophy_name_dynasty,
    title_mondial: "🌍 " + d.trophy_name_world_n1,
    title_fantome: "👻 " + (fr ? "Chuchoteur de Fantômes" : "Ghost Whisperer"),
    title_danse_macabre: "🦴 " + (fr ? "Danse Macabre" : "Macabre Dance"),
    title_citrouille: "🎃 " + (fr ? "Pulsion Citrouille" : "Pumpkin Pulse"),
    title_spectre_automne: "🍂 " + (fr ? "Spectre d'Automne" : "Autumn Specter"),
    title_roi_halloween: "🎃 " + (fr ? "ROI D'HALLOWEEN" : "KING OF HALLOWEEN"),
    title_esprit_halloween: "👻 " + (fr ? "Esprit d'Halloween" : "Halloween Spirit"),
    title_lutin: "🧝 " + (fr ? "Lutin espiègle" : "Mischievous Elf"),
    title_traineau: "🛷 " + (fr ? "Pilote de traîneau" : "Sleigh Pilot"),
    title_rennes: "🦌 " + (fr ? "Dompteur de rennes" : "Reindeer Tamer"),
    title_assistant_noel: "🎅 " + (fr ? "Assistant du Père Noël" : "Santa's Assistant"),
    title_magie_noel: "✨ " + (fr ? "Magie de Noël" : "Christmas Magic"),
    title_esprit_noel: "🎄 " + (fr ? "Esprit de Noël" : "Christmas Spirit"),
    title_grimpeur_neon: "🧗 " + (fr ? "Grimpeur Néon" : "Neon Climber"),
    title_chasseur_hante: "👻 " + (fr ? "Chasseur Hanté" : "Haunted Hunter"),
    title_roi_citrouille_tour: "🎃 " + (fr ? "Roi Citrouille" : "Pumpkin King"),
    title_veilleur_cimes: "🗼 " + (fr ? "Veilleur des Cimes" : "Summit Watcher"),
    title_maitre_tour: "🏆 " + (fr ? "Maître de la Tour" : "Tower Master")
  };
}

function getFrameDisplayNames() {
  const fr = currentLang === "fr";
  return {
    frame_standard: "🔰 " + (fr ? "Cadre « Standard »" : "Frame « Standard »"),
    frame_silver: "🛡️ " + (fr ? "Cadre « Argenté »" : "Frame « Silver »"),
    frame_chroma: "🌈 " + (fr ? "Cadre « Flux Chroma »" : "Frame « Chroma Flow »"),
    frame_prism: "✨ " + (fr ? "Cadre « Doré »" : "Frame « Gold »"),
    frame_voltage: "⚡ " + (fr ? "Cadre « Sous Tension »" : "Frame « Voltage »"),
    frame_obsidian: "🖤 " + (fr ? "Cadre « Obsidienne »" : "Frame « Obsidian »"),
    frame_givre: "🧊 " + (fr ? "Cadre « Givre »" : "Frame « Frost »"),
    frame_osseux: "🎃 " + (fr ? "Cadre « Lanterne »" : "Frame « Lantern »"),
    frame_fantome: "👻 " + (fr ? "Cadre « Fantôme »" : "Frame « Ghost »"),
    frame_bonbon: "🍭 " + (fr ? "Cadre « Bonbon »" : "Frame « Candy »"),
    frame_guirlande: "🎄 " + (fr ? "Cadre « Guirlande »" : "Frame « Garland »"),
    frame_lutin: "🧝 " + (fr ? "Cadre « Lutin »" : "Frame « Elf »"),
    frame_cristal: "💎 " + (fr ? "Cadre Cristal" : "Crystal Frame"),
    frame_circuit: "🔌 " + (fr ? "Cadre Circuit" : "Circuit Frame"),
    frame_toile: "🕸️ " + (fr ? "Cadre Toile" : "Web Frame"),
    frame_aurore: "🌅 " + (fr ? "Cadre Aurore" : "Aurora Frame")
  };
}

/* ============================================================
6–10. (Sections inchangées — registerIfPossible, saveLocalPreferences,
       updateEconomyUI, sanitizeEquippedPowers, renderBlitzPass, etc.)
       [Le reste du code entre les sections 5 et 11 reste IDENTIQUE
        à ton fichier original — aucune modification nécessaire.]
============================================================ */

/* ============================================================
11. INSCRIPTION / CONNEXION SOCKET
============================================================ */
function registerIfPossible() {
  if (!myProfile.username || !myProfile.secretCode) return;
  const isReturning = !!localStorage.getItem('cb_username');
  if (!isReturning) localStorage.setItem('cb_username', myProfile.username);
  socket.emit("register_player", {
    username: myProfile.username, region: myProfile.region, avatar: myProfile.avatar, flag: myProfile.flag,
    inventory: myProfile.inventory,
    secretCode: myProfile.secretCode || localStorage.getItem('cb_secret') || '',
    mode: isReturning ? 'login' : (profileMode || 'create'),
    timezone: getPlayerTimezone()
  });
}

socket.on("player_registered", (rawData) => {
  if (!rawData) return;
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
  myProfile.inventory = player.inventory || {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  myProfile.unlocked_items = player.unlocked_items || [];
  myProfile.equippedPower = player.equippedPower;
  myProfile.blitzPassPremium = player.blitzPassPremium;
  myProfile.claimedPassTiers = player.claimedPassTiers;
  myProfile.currentSeasonId = rawData.current_season || rawData.currentSeasonId || "s1";
  myProfile.seasonProgress = rawData.seasonProgress || {};
  myProfile.unlockedTier = rawData.unlockedTier || 0;
  sanitizeEquippedPowers();
  updateEconomyUI();
  
  if (document.getElementById("modal-shop").style.display === "flex") switchShopTab(currentShopTab);
  if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  if (document.getElementById("screen-game").style.display === "block") preparePowerHUD();
});

socket.on("online_count", (data) => {
  const el = document.getElementById("online-count-display");
  if (el) el.innerText = data.online;
});

let justCreatedAccount = false;

// ✅ CORRECTION 3 : Un SEUL listener register_result (le double a été supprimé)
socket.on('register_result', (res) => {
  if (!res.ok) {
    // ✅ 1. GESTION PROPRE DE LA MAINTENANCE (On ne wipe pas le localStorage !)
    if (res.reason === 'maintenance') {
      pendingProfileValidation = false;
      pendingAccountLogin = false;
      cbShowMaintenanceLocked(res.message);
      return;
    }
    
    // ❌ 2. ERREURS CLASSIQUES (On wipe la session locale)
    pendingProfileValidation = false;
    localStorage.removeItem('cb_username'); localStorage.removeItem('cb_secret'); localStorage.removeItem('cb_region');
    localStorage.removeItem('cb_avatar'); localStorage.removeItem('cb_flag');
    localStorage.removeItem('cb_equipped_title'); localStorage.removeItem('cb_equipped_frame'); localStorage.removeItem('cb_equipped_theme');
    
    myProfile.username = ''; 
    myProfile.secretCode = ''; 
    myProfile.inventory = { __equipped: {} };
    
    if (res.reason === 'taken') alert('❌ Code secret incorrect pour ce pseudo.');
    else if (res.reason === 'nocode') alert('🔒 Choisis un code secret (4 caractères minimum).');
    else if (res.reason === 'short') alert('Ton pseudo doit contenir au moins 3 caractères !');
    else if (res.reason === 'not_found') {
      alert('❌ Compte introuvable. Veuillez créer un nouveau compte.');
      checkAndShowProfileModal();
    }
    else alert('❌ Erreur de connexion au serveur. Réessaie.');
    
    if (pendingAccountLogin) { 
      pendingAccountLogin = false; 
      renderAccountContent(); 
    }
    return;
  }
  
  // ✅ 3. SUCCÈS : Création de compte
  if (pendingAccountLogin) {
    pendingAccountLogin = false;
    saveLocalPreferences();
    updateEconomyUI();
    
    if (res.created) {
      justCreatedAccount = true;
      socket.emit('get_recovery_key', { secretCode: myProfile.secretCode });
    } else {
      closeAccountModal();
      showTitleScreen();
    }
    return;
  }
  
  // ✅ 4. SUCCÈS : Validation du profil (retour au jeu)
  if (pendingProfileValidation) {
    pendingProfileValidation = false;
    saveLocalPreferences();
    const modal = document.getElementById('modal-username');
    if (modal) modal.style.display = 'none';
    
    if (launchAdWatched) showMainMenu();
    else openLaunchAdModal();
  }
});

socket.on("blitz_pass_updated", (data) => {
  if (data.coins !== undefined) myProfile.coins = data.coins;
  if (data.blitzPassPremium !== undefined) myProfile.blitzPassPremium = data.blitzPassPremium;
  if (data.claimedPassTiers) myProfile.claimedPassTiers = data.claimedPassTiers;
  updateEconomyUI();
  if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  showNotificationToast(currentLang === "fr" ? "✨ Passe de Saison mis à jour avec succès !" : "✨ Season Pass updated successfully!", "gift");
});

/* ============================================================
12. NOTIFICATIONS + ANNONCES + ÉVÉNEMENTS
============================================================ */
function showNotificationToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:10000; display:flex; flex-direction:column; gap:6px; pointer-events:none; width:90%; max-width:400px;`;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement("div");
  let bg = "rgba(0, 210, 255, 0.95)";
  let border = "#00d2ff";
  let color = "#000";
  
  if (type === "gift") {
    bg = "rgba(248, 181, 0, 0.95)";
    border = "#f8b500";
    color = "#000";
  } else if (type === "announcement") {
    bg = "rgba(255, 75, 43, 0.95)";
    border = "#ff4b2b";
    color = "#fff";
  }
  
  toast.style.cssText = `background:${bg}; border:2px solid ${border}; color:${color}; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:12px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.5); pointer-events:auto; animation:toastFade ${CONFIG.TOAST_DURATION_MS}ms ease forwards;`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, CONFIG.TOAST_DURATION_MS);
}

socket.on("admin_gift_received", (data) => {
  const msg = data.message || (currentLang === "fr" ? "🎁 Cadeau reçu de l'Administrateur !" : "🎁 Gift received from the Admin!");
  showNotificationToast(`🎁 <b>${currentLang === "fr" ? "CADEAU ADMIN REÇU !" : "ADMIN GIFT RECEIVED!"}</b><br>` + msg, "gift");
  registerIfPossible();
});

socket.on('pass_reward_received', (data) => {
  const msg = data.message || (currentLang === "fr" ? "🎫 Récompense du Passe de Combat !" : "🎫 Battle Pass reward!");
  showNotificationToast(`🎫 <b>${currentLang === "fr" ? "PASSE DE COMBAT !" : "BATTLE PASS!"}</b><br>` + msg, 'gift');
});

socket.on("global_announcement", (msg) => {
  showNotificationToast(`📢 <b>${currentLang === "fr" ? "ANNONCE GLOBALE :" : "GLOBAL ANNOUNCEMENT:"}</b><br>` + msg, "announcement");
});

socket.on("events_state_update", (events) => {
  latestGlobalEvents = events;
  const banner = document.getElementById("player-event-banner");
  const towBtn = document.getElementById("btn-tow-menu");
  
  if (towBtn) towBtn.style.display = events.tugOfWarMode ? "flex" : "none";
  if (!banner) return;
  
  let activeList = [];
  if (events.coinRush) activeList.push("🪙 <b>Coin Rush</b> (Pièces x2)");
  if (events.rankShield) activeList.push("🛡️ <b>Rank Shield</b> (Zéro perte de points en classé)");
  if (events.expressoMatch) activeList.push("⚡ <b>Expresso Match</b> (Parties rapides en 20s)");
  if (events.chaosMode) activeList.push("🌪️ <b>Chaos Mode</b> (Modificateurs aléatoires)");
  if (events.jackpotEclair) activeList.push("🎁 <b>Jackpot Éclair</b> (Coffres mystères)");
  if (events.tugOfWarMode) activeList.push("🪢 <b>Mode Exclusif : Corde Raide</b>");
  if (events.halloweenMode) activeList.push("🎃 <b>Mode Exclusif : Chasse Hantée</b>");
  if (events.noelMode) activeList.push("🎄 <b>Mode Exclusif : Course aux Cadeaux</b>");
  
  if (activeList.length > 0) {
    banner.innerHTML = `⚡ <b>${currentLang === "fr" ? "ADMIN ABUSE EN COURS :" : "ADMIN ABUSE ACTIVE:"}</b><br>` + activeList.join("<br>");
    banner.style.display = "block";
  } else {
    banner.style.display = "none";
  }
});

/* ============================================================
13. RECONSTRUCTION DES BARRES D'ÉMOTICÔNES
============================================================ */
function fixEmoteBars() {
  document.querySelectorAll(".emote-bar").forEach(bar => {
    bar.innerHTML = "";
    EMOTES.forEach(em => {
      const b = document.createElement("button");
      b.className = "emote-btn";
      b.type = "button";
      b.innerText = em;
      b.onclick = () => sendEmote(em);
      bar.appendChild(b);
    });
  });
}

/* ============================================================
14. DÉMARRAGE
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  fixEmoteBars();
  updateEconomyUI();
  initMenuBackgroundFX();
  injectAccountGear();
  checkAndShowProfileModal();
  
  const mainLogo = document.querySelector("h1");
  if (mainLogo) {
    let logoClickCount = 0;
    let logoClickTimer = null;
    mainLogo.addEventListener("click", () => {
      logoClickCount++;
      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => { logoClickCount = 0; }, CONFIG.LOGO_CLICK_TIMEOUT_MS);
      if (logoClickCount >= CONFIG.LOGO_CLICK_COUNT) {
        logoClickCount = 0;
        openAdminPanel();
      }
    });
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const targetRoom = urlParams.get("room");
  if (targetRoom) {
    setTimeout(() => {
      if (isProfileValid()) openJoinCustomScreen(targetRoom.toUpperCase());
    }, 1000);
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!isProfileValid()) checkAndShowProfileModal();
  }, 1000);
});

function updateLastActiveTime() {
  localStorage.setItem("cb_last_active", Date.now().toString());
}

["click", "touchstart", "keydown", "scroll"].forEach(event => {
  document.addEventListener(event, updateLastActiveTime, { passive: true });
});

updateLastActiveTime();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    const lastActive = parseInt(localStorage.getItem("cb_last_active") || "0");
    const timeAway = Date.now() - lastActive;
    
    if (timeAway > 30000) {
      document.body.style.opacity = "0.99";
      requestAnimationFrame(() => {
        document.body.style.opacity = "1";
      }); 
    }
    updateLastActiveTime();
  }
});

if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data && e.data.action === "RELOAD_PAGE") {
      // 🔄 Reload DIFFÉRÉ : jamais en pleine partie
      if (cbInGame()) {
        window.__pendingUpdateReload = true;
        cbUpdateToast();
      } else {
        location.reload();
      }
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage("CHECK_BACKGROUND_TIME");
    }
  });
}

// 🎮 Le joueur est-il en pleine partie ?
function cbInGame() {
  const vis = (id) => { const el = document.getElementById(id); return el && (el.style.display === "block" || el.style.display === "flex"); };
  return vis("screen-game") || vis("tower-game") || vis("tw-brief") || vis("screen-catch") || (typeof recapActive !== "undefined" && recapActive);
}

// 💬 Toast discret « mise à jour en attente »
function cbUpdateToast() {
  if (document.getElementById("cb-update-toast")) return;
  const t = document.createElement("div");
  t.id = "cb-update-toast";
  t.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#0f051d,#1a1030);border:2px solid #00d2ff;color:#fff;padding:10px 18px;border-radius:12px;font-size:12px;font-weight:800;z-index:99998;box-shadow:0 0 18px #00d2ff66;text-align:center;";
  t.innerHTML = "🔄 Mise à jour prête !<br><small style='opacity:.8;font-weight:600;'>Elle s'appliquera à la fin de ta partie.</small>";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

// ⏱️ Dès que le joueur quitte sa partie → applique le reload en attente (≤3s)
setInterval(() => {
  if (window.__pendingUpdateReload && !cbInGame()) location.reload();
}, 3000);

/* ============================================================
🔄 CORRECTION 2 : POLLING DE VERSION — détection de mise à jour serveur
============================================================ */
let __currentClientVersion = (typeof VERSION_CLIENT !== 'undefined') 
  ? VERSION_CLIENT.version 
  : "1.3.0";

function __compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

async function checkServerVersion() {
  try {
    const res = await fetch(CONFIG.SERVER_URL + '/version?cb=' + Date.now(), { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return;
    const data = await res.json();
    
    if (data.minWeb && __compareVersions(__currentClientVersion, data.minWeb) < 0) {
      console.warn(`🔄 Nouvelle version requise: ${data.minWeb} (actuelle: ${__currentClientVersion})`);
      
      if (typeof cbInGame === 'function' && cbInGame()) {
        window.__pendingUpdateReload = true;
        if (typeof cbUpdateToast === 'function') cbUpdateToast();
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set('_upd', Date.now());
        window.location.replace(url.toString());
      }
    }
  } catch (e) {
    // Silencieux si le serveur est injoignable
  }
}

// Poll toutes les 60 secondes
setInterval(checkServerVersion, 60000);
// Vérification immédiate au chargement
setTimeout(checkServerVersion, 5000);

(function () {
  let hiddenAt = 0;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = Date.now();
    } else {
      const away = Date.now() - (hiddenAt || Date.now());
      hiddenAt = 0;

      if (away > 800) {
        document.body.style.display = "none";
        void document.body.offsetHeight;
        document.body.style.display = "";
        window.dispatchEvent(new Event("resize"));
      }
    }
  });

  document.addEventListener("resume", () => {
    document.body.style.display = "none";
    void document.body.offsetHeight;
    document.body.style.display = "";
    window.dispatchEvent(new Event("resize"));
    updateLastActiveTime();
  });
})();

/* ============================================================
🛠️ MODE MAINTENANCE — côté joueur (version finale)
============================================================ */
function cbMaintRemoveBanner(){
  const b = document.getElementById('cb-maint-bar');
  if (b) b.remove();
}

function cbShowMaintenanceCountdown(message, seconds){
  cbMaintRemoveBanner();
  const bar = document.createElement('div');
  bar.id = 'cb-maint-bar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483646;background:linear-gradient(90deg,#ff8a00,#ff4b2b);color:#fff;font-family:system-ui,sans-serif;font-weight:800;font-size:13px;padding:10px 12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.5);pointer-events:none;';
  document.body.appendChild(bar);
  let remaining = Math.max(0, parseInt(seconds, 10) || 0);
  const render = () => {
    const m = Math.floor(remaining / 60), s = remaining % 60;
    bar.innerHTML = '🛠️ MAINTENANCE DANS ' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' — termine ta partie (maintenance en cours) !';
  };
  render();
  bar._cbInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0){
      clearInterval(bar._cbInterval);
      bar.innerHTML = '🛠️ Maintenance imminente (maintenance en cours) — fin de partie = déconnexion';
      return;
    }
    render();
  }, 1000);
}

// ✅ CORRECTION 4 : Polling maintenance GLOBAL (pas seulement quand l'overlay est créé)
function cbShowMaintenanceLocked(message){
  cbMaintRemoveBanner();
  let ov = document.getElementById('cb-maint-overlay');
  if (!ov){
    ov = document.createElement('div');
    ov.id = 'cb-maint-overlay';
    document.body.appendChild(ov);
  }
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0a0514;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML =
    '<div style="max-width:420px;width:100%;text-align:center;color:#fff;font-family:system-ui,sans-serif;">' +
    '<div style="font-size:52px;">🛠️</div>' +
    '<h2 style="color:#00d2ff;margin:12px 0 6px;font-size:22px;letter-spacing:1px;">MAINTENANCE EN COURS</h2>' +
    '<p id="cb-maint-msg" style="font-size:14px;line-height:1.5;color:#ddd;margin-bottom:18px;"></p>' +
    '<div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.12);overflow:hidden;">' +
    '<div style="height:100%;width:40%;border-radius:4px;background:linear-gradient(90deg,#00c6ff,#0072ff);animation:cbMaintSlide 1.6s ease-in-out infinite;"></div>' +
    '</div>' +
    '<input id="cb-maint-code" placeholder="Tu as un code ? 🔑" style="margin-top:18px;width:80%;padding:10px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;text-align:center;">' +
    '<div style="margin-top:10px;"><button id="cb-maint-enter" style="padding:10px 22px;border:none;border-radius:10px;background:#00d2ff;color:#001;font-weight:800;cursor:pointer;">Entrer</button></div>' +
    '<p style="font-size:12px;color:#888;margin-top:14px;">Retour automatique dès la fin de la maintenance.</p>' +
    '<style>@keyframes cbMaintSlide{0%{margin-left:-40%}100%{margin-left:100%}}</style>' +
    '</div>';
  const msgEl = ov.querySelector('#cb-maint-msg');
  if (msgEl && message) msgEl.textContent = message;
  ov.querySelector('#cb-maint-enter').onclick = () => {
    const c = (ov.querySelector('#cb-maint-code').value || '').trim();
    if (!c) return;
    localStorage.setItem('cb_maint_code', c);
    location.reload();
  };
  
  // ✅ Polling GLOBAL — tourne tant que l'overlay est affiché
  if (!window._cbMaintGlobalProbe) {
    window._cbMaintGlobalProbe = setInterval(() => {
      if (!document.getElementById('cb-maint-overlay')) {
        clearInterval(window._cbMaintGlobalProbe);
        window._cbMaintGlobalProbe = null;
        return;
      }
      fetch(CONFIG.SERVER_URL + '/api/maintenance?cb=' + Date.now(), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => { 
          if (d && d.enabled === false) { 
            clearInterval(window._cbMaintGlobalProbe);
            window._cbMaintGlobalProbe = null;
            localStorage.removeItem('cb_maint_code'); 
            location.reload(); 
          } 
        })
        .catch(() => {});
    }, 8000);
  }
}

socket.on('maintenance_announce', (d) => {
  if (d && d.delay > 0) {
    cbShowMaintenanceCountdown(d.message, d.delay);
  } else if (d && (d.inMatch || d.inTower)) {
    if (typeof showNotificationToast === 'function') {
      showNotificationToast('🛠️ Maintenance programmée. Tu seras déconnecté à la fin de ta partie.', 'announcement');
    }
  }
});
socket.on('maintenance_kick', (d) => { cbShowMaintenanceLocked(d && d.message); });
socket.on('maintenance_end', () => { 
  localStorage.removeItem('cb_maint_code'); 
  if (window._cbMaintGlobalProbe) {
    clearInterval(window._cbMaintGlobalProbe);
    window._cbMaintGlobalProbe = null;
  }
  location.reload(); 
});

// ✅ CORRECTION 3 : Le deuxième listener register_result a été SUPPRIMÉ
// (il était en doublon et causait des conflits avec le premier)
