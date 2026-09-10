# 🎮 CHIFFRE BLITZ — ROADMAP (mise à jour)

> Dernière MAJ : Septembre 2026 — après implémentation complète du Mode Aventure (9 mondes × 200 étages), DA procédurale, système de vies/jokers, reprise de session mobile et verrou musical saisonnier.

---

## ✅ LÉGENDE
- `[x]` Terminé
- `[~]` Partiel / en cours
- `[ ]` À faire

---

# 📦 PHASE 1 — FONDATIONS SAISONNIÈRES & BUGS ✅

- [x] Boule de neige offerte (Palier 15 S3)
- [x] Nom du pass dynamique (S1/S2/S3)
- [x] Modes exclusifs Halloween 🎃 + Noël 🎄 (solo + 1v1)
- [x] Sélecteur de bande son SANS spoiler
- [x] Dates début/fin des saisons modifiables (admin + Supabase)
- [x] Cosmétiques S3 (cadres, grilles, avatars, titres)
- [x] Bouton mute dupliqué corrigé
- [x] rule4/5 + media query dupliquée corrigés
- [x] Code dupliqué + orphelins nettoyés

---

# 🎫 PHASE 2 — PASSE DE SAISON (DA "BRAWL STARS") ✅

- [x] Horizontal PC / vertical mobile, fenêtre plein écran
- [x] Cartes PREMIUM bleues à bordure OR + ruban « ⭐ PREMIUM »
- [x] Cartes GRATUIT/FREE + ruban traduit
- [x] Aperçus visuels réels (avatars Lottie/vidéo, cadres, swatchs, titres)
- [x] Clic sur la tuile entière pour récupérer (badge ✔)
- [x] Molette = scroll horizontal (PC)
- [x] Position de scroll conservée après récupération
- [x] Animation pop + burst d'emojis au déblocage

---

# 🎨 PHASE 3 — PERSONNALISATION & ÉCONOMIE ✅

- [x] Équip instantané cadre/thème/titre à la sélection
- [x] Sélecteur de packs (grille + cadre) traduit
- [x] `ownsItemOrPack()` (équiper un objet d'un pack possédé)

---

# ⚡ PHASE 4 — PERFORMANCE & STABILITÉ ✅

- [x] Popup récompense throttlée + auto-fermeture
- [x] Fuites mémoire / superposition de sons corrigées
- [x] Barres d'émoticônes reconstruites (emojis manquants)
- [x] Anti match-contre-soi (file dédupliquée + vérif même pseudo)
- [x] `server.js` complet ré-équilibré (fix `Unexpected end of input`)

---

# 🌍 PHASE 5 — TRADUCTION FR/EN COMPLÈTE ✅

- [x] Auto-détection de la langue de l'appareil
- [x] Override manuel 🌐 FR ↔ EN
- [x] 8 fichiers traduits + patches (modale compte, packs, classement, amis, pass, placeholders salons)
- [x] Compteur en ligne sans texte à traduire (👤 + nombre)

---

# 🛠️ PHASE 6 — ADMIN AVANCÉ ✅

- [x] Fenêtre `admin.html` indépendante
- [x] Annonces globales, cadeaux
- [x] Override saison + dates saisons (persistées Supabase)
- [x] Ajuster Pièces/Points/Trophées (donner/retirer, tous/pseudo/X aléatoires)
- [x] Compteur joueurs réellement en ligne (profils uniques)
- [x] Attribuer objet/trophée (cadres, grilles, avatars, titres, packs, pouvoirs)
- [x] Événements planifiés (Coin Rush, Rank Shield, Expresso, Chaos, Jackpot, Tug-of-War, Halloween, Noël)

---

# 🕵️ PHASE 7 — TRACES, SÉCURITÉ & MODÉRATION ✅

- [x] Table `player_logs` (Supabase) : chaque mouvement d'économie horodaté
- [x] Console admin « 📜 Journal des transactions »
- [x] Compteur en ligne public dans la barre de stats (1 ligne, profils uniques)
- [x] Anti-triche : rate-limit clics 1v1 + catch, validation serveur
- [x] RGPD : hachage SHA-256 des codes secrets + migration legacy
- [x] Récupération de compte : clé de sécurité par pseudo + changement de code
- [x] Reset code par admin (vérif clé) + déconnexion forcée

---

# 🧹 PHASE 8 — AUDIT & CONSOLIDATION ✅

Tous les fichiers front audités, optimisés et documentés :
- [x] `style.css` (variables, 21 sections, -45%)
- [x] `admin.html` (structure corrigée)
- [x] `admin.js` (réduit à l'essentiel)
- [x] `package.json` (métadonnées, scripts, versions)
- [x] `index.html` (doublon supprimé, 12 sections)
- [x] `i18n.js` (15 sections, clés récupération)
- [x] `audio.js` (20 sections, constantes)
- [x] `fx.js` (factory canvas, 4 sections)
- [x] `jeu.js` (20 sections, constantes)
- [x] `passe.js` (12 sections, createShopCard)
- [x] `profil.js` (14 sections, avatarMap)
- [x] `social.js` (10 sections, SOCIAL_STYLES)
- [x] `saisons.css` (18 sections, bug orpheline corrigé)
- [x] `saisons.js` (16 sections, cloneLottieData)
- [x] `son-saisons.js` (10 sections, constantes musicales)
- [x] `modes-catch.js` (11 sections, CATCH_CONFIG)

---

# 🏪 PHASE 9 — PRÉPARATION PUBLICATION ✅

- [x] Compte Google Play Console créé + 25$ payés
- [x] Adresse email dédiée créée
- [x] Serveur Discord créé

---

# 🏰 PHASE 9B — MODE AVENTURE & MOBILE ✅

**Nouveau mode de jeu complet : Tour Aventure**

- [x] **9 mondes** de **200 étages** (1800 étages au total)
- [x] **Courbe de difficulté** calibrée par monde (`TOWER_CURVE`) + « souffle » aux 10 premiers étages
- [x] **9 modes de jeu** en rotation : classic, reverse, color, pairs, sprint, parity, forbidden, memory, nofail
- [x] **Mode Mémoire** : chiffres visibles ~3s puis masqués, clic de mémoire, étoiles basées sur erreurs
- [x] **Gardiens** (boss) aux étages 50, 100, 150, 200 avec barre de vie
- [x] **Système de vies** : max 10, régénération 1/20min, achat boutique aventure
- [x] **Jokers** : ⏱️ +10s temps, 🛡️ bouclier (absorbe erreur/clic interdit)
- [x] **Boutique aventure** : +3 vies, packs IAP (1/3/5€), jokers
- [x] **DA procédurale des 9 mondes** (CSS/HTML généré, cache par monde) :
  - M1 Quartier Néon : ville néon, voitures, dirigeables
  - M2 Grottes de Cristal : caverne, cristaux, lac gelé
  - M3 Banque Dorée : coffre-fort, lingots, lasers
  - M4 Tour Hantée : tour gothique, éclairs, chauves-souris
  - M5 Cimetière Brumeux : tombes, arbres morts, feux follets
  - M6 Antre Citrouille : caverne de jack-o'-lanterns
  - M7 Cime Bonbon : château de sucre, rivière chocolat
  - M8 Forêt de Sapins : sapins volumineux enneigés, guirlandes
  - M9 Atelier Père Noël : intérieur animé (Père Noël, lutins, renne)
- [x] **Musique de saison verrouillée** : override `SoundEngine.startMusic` en aventure, coupe en arrière-plan
- [x] **Déblocage mondes saisonniers** : flags permanents `season_s2_unlocked` / `season_s3_unlocked` via Tier 1 du pass

**Mobile & session**

- [x] **Cache-busting automatique** : `?v=timestamp` dans `index.html` (fichiers toujours à jour)
- [x] **Reprise de session** : `sessionStorage` pour dernière page active (salon, aventure, solo…)
- [x] **Page explications au lancement frais** (app tuée → écran de bienvenue)
- [x] **Partage natif** : `navigator.share` + fallback modale WhatsApp/SMS/Mail/Copier
- [x] **Service Worker network-only** : plus jamais de fichiers périmés sur mobile

---

# 📱 PHASE 10 — FINALISATION MOBILE (EN COURS)

- [~] **DA Atelier v3** : intérieur chaleureux style illustration (murs crème, fenêtres arquées, guirlandes, sapin décoré)
- [~] **DA Cime Bonbon v3** : ciel barbe-à-papa rose (nuages coton, esprit charlotte aux fraises + Noël)
- [ ] **Déblocage saisons serveur** : handler `claim_pass_tier` ajoute flags `season_s2_unlocked` / `season_s3_unlocked` au Tier 1
- [ ] **Icône app** : design 512×512 (Android)
- [ ] **Splash screen** : écran de démarrage animé
- [ ] **Pub au clic sur JOUER** (page explications) : message « soutenir le créateur »
- [ ] **Plugin Capacitor Share** : `npm install @capacitor/share` + rebuild APK
- [ ] **Test APK final** sur téléphone (cache, reprise, partage)

---

# 💶 PHASE 11 — MONÉTISATION (À VENIR)

- [ ] **Pass de saison payant 3€** via Google Play Billing
- [ ] **Vérification du reçu d'achat** côté serveur (anti-triche)
- [ ] **Vraies pubs Google (AdMob)** : bannières, interstitiels, récompensées
- [ ] **PWA iOS** (sans App Store, gratuit)
- [ ] **Microsoft Store** (PC, ~19€)

---

# 🎮 PHASE 12 — FEATURES À VENIR (QUAND LE JEU SERA CONNU)

- [ ] 📜 Quêtes quotidiennes/hebdo (rétention)
- [ ] 🎯 Tournois (bouton "bientôt" → réel)
- [ ] 🗓️ Saison 4 (thème, cosmétiques, pass)
- [ ] 💬 Bot Discord (annonces, support, codes promo)

---

# 🛠️ STACK

- **Frontend** : HTML5, CSS3, JS vanilla, Socket.io, Lottie
- **Backend** : Node.js, Express, Socket.io (Render)
- **BDD** : Supabase (PostgreSQL) — `players`, `friendships`, `settings`, `player_logs`
- **Mobile** : Capacitor (Android) + plugin Share
- **À venir** : Google Play Billing, AdMob

---

*Prochaine étape : 🎨 Finalisation DA (Atelier v3 + Cime Bonbon v3) + 🔧 Déblocage saisons serveur + 📱 Icône + splash.*
