# ⚡ CHIFFRE BLITZ

Jeu de calcul et de réflexes en temps réel. Entraîne-toi en solo, grimpe la **Tour Aventure** (9 mondes × 200 étages), affronte des joueurs en 1v1 online (matchmaking + classé SBMM), et collectionne des cosmétiques via le Passe de Saison.

- 🏰 **Aventure (Tour)** : 9 mondes thématiques, 1800 étages, Gardiens, jokers & vies
- 🎮 **Solo** : Classique, Aléatoire, Avalanche
- ⚔️ **1v1 Online** : matchmaking, classé SBMM, salons privés
- 🎫 **Passe de Saison** : 30 paliers free + premium (DA "Brawl Stars")
- 🏛️ **Salle des Trophées** : 16 trophées à débloquer
- 🎃🎄 **Modes exclusifs** : Halloween / Noël (catch solo + 1v1 + DA aventure)
- 🛍️ **Boutique** : pouvoirs, cosmétiques, packs, boutique aventure
- 🏆 **Classement** : régional, national, mondial
- 🪢 **Corde Raide**, 🎰 **Roue Jackpot**, 📢 **Événements globaux**
- 📱 **App mobile** : packagée via Capacitor (Android)

---

## 🏗️ ARCHITECTURE

```
chiffre-blitz/
├── index.html          # Page principale du jeu
├── admin.html          # Panneau admin (fenêtre séparée)
├── manifest.json       # Manifest PWA / Capacitor
├── sw.js               # Service Worker (cache network-only)
├── style.css           # Styles globaux (header, HUD, grilles, modals)
├── saisons.css         # Styles des modes saisonniers (Halloween, Noël)
├── i18n.js             # Traductions FR/EN
├── audio.js            # Moteur son de base (effets SFX)
├── son-saisons.js      # Bande-son saisonnière + sélecteur de saison
├── profil.js           # Profil, personnalisation, économie, reprise de session
├── admin.js            # Fonctions utilitaires admin (modal intégré)
├── social.js           # Amis, salons privés, partage natif, matchmaking
├── passe.js            # Passe de Saison (DA Brawl Stars)
├── saisons.js          # Logique multi-saisons
├── fx.js               # Effets visuels (combo, fissures, particules)
├── jeu.js              # Gameplay (grille, timer, clics, solo, 1v1)
├── modes-catch.js      # Modes exclusifs (Halloween 🎃 / Noël 🎄)
├── tour.js             # 🏰 MODE AVENTURE (9 mondes, DA procédurale, jokers, vies)
├── server.js           # Serveur backend (Express + Socket.io + Supabase)
└── ROADMAP.md          # État du projet
```

---

## 📂 FICHIERS FRONTEND (Client)

### 🧱 Structure
| Fichier | Rôle |
|---|---|
| `index.html` | Page principale. Contient tous les écrans (menu, solo, 1v1, shop, pass, aventure, admin modal). Charge les scripts dans l'ordre + cache-busting automatique. |
| `admin.html` | **Panneau admin indépendant** (s'ouvre via `window.open`). Contient : annonces, cadeaux, override saison, dates saisons, événements. |
| `manifest.json` | Manifest PWA / Capacitor (icônes, nom, thème). |
| `sw.js` | Service Worker **network-only** (plus jamais de fichiers périmés sur mobile). |

### 🎨 Styles
| Fichier | Rôle |
|---|---|
| `style.css` | Styles globaux : header-bar, user-pill, cadres animés, avatars, HUD, grille, modals, boutons, combo, trophies, responsive, passe de saison (DA Brawl Stars). |
| `saisons.css` | Styles spécifiques aux modes saisonniers : thème citrouille, fantôme, bonbon, sapin, lutin, etc. |

### ⚙️ Logique JS
| Fichier | Rôle |
|---|---|
| `i18n.js` | Traductions FR/EN. Objet `i18n` avec tous les textes traduits + fonction `applyTranslations()`. |
| `audio.js` | Moteur son principal (`SoundEngine`) : SFX de base (click, victory, error, etc.), mute global. |
| `son-saisons.js` | Bande-son saisonnière (musiques S1/S2/S3). Contient `getReleasedSeasons()`, `openMusicChooser()`, `setMusicSeason()`, `startMusicSeasonal()`. |
| `profil.js` | **Profil joueur complet** : connexion Socket.io, myProfile, personnalisation (cadre/thème/titre/avatar), équipement instantané, économie, validation, **reprise de dernière page** (`sessionStorage`), page explications au lancement frais. |
| `admin.js` | Fonctions utilitaires admin : `openAdminPanel()` → ouvre `admin.html`. Contient aussi le modal admin intégré style Roblox. |
| `social.js` | Système social : amis (ajout, demandes, invitations, **pastille temps réel**), salons privés (création, rejoindre, **partage natif / modale WhatsApp-SMS-Mail**). |
| `passe.js` | **Passe de Saison** : DA "Brawl Stars" (horizontal PC / vertical mobile), aperçus visuels réels, étiquettes, animation pop, molette → scroll horizontal. |
| `saisons.js` | Logique multi-saisons : détection de la saison active, calcul du palier actuel, XP. |
| `fx.js` | Effets visuels : système combo, fissures, particules, explosion, banner pop, ice-cracks, trophy room. |
| `jeu.js` | **Gameplay principal** : grille 4×4, timer 30s, clics, solo (classique/aléatoire/avalanche), 1v1 online, matchmaking, ranked, tug-of-war, game over. |
| `modes-catch.js` | **Modes exclusifs** : Chasse Hantée (Halloween 🎃) et Course aux Cadeaux (Noël 🎄). Objets SVG souriants/énervés, économie solo, difficulté. |
| `tour.js` | **🏰 MODE AVENTURE** : 9 mondes × 200 étages, courbe de difficulté, 9 modes + Gardiens, vies & jokers, boutique aventure, **DA procédurale des 9 mondes** (city, glacier, vault, haunt, grave, lair, candy, pine, shop), musique de saison verrouillée. |

---

## 🏰 MODE AVENTURE (Tour)

### Structure
- **9 mondes** de **200 étages** chacun (1800 étages au total).
- **Quota 240 ⭐** dans un monde pour débloquer le suivant.
- **Mondes saisonniers** : mondes 4-6 (S2 Halloween) et 7-9 (S3 Noël) débloqués via les flags permanents `season_s2_unlocked` / `season_s3_unlocked` (obtenus au **Tier 1** du Passe de Saison correspondant). Une fois acquis, le monde reste accessible à vie.
- **Gardiens** (boss) aux étages 50, 100, 150 et 200 de chaque monde.

### Courbe de difficulté
- Table `TOWER_CURVE` (grille + temps) calibrée **par monde**, progression intra-monde.
- **« Souffle »** : les 10 premiers étages de chaque monde sont volontairement plus doux.

### Modes de jeu (rotation par étage)
`classic` · `reverse` · `color` · `pairs` · `sprint` · `parity` · `forbidden` · `memory` · `nofail`
- **🧠 Mémoire** : chiffres visibles ~3 s puis masqués (« ? »), clic dans l'ordre de mémoire. Erreur = révélation flash. Étoiles basées sur les erreurs uniquement.
- **🚫 Interdit** : cliquer le chiffre interdit = échec immédiat (sauf si bouclier actif).

### Vies & Jokers
- **❤️ Vies** : max 10, régénération 1 vie / 20 min, achat via boutique aventure.
- **⏱️ Joker Temps** : +10 s au chrono.
- **🛡️ Joker Bouclier** : absorbe une erreur (ou un clic interdit). Halo doré autour de la grille.
- Jokers obtenus via **drops des Gardiens** et **boutique aventure**.

### Direction artistique (DA procédurale)
Chaque monde a une scène générée en CSS/HTML (cache par monde) :
| Monde | Scène | Ambiance |
|---|---|---|
| 1 Quartier Néon | `city` | Ville néon, voitures, dirigeables |
| 2 Grottes de Cristal | `glacier` | Caverne, cristaux, lac gelé |
| 3 Banque Dorée | `vault` | Coffre-fort, lingots, lasers |
| 4 Tour Hantée | `haunt` | Tour gothique, éclairs, chauves-souris |
| 5 Cimetière Brumeux | `grave` | Tombes, arbres morts, feux follets |
| 6 Antre Citrouille | `lair` | Caverne de jack-o'-lanterns |
| 7 Cime Bonbon | `candy` | Ciel barbe-à-papa, château de sucre |
| 8 Forêt de Sapins | `pine` | Sapins volumineux enneigés, guirlandes |
| 9 Atelier du Père Noël | `shop` | Intérieur animé (Père Noël, lutins, renne) |

### Musique
- La musique de **saison** du monde affiché est verrouillée pendant l'aventure (override de `SoundEngine.startMusic`).
- Se **coupe** en arrière-plan et **revient** automatiquement au retour.

---

## 📂 FICHIERS BACKEND (Serveur)

| Fichier | Rôle |
|---|---|
| `server.js` | **Serveur Node.js** : Express + Socket.io + Supabase. Gère : authentification, inventaire, cosmétiques, pouvoirs, passe, matchmaking 1v1, salons, amis, trophées, événements globaux, admin, **tour aventure** (sessions, jokers, vies, boutique), **déblocage saisons**. |

### Points clés du serveur
- **Supabase** : table `players` (profil + inventaire + `tower_jokers`), table `friendships`, table `settings` (dates saisons).
- **Sockets** : événements `register_player`, `claim_pass_tier`, `buy_item`, `equip_cosmetic`, `find_1v1_match`, `find_ranked_match`, `player_click_1v1`, `admin_*`, **`get_tower`, `tower_floor_start`, `tower_state`, `tower_click`, `tower_use_joker`, `tower_quit`, `shop_buy`**, etc.
- **Saisons** : S1 (Félin & Néon), S2 (Halloween), S3 (Noël) — dates modifiables depuis l'admin.
- **Événements globaux** : Coin Rush, Rank Shield, Expresso Match, Chaos Mode, Jackpot Éclair, Tug-of-War, Halloween, Noël.
- **Anti-triche** : toute validation (clics, jokers, achats, étoiles) est **autoritaire côté serveur** ; le client n'est qu'un afficheur.

---

## 🚀 DÉMARRAGE

### Frontend
Ouvrir `index.html` dans un navigateur (hébergement statique : GitHub Pages, Netlify, Vercel).

### Backend
```bash
npm install express socket.io @supabase/supabase-js
node server.js
```

### Variables d'environnement (`.env`)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJ...
ADMIN_PASSWORD=ton_mot_de_passe
PORT=3000
```

### App mobile (Capacitor)
```bash
npm install @capacitor/core @capacitor/android @capacitor/share
npx cap sync && npx cap open android
```
- Cache-busting automatique (`?v=timestamp`) → fichiers toujours à jour.
- Reprise de dernière page via `sessionStorage` ; page explications au lancement frais.

### Assets requis (à côté de `index.html`)
- Avatars Lottie : `cat-assistant.json`, `black-rainbow-cat.json`, `squelette-danse.json`, `citrouille-chateau.json`, `bonhomme-de-neige-avatar.json`, `boule-de-neige-avatar.json`, `pere-noel-avatar.json`
- Vidéos avatars : `tiger-siberien.mp4`, `bat-halloween.mp4`

---

## 🎫 PASSE DE SAISON

DA style **Brawl Stars** :
- 🟨 **PREMIUM** = grandes cartes bleues à bordure OR + ruban « ⭐ PREMIUM ».
- 🟦 **GRATUIT** = cartes plus petites + ruban « GRATUIT ».
- ⚫ Pastilles de palier sur une **piste horizontale** (PC) / **verticale** (mobile).
- 🖱️ Clic direct sur la carte pour récupérer.
- Aperçus visuels réels (avatars animés, cadres, swatchs de grilles, titres).
- **Tier 1** = débloque les mondes aventure de la saison (flag permanent).

---

## 🔐 ADMIN

- **10 clics** sur le logo → ouvre le panneau admin (modal intégré OU `admin.html`).
- **Connexion** : mot de passe = `ADMIN_PASSWORD`.
- **Fonctions** : annonces, cadeaux, override saison, dates saisons, événements programmables.

---

## 📋 CONVENTIONS DE CODE

### Nommage
- **Fichiers** : minuscule avec tirets (`modes-catch.js`, `son-saisons.js`)
- **Variables** : camelCase (`myProfile`, `currentShopTab`)
- **Constantes** : UPPER_SNAKE_CASE (`POWER_IDS`, `TOWER_CURVE`)
- **IDs HTML** : kebab-case (`user-coins-display`, `bp-card-1`)
- **Classes CSS** : kebab-case (`bp-card-prem`, `user-pill`, `tw-pf2`)
- **Événements socket** : snake_case (`claim_pass_tier`, `tower_use_joker`)

### Style d'écriture
- Pas de framework : **vanilla JS** partout
- Modals construits en JS (`document.createElement`) quand réutilisables
- Inline styles acceptés pour les petits ajustements rapides
- Commentaires en français, regroupés par sections `/* ========== SECTION ========== */`
- Emojis sensibles encodés en Unicode (`\u{2B50}`) dans les templates pour éviter toute perte

### Sauvegarde joueur
- `localStorage` : préférences locales (pseudo, cadre, mute, flags permanents)
- `sessionStorage` : état de navigation éphémère (dernière page active)
- `Supabase` : état serveur (pièces, inventaire, trophées, jokers tour)
- **Règle** : jamais écrire directement en Supabase depuis le client → toujours via socket.

---

## ➕ AJOUTER UNE NOUVELLE SAISON (S4, S5...)

Checklist complète pour ajouter une saison :

### 1. Backend (`server.js`)
- [ ] Ajouter dans `SEASONS[]` (id, name, start, end)
- [ ] Ajouter les récompenses dans `applyPassRewardS4()` (copier S3 et adapter)
- [ ] Ajouter les cosmétiques dans `ITEM_CATALOG` (cadres, grilles, avatars, titres)
- [ ] Ajouter le flag `season_s4_unlocked` au claim Tier 1 (déblocage aventure)

### 2. Frontend — passe (`passe.js`)
- [ ] Ajouter dans `SEASONS_CLIENT[]` avec tous les 30 paliers
- [ ] Ajouter les `SPECIAL_REWARDS.s4` pour les aperçus visuels
- [ ] Ajouter les `THEME_GRAD` pour les nouveaux thèmes
- [ ] Mettre à jour les émoticônes par défaut dans `pass_tier_claimed`
- [ ] Ajouter dans `SEASON_PASS_SUBTITLES`

### 3. Frontend — cosmétiques (`profil.js`)
- [ ] Ajouter les nouveaux cadres dans `FRAME_DISPLAY_NAMES` et `getFrameClass()`
- [ ] Ajouter les nouveaux thèmes dans `THEME_DISPLAY_NAMES`
- [ ] Ajouter les nouveaux titres dans `TITLE_DISPLAY_NAMES`
- [ ] Ajouter les nouveaux avatars dans `AVATAR_DISPLAY_NAMES` et `getAvatarBadgeHTML()` / `getLargeAvatarBadgeHTML()`

### 4. Frontend — aventure (`tour.js`)
- [ ] Ajouter le monde dans `TOWER_CHAPTERS` (season, name, icon, boss)
- [ ] Ajouter la scène dans `TOWER_WORLDS` + `generateSceneHTML()` + CSS
- [ ] Ajouter la ligne de courbe dans `TOWER_CURVE`
- [ ] Ajouter la musique dans `son-saisons.js` + routage `towerPlaySeasonMusic()`

### 5. Styles (`style.css` ou `saisons.css`)
- [ ] Classes CSS des nouveaux cadres (`tft-avatar-container.new-frame`, `.user-pill.new-frame`)
- [ ] Classes CSS des nouveaux thèmes de grille (`.tile.new-theme`)

### 6. Assets
- [ ] Avatars Lottie (.json) ou vidéos (.mp4)
- [ ] Grilles (thèmes CSS)

### 7. Traductions (`i18n.js`)
- [ ] Traduire les nouveaux titres, descriptions de récompenses

### 8. Admin
- [ ] Ajouter la saison dans le select `#admin-season-select` de `admin.html`

---

## 📊 ROADMAP

Voir [`ROADMAP.md`](./ROADMAP.md) pour l'état complet du projet.

**Prochaines étapes** : DA Atelier v3 + Cime Bonbon v3, déblocage saisons serveur, icône + splash, AdMob + Billing, traductions complètes, rebuild Capacitor, soumission V4.

---

## 🛠️ STACK

- **Frontend** : HTML5, CSS3, JavaScript vanilla, Socket.io Client, Lottie Web
- **Backend** : Node.js, Express, Socket.io
- **Base de données** : Supabase (PostgreSQL)
- **Mobile** : Capacitor (Android) + plugin Share
- **Hébergement** : Render (serveur), GitHub Pages / Netlify (client)

---

*Dernière mise à jour : Septembre 2026 — après ajout du Mode Aventure (9 mondes, jokers, vies, DA procédurale), reprise de session mobile et verrou musical saisonnier.*
