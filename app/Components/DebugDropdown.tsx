import { useClientGameStore } from "@/lib/store/clientStore";

export default function DebugDropdown() {
  const gameState = useClientGameStore((store) => store.gameState);

  return (
    <details>
      <summary>Debug Panel</summary>
      <div>
        <pre className="text-xs">{JSON.stringify(gameState, null, 2)}</pre>
      </div>
    </details>
  );
}
