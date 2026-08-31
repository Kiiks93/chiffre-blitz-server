# ⚡ CHIFFRE BLITZ

Jeu de calcul et de réflexes en temps réel. Entraîne-toi en solo, affronte des joueurs en 1v1 online (matchmaking + classé SBMM), et collectionne des cosmétiques via le Passe de Saison.

- 🎮 **Solo** : Classique, Aléatoire, Avalanche
- ⚔️ **1v1 Online** : matchmaking, classé, salons privés
- 🎫 **Passe de Saison** : 30 paliers free + premium (DA "Brawl Stars")
- 🏛️ **Salle des Trophées** : 16 trophées à débloquer
- 🎃🎄 **Modes exclusifs** : Halloween / Noël (catch solo + 1v1)
- 🛍️ **Boutique** : pouvoirs, cosmétiques, packs
- 🏆 **Classement** : régional, national, mondial
- 🪢 **Corde Raide**, 🎰 **Roue Jackpot**, 📢 **Événements globaux**

---

## 🏗️ ARCHITECTURE

```
chiffre-blitz/
├── index.html          # Page principale du jeu
├── admin.html          # Panneau admin (fenêtre séparée)
├── style.css           # Styles globaux (header, HUD, grilles, modals)
├── saisons.css         # Styles des modes saisonniers (Halloween, Noël)
├── i18n.js             # Traductions FR/EN
├── audio.js            # Moteur son de base (effets SFX)
├── son-saisons.js      # Bande-son saisonnière + sélecteur de saison
├── profil.js           # Profil, personnalisation, économie
├── admin.js            # Fonctions utilitaires admin (modal intégré)
├── social.js           # Amis, salons privés, matchmaking
├── passe.js            # Passe de Saison (DA Brawl Stars)
├── saisons.js          # Logique multi-saisons
├── fx.js               # Effets visuels (combo, fissures, particules)
├── jeu.js              # Gameplay (grille, timer, clics, solo, 1v1)
├── modes-catch.js      # Modes exclusifs (Halloween 🎃 / Noël 🎄)
├── server.js           # Serveur backend (Express + Socket.io + Supabase)
└── ROADMAP.md          # État du projet
```

---

## 📂 FICHIERS FRONTEND (Client)

### 🧱 Structure
| Fichier | Rôle |
|---|---|
| `index.html` | Page principale. Contient tous les écrans (menu, solo, 1v1, shop, pass, admin modal Roblox). Charge les scripts dans l'ordre. |
| `admin.html` | **Panneau admin indépendant** (s'ouvre via `window.open`). Contient : annonces, cadeaux, override saison, dates saisons, événements. |

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
| `son-saisons.js` | Bande-son saisonnière (musiques S1/S2/S3). Contient `getReleasedSeasons()`, `openMusicChooser()`, `setMusicSeason()`. |
| `profil.js` | **Profil joueur complet** : connexion Socket.io, myProfile, personnalisation (cadre/thème/titre/avatar), équipement instantané, économie, validation. |
| `admin.js` | Fonctions utilitaires admin : `openAdminPanel()` → ouvre `admin.html`. Contient aussi le modal admin intégré style Roblox (non utilisé si `admin.html` est ouvert). |
| `social.js` | Système social : amis (ajout, demandes, invitations), salons privés (création, rejoindre, partage de lien). |
| `passe.js` | **Passe de Saison** : DA "Brawl Stars" (horizontal PC / vertical mobile), aperçus visuels réels, étiquettes, animation pop, molette → scroll horizontal. |
| `saisons.js` | Logique multi-saisons : détection de la saison active, calcul du palier actuel, XP. |
| `fx.js` | Effets visuels : système combo, fissures, particules, explosion, banner pop, ice-cracks, trophy room. |
| `jeu.js` | **Gameplay principal** : grille 4×4, timer 30s, clics, solo (classique/aléatoire/avalanche), 1v1 online, matchmaking, ranked, tug-of-war, game over. |
| `modes-catch.js` | **Modes exclusifs** : Chasse Hantée (Halloween 🎃) et Course aux Cadeaux (Noël 🎄). Objets SVG souriants/énervés, économie solo (base 100 + bonus 100), difficulté. |

---

## 📂 FICHIERS BACKEND (Serveur)

| Fichier | Rôle |
|---|---|
| `server.js` | **Serveur Node.js** : Express + Socket.io + Supabase. Gère : authentification (register/login), inventaire, cosmétiques, pouvoir, passe, matchmaking 1v1, salons, amis, trophées, événements globaux, admin. |

### Points clés du serveur
- **Supabase** : table `players` (profil + inventaire), table `friendships`, table `settings` (dates saisons).
- **Sockets** : événements `register_player`, `claim_pass_tier`, `buy_item`, `equip_cosmetic`, `find_1v1_match`, `find_ranked_match`, `player_click_1v1`, `admin_*`, etc.
- **Saisons** : S1 (Félin & Néon), S2 (Halloween), S3 (Noël) — dates modifiables depuis l'admin.
- **Événements globaux** : Coin Rush, Rank Shield, Expresso Match, Chaos Mode, Jackpot Éclair, Tug-of-War, Halloween, Noël.

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
- **Constantes** : UPPER_SNAKE_CASE (`POWER_IDS`, `ITEM_CATALOG`)
- **IDs HTML** : kebab-case (`user-coins-display`, `bp-card-1`)
- **Classes CSS** : kebab-case (`bp-card-prem`, `user-pill`)
- **Événements socket** : snake_case (`claim_pass_tier`, `player_registered`)

### Style d'écriture
- Pas de framework : **vanilla JS** partout
- Modals construits en JS (`document.createElement`) quand réutilisables
- Inline styles acceptés pour les petits ajustements rapides
- Commentaires en français, regroupés par sections `/* ========== SECTION ========== */`

### Sauvegarde joueur
- `localStorage` : préférences locales (pseudo, cadre, mute)
- `Supabase` : état serveur (pièces, inventaire, trophées)
- **Règle** : jamais écrire directement en Supabase depuis le client → toujours via socket.

---

## ➕ AJOUTER UNE NOUVELLE SAISON (S4, S5...)

Checklist complète pour ajouter une saison :

### 1. Backend (`server.js`)
- [ ] Ajouter dans `SEASONS[]` (id, name, start, end)
- [ ] Ajouter les récompenses dans `applyPassRewardS4()` (copier S3 et adapter)
- [ ] Ajouter les cosmétiques dans `ITEM_CATALOG` (cadres, grilles, avatars, titres)

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

### 4. Styles (`style.css` ou `saisons.css`)
- [ ] Classes CSS des nouveaux cadres (`tft-avatar-container.new-frame`, `.user-pill.new-frame`)
- [ ] Classes CSS des nouveaux thèmes de grille (`.tile.new-theme`)

### 5. Assets
- [ ] Avatars Lottie (.json) ou vidéos (.mp4)
- [ ] Grilles (thèmes CSS)

### 6. Traductions (`i18n.js`)
- [ ] Traduire les nouveaux titres, descriptions de récompenses

### 7. Admin
- [ ] Ajouter la saison dans le select `#admin-season-select` de `admin.html`

---

## 📊 ROADMAP

Voir [`ROADMAP.md`](./ROADMAP.md) pour l'état complet du projet.

---

## 🛠️ STACK

- **Frontend** : HTML5, CSS3, JavaScript vanilla, Socket.io Client, Lottie Web
- **Backend** : Node.js, Express, Socket.io
- **Base de données** : Supabase (PostgreSQL)
- **Hébergement** : Render (serveur), GitHub Pages / Netlify (client)

---

*Dernière mise à jour : Août 2026 — après refonte DA Passe de Saison (Brawl Stars) + modes exclusifs Halloween/Noël.*
