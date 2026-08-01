const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const playersDB = {};
let players = {};
let waitingPlayerId = null;
let customRooms = {};

// Grille de prix officielle sécurisée côté serveur
const POWERS_PRICES = {
    'spotlight': 30,
    'freeze': 60,
    'joker': 150,
    'nova': 400,
    'quake': 40,
    'micro': 80,
    'eclipse': 200,
    'chaos': 500
};

io.on('connection', (socket) => {
    socket.on('register_player', (data) => {
        const username = data.username;
        if (!playersDB[username]) {
            playersDB[username] = { username: username, region: data.region || 'Hauts-de-France', points: 0, coins: 150, trophies: 0, inventory: {}, equippedPower: null };
        }
        socket.username = username;
        players[socket.id] = { id: socket.id, username: username };
        socket.emit('player_registered', playersDB[username]);
    });

    socket.on('claim_solo_reward', (score) => {
        const username = socket.username;
        if (username && playersDB[username]) {
            playersDB[username].coins += Math.floor(score / 3);
            playersDB[username].points += Math.floor(score / 10);
            socket.emit('player_registered', playersDB[username]);
        }
    });

    socket.on('claim_ad_reward', (bonusCoins) => {
        const username = socket.username;
        if (username && playersDB[username]) {
            playersDB[username].coins += Number(bonusCoins) || 0;
            socket.emit('player_registered', playersDB[username]);
        }
    });

    socket.on('buy_power', (data) => {
        const username = socket.username;
        const officialPrice = POWERS_PRICES[data.id];

        // Vérification de la sécurité basée sur le dictionnaire serveur
        if (username && playersDB[username] && officialPrice !== undefined) {
            if (playersDB[username].coins >= officialPrice) {
                playersDB[username].coins -= officialPrice;
                if (!playersDB[username].inventory) playersDB[username].inventory = {};
                playersDB[username].inventory[data.id] = (playersDB[username].inventory[data.id] || 0) + 1;
                socket.emit('player_registered', playersDB[username]);
            }
        }
    });

    socket.on('equip_power', (id) => {
        const username = socket.username;
        if (username && playersDB[username]) {
            playersDB[username].equippedPower = id;
        }
    });

    socket.on('get_leaderboard', () => {
        const sorted = Object.values(playersDB).sort((a, b) => b.points - a.points);
        socket.emit('leaderboard_data', { data: sorted.slice(0, 50) });
    });

    socket.on('get_rooms_list', () => {
        const list = Object.values(customRooms).map(r => ({ code: r.code, playersCount: r.players.length }));
        socket.emit('rooms_list_data', list);
    });

    socket.on('create_room', (data) => {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        customRooms[code] = { code: code, players: [socket.id] };
        socket.join(code);
        socket.emit('room_joined_success', { code: code, players: [{ id: socket.id, username: data.username }] });
    });

    socket.on('join_room', (data) => {
        const room = customRooms[data.code];
        if (!room || room.players.length >= 2) return;
        room.players.push(socket.id);
        socket.join(data.code);
        const playersData = room.players.map(pid => ({ id: pid, username: players[pid]?.username || 'Joueur' }));
        io.to(data.code).emit('room_joined_success', { code: data.code, players: playersData });
    });

    socket.on('leave_room', () => {
        for (let code in customRooms) {
            let room = customRooms[code];
            let index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                socket.leave(code);
                if (room.players.length === 0) {
                    delete customRooms[code];
                }
                break;
            }
        }
    });

    socket.on('find_1v1_match', () => {
        if (waitingPlayerId && waitingPlayerId !== socket.id) {
            waitingPlayerId = null;
        } else {
            waitingPlayerId = socket.id;
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayerId === socket.id) waitingPlayerId = null;
        for (let code in customRooms) {
            let room = customRooms[code];
            let index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                socket.leave(code);
                if (room.players.length === 0) delete customRooms[code];
                break;
            }
        }
        delete players[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Serveur démarré sur le port ${PORT}`); });
