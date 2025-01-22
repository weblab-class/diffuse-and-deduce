import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./GameScreen.css";

export default function GameScreen() {
  const { roomCode } = useParams(); // same image screen for all users in room
  const [scores, setScores] = useState({});
  const [guessText, setGuessText] = useState("");
  const [guessedCorrectly, setGuessedCorrectly] = useState(false);
  const navigate = useNavigate();

  const initialNoise = 10.0;

  const canvasRef = useRef(null);
  const location = useLocation();
  const [noiseLevel, setNoiseLevel] = useState(initialNoise);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const imageSrc = "/game-images/secret_image.jpg";
  const timePerRound = location.state?.timePerRound || 30;

  // 1. Load the base image once
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.src = imageSrc;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImgLoaded(true);
    };
  }, [imageSrc]);

  // 3. Re-apply noise whenever noiseLevel changes
  useEffect(() => {
    if (!imgLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const baseImage = new Image();
    baseImage.src = imageSrc;
    baseImage.onload = () => {
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

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
  }, [noiseLevel, imgLoaded, imageSrc]);

  useEffect(() => {
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

    socket.on("roundStarted", ({ startTime, totalTime }) => {
      console.log("Round started");
      setTimeElapsed(0);
    });

    return () => {
      socket.off("timeUpdate");
      socket.off("scoreUpdate");
    };
  }, [timePerRound, navigate]);

  const handleSubmitGuess = () => {
    socket.emit("submitGuess", { roomCode, guessText });
    setGuessText("");
  };

  // Listen for correct guess event
  useEffect(() => {
    socket.on("correctGuess", ({ playerId }) => {
      if (playerId === socket.id) {
        setGuessedCorrectly(true);
      }
    });

    return () => {
      socket.off("correctGuess");
    };
  }, []);

  return (
    <div className="game_screen-page-container">
      <Header backNav="/room-actions" />
      <div className="game_screen-text-container">
        <p className="game_screen-text">
          Time Remaining: <span style={{ fontWeight: 600 }}>{timePerRound - timeElapsed}</span>
        </p>
        <canvas ref={canvasRef} className="to-deduce" width="800" height="600" />
        {guessedCorrectly ? (
          <>
            <div className="waiting-message">
              <p>Congratulations! Your scored {scores[socket.id] || 0} points.</p>
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
      </div>
      {/* <div className="scores-container">
          <h2>Scores</h2>
          <ul>
            {Object.entries(scores).map(([playerId, score]) => (
              <li key={playerId}>
                Player {playerId}: {score} points
              </li>
            ))}
          </ul>
      </div> */}
    </div>
  );
}
