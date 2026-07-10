// Signup screen — native replica of src/app/(auth)/signup/page.tsx.
// Same fields (full name, email, password min 6), same signUp flow with
// full_name metadata, same session/confirmation-email handling.

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
import {
  ErrorBanner,
  Field,
  PrimaryButton,
  SuccessBanner,
} from "../../components/ui";

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    // Same constraint as the web form's minLength={6}.
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = getSupabase();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    setMessage("Account created! Check your email to confirm, then sign in.");
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Start building your health memory today.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Full name"
            placeholder="Jane Doe"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            textContentType="name"
          />

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
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {error && <ErrorBanner message={error} />}
          {message && <SuccessBanner message={message} />}

          <PrimaryButton
            title="Create free account"
            loadingTitle="Creating account…"
            loading={loading}
            onPress={handleSignup}
          />
        </View>

        <Text style={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" style={styles.footerLink}>
            Sign in
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
    color: "rgba(44, 44, 44, 0.5)",
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
