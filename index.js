const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const activeUsers = new Map();
const roomUsers = new Map();

// Web Client UI (ब्राउजरबाट सिधै च्याट गर्नका लागि)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MIG KO BAU - Web Chat</title>
      <script src="/socket.io/socket.io.js"></script>
      <style>
        body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; text-align: center; }
        #chat-box { width: 100%; max-width: 500px; height: 350px; background: white; border: 1px solid #ccc; margin: 10px auto; overflow-y: auto; padding: 10px; border-radius: 8px; text-align: left; }
        input, button { padding: 10px; font-size: 16px; margin: 5px; }
        button { background: #ff4757; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .msg { margin-bottom: 8px; }
        .sys { color: gray; font-style: italic; }
      </style>
    </head>
    <body>
      <h2>🇳🇵 MIG KO BAU Web Chat Room</h2>
      <div id="login-sec">
        <input type="text" id="username" placeholder="User ID / Name">
        <button onclick="login()">Enter Chat</button>
      </div>

      <div id="chat-sec" style="display:none;">
        <div id="chat-box"></div>
        <input type="text" id="msg" placeholder="Write message...">
        <button onclick="sendMsg()">Send</button>
      </div>

      <script>
        let socket;
        let username;

        function login() {
          username = document.getElementById('username').value.trim();
          if(!username) return alert('Name लेख्नुहोस्!');

          socket = io();
          document.getElementById('login-sec').style.display = 'none';
          document.getElementById('chat-sec').style.display = 'block';

          socket.emit('registerUser', username);
          socket.emit('joinRoom', '🇳🇵 Nepal Lounge');

          socket.on('chatMessage', (data) => {
            const box = document.getElementById('chat-box');
            const p = document.createElement('div');
            p.className = data.isSystem ? 'msg sys' : 'msg';
            p.innerHTML = '<b>' + data.user + ':</b> ' + data.text;
            box.appendChild(p);
            box.scrollTop = box.scrollHeight;
          });
        }

        function sendMsg() {
          const input = document.getElementById('msg');
          if(!input.value.trim()) return;
          socket.emit('roomMessage', { room: '🇳🇵 Nepal Lounge', user: username, text: input.value });
          input.value = '';
        }
      </script>
    </body>
    </html>
  `);
});

// Socket logic
io.on('connection', (socket) => {
  socket.on('registerUser', (username) => {
    if (!username) return;
    activeUsers.set(socket.id, username);
    io.emit('activeUsersList', Array.from(activeUsers.values()));
  });

  socket.on('joinRoom', (roomName) => {
    const username = activeUsers.get(socket.id) || 'Guest';
    socket.join(roomName);
    
    socket.emit('chatMessage', { user: 'System', text: 'Welcome to ' + roomName + '!', isSystem: true });
    socket.to(roomName).emit('chatMessage', { user: 'System', text: username + ' joined.', isSystem: true });
  });

  socket.on('roomMessage', (data) => {
    io.to(data.room).emit('chatMessage', { user: data.user, text: data.text, isSystem: false });
  });

  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    io.emit('activeUsersList', Array.from(activeUsers.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server Live'));