"use client";
// i18n runtime: provider, t() with {placeholder} interpolation, English
// fallback, saved language (localStorage), <html lang/dir>, and locale-aware
// Rs / number / month formatting. English is bundled; others load on demand.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en, { type MessageKey, type Messages } from "./messages/en";
import { DEFAULT_LOCALE, LANG_KEY, LOCALE_CODES, localeInfo, type LocaleInfo } from "./config";
import { MESSAGE_LOADERS } from "./loaders";
import type { UsageId } from "@/lib/types";

export type Vars = Record<string, string | number>;

export function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

interface I18nValue {
  lang: string;
  info: LocaleInfo;
  ready: boolean;
  setLang: (code: string) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  /** Translate a dynamic key (falls back to English, then the key). */
  tk: (key: string, vars?: Vars) => string;
  appName: (id: UsageId | "solar") => string;
  money: (rs: number) => string;
  /** Rs with up to 2 decimals (tariff rates). */
  rate: (rs: number) => string;
  num: (n: number, digits?: number) => string;
  /** "Nov 2026" style label for a YYYY-MM month. */
  month: (ym: string, style?: "short" | "long") => string;
  /** Short month name only ("Nov"). */
  monthShort: (ym: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function storedLang(): string {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v && LOCALE_CODES.includes(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_LOCALE;
}

const cache = new Map<string, Messages>([["en", en]]);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Messages>(en);
  const [ready, setReady] = useState(false);

  // Restore the saved language after hydration (server always renders English).
  useEffect(() => {
    const s = storedLang();
    if (s !== DEFAULT_LOCALE) setLangState(s);
    else setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const info = localeInfo(lang);
    document.documentElement.lang = info.code;
    document.documentElement.dir = info.dir;
    const hit = cache.get(lang);
    if (hit) {
      setMessages(hit);
      setReady(true);
      return;
    }
    (MESSAGE_LOADERS[lang]?.() ?? Promise.resolve({ default: en }))
      .then((m) => {
        cache.set(lang, m.default);
        if (!cancelled) {
          setMessages(m.default);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages(en);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Lets CSS/tests know when the chosen language's messages are on screen.
  useEffect(() => {
    document.documentElement.dataset.i18n = ready ? lang : "";
  }, [ready, lang]);

  const setLang = useCallback((code: string) => {
    if (!LOCALE_CODES.includes(code)) return;
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
    setLangState(code);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const info = localeInfo(lang);
    const t = (key: MessageKey, vars?: Vars) => interpolate(messages[key] ?? en[key] ?? key, vars);
    const tk = (key: string, vars?: Vars) => t(key as MessageKey, vars);
    const cur = new Intl.NumberFormat(info.num, { style: "currency", currency: "INR", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 });
    const cur2 = new Intl.NumberFormat(info.num, { style: "currency", currency: "INR", currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const nf = [0, 1, 2].map((d) => new Intl.NumberFormat(info.num, { maximumFractionDigits: d }));
    const mShort = new Intl.DateTimeFormat(info.date, { month: "short", year: "numeric", timeZone: "UTC" });
    const mLong = new Intl.DateTimeFormat(info.date, { month: "long", year: "numeric", timeZone: "UTC" });
    const mOnly = new Intl.DateTimeFormat(info.date, { month: "short", timeZone: "UTC" });
    const toDate = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 15));
    return {
      lang,
      info,
      ready,
      setLang,
      t,
      tk,
      appName: (id) => tk(`app.${id}`),
      money: (rs) => cur.format(Math.round(rs)),
      rate: (rs) => cur2.format(rs),
      num: (n, d = 0) => nf[Math.min(2, Math.max(0, d))].format(n),
      month: (ym, style = "short") => (style === "long" ? mLong : mShort).format(toDate(ym)),
      monthShort: (ym) => mOnly.format(toDate(ym)),
    };
  }, [lang, messages, ready, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
