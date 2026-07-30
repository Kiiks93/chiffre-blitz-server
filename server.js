const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

let players = {};
let waitingPlayer = null;
let rooms = {};         // Salons privés (lobbies)
let activeMatches = {}; // Parties en cours (salon ou match aléatoire)

function generatePool(target) {
    let pool = [target];
    let candidates = [];
    for (let i = 1; i <= 50; i++) {
        if (i !== target) candidates.push(i);
    }
    candidates.sort(() => Math.random() - 0.5);
    pool = pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
    return pool;
}

function startMatch(roomCode, playerIds) {
    activeMatches[roomCode] = {
        players: playerIds,
        targets: { [playerIds[0]]: 1, [playerIds[1]]: 1 },
        pools: { 
            [playerIds[0]]: generatePool(1), 
            [playerIds[1]]: generatePool(1) 
        },
        timeLeft: 30,
        timer: null
    };

    io.to(roomCode).emit('start_countdown');

    setTimeout(() => {
        const match = activeMatches[roomCode];
        if (!match) return;

        playerIds.forEach(id => {
            io.to(id).emit('game_started', {
                timeLeft: match.timeLeft,
                myTarget: match.targets[id],
                myPool: match.pools[id]
            });
        });

        match.timer = setInterval(() => {
            match.timeLeft--;
            io.to(roomCode).emit('timer_update', match.timeLeft);

            if (match.timeLeft <= 0) {
                clearInterval(match.timer);
                endMatch(roomCode);
            }
        }, 1000);
    }, 3500);
}

function endMatch(roomCode) {
    const match = activeMatches[roomCode];
    if (!match) return;

    const p1 = match.players[0];
    const p2 = match.players[1];
    const t1 = match.targets[p1] || 1;
    const t2 = match.targets[p2] || 1;

    let winnerId = null;
    let reason = "";

    if (t1 > t2) {
        winnerId = p1;
        reason = `Victoire par ${t1 - 1} cibles validées !`;
    } else if (t2 > t1) {
        winnerId = p2;
        reason = `Victoire de l'adversaire (${t2 - 1} cibles)`;
    } else {
        reason = `Égalité parfaite (${t1 - 1} cibles)`;
    }

    io.to(roomCode).emit('game_over_1v1', {
        winnerId: winnerId,
        reason: reason,
        players: {
            [p1]: { target: t1, score: (t1 - 1) * 10 },
            [p2]: { target: t2, score: (t2 - 1) * 10 }
        }
    });

    delete activeMatches[roomCode];
}

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    socket.on('register_player', (profile) => {
        players[socket.id] = {
            id: socket.id,
            username: profile.username,
            region: profile.region,
            points: profile.points || 1000
        };
        socket.emit('player_registered', players[socket.id]);
    });

    // --- SALONS PRIVÉS ---
    socket.on('create_room', (data) => {
        const roomCode = data?.code ? data.code.toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase();
        
        if (rooms[roomCode]) {
            socket.emit('room_error', "Ce nom de salon est déjà pris !");
            return;
        }

        const roomPass = data?.password ? data.password.trim() : '';

        rooms[roomCode] = {
            code: roomCode,
            password: roomPass,
            host: socket.id,
            players: [{ id: socket.id, username: data?.username || players[socket.id]?.username || 'Hôte' }]
        };

        socket.join(roomCode);
        socket.emit('room_joined_success', {
            code: roomCode,
            players: rooms[roomCode].players
        });
        console.log(`Salon créé : ${roomCode}`);
    });

    socket.on('join_room', (data) => {
        const roomCode = data?.code ? data.code.toUpperCase() : '';
        const room = rooms[roomCode];

        if (!room) {
            socket.emit('room_error', "Salon introuvable !");
            return;
        }

        const userPass = data?.password ? data.password.trim() : '';
        if (room.password && room.password !== userPass) {
            socket.emit('room_error', "Mot de passe incorrect !");
            return;
        }

        if (room.players.length < 2) {
            const username = players[socket.id]?.username || 'Adversaire';
            room.players.push({ id: socket.id, username: username });
            socket.join(roomCode);

            io.to(roomCode).emit('room_players_update', { players: room.players });
            socket.emit('room_joined_success', { code: roomCode, players: room.players });
            console.log(`Joueur ${socket.id} a rejoint le salon ${roomCode}`);

            if (room.players.length === 2) {
                console.log(`Salon ${roomCode} complet. Lancement de la partie...`);
                const p1 = room.players[0].id;
                const p2 = room.players[1].id;
                delete rooms[roomCode];
                startMatch(roomCode, [p1, p2]);
            }
        } else {
            socket.emit('room_error', "Ce salon est complet !");
        }
    });

    socket.on('leave_room', () => {
        for (const code in rooms) {
            const room = rooms[code];
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                socket.leave(code);
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    delete rooms[code];
                } else {
                    io.to(code).emit('room_players_update', { players: room.players });
                }
                break;
            }
        }
    });

    socket.on('get_rooms_list', () => {
        const openRooms = Object.values(rooms)
            .filter(r => r.players.length < 2 && (!r.password || r.password === ''))
            .map(r => ({
                code: r.code,
                playersCount: r.players.length
            }));
        socket.emit('rooms_list_data', openRooms);
    });

    // --- MATCHMAKING ALÉATOIRE ---
    socket.on('find_1v1_match', () => {
        if (waitingPlayer && waitingPlayer !== socket.id) {
            const p1 = waitingPlayer;
            const p2 = socket.id;
            waitingPlayer = null;

            const roomName = `match_${p1}_${p2}`;
            io.sockets.sockets.get(p1)?.join(roomName);
            io.sockets.sockets.get(p2)?.join(roomName);

            startMatch(roomName, [p1, p2]);
        } else {
            waitingPlayer = socket.id;
        }
    });

    // --- LOGIQUE DE CLIC EN JEU 1v1 ---
    socket.on('player_click_1v1', (num) => {
        let foundRoomCode = null;
        for (const code in activeMatches) {
            if (activeMatches[code].players.includes(socket.id)) {
                foundRoomCode = code;
                break;
            }
        }
        if (!foundRoomCode) return;
        const match = activeMatches[foundRoomCode];
        if (match.timeLeft <= 0) return;

        const currentTarget = match.targets[socket.id];
        if (num === currentTarget) {
            match.targets[socket.id]++;
            const newTarget = match.targets[socket.id];
            match.pools[socket.id] = generatePool(newTarget);

            socket.emit('my_grid_updated', {
                target: newTarget,
                newPool: match.pools[socket.id],
                success: true
            });

            const opponentId = match.players.find(id => id !== socket.id);
            if (opponentId) {
                io.to(opponentId).emit('opponent_progress', { target: newTarget });
            }
        } else {
            socket.emit('my_grid_updated', {
                target: currentTarget,
                newPool: match.pools[socket.id],
                success: false
            });
        }
    });

    socket.on('send_malus', (data) => {
        for (const code in activeMatches) {
            const match = activeMatches[code];
            if (match.players.includes(socket.id)) {
                const opponentId = match.players.find(id => id !== socket.id);
                if (opponentId) {
                    io.to(opponentId).emit('receive_malus', data);
                }
                break;
            }
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket.id) waitingPlayer = null;
        for (const code in rooms) {
            const room = rooms[code];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[code];
            } else {
                io.to(code).emit('room_players_update', { players: room.players });
            }
        }
        for (const code in activeMatches) {
            if (activeMatches[code].players.includes(socket.id)) {
                clearInterval(activeMatches[code].timer);
                io.to(code).emit('game_over_1v1', {
                    winnerId: activeMatches[code].players.find(id => id !== socket.id),
                    reason: "Adversaire déconnecté !",
                    players: {}
                });
                delete activeMatches[code];
            }
        }
        delete players[socket.id];
        console.log(`Déconnexion : ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur actif sur le port ${PORT}`);
});
