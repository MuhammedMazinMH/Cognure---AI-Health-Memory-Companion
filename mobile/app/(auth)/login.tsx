// Login screen — native replica of src/app/(auth)/login/page.tsx.
// Same copy, same validation, same Supabase signInWithPassword flow.

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts } from "../../lib/theme";
import { ErrorBanner, Field, PrimaryButton } from "../../components/ui";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = getSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo (web: mobile-only Cognure wordmark) */}
        <Text style={styles.logo}>Cognure</Text>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your health memory.</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Field
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

          {error && <ErrorBanner message={error} />}

          <PrimaryButton
            title="Sign in"
            loadingTitle="Signing in…"
            loading={loading}
            onPress={handleLogin}
          />
        </View>

        <Text style={styles.footer}>
          New to Cognure?{" "}
          <Link href="/signup" style={styles.footerLink}>
            Create a free account
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.charcoal,
    marginBottom: 40,
  },
  header: { marginBottom: 32 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    color: colors.charcoal,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(44, 44, 44, 0.5)", // charcoal/50
  },
  form: { gap: 20 },
  footer: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(44, 44, 44, 0.5)",
  },
  footerLink: {
    fontFamily: fonts.bodyMedium,
    color: colors.sage,
  },
});
