const fs = require("fs");
const path = require("path");

let io;
let sharedImageStorage;

const userToSocketMap = {};
const socketToUserMap = {};
const roomUsedImages = {};
const roomTopics = {};
const roomHosts = {};
const roomGameModes = {};
const roomUploadedImages = {};

const rooms = {};

const getAllConnectedUsers = () => Object.values(socketToUserMap);
const getSocketFromUserID = (userid) => userToSocketMap[userid];
const getUserFromSocketID = (socketid) => socketToUserMap[socketid];
const getSocketFromSocketID = (socketid) => io.sockets.sockets.get(socketid);

const addUser = (user, socket) => {
  const oldSocket = userToSocketMap[user._id];
  if (oldSocket && oldSocket.id !== socket.id) {
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
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

function startRoundTimer(roomCode) {
  if (rooms[roomCode] && rooms[roomCode].interval) {
    clearInterval(rooms[roomCode].interval);
  }

  if (!rooms[roomCode]) {
    rooms[roomCode] = { scores: {} };
  }

  const timerStartTime = Date.now();

  const interval = setInterval(async () => {
    try {
      const round = await Round.findOne({ roomCode });

      if (!round) {
        return;
      }

      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      // console.log(`Room ${roomCode}: Time elapsed ${elapsed}s / ${round.totalTime}s`);

      if (elapsed >= round.totalTime) {
        round.isActive = false;
        await round.save();
        let emitScores = { ...rooms[roomCode].scores };
        let emitSocketToUserMap = { ...socketToUserMap };

        const isImportedImages = roomGameModes[roomCode]?.isImportedImages;
        if (isImportedImages) {
          const hostSocketId = roomGameModes[roomCode].host;

          delete emitScores[hostSocketId];
          delete emitSocketToUserMap[hostSocketId];
        }

        io.to(roomCode).emit("roundOver", {
          scores: emitScores,
          socketToUserMap: emitSocketToUserMap,
        });

        clearInterval(interval);
        delete rooms[roomCode].interval;

        rooms[roomCode].previousScores = { ...rooms[roomCode].scores };
      } else {
        const timeUpdate = { timeElapsed: Math.min(elapsed, round.totalTime) };
        io.to(roomCode).emit("timeUpdate", timeUpdate);
      }
    } catch (err) {
      console.error(`Error in round timer for room ${roomCode}:`, err);
      clearInterval(interval);
      delete rooms[roomCode].interval;
    }
  }, 1000);

  rooms[roomCode].interval = interval;
  rooms[roomCode].timerStartTime = timerStartTime;
}

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
    }
  } catch (err) {
    console.error("Error cleaning up rooms:", err);
  }
};

function objectIdFromDate(date) {
  return Math.floor(date.getTime() / 1000).toString(16) + "0000000000000000";
}

setInterval(cleanupRooms, 5 * 60 * 1000);

function checkGuess(guessText, correctAnswers) {
  if (!guessText || !correctAnswers) return false;
  const normalizedCorrectAnswers = correctAnswers.map((answer) => answer.toLowerCase());
  const normalizedGuess = guessText.trim().toLowerCase();
  return normalizedCorrectAnswers.includes(normalizedGuess);
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
      const Round = require("./models/round");
      const price = { stall: 50, addNoise: 50, deduct: 30 };

      socket.on("sabotage", async ({ roomCode, type, targetId }) => {
        try {
          if (!roomCode || !type || !targetId) {
            return socket.emit("errorMessage", "Invalid sabotage parameters.");
          }

          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return socket.emit("errorMessage", "Room not found.");
          }

          const actingPlayer = room.players.find((p) => p.id === socket.id);
          if (!actingPlayer) {
            return socket.emit("errorMessage", "You are not part of this room.");
          }

          if (actingPlayer.id === targetId) {
            return socket.emit("errorMessage", "You cannot sabotage yourself.");
          }

          const targetPlayer = room.players.find((p) => p.id === targetId);
          if (!targetPlayer) {
            return socket.emit("errorMessage", "Target player not found in the room.");
          }

          const actingScore = rooms[roomCode].scores[socket.id] || 0;
          if (actingScore < price[type]) {
            return socket.emit("errorMessage", "Not enough points to perform sabotage.");
          }

          rooms[roomCode].scores[socket.id] -= price[type];

          const diff = {
            [socket.id]: -price[type],
          };

          if (type === "addNoise") {
            io.to(targetId).emit("sabotageApplied", { type: "addNoise", from: socket.id });
          } else if (type === "stall") {
            io.to(targetId).emit("sabotageApplied", { type: "stall", from: socket.id });
          } else if (type === "deduct") {
            rooms[roomCode].scores[targetId] = (rooms[roomCode].scores[targetId] || 0) - 60;
            diff[targetId] = -60;
            io.to(targetId).emit("sabotageApplied", { type: "deduct", from: socket.id });
          } else {
            return socket.emit("errorMessage", "Unknown sabotage type.");
          }

          io.to(roomCode).emit("scoreUpdate", { scores: rooms[roomCode].scores, diff });
        } catch (err) {
          console.error("Error handling sabotage:", err);
          socket.emit("errorMessage", "Failed to perform sabotage.");
        }
      });

      socket.on("submitGuess", async ({ roomCode, guessText }) => {
        try {
          const round = await Round.findOne({ roomCode, isActive: true });

          if (!round) {
            return socket.emit("errorMessage", "No active round in this room");
          }
          const timeElapsed = Math.floor((Date.now() - rooms[roomCode].timerStartTime) / 1000);
          const isCorrect = checkGuess(guessText, round.correctAnswers);

          const playerId = socket.id;

          if (!rooms[roomCode]) {
            rooms[roomCode] = { scores: {} };
          }
          if (!rooms[roomCode].scores) {
            rooms[roomCode].scores = {};
          }

          if (!rooms[roomCode].previousScores) {
            rooms[roomCode].previousScores = { ...rooms[roomCode].scores };
          }

          if (!rooms[roomCode].scores[playerId]) {
            rooms[roomCode].scores[playerId] = 0;
          }

          if (isCorrect) {
            const totalTime = round.totalTime;
            const score = Math.round(((totalTime - timeElapsed) / totalTime) * 1000);

            rooms[roomCode].scores[playerId] += score;

            io.to(roomCode).emit("correctGuess", { playerId, score });
          } else {
            const score = -100;
            rooms[roomCode].scores[playerId] += score;
            io.to(roomCode).emit("wrongGuess", { playerId });
          }

          const diff = {};
          Object.keys(rooms[roomCode].scores).forEach((playerId) => {
            const currentScore = rooms[roomCode].scores[playerId] || 0;
            const previousScore = rooms[roomCode].previousScores[playerId] || 0;
            diff[playerId] = currentScore - previousScore;
          });

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
            if (currentRound === 1) {
              roomGameModes[roomCode] = {
                isImportedImages: topic === "Import_Images",
                host: socket.id,
              };
            } else if (roomTopics[roomCode] === "Import_Images") {
              roomGameModes[roomCode] = {
                isImportedImages: true,
                host: roomGameModes[roomCode].host,
              };
            }

            if (currentRound === 1 && uploadedImages && uploadedImages.length > 0) {
              roomUploadedImages[roomCode] = uploadedImages;
            }

            if (currentRound > 1 && roomTopics[roomCode]) {
              topic = roomTopics[roomCode];
            } else {
              roomTopics[roomCode] = topic;
            }

            await Round.updateMany({ roomCode }, { isActive: false });

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
              const currentUploadedImages = roomUploadedImages[roomCode];
              if (!currentUploadedImages || currentUploadedImages.length === 0) {
                throw new Error("No uploaded images available for this room");
              }

              if (!roomUsedImages[roomCode]) {
                roomUsedImages[roomCode] = new Set();
              }

              if (roomUsedImages[roomCode].size === currentUploadedImages.length) {
                roomUsedImages[roomCode].clear();
              }

              const availableImages = currentUploadedImages.filter(
                (id) => !roomUsedImages[roomCode].has(id)
              );

              const randomIndex = Math.floor(Math.random() * availableImages.length);
              const selectedImageId = availableImages[randomIndex];

              roomUsedImages[roomCode].add(selectedImageId);

              imagePath = `/api/get-game-image?roomCode=${roomCode}&imageIds=${JSON.stringify([
                selectedImageId,
              ])}`;

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
              const imagesDir = path.join(__dirname, "public", "game-images", topic);
              const files = fs
                .readdirSync(imagesDir)
                .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));

              if (files.length === 0) {
                throw new Error(`No images found for topic: ${topic}`);
              }

              if (!roomUsedImages[roomCode]) {
                roomUsedImages[roomCode] = new Set();
              }

              if (roomUsedImages[roomCode].size === files.length) {
                roomUsedImages[roomCode].clear();
              }

              const availableImages = files.filter((file) => !roomUsedImages[roomCode].has(file));

              const randomIndex = Math.floor(Math.random() * availableImages.length);
              const selectedImage = availableImages[randomIndex];

              roomUsedImages[roomCode].add(selectedImage);

              round.correctAnswers = path.parse(selectedImage).name.trim().split("-");
              round.primaryAnswer = round.correctAnswers[0];
              imagePath = `/game-images/${topic}/${selectedImage}`;
            }

            round.imagePath = imagePath;

            await round.save();
            if (rooms[roomCode] && rooms[roomCode].interval) {
              clearInterval(rooms[roomCode].interval);
            }

            io.to(roomCode).emit("roundStarted", {
              roomCode,
              startTime: round.startTime,
              totalTime: round.totalTime,
              imagePath,
              totalRounds: round.totalRounds,
              currentRound: round.currentRound,
              gameMode,
              revealMode: round.revealMode,
              primaryAnswer: round.primaryAnswer,
              hintsEnabled: round.hintsEnabled,
              sabotageEnabled: round.sabotageEnabled,
              importedImages: topic === "Import_Images",
            });

            const room = await Room.findOne({ code: roomCode });
            io.to(roomCode).emit("roomData", {
              players: room.players,
              hostId: room.hostId,
              scores: rooms[roomCode].scores,
            });

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
          const allRooms = await Room.find({});

          const room = await Room.findOne({ code: roomCode });

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

          await cleanupRooms();

          const roomCode = generateRoomCode();
          const newRoom = new Room({
            code: roomCode,
            hostId: socket.id,
            players: [{ id: socket.id, name: playerName }],
          });
          await newRoom.save();

          rooms[roomCode] = {
            players: [{ id: socket.id, name: playerName }],
            scores: { [socket.id]: 0 },
          };

          socket.join(roomCode);

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
          if (!roomCode || !playerName) {
            return callback({ error: "Room code and player name are required." });
          }

          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }

          const existingPlayer = room.players.find((player) => player.name === playerName);
          if (existingPlayer) {
            existingPlayer.id = socket.id;
            if (room.hostId === existingPlayer.id) {
              room.hostId = socket.id;
            }
          } else {
            room.players.push({ id: socket.id, name: playerName });
          }

          await room.save();

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
          const room = await Room.findOne({ code: roomCode });
          if (!room) {
            return callback({ error: "Room not found." });
          }

          room.players = room.players.filter((player) => player.id !== socket.id);
          if (room.hostId === socket.id) {
            if (room.players.length > 0) {
              room.hostId = room.players[0].id;
              await room.save();
            } else {
              await Promise.all([
                Room.deleteOne({ code: roomCode }),
                Round.deleteMany({ roomCode }),
              ]);

              if (rooms[roomCode] && rooms[roomCode].interval) {
                clearInterval(rooms[roomCode].interval);
              }
              delete rooms[roomCode];
            }
          } else {
            await room.save();
          }

          if (rooms[roomCode]) {
            const finalScores = { ...rooms[roomCode].scores };

            rooms[roomCode].players = rooms[roomCode].players.filter(
              (player) => player.id !== socket.id
            );
            delete rooms[roomCode].scores[socket.id];

            io.to(roomCode).emit("roomData", {
              players: room.players,
              hostId: room.hostId,
              scores: finalScores,
            });

            if (rooms[roomCode].players.length === 0) {
              if (rooms[roomCode] && rooms[roomCode].interval) {
                clearInterval(rooms[roomCode].interval);
              }
              delete rooms[roomCode];
            }
          }

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
          if (!room) return;

          if (room.hostId !== socket.id) return;

          room.settings = settings;
          await room.save();

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
    });
  },

  addUser: addUser,
  removeUser: removeUser,

  getSocketFromUserID: getSocketFromUserID,
  getUserFromSocketID: getUserFromSocketID,
  getSocketFromSocketID: getSocketFromSocketID,
  getIo: () => io,
};
