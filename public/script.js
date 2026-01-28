const socket = io();
let username = "";
let typingTimeout;
const usersColorMap = {};

const emojis = ["😀","😃","😂","😍","🥰","😎","🤔","😭","😡","👍","👎","🙏","🎉","💯"];
const emojiPicker = document.getElementById("emojiPicker");
const emojiBtn = document.getElementById("emojiBtn");
const messageInput = document.getElementById("messageInput");
const onlineCount = document.getElementById("onlineCount");

// Assign random color to a username
function getUserColor(user){
  if(usersColorMap[user]) return usersColorMap[user];
  const colors = ["#1abc9c","#3498db","#9b59b6","#e67e22","#e74c3c","#2ecc71","#f1c40f"];
  const color = colors[Math.floor(Math.random()*colors.length)];
  usersColorMap[user] = color;
  return color;
}

// Create emoji picker elements
emojis.forEach(e=>{
  const span = document.createElement("span");
  span.textContent = e;
  span.onclick = ()=>{messageInput.value += e; messageInput.focus();}
  emojiPicker.appendChild(span);
});

// Toggle emoji picker
emojiBtn.onclick = ()=>{ emojiPicker.classList.toggle("hidden"); }

function joinChat(){
  const input = document.getElementById("username");
  if(!input.value) return;
  username = input.value;
  socket.emit("join", username);
  document.getElementById("login").classList.add("hidden");
  document.getElementById("chat").classList.remove("hidden");
  messageInput.focus();
}

function sendMessage(){
  if(!messageInput.value) return;
  socket.emit("chatMessage", messageInput.value);
  messageInput.value = "";
  socket.emit("typing", false);
}

function typingEvent(){
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(()=>{ socket.emit("typing", false); }, 1000);
}

// Receive messages
socket.on("message", (msg)=>{
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = msg.user==="System" ? "system" : "message "+(msg.user===username?"self":"other");
  div.textContent = msg.text;

  if(msg.user !== "System"){
    const span = document.createElement("span");
    span.className = "timestamp";
    const time = new Date(msg.timestamp);
    span.textContent = time.getHours().toString().padStart(2,"0")+":"+time.getMinutes().toString().padStart(2,"0");
    div.appendChild(span);
    // Add user color
    div.style.backgroundColor = msg.user===username?"#007bff":getUserColor(msg.user);
    if(msg.user!==username) div.style.color="white";
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// Typing indicator
socket.on("typingUpdate", (users)=>{
  const typingDiv = document.getElementById("typing");
  const others = users.filter(u=>u!==username);
  if(others.length === 0) typingDiv.textContent = "";
  else if(others.length === 1) typingDiv.textContent = `${others[0]} is typing...`;
  else typingDiv.textContent = `Multiple users are typing...`;
});

// Online users count
socket.on("onlineUpdate", (users)=>{
  onlineCount.textContent = `${users.length} online`;
});