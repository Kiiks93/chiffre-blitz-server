const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Base de données en mémoire
const players = {}; 
const customRooms = {}; 
let waitingPlayerId = null;

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté :', socket.id);

    // Enregistrement / Connexion du joueur
    socket.on('register_player', (data) => {
        const username = data && data.username ? data.username.trim() : 'Anonyme';
        const region = data && data.region ? data.region : 'Hauts-de-France';

        players[socket.id] = {
            id: socket.id,
            username: username,
            region: region,
            points: players[socket.id]?.points || 0,
            coins: players[socket.id]?.coins || 10000, // Pièces initiales pour tester la boutique
            trophies: players[socket.id]?.trophies || 0,
            inventory: players[socket.id]?.inventory || {},
            equippedPower: players[socket.id]?.equippedPower || null
        };

        socket.emit('player_registered', players[socket.id]);
    });

    // Boutique - Achat de pouvoir
    socket.on('buy_power', (data) => {
        const player = players[socket.id];
        if (!player) return;
        const { id, price } = data;
        if (player.coins >= price) {
            player.coins -= price;
            if (!player.inventory) player.inventory = {};
            player.inventory[id] = (player.inventory[id] || 0) + 1;
            socket.emit('player_registered', player);
        }
    });

    // Équiper un pouvoir
    socket.on('equip_power', (id) => {
        const player = players[socket.id];
        if (!player) return;
        if (player.inventory && player.inventory[id] && player.inventory[id] > 0) {
            player.equippedPower = id;
        }
    });

    // Récompenses Solo
    socket.on('claim_solo_reward', (score) => {
        const player = players[socket.id];
        if (!player) return;
        const earnedCoins = Math.floor(score / 3);
        const earnedPoints = score * 2;
        player.coins += earnedCoins;
        player.points += earnedPoints;
        socket.emit('player_registered', player);
    });

    socket.on('claim_ad_reward', (baseGained) => {
        const player = players[socket.id];
        if (!player) return;
        player.coins += baseGained;
        socket.emit('player_registered', player);
    });

    // Classement
    socket.on('get_leaderboard', () => {
        const sortedPlayers = Object.values(players)
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);
        socket.emit('leaderboard_data', { data: sortedPlayers });
    });

    // Matchmaking 1v1 Aléatoire
    socket.on('find_1v1_match', () => {
        if (waitingPlayerId && waitingPlayerId !== socket.id) {
            const opponentId = waitingPlayerId;
            waitingPlayerId = null;
            
            const roomCode = '1v1_' + Math.random().toString(36).substring(2, 6);
            const socket1 = io.sockets.sockets.get(opponentId);
            const socket2 = socket;
            
            if (socket1) {
                socket1.join(roomCode);
                socket2.join(roomCode);
                
                io.to(roomCode).emit('match_found', {
                    roomCode: roomCode,
                    players: [
                        { id: socket1.id, username: players[socket1.id]?.username || 'Joueur 1' },
                        { id: socket2.id, username: players[socket2.id]?.username || 'Joueur 2' }
                    ]
                });
            }
        } else {
            waitingPlayerId = socket.id;
        }
    });

    socket.on('cancel_1v1_search', () => {
        if (waitingPlayerId === socket.id) {
            waitingPlayerId = null;
        }
    });

    // Salons Privés / Lobbys
    socket.on('get_rooms_list', () => {
        const roomsData = Object.values(customRooms).map(r => ({
            code: r.code,
            playersCount: r.players.length
        }));
        socket.emit('rooms_list_data', roomsData);
    });

    socket.on('create_room', (data) => {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        customRooms[code] = {
            code: code,
            hostId: socket.id,
            players: [{ id: socket.id, username: data.username || 'Hôte' }]
        };
        socket.join(code);
        socket.emit('room_joined_success', customRooms[code]);
    });

    socket.on('join_room', (data) => {
        const room = customRooms[data.code];
        if (room && room.players.length < 2) {
            room.players.push({ id: socket.id, username: players[socket.id]?.username || 'Invité' });
            socket.join(data.code);
            io.to(data.code).emit('room_joined_success', room);
        }
    });

    socket.on('leave_room', () => {
        for (let code in customRooms) {
            let room = customRooms[code];
            room.players = room.players.filter(p => p.id !== socket.id);
            socket.leave(code);
            if (room.players.length === 0) {
                delete customRooms[code];
            } else {
                io.to(code).emit('room_joined_success', room);
            }
        }
    });

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        if (waitingPlayerId === socket.id) {
            waitingPlayerId = null;
        }
        for (let code in customRooms) {
            let room = customRooms[code];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete customRooms[code];
            } else {
                io.to(code).emit('room_joined_success', room);
            }
        }
        delete players[socket.id];
        console.log('Un joueur s\'est déconnecté :', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Chiffre Blitz en écoute sur le port ${PORT}`);
});
