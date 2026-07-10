// Health Timeline — native port of the web health-timeline.tsx.
// Same behaviour: memories grouped by month (newest first), collapsible
// month headers with counts, colored rail dots by primary entity type,
// entity chips on cards, and a full detail modal with entities grouped
// by type, confidence bars, and the type legend.

import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Pill,
  Scissors,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react-native";
import { colors, fonts, radius } from "../lib/theme";
import type { HealthEntity, HealthEntityType, Memory } from "../lib/types";

// ── Brand-aligned colors (match memory-graph, mirrored from web) ─────────────

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

const TYPE_ICONS: Record<
  HealthEntityType,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  medication: Pill,
  symptom: Activity,
  diagnosis: Stethoscope,
  procedure: Scissors,
  provider: UserRound,
};

// ── Helpers (mirrored from web) ──────────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────────────

interface HealthTimelineProps {
  memories: Memory[];
}

export function HealthTimeline({ memories }: HealthTimelineProps) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  // Group memories by month-year (same logic as web).
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
      <View style={styles.emptyWrap}>
        <Clock size={40} color={colors.mutedForeground} opacity={0.4} />
        <Text style={styles.emptyText}>
          No health events yet. Upload a document and memorize it to build
          your timeline.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ gap: 32 }}>
        {groups.map(({ key, items }) => {
          const collapsed = collapsedGroups.has(key);
          return (
            <View key={key}>
              {/* Month/Year header */}
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleGroup(key)}
                style={styles.groupHeader}
              >
                <Text style={styles.groupTitle}>{formatMonthYear(key)}</Text>
                {collapsed ? (
                  <ChevronDown size={16} color={colors.mutedForeground} />
                ) : (
                  <ChevronUp size={16} color={colors.mutedForeground} />
                )}
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{items.length}</Text>
                </View>
              </Pressable>

              {!collapsed && (
                <View style={styles.rail}>
                  {items.map((memory) => {
                    const pType = primaryType(memory.entities);
                    const dotColor = pType ? TYPE_COLORS[pType] : colors.sage;
                    const Icon = pType ? TYPE_ICONS[pType] : Clock;

                    return (
                      <View key={memory.id} style={styles.railItem}>
                        {/* Rail dot */}
                        <View
                          style={[styles.dot, { backgroundColor: dotColor }]}
                        >
                          <Icon size={14} color="#ffffff" />
                        </View>

                        <View style={styles.itemBody}>
                          <Text style={styles.itemDate}>
                            {formatDate(memory.created_at)}
                          </Text>

                          {/* Card — tap for details */}
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setSelectedMemory(memory)}
                            style={({ pressed }) => [
                              styles.card,
                              pressed && { borderColor: "rgba(138,154,135,0.4)" },
                            ]}
                          >
                            <Text style={styles.cardText} numberOfLines={3}>
                              {memory.text.length > 220
                                ? `${memory.text.slice(0, 220)}…`
                                : memory.text}
                            </Text>

                            {memory.entities && memory.entities.length > 0 && (
                              <View style={styles.chipRow}>
                                {memory.entities.slice(0, 6).map((entity, i) => (
                                  <View
                                    key={`${memory.id}-${i}`}
                                    style={[
                                      styles.chip,
                                      {
                                        backgroundColor:
                                          TYPE_COLORS[entity.type],
                                      },
                                    ]}
                                  >
                                    <Text style={styles.chipText}>
                                      {entity.name}
                                    </Text>
                                  </View>
                                ))}
                                {memory.entities.length > 6 && (
                                  <View style={styles.moreChip}>
                                    <Text style={styles.moreChipText}>
                                      +{memory.entities.length - 6} more
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Detail Modal (parity with web Dialog) */}
      <Modal
        visible={selectedMemory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Health Event</Text>
                {selectedMemory && (
                  <Text style={styles.modalDate}>
                    {formatDate(selectedMemory.created_at)}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setSelectedMemory(null)}
                hitSlop={8}
              >
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {selectedMemory && (
              <ScrollView
                style={{ maxHeight: 480 }}
                contentContainerStyle={{ gap: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Full text */}
                <View style={styles.fullTextBox}>
                  <Text style={styles.fullText}>{selectedMemory.text}</Text>
                </View>

                {/* Entities grouped by type */}
                {selectedMemory.entities &&
                  selectedMemory.entities.length > 0 && (
                    <View style={{ gap: 12 }}>
                      <Text style={styles.sectionLabel}>
                        Extracted Entities
                      </Text>
                      {(Object.keys(TYPE_LABELS) as HealthEntityType[])
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
                            <View key={type} style={{ gap: 6 }}>
                              <View style={styles.typeHeader}>
                                <Icon size={14} color={TYPE_COLORS[type]} />
                                <Text style={styles.typeHeaderText}>
                                  {TYPE_LABELS[type]}s
                                </Text>
                              </View>
                              <View style={styles.entityList}>
                                {entities.map((entity, i) => (
                                  <View key={i} style={styles.entityRow}>
                                    <View
                                      style={[
                                        styles.entityDot,
                                        {
                                          backgroundColor:
                                            TYPE_COLORS[entity.type],
                                        },
                                      ]}
                                    />
                                    <Text style={styles.entityName}>
                                      {entity.name}
                                    </Text>
                                    <Text style={styles.entityPct}>
                                      {Math.round(entity.confidence * 100)}%
                                    </Text>
                                    {/* Confidence bar */}
                                    <View style={styles.confTrack}>
                                      <View
                                        style={[
                                          styles.confFill,
                                          {
                                            width: `${entity.confidence * 100}%`,
                                            backgroundColor:
                                              TYPE_COLORS[entity.type],
                                          },
                                        ]}
                                      />
                                    </View>
                                  </View>
                                ))}
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}

                {/* Entity type legend */}
                <View style={styles.legend}>
                  {(Object.keys(TYPE_LABELS) as HealthEntityType[]).map(
                    (type) => (
                      <View key={type} style={styles.legendBadge}>
                        <View
                          style={[
                            styles.entityDot,
                            { backgroundColor: TYPE_COLORS[type] },
                          ]}
                        />
                        <Text style={styles.legendText}>
                          {TYPE_LABELS[type]}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 80,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.mutedForeground,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  groupTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(46,46,46,0.6)",
  },
  countPill: {
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.charcoal,
  },
  rail: {
    marginLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    gap: 28,
    paddingBottom: 4,
  },
  railItem: {
    flexDirection: "row",
  },
  dot: {
    position: "absolute",
    left: -15,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 1,
  },
  itemBody: {
    flex: 1,
    marginLeft: 24,
    gap: 8,
  },
  itemDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.charcoal,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: "#ffffff",
  },
  moreChip: {
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  moreChipText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,46,46,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.charcoal,
  },
  modalDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  fullTextBox: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(237,230,216,0.5)", // muted/50
    padding: 16,
  },
  fullText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.charcoal,
    lineHeight: 21,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  typeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeHeaderText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "rgba(46,46,46,0.7)",
  },
  entityList: {
    gap: 6,
    paddingLeft: 20,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  entityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entityName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.charcoal,
  },
  entityPct: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  confTrack: {
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  confFill: {
    height: "100%",
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  legendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  legendText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.charcoal,
  },
});
