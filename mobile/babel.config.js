// Expo SDK 57 + expo-router standard Babel config.
// `react-native-reanimated/plugin` must be listed last; it transforms
// worklet functions that gesture-handler's GestureDetector depends on.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
