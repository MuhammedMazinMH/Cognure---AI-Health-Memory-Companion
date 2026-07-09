// Symptom Trends — native port of the web symptom-trends.tsx.
// The trend derivation logic (buildTrends, classifyTrend) is mirrored 1:1
// from the web component; the recharts sparkline is replaced with a
// react-native-svg Polyline (same colors, same single-point flat-line trick).

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Minus, TrendingDown, TrendingUp } from "lucide-react-native";
import { colors, fonts, radius } from "../lib/theme";
import type { HealthEntity, Memory } from "../lib/types";

// ── Types (mirrored from web) ────────────────────────────────────────────────

interface SymptomPoint {
  date: string; // short date label
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

// ── Helpers (mirrored from web) ──────────────────────────────────────────────

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

function buildTrends(memories: Memory[]): SymptomTrend[] {
  const map = new Map<string, { name: string; points: SymptomPoint[] }>();

  const sorted = [...memories].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  const order: Record<SymptomTrend["trend"], number> = {
    worsening: 0,
    improving: 1,
    stable: 2,
  };
  trends.sort((a, b) => {
    if (order[a.trend] !== order[b.trend])
      return order[a.trend] - order[b.trend];
    return Math.abs(b.delta) - Math.abs(a.delta);
  });

  return trends;
}

// ── Trend badge ──────────────────────────────────────────────────────────────

const TREND_STYLES = {
  worsening: { bg: "#fee2e2", fg: "#b91c1c", label: "Worsening" },
  improving: { bg: "#d1fae5", fg: "#047857", label: "Improving" },
  stable: { bg: colors.muted, fg: colors.mutedForeground, label: "Stable" },
} as const;

function TrendBadge({ trend }: { trend: SymptomTrend["trend"] }) {
  const s = TREND_STYLES[trend];
  const Icon =
    trend === "worsening"
      ? TrendingUp
      : trend === "improving"
        ? TrendingDown
        : Minus;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: s.bg }]}>
      <Icon size={12} color={s.fg} />
      <Text style={[badgeStyles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
  },
});

// ── Sparkline (SVG polyline replaces recharts) ───────────────────────────────

const SPARK_W = 260;
const SPARK_H = 48;
const SPARK_PAD = 6;

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
        : colors.sage;

  // Single-point — draw a flat line so the chart renders (same as web).
  const data = points.length === 1 ? [points[0], { ...points[0] }] : points;

  const min = Math.min(...data.map((p) => p.confidence));
  const max = Math.max(...data.map((p) => p.confidence));
  const range = max - min || 1;

  const coords = data.map((p, i) => {
    const x =
      SPARK_PAD + (i / (data.length - 1)) * (SPARK_W - SPARK_PAD * 2);
    const y =
      SPARK_H -
      SPARK_PAD -
      ((p.confidence - min) / range) * (SPARK_H - SPARK_PAD * 2);
    return { x, y };
  });

  const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const showDots = points.length <= 5;

  return (
    <Svg
      width="100%"
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
    >
      <Polyline
        points={polyPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showDots &&
        coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3} fill={color} />
        ))}
    </Svg>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

interface SymptomTrendsProps {
  memories: Memory[];
}

export function SymptomTrends({ memories }: SymptomTrendsProps) {
  const trends = buildTrends(memories);

  if (trends.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No symptoms tracked yet. Once you memorize documents containing
        symptoms, their confidence trends will appear here.
      </Text>
    );
  }

  return (
    <View style={styles.grid}>
      {trends.map((sym) => (
        <View key={sym.name} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.symName}>{sym.name}</Text>
            <TrendBadge trend={sym.trend} />
          </View>

          {/* Confidence range */}
          <Text style={styles.rangeText}>
            {sym.points.length === 1 ? (
              <>Confidence: {Math.round(sym.first * 100)}%</>
            ) : (
              <>
                {Math.round(sym.first * 100)}% {"→"}{" "}
                {Math.round(sym.last * 100)}%{" "}
                <Text
                  style={{
                    color:
                      sym.delta > 0
                        ? "#dc2626"
                        : sym.delta < 0
                          ? "#059669"
                          : colors.mutedForeground,
                  }}
                >
                  ({sym.delta > 0 ? "+" : ""}
                  {Math.round(sym.delta * 100)}pp)
                </Text>
              </>
            )}
            {" · "}
            {sym.points.length} observation
            {sym.points.length !== 1 ? "s" : ""}
          </Text>

          {/* Sparkline */}
          <Sparkline points={sym.points} trend={sym.trend} />

          {/* Date range */}
          {sym.points.length > 1 && (
            <Text style={styles.dateRange}>
              {sym.points[0].date} – {sym.points[sym.points.length - 1].date}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  symName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.charcoal,
    lineHeight: 18,
  },
  rangeText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  dateRange: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
