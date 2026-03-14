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
  private static BUZZ_SUBMIT_WINDOW = 400;
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
        const { sheetId, sheetName, isDoubleJeopardy } = data;

        try {
          const gameData = await GameServer.CreateQuestionsFromGoogleSheet(
            sheetId,
            sheetName,
            isDoubleJeopardy
          );
          // this.getServerStore().resetGame();
          this.getServerStore().setQuestions(gameData);
          this.updateAllClientState();
        } catch (e) {
          console.log(e);
        }
      });

      socket.on("host-open-buzzer", () => {
        const turnPhase = GameUtil.GetTurnPhase(this.getGameState());
        // if (turnPhase.turnState == TurnState.OPEN) {
        //   console.log("not opening buzzer, buzzer already open");
        //   return;
        // } else
        if (
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

      socket.on("player-submit-final-jeopardy", ({ answer, wager }) => {
        const fromPlayer = this.getPlayerBySocketId(socket.id);
        if (fromPlayer) {
          this.getServerStore().SubmitFinalJeopardyAnswer(
            fromPlayer,
            answer,
            wager
          );
          this.updateAllClientState();
        } else {
          console.error(
            "got a buzz from a player that is not included in players"
          );
        }
      });

      socket.on("player-submit-buzz", (timestamp) => {
        //do comparrison, set timeout, etc.
        const turnPhase = GameUtil.GetTurnPhase(this.getGameState());
        if (turnPhase.turnState != TurnState.OPEN) {
          console.log("tried buzzing while the turn was not open, ignoring..");
          return;
        }
        if (
          turnPhase.turnState == TurnState.OPEN &&
          turnPhase.gameTurn.isFinalJeopardy
        ) {
          console.log("cannot buzz in during final jeopardy");
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
            turnPhase.gameTurn.answerStack.some(
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
              const playersWhoBuzzedIn =
                this.getGameState().currentTurnData.buzzHistory.map(
                  (buzz) => buzz.player
                );
              const chosenPlayer =
                playersWhoBuzzedIn[
                  Math.floor(playersWhoBuzzedIn.length * Math.random())
                ];
              this.getServerStore().GivePlayerChanceToAnswer(chosenPlayer);
              this.ClearAnswerCountdownTimeout();
              this.StartAnswerCountdown();
            }
            this.updateAllClientState();
          }, Math.min(GameServer.BUZZ_SUBMIT_WINDOW));
        } else {
          console.error(
            "got a buzz from a player that is not included in players"
          );
        }
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

      socket.on("host-prev-question", () => {
        console.log("pevv");
        this.getServerStore().prevQuestion();
        this.updateAllClientState();
      });
      socket.on("host-start-final-jeopardy", () => {
        this.getServerStore().startFinalJeopardy();
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
            if (!this.getGameState().currentTurnData.isFinalJeopardy) {
              this.OpenBuzzer();
            }
          }
        }

        this.updateAllClientState();
      });
    });
  }

  private OpenBuzzer() {
    this.ClearQuestionCountdownTimeout();
    if (this.getGameState().currentTurnData.question == null) {
      console.error(
        "cannot open up the buzzer if the current answer is not set"
      );
      return;
    }
    console.log("open buzzer");
    this.getServerStore().openBuzzer();
    let seconds = this.getGameState().currentTurnData.questionTimeLeft;
    const decrementSeconds = () => {
      this.getServerStore().SetTimeLeftForAllPlayersToAnswer(seconds);
      if (seconds == 0) {
        console.log("time out done");
        if (this.getGameState().currentTurnData.buzzHistory.length == 0) {
          this.getServerStore().resolveQuestion();
        }
        this.updateAllClientState();
        return;
      }
      seconds -= 1;
      this.questionCountdownTimeout = setTimeout(decrementSeconds, 1000);
      this.updateAllClientState();
    };
    decrementSeconds();
  }

  private StartAnswerCountdown() {
    this.ClearAnswerCountdownTimeout();
    var seconds =
      this.getGameState().currentTurnData.answerStack[0].answerTimeLeft;
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
      const turnPhase = GameUtil.GetTurnPhase(this.getGameState());
      console.log(
        turnPhase.turnState == TurnState.OPEN,
        GameUtil.GetBuzzerStateStringFromEnum(turnPhase.gameTurn.buzzerState)
      );
      if (turnPhase.turnState == TurnState.OPEN) {
        this.OpenBuzzer();
      }
    } else {
      const questions = await GameServer.CreateQuestionsFromGoogleSheet(
        "18r3MSbXelmld3OgPJooMGLPieWx4vaUn5Ssv6jxYx8o",
        "Sheet2",
        false
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

  private static async CreateQuestionsFromGoogleSheet(
    spreadsheetId: string,
    sheetName: string,
    isDoubleJeopardy: boolean
  ): Promise<IJeopardyGameData> {
    const parser = new PublicGoogleSheetsParser(spreadsheetId, sheetName);
    const ret: IQuestion[][] = [];
    var dailyDoubleOptions = [];
    const parsed = await parser.parse();
    const categories = Object.keys(parsed[0]) as string[];
    const rawQuestions = parsed.map((row) => Object.values(row)) as string[][];
    for (let row = 0; row < GameUtil.ROWS; row++) {
      ret.push([]);
      for (let col = 0; col < GameUtil.COLS; col++) {
        const rowIndex = row * 2;
        ret[row].push({
          isDailyDouble: false,
          question: rawQuestions[rowIndex][col],
          answer: rawQuestions[rowIndex + 1][col],
          score: (row + 1) * 200 * (isDoubleJeopardy ? 2 : 1),
          id: `${isDoubleJeopardy ? "double" : "single"}_${row}_${col}`,
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
