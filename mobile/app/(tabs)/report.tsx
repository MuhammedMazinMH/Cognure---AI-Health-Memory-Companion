// Report tab — mirrors web /dashboard/report.
// On-screen preview: summary card with stat pills + entity preview cards.
// "Download PDF" renders the same report layout (sage header band, patient
// summary, entity tables, recent excerpts, footer) as HTML via expo-print,
// then opens the native share sheet via expo-sharing.

import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { AlertCircle, Download, FileText } from "lucide-react-native";
import { ScreenHeader } from "../../components/screen-header";
import { ErrorState, LoadingState } from "../../components/ui";
import { fetchMemories } from "../../lib/api";
import { useApiData } from "../../lib/use-api-data";
import { useSession } from "../../lib/session";
import { colors, fonts, radius } from "../../lib/theme";
import type { HealthEntity } from "../../lib/types";

// ── Types & constants (mirrored from web report page) ───────────────────────

type EntityType =
  | "medication"
  | "diagnosis"
  | "symptom"
  | "procedure"
  | "provider";

interface EntityGroup {
  type: EntityType;
  label: string;
  color: string; // CSS color (used in preview and HTML PDF)
  entities: HealthEntity[];
}

const ENTITY_GROUPS: Omit<EntityGroup, "entities">[] = [
  { type: "medication", label: "Current Medications", color: "rgb(91,141,239)" },
  { type: "diagnosis", label: "Active Diagnoses", color: "rgb(155,109,201)" },
  { type: "symptom", label: "Reported Symptoms", color: "rgb(224,122,95)" },
  { type: "procedure", label: "Recent Procedures", color: "rgb(76,175,125)" },
  { type: "provider", label: "Healthcare Providers", color: "rgb(232,152,59)" },
];

const SAGE = "rgb(138,154,135)";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const { session } = useSession();
  const {
    data: memories,
    loading,
    refreshing,
    error,
    refetch,
  } = useApiData(fetchMemories);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const userEmail = session?.user?.email ?? "";
  const userName =
    (session?.user?.user_metadata?.full_name as string | undefined) ?? "";

  // Build deduplicated entity groups (same logic as web).
  const entityGroups: EntityGroup[] = useMemo(() => {
    return ENTITY_GROUPS.map((g) => {
      const seen = new Set<string>();
      const entities: HealthEntity[] = [];
      for (const mem of memories ?? []) {
        for (const entity of mem.entities ?? []) {
          if (entity.type === g.type) {
            const key = entity.name.toLowerCase().trim();
            if (!seen.has(key)) {
              seen.add(key);
              entities.push(entity);
            }
          }
        }
      }
      entities.sort((a, b) => b.confidence - a.confidence);
      return { ...g, entities };
    });
  }, [memories]);

  const totalEntities = entityGroups.reduce(
    (sum, g) => sum + g.entities.length,
    0
  );

  // ── PDF generation (HTML equivalent of the web jsPDF layout) ──────────────

  async function handleGeneratePDF() {
    if (!memories) return;
    setGenerating(true);
    setGenError(null);
    try {
      const today = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const sections = entityGroups
        .filter((g) => g.entities.length > 0)
        .map(
          (g) => `
          <div class="section">
            <div class="section-heading">
              <span class="rule" style="background:${g.color}"></span>
              <h2>${escapeHtml(g.label)}</h2>
            </div>
            <table>
              <thead>
                <tr style="background:${g.color}">
                  <th style="width:75%">Name</th>
                  <th style="width:25%;text-align:center">Confidence</th>
                </tr>
              </thead>
              <tbody>
                ${g.entities
                  .map(
                    (e, i) => `
                  <tr class="${i % 2 === 1 ? "alt" : ""}">
                    <td>${escapeHtml(e.name)}</td>
                    <td style="text-align:center">${Math.round(e.confidence * 100)}%</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>`
        )
        .join("");

      const recentMemories = [...memories]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 8);

      const excerpts =
        recentMemories.length > 0
          ? `
        <div class="section">
          <div class="section-heading">
            <span class="rule" style="background:${SAGE}"></span>
            <h2>Recent Memory Excerpts</h2>
          </div>
          <table>
            <thead>
              <tr style="background:${SAGE}">
                <th style="width:24%">Date</th>
                <th>Excerpt</th>
              </tr>
            </thead>
            <tbody>
              ${recentMemories
                .map(
                  (mem, i) => `
                <tr class="${i % 2 === 1 ? "alt" : ""}">
                  <td>${escapeHtml(formatDate(mem.created_at))}</td>
                  <td>${escapeHtml(
                    mem.text.slice(0, 300) + (mem.text.length > 300 ? "…" : "")
                  )}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
          : "";

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: rgb(44,44,44); }
  .header { background: ${SAGE}; color: #fff; padding: 24px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 22px; font-weight: bold; }
  .header .tagline { font-size: 9px; margin-top: 6px; }
  .header .date { font-size: 9px; }
  .content { padding: 24px 40px; }
  .summary h2 { font-size: 11px; font-weight: bold; margin-bottom: 8px; }
  .summary p { font-size: 10px; line-height: 1.7; white-space: pre; }
  .section { margin-top: 24px; page-break-inside: avoid; }
  .section-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .section-heading .rule { display: inline-block; width: 4px; height: 16px; }
  .section-heading h2 { font-size: 13px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { color: #fff; font-weight: bold; padding: 6px 8px; text-align: left; }
  td { padding: 6px 8px; border: 0.5px solid rgb(220,215,205); }
  tr.alt td { background: rgb(248,246,240); }
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid ${SAGE}; text-align: center; font-size: 8px; color: rgb(160,155,145); }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Cognure Health Report</h1>
      <p class="tagline">AI-Powered Health Memory Companion</p>
    </div>
    <p class="date">Generated: ${escapeHtml(today)}</p>
  </div>
  <div class="content">
    <div class="summary">
      <h2>Patient Summary</h2>
      <p>Name:           ${escapeHtml(userName || "—")}
Email:          ${escapeHtml(userEmail || "—")}
Report Date:    ${escapeHtml(today)}
Total Documents (memories): ${memories.length}
Total Entities Extracted:   ${totalEntities}</p>
    </div>
    ${sections}
    ${excerpts}
    <div class="footer">Generated by Cognure AI&nbsp;&nbsp;|&nbsp;&nbsp;${escapeHtml(today)}</div>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Cognure Health Report",
          UTI: "com.adobe.pdf",
        });
      } else {
        setGenError(
          "Sharing is not available on this device. The PDF was generated but could not be opened."
        );
      }
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : "Failed to generate PDF"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Health Report"
        subtitle="Download a structured PDF summary of your health memory."
        onMemoryAdded={refetch}
      />

      {loading ? (
        <LoadingState label="Loading your health data…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetch}
              tintColor={colors.sage}
            />
          }
        >
          {/* Download button (parity with web header button) */}
          <Pressable
            accessibilityRole="button"
            onPress={handleGeneratePDF}
            disabled={generating || totalEntities === 0}
            style={({ pressed }) => [
              styles.downloadBtn,
              (generating || totalEntities === 0) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Download size={16} color="#ffffff" />
            )}
            <Text style={styles.downloadBtnText}>
              {generating ? "Generating…" : "Download PDF"}
            </Text>
          </Pressable>

          {genError && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={colors.coral} />
              <Text style={styles.errorBannerText}>{genError}</Text>
            </View>
          )}

          {totalEntities === 0 ? (
            /* Empty state (parity with web) */
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <FileText size={28} color={colors.sage} />
              </View>
              <Text style={styles.emptyTitle}>No health data yet</Text>
              <Text style={styles.emptyBody}>
                Upload and memorize at least one document to generate a
                report.
              </Text>
            </View>
          ) : (
            <>
              {/* Summary card */}
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>Health Memory Report</Text>
                    <Text style={styles.cardTitle}>
                      {userName || userEmail || "Your Health Summary"}
                    </Text>
                    {userName && userEmail ? (
                      <Text style={styles.cardEmail}>{userEmail}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.cardDate}>
                    {new Date().toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>

                {/* Stats row */}
                <View style={styles.pillRow}>
                  <StatPill label="Memories" value={(memories ?? []).length} />
                  <StatPill label="Total entities" value={totalEntities} />
                  {entityGroups
                    .filter((g) => g.entities.length > 0)
                    .map((g) => (
                      <StatPill
                        key={g.type}
                        label={g.label}
                        value={g.entities.length}
                        color={g.color}
                      />
                    ))}
                </View>
              </View>

              {/* Entity preview cards */}
              {entityGroups
                .filter((g) => g.entities.length > 0)
                .map((group) => (
                  <View key={group.type} style={styles.card}>
                    <View style={styles.groupHeader}>
                      <View
                        style={[
                          styles.groupDot,
                          { backgroundColor: group.color },
                        ]}
                      />
                      <Text style={styles.groupTitle}>{group.label}</Text>
                      <View style={styles.countPill}>
                        <Text style={styles.countPillText}>
                          {group.entities.length}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.entityWrap}>
                      {group.entities.map((e) => (
                        <View key={e.name} style={styles.entityChip}>
                          <Text style={styles.entityChipName}>{e.name}</Text>
                          <Text style={styles.entityChipPct}>
                            {Math.round(e.confidence * 100)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

              <Text style={styles.footNote}>
                The downloaded PDF will include all sections above plus recent
                memory excerpts and a branded header/footer.
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── StatPill helper (parity with web) ────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.statPill}>
      {color ? (
        <View style={[styles.statPillDot, { backgroundColor: color }]} />
      ) : null}
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: radius.xl,
    backgroundColor: colors.sage,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  downloadBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: "#ffffff",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(224,122,95,0.3)",
    backgroundColor: "rgba(224,122,95,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.coral,
    lineHeight: 18,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius["2xl"],
    backgroundColor: "rgba(138,154,135,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(46,46,46,0.45)",
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.sage,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.charcoal,
    marginTop: 4,
  },
  cardEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(46,46,46,0.4)",
    marginTop: 2,
  },
  cardDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(46,46,46,0.35)",
    textAlign: "right",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  statPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statPillValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.charcoal,
  },
  statPillLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(46,46,46,0.45)",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupTitle: {
    flex: 1,
    fontFamily: fonts.headingSemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  countPill: {
    borderRadius: 999,
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countPillText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(46,46,46,0.5)",
  },
  entityWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  entityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  entityChipName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.charcoal,
  },
  entityChipPct: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(46,46,46,0.35)",
  },
  footNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(46,46,46,0.35)",
    textAlign: "center",
    lineHeight: 16,
  },
});
