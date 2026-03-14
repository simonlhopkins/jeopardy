"use server";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useServerGameStore = void 0;
// server/gameStore.ts
const zustand_1 = require("zustand");
const IGameState_1 = require("../JeopardyGame/IGameState");
const IGameTurn_1 = require("../JeopardyGame/IGameTurn");
const GameUtil_1 = __importDefault(require("../JeopardyGame/GameUtil"));
exports.useServerGameStore = (0, zustand_1.create)((set, get) => ({
    gameState: (0, IGameState_1.DefaultGameState)(),
    connectPlayer: (newPlayer) => set((store) => {
        const state = { ...store.gameState };
        //clear all players who might have this socket
        state.players = state.players.map((player) => player.socketId == newPlayer.socketId
            ? {
                ...player,
                socketId: null,
            }
            : player);
        //check to see if the player with this name is already in the players, if they are, then update the socket number
        var existingPlayerIndex = state.players.findIndex((player) => player.displayName == newPlayer.displayName);
        if (existingPlayerIndex >= 0) {
            state.players[existingPlayerIndex] = newPlayer;
        }
        else {
            state.players.push(newPlayer);
        }
        return { gameState: state };
    }),
    setQuestions: (gameData) => set((store) => {
        const state = { ...store.gameState };
        state.questions = gameData.questions;
        state.categories = gameData.categories;
        return { gameState: state };
    }),
    setCurrentQuestion: (question) => set((store) => {
        const state = { ...store.gameState };
        state.currentTurnData.question = question;
        //todo, validation this is a valid question
        return { gameState: state };
    }),
    disconnectPlayer: (socketId) => set((store) => {
        console.log("removing player: " + socketId);
        const state = { ...store.gameState };
        var existingPlayerIndex = state.players.findIndex((player) => player.socketId == socketId);
        if (existingPlayerIndex >= 0) {
            state.players[existingPlayerIndex].socketId = null;
        }
        return { gameState: state };
    }),
    permanentlyDeletePlayer: (playerToRemove) => set((store) => {
        const state = { ...store.gameState };
        state.players = state.players.filter((player) => !(player.displayName == playerToRemove.displayName));
        return { gameState: state };
    }),
    openBuzzer: () => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.buzzerState = IGameState_1.BuzzerState.OPEN;
        currentTurnData.questionTimeLeft = store.gameState.currentTurnData
            .isFinalJeopardy
            ? 30
            : GameUtil_1.default.RESPONSE_TIME;
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    closeBuzzer: () => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.buzzerState = IGameState_1.BuzzerState.CLOSED;
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    //todo, I can manipulate the sort here to give an advantage to certain players
    addBuzzToHistory: (buzzData) => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.buzzHistory.push(buzzData);
        currentTurnData.buzzHistory.sort((a, b) => a.timestamp - b.timestamp);
        return {
            gameState: { ...store.gameState, currentTurnData },
        };
    }),
    placeWager: (fromPlayer, amount) => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.answerStack.unshift({
            answerTimeLeft: 10,
            player: fromPlayer,
            wager: amount,
            result: null,
            finalJeopardyAnswer: null,
        });
        return {
            gameState: { ...store.gameState, currentTurnData },
        };
    }),
    nextQuestion: () => set((store) => {
        const newHistory = [
            ...store.gameState.history,
            store.gameState.currentTurnData,
        ];
        return {
            gameState: {
                ...store.gameState,
                history: newHistory,
                currentTurnData: {
                    isFinalJeopardy: false,
                    buzzerState: IGameState_1.BuzzerState.CLOSED,
                    question: null,
                    buzzHistory: [],
                    answerStack: [],
                    questionTimeLeft: GameUtil_1.default.BUZZ_IN_WINDOW_TIME,
                },
            },
        };
    }),
    prevQuestion: () => set((store) => {
        const newGameTurn = store.gameState.history.pop();
        return {
            gameState: {
                ...store.gameState,
                history: store.gameState.history,
                currentTurnData: newGameTurn,
            },
        };
    }),
    startFinalJeopardy: () => set((store) => {
        const newHistory = [
            ...store.gameState.history,
            store.gameState.currentTurnData,
        ];
        return {
            gameState: {
                ...store.gameState,
                history: newHistory,
                currentTurnData: {
                    isFinalJeopardy: true,
                    buzzerState: IGameState_1.BuzzerState.CLOSED,
                    question: {
                        id: "final",
                        question: "Affectionately named Nigel, this small, furry mammal was one of Kendra’s earliest pets.",
                        answer: "Rabbit",
                        score: 0,
                        isDailyDouble: false,
                        buzzHistory: [],
                        answerStack: [],
                    },
                    buzzHistory: [],
                    answerStack: [],
                    questionTimeLeft: 10,
                },
            },
        };
    }),
    resolveQuestion: () => set((store) => {
        return {
            gameState: {
                ...store.gameState,
                currentTurnData: {
                    ...store.gameState.currentTurnData,
                    buzzerState: IGameState_1.BuzzerState.CLOSED,
                },
            },
        };
    }),
    resetGame: () => set((store) => ({
        gameState: {
            ...store.gameState,
            history: [],
            currentTurnData: {
                isFinalJeopardy: false,
                buzzerState: IGameState_1.BuzzerState.CLOSED,
                question: null,
                buzzHistory: [],
                answerStack: [],
                questionTimeLeft: GameUtil_1.default.BUZZ_IN_WINDOW_TIME,
            },
        },
    })),
    resetCurrentQuestion: () => set((store) => ({
        gameState: {
            ...store.gameState,
            currentTurnData: {
                isFinalJeopardy: false,
                buzzerState: IGameState_1.BuzzerState.CLOSED,
                question: null,
                buzzHistory: [],
                answerStack: [],
                questionTimeLeft: GameUtil_1.default.BUZZ_IN_WINDOW_TIME,
            },
        },
    })),
    AwardPlayerCorrectAnswer: (player) => set((store) => {
        //todo add points to a leaderboard
        const currentTurnData = store.gameState.currentTurnData;
        currentTurnData.answerStack = currentTurnData.answerStack.map((answer) => answer.player.displayName == player.displayName
            ? {
                ...answer,
                result: IGameTurn_1.AnswerResult.CORRECT,
            }
            : answer);
        currentTurnData.buzzHistory = [];
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    AwardPlayerIncorrectAnswer: (player) => set((store) => {
        //don't open the buzzer here. Do that in a separate mutation
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.answerStack = currentTurnData.answerStack.map((answer) => answer.player.displayName == player.displayName
            ? {
                ...answer,
                result: IGameTurn_1.AnswerResult.INCORRECT,
            }
            : answer);
        currentTurnData.buzzHistory = [];
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    SetTimeLeftForPlayerToAnswer: (timeLeft) => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        if (currentTurnData.answerStack.length > 0) {
            currentTurnData.answerStack[0].answerTimeLeft = timeLeft;
        }
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    SetTimeLeftForAllPlayersToAnswer: (timeLeft) => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.questionTimeLeft = timeLeft;
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    GivePlayerChanceToAnswer: (player) => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        currentTurnData.buzzerState = IGameState_1.BuzzerState.CLOSED;
        currentTurnData.answerStack.unshift({
            player,
            answerTimeLeft: GameUtil_1.default.RESPONSE_TIME,
            result: null,
            wager: null,
            finalJeopardyAnswer: null,
        });
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
    SubmitFinalJeopardyAnswer: (player, answer, wager) => set((store) => {
        const currentTurnData = { ...store.gameState.currentTurnData };
        const existingAnswer = currentTurnData.answerStack.find((answer) => answer.player.displayName == player.displayName);
        if (existingAnswer) {
            currentTurnData.answerStack = [
                ...currentTurnData.answerStack.filter((answer) => answer.player.displayName != player.displayName),
                {
                    ...existingAnswer,
                    wager: wager,
                    finalJeopardyAnswer: answer,
                },
            ];
        }
        else {
            currentTurnData.answerStack.push({
                player,
                answerTimeLeft: GameUtil_1.default.RESPONSE_TIME,
                result: null,
                wager,
                finalJeopardyAnswer: answer,
            });
        }
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
}));
