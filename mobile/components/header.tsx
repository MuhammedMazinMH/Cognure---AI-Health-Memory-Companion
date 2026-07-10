// Shared screen header — the mobile counterpart of the web app's
// src/components/header.tsx. Shows the page title/subtitle on the left and
// the user avatar on the right. Tapping the avatar opens a menu with the
// user's name/email, a Settings action, and Sign out (same items as the
// web header dropdown).

import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Settings as SettingsIcon } from "lucide-react-native";
import { getSupabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { colors, fonts, radius } from "../lib/theme";

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Optional element rendered between the title and the avatar (e.g. Add Memory). */
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const router = useRouter();
  const { session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const email = session?.user?.email ?? "";
  const fullName = (session?.user?.user_metadata?.full_name as string) ?? "";
  const initial = (fullName || email || "?").charAt(0).toUpperCase();

  async function handleSignOut() {
    setMenuOpen(false);
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

  function goToSettings() {
    setMenuOpen(false);
    router.push("/settings");
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {action}

      <TouchableOpacity
        style={styles.avatar}
        onPress={() => setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open account menu"
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </TouchableOpacity>

      {/* Account menu — mirrors the web header dropdown. */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <View style={styles.menuUser}>
              {fullName ? <Text style={styles.menuName}>{fullName}</Text> : null}
              <Text style={styles.menuEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={goToSettings}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <SettingsIcon size={16} color={colors.charcoal} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <LogOut size={16} color={colors.coral} />
              <Text style={[styles.menuItemText, { color: colors.coral }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.charcoal,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.mutedForeground,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 44, 42, 0.25)",
    alignItems: "flex-end",
    paddingTop: 64,
    paddingRight: 16,
  },
  menu: {
    width: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuUser: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.charcoal,
  },
  menuEmail: {
    marginTop: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.charcoal,
  },
});
