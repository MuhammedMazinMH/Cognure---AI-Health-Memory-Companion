// Cognure brand theme for the mobile app.
// Mirrors the web app's design tokens defined in src/app/globals.css (:root).
// The web app is the source of truth — these values must stay in sync with it.

export const colors = {
  // Raw brand colors (same as globals.css)
  sage: "#8a9a87",
  cream: "#f5f1e8",
  charcoal: "#2c2c2c",
  coral: "#e07a5f",
  lavender: "#b8a9c9",

  // Semantic tokens (same mapping as globals.css)
  background: "#f5f1e8", // cream
  foreground: "#2c2c2c", // charcoal
  card: "#ffffff",
  cardForeground: "#2c2c2c",
  primary: "#8a9a87", // sage
  primaryForeground: "#ffffff",
  secondary: "#ece6d8",
  secondaryForeground: "#2c2c2c",
  muted: "#ece6d8",
  mutedForeground: "#6b6b6b",
  accent: "#e7e0d0",
  accentForeground: "#2c2c2c",
  destructive: "#e07a5f", // coral
  border: "#ddd5c4",
  input: "#ddd5c4",
  ring: "#8a9a87",

  // Sidebar palette (used for tab bar to mirror the web sidebar)
  sidebar: "#efe9da",
  sidebarAccent: "#e2dac8",
  sidebarBorder: "#ddd5c4",

  // Entity type colors (same as globals.css chart tokens and the web graph)
  entity: {
    medication: "#5b8def", // blue
    symptom: "#e07a5f", // coral/red
    diagnosis: "#9b6dc9", // purple
    procedure: "#4caf7d", // green
    provider: "#e8983b", // orange
  },
} as const;

// Border radius rhythm — globals.css uses --radius: 0.625rem (10px)
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  "2xl": 18,
  "3xl": 22,
} as const;

// Spacing scale mirroring Tailwind's default (used consistently on web)
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const;

// Font family names registered in app/_layout.tsx via expo-font.
// Web uses Playfair Display (headings) + Inter (body) via next/font.
export const fonts = {
  heading: "PlayfairDisplay_700Bold",
  headingSemi: "PlayfairDisplay_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
} as const;
