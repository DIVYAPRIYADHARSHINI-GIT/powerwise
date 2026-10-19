"use client";
// Bill prediction: next bill + likely range, slab breakdown, and comparison
// with the household's past bills.
import { useI18n } from "@/i18n";
import { addMonths } from "@/lib/household";
import { useAnalysis } from "@/lib/client";
import { useAppState } from "@/lib/store";
import { HistoryChart } from "@/components/Charts";
import { Loadable, NeedHome } from "@/components/Guard";
import { IconTrendDown, IconTrendUp } from "@/components/Icons";
import { Card, CardTitle, Chip, LinkButton, Note, PageHeader, SampleBadge } from "@/components/ui";

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  const { t, num } = useI18n();
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const tone = Math.abs(pct) < 3 ? "slate" : pct > 0 ? "red" : "green";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="delta">
      <Chip tone={tone}>
        {pct > 0 ? <IconTrendUp size={14} /> : pct < 0 ? <IconTrendDown size={14} /> : null}
        {Math.abs(pct) < 3 ? t("predict.same") : pct > 0 ? t("predict.more", { pct: num(pct) }) : t("predict.less", { pct: num(-pct) })}
      </Chip>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

export default function PredictPage() {
  const s = useAppState();
  const { t, money, num, month, rate } = useI18n();
  const r = useAnalysis(s);
  return (
    <NeedHome s={s}>
      <PageHeader title={t("predict.title")} subtitle={t("predict.subtitle")} badge={<SampleBadge kind="both" />} />
      <Loadable r={r}>
        {(a) => {
          const bi = s!.tariff.billing === "bimonthly";
          const past = a.history;
          const last = past[past.length - 1];
          const avgUnits = past.length ? past.reduce((x, p) => x + p.actual, 0) / past.length : 0;
          const lastAmount = last ? (last.amount ?? null) : null;
          const lastBillComparable = !bi && lastAmount !== null;
          return (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="relative overflow-hidden lg:col-span-3" data-testid="next-bill-card">
                <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-amber-200/50 blur-2xl dark:bg-amber-400/10" />
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{bi ? t("predict.billForBi", { from: month(a.next.month), to: month(addMonths(a.next.month, 1)) }) : t("predict.billFor", { month: month(a.next.month, "long") })}</div>
                <div className="num mt-1 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white" data-testid="predicted-bill">
                  {money(a.next.cost)}
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300" data-testid="bill-range">
                  {t("predict.range", { low: money(a.next.costLow), high: money(a.next.costHigh) })}
                </div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="num text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="predicted-units">
                    {t("common.units", { n: num(a.next.units) })}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t("predict.unitsRange", { low: num(a.next.low), high: num(a.next.high) })}</span>
                </div>
                {/* Range bar */}
                <div className="mt-3 h-2 rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-emerald-300 via-amber-300 to-rose-300 dark:from-emerald-600 dark:via-amber-500 dark:to-rose-500" aria-hidden="true">
                  <div className="relative h-full" style={{ marginInlineStart: `${Math.min(96, Math.max(2, ((a.next.cost - a.next.costLow) / Math.max(1, a.next.costHigh - a.next.costLow)) * 100))}%` }}>
                    <span className="absolute -top-1 block h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-slate-900 shadow rtl:translate-x-1/2 dark:bg-white" />
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {lastBillComparable && last && <Delta now={a.next.cost} before={lastAmount!} label={t("predict.vsLast", { amount: money(lastAmount!) })} />}
                  {avgUnits > 0 && <Delta now={bi ? a.next.units / 2 : a.next.units} before={avgUnits} label={t("predict.vsAvg")} />}
                </div>
                <div className="mt-4">
                  {a.factorBills > 0 ? (
                    <Note data-testid="personal-note">{t("predict.personal", { n: num(a.factorBills), factor: num(a.factor, 2) })}</Note>
                  ) : (
                    <Note>
                      {t("predict.noPersonal")}{" "}
                      <LinkButton href="/history" size="sm" variant="ghost" className="!px-1 !py-0 underline">
                        {t("nav.history")}
                      </LinkButton>
                    </Note>
                  )}
                </div>
              </Card>

              <Card className="lg:col-span-2" data-testid="slab-card">
                <CardTitle>{t("predict.calcTitle")}</CardTitle>
                <table className="w-full text-sm">
                  <tbody>
                    {a.next.bill.lines.map((l) => (
                      <tr key={l.from} className="border-b border-slate-100 dark:border-slate-800" data-testid="slab-line">
                        <td className="py-1.5 text-slate-600 dark:text-slate-400">{l.to === null ? t("predict.slabTop", { from: num(l.from), rate: rate(l.rate) }) : t("predict.slabRow", { from: num(l.from), to: num(l.to), rate: rate(l.rate) })}</td>
                        <td className="num py-1.5 text-end text-slate-500">{num(l.units, 1)}</td>
                        <td className="num py-1.5 text-end font-medium">{money(l.amount)}</td>
                      </tr>
                    ))}
                    <Row label={t("predict.energy")} value={money(a.next.bill.energy)} />
                    <Row label={t("predict.fixed")} value={money(a.next.bill.fixed)} />
                    <Row label={t("predict.duty", { pct: num(s!.tariff.dutyPct, 1) })} value={money(a.next.bill.duty)} />
                    <tr>
                      <td className="pt-2 font-bold text-slate-900 dark:text-white" colSpan={2}>
                        {t("predict.total")}
                      </td>
                      <td className="num pt-2 text-end text-lg font-bold text-slate-900 dark:text-white" data-testid="slab-total">
                        {money(a.next.bill.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <SampleBadge kind="tariff" />
                  <LinkButton href="/tariff" size="sm" variant="secondary">
                    {t("nav.tariff")}
                  </LinkButton>
                </div>
              </Card>

              <Card className="lg:col-span-5">
                <CardTitle>{t("predict.pastTitle")}</CardTitle>
                <HistoryChart data={past} next={{ month: a.next.month, units: bi ? Math.round(a.forecast[0].units) : a.next.units }} />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("common.estimateNote")}</p>
              </Card>
            </div>
          );
        }}
      </Loadable>
    </NeedHome>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      <td className="py-1.5 text-slate-600 dark:text-slate-400" colSpan={2}>
        {label}
      </td>
      <td className="num py-1.5 text-end font-medium">{value}</td>
    </tr>
  );
}
