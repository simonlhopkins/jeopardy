"use client";

import PlayerClient from "@/lib/Client/PlayerClient";
import { BuzzerState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult } from "@/lib/JeopardyGame/IGameTurn";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import PlayerConnectionScreen from "./PlayerConnectionScreen";
import PlayerGameScreen from "./PlayerGameScreen";
import PlayerScreenV2 from "./PlayerScreenV2";

export default function Play() {
  const playerClient = useRef<PlayerClient | null>(null);
  const getPlayerClient = () => {
    if (playerClient.current == null) {
      playerClient.current = new PlayerClient(socket);
    }
    return playerClient.current;
  };

  const username = useClientGameStore((store) => store.username);
  const socketId = useClientGameStore((store) => store.socketId);
  const gameState = useClientGameStore((store) => store.gameState);
  const setUsername = useClientGameStore((state) => state.setUsername);

  const winnerOfCurrentQuestion = gameState.currentTurnData.answerStack
    .filter((answer) => answer.result == AnswerResult.CORRECT)
    .some((answer) => answer.player.displayName == username);
  const answeredCurrentQuestionIncorrect = gameState.currentTurnData.answerStack
    .filter((answer) => answer.result == AnswerResult.INCORRECT)
    .some((answer) => answer.player.displayName == username);
  //todo refactor this damn i am dumb
  const isInGame = gameState.players.some(
    (player) => player.socketId == socketId && player.displayName == username
  );

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
    <div className="flex-1 flex flex-col overflow-hidden max-w-xl">
      <p>username: {JSON.stringify(username)}</p>
      <p>connection status: {isInGame ? "connected" : "not connected"}</p>
      <PlayerConnectionScreen
        gameState={gameState}
        getPlayerClient={getPlayerClient}
      />
      {isInGame && (
        // <PlayerGameScreen
        //   gameState={gameState}
        //   getPlayerClient={getPlayerClient}
        // />
        <PlayerScreenV2
          gameState={gameState}
          getPlayerClient={getPlayerClient}
          username={username!}
        />
      )}
    </div>
  );
}
