const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// index.html देखाउने
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Real-time Chat Logic
io.on('connection', (socket) => {

    socket.on('joinUser', (username) => {
        socket.username = username;
        io.emit('userStatus', `📢 ${username} च्याटरूममा आउनुभयो!`);
    });

    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', data);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('userStatus', `🚪 ${socket.username} निस्कनुभयो।`);
        }
    });
});

server.listen(3000, () => {
    console.log('Server तयार भयो! http://localhost:3000 मा हेर्नुहोस्।');
});