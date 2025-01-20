let io;

const userToSocketMap = {}; // maps user ID to socket object
const socketToUserMap = {}; // maps socket ID to user object

const getAllConnectedUsers = () => Object.values(socketToUserMap);
const getSocketFromUserID = (userid) => userToSocketMap[userid];
const getUserFromSocketID = (socketid) => socketToUserMap[socketid];
const getSocketFromSocketID = (socketid) => io.sockets.sockets.get(socketid);

const addUser = (user, socket) => {
  const oldSocket = userToSocketMap[user._id];
  if (oldSocket && oldSocket.id !== socket.id) {
    // there was an old tab open for this user, force it to disconnect
    oldSocket.disconnect();
    delete socketToUserMap[oldSocket.id];
  }

  userToSocketMap[user._id] = socket;
  socketToUserMap[socket.id] = user;
};

const removeUser = (user, socket) => {
  if (user) delete userToSocketMap[user._id];
  delete socketToUserMap[socket.id];
};

const Room = require("./models/room");

function generateRoomCode() {
  // e.g., 4-digit alphanumeric or simple random code
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

module.exports = {
  init: (http) => {
    io = require("socket.io")(http);

    io.on("connection", (socket) => {
      console.log(`socket has connected ${socket.id}`);

      socket.on("checkRoomExists", async (roomCode, callback) => {
        try {
          const room = await Room.findOne({ code: roomCode });
          callback({ exists: !!room, error: null });
        } catch (err) {
          console.error("Error checking room:", err);
          callback({ exists: false, error: "Failed to check room." });
        }
      });

      socket.on("createRoom", async ({ playerName }, callback) => {
        try {
          const roomCode = generateRoomCode();
          const newRoom = new Room({
            code: roomCode,
            hostId: socket.id,
            players: [{ id: socket.id, name: playerName }],
          });
          await newRoom.save();

          socket.join(roomCode);

          // Emit room data to everyone in room
          io.to(roomCode).emit("roomData", {
            players: newRoom.players,
            hostId: newRoom.hostId,
          });

          callback({ roomCode });
        } catch (err) {
          console.error("Error creating room:", err);
          callback({ error: "Failed to create room." });
        }
      });

      socket.on("getRoomData", async ({ roomCode }) => {
        try {
          const room = await Room.findOne({ code: roomCode });
          if (room) {
            // Emit to everyone in the room
            io.to(roomCode).emit("roomData", {
              players: room.players,
              hostId: room.hostId,
            });
          }
        } catch (err) {
          console.error("Error getting room data:", err);
        }
      });

      socket.on("joinRoom", async ({ roomCode, playerName }, callback) => {
        try {
          // Validate input
          if (!roomCode || !playerName) {
            return callback({ error: "Room code and player name are required." });
          }

          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }
          if (room.isGameStarted) {
            return callback({ error: "Game has already started in this room." });
          }

          // Check if player is already in the room
          const existingPlayer = room.players.find((player) => player.name === playerName);
          if (existingPlayer) {
            // Update the existing player's socket ID if needed
            const oldSocketId = existingPlayer.id;
            existingPlayer.id = socket.id;
            if (room.hostId === oldSocketId) {
              room.hostId = socket.id;
            }
          } else {
            // Add the player to room in database only if they're not already there
            room.players.push({ id: socket.id, name: playerName });
          }

          await room.save();

          // Join the socket room
          socket.join(roomCode);

          // Immediately emit room data to ALL clients in the room
          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
            hostId: room.hostId,
          });

          callback({ success: true });
        } catch (err) {
          console.error("Error joining room:", err);
          callback({ error: "Failed to join room." });
        }
      });

      socket.on("updateSettings", async ({ roomCode, settings }) => {
        try {
          const room = await Room.findOne({ code: roomCode });
          if (!room) return; // handle error or do nothing

          // Only host can update
          if (room.hostId !== socket.id) return;

          // Update room settings
          room.settings = settings;
          await room.save();

          // Broadcast updated settings
          io.to(roomCode).emit("settingsUpdated", room.settings);
        } catch (err) {
          console.error("Error updating settings:", err);
        }
      });

      socket.on("startGame", async ({ roomCode }) => {
        try {
          const room = await Room.findOne({ code: roomCode });
          if (!room) return;

          if (room.hostId === socket.id) {
            room.isGameStarted = true;
            await room.save();

            io.to(roomCode).emit("gameStarted", {
              settings: room.settings,
            });
          }
        } catch (err) {
          console.error("Error starting game:", err);
        }
      });

      socket.on("leaveRoom", async ({ roomCode }, callback) => {
        try {
          // 1. Find the room in the DB or in-memory
          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }

          // 2. Remove the user from the room’s player list
          room.players = room.players.filter((player) => player.id !== socket.id);

          // 3. Handle logic if the departing user was the host
          if (room.hostId === socket.id) {
            // Option A: Assign a new host if any players remain
            // if (room.players.length > 0) {
            //   room.hostId = room.players[0].id;
            //   // Or handle other host assignment logic
            // } else {
            //   // Option B: If no one left, just remove the room
            //   await Room.deleteOne({ code: roomCode });
            //   return callback({ success: true });
            // }

            // For simplicity, let's just remove the room if the host leaves
            await Room.deleteOne({ code: roomCode });
            socket.leave(roomCode);
            callback({ success: true });
            return;
          }

          // 4. Otherwise, just update the room and save
          await room.save();
          socket.leave(roomCode);

          // 5. Notify the remaining players in the room
          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
          });

          callback({ success: true });
        } catch (err) {
          console.error("Error leaving room:", err);
          callback({ error: "Failed to leave room." });
        }
      });

      socket.on("disconnect", (reason) => {
        const user = getUserFromSocketID(socket.id);
        removeUser(user, socket);
      });
    });
  },

  addUser: addUser,
  removeUser: removeUser,

  getSocketFromUserID: getSocketFromUserID,
  getUserFromSocketID: getUserFromSocketID,
  getSocketFromSocketID: getSocketFromSocketID,
  getIo: () => io,
};
