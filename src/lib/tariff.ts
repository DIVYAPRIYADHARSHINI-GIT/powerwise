// Slab-based (telescopic) domestic tariff. Pure functions, shared by the
// API routes and the browser. Slab limits are entered per month; for
// bi-monthly billing they (and the fixed charge) are doubled automatically.
import type { BillBreakdown, Slab, Tariff } from "./types.ts";

/** SAMPLE rates for the demo only - not any real electricity board's tariff. */
export const SAMPLE_TARIFF: Tariff = {
  slabs: [
    { upTo: 100, rate: 3 },
    { upTo: 200, rate: 4.5 },
    { upTo: 400, rate: 6 },
    { upTo: 800, rate: 7.5 },
    { upTo: null, rate: 9 },
  ],
  fixedCharge: 60,
  dutyPct: 5,
  billing: "monthly",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export const periodMonths = (t: Tariff) => (t.billing === "bimonthly" ? 2 : 1);

/** Bill for `units` consumed over one billing period of `months` months. */
export function calcBill(units: number, tariff: Tariff, months = periodMonths(tariff)): BillBreakdown {
  const u = Math.max(0, Number.isFinite(units) ? units : 0);
  const lines: BillBreakdown["lines"] = [];
  let prev = 0;
  let energy = 0;
  for (const s of tariff.slabs) {
    const cap = s.upTo === null ? Infinity : s.upTo * months;
    if (u <= prev) break;
    const inSlab = Math.min(u, cap) - prev;
    if (inSlab > 0) {
      const amount = inSlab * s.rate;
      energy += amount;
      lines.push({ from: prev, to: cap === Infinity ? null : cap, units: r2(inSlab), rate: s.rate, amount: r2(amount) });
    }
    prev = cap;
  }
  const fixed = tariff.fixedCharge * months;
  const duty = (energy * tariff.dutyPct) / 100;
  return { units: r2(u), periodMonths: months, lines, energy: r2(energy), fixed: r2(fixed), duty: r2(duty), total: Math.round(energy + fixed + duty) };
}

/** Monthly-equivalent cost of a month that used `units` (bi-monthly: half a 2-month bill). */
export function monthlyCost(units: number, tariff: Tariff): number {
  if (tariff.billing === "bimonthly") return calcBill(units * 2, tariff, 2).total / 2;
  return calcBill(units, tariff, 1).total;
}

/** Clamp / repair a tariff coming from storage, a form or an API request. */
export function sanitizeTariff(raw: unknown): Tariff {
  const t = (raw && typeof raw === "object" ? raw : {}) as Partial<Tariff>;
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };
  let slabs: Slab[] = Array.isArray(t.slabs)
    ? t.slabs
        .slice(0, 10)
        .map((s) => ({ upTo: s?.upTo === null || s?.upTo === undefined || (s.upTo as unknown) === "" ? null : Math.round(num(s.upTo, 1, 100000, 100)), rate: r2(num(s?.rate, 0, 100, 0)) }))
    : [];
  // Keep ascending limits; everything after the first open-ended slab is dropped.
  const out: Slab[] = [];
  for (const s of slabs) {
    if (s.upTo !== null && out.length && out[out.length - 1].upTo !== null && s.upTo <= (out[out.length - 1].upTo as number)) continue;
    out.push(s);
    if (s.upTo === null) break;
  }
  slabs = out;
  if (!slabs.length) slabs = SAMPLE_TARIFF.slabs.map((s) => ({ ...s }));
  if (slabs[slabs.length - 1].upTo !== null) slabs.push({ upTo: null, rate: slabs[slabs.length - 1].rate });
  return {
    slabs,
    fixedCharge: r2(num(t.fixedCharge, 0, 5000, SAMPLE_TARIFF.fixedCharge)),
    dutyPct: r2(num(t.dutyPct, 0, 50, SAMPLE_TARIFF.dutyPct)),
    billing: t.billing === "bimonthly" ? "bimonthly" : "monthly",
  };
}
