import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ------- config -------
const CURRENCY = "NT$"; // change this one string to switch currency symbol

const CATEGORIES = {
  "Food & Drink": "#e8833a",
  Transportation: "#3a7bd5",
  Entertainment: "#9b5de5",
  "Personal Care": "#4adeb5",
  Shopping: "#e85d97",
  "Bills & Utilities": "#94a3b8",
  Health: "#f87171",
  Other: "#a8a29e",
};

// keyword -> category, for auto-suggesting while typing
const KEYWORDS = {
  "Food & Drink": ["coffee", "boba", "tea", "noodle", "soup", "water", "juice",
    "lunch", "dinner", "breakfast", "snack", "rice", "beef", "chicken", "pork",
    "food", "drink", "milk", "fruit", "bread", "dumpling", "ramen", "sushi",
    "restaurant", "cafe", "bakery", "hotpot", "bbq", "dessert", "ice cream"],
  Transportation: ["taxi", "uber", "bus", "train", "mrt", "gas", "fuel", "parking",
    "scooter", "metro", "hsr", "ubike", "bike", "flight", "ticket", "gogoro"],
  Entertainment: ["movie", "game", "pub", "bar", "club", "shrimp", "fishing",
    "concert", "karaoke", "ktv", "arcade", "billiard", "bowling", "drinks"],
  "Personal Care": ["haircut", "salon", "barber", "spa", "nails", "skincare", "gym"],
  Shopping: ["clothes", "shoes", "shirt", "amazon", "shopee", "book", "electronics",
    "phone case", "headphones", "gift"],
  "Bills & Utilities": ["rent", "electric", "phone", "internet", "subscription",
    "utility", "water bill", "netflix", "spotify"],
  Health: ["doctor", "pharmacy", "medicine", "clinic", "dental", "dentist", "supplement"],
};

function guessCategory(desc) {
  const d = desc.toLowerCase().trim();
  if (!d) return "Other";
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => d.includes(w))) return cat;
  }
  return "Other";
}

// seed data = the expenses from June 22, 2026
const SEED = [
  { id: 1, date: "2026-06-22", desc: "haircut", amount: 2300, cat: "Personal Care" },
  { id: 2, date: "2026-06-22", desc: "shrimping", amount: 400, cat: "Entertainment" },
  { id: 3, date: "2026-06-22", desc: "coconut water", amount: 110, cat: "Food & Drink" },
  { id: 4, date: "2026-06-22", desc: "more coconut water", amount: 140, cat: "Food & Drink" },
  { id: 5, date: "2026-06-22", desc: "beef noodle soup", amount: 300, cat: "Food & Drink" },
  { id: 6, date: "2026-06-22", desc: "boba", amount: 100, cat: "Food & Drink" },
  { id: 7, date: "2026-06-22", desc: "coffee", amount: 100, cat: "Food & Drink" },
  { id: 8, date: "2026-06-22", desc: "pub drinks", amount: 500, cat: "Entertainment" },
];

const STORE_KEY = "expenses-v1";

const store = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage) {
      try { const r = await window.storage.get(key); return r ? r.value : null; }
      catch { return null; }
    }
    try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; }
    catch { return null; }
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) {
      try { await window.storage.set(key, value); return; } catch { /* fall through */ }
    }
    try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); } catch {}
  },
};

// ------- visual tokens (dark liquid glass) -------
const C = {
  ink: "#e8eaed",
  muted: "rgba(255, 255, 255, 0.48)",
  accent: "#6ee7c8",
  accentDim: "rgba(110, 231, 200, 0.18)",
  danger: "#f87171",
  chartLine: "#6ee7c8",
  chartGrid: "rgba(255, 255, 255, 0.08)",
};

const SERIF = "ui-serif, Georgia, Cambria, Palatino, serif";
const serif = { fontFamily: SERIF };
const nums = { ...serif, fontVariantNumeric: "tabular-nums" };

const glass = {
  background: "rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(28px) saturate(170%)",
  WebkitBackdropFilter: "blur(28px) saturate(170%)",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
};

const glassInner = {
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

function glassBtn(active = false) {
  return {
    ...glassInner,
    borderRadius: 12,
    color: active ? "#0d1118" : C.ink,
    background: active
      ? "linear-gradient(180deg, rgba(110, 231, 200, 0.95) 0%, rgba(74, 200, 170, 0.85) 100%)"
      : "rgba(255, 255, 255, 0.07)",
    border: active
      ? "1px solid rgba(110, 231, 200, 0.5)"
      : "1px solid rgba(255, 255, 255, 0.14)",
    boxShadow: active
      ? "0 4px 16px rgba(110, 231, 200, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
      : "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  };
}

const fieldStyle = {
  ...glassInner,
  borderRadius: 12,
  color: C.ink,
};

const chartTooltipStyle = {
  background: "rgba(20, 24, 34, 0.88)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: 12,
  color: C.ink,
  fontFamily: SERIF,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(n) { return CURRENCY + Math.round(n).toLocaleString(); }
function prettyDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function shortDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function shiftDate(s, days) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function csvEscape(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function expensesToCsv(rows) {
  const header = "date,description,amount,category";
  const body = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .map((e) => [e.date, csvEscape(e.desc), e.amount, csvEscape(e.cat)].join(","));
  return [header, ...body].join("\n");
}

function csvToExpenses(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, desc, amount, cat] = parseCsvLine(lines[i]);
    const amt = parseFloat(amount);
    if (!date || !amt || amt <= 0) continue;
    out.push({
      id: Date.now() + i + Math.floor(Math.random() * 1000),
      date: date.trim(),
      desc: (desc || "").trim() || "(no label)",
      amount: amt,
      cat: (cat || "").trim() || guessCategory(desc),
    });
  }
  return out;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SpendingTracker() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [scope, setScope] = useState("day");

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Food & Drink");
  const [catTouched, setCatTouched] = useState(false);
  const [entryDate, setEntryDate] = useState(todayStr());
  const amountRef = useRef(null);
  const importRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await store.get(STORE_KEY);
        let data = raw ? JSON.parse(raw) : null;
        if (!data) { await store.set(STORE_KEY, JSON.stringify(SEED)); data = SEED; }
        setExpenses(data);
        if (data.length) setSelectedDate(data.map((e) => e.date).sort().slice(-1)[0]);
      } catch {
        setExpenses(SEED);
        setSelectedDate("2026-06-22");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(next) {
    setExpenses(next);
    await store.set(STORE_KEY, JSON.stringify(next));
  }

  useEffect(() => { if (!catTouched) setCat(guessCategory(desc)); }, [desc, catTouched]);

  function addExpense() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { amountRef.current && amountRef.current.focus(); return; }
    const entry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: entryDate, desc: desc.trim() || "(no label)", amount: amt, cat,
    };
    persist([...expenses, entry]);
    setSelectedDate(entryDate);
    setAmount(""); setDesc(""); setCatTouched(false);
    amountRef.current && amountRef.current.focus();
  }

  function removeExpense(id) { persist(expenses.filter((e) => e.id !== id)); }

  function startEdit(e) {
    setEditingId(e.id);
    setDraft({ amount: String(e.amount), desc: e.desc, cat: e.cat, date: e.date });
  }
  function saveEdit() {
    const amt = parseFloat(draft.amount);
    if (!amt || amt <= 0) return;
    const next = expenses.map((e) =>
      e.id === editingId ? { ...e, amount: amt, desc: draft.desc.trim() || "(no label)", cat: draft.cat, date: draft.date } : e
    );
    persist(next);
    setSelectedDate(draft.date);
    setEditingId(null); setDraft(null);
  }
  function cancelEdit() { setEditingId(null); setDraft(null); }

  function applyQuick(q) {
    setDesc(q.desc); setAmount(String(q.amount)); setCat(q.cat); setCatTouched(true);
    amountRef.current && amountRef.current.focus();
  }

  function exportCsv() {
    downloadFile(`expenses-${todayStr()}.csv`, expensesToCsv(expenses), "text/csv;charset=utf-8");
  }

  function exportJson() {
    downloadFile(`expenses-backup-${todayStr()}.json`, JSON.stringify(expenses, null, 2), "application/json");
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const isJson = file.name.endsWith(".json") || text.trimStart().startsWith("[");
      const incoming = isJson ? JSON.parse(text) : csvToExpenses(text);
      if (!Array.isArray(incoming) || incoming.length === 0) return;
      const normalized = incoming.map((e, i) => ({
        id: e.id || Date.now() + i + Math.floor(Math.random() * 1000),
        date: e.date,
        desc: e.desc || "(no label)",
        amount: Number(e.amount),
        cat: e.cat || guessCategory(e.desc),
      })).filter((e) => e.date && e.amount > 0);
      if (!normalized.length) return;
      const merged = [...expenses, ...normalized];
      await persist(merged);
      if (normalized.length) setSelectedDate(normalized[normalized.length - 1].date);
    } catch { /* invalid file */ }
  }

  function onImportPick(e) {
    importFile(e.target.files?.[0]);
    e.target.value = "";
  }

  const dayEntries = useMemo(
    () => expenses.filter((e) => e.date === selectedDate).sort((a, b) => b.id - a.id),
    [expenses, selectedDate]
  );
  const dayTotal = useMemo(() => dayEntries.reduce((s, e) => s + e.amount, 0), [dayEntries]);
  const allTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const quickAdds = useMemo(() => {
    const map = {};
    [...expenses].sort((a, b) => a.id - b.id).forEach((e) => {
      const key = e.desc.toLowerCase().trim();
      if (!key || key === "(no label)") return;
      map[key] = { desc: e.desc, cat: e.cat, amount: e.amount, lastId: e.id };
    });
    return Object.values(map).sort((a, b) => b.lastId - a.lastId).slice(0, 7);
  }, [expenses]);

  const breakdown = useMemo(() => {
    const src = scope === "day" ? dayEntries : expenses;
    const map = {};
    src.forEach((e) => (map[e.cat] = (map[e.cat] || 0) + e.amount));
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: total ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [scope, dayEntries, expenses]);

  const dailyTrend = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.date] = (map[e.date] || 0) + e.amount; });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, label: shortDate(date), total }));
  }, [expenses]);

  const scopeTotal = scope === "day" ? dayTotal : allTotal;

  if (loading) {
    return (
      <div style={{ ...glass, ...serif, color: C.muted, borderRadius: 20 }} className="p-10 text-center text-sm">
        Loading your ledger…
      </div>
    );
  }

  return (
    <div style={{ ...glass, ...serif, color: C.ink, borderRadius: 24 }} className="p-4 sm:p-6">
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <div style={{ letterSpacing: "0.18em" }} className="text-xs font-semibold uppercase">
            <span style={{ color: C.accent }}>●</span> Cash Ledger
          </div>
          <h1 className="text-2xl font-bold mt-1">Spending tracker</h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>All-time logged</div>
          <div className="text-xl font-bold" style={nums}>{fmt(allTotal)}</div>
          <div className="text-xs" style={{ color: C.muted }}>{expenses.length} entries</div>
        </div>
      </div>

      {/* add bar */}
      <div style={{ ...glassInner, borderRadius: 20 }} className="p-4 mb-5">
        <div className="flex flex-wrap gap-2 items-stretch">
          <div className="flex items-center rounded-xl px-3" style={fieldStyle}>
            <span className="text-sm font-semibold mr-1" style={{ color: C.muted }}>{CURRENCY}</span>
            <input ref={amountRef} type="number" inputMode="decimal" placeholder="0" value={amount}
              onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addExpense()}
              className="bg-transparent outline-none py-2 w-20 text-base font-semibold" style={nums} />
          </div>
          <input type="text" placeholder="what was it? (e.g. coffee)" value={desc}
            onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addExpense()}
            className="flex-1 min-w-40 rounded-xl px-3 py-2 text-sm outline-none" style={fieldStyle} />
          <select value={cat} onChange={(e) => { setCat(e.target.value); setCatTouched(true); }}
            className="rounded-xl px-2 py-2 text-sm outline-none" style={fieldStyle}>
            {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
            className="rounded-xl px-2 py-2 text-sm outline-none" style={fieldStyle} />
          <button onClick={addExpense} className="rounded-xl px-5 py-2 text-sm font-semibold" style={glassBtn(true)}>Add</button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <span className="text-xs" style={{ color: C.muted }}>Quick add</span>
          {quickAdds.length === 0 ? (
            <span className="text-xs" style={{ color: C.muted }}>— items you log will show up here for one-tap re-adding</span>
          ) : quickAdds.map((q) => (
            <button key={q.desc} onClick={() => applyQuick(q)} className="text-xs rounded-full px-3 py-1"
              style={{ ...glassInner, borderRadius: 99, color: C.ink }}>
              {q.desc}
            </button>
          ))}
        </div>
      </div>

      {/* spending over time */}
      <div style={{ ...glassInner, borderRadius: 20 }} className="p-4 mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Spending over time</h2>
          <span className="text-xs" style={{ color: C.muted }}>Daily totals</span>
        </div>
        {dailyTrend.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: C.muted }}>Log expenses to see your daily trend.</div>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={C.chartGrid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 11, fontFamily: SERIF }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11, fontFamily: SERIF }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  width={36}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v) => [fmt(v), "Day total"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? prettyDate(payload[0].payload.date) : ""}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={C.chartLine}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: C.chartLine, stroke: "#0d1118", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: C.chartLine, stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* main grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* day column */}
        <div style={{ ...glassInner, borderRadius: 20 }} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} className="px-2 py-1 rounded-xl text-sm" style={glassBtn()}>‹</button>
            <div className="text-center">
              <div className="font-semibold">{prettyDate(selectedDate)}</div>
              <button onClick={() => setSelectedDate(todayStr())} className="text-xs underline" style={{ color: C.muted }}>jump to today</button>
            </div>
            <button onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} className="px-2 py-1 rounded-xl text-sm" style={glassBtn()}>›</button>
          </div>

          <div className="flex items-baseline justify-between mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>Day total</span>
            <span className="text-xl font-bold" style={nums}>{fmt(dayTotal)}</span>
          </div>

          {dayEntries.length === 0 ? (
            <div className="text-sm py-6 text-center" style={{ color: C.muted }}>Nothing logged this day. Add something above.</div>
          ) : (
            <ul className="space-y-2">
              {dayEntries.map((e) => editingId === e.id ? (
                <li key={e.id} className="rounded-xl p-2" style={{ ...glassInner, borderRadius: 14 }}>
                  <div className="flex flex-wrap gap-2">
                    <input type="number" value={draft.amount} onChange={(ev) => setDraft({ ...draft, amount: ev.target.value })}
                      className="w-20 rounded-lg px-2 py-1 text-sm outline-none" style={{ ...nums, ...fieldStyle }} />
                    <input type="text" value={draft.desc} onChange={(ev) => setDraft({ ...draft, desc: ev.target.value })}
                      className="flex-1 min-w-32 rounded-lg px-2 py-1 text-sm outline-none" style={fieldStyle} />
                    <select value={draft.cat} onChange={(ev) => setDraft({ ...draft, cat: ev.target.value })}
                      className="rounded-lg px-1 py-1 text-sm outline-none" style={fieldStyle}>
                      {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input type="date" value={draft.date} onChange={(ev) => setDraft({ ...draft, date: ev.target.value })}
                      className="rounded-lg px-1 py-1 text-sm outline-none" style={fieldStyle} />
                    <button onClick={saveEdit} className="rounded-lg px-3 py-1 text-sm font-semibold" style={glassBtn(true)}>Save</button>
                    <button onClick={cancelEdit} className="rounded-lg px-3 py-1 text-sm" style={{ ...glassBtn(), color: C.muted }}>Cancel</button>
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.muted }}>Change the date to move this spend to another day.</div>
                </li>
              ) : (
                <li key={e.id} className="flex items-center gap-2 py-1">
                  <span style={{ background: CATEGORIES[e.cat], width: 8, height: 8, borderRadius: 99, flexShrink: 0, boxShadow: `0 0 8px ${CATEGORIES[e.cat]}66` }} />
                  <span className="flex-1 text-sm truncate">{e.desc}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full hidden sm:inline"
                    style={{ color: CATEGORIES[e.cat], background: CATEGORIES[e.cat] + "28", border: `1px solid ${CATEGORIES[e.cat]}44` }}>{e.cat}</span>
                  <span className="text-sm font-semibold shrink-0" style={nums}>{fmt(e.amount)}</span>
                  <button onClick={() => startEdit(e)} className="text-xs rounded-lg px-2 py-1 shrink-0" style={glassBtn()}>Edit</button>
                  <button onClick={() => removeExpense(e.id)} className="text-xs rounded-lg px-2 py-1 shrink-0"
                    style={{ ...glassBtn(), color: C.danger, border: "1px solid rgba(248, 113, 113, 0.35)" }}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* breakdown column */}
        <div style={{ ...glassInner, borderRadius: 20 }} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">By category</h2>
            <div className="flex rounded-xl overflow-hidden" style={{ ...glassInner, padding: 2, borderRadius: 12 }}>
              {["day", "all"].map((s) => (
                <button key={s} onClick={() => setScope(s)} className="text-xs px-3 py-1 font-medium rounded-lg"
                  style={glassBtn(scope === s)}>
                  {s === "day" ? "This day" : "All time"}
                </button>
              ))}
            </div>
          </div>

          {breakdown.length === 0 ? (
            <div className="text-sm py-6 text-center" style={{ color: C.muted }}>No data for this view yet.</div>
          ) : (
            <>
              <div style={{ height: 150 }} className="mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none">
                      {breakdown.map((b) => <Cell key={b.name} fill={CATEGORIES[b.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-xs mb-3" style={{ color: C.muted }}>Total {fmt(scopeTotal)}</div>
              <div className="space-y-2">
                {breakdown.map((b) => (
                  <div key={b.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: C.ink }}>{b.name}</span>
                      <span style={nums} className="font-semibold">{fmt(b.value)}<span style={{ color: C.muted }}> · {b.pct.toFixed(0)}%</span></span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.08)", height: 6, borderRadius: 99 }}>
                      <div style={{ background: CATEGORIES[b.name], width: `${b.pct}%`, height: 6, borderRadius: 99, boxShadow: `0 0 8px ${CATEGORIES[b.name]}55` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs" style={{ color: C.muted }}>
          Data saves on this device only. Amounts shown in {CURRENCY}.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="text-xs rounded-lg px-3 py-1.5" style={glassBtn()}>Export CSV</button>
          <button onClick={exportJson} className="text-xs rounded-lg px-3 py-1.5" style={glassBtn()}>Backup JSON</button>
          <button onClick={() => importRef.current?.click()} className="text-xs rounded-lg px-3 py-1.5" style={glassBtn()}>Import</button>
          <input ref={importRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={onImportPick} />
        </div>
      </div>
    </div>
  );
}
