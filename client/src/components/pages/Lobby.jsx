import React, { useContext, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import Button from "../modules/Button";
import Header from "../modules/Header";
import useRoom from "../../hooks/useRoom";
import { motion } from "framer-motion";
import "../../utilities.css";
import "./Lobby.css";

const Lobby = () => {
  const { roomCode } = useParams();
  const { userName } = useContext(UserContext);
  const navigate = useNavigate();
  const { players, isHost, hostId } = useRoom(roomCode, userName);
  const [copied, setCopied] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  useEffect(() => {
    document
      .getElementById("backgroundMusic")
      ?.play()
      .catch(() => {
        document.addEventListener(
          "click",
          () => {
            const audio = document.getElementById("backgroundMusic");
            if (audio) {
              audio.play().then(() => setIsMusicPlaying(true));
            }
          },
          { once: true }
        );
      });

    return () => {
      const audio = document.getElementById("backgroundMusic");
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  const toggleMusic = () => {
    const audio = document.getElementById("backgroundMusic");
    if (audio) {
      if (isMusicPlaying) {
        audio.pause();
        audio.currentTime = 0;
      } else {
        audio.play();
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const handleContinue = () => {
    navigate(`/game-settings/${roomCode}`, { state: { playerName: userName, gameMode: "multi" } });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-page-container">
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a1b] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-lobby.png')] bg-cover bg-center bg-no-repeat opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)]" />
      </div>

      <audio id="backgroundMusic" loop>
        <source src="/music/lobby.m4a" type="audio/mp4" />
        Your browser does not support the audio element.
      </audio>

      <Header backNav="room-actions" />

      <button
        className="music-control"
        onClick={toggleMusic}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.1)",
          border: "none",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isMusicPlaying ? "🔊" : "🔇"}
      </button>

      <motion.div
        className="lobby-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="lobby-header">
          <motion.div
            className="room-code-display"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            onClick={copyRoomCode}
            style={{ cursor: "pointer" }}
          >
            <span>{copied ? "Copied!" : `Room Code: ${roomCode}`}</span>
          </motion.div>
        </div>

        <div className="players-grid">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              className="player-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
              }}
            >
              <div
                className="player-blur-effect"
                style={{
                  filter: `blur(${(index + 1) * 2}px)`,
                }}
              />
              <div className="player-content">
                <div className={`player-avatar ${player.id === hostId ? "host" : ""}`}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-info">
                  <div className="player-name">{player.name}</div>
                  <div className="badge-container">
                    {player.name === userName && <div className="you-badge">You</div>}
                    {player.id === hostId && <div className="host-badge">Host</div>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="lobby-controls">
        <div className="button-container">
          {isHost ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button text="Next: Settings" onClick={handleContinue} extraClass="continue-button" />
            </motion.div>
          ) : (
            <div className="waiting-message">Waiting for host to continue...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
