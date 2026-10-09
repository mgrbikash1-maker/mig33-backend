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

// Web HTML Interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MIG KO BAU - Web Chat</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="/socket.io/socket.io.js"></script>
      <style>
        body { font-family: sans-serif; background: #eef2f5; padding: 20px; text-align: center; }
        #chat-card { max-width: 450px; margin: 0 auto; background: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        #chat-box { height: 300px; border: 1px solid #ddd; overflow-y: auto; text-align: left; padding: 10px; margin-bottom: 10px; border-radius: 5px; background: #fafafa; }
        input, button { padding: 10px; font-size: 15px; margin: 4px; border-radius: 5px; border: 1px solid #ccc; }
        button { background: #e84118; color: white; border: none; font-weight: bold; cursor: pointer; }
        .msg-line { margin: 6px 0; }
        .sys-line { color: #7f8c8d; font-style: italic; font-size: 13px; text-align: center; }
      </style>
    </head>
    <body>
      <div id="chat-card">
        <h2>🇳🇵 MIG KO BAU Web Chat</h2>
        
        <div id="login-sec">
          <input type="text" id="username" placeholder="आफ्नो नाम / User ID">
          <button onclick="login()">Enter Chat 🚀</button>
        </div>

        <div id="chat-sec" style="display:none;">
          <div id="chat-box"></div>
          <div style="display:flex;">
            <input type="text" id="msg" style="flex:1;" placeholder="मैसेज लेख्नुहोस्..." onkeypress="if(event.key==='Enter') sendMsg()">
            <button onclick="sendMsg()">Send</button>
          </div>
        </div>
      </div>

      <script>
        let socket;
        let uName;

        function login() {
          uName = document.getElementById('username').value.trim();
          if(!uName) return alert('नाम लेख्नुहोस्!');

          socket = io();
          document.getElementById('login-sec').style.display = 'none';
          document.getElementById('chat-sec').style.display = 'block';

          socket.emit('registerUser', uName);
          socket.emit('joinRoom', '🇳🇵 Nepal Lounge');

          socket.on('chatMessage', (data) => {
            const box = document.getElementById('chat-box');
            const div = document.createElement('div');
            div.className = data.isSystem ? 'msg-line sys-line' : 'msg-line';
            div.innerHTML = data.isSystem ? data.text : '<b>' + data.user + ':</b> ' + data.text;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
          });
        }

        function sendMsg() {
          const inp = document.getElementById('msg');
          const txt = inp.value.trim();
          if(!txt) return;
          socket.emit('roomMessage', { room: '🇳🇵 Nepal Lounge', user: uName, text: txt });
          inp.value = '';
        }
      </script>
    </body>
    </html>
  `);
});

// Socket connection logic
io.on('connection', (socket) => {
  socket.on('registerUser', (username) => {
    if (!username) return;
    activeUsers.set(socket.id, username);
    io.emit('activeUsersList', Array.from(activeUsers.values()));
  });

  socket.on('joinRoom', (roomName) => {
    const username = activeUsers.get(socket.id) || 'Guest';
    socket.join(roomName);

    socket.emit('chatMessage', { user: 'System', text: 'Welcome to ' + roomName + '! 🇳🇵', isSystem: true });
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