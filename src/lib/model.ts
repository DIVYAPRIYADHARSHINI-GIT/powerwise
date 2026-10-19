// PowerWise prediction engine (pure TypeScript, no Python at runtime).
//  - predictUnits(): walks the gradient-boosted trees exported by ml/train_model.py
//  - applianceKwh(): the same engineering rules used to generate the sample
//    data; used to split the model's prediction between appliances
//  - analyze(): next bill + range, 12-month forecast, breakdown, tips, history
import modelJson from "../data/model.json" with { type: "json" };
import metricsJson from "../data/metrics.json" with { type: "json" };
import physicsJson from "../data/physics.json" with { type: "json" };
import { addMonths, daysIn, monthNum, nextMonth, ymOf } from "./household.ts";
import { calcBill, monthlyCost } from "./tariff.ts";
import { APPLIANCES, CLIMATES, type Analysis, type Bill, type Breakdown, type Household, type MonthForecast, type PredictResult, type Season, type Tariff, type Tip, type UsageId } from "./types.ts";

export interface ExportedModel {
  features: string[];
  baseline: number;
  trees: { f: number[]; t: number[]; l: number[]; r: number[]; v: number[] }[];
  parity?: { x: number[]; y: number }[];
}
const MODEL = modelJson as unknown as ExportedModel;
const P = physicsJson as unknown as {
  kw: Record<string, number>;
  fridgeKwhDay: { base: number; perStar: number };
  acTempPerDeg: number;
  season: Record<"ac" | "geyser" | "fans" | "fridge", Record<string, number[]>>;
  lightMonth: number[];
  festival: number[];
  festivalLights: number;
  festivalCooking: number;
  festivalExtraKwh: number;
  wfhLoadPerDay: number;
  wfhKwhPerDay: number;
  misc: { base: number; perMember: number; perBhk: number };
  solarKwhPerKwDay: Record<string, number>;
  solarMonth: number[];
};
export const PHYSICS = P;
export const RANGE = metricsJson.range;

/** Raw tree-ensemble output for one feature vector (same as sklearn .predict). */
export function predictRaw(model: ExportedModel, x: number[]): number {
  let s = model.baseline;
  for (const t of model.trees) {
    let i = 0;
    while (t.f[i] !== -1) i = x[t.f[i]] <= t.t[i] ? t.l[i] : t.r[i];
    s += t.v[i];
  }
  return s;
}

const fridgeDay = (h: Household) => h.appliances.fridge.count * (P.fridgeKwhDay.base + P.fridgeKwhDay.perStar * (h.appliances.fridge.star ?? 3));
const load = (h: Household, id: (typeof APPLIANCES)[number]) => h.appliances[id].count * h.appliances[id].hours;

export function features(h: Household, month: number): number[] {
  const c = h.climate;
  const m = month - 1;
  const a = h.appliances;
  const v: Record<string, number> = {
    members: h.members,
    bhk: h.bhk,
    climate: CLIMATES.indexOf(c),
    month,
    festival: P.festival[m],
    wfh_days: h.wfhDays,
    ac_load: load(h, "ac"),
    ac_temp: a.ac.count > 0 ? (a.ac.temp ?? 24) : 24,
    fridge_load: fridgeDay(h),
    geyser_load: load(h, "geyser"),
    washer_load: load(h, "washer"),
    tv_load: load(h, "tv"),
    fan_load: load(h, "fans"),
    light_load: load(h, "lights"),
    iron_load: load(h, "iron"),
    induction_load: load(h, "induction"),
    ev_load: load(h, "ev"),
    solar_kw: h.solarKw,
    ac_season: load(h, "ac") * P.season.ac[c][m],
    geyser_season: load(h, "geyser") * P.season.geyser[c][m],
    fan_season: load(h, "fans") * P.season.fans[c][m],
    fridge_season: fridgeDay(h) * P.season.fridge[c][m],
    solar_season: h.solarKw * P.solarKwhPerKwDay[c] * P.solarMonth[m],
  };
  return MODEL.features.map((f) => v[f] ?? 0);
}

/** Model prediction of billed (net) units for a calendar month (YYYY-MM). */
export function predictUnits(h: Household, ym: string): number {
  return Math.max(0, predictRaw(MODEL, features(h, monthNum(ym))));
}

/** Engineering estimate of monthly kWh per appliance (before solar). */
export function applianceKwh(h: Household, ym: string): Record<UsageId, number> {
  const m = monthNum(ym) - 1;
  const days = daysIn(ym);
  const c = h.climate;
  const a = h.appliances;
  const wfh = 1 + P.wfhLoadPerDay * h.wfhDays;
  const fest = P.festival[m];
  const k = P.kw;
  const tempF = Math.max(0.45, Math.min(1.6, 1 + P.acTempPerDeg * (24 - (a.ac.temp ?? 24))));
  return {
    ac: load(h, "ac") * P.season.ac[c][m] * wfh * k.ac * tempF * days,
    fridge: fridgeDay(h) * P.season.fridge[c][m] * days,
    geyser: load(h, "geyser") * P.season.geyser[c][m] * k.geyser * days,
    washer: load(h, "washer") * k.washer * days,
    tv: load(h, "tv") * k.tv * days,
    fans: load(h, "fans") * P.season.fans[c][m] * wfh * k.fans * days,
    lights: load(h, "lights") * P.lightMonth[m] * (1 + P.festivalLights * fest) * wfh * k.lights * days,
    iron: load(h, "iron") * k.iron * days,
    induction: load(h, "induction") * (1 + P.festivalCooking * fest) * k.induction * days,
    ev: load(h, "ev") * k.ev * days,
    other: (P.misc.base + P.misc.perMember * h.members + P.misc.perBhk * h.bhk) * days + ((P.wfhKwhPerDay * h.wfhDays) / 7) * days + P.festivalExtraKwh * fest,
  };
}

export function solarKwh(kw: number, climate: string, ym: string) {
  return kw * P.solarKwhPerKwDay[climate] * P.solarMonth[monthNum(ym) - 1] * daysIn(ym);
}

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return "summer";
  if (month >= 6 && month <= 9) return "monsoon";
  if (month >= 10 && month <= 11) return "postMonsoon";
  return "winter";
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

/** Personal factor learned from the household's own past bills (1 = typical home). */
export function calibration(h: Household, bills: Bill[]) {
  const recent = bills.filter((b) => b.units > 0).slice(-12);
  if (!recent.length) return { factor: 1, n: 0 };
  const ratios = recent.map((b) => b.units / Math.max(25, predictUnits(h, b.month)));
  const med = Math.min(2, Math.max(0.5, median(ratios)));
  const w = recent.length / (recent.length + 2);
  return { factor: round(1 + (med - 1) * w, 3), n: recent.length };
}

export function startMonth(today = new Date()) {
  return nextMonth(today);
}

/** Next 12 months: units, cost and season for one household. */
export function forecast(h: Household, tariff: Tariff, factor: number, start: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(start, i);
    const units = predictUnits(h, month) * factor;
    return { month, units, cost: monthlyCost(units, tariff) };
  });
}

function breakdownFor(h: Household, tariff: Tariff, factor: number, months: string[]): Breakdown {
  const noSolar: Household = { ...h, solarKw: 0 };
  const sum = {} as Record<UsageId, number>;
  let gross = 0;
  let net = 0;
  let cost = 0;
  for (const ym of months) {
    const parts = applianceKwh(h, ym);
    const physTotal = Object.values(parts).reduce((a, b) => a + b, 0) || 1;
    const g = predictUnits(noSolar, ym) * factor;
    const n = Math.min(g, predictUnits(h, ym) * factor);
    // Scale the engineering split so it adds up to the model's prediction.
    for (const id of Object.keys(parts) as UsageId[]) sum[id] = (sum[id] ?? 0) + (parts[id] / physTotal) * g;
    gross += g;
    net += n;
    cost += monthlyCost(n, tariff);
  }
  const k = months.length;
  const variable = Math.max(0, cost / k - tariff.fixedCharge);
  const grossM = gross / k;
  const items = (Object.keys(sum) as UsageId[])
    .map((id) => {
      const units = sum[id] / k;
      return { id, units: round(units, 1), cost: grossM > 0 ? Math.round((variable * units) / grossM) : 0, share: grossM > 0 ? round((units / grossM) * 100, 1) : 0 };
    })
    .filter((i) => i.units >= 0.5)
    .sort((a, b) => b.units - a.units);
  return { items, grossUnits: round(grossM), solarUnits: round(Math.max(0, grossM - net / k)), netUnits: round(net / k), cost: Math.round(cost / k) };
}

const annualCostOf = (h: Household, tariff: Tariff, factor: number, start: string) => forecast(h, tariff, factor, start).reduce((a, m) => a + m.cost, 0);

function clone(h: Household): Household {
  return { ...h, appliances: Object.fromEntries(Object.entries(h.appliances).map(([k, v]) => [k, { ...v }])) as Household["appliances"] };
}

export function tipsFor(h: Household, tariff: Tariff, factor: number, start: string): Tip[] {
  const base = annualCostOf(h, tariff, factor, start);
  const baseUnits = forecast(h, tariff, factor, start).reduce((a, m) => a + m.units, 0);
  const a = h.appliances;
  const out: Tip[] = [];
  const tryTip = (id: Tip["id"], appliance: Tip["appliance"], vars: Record<string, number>, change: (x: Household) => void) => {
    const x = clone(h);
    change(x);
    const f = forecast(x, tariff, factor, start);
    const saving = Math.round((base - f.reduce((s, m) => s + m.cost, 0)) / 12);
    const units = Math.round((baseUnits - f.reduce((s, m) => s + m.units, 0)) / 12);
    if (saving >= 10) out.push({ id, appliance, saving, units, vars });
  };
  if (a.ac.count && (a.ac.temp ?? 24) < 26) tryTip("acTemp", "ac", { from: a.ac.temp ?? 24, to: 26 }, (x) => (x.appliances.ac.temp = 26));
  if (a.ac.count && a.ac.hours >= 3) tryTip("acHours", "ac", { from: a.ac.hours, to: a.ac.hours - 2 }, (x) => (x.appliances.ac.hours -= 2));
  if (a.geyser.count && a.geyser.hours >= 0.5) tryTip("geyser", "geyser", { mins: 15 }, (x) => (x.appliances.geyser.hours -= 0.25));
  if (a.fridge.count && (a.fridge.star ?? 3) <= 3) tryTip("fridge", "fridge", { from: a.fridge.star ?? 3 }, (x) => (x.appliances.fridge.star = 5));
  // BLDC fans draw ~28 W instead of ~65 W: same comfort, ~55 % less energy.
  if (a.fans.count && a.fans.hours >= 4) tryTip("fans", "fans", { pct: 55 }, (x) => (x.appliances.fans.hours = round(x.appliances.fans.hours * 0.45, 2)));
  if (a.lights.count >= 4 && a.lights.hours >= 3) tryTip("lights", "lights", { hours: 1 }, (x) => (x.appliances.lights.hours -= 1));
  if (a.tv.count && a.tv.hours >= 3) tryTip("tv", "tv", { hours: 1 }, (x) => (x.appliances.tv.hours -= 1));
  if (a.washer.count && a.washer.hours >= 0.5) tryTip("washer", "washer", { pct: 25 }, (x) => (x.appliances.washer.hours = round(x.appliances.washer.hours * 0.75, 2)));
  if (a.iron.count && a.iron.hours >= 0.5) tryTip("iron", "iron", { pct: 30 }, (x) => (x.appliances.iron.hours = round(x.appliances.iron.hours * 0.7, 2)));
  if (h.solarKw === 0 && h.climate !== "cool") tryTip("solar", "solar", { kw: 2 }, (x) => (x.solarKw = 2));
  return out.sort((p, q) => q.saving - p.saving);
}

export function analyze(h: Household, bills: Bill[], tariff: Tariff, today = new Date()): Analysis {
  const start = startMonth(today);
  const { factor, n } = calibration(h, bills);
  const months = forecast(h, tariff, factor, start);
  const noSolar: Household = { ...h, solarKw: 0 };
  const grossUnits = months.map((m) => round(Math.max(m.units, predictUnits(noSolar, m.month) * factor), 1));

  const sortedCost = [...months].map((m) => m.cost).sort((a, b) => b - a);
  const expensiveCut = sortedCost[2] ?? Infinity;
  const fc: MonthForecast[] = months.map((m) => ({
    month: m.month,
    units: round(m.units),
    low: round(m.units * RANGE.low),
    high: round(m.units * RANGE.high),
    cost: Math.round(m.cost),
    season: seasonOf(monthNum(m.month)),
    festival: P.festival[monthNum(m.month) - 1] >= 0.5,
    expensive: m.cost >= expensiveCut && m.cost > 0,
  }));

  // Next bill: one month, or the next two months for bi-monthly billing.
  const period = tariff.billing === "bimonthly" ? 2 : 1;
  const nextUnits = months.slice(0, period).reduce((a, m) => a + m.units, 0);
  const bill = calcBill(nextUnits, tariff, period);
  const lowBill = calcBill(nextUnits * RANGE.low, tariff, period).total;
  const highBill = calcBill(nextUnits * RANGE.high, tariff, period).total;

  const last12 = bills.filter((b) => b.month < start).slice(-12);
  const history = last12.map((b) => ({ month: b.month, actual: b.units, predicted: round(predictUnits(h, b.month)), amount: b.amount }));
  const historyMae = history.length ? round(history.reduce((s, p) => s + Math.abs(p.actual - p.predicted), 0) / history.length, 1) : null;

  return {
    start,
    factor,
    factorBills: n,
    next: { month: start, units: round(nextUnits), low: round(nextUnits * RANGE.low), high: round(nextUnits * RANGE.high), cost: bill.total, costLow: lowBill, costHigh: highBill, bill },
    forecast: fc,
    grossUnits,
    breakdownNext: breakdownFor(h, tariff, factor, [start]),
    breakdownYear: breakdownFor(h, tariff, factor, months.map((m) => m.month)),
    tips: tipsFor(h, tariff, factor, start),
    history,
    historyMae,
    annualCost: Math.round(months.reduce((a, m) => a + m.cost, 0)),
    annualUnits: Math.round(months.reduce((a, m) => a + m.units, 0)),
  };
}

/** Light-weight prediction for the what-if simulator. */
export function quickPredict(h: Household, tariff: Tariff, factor: number, today = new Date()): PredictResult {
  const start = startMonth(today);
  const months = forecast(h, tariff, factor, start);
  const period = tariff.billing === "bimonthly" ? 2 : 1;
  const nextUnits = months.slice(0, period).reduce((a, m) => a + m.units, 0);
  const annual = months.reduce((a, m) => a + m.cost, 0);
  return {
    months: months.map((m) => ({ month: m.month, units: round(m.units), cost: Math.round(m.cost) })),
    next: { units: round(nextUnits), cost: calcBill(nextUnits, tariff, period).total },
    avgCost: Math.round(annual / 12),
    annualCost: Math.round(annual),
  };
}

export { ymOf };
