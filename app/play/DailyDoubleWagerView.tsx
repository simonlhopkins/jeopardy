import PlayerClient from "@/lib/Client/PlayerClient";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import { IGameState } from "@/lib/JeopardyGame/IGameState";
import { useState } from "react";

interface Props {
  gameState: IGameState;
  username: string;
  getPlayerClient: () => PlayerClient;
}
export default function DailyDoubleWagerView({
  gameState,
  username,
  getPlayerClient,
}: Props) {
  const [wagerSlider, setWagerSlider] = useState(0);

  return (
    <div className="w-full h-full flex gap-2 items-center flex-col justify-center">
      <input
        type="range"
        min="0"
        max={GameUtil.GetMaxWagerAmount(username, gameState)}
        value={wagerSlider}
        onChange={(e) => setWagerSlider(Number(e.target.value))}
      />
      <p className="text-lg">{wagerSlider}</p>
      <button
        className="text-black"
        onClick={() => {
          getPlayerClient().PlaceWager(wagerSlider);
        }}
      >
        place wager and see question
      </button>
    </div>
  );
}
