const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jjhoblvdpbstxwuelmoa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaG9ibHZkcGJzdHh3dWVsbW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDMwNTksImV4cCI6MjEwMDkxOTA1OX0.BIIuE0e3WbpJ6asxPx7FpH01FESDHfqRUMBW54jfh4E';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- STOCKAGE EN MÉMOIRE (Sessions actives) ---
const activePlayers = {}; 
const rooms = {};    
const matchmakingQueue = [];
const rankedQueue = [];
let tugOfWarQueue = [];
const activeMatches = {}; 
const lastMatchEarnings = {};

// --- CONFIGURATION ADMIN & ÉVÉNEMENTS ---
const ADMIN_PASSWORD = "*JE_SUIS_ADMIN1301*";

let globalEvents = {
    coinRush: false,
    rankShield: false,
    expressoMatch: false,
    chaosMode: false,
    jackpotEclair: false,
    tugOfWarMode: false
};

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

        if (ev.start && ev.end) {
            if (now >= ev.start && now <= ev.end) {
                shouldBeActive = true;
            }
        }

        if (globalEvents[key] !== shouldBeActive) {
            globalEvents[key] = shouldBeActive;
            changed = true;
        }
    }

    if (changed) {
        io.emit('events_state_update', globalEvents);
    }
}, 5000);

app.get('/', (req, res) => {
    res.send('Chiffre Blitz Server is running ⚡');
});

async function savePlayerToSupabase(socketId) {
    const p = activePlayers[socketId];
    if (!p) return;
    
    await supabase
        .from('players')
        .update({
            points: p.points,
            coins: p.coins,
            trophies: p.trophies,
            wins: p.wins,
            losses: p.losses,
            inventory: p.inventory,
            equipped_power: p.equippedPower,
            region: p.region,
            avatar: p.avatar,
            flag: p.flag,
            unlocked_items: p.unlocked_items,
            blitz_pass_premium: p.blitzPassPremium,
            claimed_pass_tiers: p.claimedPassTiers
        })
        .eq('id', p.dbId);
}

io.on('connection', (socket) => {
    console.log(`🔌 Un utilisateur s'est connecté : ${socket.id}`);

    socket.emit('events_state_update', globalEvents);

    socket.on('register_player', async (data) => {
        const rawUsername = data.username ? data.username.trim() : "Joueur";
        try {
            let { data: matchedPlayers, error } = await supabase
                .from('players')
                .select('*')
                .ilike('username', rawUsername);

            let dbPlayer = matchedPlayers && matchedPlayers.length > 0 ? matchedPlayers[0] : null;
            let playerData;

            if (error || !dbPlayer) {
                const newRecord = {
                    username: rawUsername,
                    region: data.region || "Hauts-de-France",
                    country: data.flag ? data.flag.replace(/['"]/g, '').trim() : "FR",
                    avatar: data.avatar || 1,
                    flag: data.flag || "🇫🇷",
                    points: 0,
                    coins: 100,
                    trophies: 0,
                    wins: 0,
                    losses: 0,
                    inventory: {},
                    equipped_power: null,
                    unlocked_items: [],
                    blitz_pass_premium: false,
                    claimed_pass_tiers: {}
                };

                const { data: inserted, error: insertErr } = await supabase
                    .from('players')
                    .insert([newRecord])
                    .select()
                    .single();

                if (!insertErr && inserted) {
                    playerData = inserted;
                } else {
                    playerData = { ...newRecord, id: socket.id };
                }
            } else {
                playerData = dbPlayer;
                const { data: updated } = await supabase
                    .from('players')
                    .update({
                        region: data.region || dbPlayer.region,
                        avatar: data.avatar || dbPlayer.avatar,
                        flag: data.flag || dbPlayer.flag
                    })
                    .eq('id', dbPlayer.id)
                    .select()
                    .single();

                if (updated) playerData = updated;
            }

            activePlayers[socket.id] = {
                socketId: socket.id,
                dbId: playerData.id || socket.id,
                id: socket.id,
                username: playerData.username,
                region: playerData.region,
                avatar: playerData.avatar,
                flag: playerData.flag,
                points: playerData.points || 0,
                coins: playerData.coins || 0,
                trophies: playerData.trophies || 0,
                wins: playerData.wins || 0,
                losses: playerData.losses || 0,
                inventory: playerData.inventory || {},
                equippedPower: playerData.equipped_power || null,
                unlocked_items: playerData.unlocked_items || [],
                blitzPassPremium: playerData.blitz_pass_premium || false,
                claimedPassTiers: playerData.claimed_pass_tiers || {}
            };

            socket.emit('player_registered', activePlayers[socket.id]);
        } catch (err) {
            console.error("Erreur lors de l'enregistrement Supabase :", err);
        }
    });

    const SHOP_PRICES = {
        spotlight: 300, freeze: 700, joker: 1200, nova: 2500,
        quake: 400, micro: 800, eclipse: 1500, chaos: 4000,
        theme_alt: 1500, avatar_legend: 2500, frame_gold: 5000
    };

    socket.on('buy_item', async (itemId) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        
        const cost = SHOP_PRICES[itemId];
        if (!cost || player.coins < cost) return;

        const permanents = ['theme_alt', 'avatar_legend', 'frame_gold'];

        if (permanents.includes(itemId)) {
            if (!player.unlocked_items) player.unlocked_items = [];
            if (!player.unlocked_items.includes(itemId)) {
                player.coins -= cost;
                player.unlocked_items.push(itemId);
                await savePlayerToSupabase(socket.id);
                socket.emit('player_registered', player);
            }
        } else {
            player.coins -= cost;
            player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
            await savePlayerToSupabase(socket.id);
            socket.emit('player_registered', player);
        }
    });

    socket.on('buy_blitz_pass', async () => {
        const player = activePlayers[socket.id];
        if (!player) return;
        if (player.blitzPassPremium) return;

        const cost = 1000;
        if (player.coins >= cost) {
            player.coins -= cost;
            player.blitzPassPremium = true;
            await savePlayerToSupabase(socket.id);
            socket.emit('player_registered', player);
            socket.emit('admin_gift_received', { message: "🎉 Passe de Combat Premium activé et sauvegardé avec succès !" });
        } else {
            socket.emit('room_error', "Tu n'as pas assez de pièces 🪙 !");
        }
    });

    socket.on('claim_pass_tier', async (data) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        const { tier, track } = data;

        player.claimedPassTiers = player.claimedPassTiers || {};
        const key = `${tier}_${track}`;
        if (player.claimedPassTiers[key]) return;
        if (track === 'premium' && !player.blitzPassPremium) return;

        player.claimedPassTiers[key] = true;
        applyPassReward(player, tier, track);

        await savePlayerToSupabase(socket.id);
        socket.emit('player_registered', player);
        socket.emit('admin_gift_received', { message: `🎁 Récompense du Palier ${tier} (${track}) enregistrée !` });
    });

    socket.on('equip_power', async (powerId) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        if ((player.inventory[powerId] || 0) > 0) {
            player.equippedPower = powerId;
            await savePlayerToSupabase(socket.id);
            socket.emit('player_registered', player);
        }
    });

    // Correction de l'avatar Standard intégrée
    socket.on('equip_cosmetic', async (itemId) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        
        if (!player.inventory) player.inventory = {};
        if (!player.inventory.__equipped) player.inventory.__equipped = {};

        if (itemId === 'none' || itemId === 'standard' || !itemId) {
            delete player.inventory.__equipped.avatar;
            await savePlayerToSupabase(socket.id);
            socket.emit('player_registered', player);
        } else if (player.unlocked_items && player.unlocked_items.includes(itemId)) {
            let category = 'theme';
            if (itemId.startsWith('avatar_')) category = 'avatar';
            else if (itemId === 'frame_gold' || itemId.startsWith('frame_')) category = 'frame';
            else if (itemId === 'theme_alt') category = 'theme';
            
            player.inventory.__equipped[category] = itemId;
            await savePlayerToSupabase(socket.id);
            socket.emit('player_registered', player);
        }
    });

    socket.on('use_power', async (powerId) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        if (player.inventory[powerId] && player.inventory[powerId] > 0) {
            player.inventory[powerId]--;
            await savePlayerToSupabase(socket.id);
            socket.emit('player_registered', player);
        }
    });

    socket.on('send_malus', (data) => {
        const match = activeMatches[socket.id];
        if (!match) return;
        const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
        io.to(oppId).emit('receive_malus', { type: data.type });
    });

    socket.on('send_emote', (data) => {
        const match = activeMatches[socket.id];
        if (match) {
            const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
            if (activePlayers[oppId]) {
                io.to(oppId).emit('receive_emote', { senderId: socket.id, emote: data.emote });
            }
        } else {
            for (let code in rooms) {
                const room = rooms[code];
                const isInRoom = room.players.some(p => (p.socketId || p.id) === socket.id);
                if (isInRoom) {
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
        let outcome = 'rien';
        let coinDelta = 0;

        if (roll < 0.33) {
            outcome = 'jackpot';
            coinDelta = 250;
        } else if (roll < 0.66) {
            outcome = 'banqueroute';
            coinDelta = -150; 
        } else {
            outcome = 'rien';
            coinDelta = 0;
        }

        if (coinDelta < 0) {
            player.coins = Math.max(0, player.coins + coinDelta);
        } else {
            player.coins += coinDelta;
        }

        lastMatchEarnings[socket.id] = (lastMatchEarnings[socket.id] || 0) + coinDelta;

        await savePlayerToSupabase(socket.id);
        socket.emit('player_registered', player);
        socket.emit('jackpot_wheel_result', { outcome, coinDelta, newCoins: player.coins });
    });

    socket.on('get_leaderboard', async (type) => {
        try {
            const [category, scope] = type.split('_');
            let query = supabase.from('players').select('*');

            if (scope === 'regional' && activePlayers[socket.id]) {
                const myReg = activePlayers[socket.id].region;
                query = query.eq('region', myReg);
            }

            if (category === 'points') {
                query = query.order('points', { ascending: false });
            } else if (category === 'trophies') {
                query = query.order('trophies', { ascending: false });
            } else if (category === 'coins') {
                query = query.order('coins', { ascending: false });
            } else if (category === 'combined') {
                query = query.order('trophies', { ascending: false }).order('points', { ascending: false });
            }

            const { data: sortedData, error } = await query.limit(50);

            if (!error && sortedData) {
                socket.emit('leaderboard_data', { type, data: sortedData });
            } else {
                socket.emit('leaderboard_data', { type, data: [] });
            }
        } catch (err) {
            console.error("Erreur récupération classement Supabase :", err);
            socket.emit('leaderboard_data', { type, data: [] });
        }
    });

    socket.on('get_rooms_list', () => {
        const openRooms = Object.values(rooms).map(r => ({
            code: r.code,
            hasPassword: !!r.password,
            playersCount: r.players.length
        }));
        socket.emit('rooms_list_data', openRooms);
    });

    socket.on('create_room', (data) => {
        const code = data.code || Math.random().toString(36).substring(2, 6).toUpperCase();
        if (rooms[code]) {
            socket.emit('room_error', "Ce salon existe déjà !");
            return;
        }

        const currentPlayer = activePlayers[socket.id] || { 
            socketId: socket.id, 
            username: data.username, 
            avatar: data.avatar, 
            flag: data.flag 
        };

        rooms[code] = {
            code: code,
            password: data.password || '',
            players: [currentPlayer],
            hostId: socket.id
        };

        socket.join(code);
        socket.emit('room_joined_success', { code, players: rooms[code].players });
    });

    socket.on('join_room', (data) => {
        const room = rooms[data.code];
        if (!room) {
            socket.emit('room_error', "Salon introuvable !");
            return;
        }
        if (room.password && room.password !== data.password) {
            socket.emit('room_error', "Mot de passe incorrect !");
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('room_error', "Le salon est complet !");
            return;
        }

        const currentPlayer = activePlayers[socket.id] || { 
            socketId: socket.id, 
            username: "Joueur", 
            avatar: 1, 
            flag: "🇫🇷" 
        };
        room.players.push(currentPlayer);
        socket.join(room.code);

        socket.emit('room_joined_success', { code: room.code, players: room.players });
        io.to(room.code).emit('room_players_update', { players: room.players });

        if (room.players.length === 2) {
            setTimeout(() => {
                const p1SocketId = room.players[0].socketId || room.players[0].id;
                const p2SocketId = room.players[1].socketId || room.players[1].id;
                startMatchBetween(p1SocketId, p2SocketId, false, false, false); 
            }, 1000);
        }
    });

    socket.on('leave_room', () => {
        leaveAllRooms(socket);
    });

    // --- SYSTÈME D'AMIS ---
    socket.on('get_friends_list', async () => {
        const player = activePlayers[socket.id];
        if (!player) return;

        try {
            const { data: friendships, error } = await supabase
                .from('friendships')
                .select('*')
                .or(`user_username.ilike.${player.username},friend_username.ilike.${player.username}`);

            if (error) throw error;

            let friendsData = [];
            for (let f of friendships) {
                const friendName = f.user_username.toLowerCase() === player.username.toLowerCase() 
                    ? f.friend_username 
                    : f.user_username;

                let isOnline = false;
                let targetSocketId = null;
                for (let sId in activePlayers) {
                    if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === friendName.toLowerCase()) {
                        isOnline = true;
                        targetSocketId = sId;
                        break;
                    }
                }

                friendsData.push({
                    id: f.id,
                    username: friendName,
                    status: f.status,
                    isRequester: f.user_username.toLowerCase() === player.username.toLowerCase(),
                    isOnline,
                    targetSocketId
                });
            }

            socket.emit('friends_list_data', friendsData);
        } catch (err) {
            console.error("Erreur récupération amis :", err);
        }
    });

    socket.on('send_friend_request', async (targetUsername) => {
        const player = activePlayers[socket.id];
        if (!player || !targetUsername) return;

        const cleanTarget = targetUsername.trim();
        if (cleanTarget.toLowerCase() === player.username.toLowerCase()) {
            socket.emit('friend_error', "Tu ne peux pas t'ajouter toi-même !");
            return;
        }

        const { data: targetExists } = await supabase
            .from('players')
            .select('username')
            .ilike('username', cleanTarget)
            .single();

        if (!targetExists) {
            socket.emit('friend_error', "Ce joueur n'existe pas !");
            return;
        }

        const { error } = await supabase
            .from('friendships')
            .insert([{
                user_username: player.username,
                friend_username: targetExists.username,
                status: 'pending'
            }]);

        if (error) {
            socket.emit('friend_error', "Demande déjà envoyée ou amitié existante.");
        } else {
            socket.emit('friend_success', `Demande d'ami envoyée à ${targetExists.username} !`);
        }
    });

    socket.on('accept_friend_request', async (friendshipId) => {
        await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);
        socket.emit('friend_updated');
    });

    socket.on('remove_friend', async (friendshipId) => {
        await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);
        socket.emit('friend_updated');
    });

    socket.on('invite_friend_to_game', (data) => {
        const { targetSocketId, roomCode } = data;
        const player = activePlayers[socket.id];
        if (!player || !targetSocketId) return;

        io.to(targetSocketId).emit('receive_game_invite', {
            from: player.username,
            roomCode: roomCode || null
        });
    });

    // --- RECHERCHE ET MATCHMAKING ---
    socket.on('find_1v1_match', () => {
        matchmakingQueue.push(socket.id);
        if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift();
            const p2 = matchmakingQueue.shift();
            startMatchBetween(p1, p2, false, true, false); 
        }
    });

    socket.on('find_ranked_match', (data) => {
        if (data && data.items && activePlayers[socket.id]) {
            activePlayers[socket.id].equippedPowers = data.items;
            activePlayers[socket.id].equippedPower = data.items[0];
        }
        rankedQueue.push(socket.id);
        if (rankedQueue.length >= 2) {
            const p1 = rankedQueue.shift();
            const p2 = rankedQueue.shift();
            startMatchBetween(p1, p2, true, true, false); 
        }
    });

    socket.on('find_tug_of_war_match', () => {
        if (!globalEvents.tugOfWarMode) return;
        tugOfWarQueue = tugOfWarQueue.filter(sId => sId !== socket.id);
        tugOfWarQueue.push(socket.id);

        if (tugOfWarQueue.length >= 2) {
            const p1 = tugOfWarQueue.shift();
            const p2 = tugOfWarQueue.shift();
            startMatchBetween(p1, p2, false, true, true); 
        }
    });

    // --- SYSTÈME DE REVANCHE ---
    socket.on('request_rematch', () => {
        const match = activeMatches[socket.id];
        if (!match) return; // Le délai de 20s est expiré ou le match n'existe plus

        const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
        if (!activePlayers[oppId]) {
            socket.emit('room_error', "L'adversaire s'est déconnecté.");
            return;
        }

        match.rematchVotes = match.rematchVotes || {};
        match.rematchVotes[socket.id] = true;

        io.to(oppId).emit('opponent_wants_rematch');

        if (match.rematchVotes[match.id1] && match.rematchVotes[match.id2]) {
            delete activeMatches[match.id1];
            delete activeMatches[match.id2];
            startMatchBetween(match.id1, match.id2, false, true, false);
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
                if (socket.id === match.id1) {
                    match.ropePosition++;
                } else {
                    match.ropePosition--;
                }

                io.to(match.id1).emit('tug_of_war_update', { ropePosition: match.ropePosition });
                io.to(match.id2).emit('tug_of_war_update', { ropePosition: match.ropePosition });

                if (match.ropePosition >= 6) {
                    match.ended = true;
                    endMatch(match.id1, match.id2, match, false);
                    return;
                } else if (match.ropePosition <= -6) {
                    match.ended = true;
                    endMatch(match.id1, match.id2, match, false);
                    return;
                }
            }
            
            socket.emit('my_grid_updated', {
                target: pData.target,
                newPool: pData.pool,
                success: true,
                score: pData.score
            });

            io.to(oppId).emit('opponent_progress', {
                target: pData.target,
                score: pData.score,
                opponent: activePlayers[socket.id]
            });
        } else {
            socket.emit('my_grid_updated', {
                target: pData.target,
                newPool: pData.pool,
                success: false,
                score: pData.score
            });
        }
    });

    socket.on('claim_solo_reward', async (score) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        let baseCoins = Math.min(100, Math.floor(score / 3));
        let rushBonus = globalEvents.coinRush ? baseCoins : 0;
        let earnedCoins = baseCoins + rushBonus;
        
        player.coins += earnedCoins;
        lastMatchEarnings[socket.id] = earnedCoins;

        let triggerWheel = (globalEvents.jackpotEclair && Math.random() < 0.03);

        await savePlayerToSupabase(socket.id);
        socket.emit('player_registered', player);
        socket.emit('solo_reward_result', { baseCoins, rushBonus, earnedCoins, triggerWheel, globalEvents });
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

    socket.on('admin_auth', (password) => {
        if (password === ADMIN_PASSWORD) {
            socket.isAdmin = true;
            socket.emit('admin_auth_success', { events: globalEvents, schedules: eventSchedules });
        } else {
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
            if (ev.start && ev.end) {
                if (now >= ev.start && now <= ev.end) shouldBeActive = true;
            }
            if (globalEvents[key] !== shouldBeActive) {
                globalEvents[key] = shouldBeActive;
                changed = true;
            }
        }

        if (changed) {
            io.emit('events_state_update', globalEvents);
        }
        socket.emit('admin_schedule_saved', eventSchedules);
    });

    socket.on('admin_broadcast_message', (message) => {
        if (!socket.isAdmin) return;
        io.emit('global_announcement', message);
    });

    socket.on('admin_give_gift', async (data) => {
        if (!socket.isAdmin) return;
        const { targetUsername, currency, amount } = data;
        const currencyLabel = currency === 'coins' ? 'Pièces 🪙' : 'Points 🏅';
        const msg = `🎁 Cadeau Admin reçu : +${amount} ${currencyLabel} !`;
        
        if (!targetUsername || targetUsername.trim() === '' || targetUsername.toUpperCase() === 'TOUS') {
            for (let sId in activePlayers) {
                activePlayers[sId][currency] = (activePlayers[sId][currency] || 0) + amount;
                await savePlayerToSupabase(sId);
                io.to(sId).emit('player_registered', activePlayers[sId]);
                io.to(sId).emit('admin_gift_received', { 
                    currency, 
                    amount, 
                    message: `🎁 Cadeau Admin global : +${amount} ${currencyLabel} !` 
                });
            }
        } else {
            const cleanTarget = targetUsername.trim().toLowerCase();
            let foundActiveSocketId = null;
            for (let sId in activePlayers) {
                if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === cleanTarget) {
                    foundActiveSocketId = sId;
                    break;
                }
            }

            if (foundActiveSocketId) {
                const targetPlayer = activePlayers[foundActiveSocketId];
                targetPlayer[currency] = (targetPlayer[currency] || 0) + amount;
                await savePlayerToSupabase(foundActiveSocketId);
                io.to(foundActiveSocketId).emit('player_registered', targetPlayer);
                io.to(foundActiveSocketId).emit('admin_gift_received', { currency, amount, message: msg });
            } else {
                const { data: matchedPlayers, error } = await supabase
                    .from('players')
                    .select('*')
                    .ilike('username', targetUsername.trim());

                if (!error && matchedPlayers && matchedPlayers.length > 0) {
                    const targetDbPlayer = matchedPlayers[0];
                    const updatedVal = (targetDbPlayer[currency] || 0) + amount;
                    await supabase
                        .from('players')
                        .update({ [currency]: updatedVal })
                        .eq('id', targetDbPlayer.id);
                }
            }
        }
    });

    socket.on('disconnect', async () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);
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
    for (let code in rooms) {
        const room = rooms[code];
        room.players = room.players.filter(p => (p.socketId || p.id) !== socket.id);
        socket.leave(code);
        if (room.players.length === 0) {
            delete rooms[code];
        } else {
            io.to(code).emit('room_players_update', { players: room.players });
        }
    }
}

function startMatchBetween(id1, id2, isRanked = false, isOnline = true, isTugOfWar = false) {
    const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷", points: 0 };
    const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫🇷", points: 0 };

    const isExpressoActive = globalEvents.expressoMatch && isOnline && !isRanked && !isTugOfWar;

    const match = {
        id1,
        id2,
        timeLeft: isExpressoActive ? 20 : 30,
        players: {
            [id1]: { target: 1, score: 0, pool: generatePool(1) },
            [id2]: { target: 1, score: 0, pool: generatePool(1) }
        },
        isRanked,
        isTugOfWar,
        ropePosition: 0,
        ended: false,
        rematchVotes: {}
    };

    activeMatches[id1] = match;
    activeMatches[id2] = match;

    io.to(id1).emit('start_countdown', { 
        opponent: p2, 
        timeLeft: match.timeLeft, 
        myTarget: 1, 
        myPool: match.players[id1].pool,
        isTugOfWar
    });
    
    io.to(id2).emit('start_countdown', { 
        opponent: p1, 
        timeLeft: match.timeLeft, 
        myTarget: 1, 
        myPool: match.players[id2].pool,
        isTugOfWar
    });

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
            if (!match.ended) {
                match.ended = true;
                endMatch(id1, id2, match, isRanked);
            }
        }
    }, 1000);
}

function generatePool(target) {
    let pool = [target];
    let candidates = [];
    for (let i = 1; i <= 50; i++) if (i !== target) candidates.push(i);
    candidates.sort(() => Math.random() - 0.5);
    return pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
}

function applyPassReward(p, tier, track) {
    p.inventory = p.inventory || {};
    p.unlocked_items = p.unlocked_items || [];
    
    if (track === 'free') {
        if (tier === 1 || tier === 3 || tier === 7) p.coins = (p.coins || 0) + 50;
        else if (tier === 5 || tier === 9 || tier === 10) p.coins = (p.coins || 0) + 100;
        else if (tier === 2 || tier === 8) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
        else if (tier === 4) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
        else if (tier === 6) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    } else if (track === 'premium') {
        if (tier === 1) p.coins = (p.coins || 0) + 100;
        else if (tier === 2 || tier === 6) p.coins = (p.coins || 0) + 150;
        else if (tier === 3) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
        else if (tier === 4 || tier === 8) p.coins = (p.coins || 0) + 200;
        else if (tier === 5) {
            if (!p.unlocked_items.includes('frame_gold')) p.unlocked_items.push('frame_gold');
        }
        else if (tier === 7) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
        else if (tier === 9) {
            if (!p.unlocked_items.includes('theme_alt')) p.unlocked_items.push('theme_alt');
        }
        else if (tier === 10) p.coins = (p.coins || 0) + 500;
    }
}

async function endMatch(id1, id2, matchData, isRanked) {
    // Nettoyage différé après 20 secondes (laisse le temps d'échanger des émotes et demander une revanche)
    setTimeout(() => {
        if (activeMatches[id1] === matchData) delete activeMatches[id1];
        if (activeMatches[id2] === matchData) delete activeMatches[id2];
    }, 20000);

    let winnerId = null;
    let reason = "Temps écoulé !";

    if (matchData.isTugOfWar) {
        if (matchData.ropePosition > 0) winnerId = id1;
        else if (matchData.ropePosition < 0) winnerId = id2;
        if (matchData.ropePosition >= 6) reason = "Corde tirée entièrement ! KO 🪢";
        else if (matchData.ropePosition <= -6) reason = "Corde tirée entièrement ! KO 🪢";
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
            let totalCoins = baseCoins + rushBonus;
            
            p.coins += totalCoins;
            lastMatchEarnings[sId] = totalCoins;
            matchRewards[sId] = { baseCoins, rushBonus, totalCoins };

            if (isWinner && globalEvents.jackpotEclair && Math.random() < 0.03) {
                io.to(sId).emit('trigger_jackpot_wheel');
            }
        }
    }

    if (isRanked && !matchData.isTugOfWar) {
        const p1 = activePlayers[id1];
        const p2 = activePlayers[id2];

        if (p1 && p2) {
            if (winnerId === id1) {
                p1.wins = (p1.wins || 0) + 1;
                p1.points = (p1.points || 0) + 25;

                p2.losses = (p2.losses || 0) + 1;
                if (!globalEvents.rankShield) {
                    p2.points = Math.max(0, (p2.points || 0) - 15);
                }
            } else if (winnerId === id2) {
                p2.wins = (p2.wins || 0) + 1;
                p2.points = (p2.points || 0) + 25;

                p1.losses = (p1.losses || 0) + 1;
                if (!globalEvents.rankShield) {
                    p1.points = Math.max(0, (p1.points || 0) - 15);
                }
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
server.listen(PORT, () => {
    console.log(`🚀 Serveur Chiffre Blitz démarré sur le port ${PORT}`);
});
