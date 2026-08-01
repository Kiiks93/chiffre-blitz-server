const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- STOCKAGE EN MÉMOIRE ---
const players = {}; // socket.id ou username -> données joueur
const rooms = {};   // code du salon -> { code, password, players: [], hostId }
const matchmakingQueue = [];
const rankedQueue = [];

// --- CONFIGURATION ADMIN & ÉVÉNEMENTS ---
const ADMIN_PASSWORD = "SECRET_ADMIN_PASSWORD_123"; // 🔑 Modifie ton mot de passe admin ici

let globalEvents = {
    coinRush: false,       // 1. Pièces x2
    rankShield: false,     // 2. Zéro perte de points en classé
    expressoMatch: false,  // 3. Matchs plus rapides (20s)
    chaosMode: false,      // 4. Modificateurs aléatoires
    jackpotEclair: false,  // 5. Coffres mystères de fin de match
    saboteurMode: false,   // 6. Mode Exclusif Asymétrique BO3
    _isScheduledActive: false
};

let eventSchedule = {
    startDate: null,
    endDate: null
};

// Vérification automatique de la planification des dates (toutes les 30 secondes)
setInterval(() => {
    if (eventSchedule.startDate && eventSchedule.endDate) {
        const now = Date.now();
        const start = new Date(eventSchedule.startDate).getTime();
        const end = new Date(eventSchedule.endDate).getTime();
        
        const shouldBeActive = now >= start && now <= end;
        if (globalEvents._isScheduledActive !== shouldBeActive) {
            globalEvents._isScheduledActive = shouldBeActive;
            io.emit('events_state_update', globalEvents);
        }
    }
}, 30000);

app.get('/', (req, res) => {
    res.send('Chiffre Blitz Server is running ⚡');
});

io.on('connection', (socket) => {
    console.log(`🔌 Un utilisateur s'est connecté : ${socket.id}`);

    // Envoyer l'état actuel des événements au joueur qui se connecte
    socket.emit('events_state_update', globalEvents);

    // --- ENREGISTREMENT / PROFIL ---
    socket.on('register_player', (data) => {
        players[socket.id] = {
            id: socket.id,
            username: data.username || "Joueur",
            region: data.region || "Hauts-de-France",
            avatar: data.avatar || 1,
            flag: data.flag || "🇫🇷",
            points: players[socket.id]?.points || 300, // Points de départ par défaut
            coins: players[socket.id]?.coins || 100,   // Pièces de départ par défaut
            trophies: players[socket.id]?.trophies || 0,
            wins: players[socket.id]?.wins || 0,
            losses: players[socket.id]?.losses || 0,
            inventory: players[socket.id]?.inventory || { spotlight: 2, freeze: 1 },
            equippedPower: players[socket.id]?.equippedPower || 'spotlight'
        };
        socket.emit('player_registered', players[socket.id]);
    });

    // --- BOUTIQUE ---
    socket.on('buy_power', (powerId) => {
        const player = players[socket.id];
        if (!player) return;
        
        const prices = {
            spotlight: 150, freeze: 350, joker: 600, nova: 1200,
            quake: 200, micro: 400, eclipse: 800, chaos: 2000
        };

        const cost = prices[powerId];
        if (cost && player.coins >= cost) {
            player.coins -= cost;
            player.inventory[powerId] = (player.inventory[powerId] || 0) + 1;
            socket.emit('player_registered', player);
        }
    });

    socket.on('equip_power', (powerId) => {
        const player = players[socket.id];
        if (!player) return;
        if ((player.inventory[powerId] || 0) > 0) {
            player.equippedPower = powerId;
            socket.emit('player_registered', player);
        }
    });

    // --- CLASSEMENT ---
    socket.on('get_leaderboard', (type) => {
        const allPlayers = Object.values(players);
        let sortedData = [...allPlayers];

        const [category, scope] = type.split('_'); // ex: points_regional

        // Filtrage par région si demandé
        if (scope === 'regional' && players[socket.id]) {
            const myReg = players[socket.id].region;
            sortedData = sortedData.filter(p => p.region === myReg);
        }

        // Tri selon la catégorie
        if (category === 'points') {
            sortedData.sort((a, b) => b.points - a.points);
        } else if (category === 'trophies') {
            sortedData.sort((a, b) => b.trophies - a.trophies);
        } else if (category === 'coins') {
            sortedData.sort((a, b) => b.coins - a.coins);
        } else if (category === 'combined') {
            // Trophées prioritaires, départagés par les points
            sortedData.sort((a, b) => {
                const diffTrophies = (b.trophies || 0) - (a.trophies || 0);
                if (diffTrophies !== 0) return diffTrophies;
                return (b.points || 0) - (a.points || 0);
            });
        }

        socket.emit('leaderboard_data', { type, data: sortedData.slice(0, 50) });
    });

    // --- SALONS PRIVÉS ---
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

        rooms[code] = {
            code: code,
            password: data.password || '',
            players: [players[socket.id] || { id: socket.id, username: data.username, avatar: data.avatar, flag: data.flag }],
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

        const currentPlayer = players[socket.id] || { id: socket.id, username: "Joueur", avatar: 1, flag: "🇫🇷" };
        room.players.push(currentPlayer);
        socket.join(room.code);

        socket.emit('room_joined_success', { code: room.code, players: room.players });
        io.to(room.code).emit('room_players_update', { players: room.players });

        // Lancer la partie si 2 joueurs
        if (room.players.length === 2) {
            setTimeout(() => {
                startMatchBetween(room.players[0].id, room.players[1].id);
            }, 1000);
        }
    });

    socket.on('leave_room', () => {
        leaveAllRooms(socket);
    });

    // --- MATCHMAKING 1v1 ---
    socket.on('find_1v1_match', () => {
        matchmakingQueue.push(socket.id);
        if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift();
            const p2 = matchmakingQueue.shift();
            startMatchBetween(p1, p2);
        }
    });

    socket.on('find_ranked_match', (data) => {
        if (data && data.items) {
            players[socket.id].equippedPower = data.items[0];
        }
        rankedQueue.push(socket.id);
        if (rankedQueue.length >= 2) {
            const p1 = rankedQueue.shift();
            const p2 = rankedQueue.shift();
            startMatchBetween(p1, p2, true);
        }
    });

    // --- RÉCOMPENSE SOLO ---
    socket.on('claim_solo_reward', (score) => {
        const player = players[socket.id];
        if (!player) return;
        let earnedCoins = Math.min(100, Math.floor(score / 3));
        if (globalEvents.coinRush) earnedCoins *= 2; // Boost Coin Rush
        player.coins += earnedCoins;
        socket.emit('player_registered', player);
    });

    // --- SYSTÈME D'ADMINISTRATION (PANEL VISUEL) ---
    socket.on('admin_auth', (password) => {
        if (password === ADMIN_PASSWORD) {
            socket.isAdmin = true;
            socket.emit('admin_auth_success', { events: globalEvents, schedule: eventSchedule });
        } else {
            socket.emit('admin_auth_fail', "Mot de passe administrateur incorrect !");
        }
    });

    socket.on('admin_update_events', (newEvents) => {
        if (!socket.isAdmin) return;
        globalEvents = { ...globalEvents, ...newEvents };
        io.emit('events_state_update', globalEvents);
    });

    socket.on('admin_update_schedule', (scheduleData) => {
        if (!socket.isAdmin) return;
        eventSchedule = scheduleData;
        socket.emit('admin_schedule_saved', eventSchedule);
    });

    socket.on('admin_broadcast_message', (message) => {
        if (!socket.isAdmin) return;
        io.emit('global_announcement', message);
    });

    socket.on('admin_give_gift', (data) => {
        if (!socket.isAdmin) return;
        const { targetUsername, currency, amount } = data; // currency: 'coins' ou 'points'
        
        if (!targetUsername || targetUsername.toUpperCase() === 'TOUS') {
            Object.values(players).forEach(p => {
                p[currency] = (p[currency] || 0) + amount;
            });
            io.emit('admin_gift_received', { currency, amount, message: "Cadeau Admin global !" });
        } else {
            const target = Object.values(players).find(p => p.username.toLowerCase() === targetUsername.toLowerCase());
            if (target) {
                target[currency] = (target[currency] || 0) + amount;
                io.to(target.id).emit('player_registered', target);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);
        leaveAllRooms(socket);
        const qIdx = matchmakingQueue.indexOf(socket.id);
        if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
        const rIdx = rankedQueue.indexOf(socket.id);
        if (rIdx !== -1) rankedQueue.splice(rIdx, 1);
        delete players[socket.id];
    });
});

function leaveAllRooms(socket) {
    for (let code in rooms) {
        const room = rooms[code];
        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(code);
        if (room.players.length === 0) {
            delete rooms[code];
        } else {
            io.to(code).emit('room_players_update', { players: room.players });
        }
    }
}

function startMatchBetween(id1, id2, isRanked = false) {
    const p1 = players[id1] || { id: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷", points: 300 };
    const p2 = players[id2] || { id: id2, username: "Joueur 2", avatar: 2, flag: "🇫🇷", points: 300 };

    const matchData = {
        timeLeft: globalEvents.expressoMatch ? 20 : 30, // Expresso Match Boost
        players: {
            [id1]: { target: 1, score: 0, pool: generatePool(1) },
            [id2]: { target: 1, score: 0, pool: generatePool(1) }
        }
    };

    io.to(id1).emit('start_countdown', { opponent: p2, timeLeft: matchData.timeLeft, myTarget: 1, myPool: matchData.players[id1].pool });
    io.to(id2).emit('start_countdown', { opponent: p1, timeLeft: matchData.timeLeft, myTarget: 1, myPool: matchData.players[id2].pool });

    // Boucle de jeu 1v1
    const gameInterval = setInterval(() => {
        matchData.timeLeft--;
        io.to(id1).emit('timer_update', matchData.timeLeft);
        io.to(id2).emit('timer_update', matchData.timeLeft);

        if (matchData.timeLeft <= 0) {
            clearInterval(gameInterval);
            endMatch(id1, id2, matchData, isRanked);
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

function endMatch(id1, id2, matchData, isRanked) {
    const s1 = matchData.players[id1].score;
    const s2 = matchData.players[id2].score;

    let winnerId = null;
    let reason = "Temps écoulé !";
    if (s1 > s2) winnerId = id1;
    else if (s2 > s1) winnerId = id2;

    io.to(id1).emit('game_over_1v1', { winnerId, reason, players: matchData.players });
    io.to(id2).emit('game_over_1v1', { winnerId, reason, players: matchData.players });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur Chiffre Blitz démarré sur le port ${PORT}`);
});
