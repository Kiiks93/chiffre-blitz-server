// 🔒 Passe de Saison pas encore live → progression gelée (aucun palier ne tombe)
const SEASON_PASS_ENABLED = false;
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const RECOVERY_SECRET = process.env.RECOVERY_SECRET || 'change-moi-en-prod-une-longue-chaine-secrete';

function generateRecoveryKey(username) {
  return crypto.createHmac('sha256', RECOVERY_SECRET)
    .update(String(username).toLowerCase().trim())
    .digest('hex')
    .substring(0, 12)
    .toUpperCase()
    .match(/.{4}/g)
    .join('-');
}

function generateSecureCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*+-';
  let code = '';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isStrongCode(code) {
  if (!code || code.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(code);
  const hasDigit = /\d/.test(code);
  const hasSpecial = /[!@#$%&*+\-_=]/.test(code);
  return hasLetter && hasDigit && hasSpecial;
}
function hashSecret(code) { return crypto.createHash('sha256').update(String(code)).digest('hex'); }
function isHashed(v) { return /^[a-f0-9]{64}$/.test(v || ''); }

// ✅ Helper : remet à zéro les compteurs quotidiens au fuseau du joueur
function ensureDailyCounters(p) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: p.timezone || 'Europe/Paris' });
  if (!p.daily_ads || p.daily_ads.date !== today) p.daily_ads = { count: 0, date: today };
  if (!p.daily_roulette || p.daily_roulette.date !== today) p.daily_roulette = { count: 0, date: today };
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("SUPABASE_URL et SUPABASE_KEY doivent etre definies."); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error("ADMIN_PASSWORD doit etre definie."); process.exit(1); }

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
  theme_alt: { sources: ["pass", "shop"], type: "theme", permanent: true },
  frame_chroma: { sources: ["pass"], type: "frame", permanent: true },
  frame_prism: { sources: ["pass", "shop"], type: "frame", permanent: true },
  frame_silver: { sources: ["pass"], type: "frame", permanent: true },
  frame_standard: { sources: ["default"], type: "frame", permanent: true },
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
  theme_obsidian: { sources: ["shop"], type: "theme", price: 1800, permanent: true },
  theme_neon: { sources: ["pass"], type: "theme", permanent: true },
  avatar_tigre: { sources: ["pass"], type: "avatar", permanent: true },
  pack_haute_tension: { sources: ["shop"], type: "pack", price: 2900, permanent: true, items: ["frame_voltage", "theme_eclair"] },
  pack_cryo: { sources: ["shop"], type: "pack", price: 2700, permanent: true, items: ["frame_givre", "theme_glacial"] },
  pack_solaire: { sources: ["shop"], type: "pack", price: 3200, permanent: true, items: ["frame_prism", "theme_alt"] },
  pack_obsidienne: { sources: ["shop"], type: "pack", price: 5200, permanent: true, items: ["frame_obsidian", "theme_obsidian"] },
  title_fantome: { sources: ["pass"], type: "title", permanent: true },
  title_danse_macabre: { sources: ["pass"], type: "title", permanent: true },
  title_citrouille: { sources: ["pass"], type: "title", permanent: true },
  title_spectre_automne: { sources: ["pass"], type: "title", permanent: true },
  title_roi_halloween: { sources: ["pass"], type: "title", permanent: true },
  title_esprit_halloween: { sources: ["pass"], type: "title", permanent: true },
  frame_osseux: { sources: ["pass"], type: "frame", permanent: true },
  frame_fantome: { sources: ["pass"], type: "frame", permanent: true },
  theme_citrouille: { sources: ["pass"], type: "theme", permanent: true },
  theme_fantome: { sources: ["pass"], type: "theme", permanent: true },
  avatar_s2_squelette: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s2_chauve: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s2_citrouille: { sources: ["pass"], type: "avatar", permanent: true },
  title_lutin: { sources: ["pass"], type: "title", permanent: true },
  title_traineau: { sources: ["pass"], type: "title", permanent: true },
  title_rennes: { sources: ["pass"], type: "title", permanent: true },
  title_assistant_noel: { sources: ["pass"], type: "title", permanent: true },
  title_magie_noel: { sources: ["pass"], type: "title", permanent: true },
  title_esprit_noel: { sources: ["pass"], type: "title", permanent: true },
  frame_bonbon: { sources: ["pass"], type: "frame", permanent: true },
  frame_guirlande: { sources: ["pass"], type: "frame", permanent: true },
  frame_lutin: { sources: ["pass"], type: "frame", permanent: true },
  theme_bonbon: { sources: ["pass"], type: "theme", permanent: true },
  theme_sapin: { sources: ["pass"], type: "theme", permanent: true },
  theme_lutin: { sources: ["pass"], type: "theme", permanent: true },
  avatar_s3_bonhomme: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s3_boule: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s3_perenoel: { sources: ["pass"], type: "avatar", permanent: true }
};

/* ============================================================
TROPHÉES
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
  midas:            { name: "Midas",             emoji: "💰", shelf: "domination", rarity: "gold", title: "title_midas" },
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
  if (trophy.title && !player.unlocked_items.includes(trophy.title)) player.unlocked_items.push(trophy.title);
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
  if ((player.total_coins_earned || 0) >= 1000) { const t = checkAndUnlockTrophy(player, "worker"); if (t) unlocked.push(t); }
  if ((player.points || 0) >= 500) { const t = checkAndUnlockTrophy(player, "rising_star"); if (t) unlocked.push(t); }
  return unlocked;
}

function hasSource(itemId, source) { const item = ITEM_CATALOG[itemId]; return !!(item && Array.isArray(item.sources) && item.sources.includes(source)); }
function isShopItem(itemId) { return hasSource(itemId, "shop"); }
function getCosmeticCategory(itemId) {
  const item = ITEM_CATALOG[itemId];
  if (item && ["theme", "frame", "avatar", "title"].includes(item.type)) return item.type;
  if (itemId.startsWith("avatar_")) return "avatar";
  if (itemId.startsWith("frame_")) return "frame";
  if (itemId.startsWith("title_")) return "title";
  if (itemId.startsWith("theme_")) return "theme";
  return null;
}
function ownsItemOrPack(player, itemId) {
  const u = player.unlocked_items || [];
  if (u.includes(itemId)) return true;
  for (const id of u) { const it = ITEM_CATALOG[id]; if (it && it.type === 'pack' && Array.isArray(it.items) && it.items.includes(itemId)) return true; }
  return false;
}

/* ============================================================
SAISONS
============================================================ */
const SEASONS = [
  { id: "s1", name: "Felin & Neon", start: "2026-10-01", end: "2026-10-31" },
  { id: "s2", name: "Halloween",   start: "2026-11-01", end: "2026-11-30" },
  { id: "s3", name: "Noël",        start: "2026-12-01", end: "2027-01-10" }
];
let seasonOverride = null;
function getCurrentSeason() {
  if (seasonOverride) { const s = SEASONS.find(x => x.id === seasonOverride); if (s) return s; }
  const now = new Date();
  for (const s of SEASONS) { if (now >= new Date(s.start + "T00:00:00Z") && now <= new Date(s.end + "T23:59:59Z")) return s; }
  if (now < new Date(SEASONS[0].start + "T00:00:00Z")) return SEASONS[0];
  return SEASONS[SEASONS.length - 1];
}
function isCatchEnabled(theme) {
  const season = getCurrentSeason().id;
  if (theme === 'halloween') return globalEvents.halloweenMode || season === 's2';
  if (theme === 'noel') return globalEvents.noelMode || season === 's3';
  return false;
}
function normalizeClaimedTiers(cpt) {
  cpt = cpt || {};
  const keys = Object.keys(cpt);
  if (keys.length > 0 && !SEASONS.some(s => cpt[s.id] && typeof cpt[s.id] === "object")) {
    if (keys.some(k => /^\d+_(free|premium)$/.test(k))) {
      const migrated = Object.assign({}, cpt);
      if (keys.some(k => k.endsWith("_premium") && cpt[k])) migrated.premium = true;
      return { s1: migrated };
    }
  }
  return cpt;
}

/* ---------- Dates saisons modifiables (admin) ---------- */
function applySeasonDates(dates) {
  if (!dates) return;
  SEASONS.forEach(s => { const d = dates[s.id]; if (d && d.start) s.start = d.start; if (d && d.end) s.end = d.end; });
}
function getSeasonDatesPublic() { return SEASONS.map(s => ({ id: s.id, name: s.name, start: s.start, end: s.end })); }
(async () => {
  try {
    const { data } = await supabase.from('settings').select('season_dates').eq('id', 1).single();
    if (data && data.season_dates) applySeasonDates(data.season_dates);
  } catch (e) { console.log('Settings saisons absentes :', e.message); }
})();

/* ============================================================
ÉTAT SERVEUR
============================================================ */
const activePlayers = {};
const rooms = {};
const matchmakingQueue = [];
const rankedQueue = [];
let tugOfWarQueue = [];
let halloweenQueue = [];
let noelQueue = [];
const activeMatches = {};
const lastMatchEarnings = {};

let globalEvents = { coinRush: false, rankShield: false, expressoMatch: false, chaosMode: false, jackpotEclair: false, tugOfWarMode: false, halloweenMode: false, noelMode: false };
let eventSchedules = {
  coinRush: { manual: false, start: null, end: null }, rankShield: { manual: false, start: null, end: null },
  expressoMatch: { manual: false, start: null, end: null }, chaosMode: { manual: false, start: null, end: null },
  jackpotEclair: { manual: false, start: null, end: null }, tugOfWarMode: { manual: false, start: null, end: null },
  halloweenMode: { manual: false, start: null, end: null }, noelMode: { manual: false, start: null, end: null }
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
    matches_played: p.matches_played || 0, win_streak: p.win_streak || 0, best_combo: p.best_combo || 0,
    best_avalanche: p.best_avalanche || 0, solo_games: p.solo_games || 0,
    total_coins_earned: p.total_coins_earned || 0, season_n1_count: p.season_n1_count || 0,
    trophies_collection: p.trophies_collection || {},
    // ✅ Sauvegarde des compteurs quotidiens
    daily_ads: p.daily_ads || { count: 0, date: '' },
    daily_roulette: p.daily_roulette || { count: 0, date: '' }
  };
  let { error } = await supabase.from('players').update({ ...core, ...extra }).eq('id', p.dbId);
  if (error) {
    console.error("⚠️ SAVE (colonnes trophées) ÉCHEC → fallback : ", error.message);
    const retry = await supabase.from('players').update(core).eq('id', p.dbId);
    if (retry.error) console.error("❌ SAVE CORE ÉCHEC : ", retry.error.message);
  }
}
function getOnlineCount() {
  const set = new Set();
  for (const id in activePlayers) {
    const u = activePlayers[id] && activePlayers[id].username;
    if (u) set.add(String(u).toLowerCase());
  }
  return set.size;
}
function broadcastOnlineCount() {
  io.emit('online_count', { online: getOnlineCount() });
}
async function logPlayerAction(p, action, detail, currency, amount, balanceAfter) {
  try {
    await supabase.from('player_logs').insert([{
      username: p.username, socket_id: p.socketId, action, detail,
      currency: currency || null, amount: (amount === undefined ? null : amount),
      balance_after: (balanceAfter === undefined ? null : balanceAfter)
    }]);
  } catch (e) { console.log('log error:', e.message); }
}
function buildAdminCatalog() {
  const items = Object.keys(ITEM_CATALOG).map(id => ({ id, type: ITEM_CATALOG[id].type }));
  const trophies = Object.keys(TROPHY_CATALOG).map(id => ({ id, name: TROPHY_CATALOG[id].name }));
  return { items, trophies };
}
/* ============================================================
SOCKET
============================================================ */
io.on('connection', (socket) => {
  console.log('Connexion : ' + socket.id);
  socket.emit('events_state_update', globalEvents);
  socket.emit('online_count', { online: getOnlineCount() });

  socket.on('get_trophy_room', async (targetUsername) => {
    try {
      const cleanTarget = (targetUsername || '').trim();
      if (!cleanTarget) { socket.emit('trophy_room_data', { ok: false }); return; }
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', cleanTarget).limit(1);
      if (error || !matched || matched.length === 0) { socket.emit('trophy_room_data', { ok: false }); return; }
      const t = matched[0];
      socket.emit('trophy_room_data', {
        ok: true, username: t.username, avatar: t.avatar, flag: t.flag, region: t.region,
        trophies_collection: t.trophies_collection || {}, wins: t.wins || 0, losses: t.losses || 0,
        points: t.points || 0, coins: t.coins || 0, matches_played: t.matches_played || 0,
        win_streak: t.win_streak || 0, best_combo: t.best_combo || 0, best_avalanche: t.best_avalanche || 0,
        solo_games: t.solo_games || 0, total_coins_earned: t.total_coins_earned || 0
      });
    } catch (e) { socket.emit('trophy_room_data', { ok: false }); }
  });

  socket.on('get_my_trophy_room', () => {
    const p = activePlayers[socket.id];
    if (!p) return;
    socket.emit('trophy_room_data', {
      ok: true, username: p.username, avatar: p.avatar, flag: p.flag, region: p.region,
      trophies_collection: p.trophies_collection || {}, wins: p.wins || 0, losses: p.losses || 0,
      points: p.points || 0, coins: p.coins || 0, matches_played: p.matches_played || 0,
      win_streak: p.win_streak || 0, best_combo: p.best_combo || 0, best_avalanche: p.best_avalanche || 0,
      solo_games: p.solo_games || 0, total_coins_earned: p.total_coins_earned || 0
    });
  });

socket.on('register_player', async (data) => {
  const rawUsername = (data.username || '').trim();
  const secretCode = (data.secretCode || '').trim();
  if (rawUsername.length < 3) { socket.emit('register_result', { ok: false, reason: 'short' }); return; }
  if (secretCode.length < 4) { socket.emit('register_result', { ok: false, reason: 'nocode' }); return; }
  try {
    let wasCreated = false;
    let { data: matchedPlayers, error } = await supabase.from('players').select('*').ilike('username', rawUsername);
    let playerData;
    if (!error && matchedPlayers && matchedPlayers.length > 0) {
      const existing = matchedPlayers[0];
      const storedCode = (existing.secret_code || '').trim();
      if (storedCode) {
        const ok = isHashed(storedCode) ? (hashSecret(secretCode) === storedCode) : (storedCode.toLowerCase() === secretCode.toLowerCase());
        if (!ok) { socket.emit('register_result', { ok: false, reason: 'taken' }); return; }
        if (!isHashed(storedCode)) await supabase.from('players').update({ secret_code: hashSecret(secretCode) }).eq('id', existing.id);
      }
      const updates = {};
      if (Object.keys(updates).length > 0) {
        const { data: updated } = await supabase.from('players').update(updates).eq('id', existing.id).select().single();
        playerData = updated || existing;
      } else { playerData = existing; }
    } else {
      // ✅ Garde-fou wipe sticky : en mode login, on refuse si compte absent
      if (data.mode === 'login') {
        socket.emit('register_result', { ok: false, reason: 'not_found' });
        return;
      }
      wasCreated = true;
      const newRecord = {
        username: rawUsername, secret_code: hashSecret(secretCode), region: data.region || "Hauts-de-France",
        country: data.flag ? data.flag.replace(/['"]/g, '').trim() : "FR", avatar: data.avatar || 1, flag: data.flag || "🇫🇷",
        points: 0, coins: 100, trophies: 0, wins: 0, losses: 0,
        inventory: { __equipped: { frame: "frame_standard" } }, equipped_power: null, unlocked_items: ["frame_standard"],
        blitz_pass_premium: false, claimed_pass_tiers: {}, season_progress: {},
        matches_played: 0, win_streak: 0, best_combo: 0, best_avalanche: 0, solo_games: 0, total_coins_earned: 0,
        season_n1_count: 0, trophies_collection: {},
        // ✅ Compteurs quotidiens
        daily_ads: { count: 0, date: '' },
        daily_roulette: { count: 0, date: '' }
      };
      const { data: inserted, error: insertErr } = await supabase.from('players').insert([newRecord]).select().single();
      if (!insertErr && inserted) { playerData = inserted; }
      else { console.error("ERREUR INSERT SUPABASE : ", insertErr ? insertErr.message : "aucune donnee"); playerData = { ...newRecord, id: socket.id }; }
    }
    
// 🔒 Déconnecte les anciennes sessions du même joueur (anti double-compte)
for (const [sid, player] of Object.entries(activePlayers)) {
  if (player.username && player.username.toLowerCase() === rawUsername.toLowerCase() && sid !== socket.id) {
    const oldSocket = io.sockets.sockets.get(sid);
    if (oldSocket) {
  oldSocket.emit('force_disconnect', { reason: 'Connexion depuis un autre appareil' });
  // ⏱️ Laisse 800 ms au client pour recevoir l'événement avant de couper
  setTimeout(() => oldSocket.disconnect(true), 800);
}
    delete activePlayers[sid];
    console.log(`🔒 Double session détectée pour ${rawUsername}, ancienne session ${sid} éjectée`);
  }
}
    const claimedNorm = normalizeClaimedTiers(playerData.claimed_pass_tiers);
    playerData.unlocked_items = playerData.unlocked_items || [];
    if (!playerData.unlocked_items.includes("frame_standard")) playerData.unlocked_items.push("frame_standard");
    playerData.inventory = playerData.inventory || {};
    playerData.inventory.__equipped = playerData.inventory.__equipped || {};
    if (!playerData.inventory.__equipped.frame) playerData.inventory.__equipped.frame = "frame_standard";
    if (claimedNorm["s2"] && claimedNorm["s2"]["24_premium"] && !playerData.unlocked_items.includes("theme_fantome")) playerData.unlocked_items.push("theme_fantome");

    const seasonNow = getCurrentSeason();

    // ✅ Progression "1 palier / jour" — GELÉE tant que SEASON_PASS_ENABLED = false
    if (!playerData.season_progress) playerData.season_progress = {};
    const playerTz = (typeof data.timezone === 'string' && data.timezone)
      ? data.timezone
      : (playerData.timezone || 'Europe/Paris');
    let today;
    try { today = new Date().toLocaleDateString('sv-SE', { timeZone: playerTz }); }
    catch (e) { today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }); }

    const progress = playerData.season_progress[seasonNow.id] || { unlocked_tier: 0, last_login_date: null };
    if (SEASON_PASS_ENABLED) {
      if (progress.last_login_date !== today || playerData.timezone !== playerTz) {
        if (progress.last_login_date !== today) {
          progress.unlocked_tier = Math.min(30, (progress.unlocked_tier || 0) + 1);
          progress.last_login_date = today;
        }
        playerData.season_progress[seasonNow.id] = progress;
        playerData.timezone = playerTz;
        await supabase.from('players').update({ season_progress: playerData.season_progress, timezone: playerTz }).eq('id', playerData.id);
      }
    }

    const premNow = !!(claimedNorm[seasonNow.id] && claimedNorm[seasonNow.id].premium) || (seasonNow.id === "s1" && playerData.blitz_pass_premium);
    activePlayers[socket.id] = {
      socketId: socket.id, dbId: playerData.id || socket.id, id: socket.id,
      username: playerData.username, region: playerData.region, avatar: playerData.avatar, flag: playerData.flag,
      points: playerData.points || 0, coins: playerData.coins || 0, country: playerData.country || "FR",
      trophies: playerData.trophies || 0, wins: playerData.wins || 0, losses: playerData.losses || 0,
      inventory: playerData.inventory, equippedPower: playerData.equipped_power || null,
      unlocked_items: playerData.unlocked_items, blitzPassPremium: premNow, claimedPassTiers: claimedNorm,
      current_season: seasonNow.id,
      seasonProgress: playerData.season_progress,
      unlockedTier: progress.unlocked_tier || 0,
      matches_played: playerData.matches_played || 0, win_streak: playerData.win_streak || 0,
      best_combo: playerData.best_combo || 0, best_avalanche: playerData.best_avalanche || 0,
      solo_games: playerData.solo_games || 0, total_coins_earned: playerData.total_coins_earned || 0,
      season_n1_count: playerData.season_n1_count || 0, trophies_collection: playerData.trophies_collection || {},
      // ✅ Compteurs quotidiens
      daily_ads: playerData.daily_ads || { count: 0, date: '' },
      daily_roulette: playerData.daily_roulette || { count: 0, date: '' },
      timezone: playerTz
    };
    
    // ✅ Reset quotidien au chargement
    ensureDailyCounters(activePlayers[socket.id]);
    
    socket.emit('register_result', { ok: true, created: wasCreated });
    socket.emit('player_registered', activePlayers[socket.id]);
    broadcastOnlineCount();
  } catch (err) { console.error("Erreur enregistrement Supabase : ", err); socket.emit('register_result', { ok: false, reason: 'error' }); }
});

  socket.on('buy_item', async (itemId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const item = ITEM_CATALOG[itemId];
    if (!item || !isShopItem(itemId)) { socket.emit('room_error', "Cet objet ne peut pas etre achete en boutique."); return; }
    if (player.coins < item.price) { socket.emit('room_error', "Tu n'as pas assez de pieces !"); return; }
    logPlayerAction(player, 'buy_item_fail', 'Fonds insuffisants pour ' + itemId, 'coins', 0, player.coins);
    player.inventory = player.inventory || {};
    player.unlocked_items = player.unlocked_items || [];
    if (item.type === 'power') { player.coins -= item.price; player.inventory[itemId] = (player.inventory[itemId] || 0) + 1; }
    else if (item.type === 'pack') {
      const ownedAll = item.items.every(i => player.unlocked_items.includes(i));
      if (ownedAll) { socket.emit('room_error', "Tu possedes deja tous les objets de ce pack."); return; }
      player.coins -= item.price;
      item.items.forEach(i => { if (!player.unlocked_items.includes(i)) player.unlocked_items.push(i); });
    }
    else if (item.permanent) {
      if (player.unlocked_items.includes(itemId)) { socket.emit('room_error', "Tu possedes deja cet objet."); return; }
      player.coins -= item.price; player.unlocked_items.push(itemId);
    } else { return; }
    await savePlayerToSupabase(socket.id);
    logPlayerAction(player, 'buy_item', 'Achat ' + itemId, 'coins', -item.price, player.coins);
    socket.emit('player_registered', player);
  });

  socket.on('equip_power', async (powerId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!POWER_IDS.includes(powerId)) return;
    if ((player.inventory[powerId] || 0) > 0) { player.equippedPower = powerId; await savePlayerToSupabase(socket.id); socket.emit('player_registered', player); }
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
      const owned = itemId === "frame_standard" ? true : ownsItemOrPack(player, itemId);
      if (!category || !owned) { socket.emit('room_error', "Tu ne possedes pas cet objet cosmetique."); return; }
      player.inventory.__equipped[category] = itemId;
    }
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
  });

socket.on("update_profile_visuals", async (data) => {
  try {
    const player = activePlayers[socket.id];
    if (!player) return;

    // ✅ On ne prend QUE avatar et flag, JAMAIS l'inventaire venant du client
    const avatar = Math.max(1, Math.min(999, parseInt(data.avatar) || player.avatar || 1));
    const flag = (typeof data.flag === "string" && data.flag.length <= 8)
      ? data.flag.replace(/['"]/g, "").trim()
      : player.flag;

    player.avatar = avatar;
    player.flag = flag;

    if (player.dbId) {
      await supabase
        .from("players")
        .update({ avatar, flag })
        .eq("id", player.dbId);
    }

    socket.emit("profile_visuals_updated", { ok: true });
  } catch (err) {
    console.error("Erreur update_profile_visuals :", err);
    socket.emit("profile_visuals_updated", { ok: false });
  }
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
    } else { socket.emit('room_error', "Tu n'as pas assez de pieces !"); }
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
  
  // ✅ NOUVEAU : vérifier que le palier est débloqué
  const unlockedTier = (player.seasonProgress && player.seasonProgress[seasonId] && player.seasonProgress[seasonId].unlocked_tier) || 0;
  if (tier > unlockedTier) {
    socket.emit('pass_claim_denied', { tier, track, reason: "tier_locked", unlocked: unlockedTier });
    return;
  }
  
  if (seasonData[key]) { socket.emit('pass_claim_denied', { tier, track, reason: "already_claimed" }); return; }
  if (track === 'premium' && !seasonData.premium) { socket.emit('pass_claim_denied', { tier, track, reason: "premium_required" }); return; }
  
  seasonData[key] = true;
  player.blitzPassPremium = !!seasonData.premium;
  applyPassReward(player, tier, track, seasonId);
  const unlockedTrophies = evaluateTrophies(player);
  if (unlockedTrophies.length > 0) socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
  await savePlayerToSupabase(socket.id);
  socket.emit('player_registered', player);
  socket.emit('pass_tier_claimed', { tier, track });
  socket.emit('pass_reward_received', { message: "Recompense du Palier " + tier + " (" + track + ") recuperee !" });
});

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

  socket.on('send_emote', (data) => {
    const match = activeMatches[socket.id];
    if (match) {
      const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
      if (activePlayers[oppId]) io.to(oppId).emit('receive_emote', { senderId: socket.id, emote: data.emote });
    } else {
      for (let code in rooms) {
        const room = rooms[code];
        if (room.players.some(p => (p.socketId || p.id) === socket.id)) { io.to(code).emit('receive_emote', { senderId: socket.id, emote: data.emote }); break; }
      }
    }
  });

 socket.on('spin_jackpot_wheel', async () => {
  const player = activePlayers[socket.id];
  if (!player) return;
  
  // ✅ Reset quotidien + cap 5 spins/jour
  ensureDailyCounters(player);
  if (player.daily_roulette.count >= 5) {
    socket.emit('wheel_limit_reached', { limit: 5, used: player.daily_roulette.count });
    return;
  }
  player.daily_roulette.count++;
  
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
    } catch (err) { socket.emit('leaderboard_data', { type, data: [] }); }
  });

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
      setTimeout(() => { startMatchBetween(room.players[0].socketId || room.players[0].id, room.players[1].socketId || room.players[1].id, false, false, false); }, 1000);
    }
  });

  socket.on('leave_room', () => { leaveAllRooms(socket); });

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

  socket.on('accept_friend_request', async (friendshipId) => { await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId); socket.emit('friend_updated'); });
  socket.on('remove_friend', async (friendshipId) => { await supabase.from('friendships').delete().eq('id', friendshipId); socket.emit('friend_updated'); });
  socket.on('invite_friend_to_game', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !data.targetSocketId) return;
    io.to(data.targetSocketId).emit('receive_game_invite', { from: player.username, roomCode: data.roomCode || null });
  });

  /* ---------- MATCHMAKING (anti match-contre-soi) ---------- */
  socket.on('find_1v1_match', () => {
    if (!matchmakingQueue.includes(socket.id)) matchmakingQueue.push(socket.id);
    if (matchmakingQueue.length >= 2) {
      const id1 = matchmakingQueue.shift();
      let id2 = null;
      for (let i = 0; i < matchmakingQueue.length; i++) {
        const c = matchmakingQueue[i];
        const sameUser = activePlayers[id1] && activePlayers[c] && activePlayers[id1].username === activePlayers[c].username;
        if (c !== id1 && !sameUser) { id2 = c; matchmakingQueue.splice(i, 1); break; }
      }
      if (id2) startMatchBetween(id1, id2, false, true, false);
      else matchmakingQueue.unshift(id1);
    }
  });

  socket.on('find_ranked_match', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    let items = (data && Array.isArray(data.items)) ? data.items : [];
    if (items.length !== 2) { socket.emit('room_error', "En mode classe, tu dois equiper exactement 2 objets."); return; }
    const counts = {};
    items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    for (const id in counts) { if ((player.inventory[id] || 0) < counts[id]) { socket.emit('room_error', "Stock insuffisant pour un objet selectionne."); return; } }
    player.equippedPowers = items;
    player.equippedPower = items[0];
    if (!rankedQueue.includes(socket.id)) rankedQueue.push(socket.id);
    if (rankedQueue.length >= 2) {
      const id1 = rankedQueue.shift();
      let id2 = null;
      for (let i = 0; i < rankedQueue.length; i++) {
        const c = rankedQueue[i];
        const sameUser = activePlayers[id1] && activePlayers[c] && activePlayers[id1].username === activePlayers[c].username;
        if (c !== id1 && !sameUser) { id2 = c; rankedQueue.splice(i, 1); break; }
      }
      if (id2) startMatchBetween(id1, id2, true, true, false);
      else rankedQueue.unshift(id1);
    }
  });

  socket.on('find_tug_of_war_match', () => {
    if (!globalEvents.tugOfWarMode) return;
    tugOfWarQueue = tugOfWarQueue.filter(sId => sId !== socket.id);
    tugOfWarQueue.push(socket.id);
    if (tugOfWarQueue.length >= 2) startMatchBetween(tugOfWarQueue.shift(), tugOfWarQueue.shift(), false, true, true);
  });

  socket.on('find_halloween_match', () => {
    if (!isCatchEnabled('halloween')) return;
    halloweenQueue = halloweenQueue.filter(s => s !== socket.id);
    halloweenQueue.push(socket.id);
    if (halloweenQueue.length >= 2) startCatchMatch(halloweenQueue.shift(), halloweenQueue.shift(), 'halloween');
  });

  socket.on('find_noel_match', () => {
    if (!isCatchEnabled('noel')) return;
    noelQueue = noelQueue.filter(s => s !== socket.id);
    noelQueue.push(socket.id);
    if (noelQueue.length >= 2) startCatchMatch(noelQueue.shift(), noelQueue.shift(), 'noel');
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

  socket.on('player_click_1v1', (clickedIndex) => {
    const match = activeMatches[socket.id];
    if (!match || match.ended) return;
    const pData = match.players[socket.id];
    if (!pData) return;
    const now = Date.now();
    if (pData.lastClick && now - pData.lastClick < 60) return; // trop rapide = bot, ignoré
    pData.lastClick = now;
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

  socket.on('catch_click', (data) => {
    const match = activeMatches[socket.id];
    if (!match || !match.isCatch || match.ended) return;
    const allowed = [10, -15, 20, -20, 0, -5];
    const delta = parseInt(data.delta);
    if (!allowed.includes(delta)) return;
    const pData = match.players[socket.id];
    if (!pData) return;
    const nowC = Date.now();
    if (pData.lastCatch && nowC - pData.lastCatch < 50) return; // anti-bot
    pData.lastCatch = nowC;
    pData.score = Math.max(0, pData.score + delta);
    const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
    io.to(oppId).emit('catch_opp_score', { score: pData.score });
  });

  socket.on('claim_catch_solo', async (payload) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const score = Math.max(0, Math.min(20000, Number(payload && payload.score) || 0));
    const bonus = Math.max(0, Math.min(20000, Number(payload && payload.bonus) || 0));
    const baseCoins = Math.min(100, Math.floor(score / 3));
    const bonusCoins = Math.min(100, Math.floor(bonus / 3));
    const rushBonus = globalEvents.coinRush ? baseCoins : 0;
    const earned = baseCoins + bonusCoins + rushBonus;
    player.coins += earned;
    player.solo_games = (player.solo_games || 0) + 1;
    player.total_coins_earned = (player.total_coins_earned || 0) + earned;
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
    socket.emit('catch_solo_result', { baseCoins, bonusCoins, rushBonus, earnedCoins: earned });
  });

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
    if (payload && typeof payload.best_combo === 'number') player.best_combo = Math.max(player.best_combo || 0, payload.best_combo);
    if (payload && typeof payload.avalanche_score === 'number') player.best_avalanche = Math.max(player.best_avalanche || 0, payload.avalanche_score);
    const unlockedTrophies = evaluateTrophies(player);
    if (unlockedTrophies.length > 0) socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    lastMatchEarnings[socket.id] = earnedCoins;
    if (perfection) { player.unlocked_items = player.unlocked_items || []; if (!player.unlocked_items.includes('achievement_perfection')) player.unlocked_items.push('achievement_perfection'); }
    let triggerWheel = (globalEvents.jackpotEclair && Math.random() < 0.10);
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
    logPlayerAction(player, 'solo_reward', 'Entraînement (score ' + (payload && payload.score || 0) + ')', 'coins', earnedCoins, player.coins);
    socket.emit('solo_reward_result', { baseCoins, rushBonus, earnedCoins, triggerWheel, globalEvents, perfection });
  });

 socket.on('double_reward', async () => {
  const player = activePlayers[socket.id];
  if (!player) return;
  
  // ✅ Reset quotidien + cap 15 pubs/jour
  ensureDailyCounters(player);
  if (player.daily_ads.count >= 15) {
    socket.emit('ad_limit_reached', { limit: 15, used: player.daily_ads.count });
    return;
  }
  
  const earnings = lastMatchEarnings[socket.id] || 0;
  if (earnings > 0) {
    player.coins += earnings;
    player.daily_ads.count++;
    lastMatchEarnings[socket.id] = 0;
    await savePlayerToSupabase(socket.id);
    socket.emit('player_registered', player);
  }
});

  socket.on('delete_account', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const code = ((data && data.secretCode) || '').trim();
    try {
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', player.username);
      if (error || !matched || matched.length === 0) { socket.emit('delete_account_result', { ok: false }); return; }
      const row = matched[0];
      const stored = (row.secret_code || '').trim();
      const okCode = isHashed(stored) ? (hashSecret(code) === stored) : (stored.toLowerCase() === code.toLowerCase());
      if (stored && !okCode) { socket.emit('delete_account_result', { ok: false, reason: 'bad_code' }); return; }
      await supabase.from('players').delete().eq('id', row.id);
      delete activePlayers[socket.id];
      socket.emit('delete_account_result', { ok: true });
    } catch (e) { console.error("Erreur suppression compte :", e); socket.emit('delete_account_result', { ok: false }); }
  });

  /* ---------- ADMIN ---------- */
  socket.adminAttempts = 0;
  socket.on('admin_auth', (password) => {
    if (socket.isAdmin) return;
    if (socket.adminAttempts >= 5) { socket.emit('admin_auth_fail', "Trop de tentatives."); return; }
    if (password === ADMIN_PASSWORD) { socket.isAdmin = true; socket.emit('admin_auth_success', { events: globalEvents, schedules: eventSchedules }); }
    else { socket.adminAttempts++; socket.emit('admin_auth_fail', "Mot de passe administrateur incorrect !"); }
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
    if (changed) io.emit("events_state_update", globalEvents);
    socket.emit('admin_schedule_saved', eventSchedules);
  });

  socket.on('admin_broadcast_message', (message) => { if (!socket.isAdmin) return; io.emit('global_announcement', message); });

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
      for (let sId in activePlayers) { if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === cleanTarget) { found = sId; break; } }
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
        if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === t.username.toLowerCase()) { activePlayers[sId].region = newRegion; io.to(sId).emit('player_registered', activePlayers[sId]); }
      }
      socket.emit('admin_region_result', { ok: true, username: t.username, region: newRegion });
    } catch (e) { socket.emit('admin_region_result', { ok: false, reason: 'error' }); }
  });

  socket.on('admin_set_season', (seasonId) => {
    if (!socket.isAdmin) return;
    seasonOverride = (seasonId && seasonId !== 'auto') ? seasonId : null;
    const seasonNow = getCurrentSeason();
    for (let sId in activePlayers) {
      const p = activePlayers[sId];
      p.claimedPassTiers = normalizeClaimedTiers(p.claimedPassTiers);
      p.current_season = seasonNow.id;
      p.blitzPassPremium = !!(p.claimedPassTiers[seasonNow.id] && p.claimedPassTiers[seasonNow.id].premium);
      io.to(sId).emit('player_registered', p);
    }
    socket.emit('admin_season_result', { ok: true, season: seasonNow.id });
  });

  socket.on('admin_get_season_dates', () => { if (!socket.isAdmin) return; socket.emit('admin_season_dates', getSeasonDatesPublic()); });
  socket.on('admin_set_season_dates', async (dates) => {
    if (!socket.isAdmin) return;
    applySeasonDates(dates);
    try { await supabase.from('settings').update({ season_dates: dates }).eq('id', 1); } catch (e) {}
    const seasonNow = getCurrentSeason();
    for (let sId in activePlayers) { const p = activePlayers[sId]; p.current_season = seasonNow.id; io.to(sId).emit('player_registered', p); }
    io.emit('seasons_updated', getSeasonDatesPublic());
    socket.emit('admin_season_result', { ok: true, season: seasonNow.id });
  });

    socket.on('admin_get_catalog', () => {
    if (!socket.isAdmin) return;
    socket.emit('admin_catalog', buildAdminCatalog());
  });

  socket.on('admin_give_cosmetic', async (data) => {
    if (!socket.isAdmin) return;
    const { username, itemId, kind } = data || {};
    const clean = (username || '').trim();
    if (!clean || !itemId) return;
    const isPower = kind === 'item' && ITEM_CATALOG[itemId] && ITEM_CATALOG[itemId].type === 'power';

    /* ---------- ADMIN : RÉINITIALISER CODE D'UN JOUEUR ---------- */
  socket.on('admin_reset_password', async (data) => {
    if (!socket.isAdmin) return;
    const targetUsername = (data && data.username || '').trim();
    const providedKey = (data && data.recoveryKey || '').trim().toUpperCase().replace(/\s/g, '');
    if (!targetUsername || !providedKey) { socket.emit('admin_reset_result', { ok: false, message: 'Pseudo et clé requis.' }); return; }

    // Vérifie la clé
    const expectedKey = generateRecoveryKey(targetUsername).replace(/-/g, '');
    if (providedKey !== expectedKey) {
      socket.emit('admin_reset_result', { ok: false, message: '❌ Clé de récupération incorrecte.' });
      return;
    }

    // Génère un nouveau code
    const newCode = generateSecureCode();
    try {
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', targetUsername).limit(1);
      if (error || !matched || matched.length === 0) { socket.emit('admin_reset_result', { ok: false, message: 'Pseudo introuvable.' }); return; }
      const row = matched[0];
      await supabase.from('players').update({ secret_code: hashSecret(newCode) }).eq('id', row.id);

      // Si le joueur est en ligne, on le déconnecte (son localStorage devient invalide)
      for (const sId in activePlayers) {
        if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === row.username.toLowerCase()) {
          io.to(sId).emit('force_logout', { reason: 'password_reset' });
        }
      }

      socket.emit('admin_reset_result', {
        ok: true,
        message: `✅ Nouveau code pour ${row.username} : ${newCode}`,
        newCode,
        username: row.username
      });
      logPlayerAction({ username: row.username, socketId: null }, 'admin_reset_password', 'Réinitialisation par admin (clé vérifiée)');
    } catch (e) {
      socket.emit('admin_reset_result', { ok: false, message: 'Erreur serveur : ' + e.message });
    }
  });

    // --- Joueur EN LIGNE ---
    let targetId = null;
    for (const sId in activePlayers) {
      if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === clean.toLowerCase()) { targetId = sId; break; }
    }
    if (targetId) {
      const p = activePlayers[targetId];
      if (kind === 'trophy') {
        const t = checkAndUnlockTrophy(p, itemId);
        if (!t) { socket.emit('admin_give_result', { ok: false, message: 'Trophée déjà possédé ou introuvable.' }); return; }
      } else if (isPower) {
        p.inventory = p.inventory || {}; p.inventory[itemId] = (p.inventory[itemId] || 0) + 1;
      } else {
        p.unlocked_items = p.unlocked_items || [];
        if (p.unlocked_items.includes(itemId)) { socket.emit('admin_give_result', { ok: false, message: 'Déjà possédé.' }); return; }
        p.unlocked_items.push(itemId);
      }
      await savePlayerToSupabase(targetId);
      logPlayerAction(p, 'admin_give_item', 'Don admin : ' + itemId);
      io.to(targetId).emit('player_registered', p);
      socket.emit('admin_give_result', { ok: true, message: itemId + ' → ' + p.username });
      return;
    }

    // --- Joueur HORS-LIGNE (mise à jour base) ---
    const { data: matched, error } = await supabase.from('players').select('*').ilike('username', clean).limit(1);
    if (error || !matched || matched.length === 0) { socket.emit('admin_give_result', { ok: false, message: 'Pseudo introuvable.' }); return; }
    const row = matched[0];
    if (kind === 'trophy') {
      const tc = row.trophies_collection || {};
      if (tc[itemId]) { socket.emit('admin_give_result', { ok: false, message: 'Trophée déjà possédé.' }); return; }
      const trophy = TROPHY_CATALOG[itemId];
      tc[itemId] = { unlocked: true, unlockedAt: Date.now() };
      const unlocked = row.unlocked_items || [];
      if (trophy && trophy.title && !unlocked.includes(trophy.title)) unlocked.push(trophy.title);
      await supabase.from('players').update({ trophies_collection: tc, unlocked_items: unlocked }).eq('id', row.id);
    } else if (isPower) {
      const inv = row.inventory || {}; inv[itemId] = (inv[itemId] || 0) + 1;
      await supabase.from('players').update({ inventory: inv }).eq('id', row.id);
    } else {
      const unlocked = row.unlocked_items || [];
      if (unlocked.includes(itemId)) { socket.emit('admin_give_result', { ok: false, message: 'Déjà possédé.' }); return; }
      unlocked.push(itemId);
      await supabase.from('players').update({ unlocked_items: unlocked }).eq('id', row.id);
    }
    logPlayerAction({ username: row.username, socketId: null }, 'admin_give_item', 'Don admin (hors-ligne) : ' + itemId);
    socket.emit('admin_give_result', { ok: true, message: itemId + ' → ' + row.username + ' (hors-ligne)' });
  });

    /* ---------- JOUEUR : VOIR SA CLÉ DE RÉCUPÉRATION ---------- */
  socket.on('get_recovery_key', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const providedCode = (data && data.secretCode) || '';
    // Vérifie le code actuel
    supabase.from('players').select('secret_code').eq('id', player.dbId).single().then(({ data: row, error }) => {
      if (error || !row) { socket.emit('recovery_key_result', { ok: false, message: 'Erreur serveur.' }); return; }
      const stored = (row.secret_code || '').trim();
      const okCode = isHashed(stored) ? (hashSecret(providedCode) === stored) : (stored.toLowerCase() === providedCode.toLowerCase());
      if (!okCode) { socket.emit('recovery_key_result', { ok: false, message: 'Code secret incorrect.' }); return; }
      const key = generateRecoveryKey(player.username);
      socket.emit('recovery_key_result', { ok: true, key });
    });
  });

  /* ---------- JOUEUR : CHANGER SON CODE SECRET ---------- */
  socket.on('change_secret_code', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const oldCode = (data && data.oldCode) || '';
    const newCode = (data && data.newCode) || '';
    if (!isStrongCode(newCode)) {
      socket.emit('change_code_result', { ok: false, message: 'Le nouveau code doit faire 8+ caractères avec lettres, chiffres et caractère spécial (!@#$%&*+-_).' });
      return;
    }
    try {
      const { data: row, error } = await supabase.from('players').select('secret_code').eq('id', player.dbId).single();
      if (error || !row) { socket.emit('change_code_result', { ok: false, message: 'Erreur serveur.' }); return; }
      const stored = (row.secret_code || '').trim();
      const okOld = isHashed(stored) ? (hashSecret(oldCode) === stored) : (stored.toLowerCase() === oldCode.toLowerCase());
      if (!okOld) { socket.emit('change_code_result', { ok: false, message: 'Ancien code incorrect.' }); return; }
      await supabase.from('players').update({ secret_code: hashSecret(newCode) }).eq('id', player.dbId);
      socket.emit('change_code_result', { ok: true, message: '✅ Code secret changé avec succès !' });
    } catch (e) {
      socket.emit('change_code_result', { ok: false, message: 'Erreur serveur.' });
    }
  });

  /* ---------- STATS : joueurs réellement en ligne ---------- */
  socket.on('admin_get_stats', () => {
    if (!socket.isAdmin) return;
    socket.emit('admin_stats', { online: getOnlineCount() });
  });
  socket.on('admin_get_logs', async (data) => {
    if (!socket.isAdmin) return;
    const username = ((data && data.username) || '').trim();
    let query = supabase.from('player_logs').select('*').order('id', { ascending: false }).limit(100);
    if (username) query = query.ilike('username', username);
    const { data: rows, error } = await query;
    socket.emit('admin_logs_data', { username, rows: (!error && rows) ? rows : [] });
  });

  
  /* ---------- AJUSTER PIÈCES / POINTS / TROPHÉES ---------- */
  socket.on('admin_adjust_currency', async (data) => {
    if (!socket.isAdmin) return;
    const { mode, currency, amount, pseudo, count } = data || {};
    if (!["coins", "points", "trophies"].includes(currency)) return;
    const amt = parseInt(amount) || 0;
    if (amt === 0) return;
    const apply = (p) => { p[currency] = Math.max(0, (p[currency] || 0) + amt); };

    let targets = [];
    if (mode === 'all') {
      targets = Object.keys(activePlayers);
    } else if (mode === 'pseudo') {
      const clean = (pseudo || '').trim();
      const low = clean.toLowerCase();
      targets = Object.keys(activePlayers).filter(id => activePlayers[id].username && activePlayers[id].username.toLowerCase() === low);
      // Si le joueur est hors-ligne → mise à jour directe en base
      if (targets.length === 0 && clean) {
        const { data: matched, error } = await supabase.from('players').select('*').ilike('username', clean).limit(1);
        if (!error && matched && matched.length > 0) {
          const t = matched[0];
          const newVal = Math.max(0, (t[currency] || 0) + amt);
          await supabase.from('players').update({ [currency]: newVal }).eq('id', t.id);
          socket.emit('admin_adjust_result', { ok: true, message: `${t.username} (hors-ligne) : ${currency} → ${newVal}` });
        } else {
          socket.emit('admin_adjust_result', { ok: false, message: "Pseudo introuvable." });
        }
        return;
      }
    } else if (mode === 'random') {
      const n = Math.max(1, parseInt(count) || 1);
      const ids = Object.keys(activePlayers);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      targets = ids.slice(0, n);
    }

    for (const id of targets) {
      const p = activePlayers[id];
      if (!p) continue;
      apply(p);
      logPlayerAction(p, 'admin_adjust', 'Ajustement admin', currency, amt, p[currency]);
      await savePlayerToSupabase(id);
      io.to(id).emit('player_registered', p);
    }
    socket.emit('admin_adjust_result', { ok: true, message: `${targets.length} joueur(s) modifié(s) (${amt > 0 ? '+' : ''}${amt} ${currency})` });
  });
  socket.on('disconnect', async () => {
    leaveAllRooms(socket);
    const qIdx = matchmakingQueue.indexOf(socket.id);
    if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
    const rIdx = rankedQueue.indexOf(socket.id);
    if (rIdx !== -1) rankedQueue.splice(rIdx, 1);
    tugOfWarQueue = tugOfWarQueue.filter(id => id !== socket.id);
    halloweenQueue = halloweenQueue.filter(id => id !== socket.id);
    noelQueue = noelQueue.filter(id => id !== socket.id);
    delete activeMatches[socket.id];
    delete lastMatchEarnings[socket.id];
    await savePlayerToSupabase(socket.id);
    delete activePlayers[socket.id];
    broadcastOnlineCount();
  });
});

/* ============================================================
FONCTIONS ROOM / MATCH
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

function buildMatchCharges(playerObj) {
  const charges = {};
  if (!playerObj) return charges;
  const loadout = (playerObj.equippedPowers && playerObj.equippedPowers.length > 0) ? playerObj.equippedPowers : (playerObj.equippedPower ? [playerObj.equippedPower] : []);
  loadout.forEach(id => { const stock = playerObj.inventory ? (playerObj.inventory[id] || 0) : 0; if (stock > 0) charges[id] = Math.min((charges[id] || 0) + 1, stock); });
  return charges;
}

function startMatchBetween(id1, id2, isRanked = false, isOnline = true, isTugOfWar = false) {
  const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫", points: 0 };
  const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫🇷", points: 0 };
  const isExpressoActive = globalEvents.expressoMatch && isOnline && !isRanked && !isTugOfWar;
  const match = {
    id1, id2, timeLeft: isExpressoActive ? 20 : 30,
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

function startCatchMatch(id1, id2, theme) {
  const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷" };
  const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫🇷" };
  const match = { id1, id2, timeLeft: 30, isCatch: true, catchTheme: theme, ended: false, rematchVotes: {}, players: { [id1]: { score: 0 }, [id2]: { score: 0 } } };
  activeMatches[id1] = match;
  activeMatches[id2] = match;
  io.to(id1).emit('start_catch', { theme, opponent: p2, timeLeft: 30 });
  io.to(id2).emit('start_catch', { theme, opponent: p1, timeLeft: 30 });
  const gameInterval = setInterval(() => {
    match.timeLeft--;
    io.to(id1).emit('catch_timer', match.timeLeft);
    io.to(id2).emit('catch_timer', match.timeLeft);
    if (match.timeLeft <= 0 || match.ended) {
      clearInterval(gameInterval);
      if (!match.ended) { match.ended = true; endMatch(id1, id2, match, false); }
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
function applyPassReward(p, tier, track, seasonId) {
  p.inventory = p.inventory || {};
  p.unlocked_items = p.unlocked_items || [];
  if (seasonId === "s2") { applyPassRewardS2(p, tier, track); return; }
  if (seasonId === "s3") { applyPassRewardS3(p, tier, track); return; }
  if (seasonId !== "s1") return;
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

function applyPassRewardS2(p, tier, track) {
  if (track === 'free') {
    if ([1, 3, 7, 11, 13, 16, 18, 21, 23, 26, 28].includes(tier)) {
      const coinMap = { 1: 50, 3: 50, 7: 50, 11: 60, 13: 70, 16: 80, 18: 90, 21: 110, 23: 120, 26: 130, 28: 140 };
      p.coins = (p.coins || 0) + (coinMap[tier] || 50);
    } else if ([5, 9, 20].includes(tier)) p.coins = (p.coins || 0) + 100;
    else if ([15, 25].includes(tier)) p.coins = (p.coins || 0) + 150;
    else if (tier === 29) p.coins = (p.coins || 0) + 300;
    else if (tier === 30) { p.coins = (p.coins || 0) + 500; if (!p.unlocked_items.includes('title_esprit_halloween')) p.unlocked_items.push('title_esprit_halloween'); }
    else if ([2, 8, 17].includes(tier)) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + (tier === 17 ? 2 : 1);
    else if ([4, 12, 22].includes(tier)) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
    else if ([6, 14, 19, 24].includes(tier)) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    else if (tier === 10 || tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + (tier === 27 ? 4 : 1);
  } else if (track === 'premium') {
    if (tier === 1) { if (!p.unlocked_items.includes('title_fantome')) p.unlocked_items.push('title_fantome'); }
    else if (tier === 2) p.coins = (p.coins || 0) + 100;
    else if (tier === 3) { if (!p.unlocked_items.includes('title_danse_macabre')) p.unlocked_items.push('title_danse_macabre'); }
    else if (tier === 4) { if (!p.unlocked_items.includes('frame_osseux')) p.unlocked_items.push('frame_osseux'); }
    else if (tier === 5) p.coins = (p.coins || 0) + 150;
    else if (tier === 6) { p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1; p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1; p.inventory['joker'] = (p.inventory['joker'] || 0) + 1; }
    else if (tier === 7) { if (!p.unlocked_items.includes('title_citrouille')) p.unlocked_items.push('title_citrouille'); }
    else if (tier === 8) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 9) p.coins = (p.coins || 0) + 200;
    else if (tier === 10) { if (!p.unlocked_items.includes('theme_citrouille')) p.unlocked_items.push('theme_citrouille'); }
    else if (tier === 11) p.coins = (p.coins || 0) + 120;
    else if (tier === 12) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
    else if (tier === 13) { if (!p.unlocked_items.includes('title_spectre_automne')) p.unlocked_items.push('title_spectre_automne'); }
    else if (tier === 14) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 2;
    else if (tier === 15) { if (!p.unlocked_items.includes('avatar_s2_squelette')) p.unlocked_items.push('avatar_s2_squelette'); }
    else if (tier === 16) p.coins = (p.coins || 0) + 160;
    else if (tier === 17) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 18) p.coins = (p.coins || 0) + 250;
    else if (tier === 19) p.inventory['quake'] = (p.inventory['quake'] || 0) + 1;
    else if (tier === 20) { if (!p.unlocked_items.includes('frame_fantome')) p.unlocked_items.push('frame_fantome'); }
    else if (tier === 21) p.coins = (p.coins || 0) + 220;
    else if (tier === 22) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 3;
    else if (tier === 23) p.coins = (p.coins || 0) + 350;
    else if (tier === 24) { if (!p.unlocked_items.includes('theme_fantome')) p.unlocked_items.push('theme_fantome'); }
    else if (tier === 25) { if (!p.unlocked_items.includes('avatar_s2_chauve')) p.unlocked_items.push('avatar_s2_chauve'); }
    else if (tier === 26) p.coins = (p.coins || 0) + 260;
    else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
    else if (tier === 28) p.coins = (p.coins || 0) + 400;
    else if (tier === 29) p.coins = (p.coins || 0) + 500;
    else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('avatar_s2_citrouille')) p.unlocked_items.push('avatar_s2_citrouille'); if (!p.unlocked_items.includes('title_roi_halloween')) p.unlocked_items.push('title_roi_halloween'); }
  }
}

function applyPassRewardS3(p, tier, track) {
  if (track === 'free') {
    if (tier === 15) { if (!p.unlocked_items.includes('avatar_s3_boule')) p.unlocked_items.push('avatar_s3_boule'); }
    else if ([1, 3, 7, 11, 13, 16, 18, 21, 23, 26, 28].includes(tier)) {
      const coinMap = { 1: 50, 3: 50, 7: 50, 11: 60, 13: 70, 16: 80, 18: 90, 21: 110, 23: 120, 26: 130, 28: 140 };
      p.coins = (p.coins || 0) + (coinMap[tier] || 50);
    } else if ([5, 9, 20].includes(tier)) p.coins = (p.coins || 0) + 100;
    else if (tier === 25) p.coins = (p.coins || 0) + 150;
    else if (tier === 29) p.coins = (p.coins || 0) + 300;
    else if (tier === 30) { p.coins = (p.coins || 0) + 500; if (!p.unlocked_items.includes('title_esprit_noel')) p.unlocked_items.push('title_esprit_noel'); }
    else if ([2, 8, 17].includes(tier)) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + (tier === 17 ? 2 : 1);
    else if ([4, 12, 22].includes(tier)) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
    else if ([6, 14, 19, 24].includes(tier)) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    else if (tier === 10 || tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + (tier === 27 ? 4 : 1);
  } else if (track === 'premium') {
    if (tier === 1) { if (!p.unlocked_items.includes('title_lutin')) p.unlocked_items.push('title_lutin'); }
    else if (tier === 2) p.coins = (p.coins || 0) + 100;
    else if (tier === 3) { if (!p.unlocked_items.includes('title_traineau')) p.unlocked_items.push('title_traineau'); }
    else if (tier === 4) { if (!p.unlocked_items.includes('frame_bonbon')) p.unlocked_items.push('frame_bonbon'); }
    else if (tier === 5) { if (!p.unlocked_items.includes('avatar_s3_bonhomme')) p.unlocked_items.push('avatar_s3_bonhomme'); }
    else if (tier === 6) { p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1; p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1; p.inventory['joker'] = (p.inventory['joker'] || 0) + 1; }
    else if (tier === 7) { if (!p.unlocked_items.includes('title_rennes')) p.unlocked_items.push('title_rennes'); }
    else if (tier === 8) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 9) p.coins = (p.coins || 0) + 200;
    else if (tier === 10) { if (!p.unlocked_items.includes('theme_bonbon')) p.unlocked_items.push('theme_bonbon'); }
    else if (tier === 11) p.coins = (p.coins || 0) + 120;
    else if (tier === 12) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
    else if (tier === 13) { if (!p.unlocked_items.includes('title_assistant_noel')) p.unlocked_items.push('title_assistant_noel'); }
    else if (tier === 14) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 2;
    else if (tier === 15) { if (!p.unlocked_items.includes('avatar_s3_boule')) p.unlocked_items.push('avatar_s3_boule'); }
    else if (tier === 16) p.coins = (p.coins || 0) + 160;
    else if (tier === 17) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 18) p.coins = (p.coins || 0) + 250;
    else if (tier === 19) p.inventory['quake'] = (p.inventory['quake'] || 0) + 1;
    else if (tier === 20) { if (!p.unlocked_items.includes('frame_guirlande')) p.unlocked_items.push('frame_guirlande'); }
    else if (tier === 21) p.coins = (p.coins || 0) + 220;
    else if (tier === 22) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 3;
    else if (tier === 23) p.coins = (p.coins || 0) + 350;
    else if (tier === 24) { if (!p.unlocked_items.includes('theme_sapin')) p.unlocked_items.push('theme_sapin'); }
    else if (tier === 25) { if (!p.unlocked_items.includes('avatar_s3_perenoel')) p.unlocked_items.push('avatar_s3_perenoel'); }
    else if (tier === 26) p.coins = (p.coins || 0) + 260;
    else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
    else if (tier === 28) { if (!p.unlocked_items.includes('title_magie_noel')) p.unlocked_items.push('title_magie_noel'); }
    else if (tier === 29) { if (!p.unlocked_items.includes('frame_lutin')) p.unlocked_items.push('frame_lutin'); }
    else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('theme_lutin')) p.unlocked_items.push('theme_lutin'); }
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
      if (winnerId === id1) { p1.wins = (p1.wins || 0) + 1; p1.points = (p1.points || 0) + 25; p2.losses = (p2.losses || 0) + 1; if (!globalEvents.rankShield) p2.points = Math.max(0, (p2.points || 0) - 15); }
      else if (winnerId === id2) { p2.wins = (p2.wins || 0) + 1; p2.points = (p2.points || 0) + 25; p1.losses = (p1.losses || 0) + 1; if (!globalEvents.rankShield) p1.points = Math.max(0, (p1.points || 0) - 15); }
    }
  }
  if (matchData.isCatch && !matchData.isTugOfWar) {
    const p1 = activePlayers[id1];
    const p2 = activePlayers[id2];
    if (p1 && p2) {
      if (winnerId === id1) { p1.wins = (p1.wins || 0) + 1; p2.losses = (p2.losses || 0) + 1; }
      else if (winnerId === id2) { p2.wins = (p2.wins || 0) + 1; p1.losses = (p1.losses || 0) + 1; }
    }
  }
  for (let sId of [id1, id2]) {
    const p = activePlayers[sId];
    if (!p) continue;
    p.matches_played = (p.matches_played || 0) + 1;
    const isWinner = (winnerId === sId);
    if (isWinner) { p.win_streak = (p.win_streak || 0) + 1; } else { p.win_streak = 0; }
    const unlockedTrophies = evaluateTrophies(p);
    if (unlockedTrophies.length > 0) io.to(sId).emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
  }
  await savePlayerToSupabase(id1);
  await savePlayerToSupabase(id2);
  if (activePlayers[id1]) io.to(id1).emit('player_registered', activePlayers[id1]);
  if (activePlayers[id2]) io.to(id2).emit('player_registered', activePlayers[id2]);
  io.to(id1).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards, isRanked, isCatch: !!matchData.isCatch });
  io.to(id2).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards, isRanked, isCatch: !!matchData.isCatch });
}

/* ============================================================
DÉMARRAGE
============================================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Serveur Chiffre Blitz demarre sur le port ' + PORT);
});
