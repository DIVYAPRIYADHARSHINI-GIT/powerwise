"use client";
// Shared UI primitives: buttons, cards, badges, dialogs, empty states,
// skeletons, stat tiles and a tiny toast system (no external UI deps).
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n";
import { IconAlert, IconCheck, IconInfo, IconX } from "./Icons";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "green";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-sm shadow-amber-500/30 dark:bg-amber-400 dark:hover:bg-amber-300",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700",
  ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  green: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20",
};

export function btn(variant: BtnVariant = "primary", size: "sm" | "md" | "lg" = "md") {
  const s = size === "sm" ? "px-3 py-1.5 text-sm" : size === "lg" ? "px-5 py-3 text-base" : "px-4 py-2 text-sm";
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60",
    s,
    BTN[variant],
  );
}

export function Button({ variant = "primary", size = "md", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  return <button type="button" className={cx(btn(variant, size), className)} {...rest} />;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children, ...rest }: { href: string; variant?: BtnVariant; size?: "sm" | "md" | "lg"; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cx(btn(variant, size), className)} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700/70 dark:bg-slate-900", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, icon }: { children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <h2 className={cx("mb-3 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white", className)}>
      {icon}
      {children}
    </h2>
  );
}

export function PageHeader({ title, subtitle, children, badge }: { title: string; subtitle?: string; children?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white" data-testid="page-title">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-slate-600 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

type Tone = "slate" | "green" | "red" | "amber" | "sky";
export function Chip({ children, tone = "slate", className, ...rest }: { children: React.ReactNode; tone?: Tone; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const tones: Record<Tone, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    sky: "bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...rest}>
      {children}
    </span>
  );
}

/** "Sample data" / "Sample tariff" label. */
export function SampleBadge({ kind = "data" }: { kind?: "data" | "tariff" | "both" }) {
  return (
    <span className="inline-flex flex-wrap gap-1" data-testid="sample-badge">
      {kind !== "tariff" && <Chip tone="amber">{useLabel("data")}</Chip>}
      {kind !== "data" && <Chip tone="sky">{useLabel("tariff")}</Chip>}
    </span>
  );
}
function useLabel(kind: "data" | "tariff") {
  const { t } = useI18n();
  return kind === "data" ? t("common.sampleData") : t("common.sampleTariff");
}

export function Stat({ label, value, sub, tone = "default", testId }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "default" | "green" | "amber" | "red"; testId?: string }) {
  const color = { default: "text-slate-900 dark:text-white", green: "text-emerald-600 dark:text-emerald-400", amber: "text-amber-600 dark:text-amber-400", red: "text-rose-600 dark:text-rose-400" }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-900" data-testid={testId}>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cx("mt-1 text-2xl font-bold tabular-nums", color)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

export function EmptyState({ image, title, text, children }: { image: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center" data-testid="empty-state">
      <Image src={image} alt="" width={280} height={200} className="h-auto w-56 sm:w-64" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {text && <p className="mt-1 max-w-md text-slate-600 dark:text-slate-400">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800", className)} />;
}

export function PageSkeleton() {
  return (
    <div data-testid="loading" className="space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden="true" />;
}

export function Note({ children, tone = "info", className, ...rest }: { children: React.ReactNode; tone?: "info" | "warn"; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
        tone === "warn" ? "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300",
        className,
      )}
      {...rest}
    >
      <span className="mt-0.5 shrink-0">{tone === "warn" ? <IconAlert size={16} /> : <IconInfo size={16} />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Accessible modal dialog (Escape / backdrop closes). */
export function Dialog({ open, onClose, title, children, footer, testId = "dialog" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} data-testid={testId} className="animate-pop-in max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl outline-none sm:max-w-md sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <IconX size={18} />
          </button>
        </div>
        <div className="text-slate-700 dark:text-slate-300">{children}</div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel, cancelLabel, onConfirm, onCancel, danger }: { open: boolean; title: string; text: React.ReactNode; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      testId="confirm-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} data-testid="confirm-yes">
            {confirmLabel}
          </Button>
        </>
      }
    >
      {text}
    </Dialog>
  );
}

/* --------------------------------- toasts -------------------------------- */
interface Toast {
  id: number;
  text: string;
  tone: "success" | "error";
}
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
const emit = () => toastListeners.forEach((l) => l());
let seq = 0;

export function toast(text: string, tone: Toast["tone"] = "success") {
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, text, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    emit();
  }, 3500);
}

const EMPTY: Toast[] = [];
export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {list.map((x) => (
        <div key={x.id} data-testid="toast" className={cx("animate-pop-in pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg", x.tone === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900")}>
          {x.tone === "error" ? <IconAlert size={16} /> : <IconCheck size={16} />}
          {x.text}
        </div>
      ))}
    </div>
  );
}

/** Labeled field wrapper. */
export function Field({ label, htmlFor, children, hint, error }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/50 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
