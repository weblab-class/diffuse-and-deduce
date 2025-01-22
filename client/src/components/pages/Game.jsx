import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Header from "../modules/Header";
import { UserContext } from "../App";

import socket from "../../client-socket";

const Game = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Get settings passed from GameSettings
  const { roomCode } = useParams();
  const { userId, userName } = useContext(UserContext);

  const [gameState, setGameState] = useState({
    currentRound: 1,
    timeLeft: state?.settings.timePerRound || 30,
    topic: state?.selectedTopic,
    roomCode: roomCode,
  });

  useEffect(() => {
    socket.emit("joinRoom", { roomCode }, (response) => {
      if (response.error) {
        console.error(response.error);
      } else {
        console.log("Joined room:", roomCode);
      }
    });

    // Listen for time updates from server
    socket.on("timeUpdate", ({ timeElapsed }) => {
      const totalTime = state?.settings.timePerRound || 30;
      setGameState((prev) => ({
        ...prev,
        timeLeft: Math.max(0, totalTime - timeElapsed),
      }));
    });

    socket.on("gameUpdate", (update) => {
      setGameState((prev) => ({
        ...prev,
        ...update,
      }));
    });

    socket.on("roundOver", () => {
      // Handle round over
      console.log("Round over!");
    });

    return () => {
      socket.off("timeUpdate");
      socket.off("gameUpdate");
      socket.off("roundOver");
      socket.emit("leaveRoom", { roomCode });
    };
  }, [roomCode, state?.settings.timePerRound]);

  return (
    <>
      <Header backNav="game-settings" />
      <div className="h-screen bg-gradient-to-br from emerald-50 to emerald-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            {/* Game UI  */}
            <div>Round {gameState.currentRound}</div>
            <div>Time Left: {gameState.timeLeft}s</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Game;
