"use client";
import Link from "next/link";
import { useI18n } from "@/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-amber-200/60 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto max-w-6xl px-4">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-300">PowerWise</span> · {t("brand.tagline")}
        </p>
        <p className="mt-1" data-testid="footer-note">{t("footer.text")}</p>
        <p className="mt-2 flex justify-center gap-3">
          <Link href="/about" className="hover:underline">{t("nav.about")}</Link>
          <Link href="/tariff" className="hover:underline">{t("nav.tariff")}</Link>
          <a href="https://github.com/DIVYAPRIYADHARSHINI-GIT/powerwise" className="hover:underline" rel="noreferrer" target="_blank">GitHub</a>
        </p>
      </div>
    </footer>
  );
}
