import { IGameState } from "@/lib/JeopardyGame/IGameState";
import styles from "./buzzButton.module.css";
import clsx from "clsx";
import { AnswerResult, IAnswerAttempt } from "@/lib/JeopardyGame/IGameTurn";
import GameUtil from "@/lib/JeopardyGame/GameUtil";

interface Props {
  answer: IAnswerAttempt;
}
export default function AnswerArea({ answer }: Props) {
  const getAnswerText = () => {
    if (answer.result == null) {
      return "Answer the question";
    } else if (answer.result == AnswerResult.CORRECT) {
      return "Nice Job!";
    } else {
      return "Incorrect!";
    }
  };
  const fillPercent =
    answer.result == null ? answer.answerTimeLeft / GameUtil.RESPONSE_TIME : 1;
  return (
    <div
      style={{
        background: `linear-gradient(
        to right,
        var(--answerFill) ${fillPercent * 100}%,
        transparent ${fillPercent * 100}%
      )`,
      }}
      className={clsx(
        styles.answerButton,
        answer.result == AnswerResult.CORRECT && styles.correct,
        answer.result == AnswerResult.INCORRECT && styles.incorrect
      )}
    >
      <p className="text-3xl">{getAnswerText()}</p>
    </div>
  );
}
