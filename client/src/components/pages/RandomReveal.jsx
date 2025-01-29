import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import socket from "../../client-socket";
import Header from "../modules/Header";
import "../../utilities.css";
import { get } from "../../utilities";

const RandomReveal = () => {
  const { roomCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [scores, setScores] = useState({});
  const [diff, setDiff] = useState({});
  const [guessText, setGuessText] = useState("");
  const [guessedCorrectly, setGuessedCorrectly] = useState(false);
  const [guessedWrong, setGuessedWrong] = useState(false);
  // const [timePerRound, setTimePerRound] = useState(30);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [finalScores, setFinalScores] = useState(null);

  const [primaryAnswer, setPrimaryAnswer] = useState("");
  // const [hintsEnabled, setHintsEnabled] = useState(state?.hintsEnabled ?? false);
  const [revealedHint, setRevealedHint] = useState("");

  const hintsEnabled = state?.hintsEnabled || false;
  const currentRound = state?.currentRound || 1;
  const totalRounds = state?.totalRounds || 1;
  const gameMode = state?.gameMode || "single";
  const revealMode = state?.revealMode || "diffusion";
  const timePerRound = state?.timePerRound || 30;

  const [isHost, setIsHost] = useState(false);
  const [socketToUserMap, setSocketToUserMap] = useState({});

  const canvasRef = useRef(null);
  const [revealCircles, setRevealCircles] = useState([]);
  const [lastRevealTime, setLastRevealTime] = useState(Date.now());

  // Constants for reveal configuration
  const REVEAL_INTERVAL = 2000; 
  const MIN_CIRCLE_SIZE = 30;
  const MAX_CIRCLE_SIZE = 80;

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const [imagePath, setImagePath] = useState("");
  const imageRef = useRef(null);

  useEffect(() => {
    get("/api/gameState", { roomCode })
      .then(
        ({
          imagePath: serverImagePath,
          startTime,
          totalTime,
          primaryAnswer: serverPrimaryAnswer,
        }) => {
          if (serverImagePath) {
            console.log("Got game state with image:", serverImagePath);
            setTimeElapsed(0); // Let server timeUpdate events handle the time
            setImagePath(`${SERVER_URL}${serverImagePath}`);
            // setTimePerRound(totalTime);
            setPrimaryAnswer(serverPrimaryAnswer);
          }
        }
      )
      .catch((error) => {
        console.error("GET request to /api/gameState failed with error:", error);
      });
  }, []);

  useEffect(() => {
    const handleTimeUpdate = ({ timeElapsed }) => {
      console.log("Received time update:", timeElapsed);
      setTimeElapsed(timeElapsed);

      // Add shake effect when time is less than 5 seconds
      const timeRemaining = timePerRound - timeElapsed;
      if (timeRemaining < 5) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 2000);
      }
    };

    const handleRoundStarted = ({ startTime, totalTime, imagePath }) => {
      console.log("Random Reveal: Round started with image:", imagePath);
      setTimeElapsed(0);
      setImagePath(`${SERVER_URL}${imagePath}`);
      // setTimePerRound(totalTime);
      setRevealCircles([]); // Reset reveal circles for new round
      setLastRevealTime(Date.now());
      setPrimaryAnswer(serverPrimaryAnswer);
      setRevealedHint("");
    };

    const handleRoundOver = ({ scores, socketToUserMap, correctAnswers}) => {
      // console.log("Round over with scores:", newScores);
      // setScores(newScores);
      // setIsRoundOver(true);
      // setFinalScores(newScores);
      // setFinalSocketMap(socketToUserMap);

      // Clear all reveals to show full image
      // setRevealCircles([]);

      console.log("Round over!");
      console.log("Mapping:", socketToUserMap);
      console.log("Round info from server:", { currentRound, totalRounds });

      setIsRoundOver(true);
      setSocketToUserMap(socketToUserMap);

      // Fetch the host's socket ID from the server
      get("/api/hostSocketId", { roomCode }).then(({ hostSocketId }) => {
        console.log("Current socket: ", socket.id);
        console.log("Host socket: ", hostSocketId);
        const isHostServer = socket.id === hostSocketId;
        console.log("After get request, Is host value:", isHostServer);
        setIsHost(isHostServer);
      }).catch((error) => {
        console.error("GET request to /api/hostSocketId failed with error:", error);
      }); 
    };

    const handleScoreUpdate = ({ scores: newScores, diff }) => {
      console.log("Received score update:", newScores, diff);
      setScores(newScores);
      setDiff(diff);
    };

    socket.on("timeUpdate", handleTimeUpdate);
    socket.on("roundStarted", handleRoundStarted);
    socket.on("roundOver", handleRoundOver);
    socket.on("scoreUpdate", handleScoreUpdate);

    return () => {
      socket.off("timeUpdate", handleTimeUpdate);
      socket.off("roundStarted", handleRoundStarted);
      socket.off("roundOver", handleRoundOver);
      socket.off("scoreUpdate", handleScoreUpdate);
    };
  }, [roomCode, navigate, timePerRound]);

  useEffect(() => {
    // Listen for the 'navigateToLeaderboard' event
    socket.on('navigateToLeaderboard', ({ roomCode, hostId, scores, socketToUserMap }) => {
      navigate("/leaderboard", { 
        state: { 
          scores, 
          socketToUserMap, 
          roomCode, 
          isHost: socket.id === hostId, 
          currentRound,
          totalRounds,
          imagePath,
          totalTime: timePerRound,  // Pass the current round's time to use for next round
          gameMode,
          revealMode, 
          hintsEnabled
        } 
      });
    });

    // Clean up the listener on component unmount
    return () => {
      socket.off('navigateToLeaderboard');
    };
  }, []);

  const handleContinueToLeaderboard = () => {
    socket.emit('goToLeaderboard', { roomCode });
  };


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 600; // Set appropriate width
    canvas.height = 400; // Set appropriate height
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Enable CORS for the image
    img.crossOrigin = "Anonymous";
    img.src = imagePath;

    img.onload = () => {
      setImgLoaded(true);
      // Initially draw the image completely covered in black
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    img.onerror = (err) => {
      console.error(`Failed to load image at path: ${imagePath}`, err);
      setImgLoaded(false);
      // Display a placeholder or error message
      // ctx.fillStyle = "#CCCCCC";
      ctx.fillStyle = "black"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      ctx.font = "20px Arial";
      ctx.fillText("Image failed to load.", 10, 50);
    };
  }, [imagePath]);

  useEffect(() => {
    socket.on("correctGuess", ({ playerId }) => {
      if (playerId === socket.id) {
        setGuessedCorrectly(true);
        setGuessedWrong(false);
      }
    });

    return () => {
      socket.off("correctGuess");
    };
  }, []);

  useEffect(() => {
    let timeoutId;
    if (guessedWrong) {
      timeoutId = setTimeout(() => {
        setGuessedWrong(false);
      }, 2000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [guessedWrong]);

  useEffect(() => {
    socket.on("wrongGuess", ({ playerId }) => {
      if (playerId === socket.id) {
        // Reset guessedWrong first to ensure the animation triggers again
        setGuessedWrong(false);
        // Use setTimeout to ensure the state actually changes before setting to true
        setTimeout(() => {
          setGuessedWrong(true);
        }, 10);
        if (hintsEnabled && primaryAnswer) {
          setRevealedHint((prev) => {
            // Reveal one more letter
            const nextIndex = prev.length;
            if (nextIndex < primaryAnswer.length) {
              return primaryAnswer.substring(0, nextIndex + 1);
            }
            return prev; // No change if we already revealed everything
          });
        }
      }
    });

    return () => {
      socket.off("wrongGuess");
    };
  }, [socket.id, hintsEnabled, primaryAnswer]);

  const handleSubmitGuess = () => {
    socket.emit("submitGuess", { roomCode, guessText });
    setGuessText("");
  };

  // Simplified reveal shape function with just spotlight
  const drawRevealShape = (ctx, shape, x, y, size) => {
    ctx.beginPath();

    // Create gradient for spotlight effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.arc(x, y, size, 0, Math.PI * 2);

    ctx.fill();
  };

  // Modify drawImageWithReveals to use the new shapes
  const drawImageWithReveals = (ctx, img, reveals) => {
    // First, draw the image
    ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);

    // If round is over, don't draw the mask
    if (isRoundOver) return;

    // Create a temporary canvas for the mask
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = ctx.canvas.width;
    maskCanvas.height = ctx.canvas.height;
    const maskCtx = maskCanvas.getContext("2d");

    // Fill the mask with black
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Set composite operation to "destination-out" to create holes in the black overlay
    maskCtx.globalCompositeOperation = "destination-out";

    // Draw all reveal shapes
    reveals.forEach((reveal) => {
      drawRevealShape(maskCtx, reveal.shape, reveal.x, reveal.y, reveal.size);
    });

    // Draw the mask over the image
    ctx.drawImage(maskCanvas, 0, 0);
  };

  // Calculate total number of reveals needed for full coverage
  const calculateTotalReveals = (roundTime) => {
    const canvas = canvasRef.current;
    if (!canvas) return 80; // fallback to default

    // Use normalized time for initial calculation
    const normalizedTime = Math.min(roundTime, 30);
    const avgBaseSize =
      Math.min(canvas.width, canvas.height) / (Math.sqrt(normalizedTime / 0.2) * 1.75);

    // Apply the same size adjustments as in addRevealCircle
    let adjustedBaseSize = avgBaseSize;
    if (roundTime > 30) {
      adjustedBaseSize = adjustedBaseSize * (1 + Math.log10(roundTime / 30) * 0.2);
    }
    const avgSize = adjustedBaseSize * 0.8;

    // Calculate area of canvas and area of each reveal
    const canvasArea = canvas.width * canvas.height;
    const revealArea = Math.PI * avgSize * avgSize;

    // Calculate base number of reveals needed
    const effectiveRevealArea = revealArea * 0.7; // Assume 70% effectiveness due to overlap
    const neededReveals = Math.ceil(canvasArea / effectiveRevealArea);

    // For longer rounds, scale up the number of reveals with time
    const baseReveals = Math.floor(roundTime / 0.25); // One reveal every 250ms
    const scaledReveals =
      roundTime > 30
        ? baseReveals * (1 + Math.log10(roundTime / 30) * 0.3) // More reveals for longer rounds
        : baseReveals;

    return Math.max(10, Math.min(neededReveals, scaledReveals));
  };

  // Helper function to check if image is mostly revealed
  const isImageMostlyRevealed = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    // For longer rounds, don't stop reveals - let them continue throughout the round
    if (timePerRound > 30) return false;

    // Only check coverage for shorter rounds
    const totalArea = canvas.width * canvas.height;
    let coveredArea = 0;

    revealCircles.forEach((circle) => {
      const revealArea = Math.PI * circle.size * circle.size * 0.7;
      coveredArea += revealArea;
    });

    return coveredArea >= totalArea * 0.95; // 95% coverage for short rounds
  };

  // Get a random point with bias towards center in final phase
  const getRevealPoint = (canvas, progress) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // In final 30% of round, focus more on center
    if (progress > 0.7) {
      const angle = Math.random() * 2 * Math.PI;
      // Square root of random gives more concentration towards center
      const radius = Math.sqrt(Math.random()) * Math.min(canvas.width, canvas.height) * 0.3;

      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    }

    // Regular random distribution for earlier phases
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
    };
  };

  // Simplified addRevealCircle to use random positions
  const addRevealCircle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Stop adding reveals if image is mostly revealed
    if (isImageMostlyRevealed()) return;

    const now = Date.now();
    const revealTiming = calculateRevealTiming();
    if (now - lastRevealTime < revealTiming) return;

    const progress = timeElapsed / timePerRound;
    const point = getRevealPoint(canvas, progress);

    // Cap the time factor to prevent circles from getting too small in longer rounds
    const normalizedTime = Math.min(timePerRound, 30); // Cap at 30 seconds for size calculation
    let baseSize = Math.min(canvas.width, canvas.height) / (Math.sqrt(normalizedTime / 0.2) * 1.75);

    // For longer rounds, adjust reveal frequency instead of size
    if (timePerRound > 30) {
      baseSize = baseSize * (1 + Math.log10(timePerRound / 30) * 0.2); // Gradual size increase for longer rounds
    }

    // Make reveals significantly larger in final phase
    if (progress > 0.7) {
      // Increase base size by 20% in final phase
      baseSize = baseSize * 1.2;
      // Use larger multiplier range (80-150% of base size)
      const sizeMultiplier = 0.8 + Math.random() * 0.5;
      // Additional size boost for very central reveals
      const distanceFromCenter = Math.sqrt(
        Math.pow(point.x - canvas.width / 2, 2) + Math.pow(point.y - canvas.height / 2, 2)
      );
      const maxDistance = Math.min(canvas.width, canvas.height) * 0.3; // Same as in getRevealPoint
      const centerBoost = 1 + 0.3 * (1 - distanceFromCenter / maxDistance); // Up to 30% larger for central points
      const size = baseSize * sizeMultiplier * centerBoost;
      setRevealCircles((prev) => [
        ...prev,
        {
          x: point.x,
          y: point.y,
          size,
          shape: "spotlight",
        },
      ]);
    } else {
      // Normal size for earlier phases (60-100% of base size)
      const size = baseSize * (0.6 + Math.random() * 0.4);
      setRevealCircles((prev) => [
        ...prev,
        {
          x: point.x,
          y: point.y,
          size,
          shape: "spotlight",
        },
      ]);
    }
    setLastRevealTime(now);
  };

  // Calculate when the next reveal should happen
  const calculateRevealTiming = () => {
    const totalReveals = calculateTotalReveals(timePerRound);
    const progress = timeElapsed / timePerRound;

    // Calculate coverage percentage
    const coveragePercent = isImageMostlyRevealed()
      ? 100
      : (revealCircles.length / totalReveals) * 100;

    // If we're in the last 30% of time and coverage is below 90%, speed up dramatically
    if (progress > 0.6 && coveragePercent < 90) {
      return 5; // Ultra-fast reveals (50ms) to catch up
    }

    // If we're behind schedule, reveal very quickly
    const expectedReveals = Math.floor(progress * totalReveals);
    if (revealCircles.length < expectedReveals) {
      return 50; // Fast reveals (100ms) to catch up
    }

    // If we're on schedule, space reveals evenly but ensure we finish
    const timePerReveal = (timePerRound * (1 - progress)) / (totalReveals - revealCircles.length);
    return Math.min(timePerReveal * 1000, 500); // Cap at 500ms to maintain momentum
  };

  // Effect to handle periodic reveals - stop when round is over
  useEffect(() => {
    if (!imgLoaded || isRoundOver) return;

    const checkInterval = setInterval(() => {
      if (timePerRound - timeElapsed <= 0) return;
      const timing = calculateRevealTiming();
      const now = Date.now();
      if (now - lastRevealTime >= timing) {
        addRevealCircle();
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [imgLoaded, timeElapsed, timePerRound, isRoundOver]);

  // Effect to redraw the canvas whenever reveals change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imagePath;

    img.onload = () => {
      // Reveal image in the last 5 seconds
      const timeRemaining = timePerRound - timeElapsed;
      if (timeRemaining < 5) {
        // Fully reveal the image in the last 5 seconds
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return;
      }
      drawImageWithReveals(ctx, img, revealCircles);
    };
  }, [revealCircles, imagePath, imgLoaded, timeElapsed, timePerRound]);

  // Effect to handle round over navigation
  // useEffect(() => {
  //   if (isRoundOver && finalScores && finalSocketMap) {
  //     // Fetch the host's socket ID from the server
  //       get("/api/hostSocketId", { roomCode }).then(({ hostSocketId }) => {
  //         console.log("Current socket: ", socket.id);
  //         console.log("Host socket: ", hostSocketId);
  //         const isHost = socket.id === hostSocketId;
  //         console.log("After get request, Is host value:", isHost);
  //         navigate("/leaderboard", { 
  //           state: { 
  //             scores, 
  //             socketToUserMap: finalSocketMap, 
  //             roomCode, 
  //             isHost, 
  //             currentRound,
  //             totalRounds,
  //             imagePath,
  //             totalTime: timePerRound,  // Pass the current round's time to use for next round
  //             gameMode,
  //           } 
  //         });
  //       }).catch((error) => {
  //         console.error("GET request to /api/hostSocketId failed with error:", error);
  //       }); 
      
  //     // const timer = setTimeout(() => {
  //     //   navigate(`/leaderboard`, {
  //     //     state: { scores: finalScores, socketToUserMap: finalSocketMap, currentRound, totalRounds },
  //     //   });
  //     // }, 2000);

  //     // return () => clearTimeout(timer);
  //   }
  // }, [isRoundOver, finalScores, finalSocketMap]);
  // }, [isRoundOver, finalScores, finalSocketMap, navigate]);

  return (
    <div className="h-screen flex flex-col font-space-grotesk">
      <Header backNav="/room-actions" />
      {/* Background layers */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#2a1a3a] to-[#0a0a1b] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-tutorial.png')] bg-cover bg-center bg-no-repeat opacity-70 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.25)_0%,transparent_70%)]" />
      </div>

      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 flex flex-col px-4">
          <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
            {/* Time remaining display */}
            <div className={`text-center pt-24 mb-2 ${isShaking ? "animate-violent-shake" : ""}`}>
              <p
                className={`text-lg ${
                  timePerRound - timeElapsed <= 5 ? "text-red-200" : "text-purple-200"
                } bg-white/5 backdrop-blur-xl inline-block px-4 py-1 rounded-full border border-white/10 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 placeholder-purple-200/50`}
              >
                {isRoundOver ? (
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-lg text-purple-200">
                        Correct Answer:{" "}
                        <span className="font-semibold text-purple-300">
                          {primaryAnswer}
                        </span>
                      </p>
                    </div>
                    {isHost && (
                      <button
                        onClick={handleContinueToLeaderboard}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300 border border-white/10"
                      >
                        Continue to Leaderboard
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    Time Remaining:{" "}
                    <span
                      className={`font-semibold ${
                        timePerRound - timeElapsed <= 5
                          ? "text-red-300 animate-pulse"
                          : "text-purple-300"
                      } transition-colors duration-300`}
                    >
                      {timePerRound - timeElapsed}
                    </span>
                  </>
                )}
              </p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    timePerRound - timeElapsed <= 5
                      ? "bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500"
                  }`}
                  style={{
                    width: `${((timePerRound - timeElapsed) / timePerRound) * 100}%`,
                    boxShadow:
                      timePerRound - timeElapsed <= 5
                        ? "0 0 20px rgba(239, 68, 68, 0.5)"
                        : "0 0 20px rgba(147, 51, 234, 0.5)",
                  }}
                />
              </div>
            </div>

            {/* Canvas container */}
            <div className="relative flex-1 min-h-0 mb-2">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl transform -rotate-1"></div>
              <div className="relative h-full bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-xl canvas-container glow">
                <canvas ref={canvasRef} className="w-full h-full object-contain rounded-xl" />
              </div>
            </div>

            {/* Input section */}
            <div className="mt-auto pb-8">
              {guessedCorrectly ? (
                <div className="bg-white/5 backdrop-blur-2xl rounded-xl p-3 text-center border border-purple-500/20 shadow-lg">
                  <p className="text-lg text-purple-200">
                    Congratulations! You scored{" "}
                    <span
                      className={`font-semibold text-purple-300 ${
                        guessedCorrectly ? "score-animate" : ""
                      }`}
                    >
                      {diff[socket.id] || 0}
                    </span>{" "}
                    points.
                  </p>
                  <p className="text-sm text-gray-300">Waiting for the round to end... </p>
                </div>
              ) : (
                <div
                  className={`bg-white/5 backdrop-blur-2xl rounded-xl p-3 border border-purple-500/20 shadow-lg ${
                    guessedWrong ? "animate-shake" : ""
                  }`}
                >
                  <div className="flex gap-2 items-center justify-center">
                    <input
                      className="flex-1 bg-white/10 text-purple-100 backdrop-blur-xl px-4 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 placeholder-purple-200/50"
                      placeholder="Enter guess..."
                      value={guessText}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSubmitGuess();
                        }
                      }}
                      onChange={(e) => setGuessText(e.target.value)}
                    />
                    <button
                      onClick={handleSubmitGuess}
                      className="glow bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white px-6 py-2 rounded-lg hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300 border border-white/10"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}

              {guessedWrong && (
                <div className="mt-2 bg-red-500/10 backdrop-blur-xl text-red-200 py-2 px-4 rounded-lg border border-red-500/20 text-center animate-shake">
                  Wrong guess! Try again.
                  {hintsEnabled && revealedHint && (
                    <div className="hint-message">
                      Hint so far: <span style={{ fontWeight: "bold" }}>{revealedHint}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomReveal;