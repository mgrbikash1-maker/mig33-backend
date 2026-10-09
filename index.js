const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io with full CORS setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// User memory storage
const activeUsers = new Map(); // socket.id -> username
const roomUsers = new Map();   // roomName -> Set of socket.ids

// Root route (Fixes ENOENT index.html error on Render)
app.get('/', (req, res) => {
  res.status(200).send('MIG KO BAU Backend Server is Live and Running 🚀');
});

// Socket Connections
io.on('connection', (socket) => {
  console.log(`[CONNECTED] Client: ${socket.id}`);

  // 1. Register User
  socket.on('registerUser', (username) => {
    if (!username) return;
    activeUsers.set(socket.id, username);
    console.log(`[REGISTER] User: ${username} (${socket.id})`);
    
    io.emit('activeUsersList', Array.from(activeUsers.values()));
  });

  // 2. Join Chatroom
  socket.on('joinRoom', (roomName) => {
    const username = activeUsers.get(socket.id) || 'Guest';

    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room);
        if (roomUsers.has(room)) {
          roomUsers.get(room).delete(socket.id);
        }
      }
    });

    socket.join(roomName);
    if (!roomUsers.has(roomName)) {
      roomUsers.set(roomName, new Set());
    }
    roomUsers.get(roomName).add(socket.id);

    console.log(`[JOIN] ${username} -> ${roomName}`);

    socket.emit('chatMessage', {
      user: 'System',
      text: `Welcome to ${roomName}, ${username}! 🇳🇵`,
      isSystem: true
    });

    socket.to(roomName).emit('chatMessage', {
      user: 'System',
      text: `${username} joined the chat.`,
      isSystem: true
    });
  });

  // 3. Room Message
  socket.on('roomMessage', (data) => {
    const { room, user, text } = data;
    if (!room || !text) return;

    console.log(`[MSG] [${room}] ${user}: ${text}`);

    io.to(room).emit('chatMessage', {
      user: user || 'Anonymous',
      text: text,
      isSystem: false
    });
  });

  // 4. Private Message (PM)
  socket.on('privateMessage', (data) => {
    const { fromUser, toUser, text } = data;
    if (!toUser || !text) return;

    let targetSocketId = null;
    for (let [sId, uName] of activeUsers.entries()) {
      if (uName === toUser) {
        targetSocketId = sId;
        break;
      }
    }

    if (targetSocketId) {
      io.to(targetSocketId).emit('privateMessage', {
        fromUser: fromUser,
        toUser: toUser,
        text: text
      });

      socket.emit('privateMessage', {
        fromUser: fromUser,
        toUser: toUser,
        text: text
      });
    } else {
      socket.emit('chatMessage', {
        user: 'System',
        text: `User ${toUser} is offline.`,
        isSystem: true
      });
    }
  });

  // 5. Gift Sending
  socket.on('sendGift', (data) => {
    const { room, user, gift } = data;
    if (!room || !gift) return;

    io.to(room).emit('giftBroadcast', {
      user: user,
      gift: gift
    });
  });

  // 6. Disconnect
  socket.on('disconnect', () => {
    const username = activeUsers.get(socket.id);
    if (username) {
      activeUsers.delete(socket.id);
      io.emit('activeUsersList', Array.from(activeUsers.values()));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});