const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  startTime: { type: Number, default: 0 }, // store in ms (Date.now())
  totalTime: { type: Number, default: 30 }, // how many seconds
  isActive: { type: Boolean, default: false },
  correctAnswer: { type: String, required: true },
  // example additional fields:
  players: [
    {
      socketId: String,
      name: String,
      score: Number,
    },
  ],
  // ...
});

module.exports = mongoose.model("Round", RoundSchema);
