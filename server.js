const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();
let matchmakingQueue = [];

function generateGrid(currentTarget, maxTarget = 50) {
    let pool = [currentTarget];
    let rest = [];
    for (let i = currentTarget + 1; i <= Math.min(currentTarget + 18, maxTarget); i++) {
        rest.push(i);
    }
    rest.sort(() => Math.random() - 0.5);
    pool = pool.concat(rest.slice(0, 11));
    return pool.sort(() => Math.random() - 0.5);
}

function createRoomState(p1Id, p2Id) {
    return {
        players: {
            [p1Id]: { score: 0, target: 1 },
            [p2Id]: { score: 0, target: 1 }
        },
        activePool: generateGrid(1),
        timeLeft: 30,
        gameActive: false,
        timerInterval: null,
        shuffleInterval: null
    };
}

io.on('connection', (socket) => {
    console.log(`⚡ Joueur connecté : ${socket.id}`);

    socket.on('find_1v1_match', () => {
        if (matchmakingQueue.includes(socket.id)) return;

        matchmakingQueue.push(socket.id);
        socket.emit('matchmaking_status', 'Recherche d\'un adversaire...');

        if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift();
            const p2 = matchmakingQueue.shift();
            const roomId = `room_1v1_${Date.now()}`;

            const s1 = io.sockets.sockets.get(p1);
            const s2 = io.sockets.sockets.get(p2);

            if (s1 && s2) {
                s1.join(roomId);
                s2.join(roomId);
                s1.roomId = roomId;
                s2.roomId = roomId;

                const roomData = createRoomState(p1, p2);
                rooms.set(roomId, roomData);

                io.to(roomId).emit('match_found', { roomId, players: [p1, p2] });
                start1v1Game(roomId);
            }
        }
    });

    function start1v1Game(roomId) {
        const room = rooms.get(roomId);
        if (!room) return;

        room.gameActive = true;
        io.to(roomId).emit('game_started', { activePool: room.activePool, timeLeft: room.timeLeft });

        room.timerInterval = setInterval(() => {
            room.timeLeft--;
            io.to(roomId).emit('timer_update', room.timeLeft);

            if (room.timeLeft <= 0) {
                end1v1Game(roomId, null);
            }
        }, 1000);

        room.shuffleInterval = setInterval(() => {
            if (!room.gameActive) return;
            const p1Id = Object.keys(room.players)[0];
            const p2Id = Object.keys(room.players)[1];
            const currentMinTarget = Math.min(room.players[p1Id].target, room.players[p2Id].target);
            room.activePool = generateGrid(currentMinTarget);
            io.to(roomId).emit('grid_shuffled', room.activePool);
        }, 2200);
    }

    socket.on('player_click_1v1', (num) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        if (!room.gameActive) return;

        const playerState = room.players[socket.id];
        if (!playerState) return;

        if (num === playerState.target) {
            playerState.target++;
            playerState.score += 10;

            if (playerState.target > 50) {
                end1v1Game(roomId, socket.id);
                return;
            }

            room.activePool = generateGrid(playerState.target);

            io.to(roomId).emit('player_progress', {
                playerId: socket.id,
                target: playerState.target,
                score: playerState.score,
                newPool: room.activePool
            });
        } else {
            room.timeLeft = Math.max(0, room.timeLeft - 1);
            io.to(roomId).emit('timer_update', room.timeLeft);
        }
    });

    function end1v1Game(roomId, winnerId) {
        const room = rooms.get(roomId);
        if (!room) return;

        room.gameActive = false;
        clearInterval(room.timerInterval);
        clearInterval(room.shuffleInterval);

        io.to(roomId).emit('game_over_1v1', { winnerId, players: room.players });
        rooms.delete(roomId);
    }

    socket.on('disconnect', () => {
        matchmakingQueue = matchmakingQueue.filter(id => id !== socket.id);
        if (socket.roomId && rooms.has(socket.roomId)) {
            io.to(socket.roomId).emit('opponent_left');
            rooms.delete(socket.roomId);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur 1v1 actif sur le port ${PORT}`);
});
