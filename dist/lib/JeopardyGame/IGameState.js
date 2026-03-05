"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuzzerState = exports.GamePhase = void 0;
exports.DefaultGameState = DefaultGameState;
var GamePhase;
(function (GamePhase) {
    GamePhase[GamePhase["QUESTION"] = 0] = "QUESTION";
    GamePhase[GamePhase["ANSWER"] = 1] = "ANSWER";
    GamePhase[GamePhase["IDLE"] = 2] = "IDLE";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var BuzzerState;
(function (BuzzerState) {
    BuzzerState[BuzzerState["OPEN"] = 0] = "OPEN";
    BuzzerState[BuzzerState["CLOSED"] = 1] = "CLOSED";
})(BuzzerState || (exports.BuzzerState = BuzzerState = {}));
function DefaultGameState() {
    return {
        players: [],
        questions: [],
        history: [],
        currentTurnData: {
            buzzerState: BuzzerState.CLOSED,
            question: null,
            answerStack: [],
            buzzHistory: [],
            questionTimeLeft: 5,
        },
    };
}
