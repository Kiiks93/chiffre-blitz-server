# 🎮 CHIFFRE BLITZ — ROADMAP (mise à jour)

> Dernière MAJ : après traduction FR/EN complète, compteur en ligne public, ajustement des devises, et journal des transactions.

---

## ✅ LÉGENDE
- `[x]` Terminé
- `[~]` Partiel / en cours
- `[ ]` À faire

---

# 📦 PHASE 1 — FONDATIONS SAISONNIÈRES & BUGS ✅

- [x] Boule de neige offerte (Palier 15 S3)
- [x] Nom du pass dynamique (S1/S2/S3)
- [x] Modes exclusifs Halloween 🎃 + Noël 🎄 (solo + 1v1, économie base+bonus)
- [x] Sélecteur de bande son SANS spoiler
- [x] Dates début/fin des saisons modifiables (admin + Supabase `settings`)
- [x] Cosmétiques S3 (cadres, grilles, avatars, titres)
- [x] Bouton mute dupliqué corrigé
- [x] rule4/5 + media query dupliquée corrigés
- [x] Code dupliqué + orphelins nettoyés

---

# 🎫 PHASE 2 — PASSE DE SAISON (DA "BRAWL STARS") ✅

- [x] Horizontal PC / vertical mobile, fenêtre plein écran
- [x] Cartes PREMIUM bleues à bordure OR + ruban « ⭐ PREMIUM »
- [x] Cartes GRATUIT/FREE + ruban traduit
- [x] Aperçus visuels réels (avatars Lottie/vidéo, cadres, swatchs, titres) — agrandis
- [x] Clic sur la **tuile entière** pour récupérer (badge ✔)
- [x] Molette = scroll horizontal (PC)
- [x] Position de scroll conservée après récupération
- [x] Animation pop + burst d'emojis au déblocage

---

# 🎨 PHASE 3 — PERSONNALISATION & ÉCONOMIE ✅

- [x] Équip instantané cadre/thème/titre à la sélection
- [x] Sélecteur de packs (grille + cadre) traduit
- [x] `ownsItemOrPack()` (équiper un objet d'un pack possédé)
- [x] « Enregistrer » = sauvegarde seule

---

# ⚡ PHASE 4 — PERFORMANCE & STABILITÉ ✅

- [x] Popup récompense throttlée + auto-fermeture
- [x] Fuites mémoire / superposition de sons corrigées
- [x] Barres d'émoticônes reconstruites (emojis manquants)
- [x] Anti match-contre-soi (file dédupliquée + vérif même pseudo)
- [x] `server.js` complet ré-équilibré (fix `Unexpected end of input`)

---

# 🌍 PHASE 5 — TRADUCTION FR/EN COMPLÈTE ✅

- [x] Auto-détection de la langue de l'appareil (`navigator.language`)
- [x] Override manuel 🌐 FR ↔ EN
- [x] 8 fichiers traduits : i18n, son-saisons, modes-catch, social, jeu, profil, passe, index
- [x] Patches : modale compte, packs, classement, amis, salle trophées, pass, placeholders salons
- [x] Compteur en ligne sans texte à traduire (👤 + nombre)

---

# 🛠️ PHASE 6 — ADMIN AVANCÉ ✅

- [x] Fenêtre `admin.html` indépendante
- [x] Annonces globales, cadeaux
- [x] Override saison + dates saisons (persistées Supabase)
- [x] **Ajuster Pièces/Points/Trophées** : donner/retirer, à 1 pseudo / tous / X aléatoires
- [x] **Compteur joueurs réellement en ligne** (profils uniques, pas les sockets)
- [x] Événements planifiés (Coin Rush, Rank Shield, Expresso, Chaos, Jackpot, Tug-of-War, Halloween, Noël)

---

# 🕵️ PHASE 7 — TRACES & MODÉRATION ✅

- [x] Table `player_logs` (Supabase) : chaque mouvement d'économie horodaté
- [x] Logs : buy_item, buy_item_fail, solo_reward, admin_adjust, pass, match
- [x] Console admin « 📜 Journal des transactions » (consultation par pseudo)
- [x] **Compteur en ligne public** dans la barre de stats (1 ligne, profils uniques)

---

# 💶 PHASE 8 — MONÉTISATION (À VENIR)

> ⚠️ Nécessite de packager le jeu en **app Android** (Capacitor) + compte **Play Console**.

- [ ] Compte Google Play Console (25$)
- [ ] Packaging Android via Capacitor (WebView native)
- [ ] **Pass de saison payant 3€** via Google Play Billing
- [ ] Vérification du reçu d'achat côté serveur (anti-triche)
- [ ] **Vraies pubs Google (AdMob)** récompensées à la place du faux compteur

---

# 🎮 PHASE 9 — FEATURES À VENIR (À VENIR)

- [ ] 📜 **Quêtes** quotidiennes/hebdo (recommandé — rétention)
- [ ] 🎯 **Tournois** (bouton "bientôt" → réel)
- [ ] 🗓️ **Saison 4** (thème, cosmétiques, pass)
- [ ] 🧹 Nettoyage orphelins `saisons.css` (mineur)

---

# 🛠️ STACK

- **Frontend** : HTML5, CSS3, JS vanilla, Socket.io, Lottie
- **Backend** : Node.js, Express, Socket.io (Render)
- **BDD** : Supabase (PostgreSQL) — `players`, `friendships`, `settings`, `player_logs`
- **À venir** : Capacitor (Android), Google Play Billing, AdMob

---

*Prochaine étape recommandée : 📜 Quêtes (Phase 9) — puis Monétisation (Phase 8) quand le compte Play Console sera prêt.*
