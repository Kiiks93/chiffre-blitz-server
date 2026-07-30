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
let rooms = {}; // Stockage des salons privés

io.on('connection', (socket) => {
    console.log(`Un joueur s'est connecté : ${socket.id}`);

    // Enregistrement du profil
    socket.on('register_player', (profile) => {
        players[socket.id] = {
            id: socket.id,
            username: profile.username,
            region: profile.region,
            points: profile.points || 1000
        };
        socket.emit('player_registered', players[socket.id]);
    });

    // --- GESTION DES SALONS PRIVÉS ---
    socket.on('create_room', (data) => {
        // Utilise le nom saisi s'il existe, sinon génère un code aléatoire
        const roomCode = data?.roomName && data.roomName.trim() !== '' 
            ? data.roomName.trim().toUpperCase() 
            : Math.random().toString(36).substring(2, 6).toUpperCase();

        rooms[roomCode] = {
            code: roomCode,
            password: data?.password || '', // Enregistrement du mot de passe optionnel
            host: socket.id,
            players: [{ id: socket.id, username: data?.username || players[socket.id]?.username || 'Hôte' }]
        };

        socket.join(roomCode);
        socket.emit('room_joined_success', {
            code: roomCode,
            players: rooms[roomCode].players
        });
        console.log(`Salon créé : ${roomCode} par ${socket.id}`);
    });

    socket.on('join_room', (data) => {
        const roomCode = data?.code ? data.code.toUpperCase() : '';
        const passwordInput = data?.password || '';
        const room = rooms[roomCode];

        if (room && room.players.length < 2) {
            // Vérification du mot de passe si le salon en possède un
            if (room.password && room.password !== passwordInput) {
                socket.emit('room_error', "Mot de passe incorrect !");
                return;
            }

            const username = players[socket.id]?.username || 'Adversaire';
            room.players.push({ id: socket.id, username: username });
            socket.join(roomCode);

            // Informer tout le monde dans le salon
            io.to(roomCode).emit('room_players_update', { players: room.players });
            socket.emit('room_joined_success', { code: roomCode, players: room.players });
            console.log(`Joueur ${socket.id} a rejoint le salon ${roomCode}`);
        } else {
            socket.emit('room_error', "Salon introuvable ou déjà complet !");
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
            .filter(r => r.players.length < 2)
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

            io.to(roomName).emit('start_countdown');
            // Logique de lancement de partie aléatoire ici...
        } else {
            waitingPlayer = socket.id;
        }
    });

    // Déconnexion générale
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
        delete players[socket.id];
        console.log(`Déconnexion : ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur actif sur le port ${PORT}`);
});
