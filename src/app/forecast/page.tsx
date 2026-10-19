"use client";
// 12-month forecast by season, with the most expensive months highlighted.
import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAnalysis } from "@/lib/client";
import { useAppState } from "@/lib/store";
import { ForecastChart, SeasonLegend } from "@/components/Charts";
import { Loadable, NeedHome } from "@/components/Guard";
import { Card, Chip, PageHeader, SampleBadge, Stat, cx } from "@/components/ui";

export default function ForecastPage() {
  const s = useAppState();
  const { t, tk, money, num, month } = useI18n();
  const r = useAnalysis(s);
  const [metric, setMetric] = useState<"cost" | "units">("cost");
  return (
    <NeedHome s={s}>
      <PageHeader title={t("forecast.title")} subtitle={t("forecast.subtitle")} badge={<SampleBadge kind="both" />} />
      <Loadable r={r}>
        {(a) => {
          const peak = [...a.forecast].sort((x, y) => y.cost - x.cost)[0];
          const low = [...a.forecast].sort((x, y) => x.cost - y.cost)[0];
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label={t("forecast.total")} value={<span className="num">{money(a.annualCost)}</span>} sub={t("common.units", { n: num(a.annualUnits) })} testId="fc-total" />
                <Stat label={t("forecast.avg")} value={<span className="num">{money(a.annualCost / 12)}</span>} sub={t("common.units", { n: num(a.annualUnits / 12) })} />
                <Stat label={t("forecast.peak")} value={<span className="num">{money(peak.cost)}</span>} sub={month(peak.month, "long")} tone="red" testId="fc-peak" />
                <Stat label={t("forecast.low")} value={<span className="num">{money(low.cost)}</span>} sub={month(low.month, "long")} tone="green" />
              </div>
              <Card>
                <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
                  {(["cost", "units"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={metric === m} onClick={() => setMetric(m)} className={cx("rounded-lg px-3 py-1.5 text-sm font-medium", metric === m ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-600 dark:text-slate-400")} data-testid={`fc-metric-${m}`}>
                      {m === "cost" ? t("appl.byCost") : t("appl.byUnits")}
                    </button>
                  ))}
                </div>
                <ForecastChart data={a.forecast} metric={metric} />
                <SeasonLegend />
                {s!.tariff.billing === "bimonthly" && <p className="mt-2 text-xs text-slate-500">{t("tariff.biNote")}</p>}
              </Card>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="fc-months">
                {a.forecast.map((f) => (
                  <div key={f.month} className={cx("flex items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3 dark:bg-slate-900", f.expensive ? "border-rose-300 dark:border-rose-500/40" : "border-slate-200 dark:border-slate-700/70")} data-testid="fc-month" data-expensive={f.expensive}>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white">{month(f.month, "long")}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <Chip>{tk(`forecast.season.${f.season}`)}</Chip>
                        {f.festival && <Chip tone="amber">🪔 {t("forecast.festival")}</Chip>}
                        {f.expensive && <Chip tone="red">{t("forecast.expensive")}</Chip>}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="num font-bold">{money(f.cost)}</div>
                      <div className="num text-xs text-slate-500">{t("common.units", { n: num(f.units) })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      </Loadable>
    </NeedHome>
  );
}
