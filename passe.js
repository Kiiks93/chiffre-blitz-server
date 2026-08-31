/* ============================================================
BOUTIQUE
============================================================ */
let currentShopTab = "bonus";
function openShop() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } updateShopCoinsDisplay(); document.getElementById("modal-shop").style.display = "flex"; switchShopTab(currentShopTab); }
function closeShop() { document.getElementById("modal-shop").style.display = "none"; }
function switchShopTab(type) {
currentShopTab = type;
updateShopCoinsDisplay();
document.getElementById("shop-tab-bonus").classList.toggle("active", type === "bonus");
document.getElementById("shop-tab-malus").classList.toggle("active", type === "malus");
const cosmeticsTabBtn = document.getElementById("shop-tab-cosmetics");
if (cosmeticsTabBtn) cosmeticsTabBtn.classList.toggle("active", type === "cosmetics");
const packsTabBtn = document.getElementById("shop-tab-packs");
if (packsTabBtn) packsTabBtn.classList.toggle("active", type === "packs");
const container = document.getElementById("shop-container");
container.innerHTML = "";
const powersDict = i18n[currentLang].powers;
const cosmeticsDict = {
theme_glacial: { name: "🧊 Grille Cryo", desc: "Grille aux reflets bleutés glacés" },
theme_alt: { name: "🎨 Grille Rétro/Dorée", desc: "Tuiles dorées look rétro, pluie de pièces au combo" },
theme_eclair: { name: "⚡ Grille Éclair", desc: "Tuiles jaune électrique crépitantes" },
theme_obsidian: { name: "🖤 Grille Obsidienne", desc: "Tuiles sombres striées de lueurs pourpres" },
theme_neon: { name: "🌈 Grille Néon Synthwave", desc: "Dégradé multi-néons animé (EXCLUSIF pass S1)" },
theme_citrouille: { name: "🎃 Grille Lanterne", desc: "Lanternes sculptées qui tombent en vacillant (EXCLUSIF pass S2)" },
theme_fantome: { name: "👻 Grille Fantôme", desc: "Fantômes violets qui descendent vers le fond (EXCLUSIF pass S2)" },
frame_voltage: { name: "⚡ Cadre Sous Tension", desc: "Éclairs électriques crépitants autour de l'avatar" },
frame_obsidian: { name: "🖤 Cadre Obsidienne", desc: "Cadre sombre strié de lueurs pourpres" },
frame_givre: { name: "🧊 Cadre Givre", desc: "Halo glacé aux reflets givrés" },
frame_prism: { name: "✨ Cadre Doré", desc: "Scintillements dorés éblouissants" },
frame_osseux: { name: "🦴 Cadre Osseux", desc: "Os blanchis sous la lune (Halloween)" },
frame_fantome: { name: "👻 Cadre Fantôme", desc: "Lueur pâle spectrale (Halloween)" }
};
const packsDict = {
pack_haute_tension: { name: "⚡ PACK Haute Tension", desc: "Cadre Sous Tension + Grille Éclair", items: ["frame_voltage", "theme_eclair"], value: 3700 },
pack_cryo: { name: "🧊 PACK Cryo", desc: "Cadre Givre + Grille Cryo", items: ["frame_givre", "theme_glacial"], value: 3400 },
pack_solaire: { name: "✨ PACK Doré", desc: "Cadre Doré + Grille Dorée", items: ["frame_prism", "theme_alt"], value: 4400 },
pack_obsidienne: { name: "🖤 PACK Obsidienne", desc: "Cadre Obsidienne + Grille Obsidienne", items: ["frame_obsidian", "theme_obsidian"], value: 6300 }
};
POWERS_CATALOG.filter(p => p.type === type).forEach(p => {
const card = document.createElement("div");
if (type === "packs") {
const info = packsDict[p.id];
if (!info) return;
const ownedAll = info.items.every(i => (myProfile.unlocked_items || []).includes(i));
const reduc = Math.round((1 - p.price / info.value) * 100);
card.className = "power-card";
card.innerHTML = `<h4>${info.name}</h4><p>${info.desc}</p>
<div style="font-size:9px; color:#aaa; margin-bottom:2px; text-decoration:line-through;">${info.value} 🪙 séparés</div>
<div style="font-weight:bold; margin-bottom:4px; font-size:11px; color:#00ff88;">${p.price} 🪙 (-${reduc}%)</div>
${ownedAll ? `<button class="power-btn equip" onclick="equipPack('${p.id}')">Équiper le pack ⚡</button>` : `<button class="power-btn buy" onclick="buyItem('${p.id}')">Acheter</button>`}`;
} else if (type === "cosmetics") {
const info = cosmeticsDict[p.id];
if (!info) return;
const unlocked = myProfile.unlocked_items && myProfile.unlocked_items.includes(p.id);
const equipped = myProfile.inventory && myProfile.inventory.__equipped && Object.values(myProfile.inventory.__equipped).includes(p.id);
card.className = `power-card ${equipped ? "equipped" : ""}`;
card.innerHTML = `<h4>${info.name}</h4><p>${info.desc}</p><div style="font-weight:bold; margin-bottom:4px; font-size:10px; color:#f8b500;">${p.price} 🪙</div>
${unlocked ? `<button class="power-btn ${equipped ? "active" : "equip"}" onclick="equipCosmetic('${p.id}')">${equipped ? "Équipé ✅" : "Équiper"}</button>` : `<button class="power-btn buy" onclick="buyItem('${p.id}')">Acheter</button>`}`;
} else {
const powerInfo = powersDict[p.id];
const qty = myProfile.inventory[p.id] || 0;
const isEquipped = myProfile.equippedPower === p.id;
card.className = `power-card ${isEquipped ? "equipped" : ""}`;
card.innerHTML = `<h4>${powerInfo.name}</h4><p>${powerInfo.desc}</p><div class="stock-badge">Stock : ${qty}</div><div style="font-weight:bold; margin-bottom:4px; font-size:10px; color:#f8b500;">${p.price} 🪙</div>
<button class="power-btn buy" onclick="buyItem('${p.id}')">Acheter (+1)</button>
${qty > 0 ? `<button class="power-btn ${isEquipped ? "active" : "equip"}" onclick="equipPower('${p.id}')">${isEquipped ? "Équipé ✅" : "Équiper"}</button>` : ""}`;
}
container.appendChild(card);
});
}
function buyItem(id) {
const itemObj = POWERS_CATALOG.find(p => p.id === id);
if (itemObj && myProfile.coins < itemObj.price) { SoundEngine.playError(); showNotificationToast(i18n[currentLang].not_enough_coins, "announcement"); return; }
if (socket.connected) socket.emit("buy_item", id);
}
function equipCosmetic(id) { if (socket.connected) socket.emit("equip_cosmetic", id); }
function equipPack(packId) {
const packs = {
pack_haute_tension: ["theme_eclair", "frame_voltage"],
pack_cryo: ["theme_glacial", "frame_givre"],
pack_solaire: ["theme_alt", "frame_prism"],
pack_obsidienne: ["theme_obsidian", "frame_obsidian"]
};
const items = packs[packId];
if (!items) return;
equipCosmetic(items[0]);
equipCosmetic(items[1]);
showNotificationToast("✅ Pack équipé : grille + cadre !", "gift");
}
function equipPower(id) { if (socket.connected) socket.emit("equip_power", id); }
function sanitizeEquippedPowers() {
if (!myProfile.inventory) myProfile.inventory = {};
if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) <= 0) myProfile.equippedPower = null;
if (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) myProfile.equippedPowers = myProfile.equippedPowers.filter(p => (myProfile.inventory[p] || 0) > 0);
if (selectedRankedItems && selectedRankedItems.length > 0) selectedRankedItems = selectedRankedItems.filter(p => (myProfile.inventory[p] || 0) > 0);
}
/* ============================================================
PASSE DE SAISON — MOTEUR MULTI-SAISONS
============================================================ */
const SEASONS_CLIENT = [
  { id: "s1", name: "FÉLIN & NÉON", emoji: "🐱", start: "01/06/2026", end: "30/09/2026", tiers: [
    { tier: 1, free: "50 Pièces (🪙)", premium: "Titre exclusif « [ Stalker Numérique ] »" },
    { tier: 2, free: "1 💡 Projecteur", premium: "100 Pièces (🪙)" },
    { tier: 3, free: "50 Pièces (🪙)", premium: "Titre rare « [ Réflexe Félin ] »" },
    { tier: 4, free: "1 ⏳ Blocage du Temps", premium: "🛡️ Cadre de Profil Argenté" },
    { tier: 5, free: "75 Pièces (🪙)", premium: "150 Pièces (🪙)" },
    { tier: 6, free: "1 ⚡ Joker Éclair", premium: "Pack de Consommables (Bonus)" },
    { tier: 7, free: "50 Pièces (🪙)", premium: "Titre « [ Pulsion Néon ] »" },
    { tier: 8, free: "1 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 9, free: "100 Pièces (🪙)", premium: "200 Pièces (🪙)" },
    { tier: 10, free: "1 🌟 Nova Temporelle", premium: "🎨 Grille Néon Synthwave (EXCLUSIF pass)" },
    { tier: 11, free: "60 Pièces (🪙)", premium: "120 Pièces (🪙)" },
    { tier: 12, free: "1 ⏳ Blocage du Temps", premium: "1 💡 Projecteur" },
    { tier: 13, free: "70 Pièces (🪙)", premium: "Titre « [ Spectre Cosmique ] »" },
    { tier: 14, free: "1 ⚡ Joker Éclair", premium: "2 ⏳ Blocage du Temps" },
    { tier: 15, free: "150 Pièces (🪙)", premium: "🐱 Avatar Animé Lottie : Chat Assistant" },
    { tier: 16, free: "80 Pièces (🪙)", premium: "160 Pièces (🪙)" },
    { tier: 17, free: "2 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 18, free: "90 Pièces (🪙)", premium: "250 Pièces (🪙)" },
    { tier: 19, free: "1 ⚡ Joker Éclair", premium: "1 📳 Séisme" },
    { tier: 20, free: "100 Pièces (🪙)", premium: "🌈 Cadre Animé « Flux Chroma »" },
    { tier: 21, free: "110 Pièces (🪙)", premium: "220 Pièces (🪙)" },
    { tier: 22, free: "1 ⏳ Blocage du Temps", premium: "3 💡 Projecteur" },
    { tier: 23, free: "120 Pièces (🪙)", premium: "350 Pièces (🪙)" },
    { tier: 24, free: "1 ⚡ Joker Éclair", premium: "300 Pièces (🪙)" },
    { tier: 25, free: "150 Pièces (🪙)", premium: "🌈 Avatar Animé Lottie : Chat Arc-en-ciel" },
    { tier: 26, free: "130 Pièces (🪙)", premium: "260 Pièces (🪙)" },
    { tier: 27, free: "2 💡 Projecteur", premium: "4 🌟 Novas Temporelles" },
    { tier: 28, free: "140 Pièces (🪙)", premium: "400 Pièces (🪙)" },
    { tier: 29, free: "300 Pièces (🪙)", premium: "500 Pièces (🪙)" },
    { tier: 30, free: "Titre suprême « [ ⚡ FÉLIN SUPRÊME ] » + 500 🪙", premium: "🏆 GRAAL : 🐯 Avatar Tigre de Sibérie (Vidéo) + 1000 🪙" }
  ] },
  { id: "s2", name: "HALLOWEEN", emoji: "🎃", start: "01/10/2026", end: "30/11/2026", tiers: [
    { tier: 1, free: "50 Pièces (🪙)", premium: "Titre « [ Chuchoteur de Fantômes ] » 👻" },
    { tier: 2, free: "1 💡 Projecteur", premium: "100 Pièces (🪙)" },
    { tier: 3, free: "50 Pièces (🪙)", premium: "Titre « [ Danse Macabre ] » 🦴" },
    { tier: 4, free: "1 ⏳ Blocage du Temps", premium: "🎃 Cadre « Lanterne »" },
    { tier: 5, free: "75 Pièces (🪙)", premium: "150 Pièces (🪙)" },
    { tier: 6, free: "1 ⚡ Joker Éclair", premium: "Pack de Consommables (Bonus)" },
    { tier: 7, free: "50 Pièces (🪙)", premium: "Titre « [ Pulsion Citrouille ] » 🎃" },
    { tier: 8, free: "1 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 9, free: "100 Pièces (🪙)", premium: "200 Pièces (🪙)" },
    { tier: 10, free: "1 🌟 Nova Temporelle", premium: "🎨 Grille Lanterne (EXCLUSIF pass)" },
    { tier: 11, free: "60 Pièces (🪙)", premium: "120 Pièces (🪙)" },
    { tier: 12, free: "1 ⏳ Blocage du Temps", premium: "1 💡 Projecteur" },
    { tier: 13, free: "70 Pièces (🪙)", premium: "Titre « [ Spectre d'Automne ] » 🍂" },
    { tier: 14, free: "1 ⚡ Joker Éclair", premium: "2 ⏳ Blocage du Temps" },
    { tier: 15, free: "150 Pièces (🪙)", premium: "💀 Avatar Animé : Squelette qui danse" },
    { tier: 16, free: "80 Pièces (🪙)", premium: "160 Pièces (🪙)" },
    { tier: 17, free: "2 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 18, free: "90 Pièces (🪙)", premium: "250 Pièces (🪙)" },
    { tier: 19, free: "1 ⚡ Joker Éclair", premium: "1 📳 Séisme" },
    { tier: 20, free: "100 Pièces (🪙)", premium: "👻 Cadre « Fantôme »" },
    { tier: 21, free: "110 Pièces (🪙)", premium: "220 Pièces (🪙)" },
    { tier: 22, free: "1 ⏳ Blocage du Temps", premium: "3 💡 Projecteur" },
    { tier: 23, free: "120 Pièces (🪙)", premium: "350 Pièces (🪙)" },
    { tier: 24, free: "1 ⚡ Joker Éclair", premium: "🎨 Grille Fantôme (EXCLUSIF pass)" },
    { tier: 25, free: "150 Pièces (🪙)", premium: "🦇 Avatar Vidéo : Chauve-Souris" },
    { tier: 26, free: "130 Pièces (🪙)", premium: "260 Pièces (🪙)" },
    { tier: 27, free: "2 💡 Projecteur", premium: "4 🌟 Novas Temporelles" },
    { tier: 28, free: "140 Pièces (🪙)", premium: "400 Pièces (🪙)" },
    { tier: 29, free: "300 Pièces (🪙)", premium: "500 Pièces (🪙)" },
    { tier: 30, free: "Titre « [ 👻 Esprit d'Halloween ] » + 500 🪙", premium: "🏆 GRAAL : 🎃 Avatar Citrouille du Château + 1000 🪙 + Titre « [ ROI D'HALLOWEEN ] »" }
  ] },
    { id: "s3", name: "NOËL", emoji: "🎄", start: "01/12/2026", end: "10/01/2027", tiers: [
    { tier: 1, free: "50 Pièces (🪙)", premium: "Titre « [ Lutin espiègle ] » 🧝" },
    { tier: 2, free: "1 💡 Projecteur", premium: "100 Pièces (🪙)" },
    { tier: 3, free: "50 Pièces (🪙)", premium: "Titre « [ Pilote de traîneau ] » 🛷" },
    { tier: 4, free: "1 ⏳ Blocage du Temps", premium: "🍭 Cadre « Bonbon »" },
    { tier: 5, free: "75 Pièces (🪙)", premium: "⛄ Avatar Animé Lottie : Bonhomme de Neige" },
    { tier: 6, free: "1 ⚡ Joker Éclair", premium: "Pack de Consommables (Bonus)" },
    { tier: 7, free: "50 Pièces (🪙)", premium: "Titre « [ Dompteur de rennes ] » 🦌" },
    { tier: 8, free: "1 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 9, free: "100 Pièces (🪙)", premium: "200 Pièces (🪙)" },
    { tier: 10, free: "1 🌟 Nova Temporelle", premium: "🍭 Grille Bonbon Canne (EXCLUSIF pass)" },
    { tier: 11, free: "60 Pièces (🪙)", premium: "120 Pièces (🪙)" },
    { tier: 12, free: "1 ⏳ Blocage du Temps", premium: "1 💡 Projecteur" },
    { tier: 13, free: "70 Pièces (🪙)", premium: "Titre « [ Assistant du Père Noël ] » 🎅" },
    { tier: 14, free: "1 ⚡ Joker Éclair", premium: "2 ⏳ Blocage du Temps" },
    { tier: 15, free: "🔮 Avatar Boule de Neige (Cadeau 🎁)", premium: "🔮 Avatar Animé Lottie : Boule de Neige" },
    { tier: 16, free: "80 Pièces (🪙)", premium: "160 Pièces (🪙)" },
    { tier: 17, free: "2 💡 Projecteur", premium: "2 🌟 Novas Temporelles" },
    { tier: 18, free: "90 Pièces (🪙)", premium: "250 Pièces (🪙)" },
    { tier: 19, free: "1 ⚡ Joker Éclair", premium: "1 📳 Séisme" },
    { tier: 20, free: "100 Pièces (🪙)", premium: "🎄 Cadre « Guirlande »" },
    { tier: 21, free: "110 Pièces (🪙)", premium: "220 Pièces (🪙)" },
    { tier: 22, free: "1 ⏳ Blocage du Temps", premium: "3 💡 Projecteur" },
    { tier: 23, free: "120 Pièces (🪙)", premium: "350 Pièces (🪙)" },
    { tier: 24, free: "1 ⚡ Joker Éclair", premium: "🎄 Grille Sapin de Noël (EXCLUSIF pass)" },
    { tier: 25, free: "150 Pièces (🪙)", premium: "🎅 Avatar Animé Lottie : Père Noël" },
    { tier: 26, free: "130 Pièces (🪙)", premium: "260 Pièces (🪙)" },
    { tier: 27, free: "2 💡 Projecteur", premium: "4 🌟 Novas Temporelles" },
    { tier: 28, free: "140 Pièces (🪙)", premium: "Titre « [ Magie de Noël ] » ✨" },
    { tier: 29, free: "300 Pièces (🪙)", premium: "🧝 Cadre « Lutin »" },
    { tier: 30, free: "Titre « [ 🎄 Esprit de Noël ] » + 500 🪙", premium: "🏆 GRAAL : 🧝 Grille Lutin + 1000 🪙" }
  ] }
];
function getActiveSeason() {
  if (myProfile.currentSeasonId) {
    const s = SEASONS_CLIENT.find(x => x.id === myProfile.currentSeasonId);
    if (s) return s;
  }
  const now = new Date();
  for (const s of SEASONS_CLIENT) {
    const [d1, m1, y1] = s.start.split("/").map(Number);
    const [d2, m2, y2] = s.end.split("/").map(Number);
    if (now >= new Date(y1, m1 - 1, d1) && now <= new Date(y2, m2 - 1, d2, 23, 59)) return s;
  }
  return SEASONS_CLIENT[SEASONS_CLIENT.length - 1];
}
function openBlitzPass() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } document.getElementById("modal-blitz-pass").style.display = "flex"; renderBlitzPass(); }
function closeBlitzPass() { document.getElementById("modal-blitz-pass").style.display = "none"; }
let rewardPopupTimeout = null;
let lastRewardSoundTime = 0;
function showRewardPopUp(rewardName, rewardIcon) {
  let popup = document.getElementById("reward-popup-overlay");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "reward-popup-overlay";
    popup.className = "modal-overlay";
    popup.innerHTML = `<div class="modal-card" style="text-align:center; animation: victoryScalePop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards; border-color:#f8b500; box-shadow:0 0 40px rgba(248,181,0,0.8);">
      <div style="font-size:55px; margin-bottom:10px;" id="popup-reward-icon">🎁</div>
      <div style="font-size:10px; font-weight:900; color:#f8b500; letter-spacing:2px; margin-bottom:4px;">RÉCOMPENSE DÉBLOQUÉE</div>
      <div id="popup-reward-name" style="color:#fff; font-size:15px; font-weight:bold; margin-bottom:20px; line-height:1.4;">-</div>
      <button class="btn-main btn-gold" onclick="document.getElementById('reward-popup-overlay').style.display='none'" style="width:100%; margin-top:0;">Récupéré ! ⚡</button></div>`;
    document.body.appendChild(popup);
  }
  document.getElementById("popup-reward-icon").innerText = rewardIcon || "🎁";
  document.getElementById("popup-reward-name").innerText = rewardName;
  popup.style.display = "flex";
  const now = Date.now();
  if (now - lastRewardSoundTime > 1200) { lastRewardSoundTime = now; SoundEngine.playVictory(); }
  if (rewardPopupTimeout) clearTimeout(rewardPopupTimeout);
  rewardPopupTimeout = setTimeout(() => { popup.style.display = "none"; }, 3000);
}
function spawnUnlockBurst(card, icon) {
  const rect = card.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'bp-burst'; p.innerText = icon;
    p.style.left = (rect.left + rect.width / 2) + 'px';
    p.style.top = (rect.top + rect.height / 2) + 'px';
    const ang = (Math.PI * 2 / 8) * i, dist = 60 + Math.random() * 40;
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}
/* ---------- APERÇUS VISUELS (style Fortnite) ---------- */
const SPECIAL_REWARDS = {
  s1: { free:{30:'title_supreme'}, premium:{1:'title_stalker',3:'title_felin',4:'frame_silver',7:'title_neon',10:'theme_neon',13:'title_spectre',15:'avatar_lottie_palier15',20:'frame_chroma',23:'title_supreme',25:'avatar_lottie_palier30',30:'avatar_tigre'} },
  s2: { free:{30:'title_esprit_halloween'}, premium:{1:'title_fantome',3:'title_danse_macabre',4:'frame_osseux',7:'title_citrouille',10:'theme_citrouille',13:'title_spectre_automne',15:'avatar_s2_squelette',20:'frame_fantome',24:'theme_fantome',25:'avatar_s2_chauve',30:'avatar_s2_citrouille'} },
  s3: { free:{15:'avatar_s3_boule',30:'title_esprit_noel'}, premium:{1:'title_lutin',3:'title_traineau',4:'frame_bonbon',5:'avatar_s3_bonhomme',7:'title_rennes',10:'theme_bonbon',13:'title_assistant_noel',15:'avatar_s3_boule',20:'frame_guirlande',24:'theme_sapin',25:'avatar_s3_perenoel',28:'title_magie_noel',29:'frame_lutin',30:'theme_lutin'} }
};
const THEME_GRAD = {
  theme_neon:'linear-gradient(135deg,#ff007f,#00e5ff,#76ff03)', theme_glacial:'linear-gradient(135deg,#0a2a4d,#0ea5c9)',
  theme_eclair:'linear-gradient(135deg,#282805,#fff34d)', theme_obsidian:'linear-gradient(135deg,#0a050a,#23050f)',
  theme_alt:'linear-gradient(135deg,#f8b500,#ff8a00)', theme_citrouille:'linear-gradient(135deg,#1a0d00,#ff8a00)',
  theme_fantome:'linear-gradient(135deg,#1a0033,#7b2ff7)', theme_bonbon:'linear-gradient(135deg,#ff4b4b,#fff)',
  theme_sapin:'linear-gradient(135deg,#0a3d1f,#1a7a3c)', theme_lutin:'linear-gradient(135deg,#c62828,#ffd23b)'
};
function firstEmoji(text) {
  const m = String(text).match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/);
  return m ? m[0] : '🎁';
}
function avatarPreviewHTML(id) {
  if (id==='avatar_tigre') return `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline style="width:44px;height:44px;border-radius:50%;"></video>`;
  if (id==='avatar_s2_chauve') return `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline style="width:44px;height:44px;border-radius:50%;"></video>`;
  const lm = { avatar_lottie_palier15:'cat-assistant.json', avatar_lottie_palier30:'black-rainbow-cat.json', avatar_s2_squelette:'squelette-danse.json', avatar_s2_citrouille:'citrouille-chateau.json', avatar_s3_bonhomme:'bonhomme-de-neige-avatar.json', avatar_s3_boule:'boule-de-neige-avatar.json', avatar_s3_perenoel:'pere-noel-avatar.json' };
  if (lm[id]) return `<div class="lottie-avatar-badge" data-lottie-url="${lm[id]}" style="width:44px;height:44px;"></div>`;
  return '🎁';
}
function rewardVisualHTML(seasonId, tier, track, text) {
  try {
    const item = (SPECIAL_REWARDS[seasonId] && SPECIAL_REWARDS[seasonId][track] && SPECIAL_REWARDS[seasonId][track][tier]) || null;
    if (item) {
      if (item.indexOf('avatar_') === 0) return `<div class="bp-visual">${avatarPreviewHTML(item)}<div class="bp-type">Avatar</div></div>`;
      if (item.indexOf('frame_') === 0) return `<div class="bp-visual"><div class="tft-avatar-container ${getFrameClass(item)}" style="width:40px;height:40px;">⭐</div><div class="bp-type">Cadre</div></div>`;
      if (item.indexOf('theme_') === 0) return `<div class="bp-visual"><div class="bp-swatch" style="background:${THEME_GRAD[item]||'linear-gradient(135deg,#522d80,#2a1845)'}"></div><div class="bp-type">Grille</div></div>`;
      if (item.indexOf('title_') === 0) return `<div class="bp-visual bp-title">${(typeof TITLE_DISPLAY_NAMES!=='undefined' && TITLE_DISPLAY_NAMES[item])||item}<div class="bp-type">Titre</div></div>`;
    }
    const emoji = firstEmoji(text);
    const label = String(text).split(emoji).join('').trim();
    let type = 'Récompense';
    if (/Pièces/i.test(text)) type = 'Pièces';
    else if (/Projecteur|Blocage|Joker|Nova|Séisme|Pack/i.test(text)) type = 'Pouvoir';
    return `<div class="bp-visual"><div class="bp-emoji">${emoji}</div><div class="bp-label">${label}</div><div class="bp-type">${type}</div></div>`;
  } catch (e) {
    return `<div class="bp-visual"><div class="bp-emoji">🎁</div><div class="bp-label">${text}</div></div>`;
  }
}
function renderBlitzPass() {
  const container = document.getElementById("blitz-pass-container");
  const prevEl = document.querySelector('.bp-track-scroll');
  const prevX = prevEl ? prevEl.scrollLeft : 0;
  const prevY = prevEl ? prevEl.scrollTop : 0;
  const season = getActiveSeason();
  const seasonData = (myProfile.claimedPassTiers || {})[season.id] || {};
  const isPremium = !!seasonData.premium || (season.id === "s1" && myProfile.blitzPassPremium);
  const claimed = seasonData;
  container.innerHTML = `<div class="bp-header-banner">
    <div style="font-size:13px; font-weight:900; color:#f8b500; margin-bottom:2px;">${season.emoji} PASSE DE SAISON : ${season.name}</div>
    <div style="font-size:9px; color:#aaa; margin-bottom:4px;">📅 ${season.start} → ${season.end}</div>
    <div style="font-size:10px; color:#ccc; margin-bottom:6px;">${isPremium ? "✨ Passe Premium Actif !" : "Débloque le Passe Premium pour 1000 🪙"}</div>
    ${!isPremium ? `<button class="btn-main btn-gold" onclick="buyBlitzPassPremium()" style="padding:6px 10px; font-size:11px; margin:0 auto; width:auto;">Acheter le Passe Premium (1000 🪙)</button>` : `<div style="color:#00ff88; font-weight:bold; font-size:10px;">Statut : VIP / Premium</div>`}</div>`;
  if (!season.tiers || season.tiers.length === 0) {
    container.innerHTML += `<div style="text-align:center; color:#aaa; padding:20px; font-size:12px; font-weight:bold;">${season.emoji} Le contenu de la saison ${season.name} arrive bientôt !</div>`;
    return;
  }
  const scroll = document.createElement("div");
  scroll.className = "bp-track-scroll";
  season.tiers.forEach(t => {
    const freeKey = `${t.tier}_free`, premKey = `${t.tier}_premium`;
    const isFreeClaimed = claimed[freeKey], isPremClaimed = claimed[premKey];
    const premDisabled = isPremClaimed || !isPremium;
    const col = document.createElement("div");
    col.className = "bp-tier-col"; col.id = "bp-card-" + t.tier;
      col.innerHTML = `
      <div class="bp-card bp-card-prem ${isPremClaimed ? 'claimed' : (!isPremium ? 'locked' : '')}" onclick="claimPassReward(${t.tier},'premium')">
        <div class="bp-ribbon">⭐ PREMIUM</div>
        ${rewardVisualHTML(season.id, t.tier, 'premium', t.premium)}
      </div>
      <div class="bp-num">${t.tier}</div>
      <div class="bp-card bp-card-free ${isFreeClaimed ? 'claimed' : ''}" onclick="claimPassReward(${t.tier},'free')">
        <div class="bp-ribbon free">GRATUIT</div>
        ${rewardVisualHTML(season.id, t.tier, 'free', t.free)}
      </div>`;
    scroll.appendChild(col);
  });
  container.appendChild(scroll);
  scroll.scrollLeft = prevX; scroll.scrollTop = prevY;
  setTimeout(() => { scroll.scrollLeft = prevX; scroll.scrollTop = prevY; }, 0);
  updatePassSeasonLabels();
  setTimeout(() => { if (typeof initAllLottieBadges === "function") initAllLottieBadges(); }, 60);
}
function buyBlitzPassPremium() { if (myProfile.coins < 1000) { showNotificationToast(i18n[currentLang].not_enough_coins, "announcement"); return; } socket.emit("buy_blitz_pass"); }
let lastClaimTime = 0;
function claimPassReward(tier, track) {
  if (track === "premium" && !myProfile.blitzPassPremium) {
    showNotificationToast("❌ Tu dois acheter le Passe Premium pour récupérer cette récompense !", "announcement");
    return;
  }
  socket.emit("claim_pass_tier", { tier, track });
}
socket.on("pass_tier_claimed", (data) => {
const tier = data.tier, track = data.track;
const season = getActiveSeason();
let icon = "🌟";
if (season.id === "s2") icon = (tier === 30 && track === "premium") ? "🎃" : (tier === 25 && track === "premium") ? "🦇" : (tier === 15 && track === "premium") ? "💀" : "🎃";
else if (season.id === "s3") icon = (tier === 30 && track === "premium") ? "🍪" : (tier === 25 && track === "premium") ? "🎅" : (tier === 15 && track === "premium") ? "🔮" : (tier === 5 && track === "premium") ? "⛄" : "🎄";
else icon = (tier === 30 && track === "premium") ? "🐯" : (tier === 25 && track === "premium") ? "🌈" : (tier === 15 && track === "premium") ? "🐱" : "🌟";
const col = document.getElementById("bp-card-" + tier);
if (col) {
  const card = col.querySelector(track === 'premium' ? '.bp-card-prem' : '.bp-card-free');
  if (card) { card.classList.remove('bp-unlock'); void card.offsetWidth; card.classList.add('bp-unlock'); }
  spawnUnlockBurst(col, icon);
}
const ns = Date.now();
if (ns - lastRewardSoundTime > 1200) { lastRewardSoundTime = ns; SoundEngine.playVictory(); }
setTimeout(() => { renderBlitzPass(); }, 450);
});
socket.on("pass_claim_denied", (data) => {
if (data.reason === "premium_required") showNotificationToast("❌ Tu dois acheter le Passe Premium pour récupérer cette récompense !", "announcement");
else if (data.reason === "already_claimed") showNotificationToast("❌ Cette récompense a déjà été récupérée.", "announcement");
renderBlitzPass();
});

/* ============================================================
NOM DU PASS DYNAMIQUE (s'adapte à la saison active)
============================================================ */
const SEASON_PASS_SUBTITLES = {
  s1: "Néon Félin & Récompenses 🐱",
  s2: "Frisson d'Halloween & Récompenses 🎃",
  s3: "Magie de Noël & Récompenses 🎄"
};

function updatePassSeasonLabels() {
  const season = getActiveSeason();
  const num = season.id.replace("s", "");
  const titleEl = document.getElementById("pass-menu-title");
  if (titleEl) titleEl.innerText = `PASSE DE SAISON • SAISON ${num} ${season.emoji} ${season.name}`;
  const subEl = document.getElementById("pass-menu-sub");
  if (subEl) subEl.innerText = SEASON_PASS_SUBTITLES[season.id] || "Récompenses 🌟";
  const badgeEl = document.getElementById("pass-modal-season");
  if (badgeEl) badgeEl.innerText = `Saison ${num} • ${season.emoji} ${season.name}`;
}

if (typeof socket !== "undefined") {
  socket.on("player_registered", () => setTimeout(updatePassSeasonLabels, 60));
  socket.on("season_updated", () => setTimeout(updatePassSeasonLabels, 60));
}
document.addEventListener("DOMContentLoaded", () => setTimeout(updatePassSeasonLabels, 150));
