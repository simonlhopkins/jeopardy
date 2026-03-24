import PlayerClient from "@/lib/Client/PlayerClient";
import styles from "./buzzButton.module.css";
import clsx from "clsx";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import {
  AnswerResult,
  TurnPhase,
  TurnState,
} from "@/lib/JeopardyGame/IGameTurn";
import { useRef, useState } from "react";
interface Props {
  turnPhase: TurnPhase;
  username: string;
  getPlayerClient: () => PlayerClient;
  disabled: boolean;
}

export default function BuzzButton({
  getPlayerClient,
  turnPhase,
  username,
  disabled,
}: Props) {
  // const timeoutRef = useRef<number>();
  const [earlyBuzz, setEarlyBuzz] = useState<boolean>(false);
  return (
    <button
      disabled={disabled || earlyBuzz}
      style={{ background: getBuzzBgStyle(turnPhase, username) }}
      onClick={() => {
        if (turnPhase.turnState != TurnState.OPEN) {
          setEarlyBuzz(true);
          setTimeout(() => {
            setEarlyBuzz(false);
          }, 2000);
        } else {
          getPlayerClient().SubmitBuzz();
        }
      }}
      className={clsx(styles.buzzButton, earlyBuzz && styles.earlyBuzz)}
    >
      <p className="text-3xl">BUZZ</p>
    </button>
  );
}

function getBuzzBgStyle(turnPhase: TurnPhase, username: string) {
  const playerAnswerAttempt = turnPhase.gameTurn.answerStack.find(
    (answer) => answer.player.displayName == username
  );
  if (turnPhase.turnState == TurnState.OPEN) {
    return `linear-gradient(
          to right,
          var(--buzzFill) ${
            (turnPhase.gameTurn.questionTimeLeft / GameUtil.RESPONSE_TIME) * 100
          }%,
          transparent ${
            (turnPhase.gameTurn.questionTimeLeft / GameUtil.RESPONSE_TIME) * 100
          }%
        )`;
  }
  return "";
}
