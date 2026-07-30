const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

let waitingPlayer = null;
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

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
