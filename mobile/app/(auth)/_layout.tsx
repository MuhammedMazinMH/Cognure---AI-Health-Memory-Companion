// Auth group: if the user is already signed in, bounce them to the dashboard
// (same as the web app redirecting authed users away from /login and /signup).

import { Redirect, Stack } from "expo-router";
import { useSession } from "../../lib/session";
import { colors } from "../../lib/theme";

export default function AuthLayout() {
  const { session, loading } = useSession();

  if (!loading && session) {
    return <Redirect href="/dashboard" />;
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
