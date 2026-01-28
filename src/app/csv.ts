import type { Entry } from "./types";

const headers = [
  "id",
  "date",
  "timeBlock",
  "activity",
  "lifeArea",
  "withWhom",
  "mode",
  "durationHours",
  "energyAfter",
  "notes"
] as const;

function escapeCsv(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function entriesToCsv(rows: Entry[]) {
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv(r[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

export async function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
