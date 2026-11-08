"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/format";

// Chart colours come from the design tokens (globals.css). Text uses text colours, not series colours.
const PRIMARY = "var(--primary)";
const PROGRESS = "var(--progress)";
const GRID = "var(--border)";
const AXIS_TEXT = "var(--muted-foreground)";
const AXIS_TICK = { fill: AXIS_TEXT, fontSize: 12 };

function ChartTooltip({
  active,
  label,
  payload,
  formatLabel,
  formatValue,
}: {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string }[];
  formatLabel: (label: string) => string;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-sm shadow-card">
      <p className="text-muted-foreground">{formatLabel(String(label))}</p>
      <p className="font-semibold text-foreground">{formatValue(Number(payload[0].value))}</p>
    </div>
  );
}

/** Daily completions over time. Single series, so no legend: the card title names it. */
export function CompletionsAreaChart({ data }: { data: { date: string; completions: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="completionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.18} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={6}
            tickFormatter={(value: string) => formatShortDate(`${value}T12:00:00Z`)}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: AXIS_TEXT, strokeDasharray: "3 3" }}
            content={
              <ChartTooltip
                formatLabel={(label) => formatShortDate(`${label}T12:00:00Z`)}
                formatValue={(value) => `${value} completion${value === 1 ? "" : "s"}`}
              />
            }
          />
          <Area
            type="linear" // straight segments: a smoothed curve would invent values between whole days
            dataKey="completions"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#completionsFill)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Completion rate per activity as horizontal bars, labelled directly with the value. */
export function CompletionRateBarChart({
  data,
}: {
  data: { title: string; completionRate: number | null; completed: number; assigned: number }[];
}) {
  const rows = data.map((row) => ({ ...row, rate: row.completionRate ?? 0 }));
  const height = Math.max(120, rows.length * 56);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={16}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} unit="%" />
          <YAxis
            type="category"
            dataKey="title"
            width={150}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <ChartTooltip formatLabel={(label) => label} formatValue={(value) => `${value}% complete`} />
            }
          />
          <Bar dataKey="rate" fill={PROGRESS} radius={[0, 4, 4, 0]} maxBarSize={24}>
            <LabelList
              dataKey="completionRate"
              position="right"
              formatter={(value: unknown) => (typeof value === "number" ? `${value}%` : "—")}
              style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Score per completed attempt over time (0–100). */
export function ScoreLineChart({ data }: { data: { label: string; score: number; date: string }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => formatShortDate(value)}
          />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: AXIS_TEXT, strokeDasharray: "3 3" }}
            content={<ChartTooltip formatLabel={(label) => formatShortDate(label)} formatValue={(value) => `Score ${value}/100`} />}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={PRIMARY}
            strokeWidth={2}
            dot={{ r: 4, fill: PRIMARY, strokeWidth: 2, stroke: "var(--surface)" }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Screen-reader (and keyboard) friendly table alternative for any chart. */
export function ChartDataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: [string, string];
  rows: [string, string][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{headers[0]}</th>
          <th scope="col">{headers[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], index) => (
          <tr key={index}>
            <td>{a}</td>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
