"use client";

import HostClient from "@/lib/Client/HostClient";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import { useEffect, useRef } from "react";
import JeopardyBoard from "../Components/JeopardyBoard";
import clsx from "clsx";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import PlayerStatusArea from "./PlayerStatusArea";
import QuestionStatusArea from "./QuestionStatusArea";
import { useStoreWithEqualityFn } from "zustand/traditional";
import deepEqual from "fast-deep-equal";

export default function Host() {
  const hostClient = useRef<HostClient | null>(null);
  // const gameState = useClientGameStore((store) => store.gameState);
  const gameState = useStoreWithEqualityFn(
    useClientGameStore,
    (state) => state.gameState,
    deepEqual
  );
  const getHostClient = () => {
    if (hostClient.current == null) {
      hostClient.current = new HostClient(socket);
    }
    return hostClient.current;
  };
  useEffect(() => {
    function onConnect() {
      getHostClient().OnConnection();
    }
    if (socket.connected) {
      onConnect();
    }
    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, []);
  return (
    <div>
      <div>
        <table className="text-xl table-fixed">
          <thead>
            <tr>
              <th>Question</th>
              <th>Answer</th>
            </tr>
          </thead>
          <tbody>
            <tr
              style={{
                background: ` linear-gradient(
                                to right,
                                red ${
                                  (gameState.currentTurnData.questionTimeLeft /
                                    10) *
                                  100
                                }%,
                                transparent ${
                                  (gameState.currentTurnData.questionTimeLeft /
                                    10) *
                                  100
                                }%
                              )`,
              }}
            >
              <td>
                {gameState.currentTurnData.question?.question ?? "\u00A0"}
              </td>
              <td>{gameState.currentTurnData.question?.answer ?? "\u00A0"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 h-full">
        <div className="overflow-hidden">
          <JeopardyBoard
            gameState={gameState}
            onQuestionClick={(question) => {
              getHostClient().SetCurrentQuestion(question);
            }}
          />
        </div>
        <div>
          <p className="text-xl">
            {`state: ${GameUtil.GetTurnStateNameFromEnum(
              gameState.currentTurnData.turnState
            )}`}
          </p>
          <PlayerStatusArea getHostClient={getHostClient} />
          <button
            onClick={() => {
              getHostClient().OpenBuzzer();
            }}
          >
            Open Buzzer
          </button>
          <button
            className="btn"
            onClick={() => {
              getHostClient().CloseBuzzer();
            }}
          >
            Close Buzzer
          </button>
          <br />
          <button
            className="btn"
            onClick={() => {
              getHostClient().NextQuestion();
            }}
          >
            Next Question
          </button>
          <button
            className="btn"
            onClick={() => {
              getHostClient().ResetCurrentQuestion();
            }}
          >
            Reset Question
          </button>
          <button
            className="btn"
            onClick={() => {
              getHostClient().ResetGame();
            }}
          >
            Reset Game
          </button>
          <QuestionStatusArea getHostClient={getHostClient} />
        </div>
      </div>
    </div>
  );
}
