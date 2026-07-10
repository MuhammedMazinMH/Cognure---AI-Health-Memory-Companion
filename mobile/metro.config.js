// Metro bundler config for Expo SDK 57.
// `getDefaultConfig` from `expo/metro-config` already wires up expo-router's
// file-system routing, SVG transformer, and EXPO_PUBLIC_* env var inlining.
// No extra configuration is needed for this project.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
