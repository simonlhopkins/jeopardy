import { IGameState } from "@/lib/JeopardyGame/IGameState";
import clsx from "clsx";

interface Props {
  gameState: IGameState;
}
export default function PlayerJeopardyBoard({ gameState }: Props) {
  return (
    <div className="grid grid-rows-5 grid-cols-6 h-full gap-2">
      {gameState.questions.flat().map((question, i) => (
        <div
          className={clsx(
            "overflow-hidden flex justify-center items-center border-2",
            question.id == gameState.currentTurnData.question?.id &&
              "text-green-500",
            gameState.history.some(
              (item) => item.question?.id == question.id
            ) && "invisible"
          )}
          key={i}
        >
          <p className={clsx("text-xl")}>{question.score}</p>
        </div>
      ))}
    </div>
  );
}
