import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { TurnState } from "@/lib/JeopardyGame/IGameTurn";
import IQuestion from "@/lib/JeopardyGame/IQuestion";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import styles from "./jeopardyBoard.module.css";
import { useDeepEqualGameStore } from "@/lib/store/clientStore";

interface Props {
  gameState: IGameState;
  showDailyDoubles: boolean;
  onQuestionClick: ((question: IQuestion) => void) | null;
}
export default function JeopardyBoard({
  gameState,
  onQuestionClick,
  showDailyDoubles,
}: Props) {
  const turnPhase = GameUtil.GetTurnPhase(gameState);
  const gridSquaresRef = useRef<Map<number, HTMLElement>>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gridParentRef = useRef<HTMLDivElement>(null);

  function getGridSquaresMap() {
    if (!gridSquaresRef.current) {
      // Initialize the Map on first usage.
      gridSquaresRef.current = new Map();
    }
    return gridSquaresRef.current;
  }

  useEffect(() => {
    const question = gameState.currentTurnData.question;
    if (!question) return;
    const squareEl = getGridSquaresMap().get(question.id);
    const overlayEl = overlayRef.current!;
    if (squareEl) {
      const squareRect = squareEl.getBoundingClientRect();
      const parentRect = gridParentRef.current!.getBoundingClientRect();

      const left =
        squareRect.left -
        parentRect.left -
        parentRect.width / 2 +
        squareRect.width / 2;
      const top =
        squareRect.top -
        parentRect.top -
        parentRect.height / 2 +
        squareRect.height / 2;

      // overlayEl.style.width = `${squareRect.width}px`;
      // overlayEl.style.height = `${squareRect.height}px`;

      // Animate to fullscreen
      console.log(top, left);
      overlayEl.style.transform = `scale(0) translate(${left}px, ${top}px)`;
      const startScale = Math.min(
        squareRect.width / parentRect.width,
        squareRect.height / parentRect.height
      );
      overlayEl.animate(
        [
          {
            transform: `translate(${left}px, ${top}px) scale(${startScale})`,
          },
          {
            transform: `translate(${0}px, ${0}px) scale(${1})`,
          },
        ],
        {
          duration: 600,
          easing: "linear",
          fill: "forwards",
        }
      );
    }
  }, [gameState.currentTurnData.question?.id]);

  const showDailyDouble =
    turnPhase.turnState == TurnState.READING &&
    turnPhase.gameTurn.question.isDailyDouble &&
    !(
      turnPhase.gameTurn.answerStack.length > 0 &&
      turnPhase.gameTurn.answerStack[0].wager != null
    );

  const getTurnStyle = () => {
    if (showDailyDouble) {
      return styles.dailyDoubleVisible;
    } else {
      return turnPhase.turnState == TurnState.RESOLVED
        ? styles.answerVisible
        : styles.questionVisible;
    }
  };

  return (
    <div className="flex-1 relative" ref={gridParentRef}>
      <div className="absolute w-full transform-3d h-full pointer-events-none perspective-midrange ">
        <div
          className={clsx(
            "pointer-events-auto w-full h-full transform-3d",
            turnPhase.turnState == TurnState.CHOOSING && "hidden"
          )}
          ref={overlayRef}
        >
          <div
            className={clsx(
              "w-full h-full transform-3d relative",
              styles.parent,
              getTurnStyle()
            )}
          >
            <div
              className={clsx(
                gameState.currentTurnData.question?.isDailyDouble
                  ? styles.overlayCard
                  : "hidden",
                styles.left,
                styles.dailyDoubleCard
              )}
            ></div>
            <div
              className={clsx(
                showDailyDouble ? "hidden" : styles.overlayCard,
                styles.front
              )}
            >
              <p className="text-3xl font-bold text-shadow-[2px_2px_1px_black]">
                {gameState.currentTurnData.question?.question}
              </p>
            </div>
            <div
              className={clsx(
                turnPhase.turnState == TurnState.READING
                  ? "hidden"
                  : styles.overlayCard,
                styles.right
              )}
            >
              <p className="text-3xl font-bold text-shadow-[2px_2px_1px_black]">
                {gameState.currentTurnData.question?.answer}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-rows-6 grid-cols-6 gap-2 h-full">
        {gameState.categories.map((category, i) => (
          <div
            key={i}
            className={clsx(
              "flex flex-col items-center justify-center text-wrap p-2",
              styles.boardSquare
            )}
          >
            <p
              className={clsx(
                "text-center wrap-break-word text-wrap",
                category.split(" ").some((word) => word.length > 8)
                  ? "text-lg"
                  : "text-2xl"
              )}
            >
              {category}
            </p>
          </div>
        ))}
        {gameState.questions.flat().map((question, i) => (
          <div
            className={clsx(
              "flex justify-center items-center",
              styles.boardSquare,
              gameState.history.some(
                (item) => item.question?.id == question.id
              ) && "invisible",
              showDailyDoubles &&
                question.isDailyDouble &&
                "border-yellow-300! border-2",
              onQuestionClick != null && "cursor-pointer"
            )}
            ref={(node) => {
              const map = getGridSquaresMap();
              map.set(question.id, node!);

              return () => {
                map.delete(question.id);
              };
            }}
            onClick={
              onQuestionClick
                ? () => {
                    onQuestionClick(question);
                  }
                : undefined
            }
            key={i}
          >
            <p className={clsx("text-3xl text-[#dea154]")}>
              {GameUtil.ConvertNumberToCurrency(question.score)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
