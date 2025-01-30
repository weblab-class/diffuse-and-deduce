const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  startTime: { type: Number, default: 0 },
  totalTime: { type: Number, default: 30 },
  isActive: { type: Boolean, default: false },
  correctAnswers: { type: [String], required: true },
  primaryAnswer: { type: String, default: "" },
  imagePath: { type: String, required: true },
  totalRounds: { type: Number, default: 1 },
  currentRound: { type: Number, default: 1 },
  revealMode: { type: String, enum: ["diffusion", "random"], default: "diffusion" },
  hintsEnabled: { type: Boolean, default: false },
  sabotageEnabled: { type: Boolean, default: false },
  players: [
    {
      socketId: String,
      name: String,
      score: Number,
    },
  ],
});

module.exports = mongoose.model("Round", RoundSchema);
