// Memory Graph tab — mirrors web /dashboard (src/app/dashboard/page.tsx).
// Step 2: real data wiring with loading/error/empty states.
// Step 4 builds the full interactive native graph on top of this data.

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/header";
import { ErrorState, LoadingState } from "../../components/ui";
import { fetchMemories } from "../../lib/api";
import { useApiData } from "../../lib/use-api-data";
import { colors, fonts } from "../../lib/theme";

export default function GraphScreen() {
  const { data: memories, loading, error, refetch } = useApiData(fetchMemories);

  const entityCount =
    memories?.reduce((sum, memory) => sum + (memory.entities?.length ?? 0), 0) ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header
        title="Memory Graph"
        subtitle={
          memories && memories.length > 0
            ? `${entityCount} entities across ${memories.length} memories`
            : "Your connected health memory"
        }
      />
      {loading ? (
        <LoadingState label="Loading your memories…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !memories || memories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyBody}>
            Add your first memory from the Documents tab and Cognure will build
            your health graph from it.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.note}>
            {`Graph data loaded: ${memories.length} memories, ${entityCount} entities.`}
          </Text>
          <Text style={styles.noteSub}>
            The interactive graph arrives in the next build step.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, gap: 6 },
  note: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.charcoal,
  },
  noteSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
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
