import React from "react";
import { useNavigate } from "react-router-dom";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./ChooseNumPlayers.css";

const ChooseNumPlayers = () => {
  const navigate = useNavigate();
  return (
    <div className="choose_num_players-page-container">
      <Header backNav="" />
      <div className="choose_num_players-button-container">
        <Button text="Single-Player" />
        <Button text="Multi-Player" onClick={() => navigate("/room-actions")} />
      </div>
    </div>
  );
};

export default ChooseNumPlayers;
