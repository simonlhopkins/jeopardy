"use server";
// server/gameStore.ts
import { create } from "zustand";
import {
  BuzzerState,
  DefaultGameState,
  IGameState,
} from "../JeopardyGame/IGameState";
import IPlayer from "../JeopardyGame/IPlayer";
import IQuestion from "../JeopardyGame/IQuestion";
import IBuzzerSubmitData from "../JeopardyGame/IBuzzerSubmitData";
import { AnswerResult, TurnState } from "../JeopardyGame/IGameTurn";
import { IJeopardyGameData } from "../JeopardyGame/IJeopardyGameData";
import GameUtil from "../JeopardyGame/GameUtil";

interface ServerStore {
  gameState: IGameState;
  setQuestions: (gameData: IJeopardyGameData) => void;
  setCurrentQuestion: (question: IQuestion) => void;
  connectPlayer: (player: IPlayer) => void;
  disconnectPlayer: (socketId: string) => void;
  permanentlyDeletePlayer: (playerToRemove: IPlayer) => void;
  openBuzzer: () => void;
  closeBuzzer: () => void;
  addBuzzToHistory: (buzzData: IBuzzerSubmitData) => void;
  placeWager: (fromPlayer: IPlayer, amount: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  startFinalJeopardy: () => void;
  resolveQuestion: () => void;
  resetGame: () => void;
  resetCurrentQuestion: () => void;
  AwardPlayerCorrectAnswer: (player: IPlayer) => void;
  AwardPlayerIncorrectAnswer: (player: IPlayer) => void;
  SetTimeLeftForPlayerToAnswer: (secondsLeft: number) => void;
  SetTimeLeftForAllPlayersToAnswer: (secondsLeft: number) => void;
  GivePlayerChanceToAnswer: (player: IPlayer) => void;
  SubmitFinalJeopardyAnswer: (
    player: IPlayer,
    answer: string,
    wager: number
  ) => void;
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
  setQuestions: (gameData: IJeopardyGameData) =>
    set((store) => {
      const state = { ...store.gameState };
      state.questions = gameData.questions;
      state.categories = gameData.categories;
      return { gameState: state };
    }),
  setCurrentQuestion: (question: IQuestion) =>
    set((store) => {
      const state = { ...store.gameState };
      state.currentTurnData.question = question;
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
      currentTurnData.buzzerState = BuzzerState.OPEN;
      currentTurnData.questionTimeLeft = store.gameState.currentTurnData
        .isFinalJeopardy
        ? 30
        : GameUtil.RESPONSE_TIME;
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
      currentTurnData.buzzerState = BuzzerState.CLOSED;
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
        finalJeopardyAnswer: null,
      });
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
            isFinalJeopardy: false,
            buzzerState: BuzzerState.CLOSED,
            question: null,
            buzzHistory: [],
            answerStack: [],
            questionTimeLeft: GameUtil.BUZZ_IN_WINDOW_TIME,
          },
        },
      };
    }),
  prevQuestion: () =>
    set((store) => {
      const newGameTurn = store.gameState.history.pop()!;
      return {
        gameState: {
          ...store.gameState,
          history: store.gameState.history,
          currentTurnData: newGameTurn,
        },
      };
    }),

  startFinalJeopardy: () =>
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
            isFinalJeopardy: true,
            buzzerState: BuzzerState.CLOSED,
            question: {
              id: "final",
              question:
                "Affectionately named Nigel, this small, furry mammal was one of Kendra’s earliest pets.",
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
  resolveQuestion: () =>
    set((store) => {
      return {
        gameState: {
          ...store.gameState,
          currentTurnData: {
            ...store.gameState.currentTurnData,
            buzzerState: BuzzerState.CLOSED,
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
          isFinalJeopardy: false,
          buzzerState: BuzzerState.CLOSED,
          question: null,
          buzzHistory: [],
          answerStack: [],
          questionTimeLeft: GameUtil.BUZZ_IN_WINDOW_TIME,
        },
      },
    })),
  resetCurrentQuestion: () =>
    set((store) => ({
      gameState: {
        ...store.gameState,
        currentTurnData: {
          isFinalJeopardy: false,
          buzzerState: BuzzerState.CLOSED,
          question: null,
          buzzHistory: [],
          answerStack: [],
          questionTimeLeft: GameUtil.BUZZ_IN_WINDOW_TIME,
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
      currentTurnData.buzzerState = BuzzerState.CLOSED;
      currentTurnData.answerStack.unshift({
        player,
        answerTimeLeft: GameUtil.RESPONSE_TIME,
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

  SubmitFinalJeopardyAnswer: (player: IPlayer, answer: string, wager: number) =>
    set((store) => {
      const currentTurnData = { ...store.gameState.currentTurnData };
      const existingAnswer = currentTurnData.answerStack.find(
        (answer) => answer.player.displayName == player.displayName
      );
      if (existingAnswer) {
        currentTurnData.answerStack = [
          ...currentTurnData.answerStack.filter(
            (answer) => answer.player.displayName != player.displayName
          ),
          {
            ...existingAnswer,
            wager: wager,
            finalJeopardyAnswer: answer,
          },
        ];
      } else {
        currentTurnData.answerStack.push({
          player,
          answerTimeLeft: GameUtil.RESPONSE_TIME,
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
