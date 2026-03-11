import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult, TurnState } from "@/lib/JeopardyGame/IGameTurn";
import IPlayer from "@/lib/JeopardyGame/IPlayer";
import clsx from "clsx";
import styles from "./playerBar.module.css";

interface Props {
  gameState: IGameState;
  username: string;
}

export default function PlayerBar({ gameState, username }: Props) {
  var turnPhase = GameUtil.GetTurnPhase(gameState);

  function getStatusEmoji(player: IPlayer) {
    switch (turnPhase.turnState) {
      case TurnState.CHOOSING:
        return GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState)
          ?.displayName == player.displayName
          ? "🤔"
          : "👀";
      case TurnState.READING:
        if (turnPhase.gameTurn.question.isDailyDouble) {
          if (
            GameUtil.GetPersonWhoShouldBeChoosingQuestion(gameState)
              ?.displayName == player.displayName
          ) {
            return "💰";
          } else {
            return "🙄";
          }
        }
        return "👂";
      case TurnState.OPEN:
        return GameUtil.GetPlayersWhoAnsweredIncorrect(gameState).some(
          (answeredPlayer) => answeredPlayer.displayName == player.displayName
        )
          ? "😡"
          : "💭";
      case TurnState.ANSWER:
        return GameUtil.GetPlayerAnswering(
          gameState.currentTurnData.answerStack
        )?.displayName == player.displayName
          ? "💬"
          : "😨";
      case TurnState.RESOLVED:
        return GameUtil.GetPlayersWhoAnsweredCorrect(gameState)
          .map((player) => player.displayName)
          .includes(player.displayName)
          ? "🎉"
          : "😭";
    }
  }

  return (
    <div className="flex items-center gap-2 h-full">
      {[
        ...GameUtil.GetAllConnectedPlayers(gameState).filter(
          (player) => player.displayName == username
        ),
        ...GameUtil.GetAllConnectedPlayers(gameState)
          .filter((player) => player.displayName != username)
          .sort(
            (a, b) =>
              GameUtil.GetPlayerScore(
                b.displayName,
                GameUtil.GetAllGameTurns(gameState)
              ) -
              GameUtil.GetPlayerScore(
                a.displayName,
                GameUtil.GetAllGameTurns(gameState)
              )
          ),
      ].map((player) => (
        <div
          key={player.socketId}
          className="h-full border-2 flex items-center justify-center flex-col relative w-24"
          style={{ background: getBGStyle(player, gameState) }}
        >
          <div
            className={clsx(
              "absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 text-2xl",
              styles.emoji
            )}
          >
            {getStatusEmoji(player)}
          </div>
          <div>
            <p className="font-bold text-shadow-[2px_2px_1px_black]">
              {GameUtil.ConvertNumberToCurrency(
                GameUtil.GetPlayerScore(
                  player.displayName,
                  GameUtil.GetAllGameTurns(gameState)
                )
              )}
            </p>
          </div>
          <div className="flex-1 w-full text-center">
            <p className={clsx(username == player.displayName && "underline")}>
              {player.displayName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getBGStyle(player: IPlayer, gameState: IGameState) {
  const playerAnswerAttempt = gameState.currentTurnData.answerStack.find(
    (answer) => answer.player.displayName == player.displayName
  );
  if (playerAnswerAttempt) {
    const color =
      playerAnswerAttempt.result == AnswerResult.INCORRECT ? "red" : "green";
    return `linear-gradient(
        to right,
        ${color} ${(playerAnswerAttempt.answerTimeLeft / 10) * 100}%,
        transparent ${(playerAnswerAttempt.answerTimeLeft / 10) * 100}%
      )`;
  }
  return "";
}
