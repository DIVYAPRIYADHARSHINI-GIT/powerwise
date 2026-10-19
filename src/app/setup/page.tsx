"use client";
// Home setup: a 3-step form (home -> appliances with hours/day -> solar & review).
// The draft lives in component state; nothing is saved until "Save".
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { ALL_CITIES, SPECS, emptyHousehold, sanitizeHousehold } from "@/lib/household";
import { saveHousehold, useAppState } from "@/lib/store";
import { APPLIANCES, CLIMATES, type ApplianceId, type Household } from "@/lib/types";
import { ApplianceIcon, IconCheck } from "@/components/Icons";
import { Button, Card, Field, PageHeader, PageSkeleton, SampleBadge, cx, inputCls, toast } from "@/components/ui";

function Stepper({ value, min, max, step = 1, onChange, label, testId }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; testId?: string }) {
  const { num } = useI18n();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  return (
    <div className="inline-flex items-center rounded-xl ring-1 ring-slate-300 dark:ring-slate-600" role="group" aria-label={label}>
      <button type="button" className="h-9 w-9 rounded-s-xl text-lg font-bold text-slate-600 hover:bg-amber-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => set(value - step)} disabled={value <= min} aria-label={`${label} −`} data-testid={testId ? `${testId}-dec` : undefined}>
        −
      </button>
      <span className="num min-w-10 text-center font-semibold" data-testid={testId}>
        {num(value, 2)}
      </span>
      <button type="button" className="h-9 w-9 rounded-e-xl text-lg font-bold text-slate-600 hover:bg-amber-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => set(value + step)} disabled={value >= max} aria-label={`${label} +`} data-testid={testId ? `${testId}-inc` : undefined}>
        +
      </button>
    </div>
  );
}

function ApplianceRow({ id, h, set }: { id: ApplianceId; h: Household; set: (h: Household) => void }) {
  const { t, appName, num } = useI18n();
  const u = h.appliances[id];
  const sp = SPECS[id];
  const patch = (p: Partial<typeof u>) => set({ ...h, appliances: { ...h.appliances, [id]: { ...u, ...p } } });
  const owned = u.count > 0;
  return (
    <div className={cx("rounded-2xl border p-3 transition sm:p-4", owned ? "border-amber-300 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-400/5" : "border-slate-200 dark:border-slate-700")} data-testid={`appl-${id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <ApplianceIcon id={id} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 dark:text-white">{appName(id)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{owned ? (id === "fridge" ? t("setup.alwaysOn") : t("common.hoursDay", { n: num(u.hours, 2) })) : t("setup.notOwned")}</div>
        </div>
        <Stepper label={`${appName(id)}: ${t("setup.count")}`} value={u.count} min={0} max={sp.maxCount} onChange={(c) => patch({ count: c, hours: c === 0 ? 0 : id === "fridge" ? 24 : u.hours || Math.min(sp.maxHours, id === "fans" ? 8 : id === "lights" ? 5 : 1) })} testId={`count-${id}`} />
      </div>
      {owned && id !== "fridge" && (
        <div className="mt-3">
          <label className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400" htmlFor={`hours-${id}`}>
            <span>{t("setup.hours")}</span>
            <span className="num font-semibold text-slate-900 dark:text-white">{num(u.hours, 2)} h</span>
          </label>
          <input id={`hours-${id}`} type="range" className="slider mt-1" min={0} max={sp.maxHours} step={id === "geyser" || id === "iron" || id === "washer" || id === "induction" ? 0.25 : 0.5} value={u.hours} onChange={(e) => patch({ hours: Number(e.target.value) })} data-testid={`hours-${id}`} />
        </div>
      )}
      {owned && id === "ac" && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">{t("setup.acTemp")}</span>
          <Stepper label={t("setup.acTemp")} value={u.temp ?? 24} min={16} max={30} onChange={(v) => patch({ temp: v })} testId="ac-temp" />
        </div>
      )}
      {owned && id === "fridge" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">{t("setup.fridgeStar")}</span>
          <div className="flex gap-1" role="radiogroup" aria-label={t("setup.fridgeStar")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={u.star === n} onClick={() => patch({ star: n })} className={cx("rounded-lg px-2.5 py-1 text-sm font-semibold ring-1", u.star === n ? "bg-amber-400 text-slate-900 ring-amber-500" : "ring-slate-300 hover:bg-amber-50 dark:ring-slate-600 dark:hover:bg-slate-800")} data-testid={`star-${n}`}>
                {num(n)}★
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetupPage() {
  const s = useAppState();
  const { t, ready, num, tk } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<Household | null>(null);
  const [step, setStep] = useState(0);
  const [nameErr, setNameErr] = useState(false);
  if (!s || !ready) return <PageSkeleton />;
  const h = draft ?? s.household ?? emptyHousehold();
  const set = (x: Household) => setDraft(x);
  const steps = [t("setup.step1"), t("setup.step2"), t("setup.step3")];

  const next = () => {
    if (step === 0 && !h.name.trim()) {
      setNameErr(true);
      return;
    }
    setStep((x) => Math.min(2, x + 1));
    window.scrollTo({ top: 0 });
  };
  const save = () => {
    if (!h.name.trim()) {
      setStep(0);
      setNameErr(true);
      return;
    }
    saveHousehold(sanitizeHousehold(h));
    toast(t("setup.saved"));
    router.push("/predict");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("setup.title")} subtitle={t("setup.subtitle")} badge={s.mode === "sample" ? <SampleBadge /> : undefined} />
      <ol className="mb-5 grid grid-cols-3 gap-2" data-testid="stepper">
        {steps.map((label, i) => (
          <li key={label}>
            <button type="button" onClick={() => (i < step || h.name.trim() ? setStep(i) : setNameErr(true))} className={cx("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm font-medium transition", i === step ? "bg-amber-400 text-slate-900" : i < step ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")} aria-current={i === step ? "step" : undefined} data-testid={`step-${i}`}>
              <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", i === step ? "bg-white/70" : i < step ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-700")}>{i < step ? <IconCheck size={14} /> : num(i + 1)}</span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t("setup.stepOf", { n: num(step + 1), total: num(3) })}</p>

      <Card>
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2" data-testid="step-home">
            <Field label={t("setup.name")} htmlFor="hh-name" error={nameErr && !h.name.trim() ? t("setup.nameRequired") : undefined}>
              <input id="hh-name" className={inputCls} value={h.name} placeholder={t("setup.namePh")} maxLength={60} onChange={(e) => set({ ...h, name: e.target.value })} data-testid="hh-name" />
            </Field>
            <Field label={t("setup.city")} htmlFor="hh-city">
              <select id="hh-city" className={inputCls} value={h.city} onChange={(e) => set({ ...h, city: e.target.value, climate: ALL_CITIES.find((c) => c.city === e.target.value)?.climate ?? h.climate })} data-testid="hh-city">
                {ALL_CITIES.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("setup.climate")}>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("setup.climate")}>
                {CLIMATES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={h.climate === c} onClick={() => set({ ...h, climate: c })} className={cx("rounded-xl px-2 py-2 text-sm font-medium ring-1", h.climate === c ? "bg-amber-400 text-slate-900 ring-amber-500" : "ring-slate-300 hover:bg-amber-50 dark:ring-slate-600 dark:hover:bg-slate-800")} data-testid={`climate-${c}`}>
                    {tk(`setup.climate.${c}`)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("setup.size")}>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("setup.size")}>
                {[1, 2, 3].map((b) => (
                  <button key={b} type="button" role="radio" aria-checked={h.bhk === b} onClick={() => set({ ...h, bhk: b })} className={cx("rounded-xl px-2 py-2 text-sm font-medium ring-1", h.bhk === b ? "bg-amber-400 text-slate-900 ring-amber-500" : "ring-slate-300 hover:bg-amber-50 dark:ring-slate-600 dark:hover:bg-slate-800")} data-testid={`bhk-${b}`}>
                    {t("setup.bhk", { n: num(b) })}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("setup.members")}>
              <Stepper label={t("setup.members")} value={h.members} min={1} max={12} onChange={(v) => set({ ...h, members: v })} testId="members" />
            </Field>
            <Field label={t("setup.wfh")}>
              <Stepper label={t("setup.wfh")} value={h.wfhDays} min={0} max={7} onChange={(v) => set({ ...h, wfhDays: v })} testId="wfh" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div data-testid="step-appliances">
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{t("setup.appliancesHint")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {APPLIANCES.map((id) => (
                <ApplianceRow key={id} id={id} h={h} set={set} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5" data-testid="step-review">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <ApplianceIcon id="solar" size={44} />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-white">{t("setup.solar")}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{t("setup.solarKw")}</div>
              </div>
              <Stepper label={t("setup.solarKw")} value={h.solarKw} min={0} max={10} step={0.5} onChange={(v) => set({ ...h, solarKw: v })} testId="solar-kw" />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{t("setup.review")}</h3>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {(
                  [
                    [t("setup.name"), h.name || "—"],
                    [t("setup.city"), `${h.city} · ${tk(`setup.climate.${h.climate}`)}`],
                    [t("setup.size"), t("setup.bhk", { n: num(h.bhk) })],
                    [t("setup.members"), num(h.members)],
                    [t("setup.wfh"), num(h.wfhDays)],
                    [t("setup.solarKw"), num(h.solarKw, 1)],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1 dark:border-slate-800">
                    <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                    <dd className="font-medium text-slate-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {APPLIANCES.filter((id) => h.appliances[id].count > 0).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pe-3 ps-1 text-sm dark:bg-slate-800">
                    <ApplianceIcon id={id} size={24} />
                    <ReviewLabel id={id} h={h} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0} data-testid="setup-back">
            {t("common.back")}
          </Button>
          {step < 2 ? (
            <Button onClick={next} data-testid="setup-next">
              {t("common.next")}
            </Button>
          ) : (
            <Button variant="green" onClick={save} data-testid="setup-save">
              {t("setup.saveSee")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function ReviewLabel({ id, h }: { id: ApplianceId; h: Household }) {
  const { appName, num } = useI18n();
  const u = h.appliances[id];
  return (
    <span>
      {appName(id)} <span className="num text-slate-500 dark:text-slate-400">×{num(u.count)}{id !== "fridge" ? ` · ${num(u.hours, 2)} h` : ""}</span>
    </span>
  );
}
