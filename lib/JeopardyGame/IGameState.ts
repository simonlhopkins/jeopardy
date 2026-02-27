import IBuzzerSubmitData from "./IBuzzerSubmitData";
import IGameTurn, { TurnState } from "./IGameTurn";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export interface IGameState {
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
    players: [],
    questions: [],
    history: [],
    currentTurnData: {
      question: null,
      answerStack: [],
      buzzHistory: [],
      questionTimeLeft: 5,
      turnState: TurnState.CHOOSING,
    },
    buzzerState: BuzzerState.CLOSED,
  };
}
