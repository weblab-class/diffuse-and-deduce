const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  id: String,
  name: String,
});

const RoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  hostDisconnected: { type: Boolean, default: false },
  players: { type: [PlayerSchema], default: [] },
  settings: {
    duration: { type: Number, default: 60 },
    rounds: { type: Number, default: 5 },
  },
  isGameStarted: { type: Boolean, default: false },
  scores: { type: Map, of: Number, default: {} },
  previousScores: { type: Map, of: Number, default: {} },
});

module.exports = mongoose.model("Room", RoomSchema);
