const socket = io();

let myUserId = null;
let currentCaller = null;

const userIdInput = document.getElementById("userIdInput");
const registerBtn = document.getElementById("registerBtn");
const callSection = document.getElementById("callSection");
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
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
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

registerBtn.onclick = async () => {
  const userId = userIdInput.value.trim();
  if (!userId) return alert("Entre ton ID utilisateur");
  myUserId = userId;
  socket.emit("register", userId);
  registerBtn.disabled = true;
  userIdInput.disabled = true;
  callSection.style.display = "block";

  await startLocalStream();
  console.log("Enregistré avec ID :", userId);
};

async function createPeerConnection(targetUserId) {
  peerConnection = new RTCPeerConnection(configuration);

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        targetUserId,
        candidate: event.candidate,
      });
    }
  };
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

socket.on("incoming-call", async ({ fromUserId, offer }) => {
  currentCaller = fromUserId;
  incomingCallText.textContent = `📞 Appel entrant de ${fromUserId}`;
  incomingCall.style.display = "block";
  incomingCall.offer = offer;
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
