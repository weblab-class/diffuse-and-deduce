import React, { useRef, useEffect, useState } from "react";

import socket from "../../client-socket";

export default function GameScreen() {
  const canvasRef = useRef(null);
  const [noiseLevel, setNoiseLevel] = useState(1.0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const imageSrc = "/game-images/secret_image.jpg";

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

  // 2. Decrease noise over time if image is loaded
  useEffect(() => {
    if (!imgLoaded) return;

    const interval = setInterval(() => {
      setNoiseLevel((prev) => {
        let newLevel = prev - 0.1;
        return newLevel < 0 ? 0 : newLevel;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [imgLoaded]);

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

  // 4. Socket listeners at the top level
  useEffect(() => {
    // Example: If you want to sync time
    socket.on("timeUpdate", ({ timeElapsed }) => {
      setTimeElapsed(timeElapsed);
    });
    socket.on("roundOver", () => {
      // show scoreboard or final
    });

    return () => {
      socket.off("timeUpdate");
      socket.off("roundOver");
    };
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <canvas ref={canvasRef} width={600} height={400} style={{ border: "1px solid #ccc" }} />
      <p>Noise Level: {noiseLevel.toFixed(2)}</p>
      <p>Time Elapsed: {timeElapsed}</p>
    </div>
  );
}
