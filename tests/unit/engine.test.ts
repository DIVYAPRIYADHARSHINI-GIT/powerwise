// Tariff, CSV parsing, model parity with scikit-learn and analysis sanity.
import { test } from "node:test";
import assert from "node:assert/strict";
import model from "../../src/data/model.json" with { type: "json" };
import { SAMPLE_TARIFF, calcBill, monthlyCost, sanitizeTariff } from "../../src/lib/tariff.ts";
import { parseBillsCsv, parseMonth, historyCsv } from "../../src/lib/csv.ts";
import { analyze, predictRaw, predictUnits, quickPredict, type ExportedModel } from "../../src/lib/model.ts";
import { SAMPLE_HOUSEHOLD, SAMPLE_UNITS_BY_MONTH, emptyHousehold, sanitizeHousehold } from "../../src/lib/household.ts";
import { solarCheck, suggestedKw } from "../../src/lib/solar.ts";
import { buildReport } from "../../src/lib/pdf.ts";

const TODAY = new Date("2026-10-19T12:00:00");
const bills = SAMPLE_UNITS_BY_MONTH.map((u, i) => ({ id: `b${i}`, month: `2025-${String(i + 1).padStart(2, "0")}`, units: u, amount: null, source: "sample" as const }));

test("slab tariff is telescopic", () => {
  const b = calcBill(350, SAMPLE_TARIFF, 1);
  // 100*3 + 100*4.5 + 150*6 = 1650; + 60 fixed + 5% duty (82.5) = 1792.5 -> 1793
  assert.equal(b.energy, 1650);
  assert.equal(b.total, 1793);
  assert.equal(b.lines.length, 3);
  assert.equal(calcBill(0, SAMPLE_TARIFF, 1).total, 60);
});

test("bi-monthly doubles slab limits and fixed charge", () => {
  const bi = calcBill(700, { ...SAMPLE_TARIFF, billing: "bimonthly" }, 2);
  assert.equal(bi.lines[0].to, 200);
  assert.equal(bi.fixed, 120);
  assert.equal(bi.total, calcBill(350, SAMPLE_TARIFF, 1).total * 2 - 1); // 2 x 1792.5 = 3585
  assert.equal(monthlyCost(350, { ...SAMPLE_TARIFF, billing: "bimonthly" }), 3585 / 2);
});

test("sanitizeTariff repairs bad input", () => {
  const t = sanitizeTariff({ slabs: [{ upTo: 100, rate: 2 }, { upTo: 50, rate: 3 }], fixedCharge: -5, billing: "weekly" });
  assert.deepEqual(t.slabs, [{ upTo: 100, rate: 2 }, { upTo: null, rate: 2 }]);
  assert.equal(t.fixedCharge, 0);
  assert.equal(t.billing, "monthly");
  assert.equal(sanitizeTariff(null).slabs.length, SAMPLE_TARIFF.slabs.length);
});

test("CSV month formats and parsing", () => {
  for (const [raw, want] of [["2025-03", "2025-03"], ["2025/3", "2025-03"], ["03/2025", "2025-03"], ["Mar 2025", "2025-03"], ["march-25", "2025-03"], ["2025-03-15", "2025-03"], ["13/2025", null], ["hello", null]] as const)
    assert.equal(parseMonth(raw), want, raw);
  const r = parseBillsCsv("\uFEFFMonth,Units (kWh),Amount (Rs)\n2025-01,412,\"2,350\"\nFeb 2025,390,\nbad,1,2\n2025-03,-4,1\n");
  assert.equal(r.bills.length, 2);
  assert.equal(r.errors, 2);
  assert.deepEqual(r.bills[0], { id: "csv-2025-01", month: "2025-01", units: 412, amount: 2350, source: "csv" });
  assert.equal(r.bills[1].amount, null);
  const out = historyCsv(r.bills, new Map([["2025-01", 400]]));
  assert.ok(out.startsWith("\uFEFFmonth,units_kwh"));
  assert.ok(out.includes("2025-01,412,2350,400,csv"));
});

test("JS tree walker matches scikit-learn on parity samples", () => {
  const m = model as unknown as ExportedModel;
  assert.ok(m.parity && m.parity.length >= 10);
  for (const p of m.parity!) assert.ok(Math.abs(predictRaw(m, p.x) - p.y) < 1e-3);
  assert.ok(m.trees.length >= 100);
});

test("predictions follow the expected patterns", () => {
  const h = SAMPLE_HOUSEHOLD;
  assert.ok(predictUnits(h, "2026-05") > predictUnits(h, "2026-01") * 1.2, "summer AC peak (hot city)");
  const cool = { ...h, climate: "cool" as const, appliances: { ...h.appliances, ac: { count: 0, hours: 0, temp: 24 }, fans: { count: 2, hours: 3 }, geyser: { count: 1, hours: 1.5 } } };
  assert.ok(predictUnits(cool, "2027-01") > predictUnits(cool, "2026-07"), "winter geyser (cool city)");
  assert.ok(predictUnits({ ...h, wfhDays: 5 }, "2026-06") > predictUnits({ ...h, wfhDays: 0 }, "2026-06"), "WFH uses more");
  assert.ok(predictUnits({ ...h, solarKw: 3 }, "2026-04") < predictUnits(h, "2026-04") - 150, "solar lowers billed units");
  const less = { ...h, appliances: { ...h.appliances, ac: { ...h.appliances.ac, hours: 4 } } };
  assert.ok(predictUnits(less, "2026-05") < predictUnits(h, "2026-05"), "fewer AC hours -> fewer units");
});

test("analysis: next bill, forecast, breakdown, tips, history", () => {
  const a = analyze(SAMPLE_HOUSEHOLD, bills, SAMPLE_TARIFF, TODAY);
  assert.equal(a.next.month, "2026-11");
  assert.ok(a.next.costLow < a.next.cost && a.next.cost < a.next.costHigh);
  assert.equal(a.forecast.length, 12);
  assert.equal(a.forecast.filter((f) => f.expensive).length, 3);
  assert.ok(a.forecast.filter((f) => f.expensive).every((f) => f.season === "summer" || f.season === "monsoon"));
  assert.equal(a.breakdownNext.items[0].id, "ac");
  const share = a.breakdownNext.items.reduce((s, i) => s + i.share, 0);
  assert.ok(Math.abs(share - 100) < 1, `shares sum ${share}`);
  assert.ok(a.tips.length >= 4 && a.tips.every((t) => t.saving > 0));
  assert.ok(a.tips.some((t) => t.id === "acTemp"));
  assert.equal(a.history.length, 12);
  assert.ok(a.historyMae !== null && a.historyMae < 120);
  const q = quickPredict(SAMPLE_HOUSEHOLD, SAMPLE_TARIFF, a.factor, TODAY);
  assert.equal(q.next.cost, a.next.cost);
});

test("empty / odd households never crash", () => {
  const e = analyze(emptyHousehold(), [], { ...SAMPLE_TARIFF, billing: "bimonthly" }, TODAY);
  assert.ok(e.next.cost > 0 && e.next.bill.periodMonths === 2);
  const junk = sanitizeHousehold({ bhk: 99, members: -3, appliances: { ac: { count: 50, hours: 99, temp: 5 } } });
  assert.equal(junk.bhk, 3);
  assert.equal(junk.members, 1);
  assert.equal(junk.appliances.ac.count, 4);
  assert.equal(junk.appliances.ac.temp, 16);
  assert.ok(Number.isFinite(analyze(junk, [], SAMPLE_TARIFF, TODAY).next.cost));
});

test("solar check + PDF report", () => {
  const a = analyze(SAMPLE_HOUSEHOLD, bills, SAMPLE_TARIFF, TODAY);
  const kw = suggestedKw(SAMPLE_HOUSEHOLD, SAMPLE_TARIFF, a.factor, a.start);
  const s = solarCheck(SAMPLE_HOUSEHOLD, SAMPLE_TARIFF, a.factor, a.start, kw);
  assert.ok(kw >= 1 && kw <= 10);
  assert.ok(s.savingMonthly > 0 && s.paybackYears! > 1 && s.paybackYears! < 15);
  assert.equal(s.subsidy, 78000);
  const pdf = buildReport({ household: SAMPLE_HOUSEHOLD, bills, tariff: SAMPLE_TARIFF, analysis: a, goal: 500, now: TODAY });
  const txt = new TextDecoder().decode(pdf);
  assert.ok(txt.startsWith("%PDF-1.4") && txt.trimEnd().endsWith("%%EOF"));
  assert.ok(txt.includes("PowerWise") && txt.includes("SAMPLE tariff"));
  assert.ok(pdf.every((b) => b < 128), "ASCII only");
});
