import IBuzzerSubmitData from "./IBuzzerSubmitData";
import IGameTurn, { TurnState } from "./IGameTurn";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export interface IGameState {
  questions: IQuestion[][];
  currentTurnData: IGameTurn;
  history: IGameTurn[];
  players: IPlayer[];
}

export enum GamePhase {
  QUESTION,
  ANSWER,
  IDLE,
}

export enum BuzzerState {
  OPEN,
  CLOSED,
}

export function DefaultGameState(): IGameState {
  return {
    players: [],
    questions: [],
    history: [],
    currentTurnData: {
      buzzerState: BuzzerState.CLOSED,
      question: null,
      answerStack: [],
      buzzHistory: [],
      questionTimeLeft: 5,
    },
  };
}
