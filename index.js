const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Basic Route (Render/Browser को लागि simple response)
app.get('/', (req, res) => {
  res.send('MIG KO BAU Backend is Live & Running! 🚀');
});

const io = new Server(server, {
  cors: { origin: "*" }
});

const activeUsers = {};

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  // 1. Register User / ID
  socket.on('registerUser', (username) => {
    socket.username = username;
    activeUsers[username] = socket.id;
    io.emit('activeUsersList', Object.keys(activeUsers));
  });

  // 2. Join Chatroom (5 Chatrooms)
  socket.on('joinRoom', (roomName) => {
    Array.from(socket.rooms).forEach(r => {
      if (r !== socket.id) socket.leave(r);
    });
    socket.join(roomName);
    socket.currentRoom = roomName;

    io.to(roomName).emit('chatMessage', {
      user: 'SYSTEM',
      text: `👋 ${socket.username} ले ${roomName} मा स्वागत छ!`,
      isSystem: true
    });
  });

  // 3. Room Chat Message
  socket.on('roomMessage', (data) => {
    io.to(data.room).emit('chatMessage', {
      user: data.user,
      text: data.text,
      isSystem: false
    });
  });

  // 4. Private Message (PM)
  socket.on('privateMessage', (data) => {
    const targetSocketId = activeUsers[data.toUser];
    if (targetSocketId) {
      io.to(targetSocketId).emit('privateMessage', data);
      socket.emit('privateMessage', data);
    }
  });

  // 5. Send Gift
  socket.on('sendGift', (data) => {
    io.to(data.room).emit('giftBroadcast', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      delete activeUsers[socket.username];
      io.emit('activeUsersList', Object.keys(activeUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));