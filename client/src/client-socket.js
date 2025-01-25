// // client-socket.js
// import { io } from "socket.io-client";
// import { post } from "./utilities";

// const endpoint = window.location.hostname + ":" + window.location.port;
// const socket = io(endpoint, {
//   reconnection: true,
//   reconnectionAttempts: Infinity, // Never stop trying to reconnect
//   reconnectionDelay: 100, // Start trying to reconnect after 100ms
//   reconnectionDelayMax: 1000, // Maximum delay between reconnection attempts
//   timeout: 20000,
//   autoConnect: true,
//   withCredentials: true,
//   forceNew: false, // Don't create a new connection if one exists
//   // Match server's ping configuration
//   pingTimeout: 60000,
//   pingInterval: 25000,
// });

// let lastSocketId = null; // Track the last known socket ID

// // Track tab visibility
// document.addEventListener("visibilitychange", () => {
//   console.log("Tab visibility changed:", document.visibilityState);
//   console.log("Socket connected?", socket.connected);
//   console.log("Last known socket ID:", lastSocketId);
//   console.log("Current socket ID:", socket.id);

//   // If tab becomes visible and socket is disconnected, try to reconnect
//   if (document.visibilityState === "visible" && !socket.connected) {
//     console.log("Tab visible but socket disconnected, attempting reconnect...");
//     socket.connect();
//   }
// });

// socket.on("connect", () => {
//   const isReconnection = lastSocketId && lastSocketId !== socket.id;
//   console.log(`Socket ${isReconnection ? "re" : ""}connected:`, socket.id);

//   lastSocketId = socket.id;
//   post("/api/initsocket", { socketid: socket.id });
// });

// socket.on("disconnect", (reason) => {
//   console.log("Socket disconnected:", reason);
//   console.log("Tab state when disconnected:", document.visibilityState);
//   console.log("Disconnected socket ID:", lastSocketId);

//   // If disconnected due to tab switching, try to reconnect immediately
//   if (
//     document.visibilityState === "visible" &&
//     (reason === "transport close" || reason === "ping timeout")
//   ) {
//     console.log("Immediate reconnect attempt...");
//     // Small delay to allow cleanup
//     setTimeout(() => socket.connect(), 100);
//   }
// });

// socket.on("reconnect", (attemptNumber) => {
//   console.log("Socket reconnected after", attemptNumber, "attempts");
//   console.log("Tab state when reconnected:", document.visibilityState);
//   console.log("Previous socket ID:", lastSocketId);
//   console.log("New socket ID:", socket.id);
//   post("/api/initsocket", { socketid: socket.id });
// });

// socket.on("reconnect_attempt", (attemptNumber) => {
//   console.log("Reconnection attempt", attemptNumber);
//   console.log("Previous socket ID:", lastSocketId);
// });

// socket.on("reconnect_error", (error) => {
//   console.log("Socket reconnection error:", error);
//   console.log("Tab state during error:", document.visibilityState);
//   console.log("Last known socket ID:", lastSocketId);
// });

// export default socket;

import socketIOClient from "socket.io-client";
import { post } from "./utilities";
const endpoint = window.location.hostname + ":" + window.location.port;
export const socket = socketIOClient(endpoint);
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
  post("/api/initsocket", { socketid: socket.id });
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

export default socket;
