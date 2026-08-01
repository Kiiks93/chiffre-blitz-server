const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

let players = {};
let activeGames = {};
let customRooms = {};
let unrankedQueue = [];
let rankedQueue = [];
let trapQueue = [];

let globalEvents = {
    coinRush: false,
    rankShield: false,
    expressoMatch: false,
    chaosMode: false,
    jackpotEclair: false,
    saboteurMode: true
};

const ADMIN_PASSWORD = "adminsecretpassword";

function generateShuffledPool() {
    let pool = [];
    for (let i = 1; i <= 16; i++) pool.push(i);
    return pool.sort(() => Math.random() - 0.5);
}

function generateRandomTraps(count) {
    let traps = [];
    while (traps.length < count) {
        let randomTile = Math.floor(Math.random() * 16) + 1;
        if (!traps.includes(randomTile)) traps.push(randomTile);
    }
    return traps;
}

io.on('connection', (socket) => {
    console.log(`Utilisateur connecté : ${socket.id}`);

    socket.on('register_player', (data) => {
        players[socket.id] = {
            id: socket.id,
            username: data.username || 'Joueur',
            region: data.region || 'Hauts-de-France',
            avatar: data.avatar || 1,
            flag: data.flag || '🇫🇷',
            points: 100,
            coins: 500,
            trophies: 0,
            wins: 0,
            losses: 0,
            inventory: { spotlight: 2, freeze: 1, quake: 1 },
            equippedPower: 'spotlight'
        };
        socket.emit('player_registered', players[socket.id]);
        socket.emit('events_state_update', globalEvents);
    });

    socket.on('find_1v1_match', () => {
        const player = players[socket.id] || { username: 'Joueur', avatar: 1, flag: '🇫🇷', points: 100, coins: 0, trophies: 0, inventory: {}, equippedPower: null };
        
        unrankedQueue = unrankedQueue.filter(item => item.socket.id !== socket.id);
        unrankedQueue.push({ socket, profile: player });

        if (unrankedQueue.length >= 2) {
            const p1 = unrankedQueue.shift();
            const p2 = unrankedQueue.shift();
            const roomId = 'match_' + Math.random().toString(36).substring(2, 7);

            p1.socket.join(roomId);
            p2.socket.join(roomId);

            const timeLimit = globalEvents.expressoMatch ? 20 : 30;

            activeGames[roomId] = {
                roomId,
                mode: 'unranked',
                timeLeft: timeLimit,
                players: {
                    [p1.socket.id]: { socket: p1.socket, target: 1, pool: generateShuffledPool(), score: 0, profile: p1.profile },
                    [p2.socket.id]: { socket: p2.socket, target: 1, pool: generateShuffledPool(), score: 0, profile: p2.profile }
                }
            };

            [p1.socket, p2.socket].forEach(sock => {
                const opp = (sock.id === p1.socket.id) ? p2 : p1;
                sock.emit('start_countdown', {
                    myTarget: 1,
                    myPool: activeGames[roomId].players[sock.id].pool,
                    opponent: opp.profile,
                    timeLeft: timeLimit
                });
            });

            startGameTimer(roomId);
        }
    });

    socket.on('find_saboteur_match', (data) => {
        const chosenMalus = data.chosenMalus || [];
        const player = players[socket.id] || { username: 'Joueur', avatar: 1, flag: '🇫🇷', points: 100, coins: 0, trophies: 0, inventory: {}, equippedPower: null };

        trapQueue = trapQueue.filter(item => item.socket.id !== socket.id);
        trapQueue.push({ socket, profile: player, chosenMalus });

        if (trapQueue.length >= 2) {
            const p1 = trapQueue.shift();
            const p2 = trapQueue.shift();
            const roomId = 'trap_' + Math.random().toString(36).substring(2, 7);

            p1.socket.join(roomId);
            p2.socket.join(roomId);

            const timeLimit = globalEvents.expressoMatch ? 20 : 30;

            activeGames[roomId] = {
                roomId,
                mode: 'trap',
                timeLeft: timeLimit,
                players: {
                    [p1.socket.id]: {
                        socket: p1.socket,
                        target: 1,
                        pool: generateShuffledPool(),
                        score: 0,
                        profile: p1.profile,
                        chosenMalus: p1.chosenMalus,
                        traps: generateRandomTraps(2)
                    },
                    [p2.socket.id]: {
                        socket: p2.socket,
                        target: 1,
                        pool: generateShuffledPool(),
                        score: 0,
                        profile: p2.profile,
                        chosenMalus: p2.chosenMalus,
                        traps: generateRandomTraps(2)
                    }
                }
            };

            [p1.socket, p2.socket].forEach(sock => {
                const opp = (sock.id === p1.socket.id) ? p2 : p1;
                sock.emit('start_countdown', {
                    myTarget: 1,
                    myPool: activeGames[roomId].players[sock.id].pool,
                    opponent: opp.profile,
                    timeLeft: timeLimit
                });
            });

            startGameTimer(roomId);
        }
    });

    socket.on('player_click_1v1', (clickedNum) => {
        const roomId = getPlayerRoomId(socket.id);
        if (!roomId || !activeGames[roomId]) return;

        const game = activeGames[roomId];
        const player = game.players[socket.id];
        const oppId = Object.keys(game.players).find(id => id !== socket.id);
        const opponent = game.players[oppId];

        if (clickedNum === player.target) {
            player.target++;
            player.pool = generateShuffledPool();
            player.score += 10;

            if (game.mode === 'trap' && opponent && opponent.traps.includes(clickedNum)) {
                const triggeredMalus = opponent.chosenMalus[Math.floor(Math.random() * opponent.chosenMalus.length)];
                if (triggeredMalus === 'inversion') {
                    player.pool.sort(() => Math.random() - 0.5);
                } else if (triggeredMalus === 'gel') {
                    socket.emit('receive_malus', { type: 'freeze' });
                } else if (triggeredMalus === 'penalite') {
                    player.score = Math.max(0, player.score - 25);
                }
            }

            socket.emit('my_grid_updated', {
                target: player.target,
                newPool: player.pool,
                success: true
            });

            if (opponent && opponent.socket) {
                opponent.socket.emit('opponent_progress', {
                    target: player.target,
                    score: player.score
                });
            }

            if (player.target > 20) {
                endGame(roomId, socket.id, "Objectif atteint !");
            }
        } else {
            socket.emit('my_grid_updated', {
                target: player.target,
                newPool: player.pool,
                success: false
            });
        }
    });

    socket.on('send_malus', (data) => {
        const roomId = getPlayerRoomId(socket.id);
        if (!roomId || !activeGames[roomId]) return;
        const game = activeGames[roomId];
        const oppId = Object.keys(game.players).find(id => id !== socket.id);
        if (oppId && game.players[oppId] && game.players[oppId].socket) {
            game.players[oppId].socket.emit('receive_malus', data);
        }
    });

    socket.on('buy_power', (powerId) => {
        const player = players[socket.id];
        if (!player) return;
        const prices = { spotlight: 150, freeze: 350, joker: 600, nova: 1200, quake: 200, micro: 400, eclipse: 800, chaos: 2000 };
        const price = prices[powerId] || 100;
        if (player.coins >= price) {
            player.coins -= price;
            player.inventory[powerId] = (player.inventory[powerId] || 0) + 1;
            socket.emit('player_registered', player);
        }
    });

    socket.on('equip_power', (powerId) => {
        const player = players[socket.id];
        if (player && (player.inventory[powerId] || 0) > 0) {
            player.equippedPower = powerId;
            socket.emit('player_registered', player);
        }
    });

    socket.on('claim_solo_reward', (score) => {
        const player = players[socket.id];
        if (!player) return;
        let baseCoins = Math.floor(score / 5);
        let rushBonus = globalEvents.coinRush ? baseCoins : 0;
        let totalCoins = baseCoins + rushBonus;
        player.coins += totalCoins;

        let triggerWheel = Math.random() < 0.25;

        socket.emit('solo_reward_result', {
            baseCoins,
            rushBonus,
            earnedCoins: totalCoins,
            triggerWheel
        });
        socket.emit('player_registered', player);
    });

    socket.on('spin_jackpot_wheel', () => {
        const player = players[socket.id];
        if (!player) return;

        const outcomes = ['jackpot', 'objet', 'rien', 'banqueroute'];
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        let coinDelta = 0;
        let awardedItem = null;
        let targetAngle = 0;

        if (outcome === 'jackpot') {
            coinDelta = 150;
            player.coins += coinDelta;
            targetAngle = 360 * 3 + 45;
        } else if (outcome === 'objet') {
            awardedItem = 'spotlight';
            player.inventory[awardedItem] = (player.inventory[awardedItem] || 0) + 1;
            targetAngle = 360 * 3 + 135;
        } else if (outcome === 'rien') {
            targetAngle = 360 * 3 + 225;
        } else {
            coinDelta = -50;
            player.coins = Math.max(0, player.coins + coinDelta);
            targetAngle = 360 * 3 + 315;
        }

        socket.emit('jackpot_wheel_result', {
            outcome,
            coinDelta,
            awardedItem,
            targetAngle
        });
        socket.emit('player_registered', player);
    });

    socket.on('double_reward', () => {
        const player = players[socket.id];
        if (player) {
            player.coins += 30;
            socket.emit('player_registered', player);
        }
    });

    socket.on('get_leaderboard', (type) => {
        const allPlayers = Object.values(players);
        socket.emit('leaderboard_data', { type, data: allPlayers });
    });

    socket.on('create_room', (data) => {
        const code = data.code || Math.random().toString(36).substring(2, 6).toUpperCase();
        customRooms[code] = {
            code,
            password: data.password || '',
            players: [{ socketId: socket.id, username: data.username, avatar: data.avatar, flag: data.flag }]
        };
        socket.join(code);
        socket.emit('room_joined_success', { code, players: customRooms[code].players });
        broadcastRoomsList();
    });

    socket.on('join_room', (data) => {
        const room = customRooms[data.code];
        if (!room) {
            socket.emit('room_error', "Salon introuvable !");
            return;
        }
        if (room.password && room.password !== data.password) {
            socket.emit('room_error', "Mot de passe incorrect !");
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('room_error', "Salon complet !");
            return;
        }

        const player = players[socket.id] || { username: 'Joueur', avatar: 1, flag: '🇫🇷' };
        room.players.push({ socketId: socket.id, username: player.username, avatar: player.avatar, flag: player.flag });
        socket.join(data.code);

        io.to(data.code).emit('room_players_update', { players: room.players });
        socket.emit('room_joined_success', { code: data.code, players: room.players });
        broadcastRoomsList();
    });

    socket.on('leave_room', () => {
        leaveCustomRoomHelper(socket);
    });

    socket.on('get_rooms_list', () => {
        broadcastRoomsList();
    });

    socket.on('admin_auth', (pass) => {
        if (pass === ADMIN_PASSWORD) {
            socket.emit('admin_auth_success', { events: globalEvents });
        } else {
            socket.emit('admin_auth_fail', "Mot de passe admin incorrect !");
        }
    });

    socket.on('admin_update_events', (events) => {
        globalEvents = events;
        io.emit('events_state_update', globalEvents);
    });

    socket.on('admin_broadcast_message', (msg) => {
        io.emit('global_announcement', msg);
    });

    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté : ${socket.id}`);
        unrankedQueue = unrankedQueue.filter(item => item.socket.id !== socket.id);
        rankedQueue = rankedQueue.filter(item => item.socket.id !== socket.id);
        trapQueue = trapQueue.filter(item => item.socket.id !== socket.id);
        leaveCustomRoomHelper(socket);
        delete players[socket.id];
    });
});

function getPlayerRoomId(socketId) {
    for (let roomId in activeGames) {
        if (activeGames[roomId].players[socketId]) return roomId;
    }
    return null;
}

function startGameTimer(roomId) {
    const game = activeGames[roomId];
    if (!game) return;

    const interval = setInterval(() => {
        game.timeLeft--;
        io.to(roomId).emit('timer_update', game.timeLeft);

        if (game.timeLeft <= 0) {
            clearInterval(interval);
            determineGameWinner(roomId);
        }
    }, 1000);
}

function determineGameWinner(roomId) {
    const game = activeGames[roomId];
    if (!game) return;

    let pIds = Object.keys(game.players);
    if (pIds.length < 2) {
        delete activeGames[roomId];
        return;
    }

    const p1 = game.players[pIds[0]];
    const p2 = game.players[pIds[1]];

    let winnerId = null;
    if (p1.target > p2.target) winnerId = p1.socket.id;
    else if (p2.target > p1.target) winnerId = p2.socket.id;
    else {
        if (p1.score > p2.score) winnerId = p1.socket.id;
        else if (p2.score > p1.score) winnerId = p2.socket.id;
    }

    endGame(roomId, winnerId, "Temps écoulé !");
}

function endGame(roomId, winnerId, reason) {
    const game = activeGames[roomId];
    if (!game) return;

    let rewards = {};
    Object.keys(game.players).forEach(id => {
        let baseCoins = (winnerId === id) ? 50 : 25;
        let rushBonus = globalEvents.coinRush ? baseCoins : 0;
        rewards[id] = { baseCoins, rushBonus, totalCoins: baseCoins + rushBonus };
        if (players[id]) players[id].coins += rewards[id].totalCoins;
    });

    io.to(roomId).emit('game_over_1v1', {
        winnerId,
        reason,
        players: Object.fromEntries(Object.entries(game.players).map(([id, p]) => [id, { target: p.target, score: p.score }])),
        rewards
    });

    delete activeGames[roomId];
}

function leaveCustomRoomHelper(socket) {
    for (let code in customRooms) {
        let room = customRooms[code];
        let idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
            room.players.splice(idx, 1);
            socket.leave(code);
            if (room.players.length === 0) {
                delete customRooms[code];
            } else {
                io.to(code).emit('room_players_update', { players: room.players });
            }
            broadcastRoomsList();
            break;
        }
    }
}

function broadcastRoomsList() {
    const list = Object.values(customRooms).map(r => ({
        code: r.code,
        hasPassword: !!r.password,
        playersCount: r.players.length
    }));
    io.emit('rooms_list_data', list);
}

server.listen(PORT, () => {
    console.log(`Serveur Chiffre Blitz démarré sur le port ${PORT}`);
});
