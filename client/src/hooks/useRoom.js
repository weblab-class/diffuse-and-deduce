import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../client-socket";

const useRoom = (roomCode, playerName) => {
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only join if we haven't joined yet
    if (!roomCode || !playerName || hasJoined) return;

    console.log("Attempting to join room:", roomCode);

    socket.emit("joinRoom", { roomCode, playerName }, (response) => {
      if (response.error) {
        console.error("Join room error:", response.error);
        setError(response.error);
      } else {
        setHasJoined(true); // Mark that we've successfully joined
        console.log("Successfully joined room:", roomCode);
      }
    });
  }, [roomCode, playerName, hasJoined]);

  useEffect(() => {
    if (!roomCode) return; // Don't fetch if no room code

    socket.on("roomData", (data) => {
      console.log("Inside useRoom, Received room data:", data);
      setPlayers(data.players);
      setIsHost(data.hostId === socket.id);
      setHostId(data.hostId);
    });

    socket.on("roundStarted", ({ startTime, totalTime, imagePath: serverImagePath, totalRounds, currentRound, gameMode }) => {
      navigate(`/game-screen/${roomCode}`, {
        state: { startTime, totalTime, imagePath: serverImagePath, totalRounds, currentRound, gameMode },
      });
    });

    return () => {
      console.log("Cleaning up room effect");
      socket.off("roomData");
    };
  }, []);

  return {
    players,
    isHost,
    hostId,
    error,
  };
};

export default useRoom;
