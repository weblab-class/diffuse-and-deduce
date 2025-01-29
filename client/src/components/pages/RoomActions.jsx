// RoomActions.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../client-socket";
import { UserContext } from "../../components/App.jsx";
import Header from "../modules/Header";

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

    // Only check if room exists if we have a complete room code
    if (userInput.length === 5) {
      socket.emit("checkRoomExists", { roomCode: userInput }, (response) => {
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
    } else {
      setIsRoomCodeValid(false);
    }
  }

  const createRoom = () => {
    if (!userName) {
      setError("Please log in first");
      return;
    }
    setIsLoading(true);
    socket.emit("createRoom", { playerName: userName }, (response) => {
      setIsLoading(false);

      if (response.error) {
        console.error("Room creation error:", response.error);
        setError(response.error);
      } else if (!response.roomCode) {
        console.error("Invalid response:", response);
        setError("Failed to create room: Invalid server response");
      } else {
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
        navigate(`/lobby/${roomCode}`);
      }
    });
  };

  const handleMouseMove = (e, element) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty("--mouse-x", `${x}%`);
    element.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <>
      <Header backNav="choose-num-players" />
      {/* Background container - lowest layer */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#0A0A1B] to-[#1A1A2E] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-game_settings.png')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(233,69,96,0.1)_0%,transparent_70%)]" />
      </div>

      {/* Content container */}
      <div className="relative z-0 min-h-screen font-['Space_Grotesk'] antialiased overflow-auto pt-20">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-2xl space-y-8">
            <div className="gallery-container">
              <h1 className="gallery-title">Diffuse & Deduce</h1>

              <div className="gallery-frame">
                {/* Corner accents */}
                <div className="corner-accent corner-accent-tl"></div>
                <div className="corner-accent corner-accent-tr"></div>
                <div className="corner-accent corner-accent-bl"></div>
                <div className="corner-accent corner-accent-br"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Create room */}
                  <div
                    className="card-frame animate-fade-in spotlight-container"
                    style={{ animationDelay: "0.1s" }}
                    onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                  >
                    <div className="glass-card p-8">
                      <h2 className="section-title text-2xl text-white font-light tracking-widest">
                        Create Room
                      </h2>
                      <div className="flex flex-col space-y-4">
                        <div className="h-[52px]"></div>
                        <button
                          onClick={createRoom}
                          disabled={isLoading || !userName}
                          className={`w-full py-3 rounded-xl transition-all duration-500
                          ${
                            !isLoading && userName
                              ? "btn-modern"
                              : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
                          }`}
                        >
                          {isLoading ? "Creating..." : "Begin"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Join room */}
                  <div
                    className="card-frame animate-fade-in spotlight-container"
                    style={{ animationDelay: "0.2s" }}
                    onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                  >
                    <div className="glass-card p-8">
                      <h2 className="section-title text-2xl text-white font-light tracking-widest">
                        Join Room
                      </h2>
                      <div className="flex flex-col space-y-4">
                        <input
                          className={`gallery-input text-base
                            ${isRoomCodeValid ? "border-white/20 bg-white/10" : ""}`}
                          value={roomCode}
                          onChange={handleRoomCodeChange}
                          placeholder="Enter room code"
                          maxLength={5}
                        />
                        <button
                          onClick={joinRoom}
                          disabled={isLoading || !isRoomCodeValid || !userName}
                          className={`w-full py-3 rounded-xl transition-all duration-500
                            ${
                              !isLoading && isRoomCodeValid && userName
                                ? "btn-modern"
                                : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
                            }`}
                        >
                          {isLoading ? "Joining..." : "Join"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="text-white/70 text-center tracking-wider font-light animate-fade-in room-error"
                  style={{ animationDelay: "0.3s" }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomActions;
