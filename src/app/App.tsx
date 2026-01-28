import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Entry } from "./types";
import { ENERGY, LIFE_AREAS, MODES, TIME_BLOCKS, WITH } from "./types";
import { downloadCsv, entriesToCsv } from "./csv";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// ISO week key like 2026-W05
function weekKeyFromDate(d: string) {
  const dt = dayjs(d);
  const year = dt.isoWeekYear();
  const wk = String(dt.isoWeek()).padStart(2, "0");
  return `${year}-W${wk}`;
}

const todayISO = dayjs().format("YYYY-MM-DD");

export default function App() {
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [weekKey, setWeekKey] = useState(weekKeyFromDate(todayISO));
  const [rows, setRows] = useState<Entry[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    setWeekKey(weekKeyFromDate(selectedDate));
  }, [selectedDate]);

  async function loadWeeks() {
    const res = await fetch("/api/weeks");
    const data = await res.json();
    setWeeks(data.weeks ?? []);
  }

  async function loadWeek(key: string) {
    setStatus("");
    const res = await fetch(`/api/week/${key}`);
    const data = await res.json();
    setRows((data.rows ?? []).map((r: any) => ({
      id: String(r.id || uid()),
      date: String(r.date || todayISO),
      timeBlock: r.timeBlock || "Evening",
      activity: r.activity || "",
      lifeArea: r.lifeArea || LIFE_AREAS[0],
      withWhom: r.withWhom || WITH[0],
      mode: r.mode || MODES[0],
      durationHours: Number(r.durationHours || 0),
      energyAfter: (r.energyAfter || "0") as any,
      notes: r.notes || ""
    })));
  }

  useEffect(() => {
    loadWeeks().catch(() => {});
  }, []);

  useEffect(() => {
    loadWeek(weekKey).catch(() => {});
  }, [weekKey]);

  async function saveWeek() {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch(`/api/week/${weekKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setStatus(`Saved to ${data.savedTo}`);
      loadWeeks().catch(() => {});
    } catch (e: any) {
      setStatus(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => rows.filter(r => r.date === selectedDate), [rows, selectedDate]);

  const totalsByLifeArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(r.lifeArea, (m.get(r.lifeArea) ?? 0) + (Number(r.durationHours) || 0));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const energyCounts = useMemo(() => {
    const c = { "+": 0, "0": 0, "-": 0 };
    for (const r of rows) c[r.energyAfter] = (c as any)[r.energyAfter] + 1;
    return c;
  }, [rows]);

  function addRow() {
    const e: Entry = {
      id: uid(),
      date: selectedDate,
      timeBlock: "Evening",
      activity: "",
      lifeArea: LIFE_AREAS[0],
      withWhom: WITH[0],
      mode: MODES[0],
      durationHours: 0.5,
      energyAfter: "0",
      notes: ""
    };
    setRows(prev => [e, ...prev]);
  }

  function updateRow(id: string, patch: Partial<Entry>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  async function exportCsv() {
    const csv = entriesToCsv(rows);
    await downloadCsv(`${weekKey}.csv`, csv);
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-xl px-4 pb-24 pt-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Life Log</h1>
            <p className="text-sm text-slate-600">
              Week: <span className="font-medium">{weekKey}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200"
            >
              Export CSV
            </button>
            <button
              onClick={saveWeek}
              disabled={saving}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white shadow-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>

        <section className="mt-4 grid gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {(weeks.length ? weeks : [weekKey]).slice(0, 10).map((wk) => (
                <button
                  key={wk}
                  onClick={() => {
                    const startOfWeek = dayjs().isoWeekYear(Number(wk.slice(0, 4))).isoWeek(Number(wk.slice(6, 8))).startOf("isoWeek");
                    setSelectedDate(startOfWeek.format("YYYY-MM-DD"));
                  }}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm ring-1 ${
                    wk === weekKey ? "bg-slate-900 text-white ring-slate-900" : "bg-white ring-slate-200"
                  }`}
                >
                  {wk}
                </button>
              ))}
            </div>

            {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}

            <div className="mt-3 flex gap-2">
              <button
                onClick={addRow}
                className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-medium text-white"
              >
                Add entry
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-800">Today’s entries</h2>
            <p className="mt-1 text-xs text-slate-600">Quick edit, mobile-friendly. Save writes to your repo’s /data folder.</p>

            <div className="mt-3 grid gap-3">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-600">No entries for this date yet.</p>
              ) : (
                filtered.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex w-full flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={r.timeBlock}
                            onChange={(e) => updateRow(r.id, { timeBlock: e.target.value as any })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            {TIME_BLOCKS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>

                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={r.durationHours}
                            onChange={(e) => updateRow(r.id, { durationHours: Number(e.target.value) })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Hours"
                          />
                        </div>

                        <input
                          value={r.activity}
                          onChange={(e) => updateRow(r.id, { activity: e.target.value })}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Activity (e.g. school run, Netflix, emails...)"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={r.lifeArea}
                            onChange={(e) => updateRow(r.id, { lifeArea: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            {LIFE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>

                          <select
                            value={r.mode}
                            onChange={(e) => updateRow(r.id, { mode: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={r.withWhom}
                            onChange={(e) => updateRow(r.id, { withWhom: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            {WITH.map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>

                          <select
                            value={r.energyAfter}
                            onChange={(e) => updateRow(r.id, { energyAfter: e.target.value as any })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            {ENERGY.map((en) => <option key={en} value={en}>{en}</option>)}
                          </select>
                        </div>

                        <textarea
                          value={r.notes}
                          onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                          className="min-h-[70px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Notes (optional)"
                        />
                      </div>

                      <button
                        onClick={() => deleteRow(r.id)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700"
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-800">This week at a glance</h2>

            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Energy counts</span>
                  <span className="text-sm font-medium text-slate-900">
                    + {energyCounts["+"]} · 0 {energyCounts["0"]} · - {energyCounts["-"]}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                {totalsByLifeArea.slice(0, 8).map(([area, hrs]) => (
                  <div key={area} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-800">{area}</span>
                    <span className="text-sm font-medium">{hrs.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-800">Tips</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Hit <span className="font-medium">Save</span> whenever you like; it writes <span className="font-medium">data/{weekKey}.csv</span>.</li>
              <li>Use <span className="font-medium">Export CSV</span> if you ever want to back up or share.</li>
              <li>This is designed for quick thumb entry: keep activities short and honest.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
