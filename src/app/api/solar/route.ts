// POST { household, bills?, tariff?, kw? } -> rooftop solar savings + payback (sample assumptions).
import { calibration, startMonth } from "@/lib/model";
import { solarCheck, suggestedKw } from "@/lib/solar";
import { json, readPayload, todayFrom } from "@/lib/api-utils";

export async function POST(req: Request) {
  const p = await readPayload(req);
  if (p instanceof Response) return p;
  const start = startMonth(todayFrom(p.raw));
  const { factor } = calibration(p.household, p.bills);
  const suggested = suggestedKw(p.household, p.tariff, factor, start);
  const k = Number(p.raw.kw);
  const kw = Number.isFinite(k) && k >= 0.5 ? Math.min(10, Math.round(k * 2) / 2) : suggested;
  return json({ suggested, ...solarCheck(p.household, p.tariff, factor, start, kw) });
}
