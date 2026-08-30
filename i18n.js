const i18n = {
fr: {
coins: "Pièces", trophies: "Trophées", subtitle: "Le duel de calcul et de réflexes ultime",
rule1_title: "⚡ Principe du jeu", rule1_desc: "Repère la CIBLE affichée et clique-la à la vitesse de l'éclair ! Ordre croissant ou désordre total : seul le plus rapide survit. ⚡",
rule2_title: "🏋️ Entraînement Solo", rule2_desc: "Classique, Aléatoire ou Avalanche : enchaîne les chiffres, bats tes records et fais le plein de pièces (🪙).",
rule3_title: "⚔️ Duel 1v1 Online", rule3_desc: "Affronte un joueur en temps réel (non classé, classé SBMM ou salon privé). Le meilleur score en 30s l'emporte !",
rule4_title: "🏆 Rangs & Trophées", rule5_desc: "Grimpe en classé : Novice 🌱 → Chiffre 🔢 → Expert 🧠 → Calculateur ⚡, et débloque les 16 trophées de ta Salle des Trophées !",
rule5_title: "🎯 Mode Tournoi", rule4_desc: "Bientôt disponible ! Des tournois épiques pour affronter l'élite et décrocher le titre de Champion 👑.",
btn_play: "JOUER ⚡", menu_solo: "🏋️ ENTRAÎNEMENT SOLO", menu_1v1: "⚔️ DUEL 1v1 ONLINE", menu_tow: "🪢 Mode Corde Raide (Tug-of-War)",
menu_friends: "👥 SALONS & AMIS", menu_shop: "🛍️ BOUTIQUE", menu_lb: "🏆 CLASSEMENT", menu_tourney: "🎯 TOURNOIS", menu_info: "ℹ️ Informations & Règles",
menu_halloween: "🎃 Mode Exclusif Halloween", menu_noel: "🎄 Mode Exclusif Noël",
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
spotlight: { name: "💡 Projecteur", desc: "Révèle la bonne tuile pendant 2s. Zéro hésitation." },
freeze: { name: "⏳ Blocage du Temps", desc: "Gèle le chrono 3s. Respire, tu as le temps." },
joker: { name: "⚡ Joker Éclair", desc: "Valide instantanément ta cible actuelle." },
nova: { name: "🌟 Nova Temporelle", desc: "GIGA : enchaîne 3 validations automatiques." },
quake: { name: "📳 Séisme", desc: "Secoue la grille adverse pendant 2s." },
micro: { name: "🐜 Micro-Tuiles", desc: "Rétrécit les tuiles adverses pendant 2s." },
eclipse: { name: "🌑 Éclipse", desc: "Plonge la grille adverse dans le flou (1,5s)." },
chaos: { name: "🌪️ Chaos Absolu", desc: "GIGA : séisme + micro + éclipse en chaîne (5s)." }
}
},
en: {
coins: "Coins", trophies: "Trophies", subtitle: "The ultimate math and reflex duel",
rule1_title: "⚡ Game Rule", rule1_desc: "Spot the TARGET and click it at lightning speed! Ascending order or total chaos: only the fastest survives. ⚡",
rule2_title: "🏋️ Solo Training", rule2_desc: "Classic, Random or Avalanche: chain numbers, beat your records and stack up coins (🪙).",
rule3_title: "⚔️ Online 1v1 Duel", rule3_desc: "Face a player in real time (unranked, ranked SBMM or private room). Best score in 30s wins!",
rule4_title: "🏆 Ranks & Trophies", rule5_desc: "Climb the ranked ladder: Novice 🌱 → Cipher 🔢 → Expert 🧠 → Calculator , and unlock the 16 trophies of your Trophy Room!",
rule5_title: "🎯 Tournament Mode", rule4_desc: "Coming soon! Epic tournaments to face the elite and claim the Champion title 👑.",
btn_play: "PLAY ⚡", menu_solo: "🏋️ TRAINING", menu_1v1: "⚔️ 1v1 DUEL", menu_tow: "🪢 Tug-of-War Mode",
menu_friends: "👥 ROOMS", menu_shop: "🛍️ SHOP", menu_lb: "🏆 LEADERBOARD", menu_tourney: "🎯 TOURNAMENTS", menu_info: "ℹ️ Info & Rules",
menu_halloween: "🎃 Halloween Exclusive Mode", menu_noel: "🎄 Christmas Exclusive Mode",
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
spotlight: { name: "💡 Spotlight", desc: "Reveals the correct tile for 2s. Zero hesitation." },
freeze: { name: "⏳ Time Freeze", desc: "Freezes the timer for 3s. Breathe, you've got time." },
joker: { name: "⚡ Lightning Joker", desc: "Instantly validates your current target." },
nova: { name: "🌟 Time Nova", desc: "GIGA: chains 3 auto-validations." },
quake: { name: "📳 Earthquake", desc: "Shakes the opponent's grid for 2s." },
micro: { name: "🐜 Micro-Tiles", desc: "Shrinks the opponent's tiles for 2s." },
eclipse: { name: "🌑 Eclipse", desc: "Blurs the opponent's grid (1.5s)." },
chaos: { name: "🌪️ Absolute Chaos", desc: "GIGA: quake + micro + eclipse chained (5s)." }
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
