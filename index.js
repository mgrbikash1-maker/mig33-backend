const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// रुम अनुसार म्यासेज र युजर ट्र्याक गर्ने डेटा
const roomMessages = {}; 
const roomUsers = {};

// सिधै HTML पेज पठाउने (Cannot GET / समस्या सधैंको लागि अन्त्य)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIG KO BAU - Chat Rooms</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 0; }
        #login-screen { display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; }
        #chat-screen { display: none; height: 100vh; grid-template-columns: 250px 1fr; grid-template-rows: 60px 1fr 70px; }
        .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 320px; text-align: center; }
        input, select, button { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { background: #ff4500; color: white; border: none; font-weight: bold; cursor: pointer; }
        button:hover { background: #e03d00; }
        header { background: #ff4500; color: white; grid-column: 1 / 3; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
        aside { background: #fff; border-right: 1px solid #ddd; padding: 15px; overflow-y: auto; grid-row: 2 / 4; }
        main { display: flex; flex-direction: column; grid-row: 2 / 3; background: #fafafa; padding: 15px; overflow-y: auto; }
        .chat-input-area { grid-column: 2 / 3; grid-row: 3 / 4; background: white; padding: 15px; display: flex; border-top: 1px solid #ddd; align-items: center; }
        .chat-input-area input { margin: 0; flex: 1; }
        .chat-input-area button { width: 100px; margin-left: 10px; margin: 0; height: 40px; }
        .msg { margin-bottom: 10px; padding: 8px 12px; background: #fff; border-radius: 6px; border-left: 4px solid #ff4500; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .msg span { font-size: 11px; color: gray; float: right; }
        .system-msg { color: #888; font-style: italic; text-align: center; margin: 5px 0; font-size: 13px; }
        ul { padding-left: 15px; margin: 5px 0; }
        li { font-size: 14px; margin-bottom: 5px; color: #333; }
    </style>
</head>
<body>
    <div id="login-screen">
        <div class="card">
            <h2>MIG KO BAU</h2>
            <input type="text" id="username" placeholder="Enter your nickname..." autocomplete="off">
            <select id="room">
                <option value="General">Lobby / General</option>
                <option value="Gaming">Gaming Zone</option>
                <option value="Music">Music Lounge</option>
            </select>
            <button onclick="joinChat()">Enter Chat 🚀</button>
        </div>
    </div>

    <div id="chat-screen">
        <header>
            <h2 id="room-title">MIG KO BAU</h2>
            <button style="width: auto; padding: 8px 15px; background: #333;" onclick="location.reload()">Logout</button>
        </header>
        <aside>
            <h3>Online Users</h3>
            <ul id="users-list"></ul>
        </aside>
        <main id="chat-messages"></main>
        <div class="chat-input-area">
            <input type="text" id="msg-input" placeholder="Type a message..." autocomplete="off" onkeypress="checkEnter(event)">
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let myName = '';
        let currentRoom = '';

        function joinChat() {
            myName = document.getElementById('username').value.trim();
            currentRoom = document.getElementById('room').value;
            if (!myName) { alert('कृपया आफ्नो नाम लेख्नुहोस्!'); return; }
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('chat-screen').style.display = 'grid';
            document.getElementById('room-title').innerText = \`Room: \${currentRoom}\`;
            socket.emit('join_room', { username: myName, room: currentRoom });
        }

        function sendMessage() {
            const input = document.getElementById('msg-input');
            const message = input.value.trim();
            if (!message) return;
            socket.emit('chat_message', { room: currentRoom, message, username: myName });
            input.value = '';
        }

        function checkEnter(e) { if (e.key === 'Enter') sendMessage(); }

        socket.on('load_messages', (messages) => {
            const chatBox = document.getElementById('chat-messages');
            chatBox.innerHTML = '';
            messages.forEach(m => appendMessage(m));
        });

        socket.on('chat_message', (data) => { appendMessage(data); });

        socket.on('update_users', (users) => {
            const usersList = document.getElementById('users-list');
            usersList.innerHTML = '';
            users.forEach(u => {
                const li = document.createElement('li');
                li.textContent = u.username;
                usersList.appendChild(li);
            });
        });

        function appendMessage(data) {
            const chatBox = document.getElementById('chat-messages');
            const div = document.createElement('div');
            if (data.username === 'System') {
                div.className = 'system-msg';
                div.innerText = data.message;
            } else {
                div.className = 'msg';
                div.innerHTML = \`<strong>\${data.username}</strong>: \${data.message} <span>\${data.time}</span>\`;
            }
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    </script>
</body>
</html>`);
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', ({ username, room }) => {
        socket.join(room);
        socket.username = username;
        socket.room = room;

        if (!roomUsers[room]) roomUsers[room] = [];
        roomUsers[room].push({ id: socket.id, username });

        if (!roomMessages[room]) roomMessages[room] = [];
        socket.emit('load_messages', roomMessages[room]);

        io.to(room).emit('update_users', roomUsers[room]);

        io.to(room).emit('chat_message', {
            username: 'System',
            message: `${username} has joined the room.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('chat_message', (data) => {
        const { room, message, username } = data;
        const chatData = {
            username,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (!roomMessages[room]) roomMessages[room] = [];
        roomMessages[room].push(chatData);

        io.to(room).emit('chat_message', chatData);
    });

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