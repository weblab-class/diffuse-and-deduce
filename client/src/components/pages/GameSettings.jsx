import React, { useEffect } from "react";
import socket from "../../client-socket";
import useRoom from "../../hooks/useRoom";
import Header from "../modules/Header";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const FileUploadModal = ({ isOpen, onClose, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [previews, setPreviews] = React.useState([]);
  const [labels, setLabels] = React.useState([]); // Array of {primary: string, secondary: string}
  const [uploadStatus, setUploadStatus] = React.useState({ loading: false, error: null });
  const [uploadError, setUploadError] = React.useState("");
  const fileInputRef = React.useRef(null);
  const errorTimeoutRef = React.useRef(null);

  // Clear timeout on unmount
  React.useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const showError = (message) => {
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    setUploadError(message);

    // Set new timeout to clear error after 3 seconds
    errorTimeoutRef.current = setTimeout(() => {
      setUploadError("");
    }, 3000);
  };

  const handleFileSelection = (event) => {
    const newFiles = Array.from(event.target.files);
    setUploadError("");

    // Check if adding these new files would exceed the 10 image limit
    if (selectedFiles.length + newFiles.length > 10) {
      showError(
        `Cannot add ${newFiles.length} more images. Maximum 10 images allowed (${selectedFiles.length} already selected)`
      );
      return;
    }

    // Create preview URLs for new files
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    // Initialize empty labels for new files
    const newLabels = newFiles.map(() => ({ primary: "", secondary: "" }));

    // Append new files and previews to existing ones
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    setLabels((prev) => [...prev, ...newLabels]);
  };

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleLabelChange = (index, field, value) => {
    setLabels((prev) => {
      const newLabels = [...prev];
      newLabels[index] = { ...newLabels[index], [field]: value };
      return newLabels;
    });
  };

  const handleUploadImages = async () => {
    if (!selectedFiles.length) {
      showError("Please select images first");
      return;
    }

    // Check if all images have primary labels
    const emptyLabelIndex = labels.findIndex((label) => !label.primary.trim());
    if (emptyLabelIndex !== -1) {
      showError(`Please add a primary label for image ${emptyLabelIndex + 1}`);
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file, index) => {
      formData.append("images", file);
      formData.append("primaryLabels", labels[index].primary);
      formData.append("secondaryLabels", labels[index].secondary || "");
    });

    try {
      setUploadStatus({ loading: true, error: null });
      const response = await fetch("/api/upload-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      onUploadComplete(result.imageIds);
      onClose();
    } catch (error) {
      setUploadStatus({ loading: false, error: error.message });
      showError("Failed to upload images. Please try again.");
    }
  };

  const removeImage = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1A1A2E] text-white p-8 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 font-['Orbitron']">Upload Images</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/20 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <p className="mb-2 text-sm text-white/90">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-white/70">PNG, JPG or GIF (MAX. 5MB each)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileSelection}
              />
            </label>
          </div>

          {uploadError && (
            <div className="text-red-500 text-lg font-semibold p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-center animate-shake">
              {uploadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all group"
              >
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <img
                  src={previews[index]}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-40 object-contain mb-4 rounded"
                />
                <div className="space-y-2">
                  <input
                    type="text"
                    value={labels[index].primary}
                    onChange={(e) => handleLabelChange(index, "primary", e.target.value)}
                    placeholder="Enter primary label (required)"
                    className="w-full p-2 bg-white/10 rounded border border-white/20 focus:border-[#E94560] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={labels[index].secondary}
                    onChange={(e) => handleLabelChange(index, "secondary", e.target.value)}
                    placeholder="Enter secondary label (optional)"
                    className="w-full p-2 bg-white/10 rounded border border-white/20 focus:border-[#E94560] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadImages}
              disabled={uploadStatus.loading}
              className="px-4 py-2 bg-[#E94560] hover:bg-[#E94560]/80 rounded-lg transition-all disabled:opacity-50"
            >
              {uploadStatus.loading ? "Uploading..." : "Upload Images"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GameSettings = () => {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { state } = useLocation();
  const playerName = state?.playerName;

  useRoom(roomCode, playerName);

  useEffect(() => {
    if (!state) {
      navigate("/choose-num-players");
    }
  }, [state, navigate]);

  const gameMode = state?.gameMode;

  useEffect(() => {
    // Log for debugging
    console.log("GameSettings state:", {
      roomCode,
      gameMode,
      locationState: state,
      backNavValue: gameMode === "single" ? "choose-num-players" : "room-actions",
    });
  }, [roomCode, gameMode, state]);

  const [settings, setSettings] = React.useState({
    totalRounds: 1,
    currentRound: 1,
    timePerRound: 30,
    sabotage: false,
    hints: false,
    revealMode: "diffusion",
  });

  const [selectedTopic, setSelectedTopic] = React.useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [uploadedImages, setUploadedImages] = React.useState([]);

  const topics = [
    "Animals",
    "Artworks",
    "Famous_People",
    "Fictional_Faces",
    "Food",
    "Landmarks",
    "Sports",
  ];

  // Add Import Images only for multiplayer
  if (gameMode === "multi") {
    topics.push("Import_Images");
  }

  const displayTopic = (topic) => {
    return topic.replace(/_/g, " ");
  };

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

  const handleTopicClick = (topic) => {
    if (topic === "Import_Images") {
      setIsUploadModalOpen(true);
      // Don't set the topic yet, wait for successful upload
    } else {
      setSelectedTopic(topic);
    }
  };

  const handleModalClose = () => {
    console.log("Modal closing with state:", {
      selectedTopic,
      uploadedImages,
    });
    setIsUploadModalOpen(false);
    // If Import_Images was selected but no images were uploaded, deselect it
    if (selectedTopic === "Import_Images" && uploadedImages.length === 0) {
      setSelectedTopic(null);
    }
  };

  const handleUploadComplete = (imageIds) => {
    console.log("Upload complete with imageIds:", imageIds);
    setUploadedImages(imageIds);
    setSelectedTopic("Import_Images"); // Only set the topic after successful upload
  };

  const handleStartGame = () => {
    if (!selectedTopic) {
      console.log("No topic selected, returning");
      return;
    }

    // Additional validation for Import_Images
    if (selectedTopic === "Import_Images" && uploadedImages.length === 0) {
      console.log("Import Images selected but no images uploaded, returning");
      return;
    }

    const gameData = {
      roomCode,
      totalTime: settings.timePerRound,
      topic: selectedTopic,
      totalRounds: settings.totalRounds,
      currentRound: settings.currentRound,
      revealMode: settings.revealMode,
      hintsEnabled: settings.hints,
      sabotageEnabled: settings.sabotage,
      gameMode,
      uploadedImages: selectedTopic === "Import_Images" ? uploadedImages : null,
    };

    console.log("Emitting startRound with data:", gameData);
    socket.emit("startRound", gameData);
  };

  return (
    <>
      {/* Fixed header - highest layer */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <Header backNav={gameMode === "single" ? "choose-num-players" : `lobby/${roomCode}`} />
      </div>
      {/* Background container - lowest layer */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#0A0A1B] to-[#1A1A2E] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-game_settings.png')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(233,69,96,0.1)_0%,transparent_70%)]" />
      </div>
      {/* Content container - middle layer with scrolling */}
      <div className="relative z-0 min-h-screen font-['Space_Grotesk'] antialiased overflow-auto">
        {/* Flex container to push button to bottom */}
        <div className="min-h-screen flex flex-col">
          {/* Main content - centered vertically and horizontally */}
          <div className="flex-grow pt-20 p-10 flex items-center">
            <div className="w-full flex flex-col lg:flex-row gap-10 justify-center items-stretch">
              {/* Topics Container */}
              <div className="glass-card p-10 rounded-3xl shadow-2xl ring-1 ring-white/20 hover:shadow-[0_0_40px_rgba(233,69,96,0.2)] transition-all duration-500 flex flex-col w-full lg:w-[480px]">
                <h2 className="text-3xl font-bold mb-8 pb-4 border-b border-white/20 text-white tracking-wider uppercase font-['Italiana']">
                  Topics
                  <div className="h-0.5 w-1/2 bg-gradient-to-r from-[#E94560] to-transparent mt-2"></div>
                </h2>
                <ul className="grid grid-cols-1 gap-5 font-['Cormorant'] text-xl">
                  {topics.map((topic, index) => (
                    <motion.li
                      key={topic}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 100,
                      }}
                      whileHover={{
                        scale: 1.03,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        },
                      }}
                      whileTap={{
                        scale: 0.97,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        },
                      }}
                      onClick={() => handleTopicClick(topic)}
                      className={`relative p-4 rounded-xl font-medium cursor-pointer text-center
                        transform transition-all duration-500 ease-out
                        before:absolute before:inset-0 before:rounded-xl before:transition-all before:duration-500
                        before:opacity-0 before:bg-gradient-to-r before:from-[#E94560]/20 before:to-[#0F3460]/20
                        hover:before:opacity-100 hover:shadow-[0_0_30px_rgba(233,69,96,0.3)]
                        ${
                          selectedTopic === topic
                            ? "bg-gradient-to-r from-[#E94560] to-[#0F3460] text-white scale-[1.02] shadow-lg hover:shadow-xl ring-4 ring-[#E94560]/20"
                            : "bg-white/5 text-white/90 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5"
                        }`}
                    >
                      <div className="relative inline-block">
                        {displayTopic(topic)}
                        <motion.svg
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{
                            scale: selectedTopic === topic ? 1 : 0,
                            opacity: selectedTopic === topic ? 1 : 0,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                          }}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 w-5 h-5 text-white/90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </motion.svg>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div className="backdrop-blur-xl bg-white/10 p-10 rounded-3xl shadow-2xl ring-1 ring-white/20 hover:shadow-[0_0_40px_rgba(233,69,96,0.2)] transition-all duration-500 flex flex-col w-full lg:w-[480px]">
                <h2 className="text-3xl font-bold mb-8 pb-4 border-b border-white/20 text-white tracking-wider uppercase font-['Orbitron']">
                  Settings
                  <div className="h-0.5 w-1/2 bg-gradient-to-r from-[#E94560] to-transparent mt-2"></div>
                </h2>
                <div className="flex flex-col gap-10 font-['Rajdhani'] text-lg">
                  {/* Rounds Slider */}
                  <div className="flex items-center justify-between group">
                    <span className="w-32 text-white/90 font-medium text-lg group-hover:text-[#E94560] transition-colors">
                      Rounds:
                    </span>
                    <div className="w-48 flex gap-4 justify-end">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={settings.totalRounds}
                        onChange={(e) =>
                          handleSliderChange("totalRounds", parseInt(e.target.value))
                        }
                        className="w-32 cursor-pointer accent-[#E94560] hover:accent-[#0F3460]"
                      />
                      <span className="w-8 text-right text-white/90">{settings.totalRounds}</span>
                    </div>
                  </div>

                  {/* Time per Round Slider */}
                  <div className="flex items-center justify-between group">
                    <span className="w-32 text-white/90 font-medium text-lg group-hover:text-[#E94560] transition-colors">
                      Time per round:
                    </span>
                    <div className="w-48 flex gap-4 justify-end">
                      <input
                        type="range"
                        min="15"
                        max="60"
                        value={settings.timePerRound}
                        onChange={(e) =>
                          handleSliderChange("timePerRound", parseInt(e.target.value))
                        }
                        className="w-32 cursor-pointer accent-[#E94560] hover:accent-[#0F3460]"
                      />
                      <span className="w-8 text-right text-white/90">{settings.timePerRound}s</span>
                    </div>
                  </div>

                  {/* Sabotage Toggle */}
                  {gameMode === "multi" && (
                    <div className="flex items-center justify-between group">
                      <span className="w-32 text-white/90 font-medium text-lg group-hover:text-[#E94560] transition-colors">
                        Sabotage:
                      </span>
                      <div className="w-48 flex justify-end">
                        <div
                          onClick={() => handleToggle("sabotage")}
                          className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out ${
                            settings.sabotage
                              ? "bg-[#E94560] shadow-inner"
                              : "bg-white/10 hover:bg-white/20"
                          }`}
                        >
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

                  {/* Hints Toggle */}
                  <div className="flex items-center justify-between group">
                    <span className="w-32 text-white/90 font-medium text-lg group-hover:text-[#E94560] transition-colors">
                      Hints:
                    </span>
                    <div className="w-48 flex justify-end">
                      <div
                        onClick={() => handleToggle("hints")}
                        className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out ${
                          settings.hints
                            ? "bg-[#E94560] shadow-inner"
                            : "bg-white/10 hover:bg-white/20"
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
                    <span className="w-48 text-white/90 font-medium text-lg group-hover:text-[#E94560] transition-colors">
                      Reveal Mode:
                    </span>
                    <div className="w-80 flex justify-end">
                      <div className="relative w-[250px] h-10 flex rounded-full overflow-hidden shadow-[0_4px_12px_-1px_rgba(0,0,0,0.15),0_2px_4px_-2px_rgba(0,0,0,0.1)] border border-white/20">
                        {/* diffusion option */}
                        <div
                          onClick={() => handleRevealMode()}
                          className={`flex-1 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                            settings.revealMode === "diffusion"
                              ? "bg-[#E94560] text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                              : "bg-white/10 text-white/90 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5"
                          }`}
                        >
                          <span className="text-sm font-medium">Diffusion</span>
                        </div>
                        {/* random reveal option */}
                        <div
                          onClick={() => handleRevealMode()}
                          className={`flex-1 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                            settings.revealMode === "random"
                              ? "bg-[#E94560] text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                              : "bg-white/10 text-white/90 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5"
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
          <div className="p-10 flex justify-center items-center relative">
            {/* Help Button (Left) */}
            <button
              onClick={() =>
                navigate("/tutorial", {
                  state: {
                    roomCode: roomCode,
                    playerName: playerName,
                    gameMode: gameMode,
                  },
                })
              }
              className="absolute left-8 w-12 h-12 
                       bg-white/10 backdrop-blur-md
                       hover:bg-gradient-to-r hover:from-[#E94560] hover:to-[#0F3460]
                       text-white/90 hover:text-white rounded-xl shadow-lg 
                       hover:shadow-[0_0_20px_rgba(233,69,96,0.3)]
                       ring-1 ring-white/20
                       transition-all duration-300
                       flex items-center justify-center text-2xl font-['Orbitron']"
              aria-label="Help"
            >
              ?
            </button>

            {/* Start Game Button */}
            <button
              onClick={handleStartGame}
              disabled={
                !selectedTopic || (selectedTopic === "Import_Images" && uploadedImages.length === 0)
              }
              className={`px-8 py-3 text-lg font-semibold rounded-xl shadow-lg 
                     font-['Orbitron'] tracking-wider
                     transition-all duration-300 transform
                     ${
                       !selectedTopic ||
                       (selectedTopic === "Import_Images" && uploadedImages.length === 0)
                         ? "bg-white/10 backdrop-blur-md text-white/50 cursor-not-allowed ring-1 ring-white/20"
                         : "bg-gradient-to-r from-[#E94560] to-[#0F3460] text-white hover:shadow-[0_0_30px_rgba(233,69,96,0.3)] hover:scale-105"
                     }`}
            >
              {!selectedTopic || (selectedTopic === "Import_Images" && uploadedImages.length === 0)
                ? "SELECT A TOPIC TO START"
                : "START GAME"}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        <FileUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleModalClose}
          onUploadComplete={handleUploadComplete}
        />
      </AnimatePresence>
    </>
  );
};

export default GameSettings;
