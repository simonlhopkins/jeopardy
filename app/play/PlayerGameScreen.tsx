import PlayerClient from "@/lib/Client/PlayerClient";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult, TurnState } from "@/lib/JeopardyGame/IGameTurn";
import BuzzerScreen from "./GameScreens/BuzzerScreen";
import { useClientGameStore } from "@/lib/store/clientStore";

interface Props {
  gameState: IGameState;
  getPlayerClient: () => PlayerClient;
}

export default function PlayerGameScreen({
  gameState,
  getPlayerClient,
}: Props) {
  const username = useClientGameStore((store) => store.username);

  const isCurrentlyAnswering =
    gameState.currentTurnData.answerStack.length > 0 &&
    gameState.currentTurnData.answerStack[0].player.displayName == username &&
    gameState.currentTurnData.answerStack[0].result == null;

  const currentWinners = gameState.currentTurnData.answerStack
    .filter((answer) => answer.result == AnswerResult.CORRECT)
    .map((answer) => answer.player);
  switch (gameState.currentTurnData.turnState) {
    case TurnState.CHOOSING:
      return <div></div>;
    case TurnState.READING:
      return (
        <div>
          {gameState.currentTurnData.question
            ? gameState.currentTurnData.question.question
            : "no question selected during READING state?"}
        </div>
      );
    case TurnState.OPEN:
      return (
        <BuzzerScreen gameState={gameState} getPlayerClient={getPlayerClient} />
      );
    case TurnState.ANSWER:
      return (
        <div>
          {isCurrentlyAnswering ? (
            <p>
              you're answering!!! you have{" "}
              {gameState.currentTurnData.answerStack[0].answerTimeLeft} seconds
              left
            </p>
          ) : (
            <p>
              {gameState.currentTurnData.answerStack[0].player.displayName} is
              answering
            </p>
          )}
        </div>
      );
    case TurnState.RESOLVED:
      return (
        <div>
          {currentWinners.length > 0
            ? currentWinners[0].displayName + " won the round"
            : "no one won the round!"}
        </div>
      );
    default:
      return <div>unhandled state</div>;
  }
}
