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

app.get('/', (req, res) => {
    res.send('Chiffre Blitz Server is running! ⚡');
});

// Structures de données en mémoire
let players = {};        // socket.id -> { username, region, points, coins, trophies }
let waitingQueue = [];   // File d'attente pour le matchmaking aléatoire
let activeRooms = {};    // code -> { code, password, players: {...}, gameState }

io.on('connection', (socket) => {
    console.log(`🔌 Un joueur s'est connecté : ${socket.id}`);

    // Enregistrement du profil
    socket.on('register_player', (profile) => {
        players[socket.id] = {
            username: profile.username || 'Joueur',
            region: profile.region || 'Hauts-de-France',
            points: profile.points || 1000,
            coins: profile.coins || 100,
            trophies: profile.trophies || 0
        };
        socket.emit('player_registered', players[socket.id]);
    });

    // ==========================================
    // MATCHMAKING ALÉATOIRE 1v1
    // ==========================================
    socket.on('find_1v1_match', () => {
        console.log(`🔍 Joueur en recherche de match : ${socket.id}`);
        
        if (!waitingQueue.includes(socket.id)) {
            waitingQueue.push(socket.id);
        }

        if (waitingQueue.length >= 2) {
            const p1Id = waitingQueue.shift();
            const p2Id = waitingQueue.shift();

            const s1 = io.sockets.sockets.get(p1Id);
            const s2 = io.sockets.sockets.get(p2Id);

            if (!s1 || !s2) {
                if (s1) waitingQueue.push(p1Id);
                if (s2) waitingQueue.push(p2Id);
                return;
            }

            const roomCode = 'MATCH_' + Math.random().toString(36).substring(2, 7).toUpperCase();
            
            s1.join(roomCode);
            s2.join(roomCode);

            console.log(`⚔️ Match trouvé entre ${p1Id} et ${p2Id} dans le salon ${roomCode}`);

            activeRooms[roomCode] = {
                code: roomCode,
                isPrivate: false,
                players: {
                    [p1Id]: { username: players[p1Id]?.username || 'Joueur 1', target: 1, score: 0, pool: generateRandomPool(1) },
                    [p2Id]: { username: players[p2Id]?.username || 'Joueur 2', target: 1, score: 0, pool: generateRandomPool(1) }
                },
                timeLeft: 30,
                timerInterval: null
            };

            io.to(roomCode).emit('start_countdown');

            setTimeout(() => {
                start1v1GameLoop(roomCode);
            }, 3000);
        }
    });

    // ==========================================
    // GESTION DES CLICS PENDANT LE DUEL 1v1
    // ==========================================
    socket.on('player_click_1v1', (num) => {
        let roomCode = null;
        for (let code in activeRooms) {
            if (activeRooms[code].players && activeRooms[code].players[socket.id]) {
                roomCode = code;
                break;
            }
        }
        if (!roomCode) return;

        let room = activeRooms[roomCode];
        let pData = room.players[socket.id];
        if (!pData || room.timeLeft <= 0) return;

        if (num === pData.target) {
            // Bonne pioche !
            pData.score += 10;
            pData.target++;
            pData.pool = generateRandomPool(pData.target);

            // Confirmer au joueur et lui envoyer sa nouvelle grille
            socket.emit('my_grid_updated', {
                target: pData.target,
                newPool: pData.pool,
                success: true
            });

            // Informer l'adversaire de la progression de sa cible
            socket.to(roomCode).emit('opponent_progress', {
                target: pData.target
            });
        } else {
            // Mauvaise pioche
            socket.emit('my_grid_updated', {
                target: pData.target,
                newPool: pData.pool,
                success: false
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Déconnexion : ${socket.id}`);
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
        delete players[socket.id];

        for (let code in activeRooms) {
            let room = activeRooms[code];
            if (room.players && room.players[socket.id]) {
                io.to(code).emit('room_error', "L'adversaire s'est déconnecté.");
                if (room.timerInterval) clearInterval(room.timerInterval);
                delete activeRooms[code];
            }
        }
    });
});

// Générateur de grille de nombres aléatoires
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

// Boucle principale d'une partie 1v1
function start1v1GameLoop(roomCode) {
    let room = activeRooms[roomCode];
    if (!room) return;

    for (let pId in room.players) {
        io.to(pId).emit('game_started', {
            timeLeft: room.timeLeft,
            myTarget: room.players[pId].target,
            myPool: room.players[pId].pool
        });
    }

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        io.to(roomCode).emit('timer_update', room.timeLeft);

        if (room.timeLeft <= 0) {
            clearInterval(room.timerInterval);
            end1v1Game(roomCode, "Temps écoulé !");
        }
    }, 1000);
}

function end1v1Game(roomCode, reason) {
    let room = activeRooms[roomCode];
    if (!room) return;
    if (room.timerInterval) clearInterval(room.timerInterval);

    let pIds = Object.keys(room.players);
    if (pIds.length < 2) {
        delete activeRooms[roomCode];
        return;
    }

    let p1Id = pIds[0];
    let p2Id = pIds[1];
    let p1 = room.players[p1Id];
    let p2 = room.players[p2Id];

    let winnerId = null;
    if (p1.score > p2.score) winnerId = p1Id;
    else if (p2.score > p1.score) winnerId = p2Id;

    io.to(roomCode).emit('game_over_1v1', {
        reason: reason,
        winnerId: winnerId,
        players: room.players
    });

    delete activeRooms[roomCode];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur Chiffre Blitz démarré sur le port ${PORT}`);
});
