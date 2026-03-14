import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { useState } from "react";

interface FinalJeopardySubmitViewProps {
  forUsername: string;
  gameState: IGameState;
  onSubmit: (answer: string, wager: number) => void;
}

export default function FinalJeopardySubmitView({
  forUsername,
  gameState,
  onSubmit,
}: FinalJeopardySubmitViewProps) {
  const [answer, setAnswer] = useState("");
  const [wager, setWager] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answer, wager);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Answer:</label>
        <input
          type="text"
          className="bg-white text-black"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </div>

      <div>
        <label>Wager: {wager}</label>
        <input
          type="range"
          min={0}
          max={GameUtil.GetMaxWagerAmount(forUsername, gameState)}
          value={wager}
          onChange={(e) => setWager(Number(e.target.value))}
        />
      </div>

      <button type="submit">
        {gameState.currentTurnData.answerStack.some(
          (answer) => answer.player.displayName == forUsername
        )
          ? "Update"
          : "Submit"}
      </button>
    </form>
  );
}
