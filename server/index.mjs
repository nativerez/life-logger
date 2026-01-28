import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const dataDir = path.join(repoRoot, "data");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function escapeCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
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
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv(r[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

function fromCsv(csvText) {
  // Minimal CSV parser (handles quotes). Good enough for this use.
  const rows = [];
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return rows;
  const headers = lines[0].split(",");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let cur = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"' && line[j + 1] === '"' && inQuotes) {
        cur += '"';
        j++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur);

    const obj = {};
    headers.forEach((h, idx) => (obj[h] = values[idx] ?? ""));
    // normalize a couple of fields
    obj.durationHours = Number(obj.durationHours || 0);
    rows.push(obj);
  }
  return rows;
}

app.get("/api/weeks", (req, res) => {
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
  const weeks = files
    .map((f) => f.replace(".csv", ""))
    .sort()
    .reverse();
  res.json({ weeks });
});

app.get("/api/week/:weekKey", (req, res) => {
  const { weekKey } = req.params;
  const file = path.join(dataDir, `${weekKey}.csv`);
  if (!fs.existsSync(file)) return res.json({ weekKey, rows: [] });

  const csv = fs.readFileSync(file, "utf8");
  const rows = fromCsv(csv);
  res.json({ weekKey, rows });
});

app.post("/api/week/:weekKey", (req, res) => {
  const { weekKey } = req.params;
  const { rows } = req.body || {};
  if (!Array.isArray(rows)) return res.status(400).json({ error: "rows must be an array" });

  const file = path.join(dataDir, `${weekKey}.csv`);
  fs.writeFileSync(file, toCsv(rows), "utf8");
  res.json({ ok: true, savedTo: `data/${weekKey}.csv`, count: rows.length });
});

app.listen(8787, () => {
  console.log("Life Log API running on http://localhost:8787");
});
