
const socket = io();

let myUserId = null;
let currentCaller = null;
let roomId = null;

const userIdInput = document.getElementById("userIdInput");
const roomIdInput = document.getElementById("roomIdInput");
const joinRoomBtn = document.getElementById("joinRoomBtn");

const callSection = document.getElementById("callSection");
const roomNameSpan = document.getElementById("roomName");
const targetUserIdInput = document.getElementById("targetUserIdInput");
const callBtn = document.getElementById("callBtn");

const incomingCall = document.getElementById("incomingCall");
const incomingCallText = document.getElementById("incomingCallText");
const acceptCallBtn = document.getElementById("acceptCallBtn");
const rejectCallBtn = document.getElementById("rejectCallBtn");

const videosDiv = document.getElementById("videos");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let peerConnection = null;
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let localStream = null;

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    videosDiv.style.display = "flex";
  } catch (err) {
    alert("Erreur accès caméra/micro : " + err);
  }
}

joinRoomBtn.onclick = async () => {
  myUserId = userIdInput.value.trim();
  roomId = roomIdInput.value.trim();
  if (!myUserId || !roomId) return alert("Entre un ID utilisateur et un nom de salle.");

  socket.emit("join-room", roomId, myUserId);

  userIdInput.disabled = true;
  roomIdInput.disabled = true;
  joinRoomBtn.disabled = true;

  callSection.style.display = "block";
  roomNameSpan.textContent = roomId;

  await startLocalStream();
};

function startPeer(isReceiver, remoteId = "") {
  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };

  peer = new RTCPeerConnection(configuration);

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("Envoi candidat ICE:", e.candidate);
      socket.emit("candidate", { to: remoteId, candidate: e.candidate });
    }
  };

  peer.ontrack = (e) => {
    console.log("Flux distant reçu");
    remoteVideo.srcObject = e.streams[0];
  };

  localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

  if (isReceiver) return;

  peer.createOffer()
    .then((offer) => peer.setLocalDescription(offer))
    .then(() => {
      console.log("Envoi de l'offre");
      socket.emit("offer", { to: remoteId, offer: peer.localDescription });
    })
    .catch(e => console.error(e));
}

callBtn.onclick = async () => {
  const targetUserId = targetUserIdInput.value.trim();
  if (!targetUserId) return alert("Entre l'ID utilisateur à appeler");
  if (targetUserId === myUserId) return alert("Tu ne peux pas t'appeler toi-même !");

  await createPeerConnection(targetUserId);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("call-user", {
    targetUserId,
    fromUserId: myUserId,
    offer,
  });

  alert("Appel lancé, en attente de réponse...");
};

socket.on("appel-recu", ({ from, username: callerName }) => {
  fromSocket = from;
  currentRoom = roomInput.value.trim();
  incomingCall.style.display = "block";
  incomingCall.querySelector("p").textContent = `📲 Appel entrant de ${callerName}...`;
});


acceptCallBtn.onclick = async () => {
  if (!currentCaller || !incomingCall.offer) return;
  await startLocalStream();
  await createPeerConnection(currentCaller);

  await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("accept-call", {
    toUserId: currentCaller,
    answer,
  });

  incomingCall.style.display = "none";
  alert("Appel accepté !");
};

rejectCallBtn.onclick = () => {
  if (!currentCaller) return;
  socket.emit("reject-call", { toUserId: currentCaller });
  incomingCall.style.display = "none";
  alert("Appel refusé");
};

socket.on("call-accepted", async ({ answer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  alert("Ton appel a été accepté. Connexion WebRTC établie !");
});

socket.on("call-rejected", () => {
  alert("Ton appel a été refusé.");
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
});

socket.on("ice-candidate", async ({ candidate }) => {
  try {
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  } catch (e) {
    console.error("Erreur ajout candidat ICE :", e);
  }
});
