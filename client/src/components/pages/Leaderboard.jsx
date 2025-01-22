import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import socket from "../../client-socket";

import Button from "../modules/Button";
import Header from "../modules/Header";

import "../../utilities.css";

const Leaderboard = () => {
    const { state } = useLocation();
    const scores = state?.scores || {};
    const socketToUserMap = state?.socketToUserMap || {};

    return (
        <div className="leaderboard-page-container">
            {/* <Header backNav="" />   */}
            <div className="h-screen bg-[url('/background-images/background-leaderboard.png')] bg-cover bg-center flex justify-center items-center">
                <div className="w-96 h-[60%] bg-[#FFFCD1] rounded-lg text-[#675325]">
                    <p className="font-medium place-self-center text-2xl pt-3 pb-1">Leaderboard</p>
                    <hr class="border-[#675325] border-[0.5pt] mx-5"></hr>
                    <div className="space-y-2 font-normal text-xl mt-4 mx-2">
                        {Object.entries(scores).map(([playerId, score]) => (
                        <div key={playerId} className="flex justify-between px-5">
                            <span>{socketToUserMap[playerId]?.name}</span>
                            <span className="font-medium">{score} points</span>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;