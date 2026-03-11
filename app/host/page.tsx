"use client";

import HostClient from "@/lib/Client/HostClient";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import { useEffect, useRef } from "react";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import PlayerStatusArea from "./PlayerStatusArea";
import QuestionStatusArea from "./QuestionStatusArea";
import { useStoreWithEqualityFn } from "zustand/traditional";
import deepEqual from "fast-deep-equal";
import { TurnState } from "@/lib/JeopardyGame/IGameTurn";
import GoogleSheetForm from "./GoogleSheetForm";
import JeopardyBoard from "../Components/JeopardyBoard";

export default function Host() {
  const hostClient = useRef<HostClient | null>(null);
  const gameState = useStoreWithEqualityFn(
    useClientGameStore,
    (state) => state.gameState,
    deepEqual
  );

  const turnPhase = GameUtil.GetTurnPhase(gameState);
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // modern, works even if Shift is held
        e.preventDefault(); // prevents page scroll
        console.log("Space bar pressed!");
        getHostClient().OpenBuzzer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      socket.off("connect", onConnect);
      window.removeEventListener("keydown", handleKeyDown);
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
                                    GameUtil.BUZZ_IN_WINDOW_TIME) *
                                  100
                                }%,
                                transparent ${
                                  (gameState.currentTurnData.questionTimeLeft /
                                    GameUtil.BUZZ_IN_WINDOW_TIME) *
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
      <div className="bg-white">
        <GoogleSheetForm
          onSubmit={function (data: {
            spreadsheetName: string;
            sheetName: string;
          }): void {
            getHostClient().UpdateGoogleSheet(
              data.spreadsheetName,
              data.sheetName
            );
          }}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="overflow-hidden flex flex-col">
          <JeopardyBoard
            gameState={gameState}
            showDailyDoubles={true}
            onQuestionClick={(question) => {
              if (question.isDailyDouble) {
                if (
                  confirm(
                    "You're about to select a daily double, do you want to reveal it?"
                  )
                ) {
                  getHostClient().SetCurrentQuestion(question);
                } else {
                  console.log("canceled");
                }
              } else {
                getHostClient().SetCurrentQuestion(question);
              }
            }}
          />
        </div>
        <div>
          <p className="text-xl">
            {`state: ${GameUtil.GetTurnStateNameFromEnum(
              turnPhase.turnState
            )} ${turnPhase.gameTurn.buzzerState}`}
          </p>
          <PlayerStatusArea
            getHostClient={getHostClient}
            gameState={gameState}
          />
          <button
            disabled={
              turnPhase.turnState != TurnState.READING ||
              (gameState.currentTurnData.question?.isDailyDouble ?? false)
            }
            onClick={() => {
              getHostClient().OpenBuzzer();
            }}
          >
            Open Buzzer
          </button>
          <button
            disabled={turnPhase.turnState != TurnState.RESOLVED}
            onClick={() => {
              getHostClient().NextQuestion();
            }}
          >
            Next Question
          </button>
          <button
            onClick={() => {
              getHostClient().ResetCurrentQuestion();
            }}
          >
            Reset Question
          </button>
          <button
            onClick={() => {
              getHostClient().ResetGame();
            }}
          >
            Reset Game
          </button>
          <button onClick={() => {}}>trigger final jeopardy</button>
          <QuestionStatusArea getHostClient={getHostClient} />
        </div>
      </div>
    </div>
  );
}
