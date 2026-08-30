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

  // 🔊 Son max 1 fois / 1.2s (évite la superposition de 10 victoires)
  const now = Date.now();
  if (now - lastRewardSoundTime > 1200) { lastRewardSoundTime = now; SoundEngine.playVictory(); }

  // ⏱️ Auto-fermeture après 3s (le timer précédent est annulé → pas d'accumulation)
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
function renderBlitzPass() {
  const container = document.getElementById("blitz-pass-container");
  if (!container) return;

  const season = getActiveSeason();
  // Récupère les données sauvegardées pour cette saison
  const seasonData = (myProfile.claimedPassTiers || {})[season.id] || {};
  const isPremium = !!seasonData.premium || (season.id === "s1" && myProfile.blitzPassPremium);
  const claimed = seasonData;
  
  // Calculs XP et Niveau
  const currentTier = myProfile.blitzPassTier || 1;
  const xpPerTier = 1000;
  const currentXP = myProfile.blitzPassXP || 0;
  const xpInCurrentTier = currentXP % xpPerTier; // XP depuis le dernier niveau
  const xpPercent = Math.min(100, Math.floor((xpInCurrentTier / xpPerTier) * 100));
  
  // --- MISE À JOUR DE LA BARRE XP (BUG #1 CORRIGÉ) ---
  document.getElementById("bp-current-tier").innerText = currentTier;
  document.getElementById("bp-xp-text").innerText = `${xpInCurrentTier} / ${xpPerTier} XP`;
  document.getElementById("bp-xp-bar").style.width = xpPercent + "%";
  
  // --- HEADER AVEC BOUTON PREMIUM (BUG #2 CORRIGÉ) ---
  let headerHTML = `<div class="bp-header-banner" style="background:linear-gradient(135deg, rgba(248,181,0,0.15), rgba(0,0,0,0.6)); border:2px solid #f8b500; border-radius:12px; padding:12px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="font-size:28px;">${season.emoji}</div>
      <div>
        <div style="font-size:12px; font-weight:900; color:#f8b500; text-transform:uppercase; letter-spacing:1px;">Passe de Saison ${season.name}</div>
        <div style="font-size:10px; color:#ccc;">${isPremium ? '✨ STATUT PREMIUM ACTIF' : 'Passe Premium disponible'}</div>
      </div>
    </div>
    ${!isPremium ? `<button class="btn-main btn-gold" onclick="buyBlitzPassPremium()" style="padding:8px 16px; font-size:11px; font-weight:bold; background:linear-gradient(45deg, #f8b500, #ffaa00); border:none; border-radius:8px; cursor:pointer; box-shadow:0 4px 15px rgba(248,181,0,0.4);">🔓 DÉBLOQUER PREMIUM (1000 🪙)</button>` : '<div style="color:#00ff88; font-weight:bold; font-size:11px; background:rgba(0,255,136,0.15); padding:6px 12px; border-radius:8px; border:1px solid #00ff88;">⭐ VIP PREMIUM</div>'}
  </div>`;
  
  container.innerHTML = headerHTML;
  
  if (!season.tiers || season.tiers.length === 0) {
    container.innerHTML += `<div style="text-align:center; color:#aaa; padding:40px; font-size:14px; font-weight:bold;">${season.emoji} Le contenu de la saison ${season.name} arrive bientôt !</div>`;
    return;
  }
  
  // Track horizontale scrollable
  const trackWrapper = document.createElement("div");
  trackWrapper.className = "bp-track-wrapper";
  trackWrapper.style.cssText = "position:relative; overflow-x:auto; overflow-y:hidden; padding:20px 10px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid #333;";
  
  const track = document.createElement("div");
  track.className = "bp-track";
  track.style.cssText = "display:flex; gap:8px; min-width:max-content; padding:10px 0;";
  
  // Ligne de connexion centrale
  const connectorLine = document.createElement("div");
  connectorLine.style.cssText = "position:absolute; top:50%; left:60px; right:60px; height:4px; background:linear-gradient(90deg, #f8b500, #ffaa00, #f8b500); opacity:0.3; transform:translateY(-50%); z-index:0; border-radius:2px;";
  trackWrapper.appendChild(connectorLine);
  
  // --- BOUCLE SUR LES NIVEAUX ---
  season.tiers.forEach(t => {
    const freeKey = `${t.tier}_free`, premKey = `${t.tier}_premium`;
    const isFreeClaimed = claimed[freeKey], isPremClaimed = claimed[premKey];
    const canClaimPrem = isPremium && !isPremClaimed;
    const tierNum = t.tier;
    const isCurrentTier = tierNum === currentTier;
    const isPastTier = tierNum < currentTier;
    
    const col = document.createElement("div");
    col.className = "bp-tier-card";
    col.id = "bp-card-" + tierNum;
    col.style.cssText = `position:relative; z-index:1; flex-shrink:0; width:160px; transition:transform 0.3s ease; ${isCurrentTier ? 'transform:scale(1.08);' : ''}`;
    
    // --- LOGIQUE D'AFFICHAGE DES ICÔNES (BUG #3 CORRIGÉ) ---
    // Fonction helper pour trouver l'icône selon le texte de la récompense
    function getRewardIcon(text) {
      if (!text) return "🎁";
      const lower = text.toLowerCase();
      if (lower.includes("avatar") || lower.includes("grille") || lower.includes("cadre")) return "✨";
      if (lower.includes("titre")) return "📛";
      if (lower.includes("graal")) return "👑";
      if (lower.includes("pièces") || lower.includes("🪙")) return "🪙";
      if (lower.includes("joker") || lower.includes("blocage") || lower.includes("nova") || lower.includes("projecteur") || lower.includes("séisme")) return "⚡";
      return "🎁";
    }

    const premIcon = getRewardIcon(t.premium);
    const freeIcon = getRewardIcon(t.free);
    
    // Construction HTML de la carte
    col.innerHTML = `
      <div class="bp-tier-number" style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); background:${isCurrentTier ? 'linear-gradient(45deg, #f8b500, #ffaa00)' : (isPastTier ? '#00ff88' : '#444')}; color:${isCurrentTier || isPastTier ? '#000' : '#fff'}; font-size:11px; font-weight:bold; padding:3px 10px; border-radius:10px; border:2px solid #fff; z-index:3; white-space:nowrap;">${tierNum}</div>
      
      <!-- Carte Premium (haut) -->
      <div class="bp-reward-card bp-premium ${isPremClaimed ? 'claimed' : ''} ${!isPremium ? 'locked' : ''}" style="margin-top:15px; background:linear-gradient(135deg, ${isPremClaimed ? 'rgba(0,255,136,0.2)' : (isPremium ? 'rgba(248,181,0,0.15)' : 'rgba(60,60,60,0.5)')}, rgba(0,0,0,0.8)); border:2px solid ${isPremClaimed ? '#00ff88' : (isPremium ? '#f8b500' : '#555')}; border-radius:10px; padding:8px; min-height:70px; display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden;">
        ${!isPremium ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:2; font-size:18px;">🔒</div>' : ''}
        <div style="font-size:16px; margin-bottom:3px;">${premIcon}</div>
        <div style="font-size:9px; color:${isPremClaimed ? '#00ff88' : (isPremium ? '#f8b500' : '#888')}; line-height:1.2; font-weight:bold;">${t.premium}</div>
        ${isPremClaimed ? '<div style="position:absolute; top:2px; right:2px; color:#00ff88; font-size:12px;">✅</div>' : ''}
      </div>
      
      <!-- Carte Free (bas) -->
      <div class="bp-reward-card bp-free ${isFreeClaimed ? 'claimed' : ''}" style="margin-top:6px; background:linear-gradient(135deg, ${isFreeClaimed ? 'rgba(0,210,255,0.2)' : 'rgba(60,60,60,0.5)'}, rgba(0,0,0,0.8)); border:2px solid ${isFreeClaimed ? '#00d2ff' : '#555'}; border-radius:10px; padding:8px; min-height:70px; display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden;">
        <div style="font-size:16px; margin-bottom:3px;">${freeIcon}</div>
        <div style="font-size:9px; color:${isFreeClaimed ? '#00d2ff' : '#aaa'}; line-height:1.2; font-weight:bold;">${t.free}</div>
        ${isFreeClaimed ? '<div style="position:absolute; top:2px; right:2px; color:#00d2ff; font-size:12px;">✅</div>' : ''}
      </div>
      
      <!-- Bouton claim si niveau actuel -->
      ${isCurrentTier && !isFreeClaimed ? `<button class="bp-claim-btn" onclick="claimPassReward(${tierNum},'free')" style="position:absolute; bottom:-8px; left:50%; transform:translateX(-50%); background:linear-gradient(45deg, #00d2ff, #00aaff); border:none; border-radius:8px; padding:4px 12px; color:#000; font-size:9px; font-weight:bold; cursor:pointer; z-index:4; box-shadow:0 2px 8px rgba(0,210,255,0.5); white-space:nowrap;">RÉCUPÉRER</button>` : ''}
      ${isCurrentTier && isPremium && !isPremClaimed ? `<button class="bp-claim-btn" onclick="claimPassReward(${tierNum},'premium')" style="position:absolute; bottom:-20px; left:50%; transform:translateX(-50%); background:linear-gradient(45deg, #f8b500, #ffaa00); border:none; border-radius:8px; padding:4px 12px; color:#000; font-size:9px; font-weight:bold; cursor:pointer; z-index:4; box-shadow:0 2px 8px rgba(248,181,0,0.5); white-space:nowrap;">PREMIUM</button>` : ''}
    `;
    
    track.appendChild(col);
  });
  
  trackWrapper.appendChild(track);
  container.appendChild(trackWrapper);
  
  // Scroll automatique vers le tier actuel
  setTimeout(() => {
    const currentCard = document.getElementById("bp-card-" + currentTier);
    if (currentCard && trackWrapper) {
      const cardCenter = currentCard.offsetLeft + currentCard.offsetWidth / 2;
      const wrapperCenter = trackWrapper.offsetWidth / 2;
      trackWrapper.scrollTo({ left: cardCenter - wrapperCenter, behavior: 'smooth' });
    }
  }, 100);
  
  updatePassSeasonLabels();
}
function buyBlitzPassPremium() { 
  if (myProfile.coins < 1000) { 
    showNotificationToast(i18n[currentLang].not_enough_coins, "announcement"); 
    return; 
  } 
  socket.emit("buy_blitz_pass"); 
}
socket.on("pass_tier_claimed", (data) => {
const tier = data.tier, track = data.track;
const season = getActiveSeason();
const tierData = season.tiers.find(t => t.tier === tier);
const rewardText = tierData ? (track === "premium" ? tierData.premium : tierData.free) : `Palier ${tier}`;
let icon = "🌟";
if (season.id === "s2") icon = (tier === 30 && track === "premium") ? "🎃" : (tier === 25 && track === "premium") ? "🦇" : (tier === 15 && track === "premium") ? "💀" : "🎃";
else if (season.id === "s3") icon = (tier === 30 && track === "premium") ? "🍪" : (tier === 25 && track === "premium") ? "🎅" : (tier === 15 && track === "premium") ? "🔮" : (tier === 5 && track === "premium") ? "⛄" : "🎄";
else icon = (tier === 30 && track === "premium") ? "🐯" : (tier === 25 && track === "premium") ? "🌈" : (tier === 15 && track === "premium") ? "🐱" : "🌟";
const card = document.getElementById("bp-card-" + tier);
if (card) { card.classList.remove("bp-unlock"); void card.offsetWidth; card.classList.add("bp-unlock"); spawnUnlockBurst(card, icon); }
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

// Met à jour dès que le profil / la saison change
if (typeof socket !== "undefined") {
  socket.on("player_registered", () => setTimeout(updatePassSeasonLabels, 60));
  socket.on("season_updated", () => setTimeout(updatePassSeasonLabels, 60));
}
document.addEventListener("DOMContentLoaded", () => setTimeout(updatePassSeasonLabels, 150));
