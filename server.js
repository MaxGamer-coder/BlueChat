const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let typingUsers = new Set();
let onlineUsers = new Set();

io.on("connection", (socket) => {

  socket.on("join", (username) => {
    socket.username = username;
    onlineUsers.add(username);
    io.emit("message", { user: "System", text: `${username} joined the chat`, timestamp: Date.now() });
    io.emit("onlineUpdate", Array.from(onlineUsers));
  });

  socket.on("chatMessage", (msg) => {
    io.emit("message", { user: socket.username, text: msg, timestamp: Date.now() });
  });

  socket.on("typing", (isTyping) => {
    if(isTyping) typingUsers.add(socket.username);
    else typingUsers.delete(socket.username);
    io.emit("typingUpdate", Array.from(typingUsers));
  });

  socket.on("disconnect", () => {
    if(socket.username){
      onlineUsers.delete(socket.username);
      typingUsers.delete(socket.username);
      io.emit("message", { user: "System", text: `${socket.username} left the chat`, timestamp: Date.now() });
      io.emit("typingUpdate", Array.from(typingUsers));
      io.emit("onlineUpdate", Array.from(onlineUsers));
    }
  });

});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));