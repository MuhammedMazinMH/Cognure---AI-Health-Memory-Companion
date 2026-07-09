// A visual knowledge graph of the user's health — the native counterpart of
// the web app's src/components/memory-graph.tsx (React Flow). Preserves the
// same behaviour with native technologies:
//
//   React Flow canvas   -> react-native-svg + gesture-handler (pan/pinch/tap)
//   radial layout        -> identical (center "You" node, entities on a circle)
//   node styling         -> same TYPE_COLORS, shadow nodes, warning rings
//   search + type filter -> same logic, native TextInput + chips
//   pagination           -> same NODES_PER_PAGE / "Load More"
//   dialogs              -> native Modals with the same content
//
// Sample entities appear when the user has no data yet — same as web.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AlertTriangle, X } from "lucide-react-native";
import { fetchInteractions } from "../lib/api";
import { colors, fonts, radius } from "../lib/theme";
import type { HealthEntity, HealthEntityType, MedInteraction } from "../lib/types";

// Brand-aligned color for each entity type — identical to web TYPE_COLORS.
const TYPE_COLORS: Record<HealthEntityType, string> = {
  medication: "#5b8def", // blue
  symptom: "#e07a5f", // red / coral
  diagnosis: "#9b6dc9", // purple
  procedure: "#4caf7d", // green
  provider: "#e8983b", // orange
};

const LAVENDER = "#b8a9c9";

// How many nodes to show at once for performance — same as web.
const NODES_PER_PAGE = 30;

// Sample data so the graph looks alive before the user adds anything real —
// identical to the web component's SAMPLE_ENTITIES.
const SAMPLE_ENTITIES: HealthEntity[] = [
  { name: "Metformin", type: "medication", confidence: 0.95 },
  { name: "Lisinopril", type: "medication", confidence: 0.9 },
  { name: "Type 2 Diabetes", type: "diagnosis", confidence: 0.92 },
  { name: "Hypertension", type: "diagnosis", confidence: 0.88 },
  { name: "Fatigue", type: "symptom", confidence: 0.7 },
  { name: "Blurred vision", type: "symptom", confidence: 0.35 },
  { name: "Blood test", type: "procedure", confidence: 0.8 },
  { name: "Dr. Patel", type: "provider", confidence: 0.97 },
];

// ── Layout constants (world coordinates, origin = canvas center) ────────────

const RING_RADIUS = 140; // same tight radius as web
const NODE_W = 110;
const NODE_H = 36;
const CENTER_R = 40;

interface GraphNode {
  entity: HealthEntity;
  x: number;
  y: number;
  isShadow: boolean;
  hasWarning: boolean;
}

interface MemoryGraphProps {
  entities?: HealthEntity[];
}

export function MemoryGraph({ entities }: MemoryGraphProps) {
  // ── State (mirrors the web component 1:1) ─────────────────────────────────
  const [selectedEntity, setSelectedEntity] = useState<HealthEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<HealthEntityType | "all">("all");
  const [displayCount, setDisplayCount] = useState(NODES_PER_PAGE);
  const [interactions, setInteractions] = useState<MedInteraction[]>([]);
  const [selectedInteraction, setSelectedInteraction] =
    useState<MedInteraction | null>(null);

  // Canvas size + view transform (pan/zoom)
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 0.9 });
  // Gesture-start snapshots
  const [gestureStart, setGestureStart] = useState({ tx: 0, ty: 0, scale: 0.9 });

  // Fetch interactions on mount — non-fatal, same as web.
  useEffect(() => {
    let cancelled = false;
    fetchInteractions()
      .then((list) => {
        if (!cancelled) setInteractions(list);
      })
      .catch(() => {
        // Non-fatal: graph still works without interaction data.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Get all entities (real or sample), sorted by confidence — same as web.
  const allEntities = useMemo(() => {
    const data = entities && entities.length > 0 ? entities : SAMPLE_ENTITIES;
    return [...data].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }, [entities]);

  // Filter by category and search — same logic as web.
  const filteredEntities = useMemo(() => {
    let result = allEntities;
    if (activeFilter !== "all") {
      result = result.filter((e) => e.type === activeFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(query));
    }
    return result;
  }, [allEntities, activeFilter, searchQuery]);

  const visibleEntities = useMemo(
    () => filteredEntities.slice(0, displayCount),
    [filteredEntities, displayCount]
  );

  const handleFilterChange = useCallback((filter: HealthEntityType | "all") => {
    setActiveFilter(filter);
    setDisplayCount(NODES_PER_PAGE);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setDisplayCount(NODES_PER_PAGE);
  }, []);

  // Medications with at least one known interaction — same as web.
  const warningMedNames = useMemo(() => {
    const names = new Set<string>();
    for (const interaction of interactions) {
      for (const med of interaction.medications) {
        names.add(med.toLowerCase());
      }
    }
    return names;
  }, [interactions]);

  // Worst interaction for a given medication — same as web.
  const interactionByMed = useCallback(
    (name: string): MedInteraction | null => {
      const lower = name.toLowerCase();
      const severityOrder: Record<string, number> = {
        severe: 3,
        moderate: 2,
        mild: 1,
      };
      let worst: MedInteraction | null = null;
      for (const i of interactions) {
        if (i.medications.some((m) => m.toLowerCase() === lower)) {
          if (
            !worst ||
            (severityOrder[i.severity] ?? 0) > (severityOrder[worst.severity] ?? 0)
          ) {
            worst = i;
          }
        }
      }
      return worst;
    },
    [interactions]
  );

  // Radial layout — identical math to the web component.
  const graphNodes = useMemo<GraphNode[]>(() => {
    return visibleEntities.map((entity, index) => {
      const angle = (index / Math.max(visibleEntities.length, 1)) * 2 * Math.PI;
      return {
        entity,
        x: Math.cos(angle) * RING_RADIUS,
        y: Math.sin(angle) * RING_RADIUS,
        isShadow: entity.type === "symptom" && entity.confidence < 0.5,
        hasWarning:
          entity.type === "medication" &&
          warningMedNames.has(entity.name.toLowerCase()),
      };
    });
  }, [visibleEntities, warningMedNames]);

  // ── Node tap → dialog (warning dialog takes priority, same as web) ────────
  const handleNodePress = useCallback(
    (node: GraphNode) => {
      if (node.hasWarning) {
        const interaction = interactionByMed(node.entity.name);
        if (interaction) {
          setSelectedInteraction(interaction);
          return;
        }
      }
      setSelectedEntity(node.entity);
    },
    [interactionByMed]
  );

  // ── Gestures: pan + pinch + tap-to-select ──────────────────────────────────
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => setGestureStart(transform))
    .onUpdate((e) => {
      setTransform({
        tx: gestureStart.tx + e.translationX,
        ty: gestureStart.ty + e.translationY,
        scale: gestureStart.scale,
      });
    });

  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => setGestureStart(transform))
    .onUpdate((e) => {
      // Same zoom bounds as web (minZoom 0.2, maxZoom 1.5).
      const next = Math.min(1.5, Math.max(0.2, gestureStart.scale * e.scale));
      setTransform((prev) => ({ ...prev, scale: next }));
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      // Convert screen tap → world coordinates, then hit-test nodes.
      const { width, height } = canvas;
      if (!width || !height) return;
      const worldX = (e.x - width / 2 - transform.tx) / transform.scale;
      const worldY = (e.y - height / 2 - transform.ty) / transform.scale;

      // Entity nodes (topmost first = last drawn).
      for (let i = graphNodes.length - 1; i >= 0; i--) {
        const node = graphNodes[i];
        if (
          worldX >= node.x - NODE_W / 2 &&
          worldX <= node.x + NODE_W / 2 &&
          worldY >= node.y - NODE_H / 2 &&
          worldY <= node.y + NODE_H / 2
        ) {
          handleNodePress(node);
          return;
        }
      }
    });

  const composedGesture = Gesture.Race(
    tapGesture,
    Gesture.Simultaneous(panGesture, pinchGesture)
  );

  // Category filter chips — same labels/order as web.
  const categories: { label: string; value: HealthEntityType | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Medications", value: "medication" },
    { label: "Symptoms", value: "symptom" },
    { label: "Diagnoses", value: "diagnosis" },
    { label: "Procedures", value: "procedure" },
    { label: "Providers", value: "provider" },
  ];

  const hasMore = filteredEntities.length > displayCount;

  return (
    <View style={styles.container}>
      {/* Filter bar — search, chips, count (same as web) */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.search}
          placeholder="Search entities..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categories.map((cat) => {
            const active = activeFilter === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleFilterChange(cat.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.countText}>
          {`Showing ${visibleEntities.length} of ${filteredEntities.length} entities`}
          {entities && entities.length > 0
            ? ` (total: ${allEntities.length})`
            : ""}
        </Text>
      </View>

      {/* Graph canvas — pan / pinch / tap */}
      <GestureDetector gesture={composedGesture}>
        <View
          style={styles.canvas}
          onLayout={(e) => setCanvas(e.nativeEvent.layout)}
        >
          {canvas.width > 0 && (
            <Svg width={canvas.width} height={canvas.height}>
              <G
                transform={`translate(${canvas.width / 2 + transform.tx}, ${
                  canvas.height / 2 + transform.ty
                }) scale(${transform.scale})`}
              >
                {/* Edges — animated solid for normal, dashed lavender for shadow */}
                {graphNodes.map((node, i) => (
                  <Line
                    key={`edge-${i}`}
                    x1={0}
                    y1={0}
                    x2={node.x}
                    y2={node.y}
                    stroke={node.isShadow ? LAVENDER : "#c4bca8"}
                    strokeWidth={node.isShadow ? 1 : 1.5}
                    strokeDasharray={node.isShadow ? "4 4" : undefined}
                  />
                ))}

                {/* Entity nodes */}
                {graphNodes.map((node, i) => {
                  const baseColor = TYPE_COLORS[node.entity.type];
                  const fill = node.isShadow ? "#ffffff" : baseColor;
                  const label = node.hasWarning
                    ? `⚠ ${node.entity.name}`
                    : node.entity.name;
                  const display =
                    label.length > 16 ? `${label.slice(0, 15)}…` : label;
                  return (
                    <G key={`node-${i}`} opacity={node.isShadow ? 0.85 : 1}>
                      {node.hasWarning && (
                        <Rect
                          x={node.x - NODE_W / 2 - 3}
                          y={node.y - NODE_H / 2 - 3}
                          width={NODE_W + 6}
                          height={NODE_H + 6}
                          rx={10}
                          fill="rgba(220, 38, 38, 0.2)"
                        />
                      )}
                      <Rect
                        x={node.x - NODE_W / 2}
                        y={node.y - NODE_H / 2}
                        width={NODE_W}
                        height={NODE_H}
                        rx={8}
                        fill={fill}
                        stroke={
                          node.hasWarning
                            ? "#dc2626"
                            : node.isShadow
                              ? LAVENDER
                              : "transparent"
                        }
                        strokeWidth={node.hasWarning ? 2.5 : 2}
                        strokeDasharray={
                          !node.hasWarning && node.isShadow ? "5 4" : undefined
                        }
                      />
                      <SvgText
                        x={node.x}
                        y={node.y + 3.5}
                        fill={node.isShadow ? "#2c2c2c" : "#ffffff"}
                        fontSize={10}
                        fontWeight="500"
                        textAnchor="middle"
                      >
                        {display}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Central "You" node — drawn last so it sits on top */}
                <Circle cx={0} cy={0} r={CENTER_R} fill={colors.sage} />
                <SvgText
                  x={0}
                  y={5}
                  fill="#ffffff"
                  fontSize={14}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  You
                </SvgText>
              </G>
            </Svg>
          )}

          {/* Load More — same pagination as web */}
          {hasMore && (
            <View style={styles.loadMoreWrap}>
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setDisplayCount((prev) => prev + NODES_PER_PAGE)}
              >
                <Text style={styles.loadMoreText}>
                  {`Load More (${filteredEntities.length - displayCount} remaining)`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Medication Interaction Warning dialog — same content as web */}
      <Modal
        visible={selectedInteraction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedInteraction(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedInteraction(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.warningTitleRow}>
                <AlertTriangle size={20} color="#dc2626" />
                <Text style={styles.warningTitle}>
                  Medication Interaction Warning
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedInteraction(null)}
                accessibilityLabel="Close"
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {selectedInteraction && (
              <View style={styles.modalBody}>
                <View style={styles.badgeRow}>
                  {selectedInteraction.medications.map((med) => (
                    <View
                      key={med}
                      style={[
                        styles.badge,
                        { backgroundColor: TYPE_COLORS.medication },
                      ]}
                    >
                      <Text style={styles.badgeText}>{med}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.warningBox}>
                  <Text style={styles.warningSeverity}>
                    {`Severity: ${selectedInteraction.severity}`}
                  </Text>
                  <Text style={styles.warningDescription}>
                    {selectedInteraction.description}
                  </Text>
                </View>
                <Text style={styles.disclaimer}>
                  This information is for reference only. Always consult your
                  healthcare provider before making any medication changes.
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Entity Details dialog — same content as web */}
      <Modal
        visible={selectedEntity !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntity(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedEntity(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.entityTitle}>{selectedEntity?.name}</Text>
              <TouchableOpacity
                onPress={() => setSelectedEntity(null)}
                accessibilityLabel="Close"
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {selectedEntity && (
              <View style={styles.modalBody}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: TYPE_COLORS[selectedEntity.type] },
                    ]}
                  >
                    <Text style={styles.badgeText}>{selectedEntity.type}</Text>
                  </View>
                </View>

                <View style={styles.confidenceBlock}>
                  <View style={styles.confidenceRow}>
                    <Text style={styles.confidenceLabel}>Confidence</Text>
                    <Text style={styles.confidenceValue}>
                      {`${Math.round(selectedEntity.confidence * 100)}%`}
                    </Text>
                  </View>
                  <View style={styles.confidenceTrack}>
                    <View
                      style={[
                        styles.confidenceFill,
                        {
                          width: `${selectedEntity.confidence * 100}%`,
                          backgroundColor: TYPE_COLORS[selectedEntity.type],
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.sourceBox}>
                  <Text style={styles.sourceText}>
                    <Text style={styles.sourceLabel}>Source:</Text> Document
                    analysis
                  </Text>
                  <Text style={styles.sourceText}>
                    <Text style={styles.sourceLabel}>Extracted:</Text>{" "}
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  filterBar: {
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    height: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  chips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.charcoal,
  },
  chipTextActive: {
    color: "#ffffff",
  },
  countText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.mutedForeground,
  },
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  loadMoreWrap: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadMore: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.charcoal,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loadMoreText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.charcoal,
  },
  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 44, 42, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  warningTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 17,
    color: "#dc2626",
  },
  entityTitle: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.charcoal,
  },
  modalBody: {
    gap: 14,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: "#ffffff",
  },
  warningBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fecaca", // red-200
    backgroundColor: "#fef2f2", // red-50
    padding: 12,
    gap: 4,
  },
  warningSeverity: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#dc2626",
  },
  warningDescription: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.charcoal,
  },
  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  confidenceBlock: {
    gap: 8,
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confidenceLabel: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.mutedForeground,
  },
  confidenceValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.charcoal,
  },
  confidenceTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e5e5",
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 4,
  },
  sourceBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    padding: 14,
    gap: 6,
  },
  sourceText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  sourceLabel: {
    fontFamily: fonts.bodySemi,
  },
});
