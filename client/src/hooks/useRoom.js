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

    console.log("Attempting to join room:", roomCode);

    socket.emit("joinRoom", { roomCode, playerName }, (response) => {
      if (response.error) {
        console.error("Join room error:", response.error);
        setError(response.error);
      } else {
        console.log("Successfully joined room:", roomCode);
      }
    });
  }, [roomCode, playerName]);

  useEffect(() => {
    if (!roomCode) return;

    const handleRoomData = (data) => {
      console.log("Received room data:", data);
      setPlayers(data.players);
      setIsHost(data.hostId === socket.id);
      setHostId(data.hostId);
    };

    const handleRoundStarted = (data) => {
      console.log("Round started with data:", data);
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
      } = data;

      const targetPath =
        revealMode === "random" ? `/random-reveal/${roomCode}` : `/game-screen/${roomCode}`;

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
