import { BuzzerState, IGameState } from "./IGameState";
import IGameTurn, {
  AnswerResult,
  IAnswerAttempt,
  TurnPhase,
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
  public static GetAllGameTurns(gameState: IGameState) {
    return [...gameState.history, gameState.currentTurnData];
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
    gameState: IGameState
  ): IPlayer | null {
    const turns = [...gameState.history, gameState.currentTurnData];
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      const maybePlayerWithCorrectAnswer = turn.answerStack.find(
        (answer) => answer.result == AnswerResult.CORRECT
      );
      if (maybePlayerWithCorrectAnswer != undefined) {
        return maybePlayerWithCorrectAnswer.player;
      }
    }
    //todo, do some sort of randomness
    if (gameState.players.length > 0) {
      return gameState.players[0];
    }
    return null;
  }

  public static GetPlayerAnswering(answerStack: IAnswerAttempt[]) {
    if (answerStack.length > 0 && answerStack[0].result == null) {
      return answerStack[0].player;
    }
    return null;
  }

  private static GetEligiblePlayersForQuestion(
    question: IQuestion,
    gameState: IGameState
  ) {
    if (question.isDailyDouble) {
      const playerWhoShouldBeAnswering =
        this.GetPersonWhoShouldBeChoosingQuestion(gameState);
      return playerWhoShouldBeAnswering ? [playerWhoShouldBeAnswering] : [];
    } else {
      return this.GetAllConnectedPlayers(gameState);
    }
  }

  public static ShouldBuzzerBeDisabled(
    username: string,
    gameState: IGameState
  ) {
    const turnPhase = GameUtil.GetTurnPhase(gameState);
    return (
      turnPhase.turnState != TurnState.OPEN ||
      gameState.currentTurnData.answerStack
        .filter((answer) => answer.result == AnswerResult.INCORRECT)
        .some((answer) => answer.player.displayName == username) ||
      gameState.currentTurnData.buzzHistory.some(
        (buzzData) => buzzData.player.displayName == username
      )
    );
  }

  public static GetPlayersWhoAnsweredIncorrect(gameState: IGameState) {
    return gameState.currentTurnData.answerStack
      .filter((answer) => answer.result == AnswerResult.INCORRECT)
      .map((answer) => answer.player);
  }

  public static GetMaxWagerAmount(playerId: string, gameState: IGameState) {
    const playerScore = this.GetPlayerScore(playerId, [
      ...gameState.history,
      gameState.currentTurnData,
    ]);
    const maxScoreOnBoard = Math.max(
      ...gameState.questions.flat().map((question) => question.score)
    );
    return Math.max(playerScore, maxScoreOnBoard);
  }

  public static GetPlayersWhoAnsweredCorrect(gameState: IGameState) {
    return gameState.currentTurnData.answerStack
      .filter((answer) => answer.result == AnswerResult.CORRECT)
      .map((answer) => answer.player);
  }
  public static GetTurnPhase(gameState: IGameState): TurnPhase {
    const { currentTurnData } = gameState;
    if (currentTurnData.question == null) {
      return {
        turnState: TurnState.CHOOSING,
        gameTurn: {
          ...currentTurnData,
          question: null,
        },
      };
    } else {
      const topAnswerIsCorrect =
        currentTurnData.answerStack.findIndex(
          (answer) => answer.result == AnswerResult.CORRECT
        ) == 0;

      const allPlayersAnsweredWrong =
        this.GetEligiblePlayersForQuestion(currentTurnData.question, gameState)
          .length ==
        currentTurnData.answerStack.filter(
          (answer) => answer.result == AnswerResult.INCORRECT
        ).length;
      const noTimeLeft = currentTurnData.questionTimeLeft == 0;

      if (topAnswerIsCorrect || allPlayersAnsweredWrong || noTimeLeft) {
        return {
          turnState: TurnState.RESOLVED,
          gameTurn: { ...currentTurnData, question: currentTurnData.question },
        };
      }
      const answerIsPending =
        currentTurnData.answerStack.findIndex(
          (answer) => answer.result == null
        ) == 0;
      if (answerIsPending) {
        return {
          turnState: TurnState.ANSWER,
          gameTurn: { ...currentTurnData, question: currentTurnData.question },
        };
      } else {
        if (currentTurnData.buzzerState == BuzzerState.OPEN) {
          return {
            turnState: TurnState.OPEN,
            gameTurn: {
              ...currentTurnData,
              question: currentTurnData.question,
            },
          };
        } else {
          return {
            turnState: TurnState.READING,
            gameTurn: {
              ...currentTurnData,
              question: currentTurnData.question,
            },
          };
        }
      }
    }
  }
  public static ConvertNumberToCurrency(number: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  }
}
