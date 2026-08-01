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
