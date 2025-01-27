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
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // Function to set up canvas size based on devicePixelRatio
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    // Set the internal canvas size to the display size multiplied by DPR
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the context to account for DPR
    ctx.scale(dpr, dpr);

    // Adjust CSS size to match the window size
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };

  // Load the image and draw it on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas(); // Initial setup

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "/background-images/background-intro.png";

    img.onload = () => {
      // Calculate aspect ratio
      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = img.width / img.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgAspect > canvasAspect) {
        // Image is wider than canvas
        drawHeight = canvas.height;
        drawWidth = imgAspect * drawHeight;
        offsetX = -(drawWidth - canvas.width) / (2 * (window.devicePixelRatio || 1));
        offsetY = 0;
      } else {
        // Image is taller than canvas
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = -(drawHeight - canvas.height) / (2 * (window.devicePixelRatio || 1));
      }

      ctx.drawImage(
        img,
        offsetX,
        offsetY,
        drawWidth / (window.devicePixelRatio || 1),
        drawHeight / (window.devicePixelRatio || 1)
      );
      setImgLoaded(true);
    };

    img.onerror = (err) => {
      console.error("Failed to load background image:", err);
      setImgLoaded(false);
      // Optionally, handle error (e.g., display a placeholder)
    };

    // Handle window resize
    const handleResize = () => {
      setupCanvas();
      if (imgLoaded) {
        // Redraw the image after resizing
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        img.onload(); // Redraw the image with new dimensions
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [imgLoaded]);

  // Check if this is the user's first visit
  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedIntro");
    if (hasVisited) {
      setIsFirstVisit(false);
      setNoiseLevel(0); // skip noise effect for returning visitors
    } else {
      sessionStorage.setItem("hasVisitedIntro", true);
    }
  }, []);

  // Gradually reduce noise over time
  useEffect(() => {
    if (!imgLoaded || !isFirstVisit) return;

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
  }, [imgLoaded, isFirstVisit]);

  // Re-apply noise whenever noiseLevel changes
  useEffect(() => {
    if (!imgLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "/background-images/background-intro.png";

    img.onload = () => {
      // Calculate aspect ratio
      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = img.width / img.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgAspect > canvasAspect) {
        // Image is wider than canvas
        drawHeight = canvas.height;
        drawWidth = imgAspect * drawHeight;
        offsetX = -(drawWidth - canvas.width) / (2 * (window.devicePixelRatio || 1));
        offsetY = 0;
      } else {
        // Image is taller than canvas
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = -(drawHeight - canvas.height) / (2 * (window.devicePixelRatio || 1));
      }

      ctx.drawImage(
        img,
        offsetX,
        offsetY,
        drawWidth / (window.devicePixelRatio || 1),
        drawHeight / (window.devicePixelRatio || 1)
      );

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

    img.onerror = (err) => {
      console.error("Failed to load background image for noise:", err);
    };
  }, [noiseLevel, imgLoaded]);

  // Add static noise effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    const staticPoints = [];
    const pointCount = 20; // More points for static effect

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
        ctx.fillRect(
          point.x / (window.devicePixelRatio || 1),
          point.y / (window.devicePixelRatio || 1),
          point.size,
          point.size
        );

        // Randomly reposition some points
        if (Math.random() < 0.01) {
          point.x = Math.random() * canvas.width;
          point.y = Math.random() * canvas.height;
        }
      });

      requestAnimationFrame(drawStatic);
    };

    drawStatic();
  }, [imgLoaded, isFirstVisit]);

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
