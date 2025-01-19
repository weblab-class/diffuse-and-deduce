import React from "react";
import Header from "../modules/Header";

const Tutorial = () => {
  // console.log("HIII!! YOU'RE IN TUTORIAL!");
  return (
    <>
      <Header backNav="" />{" "}
      {/* Change so no Playing As just back?? Also, navigate Home or Settings?*/}
      <div class="bg-[url('background-images/background-tutorial.png')] min-h-screen flex justify-center items-center scroll-smooth">
        <div class="border-[rgb(103,83,37)] bg-[#FFFCD1] border-2 h-full mx-10 my-10 text-[#675325]">
          <div>
            <p class="font-medium place-self-center text-2xl pt-2 pb-1">Tutorial</p>
          </div>
          <hr class="border-[#675325] border-1 mx-5"></hr>
          <div class="py-2 px-5">
            <p class="font-medium">Objective</p>
            <p class="font-light">Guess the image as quickly as possible to earn more points. </p>
          </div>
          <hr class="border-[#675325] border-1 mx-5 my-1"></hr>
          <div class="py-2 px-5">
            <p class="font-medium">Topics</p>
            <p class="font-light">
              Choose one topic. If importing images, choose at least 10 images and label each image.
            </p>
          </div>
          <hr class="border-[#675325] border-1 mx-5 my-1"></hr>
          <div>
            <p class="font-medium py-1 px-5">Game Settings</p>
            <div class="bg-[#E5E2BC] rounded-md border-[#675325] border-2 mx-10 my-3">
              <p class="font-normal px-4 py-2">Sabotage</p>
              <p class="font-light text-sm px-4">
                Pick any other player to stall, add noise, or deduct.
              </p>
              <div class="flex justify-center">
                <div class="flex flex-col gap-4 mt-2 mb-4">
                  <div class="w-28 h-8 bg-[#675325] text-[#FFFCD1] text-center py-1 self-center">
                    Stall
                  </div>
                  <div class="w-28 h-8 bg-[#675325] text-[#FFFCD1] text-center py-1 self-center">
                    Add Noise
                  </div>
                  <div class="w-28 h-8 bg-[#675325] text-[#FFFCD1] text-center py-1 self-center">
                    Deduct
                  </div>
                </div>
                <div class="flex flex-col gap-1 mb-4 w-44 ml-6">
                  <div class="font-light text-sm mt-1 text-clip">
                    Costs 50 points. Player can’t submit for 5 seconds.
                  </div>
                  <div class="font-light text-sm self-center mt-1 text-clip">
                    Costs 50 points. Player can’t submit for 5 seconds.
                  </div>
                  <div class="font-light text-sm self-center mt-1 text-clip">
                    Costs 30 points. Deducts 60 points from player.
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-[#E5E2BC] rounded-md border-[#675325] border-2 mx-10 my-3">
              <p class="font-normal px-4 py-2">Hints</p>
              <p class="font-light text-sm px-4 mb-4">
                Reveals a few letters of the word representing the image.
              </p>
            </div>
            <div class="bg-[#E5E2BC] rounded-md border-[#675325] border-2 mx-10 my-3">
              <p class="font-normal px-4 py-2">Diffusion</p>
              <p class="font-light text-sm px-4 mb-4">
                An initially noisy image gradually denoises itself. (Inspired by how diffusion
                models work in AI.)
              </p>
            </div>
            <div class="bg-[#E5E2BC] rounded-md border-[#675325] border-2 mx-10 my-3">
              <p class="font-normal px-4 py-2">Random Reveal</p>
              <p class="font-light text-sm px-4 mb-4">Random portions of the image are revealed.</p>
            </div>
          </div>
          <hr class="border-[#675325] border-1 mx-5 my-1"></hr>
          <div class="py-2 px-5 max-w-prose">
            <p class="font-medium">Scoring</p>
            <p class="font-light">
              Score up to 1000 points per round. Guesses after X% of time is done earn (100-X)% of
              1000 points. Penalty of 100 points for every wrong guess.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Tutorial;
