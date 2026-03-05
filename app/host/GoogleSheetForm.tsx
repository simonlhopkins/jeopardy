import { useState } from "react";

export default function GoogleSheetForm({
  onSubmit,
}: {
  onSubmit: (data: { spreadsheetName: string; sheetName: string }) => void;
}) {
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [sheetName, setSheetName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!spreadsheetName.trim()) return;

    onSubmit({
      spreadsheetName: spreadsheetName.trim(),
      sheetName: sheetName.trim(),
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
        value={spreadsheetName}
        onChange={(e) => setSpreadsheetName(e.target.value)}
        className="flex-1 border rounded px-3 py-2"
        required
      />

      <input
        type="text"
        placeholder="Sheet name (optional)"
        value={sheetName}
        onChange={(e) => setSheetName(e.target.value)}
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
