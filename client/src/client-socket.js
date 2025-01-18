// client-socket.js
import { io } from "socket.io-client";
import { post } from "./utilities";

const endpoint = window.location.hostname + ":" + window.location.port;
const socket = io(endpoint);

socket.on("connect", () => {
  post("/api/initsocket", { socketid: socket.id });
  console.log("Socket connected:", socket.id);
});

export default socket;
