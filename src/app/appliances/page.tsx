"use client";
// Appliance breakdown: pie + bar chart by units or cost, top-3 power eaters.
import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAnalysis } from "@/lib/client";
import { useAppState } from "@/lib/store";
import { BreakdownBars, BreakdownPie } from "@/components/Charts";
import { Loadable, NeedHome } from "@/components/Guard";
import { ApplianceIcon } from "@/components/Icons";
import { Card, CardTitle, Note, PageHeader, SampleBadge, cx } from "@/components/ui";

function Toggle<T extends string>({ value, options, onChange, testId }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" data-testid={testId}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)} className={cx("rounded-lg px-3 py-1.5 text-sm font-medium", value === v ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-400")} data-testid={`${testId}-${v}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AppliancesPage() {
  const s = useAppState();
  const { t, money, num, appName } = useI18n();
  const r = useAnalysis(s);
  const [metric, setMetric] = useState<"units" | "cost">("units");
  const [period, setPeriod] = useState<"next" | "year">("next");
  return (
    <NeedHome s={s}>
      <PageHeader title={t("appl.title")} subtitle={t("appl.subtitle")} badge={<SampleBadge />} />
      <Loadable r={r}>
        {(a) => {
          const b = period === "next" ? a.breakdownNext : a.breakdownYear;
          const top3 = b.items.filter((i) => i.id !== "other").slice(0, 3);
          return (
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-400/5 dark:to-emerald-400/5" data-testid="top3-card">
                <CardTitle>🔥 {t("appl.top3")}</CardTitle>
                <ol className="grid gap-3 sm:grid-cols-3">
                  {top3.map((it, i) => (
                    <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70" data-testid="top3-item">
                      <span className="num text-2xl font-extrabold text-amber-500">{num(i + 1)}</span>
                      <ApplianceIcon id={it.id} size={44} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-white">{appName(it.id)}</div>
                        <div className="num text-sm text-slate-600 dark:text-slate-300">
                          {t("common.units", { n: num(it.units) })} · {money(it.cost)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{t("appl.share", { pct: num(it.share) })}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Toggle value={metric} onChange={setMetric} options={[["units", t("appl.byUnits")], ["cost", t("appl.byCost")]]} testId="metric" />
                <Toggle value={period} onChange={setPeriod} options={[["next", t("appl.next")], ["year", t("appl.year")]]} testId="period" />
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-2">
                  <BreakdownPie data={b} metric={metric} />
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {b.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-1.5 truncate">
                        <ApplianceIcon id={it.id} size={18} />
                        <span className="truncate">{appName(it.id)}</span>
                        <span className="num ms-auto text-slate-500">{num(it.share)}%</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="lg:col-span-3">
                  <BreakdownBars data={b} metric={metric} />
                </Card>
              </div>

              <Card>
                <table className="w-full text-sm" data-testid="breakdown-table">
                  <thead>
                    <tr className="text-start text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 text-start font-medium">{t("nav.appliances")}</th>
                      <th className="pb-2 text-end font-medium">{t("appl.byUnits")}</th>
                      <th className="pb-2 text-end font-medium">{t("appl.byCost")}</th>
                      <th className="hidden pb-2 text-end font-medium sm:table-cell">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.items.map((it) => (
                      <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <ApplianceIcon id={it.id} size={28} />
                            {appName(it.id)}
                          </span>
                        </td>
                        <td className="num py-2 text-end">{num(it.units, 1)}</td>
                        <td className="num py-2 text-end font-medium">{money(it.cost)}</td>
                        <td className="num hidden py-2 text-end text-slate-500 sm:table-cell">{num(it.share)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 space-y-2">
                  {b.solarUnits > 0 && <Note>{t("appl.solarCovers", { n: num(b.solarUnits) })}</Note>}
                  <Note>{t("appl.otherNote")}</Note>
                </div>
              </Card>
            </div>
          );
        }}
      </Loadable>
    </NeedHome>
  );
}
