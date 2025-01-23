import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Button from "../modules/Button";
import Header from "../modules/Header";
import socket from "../../client-socket";

import "../../utilities.css";
import "./ChooseNumPlayers.css";

const ChooseNumPlayers = () => {
  const navigate = useNavigate();

  const handleGameMode = (mode) => {
    if (mode === "single") {
      // create a single player room
      socket.emit(
        "createRoom",
        { playerName: "Single Player", isSinglePlayer: true },
        (response) => {
          const { roomCode } = response;
          console.log("Single Player Room created with code:", roomCode);
          navigate(`/game-settings/${roomCode}`, {
            state: {
              gameMode: "single",
              isSinglePlayer: true,
            },
          });
        }
      );
    } else {
      navigate("/room-actions");
    }
  };

  return (
    <div className="choose_num_players-page-container">
      {/* Background layers */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#0A0A1B] to-[#1A1A2E] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-choose_num_players.png')] bg-cover bg-center bg-no-repeat opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(233,69,96,0.1)_0%,transparent_70%)]" />
      </div>

      <Header backNav="" />

      <motion.div
        className="choose_num_players-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mode-cards-container">
          <motion.div
            className="mode-card single-player"
            whileHover={{ scale: 1.2, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleGameMode("single")}
          >
            <div className="card-blur-effect" />
            <div className="card-content">
              <div className="mode-icon">👤</div>
              <h2>Single Player</h2>
              <p>Play solo and challenge yourself</p>
            </div>
          </motion.div>

          <motion.div
            className="mode-card multi-player"
            whileHover={{ scale: 1.2, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleGameMode("multi")}
          >
            <div className="card-blur-effect" />
            <div className="card-content">
              <div className="mode-icon">👥</div>
              <h2>Multi Player</h2>
              <p>Join friends and play together</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChooseNumPlayers;
