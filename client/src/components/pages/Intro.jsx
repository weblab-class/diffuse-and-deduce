import React, { useContext, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import "../../utilities.css";
import "./Intro.css";
import { UserContext } from "../App";

const Intro = () => {
  const { handleLogin, handleGuestLogin } = useContext(UserContext);

  const navigate = useNavigate();

  const initialNoise = 10.0;
  const canvasRef = useRef(null);
  const [noiseLevel, setNoiseLevel] = useState(initialNoise);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load the image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "/background-images/background-intro.png";

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImgLoaded(true);
    };
  }, []);

  // Gradually reduce noise over time
  useEffect(() => {
    if (!imgLoaded) return;

    const startTime = Date.now();
    const duration = 2000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear progress - no easing
      setNoiseLevel(initialNoise * (1 - progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [imgLoaded]);

  // Re-apply noise whenever noiseLevel changes
  useEffect(() => {
    if (!imgLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const baseImage = new Image();
    baseImage.crossOrigin = "Anonymous";
    baseImage.src = "/background-images/background-intro.png";

    baseImage.onload = () => {
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const amplitude = 255 * noiseLevel;
      for (let i = 0; i < data.length; i += 4) {
        const offset = (Math.random() - 0.5) * amplitude;
        data[i] = Math.min(255, Math.max(0, data[i] + offset));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset));
      }
      ctx.putImageData(imageData, 0, 0);
    };
  }, [noiseLevel, imgLoaded]);

  // Add static noise effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    const staticPoints = [];
    const pointCount = 200; // More points for static effect

    // Create static points
    for (let i = 0; i < pointCount; i++) {
      staticPoints.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5, // Smaller points
        opacity: Math.random() * 0.15, // More subtle
        flickerSpeed: Math.random() * 0.1, // How fast it flickers
      });
    }

    const drawStatic = () => {
      staticPoints.forEach((point) => {
        // Randomly flicker the opacity
        point.opacity += (Math.random() - 0.5) * point.flickerSpeed;
        point.opacity = Math.max(0.05, Math.min(0.15, point.opacity));

        // Draw static point
        ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity})`;
        ctx.fillRect(point.x, point.y, point.size, point.size);

        // Randomly reposition some points
        if (Math.random() < 0.01) {
          point.x = Math.random() * canvas.width;
          point.y = Math.random() * canvas.height;
        }
      });

      requestAnimationFrame(drawStatic);
    };

    drawStatic();
  }, [imgLoaded]);

  const playAsGuest = async () => {
    try {
      const response = await fetch("/api/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to log in as guest");
      }
      const guestUser = await response.json();

      // Use context or state to store guest info if needed
      handleGuestLogin(guestUser);

      // Redirect to the desired page after guest login
      navigate("/choose-num-players");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 right-0 bottom-0 -z-10"
        style={{ width: "100%", height: "100%" }}
      />
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#2a2a3e]/80 via-[#1a1a2e] to-[#2a2a3e]/80 mix-blend-overlay" />
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.45)_0%,transparent_70%)]" />

      {/* Content */}
      <div className="intro-container">
        <div style={{ width: "100%", textAlign: "center" }}>
          <svg
            className="responsive-svg"
            viewBox="0 0 500 125"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path id="arcPath" d="M 0,125 A 500,500 0 0 1 500,125" fill="none" />
            <text className="title-text">
              <textPath xlinkHref="#arcPath" startOffset="50%" textAnchor="middle">
                Diffuse &amp; Deduce
              </textPath>
            </text>
          </svg>
        </div>

        {/* Glass card container */}
        <div
          className="card-frame animate-fade-in spotlight-container"
          style={{ width: "410px", animationDelay: "0.2s" }}
        >
          <div className="glass-card p-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Google login button with custom styling */}
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleLogin}
                  onError={(err) => console.log(err)}
                  useOneTap={false}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="sign_in_with"
                  logo_alignment="center"
                />
              </div>

              {/* Custom styled buttons */}
              <button
                onClick={playAsGuest}
                className="w-full py-3 rounded-xl transition-all duration-500 btn-modern"
              >
                Play as guest
              </button>

              <button
                onClick={() => navigate("/tutorial")}
                className="w-full py-3 rounded-xl transition-all duration-500 btn-modern"
              >
                Tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Intro;
