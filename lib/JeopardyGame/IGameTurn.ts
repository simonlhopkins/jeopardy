import IBuzzerSubmitData from "./IBuzzerSubmitData";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

export default interface IGameTurn {
  question: IQuestion | null;
  answerHistory: IAnswerData[];
  buzzHistory: IBuzzerSubmitData[];
  answerTimeLeft: number;
  turnState: TurnState;
}

export interface IAnswerData {
  result: AnswerResult;
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
