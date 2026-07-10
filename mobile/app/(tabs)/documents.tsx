// Documents tab — mirrors web /dashboard/documents: document list with the
// header "Add Memory" upload flow (pick file → extract → upload → memorize).

import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FileText } from "lucide-react-native";
import { ScreenHeader } from "../../components/screen-header";
import { ErrorState, LoadingState } from "../../components/ui";
import { fetchDocuments } from "../../lib/api";
import { useApiData } from "../../lib/use-api-data";
import { colors, fonts, radius } from "../../lib/theme";
import type { Document } from "../../lib/types";

function DocumentCard({ document }: { document: Document }) {
  const date = new Date(document.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <FileText size={18} color={colors.sage} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {document.file_name}
        </Text>
        <Text style={styles.cardMeta}>{date}</Text>
      </View>
    </View>
  );
}

export default function DocumentsScreen() {
  const {
    data: documents,
    loading,
    refreshing,
    error,
    refetch,
  } = useApiData(fetchDocuments);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Documents"
        subtitle={
          documents && documents.length > 0
            ? `${documents.length} document${documents.length !== 1 ? "s" : ""} uploaded`
            : "All your uploaded health documents live here."
        }
        onMemoryAdded={refetch}
      />
      {loading ? (
        <LoadingState label="Loading your documents…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !documents || documents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No documents yet</Text>
          <Text style={styles.emptyBody}>
            {`Tap \u201cAdd Memory\u201d above to upload your first health document \u2014 Cognure will read it and remember it for you.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DocumentCard document={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetch}
              tintColor={colors.sage}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 14,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: "rgba(138, 154, 135, 0.12)", // sage/12
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    color: colors.charcoal,
  },
  cardMeta: {
    marginTop: 1,
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
