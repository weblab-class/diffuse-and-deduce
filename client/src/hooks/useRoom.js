import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../client-socket";

const useRoom = (roomCode, playerName) => {
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomCode || !playerName) return;

    socket.emit("joinRoom", { roomCode, playerName }, (response) => {
      if (response.error) {
        console.error("Join room error:", response.error);
        setError(response.error);
      }
    });
  }, [roomCode, playerName]);

  useEffect(() => {
    if (!roomCode) return;

    const handleRoomData = (data) => {
      setPlayers(data.players);
      setIsHost(data.hostId === socket.id);
      setHostId(data.hostId);
    };

    const handleRoundStarted = (data) => {
      const {
        startTime,
        totalTime,
        imagePath,
        primaryAnswer,
        totalRounds,
        currentRound,
        gameMode,
        revealMode,
        hintsEnabled,
        sabotageEnabled,
        importedImages,
      } = data;

      const targetPath =
        revealMode === "random" ? `/random-reveal/${roomCode}` : `/game-screen/${roomCode}`;

      navigate(targetPath, {
        state: {
          playerName,
          startTime,
          timePerRound: totalTime,
          imagePath,
          totalRounds,
          currentRound,
          gameMode,
          revealMode,
          hintsEnabled,
          sabotageEnabled,
          importedImages,
        },
      });
    };

    socket.on("roomData", handleRoomData);
    socket.on("roundStarted", handleRoundStarted);

    return () => {
      socket.off("roomData", handleRoomData);
      socket.off("roundStarted", handleRoundStarted);
    };
  }, [roomCode, navigate, playerName]);

  return {
    players,
    isHost,
    hostId,
    error,
  };
};

export default useRoom;
