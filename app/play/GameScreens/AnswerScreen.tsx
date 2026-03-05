import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import IGameTurn, { GameTurnWithQuestion } from "@/lib/JeopardyGame/IGameTurn";
import IQuestion from "@/lib/JeopardyGame/IQuestion";
import { useClientGameStore } from "@/lib/store/clientStore";
import { useEffect } from "react";
import { WebHaptics } from "web-haptics";

interface Props {
  currentTurnData: GameTurnWithQuestion;
}
export default function AnswerScreen({ currentTurnData }: Props) {
  const username = useClientGameStore((store) => store.username);
  const topOfAnswerStack =
    currentTurnData.answerStack.length > 0
      ? currentTurnData.answerStack[0]
      : null;
  const topOfAnswerStackName = topOfAnswerStack?.player.displayName ?? null;

  useEffect(() => {
    if (!topOfAnswerStackName) return;
    const haptics = new WebHaptics();
    haptics.setDebug(true);
    if (username === topOfAnswerStackName) {
      haptics.trigger("success");
    }
  }, [topOfAnswerStackName, username]);
  if (username == topOfAnswerStackName) {
    return (
      <div>
        you're answering!!! you have {topOfAnswerStack?.answerTimeLeft} seconds
        left
        <p>{currentTurnData.question.question || "no question"}</p>
      </div>
    );
  } else {
    return <p>{topOfAnswerStack?.player.displayName} is answering</p>;
  }
}
