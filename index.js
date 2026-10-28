const express = require('express')
const WebSocket = require('ws');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
// any Express middlewares go here

// any API REST routers go here
app.get('/join', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, function () {
    console.log("Server is ready...");
});

const wss = new WebSocket.WebSocketServer({ server: server });

// Every host screen gets its own game, keyed by a 6-digit code (like Kahoot).
// games[code] = { host: ws, players: [], place: 1, started: false }
const games = {};

function makeGameCode() {
    let code;
    do {
        code = String(Math.floor(100000 + Math.random() * 900000));
    } while (games[code]);
    return code;
}

// Send a message to everyone (host + players) in one game.
function sendToGame(code, data) {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    wss.clients.forEach(function (client) {
        if (client.gameCode === code && client.readyState === WebSocket.OPEN) {
            client.send(text);
        }
    });
}

// Players without the socket object, so they can be sent as JSON.
function publicPlayers(game) {
    return game.players.map(function (p) {
        return { name: p.name, color: p.color, accuracy: p.accuracy, percentage: p.percentage };
    });
}

wss.on('connection', function (ws) {
    console.log("Client connected!")
    ws.on('error', function (err) {
        console.error("Error with socket:", err);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        const code = ws.gameCode;
        const game = games[code];
        if (!game) return;

        if (ws.isHost) {
            // The host screen closed, so the game is over for everyone in it.
            sendToGame(code, { action: 'hostLeft' });
            wss.clients.forEach(function (client) {
                if (client.gameCode === code) client.gameCode = null;
            });
            delete games[code];
            console.log('Game ' + code + ' ended (host left)');
            return;
        }

        const playerIndex = game.players.findIndex(player => player.socket === ws);
        if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            sendToGame(code, { action: 'updateAllPlayers', players: publicPlayers(game) });
        }
        console.log('A player left game ' + code + '. Players:', game.players.map(p => p.name));
    });

    ws.on('message', function (data) {
        let message;
        try {
            message = JSON.parse(data);
        } catch (e) {
            return;
        }

        // Host screen asks for a new game code.
        if (message.action == 'createGame') {
            const code = makeGameCode();
            games[code] = { host: ws, players: [], place: 1, started: false };
            ws.gameCode = code;
            ws.isHost = true;
            ws.send(JSON.stringify({ action: 'gameCreated', code: code }));
            console.log('Game ' + code + ' created');
            return;
        }

        if (message.action == 'joinGame') {
            const code = String(message.code || '').replace(/\D/g, '');
            const game = games[code];
            if (!game) {
                ws.send(JSON.stringify({ action: 'joinError', message: "We couldn't find a game with that code." }));
                return;
            }
            if (game.started) {
                ws.send(JSON.stringify({ action: 'joinError', message: 'That game has already started. Wait for the next round!' }));
                return;
            }
            ws.gameCode = code;
            game.place = 1;
            const newPlayer = {
                name: message.name,
                color: message.color,
                accuracy: message.accuracy,
                percentage: message.percentage,
                socket: ws,
            }
            game.players.push(newPlayer)
            ws.send(JSON.stringify({
                action: 'updatePlayersPage',
                name: message.name,
                color: message.color,
            }))
            sendToGame(code, { action: 'updateAllPlayers', players: publicPlayers(game) });
        }

        // Everything below only applies to someone who is in a game.
        const code = ws.gameCode;
        const game = games[code];
        if (!game) return;

        if (message.action == 'startGame') {
            game.started = true;
        }
        if (message.action == 'sendPercentage') {
            const existingPlayer = game.players.find(player => player.socket === ws);
            if (!existingPlayer) return;
            existingPlayer.percentage = message.percentage;
            existingPlayer.accuracy = message.accuracy;
            sendToGame(code, {
                action: 'updateBoard',
                color: existingPlayer.color,
                percentage: existingPlayer.percentage,
            });
        }
        if (message.action == 'finished') {
            const existingPlayer = game.players.find(player => player.socket === ws);
            if (!existingPlayer) return;
            existingPlayer.percentage = message.percentage;
            sendToGame(code, {
                action: 'updateWinners',
                name: existingPlayer.name,
                color: existingPlayer.color,
                place: game.place,
                time: message.time,
                accuracy: message.accuracy,
                wpm: message.wpm,
            });
            ws.send(JSON.stringify({
                action: 'updateWinnersPage',
                time: message.time,
                accuracy: existingPlayer.accuracy,
                wpm: message.wpm,
            }))
            game.place += 1;
        }
        if (message.action == 'playAgain') {
            game.players = [];
            game.place = 1;
            game.started = false;
        }

        // Pass the original message along to everyone in the same game.
        sendToGame(code, data.toString());
    });
});
