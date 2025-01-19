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
    socket.on("roomData", ({ players, hostId }) => {
      setPlayers(players);
      console.log("Updated players list:", players);
      // console.log("Host ID:", hostId, "Socket ID:", socket.id);
      if (socket.id === hostId) {
        setIsHost(true);
      }
    });

    return () => {
      socket.off("roomData");
    };
  }, []);

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
            <Button text="Start Game" onClick={() => navigate("/game-settings")} />
          </>
        )}
        {/* <Button text="HII"/> */}
        {/* (isHost ? (
          <Button text="Start Game" onClick={() => navigate("/game-settings")} />
        ) : ()) */}
        {/* <Button
          text="Continue"
          extraClass="inverted-button"
          onClick={() => navigate("/game-settings")}
        /> */}
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
