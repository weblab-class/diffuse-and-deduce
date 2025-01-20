import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import Intro from "./components/pages/Intro";
import ChooseNumPlayers from "./components/pages/ChooseNumPlayers";
import RoomActions from "./components/pages/RoomActions";
import Lobby from "./components/pages/Lobby";
import NotFound from "./components/pages/NotFound";
import GameSettings from "./components/pages/GameSettings";
import Game from "./components/pages/Game";

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "199130750908-mjfqj052l47dekm5kdd3j8c5cmk9d5j0.apps.googleusercontent.com";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<NotFound />} element={<App />}>
      <Route path="/" element={<Intro />} />
      <Route path="/choose-num-players" element={<ChooseNumPlayers />} />
      <Route path="/room-actions" element={<RoomActions />} />
      <Route path="/lobby/:roomCode" element={<Lobby />} />
      <Route path="/game-settings/:roomCode" element={<GameSettings />} />
      <Route path="/game/:roomCode" element={<Game />} />
    </Route>
  )
);

// renders React Component "Root" into the DOM element with ID "root"
ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <RouterProvider router={router} />
  </GoogleOAuthProvider>
);
