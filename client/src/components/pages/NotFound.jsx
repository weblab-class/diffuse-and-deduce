import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-white mb-4 animate-pulse">404</h1>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-xl max-w-lg mx-auto">
          <h2 className="text-3xl font-semibold text-purple-300 mb-4">Page Not Found</h2>
          <p className="text-gray-300 mb-8">
            Looks like you've wandered into uncharted territory! The page you're looking for seems
            to have disappeared into thin air.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300 border border-white/10"
          >
            Return Home
          </button>
        </div>
        <div className="mt-8 text-gray-400">Lost in the game? Try starting a new round!</div>
      </div>
    </div>
  );
};

export default NotFound;
