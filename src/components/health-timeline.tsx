"use client";

import { useState } from "react";
import {
  Pill,
  Activity,
  Stethoscope,
  Scissors,
  UserRound,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Memory, HealthEntity, HealthEntityType } from "@/types";

// ── Brand-aligned colors (match memory-graph.tsx) ────────────────────────────
const TYPE_COLORS: Record<HealthEntityType, string> = {
  medication: "#5b8def",
  symptom: "#e07a5f",
  diagnosis: "#9b6dc9",
  procedure: "#4caf7d",
  provider: "#e8983b",
};

const TYPE_LABELS: Record<HealthEntityType, string> = {
  medication: "Medication",
  symptom: "Symptom",
  diagnosis: "Diagnosis",
  procedure: "Procedure",
  provider: "Provider",
};

const TYPE_ICONS: Record<HealthEntityType, React.ElementType> = {
  medication: Pill,
  symptom: Activity,
  diagnosis: Stethoscope,
  procedure: Scissors,
  provider: UserRound,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function monthYearKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return "unknown";
  }
}

function formatMonthYear(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

// Derive the "primary" entity type from a memory (most confident entity).
function primaryType(entities: HealthEntity[]): HealthEntityType | null {
  if (!entities || entities.length === 0) return null;
  return [...entities].sort((a, b) => b.confidence - a.confidence)[0].type;
}

// ── Main component ────────────────────────────────────────────────────────────

interface HealthTimelineProps {
  memories: Memory[];
}

export function HealthTimeline({ memories }: HealthTimelineProps) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group memories by month-year, sorted newest-first within each group.
  const groups: { key: string; items: Memory[] }[] = [];
  const seen = new Map<string, Memory[]>();

  for (const memory of memories) {
    const key = monthYearKey(memory.created_at);
    if (!seen.has(key)) {
      seen.set(key, []);
      groups.push({ key, items: seen.get(key)! });
    }
    seen.get(key)!.push(memory);
  }

  // Sort groups newest-first.
  groups.sort((a, b) => b.key.localeCompare(a.key));

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        <Clock className="h-10 w-10 opacity-40" />
        <p className="text-sm">No health events yet. Upload a document and memorize it to build your timeline.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        {groups.map(({ key, items }) => {
          const collapsed = collapsedGroups.has(key);
          return (
            <div key={key}>
              {/* Month/Year header */}
              <button
                onClick={() => toggleGroup(key)}
                className="mb-4 flex items-center gap-2 text-sm font-semibold text-charcoal/60 uppercase tracking-widest hover:text-charcoal transition-colors"
              >
                {formatMonthYear(key)}
                {collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-charcoal normal-case tracking-normal">
                  {items.length}
                </span>
              </button>

              {!collapsed && (
                <ol className="relative ml-3 border-l-2 border-border">
                  {items.map((memory) => {
                    const pType = primaryType(memory.entities);
                    const dotColor = pType ? TYPE_COLORS[pType] : "#8a9a87";
                    const Icon = pType ? TYPE_ICONS[pType] : Clock;

                    return (
                      <li key={memory.id} className="mb-8 ml-7">
                        {/* Rail dot */}
                        <span
                          className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: dotColor }}
                        >
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </span>

                        <time className="text-xs font-medium text-muted-foreground">
                          {formatDate(memory.created_at)}
                        </time>

                        {/* Card — click for details */}
                        <button
                          onClick={() => setSelectedMemory(memory)}
                          className="mt-2 w-full rounded-xl border bg-card p-4 shadow-sm text-left hover:shadow-md hover:border-sage/40 transition-all"
                        >
                          <p className="text-sm text-charcoal line-clamp-3">
                            {memory.text.length > 220
                              ? `${memory.text.slice(0, 220)}…`
                              : memory.text}
                          </p>

                          {memory.entities && memory.entities.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {memory.entities.slice(0, 6).map((entity, i) => (
                                <span
                                  key={`${memory.id}-${i}`}
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                                  style={{
                                    backgroundColor: TYPE_COLORS[entity.type],
                                  }}
                                >
                                  {entity.name}
                                </span>
                              ))}
                              {memory.entities.length > 6 && (
                                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">
                                  +{memory.entities.length - 6} more
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={selectedMemory !== null}
        onOpenChange={() => setSelectedMemory(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              Health Event
            </DialogTitle>
            {selectedMemory && (
              <p className="text-xs text-muted-foreground">
                {formatDate(selectedMemory.created_at)}
              </p>
            )}
          </DialogHeader>

          {selectedMemory && (
            <div className="space-y-5">
              {/* Full text */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm leading-relaxed text-charcoal whitespace-pre-wrap">
                  {selectedMemory.text}
                </p>
              </div>

              {/* Entities grouped by type */}
              {selectedMemory.entities && selectedMemory.entities.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Extracted Entities
                  </p>
                  {(
                    Object.keys(TYPE_LABELS) as HealthEntityType[]
                  )
                    .map((type) => ({
                      type,
                      entities: selectedMemory.entities.filter(
                        (e) => e.type === type
                      ),
                    }))
                    .filter(({ entities }) => entities.length > 0)
                    .map(({ type, entities }) => {
                      const Icon = TYPE_ICONS[type];
                      return (
                        <div key={type} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Icon
                              className="h-3.5 w-3.5"
                              style={{ color: TYPE_COLORS[type] }}
                            />
                            <span className="text-xs font-medium text-charcoal/70">
                              {TYPE_LABELS[type]}s
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {entities.map((entity, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                              >
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: TYPE_COLORS[entity.type],
                                  }}
                                />
                                <span className="text-xs font-medium text-charcoal">
                                  {entity.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(entity.confidence * 100)}%
                                </span>
                                {/* Confidence bar */}
                                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${entity.confidence * 100}%`,
                                      backgroundColor: TYPE_COLORS[entity.type],
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Entity type legend */}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {(Object.keys(TYPE_LABELS) as HealthEntityType[]).map(
                  (type) => (
                    <Badge
                      key={type}
                      className="gap-1 text-xs border border-border bg-transparent text-charcoal"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[type] }}
                      />
                      {TYPE_LABELS[type]}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
