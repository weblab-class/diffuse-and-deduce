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
const Round = require("./models/round");

function generateRoomCode() {
  // e.g., 4-digit alphanumeric or simple random code
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

const rooms = {}; // to store interval references for each room

function startRoundTimer(roomCode) {
  // create an interval that checks the DB each second
  const interval = setInterval(async () => {
    const round = await Round.findOne({ roomCode });
    if (!round || !round.isActive) {
      clearInterval(interval);
      return;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - round.startTime) / 1000);

    if (elapsed >= round.totalTime) {
      round.isActive = false;
      await round.save();
      clearInterval(interval);
      io.to(roomCode).emit("roundOver");
    } else {
      io.to(roomCode).emit("timeUpdate", { timeElapsed: elapsed });
    }
  }, 1000);

  // Remember the interval so we could clear it if needed
  rooms[roomCode] = { intervalId: interval };
}

// Clean up old rooms periodically
const cleanupRooms = async () => {
  try {
    // Only clean up rooms that are:
    // 1. More than 24 hours old OR
    // 2. Have no players and are more than 1 hour old
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const oldRooms = await Room.find({
      $or: [
        { _id: { $lt: objectIdFromDate(oneDayAgo) } },
        {
          _id: { $lt: objectIdFromDate(oneHourAgo) },
          "players.0": { $exists: false },
        },
      ],
    });

    if (oldRooms.length > 0) {
      const oldRoomIds = oldRooms.map((r) => r._id);
      await Room.deleteMany({ _id: { $in: oldRoomIds } });
      console.log(`Cleaned up ${oldRooms.length} old/empty rooms`);
    }
  } catch (err) {
    console.error("Error cleaning up rooms:", err);
  }
};

// Helper function to convert date to ObjectId
function objectIdFromDate(date) {
  return Math.floor(date.getTime() / 1000).toString(16) + "0000000000000000";
}

// Clean up rooms every 5 minutes
setInterval(cleanupRooms, 5 * 60 * 1000);

module.exports = {
  init: (http) => {
    io = require("socket.io")(http, {
      pingTimeout: 60000,
      pingInterval: 25000,
      cors: {
        origin: true,
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log(`socket has connected ${socket.id}`);

      const Round = require("./models/round");

      socket.on("submitGuess", async ({ roomCode, guessText }) => {
        try {
          const round = await Round.findOne({ roomCode });
          if (!round || !round.isActive) {
            return socket.emit("errorMessage", "No active round in this room");
          }

          const timeElapsed = Math.floor((Date.now() - round.startTime) / 1000);

          // Check guess logic...
          // Possibly store player's score in `round.players`, e.g.:
          // let player = round.players.find(p => p.socketId === socket.id);
          // if correct:
          //   player.score += someCalculation(timeElapsed, round.totalTime);

          await round.save();

          io.to(roomCode).emit("playerGuessed", {
            // data about the guess or updated score
          });
        } catch (err) {
          console.error("Error in submitGuess:", err);
          socket.emit("errorMessage", "Failed to process guess");
        }
      });

      socket.on("startRound", async ({ roomCode, totalTime }) => {
        try {
          let round = await Round.findOne({ roomCode });
          if (!round) {
            round = new Round({ roomCode });
          }

          // set start time, total time, isActive
          round.startTime = Date.now();
          round.totalTime = totalTime;
          round.isActive = true;
          await round.save();

          // Start the timer so we begin emitting `timeUpdate` events
          startRoundTimer(roomCode);

          io.to(roomCode).emit("roundStarted", {
            roomCode,
            startTime: round.startTime,
            totalTime,
          });
        } catch (err) {
          console.error("Error starting round:", err);
          socket.emit("errorMessage", "Could not start round");
        }
      });

      socket.on("checkRoomExists", async ({ roomCode }, callback) => {
        if (!callback || typeof callback !== "function") {
          console.error("No callback provided");
          return;
        }

        try {
          console.log("Checking room exists for code:", roomCode);

          // Log all rooms in the database
          const allRooms = await Room.find({});
          console.log(
            "All rooms in database:",
            allRooms.map((r) => ({
              code: r.code,
              hostId: r.hostId,
              players: r.players.length,
              created: r._id.getTimestamp(),
            }))
          );

          // Try to find room
          const room = await Room.findOne({ code: roomCode });
          console.log("Room search result:", room);

          if (!room) {
            console.log("Room not found with code:", roomCode);
          } else {
            console.log("Found room:", {
              code: room.code,
              hostId: room.hostId,
              players: room.players.length,
              created: room._id.getTimestamp(),
            });
          }

          callback({ exists: !!room, error: null });
        } catch (err) {
          console.error("Error checking room:", err);
          callback({ exists: false, error: "Failed to check room." });
        }
      });

      socket.on("createRoom", async ({ playerName }, callback) => {
        try {
          if (!playerName) {
            return callback({ error: "Player name is required" });
          }

          // Clean up old rooms first
          await cleanupRooms();

          const roomCode = generateRoomCode();
          console.log("Generated new room code:", roomCode);

          const newRoom = new Room({
            code: roomCode,
            hostId: socket.id,
            players: [{ id: socket.id, name: playerName }],
          });

          await newRoom.save();
          console.log("Room saved successfully:", {
            code: newRoom.code,
            hostId: newRoom.hostId,
            players: newRoom.players,
            _id: newRoom._id,
          });

          // Verify room was saved
          const verifyRoom = await Room.findOne({ code: roomCode });
          console.log(
            "Verification - Found room in DB:",
            verifyRoom
              ? {
                  code: verifyRoom.code,
                  hostId: verifyRoom.hostId,
                  players: verifyRoom.players,
                  _id: verifyRoom._id,
                }
              : "Not found"
          );

          socket.join(roomCode);

          // Emit room data to everyone in room
          io.to(roomCode).emit("roomData", {
            players: newRoom.players,
            hostId: newRoom.hostId,
          });

          return callback({ roomCode: roomCode });
        } catch (err) {
          console.error("Error creating room:", err);
          return callback({ error: "Failed to create room: " + (err.message || "Unknown error") });
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

          console.log(`\n[Room ${roomCode}] Player attempting to join:`, {
            name: playerName,
            socketId: socket.id,
          });
          console.log(
            `Current players in room:`,
            room.players.map((p) => ({ name: p.name, id: p.id }))
          );

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
          socket.join(roomCode);

          console.log(
            `\n[Room ${roomCode}] Updated player list:`,
            room.players.map((p) => ({
              name: p.name,
              id: p.id,
              isHost: p.id === room.hostId,
            }))
          );

          // Immediately emit room data to all clients in the room
          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
          });

          callback({ success: true });
        } catch (err) {
          console.error("Error joining room:", err);
          callback({ error: "Failed to join room." });
        }
      });

      socket.on("leaveRoom", async ({ roomCode }, callback) => {
        if (!callback || typeof callback !== "function") {
          console.error("No callback provided for leaveRoom");
          return;
        }

        try {
          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }

          console.log(`\n[Room ${roomCode}] Player leaving:`, { socketId: socket.id });
          console.log(
            `Players before removal:`,
            room.players.map((p) => ({ name: p.name, id: p.id }))
          );

          room.players = room.players.filter((player) => player.id !== socket.id);

          if (room.hostId === socket.id) {
            // Options are to either delete the room or assign a new host (if there are other players left)
            await Room.deleteOne({ code: roomCode });
            socket.leave(roomCode);
            return callback({ success: true });
          }

          await room.save();
          socket.leave(roomCode);

          console.log(
            `\n[Room ${roomCode}] Updated player list:`,
            room.players.map((p) => ({
              name: p.name,
              id: p.id,
              isHost: p.id === room.hostId,
            }))
          );

          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
          });

          callback({ success: true });
        } catch (err) {
          console.error("Error in leaveRoom:", err);
          callback({ error: "Failed to leave room: " + err.message });
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

      // Handle socket disconnects
      //   socket.on("disconnect", async (reason) => {
      //     console.log(`Socket disconnected: ${socket.id}`);
      //     const user = getUserFromSocketID(socket.id);
      //     removeUser(user, socket);

      //     try {
      //       // Find any rooms this socket was in
      //       const rooms = await Room.find({ "players.id": socket.id });
      //       for (const room of rooms) {
      //         // Remove the player from the room's player list
      //         room.players = room.players.filter((player) => player.id !== socket.id);

      //         // If this was the host, mark the room as host disconnected
      //         if (room.hostId === socket.id) {
      //           console.log(`Host ${socket.id} disconnected from room ${room.code}`);
      //           room.hostDisconnected = true;
      //           // Optionally assign new host if there are other players
      //           if (room.players.length > 0) {
      //             room.hostId = room.players[0].id;
      //             room.hostDisconnected = false;
      //           }
      //         }

      //         // Save the room (don't delete it)
      //         await room.save();

      //         // Notify remaining players
      //         io.to(room.code).emit("roomData", {
      //           players: room.players,
      //           hostId: room.hostId,
      //           hostDisconnected: room.hostDisconnected,
      //         });
      //       }
      //     } catch (err) {
      //       console.error("Error handling disconnect:", err);
      //     }
      //   });
    });
  },

  addUser: addUser,
  removeUser: removeUser,

  getSocketFromUserID: getSocketFromUserID,
  getUserFromSocketID: getUserFromSocketID,
  getSocketFromSocketID: getSocketFromSocketID,
  getIo: () => io,
};
