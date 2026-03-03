import { IGameState } from "./IGameState";
import IGameTurn, {
  AnswerResult,
  IAnswerAttempt,
  TurnState,
} from "./IGameTurn";
import IPlayer from "./IPlayer";
import IQuestion from "./IQuestion";

interface QuestionData {
  question: IQuestion | null;
  answers: IAnswerAttempt[];
}

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

  private static GetQuestionScore(
    questionData: QuestionData,
    forPlayer: string
  ) {
    if (questionData.question?.isDailyDouble) {
      //look at the wagers
      const wagerAmount = questionData.answers.find(
        (answer) => answer.player.displayName == forPlayer
      )?.wager;
      return wagerAmount ?? 0;
    } else {
      return questionData.question?.score ?? 0;
    }
  }

  public static GetPlayerScore(playerId: string, turns: IGameTurn[]) {
    const questionsPlayerHasAnswered: QuestionData[] = turns.map((turn) => ({
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
            ? GameUtil.GetQuestionScore(questionData, playerId)
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
            ? GameUtil.GetQuestionScore(questionData, playerId)
            : 0),
        0
      );

    return correctScore + incorrectScore;
  }

  public static GetPersonWhoShouldBeChoosingQuestion(
    turns: IGameTurn[],
    players: IPlayer[]
  ): IPlayer | null {
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      console.log(turn);

      const maybePlayerWithCorrectAnswer = turn.answerStack.find(
        (answer) => answer.result == AnswerResult.CORRECT
      );
      if (maybePlayerWithCorrectAnswer != undefined) {
        return maybePlayerWithCorrectAnswer.player;
      }
    }
    //todo, do some sort of randomness
    if (players.length > 0) {
      return players[0];
    }
    return null;
  }

  public static GetPlayerAnswering(answerStack: IAnswerAttempt[]) {
    if (answerStack.length > 0 && answerStack[0].result == null) {
      return answerStack[0].player;
    }
    return null;
  }

  public static GetTurnState(gameState: IGameState): TurnState {
    const { currentTurnData } = gameState;
    if (currentTurnData.question == null) {
      return TurnState.CHOOSING;
    } else {
      const topAnswerIsCorrect =
        currentTurnData.answerStack.findIndex(
          (answer) => answer.result == AnswerResult.CORRECT
        ) == 0;
      const allPlayersAnsweredWrong =
        this.GetAllConnectedPlayers(gameState).length ==
        currentTurnData.answerStack.filter(
          (answer) => answer.result == AnswerResult.INCORRECT
        ).length;
      const noTimeLeft = currentTurnData.questionTimeLeft == 0;

      if (topAnswerIsCorrect || allPlayersAnsweredWrong || noTimeLeft) {
        return TurnState.RESOLVED;
      }
      const answerIsPending =
        currentTurnData.answerStack.findIndex(
          (answer) => answer.result == null
        ) == 0;
      if (answerIsPending) {
        return TurnState.ANSWER;
      } else {
        if (currentTurnData.buzzerOpen) {
          return TurnState.OPEN;
        } else {
          return TurnState.READING;
        }
      }
    }
  }
}
