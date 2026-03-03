import PlayerClient from "@/lib/Client/PlayerClient";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult, TurnState } from "@/lib/JeopardyGame/IGameTurn";
import BuzzerScreen from "./GameScreens/BuzzerScreen";
import { useClientGameStore } from "@/lib/store/clientStore";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import DisplayQuestionScreen from "./GameScreens/DisplayQuestionScreen";
import AnswerScreen from "./GameScreens/AnswerScreen";

interface Props {
  gameState: IGameState;
  getPlayerClient: () => PlayerClient;
}

export default function PlayerGameScreen({
  gameState,
  getPlayerClient,
}: Props) {
  const currentWinners = gameState.currentTurnData.answerStack
    .filter((answer) => answer.result == AnswerResult.CORRECT)
    .map((answer) => answer.player);

  switch (gameState.currentTurnData.turnState) {
    case TurnState.CHOOSING:
      return (
        <div>
          {`${
            GameUtil.GetPersonWhoShouldBeChoosingQuestion(
              gameState.history,
              gameState.players
            )?.displayName
          } is choosing a question`}
        </div>
      );
    case TurnState.READING:
      return gameState.currentTurnData.question ? (
        <DisplayQuestionScreen
          question={gameState.currentTurnData.question}
          gameState={gameState}
          getPlayerClient={getPlayerClient}
        />
      ) : (
        <p>"no question selected during READING state?"</p>
      );
    case TurnState.OPEN:
      return (
        <BuzzerScreen gameState={gameState} getPlayerClient={getPlayerClient} />
      );

    case TurnState.ANSWER:
      return <AnswerScreen gameState={gameState} />;
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
