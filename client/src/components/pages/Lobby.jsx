import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./Lobby.css";

const Lobby = () => {
  const { roomCode } = useParams();
  const isHost = true;

  const [players, setPlayers] = useState([]);
  // const [settings, setSettings] = useState({ duration: 60, rounds: 5 });

  const navigate = useNavigate();

  useEffect(() => {
    socket.on("roomData", ({ players }) => {
      setPlayers(players);
    });

    // socket.on("settingsUpdated", (newSettings) => {
    //   setSettings(newSettings);
    // });

    // socket.on("gameStarted", ({ settings }) => {
    //   console.log("Game started with settings:", settings);
    // });

    return () => {
      socket.off("roomData");
      // socket.off("settingsUpdated");
      // socket.off("gameStarted");
    };
  }, []);

  //   const updateSettings = () => {
  //     socket.emit("updateSettings", { roomCode, settings });
  //   };

  //   const startGame = () => {
  //     socket.emit("startGame", { roomCode });
  //   };

  const leaveRoom = () => {
    socket.emit("leaveRoom", { roomCode: currentRoomCode }, (response) => {
      if (response.error) {
        console.error(response.error);
      } else {
        console.log("Left the room successfully.");
      }
    });
  };

  return (
    <div className="lobby-page-container">
      <Header backNav="room-actions" />
      <div className="lobby-text-container">
        <h1 className="room-code">Room code: {roomCode}</h1>
        <hr></hr>
        <h1>Players:</h1>
        <div className="players-box"></div>
        <hr></hr>
        <Button text="Continue" extraClass="inverted-button" />
      </div>
    </div>
    //   {/* <h1>Lobby for Room: {roomCode}</h1>
    //   <h2>Players:</h2>
    //   <ul>
    //     {players.map((p) => (
    //       <li key={p.id}>{p.name}</li>
    //     ))}
    //   </ul>

    //   {isHost ? (
    //     <div>
    //       {/* <h3>Game Settings</h3>
    //       <label>
    //         Duration (seconds):
    //         <input
    //           type="number"
    //           value={settings.duration}
    //           onChange={(e) => setSettings({ ...settings, duration: e.target.value })}
    //         />
    //       </label>
    //       <label>
    //         Number of Rounds:
    //         <input
    //           type="number"
    //           value={settings.rounds}
    //           onChange={(e) => setSettings({ ...settings, rounds: e.target.value })}
    //         />
    //       </label>
    //       <button onClick={updateSettings}>Update Settings</button>
    //       <button onClick={startGame}>Start Game</button> */}
    //     </div>
    //   ) : (
    //     <div>
    //       <h3>Waiting for the host to start the game...</h3>
    //       <button onClick={leaveRoom}>Leave Room</button>
    //     </div>
    //   )}
    // </div> */}
  );
};

export default Lobby;
