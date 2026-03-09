import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { TurnState } from "@/lib/JeopardyGame/IGameTurn";
import IQuestion from "@/lib/JeopardyGame/IQuestion";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import styles from "./jeopardyBoard.module.css";

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

      //final size will be parentRect
      console.log(squareEl.style.left, squareEl.style.top);
      // Position overlay on top of square
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

  useEffect(() => {}, [turnPhase.turnState]);

  const questionBoxText = (() => {
    if (turnPhase.turnState == TurnState.CHOOSING) {
      return "";
    } else if (
      turnPhase.turnState == TurnState.ANSWER ||
      turnPhase.turnState == TurnState.RESOLVED
    ) {
      return turnPhase.gameTurn.question.answer;
    } else {
      return turnPhase.gameTurn.question.question;
    }
  })();

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
              turnPhase.turnState == TurnState.RESOLVED
                ? styles.answerVisible
                : styles.questionVisible
            )}
          >
            <div className={clsx(styles.overlayCard, styles.front)}>
              <p className="text-3xl font-bold text-shadow-[2px_2px_1px_black]">
                {gameState.currentTurnData.question?.question}
              </p>
            </div>
            <div
              className={clsx(
                styles.overlayCard,
                turnPhase.turnState != TurnState.RESOLVED && "hidden",
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
            className="flex flex-col items-center justify-center font-bold text-wrap p-2 bg-[url(/boardTileBg.jpg)]"
          >
            <p className="text-sm text-center wrap-break-word text-wrap">
              {category}
            </p>
          </div>
        ))}
        {gameState.questions.flat().map((question, i) => (
          <div
            className={clsx(
              "overflow-hidden flex justify-center items-center bg-[url(/boardTileBg.jpg)]",
              question.id == gameState.currentTurnData.question?.id &&
                "text-green-500",
              gameState.history.some(
                (item) => item.question?.id == question.id
              ) && "invisible",
              showDailyDoubles &&
                question.isDailyDouble &&
                "border-yellow-300!",
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
            <p
              className={clsx(
                "text-xl font-black text-amber-400 text-shadow-[2px_2px_1px_black]"
              )}
            >
              {GameUtil.ConvertNumberToCurrency(question.score)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
