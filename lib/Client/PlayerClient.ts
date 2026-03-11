import { Socket } from "socket.io-client";
import { IGameState } from "../JeopardyGame/IGameState";
import { useClientGameStore } from "../store/clientStore";
import IBuzzerSubmitData from "../JeopardyGame/IBuzzerSubmitData";

export default class PlayerClient {
  private socket: Socket | null = null;
  constructor() {}

  public OnConnection(socket: Socket) {
    //set up listeners
    //this might be unnecessary and lead to bugs
    this.socket = socket;
    socket.on("update-state", (gameState: IGameState) => {
      if (gameState.players.some((player) => player.socketId == socket.id)) {
        useClientGameStore.getState().updateState(gameState);
      } else {
        useClientGameStore.getState().onlyUpdatePlayers(gameState);
      }
    });
    socket.emit("initializeOnConnection");
  }

  public JoinGame(username: string) {
    if (!this.socket) {
      console.log("socket does not exist yet");
      return;
    }
    this.socket.emit("joinGame", {
      username,
      socketId: this.socket.id,
    });
  }

  public SubmitBuzz() {
    if (!this.socket) {
      console.log("socket does not exist yet");
      return;
    }
    this.socket.emit("player-submit-buzz", Date.now());
  }
  public PlaceWager(amount: number) {
    if (!this.socket) {
      console.log("socket does not exist yet");
      return;
    }
    this.socket.emit("player-place-wager", amount);
  }
}
