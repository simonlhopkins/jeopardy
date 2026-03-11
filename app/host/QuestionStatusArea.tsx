import HostClient from "@/lib/Client/HostClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { AnswerResult } from "@/lib/JeopardyGame/IGameTurn";
import { useDeepEqualGameStore } from "@/lib/store/clientStore";
import clsx from "clsx";

interface Props {
  getHostClient(): HostClient;
}

export default function QuestionStatusArea({ getHostClient }: Props) {
  const currentTurnData = useDeepEqualGameStore(
    (state) => state.gameState.currentTurnData
  );
  const players = useDeepEqualGameStore((state) => state.gameState.players);
  return (
    <div>
      <table>
        <caption>Buzzer Data</caption>
        <thead>
          <tr>
            <th>Player Name</th>
            <th>Buzz local timestamp</th>
          </tr>
        </thead>
        <tbody>
          {currentTurnData.buzzHistory.map((buzzSubmitData, i) => (
            <tr key={i}>
              <td>{buzzSubmitData.player.displayName}</td>
              <td>{buzzSubmitData.timestamp}</td>
            </tr>
          ))}
          {new Array(players.length - currentTurnData.buzzHistory.length)
            .fill(0)
            .map((_, i) => (
              <tr key={`extra_${i}`}>
                <td>&nbsp;</td>
                <td />
              </tr>
            ))}
        </tbody>
      </table>

      <table>
        <caption>Answer Stack</caption>
        <thead>
          <tr>
            <th>Player Name</th>
            <th>time left</th>
            <th>wager</th>
            <th>result</th>
          </tr>
        </thead>
        <tbody>
          {currentTurnData.answerStack.map((answer, i) => (
            <tr
              key={i}
              className={clsx(
                answer.result == AnswerResult.CORRECT && "text-green-600",
                answer.result == AnswerResult.INCORRECT && "text-red-600"
              )}
            >
              <td>{answer.player.displayName}</td>
              <td
                className="relative"
                style={{
                  background: ` linear-gradient(
                                to right,
                                red ${
                                  (answer.answerTimeLeft /
                                    GameUtil.RESPONSE_TIME) *
                                  100
                                }%,
                                transparent ${
                                  (answer.answerTimeLeft /
                                    GameUtil.RESPONSE_TIME) *
                                  100
                                }%
                              )`,
                }}
              >
                {answer.answerTimeLeft}
              </td>
              <td>{answer.wager ?? "none"}</td>
              <td>
                {answer.result != null ? (
                  GameUtil.GetAnswerResultNameFromEnum(answer.result)
                ) : (
                  <div>
                    <button
                      onClick={() =>
                        getHostClient().AwardPlayerCorrectAnswer(answer.player)
                      }
                    >
                      correct
                    </button>
                    <button
                      onClick={() =>
                        getHostClient().AwardPlayerIncorrectAnswer(
                          answer.player
                        )
                      }
                    >
                      incorrect
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {new Array(players.length - currentTurnData.answerStack.length)
            .fill(0)
            .map((_, i) => (
              <tr key={`extra_${i}`}>
                <td>&nbsp;</td>
                <td />
                <td />
                <td />
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
