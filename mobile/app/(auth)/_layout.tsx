// Auth group: if the user is already signed in, bounce them to the main tabs
// (same as the web app redirecting authed users away from /login and /signup).

import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../../lib/session";
import { colors } from "../../lib/theme";

export default function AuthLayout() {
  const { session, loading } = useSession();

  // Show a spinner while the session is resolving so we never flash the login
  // screen to an already-authenticated user.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.sage} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
