"use client";

import PlayerClient from "@/lib/Client/PlayerClient";
import { socket } from "@/lib/socket";
import {
  useClientGameStore,
  useDeepEqualGameStore,
} from "@/lib/store/clientStore";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import PlayerConnectionScreen from "./PlayerConnectionScreen";
import PlayerScreenV2 from "./PlayerScreenV2";
import GameUtil from "@/lib/JeopardyGame/GameUtil";
import SoundEffects from "./SoundEffects";

export default function Play() {
  const playerClient = useRef<PlayerClient | null>(null);
  const getPlayerClient = () => {
    if (playerClient.current == null) {
      playerClient.current = new PlayerClient();
    }
    return playerClient.current;
  };

  const username = useClientGameStore((store) => store.username);
  const socketId = useClientGameStore((store) => store.socketId);
  const gameState = useClientGameStore((store) => store.gameState);
  // const setUsername = useClientGameStore((state) => state.setUsername);

  //todo refactor this damn i am dumb
  const isInGame =
    username != null &&
    socketId != null &&
    GameUtil.PlayerIsConnected(username, socketId, gameState.players);

  useEffect(() => {
    function onConnect() {
      getPlayerClient().OnConnection(socket);
    }
    if (socket.connected) {
      onConnect();
    }
    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, []);

  const players = useDeepEqualGameStore((store) => store.gameState.players);

  useEffect(() => {
    if (username != null) {
      if (
        players.some(
          (player) => player.displayName == username && player.socketId == null
        )
      ) {
        getPlayerClient().JoinGame(username);
      }
    }
  }, [username, players]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden max-w-2xl p-2">
      <SoundEffects gameState={gameState} />
      <PlayerConnectionScreen
        gameState={gameState}
        getPlayerClient={getPlayerClient}
      />
      {isInGame && (
        // <PlayerGameScreen
        //   gameState={gameState}
        //   getPlayerClient={getPlayerClient}
        // />
        <PlayerScreenV2
          gameState={gameState}
          getPlayerClient={getPlayerClient}
          username={username!}
        />
      )}
    </div>
  );
}
