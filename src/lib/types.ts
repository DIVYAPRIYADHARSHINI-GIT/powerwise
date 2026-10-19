// Shared types for PowerWise (client + API routes).

export const APPLIANCES = ["ac", "fridge", "geyser", "washer", "tv", "fans", "lights", "iron", "induction", "ev"] as const;
export type ApplianceId = (typeof APPLIANCES)[number];
export type UsageId = ApplianceId | "other";

export const CLIMATES = ["hot", "moderate", "cool"] as const;
export type Climate = (typeof CLIMATES)[number];

export interface ApplianceUse {
  count: number;
  /** Typical hours per day while in use (fridge is always 24). */
  hours: number;
  /** AC set-point in deg C. */
  temp?: number;
  /** Fridge BEE star rating 1..5. */
  star?: number;
}

export interface Household {
  name: string;
  city: string;
  climate: Climate;
  bhk: number;
  members: number;
  wfhDays: number;
  solarKw: number;
  appliances: Record<ApplianceId, ApplianceUse>;
}

export interface Bill {
  id: string;
  /** YYYY-MM */
  month: string;
  units: number;
  amount: number | null;
  source: "sample" | "manual" | "csv";
}

export interface Slab {
  /** Upper limit in units per month (null = no limit). */
  upTo: number | null;
  /** Rs per unit. */
  rate: number;
}

export interface Tariff {
  slabs: Slab[];
  /** Rs per month. */
  fixedCharge: number;
  /** Electricity duty, % of energy charges. */
  dutyPct: number;
  billing: "monthly" | "bimonthly";
}

export interface Settings {
  /** Monthly savings goal in Rs. */
  goal: number;
  /** Tips the user plans to try. */
  picked: string[];
}

export interface SlabLine {
  from: number;
  to: number | null;
  units: number;
  rate: number;
  amount: number;
}

export interface BillBreakdown {
  units: number;
  periodMonths: number;
  lines: SlabLine[];
  energy: number;
  fixed: number;
  duty: number;
  total: number;
}

export type Season = "summer" | "monsoon" | "postMonsoon" | "winter";

export interface MonthForecast {
  month: string;
  units: number;
  low: number;
  high: number;
  /** Monthly-equivalent bill in Rs. */
  cost: number;
  season: Season;
  festival: boolean;
  expensive: boolean;
}

export interface UsageItem {
  id: UsageId;
  units: number;
  cost: number;
  share: number;
}

export interface Breakdown {
  items: UsageItem[];
  grossUnits: number;
  solarUnits: number;
  netUnits: number;
  cost: number;
}

export type TipId = "acTemp" | "acHours" | "geyser" | "fridge" | "fans" | "lights" | "tv" | "washer" | "iron" | "solar";

export interface Tip {
  id: TipId;
  appliance: UsageId | "solar";
  /** Rs per month (average over the next 12 months). */
  saving: number;
  units: number;
  vars: Record<string, number>;
}

export interface HistoryPoint {
  month: string;
  actual: number;
  predicted: number;
  amount: number | null;
}

export interface Analysis {
  start: string;
  factor: number;
  factorBills: number;
  next: {
    month: string;
    units: number;
    low: number;
    high: number;
    cost: number;
    costLow: number;
    costHigh: number;
    bill: BillBreakdown;
  };
  forecast: MonthForecast[];
  /** Units per month (next 12) if the home had no solar panels. */
  grossUnits: number[];
  breakdownNext: Breakdown;
  breakdownYear: Breakdown;
  tips: Tip[];
  history: HistoryPoint[];
  historyMae: number | null;
  annualCost: number;
  annualUnits: number;
}

export interface PredictResult {
  months: { month: string; units: number; cost: number }[];
  next: { units: number; cost: number };
  avgCost: number;
  annualCost: number;
}
