const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000, // Augmente le délai avant de considérer une co perdue
    pingInterval: 25000
});

app.use(express.static(path.join(__dirname)));

let players = {};
let waitingPlayer = null;
let rooms = {};

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
        players[socket.id] = {
            id: socket.id,
            username: profile?.username || 'Joueur',
            region: profile?.region || 'France',
            points: profile?.points || 1000
        };
        socket.emit('player_registered', players[socket.id]);
    });

    socket.on('create_room', (data) => {
        let roomCode = data?.code ? data.code.trim().toUpperCase() : '';
        if (!roomCode) {
            roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
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
        socket.emit('room_joined_success', {
            code: roomCode,
            players: rooms[roomCode].players
        });
    });

    socket.on('join_room', (data) => {
        const roomCode = data?.code ? data.code.toUpperCase() : '';
        const passwordInput = data?.password || '';
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
                setTimeout(() => {
                    start1v1GameLoop(roomCode);
                }, 3000);
            }
        } else {
            socket.emit('room_error', "Salon introuvable, complet ou partie déjà commencée !");
        }
    });

    socket.on('leave_room', () => {
        cleanupPlayerFromRooms(socket.id);
    });

    socket.on('get_rooms_list', () => {
        const openRooms = Object.values(rooms)
            .filter(r => r.players.length < 2 && !r.gameStarted)
            .map(r => ({
                code: r.code,
                playersCount: r.players.length
            }));
        socket.emit('rooms_list_data', openRooms);
    });

    socket.on('find_1v1_match', () => {
        if (waitingPlayer === socket.id) return;

        if (waitingPlayer) {
            const p1 = waitingPlayer;
            const p2 = socket.id;
            waitingPlayer = null;

            const s1 = io.sockets.sockets.get(p1);
            const s2 = io.sockets.sockets.get(p2);

            if (!s1 || !s2) {
                if (s1) waitingPlayer = p1;
                return;
            }

            const roomName = `match_${p1}_${p2}`;
            s1.join(roomName);
            s2.join(roomName);

            rooms[roomName] = {
                code: roomName,
                password: '',
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
            setTimeout(() => {
                start1v1GameLoop(roomName);
            }, 3000);
        } else {
            waitingPlayer = socket.id;
        }
    });

    socket.on('player_click_1v1', (num) => {
        try {
            let roomCode = null;
            for (const code in rooms) {
                const room = rooms[code];
                if (room.matchPlayers && room.matchPlayers[socket.id]) {
                    roomCode = code;
                    break;
                }
            }
            if (!roomCode) return;

            let room = rooms[roomCode];
            if (!room || room.ended || room.timeLeft <= 0) return;

            let pData = room.matchPlayers[socket.id];
            if (!pData) return;

            if (num === pData.target) {
                pData.score += 10;
                pData.target++;
                pData.pool = generateRandomPool(pData.target);

                socket.emit('my_grid_updated', {
                    target: pData.target,
                    newPool: pData.pool,
                    success: true
                });

                socket.to(roomCode).emit('opponent_progress', {
                    target: pData.target,
                    score: pData.score
                });
            } else {
                socket.emit('my_grid_updated', {
                    target: pData.target,
                    newPool: pData.pool,
                    success: false
                });
            }
        } catch (err) {
            console.error("Erreur player_click_1v1:", err);
        }
    });

    socket.on('send_malus', (data) => {
        for (const code in rooms) {
            const room = rooms[code];
            if (room.matchPlayers && room.matchPlayers[socket.id]) {
                socket.to(code).emit('receive_malus', data);
                break;
            }
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket.id) waitingPlayer = null;
        cleanupPlayerFromRooms(socket.id);
        delete players[socket.id];
        console.log(`Déconnexion : ${socket.id}`);
    });
});

function cleanupPlayerFromRooms(socketId) {
    for (const code in rooms) {
        const room = rooms[code];
        const wasInMatch = room.matchPlayers && room.matchPlayers[socketId];
        
        room.players = room.players.filter(p => p.id !== socketId);
        
        if (wasInMatch) {
            if (!room.ended) {
                room.ended = true;
                if (room.timerInterval) {
                    clearInterval(room.timerInterval);
                    room.timerInterval = null;
                }
                io.to(code).emit('room_error', "L'adversaire s'est déconnecté.");
            }
            delete rooms[code];
        } else if (room.players.length === 0) {
            if (room.timerInterval) {
                clearInterval(room.timerInterval);
                room.timerInterval = null;
            }
            delete rooms[code];
        } else {
            io.to(code).emit('room_players_update', { players: room.players });
        }
    }
}

function start1v1GameLoop(roomCode) {
    let room = rooms[roomCode];
    if (!room || room.ended) return;

    for (let pId in room.matchPlayers) {
        io.to(pId).emit('game_started', {
            timeLeft: room.timeLeft,
            myTarget: room.matchPlayers[pId].target,
            myPool: room.matchPlayers[pId].pool
        });
    }

    room.timerInterval = setInterval(() => {
        try {
            let currentRoom = rooms[roomCode];
            if (!currentRoom || currentRoom.ended) {
                if (room.timerInterval) clearInterval(room.timerInterval);
                return;
            }

            currentRoom.timeLeft--;
            io.to(roomCode).emit('timer_update', currentRoom.timeLeft);

            if (currentRoom.timeLeft <= 0) {
                if (currentRoom.timerInterval) {
                    clearInterval(currentRoom.timerInterval);
                    currentRoom.timerInterval = null;
                }
                end1v1Game(roomCode, "Temps écoulé !");
            }
        } catch (e) {
            console.error("Erreur dans le timer interval:", e);
            if (room.timerInterval) clearInterval(room.timerInterval);
        }
    }, 1000);
}

function end1v1Game(roomCode, reason) {
    let room = rooms[roomCode];
    if (!room || room.ended) return;

    room.ended = true;
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }

    let pIds = Object.keys(room.matchPlayers || {});
    if (pIds.length >= 2) {
        let p1Id = pIds[0];
        let p2Id = pIds[1];
        let p1 = room.matchPlayers[p1Id];
        let p2 = room.matchPlayers[p2Id];

        let winnerId = null;
        if (p1.score > p2.score) winnerId = p1Id;
        else if (p2.score > p1.score) winnerId = p2Id;

        let formattedPlayers = {};
        formattedPlayers[p1Id] = { target: p1.target, score: p1.score };
        formattedPlayers[p2Id] = { target: p2.target, score: p2.score };

        io.to(roomCode).emit('game_over_1v1', {
            reason: reason,
            winnerId: winnerId,
            players: formattedPlayers
        });
    }

    delete rooms[roomCode];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur actif sur le port ${PORT}`);
});
