// POST { household, bills?, tariff? } -> full analysis: next bill + range,
// 12-month forecast, appliance breakdown, savings tips, actual vs predicted.
import { analyze } from "@/lib/model";
import { json, readPayload, todayFrom } from "@/lib/api-utils";

export async function POST(req: Request) {
  const p = await readPayload(req);
  if (p instanceof Response) return p;
  return json(analyze(p.household, p.bills, p.tariff, todayFrom(p.raw)));
}
