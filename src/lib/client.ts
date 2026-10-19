"use client";
// Browser-side API helpers + hooks. Results are cached by request body so
// moving between pages doesn't refetch, and every hook depends only on a
// string key (stable deps -> no render loops). In-flight requests are
// aborted when inputs change, and every request has a timeout.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "./store";
import type { Analysis, Household, PredictResult } from "./types";
import type { SolarResult } from "./solar";

const TIMEOUT_MS = 12000;
const cache = new Map<string, unknown>();

async function post<T>(url: string, body: string, signal?: AbortSignal): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const onAbort = () => ctl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

interface Result<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

/** POST `body` to `url`, cached by body. `debounce` delays the request (sliders). */
export function usePost<T>(url: string, body: string | null, debounce = 0): Result<T> {
  const key = body === null ? null : `${url}|${body}`;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: boolean }>({ key: null, data: null, error: false });
  const [nonce, setNonce] = useState(0);
  const last = useRef<T | null>(null);

  useEffect(() => {
    if (key === null || body === null) return;
    if (cache.has(key)) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      post<T>(url, body, ctl.signal)
        .then((d) => {
          cache.set(key, d);
          if (cache.size > 80) cache.delete(cache.keys().next().value as string);
          setState({ key, data: d, error: false });
        })
        .catch(() => {
          if (!ctl.signal.aborted) setState({ key, data: null, error: true });
        });
    }, debounce);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [key, url, body, debounce, nonce]);

  const cached = key !== null && cache.has(key) ? (cache.get(key) as T) : null;
  const data = cached ?? (state.key === key ? state.data : null);
  if (data) last.current = data;
  const error = !data && state.key === key && state.error;
  return {
    // Keep showing the previous result while a slider update is in flight.
    data: data ?? (debounce ? last.current : null),
    loading: key !== null && !data && !error,
    error,
    retry: () => {
      setState({ key: null, data: null, error: false });
      setNonce((n) => n + 1);
    },
  };
}

export function payload(s: AppState, extra: Record<string, unknown> = {}, household?: Household) {
  return JSON.stringify({ household: household ?? s.household, bills: s.bills, tariff: s.tariff, ...extra });
}

export function useAnalysis(s: AppState | null) {
  const body = useMemo(() => (s?.household ? payload(s) : null), [s]);
  return usePost<Analysis>("/api/analyze", body);
}

export function usePredict(s: AppState | null, household: Household | null, factor: number) {
  const body = useMemo(() => (s && household ? JSON.stringify({ household, tariff: s.tariff, factor }) : null), [s, household, factor]);
  return usePost<PredictResult>("/api/predict", body, 120);
}

export function useSolar(s: AppState | null, kw: number | null) {
  const body = useMemo(() => (s?.household ? payload(s, kw === null ? {} : { kw }) : null), [s, kw]);
  return usePost<SolarResult & { suggested: number }>("/api/solar", body, kw === null ? 0 : 150);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export async function downloadFrom(url: string, body: string, name: string) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    save(await r.blob(), name);
  } finally {
    clearTimeout(timer);
  }
}

export function saveText(text: string, name: string, type = "text/csv;charset=utf-8") {
  save(new Blob([text], { type }), name);
}
