"use client";

import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Memory, HealthEntity } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SymptomPoint {
  date: string; // short date label for the X axis
  confidence: number; // 0-100
  iso: string; // full ISO for sorting
}

interface SymptomTrend {
  name: string;
  points: SymptomPoint[];
  first: number;
  last: number;
  delta: number; // last - first (positive = worsening)
  trend: "worsening" | "improving" | "stable";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const TREND_THRESHOLD = 0.05; // 5 pp change needed to call it a trend

function classifyTrend(first: number, last: number): SymptomTrend["trend"] {
  const delta = last - first;
  if (delta > TREND_THRESHOLD) return "worsening";
  if (delta < -TREND_THRESHOLD) return "improving";
  return "stable";
}

// ── Derive symptom trends from memories ───────────────────────────────────────

function buildTrends(memories: Memory[]): SymptomTrend[] {
  // Accumulate confidence observations per symptom name (normalized lowercase).
  const map = new Map<string, { name: string; points: SymptomPoint[] }>();

  const sorted = [...memories].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const memory of sorted) {
    const symptoms = (memory.entities ?? []).filter(
      (e: HealthEntity) => e.type === "symptom"
    );
    for (const sym of symptoms) {
      const key = sym.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { name: sym.name, points: [] });
      }
      map.get(key)!.points.push({
        date: shortDate(memory.created_at),
        confidence: Math.round(sym.confidence * 100),
        iso: memory.created_at,
      });
    }
  }

  // Build trend objects — only include symptoms seen in ≥1 memory.
  const trends: SymptomTrend[] = [];
  for (const { name, points } of map.values()) {
    if (points.length === 0) continue;
    const first = points[0].confidence / 100;
    const last = points[points.length - 1].confidence / 100;
    const delta = last - first;
    trends.push({
      name,
      points,
      first,
      last,
      delta,
      trend: classifyTrend(first, last),
    });
  }

  // Sort: worsening first, then improving, then stable; secondary by |delta| desc.
  const order: Record<SymptomTrend["trend"], number> = {
    worsening: 0,
    improving: 1,
    stable: 2,
  };
  trends.sort((a, b) => {
    if (order[a.trend] !== order[b.trend]) return order[a.trend] - order[b.trend];
    return Math.abs(b.delta) - Math.abs(a.delta);
  });

  return trends;
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: SymptomTrend["trend"] }) {
  if (trend === "worsening") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <TrendingUp className="h-3 w-3" />
        Worsening
      </span>
    );
  }
  if (trend === "improving") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <TrendingDown className="h-3 w-3" />
        Improving
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />
      Stable
    </span>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({
  points,
  trend,
}: {
  points: SymptomPoint[];
  trend: SymptomTrend["trend"];
}) {
  const color =
    trend === "worsening"
      ? "#dc2626"
      : trend === "improving"
      ? "#10b981"
      : "#8a9a87";

  // Single-point — draw a flat line so the chart renders.
  const data =
    points.length === 1
      ? [points[0], { ...points[0], date: "" }]
      : points;

  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <XAxis dataKey="date" hide />
        <Tooltip
          formatter={(v) => [`${v}%`, "Confidence"]}
          contentStyle={{ fontSize: 11, padding: "4px 8px" }}
          itemStyle={{ color }}
        />
        <Line
          type="monotone"
          dataKey="confidence"
          stroke={color}
          strokeWidth={2}
          dot={points.length <= 5}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface SymptomTrendsProps {
  memories: Memory[];
}

export function SymptomTrends({ memories }: SymptomTrendsProps) {
  const trends = buildTrends(memories);

  if (trends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No symptoms tracked yet. Once you memorize documents containing
        symptoms, their confidence trends will appear here.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trends.map((sym) => (
        <div
          key={sym.name}
          className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-charcoal text-sm leading-snug">
              {sym.name}
            </p>
            <TrendBadge trend={sym.trend} />
          </div>

          {/* Confidence range */}
          <p className="text-xs text-muted-foreground">
            {sym.points.length === 1 ? (
              <>Confidence: {Math.round(sym.first * 100)}%</>
            ) : (
              <>
                {Math.round(sym.first * 100)}% &rarr;{" "}
                {Math.round(sym.last * 100)}%
                {" "}
                <span
                  className={
                    sym.delta > 0
                      ? "text-red-600"
                      : sym.delta < 0
                      ? "text-emerald-600"
                      : "text-muted-foreground"
                  }
                >
                  ({sym.delta > 0 ? "+" : ""}
                  {Math.round(sym.delta * 100)}pp)
                </span>
              </>
            )}
            {" · "}
            {sym.points.length} observation{sym.points.length !== 1 ? "s" : ""}
          </p>

          {/* Sparkline */}
          <Sparkline points={sym.points} trend={sym.trend} />

          {/* Date range */}
          {sym.points.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {sym.points[0].date} &ndash; {sym.points[sym.points.length - 1].date}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
