import React, { useState, useEffect, createContext } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

import jwt_decode from "jwt-decode";

import "../utilities.css";

import "./index.css";

import socket from "../client-socket";

import { get, post } from "../utilities";

export const UserContext = createContext(null);

/**
 * Define the "App" component
 */
const App = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(undefined);
  const [userName, setUserName] = useState(undefined);
  const { roomCode } = useParams();

  useEffect(() => {
    get("/api/whoami").then((user) => {
      if (user._id) {
        setUserId(user._id);
        setUserName(user.name);
      }
    });
  }, []);

  const handleLogin = (credentialResponse) => {
    const userToken = credentialResponse.credential;
    const decodedCredential = jwt_decode(userToken);
    post("/api/login", { token: userToken }).then((user) => {
      setUserId(user._id);
      setUserName(user.name);
      post("/api/initsocket", { socketid: socket.id });
    });
    navigate("/choose-num-players");
  };

  const handleGuestLogin = (guestUser) => {
    // Makes API call to store guest session
    post("/api/guest-login").then((user) => {
      setUserId(user._id);
      setUserName(user.name);
      post("/api/initsocket", { socketid: socket.id });
    });
    navigate("/choose-num-players");
  };

  const handleLogout = () => {
    setUserId(undefined);
    setUserName(undefined);
    if (roomCode) {
      navigate("/");
      socket.emit("leaveRoom", { roomCode }, (response) => {
        if (response.error) {
          console.error(response.error);
          return;
        }
      });
    } else {
      navigate("/");
    }
    post("/api/logout");
  };

  const authContextValue = {
    userId,
    userName,
    handleLogin,
    handleGuestLogin,
    handleLogout,
  };

  return (
    <UserContext.Provider value={authContextValue}>
      <Outlet />
    </UserContext.Provider>
  );
};

export default App;
