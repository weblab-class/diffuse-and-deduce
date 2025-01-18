const mongoose = require("mongoose");

// You can also define a nested "Player" schema if you want more structure
const PlayerSchema = new mongoose.Schema({
  id: String, // socket.id
  name: String, // player's display name
});

const RoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  hostId: { type: String, required: true }, // store the socket.id of the host
  players: { type: [PlayerSchema], default: [] },
  settings: {
    duration: { type: Number, default: 60 },
    rounds: { type: Number, default: 5 },
    // add other fields as needed
  },
  isGameStarted: { type: Boolean, default: false },
});

module.exports = mongoose.model("Room", RoomSchema);
