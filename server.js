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

let activeRooms = {}; // Stocke les salons : { roomName: { name, password, hasPassword } }

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté:', socket.id);

    // Envoyer la liste des salons au nouvel arrivant
    socket.emit('room-list', Object.values(activeRooms).map(r => ({
        name: r.name,
        hasPassword: r.hasPassword
    })));

    // Création d'un salon
    socket.on('create-room', ({ roomName, password }) => {
        if (!roomName || roomName.trim() === '') return;

        const cleanName = roomName.trim();
        const hasPassword = password && password.trim() !== '';

        activeRooms[cleanName] = {
            name: cleanName,
            password: password ? password.trim() : '',
            hasPassword: hasPassword
        };

        socket.join(cleanName);
        console.log(`Salon créé : ${cleanName} | Sécurisé : ${hasPassword}`);

        // Diffuser la nouvelle liste des salons à tout le monde
        io.emit('room-list', Object.values(activeRooms).map(r => ({
            name: r.name,
            hasPassword: r.hasPassword
        })));

        socket.emit('joined-success', { roomName: cleanName });
    });

    // Rejoindre un salon
    socket.on('join-room', ({ roomName, password }) => {
        const room = activeRooms[roomName];
        if (!room) {
            socket.emit('error-msg', "Ce salon n'existe pas ou a été fermé.");
            return;
        }

        if (room.hasPassword && room.password !== (password ? password.trim() : '')) {
            socket.emit('error-msg', "Mot de passe incorrect.");
            return;
        }

        socket.join(roomName);
        socket.emit('joined-success', { roomName });
        console.log(`Utilisateur a rejoint le salon : ${roomName}`);
    });

    socket.on('disconnect', () => {
        console.log('Utilisateur déconnecté:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
