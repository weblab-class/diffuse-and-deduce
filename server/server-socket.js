const fs = require("fs");
const path = require("path");

let io;
let sharedImageStorage;

const userToSocketMap = {}; // maps user ID to socket object
const socketToUserMap = {}; // maps socket ID to user object
const roomUsedImages = {}; // Track used images per room
const roomTopics = {}; // Track the topic for each room
const roomHosts = {}; // Track the host for each room
const roomGameModes = {}; // Track if room is using imported images
const roomUploadedImages = {}; // Store uploaded images per room

const rooms = {}; // to store interval references for each room

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

function startRoundTimer(roomCode) {
  // Clear any existing interval for this room
  if (rooms[roomCode] && rooms[roomCode].interval) {
    clearInterval(rooms[roomCode].interval);
  }

  // Initialize room if it doesn't exist
  if (!rooms[roomCode]) {
    rooms[roomCode] = { scores: {} };
  }

  console.log(`Starting round timer for room ${roomCode}`);

  // Store the start time when we begin the timer
  const timerStartTime = Date.now();

  // create an interval that checks the DB each second
  const interval = setInterval(async () => {
    try {
      const round = await Round.findOne({ roomCode });

      // Check if round exists and is active
      if (!round) {
        console.log(`No round found for room ${roomCode}, clearing timer`);
        return;
      }

      // Calculate elapsed time from when this timer started
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      // console.log(`Room ${roomCode}: Time elapsed ${elapsed}s / ${round.totalTime}s`);

      if (elapsed >= round.totalTime) {
        console.log(`Round ${roomCode} time is up, ending round`);

        // Mark round as inactive and save
        round.isActive = false;
        await round.save();

        // Clean up timer
        clearInterval(interval);
        delete rooms[roomCode].interval;

        // Update prev scores
        rooms[roomCode].previousScores = { ...rooms[roomCode].scores };

        // Notify clients that round is over with round information
        io.to(roomCode).emit("roundOver", {
          scores: rooms[roomCode].scores,
          socketToUserMap,
        });
      } else {
        // Send time update (capped at total round time)
        const timeUpdate = { timeElapsed: Math.min(elapsed, round.totalTime) };
        io.to(roomCode).emit("timeUpdate", timeUpdate);
      }
    } catch (err) {
      console.error(`Error in round timer for room ${roomCode}:`, err);
      clearInterval(interval);
      delete rooms[roomCode].interval;
    }
  }, 1000);

  // Store the interval reference and start time
  rooms[roomCode].interval = interval;
  rooms[roomCode].timerStartTime = timerStartTime;
  console.log(`Timer started for room ${roomCode} at ${new Date(timerStartTime).toISOString()}`);
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

function checkGuess(guessText, correctAnswers) {
  if (!guessText || !correctAnswers) return false;
  const normalizedGuess = guessText.trim().toLowerCase().replace(/\s+/g, "");
  console.log(normalizedGuess);
  return correctAnswers.includes(normalizedGuess);
}

module.exports = {
  init: (http, imageStorage) => {
    if (imageStorage) {
      sharedImageStorage = imageStorage;
    }
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
      const price = { stall: 50, addNoise: 50, deduct: 30 };

      socket.on("sabotage", async ({ roomCode, type, targetId }) => {
        try {
          // Validate sabotage parameters
          if (!roomCode || !type || !targetId) {
            return socket.emit("errorMessage", "Invalid sabotage parameters.");
          }

          // Fetch the room from the database
          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return socket.emit("errorMessage", "Room not found.");
          }

          // Find the acting player in the room
          const actingPlayer = room.players.find((p) => p.id === socket.id);
          if (!actingPlayer) {
            return socket.emit("errorMessage", "You are not part of this room.");
          }

          // Prevent sabotaging oneself
          if (actingPlayer.id === targetId) {
            return socket.emit("errorMessage", "You cannot sabotage yourself.");
          }

          // Find the target player
          const targetPlayer = room.players.find((p) => p.id === targetId);
          if (!targetPlayer) {
            return socket.emit("errorMessage", "Target player not found in the room.");
          }

          // Ensure the acting player has enough points
          const actingScore = rooms[roomCode].scores[socket.id] || 0;
          if (actingScore < price[type]) {
            return socket.emit("errorMessage", "Not enough points to perform sabotage.");
          }

          // Deduct points from the acting player
          rooms[roomCode].scores[socket.id] -= price[type];

          // Initialize the difference object for score updates
          const diff = {
            [socket.id]: -price[type], // Acting player loses points
          };

          // Apply the sabotage effect based on the type
          if (type === "addNoise") {
            // Notify the target to add noise
            io.to(targetId).emit("sabotageApplied", { type: "addNoise", from: socket.id });
          } else if (type === "stall") {
            // Notify the target to stall (disable guessing)
            io.to(targetId).emit("sabotageApplied", { type: "stall", from: socket.id });
          } else if (type === "deduct") {
            // Deduct 50 points from the target player
            rooms[roomCode].scores[targetId] = (rooms[roomCode].scores[targetId] || 0) - 60;
            diff[targetId] = -60;

            // Notify the target about the deduction
            io.to(targetId).emit("sabotageApplied", { type: "deduct", from: socket.id });
          } else {
            return socket.emit("errorMessage", "Unknown sabotage type.");
          }

          // Emit updated scores to all players in the room
          io.to(roomCode).emit("scoreUpdate", { scores: rooms[roomCode].scores, diff });
        } catch (err) {
          console.error("Error handling sabotage:", err);
          socket.emit("errorMessage", "Failed to perform sabotage.");
        }
      });

      socket.on("submitGuess", async ({ roomCode, guessText }) => {
        try {
          // Only block host from guessing if using imported images
          const roomMode = roomGameModes[roomCode];
          if (roomMode && roomMode.isImportedImages && roomMode.host === socket.id) {
            socket.emit("guessResult", {
              correct: false,
              message: "As the host who imported the images, you cannot submit guesses",
              isHost: true,
            });
            return;
          }

          console.log("Received guess:", { roomCode, guessText });
          // Find the active round for this room
          const round = await Round.findOne({ roomCode, isActive: true });

          if (!round) {
            console.log("No active round found for guess");
            return socket.emit("errorMessage", "No active round in this room");
          }

          // Calculate elapsed time from the timer's start time
          const timeElapsed = Math.floor((Date.now() - rooms[roomCode].timerStartTime) / 1000);
          const isCorrect = checkGuess(guessText, round.correctAnswers);

          console.log("Guess check:", {
            guessText,
            correctAnswer: round.correctAnswers,
            isCorrect,
            timeElapsed,
            totalTime: round.totalTime,
          });

          const playerId = socket.id;

          // Initialize scores object if it doesn't exist
          if (!rooms[roomCode]) {
            rooms[roomCode] = { scores: {} };
          }
          if (!rooms[roomCode].scores) {
            rooms[roomCode].scores = {};
          }

          // Save a snapshot of scores before any updates
          // Ensure a previousScores object exists for this room (persists between rounds)
          if (!rooms[roomCode].previousScores) {
            rooms[roomCode].previousScores = { ...rooms[roomCode].scores }; // Copy current scores at the start of the game
          }

          // Initialize the player's score if it doesn't exist
          if (!rooms[roomCode].scores[playerId]) {
            rooms[roomCode].scores[playerId] = 0;
          }

          if (isCorrect) {
            const totalTime = round.totalTime;
            const score = Math.round(((totalTime - timeElapsed) / totalTime) * 1000);
            console.log(
              `Score calculation: (${totalTime} - ${timeElapsed}) / ${totalTime} * 1000 = ${score}`
            );

            rooms[roomCode].scores[playerId] += score;
            console.log(
              `Player ${playerId} scored ${score} points. Total: ${rooms[roomCode].scores[playerId]}`
            );

            io.to(roomCode).emit("correctGuess", { playerId, score });
          } else {
            const score = -100;
            rooms[roomCode].scores[playerId] += score;
            console.log(
              `Player ${playerId} lost 100 points. Total: ${rooms[roomCode].scores[playerId]}`
            );
            io.to(roomCode).emit("wrongGuess", { playerId });
          }

          // Calculate the difference in scores based on previousScores (changes since last round)
          const diff = {};
          Object.keys(rooms[roomCode].scores).forEach((playerId) => {
            const currentScore = rooms[roomCode].scores[playerId] || 0;
            const previousScore = rooms[roomCode].previousScores[playerId] || 0;
            diff[playerId] = currentScore - previousScore; // Net change since the last round
          });

          console.log("Diff:", diff);

          // Score update
          io.to(roomCode).emit("scoreUpdate", { scores: rooms[roomCode].scores, diff });
        } catch (err) {
          console.error("Error in submitGuess:", err);
          socket.emit("errorMessage", "Error processing guess");
        }
      });

      socket.on(
        "startRound",
        async ({
          roomCode,
          totalTime,
          topic,
          totalRounds,
          currentRound,
          revealMode,
          hintsEnabled,
          sabotageEnabled,
          gameMode,
          uploadedImages,
        }) => {
          try {
            // Store if the room is using imported images
            if (currentRound === 1) {
              // Only set the host on the first round
              roomGameModes[roomCode] = {
                isImportedImages: topic === "Import_Images",
                host: socket.id,
              };
            } else if (roomTopics[roomCode] === "Import_Images") {
              // For subsequent rounds, maintain the existing host but update isImportedImages
              roomGameModes[roomCode] = {
                isImportedImages: true,
                host: roomGameModes[roomCode].host, // Preserve the original host
              };
            }

            console.log("Received startRound event:", {
              roomCode,
              socketId: socket.id,
              topic,
              uploadedImages: uploadedImages ? uploadedImages.length : 0,
            });

            // If this is round 1 and we have uploaded images, store them
            if (currentRound === 1 && uploadedImages && uploadedImages.length > 0) {
              roomUploadedImages[roomCode] = uploadedImages;
            }

            // If this is a new round (not round 1), use the room's existing topic
            if (currentRound > 1 && roomTopics[roomCode]) {
              topic = roomTopics[roomCode];
            } else {
              // If this is round 1, store the topic for future rounds
              roomTopics[roomCode] = topic;
            }

            console.log("Starting new round with params:", {
              roomCode,
              totalTime,
              topic,
              totalRounds,
              currentRound,
              revealMode,
              hintsEnabled,
              gameMode,
              hasUploadedImages: !!uploadedImages,
            });

            // First mark any existing rounds as inactive
            await Round.updateMany({ roomCode }, { isActive: false });

            // Create a new round with all required fields
            const round = new Round({
              roomCode,
              totalTime,
              isActive: true,
              totalRounds,
              currentRound,
              startTime: Date.now(),
              revealMode,
              hintsEnabled,
              sabotageEnabled,
            });

            let imagePath;

            if (topic === "Import_Images") {
              // Use the stored uploaded images
              const currentUploadedImages = roomUploadedImages[roomCode];
              if (!currentUploadedImages || currentUploadedImages.length === 0) {
                throw new Error("No uploaded images available for this room");
              }

              // Initialize used images tracking for this room if needed
              if (!roomUsedImages[roomCode]) {
                roomUsedImages[roomCode] = new Set();
              }

              // If we've used all images, reset the tracking
              if (roomUsedImages[roomCode].size === currentUploadedImages.length) {
                roomUsedImages[roomCode].clear();
              }

              // Get available images (ones we haven't used yet)
              const availableImages = currentUploadedImages.filter(
                (id) => !roomUsedImages[roomCode].has(id)
              );

              // Select random image
              const randomIndex = Math.floor(Math.random() * availableImages.length);
              const selectedImageId = availableImages[randomIndex];

              // Mark as used
              roomUsedImages[roomCode].add(selectedImageId);

              // For uploaded images, use special URL format
              imagePath = `/api/get-game-image?roomCode=${roomCode}&imageIds=${JSON.stringify([
                selectedImageId,
              ])}`;

              // Get image data for answer
              if (!sharedImageStorage) {
                throw new Error("Image storage not initialized");
              }
              const imageData = sharedImageStorage.get(selectedImageId);
              if (imageData && imageData.primaryLabel) {
                const primaryLabel = imageData.primaryLabel.toLowerCase().trim();
                const secondaryLabel = imageData.secondaryLabel
                  ? imageData.secondaryLabel.toLowerCase().trim()
                  : "";

                round.correctAnswers = secondaryLabel
                  ? [primaryLabel, secondaryLabel]
                  : [primaryLabel];
                round.primaryAnswer = primaryLabel;
              } else {
                round.correctAnswers = ["uploaded-image"];
                round.primaryAnswer = "uploaded-image";
              }
            } else {
              // Original code for predefined topics
              const imagesDir = path.join(__dirname, "public", "game-images", topic);
              const files = fs
                .readdirSync(imagesDir)
                .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));

              if (files.length === 0) {
                throw new Error(`No images found for topic: ${topic}`);
              }

              // Initialize used images tracking for this room if needed
              if (!roomUsedImages[roomCode]) {
                roomUsedImages[roomCode] = new Set();
              }

              // If we've used all images, reset the tracking
              if (roomUsedImages[roomCode].size === files.length) {
                roomUsedImages[roomCode].clear();
              }

              // Get available images (ones we haven't used yet)
              const availableImages = files.filter((file) => !roomUsedImages[roomCode].has(file));

              // Select random image from available ones
              const randomIndex = Math.floor(Math.random() * availableImages.length);
              const selectedImage = availableImages[randomIndex];

              // Mark as used
              roomUsedImages[roomCode].add(selectedImage);

              console.log(`Selected image for room ${roomCode}: ${selectedImage}`);

              round.correctAnswers = path.parse(selectedImage).name.split("-");
              round.primaryAnswer = round.correctAnswers[0];
              imagePath = `/game-images/${topic}/${selectedImage}`;
            }

            console.log(`Selected image path: ${imagePath}`);
            round.imagePath = imagePath;

            await round.save();
            console.log("Round saved successfully with totalTime:", round.totalTime);
            console.log("Round saved with totalRounds:", round.totalRounds);

            // Clear any existing timer and start a new one
            if (rooms[roomCode] && rooms[roomCode].interval) {
              clearInterval(rooms[roomCode].interval);
            }

            // Emit 'roundStarted' to all clients in the room with image information
            io.to(roomCode).emit("roundStarted", {
              roomCode,
              startTime: round.startTime,
              totalTime: round.totalTime,
              imagePath,
              totalRounds: round.totalRounds, // Use the saved totalRounds
              currentRound: round.currentRound,
              gameMode,
              revealMode: round.revealMode,
              primaryAnswer: round.primaryAnswer,
              hintsEnabled: round.hintsEnabled,
              sabotageEnabled: round.sabotageEnabled,
            });

            const room = await Room.findOne({ code: roomCode });
            io.to(roomCode).emit("roomData", {
              players: room.players,
              hostId: room.hostId,
              scores: rooms[roomCode].scores,
            });

            // Start the timer after everything is set up
            startRoundTimer(roomCode);
          } catch (err) {
            console.error("Error starting round:", err);
            socket.emit("errorMessage", "Could not start round");
          }
        }
      );

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
            players: [{ id: socket.id, name: playerName }],
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

          // Find the room
          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }

          // Check if player already exists
          const existingPlayer = room.players.find((player) => player.name === playerName);
          if (existingPlayer) {
            // Update the player's socket ID
            existingPlayer.id = socket.id;
            if (room.hostId === existingPlayer.id) {
              room.hostId = socket.id;
            }
          } else {
            // Add new player
            room.players.push({ id: socket.id, name: playerName });
          }

          await room.save();

          // Update in-memory room data
          if (!rooms[roomCode]) {
            rooms[roomCode] = { players: [], scores: {} };
          }
          const playerIndex = rooms[roomCode].players.findIndex((p) => p.name === playerName);
          if (playerIndex !== -1) {
            rooms[roomCode].players[playerIndex].id = socket.id;
          } else {
            rooms[roomCode].players.push({ id: socket.id, name: playerName });
            rooms[roomCode].scores[socket.id] = rooms[roomCode].scores[socket.id] || 0;
          }

          socket.join(roomCode);

          // Emit updated room data to all clients in the room
          io.to(roomCode).emit("roomData", {
            players: room.players,
            hostId: room.hostId,
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
              // Host was last player - delete room and all associated rounds
              console.log(`Last player leaving room ${roomCode}, cleaning up...`);
              await Promise.all([
                Room.deleteOne({ code: roomCode }),
                Round.deleteMany({ roomCode }), // Delete all rounds for this room
              ]);
              console.log(`Deleted room ${roomCode} and its rounds`);

              // Clear any existing interval before deleting the room
              if (rooms[roomCode] && rooms[roomCode].interval) {
                clearInterval(rooms[roomCode].interval);
              }
              delete rooms[roomCode];
            }
          } else {
            // not host- just save player removal
            await room.save();
          }

          // In Memory game state cleanup
          if (rooms[roomCode]) {
            // Store scores before cleanup for final emit
            const finalScores = { ...rooms[roomCode].scores };

            rooms[roomCode].players = rooms[roomCode].players.filter(
              (player) => player.id !== socket.id
            );
            delete rooms[roomCode].scores[socket.id];

            // Notify all users in room of the leaving user before potential room deletion
            io.to(roomCode).emit("roomData", {
              players: room.players,
              hostId: room.hostId,
              scores: finalScores,
            });

            if (rooms[roomCode].players.length === 0) {
              // Clear any existing interval before deleting the room
              if (rooms[roomCode] && rooms[roomCode].interval) {
                clearInterval(rooms[roomCode].interval);
              }
              delete rooms[roomCode];
            }
          }

          // SOCKETIO cleanup
          socket.leave(roomCode);
          callback({ error: null });
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
      //   console.log(`socket has disconnected ${socket.id}`);

      //   // Handle socket disconnects
      //   //   socket.on("disconnect", async (reason) => {
      //   //     console.log(`Socket disconnected: ${socket.id}`);
      //   //     const user = getUserFromSocketID(socket.id);
      //   //     removeUser(user, socket);

      //   //     try {
      //   //       // Find any rooms this socket was in
      //   //       const rooms = await Room.find({ "players.id": socket.id });
      //   //       for (const room of rooms) {
      //   //         // Remove the player from the room's player list
      //   //         room.players = room.players.filter((player) => player.id !== socket.id);

      //   //         // If this was the host, mark the room as host disconnected
      //   //         if (room.hostId === socket.id) {
      //   //           console.log(`Host ${socket.id} disconnected from room ${room.code}`);
      //   //           room.hostDisconnected = true;
      //   //           // Optionally assign new host if there are other players
      //   //           if (room.players.length > 0) {
      //   //             room.hostId = room.players[0].id;
      //   //             room.hostDisconnected = false;
      //   //           }
      //   //         }

      //   //         // Save the room (don't delete it)
      //   //         await room.save();

      //   //         // Notify remaining players
      //   //         io.to(room.code).emit("roomData", {
      //   //           players: room.players,
      //   //           hostId: room.hostId,
      //   //           hostDisconnected: room.hostDisconnected,
      //   //         });
      //   //       }
      //   //     } catch (err) {
      //   //       console.error("Error handling disconnect:", err);
      //   //     }
      //   //   });
    });
  },

  addUser: addUser,
  removeUser: removeUser,

  getSocketFromUserID: getSocketFromUserID,
  getUserFromSocketID: getUserFromSocketID,
  getSocketFromSocketID: getSocketFromSocketID,
  getIo: () => io,
};
