const express = require('express')
const WebSocket = require('ws');

const app = express();
app.use(express.static('public'));
// any Express middlewares go here

// any API REST routers go here

const server = app.listen(3000, function () {
    console.log("Server is ready...");
});

//const wss = new WebSocket.WebSocketServer({ port: 8080 });
const wss = new WebSocket.WebSocketServer({ server: server });

let players = [];
let place = 1;


wss.on('connection', function (ws) {
    console.log("Cleint connected!")
    // ws is the client that has connected
    ws.on('error', function (err) {
        console.error("Error with socket:", err);
    });

    // send a welcome message when a client connects
    ws.on('close', () => {
        console.log('Client disconnected');
        console.log(players.find(player => player.socket === ws));
        // Remove the player from the players array
        const playerIndex = players.findIndex(player => player.socket === ws);
        if (playerIndex !== -1) {
            players.splice(playerIndex, 1);
        }
        // players = players.filter(player => player.ws !== ws);
        console.log('A player disconnected. Updated players:', players.map(p => p.name));
    });

    ws.on('message', function (data) {
        console.log("Recieved message from client!")
        message = JSON.parse(data);
        if (message.action == 'j') {
            players.push({
                name: message.name,
                team: message.teamColor,
                socket: ws,
            }) 
        }
        if (message.action == 'joinGame') {
            console.log(players.length);
            place = 1;
            newPlayer = {
                name: message.name,
                color: message.color,
                accuracy: message.accuracy,
                percentage: message.percentage,
                socket: ws,
            }
            players.push(newPlayer) 
            newPlayer.socket.send(JSON.stringify({
                action: 'updatePlayersPage',
                name: message.name,
                color: message.color,
            }))
            wss.clients.forEach(function (client) {
                client.send(JSON.stringify({
                    action: 'updateAllPlayers',
                    players: players,
                }));
            });
        }
        if (message.action == 'sendPercentage') {
            const existingPlayer = players.find(player => player.socket === ws);
            existingPlayer.percentage = message.percentage;
            existingPlayer.accuracy = message.accuracy;
            console.log(existingPlayer.percentage);
            console.log(existingPlayer.percentage);
            wss.clients.forEach(function (client) {
                client.send(JSON.stringify({
                    action: 'updateBoard',
                    color: existingPlayer.color,
                    percentage: existingPlayer.percentage,
                }));
            });
        }
        if (message.action == 'finished') {
            const existingPlayer = players.find(player => player.socket === ws);
            existingPlayer.percentage = message.percentage;
            console.log(existingPlayer.percentage);
            wss.clients.forEach(function (client) {
                client.send(JSON.stringify({
                    action: 'updateWinners',
                    name: existingPlayer.name,
                    color: existingPlayer.color,
                    place: place,
                    time: message.time,
                    accuracy: message.accuracy,
                    wpm: message.wpm,
                }));
            });
            existingPlayer.socket.send(JSON.stringify({
                action: 'updateWinnersPage',
                time: message.time,
                accuracy: existingPlayer.accuracy,
                wpm: message.wpm,
            }))
            place += 1;
        }
        if(message.action == 'playAgain') {
            players = [];
            place = 1;
        }

        wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: false } );
        }
        });
  });
});


// ws.send(JSON.stringify(newPlayer)) ;
// wss.clients.forEach(function (client) {
//     client.send( JSON.stringify(newPlayer) );
// });