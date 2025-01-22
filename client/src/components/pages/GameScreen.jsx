import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./GameScreen.css";

export default function GameScreen() {
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
      setTimeElapsed(timeElapsed);
      const fraction = timeElapsed / timePerRound;

      let easedFraction;
      if (fraction < 0.2) {
        easedFraction = 0.2 * Math.pow(fraction / 0.2, 2);
      } else if (fraction < 0.8) {
        // starts slow, accelerates in the middle, decelerates at the end (bell curve)
        const middleFraction = (fraction - 0.2) / 0.6;
        const bellCurve = -4 * Math.pow(middleFraction - 0.5, 2) + 1;
        easedFraction = 0.2 + 0.7 * bellCurve;
      } else {
        const endFraction = (fraction - 0.8) / 0.2;
        easedFraction = 0.9 + 0.1 * Math.pow(endFraction, 3);
      }

      setNoiseLevel(Math.max(initialNoise * (1 - easedFraction), 0));
    });

    return () => {
      socket.off("timeUpdate");
    };
  }, [timePerRound]);

  return (
    <div className="game_screen-page-container">
      <Header backNav="/room-actions" />
      <div className="game_screen-text-container">
        <p className="game_screen-text">
          Time Remaining: <span style={{ fontWeight: 600 }}>{timePerRound - timeElapsed}</span>
        </p>
        <canvas ref={canvasRef} className="to-deduce" />
        <div className="submission-container">
          <input className="enter-guess" placeholder="Enter guess..."></input>
          <Button text="Submit" extraClass="inverted-button" />
        </div>
      </div>
    </div>
  );
}
