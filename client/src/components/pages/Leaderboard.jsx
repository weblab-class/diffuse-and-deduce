import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import socket from "../../client-socket";
import useRoom from "../../hooks/useRoom";

import Header from "../modules/Header";

import "../../utilities.css";

const Leaderboard = () => {
  const { state } = useLocation();
  const scores = state?.scores || {};
  const socketToUserMap = state?.socketToUserMap || {};
  const roomCode = state?.roomCode;
  const isHost = state?.isHost || false;
  const currentRound = state?.currentRound || 1;
  const totalRounds = state?.totalRounds || 1;
  const totalTime = state?.totalTime || 0;
  const imagePath = state?.imagePath || "";
  const gameMode = state?.gameMode || "single";
  const revealMode = state?.revealMode || "diffusion";
  const hintsEnabled = state?.hintsEnabled || false;
  const sabotageEnabled = state?.sabotageEnabled || false;
  const importedImages = state?.importedImages || false;
  const navigate = useNavigate();

  useRoom(roomCode);

  console.log(socketToUserMap, scores);

  const entries = Object.entries(socketToUserMap).filter(([socketId]) => socketId in scores);
  entries.sort((a, b) => scores[b[0]] - scores[a[0]]);
  const sortedSocketToUserMap = new Map(entries);

  const handleNextRound = () => {
    console.log("Next Round button clicked");
    console.log("Leaderboard's Image Path: ", imagePath);

    // Check if we're using imported images by checking the image path
    const isImportedImages = imagePath.includes("/api/get-game-image");

    if (isImportedImages) {
      // For imported images, we need to use the room's topic and uploaded images
      socket.emit("startRound", {
        roomCode,
        totalTime,
        topic: "Import_Images", // This tells the server we're using imported images
        totalRounds,
        currentRound: currentRound + 1,
        revealMode,
        hintsEnabled,
        sabotageEnabled,
        gameMode,
      });
    } else {
      // For regular images, extract topic from path
      const topic = imagePath.split("/")[4];
      socket.emit("startRound", {
        roomCode,
        totalTime,
        topic,
        totalRounds,
        currentRound: currentRound + 1,
        revealMode,
        hintsEnabled,
        sabotageEnabled,
        gameMode,
      });
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header backNav="/room-actions" />
      {/* Background layers */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a1b] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-leaderboard.png')] bg-cover bg-center bg-no-repeat opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen flex justify-center items-center">
        <div className="w-[28rem] backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header with glow effect */}
          <div className="relative py-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20" />
            <h1 className="relative text-3xl font-semibold text-white/90 tracking-wide">
              Leaderboard
            </h1>
            <p className="relative text-lg text-white/60 mt-1">
              On round: {currentRound}/{totalRounds}
            </p>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(147,51,234,0.2)_0%,transparent_60%)]" />
          </div>

          {/* Divider with glow */}
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

          {/* Scores list with hover effects */}
          <div className="p-6 space-y-3">
            {Array.from(sortedSocketToUserMap.entries()).map(([playerId, player], index) => {
              const bgColor =
                gameMode === "multi" && index === 0
                  ? "bg-[#cdab31] hover:bg-[#B38600] backdrop-blur-md border-yellow-500/30" // Gold with darker hover
                  : gameMode === "multi" && index === 1
                  ? "bg-[#a29fa5] hover:bg-[#848484] backdrop-blur-md border-gray-400/30" // Silver with darker hover
                  : gameMode === "multi" && index === 2
                  ? "bg-[#764c00] hover:bg-[#5c3b00] backdrop-blur-md border-amber-600/30" // Bronze with darker hover
                  : "bg-white/5 hover:bg-white/10 border-white/10 backdrop-blur-md"; // Default
              return (
                <div
                  key={playerId}
                  className={`group flex items-center justify-between p-4 rounded-xl ${bgColor} transition-all duration-300 hover:border-purple-500/30 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-500/10`}
                >
                  <div className="flex items-center space-x-4">
                    {gameMode === "single" ? (
                      <span className="text-lg text-white/90 font-medium">Your score:</span>
                    ) : (
                      <>
                        <span className="h-8 w-8 flex items-center justify-center text-white/90 font-medium rounded-full bg-gradient-to-r from-purple-500/50 to-indigo-500/50 backdrop-blur-md border border-white/10 group-hover:border-purple-500/30 transition-all duration-300">
                          {index + 1}
                        </span>
                        <span className="text-lg text-white/90 font-medium">{player.name}</span>
                      </>
                    )}
                  </div>
                  <div className="px-4 py-1 rounded-full bg-gradient-to-r from-purple-500/50 to-indigo-500/50 backdrop-blur-md border border-white/10 group-hover:border-purple-500/30 transition-all duration-300">
                    <span className="text-white/90 font-semibold">{scores[playerId] || 0}</span>
                    <span className="text-white/70 ml-1">pts</span>
                  </div>
                </div>
              );
            })}
            <div>
              {currentRound === totalRounds ? (
                <div className="flex justify-center mt-4">
                  <div className="text-white px-4 py-2">Game Finished!</div>
                </div>
              ) : (
                <>
                  {isHost ? (
                    <div className="flex justify-center mt-4">
                      {console.log("Next Round button rendered")}
                      <button
                        className="text-white px-4 py-2 rounded rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-md border border-white/10 hover:bg-[#442e74] transition-all duration-300"
                        onClick={handleNextRound}
                      >
                        Next Round
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center mt-4">
                      {console.log("Next Round button not rendered")}
                      <div className="text-white px-4 py-2">Waiting for next round...</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
