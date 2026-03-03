import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { useClientGameStore } from "@/lib/store/clientStore";

interface Props {
  gameState: IGameState;
}
export default function AnswerScreen({ gameState }: Props) {
  const username = useClientGameStore((store) => store.username);
  const topOfAnswerStack =
    gameState.currentTurnData.answerStack.length > 0
      ? gameState.currentTurnData.answerStack[0]
      : null;
  if (username == topOfAnswerStack?.player.displayName) {
    return (
      <div>
        you're answering!!! you have {topOfAnswerStack?.answerTimeLeft} seconds
        left
        <p>{gameState.currentTurnData.question?.question || "no question"}</p>
      </div>
    );
  } else {
    return <p>{topOfAnswerStack?.player.displayName} is answering</p>;
  }
}
