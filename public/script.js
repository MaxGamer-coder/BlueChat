const socket = io();
let username = "", userPFP = "", currentRoom = "";
let pendingImage = "", mediaRecorder, audioChunks = [];
let notifications = {}; 
let latestOnlineUsers = [];

const getFallback = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

window.handlePFPSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 100; canvas.height = 100;
                ctx.drawImage(img, 0, 0, 100, 100);
                userPFP = canvas.toDataURL('image/jpeg', 0.7); 
                document.getElementById('pfpPreview').src = userPFP;
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.joinChat = () => {
    const nameInput = document.getElementById("username");
    if (!nameInput.value.trim()) return;
    username = nameInput.value.trim();
    if (!userPFP) userPFP = getFallback(username);
    socket.emit("join", { username, pfp: userPFP });
    document.getElementById("login").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
};

function renderUserList() {
    const list = document.getElementById("userList");
    list.innerHTML = "";
    latestOnlineUsers.forEach(user => {
        if (user.username === username) return;
        const roomID = [username, user.username].sort().join("_");
        const count = notifications[roomID] || 0;
        const div = document.createElement("div");
        div.className = "user-item";
        div.onclick = () => openChat(user.username, user.pfp, roomID);
        div.innerHTML = `
            <img src="${user.pfp}" onerror="this.src='${getFallback(user.username)}'">
            <div class="user-info">
                <h4>${user.username}</h4>
                <span style="font-size:12px; color: #28a745;">● Online</span>
            </div>
            ${count > 0 ? `<div class="badge">${count}</div>` : ""}
        `;
        list.appendChild(div);
    });
}

socket.on("onlineUpdate", (users) => {
    latestOnlineUsers = users;
    renderUserList();
});

window.openChat = (targetName, targetPFP, roomID) => {
    currentRoom = roomID;
    notifications[roomID] = 0;
    renderUserList();
    document.getElementById("chatPartnerName").textContent = targetName;
    const headerImg = document.getElementById("chatPartnerPFP");
    headerImg.src = targetPFP;
    headerImg.onerror = () => { headerImg.src = getFallback(targetName); };
    document.getElementById("messages").innerHTML = "";
    const history = JSON.parse(localStorage.getItem(roomID)) || [];
    history.forEach(msg => renderMessage(msg));
    socket.emit("joinPrivateRoom", roomID);
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("chat").classList.remove("hidden");
};

window.backToDashboard = () => {
    currentRoom = "";
    document.getElementById("chat").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    renderUserList();
};

window.sendMessage = () => {
    const input = document.getElementById("messageInput");
    if (!input.value.trim() && !pendingImage) return;
    socket.emit("privateMessage", { room: currentRoom, text: input.value, image: pendingImage, audio: "" });
    input.value = "";
    clearImagePreview();
};

socket.on("message", (msg) => {
    const history = JSON.parse(localStorage.getItem(msg.room)) || [];
    history.push(msg);
    localStorage.setItem(msg.room, JSON.stringify(history));
    if (currentRoom === msg.room) renderMessage(msg);
    else {
        notifications[msg.room] = (notifications[msg.room] || 0) + 1;
        renderUserList(); 
    }
});

function renderMessage(msg) {
    const messages = document.getElementById("messages");
    const isSelf = msg.user === username;
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${isSelf ? 'self' : 'other'}`;
    wrapper.innerHTML = `
        <img class="avatar" src="${msg.pfp}" onerror="this.src='${getFallback(msg.user)}'">
        <div class="message">
            ${msg.image ? `<img src="${msg.image}" class="chat-image" onclick="window.open('${msg.image}')">` : ""}
            ${msg.audio ? `<audio controls class="voice-note" src="${msg.audio}"></audio>` : ""}
            ${msg.text ? `<p>${msg.text}</p>` : ""}
            <span style="font-size:10px; opacity:0.6; display:block; text-align:right; margin-top:5px;">
                ${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </span>
        </div>`;
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
}

window.toggleEmojiPicker = () => document.getElementById("emojiPicker").classList.toggle("hidden");
window.addEmoji = (emoji) => { 
    document.getElementById("messageInput").value += emoji; 
    document.getElementById("emojiPicker").classList.add("hidden");
};

window.startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                socket.emit("privateMessage", { room: currentRoom, text: "", image: "", audio: reader.result });
            };
        };
        mediaRecorder.start();
        document.getElementById("voiceBtn").classList.add("recording");
    } catch (err) { alert("Mic needed"); }
};

window.stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        document.getElementById("voiceBtn").classList.remove("recording");
    }
};

window.handleImageSelect = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingImage = e.target.result;
        document.getElementById("imagePreview").src = pendingImage;
        document.getElementById("imagePreviewContainer").classList.remove("hidden");
    };
    reader.readAsDataURL(input.files[0]);
};

window.clearImagePreview = () => {
    pendingImage = "";
    document.getElementById("imagePreviewContainer").classList.add("hidden");
};

window.logout = () => { localStorage.clear(); location.reload(); };
