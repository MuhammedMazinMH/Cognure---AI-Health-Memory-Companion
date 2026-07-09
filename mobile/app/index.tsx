// Entry route: sends signed-in users to the dashboard and everyone else to
// the login screen — the same guard behaviour as the web app's middleware.

import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../lib/session";
import { colors } from "../lib/theme";

export default function Index() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.sage} />
      </View>
    );
  }

  return session ? (
    <Redirect href="/dashboard" />
  ) : (
    <Redirect href="/login" />
  );
}
