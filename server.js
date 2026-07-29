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

let players = {};
let waitingPlayer = null;
let activeMatches = {};

io.on('connection', (socket) => {
    console.log('Joueur connecté :', socket.id);

    socket.on('register_player', (data) => {
        players[socket.id] = {
            id: socket.id,
            username: data.username || "Joueur",
            region: data.region || "Hauts-de-France",
            country: data.country || "FR",
            points: data.points || 1000
        };
        socket.emit('player_registered', players[socket.id]);
    });

    socket.on('find_1v1_match', () => {
        if (!players[socket.id]) return;

        if (waitingPlayer && waitingPlayer !== socket.id && players[waitingPlayer]) {
            const roomName = `room_1v1_${waitingPlayer}_${socket.id}`;
            const p1 = waitingPlayer;
            const p2 = socket.id;
            waitingPlayer = null;

            socket.join(roomName);
            const p1Socket = io.sockets.sockets.get(p1);
            if (p1Socket) p1Socket.join(roomName);

            activeMatches[roomName] = {
                room: roomName,
                p1: p1,
                p2: p2,
                players: {
                    [p1]: { target: 1, score: 0, pool: generatePool(1) },
                    [p2]: { target: 1, score: 0, pool: generatePool(1) }
                },
                timeLeft: 30,
                timerInterval: null
            };

            io.to(roomName).emit('start_countdown');

            setTimeout(() => {
                const match = activeMatches[roomName];
                if (!match) return;

                io.to(p1).emit('game_started', {
                    timeLeft: match.timeLeft,
                    myTarget: match.players[p1].target,
                    myPool: match.players[p1].pool
                });

                io.to(p2).emit('game_started', {
                    timeLeft: match.timeLeft,
                    myTarget: match.players[p2].target,
                    myPool: match.players[p2].pool
                });

                match.timerInterval = setInterval(() => {
                    match.timeLeft--;
                    io.to(roomName).emit('timer_update', match.timeLeft);

                    if (match.timeLeft <= 0) {
                        endMatch(roomName, null, "Temps écoulé !");
                    }
                }, 1000);
            }, 3000);

        } else {
            waitingPlayer = socket.id;
        }
    });

    socket.on('player_click_1v1', (num) => {
        const roomName = Array.from(socket.rooms).find(r => r.startsWith('room_1v1_'));
        if (!roomName || !activeMatches[roomName]) return;

        const match = activeMatches[roomName];
        const playerData = match.players[socket.id];
        if (!playerData) return;

        if (num === playerData.target) {
            playerData.target++;
            playerData.score += 10;
            playerData.pool = generatePool(playerData.target);

            socket.emit('my_grid_updated', {
                target: playerData.target,
                newPool: playerData.pool,
                success: true
            });

            socket.to(roomName).emit('opponent_progress', {
                target: playerData.target
            });

            if (playerData.target > 30) {
                endMatch(roomName, socket.id, `${players[socket.id]?.username || 'Un joueur'} a atteint l'objectif !`);
            }
        } else {
            socket.emit('my_grid_updated', {
                target: playerData.target,
                newPool: playerData.pool,
                success: false
            });
        }
    });

    // ÉCOUTEUR DE MALUS ENTRE JOUEURS
    socket.on('send_malus', (data) => {
        const roomName = Array.from(socket.rooms).find(r => r.startsWith('room_1v1_'));
        if (roomName) {
            socket.to(roomName).emit('receive_malus', data);
        }
    });

    socket.on('get_leaderboard', (type) => {
        let list = Object.values(players);
        if (type === 'regional' && players[socket.id]) {
            const userRegion = players[socket.id].region;
            list = list.filter(p => p.region === userRegion);
        }
        list.sort((a, b) => b.points - a.points);
        socket.emit('leaderboard_data', { type, data: list.slice(0, 50) });
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket.id) waitingPlayer = null;

        const roomName = Array.from(socket.rooms).find(r => r.startsWith('room_1v1_'));
        if (roomName && activeMatches[roomName]) {
            const match = activeMatches[roomName];
            const winnerId = match.p1 === socket.id ? match.p2 : match.p1;
            endMatch(roomName, winnerId, "L'adversaire s'est déconnecté.");
        }

        delete players[socket.id];
    });
});

function generatePool(target) {
    let pool = [target];
    let candidates = [];
    for (let i = 1; i <= 50; i++) if (i !== target) candidates.push(i);
    candidates.sort(() => Math.random() - 0.5);
    return pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
}

function endMatch(roomName, winnerId, reason) {
    const match = activeMatches[roomName];
    if (!match) return;

    if (match.timerInterval) clearInterval(match.timerInterval);

    if (!winnerId) {
        const p1Score = match.players[match.p1].score;
        const p2Score = match.players[match.p2].score;
        if (p1Score > p2Score) winnerId = match.p1;
        else if (p2Score > p1Score) winnerId = match.p2;
    }

    if (winnerId && players[winnerId]) players[winnerId].points += 25;

    io.to(roomName).emit('game_over_1v1', {
        winnerId: winnerId,
        reason: reason,
        players: match.players
    });

    delete activeMatches[roomName];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Chiffre Blitz en ligne sur le port ${PORT}`);
});
