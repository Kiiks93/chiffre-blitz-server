const i18n = {
fr: {
coins: "Pièces", trophies: "Trophées", subtitle: "Le duel de calcul et de réflexes ultime",
rule1_title: "⚡ Principe du jeu", rule1_desc: "Clique le plus vite possible sur les tuiles de la grille dans l'ordre croissant exact (1, puis 2, 3, etc.).",
rule2_title: "🏋️ Entraînement Solo", rule2_desc: "Modes Classique, Aléatoire ou Avalanche pour enchaîner les chiffres et gagner des pièces (🪙).",
rule3_title: "⚔️ Duel 1v1 Online", rule3_desc: "Affronte un adversaire en temps réel (unranked, ranked SBMM ou salons privés).",
rule5_title: "🏆 Système de Rangs", rule5_desc: "Monte en points en match classé à travers 4 paliers : Novice 🌱, Chiffre 🔢, Expert 🧠 et Calculateur ⚡ !",
rule4_title: "🎯 Mode Tournoi", rule4_desc: "Bientôt disponible ! Affrontez les meilleurs joueurs dans un tournoi épique (en cours de réflexion).",
btn_play: "JOUER ⚡", menu_solo: "🏋️ ENTRAÎNEMENT SOLO", menu_1v1: "⚔️ DUEL 1v1 ONLINE", menu_tow: "🪢 Mode Corde Raide (Tug-of-War)",
menu_friends: "👥 SALONS & AMIS", menu_shop: "🛍️ BOUTIQUE", menu_lb: "🏆 CLASSEMENT", menu_tourney: "🎯 TOURNOIS", menu_info: "ℹ️ Informations & Règles",
solo_menu_title: "MODES D'ENTRAÎNEMENT", solo_classic: "⚡ Classique (Croissant)", solo_random: "🎲 Aléatoire (Cibles variées)", solo_avalanche_btn: "🧊 Avalanche (Difficultés)",
avalanche_menu_title: "🧊 AVALANCHE (Difficultés)", diff_easy: "Facile", diff_medium: "Moyen", diff_hard: "Difficile 💀", back_menu: "⬅️ Retour Menu",
hub_title: "⚔️ DUEL 1v1 ONLINE", hub_subtitle: "Choisis ton mode de jeu :", hub_random: "🎲 Matchmaking non classé", hub_ranked: "⚔️ Matchmaking Classé (SBMM)",
ranked_modal_title: "⚔️ PRÉPARATION CLASSÉE", ranked_modal_sub: "Choisis 2 objets de ton inventaire pour le match classé :", ranked_start_btn: "Lancer le Classé ⚡",
back: "⬅️ Retour", searching: "Recherche d'adversaire...", cancel: "❌ Annuler",
rooms_title: "👥 Jouer entre amis", rooms_create: "✨ Créer un salon personnalisé", rooms_join_code: "🔑 Rejoindre avec un code", rooms_open_list: "Salons ouverts :",
loading: "Chargement...", join_title: "🔑 Rejoindre un Salon", join_subtitle: "Entre le code et le mot de passe (si requis) :",
room_code_label: "ROOM CODE", room_pass_label: "PASSWORD (Optional)", join_btn: "Rejoindre ⚡", room_header: "Salon",
share_label: "INVITATION RAPIDE (SMS / WhatsApp) :", share_btn: "📤 Partager le lien", copy_btn: "Copier 📋", link_copied: "Lien du salon copié dans le presse-papier !",
players_in_room: "Joueurs dans le salon :", waiting_opponent: "En attente d'un adversaire...", leave_room: "❌ Quitter le salon",
create_modal_title: "✨ CRÉER UN SALON", create_modal_sub: "Personnalise ton salon privé :", create_btn: "Créer ⚡",
tourney_screen_title: "🎯 Tournoi Blitz", tourney_teaser_title: "Bientôt disponible !", tourney_teaser_desc: "Ce mode est actuellement en cours de réflexion et de développement. Prépare-toi à affronter l'élite dans des tournois épiques très bientôt...",
tourney_rewards: "Récompenses : 200 🪙 + 1 🏆 + 50 ⭐",
welcome_title: "⚡ IDENTITÉ BLITZ ⚡", welcome_sub: "Personnalise ton profil compétitif :",
pseudo_label: "PSEUDO", avatar_num_label: "AVATAR (1-999)", flag_label: "DRAPEAU", region_label: "RÉGION",
shop_title: "🛍️ BOUTIQUE", shop_tab_bonus: "🟢 Bonus (pour soi)", shop_tab_malus: "🔴 Malus (adversaire)", close: "Fermer",
lb_title: "🏆 CLASSEMENT", lb_reg: "📍 Région", lb_nat: "🇫🇷 France", lb_glb: "🌍 Monde",
lb_combined_desc: "💡 Combiné : Trophées prioritaires, départagés par les points",
get_ready: "PRÉPAREZ-VOUS !", hud_opp_target: "CIBLE ADVERSAIRE", hud_solo_score: "SCORE", timer_label: "Temps", target_label: "CIBLE : ",
tow_title: "🪢 CORDE RAIDE (TUG-OF-WAR)", recap_my_target: "🎯 Ma Cible : ", recap_opp_target: "🎯 Cible Adversaire : ", recap_my_score: "⭐ Mon Score : ", recap_coins: "🪙 Pièces Gagnées : ",
double_reward: "📺 Doubler mes gains (Pub)", main_menu: "MENU PRINCIPAL", no_rooms: "Aucun salon ouvert.", no_players: "Aucun joueur.",
friends_title: "👥 Liste d'Amis", friends_btn: "👥 Amis", add_btn: "Ajouter", no_friends: "Aucun ami pour le moment.", rematch_btn: "Revanche ⚔️",
ad_title: "Soutenir le Créateur", ad_desc: "Chiffre Blitz est 100% gratuit. Une publicité de soutien va se lancer. Merci ! ❤️", ad_btn: "Lancer la partie ⚡", ad_sponsored: "VIDÉO SPONSORISÉE...",
not_enough_coins: "Tu n'as pas assez de pièces 🪙 pour acheter cet objet !",
powers: {
spotlight: { name: "💡 Projecteur", desc: "Illumine la bonne tuile (2s)" },
freeze: { name: "⏳ Blocage du Temps", desc: "Gèle le chrono pendant 3s" },
joker: { name: "⚡ Joker Éclair", desc: "Valide la cible actuelle" },
nova: { name: "🌟 Nova Temporelle", desc: "GIGA : Valide 3 cibles" },
quake: { name: "📳 Séisme", desc: "Fait trembler l'adversaire (2s)" },
micro: { name: "🐜 Micro-Tuiles", desc: "Rétrécit la grille adverse (2s)" },
eclipse: { name: "🌑 Éclipse", desc: "Floute la grille adverse (1.5s)" },
chaos: { name: "🌪️ Chaos Absolu", desc: "GIGA : Combo de malus (5s)" }
}
},
en: {
coins: "Coins", trophies: "Trophies", subtitle: "The ultimate math and reflex duel",
rule1_title: "⚡ Game Rule", rule1_desc: "Click as fast as possible on the grid tiles in exact ascending order (1, then 2, 3, etc.).",
rule2_title: "🏋️ Solo Training", rule2_desc: "Classic, Random or Avalanche modes to chain numbers and earn coins (🪙).",
rule3_title: "⚔️ Online 1v1 Duel", rule3_desc: "Face an opponent in real time (unranked, ranked SBMM or private rooms).",
rule5_title: "🏆 Ranks System", rule5_desc: "Earn points in ranked matches across 4 tiers: Novice 🌱, Cipher 🔢, Expert 🧠 and Calculator ⚡!",
rule4_title: "🎯 Tournament Mode", rule4_desc: "Coming soon! Face the best players in an epic tournament (under consideration).",
btn_play: "PLAY ⚡", menu_solo: "🏋️ TRAINING", menu_1v1: "⚔️ 1v1 DUEL", menu_tow: "🪢 Tug-of-War Mode",
menu_friends: "👥 ROOMS", menu_shop: "🛍️ SHOP", menu_lb: "🏆 LEADERBOARD", menu_tourney: "🎯 TOURNAMENTS", menu_info: "ℹ️ Info & Rules",
solo_menu_title: "TRAINING MODES", solo_classic: "⚡ Classic (Ascending)", solo_random: "🎲 Random (Varied targets)", solo_avalanche_btn: "🧊 Avalanche (Difficulties)",
avalanche_menu_title: "🧊 Avalanche (Difficulties)", diff_easy: "Easy", diff_medium: "Medium", diff_hard: "Hard 💀", back_menu: "⬅️ Back to Menu",
hub_title: "⚔️ ONLINE 1v1 DUEL", hub_subtitle: "Choose your game mode:", hub_random: "🎲 Unranked Matchmaking", hub_ranked: "⚔️ Ranked Matchmaking (SBMM)",
ranked_modal_title: "⚔️ RANKED LOADOUT", ranked_modal_sub: "Choose 2 items from your inventory for the ranked match:", ranked_start_btn: "Start Ranked ⚡",
back: "⬅️ Back", searching: "Searching for opponent...", cancel: "❌ Cancel",
rooms_title: "👥 Play with Friends", rooms_create: "✨ Create Custom Room", rooms_join_code: "🔑 Join with Code", rooms_open_list: "Open rooms:",
loading: "Loading...", join_title: "🔑 Join a Room", join_subtitle: "Enter the code and password (if required):",
room_code_label: "ROOM CODE", room_pass_label: "PASSWORD (Optional)", join_btn: "Join ⚡", room_header: "Room",
share_label: "QUICK INVITE (SMS / WhatsApp):", share_btn: "📤 Share Link", copy_btn: "Copy 📋", link_copied: "Room link copied to clipboard!",
players_in_room: "Players in room:", waiting_opponent: "Waiting for opponent...", leave_room: "❌ Leave Room",
create_modal_title: "✨ CREATE A ROOM", create_modal_sub: "Customize your private room:", create_btn: "Create ⚡",
tourney_screen_title: "🎯 Blitz Tournament", tourney_teaser_title: "Coming soon!", tourney_teaser_desc: "This mode is currently under consideration and development. Get ready to face the elite in epic tournaments very soon...",
tourney_rewards: "Rewards: 200 🪙 + 1 🏆 + 50 ⭐",
welcome_title: "⚡ BLITZ IDENTITY ⚡", welcome_sub: "Customize your competitive profile:",
pseudo_label: "PSEUDO", avatar_num_label: "AVATAR (1-999)", flag_label: "FLAG", region_label: "REGION",
shop_title: "🛍️ SHOP", shop_tab_bonus: "🟢 Bonus (self)", shop_tab_malus: "🔴 Malus (opponent)", close: "Close",
lb_title: "🏆 LEADERBOARD", lb_reg: "📍 Region", lb_nat: "🇫🇷 France", lb_glb: "🌍 World",
lb_combined_desc: "💡 Combined: Trophies priority, tie-broken by points",
get_ready: "GET READY!", hud_opp_target: "OPPONENT TARGET", hud_solo_score: "SCORE", timer_label: "Time", target_label: "TARGET: ",
tow_title: "🪢 TUG-OF-WAR", recap_my_target: "🎯 My Target: ", recap_opp_target: "🎯 Opponent Target: ", recap_my_score: "⭐ My Score: ", recap_coins: "🪙 Coins Earned: ",
double_reward: "📺 Double my rewards (Ad)", main_menu: "MAIN MENU", no_rooms: "No open rooms.", no_players: "No players.",
friends_title: "👥 Friends List", friends_btn: "👥 Friends", add_btn: "Add", no_friends: "No friends yet.", rematch_btn: "Rematch ⚔️",
ad_title: "Support the Creator", ad_desc: "Chiffre Blitz is 100% free. A support advertisement will play. Thank you! ❤️", ad_btn: "Start Game ⚡", ad_sponsored: "SPONSORED VIDEO...",
not_enough_coins: "You don't have enough coins 🪙 to buy this item!",
powers: {
spotlight: { name: "💡 Projecteur", desc: "Highlights the correct tile (2s)" },
freeze: { name: "⏳ Blocage du Temps", desc: "Freezes the timer for 3s" },
joker: { name: "⚡ Joker Éclair", desc: "Validates current target" },
nova: { name: "🌟 Nova Temporelle", desc: "GIGA: Validates 3 targets" },
quake: { name: "📳 Séisme", desc: "Shakes opponent grid (2s)" },
micro: { name: "🐜 Micro-Tuiles", desc: "Shrinks opponent grid (2s)" },
eclipse: { name: "🌑 Éclipse", desc: "Blurs opponent grid (1.5s)" },
chaos: { name: "🌪️ Chaos Absolu", desc: "GIGA: Malus combo (5s)" }
}
}
};
let currentLang = localStorage.getItem("cb_lang") || "fr";
function toggleLanguage() {
currentLang = (currentLang === "fr") ? "en" : "fr";
localStorage.setItem("cb_lang", currentLang);
applyTranslations();
if (document.getElementById("modal-shop").style.display === "flex") switchShopTab(currentShopTab);
if (document.getElementById("modal-ranked-loadout").style.display === "flex") renderRankedLoadoutItems();
if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
updateCombinedExplanationVisibility();
}
function applyTranslations() {
const dict = i18n[currentLang];
document.querySelectorAll("[data-i18n]").forEach(el => {
const key = el.getAttribute("data-i18n");
if (dict[key]) el.innerText = dict[key];
});
const langBtn = document.getElementById("lang-btn");
if (langBtn) langBtn.innerText = (currentLang === "fr") ? "ENG" : "FR";
}
const SoundEngine = {
ctx: null, isMuted: false, timerId: null, currentMode: null, step: 0, bpm: 115,
init() {
try {
if (!this.ctx) {
const AudioCtx = window.AudioContext || window.webkitAudioContext;
this.ctx = new AudioCtx();
}
if (this.ctx.state === "suspended") this.ctx.resume();
} catch (e) {}
},
toggleMute() {
this.isMuted = !this.isMuted;
if (this.isMuted) this.stopMusic(false);
else if (this.currentMode) this.startMusic(this.currentMode);
return this.isMuted;
},
playClick() {
if (this.isMuted) return;
this.init();
if (!this.ctx) return;
const t = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "square";
osc.frequency.setValueAtTime(440, t);
osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
gain.gain.setValueAtTime(0.1, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.05);
},
playError() {
if (this.isMuted) return;
this.init();
if (!this.ctx) return;
const t = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "sawtooth";
osc.frequency.setValueAtTime(120, t);
osc.frequency.linearRampToValueAtTime(60, t + 0.12);
gain.gain.setValueAtTime(0.15, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.12);
},
playVictory() {
if (this.isMuted) return;
this.init();
if (!this.ctx) return;
[523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
setTimeout(() => {
if (this.isMuted || !this.ctx) return;
const t = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "square";
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
if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
if (this.timerId && this.currentMode === mode) return;
this.stopMusic(false);
this.currentMode = mode;
this.step = 0;
this.bpm = (mode === "menu") ? 108 : 138;
const intervalMs = (60 / this.bpm / 4) * 1000;
this.timerId = setInterval(() => {
if (this.isMuted || !this.ctx || this.ctx.state !== "running") return;
if (this.currentMode === "menu") this.tickMenu8Bit(this.step);
else this.tickGeometryDash(this.step);
this.step = (this.step + 1) % 128;
}, intervalMs);
},
tickMenu8Bit(step) {
const t = this.ctx.currentTime;
const bar = Math.floor(step / 16);
const inBar = step % 16;
const chords = [
{ root: 110.00, notes: [220.00, 261.63, 329.63] },
{ root: 87.31, notes: [174.61, 220.00, 261.63] },
{ root: 130.81, notes: [261.63, 329.63, 392.00] },
{ root: 98.00, notes: [196.00, 246.94, 293.66] }
];
const chord = chords[bar % 4];
if (inBar === 0 || inBar === 8) {
const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
osc.type = 'sine';
osc.frequency.setValueAtTime(150, t);
osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
gain.gain.setValueAtTime(0.16, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
osc.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.12);
}
if (inBar % 4 === 2) {
const bufferSize = this.ctx.sampleRate * 0.03;
const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
const filter = this.ctx.createBiquadFilter();
filter.type = 'highpass'; filter.frequency.setValueAtTime(6000, t);
const gain = this.ctx.createGain();
gain.gain.setValueAtTime(0.025, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
noise.start(t);
}
if (inBar % 2 === 0) {
const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(chord.root, t);
filter.type = 'lowpass';
filter.frequency.setValueAtTime(600, t);
filter.frequency.exponentialRampToValueAtTime(180, t + 0.1);
gain.gain.setValueAtTime(0.055, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.11);
}
if (inBar % 2 === 0) {
const melodyA = [
[440, 493.88, 523.25, 659.25, 587.33, 523.25, 493.88, 440],
[349.23, 392, 440, 523.25, 440, 392, 349.23, 392],
[392, 440, 392, 329.63, 261.63, 293.66, 329.63, 392],
[293.66, 329.63, 369.99, 392, 369.99, 329.63, 293.66, 246.94]
];
const melodyB = [
[659.25, 587.33, 523.25, 493.88, 523.25, 587.33, 659.25, 523.25],
[523.25, 440, 392, 440, 523.25, 440, 392, 349.23],
[392, 329.63, 261.63, 329.63, 392, 523.25, 493.88, 392],
[293.66, 392, 493.88, 587.33, 493.88, 392, 293.66, 0]
];
const table = (bar < 4) ? melodyA : melodyB;
const note = table[bar % 4][inBar / 2];
if (note > 0) {
const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(note, t);
filter.type = 'lowpass';
filter.frequency.setValueAtTime(1600, t);
filter.frequency.exponentialRampToValueAtTime(500, t + 0.22);
gain.gain.setValueAtTime(0.04, t);
gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
osc.start(t); osc.stop(t + 0.32);
}
}
if (inBar === 0) {
chord.notes.forEach((f) => {
const o = this.ctx.createOscillator(), g = this.ctx.createGain();
o.type = 'triangle';
o.frequency.setValueAtTime(f, t);
g.gain.setValueAtTime(0.0001, t);
g.gain.linearRampToValueAtTime(0.015, t + 0.4);
g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
o.connect(g); g.connect(this.ctx.destination);
o.start(t); o.stop(t + 2.2);
});
const glow = document.getElementById('bg-glow');
if (glow) {
glow.style.opacity = '0.22';
setTimeout(() => { glow.style.opacity = '0.08'; }, 350);
}
}
},
tickGeometryDash(step) {
const t = this.ctx.currentTime;
if (step % 16 === 0) {
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = "sine";
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
const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
const filter = this.ctx.createBiquadFilter();
filter.type = "bandpass";
filter.frequency.setValueAtTime(2500, t);
filter.Q.setValueAtTime(2, t);
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
osc.type = "sawtooth";
osc.frequency.setValueAtTime(gdNotes[step % gdNotes.length], t);
filter.type = "lowpass";
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
const muteBtn = document.getElementById("mute-btn");
if (muteBtn) muteBtn.innerText = muted ? "🔇" : "🔊";
}
document.addEventListener("click", () => { SoundEngine.init(); }, { once: true });
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
unlocked_items: [], equippedPower: null, equippedPowers: [], blitzPassPremium: false, claimedPassTiers: {}
};
let cachedOpponent = null;
let pendingProfileValidation = false;
let pendingAccountLogin = false;
let pendingCustomization = false;
let adCallbackFunction = null;
let selectedRankedItems = [];
let latestGlobalEvents = {};
let latest1v1StartData = null;
let pendingGameOverData = null;
let activeAvatarChoice = "standard";
let currentFriendFilter = "all";
let myGameInvites = [];
window.lastRequestsCount = 0;
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
id: p.id || "", username: p.username || p.name || p.pseudo || "Joueur", region: p.region || "Hauts-de-France",
points: Number(p.points !== undefined ? p.points : 0), coins: Number(p.coins !== undefined ? p.coins : 0),
trophies: Number(p.trophies !== undefined ? p.trophies : 0), wins: Number(p.wins !== undefined ? p.wins : 0),
losses: Number(p.losses !== undefined ? p.losses : 0), avatar: Number(p.avatar !== undefined ? p.avatar : 1),
flag: getFlagEmoji(p.flag), inventory: p.inventory || {}, unlocked_items: p.unlocked_items || [],
equippedPower: p.equippedPower || p.equipped_power || null, blitzPassPremium: p.blitzPassPremium || false, claimedPassTiers: p.claimedPassTiers || {}
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
"frame_silver": "silver-frame", "frame_chroma": "chroma-frame", "frame_prism": "prism-frame",
"frame_voltage": "voltage-frame", "frame_obsidian": "obsidian-frame"
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
}
const frameClass = getFrameClass(equippedFrame);
const html = `<div class="tft-avatar-container ${frameClass}" title="${avatarTitle}"><span class="tft-avatar-icon" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;${typeof avatarContent === "number" ? "font-size:14px;" : ""}">${avatarContent}</span><span class="tft-flag-overlay">${flag || "🇫🇷"}</span></div>`;
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
const html = `<div class="tft-avatar-large ${frameClass}"><span class="tft-avatar-large-icon" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;${typeof avatarContent === "number" ? "font-size:24px;" : ""}">${avatarContent}</span><span class="tft-flag-large-overlay">${flag || "🇫🇷"}</span></div>`;
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
if (previewContainer) previewContainer.innerHTML = getLargeAvatarBadgeHTML(flag, avatarNum, activeAvatarChoice);
}
function renderProfileAvatarSelector() {
const container = document.getElementById("profile-avatar-selector");
if (!container) return;
container.innerHTML = "";
const addAvatarOption = (id, icon, label) => {
const isActive = (activeAvatarChoice === id);
const card = document.createElement("div");
card.style.cssText = `flex:1;min-width:80px;background:${isActive ? "rgba(0,210,255,0.25)" : "rgba(255,255,255,0.05)"};border:2px solid ${isActive ? "#00d2ff" : "rgba(255,255,255,0.1)"};border-radius:8px;padding:4px;text-align:center;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;`;
card.onclick = () => { activeAvatarChoice = id; renderProfileAvatarSelector(); updateProfilePreview(); };
card.innerHTML = `<span style="font-size:13px;">${icon}</span><div style="font-size:8px;font-weight:bold;color:#fff;">${label}</div>`;
container.appendChild(card);
};
addAvatarOption("standard", "🔢", "Standard");
const unlocked = myProfile.unlocked_items || [];
if (unlocked.includes("avatar_lottie_palier15")) addAvatarOption("avatar_lottie_palier15", "🐱", "Chat Assistant");
if (unlocked.includes("avatar_lottie_palier30")) addAvatarOption("avatar_lottie_palier30", "🌈", "Chat Arc-en-ciel");
}
const TITLE_DISPLAY_NAMES = {
"title_stalker": "Stalker Numérique", "title_felin": "Réflexe Félin", "title_neon": "Pulsion Néon",
"title_spectre": "Spectre Cosmique", "title_supreme": "⚡ FÉ
