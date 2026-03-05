import { Server } from "socket.io";
import { useServerGameStore } from "./store/serverStore";

import fs from "fs";
import path from "path";
import { IGameState } from "./JeopardyGame/IGameState";
import IQuestion from "./JeopardyGame/IQuestion";
import IBuzzerSubmitData from "./JeopardyGame/IBuzzerSubmitData";
import IPlayer from "./JeopardyGame/IPlayer";
import { AnswerResult, TurnState } from "./JeopardyGame/IGameTurn";
import GameUtil from "./JeopardyGame/GameUtil";
import PublicGoogleSheetsParser from "public-google-sheets-parser";
import { IJeopardyGameData } from "./JeopardyGame/IJeopardyGameData";

export default class GameServer {
  private static SAVE_PATH = path.resolve(__dirname, "gameState.json");
  private static BUZZ_SUBMIT_WINDOW = 300;
  //this is populated from scratch every time the server resets since
  private server: Server;
  private buzzBufferTimeout: NodeJS.Timeout | null = null;
  private answerCountdownTimeout: NodeJS.Timeout | null = null;
  private questionCountdownTimeout: NodeJS.Timeout | null = null;
  constructor(_server: Server) {
    this.server = _server;

    const unsubscribe = useServerGameStore.subscribe((store, prevStore) => {
      //this is so fucking overkill
      const turnState = GameUtil.GetTurnPhase(store.gameState).turnState;
      if (turnState != TurnState.OPEN) {
        this.ClearQuestionCountdownTimeout();
      }
      if (turnState != TurnState.ANSWER) {
        this.ClearAnswerCountdownTimeout();
      }
    });

    this.loadGameFromDisc();

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
      socket.on("host-permanently-delete-player", (player: IPlayer) => {
        this.getServerStore().permanentlyDeletePlayer(player);
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
        //todo maybe the validation should go here?
        const turnState = GameUtil.GetTurnPhase(this.getGameState()).turnState;
        if (turnState == TurnState.CHOOSING || turnState == TurnState.READING) {
          if (this.getGameState().currentTurnData.question?.id == question.id) {
            this.getServerStore().resetCurrentQuestion();
          } else {
            this.getServerStore().setCurrentQuestion(question);
          }

          this.updateAllClientState();
        } else {
          console.log(
            "cannot update the question if you're not reading a question or choosing a question"
          );
        }
      });

      socket.on("host-update-google-sheet", async (data) => {
        const { sheetId, sheetName } = data;

        try {
          const gameData = await GameServer.CreateQuestionsFromGoogleSheet(
            sheetId,
            sheetName
          );
          this.getServerStore().resetGame();
          this.getServerStore().setQuestions(gameData);
          this.updateAllClientState();
        } catch (e) {
          console.log(e);
        }
      });

      socket.on("host-open-buzzer", () => {
        const turnPhase = GameUtil.GetTurnPhase(this.getGameState());

        if (turnPhase.turnState == TurnState.OPEN) {
          console.log("not opening buzzer, buzzer already open");
          return;
        } else if (
          turnPhase.turnState != TurnState.CHOOSING &&
          turnPhase.gameTurn.question.isDailyDouble
        ) {
          //question won't exist is choosing is true
          console.log("you cannot open buzzers during a daily double question");
          return;
        }
        this.OpenBuzzer();

        this.updateAllClientState();
      });
      socket.on("host-close-buzzer", () => {
        this.getServerStore().closeBuzzer();
        this.updateAllClientState();
      });

      socket.on("host-reset-current-question", () => {
        this.getServerStore().resetCurrentQuestion();
        this.updateAllClientState();
      });

      socket.on("player-submit-buzz", (timestamp) => {
        //do comparrison, set timeout, etc.
        const turnState = GameUtil.GetTurnPhase(this.getGameState()).turnState;
        if (turnState != TurnState.OPEN) {
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
            this.getGameState().currentTurnData.answerStack.some(
              (answer) => answer.player.displayName == fromPlayer.displayName
            )
          ) {
            console.log(
              "player has already attempted an answer on this question, ignoring"
            );
            return;
          }
          this.getServerStore().addBuzzToHistory(buzzerData);
          this.updateAllClientState();
          if (this.buzzBufferTimeout) {
            clearTimeout(this.buzzBufferTimeout);
          }

          this.buzzBufferTimeout = setTimeout(() => {
            //don't update the state to the clients until we've done the timeout nonsense
            const turnState = GameUtil.GetTurnPhase(
              this.getGameState()
            ).turnState;

            if (turnState != TurnState.ANSWER) {
              this.getServerStore().closeBuzzer();
              console.log(
                `choosing from ${
                  this.getGameState().currentTurnData.buzzHistory.length
                } players`
              );
              //todo, make this a function to choose the winner, ideally it would be the top of the buzz history
              const player = [
                ...this.getGameState().currentTurnData.buzzHistory,
              ].sort((a, b) => a.timestamp - b.timestamp)[0]!.player;
              this.getServerStore().GivePlayerChanceToAnswer(player);
              this.ClearAnswerCountdownTimeout();
              this.StartAnswerCountdown();
            }
            this.updateAllClientState();
          }, Math.min(GameServer.BUZZ_SUBMIT_WINDOW, this.getGameState().currentTurnData.questionTimeLeft));
        } else {
          console.error(
            "got a buzz from a player that is not included in players"
          );
        }

        // this.updateAllClientState();
      });

      socket.on("player-place-wager", (amount: number) => {
        const fromPlayer = this.getPlayerBySocketId(socket.id);
        if (fromPlayer) {
          this.getServerStore().placeWager(fromPlayer, amount);
          this.ClearAnswerCountdownTimeout();
          this.StartAnswerCountdown();
          this.updateAllClientState();
        } else {
          console.error("trying to place a wager from an invalid player");
        }
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
        this.getServerStore().AwardPlayerCorrectAnswer(player);
        this.updateAllClientState();
      });
      socket.on("host-award-player-incorrect-answer", (player: IPlayer) => {
        this.getServerStore().AwardPlayerIncorrectAnswer(player);
        if (this.getGameState().currentTurnData.question?.isDailyDouble) {
          this.getServerStore().resolveQuestion();
        } else {
          const playersWhoHaveAnswered =
            this.getGameState().currentTurnData.answerStack.map(
              (answer) => answer.player
            );

          if (
            playersWhoHaveAnswered.length ==
            GameUtil.GetAllConnectedPlayers(this.getGameState()).length
          ) {
            console.log("all the players have answered");
            this.getServerStore().resolveQuestion();
          } else {
            this.OpenBuzzer();
          }
        }

        this.updateAllClientState();
      });
    });
  }

  private OpenBuzzer() {
    if (this.getGameState().currentTurnData.question == null) {
      console.error(
        "cannot open up the buzzer if the current answer is not set"
      );
      return;
    }
    this.getServerStore().openBuzzer();
    let seconds = 10;
    const decrementSeconds = () => {
      this.getServerStore().SetTimeLeftForAllPlayersToAnswer(seconds);
      this.updateAllClientState();
      if (seconds == 0) {
        console.log("time out done");
        if (this.getGameState().currentTurnData.buzzHistory.length == 0) {
          this.getServerStore().resolveQuestion();
        }
        this.updateAllClientState();
        return;
      }

      if (
        GameUtil.GetTurnPhase(this.getGameState()).turnState != TurnState.OPEN
      ) {
        console.log("canceling timeout, no longer in open state");
      }
      seconds -= 1;
      this.questionCountdownTimeout = setTimeout(decrementSeconds, 1000);
    };
    decrementSeconds();
  }

  private StartAnswerCountdown() {
    this.ClearAnswerCountdownTimeout();
    var seconds = 10;
    const decrementSeconds = () => {
      this.getServerStore().SetTimeLeftForPlayerToAnswer(seconds);
      this.updateAllClientState();
      if (seconds == 0) {
        console.log("time out done");
        return;
      }
      seconds -= 1;
      this.answerCountdownTimeout = setTimeout(decrementSeconds, 1000);
    };
    console.log("starting countdown");
    decrementSeconds();
  }

  //todo, maybe this should be wrapped up in gamestate idk
  private ClearAnswerCountdownTimeout() {
    if (this.answerCountdownTimeout) {
      console.log("clearing answer countdown timeout");
      clearTimeout(this.answerCountdownTimeout);
    }
  }
  private ClearQuestionCountdownTimeout() {
    if (this.questionCountdownTimeout) {
      console.log("clearing question countdown timeout");
      clearTimeout(this.questionCountdownTimeout);
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

  private async loadGameFromDisc() {
    if (fs.existsSync(GameServer.SAVE_PATH)) {
      const data = fs.readFileSync(GameServer.SAVE_PATH, "utf-8");
      const parsed: IGameState = JSON.parse(data);
      //when we load the previous state from scratch, we don't want to include the socket ids since they probably don't exist anymore.
      parsed.players = parsed.players.map((player) => ({
        ...player,
        socketId: null,
      }));
      useServerGameStore.setState({ gameState: parsed });
      if (
        GameUtil.GetTurnPhase(this.getGameState()).turnState == TurnState.OPEN
      ) {
        this.OpenBuzzer();
      }
    } else {
      const questions = await GameServer.CreateQuestionsFromGoogleSheet(
        "18r3MSbXelmld3OgPJooMGLPieWx4vaUn5Ssv6jxYx8o",
        "Sheet2"
      );
      this.getServerStore().setQuestions(questions);
    }
  }
  private static cantorPair(x: number, y: number): number {
    if (x < 0 || y < 0) {
      throw new Error("Cantor pairing only works for non-negative integers.");
    }
    const sum = x + y;
    return (sum * (sum + 1)) / 2 + y;
  }

  private static shuffleArr(arr: any[]) {
    const ret = [...arr];
    for (let i = ret.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ret[i], ret[j]] = [ret[j], ret[i]];
    }
    return ret;
  }
  private static CreateQuestions(): IQuestion[][] {
    const ret: IQuestion[][] = [];
    const rows = 5;
    const cols = 6;

    var dailyDoubleOptions = [];

    for (let row = 0; row < rows; row++) {
      ret.push([]);
      for (let col = 0; col < cols; col++) {
        ret[row].push({
          isDailyDouble: false,
          question: `question from row ${row}, col ${col}?`,
          answer: `answer from row ${row}, col ${col}`,
          score: (row + 1) * 100,
          id: GameServer.cantorPair(row, col),
        });

        dailyDoubleOptions.push({ row, col });
      }
    }
    dailyDoubleOptions = this.shuffleArr(dailyDoubleOptions);

    for (let i = 0; i < 2; i++) {
      const pos = dailyDoubleOptions[i];
      ret[pos.row][pos.col].isDailyDouble = true;
    }
    return ret;
  }

  private static async CreateQuestionsFromGoogleSheet(
    spreadsheetId: string,
    sheetName: string
  ): Promise<IJeopardyGameData> {
    console.log(spreadsheetId, sheetName);
    const parser = new PublicGoogleSheetsParser(spreadsheetId, sheetName);
    const ret: IQuestion[][] = [];
    var dailyDoubleOptions = [];
    const parsed = await parser.parse();
    const categories = Object.keys(parsed[0]) as string[];
    const rawQuestions = parsed.map((row) => Object.values(row)) as string[][];
    for (let row = 0; row < 5; row++) {
      ret.push([]);
      for (let col = 0; col < 6; col++) {
        const rowIndex = row * 2;
        ret[row].push({
          isDailyDouble: false,
          question: rawQuestions[rowIndex][col],
          answer: rawQuestions[rowIndex + 1][col],
          score: (row + 1) * 100,
          id: GameServer.cantorPair(row, col),
        });
        dailyDoubleOptions.push({ row, col });
      }
    }
    dailyDoubleOptions = this.shuffleArr(dailyDoubleOptions);

    for (let i = 0; i < 2; i++) {
      const pos = dailyDoubleOptions[i];
      ret[pos.row][pos.col].isDailyDouble = true;
    }
    return {
      categories,
      questions: ret,
    } as IJeopardyGameData;
  }
}
