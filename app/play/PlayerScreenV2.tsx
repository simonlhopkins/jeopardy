import PlayerClient from "@/lib/Client/PlayerClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import clsx from "clsx";
import JeopardyBoard from "../Components/JeopardyBoard";
import {
  AnswerResult,
  TurnPhase,
  TurnState,
} from "@/lib/JeopardyGame/IGameTurn";
import PlayerBar from "./PlayerBar";
import DailyDoubleWagerView from "./DailyDoubleWagerView";
import SoundEffects from "./SoundEffects";
import styles from "./playerScreen.module.css";
import FinalJeopardySubmitView from "./FinalJeopardySubmitView";
import BuzzButton from "./BuzzButton";
import AnswerArea from "./AnswerArea";

interface Props {
  gameState: IGameState;
  getPlayerClient: () => PlayerClient;
  username: string;
}

export default function PlayerScreenV2({
  gameState,
  getPlayerClient,
  username,
}: Props) {
  const turnPhase = GameUtil.GetTurnPhase(gameState);
  const buzzDisabled =
    GameUtil.ShouldBuzzerBeDisabled(username, gameState) ||
    turnPhase.gameTurn.isFinalJeopardy;
  const playerChoosing =
    GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState);
  const wagerHasBeenSet =
    gameState.currentTurnData.answerStack.length > 0 &&
    gameState.currentTurnData.answerStack[0].wager != null;

  var showDailyDoublePopup =
    turnPhase.turnState == TurnState.READING &&
    turnPhase.gameTurn.question.isDailyDouble &&
    !wagerHasBeenSet &&
    playerChoosing?.displayName == username;
  var showFinalJeopardyPopup =
    turnPhase.turnState == TurnState.OPEN && turnPhase.gameTurn.isFinalJeopardy;
  // var statusBoxContents;
  // switch (turnPhase.turnState) {
  //   case TurnState.CHOOSING:
  //     statusBoxContents = (
  //       <p>
  //         {playerChoosing?.displayName == username
  //           ? "choose a question"
  //           : `${playerChoosing?.displayName} is choosing a question`}
  //       </p>
  //     );
  //     break;
  //   case TurnState.READING:
  //     if (turnPhase.gameTurn.question.isDailyDouble && !wagerHasBeenSet) {
  //       if (playerChoosing?.displayName == username) {
  //         statusBoxContents = (
  //           <div className="flex gap-2 items-center">
  //             <input
  //               type="range"
  //               min="0"
  //               max={GameUtil.GetMaxWagerAmount(username, gameState)}
  //               value={wagerSlider}
  //               onChange={(e) => setWagerSlider(Number(e.target.value))}
  //             />
  //             <p className="text-lg">{wagerSlider}</p>
  //             <button
  //               className="text-black"
  //               onClick={() => {
  //                 getPlayerClient().PlaceWager(wagerSlider);
  //               }}
  //             >
  //               place wager and see question
  //             </button>
  //           </div>
  //         );
  //       } else {
  //         statusBoxContents = (
  //           <p>{playerChoosing?.displayName} is placing a wager</p>
  //         );
  //       }
  //     } else {
  //       statusBoxContents = <p>{turnPhase.gameTurn.question.question}</p>;
  //     }
  //     break;
  //   case TurnState.OPEN:
  //     statusBoxContents = <p>{turnPhase.gameTurn.question.question}</p>;
  //     break;
  //   case TurnState.ANSWER:
  //     statusBoxContents = <p>{turnPhase.gameTurn.question.question}</p>;
  //     break;
  //   case TurnState.RESOLVED:
  //     statusBoxContents = <p>{turnPhase.gameTurn.question.answer}</p>;
  //     break;
  // }
  const playerAnswerAttempt = turnPhase.gameTurn.answerStack.find(
    (answer) => answer.player.displayName == username
  );

  return (
    <div className="grid grid-rows-8 flex-1 gap-2 overflow-hidden relative">
      <SoundEffects gameState={gameState} username={username} />

      <div className="row-start-1 row-span-1 bg-(--color-primary) overflow-x-scroll p-2 pt-4">
        <PlayerBar gameState={gameState} username={username} />
      </div>
      <div className="row-start-2 row-end-8 flex">
        <JeopardyBoard
          gameState={gameState}
          onQuestionClick={null}
          showDailyDoubles={false}
        />
      </div>
      <div className="row-start-8 row-span-1">
        {playerAnswerAttempt ? (
          <AnswerArea answer={playerAnswerAttempt} />
        ) : (
          <BuzzButton
            getPlayerClient={getPlayerClient}
            disabled={buzzDisabled}
            username={username}
            turnPhase={turnPhase}
          />
        )}
      </div>
      <div
        className={clsx(showDailyDoublePopup ? styles.popupBacking : "hidden")}
      >
        <div className="w-64 h-48 bg-(--jeopardyBlue)">
          <DailyDoubleWagerView
            gameState={gameState}
            username={username}
            getPlayerClient={getPlayerClient}
          />
        </div>
      </div>
      <div
        className={clsx(
          showFinalJeopardyPopup ? styles.popupBacking : "hidden"
        )}
      >
        <div className="w-64 h-48   bg-(--jeopardyBlue) flex gap-2 items-center flex-col justify-center">
          <FinalJeopardySubmitView
            onSubmit={function (answer: string, wager: number): void {
              getPlayerClient().SubmitFinalJeopardyAnswer(answer, wager);
            }}
            forUsername={username}
            gameState={gameState}
          />
        </div>
      </div>
    </div>
  );
}
