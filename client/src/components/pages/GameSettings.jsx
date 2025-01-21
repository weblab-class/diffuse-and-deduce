import React from "react";
import socket from "../../client-socket";

import Header from "../modules/Header";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Button from "../modules/Button";

const GameSettings = () => {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { state } = useLocation();
  const gameMode = state?.gameMode || "multi";

  const [settings, setSettings] = React.useState({
    rounds: 1,
    timePerRound: 30,
    sabotage: false,
    hints: false,
    revealMode: "diffusion",
  });

  const [selectedTopic, setSelectedTopic] = React.useState(null);

  const topics = [
    "Animals",
    "Artworks",
    "Famous People",
    "Fictional Faces",
    "Food",
    "Landmarks",
    "Sports",
  ];

  const handleToggle = (key) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: !prevSettings[key],
    }));
  };

  const handleRevealMode = () => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      revealMode: prevSettings.revealMode === "diffusion" ? "random" : "diffusion",
    }));
  };

  const handleSliderChange = (key, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  const handleStartGame = () => {
    // You’ll need the user’s roomCode somehow (maybe pass it from context or props)
    const totalTime = settings.timePerRound;

    // 1. Tell server to start the round
    socket.emit("startRound", { roomCode, totalTime });

    // 2. Then navigate to GameScreen
    // pass timePerRound if needed for local logic (like noise animations)
    navigate("/game-screen", {
      state: { timePerRound: totalTime },
    });
  };

  return (
    <>
      <Header backNav={gameMode === "single" ? "/choose-num-players" : "/room-actions"} />
      {/* Background container */}
      <div className="h-screen bg-[url('/background-images/background-game_settings.png')] bg-cover bg-center bg-no-repeat grid place-items-center p-8 font-sans antialiased">
        <div className="flex gap-12 min-h-fit">
          {/* Topics Container */}
          <div className="bg-[#FFFCD1]/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl ring-1 ring-[#FFFCD1]/30 hover:shadow-2xl transition-all duration-300 flex flex-col w-96">
            <h2 className="text-2xl font-bold mb-6 pb-3 border-b border-gray-400">Topics</h2>
            <ul className="space-y-4">
              {topics.map((topic) => (
                <li
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`relative flex items-center justify-center p-2 rounded-[4px] font-medium transition-all duration-300 cursor-pointer ${
                    selectedTopic === topic
                      ? "bg-emerald-600 text-[#FFFCD1] scale-[1.02] shadow-lg hover:bg-emerald-500 ring-4 ring-emerald-500/20"
                      : "bg-[#675325] text-[#FFFCD1] hover:bg-gray-600 hover:scale-[1.01]"
                  }`}
                >
                  <span className="relative flex items-center gap-2">
                    {topic}
                    {selectedTopic === topic && (
                      <svg
                        className="w-4 h-4 text-emerald-300 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={4}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div class="bg-[#FFFCD1] w-96 h-[520px] mt-8 rounded-[4px] border-[#675325] border-[1.5pt] p-8">
            <h2 class="text-[#675325] text-2xl font-bold pb-4">Settings</h2>
            <hr class="border-[0.5pt] border-[#675325]"></hr>
            <div className="h-[450px] flex flex-col justify-evenly">
              <div className="flex items-center justify-between group">
                <span className="w-48 text-[#675325]-700 font-medium group-hover:text-emerald-700 transition-colors">
                  Rounds:
                </span>
                <div className="flex gap-4 w-64">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.rounds}
                    onChange={(e) => handleSliderChange("rounds", parseInt(e.target.value))}
                    className="w-32 cursor-pointer accent-green-500 hover:accent-green-600"
                  />
                  <span className="w-8 text-right">{settings.rounds}</span>
                </div>
              </div>
              <div className="flex items-center justify-between group">
                <span className="w-48 text-gray-700 font-medium group-hover:text-emerald-700 transition-colors">
                  Time per round:
                </span>
                <div className="flex items-center gap-4 w-64">
                  <input
                    type="range"
                    min="30"
                    max="120"
                    value={settings.timePerRound}
                    onChange={(e) => handleSliderChange("timePerRound", parseInt(e.target.value))}
                    className="w-32 cursor-pointer accent-green-500 hover:accent-green-600"
                  />
                  <span className="w-8 text-right">{settings.timePerRound}s</span>
                </div>
              </div>
              {/* Toggle switch container */}
              {gameMode === "multi" && (
                <div className="flex items-center justify-between group">
                  <span className="w-32 text-gray-700 font-medium group-hover:text-emerald-700 transition-colors">
                    Sabotage:
                  </span>
                  <div className="w-64 flex justify-end">
                    {/* main toggle switch */}
                    <div
                      onClick={() => handleToggle("sabotage")}
                      className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out ${
                        settings.sabotage
                          ? "bg-green-500 shadow-inner"
                          : "bg-gray-200 hover:bg-gray-300"
                      }`}
                    >
                      {/* toggle circle */}
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${
                          settings.sabotage
                            ? "translate-x-7 shadow-lg"
                            : "translate-x-0 shadow-md hover:shadow-lg"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hints toggle */}
              <div className="flex items-center justify-between group">
                <span className="w-32 text-gray-700 font-medium group-hover:text-emerald-700 transition-colors">
                  Hints:
                </span>
                <div className="w-64 flex justify-end">
                  <div
                    onClick={() => handleToggle("hints")}
                    className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out ${
                      settings.hints ? "bg-green-500 shadow-inner" : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${
                        settings.hints
                          ? "translate-x-7 shadow-lg"
                          : "translate-x-0 shadow-md hover:shadow-lg"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Reveal Mode Toggle */}
              <div className="flex items-center justify-between group">
                <span className="w-48 text-gray-700 font-medium group-hover:text-emerald-700 transition-colors">
                  Reveal Mode:
                </span>
                <div className="w-80 flex justify-end">
                  <div className="relative w-[250px] h-10 flex rounded-full overflow-hidden shadow-[0_4px_12px_-1px_rgba(0,0,0,0.15),0_2px_4px_-2px_rgba(0,0,0,0.1)] border border-gray-200">
                    {/* diffusion option */}
                    <div
                      onClick={() => handleRevealMode()}
                      className={`flex-1 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                        settings.revealMode === "diffusion"
                          ? "bg-green-500 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      <span className="text-sm font-medium">Diffusion</span>
                    </div>
                    {/* random reveal option */}
                    <div
                      onClick={() => handleRevealMode()}
                      className={`flex-1 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                        settings.revealMode === "random"
                          ? "bg-green-500 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      <span className="text-sm font-medium">Random Reveal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Buttons Container */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center items-center">
        {/* Help Button (Left) */}
        <button
          onClick={() => navigate("/tutorial")}
          className="absolute left-8 w-12 h-12 bg-emerald-600 hover:bg-emerald-500 
                   text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300
                   flex items-center justify-center text-2xl font-bold"
          aria-label="Help"
        >
          ?
        </button>

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          disabled={!selectedTopic}
          className={`px-8 py-3 text-lg font-semibold rounded-xl shadow-lg 
                   transition-all duration-300 transform
                   ${
                     selectedTopic
                       ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-xl hover:scale-105"
                       : "bg-gray-400 cursor-not-allowed text-gray-300"
                   }`}
        >
          {selectedTopic ? "Start Game" : "Select a Topic to Start"}
        </button>
      </div>
    </>
  );
};

export default GameSettings;
