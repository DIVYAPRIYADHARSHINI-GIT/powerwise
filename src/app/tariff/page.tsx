"use client";
// Editable slab tariff (sample rates by default), billing cycle and fixed charges.
import { useState } from "react";
import { useI18n } from "@/i18n";
import { SAMPLE_TARIFF, calcBill, periodMonths, sanitizeTariff } from "@/lib/tariff";
import { setTariff, useAppState } from "@/lib/store";
import type { Tariff } from "@/lib/types";
import { IconPlus, IconTrash } from "@/components/Icons";
import { Button, Card, CardTitle, Field, Note, PageHeader, PageSkeleton, SampleBadge, cx, inputCls, toast } from "@/components/ui";

export default function TariffPage() {
  const s = useAppState();
  const { t, ready, money, num } = useI18n();
  const [draft, setDraft] = useState<Tariff | null>(null);
  const [err, setErr] = useState(false);
  if (!s || !ready) return <PageSkeleton />;
  const tr = draft ?? s.tariff;
  const set = (x: Tariff) => {
    setDraft(x);
    setErr(false);
  };
  const slabs = tr.slabs;
  const valid = slabs.every((sl, i) => i === slabs.length - 1 || (sl.upTo !== null && (i === 0 || sl.upTo > (slabs[i - 1].upTo ?? 0))));
  const exampleUnits = 300 * periodMonths(tr);
  const example = calcBill(exampleUnits, sanitizeTariff(tr));

  const save = () => {
    if (!valid) {
      setErr(true);
      return;
    }
    setTariff(sanitizeTariff(tr));
    setDraft(null);
    toast(t("tariff.saved"));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("tariff.title")} subtitle={t("tariff.subtitle")} badge={<SampleBadge kind="tariff" />} />
      <Note tone="warn" className="mb-4" data-testid="tariff-sample-note">
        {t("tariff.sampleNote")}
      </Note>
      <Card>
        <CardTitle>{t("tariff.slabs")}</CardTitle>
        <div className="space-y-2" data-testid="slabs">
          {slabs.map((sl, i) => {
            const last = i === slabs.length - 1;
            const from = i === 0 ? 0 : (slabs[i - 1].upTo ?? 0);
            return (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" data-testid="slab-row">
                <Field label={last ? t("tariff.above") : t("tariff.upTo")}>
                  {last ? (
                    <div className="num rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">&gt; {num(from)}</div>
                  ) : (
                    <input type="number" min={1} className={cx(inputCls, err && !valid && "border-rose-400")} value={sl.upTo ?? ""} onChange={(e) => set({ ...tr, slabs: slabs.map((x, j) => (j === i ? { ...x, upTo: e.target.value === "" ? 0 : Number(e.target.value) } : x)) })} aria-label={`${t("tariff.upTo")} ${i + 1}`} data-testid={`slab-upto-${i}`} />
                  )}
                </Field>
                <Field label={t("tariff.rate")}>
                  <input type="number" min={0} step={0.05} className={inputCls} value={sl.rate} onChange={(e) => set({ ...tr, slabs: slabs.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) } : x)) })} aria-label={`${t("tariff.rate")} ${i + 1}`} data-testid={`slab-rate-${i}`} />
                </Field>
                <button type="button" disabled={slabs.length <= 1 || last} onClick={() => set({ ...tr, slabs: slabs.filter((_, j) => j !== i) })} className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:invisible dark:hover:bg-rose-500/10" aria-label={t("common.delete")} data-testid={`slab-del-${i}`}>
                  <IconTrash size={16} />
                </button>
              </div>
            );
          })}
        </div>
        {err && !valid && (
          <p className="mt-2 text-sm font-medium text-rose-600" role="alert">
            {t("tariff.invalid")}
          </p>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={slabs.length >= 10}
          onClick={() => {
            const prev = slabs.length > 1 ? (slabs[slabs.length - 2].upTo ?? 0) : 0;
            const top = slabs[slabs.length - 1];
            set({ ...tr, slabs: [...slabs.slice(0, -1), { upTo: prev + 100, rate: top.rate }, { upTo: null, rate: top.rate + 1 }] });
          }}
          data-testid="slab-add"
        >
          <IconPlus size={15} /> {t("tariff.addSlab")}
        </Button>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field label={t("tariff.fixed")} htmlFor="fixed">
            <input id="fixed" type="number" min={0} className={inputCls} value={tr.fixedCharge} onChange={(e) => set({ ...tr, fixedCharge: Number(e.target.value) })} data-testid="tariff-fixed" />
          </Field>
          <Field label={t("tariff.duty")} htmlFor="duty">
            <input id="duty" type="number" min={0} max={50} step={0.5} className={inputCls} value={tr.dutyPct} onChange={(e) => set({ ...tr, dutyPct: Number(e.target.value) })} data-testid="tariff-duty" />
          </Field>
          <Field label={t("tariff.billing")}>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label={t("tariff.billing")}>
              {(["monthly", "bimonthly"] as const).map((b) => (
                <button key={b} type="button" role="radio" aria-checked={tr.billing === b} onClick={() => set({ ...tr, billing: b })} className={cx("rounded-lg px-2 py-1.5 text-sm font-medium", tr.billing === b ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-600 dark:text-slate-400")} data-testid={`billing-${b}`}>
                  {b === "monthly" ? t("tariff.monthly") : t("tariff.bimonthly")}
                </button>
              ))}
            </div>
          </Field>
        </div>
        {tr.billing === "bimonthly" && <p className="mt-2 text-xs text-slate-500">{t("tariff.biNote")}</p>}

        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" data-testid="tariff-example">
          {t("tariff.example", { units: num(exampleUnits), amount: money(example.total) })}
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={() => set({ ...SAMPLE_TARIFF, slabs: SAMPLE_TARIFF.slabs.map((x) => ({ ...x })) })} data-testid="tariff-reset">
            {t("tariff.reset")}
          </Button>
          <Button variant="green" onClick={save} disabled={!draft} data-testid="tariff-save">
            {t("common.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
