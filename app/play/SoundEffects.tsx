import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import {
  AnswerResult,
  TurnPhase,
  TurnState,
} from "@/lib/JeopardyGame/IGameTurn";
import { useDeepEqualGameStore } from "@/lib/store/clientStore";
import { useEffect, useRef } from "react";

interface Props {
  gameState: IGameState;
}
export default function SoundEffects({ gameState }: Props) {
  const turnPhase = GameUtil.GetTurnPhase(gameState);
  const prevTurnState = useRef<TurnState | null>(null);
  useEffect(() => {
    if (turnPhase.turnState == TurnState.READING) {
      if (turnPhase.gameTurn.question.isDailyDouble) {
        const audio = new Audio("/dailyDoubleSound.mp3");
        audio.play();
      }
    }

    if (turnPhase.turnState == TurnState.RESOLVED) {
      if (
        !turnPhase.gameTurn.answerStack.some(
          (item) => item.result == AnswerResult.CORRECT
        ) &&
        !turnPhase.gameTurn.question.isDailyDouble && //I guess don't play for daily double since the question time never gets set
        turnPhase.gameTurn.questionTimeLeft == 0 //double check the question ended because time ran out
      ) {
        const audio = new Audio("/times-up.mp3");
        audio.play();
      }
    }
    prevTurnState.current = turnPhase.turnState;
  }, [turnPhase.turnState]);

  return <></>;
}
