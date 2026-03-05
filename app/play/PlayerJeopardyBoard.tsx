import { IGameState } from "@/lib/JeopardyGame/IGameState";
import IQuestion from "@/lib/JeopardyGame/IQuestion";
import clsx from "clsx";

interface Props {
  gameState: IGameState;
  showDailyDoubles: boolean;
  onQuestionClick: ((question: IQuestion) => void) | null;
}
export default function PlayerJeopardyBoard({
  gameState,
  onQuestionClick,
  showDailyDoubles,
}: Props) {
  return (
    <div className="grid grid-rows-[auto_repeat(5,1fr)] flex-1 grid-cols-6 gap-2">
      {gameState.categories.map((category, i) => (
        <div key={i}>
          <p className="text-sm text-wrap break-all border-2 p-2 h-full">
            {category}
          </p>
        </div>
      ))}
      {gameState.questions.flat().map((question, i) => (
        <div
          className={clsx(
            "overflow-hidden flex justify-center items-center border-2",
            question.id == gameState.currentTurnData.question?.id &&
              "text-green-500",
            gameState.history.some(
              (item) => item.question?.id == question.id
            ) && "invisible",
            showDailyDoubles && question.isDailyDouble && "border-yellow-300!"
          )}
          onClick={
            onQuestionClick
              ? () => {
                  onQuestionClick(question);
                }
              : undefined
          }
          key={i}
        >
          <p className={clsx("text-xl")}>{question.score}</p>
        </div>
      ))}
    </div>
  );
}
