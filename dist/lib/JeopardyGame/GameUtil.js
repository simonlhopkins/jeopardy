"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IGameState_1 = require("./IGameState");
const IGameTurn_1 = require("./IGameTurn");
class GameUtil {
    static GetTurnStateNameFromEnum(turnState) {
        switch (turnState) {
            case IGameTurn_1.TurnState.ANSWER:
                return "ANSWER";
            case IGameTurn_1.TurnState.CHOOSING:
                return "CHOOSING";
            case IGameTurn_1.TurnState.OPEN:
                return "OPEN";
            case IGameTurn_1.TurnState.READING:
                return "READING";
            case IGameTurn_1.TurnState.RESOLVED:
                return "RESOLVED";
            default:
                "NOT DEFINED";
        }
    }
    static GetAnswerResultNameFromEnum(answerResult) {
        switch (answerResult) {
            case IGameTurn_1.AnswerResult.INCORRECT:
                return "INCORRECT";
            case IGameTurn_1.AnswerResult.CORRECT:
                return "CORRECT";
            default:
                "NOT DEFINED";
        }
    }
    static GetBuzzerStateStringFromEnum(buzzerState) {
        switch (buzzerState) {
            case IGameState_1.BuzzerState.CLOSED:
                return "CLOSED";
            case IGameState_1.BuzzerState.OPEN:
                return "OPEN";
            default:
                "NOT DEFINED";
        }
    }
    static GetAllConnectedPlayers(gameState) {
        return gameState.players.filter((player) => player.socketId != null);
    }
    static GetQuestionScore(questionData, forPlayer) {
        var _a, _b, _c, _d;
        if (((_a = questionData.question) === null || _a === void 0 ? void 0 : _a.isDailyDouble) || questionData.isFinalJeopardy) {
            //look at the wagers
            const wagerAmount = (_b = questionData.answers.find((answer) => answer.player.displayName == forPlayer)) === null || _b === void 0 ? void 0 : _b.wager;
            return wagerAmount !== null && wagerAmount !== void 0 ? wagerAmount : 0;
        }
        else {
            return (_d = (_c = questionData.question) === null || _c === void 0 ? void 0 : _c.score) !== null && _d !== void 0 ? _d : 0;
        }
    }
    static GetAllGameTurns(gameState) {
        return [...gameState.history, gameState.currentTurnData];
    }
    static GetPlayerScore(playerId, turns) {
        const questionsPlayerHasAnswered = turns.map((turn) => ({
            question: turn.question,
            isFinalJeopardy: turn.isFinalJeopardy,
            answers: turn.answerStack.filter((answer) => answer.player.displayName == playerId),
        }));
        const correctScore = questionsPlayerHasAnswered
            .filter((questionData) => questionData.answers.some((answer) => answer.result == IGameTurn_1.AnswerResult.CORRECT))
            .reduce((sum, questionData) => sum +
            (questionData.question
                ? GameUtil.GetQuestionScore(questionData, playerId)
                : 0), 0);
        const incorrectScore = questionsPlayerHasAnswered
            .filter((questionData) => questionData.answers.some((answer) => answer.result == IGameTurn_1.AnswerResult.INCORRECT))
            .reduce((sum, questionData) => sum -
            (questionData.question
                ? GameUtil.GetQuestionScore(questionData, playerId)
                : 0), 0);
        return correctScore + incorrectScore;
    }
    static GetPersonWhoShouldBeChoosingQuestion(gameState) {
        const turns = [...gameState.history, gameState.currentTurnData];
        for (let i = turns.length - 1; i >= 0; i--) {
            const turn = turns[i];
            const maybePlayerWithCorrectAnswer = turn.answerStack.find((answer) => answer.result == IGameTurn_1.AnswerResult.CORRECT);
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
    static GetPlayerAnswering(answerStack) {
        if (answerStack.length > 0 && answerStack[0].result == null) {
            return answerStack[0].player;
        }
        return null;
    }
    static GetEligiblePlayersForQuestion(question, gameState) {
        if (question.isDailyDouble) {
            const playerWhoShouldBeAnswering = this.GetPersonWhoShouldBeChoosingQuestion(gameState);
            return playerWhoShouldBeAnswering ? [playerWhoShouldBeAnswering] : [];
        }
        else {
            return this.GetAllConnectedPlayers(gameState);
        }
    }
    static ShouldBuzzerBeDisabled(username, gameState) {
        const turnPhase = GameUtil.GetTurnPhase(gameState);
        return (turnPhase.turnState != IGameTurn_1.TurnState.OPEN ||
            gameState.currentTurnData.answerStack
                .filter((answer) => answer.result == IGameTurn_1.AnswerResult.INCORRECT)
                .some((answer) => answer.player.displayName == username) ||
            gameState.currentTurnData.buzzHistory.some((buzzData) => buzzData.player.displayName == username));
    }
    static GetPlayersWhoAnsweredIncorrect(gameState) {
        return gameState.currentTurnData.answerStack
            .filter((answer) => answer.result == IGameTurn_1.AnswerResult.INCORRECT)
            .map((answer) => answer.player);
    }
    static GetMaxWagerAmount(playerId, gameState) {
        const playerScore = this.GetPlayerScore(playerId, [
            ...gameState.history,
            gameState.currentTurnData,
        ]);
        const maxScoreOnBoard = Math.max(...gameState.questions.flat().map((question) => question.score));
        return Math.max(playerScore, maxScoreOnBoard);
    }
    static GetPlayersWhoAnsweredCorrect(gameState) {
        return gameState.currentTurnData.answerStack
            .filter((answer) => answer.result == IGameTurn_1.AnswerResult.CORRECT)
            .map((answer) => answer.player);
    }
    static GetTurnPhase(gameState) {
        const { currentTurnData } = gameState;
        if (currentTurnData.question == null) {
            return {
                turnState: IGameTurn_1.TurnState.CHOOSING,
                gameTurn: {
                    ...currentTurnData,
                    question: null,
                },
            };
        }
        else {
            const answerStackHasCorrectAnswer = currentTurnData.answerStack.some((answer) => answer.result == IGameTurn_1.AnswerResult.CORRECT);
            const allPlayersAnsweredWrong = this.GetEligiblePlayersForQuestion(currentTurnData.question, gameState)
                .length ==
                currentTurnData.answerStack.filter((answer) => answer.result == IGameTurn_1.AnswerResult.INCORRECT).length;
            const noTimeLeft = currentTurnData.questionTimeLeft == 0;
            //if there is a correct answer in the answer stack, there is no reason to not resolve the turn
            if (answerStackHasCorrectAnswer ||
                allPlayersAnsweredWrong ||
                (noTimeLeft &&
                    currentTurnData.answerStack.filter((answer) => answer.result == IGameTurn_1.AnswerResult.INCORRECT).length == currentTurnData.answerStack.length)) {
                return {
                    turnState: IGameTurn_1.TurnState.RESOLVED,
                    gameTurn: { ...currentTurnData, question: currentTurnData.question },
                };
            }
            if (currentTurnData.isFinalJeopardy && noTimeLeft) {
                return {
                    turnState: IGameTurn_1.TurnState.ANSWER,
                    gameTurn: { ...currentTurnData, question: currentTurnData.question },
                };
            }
            const answerIsPending = currentTurnData.answerStack.findIndex((answer) => answer.result == null) == 0;
            if (answerIsPending && !currentTurnData.isFinalJeopardy) {
                return {
                    turnState: IGameTurn_1.TurnState.ANSWER,
                    gameTurn: { ...currentTurnData, question: currentTurnData.question },
                };
            }
            else {
                if (currentTurnData.buzzerState == IGameState_1.BuzzerState.OPEN) {
                    return {
                        turnState: IGameTurn_1.TurnState.OPEN,
                        gameTurn: {
                            ...currentTurnData,
                            question: currentTurnData.question,
                        },
                    };
                }
                else {
                    return {
                        turnState: IGameTurn_1.TurnState.READING,
                        gameTurn: {
                            ...currentTurnData,
                            question: currentTurnData.question,
                        },
                    };
                }
            }
        }
    }
    static ShowDailyDoubleScreen(gameState) {
        const turnPhase = this.GetTurnPhase(gameState);
        if (turnPhase.turnState == IGameTurn_1.TurnState.READING) {
            const wagerHasBeenSet = turnPhase.gameTurn.answerStack.length > 0 &&
                turnPhase.gameTurn.answerStack[0].wager != null;
            return !wagerHasBeenSet && turnPhase.gameTurn.question.isDailyDouble;
        }
        else {
            return false;
        }
    }
    static ConvertNumberToCurrency(number) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(number);
    }
    static PlayerIsConnected(username, socketId, players) {
        return players.some((player) => player.socketId == socketId && player.displayName == username);
    }
    static IsFinalJeopardy(gameState) {
        return gameState.currentTurnData.isFinalJeopardy;
    }
}
GameUtil.BUZZ_IN_WINDOW_TIME = 5;
GameUtil.RESPONSE_TIME = 5;
GameUtil.ROWS = 5;
GameUtil.COLS = 4;
exports.default = GameUtil;
