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

// Generating temporary IDs for guests
const { v4: uuidv4 } = require("uuid");

router.post("/login", auth.login);

function guestLogin(req, res) {
  // Generate a unique temporary ID
  const guestId = uuidv4();

  // Create a guest user object
  const guestUser = {
    _id: guestId,
    name: `Guest-${guestId.substring(0, 5)}`, // Optional: create a display name
    is_guest: true, // Flag to indicate this is a guest user
  };

  // Store the guest user in the session
  console.log("Guest login");
  console.log(req.session.user);
  console.log(guestUser);
  req.session.user = guestUser;

  // Respond with the guest user data
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

// router.get("/gameState", (req, res) => { // fix for single user case
//   Round.findOne({ roomCode: req.query.roomCode }).then((round) => {
//     res.send(round);
//   });
// });

router.get("/gameState", (req, res) => { // fix for single user case
  const { roomCode } = req.query;
  console.log(`Received request for game state with roomCode: ${roomCode}`);

  Round.findOne({ roomCode }).then((round) => {
    if (!round) {
      console.log(`No round found for roomCode: ${roomCode}`);
      return res.status(404).json({ error: "Round not found" });
    }
    console.log(`Found round for roomCode: ${roomCode}`);
    res.json({
      imagePath: round.imagePath,
      startTime: round.startTime,
      totalTime: round.totalTime,
      // Add any other properties that might be needed by the client
    });
  }).catch((error) => {
    console.error("Error fetching game state:", error);
    res.status(500).json({ error: "Internal server error" });
  });
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
