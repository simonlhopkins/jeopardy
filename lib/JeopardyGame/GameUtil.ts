import { IGameState } from "./IGameState";
import IGameTurn, { AnswerResult, TurnState } from "./IGameTurn";
import IQuestion from "./IQuestion";

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

  public static GetAnswerResultNameFromEnum(answerResult: AnswerResult) {
    switch (answerResult) {
      case AnswerResult.INCORRECT:
        return "INCORRECT";
      case AnswerResult.CORRECT:
        return "CORRECT";
      default:
        "NOT DEFINED";
    }
  }

  public static GetAllConnectedPlayers(gameState: IGameState) {
    return gameState.players.filter((player) => player.socketId != null);
  }

  public static GetQuestionScore(question: IQuestion) {
    return question.isDailyDouble ? question.score * 2 : question.score;
  }

  public static GetPlayerScore(playerId: string, turns: IGameTurn[]) {
    const questionsPlayerHasAnswered = turns.map((turn) => ({
      question: turn.question,
      answers: turn.answerStack.filter(
        (answer) => answer.player.displayName == playerId
      ),
    }));

    const correctScore = questionsPlayerHasAnswered
      .filter((questionData) =>
        questionData.answers.some(
          (answer) => answer.result == AnswerResult.CORRECT
        )
      )
      .reduce(
        (sum, questionData) =>
          sum +
          (questionData.question
            ? GameUtil.GetQuestionScore(questionData.question)
            : 0),
        0
      );

    const incorrectScore = questionsPlayerHasAnswered
      .filter((questionData) =>
        questionData.answers.some(
          (answer) => answer.result == AnswerResult.INCORRECT
        )
      )
      .reduce(
        (sum, questionData) =>
          sum -
          (questionData.question
            ? GameUtil.GetQuestionScore(questionData.question)
            : 0),
        0
      );

    return correctScore + incorrectScore;
  }
}
