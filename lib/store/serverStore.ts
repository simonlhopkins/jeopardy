"use server";
// server/gameStore.ts
import { create } from "zustand";
import { DefaultGameState, IGameState } from "../JeopardyGame/IGameState";
import IPlayer from "../JeopardyGame/IPlayer";
import IQuestion from "../JeopardyGame/IQuestion";
import IBuzzerSubmitData from "../JeopardyGame/IBuzzerSubmitData";
import { AnswerResult, TurnState } from "../JeopardyGame/IGameTurn";

interface ServerStore {
  gameState: IGameState;
  setQuestions: (questions: IQuestion[][]) => void;
  setCurrentQuestion: (question: IQuestion) => void;
  connectPlayer: (player: IPlayer) => void;
  disconnectPlayer: (socketId: string) => void;
  permanentlyDeletePlayer: (playerToRemove: IPlayer) => void;
  openBuzzer: () => void;
  closeBuzzer: () => void;
  addBuzzToHistory: (buzzData: IBuzzerSubmitData) => void;
  placeWager: (fromPlayer: IPlayer, amount: number) => void;
  nextQuestion: () => void;
  resolveQuestion: () => void;
  resetGame: () => void;
  resetCurrentQuestion: () => void;
  AwardPlayerCorrectAnswer: (player: IPlayer) => void;
  AwardPlayerIncorrectAnswer: (player: IPlayer) => void;
  SetTimeLeftForPlayerToAnswer: (secondsLeft: number) => void;
  SetTimeLeftForAllPlayersToAnswer: (secondsLeft: number) => void;
  GivePlayerChanceToAnswer: (player: IPlayer) => void;
}

export const useServerGameStore = create<ServerStore>((set, get) => ({
  gameState: DefaultGameState(),
  connectPlayer: (newPlayer: IPlayer) =>
    set((store) => {
      const state = { ...store.gameState };

      //clear all players who might have this socket
      state.players = state.players.map((player) =>
        player.socketId == newPlayer.socketId
          ? {
              ...player,
              socketId: null,
            }
          : player
      );

      //check to see if the player with this name is already in the players, if they are, then update the socket number
      var existingPlayerIndex = state.players.findIndex(
        (player) => player.displayName == newPlayer.displayName
      );
      if (existingPlayerIndex >= 0) {
        state.players[existingPlayerIndex] = newPlayer;
      } else {
        state.players.push(newPlayer);
      }
      return { gameState: state };
    }),
  setQuestions: (questions: IQuestion[][]) =>
    set((store) => {
      const state = { ...store.gameState };
      state.questions = questions;
      return { gameState: state };
    }),
  setCurrentQuestion: (question: IQuestion) =>
    set((store) => {
      const state = { ...store.gameState };
      state.currentTurnData.question = question;
      state.currentTurnData.turnState = TurnState.READING;
      //todo, validation this is a valid question
      return { gameState: state };
    }),
  disconnectPlayer: (socketId: string) =>
    set((store) => {
      console.log("removing player: " + socketId);
      const state = { ...store.gameState };
      var existingPlayerIndex = state.players.findIndex(
        (player) => player.socketId == socketId
      );
      if (existingPlayerIndex >= 0) {
        state.players[existingPlayerIndex].socketId = null;
      }
      return { gameState: state };
    }),
  permanentlyDeletePlayer: (playerToRemove: IPlayer) =>
    set((store) => {
      const state = { ...store.gameState };
      state.players = state.players.filter(
        (player) => !(player.displayName == playerToRemove.displayName)
      );

      return { gameState: state };
    }),
  openBuzzer: () =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.turnState = TurnState.OPEN;
      currentTurnData.buzzerOpen = true;
      return {
        gameState: {
          ...store.gameState,
          currentTurnData,
        },
      };
    }),
  closeBuzzer: () =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.turnState = TurnState.READING;
      currentTurnData.buzzerOpen = false;
      return {
        gameState: {
          ...store.gameState,
          currentTurnData,
        },
      };
    }),

  //todo, I can manipulate the sort here to give an advantage to certain players
  addBuzzToHistory: (buzzData: IBuzzerSubmitData) =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.buzzHistory.push(buzzData);
      currentTurnData.buzzHistory.sort((a, b) => a.timestamp - b.timestamp);
      return {
        gameState: { ...store.gameState, currentTurnData },
      };
    }),
  placeWager: (fromPlayer: IPlayer, amount: number) =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.answerStack.unshift({
        answerTimeLeft: 10,
        player: fromPlayer,
        wager: amount,
        result: null,
      });
      currentTurnData.turnState = TurnState.ANSWER;
      return {
        gameState: { ...store.gameState, currentTurnData },
      };
    }),
  nextQuestion: () =>
    set((store) => {
      const newHistory = [
        ...store.gameState.history,
        store.gameState.currentTurnData,
      ];
      return {
        gameState: {
          ...store.gameState,
          history: newHistory,
          currentTurnData: {
            buzzerOpen: false,
            question: null,
            buzzHistory: [],
            answerStack: [],
            questionTimeLeft: 10,
            turnState: TurnState.CHOOSING,
          },
        },
      };
    }),
  resolveQuestion: () =>
    set((store) => {
      return {
        gameState: {
          ...store.gameState,
          currentTurnData: {
            ...store.gameState.currentTurnData,
            turnState: TurnState.RESOLVED,
          },
        },
      };
    }),
  resetGame: () =>
    set((store) => ({
      gameState: {
        ...store.gameState,
        history: [],
        currentTurnData: {
          buzzerOpen: false,
          question: null,
          buzzHistory: [],
          answerStack: [],
          questionTimeLeft: 10,
          turnState: TurnState.CHOOSING,
        },
      },
    })),
  resetCurrentQuestion: () =>
    set((store) => ({
      gameState: {
        ...store.gameState,
        currentTurnData: {
          buzzerOpen: false,
          question: null,
          buzzHistory: [],
          answerStack: [],
          questionTimeLeft: 10,
          turnState: TurnState.CHOOSING,
        },
      },
    })),
  AwardPlayerCorrectAnswer: (player: IPlayer) =>
    set((store) => {
      //todo add points to a leaderboard
      const currentTurnData = store.gameState.currentTurnData;
      currentTurnData.answerStack = currentTurnData.answerStack.map((answer) =>
        answer.player.displayName == player.displayName
          ? {
              ...answer,
              result: AnswerResult.CORRECT,
            }
          : answer
      );

      currentTurnData.turnState = TurnState.RESOLVED;
      currentTurnData.buzzHistory = [];
      return {
        gameState: {
          ...store.gameState,
          currentTurnData,
        },
      };
    }),
  AwardPlayerIncorrectAnswer: (player: IPlayer) =>
    set((store) => {
      //don't open the buzzer here. Do that in a separate mutation
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.answerStack = currentTurnData.answerStack.map((answer) =>
        answer.player.displayName == player.displayName
          ? {
              ...answer,
              result: AnswerResult.INCORRECT,
            }
          : answer
      );
      currentTurnData.buzzHistory = [];
      return {
        gameState: {
          ...store.gameState,
          currentTurnData,
        },
      };
    }),
  SetTimeLeftForPlayerToAnswer: (timeLeft: number) =>
    set((store) => {
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
  SetTimeLeftForAllPlayersToAnswer: (timeLeft: number) =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.questionTimeLeft = timeLeft;
      return {
        gameState: {
          ...store.gameState,
          currentTurnData,
        },
      };
    }),
  GivePlayerChanceToAnswer: (player: IPlayer) =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      currentTurnData.turnState = TurnState.ANSWER;
      currentTurnData.buzzerOpen = false;
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
