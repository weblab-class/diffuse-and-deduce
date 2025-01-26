const fs = require("fs");
const path = require("path");

let io;

const userToSocketMap = {}; // maps user ID to socket object
const socketToUserMap = {}; // maps socket ID to user object

const getAllConnectedUsers = () => Object.values(socketToUserMap);
const getSocketFromUserID = (userid) => userToSocketMap[userid];
const getUserFromSocketID = (socketid) => socketToUserMap[socketid];
const getSocketFromSocketID = (socketid) => io.sockets.sockets.get(socketid);

const addUser = (user, socket) => {
  const oldSocket = userToSocketMap[user._id];
  console.log("User id:", user._id);
  if (oldSocket && oldSocket.id !== socket.id) {
    // there was an old tab open for this user, force it to disconnect
    console.log("Old socket:", oldSocket.id);
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

      // Create id_to_name mapping
      // const id_to_name = socketToUserMap;
      io.to(roomCode).emit("roundOver", { scores: rooms[roomCode].scores, socketToUserMap });
    } else {
      // Send time update (capped at total round time)
      const timeUpdate = { timeElapsed: Math.min(elapsed, round.totalTime) };
      io.to(roomCode).emit("timeUpdate", timeUpdate);
    }
  }, 1000);
}

// Clean up old rooms periodically
const cleanupRooms = async () => {
  try {
    // Only clean up rooms that are:
    // 1. More than 3 hours old OR
    // 2. Have no players and are more than 1 hour old
    const oneDayAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
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

function checkGuess(guessText, correctAnswer) {
  // Implement your guess checking logic here
  return guessText.toLowerCase() === correctAnswer.toLowerCase();
}

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
          console.log("Received guess:", { roomCode, guessText });
          const round = await Round.findOne({ roomCode });
          if (!round || !round.isActive) {
            return socket.emit("errorMessage", "No active round in this room");
          }

          const timeElapsed = Math.floor((Date.now() - round.startTime) / 1000);
          const isCorrect = checkGuess(guessText, round.correctAnswer);

          console.log("Guess check:", {
            guessText,
            correctAnswer: round.correctAnswer,
            isCorrect,
          }); // Debug: Guess checking

          const playerId = socket.id;

          if (isCorrect) {
            const totalTime = round.totalTime;
            const score = Math.round(((totalTime - timeElapsed) / totalTime) * 1000);
            rooms[roomCode].scores[playerId] = (rooms[roomCode].scores[playerId] || 0) + score;

            io.to(roomCode).emit("correctGuess", { playerId });
          } else {
            rooms[roomCode].scores[playerId] = (rooms[roomCode].scores[playerId] || 0) - 100;
            io.to(roomCode).emit("wrongGuess", { playerId });
          }

          // Score update
          io.to(roomCode).emit("scoreUpdate", { scores: rooms[roomCode].scores });

          await round.save();
        } catch (err) {
          console.error("Error in submitGuess:", err);
          // console.error("Error in submitGuess:", err);
        }
      });

      socket.on("startRound", async ({ roomCode, totalTime, topic, revealMode }) => {
        try {
          let round = await Round.findOne({ roomCode });
          if (!round) {
            round = new Round({ roomCode });
          }
          console.log("Created round in server with roomcode:", roomCode);

          // Set round details
          round.startTime = Date.now();
          round.totalTime = totalTime;
          round.isActive = true;
          round.revealMode = revealMode;

          // Define the directory containing images for the selected topic
          const imagesDir = path.join(__dirname, "public", "game-images", topic);

          // Read all image files from the topic directory
          const files = fs
            .readdirSync(imagesDir)
            .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));
          if (files.length === 0) {
            throw new Error(`No images found for topic: ${topic}`);
          }

          // Select a random image
          const randomIndex = Math.floor(Math.random() * files.length);
          const selectedImage = files[randomIndex];

          // Derive the correct answer from the image filename (without extension)
          const correctAnswer = path.parse(selectedImage).name.toLowerCase();

          // Set the image path accessible by the frontend
          const imagePath = `/game-images/${topic}/${selectedImage}`;
          console.log(`Selected image path: ${imagePath}`);

          // Update the round with the selected image and answer
          round.correctAnswer = correctAnswer;
          round.imagePath = imagePath;
          round.scores = new Map();
          await round.save();

          // Start the round timer
          startRoundTimer(roomCode);

          // Emit 'roundStarted' to all clients in the room with image information
          io.to(roomCode).emit("roundStarted", {
            roomCode,
            startTime: round.startTime,
            totalTime,
            imagePath, // Ensure this path is correct
            revealMode,
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
          const newRoom = new Room({
            code: roomCode,
            hostId: socket.id,
            players: [{ id: socket.id, name: playerName }],
          });
          await newRoom.save();

          // In memory game state
          rooms[roomCode] = {
            players: { [socket.id]: playerName },
            scores: { [socket.id]: 0 },
          };

          socket.join(roomCode);

          // Emit room data to everyone in room
          io.to(roomCode).emit("roomData", {
            players: newRoom.players,
            hostId: newRoom.hostId,
            scores: rooms[roomCode].scores,
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

          // Save in MONGODB
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
            console.log("Player already exists in room:", existingPlayer);
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

          // Add player to the IN-MEMORY room data
          if (!rooms[roomCode]) {
            rooms[roomCode] = { players: {}, scores: {} };
          }
          rooms[roomCode].players[socket.id] = playerName;
          rooms[roomCode].scores[socket.id] = 0;

          // SOCKETIO
          socket.join(roomCode);

          // Immediately emit room data to all clients in the room
          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
            where: "New Player joined",
            scores: rooms[roomCode].scores,
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
          // MONGODB cleanup
          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }

          room.players = room.players.filter((player) => player.id !== socket.id);
          if (room.hostId === socket.id) {
            if (room.players.length > 0) {
              // other players exist in room- assign new host
              room.hostId = room.players[0].id;
              await room.save();
            } else {
              // Host was last player - delete room
              await Room.deleteOne({ code: roomCode });
            }
          } else {
            // not host- just save player removal
            await room.save();
          }

          // In Memory game state cleanup
          if (rooms[roomCode]) {
            delete rooms[roomCode].players[socket.id];
            if (rooms[roomCode].hostId === socket.id) {
              const remainingPlayers = Object.keys(rooms[roomCode].players);
              if (remainingPlayers.length > 0) {
                rooms[roomCode].hostId = remainingPlayers[0];
              } else {
                delete rooms[roomCode];
              }
            }
          }

          // SOCKETIO cleanup
          socket.leave(roomCode);

          // Notify all users in room of the leaving user
          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
            scores: rooms[roomCode].scores,
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

      // socket.on("disconnect", async (reason) => {
      //   console.log(`Socket disconnected: ${socket.id}`);
      //   const rooms = await Room.find({ "players.id": socket.id });
      //   for (const room of rooms) { // TODO FIX THIS SO DON'T HAVE MANY OLD ROOMS
      //     if (room.hostId === socket.id) {
      //       // Options are to either delete the room or assign a new host (if there are other players left)
      //       await Room.deleteOne({ code: room.code });
      //       socket.leave(room.code);
      //       return;
      //     }
      //     room.players = room.players.filter(player => player.id !== socket.id);
      //     await room.save();
      //     socket.leave(room.code);
      //     io.to(room.code).emit("roomData", {
      //       players: room.players,
      //       hostId: room.hostId,
      //     });
      //   }
      // }); // TODO FIX THIS SO DON'T HAVE MANY OLD ROOMS

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
