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

  // First useEffect for socket connection
  useEffect(() => {
    socket.emit("joinRoom", { roomCode }, (response) => {
      if (response.error) {
        console.error(response.error);
      } else {
        console.log("Joined room:", roomCode);
      }
    });

    socket.on("gameUpdate", (update) => {
      setGameState(update);
    });

    return () => {
      socket.off("gameUpdate");
    };
  }, []);

  // Second useEffect for timer
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState((prevState) => {
        // checks if time's up
        if (prevState.timeLeft <= 1) {
          clearInterval(timer);
          // TODO: handle round end
          return {
            ...prevState,
            timeLeft: 0,
          };
        }

        return {
          ...prevState,
          timeLeft: prevState.timeLeft - 1,
        };
      });
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(timer);
      socket.emit("leaveRoom", { roomCode });
    };
  }, [roomCode]); // Only re-run if roomCode changes

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
