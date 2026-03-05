import PlayerClient from "@/lib/Client/PlayerClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { GameTurnWithQuestion } from "@/lib/JeopardyGame/IGameTurn";
import IQuestion from "@/lib/JeopardyGame/IQuestion";
import { useClientGameStore } from "@/lib/store/clientStore";

interface Props {
  currentTurnData: GameTurnWithQuestion;
  gameState: IGameState;
  getPlayerClient(): PlayerClient;
}

export default function DisplayQuestionScreen({
  currentTurnData,
  gameState,
  getPlayerClient,
}: Props) {
  const username = useClientGameStore((store) => store.username);

  const wagerHasBeenSet =
    gameState.currentTurnData.answerStack.length > 0 &&
    gameState.currentTurnData.answerStack[0].wager != null;
  const playerWhoShouldBeChoosingQuestion =
    GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState);

  if (currentTurnData.question.isDailyDouble && !wagerHasBeenSet) {
    if (playerWhoShouldBeChoosingQuestion?.displayName == username) {
      return (
        <div>
          <p>place your wager</p>
          <button onClick={() => getPlayerClient().PlaceWager(1000)}>
            wager
          </button>
        </div>
      );
    } else {
      return (
        <p>
          {playerWhoShouldBeChoosingQuestion?.displayName} is currently doing
          their daily double
        </p>
      );
    }
  }
  return <p>{currentTurnData.question.question}</p>;
}
