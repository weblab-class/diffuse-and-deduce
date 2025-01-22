import { useState, useEffect } from "react";
import socket from "../client-socket";

const useRoom = (roomCode, playerName) => {
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false); // Track if we've already joined

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

    // Listen for updates
    socket.on("roomData", ({ players, hostId }) => {
      console.log("Received room data:", { players, hostId });
      setPlayers(players);
      setIsHost(socket.id === hostId);
      setHostId(hostId);
    });

    return () => {
      console.log("Cleaning up room effect");
      socket.off("roomData");
    };
  }, [roomCode, playerName]);

  return {
    players,
    isHost,
    hostId,
    error,
  };
};

export default useRoom;
