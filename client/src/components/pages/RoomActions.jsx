// RoomActions.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../client-socket";
import Button from "../modules/Button";
import Header from "../modules/Header";
import { UserContext } from "../../components/App.jsx";

import "../../utilities.css";
import "./RoomActions.css";

const RoomActions = () => {
  const [roomCode, setRoomCode] = useState("");
  const [isRoomCodeValid, setIsRoomCodeValid] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { userName } = useContext(UserContext);
  const navigate = useNavigate();

  function handleRoomCodeChange(e) {
    const userInput = e.target.value.toUpperCase();
    setRoomCode(userInput);
    setError("");

    if (!userInput) {
      setIsRoomCodeValid(false);
      return;
    }

    socket.emit("checkRoomExists", userInput, (response) => {
      if (response.error) {
        setError(response.error);
        setIsRoomCodeValid(false);
      } else {
        setIsRoomCodeValid(response.exists);
        if (!response.exists) {
          setError("Room not found");
        } else {
          setError(""); // Clear error if room exists
        }
      }
    });
  }

  const createRoom = () => {
    if (!userName) {
      setError("Please log in first");
      return;
    }

    console.log("Creating room with userName:", userName);
    setIsLoading(true);
    socket.emit("createRoom", { playerName: userName }, (response) => {
      setIsLoading(false);
      console.log("Create room response:", response); // Debug log

      if (response.error) {
        console.error("Room creation error:", response.error);
        setError(response.error);
      } else if (!response.roomCode) {
        console.error("Invalid response:", response);
        setError("Failed to create room: Invalid server response");
      } else {
        console.log("Room created with code:", response.roomCode);
        setError(""); // Clear any existing errors
        navigate(`/lobby/${response.roomCode}`);
      }
    });
  };

  const joinRoom = () => {
    if (!userName) {
      setError("Please log in first");
      return;
    }

    if (!roomCode) {
      setError("Please enter a room code");
      return;
    }

    setIsLoading(true);
    socket.emit("joinRoom", { roomCode, playerName: userName }, (response) => {
      setIsLoading(false);
      if (response.error) {
        setError(response.error);
      } else {
        console.log("Joined room:", roomCode);
        navigate(`/lobby/${roomCode}`);
      }
    });
  };

  const handleChange = (e) => {
    setRoomCode(e.target.value);
  };

  return (
    <div className="room_actions-page-container">
      <Header backNav="choose-num-players" />
      <div className="room_actions-button-container">
        {/* Create room */}
        <div className="create-container">
          <Button
            text={isLoading ? "Creating..." : "Create Room"}
            onClick={createRoom}
            disabled={isLoading || !userName}
          />
        </div>

        {/* Join room */}
        <div className="join-container flex justify-between">
          <Button
            text={isLoading ? "Joining..." : "Join Room"}
            onClick={joinRoom}
            disabled={isLoading || !isRoomCodeValid || !userName}
          />
          <input
            className={`enter-room-code px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
              isRoomCodeValid
                ? "border-green-500 focus:ring-green-500"
                : "border-gray-300 focus:ring-emerald-500"
            }`}
            value={roomCode}
            onChange={handleRoomCodeChange}
            placeholder="Enter room code..."
            maxLength={5}
          />
        </div>

        {/* Error Message */}
        {error && <div className="error-message text-red-500 mt-4 text-center">{error}</div>}

        {/* Not Logged In Message */}
        {!userName && (
          <div className="text-gray-600 mt-4 text-center">
            Please log in or continue as guest to create/join rooms
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomActions;
