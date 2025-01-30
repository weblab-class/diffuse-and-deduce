import React from "react";

const Notification = ({ message, type }) => {
  const isSender = message.startsWith("You have");
  const baseStyle = "p-4 rounded-lg backdrop-blur-xl border mb-2 shadow-lg";

  // Sender gets a success/action color (teal)
  if (isSender) {
    return (
      <div className={`${baseStyle} bg-emerald-500/20 border-emerald-500/30 text-emerald-300`}>
        {message}
      </div>
    );
  }

  // Receiver always gets red to indicate they're being targeted
  return (
    <div className={`${baseStyle} bg-red-500/20 border-red-500/30 text-red-200`}>{message}</div>
  );
};

export default Notification;
