import { Socket } from "socket.io-client";
import Client from "./Client";

export default class GameClient extends Client {
  constructor(socket: Socket) {
    super(socket);
  }

  public initialize(): void {
    console.log("initialize");
    super.initialize();
  }
}
