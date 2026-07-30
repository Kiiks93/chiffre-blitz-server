const express = require('express');
const http = http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

let waitingPlayer = null;
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    // Matchmaking public
    socket.on('find_match', () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const roomId = `room_${Date.now()}`;
            socket.join(roomId);
            waitingPlayer.join(roomId);

            rooms.set(roomId, {
                players: [waitingPlayer.id, socket.id],
                state: 'playing'
            });

            io.to(roomId).emit('match_found', { roomId });
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting', { message: 'Recherche d\'un adversaire en cours...' });
        }
    });

    // Création de partie privée (Correction ici)
    socket.on('create_private_room', () => {
        const roomId = `private_${Math.random().toString(36).substring(2, 8)}`;
        socket.join(roomId);
        rooms.set(roomId, { players: [socket.id], state: 'waiting' });
        socket.emit('private_room_created', { roomId });
    });

    // Rejoindre une partie privée
    socket.on('join_private_room', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.players.length === 1) {
            socket.join(roomId);
            room.players.push(socket.id);
            room.state = 'playing';
            io.to(roomId).emit('match_found', { roomId });
        } else {
            socket.emit('error_message', { message: 'Salon introuvable ou complet.' });
        }
    });

    socket.on('game_action', (data) => {
        const { roomId, action } = data;
        socket.to(roomId).emit('opponent_action', action);
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        console.log(`Joueur déconnecté : ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Chiffre Blitz démarré sur le port ${PORT}`);
});
