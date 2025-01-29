import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import socket from "../../client-socket";
import useRoom from "../../hooks/useRoom";
import Header from "../modules/Header";
import "../../utilities.css";
import confetti from "canvas-confetti";

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

  console.log("Recieved states:", {
    scores,
    socketToUserMap,
    roomCode,
    isHost,
    currentRound,
    totalRounds,
    totalTime,
    imagePath,
    gameMode,
    revealMode,
    hintsEnabled,
  });

  useRoom(roomCode);

  console.log(socketToUserMap, scores);

  const entries = Object.entries(socketToUserMap).filter(([socketId]) => socketId in scores);
  entries.sort((a, b) => scores[b[0]] - scores[a[0]]);
  const sortedSocketToUserMap = new Map(entries);

  const [showPodium, setShowPodium] = useState(false);
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    if (currentRound === totalRounds) {
      setShowPodium(true);

      // Start animation sequence with more particles and longer duration
      const stages = [
        setTimeout(() => {
          setAnimationStage(1);
          // Bronze confetti
          confetti({
            particleCount: 200,
            spread: 120,
            origin: { x: 0.75, y: 0.6 },
            colors: ["#92400e", "#b45309", "#d97706"],
            startVelocity: 35,
            gravity: 0.7,
            scalar: 1.2,
          });
        }, 500),

        setTimeout(() => {
          setAnimationStage(2);
          // Silver confetti
          confetti({
            particleCount: 200,
            spread: 120,
            origin: { x: 0.25, y: 0.6 },
            colors: ["#94a3b8", "#cbd5e1", "#e2e8f0"],
            startVelocity: 35,
            gravity: 0.7,
            scalar: 1.2,
          });
        }, 2000),

        setTimeout(() => {
          setAnimationStage(3);
          // Gold confetti burst
          const duration = 3000;
          const end = Date.now() + duration;
          const colors = ["#fbbf24", "#f59e0b", "#d97706", "#eab308", "#facc15"];

          const frame = () => {
            confetti({
              particleCount: 6,
              angle: 60,
              spread: 100,
              origin: { x: 0.5, y: 0.6 },
              colors: colors,
              startVelocity: 50,
              gravity: 0.6,
              scalar: 1.2,
              drift: 0.1,
            });

            confetti({
              particleCount: 6,
              angle: 120,
              spread: 100,
              origin: { x: 0.5, y: 0.6 },
              colors: colors,
              startVelocity: 50,
              gravity: 0.6,
              scalar: 1.2,
              drift: -0.1,
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };

          frame();
        }, 3500),
      ];

      return () => stages.forEach((timer) => clearTimeout(timer));
    }
  }, [currentRound, totalRounds]);

  const styles = `
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      25% { transform: translateY(-4px) rotate(2deg); }
      75% { transform: translateY(-2px) rotate(-2deg); }
    }
    
    @keyframes glow {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
    }

    .animate-glow {
      animation: glow 2s ease-in-out infinite;
    }
  `;

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    return () => document.head.removeChild(styleSheet);
  }, []);

  const Trophy = ({ type }) => {
    const colors = {
      gold: {
        primary: "text-yellow-400",
        secondary: "text-yellow-600",
        glow: "from-yellow-400/30 to-transparent",
      },
      silver: {
        primary: "text-gray-300",
        secondary: "text-gray-500",
        glow: "from-gray-400/30 to-transparent",
      },
      bronze: {
        primary: "text-amber-600",
        secondary: "text-amber-800",
        glow: "from-amber-600/30 to-transparent",
      },
    };

    const { primary, secondary, glow } = colors[type];

    return (
      <div className="relative animate-float">
        <div
          className={`absolute -inset-4 bg-gradient-radial ${glow} blur-xl opacity-75 animate-glow`}
        ></div>
        <svg
          className={`relative w-12 h-12 ${primary}`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 17c-1.875 0-3.375-1.5-3.375-3.375V8.25h6.75v5.375C15.375 15.5 13.875 17 12 17z"
            className={secondary}
            fill="currentColor"
          />
          <path
            d="M12 6.75h6.75v1.5c0 1.875-1.5 3.375-3.375 3.375h-3.375V6.75z"
            className={`${primary} opacity-80`}
            fill="currentColor"
          />
          <path
            d="M5.25 6.75H12v4.875H8.625C6.75 11.625 5.25 10.125 5.25 8.25v-1.5z"
            className={`${primary} opacity-80`}
            fill="currentColor"
          />
          <path
            d="M10.5 17v1.5h3V17h-3zM9 18.5h6v1.5H9z"
            className={secondary}
            fill="currentColor"
          />
        </svg>
      </div>
    );
  };

  const renderPodium = () => {
    const winners = Array.from(sortedSocketToUserMap.entries()).slice(0, 3);
    if (winners.length === 0) return null;

    return (
      <div className="relative h-[400px] w-full">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end justify-center gap-4 w-full max-w-2xl">
          {/* Second Place - Left */}
          {winners.length >= 2 && (
            <div
              className={`relative transition-all duration-1000 ${
                animationStage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
              }`}
            >
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-40">
                <div className="animate-bounce text-center" style={{ animationDuration: "2s" }}>
                  <div className="flex justify-center mb-2">
                    <Trophy type="silver" />
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xl font-bold text-gray-200">{winners[1][1].name}</p>
                    <p className="text-2xl font-bold text-gray-300">{scores[winners[1][0]]} pts</p>
                  </div>
                </div>
              </div>
              <div className="w-32 h-[160px] overflow-hidden rounded-t-lg">
                <div className="h-full w-full bg-gray-300">
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-700">2</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* First Place - Center */}
          {winners.length >= 1 && (
            <div
              className={`relative transition-all duration-1000 ${
                animationStage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
              }`}
            >
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-40">
                <div className="animate-bounce text-center" style={{ animationDuration: "2s" }}>
                  <div className="flex justify-center mb-2">
                    <Trophy type="gold" />
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xl font-bold text-yellow-300">{winners[0][1].name}</p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {scores[winners[0][0]]} pts
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-32 h-[200px] overflow-hidden rounded-t-lg">
                <div className="h-full w-full bg-yellow-400">
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-yellow-700">1</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Third Place - Right */}
          {winners.length >= 3 && (
            <div
              className={`relative transition-all duration-1000 ${
                animationStage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
              }`}
            >
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-40">
                <div className="animate-bounce text-center" style={{ animationDuration: "2s" }}>
                  <div className="flex justify-center mb-2">
                    <Trophy type="bronze" />
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xl font-bold text-amber-600">{winners[2][1].name}</p>
                    <p className="text-2xl font-bold text-amber-500">{scores[winners[2][0]]} pts</p>
                  </div>
                </div>
              </div>
              <div className="w-32 h-[120px] overflow-hidden rounded-t-lg">
                <div className="h-full w-full bg-amber-600">
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-amber-900">3</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floor reflection effect */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/10 to-transparent blur-lg"></div>
      </div>
    );
  };

  const renderPlayerList = () => {
    const remainingPlayers = Array.from(sortedSocketToUserMap.entries()).slice(3);
    if (remainingPlayers.length === 0) return null;

    return (
      <div
        className={`mt-8 max-w-2xl mx-auto transition-all duration-1000 ${
          animationStage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
        }`}
      >
        <div className="space-y-3 max-h-60 overflow-y-auto px-4">
          {remainingPlayers.map(([socketId, user], index) => (
            <div
              key={socketId}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 font-medium w-8">{index + 4}</span>
                <span className="text-white font-semibold">{user.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {Array.from({
                    length: Math.min(5, Math.max(0, Math.ceil((scores[socketId] || 0) / 300))),
                  }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">
                      ★
                    </span>
                  ))}
                  {Array.from({
                    length: Math.min(5, Math.max(0, 5 - Math.ceil((scores[socketId] || 0) / 300))),
                  }).map((_, i) => (
                    <span key={i} className="text-gray-600 text-xl">
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-blue-400 font-bold text-xl">{scores[socketId] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSinglePlayerScore = () => {
    const playerScore = Object.values(scores)[0] || 0;
    const numStars = Math.min(5, Math.max(0, Math.ceil((playerScore || 0) / 300)));

    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-12 px-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-2">Game Complete!</h2>
          <p className="text-xl text-gray-300">Here's how you did:</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl font-bold text-yellow-400 mb-4">{playerScore}</div>
            <div className="text-2xl text-gray-300 mb-6">points</div>
            <div className="flex justify-center space-x-2">
              {Array.from({ length: numStars }).map((_, i) => (
                <span key={i} className="text-3xl text-yellow-400">
                  ★
                </span>
              ))}
              {Array.from({ length: 5 - numStars }).map((_, i) => (
                <span key={i} className="text-3xl text-gray-600">
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  const handleReturnHome = () => {
    socket.emit("leaveRoom", { roomCode });
    navigate("/");
  };

  return (
    <div className="min-h-screen overflow-y-auto relative flex flex-col">
      <Header backNav="/room-actions" />
      {/* Background layers */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a1b]">
        <div className="absolute inset-0 bg-[url('/background-images/background-leaderboard.png')] bg-cover bg-center bg-no-repeat opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen flex justify-center items-center">
        {currentRound === totalRounds && showPodium ? (
          <div className="w-full max-w-4xl backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-8">
            <h2 className="text-3xl font-bold text-center text-white mb-12">Final Results!</h2>
            {gameMode === "multi" ? (
              <>
                {renderPodium()}
                {renderPlayerList()}
              </>
            ) : (
              renderSinglePlayerScore()
            )}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleReturnHome}
                className="group relative px-8 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-md border border-white/10 hover:bg-[#442e74] transition-all duration-300"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 animate-pulse" />
                <span className="relative text-white group-hover:text-white/90 transition-colors">
                  Back to Home
                </span>
              </button>
            </div>
          </div>
        ) : (
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
                        <span className="text-lg text-white/90 font-medium">Your final score:</span>
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
                  <div className="flex flex-col items-center mt-8 relative">
                    {/* Decorative frame corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-400/30 -translate-x-2 -translate-y-2" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-400/30 translate-x-2 -translate-y-2" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-400/30 -translate-x-2 translate-y-2" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400/30 translate-x-2 translate-y-2" />

                    {/* Main content */}
                    <div className="text-center px-8 py-6 backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10">
                      <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent mb-3">
                        Game Complete!
                      </h2>

                      {/* Winner announcement for multiplayer */}
                      {gameMode === "multi" && Array.from(sortedSocketToUserMap.entries())[0] && (
                        <div className="mb-6">
                          <p className="text-white/80 mb-2">Champion</p>
                          <p className="text-xl font-bold text-yellow-300">
                            {Array.from(sortedSocketToUserMap.entries())[0][1].name}
                          </p>
                          <div className="text-white/60 mt-1">
                            with {scores[Array.from(sortedSocketToUserMap.entries())[0][0]]} points
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleReturnHome}
                        className="group relative px-8 py-3 mt-2 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-md border border-white/10 hover:bg-[#442e74] transition-all duration-300"
                      >
                        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 animate-pulse" />
                        <span className="relative text-white group-hover:text-white/90 transition-colors">
                          Back to Home
                        </span>
                      </button>
                    </div>
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
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
