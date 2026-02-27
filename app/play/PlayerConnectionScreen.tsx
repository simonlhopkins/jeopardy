import PlayerClient from "@/lib/Client/PlayerClient";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { useClientGameStore } from "@/lib/store/clientStore";

interface Props {
  gameState: IGameState;
  getPlayerClient: () => PlayerClient;
}
export default function PlayerConnectionScreen({
  gameState,
  getPlayerClient,
}: Props) {
  const username = useClientGameStore((store) => store.username);
  const setUsername = useClientGameStore((state) => state.setUsername);
  const joinGameDisabled = gameState.players.some(
    (player) => player.displayName == username && player.socketId != null
  );
  const showReconnect = gameState.players.some(
    (player) => player.displayName == username && player.socketId == null
  );
  return (
    <div>
      <input
        type="text"
        placeholder="Enter username"
        value={username || ""}
        onChange={(e) => {
          console.log(e.target.value);
          setUsername(e.target.value);
        }}
      />
      <button
        disabled={joinGameDisabled}
        className="btn"
        onClick={() => {
          if (username) {
            getPlayerClient().JoinGame(username);
          }
        }}
      >
        {showReconnect ? "reconnect" : "join game"}
      </button>
    </div>
  );
}
