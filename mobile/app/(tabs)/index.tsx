// Memory Graph tab — the native counterpart of the web dashboard
// (src/app/dashboard/page.tsx): greeting header, quick-stat pills, loading /
// empty states, and the interactive memory graph.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Network, Plus } from "lucide-react-native";
import { ScreenHeader } from "../../components/screen-header";
import { MemoryGraph } from "../../components/memory-graph";
import { UploadModal } from "../../components/upload-modal";
import { ErrorState, LoadingState } from "../../components/ui";
import { fetchMemories } from "../../lib/api";
import { useApiData } from "../../lib/use-api-data";
import { useSession } from "../../lib/session";
import { colors, fonts, radius } from "../../lib/theme";
import type { HealthEntity } from "../../lib/types";

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function GraphScreen() {
  const { session } = useSession();
  const { data: memories, loading, error, refetch } = useApiData(fetchMemories);
  const [emptyModalOpen, setEmptyModalOpen] = useState(false);

  const fullName = (session?.user?.user_metadata?.full_name as string) ?? "";
  const firstName = fullName.split(" ")[0] ?? "";

  const allEntities: HealthEntity[] =
    memories?.flatMap((m) => m.entities ?? []) ?? [];
  const hasMemories = (memories?.length ?? 0) > 0;

  // Quick stats — same as web dashboard.
  const stats = {
    memories: memories?.length ?? 0,
    entities: allEntities.length,
    medications: allEntities.filter((e) => e.type === "medication").length,
    diagnoses: allEntities.filter((e) => e.type === "diagnosis").length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title={firstName ? `Good to see you, ${firstName}` : "Memory Graph"}
        subtitle={
          hasMemories
            ? "Your health knowledge graph — tap any node to explore."
            : "Upload a document to start building your graph."
        }
        onMemoryAdded={refetch}
      />

      {/* Quick stats — only show when there's data (same as web) */}
      {hasMemories && !loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsRow}
        >
          <StatPill label="Memories" value={stats.memories} />
          <StatPill label="Entities" value={stats.entities} />
          <StatPill label="Medications" value={stats.medications} />
          <StatPill label="Diagnoses" value={stats.diagnoses} />
        </ScrollView>
      )}

      {loading ? (
        <LoadingState label="Loading your memory graph…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !hasMemories ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Network size={32} color={colors.sage} />
          </View>
          <Text style={styles.emptyTitle}>Your graph is empty</Text>
          <Text style={styles.emptyBody}>
            Upload a medical document — a lab report, prescription, or
            discharge summary — and Cognure will extract your health entities
            automatically.
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => setEmptyModalOpen(true)}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.emptyCtaText}>Upload your first document</Text>
          </TouchableOpacity>
          <UploadModal
            visible={emptyModalOpen}
            onClose={() => setEmptyModalOpen(false)}
            onSuccess={refetch}
          />
        </View>
      ) : (
        <MemoryGraph entities={allEntities} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  statsScroll: {
    flexGrow: 0,
    backgroundColor: colors.card,
  },
  statsRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: colors.charcoal,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius["2xl"],
    backgroundColor: "rgba(138, 154, 135, 0.1)", // sage/10
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 20,
    color: colors.charcoal,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.sage,
  },
  emptyCtaText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: "#ffffff",
  },
});
