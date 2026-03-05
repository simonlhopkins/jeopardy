import PlayerClient from "@/lib/Client/PlayerClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { BuzzerState, IGameState } from "@/lib/JeopardyGame/IGameState";
import IGameTurn, {
  AnswerResult,
  TurnState,
} from "@/lib/JeopardyGame/IGameTurn";
import { useClientGameStore } from "@/lib/store/clientStore";
import { clsx } from "clsx";

interface Props {
  currentTurnData: IGameTurn;
  getPlayerClient: () => PlayerClient;
}
export default function BuzzerScreen({
  currentTurnData,
  getPlayerClient,
}: Props) {
  const username = useClientGameStore((store) => store.username);
  const disableBuzzButton =
    currentTurnData.buzzerState != BuzzerState.OPEN ||
    currentTurnData.answerStack
      .filter((answer) => answer.result == AnswerResult.INCORRECT)
      .some((answer) => answer.player.displayName == username) ||
    currentTurnData.buzzHistory.some(
      (buzzData) => buzzData.player.displayName == username
    );
  return (
    <div>
      <p>time left to answer: {currentTurnData.questionTimeLeft}</p>
      <button
        disabled={disableBuzzButton}
        onClick={() => {
          getPlayerClient().SubmitBuzz();
        }}
      >
        buzz
      </button>
    </div>
  );
}
