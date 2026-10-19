"use client";
// Home: hero illustration, quick summary of the next bill and feature cards.
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n/messages/en";
import { useAnalysis } from "@/lib/client";
import { useAppState } from "@/lib/store";
import { ApplianceIcon, IconArrow, IconBulb, IconCalendar, IconChart, IconFile, IconPie, IconSliders, IconSun } from "@/components/Icons";
import { Card, LinkButton, SampleBadge, Skeleton } from "@/components/ui";

const FEATURES: Array<{ href: string; title: MessageKey; text: MessageKey; icon: React.ReactNode }> = [
  { href: "/predict", title: "nav.predict", text: "home.f.predict", icon: <IconChart size={20} /> },
  { href: "/appliances", title: "nav.appliances", text: "home.f.appliances", icon: <IconPie size={20} /> },
  { href: "/tips", title: "nav.tips", text: "home.f.tips", icon: <IconBulb size={20} /> },
  { href: "/what-if", title: "nav.whatIf", text: "home.f.whatIf", icon: <IconSliders size={20} /> },
  { href: "/history", title: "nav.history", text: "home.f.history", icon: <IconCalendar size={20} /> },
  { href: "/forecast", title: "nav.forecast", text: "home.f.forecast", icon: <IconChart size={20} /> },
  { href: "/solar", title: "nav.solar", text: "home.f.solar", icon: <IconSun size={20} /> },
  { href: "/reports", title: "nav.reports", text: "home.f.reports", icon: <IconFile size={20} /> },
];

export default function HomePage() {
  const s = useAppState();
  const { t, money, num, month, appName, tk } = useI18n();
  const a = useAnalysis(s);
  const top = a.data?.breakdownNext.items[0];
  const tip = a.data?.tips[0];

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <SampleBadge kind="both" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white" data-testid="hero-title">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">{t("home.heroText")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={s?.household ? "/predict" : "/setup"} size="lg" data-testid="cta-predict">
              {t(s?.household ? "home.ctaPredict" : "home.ctaSetup")} <IconArrow size={18} />
            </LinkButton>
            {s?.household && (
              <LinkButton href="/setup" variant="secondary" size="lg">
                {t("nav.setup")}
              </LinkButton>
            )}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <Image src="/images/hero.svg" alt="" width={560} height={420} priority className="animate-float h-auto w-full drop-shadow-xl" data-testid="hero-image" />
        </div>
      </section>

      {s?.household && (
        <section className="grid gap-4 sm:grid-cols-3" data-testid="home-summary">
          {a.data ? (
            <>
              <Link href="/predict" className="group">
                <Card className="h-full transition group-hover:border-amber-300">
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("home.nextBill", { month: month(a.data.next.month, "long") })}</div>
                  <div className="num mt-1 text-3xl font-bold text-slate-900 dark:text-white" data-testid="home-next-bill">
                    {money(a.data.next.cost)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("common.units", { n: num(a.data.next.units) })}</div>
                </Card>
              </Link>
              <Link href="/appliances" className="group">
                <Card className="flex h-full items-center gap-3 transition group-hover:border-amber-300">
                  {top && <ApplianceIcon id={top.id} size={48} />}
                  <div className="min-w-0">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t("home.topEater")}</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{top ? appName(top.id) : "—"}</div>
                    {top && <div className="text-sm text-slate-500 dark:text-slate-400">{t("appl.share", { pct: num(top.share) })}</div>}
                  </div>
                </Card>
              </Link>
              <Link href="/tips" className="group">
                <Card className="h-full transition group-hover:border-emerald-300">
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("home.bestTip")}</div>
                  {tip ? (
                    <>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{tk(`tips.${tip.id}`, tip.vars)}</div>
                      <div className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">{t("tips.save", { amount: money(tip.saving) })}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-slate-700 dark:text-slate-300">{t("tips.none")}</div>
                  )}
                </Card>
              </Link>
            </>
          ) : (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{t("home.features")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900" data-testid="feature-card">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">{f.icon}</span>
              <div className="mt-3 font-semibold text-slate-900 dark:text-white">{t(f.title)}</div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(f.text)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
