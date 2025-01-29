import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import socket from "../../client-socket";
import Header from "../modules/Header";
import Notification from "../modules/Notification";
import useRoom from "../../hooks/useRoom";

import "../../utilities.css";
import "./GameScreen.css";

import { get } from "../../utilities";

export default function GameScreen() {
  const { roomCode } = useParams();
  const [scores, setScores] = useState({});
  const [diff, setDiff] = useState({});
  const [guessText, setGuessText] = useState("");
  const [guessedCorrectly, setGuessedCorrectly] = useState(false);
  const [guessedWrong, setGuessedWrong] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const navigate = useNavigate();
  const [reward, setReward] = useState(0);

  const { state } = useLocation();
  const playerName = state?.playerName;
  const currentRound = state?.currentRound || 1;
  const totalRounds = state?.totalRounds || 1;
  const gameMode = state?.gameMode || "single";
  const hintsEnabled = state?.hintsEnabled || false;
  const sabotageEnabled = state?.sabotageEnabled || false;
  const revealMode = state?.revealMode || "diffusion";
  const timePerRound = state?.timePerRound || 30;
  const topic = state?.topic || "Animals";
  const [topicState, setTopic] = useState(topic);
  const [primaryAnswer, setPrimaryAnswer] = useState("");
  // const [hintsEnabled, setHintsEnabled] = useState(location.state?.hintsEnabled ?? false);
  const [revealedHint, setRevealedHint] = useState("");

  const initialNoise = 8.0;
  const canvasRef = useRef(null);
  const [noiseLevel, setNoiseLevel] = useState(initialNoise);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const { players, isHost, hostId, error } = useRoom(roomCode, playerName);

  const [selectedOpponent, setSelectedOpponent] = useState(null); // Currently selected opponent for sabotage
  const [guessDisabled, setGuessDisabled] = useState(false); // Disable guess input during stall sabotage
  const [notifications, setNotifications] = useState([]);
  const [canSabotage, setCanSabotage] = useState(true);
  const price = { stall: 50, addNoise: 50, deduct: 30 };

  // Retrieve server URL from Vite environment variables
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  // Initialize imagePath state with the backend server URL
  const [imagePath, setImagePath] = useState(`${SERVER_URL}/game-images/Animals/lion.jpg`); // default image

  // Validate game state on mount and after reloads
  useEffect(() => {
    // Check if we have valid state from navigation
    if (!state) {
      console.log("No valid game state found, redirecting to home");
      socket.emit("leaveRoom", { roomCode });
      navigate("/");
      return;
    }

    // Handle page reloads and navigation
    const handleBeforeUnload = () => {
      // Clear session storage to prevent persisting game state
      sessionStorage.removeItem("gameState");
      socket.emit("leaveRoom", { roomCode });
      return null;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.emit("leaveRoom", { roomCode });
    };
  }, [roomCode, navigate, state]);

  useEffect(() => {
    get("/api/gameState", { roomCode })
      .then(
        ({
          imagePath: serverImagePath,
          startTime,
          totalTime,
          primaryAnswer: serverPrimaryAnswer,
        }) => {
          console.log("Round started with image:", serverImagePath);
          setTimeElapsed(0);
          setImagePath(`${SERVER_URL}${serverImagePath}`); // Update imagePath with server URL
          setNoiseLevel(initialNoise); // Reset noise
          setImgLoaded(false); // Trigger image loading
          setTopic(serverImagePath.split("/")[2]);
          setPrimaryAnswer(serverPrimaryAnswer);
        }
      )
      .catch((error) => {
        console.error("GET request to /api/gameState failed with error:", error);
      });
  }, []);

  const performSabotage = useCallback(
    (type) => {
      if (!canSabotage) {
        alert("You can perform sabotage actions once every 30 seconds.");
        return;
      }

      if (!selectedOpponent) {
        alert("Please select an opponent to sabotage.");
        return;
      }

      const actingScore = scores[socket.id] || 0;
      if (actingScore < price[type]) {
        alert("Not enough points to perform sabotage.");
        return;
      }

      // Emit sabotage event to the server
      socket.emit("sabotage", {
        roomCode,
        type,
        targetId: selectedOpponent.id,
      });

      // Optimistically update the acting player's score
      setScores((prevScores) => ({
        ...prevScores,
        [socket.id]: prevScores[socket.id] - price[type],
      }));

      setCanSabotage(false);
      setTimeout(() => setCanSabotage(true), 30000);
    },
    [canSabotage, selectedOpponent, scores, roomCode]
  );

  // Handle keypress events for sabotage
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedOpponent) return;

      switch (e.key.toLowerCase()) {
        case "a":
          performSabotage("addNoise");
          break;
        case "s":
          performSabotage("stall");
          break;
        case "d":
          performSabotage("deduct");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedOpponent, performSabotage]);

  // Listen for sabotage effects directed at the current player
  useEffect(() => {
    socket.on("sabotageApplied", ({ type, from }) => {
      let message = "";
      if (type === "addNoise") {
        message = "Another player has added noise to your image!";
        setNoiseLevel((prev) => prev + 10); // Adjust noise increment as needed
      }

      if (type === "stall" && !guessedCorrectly) {
        message = "Another user has stalled your guessing!";
        setGuessDisabled(true);
        setTimeout(() => setGuessDisabled(false), 10000); // Disable guessing for 5 seconds
      }

      if (type === "deduct") {
        message = "Another user has deducted 60 points from your score!";
        setScores((prevScores) => ({
          ...prevScores,
          [socket.id]: (prevScores[socket.id] || 0) - 60,
        }));
      }

      setNotifications((prev) => [...prev, { message, type }]);

      setTimeout(() => {
        setNotifications((prev) => prev.slice(1));
      }, 5000);
    });

    return () => {
      socket.off("sabotageApplied");
    };
  }, [revealMode]);

  // Load the image whenever imagePath changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Enable CORS for the image
    img.crossOrigin = "Anonymous";
    img.src = imagePath;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImgLoaded(true);
      applyNoise(ctx, canvas, initialNoise); // Apply full noise immediately after drawing the image
    };
    img.onerror = (err) => {
      console.error(`Failed to load image at path: ${imagePath}`, err);
      setImgLoaded(false);
      // Optionally, display a placeholder or error message
      ctx.fillStyle = "#CCCCCC";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      ctx.font = "20px Arial";
      ctx.fillText("Image failed to load.", 10, 50);
    };
  }, [imagePath, SERVER_URL]);

  // Re-apply noise whenever noiseLevel changes
  useEffect(() => {
    if (!imgLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const baseImage = new Image();
    baseImage.crossOrigin = "Anonymous";
    baseImage.src = imagePath;
    baseImage.onload = () => {
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      applyNoise(ctx, canvas, noiseLevel); // Apply noise based on current noise level
    };
    baseImage.onerror = (err) => {
      console.error(`Failed to load base image at path: ${imagePath}`, err);
    };
  }, [noiseLevel, imgLoaded, imagePath]);

  useEffect(() => {
    // Handle various socket events
    socket.on(
      "roundStarted",
      ({ startTime, totalTime, imagePath, primaryAnswer: serverPrimaryAnswer }) => {
        console.log("Diffusion: Round started with image:", imagePath);
        setTimeElapsed(0);
        setImagePath(`${SERVER_URL}${imagePath}`);
        setNoiseLevel(initialNoise);
        setImgLoaded(false);
        setPrimaryAnswer(serverPrimaryAnswer);
        setRevealedHint("");
        setGuessedCorrectly(false); // Reset here
        setGuessedWrong(false); // Also reset wrong guesses
      }
    );

    socket.on("timeUpdate", ({ timeElapsed }) => {
      console.log("Received time update:", timeElapsed);
      setTimeElapsed(timeElapsed);
      const fraction = timeElapsed / timePerRound;

      // Add shake effect when time is less than 5 seconds
      const timeRemaining = timePerRound - timeElapsed;
      if (timeRemaining < 5) {
        setIsShaking(true);
        // Remove shake class after animation completes
        setTimeout(() => setIsShaking(false), 2000);
      }

      let easedFraction;
      if (fraction < 0.3) {
        easedFraction = 0.3 * Math.pow(fraction / 0.3, 3);
      } else if (fraction < 0.7) {
        easedFraction = 0.3 + 0.4 * ((fraction - 0.3) / 0.4);
      } else {
        const endFraction = (fraction - 0.7) / 0.3;
        easedFraction = 0.7 + 0.3 * (1 - Math.pow(1 - endFraction, 3));
      }

      setNoiseLevel(Math.max(initialNoise * (1 - easedFraction), 0));
    });

    socket.on("scoreUpdate", ({ scores, diff }) => {
      console.log("Received score update:", scores, diff);
      setDiff(diff);
      setScores(scores);
    });

    socket.on("roundOver", ({ scores, socketToUserMap }) => {
      console.log("Round over!");
      console.log("Mapping:", socketToUserMap);
      console.log("Round info from server:", { currentRound, totalRounds });

      // Fetch the host's socket ID from the server
      get("/api/hostSocketId", { roomCode })
        .then(({ hostSocketId }) => {
          console.log("Current socket: ", socket.id);
          console.log("Host socket: ", hostSocketId);
          const isHost = socket.id === hostSocketId;
          console.log("After get request, Is host value:", isHost);
          navigate("/leaderboard", {
            state: {
              scores,
              socketToUserMap,
              roomCode,
              isHost,
              currentRound,
              totalRounds,
              imagePath,
              totalTime: timePerRound, // Pass the current round's time to use for next round
              gameMode,
              revealMode,
              hintsEnabled,
              sabotageEnabled,
            },
          });
        })
        .catch((error) => {
          console.error("GET request to /api/hostSocketId failed with error:", error);
        });
    });

    return () => {
      socket.off("roundStarted");
      socket.off("timeUpdate");
      socket.off("scoreUpdate");
      socket.off("roundOver");
    };
  }, [timePerRound, navigate, SERVER_URL, initialNoise]);

  useEffect(() => {
    socket.on("guessResult", ({ correct, message, isHost }) => {
      if (isHost) {
        setIsSpectator(true);
        if (message) {
          // You could show this message in a toast or alert if desired
          console.log(message);
        }
        return;
      }

      if (correct) {
        setGuessedCorrectly(true);
        setGuessedWrong(false);
      } else {
        setGuessedWrong(true);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    });

    return () => {
      socket.off("guessResult");
    };
  }, []);

  useEffect(() => {
    // Handle navigation and reload
    const handleUnload = (e) => {
      // Emit leave room event
      socket.emit("leaveRoom", { roomCode });

      // Force redirect
      window.location.href = "/";

      // Prevent the default reload behavior
      e.preventDefault();
      e.returnValue = "";

      // Return a string to show the confirmation dialog in some browsers
      return "Are you sure you want to leave?";
    };

    // Block navigation using the History API
    window.history.pushState(null, null, window.location.pathname);

    const blockNavigation = () => {
      socket.emit("leaveRoom", { roomCode });
      window.location.href = "/";
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("popstate", blockNavigation);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("popstate", blockNavigation);
      socket.emit("leaveRoom", { roomCode });
    };
  }, [roomCode]);

  const handleSubmitGuess = () => {
    socket.emit("submitGuess", { roomCode, guessText });
    setGuessText("");
  };

  const renderGuessInput = () => {
    if (isSpectator) {
      return (
        <div className="text-center p-4 bg-white/5 rounded-lg">
          <p className="text-[#E94560] font-semibold">
            You imported these images - watching in spectator mode
          </p>
        </div>
      );
    }

    return (
      <div className="flex gap-4 items-center">
        <input
          type="text"
          value={guessText}
          onChange={(e) => setGuessText(e.target.value)}
          placeholder="Enter your guess..."
          className={`flex-1 p-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
            isShaking ? "animate-shake" : ""
          }`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !guessedCorrectly) {
              handleSubmitGuess();
            }
          }}
        />
        <button
          onClick={handleSubmitGuess}
          disabled={guessedCorrectly || guessDisabled}
          className="px-6 py-3 bg-[#E94560] text-white rounded-lg hover:bg-[#E94560]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    );
  };

  // Listen for correct guess event
  useEffect(() => {
    socket.on("correctGuess", ({ playerId, score }) => {
      if (playerId === socket.id) {
        setGuessedCorrectly(true);
        setGuessedWrong(false);
        setReward(score);
      }
    });

    return () => {
      socket.off("correctGuess");
    };
  }, []);

  // Add a timeout effect for the wrong guess message
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

  // Modify the socket event listener for wrong guesses
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

  // Add particle effect
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.className = "particle-canvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "-1";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const particles = [];

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Particle class
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.opacity = Math.random() * 0.5;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }

      draw() {
        ctx.fillStyle = `rgba(147, 51, 234, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.body.removeChild(canvas);
    };
  }, []);

  const applyNoise = (ctx, canvas, noiseLevel) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const amplitude = 255 * noiseLevel;
    for (let i = 0; i < data.length; i += 4) {
      const offset = (Math.random() - 0.5) * amplitude;
      data[i] = Math.min(255, Math.max(0, data[i] + offset)); // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset)); // B
    }
    ctx.putImageData(imageData, 0, 0);
  };

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
                } bg-white/5 backdrop-blur-xl inline-block px-4 py-1 rounded-full border border-white/10 glow mb-1 transition-colors duration-300`}
              >
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
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain rounded-xl"
                  width="800"
                  height="600"
                />
              </div>
            </div>

            {sabotageEnabled && (
              <>
                <div className="mt-4 p-4 bg-white/10 backdrop-blur-xl rounded-lg">
                  <h3 className="text-xl font-semibold text-white mb-2">Sabotage Actions</h3>

                  <div className="mb-4">
                    <h4 className="text-lg text-white">Select Opponent:</h4>
                    <ul className="list-disc list-inside">
                      {players
                        .filter((player) => player.id !== socket.id)
                        .map((player) => (
                          <li
                            key={player.id}
                            onClick={() => setSelectedOpponent(player)}
                            className={`cursor-pointer ${
                              selectedOpponent?.id === player.id
                                ? "text-yellow-400"
                                : "text-white/80 hover:text-yellow-300"
                            }`}
                          >
                            {player.name}
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-white/90 mb-2">
                      Press the corresponding key to perform sabotage:
                    </p>
                    <ul className="list-disc list-inside">
                      <li className="text-white/80">A: Add Noise</li>
                      <li className="text-white/80">S: Stall (Disable Guessing)</li>
                      <li className="text-white/80">D: Deduct 60 Points</li>
                    </ul>
                  </div>

                  {selectedOpponent && (
                    <div className="mt-4 p-2 bg-white/20 rounded">
                      <p className="text-white">
                        Selected Opponent: <strong>{selectedOpponent.name}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="fixed top-20 right-4 z-50">
                  {notifications.map((notif, index) => (
                    <Notification key={index} message={notif.message} type={notif.type} />
                  ))}
                </div>
              </>
            )}

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
                      {reward || 0}
                    </span>{" "}
                    points.
                  </p>
                  <p className="text-sm text-gray-300">Waiting for the round to end... </p>
                </div>
              ) : (
                renderGuessInput()
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
}
