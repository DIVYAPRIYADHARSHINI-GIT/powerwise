// Bill history CSV import/export (pure).
import { MONTH_RE } from "./household.ts";
import type { Bill, HistoryPoint } from "./types.ts";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Accepts 2025-03, 2025/3, 03/2025, 3-2025, Mar 2025, March-2025, 2025-03-15. */
export function parseMonth(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (m) return fmt(+m[1], +m[2]);
  m = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return fmt(+m[2], +m[1]);
  m = s.match(/^([a-z]{3})[a-z]*[\s\-/.']*(\d{2}|\d{4})$/);
  if (m && MONTHS.includes(m[1])) return fmt(m[2].length === 2 ? 2000 + +m[2] : +m[2], MONTHS.indexOf(m[1]) + 1);
  return null;
}
function fmt(y: number, mo: number) {
  if (mo < 1 || mo > 12 || y < 2000 || y > 2100) return null;
  const v = `${y}-${String(mo).padStart(2, "0")}`;
  return MONTH_RE.test(v) ? v : null;
}

const toNum = (s: string | undefined) => {
  if (s === undefined) return NaN;
  const clean = s.replace(/[₹,\s]|rs\.?|inr|kwh|units?/gi, "");
  return clean === "" ? NaN : Number(clean);
};

export interface CsvResult {
  bills: Bill[];
  errors: number;
}

export function parseBillsCsv(text: string): CsvResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { bills: [], errors: 0 };
  const head = splitLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = head.some((h) => /month|date|period|unit|kwh|amount|bill/.test(h));
  const iMonth = hasHeader ? Math.max(0, head.findIndex((h) => /month|date|period/.test(h))) : 0;
  const iUnits = hasHeader ? head.findIndex((h) => /unit|kwh|consum/.test(h)) : 1;
  const iAmount = hasHeader ? head.findIndex((h) => /amount|bill|rs|₹|inr|cost/.test(h) && !/unit/.test(h)) : 2;
  const bills: Bill[] = [];
  let errors = 0;
  for (const line of lines.slice(hasHeader ? 1 : 0).slice(0, 500)) {
    const cells = splitLine(line);
    const month = parseMonth(cells[iMonth] ?? "");
    const units = toNum(cells[iUnits < 0 ? 1 : iUnits]);
    const amount = iAmount >= 0 ? toNum(cells[iAmount]) : NaN;
    if (!month || !Number.isFinite(units) || units < 0 || units > 20000) {
      errors++;
      continue;
    }
    bills.push({ id: `csv-${month}`, month, units: Math.round(units * 10) / 10, amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null, source: "csv" });
  }
  return { bills, errors };
}

const cell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function historyCsv(bills: Bill[], predicted: Map<string, number>): string {
  const rows = [["month", "units_kwh", "amount_inr", "predicted_units_kwh", "source"]];
  for (const b of bills) rows.push([b.month, String(b.units), b.amount === null ? "" : String(b.amount), predicted.has(b.month) ? String(predicted.get(b.month)) : "", b.source]);
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function historyPointsCsv(points: HistoryPoint[]) {
  return historyCsv(points.map((p) => ({ id: p.month, month: p.month, units: p.actual, amount: p.amount, source: "manual" })), new Map(points.map((p) => [p.month, p.predicted])));
}
