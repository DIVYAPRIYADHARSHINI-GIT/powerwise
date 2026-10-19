"use client";
// Solar check: savings + payback for a chosen panel size (sample assumptions).
import { useState } from "react";
import { useI18n } from "@/i18n";
import { useSolar } from "@/lib/client";
import { useAppState } from "@/lib/store";
import { CompareChart } from "@/components/Charts";
import { Loadable, NeedHome } from "@/components/Guard";
import { ApplianceIcon } from "@/components/Icons";
import { Card, CardTitle, Note, PageHeader, SampleBadge, Spinner, Stat } from "@/components/ui";

export default function SolarPage() {
  const s = useAppState();
  const { t, money, num } = useI18n();
  const [kw, setKw] = useState<number | null>(null);
  const r = useSolar(s, kw);
  return (
    <NeedHome s={s}>
      <PageHeader title={t("solar.title")} subtitle={t("solar.subtitle")} badge={<SampleBadge kind="both" />} />
      <Loadable r={r}>
        {(d) => (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <Card data-testid="solar-size">
                <div className="flex items-center gap-3">
                  <ApplianceIcon id="solar" size={48} />
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t("solar.size")}</div>
                    <div className="num flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white" data-testid="solar-kw">
                      {num(kw ?? d.kw, 1)} kW {r.loading && <Spinner className="text-amber-500" />}
                    </div>
                  </div>
                </div>
                <input type="range" className="slider mt-4" min={1} max={10} step={0.5} value={kw ?? d.kw} onChange={(e) => setKw(Number(e.target.value))} aria-label={t("solar.size")} data-testid="solar-slider" />
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("solar.suggested", { kw: num(d.suggested, 1) })}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("solar.gen", { n: num(d.genMonthly) })}</div>
                {s!.household!.solarKw > 0 && (
                  <Note className="mt-3" tone="warn">
                    {t("solar.existing", { kw: num(s!.household!.solarKw, 1) })}
                  </Note>
                )}
              </Card>
              <Card>
                <CardTitle>
                  {t("solar.assumptions")} <SampleBadge />
                </CardTitle>
                <ul className="list-disc space-y-1 ps-5 text-sm text-slate-600 dark:text-slate-400" data-testid="solar-assumptions">
                  <li>{t("solar.a1")}</li>
                  <li>{t("solar.a2")}</li>
                  <li>{t("solar.a3")}</li>
                  <li>{t("solar.a4")}</li>
                  <li>{t("solar.a5")}</li>
                </ul>
              </Card>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label={t("solar.saving")} value={<span className="num">{money(d.savingMonthly)}</span>} tone="green" testId="solar-saving" />
                <Stat label={t("solar.cost")} value={<span className="num">{money(d.grossCost)}</span>} />
                <Stat label={t("solar.subsidy")} value={<span className="num">−{money(d.subsidy)}</span>} sub={t("solar.net") + ": " + money(d.netCost)} />
                <Stat label={t("solar.payback")} value={d.paybackYears === null ? "—" : t("solar.years", { n: num(d.paybackYears, 1) })} sub={d.paybackYears === null ? t("solar.noPayback") : undefined} tone="amber" testId="solar-payback" />
              </div>
              <Card>
                <CompareChart rows={d.months.map((m) => ({ month: m.month, a: m.before, b: m.after }))} aLabel={t("solar.before")} bLabel={t("solar.after")} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Note>{t("solar.cover", { pct: num(d.coverPct) })}</Note>
                  <Note>{t("solar.roof", { n: num(d.roofSqm) })}</Note>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Loadable>
    </NeedHome>
  );
}
