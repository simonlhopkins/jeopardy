import { TurnState } from "./IGameTurn";

export default class GameUtil {
  public static GetTurnStateNameFromEnum(turnState: TurnState) {
    switch (turnState) {
      case TurnState.ANSWER:
        return "ANSWER";
      case TurnState.CHOOSING:
        return "CHOOSING";
      case TurnState.OPEN:
        return "OPEN";
      case TurnState.READING:
        return "READING";
      case TurnState.RESOLVED:
        return "RESOLVED";
      default:
        "NOT DEFINED";
    }
  }
}
