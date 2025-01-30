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
  const navigate = useNavigate();
  const [reward, setReward] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  const { state } = useLocation();
  const playerName = state?.playerName;
  const currentRound = state?.currentRound || 1;
  const totalRounds = state?.totalRounds || 1;
  const gameMode = state?.gameMode || "single";
  const hintsEnabled = state?.hintsEnabled || false;
  const revealMode = state?.revealMode || "diffusion";
  const timePerRound = state?.timePerRound || 30;
  const importedImages = state?.importedImages || false;

  const [primaryAnswer, setPrimaryAnswer] = useState("");
  const [revealedHint, setRevealedHint] = useState("");

  const initialNoise = 8.0;
  const canvasRef = useRef(null);
  const [noiseLevel, setNoiseLevel] = useState(initialNoise);
  const [sabotageNoiseLevel, setSabotageNoiseLevel] = useState(0);
  const sabotageNoiseLevelRef = useRef(sabotageNoiseLevel);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showingAnswer, setShowingAnswer] = useState(false);

  const { players, isHost, hostId, error } = useRoom(roomCode, playerName);

  const sabotageEnabled = (state?.sabotageEnabled && !(importedImages && isHost)) || false;

  const sabotagePlayers = players.filter(
    (player) => player.id !== socket.id && !(importedImages && player.id === hostId)
  );

  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [guessDisabled, setGuessDisabled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [canSabotage, setCanSabotage] = useState(true);
  const price = { stall: 50, addNoise: 50, deduct: 30 };

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  const [imagePath, setImagePath] = useState(`${SERVER_URL}/game-images/Animals/lion.jpg`);

  useEffect(() => {
    sabotageNoiseLevelRef.current = sabotageNoiseLevel;
  }, [sabotageNoiseLevel]);

  useEffect(() => {
    if (!state) {
      socket.emit("leaveRoom", { roomCode });
      navigate("/");
      return;
    }

    const handleBeforeUnload = () => {
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
          setTimeElapsed(0);
          setImagePath(`${SERVER_URL}${serverImagePath}`);
          setNoiseLevel(initialNoise);
          setImgLoaded(false);
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
        alert("You can only perform sabotage actions once every 30 seconds.");
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

      socket.emit("sabotage", {
        roomCode,
        type,
        targetId: selectedOpponent.id,
      });

      setScores((prevScores) => ({
        ...prevScores,
        [socket.id]: prevScores[socket.id] - price[type],
      }));

      setCanSabotage(false);
      setTimeout(() => setCanSabotage(true), 30000);
    },
    [canSabotage, selectedOpponent, scores, roomCode]
  );

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

      setSelectedOpponent(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedOpponent, performSabotage]);

  useEffect(() => {
    const handleSabotageApplied = ({ type, from }) => {
      console.log(`Received sabotageApplied: type=${type} from=${from}`);
      let message = "";
      if (type === "addNoise") {
        message = "Another player has added noise to your image!";
        setSabotageNoiseLevel((prev) => {
          console.log(`Previous sabotageNoiseLevel: ${prev}`);
          return prev + 2;
        });
      }

      if (type === "stall" && !guessedCorrectly) {
        message = "Another user has stalled your guessing!";
        setGuessDisabled(true);
        setTimeout(() => setGuessDisabled(false), 5000);
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
    };

    socket.on("sabotageApplied", handleSabotageApplied);

    return () => {
      socket.off("sabotageApplied", handleSabotageApplied);
    };
  }, []);

  useEffect(() => {
    document
      .getElementById("gameBackgroundMusic")
      ?.play()
      .catch(() => {
        document.addEventListener(
          "click",
          () => {
            const audio = document.getElementById("gameBackgroundMusic");
            if (audio) {
              audio.play().then(() => setIsMusicPlaying(true));
            }
          },
          { once: true }
        );
      });

    return () => {
      const audio = document.getElementById("gameBackgroundMusic");
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  const toggleMusic = () => {
    const audio = document.getElementById("gameBackgroundMusic");
    if (audio) {
      if (isMusicPlaying) {
        audio.pause();
        audio.currentTime = 0;
      } else {
        audio.play();
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.crossOrigin = "Anonymous";
    img.src = imagePath;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImgLoaded(true);
      applyNoise(ctx, canvas, initialNoise);
    };
    img.onerror = (err) => {
      console.error(`Failed to load image at path: ${imagePath}`, err);
      setImgLoaded(false);
      ctx.fillStyle = "#CCCCCC";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      ctx.font = "20px Arial";
      ctx.fillText("Image failed to load.", 10, 50);
    };
  }, [imagePath, SERVER_URL]);

  useEffect(() => {
    if (!imgLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const baseImage = new Image();
    baseImage.crossOrigin = "Anonymous";
    baseImage.src = imagePath;
    baseImage.onload = () => {
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      applyNoise(ctx, canvas, noiseLevel);
    };
    baseImage.onerror = (err) => {
      console.error(`Failed to load base image at path: ${imagePath}`, err);
    };
  }, [noiseLevel, imgLoaded, imagePath]);

  useEffect(() => {
    const handleTimeUpdate = ({ timeElapsed }) => {
      setTimeElapsed(timeElapsed);
      const fraction = timeElapsed / timePerRound;

      const timeRemaining = timePerRound - timeElapsed;
      if (timeRemaining < 5) {
        setIsShaking(true);
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

      const newNoiseLevel =
        Math.max(initialNoise * (1 - easedFraction), 0) + sabotageNoiseLevelRef.current;
      setNoiseLevel(newNoiseLevel);
      console.log(
        Math.max(initialNoise * (1 - easedFraction), 0),
        sabotageNoiseLevelRef.current,
        newNoiseLevel
      );
    };

    socket.on("timeUpdate", handleTimeUpdate);

    return () => {
      socket.off("timeUpdate", handleTimeUpdate);
    };
  }, [timePerRound, initialNoise]);

  useEffect(() => {
    socket.on("scoreUpdate", ({ scores, diff }) => {
      setDiff(diff);
      setScores(scores);
    });

    socket.on("roundOver", async ({ scores, socketToUserMap }) => {
      setShowingAnswer(true);

      await new Promise((resolve) => setTimeout(resolve, 5000));
      setShowingAnswer(false);

      get("/api/hostSocketId", { roomCode })
        .then(({ hostSocketId }) => {
          const isHost = socket.id === hostSocketId;
          navigate("/leaderboard", {
            state: {
              scores,
              socketToUserMap,
              roomCode,
              isHost,
              currentRound,
              totalRounds,
              imagePath,
              totalTime: timePerRound,
              gameMode,
              revealMode,
              hintsEnabled,
              sabotageEnabled,
              importedImages,
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
    const handleUnload = () => {
      socket.emit("leaveRoom", { roomCode });

      window.location.href = "/";

      e.preventDefault();
      e.returnValue = "";

      return "Are you sure you want to leave?";
    };

    window.history.pushState(null, null, window.location.pathname);

    const blockNavigation = () => {
      socket.emit("leaveRoom", { roomCode });
      window.location.href = "/";
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("popstate", blockNavigation);

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
    if (importedImages && isHost) {
      return (
        <div className="text-center p-4 bg-white/5 rounded-lg">
          <p className="text-[#E94560] font-semibold">
            You imported these images - watching in spectator mode
          </p>
        </div>
      );
    }

    return (
      <div className="flex gap-4 items-center pt-4">
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
          disabled={guessDisabled}
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

  const renderSabotageOpponents = () => {
    if (!sabotagePlayers.length) {
      return <p className="text-white/60">No opponents available for sabotage.</p>;
    }

    return (
      <ul className="list-disc list-inside">
        {sabotagePlayers.map((player) => (
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
    );
  };

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
        setGuessedWrong(false);
        setTimeout(() => {
          setGuessedWrong(true);
        }, 10);
        if (hintsEnabled && primaryAnswer) {
          setRevealedHint((prev) => {
            const nextIndex = prev.length;
            if (nextIndex < primaryAnswer.length) {
              return primaryAnswer.substring(0, nextIndex + 1);
            }
            return prev;
          });
        }
      }
    });

    return () => {
      socket.off("wrongGuess");
    };
  }, [socket.id, hintsEnabled, primaryAnswer]);

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

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

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

    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }

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
    <div className="h-screen flex flex-row font-space-grotesk">
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
            <div className={`text-center pt-24 mb-4 ${isShaking ? "animate-violent-shake" : ""}`}>
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

            {/* Main game content container */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 flex-wrap mb-8">
              {/* Canvas container */}
              <div
                className={`${
                  sabotageEnabled ? "flex-1 md:flex-[3]" : "flex-1 md:flex-[2.5]"
                } relative order-1`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl transform -rotate-1"></div>
                <div className="relative h-full bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-xl canvas-container glow">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain rounded-xl"
                    width="1600"
                    height="1000"
                  />
                </div>
              </div>

              {/* Input section */}
              <div className="order-2 md:order-3 w-full md:w-full">
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

              {/* Sabotage Panel */}
              {sabotageEnabled && (
                <div className="w-full md:w-56 order-3 md:order-2">
                  <div className="relative h-full">
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl transform rotate-1">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,51,234,0.15)_0%,transparent_60%)]"></div>
                    </div>
                    <div className="relative h-full bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl glow flex flex-col">
                      {/* Decorative corner elements */}
                      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-purple-500/30 rounded-tl-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500/30 rounded-br-2xl"></div>

                      {/* Title with enhanced decoration */}
                      <div className="relative mb-6 text-center">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                        <h3 className="relative inline-block px-6 py-1 bg-[#1a1a2e] text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 tracking-wider transform hover:scale-105 transition-transform duration-300">
                          Sabotage
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
                        </h3>
                      </div>

                      <div className="flex-1 flex flex-col justify-between space-y-6">
                        {/* Select Opponent Section with enhanced styling */}
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                          <div className="relative">
                            <h4 className="text-lg font-medium mb-3 pl-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 flex items-center">
                              <span className="mr-2">⚡</span> Select Opponent
                            </h4>
                            {renderSabotageOpponents()}
                          </div>
                        </div>

                        {/* Available Actions Section with enhanced cards */}
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                          <div className="relative">
                            <h4 className="text-lg font-medium mb-3 pl-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 flex items-center">
                              <span className="mr-2">🎯</span> Available Actions
                            </h4>
                            <div className="space-y-2.5">
                              {[
                                { key: "addNoise", label: "Add Noise", shortcut: "A", icon: "🌫" },
                                { key: "stall", label: "Stall", shortcut: "S", icon: "⏳" },
                                {
                                  key: "deduct",
                                  label: "Deduct Points",
                                  shortcut: "D",
                                  icon: "⬇️",
                                },
                              ].map((action) => (
                                <div
                                  key={action.key}
                                  onClick={() => performSabotage(action.key)}
                                  className="group/action cursor-pointer rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 overflow-hidden hover-scale"
                                >
                                  <div className="p-2.5 relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 group-hover/action:translate-x-full transition-transform duration-1000"></div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-white/80 group-hover/action:text-purple-200 transition-colors duration-300 flex items-center">
                                        <span className="mr-2 text-lg">{action.icon}</span>
                                        {action.label}
                                      </span>
                                      <span className="px-2 py-1 rounded bg-white/10 text-purple-200 text-sm font-medium border border-white/5 group-hover/action:border-purple-500/30 transition-all duration-300">
                                        {action.shortcut}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <audio id="gameBackgroundMusic" loop>
        <source src="/music/rounds.m4a" type="audio/mp4" />
        Your browser does not support the audio element.
      </audio>

      <button
        className="music-control"
        onClick={toggleMusic}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.1)",
          border: "none",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isMusicPlaying ? "🔊" : "🔇"}
      </button>

      {showingAnswer && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[9999] pointer-events-auto" />

          <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-[10000] pointer-events-none">
            <h2 className="text-3xl font-bold text-white mb-4">The answer was:</h2>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
              {primaryAnswer}
            </p>
          </div>
        </>
      )}

      <div className="fixed top-20 right-4 z-50">
        {notifications.map((notif, index) => (
          <Notification key={index} message={notif.message} type={notif.type} />
        ))}
      </div>
    </div>
  );
}
