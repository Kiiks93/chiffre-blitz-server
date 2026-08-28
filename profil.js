/* ============================================================
CONNEXION SERVEUR
============================================================ */
const SERVER_URL = "https://chiffre-blitz-server.onrender.com";
const socket = io(SERVER_URL, { reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });
socket.on("disconnect", () => { SoundEngine.stopMusic(true); });
socket.on("connect", () => {
  if (localStorage.getItem('cb_secret')) registerIfPossible();
  const urlParams = new URLSearchParams(window.location.search);
  const targetRoom = urlParams.get("room");
  if (targetRoom && isProfileValid()) {
    setTimeout(() => { joinRoomDirect(targetRoom.toUpperCase(), ""); }, 500);
  }
});

/* ============================================================
PROFIL JOUEUR + ÉTAT
============================================================ */
let myProfile = {
  username: localStorage.getItem("cb_username") || "",
  region: localStorage.getItem("cb_region") || "Hauts-de-France",
  avatar: parseInt(localStorage.getItem("cb_avatar")) || 1,
  flag: localStorage.getItem("cb_flag") || "🇫",
  secretCode: localStorage.getItem('cb_secret') || '',
  points: 0, coins: 0, trophies: 0, wins: 0, losses: 0,
  inventory: { __equipped: {
    title: localStorage.getItem("cb_equipped_title") || "",
    frame: localStorage.getItem("cb_equipped_frame") || "",
    theme: localStorage.getItem("cb_equipped_theme") || ""
  } },
  unlocked_items: [], equippedPower: null, equippedPowers: [],
  blitzPassPremium: false, claimedPassTiers: {}
};
let cachedOpponent = null;
let pendingProfileValidation = false;
let launchAdWatched = false;
let pendingAccountLogin = false;
let pendingCustomization = false;
let adCallbackFunction = null;
let recapActive = false;
let selectedRankedItems = [];
let latestGlobalEvents = {};
let latest1v1StartData = null;
let pendingGameOverData = null;
let activeAvatarChoice = "standard";
let currentFriendFilter = "all";
let myGameInvites = [];
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

/* ============================================================
HELPERS PROFIL
============================================================ */
function getFlagEmoji(flag) {
  if (!flag) return "🇫🇷";
  let cleanFlag = flag.replace(/['"]/g, "").trim();
  if (cleanFlag.length === 2) {
    try {
      const codePoints = cleanFlag.toUpperCase().split("").map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch (e) { return "🇫🇷"; }
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
  if (points >= 1300) return currentLang === "fr" ? "Calculateur ⚡" : "Calculator ⚡";
  if (points >= 700) return currentLang === "fr" ? "Expert 🧠" : "Expert 🧠";
  if (points >= 300) return currentLang === "fr" ? "Chiffre 🔢" : "Cipher 🔢";
  return currentLang === "fr" ? "Novice 🌱" : "Novice 🌱";
}
function getFrameClass(equippedFrame) {
  const FRAME_CLASS_MAP = {
    "frame_silver": "silver-frame",
    "frame_chroma": "chroma-frame",
    "frame_prism": "prism-frame",
    "frame_voltage": "voltage-frame",
    "frame_obsidian": "obsidian-frame",
    "frame_givre": "givre-frame"
  };
  return FRAME_CLASS_MAP[equippedFrame] || "";
}
function getAvatarBadgeHTML(flag, avatarNum, overrideAvatarType, playerObj) {
  const profile = playerObj || myProfile;
  const equippedAvatar = overrideAvatarType || (profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.avatar);
  const equippedFrame = profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.frame;
  if (!playerObj) {
    const pill = document.getElementById("user-pill");
    if (pill) {
      pill.classList.remove("silver-frame", "chroma-frame", "prism-frame", "voltage-frame", "obsidian-frame");
      const frameClass = getFrameClass(equippedFrame);
      if (frameClass) pill.classList.add(frameClass);
    }
  }
  let avatarContent = avatarNum || 1;
  let avatarTitle = `Avatar #${avatarNum || 1}`;
  if (equippedAvatar === "avatar_lottie_palier30") {
    avatarTitle = "Chat Arc-en-ciel (Palier 30 - Lottie)";
    avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="black-rainbow-cat.json" style="width:32px; height:32px;"></div>`;
  } else if (equippedAvatar === "avatar_lottie_palier15") {
    avatarTitle = "Chat Assistant (Palier 15 - Lottie)";
    avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="cat-assistant.json" style="width:32px; height:32px;"></div>`;
  } else if (equippedAvatar === "avatar_tigre") {
    avatarTitle = "Tigre de Sibérie (GRAAL - Palier 30)";
    avatarContent = `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline></video>`;
  }
  } else if (equippedAvatar === "avatar_s2_squelette") {
  avatarTitle = "Squelette qui danse (Pass Halloween)";
  avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="squelette-danse.json" style="width:32px; height:32px;"></div>`;
} else if (equippedAvatar === "avatar_s2_chauve") {
  avatarTitle = "Chauve-Souris (Pass Halloween)";
  avatarContent = `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline></video>`;
} else if (equippedAvatar === "avatar_s2_citrouille") {
  avatarTitle = "Citrouille du Château (GRAAL Halloween)";
  avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="citrouille-chateau.json" style="width:32px; height:32px;"></div>`;
}
  const frameClass = getFrameClass(equippedFrame);
  const html = `
    <div class="tft-avatar-container ${frameClass}" title="${avatarTitle}">
      <span class="tft-avatar-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; ${typeof avatarContent === "number" ? "font-size:14px;" : ""}">${avatarContent}</span>
      <span class="tft-flag-overlay">${flag || "🇫🇷"}</span>
    </div>`;
  setTimeout(() => initAllLottieBadges(), 50);
  return html;
}
function getLargeAvatarBadgeHTML(flag, avatarNum, overrideAvatarType) {
  const avatarType = overrideAvatarType || activeAvatarChoice || (myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar);
  const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
  const frameClass = getFrameClass(equippedFrame);
  let avatarContent = avatarNum || 1;
  if (avatarType === "avatar_lottie_palier30") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="black-rainbow-cat.json" style="width:60px; height:60px;"></div>`;
  else if (avatarType === "avatar_lottie_palier15") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="cat-assistant.json" style="width:60px; height:60px;"></div>`;
  else if (avatarType === "avatar_tigre") avatarContent = `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline style="width:60px; height:60px;"></video>`;
  else if (avatarType === "avatar_s2_chauve") avatarContent = `<video class="tft-avatar-video" src="bat-halloween.mp4a" autoplay loop muted playsinline style="width:60px; height:60px;"></video>`;
  
  const html = `
    <div class="tft-avatar-large ${frameClass}">
      <span class="tft-avatar-large-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; ${typeof avatarContent === "number" ? "font-size:24px;" : ""}">${avatarContent}</span>
      <span class="tft-flag-large-overlay">${flag || "🇫🇷"}</span>
    </div>`;
  setTimeout(() => initAllLottieBadges(), 50);
  return html;
}
function initAllLottieBadges() {
  if (typeof lottie === "undefined") return;
  document.querySelectorAll(".lottie-avatar-badge, .lottie-avatar-large").forEach(el => {
    if (el.getAttribute("data-lottie-loaded")) return;
    const url = el.getAttribute("data-lottie-url");
    if (url) {
      el.setAttribute("data-lottie-loaded", "true");
      el.innerHTML = "";
      try { lottie.loadAnimation({ container: el, renderer: "svg", loop: true, autoplay: true, path: url }); } catch (e) {}
    }
  });
}
function updateProfilePreview() {
  const avatarNum = parseInt(document.getElementById("avatar-input").value) || 1;
  const rawFlag = document.getElementById("flag-input").value;
  const flag = getFlagEmoji(rawFlag);
  const previewContainer = document.getElementById("modal-avatar-preview");
  if (previewContainer) {
    previewContainer.innerHTML = getLargeAvatarBadgeHTML(flag, avatarNum, activeAvatarChoice);
    previewContainer.style.cursor = "zoom-in";
    previewContainer.onclick = showAvatarZoom;
  }
}
function renderProfileAvatarSelector() {
  const container = document.getElementById("profile-avatar-selector");
  if (!container) return;
  container.innerHTML = "";
  const addAvatarOption = (id, icon, label) => {
    const isActive = (activeAvatarChoice === id);
    const card = document.createElement("div");
    card.style.cssText = `flex:1; min-width:80px; background:${isActive ? "rgba(0,210,255,0.25)" : "rgba(255,255,255,0.05)"}; border:2px solid ${isActive ? "#00d2ff" : "rgba(255,255,255,0.1)"}; border-radius:8px; padding:4px; text-align:center; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;`;
    card.onclick = () => { activeAvatarChoice = id; renderProfileAvatarSelector(); updateProfilePreview(); };
    card.innerHTML = `<span style="font-size:13px;">${icon}</span><div style="font-size:8px; font-weight:bold; color:#fff;">${label}</div>`;
    container.appendChild(card);
  };
  addAvatarOption("standard", "🔢", "Standard");
  const unlocked = myProfile.unlocked_items || [];
  if (unlocked.includes("avatar_lottie_palier15")) addAvatarOption("avatar_lottie_palier15", "🐱", "Chat Assistant");
  if (unlocked.includes("avatar_lottie_palier30")) addAvatarOption("avatar_lottie_palier30", "🌈", "Chat Arc-en-ciel");
  if (unlocked.includes("avatar_tigre")) addAvatarOption("avatar_tigre", "🐯", "Tigre de Sibérie");
  if (unlocked.includes("avatar_s2_squelette")) addAvatarOption("avatar_s2_squelette", "💀", "Squelette");
  if (unlocked.includes("avatar_s2_chauve")) addAvatarOption("avatar_s2_chauve", "🦇", "Chauve-Souris");
  if (unlocked.includes("avatar_s2_citrouille")) addAvatarOption("avatar_s2_citrouille", "🎃", "Citrouille");
}
/* ---------- PACKS (grille + cadre en 1 clic) ---------- */
const PACKS_LIST = [
  { id: "pack_haute_tension", name: "⚡ Haute Tension", theme: "theme_eclair", frame: "frame_voltage" },
  { id: "pack_cryo", name: "🧊 Cryo", theme: "theme_glacial", frame: "frame_givre" },
  { id: "pack_solaire", name: "✨ Doré", theme: "theme_alt", frame: "frame_prism" },
  { id: "pack_obsidienne", name: "🖤 Obsidienne", theme: "theme_obsidian", frame: "frame_obsidian" },
  { id: "pack_neon", name: "🌈 Néon", theme: "theme_neon", frame: "frame_chroma" }
];

/* ---------- PACKS : menu déroulant (grille + cadre en 1 choix) ---------- */
function ensurePackSelector() {
  if (document.getElementById("pack-input")) return;
  const themeSelect = document.getElementById("theme-input");
  if (!themeSelect || !themeSelect.parentElement) return;
  const packSelect = document.createElement("select");
  packSelect.id = "pack-input";
  packSelect.className = themeSelect.className;
  packSelect.style.cssText = themeSelect.style.cssText;
  packSelect.onchange = () => {
    const pack = PACKS_LIST.find(p => p.id === packSelect.value);
    if (!pack) return;
    const unlocked = myProfile.unlocked_items || [];
    if (!(unlocked.includes(pack.theme) && unlocked.includes(pack.frame))) {
      showNotificationToast("🔒 Pack non possédé ! Direction la boutique 🛍️", "announcement");
      packSelect.value = "";
      return;
    }
    const themeSel = document.getElementById("theme-input");
    const frameSel = document.getElementById("frame-input");
    if (themeSel) themeSel.value = pack.theme;
    if (frameSel) frameSel.value = pack.frame;
    updateProfilePreview();
  };
  themeSelect.parentElement.insertBefore(packSelect, themeSelect.nextSibling);
}
function renderProfilePackSelector() {
  const packSelect = document.getElementById("pack-input");
  if (!packSelect) return;
  const unlocked = myProfile.unlocked_items || [];
  packSelect.innerHTML = `<option value="">🎁 Packs (grille + cadre)</option>`;
  PACKS_LIST.forEach(pack => {
    const owned = unlocked.includes(pack.theme) && unlocked.includes(pack.frame);
    const opt = document.createElement("option");
    opt.value = pack.id;
    opt.innerText = (owned ? "🎁 " : "🔒 ") + pack.name;
    packSelect.appendChild(opt);
  });
}

/* ---------- AVATAR ZOOM (clic sur l'aperçu) ---------- */
function showAvatarZoom() {
  let overlay = document.getElementById("avatar-zoom-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "avatar-zoom-overlay";
    overlay.className = "modal-overlay";
    overlay.style.background = "rgba(0,0,0,0.88)";
    overlay.onclick = () => { overlay.style.display = "none"; };
    overlay.innerHTML = `<div style="text-align:center;">
      <div id="avatar-zoom-content" style="transform:scale(2.1); pointer-events:none;"></div>
      <div style="margin-top:90px; font-size:11px; color:#aaa; font-weight:bold;">🔍 Touche pour fermer</div>
    </div>`;
    document.body.appendChild(overlay);
  }
  const preview = document.getElementById("modal-avatar-preview");
  const content = document.getElementById("avatar-zoom-content");
  content.innerHTML = preview ? preview.innerHTML : "";
  content.querySelectorAll("[data-lottie-loaded]").forEach(el => el.removeAttribute("data-lottie-loaded"));
  overlay.style.display = "flex";
  setTimeout(() => initAllLottieBadges(), 50);
}

const TITLE_DISPLAY_NAMES = {
  "title_stalker": "Stalker Numérique",
  "title_felin": "Réflexe Félin",
  "title_neon": "Pulsion Néon",
  "title_spectre": "Spectre Cosmique",
  "title_supreme": "⚡ FÉLIN SUPRÊME",
  "title_champion": "🏅 Champion Éclair",
  "title_combattant": "🎖️ Combattant",
  "title_elite": "🏵️ Élite",
  "title_eveille": "⚡ Éveil",
  "title_flamme": "🔥 Fournaise",
  "title_parfait": "💎 PERFECTION",
  "title_vainqueur": "⚔️ Vainqueur",
  "title_inarrettable": "🔥 Inarrêtable",
  "title_gladiateur": "🛡️ Gladiateur",
  "title_champion_trophy": "👑 Champion",
  "title_maitre_avalanche": "🎯 Maître Avalanche",
  "title_travailleur": "⛏️ Travailleur",
  "title_etoile": "⭐ Étoile Montante",
  "title_roi_local": "🏰 Roi Local",
  "title_midas": "💰 Midas",
  "title_dynastie": "🏛️ Dynastie",
  "title_mondial": "🌍 N°1 Mondial",
  "title_fantome": "👻 Chuchoteur de Fantômes",
  "title_danse_macabre": "🦴 Danse Macabre",
  "title_citrouille": "🎃 Pulsion Citrouille",
  "title_spectre_automne": "🍂 Spectre d'Automne",
  "title_roi_halloween": "🎃 ROI D'HALLOWEEN",
  "title_esprit_halloween": "👻 Esprit d'Halloween"
};
const FRAME_DISPLAY_NAMES = {
  "frame_silver": "🛡️ Cadre « Argenté »",
  "frame_chroma": "🌈 Cadre « Flux Chroma »",
  "frame_prism": "✨ Cadre « Doré »",
  "frame_voltage": "⚡ Cadre « Sous Tension »",
  "frame_obsidian": "🖤 Cadre « Obsidienne »",
  "frame_givre": "🧊 Cadre « Givre »",
  "frame_osseux": "🦴 Cadre « Osseux »", 
  "frame_fantome": "👻 Cadre « Fantôme »"
};
const THEME_DISPLAY_NAMES = {
  "theme_alt": "🎨 Thème de Grille Rétro / Doré",
  "theme_glacial": "🧊 Thème de Grille Cryo",
  "theme_eclair": "⚡ Thème de Grille Éclair",
  "theme_neon": "🌈 Thème de Grille Néon Synthwave",
  "theme_obsidian": "🖤 Thème de Grille Obsidienne",
  "theme_citrouille": "🎃 Thème de Grille Citrouille"
};
function renderProfileCustomizationMenus() {
  const titleSelect = document.getElementById("title-input");
  const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
  if (titleSelect) {
    titleSelect.innerHTML = `<option value="">Aucun titre actif</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("title_")).forEach(tId => {
      const displayName = TITLE_DISPLAY_NAMES[tId] || tId;
      const opt = document.createElement("option");
      opt.value = tId; opt.innerText = displayName;
      if (equippedTitle === tId || equippedTitle === displayName) opt.selected = true;
      titleSelect.appendChild(opt);
    });
  }
  const frameSelect = document.getElementById("frame-input");
  const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
  if (frameSelect) {
    frameSelect.innerHTML = `<option value="">Aucun cadre (Défaut)</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("frame_")).forEach(fId => {
      const displayName = FRAME_DISPLAY_NAMES[fId] || fId;
      const opt = document.createElement("option");
      opt.value = fId; opt.innerText = displayName;
      if (equippedFrame === fId) opt.selected = true;
      frameSelect.appendChild(opt);
    });
  }
  const themeSelect = document.getElementById("theme-input");
  const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (themeSelect) {
    themeSelect.innerHTML = `<option value="">Thème de grille standard</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("theme_")).forEach(thId => {
      const displayName = THEME_DISPLAY_NAMES[thId] || thId;
      const opt = document.createElement("option");
      opt.value = thId; opt.innerText = displayName;
      if (equippedTheme === thId) opt.selected = true;
      themeSelect.appendChild(opt);
    });
  }
  renderProfileAvatarSelector();
  ensurePackSelector();
  renderProfilePackSelector();
}

/* ============================================================
ÉMOTICÔNES
============================================================ */
let lastEmoteTime = 0;
function sendEmote(emoji) {
  const now = Date.now();
  if (now - lastEmoteTime < 300) return;
  lastEmoteTime = now;
  if (!socket.connected) return;
  socket.emit("send_emote", { emote: emoji });
  showFloatingEmote(emoji, true);
}
socket.on("receive_emote", (data) => { showFloatingEmote(data.emote, false); });
function showFloatingEmote(emoji, isMe) {
  const bubble = document.createElement("div");
  bubble.className = "emote-bubble";
  bubble.innerText = emoji;
  const side = Math.random() > 0.5 ? "left" : "right";
  bubble.style[side] = `${Math.random() * 60 + 15}px`;
  bubble.style.bottom = isMe ? "130px" : "65%";
  document.body.appendChild(bubble);
  setTimeout(() => { bubble.remove(); }, 1600);
}

/* ============================================================
ÉCONOMIE + VALIDATION
============================================================ */
function saveLocalPreferences() {
  localStorage.setItem("cb_username", myProfile.username);
  localStorage.setItem("cb_region", myProfile.region);
  localStorage.setItem("cb_avatar", myProfile.avatar);
  localStorage.setItem("cb_flag", myProfile.flag);
  if (myProfile.secretCode) localStorage.setItem('cb_secret', myProfile.secretCode);
}

let lastDisplayed = { coins: null, trophies: null, points: null };

function tweenNumber(el, from, to, duration = 900) {
  if (!el) return;
  if (from === null || from === to) { el.innerText = to; return; }
  const start = performance.now();
  const diff = to - from;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.innerText = Math.round(from + diff * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showDelta(value, icon) {
  if (!value) return;
  const bar = document.querySelector(".user-stats");
  if (!bar) return;
  const delta = document.createElement("span");
  delta.className = "stat-delta " + (value > 0 ? "up" : "down");
  delta.innerText = (value > 0 ? "+" : "") + value + " " + icon;
  bar.appendChild(delta);
  setTimeout(() => delta.remove(), 1600);
}

function updateEconomyUI() {
  const coinsEl = document.getElementById("user-coins-display");
  const trophiesEl = document.getElementById("user-trophies-display");
  const pointsEl = document.getElementById("user-points-display");
  const rankEl = document.getElementById("user-rank-display");

  if (!recapActive) {
    if (rankEl) rankEl.innerText = getRankName(myProfile.points);

    if (lastDisplayed.coins !== null && myProfile.coins !== lastDisplayed.coins) {
      showDelta(myProfile.coins - lastDisplayed.coins, "🪙");
    }
    if (lastDisplayed.trophies !== null && myProfile.trophies !== lastDisplayed.trophies) {
      showDelta(myProfile.trophies - lastDisplayed.trophies, "🏆");
    }
    if (lastDisplayed.points !== null && myProfile.points !== lastDisplayed.points) {
      showDelta(myProfile.points - lastDisplayed.points, "pts");
    }

    tweenNumber(coinsEl, lastDisplayed.coins, myProfile.coins);
    tweenNumber(trophiesEl, lastDisplayed.trophies, myProfile.trophies);
    tweenNumber(pointsEl, lastDisplayed.points, myProfile.points);

    lastDisplayed = {
      coins: myProfile.coins,
      trophies: myProfile.trophies,
      points: myProfile.points
    };
  }

  const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
  const titleEl = document.getElementById("user-title-display");
  if (titleEl) titleEl.innerText = equippedTitle ? `[ ${TITLE_DISPLAY_NAMES[equippedTitle] || equippedTitle} ]` : "";

  document.getElementById("user-name-display").innerText = myProfile.username || "Définir";
  document.getElementById("user-avatar-badge").innerHTML = getAvatarBadgeHTML(myProfile.flag, myProfile.avatar);
  updateShopCoinsDisplay();
}

function updateShopCoinsDisplay() {
  const valEl = document.getElementById("shop-coins-val");
  if (valEl) valEl.innerText = myProfile.coins;
}

function isProfileValid() {
  const savedName = localStorage.getItem("cb_username");
  const savedRegion = localStorage.getItem("cb_region");
  return savedName && savedName.trim().length >= 3 && savedName !== "Profil" && savedName !== "Définir un pseudo" && savedRegion;
}

/* ============================================================
COMPTE (roue crantée) + CENTRE DE CONTRÔLE
============================================================ */
function switchAccount() {
  localStorage.removeItem('cb_username');
  localStorage.removeItem('cb_secret');
  localStorage.removeItem('cb_region');
  localStorage.removeItem('cb_avatar');
  localStorage.removeItem('cb_flag');
  localStorage.removeItem('cb_equipped_title');
  localStorage.removeItem('cb_equipped_frame');
  localStorage.removeItem('cb_equipped_theme');
  myProfile.username = '';
  myProfile.secretCode = '';
  myProfile.region = 'Hauts-de-France';
  myProfile.avatar = 1;
  myProfile.flag = '🇫';
  myProfile.inventory = { __equipped: {} };
  myProfile.unlocked_items = [];
  renderAccountContent();
}
function injectAccountGear() {
  const headerBtns = document.querySelector('.header-btns');
  if (headerBtns && !document.getElementById('account-gear-btn')) {
    const gear = document.createElement('button');
    gear.id = 'account-gear-btn';
    gear.className = 'icon-btn';
    gear.innerText = '⚙️';
    gear.onclick = openAccountModal;
    headerBtns.appendChild(gear);
  }
}
function openAccountModal() {
  let modal = document.getElementById('modal-account');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-account';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:340px;">
        <h3 style="color:#00d2ff; margin:0 0 10px 0; text-align:center;">⚙️ MON COMPTE</h3>
        <div id="account-content"></div>
        <button class="btn-secondary" onclick="closeAccountModal()">Fermer</button>
      </div>`;
    document.body.appendChild(modal);
  }
  renderAccountContent();
  modal.style.display = 'flex';
}
function closeAccountModal() {
  const modal = document.getElementById('modal-account');
  if (modal) modal.style.display = 'none';
}
function renderAccountContent() {
  const content = document.getElementById('account-content');
  if (!content) return;
  const connected = isProfileValid() && localStorage.getItem('cb_secret');
  const inputStyle = 'width:100%; background:#0f051d; color:#fff; border:2px solid #00d2ff; border-radius:8px; padding:8px; font-size:13px; margin-bottom:6px; box-sizing:border-box; text-align:center;';
  if (!connected) {
    content.innerHTML = `
      <p style="font-size:10px; color:#aaa; text-align:center;">Entre ton pseudo + ton code secret.<br>Si le compte existe → connexion. Sinon → création.</p>
      <input id="account-pseudo" type="text" placeholder="Pseudo" style="${inputStyle}">
      <input id="account-code" type="password" placeholder="🔒 Code secret (4 min)" style="${inputStyle}">
      <button class="btn-main btn-blue" onclick="submitAccountForm()">🔓 Accéder à mon compte ⚡</button>`;
  } else {
    content.innerHTML = `
      <p style="font-size:12px; text-align:center;">Connecté : <b style="color:#00ff88;">${myProfile.username}</b></p>
      <button class="btn-main btn-blue" onclick="switchAccount()" style="margin-bottom:6px;">🔑 Changer de compte</button>
      <button class="btn-main btn-gold" onclick="startCreateAccount()" style="margin-bottom:6px;">➕ Créer un nouveau compte</button>
      <button class="btn-main" onclick="askDeleteAccount()" style="background:linear-gradient(45deg,#ff416c,#7a0026);">🗑️ Supprimer mon compte</button>`;
  }
}
function submitAccountForm() {
  const pseudo = (document.getElementById('account-pseudo').value || '').trim();
  const code = (document.getElementById('account-code').value || '').trim();
  if (pseudo.length < 3) { alert('Pseudo : 3 caractères minimum.'); return; }
  if (code.length < 4) { alert('Code secret : 4 caractères minimum.'); return; }
  myProfile.username = pseudo;
  myProfile.secretCode = code;
  if (!myProfile.region) myProfile.region = 'Hauts-de-France';
  if (!myProfile.avatar) myProfile.avatar = 1;
  if (!myProfile.flag) myProfile.flag = '🇫🇷';
  pendingAccountLogin = true;
  if (socket.connected) {
    socket.emit("register_player", {
      username: myProfile.username,
      region: myProfile.region,
      avatar: myProfile.avatar,
      flag: myProfile.flag,
      inventory: myProfile.inventory || {},
      secretCode: myProfile.secretCode,
      mode: 'login'
    });
  } else {
    alert('❌ Connexion au serveur perdue. Réessaie dans quelques secondes.');
    pendingAccountLogin = false;
  }
}
function startCreateAccount() {
  if (confirm('⚠️ Un nouveau compte repart de zéro.\n(Ton compte actuel reste sauvegardé.)\nContinuer ?')) switchAccount();
}
function askDeleteAccount() {
  const code = prompt('⚠️ SUPPRESSION DÉFINITIVE DU COMPTE.\nEntre ton code secret pour confirmer :');
  if (!code) return;
  socket.emit('delete_account', { secretCode: code });
}
socket.on('delete_account_result', (res) => {
  if (res.ok) {
    localStorage.removeItem('cb_username');
    localStorage.removeItem('cb_secret');
    myProfile.secretCode = '';
    myProfile.username = '';
    alert('✅ Compte supprimé.');
    renderAccountContent();
  } else {
    alert('❌ Code secret incorrect : compte NON supprimé.');
  }
});
function openControlCenter() {
  renderControlCenter();
  document.getElementById('modal-control-center').style.display = 'flex';
}
function closeControlCenter() {
  const m = document.getElementById('modal-control-center');
  if (m) m.style.display = 'none';
}
function renderControlCenter() {
  const isEN = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const titleEl = document.getElementById('cc-title');
  if (titleEl) titleEl.innerText = isEN ? "⚙️ SETTINGS MANAGEMENT" : "⚙️ GESTION DES PARAMÈTRES";
  const langEl = document.getElementById('cc-lang-text');
  if (langEl) langEl.innerText = (isEN ? "Language : " : "Langue : ") + (isEN ? "EN" : "FR");
  const soundEl = document.getElementById('cc-sound-text');
  const muteBtn = document.getElementById('mute-btn');
  if (soundEl && muteBtn) soundEl.innerText = (isEN ? "Sound : " : "Son : ") + (muteBtn.innerText.includes('🔇') ? (isEN ? "Muted" : "Coupé") : (isEN ? "On" : "Activé"));
  const customEl = document.getElementById('cc-custom-btn');
  if (customEl) customEl.innerText = isEN ? "🎨 Customization" : "🎨 Personnalisation";
  const accountEl = document.getElementById('cc-account-btn');
  if (accountEl) accountEl.innerText = isEN ? "👤 Account management" : "👤 Gestion du compte";
  const btnLabel = document.getElementById('cc-btn-label');
  if (btnLabel) btnLabel.innerText = isEN ? "Settings" : "Paramètres";
}

/* ============================================================
FENÊTRE PROFIL / PERSONNALISATION
============================================================ */
function checkAndShowProfileModal() {
  if (!isProfileValid() || !localStorage.getItem('cb_secret')) {
    openAccountModal();
  } else {
    myProfile.username = localStorage.getItem("cb_username");
    myProfile.region = localStorage.getItem("cb_region");
    myProfile.avatar = parseInt(localStorage.getItem("cb_avatar")) || 1;
    myProfile.flag = getFlagEmoji(localStorage.getItem("cb_flag") || "🇫🇷");
    const savedTitle = localStorage.getItem("cb_equipped_title");
    const savedFrame = localStorage.getItem("cb_equipped_frame");
    const savedTheme = localStorage.getItem("cb_equipped_theme");
    if (savedTitle || savedFrame || savedTheme) {
      if (!myProfile.inventory) myProfile.inventory = {};
      if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
      if (savedTitle) myProfile.inventory.__equipped.title = savedTitle;
      if (savedFrame) myProfile.inventory.__equipped.frame = savedFrame;
      if (savedTheme) myProfile.inventory.__equipped.theme = savedTheme;
    }
    updateEconomyUI();
    document.getElementById("modal-username").style.display = "none";
    registerIfPossible();
    showTitleScreen();
  }
}
let profileMode = "create";
function setProfileMode(mode) {
  profileMode = mode;
  const tc = document.getElementById('profile-tab-create');
  const tl = document.getElementById('profile-tab-login');
  if (tc) tc.classList.toggle('active', mode === 'create');
  if (tl) tl.classList.toggle('active', mode === 'login');
  const validateBtn = document.getElementById('btn-validate-profile');
  if (validateBtn) validateBtn.innerText = (mode === 'create') ? 'CRÉER MON PROFIL ⚡' : 'SE CONNECTER ⚡';
  const secretInput = document.getElementById('secret-input');
  if (secretInput) secretInput.placeholder = (mode === 'create') ? '🔒 Choisis un code secret (4 min)' : '🔒 Entre ton code secret';
}
function promptProfileChange() {
  if (!isProfileValid() || !localStorage.getItem('cb_secret')) { openAccountModal(); return; }
  document.getElementById("username-input").value = myProfile.username;
  document.getElementById("username-input").disabled = true;
  if (myProfile.region) document.getElementById("region-input").value = myProfile.region;
  document.getElementById("avatar-input").value = myProfile.avatar || 1;
  document.getElementById("flag-input").value = myProfile.flag || "🇫";
  const equippedAvatar = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar;
  activeAvatarChoice = equippedAvatar || "standard";
  renderProfileCustomizationMenus();
  updateProfilePreview();
  const oldSecret = document.getElementById('secret-input');
  if (oldSecret) oldSecret.style.display = 'none';
  const oldTabs = document.getElementById('profile-tabs');
  if (oldTabs) oldTabs.style.display = 'none';
  const oldSwitch = document.getElementById('switch-account-btn');
  if (oldSwitch) oldSwitch.style.display = 'none';
  const validateBtn = document.querySelector('[onclick="saveProfileFromModal()"]');
  if (validateBtn) validateBtn.innerText = '💾 Enregistrer ma personnalisation';
  document.getElementById("modal-username").style.display = "flex";
}
function saveProfileFromModal() {
  const nameInput = document.getElementById("username-input").value.trim();
  const regionInput = document.getElementById("region-input").value;
  const selectedTitleId = document.getElementById("title-input").value;
  const selectedFrameId = document.getElementById("frame-input").value;
  const selectedThemeId = document.getElementById("theme-input").value;
  let avatarVal = parseInt(document.getElementById("avatar-input").value);
  const flagVal = document.getElementById("flag-input").value;
  if (nameInput.length < 3) { alert("Ton pseudo doit contenir au moins 3 caractères !"); return; }
  const savedSecret = localStorage.getItem('cb_secret') || '';
  const savedName = localStorage.getItem('cb_username') || '';
  const isCustomizationOnly = savedSecret !== '' && isProfileValid() && (nameInput === savedName);
  if (isCustomizationOnly) { myProfile.secretCode = savedSecret; pendingCustomization = true; }
  else { myProfile.secretCode = myProfile.secretCode || savedSecret; pendingCustomization = false; }
  if (isNaN(avatarVal) || avatarVal < 1) avatarVal = 1;
  if (avatarVal > 999) avatarVal = 999;
  myProfile.username = nameInput;
  myProfile.region = regionInput;
  myProfile.avatar = avatarVal;
  myProfile.flag = getFlagEmoji(flagVal);
  if (!myProfile.inventory) myProfile.inventory = {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  if (selectedTitleId) { myProfile.inventory.__equipped.title = selectedTitleId; localStorage.setItem("cb_equipped_title", selectedTitleId); socket.emit("equip_cosmetic", selectedTitleId); }
  else { delete myProfile.inventory.__equipped.title; localStorage.removeItem("cb_equipped_title"); socket.emit("equip_cosmetic", "none_title"); }
  if (selectedFrameId) { myProfile.inventory.__equipped.frame = selectedFrameId; localStorage.setItem("cb_equipped_frame", selectedFrameId); socket.emit("equip_cosmetic", selectedFrameId); }
  else { delete myProfile.inventory.__equipped.frame; localStorage.removeItem("cb_equipped_frame"); socket.emit("equip_cosmetic", "none_frame"); }
  if (selectedThemeId) { myProfile.inventory.__equipped.theme = selectedThemeId; localStorage.setItem("cb_equipped_theme", selectedThemeId); socket.emit("equip_cosmetic", selectedThemeId); }
  else { delete myProfile.inventory.__equipped.theme; localStorage.removeItem("cb_equipped_theme"); socket.emit("equip_cosmetic", "none_theme"); }
  if (activeAvatarChoice && activeAvatarChoice !== "standard") { myProfile.inventory.__equipped.avatar = activeAvatarChoice; socket.emit("equip_cosmetic", activeAvatarChoice); }
  else { delete myProfile.inventory.__equipped.avatar; socket.emit("equip_cosmetic", "none"); }
  saveLocalPreferences();
  updateEconomyUI();
  pendingProfileValidation = true;
  registerIfPossible();
  SoundEngine.init();
}
function registerIfPossible() {
  if (isProfileValid() && socket.connected) {
    socket.emit("register_player", {
      username: myProfile.username,
      region: myProfile.region,
      avatar: myProfile.avatar,
      flag: myProfile.flag,
      inventory: myProfile.inventory,
      secretCode: myProfile.secretCode || localStorage.getItem('cb_secret') || '',
      mode: profileMode || 'login'
    });
  }
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
  sanitizeEquippedPowers();
  updateEconomyUI();
  if (document.getElementById("modal-shop").style.display === "flex") switchShopTab(currentShopTab);
  if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  if (document.getElementById("screen-game").style.display === "block") preparePowerHUD();
});
socket.on('register_result', (res) => {
  if (!res.ok) {
    pendingProfileValidation = false;
    localStorage.removeItem('cb_username');
    localStorage.removeItem('cb_secret');
    localStorage.removeItem('cb_region');
    localStorage.removeItem('cb_avatar');
    localStorage.removeItem('cb_flag');
    localStorage.removeItem('cb_equipped_title');
    localStorage.removeItem('cb_equipped_frame');
    localStorage.removeItem('cb_equipped_theme');
    myProfile.username = '';
    myProfile.secretCode = '';
    myProfile.inventory = { __equipped: {} };
    if (res.reason === 'taken') alert('❌ Code secret incorrect pour ce pseudo.');
    else if (res.reason === 'nocode') alert('🔒 Choisis un code secret (4 caractères minimum).');
    else if (res.reason === 'short') alert('Ton pseudo doit contenir au moins 3 caractères !');
    else alert('❌ Erreur de connexion au serveur. Réessaie.');
    if (pendingAccountLogin) {
      pendingAccountLogin = false;
      renderAccountContent();
    }
    return;
  }
  if (pendingAccountLogin) {
    pendingAccountLogin = false;
    saveLocalPreferences();
    updateEconomyUI();
    closeAccountModal();
    showTitleScreen();
    return;
  }
  if (pendingProfileValidation) {
    pendingProfileValidation = false;
    saveLocalPreferences();
    document.getElementById('modal-username').style.display = 'none';
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
  showNotificationToast("✨ Passe de Saison mis à jour avec succès !", "gift");
});

/* ============================================================
NOTIFICATIONS + ANNONCES + ÉVÉNEMENTS
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
  let bg = "rgba(0, 210, 255, 0.95)"; let border = "#00d2ff"; let color = "#000";
  if (type === "gift") { bg = "rgba(248, 181, 0, 0.95)"; border = "#f8b500"; color = "#000"; }
  else if (type === "announcement") { bg = "rgba(255, 75, 43, 0.95)"; border = "#ff4b2b"; color = "#fff"; }
  toast.style.cssText = `background:${bg}; border:2px solid ${border}; color:${color}; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:12px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.5); pointer-events:auto; animation:toastFade 4.5s ease forwards;`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4500);
}
socket.on("admin_gift_received", (data) => {
  const msg = data.message || "🎁 Cadeau reçu de l'Administrateur !";
  showNotificationToast(`🎁 <b>CADEAU ADMIN REÇU !</b><br>` + msg, "gift");
  registerIfPossible();
});
socket.on('pass_reward_received', (data) => {
  const msg = data.message || "🎫 Récompense du Passe de Combat !";
  showNotificationToast(`🎫 <b>PASSE DE COMBAT !</b><br>` + msg, 'gift');
});
socket.on("global_announcement", (msg) => {
  showNotificationToast(`📢 <b>ANNONCE GLOBALE :</b><br>` + msg, "announcement");
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
  if (events.expressoMatch) activeList.push("⚡ <b>Expresso Match</b> (Parties rapides en 20s pour le 1v1 Online Non Classé)");
  if (events.chaosMode) activeList.push("🌪️ <b>Chaos Mode</b> (Modificateurs aléatoires en non classé)");
  if (events.jackpotEclair) activeList.push("🎁 <b>Jackpot Éclair</b> (Coffres mystères)");
  if (events.tugOfWarMode) activeList.push("🪢 <b>Mode Exclusif : Corde Raide (Tug-of-War)</b>");
  if (activeList.length > 0) { banner.innerHTML = `⚡ <b>ADMIN ABUSE EN COURS :</b><br>` + activeList.join("<br>"); banner.style.display = "block"; }
  else banner.style.display = "none";
});

/* ============================================================
DÉMARRAGE
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  updateEconomyUI();
  initMenuBackgroundFX();
  injectAccountGear();
  checkAndShowProfileModal();
  const mainLogo = document.querySelector("h1");
  if (mainLogo) {
    let logoClickCount = 0; let logoClickTimer = null;
    mainLogo.addEventListener("click", () => {
      logoClickCount++;
      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 5000);
      if (logoClickCount >= 10) { logoClickCount = 0; openAdminPanel(); }
    });
  }
  const urlParams = new URLSearchParams(window.location.search);
  const targetRoom = urlParams.get("room");
  if (targetRoom) setTimeout(() => { if (isProfileValid()) openJoinCustomScreen(targetRoom.toUpperCase()); }, 1000);
});
