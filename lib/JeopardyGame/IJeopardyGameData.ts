import IQuestion from "./IQuestion";

export interface IJeopardyGameData {
  categories: string[];
  questions: IQuestion[][];
}
