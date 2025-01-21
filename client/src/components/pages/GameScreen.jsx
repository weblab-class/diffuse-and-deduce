import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import socket from "../../client-socket";

export default function GameScreen() {
  const canvasRef = useRef(null);
  const location = useLocation();
  const [noiseLevel, setNoiseLevel] = useState(1.0);
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

  useEffect(() => {
    if (!imgLoaded) return;

    // Suppose we want to reduce noise from 1.0 to 0 over exactly timePerRound seconds
    // We still do an interval every 500ms (feel free to pick another interval).
    const totalTicks = (timePerRound * 1000) / 500; // e.g. (30 * 1000)/500 = 60
    let currentTick = 0;

    const interval = setInterval(() => {
      currentTick++;
      if (currentTick >= totalTicks) {
        setNoiseLevel(0); // fully denoised
        clearInterval(interval);
      } else {
        setNoiseLevel(1 - currentTick / totalTicks);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [imgLoaded, timePerRound]);

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
        data[i] += offset; // R
        data[i + 1] += offset; // G
        data[i + 2] += offset; // B
      }
      ctx.putImageData(imageData, 0, 0);
    };
  }, [noiseLevel, imgLoaded, imageSrc]);

  useEffect(() => {
    socket.on("timeUpdate", ({ timeElapsed }) => {
      setTimeElapsed(timeElapsed); // <-- update the local state
      const fraction = timeElapsed / timePerRound;
      setNoiseLevel(Math.max(1 - fraction, 0));
    });

    return () => {
      socket.off("timeUpdate");
    };
  }, [timePerRound]);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <canvas ref={canvasRef} width={600} height={400} style={{ border: "1px solid #ccc" }} />
      <p>Noise Level: {noiseLevel.toFixed(2)}</p>
      <p>Time Elapsed: {timeElapsed}</p>
    </div>
  );
}
