const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("SUPABASE_URL et SUPABASE_KEY doivent etre definies."); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error("ADMIN_PASSWORD doit etre definie."); process.exit(1); }

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
title_champion: { sources: ["pass"], type: "title", permanent: true }
};
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
return null;
}

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
await supabase.from('players').update({
points: p.points, coins: p.coins, trophies: p.trophies, wins: p.wins, losses: p.losses,
inventory: p.inventory, equipped_power: p.equippedPower, region: p.region, avatar: p.avatar,
flag: p.flag, unlocked_items: p.unlocked_items, blitz_pass_premium: p.blitzPassPremium,
claimed_pass_tiers: p.claimedPassTiers
}).eq('id', p.dbId);
}

io.on('connection', (socket) => {
console.log('Connexion : ' + socket.id);
socket.emit('events_state_update', globalEvents);

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
const updates = { region: data.region || existing.region, avatar: data.avatar || existing.avatar, flag: data.flag || existing.flag };
if (!storedCode) updates.secret_code = secretCode;
const { data: updated } = await supabase.from('players').update(updates).eq('id', existing.id).select().single();
playerData = updated || existing;
} else {
const newRecord = {
username: rawUsername, secret_code: secretCode,
region: data.region || "Hauts-de-France",
country: data.flag ? data.flag.replace(/['"]/g, '').trim() : "FR",
avatar: data.avatar || 1, flag: data.flag || "🇫🇷",
points: 0, coins: 100, trophies: 0, wins: 0, losses: 0,
inventory: {}, equipped_power: null, unlocked_items: [],
blitz_pass_premium: false, claimed_pass_tiers: {}
};
const { data: inserted, error: insertErr } = await supabase.from('players').insert([newRecord]).select().single();
if (!insertErr && inserted) {
playerData = inserted;
} else {
console.error("ERREUR INSERT SUPABASE : ", insertErr ? insertErr.message : "aucune donnee");
playerData = { ...newRecord, id: socket.id };
}
}
activePlayers[socket.id] = {
socketId: socket.id, dbId: playerData.id || socket.id, id: socket.id,
username: playerData.username, region: playerData.region, avatar: playerData.avatar,
flag: playerData.flag, points: playerData.points || 0, coins: playerData.coins || 0,
trophies: playerData.trophies || 0, wins: playerData.wins || 0, losses: playerData.losses || 0,
inventory: playerData.inventory || {}, equippedPower: playerData.equipped_power || null,
unlocked_items: playerData.unlocked_items || [], blitzPassPremium: playerData.blitz_pass_premium || false,
claimedPassTiers: playerData.claimed_pass_tiers || {}
};
socket.emit('register_result', { ok: true });
socket.emit('player_registered', activePlayers[socket.id]);
} catch (err) {
console.error("Erreur enregistrement Supabase : ", err);
socket.emit('register_result', { ok: false, reason: 'error' });
}
});

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

socket.on('buy_blitz_pass', async () => {
const player = activePlayers[socket.id];
if (!player || player.blitzPassPremium) return;
if (player.coins >= 1000) {
player.coins -= 1000;
player.blitzPassPremium = true;
await savePlayerToSupabase(socket.id);
socket.emit('player_registered', player);
socket.emit('blitz_pass_updated', { coins: player.coins, blitzPassPremium: player.blitzPassPremium, claimedPassTiers: player.claimedPassTiers });
socket.emit('pass_reward_received', { message: "Passe de Combat Premium active !" });
} else {
socket.emit('room_error', "Tu n'as pas assez de pieces !");
}
});

socket.on('claim_pass_tier', async (data) => {
const player = activePlayers[socket.id];
if (!player) return;
const { tier, track } = data;
player.claimedPassTiers = player.claimedPassTiers || {};
const key = tier + "_" + track;
if (player.claimedPassTiers[key]) { socket.emit('pass_claim_denied', { tier, track, reason: "already_claimed" }); return; }
if (track === 'premium' && !player.blitzPassPremium) { socket.emit('pass_claim_denied', { tier, track, reason: "premium_required" }); return; }
player.claimedPassTiers[key] = true;
applyPassReward(player, tier, track);
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
if (room.players.some(p => (p.socketId || p.id) === socket.id)) {
io.to(code).emit('receive_emote', { senderId: socket.id, emote: data.emote });
break;
}
}
}
});

socket.on('spin_jackpot_wheel', async () => {
const player = activePlayers[socket.id];
if (!player) return;
const roll = Math.random();
let outcome = 'rien', coinDelta = 0, itemId = null;
const possiblePowerRewards = ["spotlight", "freeze", "joker", "quake"];
if (roll < 0.30) { outcome = 'jackpot'; coinDelta = 250; }
else if (roll < 0.45) { outcome = 'objet'; itemId = possiblePowerRewards[Math.floor(Math.random() * possiblePowerRewards.length)]; player.inventory = player.inventory || {}; player.inventory[itemId] = (player.inventory[itemId] || 0) + 1; }
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
if (scope === 'national' && player) query = query.eq('country', player.country || 'FR');
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

socket.on('claim_solo_reward', async (score) => {
const player = activePlayers[socket.id];
if (!player) return;
const normalizedScore = Number(score);
if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 20000) return;
let baseCoins = Math.min(100, Math.floor(normalizedScore / 3));
let rushBonus = globalEvents.coinRush ? baseCoins : 0;
player.coins += baseCoins + rushBonus;
lastMatchEarnings[socket.id] = baseCoins + rushBonus;
let triggerWheel = (globalEvents.jackpotEclair && Math.random() < 0.10);
await savePlayerToSupabase(socket.id);
socket.emit('player_registered', player);
socket.emit('solo_reward_result', { baseCoins, rushBonus, earnedCoins: baseCoins + rushBonus, triggerWheel, globalEvents });
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
loadout.forEach(id => {
const stock = playerObj.inventory ? (playerObj.inventory[id] || 0) : 0;
if (stock > 0) charges[id] = Math.min((charges[id] || 0) + 1, stock);
});
return charges;
}

function startMatchBetween(id1, id2, isRanked = false, isOnline = true, isTugOfWar = false) {
const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷", points: 0 };
const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫🇷", points: 0 };
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
io.to(id1).emit('start_countdown', { opponent: p2, timeLeft: match.timeLeft, myTarget: 1, myPool: match.players[id1].pool, isTugOfWar });
io.to(id2).emit('start_countdown', { opponent: p1, timeLeft: match.timeLeft, myTarget: 1, myPool: match.players[id2].pool, isTugOfWar });
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
else if (tier === 10) { if (!p.unlocked_items.includes('theme_alt')) p.unlocked_items.push('theme_alt'); }
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
else if (tier === 25) { if (!p.unlocked_items.includes('frame_prism')) p.unlocked_items.push('frame_prism'); }
else if (tier === 26) p.coins = (p.coins || 0) + 260;
else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
else if (tier === 28) p.coins = (p.coins || 0) + 400;
else if (tier === 29) p.coins = (p.coins || 0) + 500;
else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('avatar_lottie_palier30')) p.unlocked_items.push('avatar_lottie_palier30'); }
}
}

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
await savePlayerToSupabase(id1);
await savePlayerToSupabase(id2);
if (activePlayers[id1]) io.to(id1).emit('player_registered', activePlayers[id1]);
if (activePlayers[id2]) io.to(id2).emit('player_registered', activePlayers[id2]);
io.to(id1).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards });
io.to(id2).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log('Serveur Chiffre Blitz demarre sur le port ' + PORT); });
