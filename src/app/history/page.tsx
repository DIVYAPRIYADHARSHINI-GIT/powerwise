"use client";
// Bill history: add bills manually or from CSV, 12-month trend, actual vs predicted.
import { useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { MONTH_RE, nextMonth } from "@/lib/household";
import { parseBillsCsv } from "@/lib/csv";
import { useAnalysis } from "@/lib/client";
import { clearBills, deleteBill, upsertBills, useAppState } from "@/lib/store";
import { HistoryChart } from "@/components/Charts";
import { NeedHome } from "@/components/Guard";
import { IconDownload, IconPlus, IconTrash, IconUpload } from "@/components/Icons";
import { Button, Card, CardTitle, Chip, ConfirmDialog, EmptyState, Field, Note, PageHeader, SampleBadge, Skeleton, inputCls, toast } from "@/components/ui";

export default function HistoryPage() {
  const s = useAppState();
  const { t, tk, money, num, month } = useI18n();
  const r = useAnalysis(s);
  const [m, setM] = useState("");
  const [units, setUnits] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<{ month?: string; units?: string }>({});
  const [csvMsg, setCsvMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const maxMonth = nextMonth(new Date()).slice(0, 7);

  const add = () => {
    const e: typeof err = {};
    const u = Number(units);
    if (!MONTH_RE.test(m)) e.month = t("history.invalidMonth");
    else if (m >= maxMonth) e.month = t("history.futureMonth");
    if (units.trim() === "" || !Number.isFinite(u) || u < 0 || u > 20000) e.units = t("history.invalidUnits");
    setErr(e);
    if (e.month || e.units) return;
    const a = Number(amount);
    upsertBills([{ id: `manual-${m}`, month: m, units: u, amount: amount.trim() && Number.isFinite(a) && a >= 0 ? Math.round(a) : null, source: "manual" }]);
    setUnits("");
    setAmount("");
    toast(t("history.added"));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 500_000) {
      setCsvMsg({ tone: "err", text: t("history.csvError") });
      return;
    }
    const text = await f.text();
    const res = parseBillsCsv(text);
    const valid = res.bills.filter((b) => b.month < maxMonth);
    const skipped = res.errors + (res.bills.length - valid.length);
    if (!valid.length) setCsvMsg({ tone: "err", text: t("history.csvError") });
    else {
      upsertBills(valid);
      setCsvMsg({ tone: "ok", text: `${t("history.imported", { n: num(valid.length) })}${skipped ? ` · ${t("history.skipped", { n: num(skipped) })}` : ""}` });
      toast(t("history.imported", { n: num(valid.length) }));
    }
    if (file.current) file.current.value = "";
  };

  const bills = s?.bills ?? [];
  const pred = new Map((r.data?.history ?? []).map((p) => [p.month, p.predicted]));

  return (
    <NeedHome s={s}>
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle")} badge={s?.mode === "sample" ? <SampleBadge /> : undefined} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card data-testid="add-bill">
            <CardTitle icon={<IconPlus size={18} />}>{t("history.add")}</CardTitle>
            <div className="space-y-3">
              <Field label={t("common.month")} htmlFor="bill-month" error={err.month}>
                <input id="bill-month" type="month" className={inputCls} value={m} max={maxMonth} onChange={(e) => setM(e.target.value)} data-testid="bill-month" />
              </Field>
              <Field label={t("common.unitsLabel")} htmlFor="bill-units" error={err.units}>
                <input id="bill-units" type="number" inputMode="decimal" min={0} max={20000} className={inputCls} value={units} onChange={(e) => setUnits(e.target.value)} data-testid="bill-units" />
              </Field>
              <Field label={t("history.amount")} htmlFor="bill-amount">
                <input id="bill-amount" type="number" inputMode="numeric" min={0} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="bill-amount" />
              </Field>
              <Button onClick={add} className="w-full" data-testid="bill-add">
                {t("history.addBtn")}
              </Button>
            </div>
          </Card>
          <Card data-testid="csv-card">
            <CardTitle icon={<IconUpload size={18} />}>{t("history.upload")}</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("history.csvHint")}</p>
            <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="csv-input" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => file.current?.click()} data-testid="csv-upload">
                <IconUpload size={16} /> {t("history.upload")}
              </Button>
              <a href="/sample-bills.csv" download className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-slate-800">
                <IconDownload size={16} /> {t("history.sampleCsv")}
              </a>
            </div>
            {csvMsg && (
              <Note tone={csvMsg.tone === "err" ? "warn" : "info"} className="mt-3" data-testid="csv-msg" data-tone={csvMsg.tone}>
                {csvMsg.text}
              </Note>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {bills.length === 0 ? (
            <Card>
              <EmptyState image="/images/empty-bills.svg" title={t("history.emptyTitle")} text={t("history.emptyText")} />
            </Card>
          ) : (
            <>
              <Card>
                <CardTitle>{t("history.trend")}</CardTitle>
                {r.data ? <HistoryChart data={r.data.history} /> : <Skeleton className="h-72" />}
                {r.data?.historyMae != null && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400" data-testid="history-gap">{t("history.gap", { n: num(r.data.historyMae) })}</p>}
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <CardTitle className="!mb-0">{t("history.avsp")}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} data-testid="clear-bills">
                    <IconTrash size={15} /> {t("history.clear")}
                  </Button>
                </div>
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-sm" data-testid="bills-table">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 pb-2 text-start font-medium">{t("common.month")}</th>
                        <th className="px-2 pb-2 text-end font-medium">{t("predict.actual")}</th>
                        <th className="px-2 pb-2 text-end font-medium">{t("predict.predicted")}</th>
                        <th className="px-2 pb-2 text-end font-medium">{t("history.diff")}</th>
                        <th className="px-2 pb-2 text-end font-medium">{t("common.bill")}</th>
                        <th className="px-2 pb-2 text-start font-medium">{t("history.source")}</th>
                        <th className="px-2 pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...bills].reverse().map((b) => {
                        const p = pred.get(b.month);
                        const d = p === undefined ? null : b.units - p;
                        return (
                          <tr key={b.month} className="border-t border-slate-100 dark:border-slate-800" data-testid="bill-row">
                            <td className="px-2 py-2 font-medium">{month(b.month)}</td>
                            <td className="num px-2 py-2 text-end">{num(b.units)}</td>
                            <td className="num px-2 py-2 text-end text-slate-500">{p === undefined ? "—" : num(p)}</td>
                            <td className="num px-2 py-2 text-end">{d === null ? "—" : <span className={Math.abs(d) > (p ?? 1) * 0.15 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}>{d > 0 ? "+" : ""}{num(d)}</span>}</td>
                            <td className="num px-2 py-2 text-end">{b.amount === null ? "—" : money(b.amount)}</td>
                            <td className="px-2 py-2">
                              <Chip tone={b.source === "sample" ? "amber" : b.source === "csv" ? "sky" : "green"}>{tk(`history.src.${b.source}`)}</Chip>
                            </td>
                            <td className="px-2 py-2 text-end">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteBill(b.month);
                                  toast(t("history.deleted"));
                                }}
                                aria-label={`${t("common.delete")} ${month(b.month)}`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                                data-testid="bill-delete"
                              >
                                <IconTrash size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        danger
        title={t("history.clearTitle")}
        text={t("history.clearText")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          clearBills();
          setConfirm(false);
        }}
      />
    </NeedHome>
  );
}
