import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import {
  AnswerResult,
  TurnPhase,
  TurnState,
} from "@/lib/JeopardyGame/IGameTurn";
import { useDeepEqualGameStore } from "@/lib/store/clientStore";
import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";

interface Props {
  gameState: IGameState;
  username: string;
}
export default function SoundEffects({ gameState, username }: Props) {
  const turnPhase = GameUtil.GetTurnPhase(gameState);
  const prevTurnState = useRef<TurnState | null>(null);

  const finalJeopardyAudio = useRef<HTMLAudioElement>(null);
  const nflRef = useRef<HTMLAudioElement>(null);

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
        turnPhase.gameTurn.questionTimeLeft == 0 && //double check the question ended because time ran out
        !turnPhase.gameTurn.isFinalJeopardy //don't play the sound if everyone is wrong in final jeopardy
      ) {
        const audio = new Audio("/times-up.mp3");
        audio.play();
      }
    }
    prevTurnState.current = turnPhase.turnState;
  }, [turnPhase.turnState]);

  const yourAnswerResult = gameState.currentTurnData.answerStack.find(
    (answer) => answer.player.displayName == username
  )?.result;

  useEffect(() => {
    if (yourAnswerResult == AnswerResult.CORRECT) {
      console.log("confetti!!!");
      const audio = new Audio("/nice.mp3");
      audio.play();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [yourAnswerResult]);

  useEffect(() => {
    const audio = finalJeopardyAudio.current!;
    if (
      turnPhase.gameTurn.isFinalJeopardy &&
      turnPhase.turnState == TurnState.OPEN
    ) {
      audio.currentTime = 0;
      audio.play();
    } else {
      audio.pause();
    }
  }, [turnPhase.gameTurn.isFinalJeopardy, turnPhase.turnState]);

  useEffect(() => {
    const audio = nflRef.current!;

    if (turnPhase.turnState == TurnState.CHOOSING) {
      if (gameState.history.length == 0) {
        audio.currentTime = 0;
        audio.play();
      }
    } else {
      audio.pause();
    }
  }, [turnPhase.turnState, gameState]);

  return (
    <>
      <audio
        ref={finalJeopardyAudio}
        src="/jeopardy-final-jeopardy-thinking-music.mp3"
      ></audio>
      <audio ref={nflRef} src="/nfl.mp3"></audio>
    </>
  );
}
