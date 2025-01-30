import React from "react";
import { useLocation } from "react-router-dom";

import Header from "../modules/Header";
import useRoom from "../../hooks/useRoom";

const Tutorial = () => {
  const { state } = useLocation();
  const roomCode = state?.roomCode;
  const playerName = state?.playerName;

  if (roomCode && playerName) {
    useRoom(roomCode, playerName);
  }

  return (
    <div className="min-h-screen font-space-grotesk">
      <Header backNav={state ? `game-settings/${roomCode}` : ""} backState={state} />
      <div className="relative min-h-screen">
        {/* Background layers */}
        <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#2a1a3a] to-[#0a0a1b] overflow-hidden">
          <div className="absolute inset-0 bg-[url('/background-images/background-tutorial.png')] bg-cover bg-center bg-no-repeat opacity-70 mix-blend-soft-light" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.25)_0%,transparent_70%)]" />
        </div>
        {/* Content */}
        <div className="relative pt-16 pb-8 px-4">
          <div className="max-w-3xl mx-auto bg-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl border border-white/10 hover:bg-white/8 transition-all duration-300">
            <h1 className="text-3xl font-semibold text-center mb-8 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Tutorial
            </h1>

            {/* Objective Section */}
            <div className="bg-white/5 backdrop-blur-2xl rounded-xl p-6 mb-6 hover:-translate-y-1 hover:bg-white/10 transition-all duration-300 border border-purple-500/20 shadow-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-2">Objective</h2>
              <p className="text-gray-200">
                Guess the image as quickly as possible to earn more points.{" "}
              </p>
              <p className="text-gray-200 pt-2">
                To submit a guess, enter it in the input field below the image and press the
                "Submit" button OR the "Enter" key on your keyboard.{" "}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent my-8" />

            {/* Topics Section */}
            <div className="bg-white/5 backdrop-blur-2xl rounded-xl p-6 mb-6 hover:-translate-y-1 hover:bg-white/10 transition-all duration-300 border border-purple-500/20 shadow-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-2">Topics</h2>
              <p className="text-gray-200">
                Choose one topic. If importing images, choose at most 10 images and label each
                image.
              </p>
              <p className="text-gray-200 pt-2">
                The player importing images will watch the game as a spectator. That is, they will
                be able to observe denoising and manage rounds, but won't be able to submit guesses,
                sabotage others, or be sabotaged.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent my-8" />

            {/* Game Settings Section */}
            <div className="bg-white/5 backdrop-blur-2xl rounded-xl p-6 mb-6 hover:-translate-y-1 hover:bg-white/10 transition-all duration-300 border border-purple-500/20 shadow-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-4">Game Settings</h2>

              {/* Sabotage */}
              <div className="bg-white/8 backdrop-blur-2xl rounded-lg p-4 mb-4 border border-purple-500/10">
                <h3 className="text-lg font-semibold text-indigo-400 mb-2">Sabotage</h3>
                <p className="text-gray-200 mb-4">
                  Pick an opponent to add noise, stall, or deduct. (Requires at least 2 players in
                  the game). To execute a sabotage action, press the corresponding key on your
                  keyboard.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
                    <div className="bg-gradient-to-r from-purple-600/80 to-indigo-600/80 backdrop-blur-xl text-white px-6 py-2 rounded-lg text-center w-full md:w-40 hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300 border border-white/10">
                      Add Noise (A)
                    </div>
                    <p className="text-gray-200">
                      Costs 50 points. Player's image becomes noisier.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
                    <div className="bg-gradient-to-r from-purple-600/80 to-indigo-600/80 backdrop-blur-xl text-white px-6 py-2 rounded-lg text-center w-full md:w-40 hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300 border border-white/10">
                      Stall (S)
                    </div>
                    <p className="text-gray-200">
                      Costs 50 points. Player can't submit for 5 seconds.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
                    <div className="bg-gradient-to-r from-purple-600/80 to-indigo-600/80 backdrop-blur-xl text-white px-6 py-2 rounded-lg text-center w-full md:w-40 hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300 border border-white/10">
                      Deduct (D)
                    </div>
                    <p className="text-gray-200">
                      Costs 30 points. Deducts 60 points from player's score.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hints */}
              <div className="bg-white/8 backdrop-blur-2xl rounded-lg p-4 mb-4 border border-purple-500/10">
                <h3 className="text-lg font-semibold text-indigo-400 mb-2">Hints</h3>
                <p className="text-gray-200">
                  One letter from the correct guess is revealed each time you guess incorrectly.
                </p>
              </div>

              {/* Diffusion */}
              <div className="bg-white/8 backdrop-blur-2xl rounded-lg p-4 mb-4 border border-purple-500/10">
                <h3 className="text-lg font-semibold text-indigo-400 mb-2">Diffusion</h3>
                <p className="text-gray-200">
                  An initially noisy image gradually denoises itself. (Inspired by how diffusion
                  models work in AI.)
                </p>
              </div>

              {/* Random Reveal */}
              <div className="bg-white/8 backdrop-blur-2xl rounded-lg p-4 border border-purple-500/10">
                <h3 className="text-lg font-semibold text-indigo-400 mb-2">Random Reveal</h3>
                <p className="text-gray-200">Random portions of the image are revealed.</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent my-8" />

            {/* Scoring Section */}
            <div className="bg-white/5 backdrop-blur-2xl rounded-xl p-6 hover:-translate-y-1 hover:bg-white/10 transition-all duration-300 border border-purple-500/20 shadow-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-2">Scoring</h2>
              <p className="text-gray-200">
                Score up to 1000 points per round. Guesses after X% of time has elapsed earn
                (100-X)% of 1000 points. Penalty of 100 points for every wrong guess.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
