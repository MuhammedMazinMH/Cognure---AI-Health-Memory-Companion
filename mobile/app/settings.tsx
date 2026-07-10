// Settings screen — full parity with web /dashboard/settings:
// Profile card (read-only email + editable full name saved to Supabase auth
// metadata with "Saved" confirmation) and Account card (sign out).

import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Check, LogOut } from "lucide-react-native";
import { getSupabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import { ErrorBanner, Field, PrimaryButton } from "../components/ui";

export default function SettingsScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setFullName((data.user?.user_metadata?.full_name as string) ?? "");
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const { error } = await getSupabase().auth.updateUser({
      data: { full_name: fullName },
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await getSupabase().auth.signOut();
      // If the network revoke failed, still clear the local session so no
      // authenticated state is left behind on the device.
      if (error) {
        await getSupabase().auth.signOut({ scope: "local" });
      }
    } catch {
      await getSupabase()
        .auth.signOut({ scope: "local" })
        .catch(() => {});
    }
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Page header — same title/subtitle as web */}
      <View style={styles.pageHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your account preferences.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Profile card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardDescription}>
            Update how your name appears in Cognure.
          </Text>

          <View style={styles.cardForm}>
            <View>
              <Field
                label="Email address"
                value={email}
                editable={false}
                style={styles.disabledInput}
              />
              <Text style={styles.helpText}>Email cannot be changed here.</Text>
            </View>

            <Field
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              autoCapitalize="words"
            />

            {saveError ? <ErrorBanner message={saveError} /> : null}

            <View style={styles.saveRow}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Save changes"
                  loadingTitle="Saving…"
                  loading={saving}
                  onPress={handleSave}
                />
              </View>
              {saved && (
                <View style={styles.savedBadge}>
                  <Check size={16} color={colors.sage} />
                  <Text style={styles.savedText}>Saved</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Account card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.cardDescription}>
            Sign out of Cognure on this device.
          </Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleLogout}
            accessibilityRole="button"
          >
            <LogOut size={16} color={colors.coral} />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.charcoal,
  },
  pageSubtitle: {
    marginTop: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.mutedForeground,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 18,
  },
  cardTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  cardDescription: {
    marginTop: 2,
    marginBottom: 14,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  cardForm: { gap: 14 },
  disabledInput: {
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
  },
  helpText: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.mutedForeground,
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  savedText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.sage,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(224, 122, 95, 0.4)", // coral/40
    alignSelf: "flex-start",
    paddingHorizontal: 18,
  },
  signOutText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.coral,
  },
});
