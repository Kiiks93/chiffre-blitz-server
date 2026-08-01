const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.static(__dirname));

// Initialisation de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let socketToUser = {}; // Associe un socket.id à un pseudo actif en mémoire rapide
let unrankedQueue = []; // File d'attente non classée
let rankedQueue = [];   // File d'attente classée (objets: { socket, points, joinedAt, items })
let rooms = {};
let pendingRoomDeletions = {};

const POWERS_PRICES = {
    'spotlight': 150,
    'freeze': 350,
    'joker': 600,
    'nova': 1200,
    'quake': 200,
    'micro': 400,
    'eclipse': 800,
    'chaos': 2000
};

// Fonction de calcul des rangs thématiques
function getPlayerRank(points) {
    if (points >= 1300) return { name: 'Calculateur', tier: 4 };
    if (points >= 700)  return { name: 'Expert', tier: 3 };
    if (points >= 300)  return { name: 'Chiffre', tier: 2 };
    return { name: 'Novice', tier: 1 };
}

function generateRandomPool(target) {
    let pool = [target];
    let candidates = [];
    for (let i = 1; i <= 50; i++) {
        if (i !== target) candidates.push(i);
    }
    candidates.sort(() => Math.random() - 0.5);
    pool = pool.concat(candidates.slice(0, 11));
    return pool.sort(() => Math.random() - 0.5);
}

// Fonction utilitaire pour récupérer ou créer un joueur dans Supabase
async function getOrCreatePlayer(username, region) {
    const cleanName = username.trim();
    
    let { data, error } = await supabase
        .from('players')
        .select('*')
        .ilike('username', cleanName)
        .single();

    if (!data) {
        const newPlayer = {
            username: cleanName,
            region: region || 'Hauts-de-France',
            country: 'FR',
            points: 0,
            coins: 10000,
            trophies: 0,
            inventory: {},
            equipped_power: null,
            wins: 0,
            losses: 0
        };
        const { data: inserted, error: insertErr } = await supabase
            .from('players')
            .insert([newPlayer])
            .select()
            .single();
        return inserted;
    } else {
        if (region && data.region !== region) {
            await supabase
                .from('players')
                .update({ region: region })
                .eq('id', data.id);
            data.region = region;
        }
        return data;
    }
}

// Fonction utilitaire pour sauvegarder les modifications d'un joueur dans Supabase
async function updatePlayerInDB(player) {
    if (!player || !player.id) return;
    await supabase
        .from('players')
        .update({
            points: player.points,
            coins: player.coins,
            trophies: player.trophies,
            inventory: player.inventory,
            equipped_power: player.equipped_power,
            wins: player.wins,
            losses: player.losses,
            region: player.region
        })
        .eq('id', player.id);
}

// --- BOUCLE SBMM ÉLASTIQUE (MATCHMAKING CLASSÉ) ---
setInterval(() => {
    if (rankedQueue.length < 2) return;

    for (let i = 0; i < rankedQueue.length; i++) {
        for (let j = i + 1; j < rankedQueue.length; j++) {
            let p1 = rankedQueue[i];
            let p2 = rankedQueue[j];

            let waitTime = (Date.now() - Math.min(p1.joinedAt, p2.joinedAt)) / 1000;
            let pointDiff = Math.abs(p1.points - p2.points);

            // Tolérance SBMM progressive pour éviter tout blocage (ex: 0 vs 25 points)
            let allowedDiff = 40;  // Phase 1 (0-10s) : Tranche très proche
            if (waitTime > 10) allowedDiff = 150;  // Phase 2 (10-25s) : Tolérance large dans le rang
            if (waitTime > 25) allowedDiff = 1000; // Phase 3 (25s+) : Ouverture maximale pour lancer à coup sûr

            if (pointDiff <= allowedDiff || waitTime > 25) {
                rankedQueue.splice(j, 1);
                rankedQueue.splice(i, 1);
                startRankedMatchSession(p1, p2);
                return;
            }
        }
    }
}, 1000);

// --- BOUCLE MATCHMAKING NON CLASSÉ ---
setInterval(() => {
    if (unrankedQueue.length >= 2) {
        let s1 = unrankedQueue.shift();
        let s2 = unrankedQueue.shift();
        startUnrankedMatchSession(s1, s2);
    }
}, 1000);

io.on('connection', (socket) => {
    console.log(`Un joueur s'est connecté : ${socket.id}`);

    socket.on('register_player', async (profile) => {
        const username = profile && profile.username ? profile.username.trim() : '';
        if (!username) return;

        for (let sId in socketToUser) {
            if (socketToUser[sId].toLowerCase() === username.toLowerCase()) {
                delete socketToUser[sId];
            }
        }

        let dbPlayer = await getOrCreatePlayer(username, profile.region);
        if (!dbPlayer) return;

        socketToUser[socket.id] = username;

        socket.emit('player_registered', {
            username: dbPlayer.username,
            region: dbPlayer.region,
            points: dbPlayer.points,
            coins: dbPlayer.coins,
            trophies: dbPlayer.trophies,
            inventory: dbPlayer.inventory || {},
            equippedPower: dbPlayer.equipped_power
        });
    });

    socket.on('buy_power', async (powerId) => {
        const username = socketToUser[socket.id];
        if (!username) return;

        let dbPlayer = await getOrCreatePlayer(username);
        const price = POWERS_PRICES[powerId];

        if (price !== undefined && dbPlayer.coins >= price) {
            dbPlayer.coins -= price;
            if (!dbPlayer.inventory) dbPlayer.inventory = {};
            dbPlayer.inventory[powerId] = (dbPlayer.inventory[powerId] || 0) + 1;
            if (!dbPlayer.equipped_power) dbPlayer.equipped_power = powerId;

            await updatePlayerInDB(dbPlayer);

            socket.emit('player_registered', {
                username: dbPlayer.username,
                region: dbPlayer.region,
                points: dbPlayer.points,
                coins: dbPlayer.coins,
                trophies: dbPlayer.trophies,
                inventory: dbPlayer.inventory,
                equippedPower: dbPlayer.equipped_power
            });
            socket.emit('purchase_success');
        } else {
            socket.emit('room_error', "Fonds insuffisants ou pouvoir invalide !");
        }
    });

    socket.on('equip_power', async (powerId) => {
        const username = socketToUser[socket.id];
        if (!username) return;

        let dbPlayer = await getOrCreatePlayer(username);
        if (dbPlayer) {
            if (powerId === null || (dbPlayer.inventory && dbPlayer.inventory[powerId] && dbPlayer.inventory[powerId] > 0)) {
                dbPlayer.equipped_power = (dbPlayer.equipped_power === powerId) ? null : powerId;
                await updatePlayerInDB(dbPlayer);

                socket.emit('player_registered', {
                    username: dbPlayer.username,
                    region: dbPlayer.region,
                    points: dbPlayer.points,
                    coins: dbPlayer.coins,
                    trophies: dbPlayer.trophies,
                    inventory: dbPlayer.inventory || {},
                    equippedPower: dbPlayer.equipped_power
                });
            }
        }
    });

    socket.on('use_power', async (powerId) => {
        const username = socketToUser[socket.id];
        if (!username) return;

        let dbPlayer = await getOrCreatePlayer(username);
        if (dbPlayer && dbPlayer.inventory && dbPlayer.inventory[powerId] && dbPlayer.inventory[powerId] > 0) {
            dbPlayer.inventory[powerId]--;
            if (dbPlayer.inventory[powerId] <= 0) {
                delete dbPlayer.inventory[powerId];
                if (dbPlayer.equipped_power === powerId) {
                    dbPlayer.equipped_power = null;
                }
            }
            await updatePlayerInDB(dbPlayer);

            socket.emit('player_registered', {
                username: dbPlayer.username,
                region: dbPlayer.region,
                points: dbPlayer.points,
                coins: dbPlayer.coins,
                trophies: dbPlayer.trophies,
                inventory: dbPlayer.inventory,
                equippedPower: dbPlayer.equipped_power
            });
        }
    });

    socket.on('claim_solo_reward', async (score) => {
        const username = socketToUser[socket.id];
        if (!username) return;

        let dbPlayer = await getOrCreatePlayer(username);
        if (dbPlayer && typeof score === 'number' && score > 0) {
            const earnedCoins = Math.min(100, Math.floor(score / 3));
            dbPlayer.coins += earnedCoins;
            await updatePlayerInDB(dbPlayer);

            socket.emit('player_registered', {
                username: dbPlayer.username,
                region: dbPlayer.region,
                points: dbPlayer.points,
                coins: dbPlayer.coins,
                trophies: dbPlayer.trophies,
                inventory: dbPlayer.inventory || {},
                equippedPower: dbPlayer.equipped_power
            });
        }
    });

    socket.on('get_leaderboard', async (type) => {
        const username = socketToUser[socket.id];
        let query = supabase.from('players').select('username, points, region, avatar, flag').order('points', { ascending: false }).limit(20);

        if (type === 'regional' && username) {
            let dbPlayer = await getOrCreatePlayer(username);
            if (dbPlayer) {
                query = query.eq('region', dbPlayer.region);
            }
        }

        const { data, error } = await query;
        socket.emit('leaderboard_data', { data: data || [] });
    });

    socket.on('win_tournament', async () => {
        const username = socketToUser[socket.id];
        if (!username) return;

        let dbPlayer = await getOrCreatePlayer(username);
        if (dbPlayer) {
            dbPlayer.points += 50;
            dbPlayer.coins += 150;
            dbPlayer.trophies += 1;
            await updatePlayerInDB(dbPlayer);

            socket.emit('player_registered', {
                username: dbPlayer.username,
                region: dbPlayer.region,
                points: dbPlayer.points,
                coins: dbPlayer.coins,
                trophies: dbPlayer.trophies,
                inventory: dbPlayer.inventory || {},
                equippedPower: dbPlayer.equipped_power
            });
            socket.emit('tournament_reward_success', { pointsGained: 50, coinsGained: 150, trophiesGained: 1 });
        }
    });

    socket.on('create_room', (data) => {
        let roomCode = data?.code && data.code.trim() !== '' ? data.code.trim().toUpperCase() : '';
        const username = socketToUser[socket.id] || data?.username || 'Hôte';

        if (roomCode !== '' && rooms[roomCode]) {
            socket.emit('room_error', "Ce nom de salon est déjà utilisé. Veuillez en choisir un autre.");
            return;
        }

        if (roomCode === '') {
            do {
                roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            } while (rooms[roomCode]);
        }

        if (pendingRoomDeletions[roomCode]) {
            clearTimeout(pendingRoomDeletions[roomCode]);
            delete pendingRoomDeletions[roomCode];
        }

        rooms[roomCode] = {
            code: roomCode,
            password: data?.password || '',
            host: socket.id,
            players: [{ id: socket.id, username: username }],
            gameStarted: false,
            ended: false,
            timerInterval: null
        };

        socket.join(roomCode);
        socket.emit('room_joined_success', { code: roomCode, players: rooms[roomCode].players });
    });

    socket.on('join_room', (data) => {
        const roomCode = data?.code ? data.code.toUpperCase() : '';
        const passwordInput = (typeof data?.password === 'string') ? data.password : '';
        const room = rooms[roomCode];

        if (room && !room.gameStarted && room.players.length < 2) {
            if (room.password && room.password !== passwordInput) {
                socket.emit('room_error', "Mot de passe incorrect !");
                return;
            }
            const username = socketToUser[socket.id] || 'Adversaire';
            room.players.push({ id: socket.id, username: username });
            socket.join(roomCode);

            io.to(roomCode).emit('room_players_update', { players: room.players });
            socket.emit('room_joined_success', { code: roomCode, players: room.players });

            if (room.players.length === 2) {
                room.gameStarted = true;
                room.timeLeft = 30;
                room.isRanked = false;
                room.matchPlayers = {
                    [room.players[0].id]: { target: 1, score: 0, pool: generateRandomPool(1) },
                    [room.players[1].id]: { target: 1, score: 0, pool: generateRandomPool(1) }
                };
                io.to(roomCode).emit('start_countdown');
                setTimeout(() => start1v1GameLoop(roomCode), 3000);
            }
        } else {
            socket.emit('room_error', "Salon introuvable, complet ou partie déjà commencée !");
        }
    });

    socket.on('leave_room', () => {
        cleanupPlayerFromRooms(socket.id, true);
    });

    socket.on('get_rooms_list', () => {
        const openRooms = Object.values(rooms)
            .filter(r => r.players.length < 2 && !r.gameStarted)
            .map(r => ({ 
                code: r.code, 
                playersCount: r.players.length,
                hasPassword: r.password !== '' 
            }));
        socket.emit('rooms_list_data', openRooms);
    });

    // Matchmaking Non Classé
    socket.on('find_1v1_match', () => {
        if (!unrankedQueue.includes(socket) && !rankedQueue.some(p => p.socket === socket)) {
            unrankedQueue.push(socket);
        }
    });

    // Matchmaking Classé (avec sélection de 2 objets / loadout)
    socket.on('find_ranked_match', async (data) => {
        const username = socketToUser[socket.id];
        let currentPoints = 0;
        if (username) {
            let dbPlayer = await getOrCreatePlayer(username);
            if (dbPlayer) currentPoints = dbPlayer.points;
        }

        if (!rankedQueue.some(p => p.socket === socket) && !unrankedQueue.includes(socket)) {
            rankedQueue.push({
                socket: socket,
                points: currentPoints,
                joinedAt: Date.now(),
                items: data?.items || []
            });
        }
    });

    socket.on('player_click_1v1', (num) => {
        let roomCode = null;
        for (const code in rooms) {
            if (rooms[code].matchPlayers && rooms[code].matchPlayers[socket.id]) {
                roomCode = code;
                break;
            }
        }
        if (!roomCode) return;

        let room = rooms[roomCode];
        if (!room || room.ended || room.timeLeft <= 0) return;

        let pData = room.matchPlayers[socket.id];
        if (num === pData.target) {
            pData.score += 10;
            pData.target++;
            pData.pool = generateRandomPool(pData.target);
            socket.emit('my_grid_updated', { target: pData.target, newPool: pData.pool, success: true });
            socket.to(roomCode).emit('opponent_progress', { target: pData.target, score: pData.score });
        } else {
            socket.emit('my_grid_updated', { target: pData.target, newPool: pData.pool, success: false });
        }
    });

    socket.on('send_malus', (data) => {
        for (const code in rooms) {
            if (rooms[code].matchPlayers && rooms[code].matchPlayers[socket.id]) {
                socket.to(code).emit('receive_malus', data);
                break;
            }
        }
    });

    socket.on('disconnect', () => {
        unrankedQueue = unrankedQueue.filter(s => s !== socket);
        rankedQueue = rankedQueue.filter(p => p.socket !== socket);
        cleanupPlayerFromRooms(socket.id, false);
        delete socketToUser[socket.id];
    });
});

// Lancement d'un match non classé
function startUnrankedMatchSession(socket1, socket2) {
    const roomName = `unranked_${socket1.id}_${socket2.id}`;
    socket1.join(roomName);
    socket2.join(roomName);

    rooms[roomName] = {
        code: roomName,
        isRanked: false,
        players: [
            { id: socket1.id, username: socketToUser[socket1.id] || 'Joueur 1' },
            { id: socket2.id, username: socketToUser[socket2.id] || 'Joueur 2' }
        ],
        gameStarted: true,
        ended: false,
        timeLeft: 30,
        timerInterval: null,
        matchPlayers: {
            [socket1.id]: { target: 1, score: 0, pool: generateRandomPool(1) },
            [socket2.id]: { target: 1, score: 0, pool: generateRandomPool(1) }
        }
    };

    io.to(roomName).emit('start_countdown');
    setTimeout(() => start1v1GameLoop(roomName), 3000);
}

// Lancement d'un match classé (SBMM)
function startRankedMatchSession(entry1, entry2) {
    const socket1 = entry1.socket;
    const socket2 = entry2.socket;
    const roomName = `ranked_${socket1.id}_${socket2.id}`;

    socket1.join(roomName);
    socket2.join(roomName);

    rooms[roomName] = {
        code: roomName,
        isRanked: true,
        players: [
            { id: socket1.id, username: socketToUser[socket1.id] || 'Joueur 1' },
            { id: socket2.id, username: socketToUser[socket2.id] || 'Joueur 2' }
        ],
        gameStarted: true,
        ended: false,
        timeLeft: 30,
        timerInterval: null,
        matchPlayers: {
            [socket1.id]: { target: 1, score: 0, pool: generateRandomPool(1) },
            [socket2.id]: { target: 1, score: 0, pool: generateRandomPool(1) }
        }
    };

    io.to(roomName).emit('start_countdown');
    setTimeout(() => start1v1GameLoop(roomName), 3000);
}

function cleanupPlayerFromRooms(socketId, explicitLeave = false) {
    for (const code in rooms) {
        const room = rooms[code];
        const wasInMatch = room.matchPlayers && room.matchPlayers[socketId];
        room.players = room.players.filter(p => p.id !== socketId);
        
        if (wasInMatch) {
            if (!room.ended) {
                room.ended = true;
                if (room.timerInterval) clearInterval(room.timerInterval);
                io.to(code).emit('room_error', "L'adversaire s'est déconnecté.");
            }
            delete rooms[code];
        } else if (room.players.length === 0) {
            if (explicitLeave) {
                if (room.timerInterval) clearInterval(room.timerInterval);
                delete rooms[code];
            } else {
                if (!pendingRoomDeletions[code]) {
                    pendingRoomDeletions[code] = setTimeout(() => {
                        if (rooms[code] && rooms[code].players.length === 0) {
                            if (rooms[code].timerInterval) clearInterval(rooms[code].timerInterval);
                            delete rooms[code];
                        }
                        delete pendingRoomDeletions[code];
                    }, 15000);
                }
            }
        } else {
            io.to(code).emit('room_players_update', { players: room.players });
        }
    }
}

function start1v1GameLoop(roomCode) {
    let room = rooms[roomCode];
    if (!room || room.ended) return;

    if (room.timerInterval) clearInterval(room.timerInterval);

    for (let pId in room.matchPlayers) {
        io.to(pId).emit('game_started', {
            timeLeft: room.timeLeft,
            myTarget: room.matchPlayers[pId].target,
            myPool: room.matchPlayers[pId].pool
        });
    }

    room.timerInterval = setInterval(() => {
        if (!rooms[roomCode] || rooms[roomCode].ended) {
            clearInterval(room.timerInterval);
            return;
        }
        room.timeLeft--;
        io.to(roomCode).emit('timer_update', room.timeLeft);

        if (room.timeLeft <= 0) {
            clearInterval(room.timerInterval);
            end1v1Game(roomCode, "Temps écoulé !");
        }
    }, 1000);
}

async function end1v1Game(roomCode, reason) {
    let room = rooms[roomCode];
    if (!room || room.ended) return;

    room.ended = true;
    if (room.timerInterval) clearInterval(room.timerInterval);

    let pIds = Object.keys(room.matchPlayers || {});
    if (pIds.length >= 2) {
        let p1Id = pIds[0];
        let p2Id = pIds[1];
        let u1 = socketToUser[p1Id];
        let u2 = socketToUser[p2Id];
        let p1 = room.matchPlayers[p1Id];
        let p2 = room.matchPlayers[p2Id];

        let winnerId = null;
        if (p1.score > p2.score) {
            winnerId = p1Id;
        } else if (p2.score > p1.score) {
            winnerId = p2Id;
        }

        let coinsGainedP1 = 10;
        let coinsGainedP2 = 10;

        if (winnerId) {
            let loserId = (winnerId === p1Id) ? p2Id : p1Id;
            let winningUser = socketToUser[winnerId];
            let losingUser = socketToUser[loserId];

            if (winningUser) {
                let pWin = await getOrCreatePlayer(winningUser);
                if (pWin) {
                    if (room.isRanked) {
                        pWin.points += 25; // Gain de points SR en Classé
                    } else {
                        pWin.points += 5;  // Petit bonus en non-classé
                    }
                    pWin.wins = (pWin.wins || 0) + 1;
                    if (winnerId === p1Id) coinsGainedP1 = 30;
                    else coinsGainedP2 = 30;
                    await updatePlayerInDB(pWin);
                }
            }
            if (losingUser) {
                let pLose = await getOrCreatePlayer(losingUser);
                if (pLose) {
                    if (room.isRanked) {
                        pLose.points = Math.max(0, pLose.points - 20); // Perte de points SR en Classé (plancher à 0)
                    }
                    pLose.losses = (pLose.losses || 0) + 1;
                    await updatePlayerInDB(pLose);
                }
            }
        } else {
            // Égalité
            if (u1) {
                let p1Obj = await getOrCreatePlayer(u1);
                if (p1Obj) { p1Obj.points += room.isRanked ? 0 : 2; await updatePlayerInDB(p1Obj); }
            }
            if (u2) {
                let p2Obj = await getOrCreatePlayer(u2);
                if (p2Obj) { p2Obj.points += room.isRanked ? 0 : 2; await updatePlayerInDB(p2Obj); }
            }
        }

        if (u1) {
            let dbP1 = await getOrCreatePlayer(u1);
            dbP1.coins += coinsGainedP1;
            await updatePlayerInDB(dbP1);
            io.to(p1Id).emit('player_registered', {
                username: dbP1.username, region: dbP1.region, points: dbP1.points,
                coins: dbP1.coins, trophies: dbP1.trophies, inventory: dbP1.inventory || {}, equippedPower: dbP1.equipped_power
            });
        }
        if (u2) {
            let dbP2 = await getOrCreatePlayer(u2);
            dbP2.coins += coinsGainedP2;
            await updatePlayerInDB(dbP2);
            io.to(p2Id).emit('player_registered', {
                username: dbP2.username, region: dbP2.region, points: dbP2.points,
                coins: dbP2.coins, trophies: dbP2.trophies, inventory: dbP2.inventory || {}, equippedPower: dbP2.equipped_power
            });
        }

        let formattedPlayers = {
            [p1Id]: { target: p1.target, score: p1.score },
            [p2Id]: { target: p2.target, score: p2.score }
        };

        io.to(roomCode).emit('game_over_1v1', { reason: reason, winnerId: winnerId, players: formattedPlayers });
    }
    delete rooms[roomCode];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur actif sur le port ${PORT}`);
});
