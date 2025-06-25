
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
    console.log("Un utilisateur s'est connecté :", socket.id);

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
});

server.listen(PORT, () => {
<<<<<<< HEAD
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
=======
    console.log("Serveur en ligne sur le port", PORT);
>>>>>>> 116f9d2 (Version finale depuis video_A)
});
