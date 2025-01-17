import React, { useContext } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import Button from "../modules/Button";

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

  const goToTutorial = () => {
    navigate("/tutorial");
  };

  return (
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
      <div className="button-container">
        <GoogleLogin onSuccess={handleLogin} onError={(err) => console.log(err)} />
        <Button text="Play as guest" onClick={playAsGuest} />
        <Button text="Tutorial" onClick={goToTutorial} />
      </div>
    </div>
  );
};

export default Intro;
