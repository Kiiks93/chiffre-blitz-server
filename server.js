const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.static(__dirname));

let players = {};
let waitingPlayer = null;
let rooms = {};
let pendingRoomDeletions = {};

// Grille de prix équilibrée par rapport au nouveau plafond solo (100 pièces max)
const POWERS_PRICES = {
    'spotlight': 30,
    'freeze': 60,
    'joker': 150,
    'nova': 400,
    'quake': 40,
    'micro': 80,
    'eclipse': 200,
    'chaos': 500
};

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

io.on('connection', (socket) => {
    console.log(`Un joueur s'est connecté : ${socket.id}`);

    socket.on('register_player', (profile) => {
        if (!players[socket.id]) {
            players[socket.id] = {
                id: socket.id,
                username: profile.username || 'Joueur',
                region: profile.region || 'Hauts-de-France',
                points: 0,
                coins: 10000,
                trophies: 0,
                inventory: {},
                equippedPower: null
            };
        } else {
            players[socket.id].username = profile.username || players[socket.id].username;
            players[socket.id].region = profile.region || players[socket.id].region;
        }
        socket.emit('player_registered', players[socket.id]);
    });

    socket.on('buy_power', (powerId) => {
        const player = players[socket.id];
        if (!player) return;

        const price = POWERS_PRICES[powerId];
        if (price !== undefined && player.coins >= price) {
            player.coins -= price;
            player.inventory[powerId] = (player.inventory[powerId] || 0) + 1;
            if (!player.equippedPower) player.equippedPower = powerId;

            socket.emit('player_registered', player);
            socket.emit('purchase_success');
        } else {
            socket.emit('room_error', "Fonds insuffisants ou pouvoir invalide !");
        }
    });

    socket.on('equip_power', (powerId) => {
        const player = players[socket.id];
        if (player) {
            if (powerId === null || (player.inventory[powerId] && player.inventory[powerId] > 0)) {
                player.equippedPower = (player.equippedPower === powerId) ? null : powerId;
                socket.emit('player_registered', player);
            }
        }
    });

    // Récompense solo : Plafonnée à 100 pièces max (30 cases en 30s = score de 300 = 100 pièces)
    socket.on('claim_solo_reward', (score) => {
        const player = players[socket.id];
        if (player && typeof score === 'number' && score > 0) {
            const earnedCoins = Math.min(100, Math.floor(score / 3));
            player.coins += earnedCoins;
            socket.emit('player_registered', player);
        }
    });

    socket.on('get_leaderboard', (type) => {
        let playersArray = Object.values(players);
        playersArray.sort((a, b) => b.points - a.points);

        if (type === 'regional' && players[socket.id]) {
            const userRegion = players[socket.id].region;
            playersArray = playersArray.filter(p => p.region === userRegion);
        }

        socket.emit('leaderboard_data', { data: playersArray.slice(0, 20) });
    });

    socket.on('win_tournament', () => {
        const player = players[socket.id];
        if (player) {
            player.points += 50;
            player.coins += 150;
            player.trophies += 1;
            socket.emit('player_registered', player);
            socket.emit('tournament_reward_success', { pointsGained: 50, coinsGained: 150, trophiesGained: 1 });
        }
    });

    socket.on('create_room', (data) => {
        let roomCode = data?.code && data.code.trim() !== '' ? data.code.trim().toUpperCase() : '';

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
            players: [{ id: socket.id, username: data?.username || players[socket.id]?.username || 'Hôte' }],
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
            const username = players[socket.id]?.username || 'Adversaire';
            room.players.push({ id: socket.id, username: username });
            socket.join(roomCode);

            io.to(roomCode).emit('room_players_update', { players: room.players });
            socket.emit('room_joined_success', { code: roomCode, players: room.players });

            if (room.players.length === 2) {
                room.gameStarted = true;
                room.timeLeft = 30;
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

    socket.on('find_1v1_match', () => {
        if (waitingPlayer && waitingPlayer !== socket.id) {
            const p1 = waitingPlayer;
            const p2 = socket.id;
            waitingPlayer = null;

            const roomName = `match_${p1}_${p2}`;
            const s1 = io.sockets.sockets.get(p1);
            const s2 = io.sockets.sockets.get(p2);
            
            if (s1) s1.join(roomName);
            if (s2) s2.join(roomName);

            rooms[roomName] = {
                code: roomName,
                players: [
                    { id: p1, username: players[p1]?.username || 'Joueur 1' },
                    { id: p2, username: players[p2]?.username || 'Joueur 2' }
                ],
                gameStarted: true,
                ended: false,
                timeLeft: 30,
                timerInterval: null,
                matchPlayers: {
                    [p1]: { target: 1, score: 0, pool: generateRandomPool(1) },
                    [p2]: { target: 1, score: 0, pool: generateRandomPool(1) }
                }
            };

            io.to(roomName).emit('start_countdown');
            setTimeout(() => start1v1GameLoop(roomName), 3000);
        } else {
            waitingPlayer = socket.id;
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
        if (waitingPlayer === socket.id) waitingPlayer = null;
        cleanupPlayerFromRooms(socket.id, false);
        delete players[socket.id];
    });
});

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

function end1v1Game(roomCode, reason) {
    let room = rooms[roomCode];
    if (!room || room.ended) return;

    room.ended = true;
    if (room.timerInterval) clearInterval(room.timerInterval);

    let pIds = Object.keys(room.matchPlayers || {});
    if (pIds.length >= 2) {
        let p1Id = pIds[0];
        let p2Id = pIds[1];
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
            if (players[winnerId]) {
                players[winnerId].points += 25;
                if (winnerId === p1Id) coinsGainedP1 = 30;
                else coinsGainedP2 = 30;
            }
            if (players[loserId]) {
                players[loserId].points = Math.max(0, players[loserId].points - 15);
            }
        } else {
            if (players[p1Id]) players[p1Id].points += 5;
            if (players[p2Id]) players[p2Id].points += 5;
        }

        if (players[p1Id]) {
            players[p1Id].coins += coinsGainedP1;
            io.to(p1Id).emit('player_registered', players[p1Id]);
        }
        if (players[p2Id]) {
            players[p2Id].coins += coinsGainedP2;
            io.to(p2Id).emit('player_registered', players[p2Id]);
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
