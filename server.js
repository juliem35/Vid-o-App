const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Port fourni par Render ou 3000 localement
const PORT = process.env.PORT || 3000;

// Sert les fichiers statiques depuis le dossier "public"
app.use(express.static(path.join(__dirname, "public")));

// Gestion des connexions Socket.io
io.on("connection", (socket) => {
  console.log("✅ Un utilisateur s'est connecté :", socket.id);

  socket.on("demarrer-appel", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("appel-recu", socket.id);
  });

  socket.on("rejoindre-appel", (roomId) => {
    socket.join(roomId);
  });

  socket.on("accepter-appel", ({ roomId, from }) => {
    io.to(from).emit("appel-accepte", socket.id);
  });

  socket.on("refuser-appel", ({ roomId, from }) => {
    io.to(from).emit("appel-refuse");
  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("candidate", ({ to, candidate }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté :", socket.id);
  });
});

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
});
