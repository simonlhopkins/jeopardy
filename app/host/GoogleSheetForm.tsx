import { useClientGameStore } from "@/lib/store/clientStore";
import { useState } from "react";

export default function GoogleSheetForm({
  onSubmit,
}: {
  onSubmit: (data: { spreadsheetName: string; sheetName: string }) => void;
}) {
  const spreadSheetId = useClientGameStore((store) => store.spreadsheetId);
  const sheetId = useClientGameStore((store) => store.sheetId);
  const setSpreadSheetId = useClientGameStore(
    (store) => store.setSpreadsheetId
  );
  const setSheetId = useClientGameStore((store) => store.setSheetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (spreadSheetId && !spreadSheetId.trim()) return;

    onSubmit({
      spreadsheetName: (spreadSheetId || "").trim(),
      sheetName: (sheetId || "").trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 w-full max-w-2xl text-black"
    >
      <input
        type="text"
        placeholder="Spreadsheet name"
        value={spreadSheetId || ""}
        onChange={(e) => setSpreadSheetId(e.target.value)}
        className="flex-1 border rounded px-3 py-2"
        required
      />

      <input
        type="text"
        placeholder="Sheet name (optional)"
        value={sheetId || ""}
        onChange={(e) => setSheetId(e.target.value)}
        className="flex-1 border rounded px-3 py-2"
        required
      />

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Submit
      </button>
    </form>
  );
}
