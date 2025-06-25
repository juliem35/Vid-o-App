
// ... garder le code précédent

io.on("connection", (socket) => {
  console.log(`Client connecté: ${socket.id}`);

  socket.on("register", (userId) => {
    users.set(userId, socket.id);
    socket.userId = userId;
    console.log(`Utilisateur enregistré : ${userId}`);
  });

  socket.on("call-user", ({ targetUserId, fromUserId, offer }) => {
    const targetSocketId = users.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("incoming-call", { fromUserId, offer });
    }
  });

  socket.on("accept-call", ({ toUserId, answer }) => {
    const callerSocketId = users.get(toUserId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", { answer });
    }
  });

  socket.on("reject-call", ({ toUserId }) => {
    const callerSocketId = users.get(toUserId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected");
    }
  });

  socket.on("ice-candidate", ({ targetUserId, candidate }) => {
    const targetSocketId = users.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", { candidate });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      users.delete(socket.userId);
      console.log(`Utilisateur déconnecté : ${socket.userId}`);
    }
  });
});
