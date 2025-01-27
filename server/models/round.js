// models/round.js

const { CurrencyBtc } = require("@phosphor-icons/react");
const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  startTime: { type: Number, default: 0 }, // store in ms (Date.now())
  totalTime: { type: Number, default: 30 }, // how many seconds
  isActive: { type: Boolean, default: false },
  correctAnswer: { type: String, required: true },
  imagePath: { type: String, required: true }, // New field
  totalRounds: { type: Number, default: 1 },  
  currentRound: { type: Number, default: 1 },
  players: [
    {
      socketId: String,
      name: String,
      score: Number,
    },
  ],
  // ... other fields
});

module.exports = mongoose.model("Round", RoundSchema);
