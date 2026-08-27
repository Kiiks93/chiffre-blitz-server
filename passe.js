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
frame_voltage: { name: "⚡ Cadre Sous Tension", desc: "Éclairs électriques crépitants autour de l'avatar" },
frame_obsidian: { name: "🖤 Cadre Obsidienne", desc: "Cadre sombre strié de lueurs pourpres" },
frame_givre: { name: "🧊 Cadre Givre", desc: "Halo glacé aux reflets givrés" },
frame_prism: { name: "✨ Cadre Doré", desc: "Scintillements dorés éblouissants" }
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
PASSE DE SAISON « FELIN & NEON »
============================================================ */
const BLITZ_PASS_TIERS = [
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
];
function openBlitzPass() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } document.getElementById("modal-blitz-pass").style.display = "flex"; renderBlitzPass(); }
function closeBlitzPass() { document.getElementById("modal-blitz-pass").style.display = "none"; }
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
SoundEngine.playVictory();
}
function renderBlitzPass() {
const container = document.getElementById("blitz-pass-container");
const isPremium = myProfile.blitzPassPremium;
const claimed = myProfile.claimedPassTiers || {};
container.innerHTML = `<div class="bp-header-banner">
<div style="font-size:13px; font-weight:900; color:#f8b500; margin-bottom:2px;">🌟 SAISON 1 : PASSE DE SAISON FÉLIN & NÉON</div>
<div style="font-size:10px; color:#ccc; margin-bottom:6px;">${isPremium ? "✨ Passe Premium Actif !" : "Débloque le Passe Premium pour 1000 🪙"}</div>
${!isPremium ? `<button class="btn-main btn-gold" onclick="buyBlitzPassPremium()" style="padding:6px 10px; font-size:11px; margin:0 auto; width:auto;">Acheter le Passe Premium (1000 🪙) </button>` : `<div style="color:#00ff88; font-weight:bold; font-size:10px;">Statut : VIP / Premium</div>`}</div>`;
const listDiv = document.createElement("div");
listDiv.style.cssText = "display:flex; flex-direction:column; gap:6px;";
BLITZ_PASS_TIERS.forEach(t => {
const freeKey = `${t.tier}_free`;
const premKey = `${t.tier}_premium`;
const isFreeClaimed = claimed[freeKey];
const isPremClaimed = claimed[premKey];
const premDisabled = isPremClaimed || !isPremium;
const card = document.createElement("div");
card.className = "bp-tier-card unlocked";
card.innerHTML = `
<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;"><span style="font-weight:900; color:#f8b500; font-size:11px;">PALIER ${t.tier}</span><span style="font-size:9px; font-weight:bold; color:#00ff88;">Disponible ✅</span></div>
<div class="bp-tracks-grid">
<div class="bp-track-box"><div><span style="color:#38ef7d; font-weight:bold;">🟢 Gratuit :</span><br>${t.free}</div>
<button class="power-btn ${isFreeClaimed ? "active" : "equip"}" style="margin-top:4px; font-size:9px; padding:3px; ${isFreeClaimed ? "opacity:0.5;" : ""}" ${isFreeClaimed ? "disabled" : ""} onclick="claimPassReward(${t.tier}, 'free')">${isFreeClaimed ? "Récupéré" : "Récupérer"}</button></div>
<div class="bp-track-box"><div><span style="color:#00d2ff; font-weight:bold;">⭐ Premium :</span><br>${t.premium}</div>
<button class="power-btn ${isPremClaimed ? "active" : "equip"}" style="margin-top:4px; font-size:9px; padding:3px; ${premDisabled ? "opacity:0.5;" : ""}" ${premDisabled ? "disabled" : ""} onclick="claimPassReward(${t.tier}, 'premium')">${isPremClaimed ? "Récupéré" : "Récupérer"}</button></div>
</div>`;
listDiv.appendChild(card);
});
container.appendChild(listDiv);
}
function buyBlitzPassPremium() { if (myProfile.coins < 1000) { showNotificationToast(i18n[currentLang].not_enough_coins, "announcement"); return; } socket.emit("buy_blitz_pass"); }
function claimPassReward(tier, track) { if (track === "premium" && !myProfile.blitzPassPremium) { showNotificationToast("❌ Tu dois acheter le Passe Premium pour récupérer cette récompense !", "announcement"); return; } socket.emit("claim_pass_tier", { tier, track }); }
socket.on("pass_tier_claimed", (data) => {
const tier = data.tier, track = data.track;
const tierData = BLITZ_PASS_TIERS.find(t => t.tier === tier);
const rewardText = tierData ? (track === "premium" ? tierData.premium : tierData.free) : `Palier ${tier}`;
const icon = (tier === 30 && track === "premium") ? "🐯" : (tier === 25 && track === "premium") ? "🌈" : (tier === 15 && track === "premium") ? "🐱" : "🌟";
showRewardPopUp(rewardText, icon);
renderBlitzPass();
});
socket.on("pass_claim_denied", (data) => {
if (data.reason === "premium_required") showNotificationToast("❌ Tu dois acheter le Passe Premium pour récupérer cette récompense !", "announcement");
else if (data.reason === "already_claimed") showNotificationToast("❌ Cette récompense a déjà été récupérée.", "announcement");
renderBlitzPass();
});
