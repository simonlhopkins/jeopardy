"use client";

import GameClient from "@/lib/Client/GameClient";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import { useEffect, useRef } from "react";
import JeopardyBoard from "../Components/JeopardyBoard";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { TurnPhase, TurnState } from "@/lib/JeopardyGame/IGameTurn";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import PlayerBar from "../play/PlayerBar";

export default function Game() {
  const hostClient = useRef<GameClient | null>(null);
  const gameState = useClientGameStore((store) => store.gameState);
  const getGameClient = () => {
    if (hostClient.current == null) {
      hostClient.current = new GameClient(socket);
    }
    return hostClient.current;
  };
  const turnPhase = GameUtil.GetTurnPhase(gameState);

  function GetTopMessage(gameState: IGameState) {
    const turnPhase = GameUtil.GetTurnPhase(gameState);
    switch (turnPhase.turnState) {
      case TurnState.CHOOSING:
        return `${
          GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState)?.displayName
        } is choosing the question`;
      case TurnState.READING:
        return turnPhase.gameTurn.question.question;
      case TurnState.OPEN:
        return turnPhase.gameTurn.question.question;
      case TurnState.ANSWER:
        return turnPhase.gameTurn.question.question;
      case TurnState.RESOLVED:
        return turnPhase.gameTurn.question.answer;
    }
  }

  useEffect(() => {
    getGameClient().initialize();
  }, []);
  return (
    <div className="bg-(--color-primary) flex-1 flex flex-col">
      <p>game</p>
      <div className="h-18">
        <PlayerBar gameState={gameState} username="" />
      </div>
      <p className="text-xl">{GetTopMessage(gameState)}</p>
      <JeopardyBoard
        gameState={gameState}
        onQuestionClick={null}
        showDailyDoubles={false}
      />
    </div>
  );
}
