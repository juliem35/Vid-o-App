const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // User starts a call
  socket.on("demarrer-appel", ({ roomId, username }) => {
    socket.join(roomId);
    console.log(`📞 ${username} (${socket.id}) started a call in room: ${roomId}`);
    socket.to(roomId).emit("appel-recu", { from: socket.id, username });
  });

  // User joins a call
  socket.on("rejoindre-appel", (roomId) => {
    socket.join(roomId);
    console.log(`👤 ${socket.id} joined room ${roomId}`);
  });

  // User accepts a call
  socket.on("accepter-appel", ({ roomId, from }) => {
    console.log(`✅ Call accepted by ${socket.id}, notifying ${from}`);
    io.to(from).emit("appel-accepte", socket.id);
  });

  // User declines a call
  socket.on("refuser-appel", ({ roomId, from }) => {
    console.log(`❌ Call declined by ${socket.id}, notifying ${from}`);
    io.to(from).emit("appel-refuse");
  });

  // Send WebRTC offer
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  // Send WebRTC answer
  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  // Send ICE candidates
  socket.on("candidate", ({ to, candidate }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  // Disconnection
  socket.on("disconnect", () => {
    console.log("🚪 User disconnected:", socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
