const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  maxHttpBufferSize: 1e8 
});

app.use(express.static("public"));

let onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("join", (data) => {
    socket.username = data.username;
    socket.pfp = data.pfp || `https://ui-avatars.com/api/?name=${data.username}&background=random&color=fff`;
    onlineUsers.set(socket.id, { username: socket.username, pfp: socket.pfp });
    io.emit("onlineUpdate", Array.from(onlineUsers.values()));
  });

  socket.on("joinPrivateRoom", (room) => { 
    socket.join(room); 
  });

  socket.on("privateMessage", (data) => {
    io.to(data.room).emit("message", { 
      user: socket.username, 
      pfp: socket.pfp,
      text: data.text, 
      image: data.image, 
      audio: data.audio,
      room: data.room, 
      timestamp: Date.now() 
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("onlineUpdate", Array.from(onlineUsers.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
