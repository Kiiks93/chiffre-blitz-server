# 🎮 CHIFFRE BLITZ — ROADMAP (mise à jour)

> Dernière MAJ : après refonte du Passe de Saison (DA Brawl Stars) + modes exclusifs + sélecteur de bande son.

---

## ✅ LÉGENDE
- `[x]` Terminé
- `[~]` Partiel / en cours
- `[ ]` À faire

---

# 📦 PHASE 1 — FONDATIONS SAISONNIÈRES & BUGS

## 1. [x] Boule de neige offerte (Palier 15 S3)
- `server.js` → `applyPassRewardS3` : palier 15 **free** donne `avatar_s3_boule` à TOUS.
- `passe.js` → libellé S3 tier 15 free = « 🔮 Avatar Boule de Neige (Cadeau 🎁) ».

## 2. [x] Nom du pass dynamique
- `passe.js` → `SEASON_PASS_SUBTITLES` + `updatePassSeasonLabels()`.
- Le titre/sous-titre/badge du pass suivent la saison active (S1/S2/S3).

## 3. [x] Modes exclusifs Halloween 🎃 + Noël 🎄
- `modes-catch.js` (nouveau) : moteur complet solo + 1v1.
- 4 types d'objets : bon / malus / **souriant** (+bonus) / **énervé** (−bonus).
- SVG dédiés : citrouilles & lutins **souriant / énervé** (pas d'emoji parasite).
- Économie : **base 100🪙 + bonus 100🪙** (le bonus **n'est PAS doublé** par le x2).
- Difficulté : facteur `hard` (×1.3) appliqué PC + mobile, zigzag, zones affinées.
- Musique DA propre au mode (Halloween/Noël) même hors saison, restaurée après.
- `server.js` : `startCatchMatch`, `catch_click`, `claim_catch_solo`, `find_halloween_match` (fix vérif `'halloween'`).

## 4. [x] Sélecteur de bande son SANS spoiler
- `son-saisons.js` : `getReleasedSeasons()`, `openMusicChooser()`, `setMusicSeason()`.
- Ne propose que les saisons **déjà sorties**.
- Choix **réinitialisé automatiquement** quand une nouvelle saison démarre (`cb_music_season_ctx`).

## 5. [ ] Dates début/fin des saisons modifiables (admin)
- ⬜ À faire : UI admin + persistance (Supabase `settings`).

## 6. [x→annulé volontaire] Cosmétiques S3 en boutique
- Décision : les cosmétiques S3 restent **EXCLUSIFS au pass** (pas en boutique) pour préserver la valeur du pass.

## 7. [ ] i18n S2/S3
- ⬜ À faire : traductions FR/EN des textes S2/S3.

## 8. [ ] Bouton mute dupliqué
- ⬜ À faire.

## 9. [ ] rule4/5 + media query dupliquée
- ⬜ À faire.

## 10. [~] Code dupliqué + orphelins
- [x] `style.css` : blocs pass dupliqués fusionnés.
- [x] `profil.js` : `saveProfileFromModal` nettoyé (thème émis 1 seule fois).
- [ ] `saisons.css` : SVG/CSS orphelins restants à nettoyer.

---

# 🎫 PHASE 2 — PASSE DE SAISON (DA "BRAWL STARS") ✅

## Affichage
- [x] **Horizontal sur PC / vertical sur mobile**.
- [x] Fenêtre **plein écran** (96vw × 92vh), fond violet à motifs.
- [x] **PREMIUM** = grandes cartes bleues à bordure OR + ruban « ⭐ PREMIUM ».
- [x] **GRATUIT** = cartes plus petites + ruban « GRATUIT ».
- [x] Pastilles de palier noires sur une **piste**.
- [x] Centrage vertical de la piste sur PC (plus de vide).

## Aperçus réels (style Fortnite)
- [x] Avatars **animés** (Lottie/vidéo), cadres appliqués, swatchs de grilles, titres dorés.
- [x] Étiquettes `AVATAR / CADRE / GRILLE / TITRE / PIÈCES / POUVOIR`.
- [x] Émoticônes pour chaque bonus/malus.

## Interactions
- [x] **Clic direct sur la carte** pour récupérer (plus de petit bouton).
- [x] États : ✔ récupéré / 🔒 premium verrouillé.
- [x] Animation de déblocage **pop** + burst d'emojis (pas de flip 3D).
- [x] **Molette = avancer les paliers** sur PC.
- [x] **Position de scroll conservée** après récupération (plus de retour au palier 1).

---

# 🎨 PHASE 3 — PERSONNALISATION & ÉCONOMIE ✅

- [x] **Équip instantané** cadre/thème/titre à la sélection.
- [x] « Enregistrer » = **sauvegarde seulement**.
- [x] Bouton Prévisualiser **supprimé** (devenu inutile).
- [x] Sélecteur de **packs** (grille + cadre en 1 choix).
- [x] `server.js` → `ownsItemOrPack()` : équiper un objet contenu dans un **pack possédé** fonctionne.

---

# ⚡ PHASE 4 — PERFORMANCE & STABILITÉ ✅

- [x] Popup de récompense : son throttlé (1/1.2s) + auto-fermeture 3s.
- [x] `pass_tier_claimed` : délai 450ms avant re-render (laisse voir l'animation).
- [x] Suppression du blocage rouge « patience » sur les clics de palier.
- [x] `passe.js` : virgule syntaxique en trop corrigée (ligne tier 15 S3).
- [x] Fuite mémoire / superposition de sons corrigée.

---

# 🧊 PHASE 5 — COSMÉTIQUES & CADRES ✅

- [x] Cadres S3 : Bonbon / Guirlande / Lutin (+ classes CSS).
- [x] Grilles S3 : Bonbon Canne / Sapin / Lutin.
- [x] Avatars S3 : Bonhomme / Boule de neige / Père Noël (Lottie).
- [x] Titres S3 complets.

---

# 🎯 PROCHAINES ÉTAPES (priorité)

1. **Dates saisons modifiables** (admin) — Phase 1.5
2. **i18n S2/S3** — Phase 1.7
3. **Bouton mute dupliqué** — Phase 1.8
4. **rule4/5 + media query dupliquée** — Phase 1.9
5. **Nettoyage orphelins `saisons.css`** — Phase 1.10

---

*Fin du document.*
