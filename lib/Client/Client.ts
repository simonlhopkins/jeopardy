import { Socket } from "socket.io-client";
import { IGameState } from "../JeopardyGame/IGameState";
import { useClientGameStore } from "../store/clientStore";

export default class Client {
  socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }
  public initialize() {
    if (this.socket.connected) {
      this.socket.emit("initializeOnConnection");
    }
    this.socket.on("update-state", (gameState: IGameState) => {
      useClientGameStore.getState().updateState(gameState);
    });

    this.socket.on("connect", () => {
      this.socket.emit("initializeOnConnection");
    });
  }
}
