const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io Setup with full CORS access
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Users and Rooms storage
const activeUsers = new Map(); // socket.id -> username
const roomUsers = new Map();   // roomName -> Set of socket.ids

// Root route (Fixes ENOENT index.html error on Render)
app.get('/', (req, res) => {
  res.status(200).send('MIG KO BAU Backend Server is Live and Running 🚀');
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[CONNECTED] New client connected: ${socket.id}`);

  // 1. User Registration
  socket.on('registerUser', (username) => {
    if (!username) return;
    activeUsers.set(socket.id, username);
    console.log(`[REGISTER] User registered: ${username} (${socket.id})`);
    
    // Broadcast active online users
    io.emit('activeUsersList', Array.from(activeUsers.values()));
  });

  // 2. Joining Chatroom
  socket.on('joinRoom', (roomName) => {
    const username = activeUsers.get(socket.id) || 'Guest';

    // Leave previous rooms
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room);
        if (roomUsers.has(room)) {
          roomUsers.get(room).delete(socket.id);
        }
      }
    });

    // Join new room
    socket.join(roomName);
    if (!roomUsers.has(roomName)) {
      roomUsers.set(roomName, new Set());
    }
    roomUsers.get(roomName).add(socket.id);

    console.log(`[JOIN ROOM] ${username} joined room: ${roomName}`);

    // Welcome & System broadcast
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

  // 3. Room Chat Message
  socket.on('roomMessage', (data) => {
    const { room, user, text } = data;
    if (!room || !text) return;

    console.log(`[ROOM MSG] [${room}] ${user}: ${text}`);

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

    console.log(`[PM] From ${fromUser} to ${toUser}: ${text}`);

    // Find recipient socket ID
    let targetSocketId = null;
    for (let [sId, uName] of activeUsers.entries()) {
      if (uName === toUser) {
        targetSocketId = sId;
        break;
      }
    }

    if (targetSocketId) {
      // Send to recipient
      io.to(targetSocketId).emit('privateMessage', {
        fromUser: fromUser,
        toUser: toUser,
        text: text
      });

      // Send confirmation back to sender
      socket.emit('privateMessage', {
        fromUser: fromUser,
        toUser: toUser,
        text: text
      });
    } else {
      socket.emit('chatMessage', {
        user: 'System',
        text: `User ${toUser} is currently offline.`,
        isSystem: true
      });
    }
  });

  // 5. Send Gifts
  socket.on('sendGift', (data) => {
    const { room, user, gift } = data;
    if (!room || !gift) return;

    console.log(`[GIFT] ${user} sent ${gift} in ${room}`);

    io.to(room).emit('giftBroadcast', {
      user: user,
      gift: gift
    });
  });

  // 6. User Disconnect
  socket.on('disconnect', () => {
    const username = activeUsers.get(socket.id);
    if (username) {
      console.log(`[DISCONNECTED] User left: ${username} (${socket.id})`);
      activeUsers.delete(socket.id);

      // Update online users list
      io.emit('activeUsersList', Array.from(activeUsers.values()));
    }
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 MIG KO BAU Backend Server running on port ${PORT}`);
});