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
  const imgRef = useRef(new Image());

  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window !== "undefined") {
      const hasVisited = sessionStorage.getItem("hasVisitedIntro");
      if (!hasVisited) {
        sessionStorage.setItem("hasVisitedIntro", "true");
        return true;
      }
    }
    return false;
  });

  const [noiseLevel, setNoiseLevel] = useState(() => (isFirstVisit ? initialNoise : 0));

  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    img.crossOrigin = "Anonymous";
    img.src = "/background-images/background-intro.png";

    img.onload = () => {
      setImgLoaded(true);
      resizeCanvas();
    };

    img.onerror = () => {
      console.error("Failed to load background image.");
    };
  }, []);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const aspectRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (aspectRatio > canvasRatio) {
      drawWidth = canvas.height * aspectRatio;
      drawHeight = canvas.height;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = canvas.width;
      drawHeight = canvas.width / aspectRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    if (noiseLevel > 0) {
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
    }
  };

  useEffect(() => {
    if (!imgLoaded) return;

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [imgLoaded, noiseLevel]);

  useEffect(() => {
    if (!imgLoaded || !isFirstVisit) return;

    const startTime = Date.now();
    const duration = 2000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setNoiseLevel(initialNoise * (1 - progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsFirstVisit(false);
      }
    };

    requestAnimationFrame(animate);
  }, [imgLoaded, isFirstVisit]);

  useEffect(() => {
    if (!isFirstVisit) {
      setNoiseLevel(0);
    }
  }, [isFirstVisit]);

  useEffect(() => {
    if (!imgLoaded) return;
    resizeCanvas();
  }, [noiseLevel, imgLoaded]);

  useEffect(() => {
    if (!imgLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const staticPoints = [];
    const pointCount = 20;

    for (let i = 0; i < pointCount; i++) {
      staticPoints.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        opacity: Math.random() * 0.15,
        flickerSpeed: Math.random() * 0.1,
      });
    }

    const drawStatic = () => {
      staticPoints.forEach((point) => {
        point.opacity += (Math.random() - 0.5) * point.flickerSpeed;
        point.opacity = Math.max(0.05, Math.min(0.15, point.opacity));

        ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity})`;
        ctx.fillRect(point.x, point.y, point.size, point.size);

        if (Math.random() < 0.02) {
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

      handleGuestLogin(guestUser);

      navigate("/choose-num-players");
    } catch (err) {
      console.error(err);
    }
  };

  const canvasStyle = imgLoaded ? { width: "100%", height: "100%" } : { display: "none" };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 right-0 bottom-0 -z-10"
        style={canvasStyle}
      />

      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#2a2a3e]/80 via-[#1a1a2e] to-[#2a2a3e]/80 mix-blend-overlay" />
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.45)_0%,transparent_70%)]" />

      <div className="intro-container">
        <div style={{ width: "100%", textAlign: "center" }}>
          <svg
            className="responsive-svg"
            viewBox="0 0 520 145"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path id="arcPath" d="M 0,145 A 520,520 0 0 1 520,145" fill="none" />
            <text className="title-text">
              <textPath xlinkHref="#arcPath" startOffset="50%" textAnchor="middle">
                Diffuse &amp; Deduce
              </textPath>
            </text>
          </svg>
        </div>

        <div
          className="card-frame animate-fade-in spotlight-container"
          style={{ width: "410px", animationDelay: "0.2s" }}
        >
          <div className="glass-card p-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
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
