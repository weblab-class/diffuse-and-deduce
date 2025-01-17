import React, { useContext } from "react";
import { googleLogout } from "@react-oauth/google";

import "./Header.css";
import { UserContext } from "../App";

const Header = () => {
  const { userId, userName, handleLogout } = useContext(UserContext);
  return (
    <nav className="Header-container">
      <div className="Header-left">
        {userId ? <div>Logged in as {userName}</div> : <div>Playing as {userName}</div>}
      </div>
      <div className="Header-right">
        {userId ? (
          <button
            className="textlike"
            onClick={() => {
              googleLogout();
              handleLogout();
            }}
          >
            Log out
          </button>
        ) : (
          <button
            className="textlike"
            onClick={() => {
              handleLogout();
            }}
          >
            Back
          </button>
        )}
      </div>
    </nav>
  );
};

export default Header;
