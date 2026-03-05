import { Socket } from "socket.io-client";
import { IGameState } from "../JeopardyGame/IGameState";
import { useClientGameStore } from "../store/clientStore";
import Client from "./Client";
import IQuestion from "../JeopardyGame/IQuestion";
import IPlayer from "../JeopardyGame/IPlayer";

export default class HostClient {
  socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  public OnConnection() {
    //set up listeners
    this.socket.on("update-state", (gameState: IGameState) => {
      useClientGameStore.getState().updateState(gameState);
    });

    this.socket.emit("initializeOnConnection");
  }

  public SetCurrentQuestion(question: IQuestion) {
    this.socket.emit("host-set-current-question", question);
  }

  public KickPlayer(player: IPlayer) {
    this.socket.emit("host-kick-player", player);
  }
  public PermanentlyDeletePlayer(player: IPlayer) {
    this.socket.emit("host-permanently-delete-player", player);
  }
  public OpenBuzzer() {
    this.socket.emit("host-open-buzzer");
  }
  public CloseBuzzer() {
    this.socket.emit("host-close-buzzer");
  }
  public NextQuestion() {
    this.socket.emit("host-next-question");
  }
  public ResetGame() {
    this.socket.emit("host-reset-game");
  }

  public AwardPlayerCorrectAnswer(player: IPlayer) {
    this.socket.emit("host-award-player-correct-answer", player);
  }
  public AwardPlayerIncorrectAnswer(player: IPlayer) {
    this.socket.emit("host-award-player-incorrect-answer", player);
  }

  public ResetCurrentQuestion() {
    this.socket.emit("host-reset-current-question");
  }

  public UpdateGoogleSheet(sheetId: string, sheetName: string) {
    this.socket.emit("host-update-google-sheet", {
      sheetId,
      sheetName,
    });
  }
}
