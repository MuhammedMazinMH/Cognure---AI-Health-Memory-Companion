// Timeline tab — mirrors web /dashboard/timeline: Symptom Trends section,
// "All Events" divider, and the month-grouped Health Timeline. Data comes
// from GET /api/memories exactly like the web page.

import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/screen-header";
import { HealthTimeline } from "../../components/health-timeline";
import { SymptomTrends } from "../../components/symptom-trends";
import { ErrorState, LoadingState } from "../../components/ui";
import { fetchMemories } from "../../lib/api";
import { useApiData } from "../../lib/use-api-data";
import { colors, fonts } from "../../lib/theme";

export default function TimelineScreen() {
  const {
    data: memories,
    loading,
    refreshing,
    error,
    refetch,
  } = useApiData(fetchMemories);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Health Timeline"
        subtitle="A chronological record of your health events, grouped by month."
        onMemoryAdded={refetch}
      />

      {loading ? (
        <LoadingState label="Loading your timeline…" />
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
          {/* Symptom Trends (parity with web section) */}
          <View style={styles.trendsSection}>
            <Text style={styles.sectionTitle}>Symptom Trends</Text>
            <Text style={styles.sectionSub}>
              Confidence scores tracked across documents. Higher = more
              definitive mention.
            </Text>
            <SymptomTrends memories={memories ?? []} />
          </View>

          {/* Divider (parity with web "All Events" divider) */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>All Events</Text>
            <View style={styles.dividerLine} />
          </View>

          <HealthTimeline memories={memories ?? []} />
        </ScrollView>
      )}
    </SafeAreaView>
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
  },
  trendsSection: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 18,
    color: colors.charcoal,
    marginBottom: 2,
  },
  sectionSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(46,46,46,0.45)",
    marginBottom: 16,
    lineHeight: 17,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  dividerLine: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(46,46,46,0.35)",
  },
});
