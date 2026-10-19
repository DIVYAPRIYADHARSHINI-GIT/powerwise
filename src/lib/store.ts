"use client";
// localStorage-backed app state (household, bills, tariff, settings).
// One cached snapshot object per write -> useSyncExternalStore never sees a
// new object on an unchanged store (no render loops). On the very first visit
// the sample household + 12 months of sample bills are loaded.
import { useSyncExternalStore } from "react";
import { SAMPLE_HOUSEHOLD, SAMPLE_UNITS_BY_MONTH, addMonths, emptyHousehold, nextMonth, sanitizeBills, sanitizeHousehold } from "./household";
import { SAMPLE_TARIFF, calcBill, sanitizeTariff } from "./tariff";
import type { Bill, Household, Settings, Tariff } from "./types";

const KEY = "powerwise.state.v1";

export interface AppState {
  household: Household | null;
  bills: Bill[];
  tariff: Tariff;
  settings: Settings;
  /** "sample" until the user starts fresh or edits their own setup. */
  mode: "sample" | "own";
  /** Last month in which the savings-goal celebration was shown. */
  celebrated: string | null;
}

/** 12 months of sample bills ending last month (seasonal pattern from the sample data). */
export function sampleBills(today = new Date()): Bill[] {
  const start = addMonths(nextMonth(today), -13);
  return Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(start, i);
    const units = SAMPLE_UNITS_BY_MONTH[Number(month.slice(5, 7)) - 1];
    return { id: `sample-${month}`, month, units, amount: calcBill(units, SAMPLE_TARIFF, 1).total, source: "sample" as const };
  });
}

export function sampleState(): AppState {
  return { household: SAMPLE_HOUSEHOLD, bills: sampleBills(), tariff: SAMPLE_TARIFF, settings: { goal: 500, picked: [] }, mode: "sample", celebrated: null };
}

const SERVER: AppState = { household: null, bills: [], tariff: SAMPLE_TARIFF, settings: { goal: 500, picked: [] }, mode: "sample", celebrated: null };

let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = sampleState();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const p = JSON.parse(raw) as Partial<AppState>;
    return {
      household: p.household ? sanitizeHousehold(p.household) : null,
      bills: sanitizeBills(p.bills),
      tariff: sanitizeTariff(p.tariff),
      settings: {
        goal: Math.max(0, Math.min(100000, Math.round(Number(p.settings?.goal ?? 500) || 0))),
        picked: Array.isArray(p.settings?.picked) ? p.settings.picked.filter((x): x is string => typeof x === "string").slice(0, 20) : [],
      },
      mode: p.mode === "own" ? "own" : "sample",
      celebrated: typeof p.celebrated === "string" ? p.celebrated : null,
    };
  } catch {
    return sampleState();
  }
}

function get(): AppState {
  if (!state) state = load();
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const cur = get();
  const next = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns null during SSR / before hydration (render a skeleton then). */
let hydrated = false;
export function useAppState(): AppState | null {
  const s = useSyncExternalStore(subscribe, get, () => SERVER);
  if (typeof window === "undefined") return null;
  if (s === SERVER) return null;
  hydrated = true;
  return s;
}
export const isHydrated = () => hydrated;

// ---------------------------------------------------------------- actions
export const saveHousehold = (h: Household) => setState({ household: sanitizeHousehold(h), mode: "own" });
export const setTariff = (t: Tariff) => setState({ tariff: sanitizeTariff(t) });
export const setGoal = (goal: number) => setState((s) => ({ settings: { ...s.settings, goal: Math.max(0, Math.round(goal)) } }));
export const markCelebrated = (month: string) => setState({ celebrated: month });
export const togglePicked = (id: string) =>
  setState((s) => ({ settings: { ...s.settings, picked: s.settings.picked.includes(id) ? s.settings.picked.filter((x) => x !== id) : [...s.settings.picked, id] } }));

export function upsertBills(bills: Bill[]) {
  setState((s) => ({ bills: sanitizeBills([...s.bills.filter((b) => !bills.some((n) => n.month === b.month)), ...bills]) }));
}
export const deleteBill = (month: string) => setState((s) => ({ bills: s.bills.filter((b) => b.month !== month) }));
export const clearBills = () => setState({ bills: [] });

export function startFresh() {
  setState({ household: null, bills: [], tariff: SAMPLE_TARIFF, settings: { goal: 500, picked: [] }, mode: "own", celebrated: null });
}
export function loadSample() {
  setState(sampleState());
}
export const blankHousehold = emptyHousehold;
