import HostClient from "@/lib/Client/HostClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { useDeepEqualGameStore } from "@/lib/store/clientStore";
import clsx from "clsx";
import { useMemo } from "react";

interface Props {
  getHostClient(): HostClient;
}

export default function PlayerStatusArea({ getHostClient }: Props) {
  //todo, memoize scores to gamestate.history

  const history = useDeepEqualGameStore((state) => state.gameState.history);
  const currentTurnData = useDeepEqualGameStore(
    (state) => state.gameState.currentTurnData
  );
  const players = useDeepEqualGameStore((state) => state.gameState.players);
  const historicalScores = useMemo(() => {
    console.log("recalculate scores history");
    const scoreMap = new Map<string, number>();
    for (const player of players) {
      scoreMap.set(
        player.displayName,
        GameUtil.GetPlayerScore(player.displayName, history)
      );
    }
    return scoreMap;
  }, [history, players]);

  const playerWhoShouldBeChoosingQuestion = useMemo(() => {
    return GameUtil.GetPersonWhoShouldBeChoosingQuestion(history, players);
  }, [history, players]);

  //then add the current turn score to it
  const currentScores = new Map<string, number>();
  for (const [key, value] of historicalScores) {
    currentScores.set(
      key,
      value + GameUtil.GetPlayerScore(key, [currentTurnData])
    );
  }
  return (
    <div>
      <table>
        <caption>Player Status</caption>

        <thead>
          <tr>
            <th>Player Name</th>
            <th>Socket ID</th>
            <th>Score</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => (
            <tr
              key={i}
              className={clsx(
                playerWhoShouldBeChoosingQuestion?.displayName ==
                  player.displayName && "text-blue-500"
              )}
            >
              <td>{player.displayName}</td>
              <td>{player.socketId}</td>
              <td>
                {currentScores.get(player.displayName) ?? "no score found"}
              </td>
              <td>
                <button
                  className={"cursor-pointer"}
                  onClick={() => getHostClient().KickPlayer(player)}
                >
                  🛜
                </button>
              </td>
              <td>
                <button
                  className={"cursor-pointer"}
                  onClick={() =>
                    getHostClient().PermanentlyDeletePlayer(player)
                  }
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
