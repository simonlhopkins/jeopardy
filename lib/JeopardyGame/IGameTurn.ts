import IBuzzerSubmitData from "./IBuzzerSubmitData";
import { BuzzerState } from "./IGameState";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export default interface IGameTurn {
  question: IQuestion | null;
  answerStack: IAnswerAttempt[];
  buzzHistory: IBuzzerSubmitData[];
  buzzerState: BuzzerState;
  questionTimeLeft: number;
  isFinalJeopardy: boolean;
}

//used by the client UI
export type GameTurnWithQuestion = Omit<IGameTurn, "question"> & {
  question: IQuestion;
};

export type GameTurnWithoutQuestion = Omit<IGameTurn, "question"> & {
  question: null;
};

export interface IAnswerAttempt {
  result: AnswerResult | null;
  answerTimeLeft: number;
  player: IPlayer;
  wager: number | null;
  finalJeopardyAnswer: string | null;
}

export enum AnswerResult {
  CORRECT,
  INCORRECT,
}

export enum TurnState {
  CHOOSING,
  READING,
  OPEN,
  ANSWER,
  RESOLVED,
}

export type TurnPhase =
  | { turnState: TurnState.CHOOSING; gameTurn: GameTurnWithoutQuestion }
  | { turnState: TurnState.READING; gameTurn: GameTurnWithQuestion }
  | { turnState: TurnState.OPEN; gameTurn: GameTurnWithQuestion }
  | { turnState: TurnState.ANSWER; gameTurn: GameTurnWithQuestion }
  | { turnState: TurnState.RESOLVED; gameTurn: GameTurnWithQuestion };
