const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static files (public फोल्डरका लागि)
app.use(express.static(path.join(__dirname, 'public')));

// रुम अनुसार म्यासेज र युजर ट्र्याक गर्ने डेटा
const roomMessages = {}; 
const roomUsers = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // रुम जोइन गर्ने
    socket.on('join_room', ({ username, room }) => {
        socket.join(room);
        socket.username = username;
        socket.room = room;

        // रुममा युजर थप्ने
        if (!roomUsers[room]) roomUsers[room] = [];
        roomUsers[room].push({ id: socket.id, username });

        // पुरानो म्यासेज पठाउने
        if (!roomMessages[room]) roomMessages[room] = [];
        socket.emit('load_messages', roomMessages[room]);

        // अनलाइन युजर लिस्ट अपडेट पठाउने
        io.to(room).emit('update_users', roomUsers[room]);

        // रुमका साथीहरूलाई जोइन भएको सूचना दिने
        io.to(room).emit('chat_message', {
            username: 'System',
            message: `${username} has joined the room.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // नयाँ म्यासेज पठाउँदा
    socket.on('chat_message', (data) => {
        const { room, message, username } = data;
        const chatData = {
            username,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (!roomMessages[room]) roomMessages[room] = [];
        roomMessages[room].push(chatData);

        // उक्त रुमका सबैलाई म्यासेज ब्रोडकास्ट गर्ने
        io.to(room).emit('chat_message', chatData);
    });

    // डिस्कनेक्ट हुँदा
    socket.on('disconnect', () => {
        const { room, username } = socket;
        if (room && username) {
            if (roomUsers[room]) {
                roomUsers[room] = roomUsers[room].filter(u => u.id !== socket.id);
                io.to(room).emit('update_users', roomUsers[room]);
            }
            io.to(room).emit('chat_message', {
                username: 'System',
                message: `${username} has left the room.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});