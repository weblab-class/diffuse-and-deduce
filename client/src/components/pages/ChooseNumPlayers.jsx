import React from "react";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";
import "./ChooseNumPlayers.css";

const ChooseNumPlayers = () => {
  return (
    <div className="choose_num_players-page-container">
      <div className="choose_num_players-header-container">
        <Header />
      </div>
      <div className="choose_num_players-button-container">
        <Button text="Single-Player" />
        <Button text="Multi-Player" />
      </div>
    </div>
  );
};

export default ChooseNumPlayers;
