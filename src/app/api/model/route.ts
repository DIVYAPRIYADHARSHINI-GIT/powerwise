// GET -> model accuracy, dataset summary and feature importance (About page).
import metrics from "@/data/metrics.json";
import { SAMPLE_TARIFF } from "@/lib/tariff";
import { json } from "@/lib/api-utils";

export const dynamic = "force-static";

export function GET() {
  return json({ ...metrics, sampleTariff: SAMPLE_TARIFF });
}
