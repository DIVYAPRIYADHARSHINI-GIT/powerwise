"use client";
// Top navigation: brand + tagline, main links, "More" menu, searchable
// language switcher (remembers the choice) and the light/dark toggle.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { LOCALES } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages/en";
import { useTheme } from "./ThemeProvider";
import { cx } from "./ui";
import { IconCheck, IconChevron, IconGlobe, IconMenu, IconMoon, IconSearch, IconSun, IconX } from "./Icons";

export const NAV: Array<{ href: string; key: MessageKey; primary?: boolean }> = [
  { href: "/predict", key: "nav.predict", primary: true },
  { href: "/appliances", key: "nav.appliances", primary: true },
  { href: "/tips", key: "nav.tips", primary: true },
  { href: "/what-if", key: "nav.whatIf", primary: true },
  { href: "/history", key: "nav.history", primary: true },
  { href: "/forecast", key: "nav.forecast" },
  { href: "/solar", key: "nav.solar" },
  { href: "/reports", key: "nav.reports" },
  { href: "/setup", key: "nav.setup" },
  { href: "/tariff", key: "nav.tariff" },
  { href: "/about", key: "nav.about" },
];

function Logo() {
  return (
    <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="11" fill="#fbbf24" />
      <path d="M8 20 20 9l12 11v11a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="#fff" />
      <path d="M21.5 14 15 23h5l-1.5 7 6.5-9.5h-5z" fill="#059669" />
    </svg>
  );
}

function useOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref]);
}

export function LanguageSwitcher() {
  const { lang, setLang, t, info } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useOutside(ref, open, () => setOpen(false));
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? LOCALES.filter((l) => l.native.toLowerCase().includes(s) || l.english.toLowerCase().includes(s) || l.code === s) : LOCALES;
  }, [q]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.language")}
        data-testid="lang-button"
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-amber-100/70 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <IconGlobe size={18} />
        <span className="hidden max-w-24 truncate sm:inline">{info.native}</span>
        <IconChevron size={14} />
      </button>
      {open && (
        <div className="animate-pop-in absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" data-testid="lang-menu">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <IconSearch size={16} className="text-slate-400" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchLanguage")}
              aria-label={t("nav.searchLanguage")}
              data-testid="lang-search"
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && list[0]) {
                  setLang(list[0].code);
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto py-1" aria-label={t("nav.language")}>
            {list.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === lang}
                  lang={l.code}
                  dir={l.dir}
                  data-testid={`lang-${l.code}`}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={cx("flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-amber-50 dark:hover:bg-slate-800", l.code === lang && "bg-amber-50 font-semibold dark:bg-slate-800")}
                >
                  <span className="truncate">{l.native}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400" dir="ltr">
                    {l.english}
                    {l.code === lang && <IconCheck size={14} className="text-emerald-600" />}
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-3 text-sm text-slate-500">{t("nav.noLanguage")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <button type="button" onClick={toggle} data-testid="theme-toggle" aria-label={dark ? t("nav.lightMode") : t("nav.darkMode")} title={dark ? t("nav.lightMode") : t("nav.darkMode")} className="rounded-xl p-2 text-slate-700 hover:bg-amber-100/70 dark:text-slate-200 dark:hover:bg-slate-800">
      {dark ? <IconSun size={19} /> : <IconMoon size={19} />}
    </button>
  );
}

export function NavBar() {
  const { t } = useI18n();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useOutside(moreRef, more, () => setMore(false));
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) {
    setPrevPath(path);
    setMenu(false);
    setMore(false);
  }
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const link = (href: string, key: MessageKey, cls = "") => (
    <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={cx("rounded-xl px-3 py-2 text-sm font-medium transition-colors", active(href) ? "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300" : "text-slate-700 hover:bg-amber-50 dark:text-slate-300 dark:hover:bg-slate-800", cls)}>
      {t(key)}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-amber-200/60 bg-[#fffdf3]/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" data-testid="brand">
          <Logo />
          <span className="min-w-0 leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Power<span className="text-emerald-600 dark:text-emerald-400">Wise</span>
            </span>
            <span className="block max-w-[11rem] truncate text-[11px] text-slate-500 sm:max-w-none dark:text-slate-400" data-testid="tagline">
              {t("brand.tagline")}
            </span>
          </span>
        </Link>
        <nav className="ms-4 hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.filter((n) => n.primary).map((n) => link(n.href, n.key))}
          <div className="relative" ref={moreRef}>
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} data-testid="more-button" className={cx("flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-amber-50 dark:text-slate-300 dark:hover:bg-slate-800", NAV.some((n) => !n.primary && active(n.href)) && "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300")}>
              {t("nav.more")} <IconChevron size={14} />
            </button>
            {more && (
              <div className="animate-pop-in absolute start-0 z-50 mt-2 flex w-56 flex-col gap-0.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900" data-testid="more-menu">
                {NAV.filter((n) => !n.primary).map((n) => link(n.href, n.key, "block"))}
              </div>
            )}
          </div>
        </nav>
        <div className="ms-auto flex items-center gap-0.5">
          <LanguageSwitcher />
          <ThemeToggle />
          <button type="button" className="rounded-xl p-2 text-slate-700 hover:bg-amber-100/70 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={t("nav.menu")} data-testid="menu-button">
            {menu ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </div>
      {menu && (
        <nav className="border-t border-amber-200/60 bg-[#fffdf3] px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950" data-testid="mobile-menu" aria-label="Main">
          <div className="grid grid-cols-2 gap-1">
            {link("/", "nav.home")}
            {NAV.map((n) => link(n.href, n.key))}
          </div>
        </nav>
      )}
    </header>
  );
}
