// RoomActions.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./RoomActions.css";

const RoomActions = () => {
  const [roomCode, setRoomCode] = useState("");
  const [isRoomCodeValid, setIsRoomCodeValid] = useState(false);
  const [playerName, setPlayerName] = useState("");

  const navigate = useNavigate();

  function handleChange(e) {
    const userInput = e.target.value;
    setRoomCode(userInput);

    if (!userInput) {
      setIsRoomCodeValid(false);
      return;
    }

    socket.emit("checkRoomExists", userInput, (doesExist) => {
      setIsRoomCodeValid(doesExist);
    });
  }

  const createRoom = () => {
    socket.emit("createRoom", { playerName }, (response) => {
      const { roomCode } = response;
      console.log("Room created with code:", roomCode);
      navigate(`/lobby/${roomCode}`);
    });
  };

  const joinRoom = () => {
    socket.emit("joinRoom", { roomCode, playerName }, (response) => {
      if (response.error) {
        console.error(response.error);
      } else {
        console.log("Joined room:", roomCode);
        navigate(`/lobby/${roomCode}`);
      }
    });
  };

  return (
    <div className="room_actions-page-container">
      <Header backNav="choose-num-players" />
      <div className="room_actions-button-container">
        <div className="create-container">
          <Button text="Create Room" onClick={createRoom} />
        </div>
        <div className="join-container">
          <Button text="Join Room" onClick={joinRoom} disabled={!isRoomCodeValid} />
          <input
            className="enter-room-code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code..."
          />
        </div>
      </div>
    </div>
  );
};

export default RoomActions;
