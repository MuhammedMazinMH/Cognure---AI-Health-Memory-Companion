// Report tab — mirrors web /dashboard/report. Step 2: shell;
// the PDF report generation (expo-print) is built in Step 7.

import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/header";
import { colors, fonts } from "../../lib/theme";

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Report" subtitle="Generate a summary of your health history" />
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Reports are coming soon</Text>
        <Text style={styles.emptyBody}>
          This screen will generate a printable PDF summary of your health
          history, exactly like the web app.
        </Text>
      </View>
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
