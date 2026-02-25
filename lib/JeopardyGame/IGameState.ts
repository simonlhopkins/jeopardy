import IBuzzerSubmitData from "./IBuzzerSubmitData";
import IGameTurn, { TurnState } from "./IGameTurn";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export interface IGameState {
  points: number;
  questions: IQuestion[][];
  currentTurnData: IGameTurn;
  history: IGameTurn[];
  players: IPlayer[];
  buzzerState: BuzzerState;
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
    points: 0,
    players: [],
    questions: [],
    history: [],
    currentTurnData: {
      question: null,
      answerHistory: [],
      buzzHistory: [],
      answerTimeLeft: 5,
      turnState: TurnState.CHOOSING,
    },
    buzzerState: BuzzerState.CLOSED,
  };
}
