// Bottom tab navigator — the mobile counterpart of the web sidebar
// (src/components/sidebar.tsx). Same sections, same order, same icons:
// Memory Graph, Chat, Timeline, Documents, Report. Settings is reached
// from the header avatar menu, mirroring the web header dropdown.

import { Redirect, Tabs } from "expo-router";
import {
  Clock,
  FileBarChart,
  FileText,
  MessageCircle,
  Network,
} from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../../lib/session";
import { colors, fonts } from "../../lib/theme";

export default function TabsLayout() {
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

  // Route guard: signed-out users can never see the dashboard.
  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.sidebar,
          borderTopColor: colors.sidebarBorder,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 10.5,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Graph",
          tabBarIcon: ({ color, size }) => <Network size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color, size }) => <Clock size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ color, size }) => <FileText size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color, size }) => (
            <FileBarChart size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
