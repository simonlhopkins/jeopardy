import IBuzzerSubmitData from "./IBuzzerSubmitData";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export default interface IGameTurn {
  question: IQuestion | null;
  answerStack: IAnswerAttempt[];
  buzzHistory: IBuzzerSubmitData[];
  turnState: TurnState;
  questionTimeLeft: number;
}

export interface IAnswerAttempt {
  result: AnswerResult | null;
  answerTimeLeft: number;
  player: IPlayer;
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
