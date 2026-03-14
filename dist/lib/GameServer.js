"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverStore_1 = require("./store/serverStore");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const IGameTurn_1 = require("./JeopardyGame/IGameTurn");
const GameUtil_1 = __importDefault(require("./JeopardyGame/GameUtil"));
const public_google_sheets_parser_1 = __importDefault(require("public-google-sheets-parser"));
class GameServer {
    constructor(_server) {
        this.buzzBufferTimeout = null;
        this.answerCountdownTimeout = null;
        this.questionCountdownTimeout = null;
        this.server = _server;
        const unsubscribe = serverStore_1.useServerGameStore.subscribe((store, prevStore) => {
            //this is so fucking overkill
            const turnState = GameUtil_1.default.GetTurnPhase(store.gameState).turnState;
            if (turnState != IGameTurn_1.TurnState.OPEN) {
                this.ClearQuestionCountdownTimeout();
            }
            if (turnState != IGameTurn_1.TurnState.ANSWER) {
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
            socket.on("host-kick-player", (player) => {
                if (player.socketId) {
                    this.getServerStore().disconnectPlayer(player.socketId);
                }
                this.updateAllClientState();
            });
            socket.on("host-permanently-delete-player", (player) => {
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
            socket.on("host-set-current-question", (question) => {
                var _a;
                //todo maybe the validation should go here?
                const turnState = GameUtil_1.default.GetTurnPhase(this.getGameState()).turnState;
                if (turnState == IGameTurn_1.TurnState.CHOOSING || turnState == IGameTurn_1.TurnState.READING) {
                    if (((_a = this.getGameState().currentTurnData.question) === null || _a === void 0 ? void 0 : _a.id) == question.id) {
                        this.getServerStore().resetCurrentQuestion();
                    }
                    else {
                        this.getServerStore().setCurrentQuestion(question);
                    }
                    this.updateAllClientState();
                }
                else {
                    console.log("cannot update the question if you're not reading a question or choosing a question");
                }
            });
            socket.on("host-update-google-sheet", async (data) => {
                const { sheetId, sheetName, isDoubleJeopardy } = data;
                try {
                    const gameData = await GameServer.CreateQuestionsFromGoogleSheet(sheetId, sheetName, isDoubleJeopardy);
                    // this.getServerStore().resetGame();
                    this.getServerStore().setQuestions(gameData);
                    this.updateAllClientState();
                }
                catch (e) {
                    console.log(e);
                }
            });
            socket.on("host-open-buzzer", () => {
                const turnPhase = GameUtil_1.default.GetTurnPhase(this.getGameState());
                // if (turnPhase.turnState == TurnState.OPEN) {
                //   console.log("not opening buzzer, buzzer already open");
                //   return;
                // } else
                if (turnPhase.turnState != IGameTurn_1.TurnState.CHOOSING &&
                    turnPhase.gameTurn.question.isDailyDouble) {
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
                    this.getServerStore().SubmitFinalJeopardyAnswer(fromPlayer, answer, wager);
                    this.updateAllClientState();
                }
                else {
                    console.error("got a buzz from a player that is not included in players");
                }
            });
            socket.on("player-submit-buzz", (timestamp) => {
                //do comparrison, set timeout, etc.
                const turnPhase = GameUtil_1.default.GetTurnPhase(this.getGameState());
                if (turnPhase.turnState != IGameTurn_1.TurnState.OPEN) {
                    console.log("tried buzzing while the turn was not open, ignoring..");
                    return;
                }
                if (turnPhase.turnState == IGameTurn_1.TurnState.OPEN &&
                    turnPhase.gameTurn.isFinalJeopardy) {
                    console.log("cannot buzz in during final jeopardy");
                    return;
                }
                const fromPlayer = this.getPlayerBySocketId(socket.id);
                if (fromPlayer) {
                    const buzzerData = {
                        timestamp,
                        player: fromPlayer,
                    };
                    if (this.getGameState().currentTurnData.buzzHistory.some((buzzData) => buzzData.player.displayName == fromPlayer.displayName)) {
                        console.log("preventing player from answering twice");
                        return;
                    }
                    if (turnPhase.gameTurn.answerStack.some((answer) => answer.player.displayName == fromPlayer.displayName)) {
                        console.log("player has already attempted an answer on this question, ignoring");
                        return;
                    }
                    this.getServerStore().addBuzzToHistory(buzzerData);
                    this.updateAllClientState();
                    if (this.buzzBufferTimeout) {
                        clearTimeout(this.buzzBufferTimeout);
                    }
                    this.buzzBufferTimeout = setTimeout(() => {
                        //don't update the state to the clients until we've done the timeout nonsense
                        const turnState = GameUtil_1.default.GetTurnPhase(this.getGameState()).turnState;
                        if (turnState != IGameTurn_1.TurnState.ANSWER) {
                            this.getServerStore().closeBuzzer();
                            console.log(`choosing from ${this.getGameState().currentTurnData.buzzHistory.length} players`);
                            //todo, make this a function to choose the winner, ideally it would be the top of the buzz history
                            const playersWhoBuzzedIn = this.getGameState().currentTurnData.buzzHistory.map((buzz) => buzz.player);
                            const chosenPlayer = playersWhoBuzzedIn[Math.floor(playersWhoBuzzedIn.length * Math.random())];
                            this.getServerStore().GivePlayerChanceToAnswer(chosenPlayer);
                            this.ClearAnswerCountdownTimeout();
                            this.StartAnswerCountdown();
                        }
                        this.updateAllClientState();
                    }, Math.min(GameServer.BUZZ_SUBMIT_WINDOW));
                }
                else {
                    console.error("got a buzz from a player that is not included in players");
                }
            });
            socket.on("player-place-wager", (amount) => {
                const fromPlayer = this.getPlayerBySocketId(socket.id);
                if (fromPlayer) {
                    this.getServerStore().placeWager(fromPlayer, amount);
                    this.ClearAnswerCountdownTimeout();
                    this.StartAnswerCountdown();
                    this.updateAllClientState();
                }
                else {
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
            socket.on("host-award-player-correct-answer", (player) => {
                this.getServerStore().AwardPlayerCorrectAnswer(player);
                this.updateAllClientState();
            });
            socket.on("host-award-player-incorrect-answer", (player) => {
                var _a;
                this.getServerStore().AwardPlayerIncorrectAnswer(player);
                if ((_a = this.getGameState().currentTurnData.question) === null || _a === void 0 ? void 0 : _a.isDailyDouble) {
                    this.getServerStore().resolveQuestion();
                }
                else {
                    const playersWhoHaveAnswered = this.getGameState().currentTurnData.answerStack.map((answer) => answer.player);
                    if (playersWhoHaveAnswered.length ==
                        GameUtil_1.default.GetAllConnectedPlayers(this.getGameState()).length) {
                        console.log("all the players have answered");
                        this.getServerStore().resolveQuestion();
                    }
                    else {
                        if (!this.getGameState().currentTurnData.isFinalJeopardy) {
                            this.OpenBuzzer();
                        }
                    }
                }
                this.updateAllClientState();
            });
        });
    }
    OpenBuzzer() {
        this.ClearQuestionCountdownTimeout();
        if (this.getGameState().currentTurnData.question == null) {
            console.error("cannot open up the buzzer if the current answer is not set");
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
    StartAnswerCountdown() {
        this.ClearAnswerCountdownTimeout();
        var seconds = this.getGameState().currentTurnData.answerStack[0].answerTimeLeft;
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
    ClearAnswerCountdownTimeout() {
        if (this.answerCountdownTimeout) {
            console.log("clearing answer countdown timeout");
            clearTimeout(this.answerCountdownTimeout);
        }
    }
    ClearQuestionCountdownTimeout() {
        if (this.questionCountdownTimeout) {
            console.log("clearing question countdown timeout");
            clearTimeout(this.questionCountdownTimeout);
        }
    }
    getPlayerBySocketId(socketId) {
        return (this.getGameState().players.find((player) => socketId == player.socketId) || null);
    }
    updateAllClientState() {
        this.server.emit("update-state", this.getGameState());
        this.saveGame();
    }
    getServerStore() {
        return serverStore_1.useServerGameStore.getState();
    }
    getGameState() {
        return this.getServerStore().gameState;
    }
    saveGame() {
        console.log("saving game...");
        const state = serverStore_1.useServerGameStore.getState().gameState;
        fs_1.default.writeFileSync(GameServer.SAVE_PATH, JSON.stringify(state, null, 2));
    }
    async loadGameFromDisc() {
        if (fs_1.default.existsSync(GameServer.SAVE_PATH)) {
            const data = fs_1.default.readFileSync(GameServer.SAVE_PATH, "utf-8");
            const parsed = JSON.parse(data);
            //when we load the previous state from scratch, we don't want to include the socket ids since they probably don't exist anymore.
            parsed.players = parsed.players.map((player) => ({
                ...player,
                socketId: null,
            }));
            serverStore_1.useServerGameStore.setState({ gameState: parsed });
            const turnPhase = GameUtil_1.default.GetTurnPhase(this.getGameState());
            console.log(turnPhase.turnState == IGameTurn_1.TurnState.OPEN, GameUtil_1.default.GetBuzzerStateStringFromEnum(turnPhase.gameTurn.buzzerState));
            if (turnPhase.turnState == IGameTurn_1.TurnState.OPEN) {
                this.OpenBuzzer();
            }
        }
        else {
            const questions = await GameServer.CreateQuestionsFromGoogleSheet("18r3MSbXelmld3OgPJooMGLPieWx4vaUn5Ssv6jxYx8o", "Sheet2", false);
            this.getServerStore().setQuestions(questions);
        }
    }
    static cantorPair(x, y) {
        if (x < 0 || y < 0) {
            throw new Error("Cantor pairing only works for non-negative integers.");
        }
        const sum = x + y;
        return (sum * (sum + 1)) / 2 + y;
    }
    static shuffleArr(arr) {
        const ret = [...arr];
        for (let i = ret.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ret[i], ret[j]] = [ret[j], ret[i]];
        }
        return ret;
    }
    static async CreateQuestionsFromGoogleSheet(spreadsheetId, sheetName, isDoubleJeopardy) {
        const parser = new public_google_sheets_parser_1.default(spreadsheetId, sheetName);
        const ret = [];
        var dailyDoubleOptions = [];
        const parsed = await parser.parse();
        const categories = Object.keys(parsed[0]);
        const rawQuestions = parsed.map((row) => Object.values(row));
        for (let row = 0; row < GameUtil_1.default.ROWS; row++) {
            ret.push([]);
            for (let col = 0; col < GameUtil_1.default.COLS; col++) {
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
        };
    }
}
GameServer.SAVE_PATH = path_1.default.resolve(__dirname, "gameState.json");
GameServer.BUZZ_SUBMIT_WINDOW = 400;
exports.default = GameServer;
