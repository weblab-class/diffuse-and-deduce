import React, { useContext } from "react";
import { googleLogout } from "@react-oauth/google";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import "./Header.css";
import { UserContext } from "../App";

const Header = (props) => {
  const { userId, userName, handleLogout } = useContext(UserContext);

  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();

  const handleBack = () => {
    // If we're in game and going back to game-settings
    if (location.pathname.startsWith("/game/") && props.backNav === "game-settings") {
      navigate(`/game-settings/${roomCode}`);
    }
    // If we're in game-settings and going back to lobby
    else if (location.pathname.startsWith("/game-settings/") && props.backNav === "lobby") {
      navigate(`/lobby/${roomCode}`);
    }
    // Default case
    else {
      navigate(`/${props.backNav}`);
    }
  };

  return (
    <div className="Header-container">
      <nav className="Header-subcontainer">
        <div className="Header-left">
          {userId ? (
            <div>Logged in as {userName}</div>
          ) : (
            userName && <div>Playing as {userName}</div>
          )}
        </div>
        <div className="Header-right">
          {(!userId || location.pathname !== "/choose-num-players") && (
            <button
              className="textlike"
              onClick={() => {
                navigate(`/${props.backNav}`);
                if (props.backNav === "") {
                  handleLogout();
                }
              }}
            >
              Back
            </button>
          )}
          {userId && (
            <button
              className="textlike"
              onClick={() => {
                googleLogout();
                handleLogout();
              }}
            >
              Log out
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Header;
