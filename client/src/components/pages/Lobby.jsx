import React, { useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import Button from "../modules/Button";
import Header from "../modules/Header";
import useRoom from "../../hooks/useRoom";
import "../../utilities.css";
import "./Lobby.css";

const Lobby = () => {
  const { roomCode } = useParams();
  const { userName } = useContext(UserContext);
  const navigate = useNavigate();

  const { players, isHost, hostId } = useRoom(roomCode, userName);

  const handleContinue = () => {
    navigate(`/game-settings/${roomCode}`, { state: { playerName: userName, gameMode: "multi" } });
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
            console.log(players),
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
          {isHost && (
            <Button text="Continue" onClick={handleContinue} extraClass="inverted-button" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
