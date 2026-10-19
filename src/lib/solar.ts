// Rooftop solar estimate. All numbers are SAMPLE assumptions for the demo.
import { forecast, solarKwh } from "./model.ts";
import { monthlyCost } from "./tariff.ts";
import type { Household, Tariff } from "./types.ts";

export const SOLAR_ASSUMPTIONS = {
  /** Installed cost before subsidy, Rs per kW. */
  costPerKw: 60000,
  /** Sample central subsidy (Rs): 30k/kW for first 2 kW, 18k for the 3rd kW, max 78k. */
  subsidy: (kw: number) => Math.min(78000, Math.min(kw, 2) * 30000 + Math.max(0, Math.min(kw, 3) - 2) * 18000),
  /** Net metering: exported units are credited at this fraction of the import rate. */
  exportCredit: 0, // surplus is not paid out in this demo (conservative)
  roofSqmPerKw: 10,
  degradationPct: 0.5,
  lifeYears: 25,
};

export interface SolarResult {
  kw: number;
  genMonthly: number;
  genYear: number;
  savingMonthly: number;
  savingYear: number;
  grossCost: number;
  subsidy: number;
  netCost: number;
  paybackYears: number | null;
  roofSqm: number;
  coverPct: number;
  months: { month: string; before: number; after: number; gen: number }[];
}

/** Compare the next 12 months with and without `kw` of (extra) panels. */
export function solarCheck(h: Household, tariff: Tariff, factor: number, start: string, kw: number): SolarResult {
  const without: Household = { ...h, solarKw: 0 };
  const base = forecast(without, tariff, factor, start);
  const existing = h.solarKw;
  const months = base.map((m) => {
    const gen = solarKwh(existing + kw, h.climate, m.month);
    const after = Math.max(0, m.units - gen);
    const beforeNet = Math.max(0, m.units - solarKwh(existing, h.climate, m.month));
    return { month: m.month, beforeUnits: beforeNet, afterUnits: after, before: monthlyCost(beforeNet, tariff), after: monthlyCost(after, tariff), gen: solarKwh(kw, h.climate, m.month) };
  });
  const savingYear = months.reduce((a, m) => a + (m.before - m.after), 0);
  const genYear = months.reduce((a, m) => a + m.gen, 0);
  const grossCost = kw * SOLAR_ASSUMPTIONS.costPerKw;
  const subsidy = existing > 0 ? 0 : SOLAR_ASSUMPTIONS.subsidy(kw);
  const netCost = Math.max(0, grossCost - subsidy);
  const useYear = base.reduce((a, m) => a + m.units, 0);
  return {
    kw,
    genMonthly: Math.round(genYear / 12),
    genYear: Math.round(genYear),
    savingMonthly: Math.round(savingYear / 12),
    savingYear: Math.round(savingYear),
    grossCost,
    subsidy,
    netCost,
    paybackYears: savingYear > 0 ? Math.round((netCost / savingYear) * 10) / 10 : null,
    roofSqm: kw * SOLAR_ASSUMPTIONS.roofSqmPerKw,
    coverPct: useYear > 0 ? Math.min(100, Math.round((genYear / useYear) * 100)) : 0,
    months: months.map((m) => ({ month: m.month, before: Math.round(m.before), after: Math.round(m.after), gen: Math.round(m.gen) })),
  };
}

/** Panel size that roughly covers the home's yearly use (0.5 kW steps, 1..10). */
export function suggestedKw(h: Household, tariff: Tariff, factor: number, start: string) {
  const units = forecast({ ...h, solarKw: 0 }, tariff, factor, start).reduce((a, m) => a + m.units, 0);
  let gen1 = 0;
  for (let i = 0; i < 12; i++) gen1 += solarKwh(1, h.climate, start.slice(0, 5) + String(((Number(start.slice(5)) - 1 + i) % 12) + 1).padStart(2, "0"));
  const kw = Math.round(((units / gen1) * 0.9 - h.solarKw) * 2) / 2;
  return Math.min(10, Math.max(1, kw));
}
