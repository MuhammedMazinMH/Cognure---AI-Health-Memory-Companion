// Small shared UI primitives mirroring the web app's shadcn-styled inputs and
// buttons (h-11 rounded-xl inputs, sage primary button, coral error banner).

import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius } from "../lib/theme";

// Focus/blur event types, derived from the installed react-native version so
// they always match (RN changed these to FocusEvent/BlurEvent).
type FocusHandler = NonNullable<TextInputProps["onFocus"]>;
type FocusHandlerEvent = Parameters<FocusHandler>[0];

// ── Labeled input (web: <Label> + <Input className="h-11 rounded-xl …">) ──

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, onFocus, onBlur, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus = (e: FocusHandlerEvent) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: FocusHandlerEvent) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        style={[fieldStyles.input, focused && fieldStyles.inputFocused]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...inputProps}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.charcoal,
  },
  input: {
    height: 44, // h-11
    borderRadius: radius.xl, // rounded-xl
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.charcoal,
  },
  // Native equivalent of the web's sage focus ring (focus-visible:ring-sage).
  inputFocused: {
    borderColor: colors.sage,
    borderWidth: 2,
    paddingHorizontal: 13, // compensate for the +1 border so text doesn't shift
  },
});

// ── Primary button (web: bg-sage rounded-xl h-11 text-white) ──

interface PrimaryButtonProps {
  title: string;
  loadingTitle?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function PrimaryButton({
  title,
  loadingTitle,
  loading = false,
  disabled = false,
  onPress,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    // Light impact on primary actions — the native feedback users expect.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        buttonStyles.base,
        pressed && !isDisabled && buttonStyles.pressed,
        isDisabled && buttonStyles.disabled,
      ]}
    >
      {loading && <ActivityIndicator size="small" color="#ffffff" />}
      <Text style={buttonStyles.text}>
        {loading ? (loadingTitle ?? title) : title}
      </Text>
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  base: {
    height: 44, // h-11
    borderRadius: radius.xl,
    backgroundColor: colors.sage,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: "#ffffff",
  },
});

// ── Banners (web: coral error box / sage success box) ──

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[bannerStyles.base, bannerStyles.error]}>
      <Text style={[bannerStyles.text, { color: colors.coral }]}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <View style={[bannerStyles.base, bannerStyles.success]}>
      <Text style={[bannerStyles.text, { color: colors.sage }]}>{message}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  error: {
    borderColor: "rgba(224, 122, 95, 0.3)", // coral/30
    backgroundColor: "rgba(224, 122, 95, 0.08)", // coral/8
  },
  success: {
    borderColor: "rgba(138, 154, 135, 0.3)", // sage/30
    backgroundColor: "rgba(138, 154, 135, 0.08)", // sage/8
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
});

// ── Full-screen data states (loading spinner / error with retry) ──

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={stateStyles.wrap}>
      <ActivityIndicator size="large" color={colors.sage} />
      <Text style={stateStyles.label}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={stateStyles.wrap}>
      <Text style={stateStyles.errorText}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [stateStyles.retry, pressed && { opacity: 0.9 }]}
      >
        <Text style={stateStyles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const stateStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.coral,
    textAlign: "center",
  },
  retry: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: "#ffffff",
  },
});
