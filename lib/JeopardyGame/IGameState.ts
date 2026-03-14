import IBuzzerSubmitData from "./IBuzzerSubmitData";
import IGameTurn, { TurnState } from "./IGameTurn";
import { IJeopardyGameData } from "./IJeopardyGameData";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export interface IGameState {
  questions: IQuestion[][];
  categories: string[];
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
    categories: [],
    questions: [],
    history: [],
    currentTurnData: {
      isFinalJeopardy: false,
      buzzerState: BuzzerState.CLOSED,
      question: null,
      answerStack: [],
      buzzHistory: [],
      questionTimeLeft: 5,
    },
  };
}
