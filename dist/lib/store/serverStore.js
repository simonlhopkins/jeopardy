"use server";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useServerGameStore = void 0;
// server/gameStore.ts
const zustand_1 = require("zustand");
const IGameState_1 = require("../JeopardyGame/IGameState");
const IGameTurn_1 = require("../JeopardyGame/IGameTurn");
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
    setQuestions: (questions) => set((store) => {
        const state = { ...store.gameState };
        state.questions = questions;
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
                    buzzerState: IGameState_1.BuzzerState.CLOSED,
                    question: null,
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
                },
            },
        };
    }),
    resetGame: () => set((store) => ({
        gameState: {
            ...store.gameState,
            history: [],
            currentTurnData: {
                buzzerState: IGameState_1.BuzzerState.CLOSED,
                question: null,
                buzzHistory: [],
                answerStack: [],
                questionTimeLeft: 10,
            },
        },
    })),
    resetCurrentQuestion: () => set((store) => ({
        gameState: {
            ...store.gameState,
            currentTurnData: {
                buzzerState: IGameState_1.BuzzerState.CLOSED,
                question: null,
                buzzHistory: [],
                answerStack: [],
                questionTimeLeft: 10,
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
            answerTimeLeft: 10,
            result: null,
            wager: null,
        });
        return {
            gameState: {
                ...store.gameState,
                currentTurnData,
            },
        };
    }),
}));
