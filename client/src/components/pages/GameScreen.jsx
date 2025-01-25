// GameScreen.jsx

import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import socket from "../../client-socket";
import Button from "../modules/Button";
import Header from "../modules/Header";
import "../../utilities.css";
import "./GameScreen.css";
import { get } from "../../utilities";

export default function GameScreen() {
  const { roomCode } = useParams();
  const [scores, setScores] = useState({});
  const [guessText, setGuessText] = useState("");
  const [guessedCorrectly, setGuessedCorrectly] = useState(false);
  const [guessedWrong, setGuessedWrong] = useState(false);
  const navigate = useNavigate();

  const initialNoise = 8.0;
  const canvasRef = useRef(null);
  const location = useLocation();
  const [noiseLevel, setNoiseLevel] = useState(initialNoise);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Retrieve server URL from Vite environment variables
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  // Initialize imagePath state with the backend server URL
  const [imagePath, setImagePath] = useState(`${SERVER_URL}/game-images/Animals/lion.jpg`); // default image

  const timePerRound = location.state?.timePerRound || 30;

  // useEffect(() => {
  //   get("/api/gameState", { roomCode }).then(({ imagePath: serverImagePath }) => {
  //     console.log("Round started with image:", serverImagePath);
  //     setTimeElapsed(0);
  //     setImagePath(`${SERVER_URL}${serverImagePath}`); // Update imagePath with server URL
  //     setNoiseLevel(initialNoise); // Reset noise
  //     setImgLoaded(false); // Trigger image loading
  //   });
  // }, []);

  useEffect(() => {
    get("/api/gameState", { roomCode })
      .then(({ imagePath: serverImagePath, startTime, totalTime }) => {
        console.log("Round started with image:", serverImagePath);
        setTimeElapsed(0);
        setImagePath(`${SERVER_URL}${serverImagePath}`); // Update imagePath with server URL
        setNoiseLevel(initialNoise); // Reset noise
        setImgLoaded(false); // Trigger image loading
        // Handle other properties like startTime and totalTime if needed
      })
      .catch((error) => {
        console.error("GET request to /api/gameState failed with error:", error);
      });
  }, []);

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
    socket.on("timeUpdate", ({ timeElapsed }) => {
      console.log("Received time update:", timeElapsed);
      setTimeElapsed(timeElapsed);
      const fraction = timeElapsed / timePerRound;

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

    socket.on("scoreUpdate", ({ scores }) => {
      console.log("Received score update:", scores);
      setScores(scores);
    });

    socket.on("roundOver", ({ scores, socketToUserMap }) => {
      console.log("Round over!");
      console.log("Mapping:", socketToUserMap);
      navigate("/leaderboard", { state: { scores, socketToUserMap, roomCode } });
    });

    return () => {
      socket.off("timeUpdate");
      socket.off("scoreUpdate");
      socket.off("roundStarted");
      socket.off("roundOver");
    };
  }, [timePerRound, navigate, SERVER_URL]);

  const handleSubmitGuess = () => {
    socket.emit("submitGuess", { roomCode, guessText });
    setGuessText("");
  };

  // Listen for correct guess event
  useEffect(() => {
    socket.on("correctGuess", ({ playerId }) => {
      if (playerId === socket.id) {
        setGuessedCorrectly(true);
        setGuessedWrong(false);
      }
    });

    socket.on("wrongGuess", ({ playerId }) => {
      if (playerId === socket.id) {
        setGuessedWrong(true);
      }
    });

    return () => {
      socket.off("correctGuess");
      socket.off("wrongGuess");
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
    <div className="game_screen-page-container">
      <Header backNav="/room-actions" />
      <div className="game_screen-text-container">
        <p className="game_screen-text">
          Time Remaining: <span style={{ fontWeight: 600 }}>{timePerRound - timeElapsed}</span>
        </p>
        {/* Display the dynamic image */}
        <canvas ref={canvasRef} className="to-deduce" width="800" height="600" />
        {guessedCorrectly ? (
          <>
            <div className="waiting-message">
              <p>Congratulations! You scored {scores[socket.id] || 0} points.</p>
              <p>Waiting for the round to end... </p>
            </div>
          </>
        ) : (
          <>
            <div className="submission-container">
              <input
                className="enter-guess"
                placeholder="Enter guess..."
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
              />
              <Button text="Submit" extraClass="inverted-button" onClick={handleSubmitGuess} />
            </div>
          </>
        )}
        {guessedWrong && (
          <div className="w-48 h-10 text-center bg-[#f0f3bd] border-[#675325] border-[1pt] text-[#675325] mt-10">
            Wrong guess! Try again.
          </div>
        )}
      </div>
    </div>
  );
}
