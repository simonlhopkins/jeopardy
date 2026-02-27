"use client";
import { create } from "zustand";
import { DefaultGameState, IGameState } from "../JeopardyGame/IGameState";
import { useStoreWithEqualityFn } from "zustand/traditional";
import deepEqual from "fast-deep-equal";

interface ClientStore {
  gameState: IGameState;
  username: string | null;
  socketId: string | null;
  updateState: (newState: IGameState) => void;
  onlyUpdatePlayers: (newState: IGameState) => void;
  setUsername: (username: string) => void;
  setSocketId: (socketId: string) => void;
}

export const useClientGameStore = create<ClientStore>((set, get) => ({
  gameState: DefaultGameState(),
  username: null,
  socketId: null,
  setUsername: (username) => {
    set((store) => ({ username: username }));
    sessionStorage.setItem("username", username);
  },

  updateState: (newState) => set((store) => ({ gameState: newState })),
  setSocketId: (socketId) => {
    set((store) => ({ socketId }));
  },
  onlyUpdatePlayers: (newState) =>
    set((store) => ({
      gameState: { ...store.gameState, players: newState.players },
    })),
}));

export function useDeepEqualGameStore<T>(
  selector: (state: ReturnType<typeof useClientGameStore.getState>) => T
) {
  return useStoreWithEqualityFn(useClientGameStore, selector, deepEqual);
}
