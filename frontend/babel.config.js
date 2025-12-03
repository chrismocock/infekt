module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated plugin removed - using React Native Animated API for Expo Go compatibility
    // Uncomment when creating a development build: plugins: ['react-native-reanimated/plugin'],
  };
};

