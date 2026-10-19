"use client";
// Recharts wrappers with theme-aware colours. Fixed-height containers with a
// resize debounce and animations off keep layout stable (no render loops).
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n";
import type { Breakdown, HistoryPoint, MonthForecast } from "@/lib/types";
import { APPLIANCE_COLORS } from "./Icons";
import { useTheme } from "./ThemeProvider";

const SEASON_COLORS = { summer: "#f59e0b", monsoon: "#10b981", postMonsoon: "#14b8a6", winter: "#60a5fa" };

function useColors() {
  const { dark } = useTheme();
  return {
    dark,
    grid: dark ? "#1e293b" : "#e7e5d8",
    axis: dark ? "#94a3b8" : "#64748b",
    tooltip: { background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 12, fontSize: 12, color: dark ? "#e2e8f0" : "#0f172a" },
  };
}

function useRtl() {
  return useI18n().info.dir === "rtl";
}

export function BreakdownPie({ data, metric }: { data: Breakdown; metric: "units" | "cost" }) {
  const c = useColors();
  const { appName, money, num } = useI18n();
  const rows = data.items.filter((i) => i[metric] > 0).map((i) => ({ id: i.id, name: appName(i.id), value: i[metric] }));
  return (
    <div className="h-64" data-testid="breakdown-pie" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="88%" paddingAngle={1.5} stroke={c.dark ? "#0f172a" : "#fff"} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={APPLIANCE_COLORS[r.id]} />
            ))}
          </Pie>
          <Tooltip contentStyle={c.tooltip} formatter={(v) => (metric === "cost" ? money(Number(v)) : `${num(Number(v))} kWh`)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownBars({ data, metric }: { data: Breakdown; metric: "units" | "cost" }) {
  const c = useColors();
  const rtl = useRtl();
  const { appName, money, num } = useI18n();
  const rows = data.items.map((i) => ({ id: i.id, name: appName(i.id), value: i[metric] }));
  return (
    <div style={{ height: Math.max(220, rows.length * 34 + 30) }} data-testid="breakdown-bars" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} reversed={rtl} tickFormatter={(v) => (metric === "cost" ? money(v) : num(v))} />
          <YAxis type="category" dataKey="name" width={118} orientation={rtl ? "right" : "left"} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: c.dark ? "#1e293b" : "#fef9c3" }} contentStyle={c.tooltip} formatter={(v) => [metric === "cost" ? money(Number(v)) : `${num(Number(v))} kWh`, ""]} />
          <Bar dataKey="value" radius={rtl ? [6, 0, 0, 6] : [0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={APPLIANCE_COLORS[r.id]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 12-month forecast bars coloured by season; expensive months in red. */
export function ForecastChart({ data, metric = "cost", height = 288 }: { data: MonthForecast[]; metric?: "cost" | "units"; height?: number }) {
  const c = useColors();
  const rtl = useRtl();
  const { monthShort, money, num, t } = useI18n();
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month), range: [d.low, d.high] }));
  return (
    <div style={{ height }} data-testid="forecast-chart" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" reversed={rtl} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis orientation={rtl ? "right" : "left"} width={metric === "cost" ? 64 : 44} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => (metric === "cost" ? money(v) : num(v))} />
          <Tooltip
            cursor={{ fill: c.dark ? "#1e293b" : "#fef9c3" }}
            contentStyle={c.tooltip}
            formatter={(v, name) => {
              if (name === "range") return [Array.isArray(v) ? `${num(Number(v[0]))} – ${num(Number(v[1]))} kWh` : String(v), t("forecast.range")];
              return [metric === "cost" ? money(Number(v)) : `${num(Number(v))} kWh`, metric === "cost" ? t("common.bill") : t("common.unitsLabel")];
            }}
          />
          {metric === "units" && <Area dataKey="range" stroke="none" fill={c.dark ? "#334155" : "#fde68a"} fillOpacity={0.5} isAnimationActive={false} />}
          <Bar dataKey={metric} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.month} fill={r.expensive ? "#ef4444" : SEASON_COLORS[r.season]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeasonLegend() {
  const { t } = useI18n();
  const items: Array<[string, string]> = [
    [SEASON_COLORS.summer, t("forecast.season.summer")],
    [SEASON_COLORS.monsoon, t("forecast.season.monsoon")],
    [SEASON_COLORS.postMonsoon, t("forecast.season.postMonsoon")],
    [SEASON_COLORS.winter, t("forecast.season.winter")],
    ["#ef4444", t("forecast.expensive")],
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      {items.map(([col, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: col }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** Actual vs predicted units for past bills (+ optional next-month prediction). */
export function HistoryChart({ data, next, height = 288 }: { data: HistoryPoint[]; next?: { month: string; units: number }; height?: number }) {
  const c = useColors();
  const rtl = useRtl();
  const { monthShort, num, t } = useI18n();
  const rows: Array<{ label: string; actual?: number; predicted?: number; next?: number }> = data.map((d) => ({ label: monthShort(d.month), actual: d.actual, predicted: d.predicted }));
  if (next) rows.push({ label: monthShort(next.month), next: next.units, predicted: next.units });
  const avg = data.length ? data.reduce((s, d) => s + d.actual, 0) / data.length : 0;
  return (
    <div style={{ height }} data-testid="history-chart" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" reversed={rtl} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis orientation={rtl ? "right" : "left"} width={44} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => num(v)} />
          <Tooltip cursor={{ fill: c.dark ? "#1e293b" : "#fef9c3" }} contentStyle={c.tooltip} formatter={(v, name) => [`${num(Number(v))} kWh`, name === "actual" ? t("predict.actual") : name === "next" ? t("predict.predicted") : t("predict.predicted")]} />
          <Legend formatter={(v) => (v === "actual" ? t("predict.actual") : v === "next" ? t("home.nextBill", { month: next ? monthShort(next.month) : "" }) : t("predict.predicted"))} wrapperStyle={{ fontSize: 12 }} />
          {avg > 0 && <ReferenceLine y={avg} stroke={c.axis} strokeDasharray="4 4" />}
          <Bar dataKey="actual" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={30} isAnimationActive={false} />
          {next && <Bar dataKey="next" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} isAnimationActive={false} />}
          <Line dataKey="predicted" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Before vs after (what-if / solar) by month. */
export function CompareChart({ rows, aLabel, bLabel, height = 256 }: { rows: Array<{ month: string; a: number; b: number }>; aLabel: string; bLabel: string; height?: number }) {
  const c = useColors();
  const rtl = useRtl();
  const { monthShort, money } = useI18n();
  const data = rows.map((r) => ({ ...r, label: monthShort(r.month) }));
  return (
    <div style={{ height }} data-testid="compare-chart" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" reversed={rtl} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis orientation={rtl ? "right" : "left"} width={64} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => money(v)} />
          <Tooltip cursor={{ fill: c.dark ? "#1e293b" : "#fef9c3" }} contentStyle={c.tooltip} formatter={(v, n) => [money(Number(v)), n === "a" ? aLabel : bLabel]} />
          <Legend formatter={(v) => (v === "a" ? aLabel : bLabel)} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="a" fill={c.dark ? "#64748b" : "#cbd5e1"} radius={[5, 5, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          <Bar dataKey="b" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal importance bars for the About page. */
export function ImportanceChart({ rows }: { rows: Array<{ name: string; value: number }> }) {
  const c = useColors();
  const rtl = useRtl();
  return (
    <div style={{ height: rows.length * 30 + 20 }} data-testid="importance-chart" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
          <XAxis type="number" hide reversed={rtl} />
          <YAxis type="category" dataKey="name" width={150} orientation={rtl ? "right" : "left"} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: c.dark ? "#1e293b" : "#fef9c3" }} contentStyle={c.tooltip} formatter={(v) => [`${v}%`, ""]} />
          <Bar dataKey="value" fill="#f59e0b" radius={rtl ? [5, 0, 0, 5] : [0, 5, 5, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
