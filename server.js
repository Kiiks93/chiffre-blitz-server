const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL et SUPABASE_KEY doivent etre definies.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD doit etre definie.");
  process.exit(1);
}

/* ============================================================
OBJETS
============================================================ */
const POWER_IDS = ["spotlight", "freeze", "joker", "nova", "quake", "micro", "eclipse", "chaos"];
const MALUS_POWERS = ["quake", "micro", "eclipse", "chaos"];

const ITEM_CATALOG = {
  spotlight: { sources: ["shop", "pass"], type: "power", price: 300 },
  freeze: { sources: ["shop", "pass"], type: "power", price: 700 },
  joker: { sources: ["shop", "pass"], type: "power", price: 1200 },
  nova: { sources: ["shop", "pass"], type: "power", price: 2500 },
  quake: { sources: ["shop", "pass"], type: "power", price: 400 },
  micro: { sources: ["shop", "pass"], type: "power", price: 800 },
  eclipse: { sources: ["shop", "pass"], type: "power", price: 1500 },
  chaos: { sources: ["shop", "pass"], type: "power", price: 4000 },
  theme_glacial: { sources: ["shop"], type: "theme", price: 1200, permanent: true },
  frame_voltage: { sources: ["shop"], type: "frame", price: 2200, permanent: true },
  frame_obsidian: { sources: ["shop"], type: "frame", price: 4500, permanent: true },
  theme_obsidian: { sources: ["shop"], type: "theme", price: 1800, permanent: true },
  theme_alt: { sources: ["pass"], type: "theme", permanent: true },
  frame_chroma: { sources: ["pass"], type: "frame", permanent: true },
  frame_prism: { sources: ["pass"], type: "frame", permanent: true },
  frame_silver: { sources: ["pass"], type: "frame", permanent: true },
  avatar_lottie_palier15: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_lottie_palier30: { sources: ["pass"], type: "avatar", permanent: true },
  title_stalker: { sources: ["pass"], type: "title", permanent: true },
  title_felin: { sources: ["pass"], type: "title", permanent: true },
  title_neon: { sources: ["pass"], type: "title", permanent: true },
  title_spectre: { sources: ["pass"], type: "title", permanent: true },
  title_supreme: { sources: ["pass"], type: "title", permanent: true },
  title_champion: { sources: ["pass"], type: "title", permanent: true },
  theme_eclair: { sources: ["shop"], type: "theme", price: 1500, permanent: true },
  frame_givre: { sources: ["shop"], type: "frame", price: 2200, permanent: true },
  theme_neon: { sources: ["pass"], type: "theme", permanent: true },
  avatar_tigre: { sources: ["pass"], type: "avatar", permanent: true },
  pack_haute_tension: { sources: ["shop"], type: "pack", price: 2900, permanent: true, items: ["frame_voltage", "theme_eclair"] },
  pack_cryo: { sources: ["shop"], type: "pack", price: 2700, permanent: true, items: ["frame_givre", "theme_glacial"] },
  pack_obsidienne: { sources: ["shop"], type: "pack", price: 5200, permanent: true, items: ["frame_obsidian", "theme_obsidian"] },
  pack_solaire: { sources: ["shop"], type: "pack", price: 3200, permanent: true, items: ["frame_prism", "theme_alt"] }
};

/* ============================================================
TROPHÉES — SALLE DES TROPHÉES (16 trophées)
============================================================ */
const TROPHY_CATALOG = {
  first_victory:   { name: "Première Victoire", emoji: "⚔️", shelf: "combat", rarity: "bronze", title: "title_vainqueur" },
  unstoppable:     { name: "Inarrêtable",       emoji: "🔥", shelf: "combat", rarity: "silver", title: "title_inarrettable" },
  gladiator:       { name: "Gladiateur",        emoji: "🛡️", shelf: "combat", rarity: "silver", title: "title_gladiateur" },
  champion:        { name: "Champion",          emoji: "👑", shelf: "combat", rarity: "gold", title: "title_champion_trophy", dormant: true },
  awakening:       { name: "Éveil",             emoji: "⚡", shelf: "skill", rarity: "bronze", title: "title_eveille" },
  furnace:         { name: "Fournaise",         emoji: "💥", shelf: "skill", rarity: "silver", title: "title_flamme" },
  perfection:      { name: "PERFECTION",        emoji: "💎", shelf: "skill", rarity: "legendary", title: "title_parfait" },
  avalanche_master:{ name: "Maître Avalanche",  emoji: "🎯", shelf: "skill", rarity: "gold", title: "title_maitre_avalanche" },
  combatant:       { name: "Combattant",        emoji: "🎖️", shelf: "progression", rarity: "bronze", title: "title_combattant" },
  elite:           { name: "Élite",             emoji: "🏵️", shelf: "progression", rarity: "gold", title: "title_elite" },
  worker:          { name: "Travailleur",       emoji: "⛏️", shelf: "progression", rarity: "silver", title: "title_travailleur" },
  rising_star:     { name: "Étoile Montante",   emoji: "⭐", shelf: "progression", rarity: "silver", title: "title_etoile" },
  local_king:      { name: "Roi Local",         emoji: "🏰", shelf: "domination", rarity: "gold", title: "title_roi_local" },
  midas:           { name: "Midas",             emoji: "💰", shelf: "domination", rarity: "gold", title: "title_midas" },
  dynasty:         { name: "Dynastie",          emoji: "🏛️", shelf: "domination", rarity: "legendary", title: "title_dynastie" },
  world_n1:        { name: "N°1 Mondial",       emoji: "🌍", shelf: "domination", rarity: "legendary", title: "title_mondial" }
};

function checkAndUnlockTrophy(player, trophyId) {
  const trophy = TROPHY_CATALOG[trophyId];
  if (!trophy) return null;
  if (trophy.dormant) return null;
  player.trophies_collection = player.trophies_collection || {};
  if (player.trophies_collection[trophyId]) return null;
  player.trophies_collection[trophyId] = { unlocked: true, unlockedAt: Date.now() };
  player.unlocked_items = player.unlocked_items || [];
  if (trophy.title && !player.unlocked_items.includes(trophy.title)) {
    player.unlocked_items.push(trophy.title);
  }
  return trophy;
}

function evaluateTrophies(player) {
  const unlocked = [];
  if ((player.wins || 0) >= 1) { const t = checkAndUnlockTrophy(player, "first_victory"); if (t) unlocked.push(t); }
  if ((player.win_streak || 0) >= 5) { const t = checkAndUnlockTrophy(player, "unstoppable"); if (t) unlocked.push(t); }
  if ((player.matches_played || 0) >= 30) { const t = checkAndUnlockTrophy(player, "gladiator"); if (t) unlocked.push(t); }
  if ((player.best_combo || 0) >= 15) { const t = checkAndUnlockTrophy(player, "awakening"); if (t) unlocked.push(t); }
  if ((player.best_combo || 0) >= 30) { const t = checkAndUnlockTrophy(player, "furnace"); if (t) unlocked.push(t); }
  if ((player.best_combo || 0) >= 35) { const t = checkAndUnlockTrophy(player, "perfection"); if (t) unlocked.push(t); }
  if ((player.best_avalanche || 0) >= 400) { const t = checkAndUnlockTrophy(player, "avalanche_master"); if (t) unlocked.push(t); }
  const cpt = player.claimedPassTiers || {};
  const s1data = cpt["s1"] || cpt;
  if (s1data["15_free"]) { const t = checkAndUnlockTrophy(player, "combatant"); if (t) unlocked.push(t); }
  if (s1data["30_free"]) { const t = checkAndUnlockTrophy(player, "elite"); if (t) unlocked.push(t); }
  if ((player.points || 0) >= 500) { const t = checkAndUnlockTrophy(player, "rising_star"); if (t) unlocked.push(t); }
  return unlocked;
}

function hasSource(itemId, source) {
  const item = ITEM_CATALOG[itemId];
  return !!(item && Array.isArray(item.sources) && item.sources.includes(source));
}

function isShopItem(itemId) { return hasSource(itemId, "shop"); }

function getCosmeticCategory(itemId) {
  const item = ITEM_CATALOG[itemId];
  if (item && ["theme", "frame", "avatar", "title"].includes(item.type)) return item.type;
  if (itemId.startsWith("avatar_")) return "avatar";
  if (itemId.startsWith("frame_")) return "frame";
  if (itemId.startsWith("title_")) return "title";
  if (itemId.startsWith("theme_")) return "theme";
  if (itemId.startsWith("pack_")) return "pack";
  return null;
}
/* ============================================================
SAISONS (moteur multi-saisons)
============================================================ */
const SEASONS = [
  { id: "s1", name: "Felin & Neon", start: "2026-06-01", end: "2026-09-30" },
  { id: "s2", name: "Halloween", start: "2026-10-01", end: "2026-11-30" },
  { id: "s3", name: "Noël", start: "2026-12-01", end: "2027-01-10" }
];
function getCurrentSeason() {
  const now = new Date();
  for (const s of SEASONS) {
    if (now >= new Date(s.start + "T00:00:00Z") && now <= new Date(s.end + "T23:59:59Z")) return s;
  }
  if (now < new Date(SEASONS[0].start + "T00:00:00Z")) return SEASONS[0];
  return SEASONS[SEASONS.length - 1];
}
function normalizeClaimedTiers(cpt) {
  cpt = cpt || {};
  const keys = Object.keys(cpt);
  if (keys.length > 0 && !SEASONS.some(s => cpt[s.id] && typeof cpt[s.id] === "object")) {
    if (keys.some(k => /^\d+_(free|premium)$/.test(k))) return { s1: cpt };
  }
  return cpt;
}
/* ============================================================
ÉTAT SERVEUR
============================================================ */
const activePlayers = {};
const rooms = {};
const matchmakingQueue = [];
const rankedQueue = [];
let tugOfWarQueue = [];
const activeMatches = {};
const lastMatchEarnings = {};

let globalEvents = { coinRush: false, rankShield: false, expressoMatch: false, chaosMode: false, jackpotEclair: false, tugOfWarMode: false };
let eventSchedules = {
  coinRush: { manual: false, start: null, end: null },
  rankShield: { manual: false, start: null, end: null },
  expressoMatch: { manual: false, start: null, end: null },
  chaosMode: { manual: false, start: null, end: null },
  jackpotEclair: { manual: false, start: null, end: null },
  tugOfWarMode: { manual: false, start: null, end: null }
};

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (let key in eventSchedules) {
    const ev = eventSchedules[key];
    let shouldBeActive = ev.manual;
    if (ev.start && ev.end && now >= ev.start && now <= ev.end) shouldBeActive = true;
    if (globalEvents[key] !== shouldBeActive) { globalEvents[key] = shouldBeActive; changed = true; }
  }
  if (changed) io.emit("events_state_update", globalEvents);
}, 5000);

app.get('/', (req, res) => { res.send('Chiffre Blitz Server is running ⚡'); });

async function savePlayerToSupabase(socketId) {
const p = activePlayers[socketId];
if (!p) return;
const core = {
points: p.points, coins: p.coins, trophies: p.trophies, wins: p.wins, losses: p.losses,
inventory: p.inventory, equipped_power: p.equippedPower, region: p.region, avatar: p.avatar,
flag: p.flag, unlocked_items: p.unlocked_items, blitz_pass_premium: p.blitzPassPremium,
claimed_pass_tiers: p.claimedPassTiers
};
const extra = {
matches_played: p.matches_played || 0,
win_streak: p.win_streak || 0,
best_combo: p.best_combo || 0,
best_avalanche: p.best_avalanche || 0,
solo_games: p.solo_games || 0,
total_coins_earned: p.total_coins_earned || 0,
season_n1_count: p.season_n1_count || 0,
trophies_collection: p.trophies_collection || {}
};
let { error } = await supabase.from('players').update({ ...core, ...extra }).eq('id', p.dbId);
if (error) {
console.error("⚠️ SAVE (colonnes trophées) ÉCHEC → fallback : ", error.message);
const retry = await supabase.from('players').update(core).eq('id', p.dbId);
if (retry.error) console.error("❌ SAVE CORE ÉCHEC : ", retry.error.message);
}
}

/* ============================================================
SOCKET
============================================================ */
io.on('connection', (socket) => {
  console.log('Connexion : ' + socket.id);
  socket.emit('events_state_update', globalEvents);
  
  /* ---------- SALLE DES TROPHÉES ---------- */
  socket.on('get_trophy_room', async (targetUsername) => {
    try {
      const cleanTarget = (targetUsername || '').trim();
      if (!cleanTarget) { socket.emit('trophy_room_data', { ok: false }); return; }
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', cleanTarget).limit(1);
      if (error || !matched || matched.length === 0) { socket.emit('trophy_room_data', { ok: false }); return; }
      const t = matched[0];
      socket.emit('trophy_room_data', {
        ok: true,
        username: t.username,
        avatar: t.avatar,
        flag: t.flag,
        region: t.region,
        trophies_collection: t.trophies_collection || {},
        wins: t.wins || 0, losses: t.losses || 0, points: t.points || 0, coins: t.coins || 0,
        matches_played: t.matches_played || 0, win_streak: t.win_streak || 0,
        best_combo: t.best_combo || 0, best_avalanche: t.best_avalanche || 0,
        solo_games: t.solo_games || 0, total_coins_earned: t.total_coins_earned || 0
      });
    } catch (e) {
      socket.emit('trophy_room_data', { ok: false });
    }
  });

  socket.on('get_my_trophy_room', () => {
    const p = activePlayers[socket.id];
    if (!p) return;
    socket.emit('trophy_room_data', {
      ok: true,
      username: p.username, avatar: p.avatar, flag: p.flag, region: p.region,
      trophies_collection: p.trophies_collection || {},
      wins: p.wins || 0, losses: p.losses || 0, points: p.points || 0, coins: p.coins || 0,
      matches_played: p.matches_played || 0, win_streak: p.win_streak || 0,
      best_combo: p.best_combo || 0, best_avalanche: p.best_avalanche || 0,
      solo_games: p.solo_games || 0, total_coins_earned: p.total_coins_earned || 0
    });
  });

  /* ---------- PROFIL / SUPABASE ---------- */
  socket.on('register_player', async (data) => {
    const rawUsername = (data.username || '').trim();
    const secretCode = (data.secretCode || '').trim();
    if (rawUsername.length < 3) { socket.emit('register_result', { ok: false, reason: 'short' }); return; }
    if (secretCode.length < 4) { socket.emit('register_result', { ok: false, reason: 'nocode' }); return; }
    try {
      let { data: matchedPlayers, error } = await supabase.from('players').select('*').ilike('username', rawUsername);
      let playerData;
      if (!error && matchedPlayers && matchedPlayers.length > 0) {
        const existing = matchedPlayers[0];
        const storedCode = (existing.secret_code || '').trim();
        if (storedCode && storedCode.toLowerCase() !== secretCode.toLowerCase()) {
          socket.emit('register_result', { ok: false, reason: 'taken' });
          return;
        }
        // 🔐 LOGIN PROPRE : la personnalisation (région/avatar/drapeau) n'est PLUS JAMAIS écrasée à la connexion
      const updates = {};
      if (!storedCode) updates.secret_code = secretCode;
      if (Object.keys(updates).length > 0) {
      const { data: updated } = await supabase.from('players').update(updates).eq('id', existing.id).select().single();
      playerData = updated || existing;
      } else {
      playerData = existing;
      }
      } else {
        const newRecord = {
          username: rawUsername, secret_code: secretCode,
          region: data.region || "Hauts-de-France",
          country: data.flag ? data.flag.replace(/['"]/g, '').trim() : "FR",
          avatar: data.avatar || 1, flag: data.flag || "🇫🇷",
          points: 0, coins: 100, trophies: 0, wins: 0, losses: 0,
          inventory: {}, equipped_power: null, unlocked_items: [],
          blitz_pass_premium: false, claimed_pass_tiers: {},
          matches_played: 0, win_streak: 0, best_combo: 0, best_avalanche: 0,
          solo_games: 0, total_coins_earned: 0, season_n1_count: 0, trophies_collection: {}
        };
        const { data: inserted, error: insertErr } = await supabase.from('players').insert([newRecord]).select().single();
        if (!insertErr && inserted) {
          playerData = inserted;
        } else {
          console.error("ERREUR INSERT SUPABASE : ", insertErr ? insertErr.message : "aucune donnee");
          playerData = { ...newRecord, id: socket.id };
        }
      }
      const claimedNorm = normalizeClaimedTiers(playerData.claimed_pass_tiers);
      const seasonNow = getCurrentSeason();
      const premNow = !!(claimedNorm[seasonNow.id] && claimedNorm[seasonNow.id].premium) || (seasonNow.id === "s1" && playerData.blitz_pass_premium);
      activePlayers[socket.id] = {
        socketId: socket.id, dbId: playerData.id || socket.id, id: socket.id,
        username: playerData.username, region: playerData.region, avatar: playerData.avatar,
        flag: playerData.flag, points: playerData.points || 0, coins: playerData.coins || 0,
        country: playerData.country || "FR",
        trophies: playerData.trophies || 0, wins: playerData.wins || 0, losses: playerData.losses || 0,
        inventory: playerData.inventory || {}, equippedPower: playerData.equipped_power || null,
        unlocked_items: playerData.unlocked_items || [], blitzPassPremium: premNow,
        claimedPassTiers: claimedNorm, current_season: seasonNow.id,
        matches_played: playerData.matches_played || 0,
        win_streak: playerData.win_streak || 0,
        best_combo: playerData.best_combo || 0,
        best_avalanche: playerData.best_avalanche || 0,
        solo_games: playerData.solo_games || 0,
        total_coins_earned: playerData.total_coins_earned || 0,
        season_n1_count: playerData.season_n1_count || 0,
        trophies_collection: playerData.trophies_collection || {}
      };
      socket.emit('register_result', { ok: true });
      socket.emit('player_registered', activePlayers[socket.id]);
    } catch (err) {
      console.error("Erreur enregistrement Supabase : ", err);
      socket.emit('register_result', { ok: false, reason: 'error' });
    }
  });

  /* ---------- BOUTIQUE ---------- */
  socket.on('buy_item', async (itemId) => {
  const player = activePlayers[socket.id];
  if (!player) return;
  const item = ITEM_CATALOG[itemId];
  if (!item || !isShopItem(itemId)) { socket.emit('room_error', "Cet objet ne peut pas etre achete en boutique."); return; }
  if (player.coins < item.price) { socket.emit('room_error', "Tu n'as pas assez de pieces !"); return; }
  player.inventory = player.inventory || {};
  player.unlocked_items = player.unlocked_items || [];
  if (item.type === 'power') {
    player.coins -= item.price;
    player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
  } else if (item.type === 'pack') {
    const ownedAll = item.items.every(i => player.unlocked_items.includes(i));
    if (ownedAll) { socket.emit('room_error', "Tu possedes deja tous les objets de ce pack."); return; }
    player.coins -= item.price;
    item.items.forEach(i => {
      if (!player.unlocked_items.includes(i)) player.unlocked_items.push(i);
    });
  } else if (item.permanent) {
    if (player.unlocked_items.includes(itemId)) { socket.emit('room_error', "Tu possedes deja cet objet."); return; }
    player.coins -= item.price;
    player.unlocked_items.push(itemId);
  } else { return; }
  await savePlayerToSupabase(socket.id);
  socket.emit('player_registered', player);
});

  socket.on('equip_power', async (powerId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!POWER_IDS.includes(powerId)) return;
    if ((player.inventory[powerId] || 0) > 0) {
      player.equippedPower = powerId;
      await savePlayerToSupabase(socket.id);
      socket.emit('player_registered', player);
    }
  });

  socket.on('equip_cosmetic', async (itemId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!player.inventory) player.inventory = {};
    if (!player.inventory.__equipped) player.inventory.__equipped = {};
    if (itemId === 'none' || itemId === 'standard' || !itemId) delete player.inventory.__equipped.avatar;
    else if (itemId === 'none_title') delete player.inventory.__equipped.title;
    else if (itemId === 'none_frame') delete player.inventory.__equipped.frame;
    else if (itemId === 'none_theme') delete player.inventory.__equipped.theme;
    else {
      const category = getCosmeticCategory(itemId);
      const owned = player.unlocked_items && player.unlocked_items.includes(itemId);
      if (!category || !owned) { socket.emit('room_error', "Tu ne possedes pas cet objet cosmetique."); return; }
      player.inventory.__equipped[category] = itemId;
    }
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
  });

  /* ---------- PASSE DE COMBAT ---------- */
   socket.on('buy_blitz_pass', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const seasonId = getCurrentSeason().id;
    player.claimedPassTiers = normalizeClaimedTiers(player.claimedPassTiers);
    player.claimedPassTiers[seasonId] = player.claimedPassTiers[seasonId] || {};
    if (player.claimedPassTiers[seasonId].premium) return;
    if (player.coins >= 1000) {
      player.coins -= 1000;
      player.claimedPassTiers[seasonId].premium = true;
      player.blitzPassPremium = true;
      await savePlayerToSupabase(socket.id);
      socket.emit('player_registered', player);
      socket.emit('blitz_pass_updated', { coins: player.coins, blitzPassPremium: true, claimedPassTiers: player.claimedPassTiers });
      socket.emit('pass_reward_received', { message: "Passe Premium « " + getCurrentSeason().name + " » activé !" });
    } else {
      socket.emit('room_error', "Tu n'as pas assez de pieces !");
    }
  });

  socket.on('claim_pass_tier', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const { tier, track } = data;
    const seasonId = getCurrentSeason().id;
    player.claimedPassTiers = normalizeClaimedTiers(player.claimedPassTiers);
    player.claimedPassTiers[seasonId] = player.claimedPassTiers[seasonId] || {};
    const seasonData = player.claimedPassTiers[seasonId];
    const key = tier + "_" + track;
    if (seasonData[key]) { socket.emit('pass_claim_denied', { tier, track, reason: "already_claimed" }); return; }
    if (track === 'premium' && !seasonData.premium) { socket.emit('pass_claim_denied', { tier, track, reason: "premium_required" }); return; }
    seasonData[key] = true;
    player.blitzPassPremium = !!seasonData.premium;
    function applyPassReward(p, tier, track, seasonId) {
  if (seasonId !== "s1") return; // s2/s3 : contenu à venir
  p.inventory = p.inventory || {};
  p.unlocked_items = p.unlocked_items || [];
  if (track === 'free') {
    const unlockedTrophies = evaluateTrophies(player);
    if (unlockedTrophies.length > 0) {
      socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    }
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
    socket.emit('pass_tier_claimed', { tier, track });
    socket.emit('pass_reward_received', { message: "Recompense du Palier " + tier + " (" + track + ") recuperee !" });
  });

    socket.on('buy_blitz_pass', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const seasonId = getCurrentSeason().id;
    player.claimedPassTiers = normalizeClaimedTiers(player.claimedPassTiers);
    player.claimedPassTiers[seasonId] = player.claimedPassTiers[seasonId] || {};
    if (player.claimedPassTiers[seasonId].premium) return;
    if (player.coins >= 1000) {
      player.coins -= 1000;
      player.claimedPassTiers[seasonId].premium = true;
      player.blitzPassPremium = true;
      await savePlayerToSupabase(socket.id);
      socket.emit('player_registered', player);
      socket.emit('blitz_pass_updated', { coins: player.coins, blitzPassPremium: true, claimedPassTiers: player.claimedPassTiers });
      socket.emit('pass_reward_received', { message: "Passe Premium « " + getCurrentSeason().name + " » activé !" });
    } else {
      socket.emit('room_error', "Tu n'as pas assez de pieces !");
    }
  });

  socket.on('claim_pass_tier', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const { tier, track } = data;
    const seasonId = getCurrentSeason().id;
    player.claimedPassTiers = normalizeClaimedTiers(player.claimedPassTiers);
    player.claimedPassTiers[seasonId] = player.claimedPassTiers[seasonId] || {};
    const seasonData = player.claimedPassTiers[seasonId];
    const key = tier + "_" + track;
    if (seasonData[key]) { socket.emit('pass_claim_denied', { tier, track, reason: "already_claimed" }); return; }
    if (track === 'premium' && !seasonData.premium) { socket.emit('pass_claim_denied', { tier, track, reason: "premium_required" }); return; }
    seasonData[key] = true;
    player.blitzPassPremium = !!seasonData.premium;
    applyPassReward(player, tier, track, seasonId);
    const unlockedTrophies = evaluateTrophies(player);
    if (unlockedTrophies.length > 0) {
      socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    }
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
    socket.emit('pass_tier_claimed', { tier, track });
    socket.emit('pass_reward_received', { message: "Recompense du Palier " + tier + " (" + track + ") recuperee !" });
  });

  /* ---------- POUVOIRS ---------- */
  socket.on('use_power', async (powerId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!POWER_IDS.includes(powerId)) return;
    if ((player.inventory[powerId] || 0) <= 0) { socket.emit('power_use_denied', { powerId, reason: "no_stock" }); return; }
    const match = activeMatches[socket.id];
    if (match && !match.ended) {
      const pData = match.players[socket.id];
      if (!pData) return;
      pData.charges = pData.charges || {};
      if ((pData.charges[powerId] || 0) <= 0) { socket.emit('power_use_denied', { powerId, reason: "no_charges" }); return; }
      pData.charges[powerId]--;
    }
    player.inventory[powerId]--;
    const remaining = player.inventory[powerId] || 0;
    if (remaining <= 0) {
      if (player.equippedPower === powerId) player.equippedPower = null;
      if (Array.isArray(player.equippedPowers)) player.equippedPowers = player.equippedPowers.filter(id => id !== powerId);
    }
    await savePlayerToSupabase(socket.id);
    socket.emit('power_used_success', { powerId, remaining: player.inventory[powerId] });
    socket.emit('player_registered', player);
    if (match && MALUS_POWERS.includes(powerId)) {
      const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
      io.to(oppId).emit('receive_malus', { type: powerId });
    }
  });

  socket.on('send_malus', () => {});

  /* ---------- ÉMOTICÔNES ---------- */
  socket.on('send_emote', (data) => {
    const match = activeMatches[socket.id];
    if (match) {
      const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
      if (activePlayers[oppId]) io.to(oppId).emit('receive_emote', { senderId: socket.id, emote: data.emote });
    } else {
      for (let code in rooms) {
        const room = rooms[code];
        if (room.players.some(p => (p.socketId || p.id) === socket.id)) {
          io.to(code).emit('receive_emote', { senderId: socket.id, emote: data.emote });
          break;
        }
      }
    }
  });

  /* ---------- ROUE JACKPOT ---------- */
  socket.on('spin_jackpot_wheel', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const roll = Math.random();
    let outcome = 'rien', coinDelta = 0, itemId = null;
    const possiblePowerRewards = ["spotlight", "freeze", "joker", "quake"];
    if (roll < 0.30) { outcome = 'jackpot'; coinDelta = 250; }
    else if (roll < 0.45) {
      outcome = 'objet';
      itemId = possiblePowerRewards[Math.floor(Math.random() * possiblePowerRewards.length)];
      player.inventory = player.inventory || {};
      player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
    }
    else if (roll < 0.70) { outcome = 'banqueroute'; coinDelta = -150; }
    if (coinDelta < 0) player.coins = Math.max(0, player.coins + coinDelta);
    else player.coins += coinDelta;
    lastMatchEarnings[socket.id] = (lastMatchEarnings[socket.id] || 0) + coinDelta;
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
    socket.emit('jackpot_wheel_result', { outcome, coinDelta, itemId, newCoins: player.coins });
  });

  /* ---------- CLASSEMENT ---------- */
  socket.on('get_leaderboard', async (type) => {
    try {
      const [category, scope] = type.split('_');
      let query = supabase.from('players').select('*');
      const player = activePlayers[socket.id];
      if (scope === 'regional' && player) query = query.eq('region', player.region);
      if (scope === 'national' && player) query = query.in('country', [player.country || 'FR', 'FR', '🇫🇷']);
      if (category === 'points') query = query.order('points', { ascending: false });
      else if (category === 'trophies') query = query.order('trophies', { ascending: false });
      else if (category === 'coins') query = query.order('coins', { ascending: false });
      else query = query.order('trophies', { ascending: false }).order('points', { ascending: false });
      const { data: sortedData, error } = await query.limit(50);
      socket.emit('leaderboard_data', { type, data: (!error && sortedData) ? sortedData : [] });
    } catch (err) {
      socket.emit('leaderboard_data', { type, data: [] });
    }
  });

  /* ---------- SALONS ---------- */
  socket.on('get_rooms_list', () => {
    socket.emit('rooms_list_data', Object.values(rooms).map(r => ({ code: r.code, hasPassword: !!r.password, playersCount: r.players.length })));
  });

  socket.on('create_room', (data) => {
    const code = data.code || Math.random().toString(36).substring(2, 6).toUpperCase();
    if (rooms[code]) { socket.emit('room_error', "Ce salon existe deja !"); return; }
    const currentPlayer = activePlayers[socket.id] || { socketId: socket.id, username: data.username, avatar: data.avatar, flag: data.flag };
    rooms[code] = { code, password: data.password || '', players: [currentPlayer], hostId: socket.id };
    socket.join(code);
    socket.emit('room_joined_success', { code, players: rooms[code].players });
    io.emit('rooms_list_changed');
  });

  socket.on('join_room', (data) => {
    const room = rooms[data.code];
    if (!room) { socket.emit('room_error', "Salon introuvable !"); return; }
    if (room.password && room.password !== data.password) { socket.emit('room_error', "Mot de passe incorrect !"); return; }
    if (room.players.length >= 2) { socket.emit('room_error', "Le salon est complet !"); return; }
    const currentPlayer = activePlayers[socket.id] || { socketId: socket.id, username: "Joueur", avatar: 1, flag: "🇫🇷" };
    room.players.push(currentPlayer);
    socket.join(room.code);
    socket.emit('room_joined_success', { code: room.code, players: room.players });
    io.to(room.code).emit('room_players_update', { players: room.players });
    if (room.players.length === 2) {
      setTimeout(() => {
        startMatchBetween(room.players[0].socketId || room.players[0].id, room.players[1].socketId || room.players[1].id, false, false, false);
      }, 1000);
    }
  });

  socket.on('leave_room', () => { leaveAllRooms(socket); });

  /* ---------- AMIS ---------- */
  socket.on('get_friends_list', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    try {
      const { data: friendships, error } = await supabase.from('friendships').select('*').or(`user_username.ilike.${player.username},friend_username.ilike.${player.username}`);
      if (error) throw error;
      let friendsData = [];
      for (let f of friendships) {
        const friendName = f.user_username.toLowerCase() === player.username.toLowerCase() ? f.friend_username : f.user_username;
        let isOnline = false, targetSocketId = null;
        for (let sId in activePlayers) {
          if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === friendName.toLowerCase()) { isOnline = true; targetSocketId = sId; break; }
        }
        friendsData.push({ id: f.id, username: friendName, status: f.status, isRequester: f.user_username.toLowerCase() === player.username.toLowerCase(), isOnline, targetSocketId });
      }
      socket.emit('friends_list_data', friendsData);
    } catch (err) { console.error("Erreur amis :", err); }
  });

  socket.on('send_friend_request', async (targetUsername) => {
    const player = activePlayers[socket.id];
    if (!player || !targetUsername) return;
    const cleanTarget = targetUsername.trim();
    if (cleanTarget.toLowerCase() === player.username.toLowerCase()) { socket.emit('friend_error', "Tu ne peux pas t'ajouter toi-meme !"); return; }
    const { data: targetExists } = await supabase.from('players').select('username').ilike('username', cleanTarget).single();
    if (!targetExists) { socket.emit('friend_error', "Ce joueur n'existe pas !"); return; }
    const { error } = await supabase.from('friendships').insert([{ user_username: player.username, friend_username: targetExists.username, status: 'pending' }]);
    if (error) socket.emit('friend_error', "Demande deja envoyee ou amitie existante.");
    else socket.emit('friend_success', "Demande d'ami envoyee a " + targetExists.username + " !");
  });

  socket.on('accept_friend_request', async (friendshipId) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    socket.emit('friend_updated');
  });

  socket.on('remove_friend', async (friendshipId) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    socket.emit('friend_updated');
  });

  socket.on('invite_friend_to_game', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !data.targetSocketId) return;
    io.to(data.targetSocketId).emit('receive_game_invite', { from: player.username, roomCode: data.roomCode || null });
  });

  /* ---------- MATCHMAKING ---------- */
  socket.on('find_1v1_match', () => {
    matchmakingQueue.push(socket.id);
    if (matchmakingQueue.length >= 2) startMatchBetween(matchmakingQueue.shift(), matchmakingQueue.shift(), false, true, false);
  });

  socket.on('find_ranked_match', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    let items = (data && Array.isArray(data.items)) ? data.items : [];
    if (items.length !== 2) { socket.emit('room_error', "En mode classe, tu dois equiper exactement 2 objets."); return; }
    const counts = {};
    items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    for (const id in counts) {
      if ((player.inventory[id] || 0) < counts[id]) { socket.emit('room_error', "Stock insuffisant pour un objet selectionne."); return; }
    }
    player.equippedPowers = items;
    player.equippedPower = items[0];
    rankedQueue.push(socket.id);
    if (rankedQueue.length >= 2) startMatchBetween(rankedQueue.shift(), rankedQueue.shift(), true, true, false);
  });

  socket.on('find_tug_of_war_match', () => {
    if (!globalEvents.tugOfWarMode) return;
    tugOfWarQueue = tugOfWarQueue.filter(sId => sId !== socket.id);
    tugOfWarQueue.push(socket.id);
    if (tugOfWarQueue.length >= 2) startMatchBetween(tugOfWarQueue.shift(), tugOfWarQueue.shift(), false, true, true);
  });

  socket.on('request_rematch', () => {
    const match = activeMatches[socket.id];
    if (!match) return;
    const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
    if (!activePlayers[oppId]) { socket.emit('room_error', "L'adversaire s'est deconnecte."); return; }
    match.rematchVotes = match.rematchVotes || {};
    match.rematchVotes[socket.id] = true;
    io.to(oppId).emit('opponent_wants_rematch');
    if (match.rematchVotes[match.id1] && match.rematchVotes[match.id2]) {
      delete activeMatches[match.id1];
      delete activeMatches[match.id2];
      startMatchBetween(match.id1, match.id2, match.isRanked, true, match.isTugOfWar);
    }
  });

  /* ---------- GAMEPLAY 1V1 ---------- */
  socket.on('player_click_1v1', (clickedIndex) => {
    const match = activeMatches[socket.id];
    if (!match || match.ended) return;
    const pData = match.players[socket.id];
    if (!pData) return;
    const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
    if (typeof clickedIndex !== 'number' || clickedIndex < 0 || clickedIndex >= pData.pool.length) return;
    const num = pData.pool[clickedIndex];
    if (num === pData.target) {
      pData.score += 10;
      pData.target++;
      pData.pool = generatePool(pData.target);
      if (match.isTugOfWar) {
        if (socket.id === match.id1) match.ropePosition++; else match.ropePosition--;
        io.to(match.id1).emit('tug_of_war_update', { ropePosition: match.ropePosition });
        io.to(match.id2).emit('tug_of_war_update', { ropePosition: match.ropePosition });
        if (match.ropePosition >= 6 || match.ropePosition <= -6) { match.ended = true; endMatch(match.id1, match.id2, match, false); return; }
      }
      socket.emit('my_grid_updated', { target: pData.target, newPool: pData.pool, success: true, score: pData.score });
      io.to(oppId).emit('opponent_progress', { target: pData.target, score: pData.score, opponent: activePlayers[socket.id] });
    } else {
      socket.emit('my_grid_updated', { target: pData.target, newPool: pData.pool, success: false, score: pData.score });
    }
  });

  /* ---------- RÉCOMPENSES SOLO ---------- */
  socket.on('claim_solo_reward', async (payload) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const score = (typeof payload === 'object' && payload !== null) ? (payload.score || 0) : payload;
    const perfection = (typeof payload === 'object' && payload !== null) ? !!payload.perfection : false;
    const normalizedScore = Number(score);
    if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 20000) return;
    let baseCoins = perfection ? 100 : Math.min(100, Math.floor(normalizedScore / 3));
    let rushBonus = globalEvents.coinRush ? baseCoins : 0;
    let earnedCoins = baseCoins + rushBonus;
    player.coins += earnedCoins;
    player.solo_games = (player.solo_games || 0) + 1;
    player.total_coins_earned = (player.total_coins_earned || 0) + earnedCoins;
    if (payload && typeof payload.best_combo === 'number') {
      player.best_combo = Math.max(player.best_combo || 0, payload.best_combo);
    }
    if (payload && typeof payload.avalanche_score === 'number') {
      player.best_avalanche = Math.max(player.best_avalanche || 0, payload.avalanche_score);
    }
    const unlockedTrophies = evaluateTrophies(player);
    if (unlockedTrophies.length > 0) {
      socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    }
    lastMatchEarnings[socket.id] = earnedCoins;
    if (perfection) {
      player.unlocked_items = player.unlocked_items || [];
      if (!player.unlocked_items.includes('achievement_perfection')) player.unlocked_items.push('achievement_perfection');
    }
    let triggerWheel = (globalEvents.jackpotEclair && Math.random() < 0.10);
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
    socket.emit('solo_reward_result', { baseCoins, rushBonus, earnedCoins, triggerWheel, globalEvents, perfection });
  });

  socket.on('double_reward', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const earnings = lastMatchEarnings[socket.id] || 0;
    if (earnings > 0) {
      player.coins += earnings;
      lastMatchEarnings[socket.id] = 0;
      await savePlayerToSupabase(socket.id);
      socket.emit('player_registered', player);
    }
  });

  /* ---------- SUPPRESSION DE COMPTE ---------- */
  socket.on('delete_account', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const code = ((data && data.secretCode) || '').trim();
    try {
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', player.username);
      if (error || !matched || matched.length === 0) { socket.emit('delete_account_result', { ok: false }); return; }
      const row = matched[0];
      const stored = (row.secret_code || '').trim();
      if (stored && stored.toLowerCase() !== code.toLowerCase()) { socket.emit('delete_account_result', { ok: false, reason: 'bad_code' }); return; }
      await supabase.from('players').delete().eq('id', row.id);
      delete activePlayers[socket.id];
      socket.emit('delete_account_result', { ok: true });
    } catch (e) {
      console.error("Erreur suppression compte :", e);
      socket.emit('delete_account_result', { ok: false });
    }
  });

  /* ---------- ADMIN ---------- */
  socket.adminAttempts = 0;
  socket.on('admin_auth', (password) => {
    if (socket.isAdmin) return;
    if (socket.adminAttempts >= 5) { socket.emit('admin_auth_fail', "Trop de tentatives."); return; }
    if (password === ADMIN_PASSWORD) {
      socket.isAdmin = true;
      socket.emit('admin_auth_success', { events: globalEvents, schedules: eventSchedules });
    } else {
      socket.adminAttempts++;
      socket.emit('admin_auth_fail', "Mot de passe administrateur incorrect !");
    }
  });

  socket.on('admin_update_schedule', (schedulesData) => {
    if (!socket.isAdmin) return;
    eventSchedules = schedulesData;
    const now = Date.now();
    let changed = false;
    for (let key in eventSchedules) {
      const ev = eventSchedules[key];
      let shouldBeActive = ev.manual;
      if (ev.start && ev.end && now >= ev.start && now <= ev.end) shouldBeActive = true;
      if (globalEvents[key] !== shouldBeActive) { globalEvents[key] = shouldBeActive; changed = true; }
    }
    if (changed) io.emit('events_state_update', globalEvents);
    socket.emit('admin_schedule_saved', eventSchedules);
  });

  socket.on('admin_broadcast_message', (message) => {
    if (!socket.isAdmin) return;
    io.emit('global_announcement', message);
  });

  socket.on('admin_give_gift', async (data) => {
    if (!socket.isAdmin) return;
    const { targetUsername, currency, amount } = data;
    if (!["coins", "points", "trophies"].includes(currency)) return;
    const currencyLabel = currency === 'coins' ? 'Pieces' : (currency === 'points' ? 'Points' : 'Trophées');
    const msg = "Cadeau Admin recu : +" + amount + " " + currencyLabel + " !";
    if (!targetUsername || targetUsername.trim() === '' || targetUsername.toUpperCase() === 'TOUS') {
      for (let sId in activePlayers) {
        activePlayers[sId][currency] = (activePlayers[sId][currency] || 0) + amount;
        await savePlayerToSupabase(sId);
        io.to(sId).emit('player_registered', activePlayers[sId]);
        io.to(sId).emit('admin_gift_received', { currency, amount, message: msg });
      }
      
    } else {
      const cleanTarget = targetUsername.trim().toLowerCase();
      let found = null;
      for (let sId in activePlayers) {
        if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === cleanTarget) { found = sId; break; }
      }
      if (found) {
        activePlayers[found][currency] = (activePlayers[found][currency] || 0) + amount;
        await savePlayerToSupabase(found);
        io.to(found).emit('player_registered', activePlayers[found]);
        io.to(found).emit('admin_gift_received', { currency, amount, message: msg });
      } else {
        const { data: matchedPlayers, error } = await supabase.from('players').select('*').ilike('username', targetUsername.trim());
        if (!error && matchedPlayers && matchedPlayers.length > 0) {
          const t = matchedPlayers[0];
          await supabase.from('players').update({ [currency]: (t[currency] || 0) + amount }).eq('id', t.id);
        }
      }
    }
  });
socket.on('admin_set_region', async (data) => {
if (!socket.isAdmin) return;
const targetUsername = (data.targetUsername || '').trim();
const newRegion = (data.newRegion || '').trim();
if (!targetUsername || !newRegion) return;
try {
const { data: matched, error } = await supabase.from('players').select('*').ilike('username', targetUsername).limit(1);
if (error || !matched || matched.length === 0) { socket.emit('admin_region_result', { ok: false, reason: 'not_found' }); return; }
const t = matched[0];
await supabase.from('players').update({ region: newRegion }).eq('id', t.id);
for (let sId in activePlayers) {
if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === t.username.toLowerCase()) {
activePlayers[sId].region = newRegion;
io.to(sId).emit('player_registered', activePlayers[sId]);
}
}
socket.emit('admin_region_result', { ok: true, username: t.username, region: newRegion });
} catch (e) {
socket.emit('admin_region_result', { ok: false, reason: 'error' });
}
});
  /* ---------- DÉCONNEXION ---------- */
  socket.on('disconnect', async () => {
    leaveAllRooms(socket);
    const qIdx = matchmakingQueue.indexOf(socket.id);
    if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
    const rIdx = rankedQueue.indexOf(socket.id);
    if (rIdx !== -1) rankedQueue.splice(rIdx, 1);
    tugOfWarQueue = tugOfWarQueue.filter(id => id !== socket.id);
    delete activeMatches[socket.id];
    delete lastMatchEarnings[socket.id];
    await savePlayerToSupabase(socket.id);
    delete activePlayers[socket.id];
  });
});

/* ============================================================
FONCTIONS ROOM
============================================================ */
function leaveAllRooms(socket) {
  let changed = false;
  for (let code in rooms) {
    const room = rooms[code];
    room.players = room.players.filter(p => (p.socketId || p.id) !== socket.id);
    socket.leave(code);
    if (room.players.length === 0) { delete rooms[code]; changed = true; }
    else { io.to(code).emit('room_players_update', { players: room.players }); changed = true; }
  }
  if (changed) io.emit('rooms_list_changed');
}

/* ============================================================
FONCTIONS MATCH
============================================================ */
function buildMatchCharges(playerObj) {
  const charges = {};
  if (!playerObj) return charges;
  const loadout = (playerObj.equippedPowers && playerObj.equippedPowers.length > 0)
    ? playerObj.equippedPowers
    : (playerObj.equippedPower ? [playerObj.equippedPower] : []);
  loadout.forEach(id => {
    const stock = playerObj.inventory ? (playerObj.inventory[id] || 0) : 0;
    if (stock > 0) charges[id] = Math.min((charges[id] || 0) + 1, stock);
  });
  return charges;
}

function startMatchBetween(id1, id2, isRanked = false, isOnline = true, isTugOfWar = false) {
  const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷", points: 0 };
  const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫", points: 0 };
  const isExpressoActive = globalEvents.expressoMatch && isOnline && !isRanked && !isTugOfWar;
  const match = {
    id1, id2,
    timeLeft: isExpressoActive ? 20 : 30,
    players: {
      [id1]: { target: 1, score: 0, pool: generatePool(1), charges: buildMatchCharges(activePlayers[id1]) },
      [id2]: { target: 1, score: 0, pool: generatePool(1), charges: buildMatchCharges(activePlayers[id2]) }
    },
    isRanked, isTugOfWar, ropePosition: 0, ended: false, rematchVotes: {}
  };
  activeMatches[id1] = match;
  activeMatches[id2] = match;
  io.to(id1).emit('start_countdown', { opponent: p2, timeLeft: match.timeLeft, myTarget: 1, myPool: match.players[id1].pool, isTugOfWar, isRanked });
  io.to(id2).emit('start_countdown', { opponent: p1, timeLeft: match.timeLeft, myTarget: 1, myPool: match.players[id2].pool, isTugOfWar, isRanked });
  let chaosTimer = 0;
  const gameInterval = setInterval(() => {
    match.timeLeft--;
    io.to(id1).emit('timer_update', match.timeLeft);
    io.to(id2).emit('timer_update', match.timeLeft);
    if (globalEvents.chaosMode && !isRanked && isOnline) {
      chaosTimer++;
      if (chaosTimer >= 8) {
        chaosTimer = 0;
        const maluses = ['quake', 'micro', 'eclipse'];
        const randomMalus = maluses[Math.floor(Math.random() * maluses.length)];
        io.to(id1).emit('receive_malus', { type: randomMalus });
        io.to(id2).emit('receive_malus', { type: randomMalus });
      }
    }
    if (match.timeLeft <= 0 || match.ended) {
      clearInterval(gameInterval);
      if (!match.ended) { match.ended = true; endMatch(id1, id2, match, isRanked); }
    }
  }, 1000);
}

function generatePool(target) {
  let pool = [target];
  let candidates = [];
  for (let i = 1; i <= 50; i++) { if (i !== target) candidates.push(i); }
  candidates.sort(() => Math.random() - 0.5);
  return pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
}

/* ============================================================
PASS REWARDS
============================================================ */
function applyPassReward(p, tier, track) {
  p.inventory = p.inventory || {};
  p.unlocked_items = p.unlocked_items || [];
  if (track === 'free') {
    if ([1, 3, 7, 11, 13, 16, 18, 21, 23, 26, 28].includes(tier)) {
      const coinMap = { 1: 50, 3: 50, 7: 50, 11: 60, 13: 70, 16: 80, 18: 90, 21: 110, 23: 120, 26: 130, 28: 140 };
      p.coins = (p.coins || 0) + (coinMap[tier] || 50);
    } else if ([5, 9, 20].includes(tier)) p.coins = (p.coins || 0) + 100;
    else if ([15, 25].includes(tier)) p.coins = (p.coins || 0) + 150;
    else if (tier === 29) p.coins = (p.coins || 0) + 300;
    else if (tier === 30) { p.coins = (p.coins || 0) + 500; if (!p.unlocked_items.includes('title_champion')) p.unlocked_items.push('title_champion'); }
    else if ([2, 8, 17].includes(tier)) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + (tier === 17 ? 2 : 1);
    else if ([4, 12, 22].includes(tier)) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
    else if ([6, 14, 19, 24].includes(tier)) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    else if (tier === 10 || tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + (tier === 27 ? 4 : 1);
  } else if (track === 'premium') {
    if (!p.blitzPassPremium) return;
    if (tier === 1) { if (!p.unlocked_items.includes('title_stalker')) p.unlocked_items.push('title_stalker'); }
    else if (tier === 2) p.coins = (p.coins || 0) + 100;
    else if (tier === 3) { if (!p.unlocked_items.includes('title_felin')) p.unlocked_items.push('title_felin'); }
    else if (tier === 4) { if (!p.unlocked_items.includes('frame_silver')) p.unlocked_items.push('frame_silver'); }
    else if (tier === 5) p.coins = (p.coins || 0) + 150;
    else if (tier === 6) { p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1; p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1; p.inventory['joker'] = (p.inventory['joker'] || 0) + 1; }
    else if (tier === 7) { if (!p.unlocked_items.includes('title_neon')) p.unlocked_items.push('title_neon'); }
    else if (tier === 8) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 9) p.coins = (p.coins || 0) + 200;
    else if (tier === 10) { if (!p.unlocked_items.includes('theme_neon')) p.unlocked_items.push('theme_neon'); }
    else if (tier === 11) p.coins = (p.coins || 0) + 120;
    else if (tier === 12) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
    else if (tier === 13) { if (!p.unlocked_items.includes('title_spectre')) p.unlocked_items.push('title_spectre'); }
    else if (tier === 14) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 2;
    else if (tier === 15) { if (!p.unlocked_items.includes('avatar_lottie_palier15')) p.unlocked_items.push('avatar_lottie_palier15'); }
    else if (tier === 16) p.coins = (p.coins || 0) + 160;
    else if (tier === 17) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 18) p.coins = (p.coins || 0) + 250;
    else if (tier === 19) p.inventory['quake'] = (p.inventory['quake'] || 0) + 1;
    else if (tier === 20) { if (!p.unlocked_items.includes('frame_chroma')) p.unlocked_items.push('frame_chroma'); }
    else if (tier === 21) p.coins = (p.coins || 0) + 220;
    else if (tier === 22) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 3;
    else if (tier === 23) { if (!p.unlocked_items.includes('title_supreme')) p.unlocked_items.push('title_supreme'); }
    else if (tier === 24) p.coins = (p.coins || 0) + 300;
    else if (tier === 25) { if (!p.unlocked_items.includes('avatar_lottie_palier30')) p.unlocked_items.push('avatar_lottie_palier30'); }
    else if (tier === 26) p.coins = (p.coins || 0) + 260;
    else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
    else if (tier === 28) p.coins = (p.coins || 0) + 400;
    else if (tier === 29) p.coins = (p.coins || 0) + 500;
    else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('avatar_tigre')) p.unlocked_items.push('avatar_tigre'); }
  }
}

/* ============================================================
FIN DE MATCH
============================================================ */
async function endMatch(id1, id2, matchData, isRanked) {
  setTimeout(() => {
    if (activeMatches[id1] === matchData) delete activeMatches[id1];
    if (activeMatches[id2] === matchData) delete activeMatches[id2];
  }, 20000);
  let winnerId = null;
  let reason = "Temps ecoule !";
  if (matchData.isTugOfWar) {
    if (matchData.ropePosition > 0) winnerId = id1;
    else if (matchData.ropePosition < 0) winnerId = id2;
    reason = "Corde tiree entierement ! KO";
  } else {
    const s1 = matchData.players[id1] ? matchData.players[id1].score : 0;
    const s2 = matchData.players[id2] ? matchData.players[id2].score : 0;
    if (s1 > s2) winnerId = id1;
    else if (s2 > s1) winnerId = id2;
  }
  const matchRewards = {};
  for (let sId of [id1, id2]) {
    const p = activePlayers[sId];
    if (p) {
      const isWinner = (winnerId === sId);
      let baseCoins = isWinner ? 30 : 10;
      let rushBonus = globalEvents.coinRush ? baseCoins : 0;
      p.coins += baseCoins + rushBonus;
      lastMatchEarnings[sId] = baseCoins + rushBonus;
      matchRewards[sId] = { baseCoins, rushBonus, totalCoins: baseCoins + rushBonus };
      if (isWinner && globalEvents.jackpotEclair && Math.random() < 0.10) io.to(sId).emit('trigger_jackpot_wheel');
    }
  }
  if (isRanked && !matchData.isTugOfWar) {
    const p1 = activePlayers[id1];
    const p2 = activePlayers[id2];
    if (p1 && p2) {
      if (winnerId === id1) {
        p1.wins = (p1.wins || 0) + 1; p1.points = (p1.points || 0) + 25; p2.losses = (p2.losses || 0) + 1;
        if (!globalEvents.rankShield) p2.points = Math.max(0, (p2.points || 0) - 15);
      } else if (winnerId === id2) {
        p2.wins = (p2.wins || 0) + 1; p2.points = (p2.points || 0) + 25; p1.losses = (p1.losses || 0) + 1;
        if (!globalEvents.rankShield) p1.points = Math.max(0, (p1.points || 0) - 15);
      }
    }
  }
  for (let sId of [id1, id2]) {
    const p = activePlayers[sId];
    if (!p) continue;
    p.matches_played = (p.matches_played || 0) + 1;
    const isWinner = (winnerId === sId);
    if (isWinner) {
      p.win_streak = (p.win_streak || 0) + 1;
    } else {
      p.win_streak = 0;
    }
    const unlockedTrophies = evaluateTrophies(p);
    if (unlockedTrophies.length > 0) {
      io.to(sId).emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    }
  }
  await savePlayerToSupabase(id1);
  await savePlayerToSupabase(id2);
  if (activePlayers[id1]) io.to(id1).emit('player_registered', activePlayers[id1]);
  if (activePlayers[id2]) io.to(id2).emit('player_registered', activePlayers[id2]);
  io.to(id1).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards, isRanked });
  io.to(id2).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards, isRanked });
}

/* ============================================================
DÉMARRAGE
============================================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Serveur Chiffre Blitz demarre sur le port ' + PORT);
});
