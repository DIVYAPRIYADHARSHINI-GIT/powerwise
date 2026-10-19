// POST { units, tariff?, months? } -> slab-by-slab bill for one billing period.
import { calcBill, periodMonths } from "@/lib/tariff";
import { bad, json, readPayload } from "@/lib/api-utils";

export async function POST(req: Request) {
  const p = await readPayload(req, { needHousehold: false });
  if (p instanceof Response) return p;
  const units = Number(p.raw.units);
  if (!Number.isFinite(units) || units < 0 || units > 100000) return bad("units must be between 0 and 100000");
  const m = Number(p.raw.months);
  const months = m === 1 || m === 2 ? m : periodMonths(p.tariff);
  return json({ tariff: p.tariff, bill: calcBill(units, p.tariff, months) });
}
