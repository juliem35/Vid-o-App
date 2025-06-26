const socket = io();
const videoGrid = document.getElementById('videos');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const myPeer = new Peer(undefined, {
  host: '/',
  port: location.protocol === 'https:' ? 443 : 3000,
  path: '/peerjs',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
});

let myStream;

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myStream = stream;
  localVideo.srcObject = stream;
  localVideo.play();

  myPeer.on('call', call => {
    call.answer(stream);
    call.on('stream', userVideoStream => {
      remoteVideo.srcObject = userVideoStream;
      remoteVideo.play();
    });
  });

  socket.on('user-connected', userId => {
    const call = myPeer.call(userId, stream);
    call.on('stream', userVideoStream => {
      remoteVideo.srcObject = userVideoStream;
      remoteVideo.play();
    });
  });
});

myPeer.on('open', id => {
  const roomId = window.location.pathname.split('/')[2];
  socket.emit('join-room', roomId, id);
});
