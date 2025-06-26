const socket = io();

let localStream, peer;
let currentRoom = "";
let fromSocket = "";
let username = "";

const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("roomInput");
const startBtn = document.getElementById("startCall");
const incomingCall = document.getElementById("incomingCall");
const callerInfo = document.getElementById("callerInfo");
const acceptBtn = document.getElementById("acceptCall");
const declineBtn = document.getElementById("declineCall");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

startBtn.onclick = async () => {
  username = usernameInput.value.trim();
  currentRoom = roomInput.value.trim();

  if (!username || !currentRoom) {
    return alert("Veuillez entrer votre nom et le nom de la salle.");
  }

  await getMedia();
  socket.emit("demarrer-appel", { roomId: currentRoom, username });
};

socket.on("appel-recu", ({ from, username: caller }) => {
  fromSocket = from;
  currentRoom = roomInput.value.trim(); // Ensure currentRoom is set for the receiver
  callerInfo.textContent = `📲 Appel entrant de ${caller}...`;
  incomingCall.style.display = "block";
});

acceptBtn.onclick = async () => {
  incomingCall.style.display = "none";
  await getMedia();
  socket.emit("rejoindre-appel", currentRoom);
  socket.emit("accepter-appel", { roomId: currentRoom, from: fromSocket });
  startPeer(true, fromSocket); // Pass fromSocket as remoteId for receiver
};

declineBtn.onclick = () => {
  incomingCall.style.display = "none";
  socket.emit("refuser-appel", { roomId: currentRoom, from: fromSocket });
  // Optionally, stop local media stream if it was started
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
};

socket.on("appel-accepte", (to) => {
  startPeer(false, to);
});

socket.on("appel-refuse", () => {
  alert("L'appel a été refusé ❌");
  // Optionally, stop local media stream if it was started
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
});

async function getMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error("Erreur d'accès aux médias :", error);
    alert("Impossible d'accéder à votre caméra/microphone. Veuillez vérifier les permissions.");
  }
}

function startPeer(isReceiver, remoteId = "") {
  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // Google's public STUN server
  });

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("candidate", { to: remoteId, candidate: e.candidate });
    }
  };

  peer.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
  } else {
    console.warn("localStream n'est pas disponible lors de l'ajout des pistes au peer connection.");
  }

  if (isReceiver) {
    // Receiver does not create offer initially
    return;
  }

  peer.createOffer()
    .then((offer) => {
      peer.setLocalDescription(offer);
      socket.emit("offer", { to: remoteId, offer });
    })
    .catch(error => console.error("Erreur lors de la création de l'offre :", error));
}

socket.on("offer", ({ offer, from }) => {
  // Only create new peer if it doesn't exist or is closed
  if (!peer || peer.connectionState === 'closed') {
    peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("candidate", { to: from, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      remoteVideo.srcObject = e.streams[0];
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    } else {
      console.warn("localStream n'est pas disponible lors de l'ajout des pistes au peer connection (offer).");
    }
  }

  peer.setRemoteDescription(offer)
    .then(() => peer.createAnswer())
    .then((answer) => {
      peer.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    })
    .catch(error => console.error("Erreur lors de la gestion de l'offre :", error));
});

socket.on("answer", ({ answer }) => {
  peer.setRemoteDescription(answer)
    .catch(error => console.error("Erreur lors de la gestion de la réponse :", error));
});

socket.on("candidate", ({ candidate }) => {
  peer.addIceCandidate(new RTCIceCandidate(candidate))
    .catch(error => console.error("Erreur lors de l'ajout du candidat ICE :", error));
});

// Handle peer connection state changes for debugging
if (peer) {
  peer.onconnectionstatechange = () => {
    console.log(`Peer connection state: ${peer.connectionState}`);
  };
}

// Initial call to makeCall() is removed as call initiation is now event-driven by startBtn.onclick
// makeCall();
