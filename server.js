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

io.on('connection', (socket) => {
    socket.on('register_player', (data) => {
        const username = data.username;
        if (!playersDB[username]) {
            playersDB[username] = { username: username, region: data.region || 'Hauts-de-France', points: 0, coins: 0, trophies: 0 };
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

    socket.on('find_1v1_match', () => {
        if (waitingPlayerId && waitingPlayerId !== socket.id) {
            waitingPlayerId = null;
        } else {
            waitingPlayerId = socket.id;
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayerId === socket.id) waitingPlayerId = null;
        delete players[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Serveur démarré sur le port ${PORT}`); });
