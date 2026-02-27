import PlayerClient from "@/lib/Client/PlayerClient";
import { BuzzerState, IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult } from "@/lib/JeopardyGame/IGameTurn";
import { useClientGameStore } from "@/lib/store/clientStore";
import { clsx } from "clsx";

interface Props {
  gameState: IGameState;
  getPlayerClient: () => PlayerClient;
}
export default function BuzzerScreen({ gameState, getPlayerClient }: Props) {
  const username = useClientGameStore((store) => store.username);

  const disableBuzzButton =
    gameState.buzzerState != BuzzerState.OPEN ||
    gameState.currentTurnData.answerStack
      .filter((answer) => answer.result == AnswerResult.INCORRECT)
      .some((answer) => answer.player.displayName == username) ||
    gameState.currentTurnData.buzzHistory.some(
      (buzzData) => buzzData.player.displayName == username
    );

  return (
    <div>
      <p>time left to answer: {gameState.currentTurnData.questionTimeLeft}</p>
      <button
        disabled={disableBuzzButton}
        className={clsx("btn")}
        onClick={() => {
          getPlayerClient().SubmitBuzz();
        }}
      >
        buzz
      </button>
    </div>
  );
}
