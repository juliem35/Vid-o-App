
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("Nouvel utilisateur connecté");

    socket.on("join", (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", socket.id);

        socket.on("offer", (data) => {
            socket.to(roomId).emit("offer", data);
        });

        socket.on("answer", (data) => {
            socket.to(roomId).emit("answer", data);
        });

        socket.on("candidate", (data) => {
            socket.to(roomId).emit("candidate", data);
        });

        socket.on("disconnect", () => {
            socket.to(roomId).emit("user-disconnected", socket.id);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
