const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to restrict native libraries to arm64-v8a only.
 * Uses NDK abiFilters inside defaultConfig — simpler and more reliable than splits.
 * Reduces APK size from ~90MB to ~30-40MB by excluding x86, x86_64, armeabi-v7a binaries.
 */
const withABISplit = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Don't add twice
    if (buildGradle.includes('abiFilters "arm64-v8a"')) {
      return config;
    }

    // Insert ndk abiFilters block right after `defaultConfig {`
    config.modResults.contents = buildGradle.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {\n        ndk {\n            abiFilters "arm64-v8a"\n        }`
    );

    return config;
  });
};

module.exports = withABISplit;
