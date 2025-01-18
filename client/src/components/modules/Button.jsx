import React from "react";

import "./Button.css";

const Button = ({ text, onClick, disabled = false, extraClass = "" }) => {
  return (
    <>
      {disabled ? (
        <button onClick={onClick} className={`button-link ${extraClass}`} disabled>
          {text}
        </button>
      ) : (
        <button onClick={onClick} className={`button-link ${extraClass}`}>
          {text}
        </button>
      )}
    </>
  );
};

export default Button;
