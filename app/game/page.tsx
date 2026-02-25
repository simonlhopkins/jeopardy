"use client";

import GameClient from "@/lib/Client/GameClient";
import { socket } from "@/lib/socket";
import { useClientGameStore } from "@/lib/store/clientStore";
import { useEffect, useRef } from "react";
import JeopardyBoard from "../Components/JeopardyBoard";

export default function Game() {
  const hostClient = useRef<GameClient | null>(null);
  const gameState = useClientGameStore((store) => store.gameState);
  const getGameClient = () => {
    if (hostClient.current == null) {
      hostClient.current = new GameClient(socket);
    }
    return hostClient.current;
  };

  useEffect(() => {
    getGameClient().initialize();
  }, []);
  return (
    <div>
      <p>game</p>
      <JeopardyBoard gameState={gameState} onQuestionClick={(question) => {}} />
    </div>
  );
}
