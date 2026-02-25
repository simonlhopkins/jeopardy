import { IGameState } from "@/lib/JeopardyGame/IGameState";
import IGameTurn from "@/lib/JeopardyGame/IGameTurn";
import IQuestion from "@/lib/JeopardyGame/IQuestion";
import clsx from "clsx";

interface Props {
  gameState: IGameState;
  onQuestionClick: (question: IQuestion) => void;
}

export default function JeopardyBoard({ gameState, onQuestionClick }: Props) {
  return (
    <div className="jeopardy-board">
      {gameState.questions.flat().map((question, i) => (
        <div
          className={clsx(
            "jeopardy-square",
            gameState.history.some(
              (item) => item.question?.id == question.id
            ) && "text-red-500",
            question.id == gameState.currentTurnData.question?.id &&
              "text-green-500"
          )}
          key={i}
          onClick={() => {
            onQuestionClick(question);
          }}
        >
          {JSON.stringify(question, null, 2)}
        </div>
      ))}
    </div>
  );
}
