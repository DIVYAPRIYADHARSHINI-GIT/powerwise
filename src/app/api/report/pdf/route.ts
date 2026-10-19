// POST { household, bills?, tariff?, goal? } -> monthly PowerWise report (application/pdf, English).
import { analyze } from "@/lib/model";
import { buildReport } from "@/lib/pdf";
import { readPayload, todayFrom } from "@/lib/api-utils";

export async function POST(req: Request) {
  const p = await readPayload(req);
  if (p instanceof Response) return p;
  const today = todayFrom(p.raw);
  const analysis = analyze(p.household, p.bills, p.tariff, today);
  const goal = Math.max(0, Math.min(100000, Number(p.raw.goal) || 0));
  const bytes = buildReport({ household: p.household, bills: p.bills, tariff: p.tariff, analysis, goal, now: today });
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="powerwise-report-${analysis.start}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
