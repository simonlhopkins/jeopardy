"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnState = exports.AnswerResult = void 0;
var AnswerResult;
(function (AnswerResult) {
    AnswerResult[AnswerResult["CORRECT"] = 0] = "CORRECT";
    AnswerResult[AnswerResult["INCORRECT"] = 1] = "INCORRECT";
})(AnswerResult || (exports.AnswerResult = AnswerResult = {}));
var TurnState;
(function (TurnState) {
    TurnState[TurnState["CHOOSING"] = 0] = "CHOOSING";
    TurnState[TurnState["READING"] = 1] = "READING";
    TurnState[TurnState["OPEN"] = 2] = "OPEN";
    TurnState[TurnState["ANSWER"] = 3] = "ANSWER";
    TurnState[TurnState["RESOLVED"] = 4] = "RESOLVED";
})(TurnState || (exports.TurnState = TurnState = {}));
