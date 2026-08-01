const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ ERREUR CRITIQUE : SUPABASE_URL ou SUPABASE_KEY est manquant dans les variables d'environnement de Render !");
}

const supabase = createClient(supabaseUrl, supabaseKey);

let matchmakingQueue = [];
let rankedQueue = [];
let activeGames = {}; 
let customRooms = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Enregistrement / Connexion du joueur
    socket.on('register_player', async (data) => {
        try {
            if (!data || !data.username) {
                console.log("Register error: Données invalides reçues");
                return;
            }
            const cleanUsername = data.username.trim();
            console.log(`Tentative de connexion pour : ${cleanUsername}`);

            let { data: existingPlayer, error: fetchErr } = await supabase
                .from('players')
                .select('*')
                .ilike('username', cleanUsername)
                .maybeSingle();

            if (fetchErr) {
                console.error("Erreur lors de la lecture Supabase (fetch):", fetchErr.message);
                return;
            }

            let player;
            if (!existingPlayer) {
                console.log(`Joueur ${cleanUsername} introuvable, création du profil...`);
                const newPlayerData = {
                    username: cleanUsername,
                    region: data.region || 'Hauts-de-France',
                    avatar: data.avatar || 1,
                    flag: data.flag || '🇫🇷',
                    points: 0,
                    coins: 100,
                    trophies: 0,
                    wins: 0,
                    losses: 0,
                    inventory: { spotlight: 1, freeze: 1 },
                    equipped_power: 'spotlight'
                };
                let { data: inserted, error: insertErr } = await supabase
                    .from('players')
                    .insert([newPlayerData])
                    .select()
                    .single();

                if (insertErr) {
                    console.error("Erreur lors de l'insertion Supabase (insert):", insertErr.message);
                    return;
                }
                player = inserted;
            } else {
                console.log(`Joueur ${cleanUsername} trouvé, mise à jour de la session...`);
                const updateData = {
                    region: data.region || existingPlayer.region,
                    avatar: data.avatar !== undefined ? data.avatar : existingPlayer.avatar,
                    flag: data.flag || existingPlayer.flag
                };
                let { data: updated, error: updateErr } = await supabase
                    .from('players')
                    .update(updateData)
                    .eq('username', existingPlayer.username)
                    .select()
                    .single();

                if (updateErr) {
                    console.error("Erreur lors de la mise à jour Supabase (update):", updateErr.message);
                    player = existingPlayer; // Fallback sur l'existant si l'update échoue
                } else {
                    player = updated;
                }
            }

            socket.playerUsername = player.username;
            socket.playerRegion = player.region;

            socket.emit('player_registered', {
                username: player.username,
                region: player.region,
                avatar: player.avatar,
                flag: player.flag,
                points: player.points || 0,
                coins: player.coins || 0,
                trophies: player.trophies || 0,
                wins: player.wins || 0,
                losses: player.losses || 0,
                inventory: player.inventory || {},
                equippedPower: player.equipped_power || null
            });
            console.log(`Profil envoyé avec succès pour : ${player.username}`);
        } catch (err) {
            console.error("Erreur critique dans register_player:", err.message);
        }
    });

    // Classement
    socket.on('get_leaderboard', async (type) => {
        try {
            let query = supabase.from('players').select('username, region, avatar, flag, points, trophies, coins, wins, losses');
            
            if (type === 'regional' && socket.playerRegion) {
                query = query.eq('region', socket.playerRegion);
            }

            if (type === 'coins') {
                query = query.order('coins', { ascending: false }).limit(20);
            } else {
                query = query.order('points', { ascending: false }).limit(20);
            }

            let { data: topPlayers, error } = await query;
            if (error) { 
                console.error("Erreur leaderboard Supabase:", error.message); 
                socket.emit('leaderboard_data', { type, data: [] });
                return; 
            }

            socket.emit('leaderboard_data', { type, data: topPlayers || [] });
        } catch (err) {
            console.error("Erreur critique get_leaderboard:", err.message);
            socket.emit('leaderboard_data', { type, data: [] });
        }
    });

    // Matchmaking 1v1 Non Classé
    socket.on('find_1v1_match', async () => {
        if (!socket.playerUsername) return;
        matchmakingQueue = matchmakingQueue.filter(s => s.id !== socket.id);
        matchmakingQueue.push(socket);

        if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift();
            const p2 = matchmakingQueue.shift();
            startGameDuel(p1, p2, false);
        }
    });

    // Matchmaking 1v1 Classé (SBMM)
    socket.on('find_ranked_match', async (data) => {
        if (!socket.playerUsername) return;
        rankedQueue = rankedQueue.filter(item => item.socket.id !== socket.id);
        rankedQueue.push({ socket, items: data.items || [] });

        if (rankedQueue.length >= 2) {
            const match1 = rankedQueue.shift();
            const match2 = rankedQueue.shift();
            startGameDuel(match1.socket, match2.socket, true);
        }
    });

    // Récompenses Solo
    socket.on('claim_solo_reward', async (score) => {
        if (!socket.playerUsername) return;
        try {
            let { data: player } = await supabase.from('players').select('*').ilike('username', socket.playerUsername).maybeSingle();
            if (player) {
                const earnedCoins = Math.min(100, Math.floor(score / 3));
                const earnedPoints = Math.floor(score / 5);
                
                const newCoins = (player.coins || 0) + earnedCoins;
                const newPoints = (player.points || 0) + earnedPoints;
                
                let { data: updated } = await supabase
                    .from('players')
                    .update({ coins: newCoins, points: newPoints })
                    .eq('username', player.username)
                    .select()
                    .single();

                if (updated) sendUpdatedProfile(socket, updated);
            }
        } catch (err) {
            console.error("Erreur claim_solo_reward:", err.message);
        }
    });

    // Boutique : Achat d'objets
    socket.on('buy_power', async (powerId) => {
        if (!socket.playerUsername) return;
        const prices = { spotlight: 150, freeze: 350, joker: 600, nova: 1200, quake: 200, micro: 400, eclipse: 800, chaos: 2000 };
        const cost = prices[powerId];
        if (!cost) return;
        try {
            let { data: player } = await supabase.from('players').select('*').ilike('username', socket.playerUsername).maybeSingle();
            if (player && player.coins >= cost) {
                let inventory = player.inventory || {};
                inventory[powerId] = (inventory[powerId] || 0) + 1;
                
                let { data: updated } = await supabase
                    .from('players')
                    .update({ coins: player.coins - cost, inventory: inventory })
                    .eq('username', player.username)
                    .select()
                    .single();

                if (updated) sendUpdatedProfile(socket, updated);
            }
        } catch (err) {
            console.error("Erreur buy_power:", err.message);
        }
    });

    // Boutique : Équiper un objet
    socket.on('equip_power', async (powerId) => {
        if (!socket.playerUsername) return;
        try {
            let { data: player } = await supabase.from('players').select('*').ilike('username', socket.playerUsername).maybeSingle();
            if (player && player.inventory && (player.inventory[powerId] || 0) > 0) {
                const newEquipped = player.equipped_power === powerId ? null : powerId;
                let { data: updated } = await supabase
                    .from('players')
                    .update({ equipped_power: newEquipped })
                    .eq('username', player.username)
                    .select()
                    .single();

                if (updated) sendUpdatedProfile(socket, updated);
            }
        } catch (err) {
            console.error("Erreur equip_power:", err.message);
        }
    });

    // Salons Privés
    socket.on('get_rooms_list', () => { sendRoomsListBroadcast(); });

    socket.on('create_room', (data) => {
        let code = data.code ? data.code.toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase();
        if (customRooms[code]) { socket.emit('room_error', "Ce code existe déjà."); return; }
        customRooms[code] = {
            password: data.password || '',
            players: [{ id: socket.id, username: data.username, avatar: data.avatar, flag: data.flag }]
        };
        socket.roomCode = code;
        socket.join(code);
        socket.emit('room_joined_success', { code, players: customRooms[code].players });
        sendRoomsListBroadcast();
    });

    socket.on('join_room', async (data) => {
        const room = customRooms[data.code];
        if (!room) { socket.emit('room_error', "Salon introuvable."); return; }
        if (room.password && room.password !== data.password) { socket.emit('room_error', "Mot de passe incorrect."); return; }
        if (room.players.length >= 2) { socket.emit('room_error', "Salon complet."); return; }
        try {
            let { data: player } = await supabase.from('players').select('*').ilike('username', socket.playerUsername).maybeSingle();
            room.players.push({
                id: socket.id,
                username: socket.playerUsername,
                avatar: player ? player.avatar : 1,
                flag: player ? player.flag : '🇫🇷'
            });
            socket.roomCode = data.code;
            socket.join(data.code);

            io.to(data.code).emit('room_players_update', { players: room.players });
            socket.emit('room_joined_success', { code: data.code, players: room.players });

            if (room.players.length === 2) {
                const p1 = io.sockets.sockets.get(room.players[0].id);
                const p2 = io.sockets.sockets.get(room.players[1].id);
                delete customRooms[data.code];
                sendRoomsListBroadcast();
                if (p1 && p2) startGameDuel(p1, p2, false);
            }
        } catch (err) {
            console.error("Erreur join_room:", err.message);
        }
    });

    socket.on('leave_room', () => { leaveCurrentRoom(socket); });

    socket.on('disconnect', () => {
        matchmakingQueue = matchmakingQueue.filter(s => s.id !== socket.id);
        rankedQueue = rankedQueue.filter(item => item.socket.id !== socket.id);
        leaveCurrentRoom(socket);
        console.log('User disconnected:', socket.id);
    });
});

function leaveCurrentRoom(socket) {
    if (socket.roomCode && customRooms[socket.roomCode]) {
        customRooms[socket.roomCode].players = customRooms[socket.roomCode].players.filter(p => p.id !== socket.id);
        if (customRooms[socket.roomCode].players.length === 0) delete customRooms[socket.roomCode];
        else io.to(socket.roomCode).emit('room_players_update', { players: customRooms[socket.roomCode].players });
        socket.leave(socket.roomCode);
        socket.roomCode = null;
        sendRoomsListBroadcast();
    }
}

function sendRoomsListBroadcast() {
    const list = Object.keys(customRooms).map(code => ({
        code, hasPassword: !!customRooms[code].password, playersCount: customRooms[code].players.length
    }));
    io.emit('rooms_list_data', list);
}

function sendUpdatedProfile(socket, player) {
    socket.emit('player_registered', {
        username: player.username,
        region: player.region,
        avatar: player.avatar,
        flag: player.flag,
        points: player.points || 0,
        coins: player.coins || 0,
        trophies: player.trophies || 0,
        wins: player.wins || 0,
        losses: player.losses || 0,
        inventory: player.inventory || {},
        equippedPower: player.equipped_power || null
    });
}

async function startGameDuel(p1, p2, isRanked) {
    const gameId = 'game_' + Math.random().toString(36).substring(2, 9);
    
    let { data: dbP1 } = await supabase.from('players').select('*').ilike('username', p1.playerUsername).maybeSingle();
    let { data: dbP2 } = await supabase.from('players').select('*').ilike('username', p2.playerUsername).maybeSingle();

    const p1Data = {
        socket: p1, username: dbP1 ? dbP1.username : p1.playerUsername,
        avatar: dbP1 ? dbP1.avatar : 1, flag: dbP1 ? dbP1.flag : '🇫🇷',
        target: 1, score: 0, pool: generateRandomPool(1)
    };
    const p2Data = {
        socket: p2, username: dbP2 ? dbP2.username : p2.playerUsername,
        avatar: dbP2 ? dbP2.avatar : 1, flag: dbP2 ? dbP2.flag : '🇫🇷',
        target: 1, score: 0, pool: generateRandomPool(1)
    };

    activeGames[gameId] = {
        players: { [p1.id]: p1Data, [p2.id]: p2Data },
        timeLeft: 30, isRanked: isRanked
    };

    p1.gameId = gameId; p2.gameId = gameId;

    p1.emit('start_countdown', { opponent: { username: p2Data.username, avatar: p2Data.avatar, flag: p2Data.flag } });
    p2.emit('start_countdown', { opponent: { username: p1Data.username, avatar: p1Data.avatar, flag: p1Data.flag } });

    setTimeout(() => {
        p1.emit('game_started', { timeLeft: 30, myTarget: 1, myPool: p1Data.pool, opponent: { username: p2Data.username, avatar: p2Data.avatar, flag: p2Data.flag } });
        p2.emit('game_started', { timeLeft: 30, myTarget: 1, myPool: p2Data.pool, opponent: { username: p1Data.username, avatar: p1Data.avatar, flag: p1Data.flag } });

        const timerInterval = setInterval(async () => {
            const game = activeGames[gameId];
            if (!game) { clearInterval(timerInterval); return; }
            game.timeLeft--;
            p1.emit('timer_update', game.timeLeft);
            p2.emit('timer_update', game.timeLeft);

            if (game.timeLeft <= 0) {
                clearInterval(timerInterval);
                await finishGame(gameId, null, "Temps écoulé !");
            }
        }, 1000);
        activeGames[gameId].timerInterval = timerInterval;
    }, 3000);

    p1.removeAllListeners('player_click_1v1'); p2.removeAllListeners('player_click_1v1');
    p1.on('player_click_1v1', (num) => handleTileClick(gameId, p1.id, num));
    p2.on('player_click_1v1', (num) => handleTileClick(gameId, p2.id, num));

    p1.removeAllListeners('use_power'); p2.removeAllListeners('use_power');
    p1.on('use_power', (powerId) => handleUsePower(gameId, p1.id, powerId));
    p2.on('use_power', (powerId) => handleUsePower(gameId, p2.id, powerId));

    p1.removeAllListeners('send_malus'); p2.removeAllListeners('send_malus');
    p1.on('send_malus', (data) => handleSendMalus(gameId, p1.id, data.type));
    p2.on('send_malus', (data) => handleSendMalus(gameId, p2.id, data.type));
}

function generateRandomPool(currentTarget) {
    let pool = [currentTarget];
    let candidates = [];
    for (let i = 1; i <= 50; i++) if (i !== currentTarget) candidates.push(i);
    candidates.sort(() => Math.random() - 0.5);
    return pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
}

async function handleTileClick(gameId, socketId, num) {
    const game = activeGames[gameId];
    if (!game || game.timeLeft <= 0) return;
    const player = game.players[socketId];
    if (!player) return;

    const opponentId = Object.keys(game.players).find(id => id !== socketId);
    const opponent = game.players[opponentId];

    if (num === player.target) {
        player.score += 10;
        player.target++;
        player.pool = generateRandomPool(player.target);

        player.socket.emit('my_grid_updated', { target: player.target, newPool: player.pool, success: true });
        if (opponent) {
            opponent.socket.emit('opponent_progress', { target: player.target, opponent: { username: player.username, avatar: player.avatar, flag: player.flag } });
        }

        if (player.target > 50) {
            clearInterval(game.timerInterval);
            await finishGame(gameId, socketId, `${player.username} a terminé toutes les cibles !`);
        }
    } else {
        player.socket.emit('my_grid_updated', { target: player.target, newPool: player.pool, success: false });
    }
}

function handleUsePower(gameId, socketId, powerId) {
    const game = activeGames[gameId];
    if (!game) return;
    const opponentId = Object.keys(game.players).find(id => id !== socketId);
    if (opponentId && ['quake', 'micro', 'eclipse', 'chaos'].includes(powerId)) {
        game.players[opponentId].socket.emit('receive_malus', { type: powerId });
    }
}

function handleSendMalus(gameId, socketId, type) {
    const game = activeGames[gameId];
    if (!game) return;
    const opponentId = Object.keys(game.players).find(id => id !== socketId);
    if (opponentId) game.players[opponentId].socket.emit('receive_malus', { type });
}

async function finishGame(gameId, forcedWinnerId, reason) {
    const game = activeGames[gameId];
    if (!game) return;
    delete activeGames[gameId];

    const playerIds = Object.keys(game.players);
    const p1Id = playerIds[0];
    const p2Id = playerIds[1];
    const p1Data = game.players[p1Id];
    const p2Data = game.players[p2Id];

    let winnerId = forcedWinnerId;
    if (!winnerId) {
        if (p1Data.target > p2Data.target) winnerId = p1Id;
        else if (p2Data.target > p1Data.target) winnerId = p2Id;
        else {
            if (p1Data.score > p2Data.score) winnerId = p1Id;
            else if (p2Data.score > p1Data.score) winnerId = p2Id;
            else winnerId = null;
        }
    }

    const loserId = winnerId ? playerIds.find(id => id !== winnerId) : null;

    try {
        if (winnerId) {
            const wName = game.players[winnerId].username;
            let { data: wDb } = await supabase.from('players').select('*').ilike('username', wName).maybeSingle();
            if (wDb) {
                const pointsGained = game.isRanked ? 25 : 10;
                await supabase.from('players').update({
                    wins: (wDb.wins || 0) + 1,
                    points: (wDb.points || 0) + pointsGained,
                    coins: (wDb.coins || 0) + 30
                }).eq('username', wDb.username);
            }
        }
        if (loserId) {
            const lName = game.players[loserId].username;
            let { data: lDb } = await supabase.from('players').select('*').ilike('username', lName).maybeSingle();
            if (lDb) {
                const pointsLost = game.isRanked ? 15 : 5;
                await supabase.from('players').update({
                    losses: (lDb.losses || 0) + 1,
                    points: Math.max(0, (lDb.points || 0) - pointsLost),
                    coins: (lDb.coins || 0) + 10
                }).eq('username', lDb.username);
            }
        }
    } catch (err) {
        console.error("Erreur finishGame Supabase:", err.message);
    }

    const resultsData = {
        winnerId: winnerId,
        reason: reason,
        players: {
            [p1Id]: { target: p1Data.target, score: p1Data.score },
            [p2Id]: { target: p2Data.target, score: p2Data.score }
        }
    };

    p1Data.socket.emit('game_over_1v1', resultsData);
    p2Data.socket.emit('game_over_1v1', resultsData);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Chiffre Blitz Server running on port ${PORT}`); });
