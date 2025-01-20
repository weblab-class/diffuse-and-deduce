import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";
import { UserContext } from "../App";

import "../../utilities.css";
import "./Lobby.css";

const Lobby = () => {
  const { roomCode } = useParams();
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const { userName } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Request initial room data when component mounts
    socket.emit("getRoomData", { roomCode });
    // Join the room
    socket.emit("joinRoom", { roomCode, playerName: userName }, (response) => {
      if (response.error) {
        console.error(response.error);
      }
    });

    // Listen for room data updates
    socket.on("roomData", ({ players, hostId }) => {
      console.log("Received room data:", players, "Host:", hostId);
      // Sort players where host is first
      const sortedPlayers = [...players].sort((a, b) => {
        if (a.id === hostId) return -1;
        if (b.id === hostId) return 1;
        return 0;
      });
      setPlayers(sortedPlayers);
      setHostId(hostId);
    });

    return () => {
      socket.off("roomData");
    };
  }, [roomCode, userName]); // Re-run if roomCode, us changes

  const leaveRoom = () => {
    socket.emit("leaveRoom", { roomCode }, (response) => {
      if (response.error) {
        console.error(response.error);
      } else {
        console.log("Left the room successfully.");
        navigate("/room-actions");
      }
    });
  };

  return (
    <div className="lobby-page-container">
      <Header backNav="room-actions" />
      <div className="lobby-text-container">
        <h1 className="room-code">Room code: {roomCode}</h1>
        <hr />
        <h1>Players:</h1>
        <div className="players-box">
          {players.length === 0 ? (
            <span>Waiting for players to join...</span>
          ) : (
            players.map((player, index) => (
              <span key={player.id}>
                {player.name}
                {player.id === hostId ? " (Host)" : " (Player)"}
                {index < players.length - 1 ? ", " : ""}
              </span>
            ))
          )}
        </div>
        <hr />
        <div className="flex justify-center">
          <Button text="Leave Room" extraClass="inverted-button" onClick={leaveRoom} />
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
