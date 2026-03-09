import PlayerClient from "@/lib/Client/PlayerClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { BuzzerState, IGameState } from "@/lib/JeopardyGame/IGameState";
import clsx from "clsx";
import JeopardyBoard from "../Components/JeopardyBoard";
import {
  AnswerResult,
  TurnPhase,
  TurnState,
} from "@/lib/JeopardyGame/IGameTurn";
import PlayerBar from "./PlayerBar";
import { useEffect, useState } from "react";

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
  const [wagerSlider, setWagerSlider] = useState(50);

  const turnPhase = GameUtil.GetTurnPhase(gameState);
  const buzzDisabled = GameUtil.ShouldBuzzerBeDisabled(username, gameState);
  const playerChoosing =
    GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState);
  const wagerHasBeenSet =
    gameState.currentTurnData.answerStack.length > 0 &&
    gameState.currentTurnData.answerStack[0].wager != null;

  useEffect(() => {
    if (
      turnPhase.turnState == TurnState.READING &&
      turnPhase.gameTurn.question.isDailyDouble
    ) {
      setWagerSlider(GameUtil.GetMaxWagerAmount(username, gameState) / 2);
    }
  }, [turnPhase.turnState]);

  var statusBoxContents;
  switch (turnPhase.turnState) {
    case TurnState.CHOOSING:
      statusBoxContents = (
        <p>
          {playerChoosing?.displayName == username
            ? "choose a question"
            : `${playerChoosing?.displayName} is choosing a question`}
        </p>
      );
      break;
    case TurnState.READING:
      if (turnPhase.gameTurn.question.isDailyDouble && !wagerHasBeenSet) {
        if (playerChoosing?.displayName == username) {
          statusBoxContents = (
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max={GameUtil.GetMaxWagerAmount(username, gameState)}
                value={wagerSlider}
                onChange={(e) => setWagerSlider(Number(e.target.value))}
              />
              <p className="text-lg">{wagerSlider}</p>
              <button
                className="text-black"
                onClick={() => {
                  getPlayerClient().PlaceWager(wagerSlider);
                }}
              >
                place wager
              </button>
            </div>
          );
        } else {
          statusBoxContents = (
            <p>{playerChoosing?.displayName} is placing a wager</p>
          );
        }
      } else {
        statusBoxContents = <p>{turnPhase.gameTurn.question.question}</p>;
      }
      break;
    case TurnState.OPEN:
      statusBoxContents = <p>{turnPhase.gameTurn.question.question}</p>;
      break;
    case TurnState.ANSWER:
      statusBoxContents = <p>{turnPhase.gameTurn.question.question}</p>;
      break;
    case TurnState.RESOLVED:
      statusBoxContents = <p>{turnPhase.gameTurn.question.answer}</p>;
      break;
  }

  return (
    <div className="grid grid-rows-8 flex-1 gap-2">
      <div className="row-start-1 row-span-1 bg-(--color-primary) overflow-x-scroll p-2 pt-4">
        <PlayerBar gameState={gameState} username={username} />
      </div>
      {/* <div
        className={clsx(
          "row-start-2 row-end-3  bg-(--color-primary) text-sm items-center flex p-2",
          turnPhase.turnState == TurnState.OPEN && "border-4 border-white"
        )}
      >
        {statusBoxContents}
      </div> */}
      <div className="row-start-3 row-end-8 flex p-2">
        <JeopardyBoard
          gameState={gameState}
          onQuestionClick={null}
          showDailyDoubles={false}
        />
      </div>
      <div className="row-start-8 row-span-1">
        <button
          style={{ background: buzzDisabled ? "" : getBuzzBgStyle(turnPhase) }}
          disabled={buzzDisabled}
          className="rounded-full! w-full h-full"
          onClick={() => {
            getPlayerClient().SubmitBuzz();
          }}
        >
          Buzz
        </button>
      </div>
    </div>
  );
}

function getBuzzBgStyle(turnPhase: TurnPhase) {
  if (turnPhase.turnState == TurnState.OPEN) {
    return `linear-gradient(
        to right,
        green ${(turnPhase.gameTurn.questionTimeLeft / 5) * 100}%,
        transparent ${(turnPhase.gameTurn.questionTimeLeft / 5) * 100}%
      )`;
  }
  return "";
}
