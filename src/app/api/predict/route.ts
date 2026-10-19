// POST { household, tariff?, factor? } -> fast 12-month prediction (what-if simulator).
import { quickPredict } from "@/lib/model";
import { json, readPayload, todayFrom } from "@/lib/api-utils";

export async function POST(req: Request) {
  const p = await readPayload(req);
  if (p instanceof Response) return p;
  const f = Number(p.raw.factor);
  const factor = Number.isFinite(f) ? Math.min(2, Math.max(0.5, f)) : 1;
  return json(quickPredict(p.household, p.tariff, factor, todayFrom(p.raw)));
}
