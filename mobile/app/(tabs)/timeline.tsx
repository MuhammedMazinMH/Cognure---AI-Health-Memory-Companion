// Timeline tab — mirrors web /dashboard/timeline. Step 2: real data wiring;
// the full timeline + symptom trends UI is built in Step 6.

import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/screen-header";
import { ErrorState, LoadingState } from "../../components/ui";
import { fetchMemories } from "../../lib/api";
import { useApiData } from "../../lib/use-api-data";
import { colors, fonts } from "../../lib/theme";

export default function TimelineScreen() {
  const { data: memories, loading, error, refetch } = useApiData(fetchMemories);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Timeline"
        subtitle={
          memories && memories.length > 0
            ? `${memories.length} entries in your health history`
            : "Your health history in order"
        }
        onMemoryAdded={refetch}
      />
      {loading ? (
        <LoadingState label="Loading your timeline…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {memories && memories.length > 0
              ? "Timeline data loaded"
              : "Nothing here yet"}
          </Text>
          <Text style={styles.emptyBody}>
            {memories && memories.length > 0
              ? "The full timeline view arrives in an upcoming build step."
              : "Add a memory and your health history will appear here in order."}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
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
  },
});
