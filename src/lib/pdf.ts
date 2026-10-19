// Dependency-free monthly PowerWise report (A4 PDF, Helvetica core fonts).
// The report is in English: PDF core fonts can't render Indic/Arabic/CJK
// scripts, and "Rs" is used instead of the rupee sign for the same reason.
import type { Analysis, Bill, Household, Tariff, Tip } from "./types.ts";
import { solarCheck, suggestedKw } from "./solar.ts";

const W = 595.28;
const H = 841.89;
const M = 40;
type RGB = [number, number, number];
const AMBER: RGB = [0.98, 0.75, 0.14];
const GREEN: RGB = [0.02, 0.59, 0.41];
const DARK: RGB = [0.06, 0.09, 0.16];
const SLATE: RGB = [0.39, 0.45, 0.55];
const LIGHT: RGB = [0.96, 0.97, 0.98];
const RED: RGB = [0.88, 0.22, 0.3];

const APP_NAMES: Record<string, string> = {
  ac: "Air conditioner", fridge: "Refrigerator", geyser: "Geyser", washer: "Washing machine", tv: "TV", fans: "Fans",
  lights: "Lights", iron: "Iron", induction: "Induction stove", ev: "EV / e-bike charging", other: "Other devices", solar: "Rooftop solar",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const mShort = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
/** Indian digit grouping: 1,23,456 */
export function inr(n: number) {
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}Rs ${rest ? rest + "," : ""}${last3}`;
}

export function tipText(t: Tip): string {
  const v = t.vars;
  switch (t.id) {
    case "acTemp": return `Set the AC to 26 C instead of ${v.from} C`;
    case "acHours": return `Run the AC ${v.to} h a day instead of ${v.from} h`;
    case "geyser": return `Use the geyser ${v.mins} minutes less each day`;
    case "fridge": return `Choose a 5-star fridge (yours is ${v.from}-star)`;
    case "fans": return `Switch to BLDC fans (about ${v.pct}% less power)`;
    case "lights": return `Switch lights off ${v.hours} hour earlier`;
    case "tv": return `Watch TV ${v.hours} hour less a day`;
    case "washer": return `Wash full loads only (${v.pct}% fewer cycles)`;
    case "iron": return `Iron clothes in one batch (${v.pct}% less time)`;
    case "solar": return `Add ${v.kw} kW rooftop solar`;
  }
}

export function pdfSafe(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/₹/g, "Rs ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/°/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function textWidth(s: string, size: number) {
  let w = 0;
  for (const ch of s) w += /[il.,'|!:;]/.test(ch) ? 260 : /[mwMW]/.test(ch) ? 850 : /[A-Z]/.test(ch) ? 660 : ch === " " ? 280 : 540;
  return (w / 1000) * size;
}
function fit(s: string, size: number, max: number) {
  if (textWidth(s, size) <= max) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + "...", size) > max) out = out.slice(0, -1);
  return out + "...";
}

class Page {
  ops: string[] = [];
  c(v: RGB) {
    return v.map((x) => x.toFixed(3)).join(" ");
  }
  rect(x: number, y: number, w: number, h: number, col: RGB) {
    this.ops.push(`${this.c(col)} rg ${x.toFixed(2)} ${(H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, col: RGB, w = 0.6) {
    this.ops.push(`${this.c(col)} RG ${w} w ${x1.toFixed(2)} ${(H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(H - y2).toFixed(2)} l S`);
  }
  text(s: string, x: number, y: number, size = 10, col: RGB = DARK, bold = false, maxW?: number) {
    const raw = maxW ? fit(s, size, maxW) : s;
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${this.c(col)} rg ${x.toFixed(2)} ${(H - y).toFixed(2)} Td (${pdfSafe(raw)}) Tj ET`);
  }
  right(s: string, xRight: number, y: number, size = 10, col: RGB = DARK, bold = false) {
    this.text(s, xRight - textWidth(s, size), y, size, col, bold);
  }
}

export interface ReportInput {
  household: Household;
  bills: Bill[];
  tariff: Tariff;
  analysis: Analysis;
  goal: number;
  now?: Date;
}

export function buildReport({ household: h, tariff, analysis: a, goal, now = new Date() }: ReportInput): Uint8Array {
  const pages: Page[] = [];
  let p = new Page();
  pages.push(p);

  // Header
  p.rect(0, 0, W, 82, AMBER);
  p.rect(0, 82, W, 4, GREEN);
  p.text("PowerWise", M, 40, 26, DARK, true);
  p.text("Know your bill before it arrives.", M, 62, 11, DARK);
  p.right("Monthly report", W - M, 38, 13, DARK, true);
  p.right(`Generated ${now.toISOString().slice(0, 10)}`, W - M, 56, 9.5, DARK);
  let y = 108;
  p.text(`${h.name || "My home"}  -  ${h.city} (${h.climate} climate), ${h.bhk} BHK, ${h.members} members, ${h.wfhDays} WFH days/week${h.solarKw ? `, ${h.solarKw} kW solar` : ""}`, M, y, 10, DARK, true, W - 2 * M);
  y += 14;
  p.text("Demo report: sample data, sample ML model and SAMPLE tariff rates. Not linked to any electricity board.", M, y, 8.5, SLATE);
  y += 22;

  // KPI boxes
  const bi = tariff.billing === "bimonthly";
  const kpis: Array<[string, string, string]> = [
    [bi ? "Next 2-month bill" : `Next bill (${mLabel(a.next.month)})`, inr(a.next.cost), `${inr(a.next.costLow)} - ${inr(a.next.costHigh)}`],
    ["Predicted units", `${a.next.units} kWh`, `${a.next.low} - ${a.next.high} kWh`],
    ["Next 12 months", inr(a.annualCost), `${a.annualUnits.toLocaleString("en-IN")} kWh`],
    ["Possible savings", inr(a.tips.slice(0, 3).reduce((s, t) => s + t.saving, 0)) + "/mo", `Goal ${inr(goal)}/mo`],
  ];
  const bw = (W - 2 * M - 3 * 10) / 4;
  kpis.forEach(([k, v, sub], i) => {
    const x = M + i * (bw + 10);
    p.rect(x, y, bw, 60, LIGHT);
    p.rect(x, y, 3, 60, i === 3 ? GREEN : AMBER);
    p.text(k, x + 10, y + 15, 8, SLATE, false, bw - 14);
    p.text(v, x + 10, y + 35, 15, DARK, true, bw - 14);
    p.text(sub, x + 10, y + 50, 8, SLATE, false, bw - 14);
  });
  y += 84;

  // Slab breakdown + appliances side by side
  const colW = (W - 2 * M - 20) / 2;
  p.text("How the next bill is calculated", M, y, 11.5, DARK, true);
  p.text("Top power eaters (next month)", M + colW + 20, y, 11.5, DARK, true);
  y += 16;
  let ly = y;
  for (const l of a.next.bill.lines) {
    p.text(l.to === null ? `Above ${l.from} units x Rs ${l.rate}` : `${l.from}-${l.to} units x Rs ${l.rate}`, M, ly, 9, SLATE);
    p.text(`${Math.round(l.units * 10) / 10} units`, M + 150, ly, 9, SLATE);
    p.right(inr(l.amount), M + colW, ly, 9, DARK);
    ly += 14;
  }
  const rows: Array<[string, number]> = [["Fixed charge", a.next.bill.fixed], [`Electricity duty (${tariff.dutyPct}%)`, a.next.bill.duty]];
  for (const [k, v] of rows) {
    p.text(k, M, ly, 9, SLATE);
    p.right(inr(v), M + colW, ly, 9, DARK);
    ly += 14;
  }
  p.line(M, ly - 6, M + colW, ly - 6, [0.85, 0.87, 0.9]);
  ly += 4;
  p.text("Total", M, ly, 10, DARK, true);
  p.right(inr(a.next.bill.total), M + colW, ly, 10, DARK, true);
  ly += 14;

  let ry = y;
  const items = a.breakdownNext.items.slice(0, 7);
  const maxU = Math.max(1, ...items.map((i) => i.units));
  const ax = M + colW + 20;
  for (const it of items) {
    p.text(APP_NAMES[it.id] ?? it.id, ax, ry, 9, DARK, false, 100);
    const bwid = ((colW - 175) * it.units) / maxU;
    p.rect(ax + 105, ry - 7, Math.max(2, bwid), 8, items.indexOf(it) < 3 ? AMBER : [0.8, 0.84, 0.88]);
    p.right(`${Math.round(it.units)} u`, ax + colW - 42, ry, 8.5, SLATE);
    p.right(inr(it.cost), ax + colW, ry, 8.5, DARK);
    ry += 14;
  }
  y = Math.max(ly, ry) + 18;

  // Tips
  p.text("Personal savings tips", M, y, 11.5, DARK, true);
  y += 16;
  const tips = a.tips.slice(0, 6);
  if (!tips.length) {
    p.text("Your home is already very efficient.", M, y, 9.5, SLATE);
    y += 14;
  }
  for (const t of tips) {
    p.rect(M, y - 7, 6, 6, GREEN);
    p.text(tipText(t), M + 12, y, 9.5, DARK, false, 360);
    p.right(`save ${inr(t.saving)}/month`, W - M, y, 9.5, GREEN, true);
    y += 15;
  }
  y += 14;

  // 12-month forecast chart
  p.text("12-month forecast (monthly-equivalent bill)", M, y, 11.5, DARK, true);
  y += 12;
  const chartH = 110;
  const maxC = Math.max(1, ...a.forecast.map((f) => f.cost));
  const slot = (W - 2 * M) / 12;
  a.forecast.forEach((f, i) => {
    const hgt = (chartH * f.cost) / maxC;
    const x = M + i * slot + 6;
    p.rect(x, y + chartH - hgt, slot - 12, hgt, f.expensive ? RED : f.season === "summer" ? AMBER : f.season === "winter" ? [0.38, 0.65, 0.98] : GREEN);
    p.text(mShort(f.month), x, y + chartH + 12, 7.5, SLATE);
    p.text(f.cost >= 1000 ? `${(f.cost / 1000).toFixed(1)}k` : String(f.cost), x, y + chartH - hgt - 4, 7.5, DARK);
  });
  y += chartH + 26;
  p.text("Red = most expensive months. Yellow = summer, green = monsoon / post-monsoon, blue = winter.", M, y, 8, SLATE);
  y += 22;

  // Solar
  const kw = suggestedKw(h, tariff, a.factor, a.start);
  const sol = solarCheck(h, tariff, a.factor, a.start, kw);
  p.text(`Solar check (sample assumptions): ${kw} kW rooftop`, M, y, 11.5, DARK, true);
  y += 15;
  p.text(`Saves about ${inr(sol.savingMonthly)}/month. Cost ${inr(sol.grossCost)} - sample subsidy ${inr(sol.subsidy)} = ${inr(sol.netCost)}. Payback ${sol.paybackYears ?? "-"} years.`, M, y, 9.5, DARK, false, W - 2 * M);
  y += 26;

  // History table (new page if needed)
  if (y > H - 160) {
    p = new Page();
    pages.push(p);
    y = 50;
  }
  p.text("Bill history: actual vs predicted", M, y, 11.5, DARK, true);
  y += 16;
  if (!a.history.length) {
    p.text("No past bills added yet.", M, y, 9.5, SLATE);
  } else {
    const cols = [M + 6, M + 120, M + 230, M + 340, M + 430];
    p.rect(M, y - 11, W - 2 * M, 16, LIGHT);
    ["MONTH", "ACTUAL UNITS", "PREDICTED", "DIFFERENCE", "AMOUNT"].forEach((c, i) => p.text(c, cols[i], y, 8, SLATE, true));
    y += 17;
    for (const r of a.history) {
      if (y > H - 50) {
        p = new Page();
        pages.push(p);
        y = 50;
      }
      const d = r.actual - r.predicted;
      p.text(mLabel(r.month), cols[0], y, 9);
      p.text(String(r.actual), cols[1], y, 9);
      p.text(String(r.predicted), cols[2], y, 9);
      p.text(`${d > 0 ? "+" : ""}${Math.round(d)}`, cols[3], y, 9, Math.abs(d) > r.predicted * 0.15 ? RED : SLATE);
      p.text(r.amount === null ? "-" : inr(r.amount), cols[4], y, 9);
      p.line(M, y + 5, W - M, y + 5, [0.9, 0.91, 0.94]);
      y += 15;
    }
    if (a.historyMae !== null) {
      y += 6;
      p.text(`Average gap between actual and predicted: ${a.historyMae} units a month.`, M, y, 8.5, SLATE);
    }
  }

  pages.forEach((pg, i) => pg.text(`PowerWise demo - sample data and sample tariff  |  page ${i + 1} of ${pages.length}`, M, H - 22, 8, SLATE));
  return assemble(pages);
}

function assemble(pages: Page[]): Uint8Array {
  const objs: string[] = [];
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  pages.forEach((pg, i) => {
    const content = pg.ops.join("\n");
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info << /Title (PowerWise monthly report) /Producer (PowerWise) >> >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out); // ASCII only, so length == bytes
}
