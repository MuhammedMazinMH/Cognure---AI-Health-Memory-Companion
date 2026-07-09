// Signed-in landing screen for Step 1.
// Step 2 replaces this with the bottom-tab navigator (Graph, Chat, Timeline,
// Documents, Report) mirroring the web sidebar. For now it verifies the auth
// flow end-to-end: session guard, user identity, and sign out.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { colors, fonts, radius } from "../lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading } = useSession();

  // Route guard — same behaviour as the web dashboard redirecting to /login.
  if (!loading && !session) {
    return <Redirect href="/login" />;
  }

  const fullName =
    (session?.user.user_metadata?.full_name as string | undefined) ?? "";
  const email = session?.user.email ?? "";

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.logo}>Cognure</Text>

      <View style={styles.body}>
        <Text style={styles.title}>
          {fullName ? `Welcome, ${fullName.split(" ")[0]}` : "Welcome"}
        </Text>
        <Text style={styles.subtitle}>Signed in as {email}</Text>
        <Text style={styles.note}>
          Your health memory tabs arrive in the next step.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.charcoal,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(44, 44, 44, 0.5)",
  },
  note: {
    marginTop: 16,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  signOut: {
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.charcoal,
  },
});
