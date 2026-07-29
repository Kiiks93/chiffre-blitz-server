const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Connexion Supabase via les variables d'environnement Render
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let waitingPlayer = null;
const activeGames = new Map();

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    // Inscription / Connexion automatique du joueur
    socket.on('register_player', async (data) => {
        const username = data.username || `Joueur_${socket.id.substring(0, 4)}`;
        const region = data.region || 'Hauts-de-France';
        const country = data.country || 'FR';

        // Vérifier si le joueur existe déjà, sinon le créer
        let { data: player, error } = await supabase
            .from('players')
            .select('*')
            .eq('username', username)
            .single();

        if (!player) {
            const { data: newPlayer } = await supabase
                .from('players')
                .insert([{ username, region, country, points: 1000 }])
                .select()
                .single();
            player = newPlayer;
        }

        socket.playerData = player;
        socket.emit('player_registered', player);
    });

    socket.on('find_1v1_match', () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const player1 = waitingPlayer;
            const player2 = socket;
            waitingPlayer = null;

            const roomId = `room_${player1.id}_${player2.id}`;
            player1.join(roomId);
            player2.join(roomId);

            const gameData = {
                roomId,
                player1Socket: player1,
                player2Socket: player2,
                players: {
                    [player1.id]: { target: 1, score: 0, pool: generatePool(1), dbId: player1.playerData?.id },
                    [player2.id]: { target: 1, score: 0, pool: generatePool(1), dbId: player2.playerData?.id }
                },
                timeLeft: 30,
                timer: null
            };

            activeGames.set(roomId, gameData);
            io.to(roomId).emit('start_countdown');

            setTimeout(() => {
                io.to(player1.id).emit('game_started', { myTarget: 1, myPool: gameData.players[player1.id].pool, timeLeft: 30 });
                io.to(player2.id).emit('game_started', { myTarget: 1, myPool: gameData.players[player2.id].pool, timeLeft: 30 });

                gameData.timer = setInterval(() => {
                    gameData.timeLeft--;
                    io.to(roomId).emit('timer_update', gameData.timeLeft);

                    if (gameData.timeLeft <= 0) {
                        clearInterval(gameData.timer);
                        concludeGame(roomId, io, activeGames);
                    }
                }, 1000);

            }, 3000);

        } else {
            waitingPlayer = socket;
        }
    });

    socket.on('player_click_1v1', (num) => {
        for (let [roomId, game] of activeGames.entries()) {
            if (game.players[socket.id]) {
                const playerData = game.players[socket.id];
                if (game.timeLeft <= 0) return;

                if (num === playerData.target) {
                    playerData.target++;
                    playerData.score += 10;
                    playerData.pool = generatePool(playerData.target);

                    socket.emit('my_grid_updated', { target: playerData.target, newPool: playerData.pool, success: true });
                    socket.to(roomId).emit('opponent_progress', { target: playerData.target });
                } else {
                    socket.emit('my_grid_updated', { target: playerData.target, newPool: playerData.pool, success: false });
                }
                break;
            }
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
        for (let [roomId, game] of activeGames.entries()) {
            if (game.players[socket.id]) {
                clearInterval(game.timer);
                concludeGame(roomId, io, activeGames, socket.id);
                break;
            }
        }
    });
});

function generatePool(target) {
    let pool = [target];
    let candidates = [];
    for (let i = 1; i <= 50; i++) {
        if (i !== target) candidates.push(i);
    }
    candidates.sort(() => Math.random() - 0.5);
    return pool.concat(candidates.slice(0, 11)).sort(() => Math.random() - 0.5);
}

async function concludeGame(roomId, io, activeGames, leaverId = null) {
    const game = activeGames.get(roomId);
    if (!game) return;

    const pIds = Object.keys(game.players);
    const p1 = pIds[0];
    const p2 = pIds[1];
    let winnerId = null;
    let reason = "Temps écoulé !";

    if (leaverId) {
        winnerId = pIds.find(id => id !== leaverId);
        reason = "L'adversaire a quitté la partie.";
    } else {
        const s1 = game.players[p1].score;
        const s2 = game.players[p2].score;
        if (s1 > s2) winnerId = p1;
        else if (s2 > s1) winnerId = p2;
        else reason = "Égalité parfaite !";
    }

    // Mise à jour de la base de données Supabase
    for (let id of pIds) {
        const dbId = game.players[id].dbId;
        if (dbId) {
            const isWinner = (id === winnerId);
            const pointChange = isWinner ? 15 : (winnerId ? -10 : 0);

            // Récupérer les données actuelles puis mettre à jour
            const { data: p } = await supabase.from('players').select('points, wins, losses').eq('id', dbId).single();
            if (p) {
                await supabase.from('players').update({
                    points: Math.max(0, p.points + pointChange),
                    wins: isWinner ? p.wins + 1 : p.wins,
                    losses: (!isWinner && winnerId) ? p.losses + 1 : p.losses
                }).eq('id', dbId);
            }
        }
    }

    io.to(roomId).emit('game_over_1v1', { winnerId, reason, players: game.players });
    activeGames.delete(roomId);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
