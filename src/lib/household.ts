// Household defaults, limits and validation (pure; client + server).
import sample from "../data/sample.json" with { type: "json" };
import physics from "../data/physics.json" with { type: "json" };
import { APPLIANCES, CLIMATES, type ApplianceId, type ApplianceUse, type Bill, type Climate, type Household } from "./types.ts";

export interface ApplianceSpec {
  maxCount: number;
  maxHours: number;
  step: number;
  /** Rated / average power in watts (shown in the UI). */
  watts: number;
}

export const SPECS: Record<ApplianceId, ApplianceSpec> = {
  ac: { maxCount: 4, maxHours: 24, step: 0.5, watts: 1160 },
  fridge: { maxCount: 3, maxHours: 24, step: 24, watts: 0 },
  geyser: { maxCount: 3, maxHours: 4, step: 0.25, watts: 1700 },
  washer: { maxCount: 2, maxHours: 4, step: 0.25, watts: 450 },
  tv: { maxCount: 4, maxHours: 16, step: 0.5, watts: 90 },
  fans: { maxCount: 12, maxHours: 24, step: 0.5, watts: 65 },
  lights: { maxCount: 40, maxHours: 24, step: 0.5, watts: 12 },
  iron: { maxCount: 2, maxHours: 3, step: 0.25, watts: 750 },
  induction: { maxCount: 2, maxHours: 5, step: 0.25, watts: 1300 },
  ev: { maxCount: 3, maxHours: 10, step: 0.5, watts: 650 },
};

export const CITIES = physics.cities as Record<Climate, string[]>;
export const ALL_CITIES = (Object.entries(CITIES) as [Climate, string[]][]).flatMap(([c, list]) => list.map((city) => ({ city, climate: c }))).sort((a, b) => a.city.localeCompare(b.city));

export const SAMPLE_HOUSEHOLD = sample.household as Household;
/** "Actual" units for Jan..Dec of the sample household (generated with noise). */
export const SAMPLE_UNITS_BY_MONTH = sample.unitsByMonth as number[];

export function emptyHousehold(): Household {
  const appliances = Object.fromEntries(APPLIANCES.map((a) => [a, { count: 0, hours: 0 }])) as Record<ApplianceId, ApplianceUse>;
  appliances.ac.temp = 24;
  appliances.fridge = { count: 1, hours: 24, star: 3 };
  appliances.fans = { count: 3, hours: 8 };
  appliances.lights = { count: 6, hours: 5 };
  return { name: "", city: "Bengaluru", climate: "moderate", bhk: 2, members: 3, wfhDays: 0, solarKw: 0, appliances };
}

const num = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
const snap = (n: number, step: number) => Math.round(n / step) * step;

export function sanitizeHousehold(raw: unknown): Household {
  const h = (raw && typeof raw === "object" ? raw : {}) as Partial<Household>;
  const base = emptyHousehold();
  const climate: Climate = CLIMATES.includes(h.climate as Climate) ? (h.climate as Climate) : base.climate;
  const appliances = {} as Record<ApplianceId, ApplianceUse>;
  for (const id of APPLIANCES) {
    const src = (h.appliances?.[id] ?? base.appliances[id]) as Partial<ApplianceUse>;
    const sp = SPECS[id];
    const count = Math.round(num(src.count, 0, sp.maxCount, 0));
    const u: ApplianceUse = { count, hours: id === "fridge" ? 24 : count ? snap(num(src.hours, 0, sp.maxHours, 0), 0.25) : 0 };
    if (id === "ac") u.temp = Math.round(num(src.temp, 16, 30, 24));
    if (id === "fridge") u.star = Math.round(num(src.star, 1, 5, 3));
    appliances[id] = u;
  }
  return {
    name: String(h.name ?? "").slice(0, 60),
    city: String(h.city ?? base.city).slice(0, 40) || base.city,
    climate,
    bhk: Math.round(num(h.bhk, 1, 3, 2)),
    members: Math.round(num(h.members, 1, 12, 3)),
    wfhDays: Math.round(num(h.wfhDays, 0, 7, 0)),
    solarKw: snap(num(h.solarKw, 0, 10, 0), 0.5),
    appliances,
  };
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function sanitizeBills(raw: unknown): Bill[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Map<string, Bill>();
  for (const b of raw.slice(0, 240)) {
    if (!b || typeof b !== "object") continue;
    const month = String((b as Bill).month ?? "");
    const units = Number((b as Bill).units);
    if (!MONTH_RE.test(month) || !Number.isFinite(units) || units < 0 || units > 20000) continue;
    const amt = (b as Bill).amount;
    const amount = amt === null || amt === undefined || (amt as unknown) === "" || !Number.isFinite(Number(amt)) ? null : Math.max(0, Math.round(Number(amt)));
    const source = ["sample", "manual", "csv"].includes((b as Bill).source) ? (b as Bill).source : "manual";
    seen.set(month, { id: String((b as Bill).id ?? month).slice(0, 40) || month, month, units: Math.round(units * 10) / 10, amount, source });
  }
  return [...seen.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// ---------------------------------------------------------------- months
export function ymOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
export const monthNum = (ym: string) => Number(ym.slice(5, 7));
export const daysIn = (ym: string) => new Date(Number(ym.slice(0, 4)), monthNum(ym), 0).getDate();
/** The month after `today` (the next bill to predict). */
export const nextMonth = (today = new Date()) => addMonths(ymOf(today), 1);
