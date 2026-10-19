"use client";
// About: sample dataset, model, accuracy vs baselines and feature importance.
import metrics from "@/data/metrics.json";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n/messages/en";
import { ImportanceChart } from "@/components/Charts";
import { Card, CardTitle, Note, PageHeader, PageSkeleton, SampleBadge, cx } from "@/components/ui";

// Group raw model features into plain-language drivers.
const GROUPS: Record<string, MessageKey | `app.${string}`> = {
  ac_season: "app.ac", ac_load: "app.ac", ac_temp: "app.ac",
  solar_kw: "app.solar", solar_season: "app.solar",
  fan_load: "app.fans", fan_season: "app.fans",
  geyser_load: "app.geyser", geyser_season: "app.geyser",
  fridge_load: "app.fridge", fridge_season: "app.fridge",
  induction_load: "app.induction", ev_load: "app.ev", light_load: "app.lights", tv_load: "app.tv",
  washer_load: "app.washer", iron_load: "app.iron",
  wfh_days: "about.feat.wfh", month: "about.feat.month", festival: "about.feat.festival",
  members: "about.feat.home", bhk: "about.feat.home", climate: "about.feat.climate",
};

export default function AboutPage() {
  const { t, tk, num, ready } = useI18n();
  if (!ready) return <PageSkeleton />;
  const d = metrics.dataset;
  const m = metrics.metrics;
  const grouped = new Map<string, number>();
  for (const f of metrics.importance) {
    const k = GROUPS[f.feature] ?? f.feature;
    grouped.set(k, (grouped.get(k) ?? 0) + f.share);
  }
  const rows = [...grouped.entries()].map(([k, v]) => ({ name: tk(k), value: Math.round(v * 10) / 10 })).filter((r) => r.value >= 0.5).sort((a, b) => b.value - a.value).slice(0, 9);
  const models: Array<[string, typeof m.gbm, boolean]> = [
    [t("about.gbm"), m.gbm, true],
    [t("about.linear"), m.linear, false],
    [t("about.baseline"), m.baseline, false],
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title={t("about.title")} subtitle={t("about.subtitle")} badge={<SampleBadge kind="both" />} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>📊 {t("about.dataTitle")}</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400" data-testid="about-data">
            {t("about.dataText", { households: num(d.households), months: num(d.months), rows: num(d.rows) })}
          </p>
        </Card>
        <Card>
          <CardTitle>🤖 {t("about.modelTitle")}</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("about.modelText", { trees: num(metrics.model.trees), test: num(d.testHouseholds) })}</p>
        </Card>
      </div>
      <Card>
        <CardTitle>{t("about.accuracy")}</CardTitle>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm" data-testid="accuracy-table">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 pb-2 text-start font-medium" />
                <th className="px-2 pb-2 text-end font-medium">{t("about.mae")}</th>
                <th className="px-2 pb-2 text-end font-medium">{t("about.r2")}</th>
                <th className="px-2 pb-2 text-end font-medium">{t("about.mape")}</th>
              </tr>
            </thead>
            <tbody>
              {models.map(([name, v, best]) => (
                <tr key={name} className={cx("border-t border-slate-100 dark:border-slate-800", best && "bg-emerald-50/70 font-semibold dark:bg-emerald-500/10")} data-testid={best ? "acc-gbm" : "acc-row"}>
                  <td className="px-2 py-2">{name}</td>
                  <td className="num px-2 py-2 text-end" data-testid={best ? "gbm-mae" : undefined}>{num(v.mae, 1)}</td>
                  <td className="num px-2 py-2 text-end" data-testid={best ? "gbm-r2" : undefined}>{num(v.r2, 2)}</td>
                  <td className="num px-2 py-2 text-end">{num(v.mape, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{t("about.importance")}</CardTitle>
          <ImportanceChart rows={rows} />
        </Card>
        <Card>
          <CardTitle>{t("about.howTitle")}</CardTitle>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {(["about.how1", "about.how2", "about.how3", "about.how4"] as const).map((k, i) => (
              <li key={k} className="flex gap-2">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">{num(i + 1)}</span>
                {t(k)}
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <Note tone="warn">{t("about.disclaimer")}</Note>
    </div>
  );
}
