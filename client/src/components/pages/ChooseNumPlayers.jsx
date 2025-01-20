import React from "react";
import { useNavigate } from "react-router-dom";

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
      <Header backNav="" />
      <div className="choose_num_players-button-container">
        <Button text="Single-Player" onClick={() => handleGameMode("single")} />
        <Button text="Multi-Player" onClick={() => handleGameMode("multi")} />
      </div>
    </div>
  );
};

export default ChooseNumPlayers;
