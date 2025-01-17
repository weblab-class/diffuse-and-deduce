import React, { useState, useEffect, createContext } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import jwt_decode from "jwt-decode";

import "../utilities.css";

import { socket } from "../client-socket";

import { get, post } from "../utilities";

export const UserContext = createContext(null);

/**
 * Define the "App" component
 */
const App = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(undefined);
  const [userName, setUserName] = useState(undefined);

  useEffect(() => {
    get("/api/whoami").then((user) => {
      if (user._id) {
        // they are registed in the database, and currently logged in.
        setUserId(user._id);
        setUserName(user.name);
      }
    });
  }, []);

  const handleLogin = (credentialResponse) => {
    const userToken = credentialResponse.credential;
    const decodedCredential = jwt_decode(userToken);
    console.log(`Logged in as ${decodedCredential.name}`);
    post("/api/login", { token: userToken }).then((user) => {
      setUserId(user._id);
      setUserName(user.name);
      post("/api/initsocket", { socketid: socket.id });
    });
    navigate("/choose-num-players");
  };

  const handleGuestLogin = (guestUser) => {
    setUserName(guestUser.name);
  };

  const handleLogout = () => {
    setUserId(undefined);
    setUserName(undefined);
    post("/api/logout");
    navigate("/");
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
