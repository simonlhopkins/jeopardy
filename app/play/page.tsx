"use client";

import PlayerClient from "@/lib/Client/PlayerClient";
import { BuzzerState, IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult } from "@/lib/JeopardyGame/IGameTurn";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import clsx from "clsx";
import { useEffect, useRef } from "react";

export default function Play() {
  const playerClient = useRef<PlayerClient | null>(null);
  const getPlayerClient = () => {
    if (playerClient.current == null) {
      playerClient.current = new PlayerClient(socket);
    }
    return playerClient.current;
  };

  const points = useClientGameStore((store) => store.gameState.points);
  const username = useClientGameStore((store) => store.username);
  const socketId = useClientGameStore((store) => store.socketId);
  const gameState = useClientGameStore((store) => store.gameState);
  const setUsername = useClientGameStore((state) => state.setUsername);

  const isCurrentlyAnswering =
    gameState.currentTurnData.buzzHistory.length > 0 &&
    gameState.currentTurnData.buzzHistory[0].player.displayName == username;
  const winnerOfCurrentQuestion = gameState.currentTurnData.answerHistory
    .filter((answer) => answer.result == AnswerResult.CORRECT)
    .some((answer) => answer.player.displayName == username);
  const answeredCurrentQuestionIncorrect =
    gameState.currentTurnData.answerHistory
      .filter((answer) => answer.result == AnswerResult.INCORRECT)
      .some((answer) => answer.player.displayName == username);
  //todo refactor this damn i am dumb
  const isInGame = gameState.players.some(
    (player) => player.socketId == socketId
  );
  const joinGameDisabled = gameState.players.some(
    (player) => player.displayName == username && player.socketId != null
  );
  const showReconnect = gameState.players.some(
    (player) => player.displayName == username && player.socketId == null
  );
  const disableBuzzButton =
    gameState.buzzerState != BuzzerState.OPEN ||
    gameState.currentTurnData.answerHistory
      .filter((answer) => answer.result == AnswerResult.INCORRECT)
      .some((answer) => answer.player.displayName == username);
  useEffect(() => {
    function onConnect() {
      getPlayerClient().OnConnection();
      const saved = sessionStorage.getItem("username");
      if (saved) {
        setUsername(saved);
        getPlayerClient().JoinGame(saved);
      }
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
      <p>play</p>
      <p>username: {JSON.stringify(username)}</p>
      <p>connection status: {isInGame ? "connected" : "not connected"}</p>
      <input
        type="text"
        placeholder="Enter username"
        value={username || ""}
        onChange={(e) => {
          console.log(e.target.value);
          setUsername(e.target.value);
        }}
      />
      <button
        disabled={joinGameDisabled}
        className="btn"
        onClick={() => {
          if (username) {
            getPlayerClient().JoinGame(username);
          }
        }}
      >
        {showReconnect ? "reconnect" : "join game"}
      </button>
      <p>points: {points}</p>
      <button
        disabled={disableBuzzButton}
        className={clsx(!isInGame && "hidden", "btn")}
        onClick={() => {
          getPlayerClient().SubmitBuzz();
        }}
      >
        buzz
      </button>

      <div className="border-2 border-white">
        {gameState.currentTurnData.question && (
          <p>question: {gameState.currentTurnData.question.question}</p>
        )}
      </div>
      {isCurrentlyAnswering && (
        <p>
          you're answering!!! you have{" "}
          {gameState.currentTurnData.answerTimeLeft} seconds left
        </p>
      )}
      {winnerOfCurrentQuestion && <p>Congrats, you answered correctly</p>}
      {answeredCurrentQuestionIncorrect && (
        <p>Bummer! you answered the question incorrect</p>
      )}
    </div>
  );
}
