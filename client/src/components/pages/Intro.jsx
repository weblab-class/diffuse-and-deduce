import React, { useContext } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";

import "../../utilities.css";
import "./Intro.css";
import { UserContext } from "../App";

const Intro = () => {
  const { userId, handleLogin, handleLogout } = useContext(UserContext);
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
        {userId ? (
          <button
            onClick={() => {
              googleLogout();
              handleLogout();
            }}
          >
            Logout
          </button>
        ) : (
          <GoogleLogin onSuccess={handleLogin} onError={(err) => console.log(err)} />
        )}
        <button>Play as guest</button>
      </div>
    </div>
  );
};

export default Intro;
