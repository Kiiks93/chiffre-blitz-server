/* ============================================================
AMIS
============================================================ */
function openFriendsModal() {
if (!isProfileValid()) { checkAndShowProfileModal(); return; }
document.getElementById("modal-friends").style.display = "flex";
socket.emit("get_friends_list");
}
function closeFriendsModal() { document.getElementById("modal-friends").style.display = "none"; }
function updateFriendsBadge() {
const totalCount = (window.lastRequestsCount || 0) + (myGameInvites ? myGameInvites.length : 0);
const badge = document.getElementById("friends-main-badge");
if (badge) { badge.innerText = totalCount; badge.style.display = totalCount > 0 ? "inline-block" : "none"; }
const requestsTab = document.getElementById("friend-tab-requests");
const invitesTab = document.getElementById("friend-tab-invites");
if (requestsTab) requestsTab.innerText = `Demandes ${window.lastRequestsCount || 0}`;
if (invitesTab) invitesTab.innerText = `Invitations ${myGameInvites.length}`;
}
function switchFriendTab(tab) {
currentFriendFilter = tab;
document.getElementById("friend-tab-all").classList.toggle("active", tab === "all");
document.getElementById("friend-tab-requests").classList.toggle("active", tab === "requests");
const invitesTab = document.getElementById("friend-tab-invites");
if (invitesTab) invitesTab.classList.toggle("active", tab === "invites");
if (tab === "invites") renderGameInvitesList();
else socket.emit("get_friends_list");
}
function sendFriendRequest() {
const target = document.getElementById("input-add-friend").value.trim();
if (target) { socket.emit("send_friend_request", target); document.getElementById("input-add-friend").value = ""; }
}
function acceptFriend(id) { socket.emit("accept_friend_request", id); }
function removeFriend(id) { socket.emit("remove_friend", id); }
function inviteFriend(targetSocketId) {
const randomRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
socket.emit("create_room", { code: randomRoomCode, password: "", username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
socket.emit("invite_friend_to_game", { targetSocketId, roomCode: randomRoomCode });
closeFriendsModal();
showNotificationToast("📤 Salon créé et invitation envoyée !", "gift");
}
socket.on("receive_game_invite", (data) => {
myGameInvites.unshift({ from: data.from, roomCode: data.roomCode, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
updateFriendsBadge();
if (currentFriendFilter === "invites" && document.getElementById("modal-friends").style.display === "flex") renderGameInvitesList();
let inviteHtml = `📩 Invitation de jeu de <b>${data.from}</b> !`;
if (data.roomCode) inviteHtml += `<br><button class="power-btn equip" onclick="joinGameInviteByCode('${data.roomCode}')" style="margin-top:6px; font-size:11px; padding:4px 10px;">Rejoindre le salon ⚡</button>`;
showNotificationToast(inviteHtml, "gift");
});
function renderGameInvitesList() {
const container = document.getElementById("friends-list-container");
container.innerHTML = "";
if (myGameInvites.length === 0) { container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucune invitation en attente.</div>`; return; }
myGameInvites.forEach((inv, index) => {
const row = document.createElement("div");
row.className = "friend-card";
row.innerHTML = `
<div style="text-align:left;"><div style="font-weight:bold; color:#fff; font-size:12px;">${inv.from}</div><div style="font-size:10px; color:#00d2ff;">Salon : ${inv.roomCode} (${inv.time})</div></div>
<div style="display:flex; gap:4px; align-items:center;">
<button class="power-btn equip" onclick="joinGameInviteByCode('${inv.roomCode}')" style="font-size:10px; padding:4px 8px;">Rejoindre ⚡</button>
<button class="power-btn" onclick="removeGameInvite(${index})" style="font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;">✕</button>
</div>`;
container.appendChild(row);
});
}
function removeGameInvite(index) { myGameInvites.splice(index, 1); updateFriendsBadge(); renderGameInvitesList(); }
function joinGameInviteByCode(roomCode) {
if (!roomCode) return;
if (!isProfileValid()) { checkAndShowProfileModal(); return; }
myGameInvites = myGameInvites.filter(inv => inv.roomCode !== roomCode);
updateFriendsBadge(); renderGameInvitesList(); closeFriendsModal();
joinRoomDirect(roomCode, "");
}
socket.on("friends_list_data", (friends) => {
let allFriends = friends || [];
const incomingRequests = allFriends.filter(f => f.status === "pending" && !f.isRequester);
const outgoingRequests = allFriends.filter(f => f.status === "pending" && f.isRequester);
window.lastRequestsCount = incomingRequests.length;
updateFriendsBadge();
if (currentFriendFilter === "invites") return;
const container = document.getElementById("friends-list-container");
container.innerHTML = "";
const makeLabel = (text) => {
const d = document.createElement("div");
d.style.cssText = "text-align:left; font-size:9px; letter-spacing:2px; color:#00d2ff; margin:8px 0 4px 2px; font-weight:bold;";
d.innerText = text;
return d;
};
const renderCard = (f) => {
const row = document.createElement("div");
row.className = "friend-card";
const dotColor = f.isOnline ? "#38ef7d" : "#aaa";
const statusText = f.isOnline ? "En ligne" : "Hors-ligne";
const safeName = String(f.username || "").replace(/'/g, "\\'");
let actionsHtml = "";
if (f.status === "pending") {
if (!f.isRequester) {
actionsHtml += `<button class="power-btn equip" onclick="acceptFriend('${f.id}')" style="font-size:10px; padding:4px 6px;">✅ Accepter</button>`;
actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;">✕</button>`;
} else {
actionsHtml += `<span style="font-size:10px; color:#f8b500;">⏳ En attente</span>`;
actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;" title="Annuler la demande">✕</button>`;
}
} else {
if (f.isOnline && f.targetSocketId) actionsHtml += `<button class="power-btn buy" onclick="inviteFriend('${f.targetSocketId}')" style="font-size:10px; padding:4px 6px;">Inviter</button>`;
}
actionsHtml += `<button class="power-btn" onclick="openTrophyRoom('${safeName}')" style="font-size:10px; padding:4px 6px; background:rgba(248,181,0,0.15); color:#f8b500; border:1px solid #f8b500;" title="Voir sa salle des trophées">🏛️</button>`;
if (f.status === "accepted") actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;">Supprimer</button>`;
const subText = f.status === "pending" ? (f.isRequester ? "Demande envoyée" : "Veut être ton ami !") : statusText;
row.innerHTML = `
<div style="display:flex; align-items:center; gap:6px;">
<span style="width:7px; height:7px; border-radius:50%; background:${dotColor}; box-shadow:0 0 5px ${dotColor};"></span>
<div style="text-align:left;">
<div style="font-weight:bold; color:#fff; font-size:12px; cursor:pointer; text-decoration:underline dotted;" onclick="openTrophyRoom('${safeName}')" title="Voir sa salle des trophées">${f.username}</div>
<div style="font-size:9px; color:${f.status === "pending" ? "#f8b500" : dotColor};">${subText}</div>
</div></div>
<div style="display:flex; gap:4px; align-items:center;">${actionsHtml}</div>`;
return row;
};
if (currentFriendFilter === "requests") {
if (incomingRequests.length === 0 && outgoingRequests.length === 0) {
container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucune demande en attente.</div>`;
return;
}
if (incomingRequests.length > 0) {
container.appendChild(makeLabel("📥 REÇUES"));
incomingRequests.forEach(f => container.appendChild(renderCard(f)));
}
if (outgoingRequests.length > 0) {
container.appendChild(makeLabel("📤 ENVOYÉES"));
outgoingRequests.forEach(f => container.appendChild(renderCard(f)));
}
return;
}
const accepted = allFriends.filter(f => f.status === "accepted");
if (accepted.length === 0) { container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">Aucun ami pour le moment.</div>`; return; }
accepted.forEach(f => container.appendChild(renderCard(f)));
});

socket.on("friend_error", (msg) => { showNotificationToast("❌ " + msg, "announcement"); });
socket.on("friend_success", (msg) => { showNotificationToast("✅ " + msg, "gift"); socket.emit("get_friends_list"); });
socket.on("friend_updated", () => { socket.emit("get_friends_list"); });

/* ============================================================
SALONS
============================================================ */
function openRoomsScreen() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); window.history.replaceState({}, "", window.location.pathname); document.getElementById("screen-rooms").style.display = "flex"; fetchRoomsList(); }
function fetchRoomsList() { socket.emit("get_rooms_list"); }
function openCreateRoomModal() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } document.getElementById("custom-room-name").value = ""; document.getElementById("custom-room-pass").value = ""; document.getElementById("modal-create-room").style.display = "flex"; }
function closeCreateRoomModal() { document.getElementById("modal-create-room").style.display = "none"; }
function submitCreateRoom() {
const code = document.getElementById("custom-room-name").value.trim().toUpperCase();
const password = document.getElementById("custom-room-pass").value.trim();
if (code !== "" && code.length < 2) { alert("Nom de salon trop court."); return; }
socket.emit("create_room", { code, password, username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
closeCreateRoomModal();
}
function openJoinCustomScreen(prefilledCode = "") { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById("screen-join-custom").style.display = "flex"; document.getElementById("join-room-code-input").value = prefilledCode; document.getElementById("join-room-pass-input").value = ""; }
function submitJoinCustomRoom() {
const roomCode = document.getElementById("join-room-code-input").value.trim().toUpperCase();
const password = document.getElementById("join-room-pass-input").value.trim();
if (!roomCode) { alert("Entrer un code valide."); return; }
socket.emit("join_room", { code: roomCode, password });
}
function joinRoomFromList(code, hasPassword) { if (hasPassword) openJoinCustomScreen(code); else joinRoomDirect(code, ""); }
function joinRoomDirect(code, password) { socket.emit("join_room", { code: code.toUpperCase(), password }); }
function leaveCustomRoom() { socket.emit("leave_room"); window.history.replaceState({}, "", window.location.pathname); openRoomsScreen(); }
function copyRoomLink() { const input = document.getElementById("room-share-link"); input.select(); navigator.clipboard.writeText(input.value).then(() => { showNotificationToast("📋 " + i18n[currentLang].link_copied, "gift"); }); }
function shareRoomLink() { const input = document.getElementById("room-share-link"); if (navigator.share) { navigator.share({ title: "Chiffre Blitz ⚡", text: "Viens m'affronter !", url: input.value }).catch(() => {}); } else copyRoomLink(); }
socket.on("rooms_list_data", (rooms) => {
const listEl = document.getElementById("rooms-list");
listEl.innerHTML = "";
if (!rooms || rooms.length === 0) { listEl.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:8px; font-size:11px;">Aucun salon ouvert.</div>`; return; }
rooms.forEach(r => {
const row = document.createElement("div");
row.className = "room-row";
const lockIcon = r.hasPassword ? " 🔒" : "";
row.innerHTML = `<span class="room-info">Salon <b>${r.code}</b>${lockIcon} (${r.playersCount}/2)</span><button class="power-btn equip" onclick="joinRoomFromList('${r.code}', ${r.hasPassword})">Rejoindre</button>`;
listEl.appendChild(row);
});
});
socket.on("rooms_list_changed", () => { if (document.getElementById("screen-rooms").style.display === "flex") fetchRoomsList(); });
socket.on("room_joined_success", (data) => {
hideAllScreens();
document.getElementById("screen-room-waiting").style.display = "flex";
document.getElementById("current-room-code").innerText = data.code;
const shareUrl = `${window.location.origin}${window.location.pathname}?room=${data.code}`;
window.history.replaceState({}, "", `?room=${data.code}`);
document.getElementById("room-share-link").value = shareUrl;
updateRoomPlayers(data.players);
});
socket.on("room_players_update", (data) => { updateRoomPlayers(data.players); });
function updateRoomPlayers(players) {
const playersListEl = document.getElementById("room-players-list");
if (!players || players.length === 0) { playersListEl.innerText = "En attente d'un adversaire..."; return; }
playersListEl.innerHTML = players.map(rawData => {
const p = parsePlayer(rawData);
const title = p.inventory && p.inventory.__equipped && p.inventory.__equipped.title;
const titleHtml = title ? `<span style="font-size: 8px; color: #f8b500; margin-left: 3px;">[${TITLE_DISPLAY_NAMES[title] || title}]</span>` : "";
return `<div style="display:inline-flex; align-items:center; gap:4px;">${getAvatarBadgeHTML(p.flag, p.avatar, null, p)}<span>${p.username}</span>${titleHtml}</div>`;
}).join(' <span style="color:#aaa; margin:0 4px;">vs</span> ');
if (players && socket.id) { const opp = players.find(p => (p.socketId || p.id) !== socket.id); if (opp) cachedOpponent = parsePlayer(opp); }
}
socket.on("room_error", (msg) => { showNotificationToast("❌ " + msg, "announcement"); });
function openTournamentScreen() { if (!isProfileValid()) { checkAndShowProfileModal(); return; } hideAllScreens(); document.getElementById("screen-tournament").style.display = "flex"; }
