const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();
let matchmakingQueue = [];

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateGrid(currentTarget, maxTarget = 50) {
    const target = Number(currentTarget);
    let pool = [target];
    
    const candidates = [];
    for (let i = 1; i <= maxTarget; i++) {
        if (i !== target) candidates.push(i);
    }
    
    shuffleArray(candidates);
    const decoys = candidates.slice(0, 11);
    
    let fullGrid = pool.concat(decoys);
    fullGrid = shuffleArray(fullGrid);
    
    if (!fullGrid.includes(target)) {
        fullGrid[0] = target;
        fullGrid = shuffleArray(fullGrid);
    }
    
    return fullGrid;
}

function createRoomState(p1Id, p2Id) {
    return {
        players: {
            [p1Id]: { score: 0, target: 1, pool: generateGrid(1) },
            [p2Id]: { score: 0, target: 1, pool: generateGrid(1) }
        },
        timeLeft: 30,
        gameActive: false,
        timerInterval: null
    };
}

io.on('connection', (socket) => {
    console.log(`⚡ Joueur connecté : ${socket.id}`);

    socket.on('find_1v1_match', () => {
        if (matchmakingQueue.includes(socket.id)) return;

        matchmakingQueue.push(socket.id);
        socket.emit('matchmaking_status', 'searching');

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

                io.to(roomId).emit('start_countdown');

                setTimeout(() => {
                    start1v1Game(roomId);
                }, 3500);
            }
        }
    });

    function start1v1Game(roomId) {
        const room = rooms.get(roomId);
        if (!room) return;

        room.gameActive = true;

        for (const pId in room.players) {
            io.to(pId).emit('game_started', {
                myPool: room.players[pId].pool,
                myTarget: room.players[pId].target,
                timeLeft: room.timeLeft
            });
        }

        room.timerInterval = setInterval(() => {
            room.timeLeft--;
            io.to(roomId).emit('timer_update', room.timeLeft);

            if (room.timeLeft <= 0) {
                // Détermination du gagnant au coup de sifflet final !
                const playerIds = Object.keys(room.players);
                const p1Id = playerIds[0];
                const p2Id = playerIds[1];
                const p1 = room.players[p1Id];
                const p2 = room.players[p2Id];

                let winnerId = null;
                if (p1.target > p2.target) {
                    winnerId = p1Id;
                } else if (p2.target > p1.target) {
                    winnerId = p2Id;
                } else if (p1.score > p2.score) {
                    winnerId = p1Id;
                } else if (p2.score > p1.score) {
                    winnerId = p2Id;
                }

                end1v1Game(roomId, winnerId, "Temps écoulé !");
            }
        }, 1000);
    }

    socket.on('player_click_1v1', (num) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        if (!room.gameActive) return;

        const playerState = room.players[socket.id];
        if (!playerState) return;

        const clickedNum = Number(num);

        if (clickedNum === playerState.target) {
            playerState.target++;
            playerState.score += 10;

            if (playerState.target > 50) {
                end1v1Game(roomId, socket.id, "Cible 50 atteinte !");
                return;
            }

            playerState.pool = generateGrid(playerState.target);

            socket.emit('my_grid_updated', {
                target: playerState.target,
                score: playerState.score,
                newPool: playerState.pool,
                success: true
            });

            socket.to(roomId).emit('opponent_progress', {
                target: playerState.target,
                score: playerState.score
            });
        } else {
            room.timeLeft = Math.max(0, room.timeLeft - 1);
            
            socket.emit('my_grid_updated', {
                target: playerState.target,
                score: playerState.score,
                newPool: playerState.pool,
                success: false
            });

            io.to(roomId).emit('timer_update', room.timeLeft);
        }
    });

    function end1v1Game(roomId, winnerId, reason) {
        const room = rooms.get(roomId);
        if (!room) return;

        room.gameActive = false;
        clearInterval(room.timerInterval);

        io.to(roomId).emit('game_over_1v1', {
            winnerId,
            reason,
            players: room.players
        });

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
    console.log(`🚀 Serveur 1v1 prêt sur le port ${PORT}`);
});
