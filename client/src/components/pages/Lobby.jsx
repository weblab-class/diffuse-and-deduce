import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./Lobby.css";

const Lobby = () => {
  const { roomCode } = useParams();
  // const isHost = true;

  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // 1. Ask server for the current room data
    socket.emit("getRoomData", { roomCode }, (response) => {
      if (!response.error) {
        setPlayers(response.players);
        if (socket.id === response.hostId) {
          setIsHost(true);
        }
      } else {
        console.error(response.error);
      }
    });

    // 2. Listen for future real-time updates
    socket.on("roomData", ({ players, hostId }) => {
      setPlayers(players);
      setIsHost(socket.id === hostId);
    });

    // Cleanup on unmount
    return () => {
      socket.off("roomData");
    };
  }, [roomCode]);

  return (
    <div className="lobby-page-container">
      <Header backNav="room-actions" />
      <div className="lobby-text-container">
        <h1 className="room-code">
          Room code: <span className="code">{roomCode}</span>
        </h1>
        <hr></hr>
        <h1>Players:</h1>
        <div className="players-box flex gap-4">
          {players.map((player) => (
            <div key={player.id} className="text-[#675325]">
              {player.name}
            </div>
          ))}
        </div>
        {isHost && (
          <>
            <hr></hr>
            <Button
              text="Continue"
              onClick={() => navigate("/game-settings")}
              extraClass="inverted-button"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Lobby;
