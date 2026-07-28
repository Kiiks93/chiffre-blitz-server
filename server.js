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
    pool = pool.concat(rest.slice(0, 11)); // 12 cases
    return pool.sort(() => Math.random() - 0.5);
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

                io.to(roomId).emit('match_found', { roomId, players: [p1, p2] });
                
                // Lancer le compte à rebours de 3s avant la partie
                startCountdown(roomId);
            }
        }
    });

    function startCountdown(roomId) {
        let count = 3;
        io.to(roomId).emit('countdown_tick', count);

        const countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                io.to(roomId).emit('countdown_tick', count);
            } else {
                clearInterval(countdownTimer);
                io.to(roomId).emit('countdown_finished');
                start1v1Game(roomId);
            }
        }, 1000);
    }

    function start1v1Game(roomId) {
        const room = rooms.get(roomId);
        if (!room) return;

        room.gameActive = true;

        // Envoyer à chaque joueur sa propre grille initiale
        for (const pId in room.players) {
            const pSocket = io.sockets.sockets.get(pId);
            if (pSocket) {
                pSocket.emit('game_started', {
                    myPool: room.players[pId].pool,
                    timeLeft: room.timeLeft
                });
            }
        }

        // Chronomètre global du serveur
        room.timerInterval = setInterval(() => {
            room.timeLeft--;
            io.to(roomId).emit('timer_update', room.timeLeft);

            if (room.timeLeft <= 0) {
                end1v1Game(roomId, null, "Temps écoulé !");
            }
        }, 1000);

        // Mélange automatique personnalisé pour la cible de chaque joueur
        room.shuffleInterval = setInterval(() => {
            if (!room.gameActive) return;

            for (const pId in room.players) {
                const player = room.players[pId];
                player.pool = generateGrid(player.target);
                const pSocket = io.sockets.sockets.get(pId);
                if (pSocket) {
                    pSocket.emit('grid_shuffled', player.pool);
                }
            }
        }, 2500);
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

            // Condition de victoire : Atteindre 50
            if (playerState.target > 50) {
                end1v1Game(roomId, socket.id, "Cible 50 atteinte !");
                return;
            }

            // Générer la nouvelle grille personnelle pour ce joueur
            playerState.pool = generateGrid(playerState.target);

            // Informer le joueur de sa nouvelle grille
            socket.emit('my_grid_updated', {
                target: playerState.target,
                score: playerState.score,
                newPool: playerState.pool
            });

            // Informer l'adversaire de la progression de ce joueur
            socket.to(roomId).emit('opponent_progress', {
                target: playerState.target,
                score: playerState.score
            });
        } else {
            // Pénalité d'erreur : -1 seconde
            room.timeLeft = Math.max(0, room.timeLeft - 1);
            io.to(roomId).emit('timer_update', room.timeLeft);
        }
    });

    function end1v1Game(roomId, winnerId, reason) {
        const room = rooms.get(roomId);
        if (!room) return;

        room.gameActive = false;
        clearInterval(room.timerInterval);
        clearInterval(room.shuffleInterval);

        // Envoyer le récapitulatif complet aux deux joueurs
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
    console.log(`🚀 Serveur 1v1 corrigé actif sur le port ${PORT}`);
});
