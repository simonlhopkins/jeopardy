"use client";
import { create } from "zustand";
import { DefaultGameState, IGameState } from "../JeopardyGame/IGameState";
import { useStoreWithEqualityFn } from "zustand/traditional";
import deepEqual from "fast-deep-equal";
import { createJSONStorage, persist } from "zustand/middleware";

interface ClientStore {
  gameState: IGameState;
  username: string | null;
  socketId: string | null;
  spreadsheetId: string | null;
  sheetId: string | null;
  updateState: (newState: IGameState) => void;
  onlyUpdatePlayers: (newState: IGameState) => void;
  setUsername: (username: string) => void;
  setSocketId: (socketId: string) => void;
  setSpreadsheetId: (spreadsheetId: string) => void;
  setSheetId: (sheetId: string) => void;
}

export const useClientGameStore = create<ClientStore>()(
  persist(
    (set, get) => ({
      gameState: DefaultGameState(),
      username: null,
      socketId: null,
      spreadsheetId: null,
      sheetId: null,

      setUsername: (username) => set({ username }),

      updateState: (newState) => set({ gameState: newState }),

      setSocketId: (socketId) => set({ socketId }),
      setSpreadsheetId: (spreadsheetId) => set({ spreadsheetId }),
      setSheetId: (sheetId) => set({ sheetId }),
      onlyUpdatePlayers: (newState) =>
        set((store) => ({
          gameState: { ...store.gameState, players: newState.players },
        })),
    }),
    {
      name: "client-game-store",
      storage: createJSONStorage(() => sessionStorage),

      // 👇 only persist this field
      partialize: (state) => ({
        username: state.username,
        spreadsheetId: state.spreadsheetId,
        sheetId: state.sheetId,
      }),
    }
  )
);

export function useDeepEqualGameStore<T>(
  selector: (state: ReturnType<typeof useClientGameStore.getState>) => T
) {
  return useStoreWithEqualityFn(useClientGameStore, selector, deepEqual);
}
