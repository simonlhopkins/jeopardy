import PlayerClient from "@/lib/Client/PlayerClient";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult, TurnState } from "@/lib/JeopardyGame/IGameTurn";
import BuzzerScreen from "./GameScreens/BuzzerScreen";
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

  const turnPhase = GameUtil.GetTurnPhase(gameState);

  switch (turnPhase.turnState) {
    case TurnState.CHOOSING:
      return (
        <div>
          {`${
            GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState)
              ?.displayName
          } is choosing a question`}
        </div>
      );
    case TurnState.READING:
      return (
        <DisplayQuestionScreen
          getPlayerClient={getPlayerClient}
          currentTurnData={turnPhase.gameTurn}
          gameState={gameState}
        />
      );
    case TurnState.OPEN:
      return (
        <BuzzerScreen
          getPlayerClient={getPlayerClient}
          currentTurnData={gameState.currentTurnData}
        />
      );

    case TurnState.ANSWER:
      return <AnswerScreen currentTurnData={turnPhase.gameTurn} />;
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
