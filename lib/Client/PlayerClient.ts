import { Socket } from "socket.io-client";
import { IGameState } from "../JeopardyGame/IGameState";
import { useClientGameStore } from "../store/clientStore";
import IBuzzerSubmitData from "../JeopardyGame/IBuzzerSubmitData";

export default class PlayerClient {
  socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  public OnConnection() {
    //set up listeners
    //this might be unnecessary and lead to bugs
    this.socket.on("update-state", (gameState: IGameState) => {
      if (
        gameState.players.some((player) => player.socketId == this.socket.id)
      ) {
        useClientGameStore.getState().updateState(gameState);
      } else {
        useClientGameStore.getState().onlyUpdatePlayers(gameState);
        console.warn(
          `ignoring state update since there are no players in the game with socket id ${this.socket.id}`
        );
      }
    });
    this.socket.emit("initializeOnConnection");
  }

  public JoinGame(username: string) {
    this.socket.emit("joinGame", {
      username,
      socketId: this.socket.id,
    });
  }

  public SubmitBuzz() {
    this.socket.emit("player-submit-buzz", Date.now());
  }
}
