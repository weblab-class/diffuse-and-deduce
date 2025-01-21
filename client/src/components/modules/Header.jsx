import React, { useContext } from "react";
import { googleLogout } from "@react-oauth/google";
import { useNavigate, useLocation } from "react-router-dom";

import "./Header.css";
import { UserContext } from "../App";

const Header = (props) => {
  const { userId, userName, handleLogout } = useContext(UserContext);

  const navigate = useNavigate();
  const location = useLocation();
  console.log(location);

  return (
    <div className="Header-container">
      <nav className="Header-subcontainer">
        <div className="Header-left">
          {userId ? (
            <div>Logged in as {userName}</div>
          ) : (
            userName && <div>Playing as {userName}</div>
          )}
        </div>
        <div className="Header-right">
          {(!userId || location.pathname !== "/choose-num-players") && (
            <button
              className="textlike"
              onClick={() => {
                navigate(`/${props.backNav}`);
              }}
            >
              Back
            </button>
          )}
          {userId && (
            <button
              className="textlike"
              onClick={() => {
                googleLogout();
                handleLogout();
              }}
            >
              Log out
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Header;
