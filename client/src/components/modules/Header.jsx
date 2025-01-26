import React, { useContext } from "react";
import { googleLogout } from "@react-oauth/google";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
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
    <motion.div
      className="Header-container"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="Header-subcontainer">
        <motion.div
          className="Header-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {userId ? (
            <div className="user-info">
              <div className="user-avatar">{userName?.charAt(0).toUpperCase()}</div>
              <span>Logged in as {userName}</span>
            </div>
          ) : (
            userName && (
              <div className="user-info">
                <div className="user-avatar">{userName?.charAt(0).toUpperCase()}</div>
                <span>Playing as {userName}</span>
              </div>
            )
          )}
        </motion.div>
        <motion.div
          className="Header-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {(!userId || location.pathname !== "/choose-num-players") && (
            <motion.button
              className="nav-button back-button"
              onClick={handleBack}
              whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(233, 69, 96, 0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              Back
            </motion.button>
          )}
          {userId && (
            <motion.button
              className="nav-button logout-button"
              onClick={() => {
                googleLogout();
                handleLogout();
              }}
              whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(147, 51, 234, 0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              Logout
            </motion.button>
          )}
        </motion.div>
      </nav>
    </motion.div>
  );
};

export default Header;
