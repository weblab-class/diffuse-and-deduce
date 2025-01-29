import React from "react";

const Notification = ({ message, type }) => {
  const bgColor =
    type === "addNoise"
      ? "bg-yellow-500/20"
      : type === "stall"
      ? "bg-blue-500/20"
      : type === "deduct"
      ? "bg-red-500/20"
      : "bg-gray-500/20";

  return <div className={`p-4 rounded-lg ${bgColor} text-white mb-2`}>{message}</div>;
};

export default Notification;
