import React, { useContext } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import "../../utilities.css";
import "./Intro.css";
import { UserContext } from "../App";

const Intro = () => {
  const { handleLogin, handleGuestLogin } = useContext(UserContext);

  const navigate = useNavigate();

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
      {/* Background container with gradients */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#2a2a3e]/80 via-[#1a1a2e] to-[#2a2a3e]/80 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-intro.png')] bg-cover bg-center bg-no-repeat opacity-90 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.45)_0%,transparent_70%)]" />
      </div>

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
