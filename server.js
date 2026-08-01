const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// BASE DE DONNÉES EN MÉMOIRE (sauvegarde persistante tant que le serveur tourne)
const playersDB = {};

// SESSIONS TEMPORAIRES (Sockets & Matchmaking)
let players = {};
let waitingPlayerId = null;
let activeMatches = {};
let customRooms = {};

const POWERS_CATALOG = {
    'spotlight': { price: 40, type: 'bonus' },
    'freeze': { price: 80, type: 'bonus' },
    'joker': { price: 180, type: 'bonus' },
    'nova': { price: 450, type: 'bonus' },
    'quake': { price: 50, type: 'malus' },
    'micro': { price: 100, type: 'malus' },
    'eclipse': { price: 220, type: 'malus' },
    'chaos': { price: 600, type: 'malus' }
};

function generateGridPool(target) {
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
    
    // ENREGISTREMENT ET RÉCUPÉRATION DU COMPTE
    socket.on('register_player', (data) => {
        const username = data.username;
        
        // Création du joueur dans la BDD s'il n'existe pas
        if (!playersDB[username]) {
            playersDB[username] = {
                username: username,
                region: data.region || 'Unknown',
                points: 0,
                coins: 0,
                trophies: 0,
                inventory: {},
                equippedPower: null
            };
        }
        
        socket.username = username;
        
        // On lie le socket id au joueur temporaire pour le matchmaking
        players[socket.id] = {
            id: socket.id,
            username: username,
            region: data.region || 'Unknown',
            inGame: false
        };

        // On renvoie les vraies données sauvegardées de la BDD
        socket.emit('player_registered', playersDB[username]);
    });

    // RECOMPENSES SOLO (Sauvegarde en BDD)
    socket.on('claim_solo_reward', (score) => {
        if (socket.username && playersDB[socket.username]) {
            const baseCoins = Math.floor(score / 3);
            const bonusCoins = score >= 300 ? 100 : 0;
            const totalCoins = baseCoins + bonusCoins;
            
            playersDB[socket.username].coins += totalCoins;
            socket.emit('player_registered', playersDB[socket.username]);
        }
    });

    // RECOMPENSES PUBLICITE (Sauvegarde en BDD)
    socket.on('claim_ad_reward', (bonusCoins) => {
        if (socket.username && playersDB[socket.username]) {
            playersDB[socket.username].coins += bonusCoins;
            socket.emit('player_registered', playersDB[socket.username]);
        }
    });

    // ACHAT BOUTIQUE (Sauvegarde en BDD)
    socket.on('buy_power', (powerId) => {
        if (!socket.username || !playersDB[socket.username]) return;
        const playerProfile = playersDB[socket.username];
        const power = POWERS_CATALOG[powerId];
        
        if (power && playerProfile.coins >= power.price) {
            playerProfile.coins -= power.price;
            playerProfile.inventory[powerId] = (playerProfile.inventory[powerId] || 0) + 1;
            socket.emit('player_registered', playerProfile);
        }
    });

    // EQUIPER UN POUVOIR
    socket.on('equip_power', (powerId) => {
        if (!socket.username || !playersDB[socket.username]) return;
        const playerProfile = playersDB[socket.username];
        
        if (playerProfile.inventory[powerId] && playerProfile.inventory[powerId] > 0) {
            playerProfile.equippedPower = powerId;
            socket.emit('player_registered', playerProfile);
        }
    });

    // MALUS ENVOYÉ À L'ADVERSAIRE
    socket.on('send_malus', (data) => {
        const matchId = players[socket.id]?.matchId;
        if (!matchId || !activeMatches[matchId]) return;
        
        const match = activeMatches[matchId];
        const opponentId = Object.keys(match.players).find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('receive_malus', { type: data.type });
        }
    });

    // LEADERBOARD (Trie la BDD en direct)
    socket.on('get_leaderboard', (type) => {
        const allPlayers = Object.values(playersDB);
        let sorted = [];
        
        if (type === 'regional' && socket.username && playersDB[socket.username]) {
            const myRegion = playersDB[socket.username].region;
            sorted = allPlayers.filter(p => p.region === myRegion);
        } else {
            sorted = allPlayers; 
        }

        sorted.sort((a, b) => b.points - a.points);
        socket.emit('leaderboard_data', { data: sorted.slice(0, 50) });
    });

    // GESTION DES SALONS PRIVES
    socket.on('get_rooms_list', () => {
        const list = Object.values(customRooms).map(r => ({
            code: r.code,
            hasPassword: r.password.length > 0,
            playersCount: r.players.length
        }));
        socket.emit('rooms_list_data', list);
    });

    socket.on('create_room', (data) => {
        const code = data.code || Math.random().toString(36).substring(2, 6).toUpperCase();
        if (customRooms[code]) {
            socket.emit('room_error', "Ce salon existe déjà.");
            return;
        }
        
        customRooms[code] = {
            code: code,
            password: data.password || '',
            players: [socket.id]
        };
        
        socket.join(code);
        players[socket.id].currentRoom = code;
        
        socket.emit('room_joined_success', { code: code, players: [{ id: socket.id, username: data.username }] });
        io.emit('rooms_list_data', Object.values(customRooms).map(r => ({ code: r.code, hasPassword: r.password.length > 0, playersCount: r.players.length })));
    });

    socket.on('join_room', (data) => {
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
            socket.emit('room_error', "Ce salon est plein.");
            return;
        }

        room.players.push(socket.id);
        socket.join(data.code);
        players[socket.id].currentRoom = data.code;

        const playersData = room.players.map(pid => ({ id: pid, username: players[pid]?.username || 'Joueur' }));
        io.to(data.code).emit('room_joined_success', { code: data.code, players: playersData });
        io.emit('rooms_list_data', Object.values(customRooms).map(r => ({ code: r.code, hasPassword: r.password.length > 0, playersCount: r.players.length })));

        if (room.players.length === 2) {
            startMatch1v1(room.players[0], room.players[1]);
            delete customRooms[data.code];
            io.emit('rooms_list_data', Object.values(customRooms).map(r => ({ code: r.code, hasPassword: r.password.length > 0, playersCount: r.players.length })));
        }
    });

    socket.on('leave_room', () => {
        const roomId = players[socket.id]?.currentRoom;
        if (roomId && customRooms[roomId]) {
            customRooms[roomId].players = customRooms[roomId].players.filter(p => p !== socket.id);
            socket.leave(roomId);
            players[socket.id].currentRoom = null;
            
            if (customRooms[roomId].players.length === 0) {
                delete customRooms[roomId];
            } else {
                const playersData = customRooms[roomId].players.map(pid => ({ id: pid, username: players[pid]?.username || 'Joueur' }));
                io.to(roomId).emit('room_players_update', { players: playersData });
            }
            io.emit('rooms_list_data', Object.values(customRooms).map(r => ({ code: r.code, hasPassword: r.password.length > 0, playersCount: r.players.length })));
        }
    });

    // MATCHMAKING ALÉATOIRE
    socket.on('find_1v1_match', () => {
        if (waitingPlayerId && waitingPlayerId !== socket.id && players[waitingPlayerId]) {
            startMatch1v1(waitingPlayerId, socket.id);
            waitingPlayerId = null;
        } else {
            waitingPlayerId = socket.id;
        }
    });

    // DÉMARRAGE DU MATCH 1v1
    function startMatch1v1(p1_id, p2_id) {
        const matchId = `match_${p1_id}_${p2_id}`;
        
        activeMatches[matchId] = {
            id: matchId,
            timeLeft: 30,
            timer: null,
            players: {
                [p1_id]: { target: 1, score: 0 },
                [p2_id]: { target: 1, score: 0 }
            }
        };

        if (players[p1_id]) { players[p1_id].inGame = true; players[p1_id].matchId = matchId; }
        if (players[p2_id]) { players[p2_id].inGame = true; players[p2_id].matchId = matchId; }

        io.to(p1_id).emit('start_countdown');
        io.to(p2_id).emit('start_countdown');

        setTimeout(() => {
            const p1Pool = generateGridPool(1);
            const p2Pool = generateGridPool(1);

            io.to(p1_id).emit('game_started', { timeLeft: 30, myTarget: 1, myPool: p1Pool });
            io.to(p2_id).emit('game_started', { timeLeft: 30, myTarget: 1, myPool: p2Pool });

            activeMatches[matchId].timer = setInterval(() => {
                if (!activeMatches[matchId]) return;
                activeMatches[matchId].timeLeft--;
                io.to(p1_id).emit('timer_update', activeMatches[matchId].timeLeft);
                io.to(p2_id).emit('timer_update', activeMatches[matchId].timeLeft);
                
                if (activeMatches[matchId].timeLeft <= 0) {
                    endMatch(matchId, "Le temps est écoulé !");
                }
            }, 1000);
        }, 3000);
    }

    // CLIC EN MATCH 1v1 (Sécurisé côté serveur)
    socket.on('player_click_1v1', (num) => {
        const pInfo = players[socket.id];
        if (!pInfo || !pInfo.matchId || !activeMatches[pInfo.matchId]) return;

        const match = activeMatches[pInfo.matchId];
        const matchPlayer = match.players[socket.id];
        const opponentId = Object.keys(match.players).find(id => id !== socket.id);

        if (num === matchPlayer.target) {
            matchPlayer.target++;
            matchPlayer.score += 10;
            const newPool = generateGridPool(matchPlayer.target);
            socket.emit('my_grid_updated', { success: true, target: matchPlayer.target, newPool: newPool });
            if (opponentId) {
                io.to(opponentId).emit('opponent_progress', { target: matchPlayer.target });
            }
            if (matchPlayer.target > 30) {
                endMatch(pInfo.matchId, `${pInfo.username} a atteint 30 en premier !`);
            }
        } else {
            match.timeLeft = Math.max(0, match.timeLeft - 1);
            socket.emit('my_grid_updated', { success: false, target: matchPlayer.target, newPool: generateGridPool(matchPlayer.target) });
            io.to(socket.id).emit('timer_update', match.timeLeft);
            if (opponentId) io.to(opponentId).emit('timer_update', match.timeLeft);
            if (match.timeLeft <= 0) {
                endMatch(pInfo.matchId, "Erreur fatale : Temps écoulé !");
            }
        }
    });

    // FIN DE MATCH 1v1
    function endMatch(matchId, reason) {
        const match = activeMatches[matchId];
        if (!match) return;

        clearInterval(match.timer);
        
        const playerIds = Object.keys(match.players);
        const p1_id = playerIds[0];
        const p2_id = playerIds[1];
        
        let winnerId = null;
        if (match.players[p1_id].target > match.players[p2_id].target) winnerId = p1_id;
        else if (match.players[p2_id].target > match.players[p1_id].target) winnerId = p2_id;
        
        // Distribution des récompenses pour les deux
        playerIds.forEach(id => {
            if (players[id]) {
                const username = players[id].username;
                const isWinner = (id === winnerId);
                const gainedCoins = isWinner ? 40 : 15;
                const gainedPts = isWinner ? 20 : (winnerId ? -10 : 5);
                
                if (username && playersDB[username]) {
                    playersDB[username].coins += gainedCoins;
                    playersDB[username].points = Math.max(0, playersDB[username].points + gainedPts);
                    if (isWinner) playersDB[username].trophies += 1;
                    
                    io.to(id).emit('player_registered', playersDB[username]);
                }
                players[id].inGame = false;
                players[id].matchId = null;
            }
        });

        io.to(p1_id).emit('game_over_1v1', { players: match.players, winnerId: winnerId, reason: reason });
        if (p2_id) io.to(p2_id).emit('game_over_1v1', { players: match.players, winnerId: winnerId, reason: reason });
        
        delete activeMatches[matchId];
    }

    // DÉCONNEXION DU JOUEUR
    socket.on('disconnect', () => {
        if (waitingPlayerId === socket.id) waitingPlayerId = null;
        
        const pInfo = players[socket.id];
        if (pInfo) {
            if (pInfo.currentRoom && customRooms[pInfo.currentRoom]) {
                customRooms[pInfo.currentRoom].players = customRooms[pInfo.currentRoom].players.filter(p => p !== socket.id);
                if (customRooms[pInfo.currentRoom].players.length === 0) delete customRooms[pInfo.currentRoom];
            }
            if (pInfo.inGame && pInfo.matchId) {
                endMatch(pInfo.matchId, "L'adversaire s'est déconnecté.");
            }
        }
        delete players[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Chiffre Blitz démarré sur le port ${PORT}`);
});
