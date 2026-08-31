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
  flag: localStorage.getItem("cb_flag") || "🇫🇷",
  secretCode: localStorage.getItem('cb_secret') || '',
  points: 0, coins: 0, trophies: 0, wins: 0, losses: 0,
  inventory: { __equipped: {
    title: localStorage.getItem("cb_equipped_title") || "",
    frame: localStorage.getItem("cb_equipped_frame") || "",
    theme: localStorage.getItem("cb_equipped_theme") || ""
  } },
  unlocked_items: [], equippedPower: null, equippedPowers: [],
  blitzPassPremium: false, claimedPassTiers: {}, currentSeasonId: "s1"
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
    "frame_standard": "standard-frame",
    "frame_silver": "silver-frame",
    "frame_chroma": "chroma-frame",
    "frame_prism": "prism-frame",
    "frame_voltage": "voltage-frame",
    "frame_obsidian": "obsidian-frame",
    "frame_givre": "givre-frame",
    "frame_osseux": "osseux-frame",
    "frame_fantome": "fantome-frame",
    "frame_bonbon": "bonbon-frame",
    "frame_guirlande": "guirlande-frame",
    "frame_lutin": "lutin-frame"
  };
  return FRAME_CLASS_MAP[equippedFrame] || "";
}

/* ---------- NOMS D'AFFICHAGE TRADUITS (fonctions dynamiques) ---------- */
function getAvatarDisplayNames() {
  const fr = currentLang === "fr";
  return {
    "avatar_lottie_palier15": fr ? "🐱 Chat Assistant (Pass S1)" : "🐱 Assistant Cat (Pass S1)",
    "avatar_lottie_palier30": fr ? "🌈 Chat Arc-en-ciel (Pass S1)" : "🌈 Rainbow Cat (Pass S1)",
    "avatar_tigre": fr ? "🐯 Tigre de Sibérie (GRAAL S1)" : "🐯 Siberian Tiger (GRAAL S1)",
    "avatar_s2_squelette": fr ? "💀 Squelette qui danse (Pass S2)" : "💀 Dancing Skeleton (Pass S2)",
    "avatar_s2_chauve": fr ? "🦇 Chauve-Souris (Pass S2)" : "🦇 Bat (Pass S2)",
    "avatar_s2_citrouille": fr ? "🎃 Citrouille du Château (GRAAL S2)" : "🎃 Castle Pumpkin (GRAAL S2)",
    "avatar_s3_bonhomme": fr ? "⛄ Bonhomme de neige (Pass S3)" : "⛄ Snowman (Pass S3)",
    "avatar_s3_boule": fr ? "🔮 Boule de neige (Pass S3)" : "🔮 Snowball (Pass S3)",
    "avatar_s3_perenoel": fr ? "🎅 Père Noël (Pass S3)" : "🎅 Santa Claus (Pass S3)"
  };
}
function getTitleDisplayNames() {
  const fr = currentLang === "fr";
  const d = i18n[currentLang];
  return {
    "title_stalker": "🕵️ " + (fr ? "Stalker Numérique" : "Digital Stalker"),
    "title_felin": "🐱 " + (fr ? "Réflexe Félin" : "Feline Reflex"),
    "title_neon": "🌈 " + (fr ? "Pulsion Néon" : "Neon Pulse"),
    "title_spectre": "🌌 " + (fr ? "Spectre Cosmique" : "Cosmic Specter"),
    "title_supreme": "⚡ " + (fr ? "FÉLIN SUPRÊME" : "SUPREME FELINE"),
    "title_champion": "🏅 " + (fr ? "Champion Éclair" : "Lightning Champion"),
    "title_combattant": "🎖️ " + d.trophy_name_combatant,
    "title_elite": "🏵️ " + d.trophy_name_elite,
    "title_eveille": "⚡ " + d.trophy_name_awakening,
    "title_flamme": "🔥 " + d.trophy_name_furnace,
    "title_parfait": "💎 " + d.trophy_name_perfection,
    "title_vainqueur": "⚔️ " + (fr ? "Vainqueur" : "Victor"),
    "title_inarrettable": "🔥 " + d.trophy_name_unstoppable,
    "title_gladiateur": "🛡️ " + d.trophy_name_gladiator,
    "title_champion_trophy": "👑 " + d.trophy_name_champion,
    "title_maitre_avalanche": "🎯 " + d.trophy_name_avalanche_master,
    "title_travailleur": "⛏️ " + d.trophy_name_worker,
    "title_etoile": "⭐ " + d.trophy_name_rising_star,
    "title_roi_local": "🏰 " + d.trophy_name_local_king,
    "title_midas": "💰 " + d.trophy_name_midas,
    "title_dynastie": "🏛️ " + d.trophy_name_dynasty,
    "title_mondial": "🌍 " + d.trophy_name_world_n1,
    "title_fantome": "👻 " + (fr ? "Chuchoteur de Fantômes" : "Ghost Whisperer"),
    "title_danse_macabre": "🦴 " + (fr ? "Danse Macabre" : "Macabre Dance"),
    "title_citrouille": "🎃 " + (fr ? "Pulsion Citrouille" : "Pumpkin Pulse"),
    "title_spectre_automne": "🍂 " + (fr ? "Spectre d'Automne" : "Autumn Specter"),
    "title_roi_halloween": "🎃 " + (fr ? "ROI D'HALLOWEEN" : "KING OF HALLOWEEN"),
    "title_esprit_halloween": "👻 " + (fr ? "Esprit d'Halloween" : "Halloween Spirit"),
    "title_lutin": "🧝 " + (fr ? "Lutin espiègle" : "Mischievous Elf"),
    "title_traineau": "🛷 " + (fr ? "Pilote de traîneau" : "Sleigh Pilot"),
    "title_rennes": "🦌 " + (fr ? "Dompteur de rennes" : "Reindeer Tamer"),
    "title_assistant_noel": "🎅 " + (fr ? "Assistant du Père Noël" : "Santa's Assistant"),
    "title_magie_noel": "✨ " + (fr ? "Magie de Noël" : "Christmas Magic"),
    "title_esprit_noel": "🎄 " + (fr ? "Esprit de Noël" : "Christmas Spirit")
  };
}
function getFrameDisplayNames() {
  const fr = currentLang === "fr";
  return {
    "frame_standard": "🔰 " + (fr ? "Cadre « Standard »" : "Frame « Standard »"),
    "frame_silver": "🛡️ " + (fr ? "Cadre « Argenté »" : "Frame « Silver »"),
    "frame_chroma": "🌈 " + (fr ? "Cadre « Flux Chroma »" : "Frame « Chroma Flow »"),
    "frame_prism": "✨ " + (fr ? "Cadre « Doré »" : "Frame « Gold »"),
    "frame_voltage": "⚡ " + (fr ? "Cadre « Sous Tension »" : "Frame « Voltage »"),
    "frame_obsidian": "🖤 " + (fr ? "Cadre « Obsidienne »" : "Frame « Obsidian »"),
    "frame_givre": "🧊 " + (fr ? "Cadre « Givre »" : "Frame « Frost »"),
    "frame_osseux": "🎃 " + (fr ? "Cadre « Lanterne »" : "Frame « Lantern »"),
    "frame_fantome": "👻 " + (fr ? "Cadre « Fantôme »" : "Frame « Ghost »"),
    "frame_bonbon": "🍭 " + (fr ? "Cadre « Bonbon »" : "Frame « Candy »"),
    "frame_guirlande": "🎄 " + (fr ? "Cadre « Guirlande »" : "Frame « Garland »"),
    "frame_lutin": "🧝 " + (fr ? "Cadre « Lutin »" : "Frame « Elf »")
  };
}
function getThemeDisplayNames() {
  const fr = currentLang === "fr";
  return {
    "theme_alt": "🎨 " + (fr ? "Thème de Grille Rétro / Doré" : "Retro / Gold Grid Theme"),
    "theme_glacial": "🧊 " + (fr ? "Thème de Grille Cryo" : "Cryo Grid Theme"),
    "theme_eclair": "⚡ " + (fr ? "Thème de Grille Éclair" : "Lightning Grid Theme"),
    "theme_neon": "🌈 " + (fr ? "Thème de Grille Néon Synthwave" : "Neon Synthwave Grid Theme"),
    "theme_obsidian": "🖤 " + (fr ? "Thème de Grille Obsidienne" : "Obsidian Grid Theme"),
    "theme_citrouille": "🎃 " + (fr ? "Thème de Grille Lanterne" : "Lantern Grid Theme"),
    "theme_fantome": "👻 " + (fr ? "Thème de Grille Fantôme" : "Ghost Grid Theme"),
    "theme_bonbon": "🍭 " + (fr ? "Thème de Grille Bonbon Canne" : "Candy Cane Grid Theme"),
    "theme_sapin": "🎄 " + (fr ? "Thème de Grille Sapin de Noël" : "Christmas Tree Grid Theme"),
    "theme_lutin": "🧝 " + (fr ? "Thème de Grille Lutin" : "Elf Grid Theme")
  };
}

function getPackDisplayNames() {
  const fr = currentLang === "fr";
  return {
    pack_standard: "🔰 " + (fr ? "Standard" : "Standard"),
    pack_haute_tension: "⚡ " + (fr ? "Haute Tension" : "High Voltage"),
    pack_cryo: "🧊 " + (fr ? "Cryo" : "Cryo"),
    pack_solaire: "✨ " + (fr ? "Doré" : "Gold"),
    pack_obsidienne: "🖤 " + (fr ? "Obsidienne" : "Obsidian"),
    pack_neon: "🌈 " + (fr ? "Néon" : "Neon"),
    pack_halloween_citrouille: "🎃 " + (fr ? "Pack Lanterne" : "Lantern Pack"),
    pack_halloween_fantome: "👻 " + (fr ? "Pack Fantôme" : "Ghost Pack"),
    pack_noel_bonbon: "🍭 " + (fr ? "Pack Bonbon" : "Candy Pack"),
    pack_noel_sapin: "🎄 " + (fr ? "Pack Sapin" : "Tree Pack"),
    pack_noel_lutin: "🧝 " + (fr ? "Pack Lutin" : "Elf Pack")
  };
}

function getAvatarBadgeHTML(flag, avatarNum, overrideAvatarType, playerObj) {
  const profile = playerObj || myProfile;
  const equippedAvatar = overrideAvatarType || (profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.avatar);
  const equippedFrame = profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.frame;
  if (!playerObj) {
    const pill = document.getElementById("user-pill");
    if (pill) {
      pill.classList.remove("silver-frame", "chroma-frame", "prism-frame", "voltage-frame", "obsidian-frame", "givre-frame", "osseux-frame", "fantome-frame");
      const frameClass = getFrameClass(equippedFrame);
      if (frameClass) pill.classList.add(frameClass);
    }
  }
  const ADN = getAvatarDisplayNames();
  let avatarContent = avatarNum || 1;
  let avatarTitle = `Avatar #${avatarNum || 1}`;
  if (equippedAvatar === "avatar_lottie_palier30") { avatarTitle = ADN["avatar_lottie_palier30"]; avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="black-rainbow-cat.json" style="width:32px; height:32px;"></div>`; }
  else if (equippedAvatar === "avatar_lottie_palier15") { avatarTitle = ADN["avatar_lottie_palier15"]; avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="cat-assistant.json" style="width:32px; height:32px;"></div>`; }
  else if (equippedAvatar === "avatar_tigre") { avatarTitle = ADN["avatar_tigre"]; avatarContent = `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline></video>`; }
  else if (equippedAvatar === "avatar_s2_squelette") { avatarTitle = ADN["avatar_s2_squelette"]; avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="squelette-danse.json" style="width:32px; height:32px;"></div>`; }
  else if (equippedAvatar === "avatar_s2_chauve") { avatarTitle = ADN["avatar_s2_chauve"]; avatarContent = `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline></video>`; }
  else if (equippedAvatar === "avatar_s2_citrouille") { avatarTitle = ADN["avatar_s2_citrouille"]; avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="citrouille-chateau.json" style="width:32px; height:32px;"></div>`; }
  else if (equippedAvatar === "avatar_s3_bonhomme") { avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="bonhomme-de-neige-avatar.json" style="width:40px; height:40px;"></div>`; }
  else if (equippedAvatar === "avatar_s3_boule") { avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="boule-de-neige-avatar.json" style="width:40px; height:40px;"></div>`; }
  else if (equippedAvatar === "avatar_s3_perenoel") { avatarContent = `<div class="lottie-avatar-badge" data-lottie-url="pere-noel-avatar.json" style="width:40px; height:40px;"></div>`; }
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
  const ADN = getAvatarDisplayNames();
  const avatarType = overrideAvatarType || activeAvatarChoice || (myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar);
  const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
  const frameClass = getFrameClass(equippedFrame);
  let avatarContent = avatarNum || 1;
  if (avatarType === "avatar_lottie_palier30") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="black-rainbow-cat.json" style="width:60px; height:60px;"></div>`;
  else if (avatarType === "avatar_lottie_palier15") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="cat-assistant.json" style="width:60px; height:60px;"></div>`;
  else if (avatarType === "avatar_tigre") avatarContent = `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline style="width:60px; height:60px;"></video>`;
  else if (avatarType === "avatar_s2_squelette") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="squelette-danse.json" style="width:60px; height:60px;"></div>`;
  else if (avatarType === "avatar_s2_chauve") avatarContent = `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline style="width:60px; height:60px;"></video>`;
  else if (avatarType === "avatar_s2_citrouille") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="citrouille-chateau.json" style="width:60px; height:60px;"></div>`;
  else if (avatarType === "avatar_s3_bonhomme") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="bonhomme-de-neige-avatar.json" style="width:74px; height:74px;"></div>`;
  else if (avatarType === "avatar_s3_boule") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="boule-de-neige-avatar.json" style="width:74px; height:74px;"></div>`;
  else if (avatarType === "avatar_s3_perenoel") avatarContent = `<div class="lottie-avatar-large" data-lottie-url="pere-noel-avatar.json" style="width:74px; height:74px;"></div>`;
  const html = `
    <div class="tft-avatar-large ${frameClass}">
      <span class="tft-avatar-large-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; ${typeof avatarContent === "number" ? "font-size:24px;" : ""}">${avatarContent}</span>
      <span class="tft-flag-large-overlay">${flag || "🇫"}</span>
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
      try { lottie.loadAnimation({ container: el, renderer: "svg", loop: true, autoplay: true, path: url, rendererSettings: { preserveAspectRatio: "xMidYMid slice" } }); } catch (e) {}
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

function renderProfileAvatarSelector() {
  const container = document.getElementById("profile-avatar-selector");
  if (!container) return;
  const unlocked = myProfile.unlocked_items || [];
  const ADN = getAvatarDisplayNames();
  const refSelect = document.getElementById("title-input");
  const sel = document.createElement("select");
  sel.id = "avatar-select-input";
  if (refSelect) { sel.className = refSelect.className; sel.style.cssText = refSelect.style.cssText; }
  sel.onchange = () => { activeAvatarChoice = sel.value; updateProfilePreview(); };
  const optStd = document.createElement("option");
  optStd.value = "standard";
  optStd.innerText = "🔢 Avatar Standard";
  sel.appendChild(optStd);
  for (const id in ADN) {
    if (unlocked.includes(id)) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.innerText = ADN[id];
      sel.appendChild(opt);
    }
  }
  sel.value = activeAvatarChoice || "standard";
  container.innerHTML = "";
  container.style.cssText = "margin-bottom:8px;";
  container.appendChild(sel);
}

/* ---------- PACKS ---------- */
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
  { id: "pack_noel_lutin", name: "🧝 Pack Lutin", theme: "theme_lutin", frame: "frame_lutin" },
];
function equipFromSelect(cat, val) {
  if (!myProfile.inventory) myProfile.inventory = {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  if (val) {
    myProfile.inventory.__equipped[cat] = val;
    localStorage.setItem('cb_equipped_' + cat, val);
    if (socket.connected) socket.emit('equip_cosmetic', val);
  } else {
    delete myProfile.inventory.__equipped[cat];
    localStorage.removeItem('cb_equipped_' + cat);
    if (socket.connected) socket.emit('equip_cosmetic', 'none_' + cat);
  }
}
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
  const required = [pack.theme, pack.frame].filter(x => x !== "");
  const owned = pack.id === "pack_standard" ? true : required.every(i => unlocked.includes(i));
  if (!owned) {
    showNotificationToast(currentLang === "fr" ? "🔒 Pack non possédé ! Direction la boutique 🛍️" : "🔒 Pack not owned! Go to the shop 🛍️", "announcement");
    packSelect.value = "";
    return;
  }
  const themeSel = document.getElementById("theme-input");
  const frameSel = document.getElementById("frame-input");
  if (themeSel) themeSel.value = pack.theme;
  if (frameSel) frameSel.value = pack.frame;
  equipFromSelect('theme', pack.theme);
  equipFromSelect('frame', pack.frame);
  updateProfilePreview();
};
  themeSelect.parentElement.insertBefore(packSelect, themeSelect.nextSibling);
}
function renderProfilePackSelector() {
  const packSelect = document.getElementById("pack-input");
  if (!packSelect) return;
  const unlocked = myProfile.unlocked_items || [];
  const PDN = getPackDisplayNames();
  packSelect.innerHTML = `<option value="">🎁 ${currentLang === "fr" ? "Packs (grille + cadre)" : "Packs (grid + frame)"}</option>`;
  PACKS_LIST.forEach(pack => {
  const required = [pack.theme, pack.frame].filter(x => x !== "");
  const owned = pack.id === "pack_standard" ? true : required.every(i => unlocked.includes(i));
  const opt = document.createElement("option");
  opt.value = pack.id;
  opt.innerText = (owned ? "🎁 " : "🔒 ") + (PDN[pack.id] || pack.name);
  packSelect.appendChild(opt);
});
}
function renderProfileCustomizationMenus() {
  const TDN = getTitleDisplayNames();
  const FDN = getFrameDisplayNames();
  const THDN = getThemeDisplayNames();
  const titleSelect = document.getElementById("title-input");
  const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
  if (titleSelect) {
    titleSelect.innerHTML = `<option value="">Aucun titre actif</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("title_")).forEach(tId => {
      const displayName = TDN[tId] || tId;
      const opt = document.createElement("option");
      opt.value = tId; opt.innerText = displayName;
      if (equippedTitle === tId || equippedTitle === displayName) opt.selected = true;
      titleSelect.appendChild(opt);
    });
    titleSelect.onchange = () => { equipFromSelect('title', titleSelect.value); };
  }
  const frameSelect = document.getElementById("frame-input");
  const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
  if (frameSelect) {
    frameSelect.innerHTML = `<option value="">Aucun cadre (Défaut)</option>`;
    const frames = (myProfile.unlocked_items || []).filter(id => id.startsWith("frame_"));
    if (!frames.includes("frame_standard")) frames.unshift("frame_standard");
    frames.forEach(fId => {
      const displayName = FDN[fId] || fId;
      const opt = document.createElement("option");
      opt.value = fId;
      opt.innerText = displayName;
      if (equippedFrame === fId) opt.selected = true;
      frameSelect.appendChild(opt);
    });
    frameSelect.onchange = () => { equipFromSelect('frame', frameSelect.value); updateProfilePreview(); };
  }
  const themeSelect = document.getElementById("theme-input");
  const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (themeSelect) {
    themeSelect.innerHTML = `<option value="">Thème de grille standard</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("theme_")).forEach(thId => {
      const displayName = THDN[thId] || thId;
      const opt = document.createElement("option");
      opt.value = thId; opt.innerText = displayName;
      if (equippedTheme === thId) opt.selected = true;
      themeSelect.appendChild(opt);
    });
    themeSelect.onchange = () => { equipFromSelect('theme', themeSelect.value); };
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
    if (lastDisplayed.coins !== null && myProfile.coins !== lastDisplayed.coins) showDelta(myProfile.coins - lastDisplayed.coins, "🪙");
    if (lastDisplayed.trophies !== null && myProfile.trophies !== lastDisplayed.trophies) showDelta(myProfile.trophies - lastDisplayed.trophies, "🏆");
    if (lastDisplayed.points !== null && myProfile.points !== lastDisplayed.points) showDelta(myProfile.points - lastDisplayed.points, "pts");
    tweenNumber(coinsEl, lastDisplayed.coins, myProfile.coins);
    tweenNumber(trophiesEl, lastDisplayed.trophies, myProfile.trophies);
    tweenNumber(pointsEl, lastDisplayed.points, myProfile.points);
    lastDisplayed = { coins: myProfile.coins, trophies: myProfile.trophies, points: myProfile.points };
  }

  const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
  const titleEl = document.getElementById("user-title-display");
  if (titleEl) titleEl.innerText = equippedTitle ? `[ ${getTitleDisplayNames()[equippedTitle] || equippedTitle} ]` : "";

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
COMPTE + CENTRE DE CONTRÔLE
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
  myProfile.flag = '🇫🇷';
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
  const d = i18n[currentLang];
  let modal = document.getElementById('modal-account');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-account';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:340px;">
        <h3 id="account-title" style="color:#00d2ff; margin:0 0 10px 0; text-align:center;">${d.account_title}</h3>
        <div id="account-content"></div>
        <button class="btn-secondary" onclick="closeAccountModal()">${d.close}</button>
      </div>`;
    document.body.appendChild(modal);
  } else {
    const t = modal.querySelector('#account-title'); if (t) t.innerText = d.account_title;
    const cb = modal.querySelector('.btn-secondary'); if (cb) cb.innerText = d.close;
  }
  renderAccountContent();
  modal.style.display = 'flex';
}
function closeAccountModal() {
  const modal = document.getElementById('modal-account');
  if (modal) modal.style.display = 'none';
}
function renderAccountContent() {
  const d = i18n[currentLang];
  const content = document.getElementById('account-content');
  if (!content) return;
  const connected = isProfileValid() && localStorage.getItem('cb_secret');
  const inputStyle = 'width:100%; background:#0f051d; color:#fff; border:2px solid #00d2ff; border-radius:8px; padding:8px; font-size:13px; margin-bottom:6px; box-sizing:border-box; text-align:center;';
  if (!connected) {
    content.innerHTML = `
      <p style="font-size:10px; color:#aaa; text-align:center;">${d.account_login_desc}</p>
      <input id="account-pseudo" type="text" placeholder="${d.account_pseudo_ph}" style="${inputStyle}">
      <input id="account-code" type="password" placeholder="${d.account_code_ph}" style="${inputStyle}">
      <button class="btn-main btn-blue" onclick="submitAccountForm()">${d.account_login_btn}</button>`;
  } else {
    content.innerHTML = `
      <p style="font-size:12px; text-align:center;">${d.account_connected} <b style="color:#00ff88;">${myProfile.username}</b></p>
      <button class="btn-main btn-blue" onclick="switchAccount()" style="margin-bottom:6px;">${d.account_change}</button>
      <button class="btn-main btn-gold" onclick="startCreateAccount()" style="margin-bottom:6px;">${d.account_create}</button>
      <button class="btn-main" onclick="askDeleteAccount()" style="background:linear-gradient(45deg,#ff416c,#7a0026);">${d.account_delete}</button>`;
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
  if (!myProfile.flag) myProfile.flag = '🇫';
  pendingAccountLogin = true;
  if (socket.connected) {
    socket.emit("register_player", {
      username: myProfile.username, region: myProfile.region, avatar: myProfile.avatar, flag: myProfile.flag,
      inventory: myProfile.inventory || {}, secretCode: myProfile.secretCode, mode: 'login'
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
  const musEl = document.getElementById('cc-music-text');
  if (musEl) { const p = localStorage.getItem('cb_music_season'); musEl.innerText = (isEN ? 'Soundtrack: ' : 'Bande son : ') + (p ? (isEN ? 'Season ' : 'Saison ') + p.replace('s', '') : (isEN ? 'Auto' : 'Auto')); }
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
    myProfile.flag = getFlagEmoji(localStorage.getItem("cb_flag") || "🇫");
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
  document.getElementById("flag-input").value = myProfile.flag || "🇫🇷";
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
  if (validateBtn) validateBtn.innerText = currentLang === "fr" ? '💾 Enregistrer ma personnalisation' : '💾 Save my customization';
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
  if (nameInput.length < 3) { alert(currentLang === "fr" ? "Ton pseudo doit contenir au moins 3 caractères !" : "Your pseudo must contain at least 3 characters!"); return; }
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
      username: myProfile.username, region: myProfile.region, avatar: myProfile.avatar, flag: myProfile.flag,
      inventory: myProfile.inventory, secretCode: myProfile.secretCode || localStorage.getItem('cb_secret') || '', mode: profileMode || 'login'
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
socket.on("online_count", (data) => {
  const el = document.getElementById("online-count-display");
  if (el) el.innerText = data.online;
});
socket.on('register_result', (res) => {
  if (!res.ok) {
    pendingProfileValidation = false;
    localStorage.removeItem('cb_username'); localStorage.removeItem('cb_secret'); localStorage.removeItem('cb_region');
    localStorage.removeItem('cb_avatar'); localStorage.removeItem('cb_flag');
    localStorage.removeItem('cb_equipped_title'); localStorage.removeItem('cb_equipped_frame'); localStorage.removeItem('cb_equipped_theme');
    myProfile.username = ''; myProfile.secretCode = ''; myProfile.inventory = { __equipped: {} };
    if (res.reason === 'taken') alert('❌ Code secret incorrect pour ce pseudo.');
    else if (res.reason === 'nocode') alert('🔒 Choisis un code secret (4 caractères minimum).');
    else if (res.reason === 'short') alert('Ton pseudo doit contenir au moins 3 caractères !');
    else alert('❌ Erreur de connexion au serveur. Réessaie.');
    if (pendingAccountLogin) { pendingAccountLogin = false; renderAccountContent(); }
    return;
  }
  if (pendingAccountLogin) {
    pendingAccountLogin = false;
    saveLocalPreferences(); updateEconomyUI(); closeAccountModal(); showTitleScreen();
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
  showNotificationToast(currentLang === "fr" ? "✨ Passe de Saison mis à jour avec succès !" : "✨ Season Pass updated successfully!", "gift");
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
  if (activeList.length > 0) { banner.innerHTML = `⚡ <b>${currentLang === "fr" ? "ADMIN ABUSE EN COURS :" : "ADMIN ABUSE ACTIVE:"}</b><br>` + activeList.join("<br>"); banner.style.display = "block"; }
  else banner.style.display = "none";
});

/* ============================================================
RECONSTRUCTION DES BARRES D'ÉMOTICÔNES (corrige les emojis manquants)
============================================================ */
function fixEmoteBars() {
  const emotes = ["\u{1F525}", "\u26A1", "\u{1F916}", "\u{1F480}", "\u{1F602}", "\u{1F451}"];
  document.querySelectorAll(".emote-bar").forEach(bar => {
    bar.innerHTML = "";
    emotes.forEach(em => {
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
DÉMARRAGE
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
