// Expo SDK 57 + expo-router standard Babel config.
// `babel-preset-expo` handles JSX transform, React Native module aliasing,
// and the reanimated plugin. expo-router requires no extra Babel plugin.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
