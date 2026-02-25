"use client";

import HostClient from "@/lib/Client/HostClient";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import { useEffect, useMemo, useRef } from "react";
import JeopardyBoard from "../Components/JeopardyBoard";
import clsx from "clsx";
import { AnswerResult } from "@/lib/JeopardyGame/IGameTurn";
import GameUtil from "@/lib/JeopardyGame/GameUtil";

export default function Host() {
  const hostClient = useRef<HostClient | null>(null);
  const gameState = useClientGameStore((store) => store.gameState);
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
      <p>host</p>
      <p className="text-xl">
        state -{" "}
        {GameUtil.GetTurnStateNameFromEnum(gameState.currentTurnData.turnState)}
      </p>
      <ul>
        {gameState.players.map((player, i) => (
          <li key={i}>
            <p>
              {player.displayName}[{player.socketId || "disconnected"}]
            </p>
            <button
              className="btn"
              onClick={() => {
                getHostClient().KickPlayer(player);
              }}
            >
              kick
            </button>
          </li>
        ))}
      </ul>

      <div className="w-[500px] h-[500px]">
        <JeopardyBoard
          gameState={gameState}
          onQuestionClick={(question) => {
            getHostClient().SetCurrentQuestion(question);
          }}
        />
      </div>
      <button
        className="btn"
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
          getHostClient().ResetGame();
        }}
      >
        Reset Game
      </button>
      <h3>buzz history</h3>
      <ul>
        {gameState.currentTurnData.buzzHistory.map((item, i) => (
          <li key={i}>
            <p>
              {item.player.displayName} - {item.timestamp}
            </p>
            <div>
              <button
                className="btn"
                onClick={() => {
                  getHostClient().AwardPlayerCorrectAnswer(item.player);
                }}
              >
                Correct
              </button>
              <button
                className="btn"
                onClick={() => {
                  getHostClient().AwardPlayerIncorrectAnswer(item.player);
                }}
              >
                Incorrect
              </button>
            </div>
          </li>
        ))}
      </ul>
      <h3>answer state</h3>
      <ul>
        {gameState.players.map((player, i) => (
          <li key={i}>
            <p
              className={clsx(
                gameState.currentTurnData.answerHistory
                  .filter((answer) => answer.result == AnswerResult.CORRECT) //only correct answers
                  .some(
                    (answer) => answer.player.displayName == player.displayName //does this player have a correct answer
                  ) && "text-green-500",
                gameState.currentTurnData.answerHistory
                  .filter((answer) => answer.result == AnswerResult.INCORRECT) //only correct answers
                  .some(
                    (answer) => answer.player.displayName == player.displayName //does this player have a correct answer
                  ) && "text-red-500"
              )}
            >
              {player.displayName}[{player.socketId || "disconnected"}]
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
