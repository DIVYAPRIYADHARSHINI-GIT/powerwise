"use client";
// Savings tips: personalised, each with Rs/month saved (from the model), a
// savings goal and a celebration when the ticked tips reach the goal.
import { useI18n } from "@/i18n";
import { useAnalysis } from "@/lib/client";
import { setGoal, togglePicked, useAppState } from "@/lib/store";
import { Loadable, NeedHome } from "@/components/Guard";
import { useGoalCelebration } from "@/components/GoalCelebration";
import { ApplianceIcon, IconCheck } from "@/components/Icons";
import { Card, CardTitle, EmptyState, Field, Note, PageHeader, SampleBadge, cx, inputCls } from "@/components/ui";

export default function TipsPage() {
  const s = useAppState();
  const { t, tk, money, num } = useI18n();
  const r = useAnalysis(s);
  const tips = r.data?.tips ?? [];
  const picked = s?.settings.picked ?? [];
  const planned = tips.filter((x) => picked.includes(x.id)).reduce((a, x) => a + x.saving, 0);
  const goal = s?.settings.goal ?? 0;
  const reached = goal > 0 && planned >= goal;
  const celebration = useGoalCelebration(reached, planned);
  const pct = goal > 0 ? Math.min(100, Math.round((planned / goal) * 100)) : 0;

  return (
    <NeedHome s={s}>
      <PageHeader title={t("tips.title")} subtitle={t("tips.subtitle")} badge={<SampleBadge kind="both" />} />
      <Loadable r={r}>
        {(a) => (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {a.tips.length === 0 ? (
                <Card>
                  <EmptyState image="/images/empty-tips.svg" title={t("tips.none")} text="" />
                </Card>
              ) : (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("tips.pickHint")}</p>
                  {a.tips.map((tip) => {
                    const on = picked.includes(tip.id);
                    return (
                      <Card key={tip.id} className={cx("flex items-center gap-3 transition", on && "border-emerald-400 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-500/5")} data-testid="tip">
                        <ApplianceIcon id={tip.appliance} size={48} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">{tk(`tips.${tip.id}`, tip.vars)}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
                            <span className="num font-bold text-emerald-600 dark:text-emerald-400" data-testid="tip-saving">
                              {t("tips.save", { amount: money(tip.saving) })}
                            </span>
                            {tip.units > 0 && <span className="text-slate-500 dark:text-slate-400">{t("tips.units", { n: num(tip.units) })}</span>}
                          </div>
                        </div>
                        <button type="button" onClick={() => togglePicked(tip.id)} aria-pressed={on} className={cx("flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition", on ? "bg-emerald-600 text-white ring-emerald-600" : "ring-slate-300 hover:bg-emerald-50 dark:ring-slate-600 dark:hover:bg-slate-800")} data-testid={`pick-${tip.id}`}>
                          <span className={cx("flex h-4 w-4 items-center justify-center rounded border", on ? "border-white" : "border-slate-400")}>{on && <IconCheck size={12} />}</span>
                          <span className="hidden sm:inline">{t("tips.try")}</span>
                        </button>
                      </Card>
                    );
                  })}
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("tips.note")}</p>
                </>
              )}
            </div>
            <div>
              <Card className="sticky top-20" data-testid="goal-card">
                <CardTitle>🎯 {t("tips.goalTitle")}</CardTitle>
                <Field label={t("tips.goalLabel")} htmlFor="goal">
                  <input id="goal" type="number" inputMode="numeric" min={0} max={100000} step={50} className={inputCls} value={goal} onChange={(e) => setGoal(Math.min(100000, Number(e.target.value) || 0))} data-testid="goal-input" />
                </Field>
                <div className="mt-4">
                  <div className="num text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="planned">
                    {t("tips.planned", { amount: money(planned) })}
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className={cx("h-full rounded-full transition-all", reached ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("tips.progress", { pct: num(pct) })}</div>
                </div>
                {reached && (
                  <Note className="mt-3 !bg-emerald-50 !text-emerald-800 dark:!bg-emerald-500/10 dark:!text-emerald-300" data-testid="goal-reached">
                    {t("goal.reached")} {t("goal.reachedText", { amount: money(planned) })}
                  </Note>
                )}
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("common.estimateNote")}</p>
              </Card>
            </div>
            {celebration}
          </div>
        )}
      </Loadable>
    </NeedHome>
  );
}
