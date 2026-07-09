// Chat tab — mirrors web /dashboard/chat. Step 2: shell with real session;
// the full conversation UI (POST /api/ask) is built in Step 5.

import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/screen-header";
import { colors, fonts } from "../../lib/theme";

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Chat" subtitle="Ask questions about your health history" />
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Chat is coming next</Text>
        <Text style={styles.emptyBody}>
          This screen will let you ask questions grounded in your own records,
          exactly like the web app.
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
