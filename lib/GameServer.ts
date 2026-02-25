import { Server } from "socket.io";
import { useServerGameStore } from "./store/serverStore";

import fs from "fs";
import path from "path";
import { IGameState } from "./JeopardyGame/IGameState";
import IQuestion from "./JeopardyGame/IQuestion";
import IBuzzerSubmitData from "./JeopardyGame/IBuzzerSubmitData";
import IPlayer from "./JeopardyGame/IPlayer";
import { AnswerResult, TurnState } from "./JeopardyGame/IGameTurn";

export default class GameServer {
  private static SAVE_PATH = path.resolve(__dirname, "gameState.json");

  //this is populated from scratch every time the server resets since
  private server: Server;
  private buzzBufferTimeout: NodeJS.Timeout | null = null;
  private countdownTimeout: NodeJS.Timeout | null = null;
  constructor(_server: Server) {
    this.server = _server;
    this.loadGameFromDisc();
    this.getServerStore().setQuestions(GameServer.CreateQuestions());
    this.server.on("connection", (socket) => {
      this.updateAllClientState();
      socket.on("disconnect", (reason) => {
        this.getServerStore().disconnectPlayer(socket.id);
        this.updateAllClientState();
      });

      socket.on("initializeOnConnection", (socket) => {
        //todo, I think I can send this directly to the player instead of emitting to everyone
        this.updateAllClientState();
      });

      socket.on("host-kick-player", (player: IPlayer) => {
        if (player.socketId) {
          this.getServerStore().disconnectPlayer(player.socketId);
        }
        this.updateAllClientState();
      });

      socket.on("joinGame", (data) => {
        const { socketId, username } = data;

        this.getServerStore().connectPlayer({
          displayName: username,
          socketId,
        });
        this.updateAllClientState();
      });

      socket.on("host-set-current-question", (question: IQuestion) => {
        console.log(question);
        //todo maybe the validation should go here?
        this.getServerStore().setCurrentQuestion(question);
        this.updateAllClientState();
      });

      socket.on("host-open-buzzer", () => {
        this.getServerStore().openBuzzer();
        this.updateAllClientState();
      });
      socket.on("host-close-buzzer", () => {
        this.getServerStore().closeBuzzer();
        this.updateAllClientState();
      });

      socket.on("player-submit-buzz", (timestamp) => {
        //do comparrison, set timeout, etc.
        if (this.getGameState().currentTurnData.turnState != TurnState.OPEN) {
          console.log("tried buzzing while the turn was not open, ignoring..");
          return;
        }
        const fromPlayer = this.getPlayerBySocketId(socket.id);
        if (fromPlayer) {
          const buzzerData: IBuzzerSubmitData = {
            timestamp,
            player: fromPlayer,
          };
          if (
            this.getGameState().currentTurnData.buzzHistory.some(
              (buzzData) =>
                buzzData.player.displayName == fromPlayer.displayName
            )
          ) {
            console.log("preventing player from answering twice");
            return;
          }
          if (
            this.getGameState().currentTurnData.answerHistory.some(
              (answer) => answer.player.displayName == fromPlayer.displayName
            )
          ) {
            console.log(
              "player has already attempted an answer on this question"
            );
            return;
          }
          this.getServerStore().addBuzzToHistory(buzzerData);
          this.getServerStore().closeBuzzer();
          if (this.buzzBufferTimeout) {
            clearTimeout(this.buzzBufferTimeout);
          }
          this.buzzBufferTimeout = setTimeout(() => {
            //don't update the state to the clients until we've done the timeout nonsense
            var fromState = this.getGameState().currentTurnData.turnState;
            this.getServerStore().givePlayerChanceToAnswer();
            if (fromState != this.getGameState().currentTurnData.turnState) {
              console.log("start countdown");
              this.ClearCountdownTimeout();
              var seconds = 10;
              const decrementSeconds = () => {
                this.getServerStore().SetTimeLeftToAnswer(seconds);
                this.updateAllClientState();
                if (seconds == 0) {
                  console.log("time out done");
                  return;
                }
                if (
                  this.getGameState().currentTurnData.answerHistory.some(
                    (answer) => answer.result == AnswerResult.CORRECT
                  )
                ) {
                  console.log(
                    "canceling timer... someone got the right answer!"
                  );
                  return;
                }
                seconds -= 1;
                this.countdownTimeout = setTimeout(decrementSeconds, 1000);
              };
              console.log("starting countdown");
              decrementSeconds();
            }
            this.updateAllClientState();
          }, 300);
        } else {
          console.error(
            "got a buzz from a player that is not included in players"
          );
        }

        // this.updateAllClientState();
      });

      socket.on("host-next-question", () => {
        this.getServerStore().nextQuestion();
        this.updateAllClientState();
      });

      socket.on("host-reset-game", () => {
        this.getServerStore().resetGame();
        this.updateAllClientState();
      });
      socket.on("host-award-player-correct-answer", (player: IPlayer) => {
        this.ClearCountdownTimeout();
        this.getServerStore().AwardPlayerCorrectAnswer(player);
        this.updateAllClientState();
      });
      socket.on("host-award-player-incorrect-answer", (player: IPlayer) => {
        this.ClearCountdownTimeout();
        this.getServerStore().AwardPlayerIncorrectAnswer(player);
        this.updateAllClientState();
      });
    });
  }
  //todo, maybe this should be wrapped up in gamestate idk
  private ClearCountdownTimeout() {
    if (this.countdownTimeout) {
      console.log("clearing countdown timeout");
      clearTimeout(this.countdownTimeout);
    }
  }
  private getPlayerBySocketId(socketId: string): IPlayer | null {
    return (
      this.getGameState().players.find(
        (player) => socketId == player.socketId
      ) || null
    );
  }
  private updateAllClientState() {
    this.server.emit("update-state", this.getGameState());
    this.saveGame();
  }
  private getServerStore() {
    return useServerGameStore.getState();
  }
  private getGameState(): IGameState {
    return this.getServerStore().gameState;
  }
  private saveGame() {
    console.log("saving game...");
    const state = useServerGameStore.getState().gameState;
    fs.writeFileSync(GameServer.SAVE_PATH, JSON.stringify(state, null, 2));
  }

  private loadGameFromDisc() {
    if (fs.existsSync(GameServer.SAVE_PATH)) {
      const data = fs.readFileSync(GameServer.SAVE_PATH, "utf-8");
      const parsed: IGameState = JSON.parse(data);
      console.log(parsed);
      //when we load the previous state from scratch, we don't want to include the socket ids since they probably don't exist anymore.
      parsed.players = [];
      useServerGameStore.setState({ gameState: parsed });
    }
  }
  private static cantorPair(x: number, y: number): number {
    if (x < 0 || y < 0) {
      throw new Error("Cantor pairing only works for non-negative integers.");
    }

    const sum = x + y;
    return (sum * (sum + 1)) / 2 + y;
  }
  private static CreateQuestions(): IQuestion[][] {
    const ret: IQuestion[][] = [];
    for (let row = 0; row < 5; row++) {
      ret.push([]);
      for (let col = 0; col < 6; col++) {
        ret[row].push({
          question: "what?",
          answer: "answer",
          score: row * 100,
          id: GameServer.cantorPair(row, col),
        });
      }
    }
    return ret;
  }
}
