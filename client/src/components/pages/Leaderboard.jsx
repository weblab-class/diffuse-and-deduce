import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";

const Leaderboard = () => {
  const { state } = useLocation();
  const scores = state?.scores || {};
  const socketToUserMap = state?.socketToUserMap || {};

  return (
    <div className="min-h-screen relative">
      {/* Background layers */}
      <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a1b] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/background-images/background-leaderboard.png')] bg-cover bg-center bg-no-repeat opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen flex justify-center items-center">
        <div className="w-[28rem] backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header with glow effect */}
          <div className="relative py-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20" />
            <h1 className="relative text-3xl font-semibold text-white/90 tracking-wide">
              Leaderboard
            </h1>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(147,51,234,0.2)_0%,transparent_60%)]" />
          </div>

          {/* Divider with glow */}
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

          {/* Scores list with hover effects */}
          <div className="p-6 space-y-3">
            {Object.entries(socketToUserMap)
              .sort(([id1], [id2]) => (scores[id2] || 0) - (scores[id1] || 0))
              .map(([playerId, player], index) => (
                <div
                  key={playerId}
                  className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-purple-500/30 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex items-center space-x-4">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-white/90 font-medium">
                      {index + 1}
                    </span>
                    <span className="text-lg text-white/90 font-medium">{player.name}</span>
                  </div>
                  <div className="px-4 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-md border border-white/10 group-hover:border-purple-500/30 transition-all duration-300">
                    <span className="text-white/90 font-semibold">{scores[playerId] || 0}</span>
                    <span className="text-white/70 ml-1">pts</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
