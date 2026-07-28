const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();
let matchmakingQueue = [];

// Génération de grille 100 % garantie à 12 cases
function generateGrid(currentTarget, maxTarget = 50) {
    const target = Number(currentTarget);
    const pool = [target];
    
    // Créer la liste de tous les autres nombres possibles (de 1 à 50 sauf la cible)
    const candidates = [];
    for (let i = 1; i <= maxTarget; i++) {
        if (i !== target) {
            candidates.push(i);
        }
    }
    
    // Mélanger les candidats et en garder 11
    candidates.sort(() => Math.random() - 0.5);
    const decoys = candidates.slice(0, 11);
    
    // Assembler la cible + les 11 pièges (total = 12) et mélanger
    const fullGrid = pool.concat(decoys);
    return fullGrid.sort(() => Math.random() - 0.5);
}

function createRoomState(p1Id, p2Id) {
    return {
        players: {
            [p1Id]: { score: 0, target: 1, pool: generateGrid(1) },
            [p2Id]: { score: 0, target: 1, pool: generateGrid(1) }
        },
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
                timeLeft: room.timeLeft
            });
        }

        room.timerInterval = setInterval(() => {
            room.timeLeft--;
            io.to(roomId).emit('timer_update', room.timeLeft);

            if (room.timeLeft <= 0) {
                end1v1Game(roomId, null, "Temps écoulé !");
            }
        }, 1000);

        // Mélange des cases toutes les 4 secondes
        room.shuffleInterval = setInterval(() => {
            if (!room.gameActive) return;

            for (const pId in room.players) {
                const player = room.players[pId];
                player.pool = generateGrid(player.target);
                io.to(pId).emit('grid_shuffled', {
                    pool: player.pool,
                    target: player.target
                });
            }
        }, 4000);
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
        clearInterval(room.shuffleInterval);

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
    console.log(`🚀 Serveur 1v1 fluide et fixe sur le port ${PORT}`);
});
