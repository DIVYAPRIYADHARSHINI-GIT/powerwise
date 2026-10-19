"use client";
// What-if simulator: sliders for appliance hours / AC temperature. The new
// bill is computed instantly in the browser with the same exported model
// (no network round-trip per slider tick), and confirmed by /api/predict.
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { SPECS } from "@/lib/household";
import { calibration, quickPredict } from "@/lib/model";
import { usePredict } from "@/lib/client";
import { saveHousehold, useAppState } from "@/lib/store";
import { APPLIANCES, type ApplianceId, type Household } from "@/lib/types";
import { CompareChart } from "@/components/Charts";
import { NeedHome } from "@/components/Guard";
import { useGoalCelebration } from "@/components/GoalCelebration";
import { ApplianceIcon } from "@/components/Icons";
import { Button, Card, CardTitle, PageHeader, SampleBadge, Spinner, cx, toast } from "@/components/ui";

export default function WhatIfPage() {
  const s = useAppState();
  const { t, money, num, appName } = useI18n();
  const [draft, setDraft] = useState<Household | null>(null);
  const base = s?.household ?? null;
  const h = draft ?? base;
  const factor = useMemo(() => (base && s ? calibration(base, s.bills).factor : 1), [base, s]);
  const before = useMemo(() => (base && s ? quickPredict(base, s.tariff, factor) : null), [base, s, factor]);
  const after = useMemo(() => (h && s ? quickPredict(h, s.tariff, factor) : null), [h, s, factor]);
  // Server confirmation (debounced): proves the API route returns the same number.
  const server = usePredict(s, draft, factor);
  const saving = before && after ? before.avgCost - after.avgCost : 0;
  const goal = s?.settings.goal ?? 0;
  const celebration = useGoalCelebration(goal > 0 && saving >= goal, saving);

  const owned = h ? APPLIANCES.filter((id) => h.appliances[id].count > 0 && id !== "fridge") : [];
  const patch = (id: ApplianceId, p: Partial<Household["appliances"][ApplianceId]>) => h && setDraft({ ...h, appliances: { ...h.appliances, [id]: { ...h.appliances[id], ...p } } });

  return (
    <NeedHome s={s}>
      <PageHeader title={t("whatIf.title")} subtitle={t("whatIf.subtitle")} badge={<SampleBadge kind="both" />} />
      {h && before && after && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="space-y-4 lg:col-span-3" data-testid="sliders">
            {owned.map((id) => {
              const u = h.appliances[id];
              const orig = base!.appliances[id];
              const changed = u.hours !== orig.hours || (id === "ac" && u.temp !== orig.temp);
              return (
                <div key={id} className={cx("rounded-2xl p-3", changed && "bg-amber-50 dark:bg-amber-400/5")}>
                  <div className="flex items-center gap-3">
                    <ApplianceIcon id={id} size={36} />
                    <label htmlFor={`wi-${id}`} className="flex-1 font-medium text-slate-900 dark:text-white">
                      {appName(id)} <span className="num text-xs text-slate-500">×{num(u.count)}</span>
                    </label>
                    <span className="num text-sm font-semibold" data-testid={`wi-val-${id}`}>
                      {changed && <span className="me-1 text-slate-400 line-through">{num(orig.hours, 2)}h</span>}
                      {num(u.hours, 2)} h
                    </span>
                  </div>
                  <input id={`wi-${id}`} type="range" className="slider mt-2" min={0} max={SPECS[id].maxHours} step={id === "geyser" || id === "iron" || id === "washer" || id === "induction" ? 0.25 : 0.5} value={u.hours} onChange={(e) => patch(id, { hours: Number(e.target.value) })} data-testid={`wi-${id}`} />
                  {id === "ac" && (
                    <div className="mt-3">
                      <label htmlFor="wi-ac-temp" className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>{t("setup.acTemp")}</span>
                        <span className="num font-semibold text-slate-900 dark:text-white">{num(u.temp ?? 24)}°C</span>
                      </label>
                      <input id="wi-ac-temp" type="range" className="slider mt-1" min={16} max={30} step={1} value={u.temp ?? 24} onChange={(e) => patch("ac", { temp: Number(e.target.value) })} data-testid="wi-ac-temp" />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card className="sticky top-20" data-testid="whatif-result">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("whatIf.current")}</div>
                  <div className="num text-2xl font-bold text-slate-700 dark:text-slate-300" data-testid="wi-before">
                    {money(before.next.cost)}
                  </div>
                  <div className="num text-xs text-slate-500">{t("common.units", { n: num(before.next.units) })}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {t("whatIf.new")} {server.loading && draft && <Spinner className="h-3 w-3 text-amber-500" />}
                  </div>
                  <div className={cx("num text-2xl font-bold", after.next.cost < before.next.cost ? "text-emerald-600 dark:text-emerald-400" : after.next.cost > before.next.cost ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")} data-testid="wi-after">
                    {money(after.next.cost)}
                  </div>
                  <div className="num text-xs text-slate-500">{t("common.units", { n: num(after.next.units) })}</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60" data-testid="wi-saving">
                {saving > 0 ? (
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{t("whatIf.save", { amount: money(saving) })}</div>
                ) : saving < 0 ? (
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{t("whatIf.extra", { amount: money(-saving) })}</div>
                ) : (
                  <div className="text-slate-600 dark:text-slate-400">{t("whatIf.noChange")}</div>
                )}
                {saving !== 0 && <div className="mt-1 text-sm text-slate-500">{t("whatIf.year", { amount: money(Math.abs(before.annualCost - after.annualCost)) })}</div>}
                {goal > 0 && <div className="mt-1 text-xs text-slate-500">{t("whatIf.goal", { amount: money(goal) })}</div>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)} disabled={!draft} data-testid="wi-reset">
                  {t("whatIf.reset")}
                </Button>
                <Button
                  variant="green"
                  disabled={!draft}
                  onClick={() => {
                    if (!draft) return;
                    saveHousehold(draft);
                    setDraft(null);
                    toast(t("whatIf.applied"));
                  }}
                  data-testid="wi-apply"
                >
                  {t("whatIf.apply")}
                </Button>
              </div>
              {server.data && draft && (
                <span className="hidden" data-testid="wi-server" data-cost={server.data.next.cost}>
                  {server.data.next.cost}
                </span>
              )}
            </Card>
            <Card>
              <CardTitle>{t("forecast.title")}</CardTitle>
              <CompareChart rows={before.months.map((m, i) => ({ month: m.month, a: m.cost, b: after.months[i].cost }))} aLabel={t("whatIf.current")} bLabel={t("whatIf.new")} height={220} />
            </Card>
          </div>
          {celebration}
        </div>
      )}
    </NeedHome>
  );
}
