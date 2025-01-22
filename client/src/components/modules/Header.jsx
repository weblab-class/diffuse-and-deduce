import React, { useContext } from "react";
import { googleLogout } from "@react-oauth/google";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import socket from "../../client-socket";

import "./Header.css";
import { UserContext } from "../App";

const Header = (props) => {
  const { userId, userName, handleLogout } = useContext(UserContext);

  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();

  const handleBack = () => {
    console.log("Navigation Debug:", {
      currentPath: location.pathname,
      roomCode: roomCode,
      backNav: props.backNav,
      gameMode: location.state?.gameMode,
      fullLocation: location,
    });

    // If we're in a room-based page (lobby or game settings), clean up
    if (roomCode) {
      console.log("Leaving room before navigation");
      navigate(`/${props.backNav}`);
      socket.emit("leaveRoom", { roomCode }, (response) => {
        if (response.error) {
          console.error(response.error);
          return;
        }
        console.log("Successfully left room, navigating to:", props.backNav);
      });
    } else {
      console.log("Direct navigation to:", props.backNav);
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
            <button className="textlike" onClick={handleBack}>
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
              Logout
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Header;
