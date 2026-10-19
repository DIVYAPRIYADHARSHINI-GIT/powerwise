// POST { household, bills, tariff? } -> bill history CSV with the model's prediction per month.
import { predictUnits } from "@/lib/model";
import { historyCsv } from "@/lib/csv";
import { readPayload } from "@/lib/api-utils";

export async function POST(req: Request) {
  const p = await readPayload(req);
  if (p instanceof Response) return p;
  const predicted = new Map(p.bills.map((b) => [b.month, Math.round(predictUnits(p.household, b.month))]));
  return new Response(historyCsv(p.bills, predicted), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="powerwise-bill-history.csv"',
      "Cache-Control": "no-store",
    },
  });
}
