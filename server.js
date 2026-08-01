const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connexion MongoDB (remplace par ton URL MongoDB Atlas si besoin)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chiffre-blitz";
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected")).catch(err => console.error("MongoDB connection error:", err));

// Schéma du joueur incluant wins et losses
const playerSchema = new mongoose.Schema({
    socketId: String,
    username: { type: String, unique: true, index: true },
    region: String,
    avatar: { type: Number, default: 1 },
    flag: { type: String, default: '🇫🇷' },
    points: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    trophies: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },    // <--- Suivi des victoires
    losses: { type: Number, default: 0 },  // <--- Suivi des défaites
    inventory: { type: Object, default: {} },
    equippedPower: { type: String, default: null }
});

const Player = mongoose.model('Player', playerSchema);

let matchmakingQueue = [];
let rankedQueue = [];
let activeGames = {}; // gameId -> game state
let customRooms = {}; // code -> room state

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Enregistrement / Connexion du joueur
    socket.on('register_player', async (data) => {
        try {
            if (!data || !data.username) return;
            let player = await Player.findOne({ username: data.username });
            if (!player) {
                player = new Player({
                    username: data.username,
                    region: data.region || 'Hauts-de-France',
                    avatar: data.avatar || 1,
                    flag: data.flag || '🇫🇷',
                    points: 0,
                    coins: 100, // Bonus de départ
                    trophies: 0,
                    wins: 0,
                    losses: 0,
                    inventory: { spotlight: 1, freeze: 1 },
                    equippedPower: 'spotlight'
                });
            }
            player.socketId = socket.id;
            player.region = data.region || player.region;
            player.avatar = data.avatar !== undefined ? data.avatar : player.avatar;
            player.flag = data.flag || player.flag;
            await player.save();

            socket.playerUsername = player.username;
            socket.playerRegion = player.region;

            socket.emit('player_registered', {
                username: player.username,
                region: player.region,
                avatar: player.avatar,
                flag: player.flag,
                points: player.points,
                coins: player.coins,
                trophies: player.trophies,
                wins: player.wins,
                losses: player.losses,
                inventory: player.inventory,
                equippedPower: player.equippedPower
            });
        } catch (err) {
            console.error("Error in register_player:", err);
        }
    });

    // Classement (Inclus wins et losses)
    socket.on('get_leaderboard', async (type) => {
        try {
            let query = {};
            if (type === 'regional' && socket.playerRegion) {
                query = { region: socket.playerRegion };
            }

            let sortCriteria = { points: -1 };
            if (type === 'coins') {
                sortCriteria = { coins: -1 };
            }

            const topPlayers = await Player.find(query)
                .sort(sortCriteria)
                .limit(20)
                .select('username region avatar flag points trophies coins wins losses'); // <--- Indispensable pour l'affichage

            socket.emit('leaderboard_data', { type, data: topPlayers });
        } catch (err) {
            console.error("Error in get_leaderboard:", err);
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
            const player = await Player.findOne({ username: socket.playerUsername });
            if (player) {
                const earnedCoins = Math.min(100, Math.floor(score / 3));
                player.coins += earnedCoins;
                await player.save();
                sendUpdatedProfile(socket, player);
            }
        } catch (err) {
            console.error("Error in claim_solo_reward:", err);
        }
    });

    // Boutique : Achat d'objets
    socket.on('buy_power', async (powerId) => {
        if (!socket.playerUsername) return;
        const prices = { spotlight: 150, freeze: 350, joker: 600, nova: 1200, quake: 200, micro: 400, eclipse: 800, chaos: 2000 };
        const cost = prices[powerId];
        if (!cost) return;
        try {
            const player = await Player.findOne({ username: socket.playerUsername });
            if (player && player.coins >= cost) {
                player.coins -= cost;
                player.inventory[powerId] = (player.inventory[powerId] || 0) + 1;
                player.markModified('inventory');
                await player.save();
                sendUpdatedProfile(socket, player);
            }
        } catch (err) {
            console.error("Error in buy_power:", err);
        }
    });

    // Boutique : Équiper un objet
    socket.on('equip_power', async (powerId) => {
        if (!socket.playerUsername) return;
        try {
            const player = await Player.findOne({ username: socket.playerUsername });
            if (player && (player.inventory[powerId] || 0) > 0) {
                player.equippedPower = player.equippedPower === powerId ? null : powerId;
                await player.save();
                sendUpdatedProfile(socket, player);
            }
        } catch (err) {
            console.error("Error in equip_power:", err);
        }
    });

    // Gestion Salons Privés
    socket.on('get_rooms_list', () => {
        sendRoomsListBroadcast();
    });

    socket.on('create_room', (data) => {
        let code = data.code ? data.code.toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase();
        if (customRooms[code]) {
            socket.emit('room_error', "Ce code de salon existe déjà.");
            return;
        }
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
        if (!room) {
            socket.emit('room_error', "Salon introuvable.");
            return;
        }
        if (room.password && room.password !== data.password) {
            socket.emit('room_error', "Mot de passe incorrect.");
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('room_error', "Salon complet.");
            return;
        }
        try {
            const player = await Player.findOne({ username: socket.playerUsername });
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
            console.error("Error in join_room:", err);
        }
    });

    socket.on('leave_room', () => {
        leaveCurrentRoom(socket);
    });

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
        if (customRooms[socket.roomCode].players.length === 0) {
            delete customRooms[socket.roomCode];
        } else {
            io.to(socket.roomCode).emit('room_players_update', { players: customRooms[socket.roomCode].players });
        }
        socket.leave(socket.roomCode);
        socket.roomCode = null;
        sendRoomsListBroadcast();
    }
}

function sendRoomsListBroadcast() {
    const list = Object.keys(customRooms).map(code => ({
        code,
        hasPassword: !!customRooms[code].password,
        playersCount: customRooms[code].players.length
    }));
    io.emit('rooms_list_data', list);
}

function sendUpdatedProfile(socket, player) {
    socket.emit('player_registered', {
        username: player.username,
        region: player.region,
        avatar: player.avatar,
        flag: player.flag,
        points: player.points,
        coins: player.coins,
        trophies: player.trophies,
        wins: player.wins,
        losses: player.losses,
        inventory: player.inventory,
        equippedPower: player.equippedPower
    });
}

// Lancer un Duel 1v1
async function startGameDuel(p1, p2, isRanked) {
    const gameId = 'game_' + Math.random().toString(36).substring(2, 9);
    
    const dbP1 = await Player.findOne({ username: p1.playerUsername });
    const dbP2 = await Player.findOne({ username: p2.playerUsername });

    const p1Data = {
        socket: p1,
        username: p1.playerUsername,
        avatar: dbP1 ? dbP1.avatar : 1,
        flag: dbP1 ? dbP1.flag : '🇫🇷',
        target: 1,
        score: 0,
        pool: generateRandomPool(1)
    };

    const p2Data = {
        socket: p2,
        username: p2.playerUsername,
        avatar: dbP2 ? dbP2.avatar : 1,
        flag: dbP2 ? dbP2.flag : '🇫🇷',
        target: 1,
        score: 0,
        pool: generateRandomPool(1)
    };

    activeGames[gameId] = {
        players: { [p1.id]: p1Data, [p2.id]: p2Data },
        timeLeft: 30,
        isRanked: isRanked
    };

    p1.gameId = gameId;
    p2.gameId = gameId;

    p1.emit('start_countdown', { opponent: { username: p2Data.username, avatar: p2Data.avatar, flag: p2Data.flag } });
    p2.emit('start_countdown', { opponent: { username: p1Data.username, avatar: p1Data.avatar, flag: p1Data.flag } });

    setTimeout(() => {
        p1.emit('game_started', { timeLeft: 30, myTarget: 1, myPool: p1Data.pool, opponent: { username: p2Data.username, avatar: p2Data.avatar, flag: p2Data.flag } });
        p2.emit('game_started', { timeLeft: 30, myTarget: 1, myPool: p2Data.pool, opponent: { username: p1Data.username, avatar: p1Data.avatar, flag: p1Data.flag } });

        const timerInterval = setInterval(async () => {
            const game = activeGames[gameId];
            if (!game) {
                clearInterval(timerInterval);
                return;
            }
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

    // Écouteur de clics pendant le match
    p1.removeAllListeners('player_click_1v1');
    p2.removeAllListeners('player_click_1v1');

    p1.on('player_click_1v1', (num) => handleTileClick(gameId, p1.id, num));
    p2.on('player_click_1v1', (num) => handleTileClick(gameId, p2.id, num));

    p1.removeAllListeners('use_power');
    p2.removeAllListeners('use_power');
    p1.on('use_power', (powerId) => handleUsePower(gameId, p1.id, powerId));
    p2.on('use_power', (powerId) => handleUsePower(gameId, p2.id, powerId));

    p1.removeAllListeners('send_malus');
    p2.removeAllListeners('send_malus');
    p1.on('send_malus', (data) => handleSendMalus(gameId, p1.id, data.type));
    p2.on('send_malus', (data) => handleSendMalus(gameId, p2.id, data.type));
}

function generateRandomPool(currentTarget) {
    let pool = [currentTarget];
    let candidates = [];
    for (let i = 1; i <= 50; i++) {
        if (i !== currentTarget) candidates.push(i);
    }
    candidates.sort(() => Math.random() - 0.5);
    pool = pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
    return pool;
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

        player.socket.emit('my_grid_updated', {
            target: player.target,
            newPool: player.pool,
            success: true
        });

        if (opponent) {
            opponent.socket.emit('opponent_progress', {
                target: player.target,
                opponent: { username: player.username, avatar: player.avatar, flag: player.flag }
            });
        }

        // Victoire si le joueur atteint 50 ou plus
        if (player.target > 50) {
            clearInterval(game.timerInterval);
            await finishGame(gameId, socketId, `${player.username} a terminé toutes les cibles !`);
        }
    } else {
        player.socket.emit('my_grid_updated', {
            target: player.target,
            newPool: player.pool,
            success: false
        });
    }
}

function handleUsePower(gameId, socketId, powerId) {
    const game = activeGames[gameId];
    if (!game) return;
    const opponentId = Object.keys(game.players).find(id => id !== socketId);
    if (opponentId && (powerId === 'quake' || powerId === 'micro' || powerId === 'eclipse' || powerId === 'chaos')) {
        game.players[opponentId].socket.emit('receive_malus', { type: powerId });
    }
}

function handleSendMalus(gameId, socketId, type) {
    const game = activeGames[gameId];
    if (!game) return;
    const opponentId = Object.keys(game.players).find(id => id !== socketId);
    if (opponentId) {
        game.players[opponentId].socket.emit('receive_malus', { type: type });
    }
}

// Fin de partie 1v1 avec incrémentation des victoires et défaites
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
            else winnerId = null; // Égalité
        }
    }

    const loserId = winnerId ? playerIds.find(id => id !== winnerId) : null;

    // Mise à jour de la base de données (Victoires, Défaites, Points, Pièces)
    try {
        if (winnerId) {
            const winnerDb = await Player.findOne({ username: game.players[winnerId].username });
            if (winnerDb) {
                winnerDb.wins += 1; // <--- Incrémentation victoire
                winnerDb.points += game.isRanked ? 25 : 10;
                winnerDb.coins += 30;
                await winnerDb.save();
            }
        }
        if (loserId) {
            const loserDb = await Player.findOne({ username: game.players[loserId].username });
            if (loserDb) {
                loserDb.losses += 1; // <--- Incrémentation défaite
                loserDb.points = Math.max(0, loserDb.points - (game.isRanked ? 15 : 5));
                loserDb.coins += 10;
                await loserDb.save();
            }
        }
    } catch (err) {
        console.error("Error updating match stats in DB:", err);
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
server.listen(PORT, () => {
    console.log(`Chiffre Blitz Server running on port ${PORT}`);
});
