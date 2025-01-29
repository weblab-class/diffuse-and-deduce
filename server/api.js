/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");

// import models so we can interact with the database
const User = require("./models/user");

// import authentication library
const auth = require("./auth");

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

//initialize socket
const socketManager = require("./server-socket");

const Round = require("./models/round");
const Room = require("./models/room");

// Generating temporary IDs for guests
const { v4: uuidv4 } = require("uuid");

router.post("/login", auth.login);

function guestLogin(req, res) {
  const guestId = uuidv4();

  const guestUser = {
    _id: guestId,
    name: `Guest-${guestId.substring(0, 5)}`,
    is_guest: true,
  };

  req.session.user = guestUser;
  res.send(guestUser);
}

router.post("/guest-login", guestLogin);

router.post("/logout", auth.logout);

router.get("/whoami", (req, res) => {
  if (req.session.user) {
    res.send(req.session.user);
  } else {
    // not logged in
    return res.send({});
  }
});

router.post("/initsocket", (req, res) => {
  // do nothing if user not logged in
  if (req.user) {
    console.log("User id", req.user._id, "Socket id", req.body.socketid);
    socketManager.addUser(req.user, socketManager.getSocketFromSocketID(req.body.socketid));
  }
  res.send({});
});

router.get("/hostSocketId", (req, res) => {
  const { roomCode } = req.query;

  Room.findOne({ code: roomCode })
    .then((room) => {
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json({ hostSocketId: room.hostId });
    })
    .catch((error) => {
      console.error("Error fetching room:", error);
      res.status(500).json({ error: "Internal server error" });
    });
});

router.get("/gameState", (req, res) => {
  // fix for single user case
  const { roomCode } = req.query;
  console.log(`Received request for game state with roomCode: ${roomCode}`);

  Round.findOne({ roomCode, isActive: true })
    .then((round) => {
      if (!round) {
        console.log(`No active round found for roomCode: ${roomCode}`);
        return res.status(404).json({ error: "No active round found" });
      }
      console.log(`Found round for roomCode: ${roomCode}`);
      res.json({
        imagePath: round.imagePath,
        startTime: round.startTime,
        totalTime: round.totalTime,
        // totalRounds: round.totalRounds,
        // currentRound: round.currentRound,
        primaryAnswer: round.primaryAnswer,
        // Add any other properties that might be needed by the client
      });
    })
    .catch((error) => {
      console.error("Error fetching game state:", error);
      res.status(500).json({ error: "Internal server error" });
    });
});

// router.get("/gameState", (req, res) => {
//   const { roomCode } = req.query;
//   console.log(`Received request for game state with roomCode: ${roomCode}`);

//   Promise.all([
//     Room.findOne({ code: roomCode }),
//     Round.findOne({ roomCode })
//   ])
//     .then(([room, round]) => {
//       if (!room) {
//         console.log(`No room found for roomCode: ${roomCode}`);
//         return res.status(404).json({ error: "Room not found" });
//       }
//       if (!round) {
//         console.log(`No round found for roomCode: ${roomCode}`);
//         return res.status(404).json({ error: "Round not found" });
//       }
//       console.log(`Found room and round for roomCode: ${roomCode}`);
//       console.log(`Total rounds in room: ${room.settings?.rounds}`);
//       res.json({
//         imagePath: round.imagePath,
//         startTime: round.startTime,
//         totalTime: round.totalTime,
//         totalRounds: room.settings?.rounds,
//         // Add any other properties that might be needed by the client
//       });
//     })
//     .catch((error) => {
//       console.error("Error fetching game state:", error);
//       res.status(500).json({ error: "Internal server error" });
//     });
// });

const multer = require("multer");

// In-memory storage for uploaded images
const imageStorage = new Map();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10, // Maximum 10 files
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

// Endpoint to handle image uploads
router.post("/upload-images", upload.array("images", 10), (req, res) => {
  try {
    const imageIds = req.files.map((file) => {
      const imageId = uuidv4();
      imageStorage.set(imageId, {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalName: file.originalname,
      });
      return imageId;
    });

    res.json({ imageIds });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// Endpoint to get a random image
router.get("/get-game-image", (req, res) => {
  const { roomCode, imageIds } = req.query;

  if (!imageIds) {
    return res.status(400).json({ error: "No image IDs provided" });
  }

  const imageIdArray = JSON.parse(imageIds);
  if (!imageIdArray.length) {
    return res.status(400).json({ error: "Empty image ID array" });
  }

  const randomIndex = Math.floor(Math.random() * imageIdArray.length);
  const randomImageId = imageIdArray[randomIndex];
  const image = imageStorage.get(randomImageId);

  if (!image) {
    return res.status(404).json({ error: "Image not found" });
  }

  res.set("Content-Type", image.mimetype);
  res.send(image.buffer);
});

// Cleanup function to remove images when game ends
router.post("/cleanup-images", (req, res) => {
  const { imageIds } = req.body;

  if (imageIds && Array.isArray(imageIds)) {
    imageIds.forEach((id) => {
      imageStorage.delete(id);
    });
  }

  res.json({ success: true });
});

// |------------------------------|
// | write your API methods below!|
// |------------------------------|

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
